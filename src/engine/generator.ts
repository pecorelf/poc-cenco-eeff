// Motor de cálculo de notas. No conoce clientes ni industrias: recibe el pack y la configuración.
import type {
  IndustriaPack, ClienteConfig, NotaDef, CuadroCalc, LineaCalc, Cuenta, Control, Ejercicio, NotaRun,
  FuenteRun, Hito, EstadoNota, Ajuste, Comentario, EventoLog, VersionNota
} from "./types";
import { rng, hashStr, finTrimestre, sumarHabiles, isoDia, horaHabil, periodoAnterior, fechaLarga, fechaCorta, miles, uid } from "./util";

export const TOLERANCIA = 1; // M$ de tolerancia de redondeo

const SUFIJOS = ["Chile", "Argentina", "Brasil", "Perú", "Colombia", "Holding", "Filiales"];

export const periodoLabel = (anio: number, t: number) => `${t}T ${anio}`;
export const ejercicioId = (sociedad: string, anio: number, t: number) => `${sociedad}-${anio}-${t}`;

function prefijo(def: NotaDef) {
  if (def.caratula?.estado === "ER") return def.titulo.startsWith("Ingresos") ? "41" : "51";
  if ([17, 18, 19, 20, 21].includes(def.n) || /pasiv|pagar|provision|obligacion|depósito|captacion|deuda/i.test(def.titulo)) return "21";
  if (/patrimonio|reservas/i.test(def.titulo)) return "31";
  return "11";
}

/** Cuadros base de una nota: determinísticos por sociedad y periodo. Montos en M$, cuentas en pesos. */
export function cuadrosBase(def: NotaDef, sociedad: string, escalaSoc: number, anio: number, t: number): CuadroCalc[] {
  const r = rng(`${sociedad}|${anio}|${t}|${def.n}`);
  const crecimiento = r.range(-0.05, 0.13);
  const base = (def.escala ?? 1e8) * escalaSoc * r.range(0.94, 1.06) * (def.caratula?.estado === "ER" ? t / 4 : 1);
  let totalPrincipal = 0;
  return def.cuadros.map((c, ci) => {
    const lineasDef = c.lineas.filter((l) => l.kind !== "total");
    const pesos = lineasDef.map((l) => l.peso ?? 1);
    const esMov = c.tipo === "movimiento";
    const objetivo = ci === 0 ? base : totalPrincipal;
    const sumaPesos = esMov ? 1 : pesos.reduce((a, b) => a + b, 0);
    const lineas: LineaCalc[] = lineasDef.map((l, li) => {
      const ruido = l.id === "si" ? 1 : r.range(0.9, 1.1);
      const valorMM = Math.round((objetivo * (pesos[li] / sumaPesos) * ruido));
      const nCuentas = Math.max(1, Math.min(5, Math.round(Math.abs(valorMM) / (objetivo * 0.08)) + 1));
      const partes = r.split(nCuentas);
      const pref = prefijo(def);
      const cuentas: Cuenta[] = partes.map((p, k) => {
        const pesosCLP = Math.round(valorMM * 1000 * p + r.range(-450, 450));
        return {
          codigo: `${pref}${String(def.n).padStart(2, "0")}${String(li + 1).padStart(2, "0")}${String(k + 1).padStart(4, "0")}`,
          nombre: nCuentas === 1 ? l.label : `${l.label} · ${SUFIJOS[(k + li) % SUFIJOS.length]}`,
          pesos: pesosCLP,
          pesosComp: Math.round(pesosCLP / (1 + crecimiento + r.range(-0.04, 0.04)))
        };
      });
      const actual = Math.round(cuentas.reduce((a, x) => a + x.pesos, 0) / 1000);
      const comp = Math.round(cuentas.reduce((a, x) => a + x.pesosComp, 0) / 1000);
      const linea: LineaCalc = {
        id: l.id, label: l.label, kind: "line", actual, comp, cuentas,
        editable: Boolean(l.editable), origen: "C480",
        origenDetalle: def.fuentes.find((f) => f.startsWith("pack_")) && li % 3 === 2 ? `Pack país (${def.fuentes.find((f) => f.startsWith("pack_"))})` : "BPC C480"
      };
      if (c.comparativo === "mismo_periodo") {
        const acumAnt = t === 1 ? 0 : Math.round(actual * ((t - 1) / t) * r.range(0.96, 1.04));
        linea.trim = actual - acumAnt;
      }
      if (def.deps?.length && li === 0) {
        linea.origen = "nota";
        linea.origenDetalle = `Nota ${def.deps[0]}`;
      }
      return linea;
    });
    if (ci > 0 && lineas.length) {
      const dif = totalPrincipal - lineas.reduce((a, l) => a + l.actual, 0);
      const ul = lineas[lineas.length - 1];
      ul.actual += dif;
      ul.cuentas[ul.cuentas.length - 1].pesos += dif * 1000;
    }
    const tot: LineaCalc = {
      id: "total", label: c.lineas.find((l) => l.kind === "total")?.label ?? "Total", kind: "total",
      actual: lineas.reduce((a, l) => a + l.actual, 0), comp: lineas.reduce((a, l) => a + l.comp, 0),
      cuentas: [], editable: false, origen: "calculo", origenDetalle: "Suma de líneas"
    };
    if (c.comparativo === "mismo_periodo") tot.trim = lineas.reduce((a, l) => a + (l.trim ?? 0), 0);
    if (ci === 0) totalPrincipal = tot.actual;
    return { id: c.id, titulo: c.titulo, comparativo: c.comparativo, lineas: [...lineas, tot] };
  });
}

