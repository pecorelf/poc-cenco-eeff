import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, AnimatePresence, motion } from "motion/react";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useApp } from "../engine/store";
import { usuario } from "../config/users";
import type { EstadoNota, EstadoFuente, Perfil } from "../engine/types";
import { miles } from "../engine/util";

export function DeloitteLogo({ h = 22 }: { h?: number }) {
  return <img src="/deloitte-digital.png" alt="Deloitte Digital" style={{ height: h }} className="select-none" draggable={false} />;
}

export function ClienteMarca({ h = 22 }: { h?: number }) {
  const c = useApp((s) => s.cliente());
  if (c.logo) return <img src={c.logo} alt={c.nombre} style={{ height: h, maxWidth: 140, objectFit: "contain" }} />;
  return (
    <span className="font-semibold tracking-tight" style={{ color: "var(--accent)", fontSize: h * 0.78, lineHeight: 1 }}>
      {c.nombre}
    </span>
  );
}

/** Aplica los colores del cliente a las variables CSS. */
export function useTema() {
  const colores = useApp((s) => s.cliente().colores);
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", colores.primario);
    r.setProperty("--accent-2", colores.secundario);
    r.setProperty("--accent-3", colores.acento);
  }, [colores.primario, colores.secundario, colores.acento]);
}

export function usePerfiles(): Perfil[] {
  const id = useApp((s) => s.usuarioId);
  return id ? usuario(id).perfiles : [];
}
export const tiene = (ps: Perfil[], ...req: Perfil[]) => req.some((r) => ps.includes(r));

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`sc text-[11.5px] ${className}`}>{children}</div>;
}

/** Número que se anima desde su valor anterior. */
export function Num({ v, className = "", dur = 0.9, fmt = miles }: { v: number; className?: string; dur?: number; fmt?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctrl = animate(prev.current, v, {
      duration: dur,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (x) => (el.textContent = fmt(x))
    });
    prev.current = v;
    return () => ctrl.stop();
  }, [v]);
  return <span ref={ref} className={`tnum ${className}`}>{fmt(0)}</span>;
}

const ESTILO_NOTA: Record<EstadoNota, { fill: string; border: string; text: string }> = {
  "Pendiente de fuentes": { fill: "transparent", border: "var(--rule)", text: "var(--ink-3)" },
  "Lista para generar": { fill: "white", border: "var(--ink-3)", text: "var(--ink-2)" },
  Borrador: { fill: "color-mix(in srgb, var(--accent) 22%, white)", border: "color-mix(in srgb, var(--accent) 40%, white)", text: "var(--ink)" },
  "En corrección": { fill: "color-mix(in srgb, var(--warn) 18%, white)", border: "var(--warn)", text: "var(--warn)" },
  "Lista para revisión": { fill: "color-mix(in srgb, var(--accent) 58%, white)", border: "color-mix(in srgb, var(--accent) 70%, white)", text: "var(--ink)" },
  Aprobada: { fill: "var(--accent)", border: "var(--accent)", text: "var(--accent)" }
};
export const estiloNota = (e: EstadoNota) => ESTILO_NOTA[e];

export function Chip({ estado, hatch }: { estado: EstadoNota; hatch?: boolean }) {
  const s = ESTILO_NOTA[estado];
  return <span className={`inline-block w-2.5 h-2.5 shrink-0 ${estado === "Pendiente de fuentes" || hatch ? "hatch" : ""}`} style={{ background: estado === "Pendiente de fuentes" ? undefined : s.fill, border: `1px solid ${s.border}` }} />;
}

export function EstadoNotaTag({ estado }: { estado: EstadoNota }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap" style={{ color: estado === "En corrección" ? "var(--warn)" : "var(--ink-2)" }}>
      <Chip estado={estado} />
      {estado}
    </span>
  );
}

const COLOR_FUENTE: Record<EstadoFuente, string> = { Pendiente: "var(--ink-3)", Cargada: "var(--ink-2)", "Con errores": "var(--ko)", Validada: "var(--warn)", Habilitada: "var(--ok)" };
export function EstadoFuenteTag({ estado }: { estado: EstadoFuente }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap" style={{ color: COLOR_FUENTE[estado] }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR_FUENTE[estado] }} />
      {estado}
    </span>
  );
}

