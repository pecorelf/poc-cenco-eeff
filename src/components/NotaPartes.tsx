import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Bot, CornerDownRight, GitCompare, Pencil } from "lucide-react";
import { useApp } from "../engine/store";
import { agente } from "../engine/api";
import type { CuadroCalc, Ejercicio, LineaCalc, NotaRun, NotaDef, Comentario, Control, IndustriaPack } from "../engine/types";
import { miles, pct, fechaCorta, fechaHora, finTrimestre, num } from "../engine/util";
import { usuario } from "../config/users";
import { Label, Avatar, Drawer, TextoAgente, usePerfiles, tiene, OkKo } from "./ui";
import { descargarXlsx, descargarDoc, esc } from "../engine/export";
import { TOLERANCIA } from "../engine/generator";

export function columnas(ej: Ejercicio, c: { comparativo: CuadroCalc["comparativo"] }) {
  const act = fechaCorta(ej.fechaCierre);
  const comp = c.comparativo === "cierre_anterior" ? fechaCorta(finTrimestre(ej.anio - 1, 4)) : fechaCorta(finTrimestre(ej.anio - 1, ej.trimestre));
  return { act, comp, trim: `${ej.periodo.split(" ")[0]} ${ej.anio}` };
}

export interface CeldaSel { cuadro: string; linea: string; col: "actual" | "comp" | "trim" }

