import { useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { MessageSquarePlus } from "lucide-react";
import { useApp } from "../engine/store";
import type { Ejercicio, IndustriaPack, ClienteConfig, Comentario } from "../engine/types";
import { miles, fechaLarga, fechaCorta, finTrimestre } from "../engine/util";
import { totalNota } from "../engine/generator";
import { estadosFinancieros, type EstadoEF } from "../engine/estados";

export function lineasCaratula(ej: Ejercicio, pack: IndustriaPack, estado: "ESF" | "ER") {
  return pack.notas.filter((d) => d.caratula?.estado === estado).map((d) => {
    const n = ej.notas.find((x) => x.n === d.n)!;
    const comp = n.cuadros[0]?.lineas.find((l) => l.kind === "total")?.comp ?? 0;
    return { n: d.n, linea: d.caratula!.linea, actual: ej.caratula[d.n] ?? totalNota(n.cuadros), nota: totalNota(n.cuadros), comp };
  });
}

/** Documento consolidado con índice navegable por estado financiero y nota. */
export function LectorInforme({ ej, pack, cliente, comentarios = [], onComentar, alto = "calc(100vh - 250px)", sello }: {
  ej: Ejercicio; pack: IndustriaPack; cliente: ClienteConfig; comentarios?: Comentario[]; onComentar?: (nota: number | null) => void; alto?: string; sello?: ReactNode;
}) {
  const cont = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState("portada");
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad);
  const ir = (id: string) => {
    const el = cont.current?.querySelector(`#sec-${id}`) as HTMLElement | null;
    if (el && cont.current) cont.current.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
    setActivo(id);
  };
  const onScroll = () => {
    const c = cont.current;
    if (!c) return;
    const secs = [...c.querySelectorAll("[data-sec]")] as HTMLElement[];
    const vis = secs.filter((s) => s.offsetTop - c.scrollTop < 120).pop();
    if (vis) setActivo(vis.dataset.sec!);
  };
  const estados = useMemo(() => estadosFinancieros(ej, pack, cliente), [ej, pack, cliente]);
  const cierreComp = fechaCorta(finTrimestre(ej.anio - 1, 4));
  const comentsDe = (n: number | null) => comentarios.filter((c) => c.nota === n && c.estado === "abierto");
  const Marca = ({ n }: { n: number | null }) => {
    const cs = comentsDe(n);
    return (
      <span className="inline-flex items-center gap-2 ml-3 align-middle">
        {cs.map((c) => <span key={c.id} className="w-2 h-2 rounded-full" title={c.texto} style={{ background: c.instancia === "Directorio" ? "var(--accent-3)" : c.instancia === "Auditoría" ? "var(--accent)" : "var(--warn)" }} />)}
        {onComentar && <button onClick={() => onComentar(n)} className="opacity-0 group-hover:opacity-100 text-ink3 hover:text-accent transition-opacity" title="Comentar"><MessageSquarePlus size={14} /></button>}
      </span>
    );
  };
  const Tabla = ({ filas, colA, colB }: { filas: { l: string; a: number; b: number; tot?: boolean }[]; colA: string; colB: string }) => (
    <table className="w-full text-[11px] my-2" style={{ fontFamily: "Arial, sans-serif" }}>
      <thead><tr className="text-[#666]"><th className="text-left font-normal py-1 border-b border-[#bbb]" /><th className="text-right font-normal py-1 border-b border-[#bbb] w-[110px]">{colA}<br />M$</th><th className="text-right font-normal py-1 border-b border-[#bbb] w-[110px]">{colB}<br />M$</th></tr></thead>
      <tbody>{filas.map((f, i) => <tr key={i} className={f.tot ? "font-bold" : ""}><td className={`py-[3px] ${f.tot ? "border-t border-[#333]" : "border-b border-[#e3e3e3]"}`}>{f.l}</td><td className={`text-right tnum ${f.tot ? "border-t border-[#333]" : "border-b border-[#e3e3e3]"}`}>{miles(f.a)}</td><td className={`text-right tnum ${f.tot ? "border-t border-[#333]" : "border-b border-[#e3e3e3]"}`}>{miles(f.b)}</td></tr>)}</tbody>
    </table>
  );
  return (
    <div className="grid grid-cols-[170px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)] border border-rule bg-panel" style={{ height: alto }}>
      <nav className="border-r border-rule overflow-auto py-2 text-[12px]">
        {[{ id: "portada", t: "Portada" }, ...estados.map((e) => ({ id: e.id, t: e.corto }))].map((x) => (
          <button key={x.id} onClick={() => ir(x.id)} className={`w-full text-left px-4 py-1.5 ${activo === x.id ? "text-accent font-medium bg-accentSoft" : "text-ink2 hover:text-ink"}`}>{x.t}</button>
        ))}
        <div className="sc text-[10.5px] px-4 pt-3 pb-1">Notas</div>
        {pack.notas.map((d) => (
          <button key={d.n} onClick={() => ir(`n${d.n}`)} className={`w-full text-left px-4 py-1 flex gap-2 ${activo === `n${d.n}` ? "text-accent font-medium bg-accentSoft" : "text-ink2 hover:text-ink"}`}>
            <span className="tnum w-5 text-ink3">{d.n}</span><span className="truncate flex-1">{d.titulo}</span>
            {comentsDe(d.n).length > 0 && <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: comentsDe(d.n).some((c) => c.instancia === "Directorio") ? "var(--accent-3)" : "var(--warn)" }} />}
          </button>
        ))}
      </nav>
      <div ref={cont} onScroll={onScroll} className="overflow-auto bg-[#e8e9e5] relative px-3 md:px-6 py-6">
        <div className="max-w-[920px] mx-auto bg-white shadow-[0_0_0_1px_#d5d7d1] px-6 md:px-10 py-10 relative" style={{ fontFamily: "Arial, sans-serif", color: "#16212c" }}>
          {sello}
          <div className="text-[9.5px] text-[#8a929b] border-b border-[#ddd] pb-1 mb-8 flex justify-between"><span>{soc?.nombre} · Estados financieros consolidados intermedios</span><span>Pre-informe v{ej.preinforme?.version ?? 1}{ej.preinforme ? ` · pre-aprobado ${fechaCorta(ej.preinforme.fecha)}` : ""}</span></div>
          <section id="sec-portada" data-sec="portada" className="text-center py-16 border-b border-[#eee] mb-8">
            <div className="text-[20px] font-bold">{soc?.nombre}</div>
            <div className="text-[12px] mt-1">RUT {soc?.rut}</div>
            <div className="text-[15px] mt-8">Estados Financieros Consolidados Intermedios</div>
            <div className="text-[12px] mt-1">al {fechaLarga(ej.fechaCierre)}</div>
            <div className="text-[10.5px] text-[#8a929b] mt-10">Cifras en miles de pesos chilenos (M$)</div>
          </section>
          {estados.map((e, i) => (
            <section key={e.id} id={`sec-${e.id}`} data-sec={e.id} className={`${i === 0 ? "group " : ""}mb-9`}>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.02em]">{e.titulo}{i === 0 && <Marca n={null} />}</h2>
              <div className="text-[10px] text-[#666] mb-1">{e.subtitulo}</div>
              <TablaDoc e={e} />
            </section>
          ))}
          {pack.notas.map((d) => {
            const n = ej.notas.find((x) => x.n === d.n)!;
            return (
              <section key={d.n} id={`sec-n${d.n}`} data-sec={`n${d.n}`} className="group mb-7">
                <h3 className="text-[12px] font-bold">Nota {d.n} · {d.titulo}<Marca n={d.n} /></h3>
                {n.texto && n.texto.split("\n\n").map((p, i) => <p key={i} className="text-[11px] leading-[1.55] my-1.5 text-justify">{p}</p>)}
                {n.cuadros.map((c) => {
                  const mismo = c.comparativo === "mismo_periodo";
                  return (
                    <div key={c.id}>
                      <div className="text-[11px] italic mt-2">{c.titulo}</div>
                      <Tabla colA={mismo ? `Acum. ${ej.periodo}` : fechaCorta(ej.fechaCierre)} colB={mismo ? `Acum. ${ej.trimestre}T ${ej.anio - 1}` : cierreComp} filas={c.lineas.map((l) => ({ l: l.label, a: l.actual, b: l.comp, tot: l.kind === "total" }))} />
                    </div>
                  );
                })}
                {!n.texto && !n.cuadros.length && <p className="text-[11px] text-[#8a929b]">Sin contenido en esta versión.</p>}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Armado animado del documento: las notas vuelan a un documento que crece. */
export function ArmadoDocumento({ ej, pack, paso }: { ej: Ejercicio; pack: IndustriaPack; paso: number }) {
  const total = pack.notas.length;
  return (
    <div className="relative h-[210px] flex items-center justify-center gap-10">
      <div className="grid grid-cols-8 gap-[5px]">
        {pack.notas.map((d, i) => {
          const hecho = i < paso;
          const n = ej.notas.find((x) => x.n === d.n)!;
          return (
            <motion.div key={d.n} animate={hecho ? { x: 60, opacity: 0, scale: 0.6 } : { x: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
              className="w-[26px] h-[32px] border text-[9px] tnum flex items-end justify-center pb-0.5" style={{ borderColor: n.estado === "Aprobada" ? "var(--accent)" : "var(--ko)", background: n.estado === "Aprobada" ? "var(--accent-soft)" : "white" }}>
              {d.n}
            </motion.div>
          );
        })}
      </div>
      <div className="relative w-[130px] h-[170px]">
        {[2, 1, 0].map((k) => (
          <div key={k} className="absolute inset-0 bg-white border border-rule" style={{ transform: `translate(${k * 5}px, ${k * 5}px)` }} />
        ))}
        <div className="absolute inset-0 bg-white border border-ink3 px-3 py-3 overflow-hidden">
          <div className="h-2 w-2/3 bg-ink mb-2" />
          {Array.from({ length: Math.min(14, Math.ceil((paso / total) * 14)) }).map((_, i) => (
            <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${60 + ((i * 37) % 40)}%` }} className="h-[3px] mb-[5px]" style={{ background: i % 4 === 0 ? "var(--accent)" : "var(--rule)" }} />
          ))}
        </div>
        <div className="absolute -bottom-6 left-0 right-0 text-center text-[11px] tnum text-ink2">{Math.min(paso, total)} / {total} notas</div>
      </div>
    </div>
  );
}

export function useLector() {
  return { ej: useApp((s) => s.ej()), pack: useApp((s) => s.pack()), cliente: useApp((s) => s.cliente()) };
}

/** Estado financiero en formato de documento: secciones, subtotales y totales como en el formato CMF. */
export function TablaDoc({ e }: { e: EstadoEF }) {
  const bordeTot = "border-t border-[#333]";
  if (e.columnas) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[10px] my-2 min-w-[760px]" style={{ fontFamily: "Arial, sans-serif" }}>
          <colgroup><col />{e.columnas.map((c) => <col key={c} className="w-[96px]" />)}</colgroup>
          <thead><tr className="text-[#555]"><th className="text-left font-normal py-1 border-b border-[#bbb]" />{e.columnas.map((c) => <th key={c} className="text-right font-normal py-1 pl-1 border-b border-[#bbb] leading-tight align-bottom">{c}<br />M$</th>)}</tr></thead>
          <tbody>
            {e.lineas.map((l) => (
              <tr key={l.id} className={l.kind === "total" || l.kind === "subtotal" ? "font-bold" : l.kind === "seccion" ? "italic" : ""}>
                <td className={`py-[3px] pr-2 ${l.kind === "total" ? bordeTot : "border-b border-[#e3e3e3]"}`}>{l.label}</td>
                {l.kind === "seccion" ? e.columnas!.map((c) => <td key={c} className="border-b border-[#e3e3e3]" />) : l.cols!.map((v, k) => <td key={k} className={`text-right tnum ${l.kind === "total" ? bordeTot : "border-b border-[#e3e3e3]"}`}>{v === 0 && l.kind === "line" ? "–" : miles(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <table className="w-full table-fixed text-[11px] my-2" style={{ fontFamily: "Arial, sans-serif" }}>
      <colgroup><col /><col className="w-[44px]" /><col className="w-[118px]" /><col className="w-[118px]" /></colgroup>
      <thead><tr className="text-[#666]"><th className="text-left font-normal py-1 border-b border-[#bbb]" /><th className="text-center font-normal py-1 border-b border-[#bbb]">Nota</th><th className="text-right font-normal py-1 border-b border-[#bbb]">{e.colA}<br />M$</th><th className="text-right font-normal py-1 border-b border-[#bbb]">{e.colB}<br />M$</th></tr></thead>
      <tbody>
        {e.lineas.map((l) => l.kind === "seccion" ? (
          <tr key={l.id}><td colSpan={4} className="pt-2 pb-[2px] font-bold text-[10.5px] border-b border-[#bbb]">{l.label}</td></tr>
        ) : (
          <tr key={l.id} className={l.kind === "line" ? "" : "font-bold"}>
            <td className={`py-[3px] ${l.kind === "line" ? "pl-3" : ""} ${l.kind === "total" ? bordeTot : "border-b border-[#e3e3e3]"}`}>{l.label}</td>
            <td className={`text-center tnum ${l.kind === "total" ? bordeTot : "border-b border-[#e3e3e3]"}`}>{l.nota ?? ""}</td>
            <td className={`text-right tnum ${l.kind === "total" ? bordeTot : "border-b border-[#e3e3e3]"}`}>{miles(l.actual)}</td>
            <td className={`text-right tnum ${l.kind === "total" ? bordeTot : "border-b border-[#e3e3e3]"}`}>{miles(l.comp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
