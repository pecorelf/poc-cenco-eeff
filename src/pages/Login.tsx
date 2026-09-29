import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Loader2, Ban } from "lucide-react";
import { useApp } from "../engine/store";
import { USUARIOS, correo } from "../config/users";
import { PERFIL_NOMBRE } from "../engine/types";
import { DeloitteLogo, ClienteMarca, Avatar, esperar } from "../components/ui";
import { ETAPAS } from "../components/Flujo";

/** Animación de entrada: 38 notas recorren las seis etapas del cierre. */
function Recorrido({ total }: { total: number }) {
  const W = 620;
  const paso = W / (ETAPAS.length - 1);
  return (
    <svg viewBox={`-30 -70 ${W + 60} 200`} className="w-full">
      <line x1={0} y1={0} x2={W} y2={0} stroke="rgba(255,255,255,0.18)" />
      <motion.line x1={0} y1={0} x2={W} y2={0} stroke="var(--accent-3)" strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1], delay: 0.3 }} />
      {ETAPAS.map((e, i) => (
        <motion.g key={e} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.38 }}>
          <rect x={i * paso - 5} y={-5} width={10} height={10} fill="var(--accent-2)" stroke="white" strokeWidth={1.2} />
          <text x={i * paso} y={-22} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize={10.5}>{String(i + 1).padStart(2, "0")}</text>
          <text x={i * paso} y={34} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={12}>{e}</text>
        </motion.g>
      ))}
      {Array.from({ length: total }, (_, k) => (
        <motion.rect
          key={k}
          width={5}
          height={5}
          y={-2.5 + ((k % 5) - 2) * 9 - 48}
          fill="white"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: [-20, W + 10], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: 6.5, delay: 1 + k * 0.17, repeat: Infinity, repeatDelay: 3, ease: "linear", times: [0, 0.05, 0.9, 1] }}
        />
      ))}
    </svg>
  );
}

export default function Login() {
  const login = useApp((s) => s.login);
  const cliente = useApp((s) => s.cliente());
  const pack = useApp((s) => s.pack());
  const nav = useNavigate();
  const [verificando, setVerificando] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState(false);

  const entrar = async (id: string | null) => {
    setRechazo(false);
    setVerificando(id ?? "sinperfil");
    await esperar(1100);
    if (!id) {
      setVerificando(null);
      setRechazo(true);
      useApp.getState().registrar({ track: "Portada", objeto: "Sesión", accion: "Acceso rechazado: usuario sin perfil asignado", despues: `invitado@${cliente.dominio}` });
      return;
    }
    login(id);
    nav("/inicio?entrada=1");
  };

  return (
    <div className="h-full flex">
      <div className="flex-[1.35] relative overflow-hidden flex flex-col justify-between p-10" style={{ background: "var(--accent-2)" }}>
        <div className="text-white/60 text-[12px]">{cliente.sociedades.map((s) => s.nombre).join(" · ")}</div>
        <div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-white text-[34px] font-semibold leading-[1.15] tracking-[-0.015em] max-w-[560px]">
            Cierre de estados financieros y notas
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-white/65 text-[14px] mt-3 max-w-[520px] leading-relaxed">
            {pack.notas.length} notas por ejercicio, desde la carga de fuentes hasta el envío a la CMF, con control, gobierno y trazabilidad en cada paso.
          </motion.p>
          <div className="mt-12 max-w-[760px]">
            <Recorrido total={pack.notas.length} />
          </div>
        </div>
        <div className="text-white/40 text-[11px]">Datos sintéticos de demostración</div>
      </div>

      <div className="flex-1 bg-panel flex flex-col px-12 py-10 min-w-[420px]">
        <div className="flex items-center justify-between">
          <DeloitteLogo h={26} />
          <ClienteMarca h={26} />
        </div>
        <div className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
          <div className="flex items-center gap-2 text-[12px] text-ink2 mb-1">
            <ShieldCheck size={14} className="text-accent" /> Inicio de sesión corporativo (SSO)
          </div>
          <h2 className="text-[20px] font-semibold mb-5">Elige tu cuenta</h2>
          <div className="border border-rule divide-y divide-rule2 max-h-[52vh] overflow-auto">
            {USUARIOS.map((u, i) => (
              <motion.button
                key={u.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                disabled={!!verificando}
                onClick={() => entrar(u.id)}
                className="w-full flex items-center gap-3 px-3 h-[52px] text-left hover:bg-paper"
              >
                <Avatar id={u.id} size={28} />
                <span className="flex-1 leading-tight min-w-0">
                  <span className="block text-[13px] font-medium truncate">{u.nombre}</span>
                  <span className="block text-[11px] text-ink3 truncate">{correo(u.id, cliente.dominio)}</span>
                </span>
                <span className="text-[10.5px] text-ink2 text-right leading-tight max-w-[130px]">{u.perfiles.map((p) => PERFIL_NOMBRE[p]).join(" · ")}</span>
                {verificando === u.id && <Loader2 size={15} className="animate-spin text-accent" />}
              </motion.button>
            ))}
            <button disabled={!!verificando} onClick={() => entrar(null)} className="w-full flex items-center gap-3 px-3 h-[46px] text-left hover:bg-paper">
              <span className="w-7 h-7 border border-dashed border-ink3 flex items-center justify-center text-ink3 text-[11px]">?</span>
              <span className="flex-1 text-[12.5px] text-ink2">invitado@{cliente.dominio}</span>
              <span className="text-[10.5px] text-ink3">Sin perfil</span>
              {verificando === "sinperfil" && <Loader2 size={15} className="animate-spin text-accent" />}
            </button>
          </div>
          <AnimatePresence>
            {verificando && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-[12px] text-ink2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent live-dot" /> Verificando identidad y perfiles con el proveedor corporativo…
              </motion.div>
            )}
            {rechazo && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-[12.5px] text-ko flex items-start gap-2 border border-ko/30 bg-[color-mix(in_srgb,var(--ko)_5%,white)] px-3 py-2">
                <Ban size={14} className="mt-0.5 shrink-0" /> La cuenta no tiene un perfil asignado en la plataforma. Solicita acceso al Administrador del sistema. El intento quedó registrado en el log.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="text-[11px] text-ink3">Cada acceso queda registrado en el log de auditoría.</div>
      </div>
    </div>
  );
}