/** Convierte un monto escrito en formato es-CL (con puntos, coma o paréntesis) a número. */
export function parseMonto(t: string): number | null {
  const limpio = t.trim();
  if (!limpio) return null;
  const neg = /^\(.*\)$/.test(limpio) || limpio.startsWith("-");
  const num = Number(limpio.replace(/[()\-\s$]/g, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(num)) return null;
  return Math.round(neg ? -num : num);
}

export interface EdicionCuadro {
  /** Valores escritos por el usuario, por clave "cuadro|linea". */
  valores: Record<string, string>;
  /** Cuadro original (antes de la capa provisoria). */
  original: CuadroCalc;
  onCambiar: (clave: string, texto: string) => void;
}

/** Cuadro en formato de presentación. Cada línea abre sus cuentas; cada cifra abre su trazabilidad. */
export function TablaCuadro({
  c, ej, nota, onCifra, onComentarCelda, destacar, comentarios = [], flash, edicion, idAncla
}: {
  c: CuadroCalc; ej: Ejercicio; nota: NotaRun; onCifra?: (s: CeldaSel, rect?: DOMRect) => void; onComentarCelda?: (s: CeldaSel) => void;
  destacar?: string[]; comentarios?: Comentario[]; flash?: boolean; edicion?: EdicionCuadro; idAncla?: string;
}) {
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const col = columnas(ej, c);
  const conTrim = c.comparativo === "mismo_periodo";
  const nuevas = ej.homologacionPendiente.filter((h) => h.nota === nota.n && !h.asignada);
  const ajustesDe = (linea: string) => nota.ajustes.filter((a) => a.estado === "confirmado" && a.cuadro === c.id && a.linea === linea);
  const cambiadas = edicion ? c.lineas.filter((l) => l.kind !== "total" && edicion.valores[`${c.id}|${l.id}`] !== undefined && parseMonto(edicion.valores[`${c.id}|${l.id}`]) !== edicion.original.lineas.find((o) => o.id === l.id)?.actual).length : 0;
  return (
    <div id={idAncla} className={`bg-panel border scroll-mt-4 ${edicion ? "border-[color:var(--accent-3)]" : "border-rule"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 min-h-10 py-2 border-b border-rule">
        <div className="font-medium text-[12.5px]">{c.titulo}</div>
        <div className="text-[11px] text-ink3 flex items-center gap-3">
          {edicion && cambiadas > 0 && <span className="font-medium" style={{ color: "var(--accent-3)" }}>{cambiadas} monto{cambiadas > 1 ? "s" : ""} en capa provisoria</span>}
          <span>M$ · estructura fija</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="tbl min-w-[620px]">
          <thead>
            <tr>
              <th>Concepto</th>
              {conTrim && <th className="num">{col.trim}</th>}
              <th className="num">{col.act}</th>
              <th className="num">{col.comp}</th>
              <th className="num w-[90px]">Var. %</th>
            </tr>
          </thead>
          <tbody>
            {c.lineas.map((l, li) => {
              const esTot = l.kind === "total";
              const comentsLinea = comentarios.filter((x) => x.celda?.cuadro === c.id && x.celda.linea === l.id && x.estado === "abierto");
              const v = l.comp ? ((l.actual - l.comp) / Math.abs(l.comp)) * 100 : 0;
              const clave = `${c.id}|${l.id}`;
              const orig = edicion?.original.lineas.find((o) => o.id === l.id);
              const provisoria = edicion && orig && orig.actual !== l.actual;
              const ajs = ajustesDe(l.id);
              const ajustada = !esTot && (l.ajuste ?? 0) !== 0;
              const celda = (colId: CeldaSel["col"], valor: number | undefined) => {
                if (colId === "actual" && edicion && !esTot) {
                  const texto = edicion.valores[clave] ?? miles(orig?.actual ?? l.actual);
                  return (
                    <td className="num py-1" style={provisoria ? { background: "color-mix(in srgb, var(--accent-3) 22%, white)" } : undefined}>
                      <input
                        className="w-[140px] h-7 px-2 text-right tnum border bg-white focus:outline-none"
                        style={{ borderColor: provisoria ? "var(--accent-3)" : "var(--rule)" }}
                        value={texto}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => edicion.onCambiar(clave, e.target.value)}
                        aria-label={`Monto ${l.label}`}
                      />
                      {provisoria && <div className="text-[10.5px] text-ink3 tnum leading-tight mt-0.5"><span className="line-through">{miles(orig!.actual)}</span> · {l.actual - orig!.actual > 0 ? "+" : ""}{miles(l.actual - orig!.actual)}</div>}
                    </td>
                  );
                }
                const marcaAjuste = colId === "actual" && ajustada;
                const marcaProv = colId === "actual" && provisoria;
                return (
                  <td className={`num ${esTot ? "font-semibold" : ""}`} style={marcaAjuste || marcaProv ? { background: "color-mix(in srgb, var(--accent-3) 18%, white)", boxShadow: "inset 2px 0 0 var(--accent-3)" } : undefined}
                    title={marcaAjuste ? `Ajustado: original M$ ${miles(l.actual - (l.ajuste ?? 0))} · ajuste M$ ${miles(l.ajuste ?? 0)}${ajs[0] ? ` · ${ajs.map((a) => a.justificacion).join(" / ")}` : ""}` : undefined}>
                    <span className="inline-flex items-center justify-end gap-1">
                      {marcaAjuste && <span className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: "#9a5a00" }}>ajustado</span>}
                      <button
                        onClick={(e) => onCifra?.({ cuadro: c.id, linea: l.id, col: colId }, (e.currentTarget as HTMLElement).getBoundingClientRect())}
                        onContextMenu={(e) => { if (onComentarCelda) { e.preventDefault(); onComentarCelda({ cuadro: c.id, linea: l.id, col: colId }); } }}
                        className={`tnum px-1 -mx-1 ${onCifra ? "hover:bg-accentSoft hover:text-accent cursor-pointer" : ""}`}
                        title={onCifra ? "Ver trazabilidad de la cifra" : undefined}
                      >
                        {valor === undefined ? "" : miles(valor)}
                      </button>
                    </span>
                    {marcaAjuste && <div className="text-[10.5px] text-ink3 tnum leading-tight"><span className="line-through">{miles(l.actual - (l.ajuste ?? 0))}</span> · {(l.ajuste ?? 0) > 0 ? "+" : ""}{miles(l.ajuste ?? 0)}</div>}
                  </td>
                );
              };
              return (
                <Fragment key={l.id}>
                  <motion.tr
                    initial={flash ? { opacity: 0, y: 4 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: li * 0.04 }}
                    className={`${esTot ? "[&>td]:border-t [&>td]:border-t-ink3 [&>td]:bg-paper" : ""} ${destacar?.includes(l.id) ? "flash-ko" : ""}`}
                  >
                    <td className={esTot ? "font-semibold" : ""}>
                      <span className="inline-flex items-center gap-1 flex-wrap">
                        {!esTot && l.cuentas.length > 0 ? (
                          <button className="text-ink3 hover:text-ink" onClick={() => setAbiertas({ ...abiertas, [l.id]: !abiertas[l.id] })} aria-label="Ver cuentas">
                            <ChevronRight size={13} className={`transition-transform ${abiertas[l.id] ? "rotate-90" : ""}`} />
                          </button>
                        ) : <span className="w-[13px]" />}
                        {l.label}
                        {comentsLinea.length > 0 && <span className="inline-flex items-center gap-0.5 text-[10.5px] ml-1" style={{ color: comentsLinea.some((x) => x.instancia === "Directorio") ? "var(--accent-3)" : "var(--warn)" }}><MessageSquare size={11} />{comentsLinea.length}</span>}
                        {esTot && nuevas.length > 0 && c === nota.cuadros[0] && <span className="text-[10.5px] text-ko ml-2 font-normal inline-flex items-center gap-1"><AlertTriangle size={11} /> cuenta sin asignar</span>}
                      </span>
                    </td>
                    {conTrim && celda("trim", l.trim)}
                    {celda("actual", l.actual)}
                    {celda("comp", l.comp)}
                    <td className="num text-ink2 text-[11.5px]">{l.comp ? pct(v) : "—"}</td>
                  </motion.tr>
                  <AnimatePresence>
                    {abiertas[l.id] && l.cuentas.map((cu, k) => (
                      <motion.tr key={cu.codigo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: k * 0.03 }} className="text-[11.5px] text-ink2 [&>td]:bg-paper">
                        <td className="pl-10"><span className="tnum text-ink3 mr-2">{cu.codigo}</span>{cu.nombre}{cu.nueva && <span className="ml-1 text-accent">· homologada en este periodo</span>}</td>
                        {conTrim && <td />}
                        <td className="num" title={`$ ${miles(cu.pesos)}`}>{miles(Math.round(cu.pesos / 1000))}</td>
                        <td className="num">{cu.pesosComp ? miles(Math.round(cu.pesosComp / 1000)) : "—"}</td>
                        <td className="num text-ink3 whitespace-nowrap">$ {miles(cu.pesos)}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Panel de controles con verificación secuencial. */
export function PanelControles({ controles, animar = true, onTrazar }: { controles: Control[]; animar?: boolean; onTrazar?: (c: Control) => void }) {
  const [paso, setPaso] = useState(animar ? 0 : controles.length);
  const firma = controles.map((c) => c.id + c.dif).join("|");
  useEffect(() => {
    if (!animar) return setPaso(controles.length);
    setPaso(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setPaso(i);
      if (i >= controles.length) clearInterval(t);
    }, 170);
    return () => clearInterval(t);
  }, [firma]);
  const ko = controles.filter((c) => c.bloqueante && c.dif !== 0).length;
  return (
    <div className="bg-panel border border-rule">
      <div className="flex items-center justify-between px-4 h-10 border-b border-rule">
        <div className="font-medium text-[12.5px]">Controles y cuadraturas</div>
        <div className="text-[11.5px]">{paso >= controles.length ? (ko ? <span className="text-ko font-medium">{ko} bloqueante{ko > 1 ? "s" : ""} con diferencia</span> : <span className="text-ok font-medium">Todos los bloqueantes OK</span>) : <span className="text-ink3">Verificando…</span>}</div>
      </div>
      <div className="overflow-x-auto"><table className="tbl">
        <thead><tr><th className="w-6" /><th>Control</th><th>Tipo</th><th className="num">Esperado</th><th className="num">Obtenido</th><th className="num">Resultado</th></tr></thead>
        <tbody>
          {controles.map((c, i) => {
            const hecho = paso > i;
            const ok = c.dif === 0;
            return (
              <tr key={c.id} className={hecho && !ok && c.bloqueante ? "[&>td]:bg-[color-mix(in_srgb,var(--ko)_5%,white)]" : ""}>
                <td>{hecho ? (ok ? <CheckCircle2 size={14} className="text-ok" /> : c.bloqueante ? <XCircle size={14} className="text-ko" /> : <AlertTriangle size={14} className="text-warn" />) : paso === i ? <span className="block w-[7px] h-[7px] bg-accent live-dot" /> : <span className="block w-[7px] h-[7px] border border-rule" />}</td>
                <td>
                  <div className={hecho ? "" : "text-ink3"}>{c.nombre}</div>
                  <div className="text-[10.5px] text-ink3">{c.detalle}</div>
                </td>
                <td className="text-[11.5px] text-ink2 whitespace-nowrap">{c.bloqueante ? "Bloqueante" : "Informativo"}</td>
                <td className="num text-ink2">{hecho ? miles(c.esperado) : ""}</td>
                <td className="num">{hecho ? miles(c.obtenido) : ""}</td>
                <td className="num whitespace-nowrap">
                  {hecho && (
                    <span className="inline-flex items-center gap-2">
                      <OkKo ok={ok} dif={c.dif} />
                      {!ok && onTrazar && <button className="btn btn-sm btn-g text-accent" onClick={() => onTrazar(c)}>Trazar</button>}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      <div className="px-4 py-2 text-[10.5px] text-ink3 border-t border-rule2">Tolerancia de redondeo M$ {TOLERANCIA} · resultados asociados a la versión vigente</div>
    </div>
  );
}

// ---------- Trazabilidad ----------

interface NodoT { id: string; titulo: string; sub: string; tono?: "ko" | "ajuste" | "normal" }

export function Trazabilidad({ sel, nota, def, onClose }: { sel: CeldaSel | null; nota: NotaRun; def: NotaDef; onClose: () => void }) {
  const ej = useApp((s) => s.ej());
  const [texto, setTexto] = useState("");
  const [fuente, setFuente] = useState("");
  const [cargando, setCargando] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const nav = useNavigate();

  const datos = useMemo(() => {
    if (!sel) return null;
    const c = nota.cuadros.find((x) => x.id === sel.cuadro);
    const l = c?.lineas.find((x) => x.id === sel.linea);
    if (!c || !l) return null;
    const valor = sel.col === "actual" ? l.actual : sel.col === "comp" ? l.comp : l.trim ?? 0;
    const esTot = l.kind === "total";
    const nuevas = ej.homologacionPendiente.filter((h) => h.nota === nota.n && !h.asignada);
    const cuentas = esTot ? c.lineas.filter((x) => x.kind !== "total").flatMap((x) => x.cuentas) : l.cuentas;
    const car = nota.controles.find((x) => x.tipo === "caratula");
    return { c, l, valor, esTot, nuevas: esTot || l.id === nuevas[0]?.sugerida ? nuevas : [], cuentas, car };
  }, [sel, nota]);

  const pedir = async () => {
    if (!datos || !sel) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setTexto("");
    setCargando(true);
    const col = columnas(ej, datos.c);
    const contexto = {
      cifra: {
        nota: nota.n, titulo: def.titulo, cuadro: datos.c.titulo, linea: datos.l.label, columna: sel.col === "actual" ? col.act : sel.col === "comp" ? col.comp : `trimestre ${col.trim}`,
        valor: datos.valor, esTotal: datos.esTot,
        lineas: datos.esTot ? datos.c.lineas.filter((x) => x.kind !== "total").map((x) => ({ linea: x.label, actual: x.actual, comp: x.comp })) : undefined,
        cuentas: sel.col === "trim" ? [] : datos.cuentas.slice(0, 25).map((x) => ({ codigo: x.codigo, nombre: x.nombre, pesos: sel.col === "comp" ? x.pesosComp : x.pesos })),
        fuente: datos.l.origenDetalle === "Suma de líneas" ? "BPC C480" : datos.l.origenDetalle,
        calculo: sel.col === "trim" ? "Trimestre = acumulado actual menos acumulado al trimestre anterior" : "Suma de cuentas en pesos / 1.000, redondeado a M$",
        ajustes: sel.col === "actual" ? nota.ajustes.filter((a) => a.estado === "confirmado" && a.cuadro === sel.cuadro && (datos.esTot || a.linea === sel.linea)).map((a) => ({ monto: a.monto, justificacion: a.justificacion, usuario: usuario(a.usuario).nombre })) : [],
        cuentasNuevas: datos.nuevas.map((h) => ({ cuenta: h.cuenta, nombre: h.nombre, monto: h.monto, lineaSugerida: datos.c.lineas.find((x) => x.id === h.sugerida)?.label })),
        cuadraturaCaratula: datos.car ? { esperado: datos.car.esperado, obtenido: datos.car.obtenido, diferencia: datos.car.dif } : undefined
      }
    };
    try {
      const r = await agente("trazabilidad", contexto, [{ role: "user", content: `Explica el origen de la cifra ${miles(datos.valor)} de la Nota ${nota.n}.` }], setTexto, ctrl.current.signal);
      setFuente(r.fuente);
    } catch (e: any) {
      if (e.name !== "AbortError") setTexto(`No se pudo consultar al Agente de trazabilidad: ${e.message}`);
    }
    setCargando(false);
  };

  useEffect(() => {
    if (sel) pedir();
    return () => ctrl.current?.abort();
  }, [sel?.cuadro, sel?.linea, sel?.col]);

  // Grafo
  const nodosIzq: NodoT[] = useMemo(() => {
    if (!datos || !sel) return [];
    if (sel.col === "trim") return [{ id: "acum", titulo: "Acumulado actual", sub: `M$ ${miles(datos.l.actual)}` }, { id: "ant", titulo: "Acumulado trimestre anterior", sub: `M$ ${miles(datos.l.actual - (datos.l.trim ?? 0))}` }];
    const base: NodoT[] = datos.esTot
      ? datos.c.lineas.filter((x) => x.kind !== "total").slice(0, 5).map((x) => ({ id: x.id, titulo: x.label, sub: `M$ ${miles(sel.col === "comp" ? x.comp : x.actual)}` }))
      : datos.l.cuentas.slice(0, 5).map((x) => ({ id: x.codigo, titulo: x.codigo, sub: `$ ${miles(sel.col === "comp" ? x.pesosComp : x.pesos)}` }));
    datos.nuevas.forEach((h) => base.push({ id: h.cuenta, titulo: `${h.cuenta} · sin asignar`, sub: `M$ ${miles(h.monto)} fuera del cuadro`, tono: "ko" }));
    return base;
  }, [datos, sel]);
  const ajuste = sel?.col === "actual" ? (datos?.l.ajuste ?? (datos?.esTot ? datos.c.lineas.reduce((a, x) => a + (x.ajuste ?? 0), 0) : 0)) : 0;

  const W = 600, H = Math.max(210, nodosIzq.length * 44 + 30);
  const yN = (i: number) => 15 + i * ((H - 30) / Math.max(1, nodosIzq.length - 1 || 1)) - (nodosIzq.length === 1 ? -((H - 30) / 2) + 15 : 0);
  const posY = (i: number) => (nodosIzq.length === 1 ? H / 2 : 22 + i * ((H - 44) / (nodosIzq.length - 1)));
  const xs = { f: 0, n: 128, c: 360, v: 492 };
  void yN;

  return (
    <Drawer open={Boolean(sel && datos)} onClose={onClose} width={660} title={<span className="flex items-center gap-2"><Bot size={15} className="text-accent" /> Trazabilidad del dato · Nota {nota.n}</span>}>
      {datos && sel && (
        <div>
          <div className="px-5 py-4 border-b border-rule">
            <Label>{datos.c.titulo} · {datos.l.label}</Label>
            <div className="text-[26px] font-semibold tnum leading-tight">M$ {miles(datos.valor)}</div>
            <div className="text-[11.5px] text-ink3">Origen declarado: {datos.l.origenDetalle}{datos.l.origen === "nota" ? " (nota de origen)" : ""}</div>
          </div>
          <div className="px-5 py-4 border-b border-rule overflow-x-auto">
            <div className="relative" style={{ width: W, height: H }}>
              <svg width={W} height={H} className="absolute inset-0">
                {nodosIzq.map((n, i) => (
                  <Fragment key={n.id}>
                    <motion.path d={`M ${xs.f + 104} ${H / 2} C ${xs.f + 118} ${H / 2}, ${xs.n - 14} ${posY(i)}, ${xs.n} ${posY(i)}`} fill="none" stroke={n.tono === "ko" ? "var(--ko)" : "var(--ink-3)"} strokeWidth={1} strokeDasharray={n.tono === "ko" ? "4 4" : undefined} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }} />
                    {n.tono !== "ko" && <motion.path d={`M ${xs.n + 200} ${posY(i)} C ${xs.n + 220} ${posY(i)}, ${xs.c - 20} ${H / 2}, ${xs.c} ${H / 2}`} fill="none" stroke="var(--accent)" strokeWidth={1.2} className="flow-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 + i * 0.08 }} />}
                  </Fragment>
                ))}
                <motion.path d={`M ${xs.c + 112} ${H / 2} L ${xs.v} ${H / 2}`} stroke="var(--accent)" strokeWidth={1.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 1.3 }} />
                {ajuste !== 0 && <motion.path d={`M ${xs.c + 56} ${H - 6} L ${xs.c + 56} ${H / 2 + 26}`} stroke="var(--accent-3)" strokeWidth={1.4} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 1.5 }} />}
              </svg>
              <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="absolute bg-paper border border-rule px-2 py-1.5 text-[11px]" style={{ left: xs.f, top: H / 2 - 24, width: 104 }}>
                <div className="font-medium leading-tight">{sel.col === "trim" ? "Cálculo trimestral" : datos.l.origen === "nota" ? datos.l.origenDetalle : datos.l.origenDetalle.startsWith("Pack") ? "Pack país" : "BPC C480"}</div>
                <div className="text-ink3 leading-tight">{datos.l.origenDetalle.startsWith("Pack") ? datos.l.origenDetalle.replace("Pack país ", "") : "Data Lake · v" + (ej.fuentes.find((f) => f.id === "bpc_c480")?.version ?? 1)}</div>
              </motion.div>
              {nodosIzq.map((n, i) => (
                <motion.div key={n.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className={`absolute border px-2 py-1 text-[11px] bg-panel ${n.tono === "ko" ? "flash-ko" : ""}`} style={{ left: xs.n, top: posY(i) - 17, width: 200, borderColor: n.tono === "ko" ? "var(--ko)" : "var(--rule)", borderStyle: n.tono === "ko" ? "dashed" : "solid" }}>
                  <div className={`truncate leading-tight ${n.tono === "ko" ? "text-ko font-medium" : ""}`}>{n.titulo}</div>
                  <div className="text-ink3 tnum leading-tight truncate">{n.sub}</div>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} className="absolute border border-accent bg-accentSoft px-2 py-1.5 text-[11px]" style={{ left: xs.c, top: H / 2 - 24, width: 112 }}>
                <div className="font-medium leading-tight">{sel.col === "trim" ? "Diferencia" : datos.esTot ? "Σ líneas" : "Σ cuentas ÷ 1.000"}</div>
                <div className="text-ink3 leading-tight">{sel.col === "trim" ? "acumulado − anterior" : "redondeo a M$"}</div>
              </motion.div>
              {ajuste !== 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="absolute border px-2 py-1 text-[11px] bg-panel" style={{ left: xs.c, top: H - 24, width: 112, borderColor: "var(--accent-3)" }}>
                  Ajuste manual <span className="tnum">{miles(ajuste)}</span>
                </motion.div>
              )}
              <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5 }} className="absolute bg-ink text-white px-2 py-1.5 text-[11px]" style={{ left: xs.v, top: H / 2 - 24, width: 108 }}>
                <div className="leading-tight opacity-70">Cifra publicada</div>
                <div className="font-semibold tnum leading-tight">{miles(datos.valor)}</div>
              </motion.div>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Agente de trazabilidad</Label>
              {fuente === "respaldo" && <span className="text-[10.5px] text-ink3">Respuesta sin conexión al modelo</span>}
            </div>
            <div className="text-[12.5px] min-h-[60px]">
              {texto ? <TextoAgente texto={texto} cursor={cargando} /> : <div className="h-4 w-2/3 shimmer" />}
            </div>
            {datos.nuevas.length > 0 && !cargando && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { onClose(); nav("/carga?tab=homologacion"); }} className="btn btn-p btn-sm mt-3">Asignar cuenta {datos.nuevas[0].cuenta} en homologación</motion.button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ---------- Comentarios ----------

const COLOR_INST: Record<Comentario["instancia"], string> = { "Pre-aprobación": "var(--warn)", Auditoría: "var(--accent)", Directorio: "var(--accent-3)" };

export function HiloComentarios({ comentarios, nota, def, puedeResponder = true }: { comentarios: Comentario[]; nota?: NotaRun; def?: NotaDef; puedeResponder?: boolean }) {
  const responder = useApp((s) => s.responder);
  const resolver = useApp((s) => s.resolver);
  const uid = useApp((s) => s.usuarioId);
  const perfiles = usePerfiles();
  const [resp, setResp] = useState<Record<string, string>>({});
  if (!comentarios.length) return <div className="text-[12px] text-ink3 px-4 py-4">Sin observaciones registradas.</div>;
  return (
    <div className="divide-y divide-rule2">
      {comentarios.map((c) => {
        const linea = c.celda && nota ? nota.cuadros.find((x) => x.id === c.celda!.cuadro)?.lineas.find((l) => l.id === c.celda!.linea) : undefined;
        const cuadro = c.celda && def ? def.cuadros.find((x) => x.id === c.celda!.cuadro)?.titulo : undefined;
        const puedeCerrar = c.autor === uid || perfiles.includes("proceso");
        return (
          <motion.div key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`px-4 py-3 ${c.estado === "resuelto" ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2 text-[11.5px]">
              <Avatar id={c.autor} size={20} />
              <span className="font-medium truncate min-w-0">{usuario(c.autor).nombre}</span>
              <span className="px-1.5 h-[18px] inline-flex items-center text-[10.5px] border whitespace-nowrap shrink-0" style={{ color: COLOR_INST[c.instancia], borderColor: COLOR_INST[c.instancia] }}>{c.instancia}</span>
              <span className={`ml-auto whitespace-nowrap shrink-0 ${c.estado === "abierto" ? "text-warn" : "text-ok"}`}>{c.estado === "abierto" ? "Abierto" : "Resuelto"}</span>
            </div>
            <div className="text-[10.5px] text-ink3 mt-1 ml-7 tnum">{fechaHora(c.fecha)}{(c.celda || c.nota) && <> · {c.nota ? `Nota ${c.nota}` : "Informe general"}{cuadro ? ` · ${cuadro}` : ""}{linea ? ` · celda "${linea.label}"` : ""}</>}</div>
            <div className="text-[12.5px] mt-1 ml-7">{c.texto}</div>
            {c.respuestas.map((r, i) => (
              <div key={i} className="ml-7 mt-2 flex gap-2 text-[12px]">
                <CornerDownRight size={13} className="text-ink3 mt-0.5 shrink-0" />
                <div><span className="font-medium">{usuario(r.autor).nombre}</span> <span className="text-ink3 text-[11px]">{fechaHora(r.fecha)}</span><div className="text-ink2">{r.texto}</div></div>
              </div>
            ))}
            {c.estado === "abierto" && (
              <div className="ml-7 mt-2 flex flex-wrap gap-2">
                {puedeResponder && (
                  <>
                    <input className="inp !h-7 text-[12px]" placeholder="Responder…" value={resp[c.id] ?? ""} onChange={(e) => setResp({ ...resp, [c.id]: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter" && resp[c.id]?.trim()) { responder(c.id, resp[c.id]); setResp({ ...resp, [c.id]: "" }); } }} />
                    <button className="btn btn-sm" disabled={!resp[c.id]?.trim()} onClick={() => { responder(c.id, resp[c.id]); setResp({ ...resp, [c.id]: "" }); }}>Responder</button>
                  </>
                )}
                <button className="btn btn-sm" disabled={!puedeCerrar} title={puedeCerrar ? "" : "Solo el autor o el Responsable del proceso pueden cerrarlo"} onClick={() => resolver(c.id)}>Marcar resuelto</button>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------- Versiones ----------

export function Versiones({ nota }: { nota: NotaRun }) {
  const vs = nota.versiones;
  const [a, setA] = useState(Math.max(0, vs.length - 2));
  const [b, setB] = useState(vs.length - 1);
  if (!vs.length) return <div className="text-[12px] text-ink3 p-4">La nota aún no tiene versiones.</div>;
  const va = vs[Math.min(a, vs.length - 1)], vb = vs[Math.min(b, vs.length - 1)];
  const filas = vb.snapshot.map((s) => ({ ...s, antes: va.snapshot.find((x) => x.c === s.c && x.l === s.l)?.a }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
      <div className="bg-panel border border-rule">
        <div className="px-4 h-10 flex items-center border-b border-rule font-medium text-[12.5px]">Historial</div>
        {[...vs].reverse().map((v) => {
          const i = vs.indexOf(v);
          return (
            <div key={v.v} className="px-4 py-2.5 border-b border-rule2 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold tnum">v{v.v}</span>
                {nota.versionAprobada === v.v && <span className="text-[10.5px] text-ok border border-ok px-1">aprobada</span>}
                <span className="flex-1" />
                <label className="text-[11px] text-ink3 flex items-center gap-1"><input type="radio" checked={a === i} onChange={() => setA(i)} />A</label>
                <label className="text-[11px] text-ink3 flex items-center gap-1"><input type="radio" checked={b === i} onChange={() => setB(i)} />B</label>
              </div>
              <div className="text-ink2">{v.motivo}</div>
              <div className="text-[11px] text-ink3">{usuario(v.usuario).nombre} · {fechaHora(v.fecha)} · M$ {miles(v.total)}</div>
            </div>
          );
        })}
      </div>
      <div className="bg-panel border border-rule">
        <div className="px-4 h-10 flex items-center gap-2 border-b border-rule font-medium text-[12.5px]"><GitCompare size={14} /> Comparación v{va.v} → v{vb.v}</div>
        <div className="overflow-x-auto"><table className="tbl">
          <thead><tr><th>Línea</th><th className="num">v{va.v}</th><th className="num">v{vb.v}</th><th className="num">Diferencia</th></tr></thead>
          <tbody>
            {filas.map((f, i) => {
              const d = f.a - (f.antes ?? 0);
              return (
                <tr key={i} className={d !== 0 ? "[&>td]:bg-[color-mix(in_srgb,var(--accent-3)_14%,white)]" : ""}>
                  <td className={f.l === "total" ? "font-semibold" : ""}>{f.label}</td>
                  <td className="num text-ink2">{f.antes === undefined ? "—" : miles(f.antes)}</td>
                  <td className="num">{miles(f.a)}</td>
                  <td className="num" style={{ color: d ? "var(--ink)" : "var(--ink-3)" }}>{d ? miles(d) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        {va.texto !== vb.texto && vb.texto && (
          <div className="px-4 py-3 border-t border-rule text-[12px]">
            <Label className="mb-1">Texto de la nota · v{vb.v}</Label>
            <div className="text-ink2 whitespace-pre-wrap leading-relaxed">{vb.texto}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Vistas intermedias ----------

export function VistaIntermedia({ nota, def, ej }: { nota: NotaRun; def: NotaDef; ej: Ejercicio }) {
  const tc = ej.parametros.usdCierre;
  const t = nota.cuadros[0];
  if (!t) return <div className="text-[12px] text-ink3 p-4">Genera la nota para ver sus vistas intermedias.</div>;
  const total = t.lineas.find((l) => l.kind === "total")!.actual;
  let titulo = def.vistas?.[0] ?? "Vista de trabajo";
  let head: string[] = [];
  let filas: (string | number)[][] = [];
  if (def.n === 35) {
    const tcs: Record<string, number> = { usd: tc, ars: tc / 1020, brl: tc / 5.4, pen: tc / 3.72, cop: tc / 4050 };
    head = ["Moneda", "Tipo de cambio cierre", "Monto en moneda origen (miles)", "Activos M$", "Pasivos M$", "Posición neta M$"];
    filas = t.lineas.filter((l) => l.kind !== "total").map((l) => { const act = Math.round(l.actual * 0.42); const pas = l.actual - act; return [l.label, num(tcs[l.id] ?? 1, 4), miles(Math.round((l.actual * 1000) / (tcs[l.id] ?? 1) / 1000)), miles(act), miles(pas), miles(act - pas)]; });
  } else if (def.n === 26) {
    const rai = Math.round(total / 0.262);
    head = ["Concepto", "Tasa", "M$"];
    filas = [["Resultado antes de impuestos", "", miles(rai)], ["Impuesto a la tasa legal", "27,0%", miles(Math.round(rai * 0.27))], ["Diferencia de tasa filiales extranjeras", "-1,9%", miles(Math.round(-rai * 0.019))], ["Corrección monetaria capital propio tributario", "-0,8%", miles(Math.round(-rai * 0.008))], ["Gastos no deducibles", "0,9%", miles(Math.round(rai * 0.009))], ["Gasto por impuesto según tasa efectiva", "26,2%", miles(Math.round(rai * 0.262))]];
  } else if (def.n === 4) {
    head = ["Unidad generadora de efectivo", "Valor libro M$", "Holgura base", "Tasa +50 pb", "Tasa +100 pb"];
    filas = t.lineas.filter((l) => l.kind !== "total").map((l, i) => { const h = 18 + ((i * 7) % 13); return [l.label, miles(l.actual), `${h}%`, `${h - 6}%`, `${h - 11}%`]; });
  } else if (def.n === 34) {
    head = ["Activo", "País", "Valor libro M$", "Valor razonable menos costo de venta M$", "Clasificado desde"];
    filas = [["Terreno Lima Norte", "Perú", miles(Math.round(total * 0.58)), miles(Math.round(total * 0.58 * 1.21)), "2T " + ej.anio], ["Edificio Rosario centro", "Argentina", miles(Math.round(total * 0.42)), miles(Math.round(total * 0.42 * 1.07)), "4T " + (ej.anio - 1)]];
  } else {
    head = ["Línea", "M$"];
    filas = t.lineas.map((l) => [l.label, miles(l.actual)]);
  }
  return (
    <div className="bg-panel border border-rule">
      <div className="flex items-center justify-between px-4 h-10 border-b border-rule">
        <div className="font-medium text-[12.5px]">{titulo}</div>
        <div className="text-[11px] text-ink3">Vista de trabajo · no se publica · mismas fuentes y versión v{nota.version}</div>
      </div>
      <div className="overflow-x-auto"><table className="tbl">
        <thead><tr>{head.map((h, i) => <th key={h} className={i ? "num" : ""}>{h}</th>)}</tr></thead>
        <tbody>{filas.map((f, i) => <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className={def.n === 26 && i === filas.length - 1 ? "[&>td]:font-semibold [&>td]:border-t [&>td]:border-t-ink3" : ""}>{f.map((x, j) => <td key={j} className={j ? "num" : ""}>{x}</td>)}</motion.tr>)}</tbody>
      </table></div>
      {def.n === 35 && <div className="px-4 py-2 text-[11px] text-ink3 border-t border-rule2">Tipo de cambio de cierre USD {num(tc)} · parámetros v{ej.parametros.version}</div>}
    </div>
  );
}

// ---------- Exportación ----------

export function exportarNota(formato: "xlsx" | "doc", nota: NotaRun, def: NotaDef, ej: Ejercicio, razon: string) {
  const marca = `${nota.estado === "Aprobada" ? "Aprobada" : nota.estado === "Lista para revisión" ? "En revisión" : "Borrador"} v${nota.version}`;
  if (formato === "xlsx") {
    const hojas = nota.cuadros.map((c) => {
      const col = columnas(ej, c);
      const conTrim = c.comparativo === "mismo_periodo";
      return {
        nombre: c.titulo,
        filas: [[`${razon} · Nota ${nota.n} ${def.titulo}`], [`${marca} · ${ej.periodo} · cifras en M$`], [], ["Concepto", ...(conTrim ? [col.trim] : []), col.act, col.comp], ...c.lineas.map((l) => [l.label, ...(conTrim ? [l.trim ?? null] : []), l.actual, l.comp])] as (string | number | null)[][],
        anchos: [48, 16, 16, 16]
      };
    });
    if (nota.texto) hojas.push({ nombre: "Texto", filas: [[marca], ...nota.texto.split("\n\n").map((p) => [p])], anchos: [120, 0, 0, 0] });
    if (!hojas.length) hojas.push({ nombre: "Nota", filas: [[marca]], anchos: [40, 0, 0, 0] });
    descargarXlsx(`Nota_${nota.n}_${ej.periodo.replace(" ", "")}_${marca.replace(" ", "_")}.xlsx`, hojas);
  } else {
    const cuerpo = `<h1>Nota ${nota.n} · ${esc(def.titulo)}</h1>${nota.texto ? nota.texto.split("\n\n").map((p) => `<p>${esc(p)}</p>`).join("") : ""}${nota.cuadros.map((c) => {
      const col = columnas(ej, c);
      return `<h3>${esc(c.titulo)}</h3><table><tr><th>Concepto</th><th>${col.act}<br/>M$</th><th>${col.comp}<br/>M$</th></tr>${c.lineas.map((l) => `<tr class="${l.kind === "total" ? "t" : ""}"><td>${esc(l.label)}</td><td class="n">${miles(l.actual)}</td><td class="n">${miles(l.comp)}</td></tr>`).join("")}</table>`;
    }).join("")}`;
    descargarDoc(`Nota_${nota.n}_${ej.periodo.replace(" ", "")}_${marca.replace(" ", "_")}.doc`, `Nota ${nota.n}`, cuerpo, `${razon} · ${ej.periodo} · ${marca}`);
  }
}

export { Pencil };
export type { IndustriaPack, LineaCalc };
