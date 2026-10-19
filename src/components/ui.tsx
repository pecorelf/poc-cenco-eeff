import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, AnimatePresence, motion } from "motion/react";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, ArrowRight, Check } from "lucide-react";
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

// Colores semánticos de la plataforma del cliente
export const SEM = {
  gris: { bg: "#e3e6ea", fg: "#434d5f" },
  azul: { bg: "#dfe7fb", fg: "#2853c4" },
  azulFuerte: { bg: "#c9d7f6", fg: "#1f45ad" },
  verde: { bg: "#dcefdf", fg: "#2f7a3a" },
  rojo: { bg: "#f6dedb", fg: "#a5301f" },
  ambar: { bg: "#f6ead2", fg: "#8a5f12" }
};

const ESTILO_NOTA: Record<EstadoNota, { fill: string; border: string; text: string; pill: { bg: string; fg: string } }> = {
  "Pendiente de fuentes": { fill: "transparent", border: "#b8bec8", text: "var(--ink-3)", pill: SEM.gris },
  "Lista para generar": { fill: "white", border: "#8a93a3", text: "var(--ink-2)", pill: { bg: "#ffffff", fg: "#434d5f" } },
  Borrador: { fill: "#dfe7fb", border: "#a9bdf0", text: "var(--ink)", pill: SEM.azul },
  "En corrección": { fill: "#f6ead2", border: "#b5852b", text: "#8a5f12", pill: SEM.ambar },
  "Lista para revisión": { fill: "#9fb6ee", border: "#7b9ae6", text: "var(--ink)", pill: SEM.azulFuerte },
  Aprobada: { fill: "#43974f", border: "#43974f", text: "#2f7a3a", pill: SEM.verde }
};
export const estiloNota = (e: EstadoNota) => ESTILO_NOTA[e];

export function Chip({ estado, hatch }: { estado: EstadoNota; hatch?: boolean }) {
  const s = ESTILO_NOTA[estado];
  return <span className={`inline-block w-2.5 h-2.5 shrink-0 rounded-[3px] ${estado === "Pendiente de fuentes" || hatch ? "hatch" : ""}`} style={{ background: estado === "Pendiente de fuentes" ? undefined : s.fill, border: `1px solid ${s.border}` }} />;
}

export function EstadoNotaTag({ estado }: { estado: EstadoNota }) {
  const p = ESTILO_NOTA[estado].pill;
  return (
    <span className="pill" style={{ background: p.bg, color: p.fg, border: estado === "Lista para generar" ? "1px solid #c5cad3" : undefined }}>
      {estado}
    </span>
  );
}

const COLOR_FUENTE: Record<EstadoFuente, { bg: string; fg: string }> = { Pendiente: SEM.gris, Cargada: SEM.azul, "Con errores": SEM.rojo, Validada: SEM.ambar, Habilitada: SEM.verde };
export function EstadoFuenteTag({ estado }: { estado: EstadoFuente }) {
  const c = COLOR_FUENTE[estado];
  return <span className="pill" style={{ background: c.bg, color: c.fg }}>{estado}</span>;
}

export function OkKo({ ok, dif, fmt }: { ok: boolean; dif?: number; fmt?: (n: number) => string }) {
  return ok ? (
    <span className="pill !h-[22px]" style={{ background: SEM.verde.bg, color: SEM.verde.fg }}>OK</span>
  ) : (
    <span className="pill !h-[22px] tnum" style={{ background: SEM.rojo.bg, color: SEM.rojo.fg }}>{dif !== undefined ? `Dif. ${fmt ? fmt(dif) : miles(dif)}` : "KO"}</span>
  );
}

export function Semaforo({ dias, sla = 2 }: { dias: number; sla?: number }) {
  const c = dias > sla + 1 ? "var(--ko)" : dias > sla - 1 ? "var(--warn)" : "var(--ok)";
  return (
    <span className="inline-flex items-center gap-1.5 tnum text-[12px] text-ink2 whitespace-nowrap">
      <span className="w-2 h-2 rounded-full" style={{ background: c }} />
      {dias} d
    </span>
  );
}

