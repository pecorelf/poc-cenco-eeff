import type { Ejercicio, IndustriaPack, ClienteConfig, EstadoNota, Perfil } from "./types";
import { ESTADOS_NOTA } from "./types";
import { hoy, habilesEntre, fechaCorta } from "./util";
import { usuario } from "../config/users";
import { totalNota } from "./generator";

export const TRACKS = [
  { id: "portada", n: "01", nombre: "Portada", ruta: "/inicio", perfiles: ["admin", "proceso", "carga", "nota", "aprobador", "auditor", "directorio", "consulta"] as Perfil[] },
  { id: "carga", n: "02", nombre: "Carga de información", ruta: "/carga", perfiles: ["carga", "nota", "proceso", "admin", "consulta"] as Perfil[] },
  { id: "notas", n: "03", nombre: "Generación de notas", ruta: "/notas", perfiles: ["nota", "proceso", "aprobador", "admin", "consulta"] as Perfil[] },
  { id: "preaprobacion", n: "04", nombre: "Pre-aprobación", ruta: "/preaprobacion", perfiles: ["aprobador", "auditor", "nota", "proceso", "admin", "consulta"] as Perfil[] },
  { id: "directorio", n: "05", nombre: "Aprobación Directorio", ruta: "/directorio", perfiles: ["directorio", "proceso", "nota", "admin", "consulta"] as Perfil[] },
  { id: "informes", n: "06", nombre: "Generación de informes", ruta: "/informes", perfiles: ["proceso", "nota", "auditor", "directorio", "admin", "consulta"] as Perfil[] }
];

export function etapaIndice(ej: Ejercicio) {
  switch (ej.estado) {
    case "Creado":
    case "En carga":
      return 1;
    case "En generación":
      return 2;
    case "En pre-aprobación":
    case "En revisión auditoría":
      return 3;
    case "En aprobación Directorio":
      return 4;
    case "Aprobado":
    case "Emitido":
      return 5;
    case "Cerrado":
      return 6;
  }
}

export function porEstado(ej: Ejercicio) {
  const out = Object.fromEntries(ESTADOS_NOTA.map((e) => [e, 0])) as Record<EstadoNota, number>;
  ej.notas.forEach((n) => out[n.estado]++);
  return out;
}

export function proximoHito(ej: Ejercicio) {
  const h = hoy();
  const hito = ej.hitos.find((x) => new Date(x.fecha) >= h) ?? ej.hitos[ej.hitos.length - 1];
  return { ...hito, diasHabiles: habilesEntre(h, new Date(hito.fecha)) };
}

export function pendientesCarga(ej: Ejercicio, pack: IndustriaPack) {
  return ej.fuentes.filter((f) => f.estado !== "Habilitada" && pack.fuentes.find((d) => d.id === f.id)?.obligatoriedad === "Obligatoria");
}

export function aprobacionesPendientes(ej: Ejercicio) {
  return ej.notas.filter((n) => n.estado === "Lista para revisión").length;
}

export interface Pendiente {
  id: string;
  tipo: string;
  texto: string;
  ruta: string;
  track: string;
}

