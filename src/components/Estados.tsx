import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Download, Circle } from "lucide-react";
import { useApp } from "../engine/store";
import { estadosFinancieros, cuadraturaNotas, type EstadoEF, type LineaEF } from "../engine/estados";
import { miles } from "../engine/util";
import { descargarXlsx } from "../engine/export";
import { Label } from "./ui";

export function useEstados() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const cliente = useApp((s) => s.cliente());
  return useMemo(() => {
    const estados = estadosFinancieros(ej, pack, cliente);
    return { estados, cuadratura: cuadraturaNotas(ej, pack, estados) };
  }, [ej, pack, cliente]);
}

function claseFila(l: LineaEF) {
  if (l.kind === "seccion") return "[&>td]:bg-accentSoft [&>td]:font-medium [&>td]:text-accent2 [&>td]:text-[12px]";
  if (l.kind === "subtotal") return "[&>td]:font-semibold [&>td]:border-t [&>td]:border-t-ink3";
  if (l.kind === "total") return "[&>td]:font-semibold [&>td]:text-white [&>td]:bg-accent2 [&>td]:border-b-0";
  return "";
}

export function exportarEstados(estados: EstadoEF[], razon: string, periodo: string) {
  descargarXlsx(
    `Estados_financieros_${periodo.replace(" ", "")}.xlsx`,
    estados.map((e) => ({
      nombre: e.corto,
      filas: e.columnas
        ? [[razon], [e.titulo], [e.subtitulo], [], ["", ...e.columnas], ...e.lineas.map((l) => [l.label, ...(l.cols ?? [])])]
        : [[razon], [e.titulo], [e.subtitulo], [], ["", "Nota", `${e.colA} M$`, `${e.colB} M$`], ...e.lineas.map((l) => [l.label, l.nota ?? "", l.kind === "seccion" ? "" : l.actual, l.kind === "seccion" ? "" : l.comp])],
      anchos: e.columnas ? [58, 16, 16, 16, 16, 16, 16] : [72, 8, 18, 18]
    }))
  );
}