/** Cuadros vigentes = base + cuentas homologadas nuevas + ajustes confirmados. */
export function calcularCuadros(def: NotaDef, ej: Ejercicio, escalaSoc: number, ajustes: Ajuste[]): CuadroCalc[] {
  const cuadros = cuadrosBase(def, ej.sociedad, escalaSoc, ej.anio, ej.trimestre);
  // Cuentas nuevas que ya fueron asignadas a una línea en la tabla de homologación
  ej.homologacionPendiente
    .filter((h) => h.nota === def.n && h.asignada)
    .forEach((h) => {
      const c = cuadros[0];
      const l = c?.lineas.find((x) => x.id === h.asignada);
      if (!l) return;
      l.cuentas.push({ codigo: h.cuenta, nombre: h.nombre, pesos: h.monto * 1000, pesosComp: 0, nueva: true });
      l.actual += h.monto;
      // Las aperturas secundarias reciben la cuenta en la línea que corresponde por país, moneda o plazo.
      cuadros.slice(1).forEach((c2) => {
        const ls = c2.lineas.filter((x) => x.kind !== "total");
        const pista = (re: RegExp) => ls.find((x) => re.test(x.label));
        const pais = h.nombre.match(/Chile|Argentina|Brasil|Perú|Colombia/)?.[0];
        const destino = (pais && pista(new RegExp(pais))) || (pais && pais !== "Chile" && pista(/Dólar/)) || pista(/^Corriente$|Hasta 90/) || ls[0];
        if (destino) destino.actual += h.monto;
      });
    });
  ajustes
    .filter((a) => a.estado === "confirmado")
    .forEach((a) => {
      const c = cuadros.find((x) => x.id === a.cuadro);
      const l = c?.lineas.find((x) => x.id === a.linea);
      if (!l) return;
      l.actual += a.monto;
      l.ajuste = (l.ajuste ?? 0) + a.monto;
    });
  cuadros.forEach((c) => {
    const tot = c.lineas.find((l) => l.kind === "total")!;
    const ls = c.lineas.filter((l) => l.kind !== "total");
    tot.actual = ls.reduce((a, l) => a + l.actual, 0);
    if (tot.trim !== undefined) tot.trim = ls.reduce((a, l) => a + (l.trim ?? 0), 0);
  });
  return cuadros;
}

export function totalNota(cuadros: CuadroCalc[]) {
  return cuadros[0]?.lineas.find((l) => l.kind === "total")?.actual ?? 0;
}

