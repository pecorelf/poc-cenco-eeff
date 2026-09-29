import { motion, LayoutGroup } from "motion/react";
import { useNavigate } from "react-router-dom";
import type { Ejercicio, NotaRun, IndustriaPack } from "../engine/types";
import { estiloNota } from "./ui";

export const ETAPAS = ["Carga", "Generación", "Pre-aprobación", "Auditoría externa", "Directorio", "Emisión"];

export function etapaNota(ej: Ejercicio, n: NotaRun) {
  if (["Cerrado", "Emitido", "Aprobado"].includes(ej.estado)) return 5;
  if (ej.consolidadoPreaprobado && ej.auditoria.estado === "cerrada" && ej.directorio.estado !== "no enviado" && n.estado === "Aprobada") return 4;
  if (ej.consolidadoPreaprobado && n.estado === "Aprobada") return 3;
  if (n.estado === "Pendiente de fuentes" || n.estado === "Lista para generar") return 0;
  if (n.estado === "Borrador" || n.estado === "En corrección") return 1;
  return 2;
}

/** Cada nota es un cuadrado que se desplaza a la etapa en que está. El movimiento lo resuelve el layout. */
export function FlujoNotas({ ej, pack, alto = 170 }: { ej: Ejercicio; pack: IndustriaPack; alto?: number }) {
  const nav = useNavigate();
  const cols = ETAPAS.map((_, i) => ej.notas.filter((n) => etapaNota(ej, n) === i));
  return (
    <LayoutGroup>
      <div className="grid grid-cols-6 border-t border-rule">
        {ETAPAS.map((et, i) => {
          const notas = cols[i];
          const conMovimiento = i < 5 && notas.length > 0;
          return (
            <div key={et} className={`relative px-4 pt-3 pb-4 ${i ? "border-l border-rule" : ""}`} style={{ minHeight: alto }}>
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-[12px] text-ink2">
                  <span className="tnum text-ink3 mr-1.5">{String(i + 1).padStart(2, "0")}</span>
                  {et}
                </div>
                <motion.div key={notas.length} initial={{ opacity: 0.2, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[22px] font-semibold tnum leading-none" style={{ color: notas.length ? "var(--ink)" : "var(--rule)" }}>
                  {notas.length}
                </motion.div>
              </div>
              <div className="flex flex-wrap gap-[5px] content-start">
                {notas.map((n) => {
                  const s = estiloNota(n.estado);
                  const ko = n.controles.some((c) => c.bloqueante && c.dif !== 0) || n.desactualizada;
                  return (
                    <motion.button
                      key={n.n}
                      layoutId={`nota-${n.n}`}
                      layout
                      transition={{ type: "spring", stiffness: 260, damping: 30 }}
                      onClick={() => nav(`/notas/${n.n}`)}
                      title={`Nota ${n.n} · ${pack.notas.find((d) => d.n === n.n)?.titulo} · ${n.estado}`}
                      className={`relative w-[26px] h-[26px] text-[10px] tnum font-medium flex items-center justify-center ${n.estado === "Pendiente de fuentes" ? "hatch" : ""}`}
                      style={{ background: n.estado === "Pendiente de fuentes" ? undefined : s.fill, border: `1px solid ${s.border}`, color: n.estado === "Aprobada" ? "white" : "var(--ink)" }}
                    >
                      {n.n}
                      {ko && <span className="absolute -top-[3px] -right-[3px] w-[7px] h-[7px] rounded-full border border-white" style={{ background: "var(--ko)" }} />}
                    </motion.button>
                  );
                })}
              </div>
              {i < 5 && conMovimiento && (
                <svg className="absolute -right-[7px] top-[14px] z-[2]" width="14" height="10" viewBox="0 0 14 10">
                  <path d="M0 5 H12 M8 1 L12 5 L8 9" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
