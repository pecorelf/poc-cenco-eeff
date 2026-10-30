import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Ejercicio, EventoLog, IndustriaPack, ClienteConfig, NotaRun, Comentario, Ajuste, EstadoFuente, Perfil } from "./types";
import { PERFIL_NOMBRE } from "./types";
import { INDUSTRIAS } from "../config/industries";
import { CLIENTES } from "../config/clients";
import { usuario } from "../config/users";
import {
  crearEjercicio, sembrar, generarNota, evaluarControles, calcularCuadros, nuevaVersion, actaDe, historicos, controlesOk, totalNota, type Escenario
} from "./generator";
import { periodoEnCurso, uid, hashStr } from "./util";

export interface ConfigCliente {
  industria: string;
  cliente: string;
  colores: Record<string, { primario: string; secundario: string; acento: string }>;
  logos: Record<string, string>;
}

interface Toast { id: string; texto: string; tipo: "ok" | "ko" | "info" }

interface Estado {
  config: ConfigCliente;
  escenario: Escenario;
  usuarioId: string | null;
  perfilActivo: Perfil | null;
  ejercicios: Ejercicio[];
  ejercicioId: string;
  log: EventoLog[];
  asistente: boolean;
  toasts: Toast[];
  inicializado: string; // firma industria|cliente|escenario|periodo

  // derivados
  pack: () => IndustriaPack;
  cliente: () => ClienteConfig;
  ej: () => Ejercicio;
  nota: (n: number) => NotaRun | undefined;

  // sesión
  login: (id: string) => void;
  logout: () => void;
  toast: (texto: string, tipo?: Toast["tipo"]) => void;
  setAsistente: (v: boolean) => void;
  registrar: (e: Partial<EventoLog> & { track: string; objeto: string; accion: string }) => void;

  // portada
  seleccionarEjercicio: (id: string) => void;
  nuevoEjercicio: (o: { anio: number; trimestre: 1 | 2 | 3 | 4; sociedad: string; copiar: boolean; fechaCierre?: string; parametros?: { uf: number; usdCierre: number; usdPromedio: number[] }; responsables?: Record<number, string> }) => string | null;
  actualizarParametros: (p: Partial<Ejercicio["parametros"]>) => number[];
  asignarResponsable: (n: number, u: string) => void;

  // carga
  completarActualizacion: (fuente: string) => void;
  completarCarga: (fuente: string, archivo: string, resultado: "ok" | "advertencias" | "errores") => void;
  habilitarFuente: (fuente: string) => void;
  asignarHomologacion: (cuenta: string, linea: string) => void;

  // notas
  generar: (n: number) => void;
  actualizarDependiente: (n: number) => void;
  confirmarAjuste: (n: number, a: Omit<Ajuste, "id" | "usuario" | "fecha" | "estado">) => void;
  descartarAjuste: (n: number, a: Omit<Ajuste, "id" | "usuario" | "fecha" | "estado">) => void;
  confirmarAjustes: (n: number, items: { cuadro: string; linea: string; monto: number }[], justificacion: string) => void;
  descartarAjustes: (n: number, cantidad: number) => void;
  aceptarTexto: (n: number, texto: string) => void;
  enviarRevision: (n: number) => string | null;

  // revisión
  comentar: (c: Omit<Comentario, "id" | "fecha" | "estado" | "respuestas" | "autor">) => void;
  responder: (id: string, texto: string) => void;
  resolver: (id: string) => void;
  aprobarNota: (n: number) => string | null;
  devolverNota: (n: number) => void;
  generarPreinforme: (revision?: string) => void;
  preaprobarConsolidado: () => string | null;
  cerrarAuditoria: () => void;
  enviarDirectorio: () => void;

  // directorio
  devolverDirectorio: () => string | null;
  asignarObservacion: (comentarioId: string, n: number) => void;
  reenviarDirectorio: () => string | null;
  aprobarDirectorio: () => void;

  // informes
  generarInforme: (id: string) => void;
  registrarDescarga: (objeto: string, formato: string) => void;
  publicarYCerrar: () => void;
  cerrarEjercicio: () => void;
  reabrirEjercicio: (justificacion: string) => void;
  delegar: (suplente: string, hasta: string) => void;

  // admin
  setIndustria: (id: string) => void;
  setCliente: (id: string) => void;
  setColores: (c: { primario: string; secundario: string; acento: string }) => void;
  setLogo: (dataUrl: string | null) => void;
  reiniciar: (escenario?: Escenario) => void;
}