/** Controles y cuadraturas de una nota generada. */
export function evaluarControles(def: NotaDef, nota: NotaRun, ej: Ejercicio, pack: IndustriaPack): Control[] {
  const out: Control[] = [];
  if (!nota.cuadros.length) return out;
  const total = totalNota(nota.cuadros);
  nota.cuadros.forEach((c) => {
    const tot = c.lineas.find((l) => l.kind === "total")!;
    const suma = c.lineas.filter((l) => l.kind !== "total").reduce((a, l) => a + l.actual, 0);
    out.push({ id: `suma-${c.id}`, nombre: `Suma de líneas = total · ${c.titulo}`, tipo: "suma", bloqueante: true, esperado: tot.actual, obtenido: suma, dif: suma - tot.actual, detalle: "Subtotales y total del cuadro." });
  });
  const defMov = def.cuadros.findIndex((c) => c.tipo === "movimiento");
  if (defMov >= 0) {
    const c = nota.cuadros[defMov];
    const si = c.lineas.find((l) => l.id === "si")!.actual;
    const movs = c.lineas.filter((l) => l.kind !== "total" && l.id !== "si").reduce((a, l) => a + l.actual, 0);
    const sf = c.lineas.find((l) => l.kind === "total")!.actual;
    out.push({ id: "mov", nombre: "Saldo inicial + movimientos = saldo final", tipo: "movimiento", bloqueante: true, esperado: sf, obtenido: si + movs, dif: si + movs - sf, detalle: `Saldo inicial ${miles(si)} + movimientos ${miles(movs)}.` });
  }
  nota.cuadros.slice(1).forEach((c) => {
    const t2 = c.lineas.find((l) => l.kind === "total")!.actual;
    const nombre = c.id === "mon" ? "Suma por moneda = total de la composición" : c.id === "ven" ? "Suma por plazo = total de la composición" : `Apertura "${c.titulo}" = total principal`;
    const d = t2 - total;
    out.push({ id: `ap-${c.id}`, nombre, tipo: "moneda", bloqueante: false, esperado: total, obtenido: t2, dif: Math.abs(d) <= TOLERANCIA ? 0 : d, detalle: "Apertura secundaria contra el total del cuadro principal." });
  });
  if (def.caratula) {
    const esperado = ej.caratula[def.n] ?? total;
    const dif = total - esperado;
    out.push({ id: "caratula", nombre: `Cuadratura con carátula (${def.caratula.estado}) · ${def.caratula.linea}`, tipo: "caratula", bloqueante: true, esperado, obtenido: total, dif: Math.abs(dif) <= TOLERANCIA ? 0 : dif, detalle: `Tolerancia de redondeo M$ ${TOLERANCIA}.` });
  }
  pack.cruzadas.filter((x) => x.a === def.n).forEach((x) => {
    const otra = ej.notas.find((n) => n.n === x.b);
    const desact = nota.desactualizada;
    const v = Math.round(totalNota(otra?.cuadros?.length ? otra.cuadros : []) || hashStr(x.id) % 1e7);
    out.push({ id: `x-${x.id}`, nombre: `Cuadratura cruzada · ${x.nombre}`, tipo: "cruzada", bloqueante: true, esperado: v, obtenido: desact ? v + 734 : v, dif: desact ? 734 : 0, detalle: desact ? `La Nota ${x.b} cambió después de generar esta nota.` : `Contra Nota ${x.b}.` });
  });
  return out;
}


export const controlesOk = (cs: Control[]) => cs.filter((c) => c.bloqueante).every((c) => c.dif === 0);

// ---------- Ejercicios ----------

export function hitosDe(fechaCierre: Date): Hito[] {
  const defs: [string, string, number, string][] = [
    ["h1", "Cargas completas", 4, "carga"],
    ["h2", "Notas generadas y cuadradas", 8, "notas"],
    ["h3", "Pre-aprobación de notas", 12, "preaprobacion"],
    ["h4", "Revisión auditoría externa", 16, "preaprobacion"],
    ["h5", "Sesión de Directorio", 20, "directorio"],
    ["h6", "Envío CMF y XBRL", 23, "informes"]
  ];
  return defs.map(([id, nombre, dh, track]) => ({ id, nombre, dh, track, fecha: isoDia(sumarHabiles(fechaCierre, dh)) }));
}

export const RESPONSABLE_NOTA = (n: number, total: number) => {
  if (n <= 4 || n === 24 || n === 27 || n === 28) return "u_proceso";
  if (n <= Math.round(total * 0.6)) return "u_nota1";
  return "u_nota2";
};

export function variablesTexto(def: NotaDef, ej: Ejercicio, razon: string, cierreAnterior: Date, fDir: string, cuadros: CuadroCalc[]): Record<string, string> {
  const tot = totalNota(cuadros);
  const m1 = cuadros[0]?.lineas[0]?.actual;
  return {
    razon,
    fecha_cierre: fechaLarga(ej.fechaCierre),
    cierre_anterior: fechaLarga(cierreAnterior),
    anio: String(ej.anio),
    fecha_directorio: fDir,
    dotacion: (118432 + (hashStr(ej.id) % 4000)).toLocaleString("es-CL"),
    total: `M$ ${miles(tot)}`,
    m1: `M$ ${miles(m1 ?? 0)}`
  };
}

