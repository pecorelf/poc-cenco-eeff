import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, X, Bot } from "lucide-react";
import { useApp } from "../engine/store";
import { agente } from "../engine/api";
import { contextoAsistente, TRACKS } from "../engine/derivados";
import { TextoAgente } from "./ui";

const SUGERENCIAS = [
  "¿Qué notas están bloqueando el cierre hoy?",
  "¿Cuándo es la sesión de Directorio y qué falta para llegar?",
  "¿Por qué la Nota 18 no cuadra con la carátula?",
  "¿Qué pasa si modifico el tipo de cambio de cierre?"
];

interface Msg { role: "user" | "assistant"; content: string; fuente?: string }

export function Asistente() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(false);
  const setAsistente = useApp((s) => s.setAsistente);
  const nav = useNavigate();
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => fin.current?.scrollIntoView({ block: "end" }), [msgs]);

  const enviar = async (texto: string) => {
    if (!texto.trim() || cargando) return;
    const s = useApp.getState();
    const ctx = contextoAsistente(s.ej(), s.pack(), s.cliente());
    const nuevos: Msg[] = [...msgs, { role: "user", content: texto }];
    setMsgs([...nuevos, { role: "assistant", content: "" }]);
    setQ("");
    setCargando(true);
    try {
      const r = await agente("asistente", ctx, nuevos.map(({ role, content }) => ({ role, content })), (t) =>
        setMsgs([...nuevos, { role: "assistant", content: t }])
      );
      setMsgs([...nuevos, { role: "assistant", content: r.texto, fuente: r.fuente }]);
    } catch (e: any) {
      setMsgs([...nuevos, { role: "assistant", content: `No se pudo consultar al agente: ${e.message}. Revisa que el backend esté corriendo.` }]);
    }
    setCargando(false);
  };

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className="shrink-0 border-l border-rule bg-panel flex flex-col overflow-hidden"
    >
      <div className="h-11 flex items-center justify-between px-4 border-b border-rule shrink-0 w-[400px]">
        <div className="flex items-center gap-2 font-medium text-[13px]">
          <Bot size={15} className="text-accent" /> Agente Asistente del proceso
        </div>
        <button className="btn btn-g btn-sm" onClick={() => setAsistente(false)} aria-label="Cerrar">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-auto px-4 py-4 w-[400px] space-y-4">
        {msgs.length === 0 && (
          <div>
            <p className="text-[12.5px] text-ink2 leading-relaxed mb-4">Responde con el calendario y el estado real del ejercicio seleccionado: hitos, responsables, validaciones y próximos pasos.</p>
            <div className="space-y-1.5">
              {SUGERENCIAS.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="w-full text-left px-3 py-2 border border-rule hover:border-accent text-[12.5px]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => {
          const ir = m.role === "assistant" ? m.content.match(/Ir a:\s*([a-záéíóú]+)/i) : null;
          const limpio = m.content.replace(/\n?Ir a:\s*[a-záéíóú]+\s*$/i, "");
          const track = ir ? TRACKS.find((t) => t.id === ir[1].toLowerCase()) ?? (ir[1].toLowerCase() === "auditoria" ? { ruta: "/auditoria", nombre: "Log de auditoría" } : null) : null;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
              {m.role === "user" ? (
                <div className="ml-10 bg-paper border border-rule px-3 py-2 text-[12.5px]">{m.content}</div>
              ) : (
                <div className="text-[12.8px]">
                  {m.content ? <TextoAgente texto={limpio} cursor={cargando && i === msgs.length - 1} /> : <div className="h-4 w-40 shimmer" />}
                  {track && !cargando && (
                    <button className="btn btn-sm mt-2" onClick={() => nav(track.ruta)}>
                      Ir a {track.nombre}
                    </button>
                  )}
                  {m.fuente === "respaldo" && <div className="text-[10.5px] text-ink3 mt-1.5">Respuesta armada sin conexión al modelo.</div>}
                </div>
              )}
            </motion.div>
          );
        })}
        <div ref={fin} />
      </div>
      <form
        className="border-t border-rule p-3 flex gap-2 w-[400px] shrink-0"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(q);
        }}
      >
        <input className="inp" placeholder="Pregunta sobre el cierre…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-p w-[34px] justify-center px-0" disabled={cargando || !q.trim()} aria-label="Enviar">
          <ArrowUp size={15} />
        </button>
      </form>
    </motion.aside>
  );
}