function construir(config: ConfigCliente, escenario: Escenario) {
  const pack = INDUSTRIAS[config.industria];
  const cliente = { ...CLIENTES[config.cliente] };
  const p = periodoEnCurso();
  const soc = cliente.sociedades[0];
  const log: EventoLog[] = [];
  const ej = crearEjercicio(pack, cliente, { anio: p.anio, trimestre: p.trimestre, sociedad: soc.id, responsable: "u_proceso" });
  sembrar(pack, cliente, ej, escenario, log);
  return { ejercicios: [ej], ejercicioId: ej.id, log, inicializado: `${config.industria}|${config.cliente}|${escenario}|${p.anio}${p.trimestre}` };
}

const configInicial: ConfigCliente = { industria: "retail", cliente: "cencosud", colores: {}, logos: {} };

const clon = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const useApp = create<Estado>()(
  persist(
    (set, get) => {
      const pack = () => INDUSTRIAS[get().config.industria];
      // Cacheado por referencia de config: los selectores de React necesitan identidad estable.
      let cacheCfg: ConfigCliente | null = null;
      let cacheCli: ClienteConfig | null = null;
      const cliente = (): ClienteConfig => {
        const c = get().config;
        if (c === cacheCfg && cacheCli) return cacheCli;
        const base = CLIENTES[c.cliente];
        cacheCfg = c;
        cacheCli = { ...base, colores: c.colores[c.cliente] ?? base.colores, logo: c.logos[c.cliente] ?? base.logo };
        return cacheCli;
      };
      const ej = () => get().ejercicios.find((e) => e.id === get().ejercicioId) ?? get().ejercicios[0];

      /** Aplica una mutación sobre una copia del ejercicio seleccionado. */
      const mut = (f: (e: Ejercicio) => void) => {
        const e = clon(ej());
        f(e);
        set({ ejercicios: get().ejercicios.map((x) => (x.id === e.id ? e : x)) });
      };

      const quien = () => {
        const u = get().usuarioId ?? "sistema";
        const p = get().perfilActivo;
        return { usuario: u, perfil: p ? PERFIL_NOMBRE[p] : "—" };
      };

      const registrar: Estado["registrar"] = (e) => {
        const q = quien();
        const ev: EventoLog = { id: uid("e"), fecha: new Date().toISOString(), usuario: q.usuario, perfil: q.perfil, ejercicio: ej()?.periodo ?? "", ...e } as EventoLog;
        set({ log: [ev, ...get().log].slice(0, 1500) });
      };

      /** Reglas de disponibilidad: notas listas para generar, desactualizadas por reemplazo de fuente. */
      const recalcularDisponibilidad = (e: Ejercicio, fuenteReemplazada?: string) => {
        const pk = pack();
        e.notas.forEach((n) => {
          const def = pk.notas.find((d) => d.n === n.n)!;
          const oblig = def.fuentes.filter((f) => pk.fuentes.find((x) => x.id === f)?.obligatoriedad === "Obligatoria");
          const listas = oblig.every((f) => e.fuentes.find((x) => x.id === f)?.estado === "Habilitada");
          if (n.estado === "Pendiente de fuentes" && listas) {
            n.estado = n.generada ? "Borrador" : "Lista para generar";
            n.diasEnEstado = 0;
          }
          if (!listas && n.estado === "Lista para generar") n.estado = "Pendiente de fuentes";
          if (fuenteReemplazada && n.generada && def.fuentes.includes(fuenteReemplazada) && n.estado !== "Aprobada") {
            n.desactualizada = true;
            n.controles = evaluarControles(def, n, e, pk);
          }
        });
        if (e.estado === "Creado" && e.fuentes.some((f) => f.estado !== "Pendiente")) e.estado = "En carga";
        if (e.estado === "En carga" && e.notas.some((n) => n.generada)) e.estado = "En generación";
      };

      const invalidarAprobacion = (e: Ejercicio, n: NotaRun, motivo: string) => {
        if (n.estado === "Aprobada" || n.estado === "Lista para revisión") {
          n.estado = "En corrección";
          n.versionAprobada = undefined;
          n.diasEnEstado = 0;
          if (e.consolidadoPreaprobado) {
            e.consolidadoPreaprobado = false;
            e.estado = "En pre-aprobación";
          }
          registrar({ track: "Pre-aprobación", objeto: `Nota ${n.n}`, accion: "Invalidación de aprobación por cambio", justificacion: motivo });
        }
      };

      return {
        config: configInicial,
        escenario: "en_curso",
        usuarioId: null,
        perfilActivo: null,
        ...construir(configInicial, "en_curso"),
        asistente: false,
        toasts: [],

        pack,
        cliente,
        ej,
        nota: (n) => ej().notas.find((x) => x.n === n),

        login: (id) => {
          const u = usuario(id);
          set({ usuarioId: id, perfilActivo: u.perfiles[0] });
          registrar({ track: "Portada", objeto: "Sesión", accion: "Inicio de sesión (SSO)", despues: u.perfiles.map((p) => PERFIL_NOMBRE[p]).join(", ") });
        },
        logout: () => {
          registrar({ track: "Portada", objeto: "Sesión", accion: "Cierre de sesión" });
          set({ usuarioId: null, perfilActivo: null, asistente: false });
        },
        toast: (texto, tipo = "info") => {
          const t = { id: uid("t"), texto, tipo };
          set({ toasts: [...get().toasts, t] });
          setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== t.id) }), 3800);
        },
        setAsistente: (v) => set({ asistente: v }),
        registrar,

        seleccionarEjercicio: (id) => {
          const hist = historicos(pack(), cliente(), periodoEnCurso());
          const h = hist.find((x) => x.id === id);
          if (h && !get().ejercicios.find((x) => x.id === id)) {
            // Los históricos se materializan al abrirlos, en solo lectura
            const hh = clon(h);
            hh.notas.forEach((n) => {
              const def = pack().notas.find((d) => d.n === n.n)!;
              const soc = cliente().sociedades.find((s) => s.id === hh.sociedad)!;
              n.cuadros = calcularCuadros(def, hh, soc.escala, []);
              n.controles = evaluarControles(def, n, hh, pack());
              n.versiones = [nuevaVersion(n, n.responsable, "Versión aprobada", hh.aprobadoEl)];
            });
            set({ ejercicios: [...get().ejercicios, hh] });
          }
          set({ ejercicioId: id });
          registrar({ track: "Portada", objeto: "Ejercicio", accion: "Apertura de ejercicio", despues: id });
        },

        nuevoEjercicio: (o) => {
          const abiertos = get().ejercicios.filter((e) => !e.historico && e.estado !== "Cerrado");
          if (abiertos.some((e) => e.anio === o.anio && e.trimestre === o.trimestre && e.sociedad === o.sociedad)) return "Ya existe un ejercicio abierto para ese periodo y sociedad.";
          if (historicos(pack(), cliente(), periodoEnCurso()).some((e) => e.anio === o.anio && e.trimestre === o.trimestre && e.sociedad === o.sociedad)) return "Ese periodo ya está cerrado. Solo el Administrador puede reabrirlo.";
          const nuevo = crearEjercicio(pack(), cliente(), { anio: o.anio, trimestre: o.trimestre, sociedad: o.sociedad, fechaCierre: o.fechaCierre, responsable: get().usuarioId ?? "u_proceso" });
          if (o.copiar) {
            const ref = ej();
            nuevo.notas.forEach((n) => (n.responsable = ref.notas.find((x) => x.n === n.n)?.responsable ?? n.responsable));
            nuevo.parametros.homologacion = ref.parametros.homologacion + " (copia)";
          }
          if (o.parametros) nuevo.parametros = { ...nuevo.parametros, ...o.parametros };
          if (o.responsables) nuevo.notas.forEach((n) => (n.responsable = o.responsables![n.n] ?? n.responsable));
          set({ ejercicios: [...get().ejercicios, nuevo], ejercicioId: nuevo.id });
          registrar({ track: "Portada", objeto: "Ejercicio", accion: "Creación del ejercicio", despues: `${nuevo.periodo} · ${cliente().sociedades.find((s) => s.id === o.sociedad)?.nombre}`, version: "v1" });
          return null;
        },

        actualizarParametros: (p) => {
          const afectadas: number[] = [];
          mut((e) => {
            const antes = `UF ${e.parametros.uf} · USD ${e.parametros.usdCierre}`;
            e.parametros = { ...e.parametros, ...p, version: e.parametros.version + 1 };
            e.notas.forEach((n) => {
              const def = pack().notas.find((d) => d.n === n.n)!;
              const usaTc = def.cuadros.some((c) => c.lineas.some((l) => ["usd", "uf", "mon"].includes(l.id))) || def.cuadros.some((c) => c.id === "mon");
              if (n.generada && usaTc) {
                n.desactualizada = true;
                afectadas.push(n.n);
              }
            });
            registrar({ track: "Portada", objeto: "Parámetros", accion: "Modificación de parámetros", antes, despues: `UF ${e.parametros.uf} · USD ${e.parametros.usdCierre}`, version: `v${e.parametros.version}` });
          });
          return afectadas;
        },

        asignarResponsable: (n, u) =>
          mut((e) => {
            const nota = e.notas.find((x) => x.n === n)!;
            const antes = usuario(nota.responsable).nombre;
            nota.responsable = u;
            registrar({ track: "Portada", objeto: `Nota ${n}`, accion: "Asignación de responsable", antes, despues: usuario(u).nombre });
          }),

        completarActualizacion: (fid) =>
          mut((e) => {
            const f = e.fuentes.find((x) => x.id === fid)!;
            const def = pack().fuentes.find((x) => x.id === fid)!;
            f.version += 1;
            f.estado = "Habilitada";
            f.ultimaActualizacion = new Date().toISOString();
            f.registros = Math.round((def.registros ?? 1000) * (1 + ((hashStr(fid + f.version) % 60) - 20) / 1000));
            f.cargadoPor = get().usuarioId ?? def.responsable;
            f.versiones.push({ v: f.version, fecha: f.ultimaActualizacion, usuario: f.cargadoPor, archivo: `Extracción ${def.origen} · ${e.periodo}`, resultado: "Habilitada" });
            recalcularDisponibilidad(e, fid);
            registrar({ track: "Carga de información", objeto: def.nombre, accion: "Actualización desde Data Lake", despues: `${f.registros.toLocaleString("es-CL")} registros`, version: `v${f.version}` });
          }),

        completarCarga: (fid, archivo, resultado) =>
          mut((e) => {
            const f = e.fuentes.find((x) => x.id === fid)!;
            const def = pack().fuentes.find((x) => x.id === fid)!;
            const eraHabilitada = f.estado === "Habilitada";
            f.version += 1;
            f.ultimaActualizacion = new Date().toISOString();
            f.cargadoPor = get().usuarioId ?? def.responsable;
            f.registros = 120 + (hashStr(archivo) % 700);
            f.estado = resultado === "ok" ? "Habilitada" : resultado === "advertencias" ? "Validada" : "Con errores";
            if (resultado === "errores") {
              f.errores = [
                { fila: 87, columna: "D · Monto", regla: "Campo obligatorio vacío", bloqueante: true },
                { fila: 131, columna: "B · Cuenta", regla: "Cuenta no existe en la tabla de homologación", bloqueante: true }
              ];
            } else if (resultado === "advertencias") {
              f.errores = [{ fila: 22, columna: "F · Monto", regla: "Valor fuera del rango histórico (±15%)", bloqueante: false }];
            } else f.errores = [];
            f.versiones.push({ v: f.version, fecha: f.ultimaActualizacion, usuario: f.cargadoPor, archivo, resultado: f.estado });
            recalcularDisponibilidad(e, eraHabilitada ? fid : undefined);
            registrar({ track: "Carga de información", objeto: def.nombre, accion: "Carga manual de archivo", despues: archivo, version: `v${f.version}` });
            registrar({ track: "Carga de información", objeto: def.nombre, accion: resultado === "errores" ? "Validación rechazada" : "Validación de estructura y contenido", despues: f.estado });
          }),

        habilitarFuente: (fid) =>
          mut((e) => {
            const f = e.fuentes.find((x) => x.id === fid)!;
            f.estado = "Habilitada" as EstadoFuente;
            recalcularDisponibilidad(e);
            registrar({ track: "Carga de información", objeto: pack().fuentes.find((x) => x.id === fid)!.nombre, accion: "Confirmación de advertencias y habilitación", despues: "Habilitada", version: `v${f.version}` });
          }),

        asignarHomologacion: (cuenta, linea) =>
          mut((e) => {
            const h = e.homologacionPendiente.find((x) => x.cuenta === cuenta)!;
            h.asignada = linea;
            const n = e.notas.find((x) => x.n === h.nota)!;
            if (n.generada) {
              n.desactualizada = true;
              invalidarAprobacion(e, n, `Cambio en homologación de la cuenta ${cuenta}`);
            }
            e.parametros.version += 0; // la homologación se versiona aparte
            registrar({ track: "Carga de información", objeto: "Tabla de homologación", accion: "Asignación de cuenta nueva a línea de nota", antes: "Sin asignar", despues: `${cuenta} → Nota ${h.nota} · ${linea}`, version: e.parametros.homologacion });
          }),

        generar: (n) =>
          mut((e) => {
            const nota = e.notas.find((x) => x.n === n)!;
            const antes = nota.generada ? totalNota(nota.cuadros) : null;
            generarNota(pack(), cliente(), e, n, get().usuarioId ?? nota.responsable);
            // Dependientes
            e.notas.forEach((d) => {
              const def = pack().notas.find((x) => x.n === d.n)!;
              if (d.generada && def.deps?.includes(n)) {
                d.desactualizada = true;
                d.controles = evaluarControles(def, d, e, pack());
                invalidarAprobacion(e, d, `Cambio en Nota ${n}, de la que depende`);
              }
            });
            if (["Creado", "En carga"].includes(e.estado)) e.estado = "En generación";
            registrar({ track: "Generación de notas", objeto: `Nota ${n}`, accion: antes === null ? "Generación de la nota" : "Regeneración de la nota", antes: antes === null ? undefined : `M$ ${antes.toLocaleString("es-CL")}`, despues: `M$ ${totalNota(nota.cuadros).toLocaleString("es-CL")}`, version: `v${nota.version}` });
          }),

        actualizarDependiente: (n) => get().generar(n),

        confirmarAjuste: (n, a) =>
          mut((e) => {
            const nota = e.notas.find((x) => x.n === n)!;
            const def = pack().notas.find((d) => d.n === n)!;
            const soc = cliente().sociedades.find((s) => s.id === e.sociedad)!;
            const aj: Ajuste = { ...a, id: uid("a"), usuario: get().usuarioId ?? "", fecha: new Date().toISOString(), estado: "confirmado" };
            nota.ajustes.push(aj);
            nota.cuadros = calcularCuadros(def, e, soc.escala, nota.ajustes);
            nota.version += 1;
            nota.controles = evaluarControles(def, nota, e, pack());
            nota.versiones.push(nuevaVersion(nota, aj.usuario, `Ajuste manual: ${a.justificacion}`));
            const linea = nota.cuadros.find((c) => c.id === a.cuadro)?.lineas.find((l) => l.id === a.linea);
            registrar({ track: "Generación de notas", objeto: `Nota ${n} · ${linea?.label}`, accion: "Ajuste manual confirmado", antes: `M$ ${((linea?.actual ?? 0) - a.monto).toLocaleString("es-CL")}`, despues: `M$ ${(linea?.actual ?? 0).toLocaleString("es-CL")}`, justificacion: a.justificacion, version: `v${nota.version}` });
          }),

        confirmarAjustes: (n, items, justificacion) =>
          mut((e) => {
            const nota = e.notas.find((x) => x.n === n)!;
            const def = pack().notas.find((d) => d.n === n)!;
            const soc = cliente().sociedades.find((s) => s.id === e.sociedad)!;
            const u = get().usuarioId ?? "";
            const fecha = new Date().toISOString();
            const antes = Object.fromEntries(nota.cuadros.flatMap((c) => c.lineas.map((l) => [`${c.id}|${l.id}`, { v: l.actual, label: `${c.titulo} · ${l.label}` }])));
            items.forEach((it) => nota.ajustes.push({ ...it, justificacion, id: uid("a"), usuario: u, fecha, estado: "confirmado" }));
            nota.cuadros = calcularCuadros(def, e, soc.escala, nota.ajustes);
            nota.version += 1;
            nota.controles = evaluarControles(def, nota, e, pack());
            nota.versiones.push(nuevaVersion(nota, u, `${items.length} ajuste${items.length > 1 ? "s" : ""} manual${items.length > 1 ? "es" : ""}: ${justificacion}`));
            items.forEach((it) => {
              const a = antes[`${it.cuadro}|${it.linea}`];
              registrar({ track: "Generación de notas", objeto: `Nota ${n} · ${a?.label ?? it.linea}`, accion: "Ajuste manual confirmado", antes: `M$ ${(a?.v ?? 0).toLocaleString("es-CL")}`, despues: `M$ ${((a?.v ?? 0) + it.monto).toLocaleString("es-CL")}`, justificacion, version: `v${nota.version}` });
            });
          }),

        descartarAjustes: (n, cantidad) => registrar({ track: "Generación de notas", objeto: `Nota ${n}`, accion: "Ajustes manuales descartados (capa provisoria)", despues: `${cantidad} montos` }),

        descartarAjuste: (n, a) => registrar({ track: "Generación de notas", objeto: `Nota ${n}`, accion: "Ajuste manual descartado", despues: `M$ ${a.monto.toLocaleString("es-CL")}`, justificacion: a.justificacion }),

        aceptarTexto: (n, texto) =>
          mut((e) => {
            const nota = e.notas.find((x) => x.n === n)!;
            nota.texto = texto;
            nota.textoAceptado = true;
            if (!nota.generada) {
              nota.generada = true;
              nota.estado = "Borrador";
            }
            nota.version += 1;
            nota.versiones.push(nuevaVersion(nota, get().usuarioId ?? "", "Texto propuesto por el Agente, editado y aceptado"));
            registrar({ track: "Generación de notas", objeto: `Nota ${n}`, accion: "Aceptación de texto de la nota", version: `v${nota.version}` });
          }),

        enviarRevision: (n) => {
          const e = ej();
          const nota = e.notas.find((x) => x.n === n)!;
          const def = pack().notas.find((d) => d.n === n)!;
          if (!controlesOk(nota.controles)) return "Hay controles bloqueantes con diferencia.";
          if (nota.desactualizada) return "La nota tiene insumos que cambiaron. Actualízala antes de enviarla.";
          if (e.comentarios.some((c) => c.nota === n && c.estado === "abierto")) return "Hay comentarios abiertos en la nota.";
          if (def.textoBase && !nota.textoAceptado) return "El texto de la nota no ha sido aceptado.";
          mut((x) => {
            const nn = x.notas.find((y) => y.n === n)!;
            nn.estado = "Lista para revisión";
            nn.enviadaEl = new Date().toISOString();
            nn.diasEnEstado = 0;
            registrar({ track: "Generación de notas", objeto: `Nota ${n}`, accion: "Envío a revisión (versión congelada)", version: `v${nn.version}` });
          });
          return null;
        },

        comentar: (c) =>
          mut((e) => {
            e.comentarios.push({ ...c, id: uid("c"), fecha: new Date().toISOString(), estado: "abierto", respuestas: [], autor: get().usuarioId ?? "" });
            if (c.nota !== null) {
              const n = e.notas.find((x) => x.n === c.nota);
              // Solo la revisión formal de auditoría (consolidado pre-aprobado) devuelve la nota y el consolidado.
              if (n && c.instancia === "Auditoría" && e.auditoria.estado === "en revisión") {
                n.estado = "En corrección";
                n.versionAprobada = undefined;
                e.consolidadoPreaprobado = false;
                e.auditoria.estado = "cerrada con observaciones";
                e.estado = "En pre-aprobación";
              }
            }
            registrar({ track: c.instancia === "Directorio" ? "Aprobación Directorio" : "Pre-aprobación", objeto: c.nota ? `Nota ${c.nota}` : "Informe", accion: `Comentario (${c.instancia})`, despues: c.texto.slice(0, 90) });
          }),

        responder: (id, texto) =>
          mut((e) => {
            const c = e.comentarios.find((x) => x.id === id)!;
            c.respuestas.push({ autor: get().usuarioId ?? "", fecha: new Date().toISOString(), texto });
            registrar({ track: "Generación de notas", objeto: c.nota ? `Nota ${c.nota}` : "Informe", accion: "Respuesta a observación", despues: texto.slice(0, 90) });
          }),

        resolver: (id) =>
          mut((e) => {
            const c = e.comentarios.find((x) => x.id === id)!;
            c.estado = "resuelto";
            registrar({ track: "Pre-aprobación", objeto: c.nota ? `Nota ${c.nota}` : "Informe", accion: "Observación resuelta" });
          }),

        aprobarNota: (n) => {
          const e = ej();
          if (e.comentarios.some((c) => c.nota === n && c.estado === "abierto")) return "No se puede aprobar con comentarios abiertos.";
          mut((x) => {
            const nn = x.notas.find((y) => y.n === n)!;
            nn.estado = "Aprobada";
            nn.versionAprobada = nn.version;
            nn.diasEnEstado = 0;
            if (x.estado === "En generación" && x.notas.every((y) => ["Aprobada", "Lista para revisión"].includes(y.estado))) x.estado = "En pre-aprobación";
            registrar({ track: "Pre-aprobación", objeto: `Nota ${n}`, accion: "Aprobación de la nota", version: `v${nn.version}` });
          });
          return null;
        },

        devolverNota: (n) =>
          mut((x) => {
            const nn = x.notas.find((y) => y.n === n)!;
            nn.estado = "En corrección";
            nn.diasEnEstado = 0;
            registrar({ track: "Pre-aprobación", objeto: `Nota ${n}`, accion: "Devolución de la nota con comentarios", version: `v${nn.version}` });
          }),

        generarPreinforme: (revision) =>
          mut((e) => {
            const v = (e.preinforme?.version ?? 0) + 1;
            e.preinforme = { version: v, fecha: new Date().toISOString(), revisionAgente: revision };
            if (e.estado === "En generación") e.estado = "En pre-aprobación";
            registrar({ track: "Pre-aprobación", objeto: "Pre-informe", accion: "Generación del pre-informe (Agente de informe de cierre)", version: `v${v}` });
          }),

        preaprobarConsolidado: () => {
          const e = ej();
          if (e.notas.some((n) => n.estado !== "Aprobada")) return "Quedan notas sin aprobar.";
          if (e.comentarios.some((c) => c.estado === "abierto")) return "Quedan comentarios abiertos.";
          if (!e.preinforme) return "Genera primero el pre-informe.";
          mut((x) => {
            x.consolidadoPreaprobado = true;
            x.auditoria = { estado: "en revisión" };
            x.estado = "En revisión auditoría";
            registrar({ track: "Pre-aprobación", objeto: "Consolidado", accion: "Consolidado pre-aprobado · acceso de auditoría habilitado", version: `v${x.preinforme?.version}` });
          });
          return null;
        },

        cerrarAuditoria: () =>
          mut((x) => {
            x.auditoria = { estado: "cerrada", cerradaEl: new Date().toISOString() };
            registrar({ track: "Pre-aprobación", objeto: "Pre-informe", accion: "Cierre de revisión de auditoría sin observaciones", version: `v${x.preinforme?.version}` });
          }),

        enviarDirectorio: () =>
          mut((x) => {
            x.directorio = { estado: "en revisión" };
            x.estado = "En aprobación Directorio";
            registrar({ track: "Pre-aprobación", objeto: "Pre-informe", accion: "Envío al Directorio", version: `v${x.preinforme?.version}` });
          }),

        devolverDirectorio: () => {
          const e = ej();
          if (!e.comentarios.some((c) => c.instancia === "Directorio" && c.estado === "abierto")) return "Registra al menos un comentario antes de devolver.";
          mut((x) => {
            x.directorio = { estado: "devuelto" };
            registrar({ track: "Aprobación Directorio", objeto: "Informe financiero", accion: "Devolución con observaciones", version: `v${x.preinforme?.version}` });
          });
          return null;
        },

        asignarObservacion: (cid, n) =>
          mut((x) => {
            const c = x.comentarios.find((y) => y.id === cid)!;
            c.nota = n;
            const nn = x.notas.find((y) => y.n === n)!;
            nn.estado = "En corrección";
            nn.versionAprobada = undefined;
            registrar({ track: "Aprobación Directorio", objeto: `Nota ${n}`, accion: "Asignación de observación del Directorio" });
          }),

        reenviarDirectorio: () => {
          const e = ej();
          if (e.comentarios.some((c) => c.instancia === "Directorio" && c.estado === "abierto")) return "Hay observaciones del Directorio abiertas.";
          if (e.notas.some((n) => n.estado !== "Aprobada")) return "Hay notas en corrección sin aprobar.";
          mut((x) => {
            x.preinforme = { version: (x.preinforme?.version ?? 1) + 1, fecha: new Date().toISOString() };
            x.directorio = { estado: "en revisión" };
            registrar({ track: "Aprobación Directorio", objeto: "Informe financiero", accion: "Reenvío a aprobación", version: `v${x.preinforme.version}` });
          });
          return null;
        },

        aprobarDirectorio: () =>
          mut((x) => {
            const f = new Date().toISOString();
            x.directorio = { estado: "aprobado", acta: actaDe(x, f) };
            x.aprobadoEl = f;
            x.estado = "Aprobado";
            registrar({ track: "Aprobación Directorio", objeto: "Informe financiero", accion: "Aprobación final del informe · acta generada", version: `v${x.preinforme?.version}` });
          }),

        generarInforme: (id) =>
          mut((x) => {
            const inf = pack().informes.find((i) => i.id === id)!;
            const previos = x.informes.filter((i) => i.id === id);
            const v = previos.length + 1;
            x.informes.push({ id, nombre: inf.nombre, formato: inf.formato, version: v, uid: `${id.toUpperCase()}-${x.anio}${x.trimestre}-${String(hashStr(x.id + id + v) % 90000 + 10000)}`, fecha: new Date().toISOString(), usuario: get().usuarioId ?? "", publicado: false });
            registrar({ track: "Generación de informes", objeto: inf.nombre, accion: "Generación de informe", version: `v${v} · desde pre-informe v${x.preinforme?.version}` });
          }),

        registrarDescarga: (objeto, formato) => registrar({ track: "Generación de informes", objeto, accion: `Descarga ${formato}` }),

        publicarYCerrar: () =>
          mut((x) => {
            x.informes.forEach((i) => (i.publicado = true));
            x.estado = "Emitido";
            registrar({ track: "Generación de informes", objeto: "Informes", accion: "Informes marcados como publicados y enviados a la CMF", despues: "Emitido" });
          }),

        cerrarEjercicio: () =>
          mut((x) => {
            x.estado = "Cerrado";
            registrar({ track: "Generación de informes", objeto: "Ejercicio", accion: "Cierre del ejercicio", antes: "Emitido", despues: "Cerrado" });
          }),

        reabrirEjercicio: (justificacion) =>
          mut((x) => {
            const antes = x.estado;
            x.estado = "En generación";
            x.consolidadoPreaprobado = false;
            x.auditoria = { estado: "no iniciada" };
            x.directorio = { estado: "no enviado" };
            x.aprobadoEl = undefined;
            registrar({ track: "Portada", objeto: "Ejercicio", accion: "Reapertura del ejercicio (Administrador)", antes, despues: "En generación", justificacion });
          }),

        delegar: (suplente, hasta) =>
          registrar({ track: "Pre-aprobación", objeto: "Suplencia", accion: `Delegación de aprobación en ${usuario(suplente).nombre}`, despues: `Hasta ${hasta}`, justificacion: `Delegó ${usuario(get().usuarioId ?? "").nombre}` }),

        setIndustria: (id) => {
          const c = INDUSTRIAS[id].clientes[0];
          const config = { ...get().config, industria: id, cliente: c };
          set({ config, ...construir(config, get().escenario) });
        },
        setCliente: (id) => {
          const config = { ...get().config, cliente: id, industria: CLIENTES[id].industria };
          set({ config, ...construir(config, get().escenario) });
        },
        setColores: (c) => set({ config: { ...get().config, colores: { ...get().config.colores, [get().config.cliente]: c } } }),
        setLogo: (d) => {
          const logos = { ...get().config.logos };
          if (d) logos[get().config.cliente] = d;
          else delete logos[get().config.cliente];
          set({ config: { ...get().config, logos } });
        },
        reiniciar: (escenario) => {
          const esc = escenario ?? get().escenario;
          set({ escenario: esc, ...construir(get().config, esc) });
        }
      };
    },
    {
      name: "eeff-poc-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ config: s.config, escenario: s.escenario, ejercicios: s.ejercicios.filter((e) => !e.historico), ejercicioId: s.ejercicioId, log: s.log, inicializado: s.inicializado, usuarioId: s.usuarioId, perfilActivo: s.perfilActivo }),
      onRehydrateStorage: () => (s) => {
        if (!s) return;
        // Si cambió el periodo en curso desde la última sesión, se reconstruye para que la demo se vea actual.
        const p = periodoEnCurso();
        const firma = `${s.config.industria}|${s.config.cliente}|${s.escenario}|${p.anio}${p.trimestre}`;
        if (s.inicializado !== firma || !s.ejercicios.length) s.reiniciar(s.escenario);
        if (!s.ejercicios.find((e) => e.id === s.ejercicioId)) s.ejercicioId = s.ejercicios[0]?.id;
      }
    }
  )
);

export const puede = (perfil: Perfil | null, perfiles: Perfil[]) => perfil !== null && perfiles.includes(perfil);