function textoDe(def: NotaDef, ej: Ejercicio, razon: string, cierreAnterior: Date, fDir: string, cuadros: CuadroCalc[]) {
  if (!def.textoBase) return undefined;
  const v = variablesTexto(def, ej, razon, cierreAnterior, fDir, cuadros);
  let t = def.textoBase;
  Object.entries(v).forEach(([k, x]) => (t = t.split(`{{${k}}}`).join(x)));
  return t;
}

/** Texto e insumos del periodo actual y del anterior, para el Agente de texto. */
export function insumosTexto(pack: IndustriaPack, cliente: ClienteConfig, ej: Ejercicio, n: number) {
  const def = pack.notas.find((d) => d.n === n)!;
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad) ?? cliente.sociedades[0];
  const nota = ej.notas.find((x) => x.n === n)!;
  const ant = periodoAnterior(ej.anio, ej.trimestre, 4);
  const fAnt = finTrimestre(ant.anio, ant.trimestre);
  const ejAnt = { ...ej, id: ejercicioId(soc.id, ant.anio, ant.trimestre), anio: ant.anio, trimestre: ant.trimestre, fechaCierre: isoDia(fAnt) } as Ejercicio;
  const cuadrosAnt = cuadrosBase(def, soc.id, soc.escala, ant.anio, ant.trimestre);
  const cuadrosAct = nota.cuadros.length ? nota.cuadros : calcularCuadros(def, ej, soc.escala, nota.ajustes);
  const vAnt = variablesTexto(def, ejAnt, soc.nombre, finTrimestre(ant.anio - 1, 4), fechaLarga(sumarHabiles(fAnt, 20)), cuadrosAnt);
  const vAct = variablesTexto(def, ej, soc.nombre, finTrimestre(ej.anio - 1, 4), fechaDirectorio(ej), cuadrosAct);
  return { def, vAnt, vAct, textoAnterior: textoDe(def, ejAnt, soc.nombre, finTrimestre(ant.anio - 1, 4), fechaLarga(sumarHabiles(fAnt, 20)), cuadrosAnt) ?? "", cuadros: cuadrosAct };
}

export interface CrearOpciones {
  anio: number;
  trimestre: 1 | 2 | 3 | 4;
  sociedad: string;
  responsable: string;
  copiarParametros?: boolean;
  fechaCierre?: string;
}

/** Crea un ejercicio vacío (estado Creado): notas sin generar, fuentes pendientes. */
export function crearEjercicio(pack: IndustriaPack, cliente: ClienteConfig, o: CrearOpciones): Ejercicio {
  const soc = cliente.sociedades.find((s) => s.id === o.sociedad) ?? cliente.sociedades[0];
  const fc = o.fechaCierre ? new Date(o.fechaCierre) : finTrimestre(o.anio, o.trimestre);
  const r = rng(`${soc.id}|${o.anio}|${o.trimestre}|param`);
  const ej: Ejercicio = {
    id: ejercicioId(soc.id, o.anio, o.trimestre),
    anio: o.anio,
    trimestre: o.trimestre,
    periodo: periodoLabel(o.anio, o.trimestre),
    fechaCierre: isoDia(fc),
    sociedad: soc.id,
    estado: "Creado",
    responsable: o.responsable,
    creado: new Date().toISOString(),
    parametros: {
      uf: Math.round((39200 + (o.anio - 2026) * 1300 + o.trimestre * 310 + r.range(-40, 40)) * 100) / 100,
      usdCierre: Math.round(r.range(915, 985) * 100) / 100,
      usdPromedio: [0, 1, 2].map(() => Math.round(r.range(905, 990) * 100) / 100),
      homologacion: `HOM-${o.anio}.${o.trimestre}`,
      version: 1
    },
    hitos: hitosDe(fc),
    notas: pack.notas.map((d) => ({
      n: d.n, estado: "Pendiente de fuentes" as EstadoNota, responsable: RESPONSABLE_NOTA(d.n, pack.notas.length), diasEnEstado: 0,
      version: 0, generada: false, desactualizada: false, cuadros: [], controles: [], ajustes: [], textoAceptado: false, versiones: []
    })),
    fuentes: pack.fuentes.map((f) => ({ id: f.id, estado: "Pendiente", version: 0, versiones: [] })),
    caratula: {},
    homologacionPendiente: [],
    comentarios: [],
    consolidadoPreaprobado: false,
    auditoria: { estado: "no iniciada" },
    directorio: { estado: "no enviado" },
    informes: []
  };
  ej.caratula = caratulaDe(pack, ej, soc.escala);
  return ej;
}

