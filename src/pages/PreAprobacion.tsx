import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Check, CornerUpLeft, MessageSquarePlus, Bot, Send, ShieldCheck, FileStack, UserCog, Lock, Download, ArrowUp } from "lucide-react";
import { useApp } from "../engine/store";
import { Encabezado } from "../components/Shell";
import { Label, EstadoNotaTag, Avatar, Modal, usePerfiles, tiene, esperar, TextoAgente, Semaforo, OkKo } from "../components/ui";
import { TablaCuadro, PanelControles, Trazabilidad, HiloComentarios, type CeldaSel } from "../components/NotaPartes";
import { LectorInforme, ArmadoDocumento, lineasCaratula } from "../components/Informe";
import type { Comentario } from "../engine/types";
import { agente } from "../engine/api";
import { miles, fechaHora, hoy, habilesEntre, fechaCorta } from "../engine/util";
import { usuario, USUARIOS } from "../config/users";
import { descargarXlsx } from "../engine/export";
import { Buscador, Filtros, CabeceraListado, normalizar } from "../components/Listado";

function Bandeja() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const nav = useNavigate();
  const [fResps, setFResps] = useState<string[]>([]);
  const [fTipos, setFTipos] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const filas = ej.notas.filter((n) => {
    const d = pack.notas.find((x) => x.n === n.n)!;
    return n.estado === "Lista para revisión" && (!fResps.length || fResps.includes(usuario(n.responsable).nombre)) && (!fTipos.length || fTipos.includes(d.tipo)) && (!q || normalizar(`${n.n} ${d.titulo}`).includes(normalizar(q)));
  });
  const resp = [...new Set(ej.notas.filter((n) => n.estado === "Lista para revisión").map((n) => usuario(n.responsable).nombre))];
  return (
    <div className="bg-panel border border-rule">
      <CabeceraListado titulo="Notas enviadas a revisión">
        <Buscador valor={q} onChange={setQ} placeholder="Buscar notas por nombre o número" />
        <Filtros grupos={[
          { titulo: "Responsable", opciones: resp, seleccion: fResps, onChange: setFResps },
          { titulo: "Tipo de nota", opciones: ["Automática", "Híbrida", "Texto"], seleccion: fTipos, onChange: setFTipos }
        ]} />
      </CabeceraListado>
      {filas.length === 0 ? <div className="px-4 py-6 text-[12px] text-ink3">No hay notas pendientes de revisión.</div> : (
        <div className="overflow-x-auto"><table className="tbl">
          <thead><tr><th className="w-8">N°</th><th>Nota</th><th>Tipo</th><th>Responsable</th><th>Enviada</th><th>Antigüedad · SLA 2 días hábiles</th><th className="num">Versión</th><th /></tr></thead>
          <tbody>
            {filas.map((n, i) => {
              const d = pack.notas.find((x) => x.n === n.n)!;
              const dias = n.enviadaEl ? habilesEntre(new Date(n.enviadaEl), hoy()) : n.diasEnEstado;
              return (
                <motion.tr key={n.n} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="cursor-pointer" onClick={() => nav(`/preaprobacion/${n.n}`)}>
                  <td className="tnum text-ink3">{n.n}</td><td>{d.titulo}</td><td className="text-ink2">{d.tipo}</td>
                  <td><span className="flex items-center gap-2 whitespace-nowrap"><Avatar id={n.responsable} size={26} />{usuario(n.responsable).nombre}</span></td>
                  <td className="tnum text-ink2 text-[12px] whitespace-nowrap">{n.enviadaEl ? fechaHora(n.enviadaEl) : "—"}</td>
                  <td><Semaforo dias={dias} sla={2} /></td>
                  <td className="num">v{n.version}</td>
                  <td className="text-right"><button className="btn btn-sm btn-p">Revisar</button></td>
                </motion.tr>
              );
            })}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

function Consolidado() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const cliente = useApp((s) => s.cliente());
  const perfiles = usePerfiles();
  const generarPre = useApp((s) => s.generarPreinforme);
  const preaprobar = useApp((s) => s.preaprobarConsolidado);
  const cerrarAud = useApp((s) => s.cerrarAuditoria);
  const enviarDir = useApp((s) => s.enviarDirectorio);
  const comentar = useApp((s) => s.comentar);
  const toast = useApp((s) => s.toast);
  const [armando, setArmando] = useState(false);
  const [paso, setPaso] = useState(0);
  const [revision, setRevision] = useState(ej.preinforme?.revisionAgente ?? "");
  const [cargando, setCargando] = useState(false);
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [obs, setObs] = useState<{ nota: number | null } | null>(null);
  const [txtObs, setTxtObs] = useState("");
  const [lector, setLector] = useState(false);
  const aprobadas = ej.notas.filter((n) => n.estado === "Aprobada").length;
  const todas = aprobadas === ej.notas.length;
  const abiertos = ej.comentarios.filter((c) => c.estado === "abierto").length;
  const esAprob = tiene(perfiles, "aprobador") && !ej.historico;
  const esAud = tiene(perfiles, "auditor") && ej.auditoria.estado === "en revisión" && !ej.historico;

  const ctxInforme = () => {
    const car = [...lineasCaratula(ej, pack, "ESF"), ...lineasCaratula(ej, pack, "ER")];
    return {
      periodo: ej.periodo, notasTotal: ej.notas.length, notasAprobadas: aprobadas,
      caratula: car.map((c) => ({ linea: c.linea, nota: c.nota, caratula: c.actual, dif: c.nota - c.actual })),
      cruzadas: pack.cruzadas.map((x) => ({ nombre: x.nombre, ok: !ej.notas.find((n) => n.n === x.a)?.controles.some((c) => c.id === `x-${x.id}` && c.dif !== 0) })),
      variaciones: ej.notas.filter((n) => n.cuadros.length).map((n) => { const t = n.cuadros[0].lineas.find((l) => l.kind === "total")!; return { nota: n.n, titulo: pack.notas.find((d) => d.n === n.n)!.titulo, pct: t.comp ? Math.round(((t.actual - t.comp) / Math.abs(t.comp)) * 1000) / 10 : 0 }; }).filter((v) => Math.abs(v.pct) >= 9).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 5),
      referencia: "Pre-informes de los cierres anteriores (formato Word aprobado)"
    };
  };

  const armar = async () => {
    setArmando(true);
    setRevision("");
    for (let i = 1; i <= pack.notas.length; i++) { setPaso(i); await esperar(45); }
    setCargando(true);
    let final = "";
    try {
      const r = await agente("informe", ctxInforme(), [{ role: "user", content: "Revisa el pre-informe consolidado." }], (t) => { final = t; setRevision(t); });
      final = r.texto;
    } catch (e: any) { final = `No se pudo consultar al Agente de informe: ${e.message}`; setRevision(final); }
    setCargando(false);
    generarPre(final);
    setArmando(false);
    toast(`Pre-informe v${(ej.preinforme?.version ?? 0) + 1} generado`, "ok");
  };

  const preguntar = async () => {
    if (!q.trim()) return;
    const pregunta = q;
    setQ("");
    const i = chat.length;
    setChat((c) => [...c, { q: pregunta, a: "" }]);
    try {
      await agente("informe", ctxInforme(), [{ role: "user", content: pregunta }], (t) => setChat((c) => c.map((x, k) => (k === i ? { ...x, a: t } : x))));
    } catch (e: any) { setChat((c) => c.map((x, k) => (k === i ? { ...x, a: e.message } : x))); }
  };

  const pasos = [
    { t: "Notas aprobadas", ok: todas, d: `${aprobadas} de ${ej.notas.length}` },
    { t: "Pre-informe generado", ok: Boolean(ej.preinforme), d: ej.preinforme ? `v${ej.preinforme.version} · ${fechaHora(ej.preinforme.fecha)}` : "Pendiente" },
    { t: "Consolidado pre-aprobado", ok: ej.consolidadoPreaprobado, d: ej.consolidadoPreaprobado ? usuario("u_aprob").nombre : "Pendiente" },
    { t: "Revisión de auditoría externa", ok: ej.auditoria.estado === "cerrada", d: ej.auditoria.estado === "cerrada" ? `Cerrada ${ej.auditoria.cerradaEl ? fechaCorta(ej.auditoria.cerradaEl) : ""}` : ej.auditoria.estado },
    { t: "Enviado al Directorio", ok: ej.directorio.estado !== "no enviado", d: ej.directorio.estado }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-panel border border-rule grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {pasos.map((p, i) => (
          <div key={p.t} className="px-4 py-3 border-r border-rule2 last:border-r-0 relative">
            <div className="flex items-center gap-2 text-[12px] font-medium">
              <motion.span initial={false} animate={{ background: p.ok ? "var(--accent)" : "var(--panel)" }} className="w-4 h-4 border border-accent flex items-center justify-center">{p.ok && <Check size={10} color="white" strokeWidth={3} />}</motion.span>
              {p.t}
            </div>
            <div className="text-[11.5px] text-ink3 mt-1 ml-6 capitalize-first">{p.d}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="bg-panel border border-rule">
          <div className="px-5 h-14 flex items-center justify-between border-b border-rule">
            <span className="font-bold text-[15px] flex items-center gap-2"><FileStack size={15} className="text-accent" /> Pre-informe de estados financieros</span>
            <div className="flex gap-2">
              {ej.preinforme && <button className="btn btn-sm" onClick={() => setLector(true)}>Abrir documento</button>}
              {esAprob && !ej.consolidadoPreaprobado && <button className="btn btn-sm btn-p" disabled={!todas || armando} title={todas ? "" : "Solo se consolidan notas aprobadas"} onClick={armar}><Bot size={13} /> {ej.preinforme ? "Regenerar pre-informe" : "Generar pre-informe"}</button>}
            </div>
          </div>
          {armando ? (
            <div className="px-4 py-6">
              <ArmadoDocumento ej={ej} pack={pack} paso={paso} />
            </div>
          ) : !ej.preinforme ? (
            <div className="px-4 py-6 text-[12.5px] text-ink2">
              {todas ? "Las notas están aprobadas. El Agente de informe de cierre consolidará cuadros y textos en el formato Word definido y verificará el set completo." : `Faltan ${ej.notas.length - aprobadas} notas por aprobar para consolidar el pre-informe.`}
              <div className="flex gap-[3px] mt-4">{ej.notas.map((n) => <span key={n.n} title={`Nota ${n.n} · ${n.estado}`} className="h-6 flex-1" style={{ background: n.estado === "Aprobada" ? "var(--accent)" : "var(--rule)" }} />)}</div>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="grid grid-cols-3 gap-4 text-[12px] mb-4">
                <div><Label>Versión</Label><span className="text-[18px] font-semibold tnum">v{ej.preinforme.version}</span></div>
                <div><Label>Generado</Label>{fechaHora(ej.preinforme.fecha)}</div>
                <div><Label>Contenido</Label>{ej.notas.length} notas aprobadas · carátula ESF y ER</div>
              </div>
              <Label className="mb-1">Revisión del Agente de informe de cierre</Label>
              <div className="text-[12.5px] bg-paper border border-rule px-4 py-3">
                {(revision || ej.preinforme.revisionAgente) ? (revision || ej.preinforme.revisionAgente!).split("\n").map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-[2px] flex gap-2">
                    {l.startsWith("OK") ? <span className="text-ok font-medium w-[60px] shrink-0">OK</span> : l.startsWith("REVISAR") ? <span className="text-warn font-medium w-[60px] shrink-0">REVISAR</span> : null}
                    <span className={l.startsWith("Conclusión") ? "font-medium" : ""}>{l.replace(/^(OK|REVISAR) — /, "")}</span>
                  </motion.div>
                )) : <span className="text-ink3">Sin revisión registrada.</span>}
                {cargando && <span className="caret" />}
              </div>
            </div>
          )}
          {(revision || cargando) && armando && (
            <div className="px-4 pb-4 text-[12.5px]"><TextoAgente texto={revision} cursor={cargando} /></div>
          )}
          {ej.preinforme && (
            <div className="border-t border-rule px-4 py-3">
              <Label className="mb-2">Consultar al Agente sobre el documento</Label>
              {chat.map((c, i) => <div key={i} className="mb-2 text-[12px]"><div className="font-medium">{c.q}</div><div className="text-ink2"><TextoAgente texto={c.a || "…"} /></div></div>)}
              <div className="flex gap-2">
                <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && preguntar()} placeholder="Ej: ¿qué notas varían más de 10% contra el comparativo?" />
                <button className="btn btn-p" onClick={preguntar}><ArrowUp size={14} /></button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-panel border border-rule">
            <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[15px]">Acciones del consolidado</div>
            <div className="p-4 space-y-3 text-[12px]">
              <div>
                <button className="btn btn-p w-full justify-center" disabled={!esAprob || ej.consolidadoPreaprobado || !todas || abiertos > 0 || !ej.preinforme} onClick={() => { const e = preaprobar(); toast(e ?? "Consolidado pre-aprobado · se habilitó el acceso de auditoría externa", e ? "ko" : "ok"); }}><ShieldCheck size={14} /> Pre-aprobar consolidado</button>
                <div className="text-[11px] text-ink3 mt-1">{!todas ? "Quedan notas sin aprobar." : abiertos ? `${abiertos} comentarios abiertos.` : !ej.preinforme ? "Genera primero el pre-informe." : ej.consolidadoPreaprobado ? "Pre-aprobado." : esAprob ? "Listo para pre-aprobar." : "Requiere perfil Aprobador."}</div>
              </div>
              <div className="border-t border-rule2 pt-3">
                <Label className="mb-1">Auditoría externa · {USUARIOS.find((u) => u.id === "u_audit")!.nombre}</Label>
                <div className="text-ink2 mb-2">Estado: <span className="font-medium text-ink">{ej.auditoria.estado}</span></div>
                {esAud ? (
                  <div className="flex gap-2">
                    <button className="btn btn-sm" onClick={() => setObs({ nota: null })}><MessageSquarePlus size={13} /> Registrar observación</button>
                    <button className="btn btn-sm btn-p" onClick={() => { cerrarAud(); toast("Revisión de auditoría cerrada sin observaciones", "ok"); }}>Cerrar sin observaciones</button>
                  </div>
                ) : <div className="text-[11px] text-ink3">{ej.auditoria.estado === "en revisión" ? "Solo el perfil Auditor externo registra observaciones y cierra su revisión." : "Se habilita con el consolidado pre-aprobado."}</div>}
              </div>
              <div className="border-t border-rule2 pt-3">
                <button className="btn btn-d w-full justify-center" disabled={!esAprob || ej.auditoria.estado !== "cerrada" || ej.directorio.estado !== "no enviado"} onClick={() => { enviarDir(); toast("Pre-informe enviado al Directorio · se notificó a los aprobadores", "ok"); }}><Send size={14} /> Enviar al Directorio</button>
                <div className="text-[11px] text-ink3 mt-1">{ej.directorio.estado !== "no enviado" ? `Directorio: ${ej.directorio.estado}` : "Se habilita con la revisión de auditoría cerrada."}</div>
              </div>
            </div>
          </div>
          <div className="bg-panel border border-rule">
            <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[15px]">Observaciones del proceso</div>
            <div className="max-h-[320px] overflow-auto"><HiloComentarios comentarios={ej.comentarios.filter((c) => c.instancia !== "Directorio")} puedeResponder={false} /></div>
          </div>
        </div>
      </div>

      <Modal open={lector} onClose={() => setLector(false)} width={1100} title={`Pre-informe v${ej.preinforme?.version} · ${ej.periodo}`}>
        <LectorInforme ej={ej} pack={pack} cliente={cliente} comentarios={ej.comentarios} alto="68vh" onComentar={esAud ? (n) => setObs({ nota: n }) : undefined} />
      </Modal>
      <Modal open={Boolean(obs)} onClose={() => setObs(null)} width={520} title="Observación de auditoría externa"
        footer={<><button className="btn" onClick={() => setObs(null)}>Cancelar</button><button className="btn btn-p" disabled={txtObs.trim().length < 8} onClick={() => { comentar({ nota: obs?.nota ?? null, instancia: "Auditoría", texto: txtObs.trim() }); setTxtObs(""); setObs(null); toast("Observación registrada · el estado vuelve a pendiente y se alertó al responsable", "info"); }}>Registrar</button></>}>
        <Label className="mb-1">Nota</Label>
        <select className="inp mb-3" value={obs?.nota ?? ""} onChange={(e) => setObs({ nota: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Informe general</option>{pack.notas.map((d) => <option key={d.n} value={d.n}>Nota {d.n} · {d.titulo}</option>)}
        </select>
        <Label className="mb-1">Observación</Label>
        <textarea className="inp" rows={3} value={txtObs} onChange={(e) => setTxtObs(e.target.value)} />
        <div className="text-[11px] text-ink3 mt-2">El auditor no modifica datos. Si registra observaciones, la nota vuelve a En corrección y el consolidado a pendiente.</div>
      </Modal>
    </div>
  );
}

function Historial() {
  const log = useApp((s) => s.log);
  const ej = useApp((s) => s.ej());
  const filas = log.filter((e) => e.track === "Pre-aprobación" && e.ejercicio === ej.periodo);
  return (
    <div className="bg-panel border border-rule">
      <div className="px-5 h-14 flex items-center justify-between border-b border-rule">
        <span className="font-bold text-[15px]">Historial de revisiones y aprobaciones</span>
        <button className="btn btn-sm" onClick={() => descargarXlsx(`historial_preaprobacion_${ej.periodo.replace(" ", "")}.xlsx`, [{ nombre: "Historial", filas: [["Fecha", "Usuario", "Perfil", "Objeto", "Acción", "Versión", "Justificación"], ...filas.map((e) => [fechaHora(e.fecha), usuario(e.usuario).nombre, e.perfil, e.objeto, e.accion, e.version ?? "", e.justificacion ?? ""])], anchos: [16, 22, 22, 18, 50, 10, 40] }])}><Download size={13} /> Exportar</button>
      </div>
      <div className="overflow-x-auto"><table className="tbl">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Objeto</th><th>Acción</th><th>Versión</th></tr></thead>
        <tbody>{filas.slice(0, 80).map((e) => <tr key={e.id}><td className="tnum whitespace-nowrap text-ink2">{fechaHora(e.fecha)}</td><td className="whitespace-nowrap">{e.usuario === "sistema" ? "Plataforma" : usuario(e.usuario).nombre}</td><td>{e.objeto}</td><td>{e.accion}{e.justificacion && <div className="text-[11px] text-ink3">{e.justificacion}</div>}</td><td className="tnum">{e.version}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Suplencia({ open, onClose }: { open: boolean; onClose: () => void }) {
  const delegar = useApp((s) => s.delegar);
  const toast = useApp((s) => s.toast);
  const [s, setS] = useState("u_proceso");
  const [h, setH] = useState(() => new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10));
  return (
    <Modal open={open} onClose={onClose} width={460} title="Suplencia y delegación" footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-p" onClick={() => { delegar(s, h); toast(`Aprobación delegada en ${usuario(s).nombre}`, "ok"); onClose(); }}>Delegar</button></>}>
      <Label className="mb-1">Aprobador suplente</Label>
      <select className="inp mb-3" value={s} onChange={(e) => setS(e.target.value)}>{USUARIOS.filter((u) => u.id !== "u_aprob" && u.id !== "u_audit").map((u) => <option key={u.id} value={u.id}>{u.nombre} · {u.cargo}</option>)}</select>
      <Label className="mb-1">Vigente hasta</Label>
      <input type="date" className="inp" value={h} onChange={(e) => setH(e.target.value)} />
      <div className="text-[11px] text-ink3 mt-2">Toda aprobación delegada indica quién delegó y en quién.</div>
    </Modal>
  );
}

export default function PreAprobacion() {
  const ej = useApp((s) => s.ej());
  const perfiles = usePerfiles();
  const [params, setParams] = useSearchParams();
  const [sup, setSup] = useState(false);
  const def = tiene(perfiles, "auditor") ? "preinforme" : "bandeja";
  const vista = params.get("vista") ?? def;
  const pend = ej.notas.filter((n) => n.estado === "Lista para revisión").length;
  const TABS = [{ id: "bandeja", t: "Bandeja del aprobador", c: pend }, { id: "preinforme", t: "Pre-informe y consolidado" }, { id: "historial", t: "Historial" }];
  return (
    <div>
      <Encabezado n="04" titulo="Pre-aprobación" sub={`Revisión escalonada: aprobador de notas → consolidado → auditoría externa · ${ej.periodo}`}
        acciones={tiene(perfiles, "aprobador") ? <button className="btn" onClick={() => setSup(true)}><UserCog size={14} /> Suplencia</button> : undefined} />
      <div className="p-6 space-y-4">
        <div className="flex border-b border-rule">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setParams({ vista: t.id })} className={`relative px-4 h-9 text-[12.5px] ${vista === t.id ? "font-medium" : "text-ink2 hover:text-ink"}`}>
              {t.t}{t.c ? <span className="ml-1.5 text-ink3 tnum">{t.c}</span> : null}
              {vista === t.id && <motion.span layoutId="tabpre" className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" />}
            </button>
          ))}
        </div>
        {vista === "bandeja" && <Bandeja />}
        {vista === "preinforme" && <Consolidado />}
        {vista === "historial" && <Historial />}
      </div>
      <Suplencia open={sup} onClose={() => setSup(false)} />
    </div>
  );
}

// ---------- Revisión de una nota ----------

export function Revision() {
  const { n: nParam } = useParams();
  const n = Number(nParam);
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const aprobar = useApp((s) => s.aprobarNota);
  const devolver = useApp((s) => s.devolverNota);
  const comentar = useApp((s) => s.comentar);
  const toast = useApp((s) => s.toast);
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const nota = ej.notas.find((x) => x.n === n);
  const def = pack.notas.find((d) => d.n === n);
  const [modo, setModo] = useState<"traza" | "comentar">(() => (tiene(perfiles, "auditor") ? "comentar" : "traza"));
  const [traza, setTraza] = useState<CeldaSel | null>(null);
  const [comp, setComp] = useState<{ celda?: CeldaSel } | null>(null);
  const [pop, setPop] = useState<{ celda: CeldaSel; rect: DOMRect } | null>(null);
  const [txt, setTxt] = useState("");
  const [dev, setDev] = useState(false);
  const [sello, setSello] = useState(false);
  if (!nota || !def) return <div className="p-6">Nota no encontrada.</div>;
  const esAud = tiene(perfiles, "auditor") && !ej.historico;
  const esAprob = tiene(perfiles, "aprobador") && nota.estado === "Lista para revisión" && !ej.historico;
  const instancia: Comentario["instancia"] = esAud ? "Auditoría" : "Pre-aprobación";
  const puedeComentar = esAprob || esAud;
  const coment = ej.comentarios.filter((c) => c.nota === n);
  const abiertos = coment.filter((c) => c.estado === "abierto").length;
  const vCongelada = nota.versiones.find((v) => v.v === nota.version);

  const registrarComentario = () => {
    const celda = pop?.celda ?? comp?.celda;
    comentar({ nota: n, celda: celda ? { cuadro: celda.cuadro, linea: celda.linea } : undefined, instancia, texto: txt.trim() });
    setTxt("");
    setComp(null);
    setPop(null);
    toast(`Observación registrada · se notificó a ${usuario(nota.responsable).nombre}`, "info");
  };

  return (
    <div>
      <div className="px-6 pt-5 pb-2">
        <button className="text-[11.5px] text-ink3 hover:text-ink flex items-center gap-1 mb-1" onClick={() => nav("/preaprobacion")}><ArrowLeft size={12} /> Bandeja del aprobador</button>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold tracking-[-0.01em]">Revisión · Nota {n} · {def.titulo}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[12px] text-ink2">
              <EstadoNotaTag estado={nota.estado} />
              <span className="flex items-center gap-1"><Lock size={12} /> Versión congelada v{nota.version}{vCongelada ? ` · ${fechaHora(nota.enviadaEl ?? vCongelada.fecha)}` : ""}</span>
              <span className="flex items-center gap-1.5"><Avatar id={nota.responsable} size={18} />{usuario(nota.responsable).nombre}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border border-rule mr-2">
              <button onClick={() => setModo("traza")} className={`px-3 h-[30px] text-[12px] whitespace-nowrap ${modo === "traza" ? "bg-accent text-white" : ""}`}>Trazar cifras</button>
              <button onClick={() => setModo("comentar")} className={`px-3 h-[30px] text-[12px] whitespace-nowrap ${modo === "comentar" ? "bg-accent text-white" : ""}`}>Comentar celdas</button>
            </div>
            <button className="btn" disabled={!puedeComentar} onClick={() => setComp({})}><MessageSquarePlus size={14} /> Comentar nota</button>
            <button className="btn" disabled={!esAprob} onClick={() => setDev(true)}><CornerUpLeft size={14} /> Devolver</button>
            <button className="btn btn-p" disabled={!esAprob || abiertos > 0} title={abiertos ? "No se puede aprobar con comentarios abiertos" : ""} onClick={() => { const e = aprobar(n); if (e) return toast(e, "ko"); setSello(true); toast(`Nota ${n} aprobada sobre v${nota.version}`, "ok"); setTimeout(() => { setSello(false); const sig = useApp.getState().ej().notas.find((x) => x.estado === "Lista para revisión"); nav(sig ? `/preaprobacion/${sig.n}` : "/preaprobacion"); }, 1500); }}><Check size={14} /> Aprobar v{nota.version}</button>
          </div>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start relative">
        <AnimatePresence>
          {sello && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex items-start justify-center pt-24 pointer-events-none">
              <div className="stamp border-[3px] px-8 py-3 text-[28px] font-bold tracking-[0.12em] bg-white/85" style={{ color: "var(--ok)", borderColor: "var(--ok)" }}>APROBADA · v{nota.version}</div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="space-y-4 min-w-0">
          {modo === "comentar" && <div className="text-[11.5px] px-3 py-2 border border-dashed border-accent text-accent bg-accentSoft">{puedeComentar ? "Modo comentario: selecciona una cifra para dejar una observación en esa celda." : "Tu perfil puede revisar la nota, pero no registrar observaciones en ella."}</div>}
          {nota.texto && (
            <div className="bg-panel border border-rule">
              <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[14px]">Texto de la nota</div>
              <div className="px-4 py-3 text-[12.5px] whitespace-pre-wrap leading-[1.65]">{nota.texto}</div>
            </div>
          )}
          {nota.cuadros.map((c) => <TablaCuadro key={c.id} c={c} ej={ej} nota={nota} comentarios={coment} onCifra={(sel, rect) => {
            if (modo === "traza") return setTraza(sel);
            if (!puedeComentar) return toast("Tu perfil no registra observaciones en esta nota", "ko");
            setTxt("");
            setPop({ celda: sel, rect: rect ?? new DOMRect(window.innerWidth / 2, 200, 0, 0) });
          }} />)}
          {nota.cuadros.length > 0 && <PanelControles controles={nota.controles} animar={false} />}
          {nota.ajustes.length > 0 && (
            <div className="bg-panel border border-rule">
              <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[14px]">Ajustes manuales aplicados</div>
              <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Celda</th><th className="num">Monto</th><th>Justificación</th><th>Usuario</th></tr></thead>
                <tbody>{nota.ajustes.map((a) => <tr key={a.id}><td>{nota.cuadros.find((c) => c.id === a.cuadro)?.lineas.find((l) => l.id === a.linea)?.label}</td><td className="num">{miles(a.monto)}</td><td className="text-ink2">{a.justificacion}</td><td>{usuario(a.usuario).nombre}</td></tr>)}</tbody></table></div>
            </div>
          )}
        </div>
        <div className="bg-panel border border-rule xl:sticky xl:top-4">
          <div className="px-5 h-14 flex items-center justify-between border-b border-rule"><span className="font-bold text-[14px]">Observaciones</span><span className="text-[11.5px] text-ink3">{abiertos} abiertas</span></div>
          <div className="max-h-[60vh] overflow-auto"><HiloComentarios comentarios={coment} nota={nota} def={def} puedeResponder={false} /></div>
        </div>
      </div>

      <Trazabilidad sel={traza} nota={nota} def={def} onClose={() => setTraza(null)} />
      <AnimatePresence>
        {pop && (() => {
          const c = nota.cuadros.find((x) => x.id === pop.celda.cuadro);
          const l = c?.lineas.find((x) => x.id === pop.celda.linea);
          const valor = pop.celda.col === "actual" ? l?.actual : pop.celda.col === "comp" ? l?.comp : l?.trim;
          const w = 380;
          const left = Math.max(12, Math.min(pop.rect.right - w, window.innerWidth - w - 12));
          const abajo = pop.rect.bottom + 260 < window.innerHeight;
          const top = abajo ? pop.rect.bottom + 8 : Math.max(12, pop.rect.top - 252);
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPop(null)} />
              <motion.div initial={{ opacity: 0, y: abajo ? -6 : 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
                className="fixed z-50 bg-panel border shadow-[0_8px_24px_rgba(22,33,44,0.14)]" style={{ left, top, width: w, borderColor: "var(--accent)" }}>
                <div className="px-4 pt-3 pb-2 border-b border-rule">
                  <div className="text-[11px] text-ink3">{instancia === "Auditoría" ? "Observación de auditoría externa" : "Observación de pre-aprobación"} · Nota {n}</div>
                  <div className="text-[12.5px] font-medium leading-snug">{c?.titulo} · {l?.label}</div>
                  <div className="text-[12px] tnum text-accent">M$ {valor !== undefined ? miles(valor) : "—"}</div>
                </div>
                <div className="p-3">
                  <textarea autoFocus className="inp" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Describe la observación sobre esta cifra" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && txt.trim().length >= 8) registrarComentario(); }} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10.5px] text-ink3">Queda como hilo abierto en la celda</span>
                    <div className="flex gap-2">
                      <button className="btn btn-sm" onClick={() => setPop(null)}>Cancelar</button>
                      <button className="btn btn-sm btn-p" disabled={txt.trim().length < 8} onClick={registrarComentario}>Registrar</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
      <Modal open={Boolean(comp)} onClose={() => setComp(null)} width={500} title={comp?.celda ? "Observación en celda" : "Observación en la nota"}
        footer={<><button className="btn" onClick={() => setComp(null)}>Cancelar</button><button className="btn btn-p" disabled={txt.trim().length < 8} onClick={registrarComentario}>Registrar</button></>}>
        {comp?.celda && <div className="text-[12px] mb-3 px-3 py-2 bg-paper border border-rule">{nota.cuadros.find((c) => c.id === comp.celda!.cuadro)?.titulo} · <strong>{nota.cuadros.find((c) => c.id === comp.celda!.cuadro)?.lineas.find((l) => l.id === comp.celda!.linea)?.label}</strong></div>}
        <textarea className="inp" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Describe la observación y lo que esperas que se corrija" />
        <div className="text-[11px] text-ink3 mt-2">Instancia: {instancia}. El comentario queda como hilo con autor, fecha y estado.</div>
      </Modal>
      <Modal open={dev} onClose={() => setDev(false)} width={500} title={`Devolver Nota ${n}`}
        footer={<><button className="btn" onClick={() => setDev(false)}>Cancelar</button><button className="btn btn-p" disabled={txt.trim().length < 8 && abiertos === 0} onClick={() => { if (txt.trim()) comentar({ nota: n, instancia: "Pre-aprobación", texto: txt.trim() }); devolver(n); setTxt(""); setDev(false); toast(`Nota ${n} devuelta a ${usuario(nota.responsable).nombre}`, "info"); nav("/preaprobacion"); }}>Devolver a En corrección</button></>}>
        <div className="text-[12px] text-ink2 mb-2">La nota vuelve a En corrección, se reabre para edición y se notifica a {usuario(nota.responsable).nombre}.</div>
        <textarea className="inp" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={abiertos ? "Comentario adicional (opcional)" : "Comentario obligatorio para devolver"} />
      </Modal>
    </div>
  );
}

export { OkKo };