/** Barra de progreso con estado a la izquierda y cantidad a la derecha. */
export function Barra({ estado, detalle, valor, color = "var(--accent)", animar = true }: { estado?: ReactNode; detalle?: ReactNode; valor: number; color?: string; animar?: boolean }) {
  return (
    <div className="min-w-[160px]">
      {(estado || detalle) && <div className="flex justify-between gap-3 text-[11.5px] mb-1"><span className="text-ink2 font-medium">{estado}</span><span className="text-ink2 tnum">{detalle}</span></div>}
      <div className="barra"><motion.i initial={animar ? { width: 0 } : false} animate={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%` }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} style={{ background: color }} /></div>
    </div>
  );
}

export function Avatar({ id, size = 22 }: { id: string; size?: number }) {
  const u = usuario(id);
  return (
    <span title={u.nombre} className="inline-flex items-center justify-center font-semibold shrink-0 rounded-full" style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38), background: "var(--head)", color: "var(--ink-2)" }}>
      {u.iniciales}
    </span>
  );
}

export function Modal({ open, onClose, title, children, width = 620, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number; footer?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-start justify-center pt-[7vh] px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <div className="absolute inset-0 bg-[rgba(30,36,48,0.45)]" onClick={onClose} />
          <motion.div
            className="relative bg-panel rounded-2xl flex flex-col max-h-[86vh] shadow-[0_18px_48px_rgba(20,28,45,0.22)] max-w-full"
            style={{ width }}
            initial={{ y: 14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-3 shrink-0">
              <div className="font-bold text-[19px] leading-tight text-ink">{title}</div>
              <button className="text-ink2 hover:text-ink -mr-1 mt-0.5" onClick={onClose} aria-label="Cerrar">
                <X size={22} />
              </button>
            </div>
            <div className="overflow-auto px-7 pb-5 pt-1">{children}</div>
            {footer && <div className="px-7 pb-6 pt-1 flex flex-wrap justify-end gap-3 shrink-0">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Panel lateral derecho, con el botón de flecha circular de la plataforma del cliente. */
export function Drawer({ open, onClose, title, children, width = 520, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number; footer?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <div className="absolute inset-0 bg-[rgba(30,36,48,0.35)]" onClick={onClose} />
          <motion.aside
            className="absolute right-0 top-0 bottom-0 bg-panel flex flex-col max-w-[100vw] shadow-[-12px_0_40px_rgba(20,28,45,0.18)]"
            style={{ width }}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <button onClick={onClose} aria-label="Cerrar" className="absolute -left-5 top-5 w-10 h-10 rounded-full bg-panel shadow-[0_2px_10px_rgba(20,28,45,0.18)] flex items-center justify-center text-ink hover:text-accent">
              <ArrowRight size={18} />
            </button>
            <div className="px-7 pt-6 pb-4 border-b border-rule shrink-0">
              <div className="font-bold text-[19px] leading-tight text-ink pr-4">{title}</div>
            </div>
            <div className="flex-1 overflow-auto">{children}</div>
            {footer && <div className="px-7 py-4 border-t border-rule flex justify-end gap-3 shrink-0">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface HitoTimeline { titulo: string; ok?: boolean; error?: boolean; filas: { k: string; v: ReactNode }[]; extra?: ReactNode }

/** Línea de tiempo como el "Historial" de la plataforma del cliente. */
export function LineaTiempo({ items }: { items: HitoTimeline[] }) {
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <motion.li key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative pl-9 pb-5 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[10px] top-6 bottom-0 w-[2px]" style={{ background: it.error ? "var(--ko)" : "var(--accent)" }} />}
          <span className="absolute left-0 top-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-white" style={{ background: it.error ? "var(--ko)" : "var(--accent)" }}>
            {it.error ? <X size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
          </span>
          <div className="font-bold text-[14px] text-ink leading-tight">{it.titulo}</div>
          {it.filas.map((f) => (
            <div key={f.k} className="text-[12.5px] mt-1"><span className="font-semibold text-ink2">{f.k}:</span> <span className="text-ink3">{f.v}</span></div>
          ))}
          {it.extra}
        </motion.li>
      ))}
    </ol>
  );
}

const TITULO_TOAST: Record<string, string> = { ok: "Acción completada", ko: "Revisa este punto", info: "Información" };

/** Notificaciones con el formato de tarjeta de la plataforma del cliente: ícono, título, detalle y cierre. */
export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const cerrar = (id: string) => useApp.setState({ toasts: useApp.getState().toasts.filter((t) => t.id !== id) });
  return (
    <div className="fixed top-16 right-4 z-[60] flex flex-col gap-3 items-end pointer-events-none w-[400px] max-w-[calc(100vw-32px)]">
      <AnimatePresence>
        {toasts.map((t) => {
          const [titulo, ...resto] = t.texto.split(" · ");
          const tieneDetalle = resto.length > 0;
          const Icono = t.tipo === "ok" ? CheckCircle2 : t.tipo === "ko" ? AlertCircle : Info;
          const color = t.tipo === "ok" ? "var(--ok)" : t.tipo === "ko" ? "var(--ko)" : "var(--accent)";
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="pointer-events-auto w-full bg-panel rounded-xl shadow-[0_8px_28px_rgba(20,28,45,0.16)] px-4 py-3.5 flex gap-3 items-start"
            >
              <Icono size={22} style={{ color }} className="shrink-0 mt-[1px]" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13.5px] text-ink leading-snug">{tieneDetalle ? titulo : TITULO_TOAST[t.tipo]}</div>
                <div className="text-[12.5px] text-ink2 leading-snug mt-0.5">{tieneDetalle ? resto.join(" · ") : titulo}</div>
              </div>
              <button onClick={() => cerrar(t.id)} className="text-ink3 hover:text-ink shrink-0" aria-label="Cerrar"><X size={16} /></button>
            </motion.div>
          );
        })}
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