export function caratulaDe(pack: IndustriaPack, ej: Ejercicio, escala: number) {
  const out: Record<number, number> = {};
  pack.notas.filter((d) => d.caratula).forEach((d) => {
    out[d.n] = totalNota(cuadrosBase(d, ej.sociedad, escala, ej.anio, ej.trimestre));
  });
  return out;
}

function snapshot(cuadros: CuadroCalc[]) {
  return cuadros.flatMap((c) => c.lineas.map((l) => ({ c: c.id, l: l.id, label: l.label, a: l.actual })));
}

export function nuevaVersion(nota: NotaRun, usuario: string, motivo: string, fecha?: string): VersionNota {
  return { v: nota.version, fecha: fecha ?? new Date().toISOString(), usuario, motivo, total: totalNota(nota.cuadros), estado: nota.estado, texto: nota.texto, snapshot: snapshot(nota.cuadros) };
}

/** Genera (o regenera) una nota con su versión y controles. */
export function generarNota(pack: IndustriaPack, cliente: ClienteConfig, ej: Ejercicio, n: number, usuario: string, fecha?: string) {
  const def = pack.notas.find((d) => d.n === n)!;
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad) ?? cliente.sociedades[0];
  const nota = ej.notas.find((x) => x.n === n)!;
  nota.cuadros = calcularCuadros(def, ej, soc.escala, nota.ajustes);
  nota.version += 1;
  nota.generada = true;
  nota.desactualizada = false;
  nota.estado = "Borrador";
  nota.diasEnEstado = 0;
  nota.controles = evaluarControles(def, nota, ej, pack);
  if (def.textoBase && !nota.texto) {
    nota.texto = textoDe(def, ej, soc.nombre, finTrimestre(ej.anio - 1, 4), fechaDirectorio(ej), nota.cuadros);
  }
  nota.versiones.push(nuevaVersion(nota, usuario, nota.version === 1 ? "Generación inicial" : "Regeneración", fecha));
  return nota;
}

/** Texto de la nota del periodo anterior (base del agente de texto). */
export function textoPeriodoAnterior(pack: IndustriaPack, cliente: ClienteConfig, ej: Ejercicio, n: number) {
  const def = pack.notas.find((d) => d.n === n)!;
  if (!def.textoBase) return "";
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad) ?? cliente.sociedades[0];
  const ant = periodoAnterior(ej.anio, ej.trimestre, 4);
  const fAnt = finTrimestre(ant.anio, ant.trimestre);
  const ejAnt = { ...ej, id: ejercicioId(soc.id, ant.anio, ant.trimestre), anio: ant.anio, trimestre: ant.trimestre, fechaCierre: isoDia(fAnt) } as Ejercicio;
  const cuadros = cuadrosBase(def, soc.id, soc.escala, ant.anio, ant.trimestre);
  const fDir = fechaLarga(sumarHabiles(fAnt, 20));
  const cierreAnt = finTrimestre(ant.anio - 1, 4);
  return textoDe(def, ejAnt, soc.nombre, cierreAnt, fDir, cuadros) ?? "";
}

export function fechaDirectorio(ej: Ejercicio) {
  return fechaLarga(ej.hitos.find((h) => h.id === "h5")?.fecha ?? ej.fechaCierre);
}

// ---------- Escenarios de demo ----------

export type Escenario = "en_curso" | "listo_consolidar" | "directorio" | "aprobado";

const PLAN_EN_CURSO: Record<string, number[]> = {
  Aprobada: [5, 6, 7, 9, 10, 11, 12, 14, 21, 31, 34, 36],
  "Lista para revisión": [13, 23, 25, 30, 32],
  "En corrección": [3, 33],
  Borrador: [15, 16, 17, 18, 19, 24, 26, 27, 28, 35],
  "Lista para generar": [1, 2, 4, 29, 37, 38],
  "Pendiente de fuentes": [8, 20, 22]
};

