import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Download, ShieldCheck } from "lucide-react";
import { useApp } from "../engine/store";
import { Encabezado } from "../components/Shell";
import { usePerfiles, tiene } from "../components/ui";
import { TRACKS } from "../engine/derivados";
import { fechaHora, hashStr } from "../engine/util";
import { usuario, USUARIOS } from "../config/users";
import { descargarXlsx } from "../engine/export";

const NOMBRE_TRACK: Record<string, string> = { portada: "Portada", carga: "Carga de información", notas: "Generación de notas", preaprobacion: "Pre-aprobación", directorio: "Aprobación Directorio", informes: "Generación de informes" };

export default function Auditoria() {
  const log = useApp((s) => s.log);
  const uid = useApp((s) => s.usuarioId)!;
  const perfiles = usePerfiles();
  const todo = tiene(perfiles, "admin", "auditor");
  const visibles = TRACKS.filter((t) => t.perfiles.some((p) => perfiles.includes(p))).map((t) => NOMBRE_TRACK[t.id]);
  const [fU, setFU] = useState("");
  const [fT, setFT] = useState("");
  const [fE, setFE] = useState("");
  const [q, setQ] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const base = todo ? log : log.filter((e) => e.usuario === uid || visibles.includes(e.track));
  const ejercicios = [...new Set(base.map((e) => e.ejercicio))];
  const filas = base.filter((e) =>
    (!fU || e.usuario === fU) && (!fT || e.track === fT) && (!fE || e.ejercicio === fE) &&
    (!q || `${e.objeto} ${e.accion} ${e.antes ?? ""} ${e.despues ?? ""} ${e.justificacion ?? ""}`.toLowerCase().includes(q.toLowerCase())) &&
    (!desde || e.fecha.slice(0, 10) >= desde) && (!hasta || e.fecha.slice(0, 10) <= hasta)
  );
  // Hash encadenado para mostrar integridad (el log es solo de lectura)
  const hashes = useMemo(() => {
    const m: Record<string, string> = {};
    let prev = 0;
    [...log].reverse().forEach((e) => { prev = hashStr(prev + e.id + e.fecha + e.accion); m[e.id] = prev.toString(16).padStart(8, "0").slice(0, 8); });
    return m;
  }, [log]);
  const exportar = () => {
    descargarXlsx(`log_auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`, [{ nombre: "Log", filas: [["Fecha", "Usuario", "Perfil", "Ejercicio", "Track", "Objeto", "Acción", "Valor anterior", "Valor nuevo", "Versión", "Justificación", "Hash"], ...filas.map((e) => [fechaHora(e.fecha), e.usuario === "sistema" ? "Plataforma" : usuario(e.usuario).nombre, e.perfil, e.ejercicio, e.track, e.objeto, e.accion, e.antes ?? "", e.despues ?? "", e.version ?? "", e.justificacion ?? "", hashes[e.id]])], anchos: [16, 22, 22, 10, 22, 26, 44, 20, 26, 10, 36, 10] }]);
    useApp.getState().registrar({ track: "Portada", objeto: "Log de auditoría", accion: "Exportación a Excel", despues: `${filas.length} registros` });
  };
  return (
    <div>
      <Encabezado titulo="Log de auditoría" sub={<span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-ok" /> Registro inmutable y encadenado de todas las acciones del proceso · {todo ? "vista completa" : "vista limitada a tus tracks"}</span>} acciones={<button className="btn" onClick={exportar}><Download size={14} /> Exportar a Excel</button>} />
      <div className="p-6">
        <div className="bg-panel border border-rule">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-rule">
            <input className="inp !w-[220px] !h-7 text-[12px]" placeholder="Buscar objeto, acción, valor…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="inp !w-auto !h-7 text-[12px]" value={fU} onChange={(e) => setFU(e.target.value)}><option value="">Todos los usuarios</option>{USUARIOS.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}<option value="sistema">Plataforma</option></select>
            <select className="inp !w-auto !h-7 text-[12px]" value={fT} onChange={(e) => setFT(e.target.value)}><option value="">Todos los tracks</option>{Object.values(NOMBRE_TRACK).map((t) => <option key={t}>{t}</option>)}</select>
            <select className="inp !w-auto !h-7 text-[12px]" value={fE} onChange={(e) => setFE(e.target.value)}><option value="">Todos los ejercicios</option>{ejercicios.map((x) => <option key={x}>{x}</option>)}</select>
            <input type="date" className="inp !w-auto !h-7 text-[12px]" value={desde} onChange={(e) => setDesde(e.target.value)} />
            <input type="date" className="inp !w-auto !h-7 text-[12px]" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            <span className="ml-auto text-[11.5px] text-ink3 tnum">{filas.length} registros</span>
          </div>
          <div className="max-h-[calc(100vh-240px)] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Fecha</th><th>Usuario · perfil</th><th>Ejercicio</th><th>Track</th><th>Objeto</th><th>Acción</th><th>Antes → después</th><th>Versión</th><th>Hash</th></tr></thead>
              <tbody>
                {filas.slice(0, 400).map((e, i) => (
                  <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 30) * 0.01 }}>
                    <td className="tnum whitespace-nowrap text-ink2 text-[11.5px]">{fechaHora(e.fecha)}</td>
                    <td className="whitespace-nowrap"><div>{e.usuario === "sistema" ? "Plataforma" : usuario(e.usuario).nombre}</div><div className="text-[10.5px] text-ink3">{e.perfil}</div></td>
                    <td className="tnum text-[12px]">{e.ejercicio}</td>
                    <td className="text-[12px] text-ink2 whitespace-nowrap">{e.track}</td>
                    <td className="text-[12px]">{e.objeto}</td>
                    <td className="text-[12px]">{e.accion}{e.justificacion && <div className="text-[10.5px] text-ink3">Justificación: {e.justificacion}</div>}</td>
                    <td className="text-[11.5px] text-ink2 max-w-[220px]">{e.antes ? <><span className="line-through text-ink3">{e.antes}</span> → </> : null}{e.despues}</td>
                    <td className="tnum text-[12px]">{e.version}</td>
                    <td className="font-mono text-[10.5px] text-ink3">{hashes[e.id]}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
