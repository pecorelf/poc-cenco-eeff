import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { DeloitteLogo, ClienteMarca } from "./ui";

const CLAVE = "eeff-3030";
const LLAVE = "eeff-acceso";

/** Clave de acceso a la POC, antes del login por perfil. */
export function Acceso({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => {
    try { return localStorage.getItem(LLAVE) === "1"; } catch { return false; }
  });
  const [clave, setClave] = useState("");
  const [err, setErr] = useState(false);
  if (ok) return <>{children}</>;
  const entrar = () => {
    if (clave.trim() === CLAVE) {
      try { localStorage.setItem(LLAVE, "1"); } catch {}
      setOk(true);
    } else {
      setErr(true);
    }
  };
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[380px] bg-panel border border-rule">
        <div className="px-6 h-14 flex items-center justify-between border-b border-rule"><DeloitteLogo h={20} /><ClienteMarca h={30} /></div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 font-medium text-[14px]"><Lock size={15} /> Cierre EEFF y Notas</div>
          <div className="text-[12px] text-ink2 mt-1 mb-4">Ingresa la clave de acceso para continuar.</div>
          <motion.input
            animate={err ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.35 }}
            type="password" autoFocus className="inp" placeholder="Clave de acceso" value={clave}
            onChange={(e) => { setClave(e.target.value); setErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
          />
          {err && <div className="text-[11.5px] text-ko mt-1">Clave incorrecta.</div>}
          <button className="btn btn-p w-full justify-center mt-3" onClick={entrar}>Entrar</button>
        </div>
      </motion.div>
    </div>
  );
}