export function misPendientes(ej: Ejercicio, pack: IndustriaPack, uid: string, perfiles: Perfil[]): Pendiente[] {
  const out: Pendiente[] = [];
  if (perfiles.includes("carga")) {
    ej.fuentes.forEach((f) => {
      const d = pack.fuentes.find((x) => x.id === f.id)!;
      if (f.estado !== "Habilitada" && d.responsable === uid) out.push({ id: `f-${f.id}`, tipo: "Carga", texto: `${d.nombre} · ${f.estado}`, ruta: `/carga?f=${f.id}`, track: "02" });
    });
  }
  if (perfiles.includes("nota")) {
    ej.notas.filter((n) => n.responsable === uid).forEach((n) => {
      const d = pack.notas.find((x) => x.n === n.n)!;
      const ko = n.controles.some((c) => c.bloqueante && c.dif !== 0);
      if (n.estado === "Lista para generar") out.push({ id: `g-${n.n}`, tipo: "Generar", texto: `Nota ${n.n} · ${d.titulo}`, ruta: `/notas/${n.n}`, track: "03" });
      else if (n.estado === "En corrección") out.push({ id: `c-${n.n}`, tipo: "Corregir", texto: `Nota ${n.n} · ${d.titulo}`, ruta: `/notas/${n.n}`, track: "03" });
      else if (n.estado === "Borrador" && (ko || n.desactualizada)) out.push({ id: `k-${n.n}`, tipo: ko ? "Control KO" : "Actualizar", texto: `Nota ${n.n} · ${d.titulo}`, ruta: `/notas/${n.n}`, track: "03" });
    });
    ej.comentarios.filter((c) => c.estado === "abierto" && c.nota && ej.notas.find((n) => n.n === c.nota)?.responsable === uid).forEach((c) => out.push({ id: `o-${c.id}`, tipo: "Comentario", texto: `Nota ${c.nota} · ${c.texto.slice(0, 60)}…`, ruta: `/notas/${c.nota}?tab=comentarios`, track: "03" }));
  }
  if (perfiles.includes("aprobador")) {
    ej.notas.filter((n) => n.estado === "Lista para revisión").forEach((n) => out.push({ id: `r-${n.n}`, tipo: "Revisar", texto: `Nota ${n.n} · ${pack.notas.find((x) => x.n === n.n)!.titulo}`, ruta: `/preaprobacion/${n.n}`, track: "04" }));
  }
  if (perfiles.includes("auditor") && ej.auditoria.estado === "en revisión") out.push({ id: "aud", tipo: "Revisión", texto: `Pre-informe v${ej.preinforme?.version} disponible para auditoría`, ruta: "/preaprobacion?vista=preinforme", track: "04" });
  if (perfiles.includes("directorio") && ej.directorio.estado === "en revisión") out.push({ id: "dir", tipo: "Aprobar", texto: `Informe financiero ${ej.periodo} preaprobado`, ruta: "/directorio", track: "05" });
  if (perfiles.includes("proceso")) {
    if (ej.directorio.estado === "devuelto") out.push({ id: "dirobs", tipo: "Observaciones", texto: "Observaciones del Directorio por distribuir", ruta: "/directorio", track: "05" });
    if (ej.estado === "Aprobado") out.push({ id: "inf", tipo: "Emitir", texto: "Generar informes CMF, XBRL e Informe 555", ruta: "/informes", track: "06" });
  }
  return out;
}

/** Contexto compacto para el Agente Asistente del proceso. */
export function contextoAsistente(ej: Ejercicio, pack: IndustriaPack, cliente: ClienteConfig) {
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad);
  const ph = proximoHito(ej);
  return {
    compania: cliente.nombre,
    hoy: fechaCorta(hoy()),
    ejercicio: {
      periodo: ej.periodo,
      sociedad: soc?.nombre,
      fechaCierre: fechaCorta(ej.fechaCierre),
      estado: ej.estado,
      proximoHito: { nombre: ph.nombre, fecha: fechaCorta(ph.fecha), diasHabiles: ph.diasHabiles },
      hitos: ej.hitos.map((h) => ({ nombre: h.nombre, diaHabil: `D+${h.dh}`, fecha: fechaCorta(h.fecha) })),
      notasPorEstado: porEstado(ej),
      parametros: ej.parametros
    },
    notas: ej.notas.map((n) => {
      const d = pack.notas.find((x) => x.n === n.n)!;
      return {
        n: n.n,
        titulo: d.titulo,
        tipo: d.tipo,
        estado: n.estado,
        responsable: usuario(n.responsable).nombre,
        controlesKO: n.controles.filter((c) => c.bloqueante && c.dif !== 0).map((c) => `${c.nombre} (dif ${c.dif})`),
        desactualizada: n.desactualizada,
        fuentes: d.fuentes,
        dependeDe: d.deps ?? [],
        total: n.generada ? totalNota(n.cuadros) : null
      };
    }),
    fuentes: ej.fuentes.map((f) => {
      const d = pack.fuentes.find((x) => x.id === f.id)!;
      return { id: f.id, nombre: d.nombre, tipo: d.tipo, obligatoriedad: d.obligatoriedad, estado: f.estado, responsable: usuario(d.responsable).nombre };
    }),
    cuentasSinHomologar: ej.homologacionPendiente.filter((h) => !h.asignada),
    comentariosAbiertos: ej.comentarios.filter((c) => c.estado === "abierto").map((c) => ({ nota: c.nota, instancia: c.instancia, texto: c.texto })),
    auditoria: ej.auditoria.estado,
    directorio: ej.directorio.estado,
    perfiles: ["Administrador del sistema", "Responsable del proceso", "Responsable de carga", "Responsable de nota", "Aprobador de notas", "Auditor externo", "Gerencia – Directorio", "Consulta"],
    reglas: [
      "La aprobación se hace sobre una versión y no se hereda a versiones posteriores.",
      "No se avanza de nivel con comentarios abiertos.",
      "Una nota solo se genera con todas sus fuentes obligatorias habilitadas.",
      "Los controles bloqueantes con diferencia impiden enviar la nota a revisión.",
      "Solo el Administrador puede reabrir un ejercicio cerrado, con justificación."
    ]
  };
}
