import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { FileText, FileCode2, Sheet, Play, Download, CheckCircle2, Lock, Send, ArrowRight } from "lucide-react";
import { useApp } from "../engine/store";
import { Encabezado } from "../components/Shell";
import { Label, Modal, usePerfiles, tiene, esperar } from "../components/ui";
import { lineasCaratula } from "../components/Informe";
import { estadosFinancieros } from "../engine/estados";
import { exportarNota } from "../components/NotaPartes";
import { miles, fechaHora, fechaLarga, fechaCorta } from "../engine/util";
import { usuario } from "../config/users";
import { descargarDoc, descargarTexto, descargarXlsx, esc } from "../engine/export";
import type { InformeRun } from "../engine/types";

const ICONO: Record<string, typeof FileText> = { cmf: FileText, xbrl: FileCode2, i555: Sheet };

const TAXO: Record<string, string> = {
  "Efectivo y equivalentes al efectivo": "ifrs-full:CashAndCashEquivalents",
  "Otros activos financieros corrientes": "ifrs-full:OtherCurrentFinancialAssets",
  "Deudores comerciales y otras cuentas por cobrar": "ifrs-full:TradeAndOtherCurrentReceivables",
  Inventarios: "ifrs-full:Inventories",
  "Activos intangibles distintos de la plusvalía": "ifrs-full:IntangibleAssetsOtherThanGoodwill",
  Plusvalía: "ifrs-full:Goodwill",
  "Propiedades, planta y equipo": "ifrs-full:PropertyPlantAndEquipment",
  "Activos por impuestos diferidos": "ifrs-full:DeferredTaxAssets",
  "Otros pasivos financieros": "ifrs-full:OtherFinancialLiabilities",
  "Cuentas por pagar comerciales y otras cuentas por pagar": "ifrs-full:TradeAndOtherPayables",
  "Propiedades de inversión": "ifrs-full:InvestmentProperty",
  "Ingresos de actividades ordinarias": "ifrs-full:Revenue",
  "Gasto por impuestos a las ganancias": "ifrs-full:IncomeTaxExpenseContinuingOperations",
  "Costo de ventas": "ifrs-full:CostOfSales",
  "Costos financieros": "ifrs-full:FinanceCosts"
};
const taxo = (l: string) => TAXO[l] ?? `cl-ci:${l.replace(/[^A-Za-zÁÉÍÓÚáéíóúñ ]/g, "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;

const VALIDACIONES_XBRL = ["Completitud de elementos obligatorios", "Consistencia de totales ESF y ER", "Contextos de periodo y entidad", "Unidades (CLP) y decimales (-3)", "Esquema y linkbases de la taxonomía"];

function AnimXbrl({ paso, filas }: { paso: number; filas: { linea: string; valor: number }[] }) {
  return (
    <div className="grid grid-cols-[1fr_40px_1fr] text-[11px] gap-y-[3px]">
      {filas.slice(0, 10).map((f, i) => (
        <div key={f.linea} className="contents">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="flex justify-between border border-rule px-2 h-6 items-center bg-panel"><span className="truncate">{f.linea}</span><span className="tnum text-ink2 ml-2">{miles(f.valor)}</span></motion.div>
          <div className="relative">{paso > i && <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }} className="absolute top-3 left-1 right-1 h-px bg-accent" />}</div>
          <div className="border px-2 h-6 flex items-center font-mono text-[10px] truncate" style={{ borderColor: paso > i ? "var(--accent)" : "var(--rule)", color: paso > i ? "var(--accent)" : "var(--ink-3)" }}>{paso > i ? taxo(f.linea) : "…"}</div>
        </div>
      ))}
    </div>
  );
}

export default function Informes() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const cliente = useApp((s) => s.cliente());
  const generar = useApp((s) => s.generarInforme);
  const descarga = useApp((s) => s.registrarDescarga);
  const publicar = useApp((s) => s.publicarYCerrar);
  const cerrar = useApp((s) => s.cerrarEjercicio);
  const toast = useApp((s) => s.toast);
  const uid = useApp((s) => s.usuarioId)!;
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [paso, setPaso] = useState(0);
  const [pub, setPub] = useState(false);
  const habilitado = ["Aprobado", "Emitido", "Cerrado"].includes(ej.estado);
  const puedeGenerar = tiene(perfiles, "proceso", "admin") && ej.estado === "Aprobado" && !ej.historico;
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad)!;
  const carat = [...lineasCaratula(ej, pack, "ESF"), ...lineasCaratula(ej, pack, "ER")];
  const xbrlFilas = carat.map((c) => ({ linea: c.linea, valor: c.nota }));

  if (!habilitado) {
    return (
      <div>
        <Encabezado n="06" titulo="Generación de informes" />
        <div className="p-6"><div className="bg-panel border border-rule px-6 py-10 text-center">
          <Lock size={20} className="mx-auto text-ink3 mb-2" />
          <div className="text-[13px] font-medium">Los informes regulatorios se generan solo con el ejercicio Aprobado por el Directorio</div>
          <div className="text-[12px] text-ink2 mt-1">Estado actual: {ej.estado}. Así ninguna cifra aprobada se modifica en esta etapa.</div>
          <button className="btn mt-4" onClick={() => nav("/directorio")}>Ir a Aprobación Directorio <ArrowRight size={13} /></button>
        </div></div>
      </div>
    );
  }

  const lanzar = async (id: string) => {
    setEnCurso(id);
    setPaso(0);
    const n = id === "xbrl" ? Math.min(10, xbrlFilas.length) + VALIDACIONES_XBRL.length : id === "cmf" ? pack.notas.length : 12;
    for (let i = 1; i <= n; i++) { setPaso(i); await esperar(id === "cmf" ? 45 : 170); }
    await esperar(300);
    generar(id);
    setEnCurso(null);
    toast(`${pack.informes.find((x) => x.id === id)!.nombre} generado`, "ok");
  };

  const bajar = (inf: InformeRun) => {
    const base = `${inf.id.toUpperCase()}_${soc.rut.replace(/\./g, "")}_${ej.anio}T${ej.trimestre}_v${inf.version}`;
    if (inf.id === "cmf") {
      const cuerpo = `<h1>${esc(soc.nombre)}</h1><p>Estados financieros consolidados intermedios al ${fechaLarga(ej.fechaCierre)} · cifras en M$</p>` +
        estadosFinancieros(ej, pack, cliente).map((e) => e.columnas
          ? `<h2>${esc(e.titulo)}</h2><p>${esc(e.subtitulo)}</p><table><tr><th></th>${e.columnas.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>${e.lineas.map((l) => `<tr class="${l.kind === "total" || l.kind === "subtotal" ? "t" : ""}"><td>${esc(l.label)}</td>${(l.cols ?? e.columnas!.map(() => null)).map((v) => `<td class="n">${v === null ? "" : miles(v)}</td>`).join("")}</tr>`).join("")}</table>`
          : `<h2>${esc(e.titulo)}</h2><p>${esc(e.subtitulo)}</p><table><tr><th></th><th>Nota</th><th>${e.colA} M$</th><th>${e.colB} M$</th></tr>${e.lineas.map((l) => l.kind === "seccion" ? `<tr><td colspan="4"><b>${esc(l.label)}</b></td></tr>` : `<tr class="${l.kind === "line" ? "" : "t"}"><td>${esc(l.label)}</td><td>${l.nota ?? ""}</td><td class="n">${miles(l.actual)}</td><td class="n">${miles(l.comp)}</td></tr>`).join("")}</table>`).join("") +
        ej.notas.map((n) => { const d = pack.notas.find((x) => x.n === n.n)!; return `<h2>Nota ${n.n} · ${esc(d.titulo)}</h2>${(n.texto ?? "").split("\n\n").filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("")}${n.cuadros.map((c) => `<h3>${esc(c.titulo)}</h3><table>${c.lineas.map((l) => `<tr class="${l.kind === "total" ? "t" : ""}"><td>${esc(l.label)}</td><td class="n">${miles(l.actual)}</td><td class="n">${miles(l.comp)}</td></tr>`).join("")}</table>`).join("")}`; }).join("");
      descargarDoc(`${base}.doc`, "Estados financieros", cuerpo, `UID ${inf.uid} · aprobado por el Directorio ${fechaCorta(ej.aprobadoEl ?? new Date())}`);
    } else if (inf.id === "xbrl") {
      const ctx = `C_${ej.anio}${ej.trimestre}`;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- UID ${inf.uid} · generado desde la versión aprobada del ejercicio ${ej.periodo} -->\n<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:ifrs-full="https://xbrl.ifrs.org/taxonomy/2024-03-27/ifrs-full" xmlns:cl-ci="http://www.cmfchile.cl/cl/fr/ci" xmlns:iso4217="http://www.xbrl.org/2003/iso4217">\n  <xbrli:context id="${ctx}"><xbrli:entity><xbrli:identifier scheme="http://www.cmfchile.cl">${soc.rut}</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:instant>${ej.fechaCierre.slice(0, 10)}</xbrli:instant></xbrli:period></xbrli:context>\n  <xbrli:unit id="CLP"><xbrli:measure>iso4217:CLP</xbrli:measure></xbrli:unit>\n${xbrlFilas.map((f) => `  <${taxo(f.linea)} contextRef="${ctx}" unitRef="CLP" decimals="-3">${f.valor * 1000}</${taxo(f.linea)}>`).join("\n")}\n</xbrli:xbrl>\n`;
      descargarTexto(`${base}.xbrl`, xml, "application/xml");
    } else {
      descargarXlsx(`${base}.xlsx`, [
        { nombre: "Identificación", filas: [["Informe 555"], ["Sociedad", soc.nombre], ["RUT", soc.rut], ["Periodo", ej.periodo], ["UID", inf.uid], ["Versión", `v${inf.version}`]], anchos: [18, 50] },
        { nombre: "Cifras", filas: [["Nota", "Concepto", "Actual M$", "Comparativo M$"], ...ej.notas.filter((n) => n.cuadros.length).map((n) => { const t = n.cuadros[0].lineas.find((l) => l.kind === "total")!; return [n.n, pack.notas.find((d) => d.n === n.n)!.titulo, t.actual, t.comp]; })], anchos: [6, 60, 16, 16] }
      ]);
    }
    descarga(`${inf.nombre} v${inf.version} (${inf.uid})`, inf.id === "cmf" ? "Word" : inf.id === "xbrl" ? "XBRL" : "Excel");
  };

  const ultimos = pack.informes.map((d) => ({ d, runs: ej.informes.filter((i) => i.id === d.id) }));
  const todos = ultimos.every((x) => x.runs.length);
  const misNotas = tiene(perfiles, "proceso", "admin", "auditor", "directorio", "consulta") ? ej.notas : ej.notas.filter((n) => n.responsable === uid);

  return (
    <div>
      <Encabezado n="06" titulo="Generación de informes" sub={<>Informes regulatorios generados desde la versión aprobada · aprobado por el Directorio el {fechaCorta(ej.aprobadoEl ?? new Date())} · estado <strong className="text-ink">{ej.estado}</strong></>}
        acciones={
          <>
            {ej.estado === "Aprobado" && <button className="btn btn-p" disabled={!todos || !puedeGenerar} title={todos ? "" : "Genera los tres informes primero"} onClick={() => setPub(true)}><Send size={14} /> Marcar como publicados</button>}
            {ej.estado === "Emitido" && tiene(perfiles, "proceso", "admin") && <button className="btn btn-d" onClick={() => { cerrar(); toast("Ejercicio cerrado · queda en solo lectura", "ok"); }}><Lock size={14} /> Cerrar ejercicio</button>}
          </>
        } />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {ultimos.map(({ d, runs }) => {
            const Ic = ICONO[d.id] ?? FileText;
            const ult = runs[runs.length - 1];
            return (
              <div key={d.id} className="bg-panel border border-rule flex flex-col">
                <div className="px-4 py-3 border-b border-rule flex items-start gap-3">
                  <Ic size={18} className="text-accent mt-0.5" />
                  <div className="flex-1"><div className="font-bold text-[15px]">{d.nombre}</div><div className="text-[11px] text-ink3">{d.formato}</div></div>
                  {ult && <span className="text-[11px] tnum text-ink2">v{ult.version}</span>}
                </div>
                <div className="px-4 py-3 text-[12px] text-ink2 flex-1 min-h-[210px]">
                  <AnimatePresence mode="wait">
                    {enCurso === d.id ? (
                      <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {d.id === "xbrl" ? (
                          <>
                            <Label className="mb-1">Mapeo a la taxonomía</Label>
                            <AnimXbrl paso={paso} filas={xbrlFilas} />
                            <div className="mt-2 space-y-[2px]">{VALIDACIONES_XBRL.map((v, i) => <div key={v} className="flex items-center gap-2 text-[11px]">{paso > 10 + i ? <CheckCircle2 size={12} className="text-ok" /> : <span className="w-[6px] h-[6px] mx-[3px] border border-ink3" />}{v}</div>)}</div>
                          </>
                        ) : d.id === "cmf" ? (
                          <>
                            <Label className="mb-2">Armando documento Word/PDF</Label>
                            <div className="grid grid-cols-10 gap-[3px]">{pack.notas.map((n, i) => <motion.div key={n.n} animate={{ background: paso > i ? "var(--accent)" : "var(--rule-2)" }} className="h-5 text-[8px] text-white flex items-center justify-center tnum">{n.n}</motion.div>)}</div>
                            <div className="text-[11px] text-ink3 mt-2 tnum">{Math.min(paso, pack.notas.length)} de {pack.notas.length} notas · carátula · índice · formato CMF</div>
                          </>
                        ) : (
                          <>
                            <Label className="mb-2">Construyendo planilla</Label>
                            <div className="border border-rule">{Array.from({ length: 12 }).map((_, i) => <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: paso > i ? 1 : 0.15 }} className="flex gap-1 px-2 py-[3px] border-b border-rule2 last:border-0"><span className="w-6 h-[5px] bg-ink3" /><span className="flex-1 h-[5px] bg-rule" /><span className="w-10 h-[5px] bg-accent" /><span className="w-10 h-[5px] bg-rule" /></motion.div>)}</div>
                          </>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <p>{d.descripcion}</p>
                        {ult ? (
                          <div className="mt-3 text-[11.5px] space-y-1">
                            <div>UID <span className="font-mono text-ink">{ult.uid}</span></div>
                            <div>{fechaHora(ult.fecha)} · {usuario(ult.usuario).nombre}</div>
                            <div>Desde pre-informe v{ej.preinforme?.version} · {ult.publicado ? <span className="text-ok">publicado</span> : "no publicado"}</div>
                            {d.id === "xbrl" && <div className="text-ok">Validación XBRL: 0 errores · 0 advertencias</div>}
                          </div>
                        ) : <div className="mt-3 text-[11.5px] text-ink3">Aún no generado.</div>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="px-4 py-3 border-t border-rule flex gap-2">
                  <button className="btn btn-sm btn-p" disabled={!puedeGenerar || Boolean(enCurso)} onClick={() => lanzar(d.id)}><Play size={12} /> {ult ? "Nueva versión" : "Generar"}</button>
                  <button className="btn btn-sm" disabled={!ult} onClick={() => ult && bajar(ult)}><Download size={12} /> Descargar</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 items-start">
          <div className="bg-panel border border-rule">
            <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[15px]">Versiones de informes</div>
            {ej.informes.length === 0 ? <div className="px-4 py-4 text-[12px] text-ink3">Sin informes generados.</div> : (
              <div className="overflow-x-auto"><table className="tbl min-w-[720px]">
                <thead><tr><th className="min-w-[200px]">Informe</th><th>Versión</th><th>UID</th><th>Fecha</th><th>Estado</th><th /></tr></thead>
                <tbody>{[...ej.informes].reverse().map((i) => <tr key={i.uid}><td>{i.nombre}</td><td className="tnum">v{i.version}</td><td className="font-mono text-[11px] whitespace-nowrap">{i.uid}</td><td className="tnum text-ink2 whitespace-nowrap">{fechaHora(i.fecha)}</td><td className={`whitespace-nowrap ${i.publicado ? "text-ok" : "text-ink2"}`}>{i.publicado ? "Publicado" : "Generado"}</td><td><button className="btn btn-sm btn-g" onClick={() => bajar(i)}><Download size={12} /></button></td></tr>)}</tbody>
              </table></div>
            )}
          </div>
          <div className="bg-panel border border-rule">
            <div className="px-5 h-14 flex items-center justify-between border-b border-rule">
              <span className="font-bold text-[15px]">Descargas por nota</span>
              <span className="text-[11px] text-ink3">{misNotas.length === ej.notas.length ? "Todas las notas según tu perfil" : "Solo tus notas asignadas"}</span>
            </div>
            <div className="max-h-[320px] overflow-auto">
              <table className="tbl">
                <tbody>{misNotas.map((n) => { const d = pack.notas.find((x) => x.n === n.n)!; return <tr key={n.n}><td className="tnum text-ink3 w-8">{n.n}</td><td>{d.titulo}</td><td className="tnum text-ink2">v{n.versionAprobada ?? n.version}</td><td className="text-right whitespace-nowrap"><button className="btn btn-sm btn-g" onClick={() => { exportarNota("xlsx", n, d, ej, soc.nombre); descarga(`Nota ${n.n}`, "Excel"); }}>Excel</button><button className="btn btn-sm btn-g" onClick={() => { exportarNota("doc", n, d, ej, soc.nombre); descarga(`Nota ${n.n}`, "Word"); }}>Word</button></td></tr>; })}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Modal open={pub} onClose={() => setPub(false)} width={480} title="Marcar informes como publicados"
        footer={<><button className="btn" onClick={() => setPub(false)}>Cancelar</button><button className="btn btn-p" onClick={() => { publicar(); setPub(false); toast("Informes publicados · ejercicio Emitido", "ok"); }}>Confirmar publicación</button></>}>
        <div className="text-[12.5px] text-ink2">Se registrará la publicación de los tres informes ante la CMF y el ejercicio pasará a <strong className="text-ink">Emitido</strong>. Después la Responsable del proceso puede cerrarlo; un ejercicio cerrado solo lo reabre el Administrador con justificación.</div>
      </Modal>
    </div>
  );
}