function planPara(pack: IndustriaPack): Record<number, EstadoNota> {
  const out: Record<number, EstadoNota> = {};
  if (pack.id === "retail") {
    Object.entries(PLAN_EN_CURSO).forEach(([e, ns]) => ns.forEach((n) => (out[n] = e as EstadoNota)));
    return out;
  }
  // Otras industrias: reparto proporcional determinista
  const orden: EstadoNota[] = ["Aprobada", "Aprobada", "Aprobada", "Lista para revisión", "Borrador", "Borrador", "En corrección", "Lista para generar", "Pendiente de fuentes"];
  pack.notas.forEach((d, i) => {
    const def = pack.notas[i];
    out[d.n] = def.tipo === "Texto" ? "Lista para generar" : orden[(i * 7) % orden.length];
  });
  return out;
}

export function sembrar(pack: IndustriaPack, cliente: ClienteConfig, ej: Ejercicio, escenario: Escenario, log: EventoLog[]) {
  const r = rng(`${ej.id}|seed`);
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad) ?? cliente.sociedades[0];
  const plan = planPara(pack);
  const pendientesFuente = escenario === "en_curso" ? (pack.id === "retail" ? { pack_pe: "Pendiente", rrhh_beneficios: "Con errores", inmob_tasaciones: "Validada", medioambiente: "Cargada" } : { riesgo_provisiones: "Validada", legal_juicios: "Pendiente" }) : {};
  const ev = (dias: number, usuario: string, perfil: string, track: string, objeto: string, accion: string, extra: Partial<EventoLog> = {}) =>
    log.push({ id: uid("e"), fecha: horaHabil(dias, r.next), usuario, perfil, ejercicio: ej.periodo, track, objeto, accion, ...extra });

  ev(9, ej.responsable, "Responsable del proceso", "Portada", "Ejercicio", "Creación del ejercicio", { despues: ej.periodo });
  ev(9, ej.responsable, "Responsable del proceso", "Portada", "Parámetros", "Registro de parámetros iniciales", { despues: `UF ${ej.parametros.uf} · USD ${ej.parametros.usdCierre}`, version: "v1" });

  // Fuentes
  ej.fuentes.forEach((f) => {
    const def = pack.fuentes.find((x) => x.id === f.id)!;
    const estado = (pendientesFuente as Record<string, string>)[f.id] ?? "Habilitada";
    f.estado = estado as FuenteRun["estado"];
    if (estado === "Pendiente") return;
    const dias = def.tipo === "integrada" ? (f.id === "sap_ksb1" ? 2 : 0) : r.int(1, 6);
    const v = def.tipo === "integrada" ? r.int(2, 4) : r.int(1, 2);
    f.version = v;
    f.cargadoPor = def.responsable;
    f.ultimaActualizacion = horaHabil(dias, r.next);
    f.registros = def.registros ? Math.round(def.registros * r.range(0.96, 1.04)) : r.int(40, 900);
    f.versiones = Array.from({ length: v }, (_, k) => ({ v: k + 1, fecha: horaHabil(dias + (v - k - 1), r.next), usuario: def.responsable, archivo: def.tipo === "integrada" ? `Extracción ${def.origen}` : `${f.id}_${ej.anio}T${ej.trimestre}_v${k + 1}.${def.formato.startsWith("PDF") ? "pdf" : def.formato.startsWith("Word") ? "docx" : "xlsx"}`, resultado: k + 1 < v ? "Reemplazada" : estado }));
    if (estado === "Con errores") {
      f.errores = [
        { fila: 214, columna: "F · Monto IAS", regla: "Tipo de dato: se esperaba número, se encontró texto (\"1.234,5 \")", bloqueante: true },
        { fila: 215, columna: "B · Cuenta", regla: "Cuenta 2203110044 no existe en la tabla de homologación", bloqueante: true },
        { fila: 12, columna: "C · Periodo", regla: "Periodo informado distinto al del ejercicio", bloqueante: true }
      ];
    }
    if (estado === "Validada") {
      f.errores = [
        { fila: 38, columna: "H · Valor tasación", regla: "Variación de 23,4% vs periodo anterior supera el rango esperado (±15%)", bloqueante: false },
        { fila: 41, columna: "H · Valor tasación", regla: "Variación de 18,9% vs periodo anterior supera el rango esperado (±15%)", bloqueante: false }
      ];
    }
    ev(dias, def.responsable, def.tipo === "integrada" ? "Responsable de carga" : "Responsable de carga", "Carga de información", def.nombre, def.tipo === "integrada" ? "Actualización desde Data Lake" : "Carga manual de archivo", { version: `v${v}` });
    ev(dias, "sistema", "Plataforma", "Carga de información", def.nombre, estado === "Con errores" ? "Validación rechazada" : "Validación de estructura y contenido", { despues: estado });
  });

  // Cuenta nueva sin homologar (Nota 18 en retail, nota de depósitos en banca)
  const notaKO = pack.id === "retail" ? 18 : 13;
  const defKO = pack.notas.find((d) => d.n === notaKO)!;
  const montoKO = 1284000 + (hashStr(ej.id) % 900) - 450;
  const lineaSug = defKO.cuadros[0].lineas.find((l) => l.editable)?.id ?? defKO.cuadros[0].lineas[0].id;
  if (escenario === "en_curso") {
    ej.homologacionPendiente = [
      { cuenta: pack.id === "retail" ? "2105990017" : "2130770021", nombre: pack.id === "retail" ? "Proveedores extranjeros en tránsito · Brasil" : "Depósitos a plazo · canal digital", monto: Math.round(montoKO * soc.escala), nota: notaKO, sugerida: pack.id === "retail" ? "pe" : lineaSug }
    ];
    ej.caratula[notaKO] = (ej.caratula[notaKO] ?? 0) + Math.round(montoKO * soc.escala);
  } else {
    ej.homologacionPendiente = [];
  }

  // Notas
  const fechasPorEstado: Record<string, number> = { Aprobada: 4, "Lista para revisión": 2, "En corrección": 1, Borrador: 1 };
  ej.notas.forEach((nota) => {
    const def = pack.notas.find((d) => d.n === nota.n)!;
    const objetivo: EstadoNota = escenario === "en_curso" ? plan[nota.n] : "Aprobada";
    nota.estado = objetivo;
    nota.diasEnEstado = objetivo === "Pendiente de fuentes" ? r.int(2, 4) : r.int(0, 3);
    if (objetivo === "Lista para generar" || objetivo === "Pendiente de fuentes") return;
    const dias = fechasPorEstado[objetivo] ?? 1;
    const nVers = r.int(1, 3);
    for (let k = 0; k < nVers; k++) generarNota(pack, cliente, ej, nota.n, nota.responsable, horaHabil(dias + (nVers - k), r.next));
    nota.estado = objetivo;
    if (def.textoBase) nota.textoAceptado = objetivo !== "Borrador";
    ev(dias + 1, nota.responsable, "Responsable de nota", "Generación de notas", `Nota ${nota.n}`, "Generación de la nota", { version: `v${nota.version}` });
    if (["Lista para revisión", "Aprobada", "En corrección"].includes(objetivo)) {
      nota.enviadaEl = horaHabil(dias, r.next);
      ev(dias, nota.responsable, "Responsable de nota", "Generación de notas", `Nota ${nota.n}`, "Envío a revisión", { version: `v${nota.version}` });
    }
    if (objetivo === "Aprobada") {
      nota.versionAprobada = nota.version;
      ev(Math.max(0, dias - 1), "u_aprob", "Aprobador de notas", "Pre-aprobación", `Nota ${nota.n}`, "Aprobación de la nota", { version: `v${nota.version}` });
    }
  });

  if (escenario === "en_curso") {
    // Nota 26 desactualizada por regeneración de la 16
    const n26 = ej.notas.find((n) => n.n === (pack.id === "retail" ? 26 : 20));
    if (n26 && n26.generada) {
      n26.desactualizada = true;
      n26.controles = evaluarControles(pack.notas.find((d) => d.n === n26.n)!, n26, ej, pack);
    }
    const c: Comentario[] = [];
    if (pack.id === "retail") {
      c.push({ id: uid("c"), nota: 3, celda: { cuadro: "liquidez", linea: "m4" }, autor: "u_aprob", instancia: "Pre-aprobación", fecha: horaHabil(1, r.next), texto: "El tramo de más de 5 años no incluye la serie AQ colocada en el periodo. Revisar contra el hecho esencial.", estado: "abierto", respuestas: [] });
      c.push({ id: uid("c"), nota: 33, celda: { cuadro: "pais", linea: "br" }, autor: "u_aprob", instancia: "Pre-aprobación", fecha: horaHabil(1, r.next), texto: "Brasil en el comparativo no calza con la apertura de la Nota 25. Confirmar reclasificación de segmentos.", estado: "abierto", respuestas: [{ autor: "u_nota2", fecha: horaHabil(0, r.next), texto: "Se reclasificó una tienda a Mejoramiento del hogar. Actualizo el comparativo." }] });
    }
    ej.comentarios = c;
    ej.estado = "En generación";
  } else {
    ej.notas.forEach((n) => (n.controles = evaluarControles(pack.notas.find((d) => d.n === n.n)!, n, ej, pack)));
    ej.estado = "En pre-aprobación";
    if (escenario === "directorio" || escenario === "aprobado") {
      ej.preinforme = { version: 2, fecha: horaHabil(3, r.next) };
      ej.consolidadoPreaprobado = true;
      ej.auditoria = { estado: "cerrada", cerradaEl: horaHabil(1, r.next) };
      ej.directorio = { estado: "en revisión" };
      ej.estado = "En aprobación Directorio";
      ev(3, "u_aprob", "Aprobador de notas", "Pre-aprobación", "Consolidado", "Consolidado pre-aprobado", { version: "v2" });
      ev(1, "u_audit", "Auditor externo", "Pre-aprobación", "Pre-informe", "Cierre de revisión de auditoría sin observaciones", { version: "v2" });
      ev(1, "u_aprob", "Aprobador de notas", "Pre-aprobación", "Pre-informe", "Envío al Directorio", { version: "v2" });
    }
    if (escenario === "aprobado") {
      const f = new Date().toISOString();
      ej.directorio = { estado: "aprobado", acta: actaDe(ej, f) };
      ej.aprobadoEl = f;
      ej.estado = "Aprobado";
      ev(0, "u_dir", "Gerencia – Directorio", "Aprobación Directorio", "Informe financiero", "Aprobación final del informe", { version: "v2" });
    }
  }
  ev(0, ej.responsable, "Responsable del proceso", "Portada", "Tablero", "Consulta del tablero de estado");
  log.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return ej;
}