export function OkKo({ ok, dif, fmt }: { ok: boolean; dif?: number; fmt?: (n: number) => string }) {
  return ok ? (
    <span className="text-ok font-medium text-[12px]">OK</span>
  ) : (
    <span className="text-ko font-medium text-[12px] tnum">{dif !== undefined ? `Dif. ${fmt ? fmt(dif) : miles(dif)}` : "KO"}</span>
  );
}

export function Semaforo({ dias, sla = 2 }: { dias: number; sla?: number }) {
  const c = dias > sla + 1 ? "var(--ko)" : dias > sla - 1 ? "var(--warn)" : "var(--ok)";
  return (
    <span className="inline-flex items-center gap-1.5 tnum text-[12px] text-ink2">
      <span className="w-2 h-2 rounded-full" style={{ background: c }} />
      {dias} d
    </span>
  );
}

export function Avatar({ id, size = 22 }: { id: string; size?: number }) {
  const u = usuario(id);
  return (
    <span title={u.nombre} className="inline-flex items-center justify-center font-medium text-white shrink-0" style={{ width: size, height: size, fontSize: size * 0.4, background: "var(--accent-2)", borderRadius: 2 }}>
      {u.iniciales}
    </span>
  );
}

export function Modal({ open, onClose, title, children, width = 620, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number; footer?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <div className="absolute inset-0 bg-[rgba(22,33,44,0.32)]" onClick={onClose} />
          <motion.div
            className="relative bg-panel border border-rule flex flex-col max-h-[84vh]"
            style={{ width }}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-center justify-between px-5 h-12 border-b border-rule shrink-0">
              <div className="font-medium text-[14px]">{title}</div>
              <button className="btn btn-g btn-sm" onClick={onClose} aria-label="Cerrar">
                <X size={15} />
              </button>
            </div>
            <div className="overflow-auto p-5">{children}</div>
            {footer && <div className="px-5 py-3 border-t border-rule flex justify-end gap-2 shrink-0">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, title, children, width = 520, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number; footer?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <div className="absolute inset-0 bg-[rgba(22,33,44,0.18)]" onClick={onClose} />
          <motion.aside
            className="absolute right-0 top-0 bottom-0 bg-panel border-l border-rule flex flex-col"
            style={{ width }}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-center justify-between px-5 h-12 border-b border-rule shrink-0">
              <div className="font-medium text-[14px]">{title}</div>
              <button className="btn btn-g btn-sm" onClick={onClose} aria-label="Cerrar">
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">{children}</div>
            {footer && <div className="px-5 py-3 border-t border-rule flex justify-end gap-2 shrink-0">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="bg-ink text-white text-[12.5px] px-4 h-9 flex items-center gap-2"
          >
            {t.tipo === "ok" ? <CheckCircle2 size={14} className="text-[#7fd1a3]" /> : t.tipo === "ko" ? <AlertTriangle size={14} className="text-[#ffb4ab]" /> : <Info size={14} />}
            {t.texto}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Texto del agente con marcas: [[cambio]] → resaltado, {doc:ID} → cita, **negrita**. */
export function TextoAgente({ texto, docs = {}, cursor = false }: { texto: string; docs?: Record<string, string>; cursor?: boolean }) {
  const partes = texto.split(/(\[\[[\s\S]*?\]\]|\{doc:[A-Z0-9]+\}|\*\*[^*]+\*\*)/g);
  return (
    <div className={`whitespace-pre-wrap leading-[1.65] ${cursor ? "caret" : ""}`}>
      {partes.map((p, i) => {
        if (p.startsWith("[[") && p.endsWith("]]")) return <mark key={i} className="cambio">{p.slice(2, -2)}</mark>;
        const m = p.match(/^\{doc:([A-Z0-9]+)\}$/);
        if (m) return <sup key={i} title={docs[m[1]] ?? m[1]} className="text-accent font-medium ml-0.5 cursor-help">[{m[1]}]</sup>;
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

export function useTick(ms: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
  return t;
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