export function TablaEstado({ e, cuadratura, compacto = false }: { e: EstadoEF; cuadratura?: ReturnType<typeof cuadraturaNotas>; compacto?: boolean }) {
  const nav = useNavigate();
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const cuad = (n?: number) => (n === undefined ? undefined : cuadratura?.find((c) => c.nota === n));
  if (e.columnas) {
    return (
      <div className="overflow-x-auto">
        <table className="tbl min-w-[880px]">
          <thead><tr><th className="min-w-[280px]" />{e.columnas.map((c) => <th key={c} className="num whitespace-normal leading-tight">{c}<br /><span className="font-normal">M$</span></th>)}</tr></thead>
          <tbody>
            {e.lineas.map((l, i) => (
              <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: compacto ? 0 : i * 0.03 }} className={claseFila(l)}>
                <td className={l.kind === "line" ? "pl-6" : ""}>{l.label}{l.nota && <button className="ml-2 text-[10.5px] text-accent hover:underline" onClick={() => nav(`/notas/${l.nota}`)}>Nota {l.nota}</button>}</td>
                {l.kind === "seccion" ? e.columnas!.map((c) => <td key={c} />) : l.cols!.map((v, k) => <td key={k} className="num">{v === 0 && l.kind === "line" ? "—" : miles(v)}</td>)}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="tbl min-w-[720px]">
        <thead>
          <tr>
            <th className="min-w-[340px]" />
            <th className="w-[70px] text-center">Nota</th>
            <th className="num w-[150px]">{e.colA}<br /><span className="font-normal">M$</span></th>
            <th className="num w-[150px]">{e.colB}<br /><span className="font-normal">M$</span></th>
            {cuadratura && <th className="w-[150px]">Cuadra con la nota</th>}
          </tr>
        </thead>
        <tbody>
          {e.lineas.map((l, i) => {
            const c = l.kind === "line" ? cuad(l.nota) : undefined;
            const def = l.nota ? pack.notas.find((d) => d.n === l.nota) : undefined;
            const run = l.nota ? ej.notas.find((x) => x.n === l.nota) : undefined;
            return (
              <motion.tr key={l.id} initial={{ opacity: 0, x: compacto ? 0 : -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: compacto ? 0 : Math.min(i, 40) * 0.018 }} className={`${claseFila(l)} ${c && c.dif !== 0 ? "[&>td]:bg-[color-mix(in_srgb,var(--ko)_6%,white)]" : ""}`}>
                <td className={l.kind === "line" ? "pl-6" : ""} colSpan={l.kind === "seccion" ? (cuadratura ? 5 : 4) : 1}>{l.label}</td>
                {l.kind !== "seccion" && (
                  <>
                    <td className="text-center">
                      {l.nota ? <button className={`text-[11.5px] tnum ${l.kind === "total" ? "text-white underline" : "text-accent hover:underline"}`} onClick={() => nav(`/notas/${l.nota}`)} title={def?.titulo}>{l.nota}</button> : ""}
                    </td>
                    <td className="num">{miles(l.actual)}</td>
                    <td className="num">{miles(l.comp)}</td>
                    {cuadratura && (
                      <td className="text-[11.5px] whitespace-nowrap">
                        {c ? (
                          c.totalNota === null ? (
                            <span className="inline-flex items-center gap-1 text-ink3"><Circle size={11} /> Nota sin generar</span>
                          ) : c.dif === 0 ? (
                            <span className="inline-flex items-center gap-1 text-ok"><CheckCircle2 size={12} /> OK</span>
                          ) : (
                            <button onClick={() => nav(`/notas/${l.nota}`)} className="inline-flex items-center gap-1 text-ko font-medium"><XCircle size={12} /> Dif. {miles(c.dif)}</button>
                          )
                        ) : l.nota && run && !def?.caratula ? <span className="text-ink3">Detalle en nota</span> : ""}
                      </td>
                    )}
                  </>
                )}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Vista de trabajo de los cuatro estados financieros con sus cuadraturas. */
export function EstadosFinancieros() {
  const ej = useApp((s) => s.ej());
  const cliente = useApp((s) => s.cliente());
  const registrar = useApp((s) => s.registrar);
  const { estados, cuadratura } = useEstados();
  const [sel, setSel] = useState(estados[0].id);
  const e = estados.find((x) => x.id === sel) ?? estados[0];
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad)?.nombre ?? cliente.nombre;
  const ko = cuadratura.filter((c) => c.dif !== 0);
  const sinGenerar = cuadratura.filter((c) => c.totalNota === null).length;
  const controles = estados.flatMap((x) => x.controles.map((c) => ({ ...c, estado: x.corto })));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-panel border border-rule px-4 py-3">
          <Label>Cuadratura notas contra estados</Label>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[26px] font-semibold tnum" style={{ color: ko.length ? "var(--ko)" : "var(--ok)" }}>{cuadratura.length - ko.length - sinGenerar}</span>
            <span className="text-[12px] text-ink3">de {cuadratura.length} notas con carátula cuadran{sinGenerar ? ` · ${sinGenerar} sin generar` : ""}</span>
          </div>
          {ko.length > 0 && <div className="text-[11.5px] text-ko mt-1">Descuadre en {ko.map((c) => `Nota ${c.nota}`).join(", ")}</div>}
        </div>
        <div className="bg-panel border border-rule px-4 py-3 lg:col-span-2">
          <Label className="mb-1">Controles entre estados</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            {controles.map((c) => (
              <div key={c.nombre} className="flex items-start gap-2 text-[12px]">
                {c.dif === 0 ? <CheckCircle2 size={13} className="text-ok mt-0.5 shrink-0" /> : <XCircle size={13} className="text-ko mt-0.5 shrink-0" />}
                <span className="min-w-0">{c.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-panel border border-rule">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-rule">
          <div className="flex flex-wrap border border-rule">
            {estados.map((x) => (
              <button key={x.id} onClick={() => setSel(x.id)} className={`px-3 h-8 text-[12px] whitespace-nowrap ${sel === x.id ? "bg-accent text-white" : "hover:bg-paper"}`}>{x.corto}</button>
            ))}
          </div>
          <button className="btn btn-sm" onClick={() => { exportarEstados(estados, soc, ej.periodo); registrar({ track: "Generación de notas", objeto: "Estados financieros", accion: "Exportación Excel" }); }}><Download size={13} /> Exportar los 4 estados</button>
        </div>
        <div className="px-4 pt-4 pb-2">
          <div className="font-semibold text-[14px]">{soc} · {e.titulo}</div>
          <div className="text-[11.5px] text-ink3">{e.subtitulo}</div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <TablaEstado e={e} cuadratura={e.id === "esf" || e.id === "er" ? cuadratura : undefined} />
          </motion.div>
        </AnimatePresence>
        {e.controles.map((c) => (
          <div key={c.nombre} className="px-4 py-2 border-t border-rule2 text-[11.5px] flex flex-wrap items-center gap-x-3 gap-y-1">
            {c.dif === 0 ? <CheckCircle2 size={13} className="text-ok" /> : <XCircle size={13} className="text-ko" />}
            <span>{c.nombre}</span>
            <span className="text-ink3 tnum">M$ {miles(c.esperado)} = M$ {miles(c.obtenido)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