export function actaDe(ej: Ejercicio, fecha: string) {
  const v = `Pre-informe v${ej.preinforme?.version ?? 1}`;
  return [
    { nivel: "Aprobación de notas", nombre: "u_aprob", fecha: ej.preinforme?.fecha ?? fecha, version: v },
    { nivel: "Auditoría externa", nombre: "u_audit", fecha: ej.auditoria.cerradaEl ?? fecha, version: v },
    { nivel: "Gerencia de Finanzas", nombre: "u_dir", fecha, version: v },
    { nivel: "Directorio", nombre: "u_dir", fecha, version: v }
  ];
}

/** Ejercicios históricos (cerrados), livianos: sus cuadros se calculan al abrirlos. */
export function historicos(pack: IndustriaPack, cliente: ClienteConfig, actual: { anio: number; trimestre: number }): Ejercicio[] {
  const out: Ejercicio[] = [];
  cliente.sociedades.forEach((s) => {
    for (let k = 1; k <= 8; k++) {
      const p = periodoAnterior(actual.anio, actual.trimestre, k);
      const ej = crearEjercicio(pack, cliente, { anio: p.anio, trimestre: p.trimestre, sociedad: s.id, responsable: "u_proceso" });
      const fDir = sumarHabiles(new Date(ej.fechaCierre), 20);
      ej.estado = "Cerrado";
      ej.historico = true;
      ej.aprobadoEl = isoDia(fDir);
      ej.consolidadoPreaprobado = true;
      ej.auditoria = { estado: "cerrada", cerradaEl: isoDia(sumarHabiles(new Date(ej.fechaCierre), 16)) };
      ej.preinforme = { version: 2 + (k % 2), fecha: isoDia(sumarHabiles(new Date(ej.fechaCierre), 13)) };
      ej.directorio = { estado: "aprobado", acta: actaDe(ej, isoDia(fDir)) };
      ej.notas.forEach((n) => { n.estado = "Aprobada"; n.version = 2; n.versionAprobada = 2; n.generada = true; });
      ej.fuentes.forEach((f) => { f.estado = "Habilitada"; f.version = 1; });
      ej.informes = pack.informes.map((inf, i) => ({ id: inf.id, nombre: inf.nombre, formato: inf.formato, version: 1, uid: `${inf.id.toUpperCase()}-${p.anio}${p.trimestre}-${(hashStr(ej.id + inf.id) % 90000) + 10000}`, fecha: isoDia(sumarHabiles(fDir, 1 + i)), usuario: "u_proceso", publicado: true }));
      out.push(ej);
    }
  });
  return out.sort((a, b) => b.fechaCierre.localeCompare(a.fechaCierre));
}

export { fechaCorta };
