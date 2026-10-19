import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Lock, Upload, Trash2, RotateCcw, Unlock } from "lucide-react";
import { useApp } from "../engine/store";
import { Encabezado } from "../components/Shell";
import { Label, DeloitteLogo, ClienteMarca, Modal } from "../components/ui";
import { INDUSTRIAS } from "../config/industries";
import { CLIENTES } from "../config/clients";
import type { Escenario } from "../engine/generator";

const CLAVE = "Caracas1982";
const ESCENARIOS: { id: Escenario; t: string; d: string }[] = [
  { id: "en_curso", t: "Cierre en curso", d: "Notas en todos los estados, fuentes con errores y advertencias, cuenta nueva sin homologar en la Nota 18." },
  { id: "listo_consolidar", t: "Listo para consolidar", d: "Las 38 notas aprobadas. Parte en la generación del pre-informe." },
  { id: "directorio", t: "En aprobación Directorio", d: "Pre-informe v2 pre-aprobado y auditoría cerrada. Parte en el Track 05." },
  { id: "aprobado", t: "Aprobado", d: "Informe aprobado con acta. Parte en la generación de informes CMF, XBRL y 555." }
];

export default function Admin() {
  const [ok, setOk] = useState(() => sessionStorage.getItem("eeff-admin") === "1");
  const [clave, setClave] = useState("");
  const [err, setErr] = useState(false);
  const config = useApp((s) => s.config);
  const escenario = useApp((s) => s.escenario);
  const cliente = useApp((s) => s.cliente());
  const ej = useApp((s) => s.ej());
  const setIndustria = useApp((s) => s.setIndustria);
  const setCliente = useApp((s) => s.setCliente);
  const setColores = useApp((s) => s.setColores);
  const setLogo = useApp((s) => s.setLogo);
  const reiniciar = useApp((s) => s.reiniciar);
  const reabrir = useApp((s) => s.reabrirEjercicio);
  const toast = useApp((s) => s.toast);
  const input = useRef<HTMLInputElement>(null);
  const [col, setCol] = useState(cliente.colores);
  const [reab, setReab] = useState(false);
  const [just, setJust] = useState("");

  if (!ok) {
    return (
      <div>
        <Encabezado titulo="Configuración" />
        <div className="p-6">
          <div className="bg-panel border border-rule max-w-[380px] mx-auto mt-10 p-6">
            <div className="flex items-center gap-2 font-medium mb-4"><Lock size={15} /> Acceso de administración</div>
            <input type="password" className="inp" placeholder="Clave" value={clave} onChange={(e) => { setClave(e.target.value); setErr(false); }} onKeyDown={(e) => e.key === "Enter" && (clave === CLAVE ? (sessionStorage.setItem("eeff-admin", "1"), setOk(true)) : setErr(true))} />
            {err && <div className="text-[11.5px] text-ko mt-1">Clave incorrecta.</div>}
            <button className="btn btn-p mt-3 w-full justify-center" onClick={() => (clave === CLAVE ? (sessionStorage.setItem("eeff-admin", "1"), setOk(true)) : setErr(true))}>Entrar</button>
          </div>
        </div>
      </div>
    );
  }

  const subir = (f: File) => {
    const r = new FileReader();
    r.onload = () => { setLogo(String(r.result)); toast("Logo del cliente actualizado", "ok"); };
    r.readAsDataURL(f);
  };
  const clientesInd = Object.values(CLIENTES).filter((c) => c.industria === config.industria);

  return (
    <div>
      <Encabezado titulo="Configuración" sub="Industria, cliente, identidad visual y escenario de la demo. Los cambios de cliente o industria reconstruyen el ejercicio." />
      <div className="p-6 grid grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <div className="bg-panel border border-rule p-5">
            <Label className="mb-2">Industria</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(INDUSTRIAS).map((i) => (
                <button key={i.id} onClick={() => { setIndustria(i.id); setCol(CLIENTES[INDUSTRIAS[i.id].clientes[0]].colores); toast(`Industria ${i.nombre} cargada`, "ok"); }} className={`text-left border px-3 py-2.5 ${config.industria === i.id ? "border-accent bg-accentSoft" : "border-rule hover:border-ink3"}`}>
                  <div className="font-bold text-[14px]">{i.nombre}</div>
                  <div className="text-[11px] text-ink3">{i.notas.length} notas · {i.fuentes.length} fuentes</div>
                  <div className="text-[11px] text-ink2 mt-1">{i.descripcion}</div>
                </button>
              ))}
            </div>
            <Label className="mt-4 mb-2">Cliente</Label>
            <select className="inp" value={config.cliente} onChange={(e) => { setCliente(e.target.value); setCol(CLIENTES[e.target.value].colores); toast(`Cliente ${CLIENTES[e.target.value].nombre} cargado`, "ok"); }}>
              {clientesInd.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <div className="text-[11.5px] text-ink3 mt-2">Sociedades: {cliente.sociedades.map((s) => s.nombre).join(" · ")} · auditora {cliente.auditora}</div>
          </div>

          <div className="bg-panel border border-rule p-5">
            <Label className="mb-2">Escenario de la demo</Label>
            <div className="space-y-2">
              {ESCENARIOS.map((e) => (
                <button key={e.id} onClick={() => { reiniciar(e.id); toast(`Escenario "${e.t}" cargado`, "ok"); }} className={`w-full text-left border px-3 py-2.5 flex gap-3 ${escenario === e.id ? "border-accent bg-accentSoft" : "border-rule hover:border-ink3"}`}>
                  <RotateCcw size={14} className="mt-0.5 text-ink3 shrink-0" />
                  <div><div className="font-bold text-[14px]">{e.t}</div><div className="text-[11.5px] text-ink2">{e.d}</div></div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-rule p-5">
            <Label className="mb-2">Reapertura de ejercicio</Label>
            <div className="text-[12px] text-ink2 mb-3">Ejercicio {ej.periodo} · estado {ej.estado}. Solo el Administrador puede reabrir un ejercicio aprobado o cerrado, con justificación registrada en el log.</div>
            <button className="btn" disabled={!["Aprobado", "Emitido", "Cerrado"].includes(ej.estado) || ej.historico} onClick={() => setReab(true)}><Unlock size={14} /> Reabrir ejercicio</button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-panel border border-rule p-5">
            <Label className="mb-3">Colores del cliente</Label>
            <div className="grid grid-cols-3 gap-3">
              {(["primario", "secundario", "acento"] as const).map((k) => (
                <label key={k} className="text-[12px]">
                  <div className="text-ink2 mb-1 capitalize">{k}</div>
                  <div className="flex items-center gap-2 border border-rule px-2 h-9">
                    <input type="color" value={col[k]} onChange={(e) => setCol({ ...col, [k]: e.target.value })} className="w-6 h-6 border-0 bg-transparent p-0" />
                    <span className="font-mono text-[11.5px]">{col[k]}</span>
                  </div>
                </label>
              ))}
            </div>
            <Label className="mt-4 mb-2">Vista previa</Label>
            <div className="border border-rule">
              <div className="h-10 px-3 flex items-center gap-3 border-b border-rule bg-panel">
                <DeloitteLogo h={18} /><span className="flex-1" />
                {cliente.logo ? <img src={cliente.logo} className="h-5 max-w-[110px] object-contain" /> : <span className="font-semibold text-[14px]" style={{ color: col.primario }}>{cliente.nombre}</span>}
              </div>
              <div className="p-3 flex items-center gap-3 bg-paper">
                <span className="h-7 px-3 inline-flex items-center text-white text-[12px]" style={{ background: col.primario }}>Acción primaria</span>
                <span className="h-7 px-3 inline-flex items-center text-white text-[12px]" style={{ background: col.secundario }}>Secundaria</span>
                <span className="text-[12px] px-1" style={{ background: `color-mix(in srgb, ${col.acento} 30%, white)`, borderBottom: `1px solid ${col.acento}` }}>cambio marcado</span>
                <div className="flex gap-[2px] ml-auto">{[1, 0.58, 0.22].map((o) => <motion.span key={o} layout className="w-4 h-4" style={{ background: `color-mix(in srgb, ${col.primario} ${o * 100}%, white)` }} />)}</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-p" onClick={() => { setColores(col); toast("Colores aplicados", "ok"); }}>Aplicar colores</button>
              <button className="btn" onClick={() => { const c = CLIENTES[config.cliente].colores; setCol(c); setColores(c); }}>Restablecer</button>
            </div>
          </div>

          <div className="bg-panel border border-rule p-5">
            <Label className="mb-3">Logo del cliente</Label>
            <div className="flex items-center gap-4">
              <div className="w-[180px] h-16 border border-dashed border-ink3 flex items-center justify-center bg-paper"><ClienteMarca h={28} /></div>
              <div className="flex flex-col gap-2">
                <button className="btn btn-sm" onClick={() => input.current?.click()}><Upload size={13} /> Subir PNG o SVG</button>
                {config.logos[config.cliente] && <button className="btn btn-sm" onClick={() => setLogo(null)}><Trash2 size={13} /> Volver al logo base</button>}
              </div>
              <input ref={input} type="file" accept="image/png,image/svg+xml,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
            </div>
            <div className="text-[11px] text-ink3 mt-2">Sin logo, la barra superior muestra el nombre del cliente en su color primario.</div>
          </div>
        </div>
      </div>
      <Modal open={reab} onClose={() => setReab(false)} width={460} title={`Reabrir ${ej.periodo}`}
        footer={<><button className="btn" onClick={() => setReab(false)}>Cancelar</button><button className="btn btn-p" disabled={just.trim().length < 10} onClick={() => { reabrir(just.trim()); setReab(false); setJust(""); toast("Ejercicio reabierto · queda registrado en el log", "info"); }}>Reabrir</button></>}>
        <Label className="mb-1">Justificación</Label>
        <textarea className="inp" rows={3} value={just} onChange={(e) => setJust(e.target.value)} placeholder="Motivo de la reapertura" />
      </Modal>
    </div>
  );
}
