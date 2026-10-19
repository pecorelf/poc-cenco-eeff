import { useState, type ReactNode } from "react";
import type React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ListFilter, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";

/** Buscador gris redondeado, como "Buscar campañas por nombre". */
export function Buscador({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="buscador w-full sm:w-[340px]">
      <Search size={18} className="shrink-0" />
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {valor && <button onClick={() => onChange("")} className="text-ink3 hover:text-ink" aria-label="Limpiar"><X size={15} /></button>}
    </label>
  );
}

export interface GrupoFiltro {
  titulo: string;
  opciones: string[];
  seleccion: string[];
  onChange: (sel: string[]) => void;
}

/** Botón "Filtros" con lista de casillas "Todos / opciones", agrupada. */
export function Filtros({ grupos }: { grupos: GrupoFiltro[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const activos = grupos.reduce((a, g) => a + g.seleccion.length, 0);
  // El menú se posiciona fijo para no quedar recortado por tarjetas con esquinas redondeadas
  const abrir = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(!open);
  };
  return (
    <div className="relative shrink-0">
      <button className="btn btn-p !h-10 !px-5" onClick={abrir}>
        <ListFilter size={17} /> Filtros{activos > 0 && <span className="ml-0.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-white text-accent text-[11px] font-bold inline-flex items-center justify-center">{activos}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed z-40 w-[280px] bg-panel rounded-xl shadow-[0_12px_32px_rgba(20,28,45,0.2)] py-2 max-h-[70vh] overflow-auto" style={{ top: pos.top, right: pos.right }}>
              {grupos.map((g, gi) => (
                <div key={g.titulo} className={gi ? "border-t border-rule mt-2 pt-2" : ""}>
                  <div className="px-4 pt-1 pb-1 sc">{g.titulo}</div>
                  {["Todos", ...g.opciones].map((o) => {
                    const todos = o === "Todos";
                    const marcado = todos ? g.seleccion.length === 0 : g.seleccion.includes(o);
                    return (
                      <label key={o} className={`mx-2 flex items-center gap-3 px-3 h-10 rounded-lg cursor-pointer text-[13px] ${marcado ? "bg-accentSoft text-accent font-semibold" : "text-ink2 hover:bg-paper"}`}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => g.onChange(todos ? [] : marcado ? g.seleccion.filter((x) => x !== o) : [...g.seleccion, o])}
                        />
                        {o}
                      </label>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Encabezado de tarjeta de listado: título a la izquierda, buscador y filtros a la derecha. */
export function CabeceraListado({ titulo, children, extra }: { titulo: ReactNode; children?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-5">
      <div className="text-[20px] font-bold text-ink mr-auto leading-tight">{titulo}</div>
      {extra}
      {children}
    </div>
  );
}

/** Paginación "Filas por página: 10 · 1–10 de 38 · ‹ ›". */
export function Paginacion({ total, pagina, porPagina, onPagina, onPorPagina }: { total: number; pagina: number; porPagina: number; onPagina: (p: number) => void; onPorPagina: (n: number) => void }) {
  const desde = total ? pagina * porPagina + 1 : 0;
  const hasta = Math.min(total, (pagina + 1) * porPagina);
  const ultima = Math.max(0, Math.ceil(total / porPagina) - 1);
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 px-6 py-3 border-t border-rule text-[13px] text-ink2">
      <label className="flex items-center gap-2">
        Filas por página:
        <span className="relative">
          <select value={porPagina} onChange={(e) => { onPorPagina(Number(e.target.value)); onPagina(0); }} className="appearance-none bg-transparent pr-5 font-semibold text-ink cursor-pointer focus:outline-none">
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </span>
      </label>
      <span className="tnum">{desde}–{hasta} de {total}</span>
      <span className="flex gap-1">
        <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-head disabled:opacity-30" disabled={pagina === 0} onClick={() => onPagina(pagina - 1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
        <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-head disabled:opacity-30" disabled={pagina >= ultima} onClick={() => onPagina(pagina + 1)} aria-label="Siguiente"><ChevronRight size={18} /></button>
      </span>
    </div>
  );
}

export const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
