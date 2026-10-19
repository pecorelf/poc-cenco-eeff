import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { CornerUpLeft, Stamp, Send, MessageSquarePlus, Download, ArrowRight } from "lucide-react";
import { useApp } from "../engine/store";
import { Encabezado } from "../components/Shell";
import { Label, Modal, usePerfiles, tiene, Avatar, EstadoNotaTag } from "../components/ui";
import { HiloComentarios } from "../components/NotaPartes";
import { LectorInforme } from "../components/Informe";
import { fechaHora, fechaLarga, fechaCorta } from "../engine/util";
import { usuario } from "../config/users";
import { actaDe } from "../engine/generator";
import { descargarDoc } from "../engine/export";

export default function Directorio() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const cliente = useApp((s) => s.cliente());
  const log = useApp((s) => s.log);
  const comentar = useApp((s) => s.comentar);
  const devolver = useApp((s) => s.devolverDirectorio);
  const asignar = useApp((s) => s.asignarObservacion);
  const reenviar = useApp((s) => s.reenviarDirectorio);
  const aprobar = useApp((s) => s.aprobarDirectorio);
  const registrar = useApp((s) => s.registrar);
  const toast = useApp((s) => s.toast);
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const [nuevo, setNuevo] = useState<{ nota: number | null } | null>(null);
  const [txt, setTxt] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [sello, setSello] = useState(false);
  const [asig, setAsig] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"informe" | "historial">("informe");

  const esDir = tiene(perfiles, "directorio") && !ej.historico;
  const esProc = tiene(perfiles, "proceso") && !ej.historico;
  const enRevision = ej.directorio.estado === "en revisión";
  const obsDir = ej.comentarios.filter((c) => c.instancia === "Directorio");
  const abiertas = obsDir.filter((c) => c.estado === "abierto");
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad);
  const acta = ej.directorio.acta ?? (confirmar ? actaDe(ej, new Date().toISOString()) : undefined);

  if (ej.directorio.estado === "no enviado") {
    return (
      <div>
        <Encabezado n="05" titulo="Aprobación Directorio" />
        <div className="p-6">
          <div className="bg-panel border border-rule px-6 py-10 text-center">
            <div className="text-[13px] font-medium">El informe todavía no se envía al Directorio</div>
            <div className="text-[12px] text-ink2 mt-1">Requiere el consolidado pre-aprobado y la revisión de auditoría externa cerrada. Estado actual del ejercicio: {ej.estado}.</div>
            <button className="btn mt-4" onClick={() => nav("/preaprobacion?vista=preinforme")}>Ir a Pre-aprobación <ArrowRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  }

  const descargarActa = () => {
    if (!ej.directorio.acta) return;
    descargarDoc(`Acta_aprobacion_${ej.periodo.replace(" ", "")}.doc`, "Acta de aprobación", `<h1>Acta de aprobación de estados financieros</h1><p>${soc?.nombre} · ${ej.periodo} · Pre-informe v${ej.preinforme?.version}</p><table><tr><th>Nivel</th><th>Aprobador</th><th>Fecha</th><th>Versión</th></tr>${ej.directorio.acta.map((a) => `<tr><td>${a.nivel}</td><td>${usuario(a.nombre).nombre}</td><td>${fechaHora(a.fecha)}</td><td>${a.version}</td></tr>`).join("")}</table><p>Fecha de aprobación del Directorio para la Nota 1: ${fechaLarga(ej.aprobadoEl ?? new Date())}.</p>`);
    registrar({ track: "Aprobación Directorio", objeto: "Acta de aprobación", accion: "Descarga Word" });
  };

  return (
    <div>
      <Encabezado n="05" titulo="Aprobación Directorio"
        sub={<>Informe consolidado pre-aprobado v{ej.preinforme?.version} · {ej.preinforme ? `pre-aprobado ${fechaCorta(ej.preinforme.fecha)}` : ""} · estado <strong className="text-ink">{ej.directorio.estado}</strong></>}
        acciones={
          <>
            {esDir && enRevision && <button className="btn" onClick={() => setNuevo({ nota: null })}><MessageSquarePlus size={14} /> Comentar</button>}
            {esDir && enRevision && <button className="btn" disabled={!abiertas.length} title={abiertas.length ? "" : "No se puede devolver sin al menos un comentario"} onClick={() => { const e = devolver(); toast(e ?? "Informe devuelto · se notificó a la Responsable del proceso", e ? "ko" : "info"); }}><CornerUpLeft size={14} /> Devolver con observaciones</button>}
            {esDir && enRevision && <button className="btn btn-p" disabled={abiertas.length > 0} onClick={() => setConfirmar(true)}><Stamp size={14} /> Aprobar informe</button>}
            {esProc && ej.directorio.estado === "devuelto" && <button className="btn btn-p" onClick={() => { const e = reenviar(); toast(e ?? "Informe reenviado a aprobación", e ? "ko" : "ok"); }}><Send size={14} /> Reenviar a aprobación</button>}
            {ej.directorio.acta && <button className="btn" onClick={descargarActa}><Download size={14} /> Acta</button>}
          </>
        } />
      <div className="p-6 space-y-4">
        <div className="flex border-b border-rule">
          {(["informe", "historial"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative px-4 h-9 text-[12.5px] ${tab === t ? "font-medium" : "text-ink2 hover:text-ink"}`}>
              {t === "informe" ? "Informe y observaciones" : "Historial"}
              {tab === t && <motion.span layoutId="tabdir" className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" />}
            </button>
          ))}
        </div>
        {tab === "historial" ? (
          <div className="bg-panel border border-rule">
            <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Versión</th></tr></thead>
              <tbody>{log.filter((e) => e.track === "Aprobación Directorio" && e.ejercicio === ej.periodo).map((e) => <tr key={e.id}><td className="tnum text-ink2 whitespace-nowrap">{fechaHora(e.fecha)}</td><td>{usuario(e.usuario).nombre}</td><td>{e.accion}{e.despues && <div className="text-[11px] text-ink3">{e.despues}</div>}</td><td className="tnum">{e.version}</td></tr>)}</tbody></table></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
            <LectorInforme ej={ej} pack={pack} cliente={cliente} comentarios={ej.comentarios} onComentar={esDir && enRevision ? (n) => setNuevo({ nota: n }) : undefined}
              sello={
                <AnimatePresence>
                  {(ej.directorio.estado === "aprobado" || sello) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-24 right-10 z-10 pointer-events-none">
                      <div className="stamp border-[3px] px-6 py-2 text-center bg-white/80" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
                        <div className="text-[22px] font-bold tracking-[0.14em]">APROBADO</div>
                        <div className="text-[10px] tracking-[0.08em]">DIRECTORIO · {fechaCorta(ej.aprobadoEl ?? new Date())}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              } />
            <div className="space-y-4">
              {ej.directorio.estado === "aprobado" && ej.directorio.acta && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-panel border border-accent">
                  <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[14px]">Acta de aprobación</div>
                  {ej.directorio.acta.map((a, i) => (
                    <motion.div key={a.nivel} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.18 }} className="px-4 py-2 border-b border-rule2 text-[12px] flex items-center gap-2">
                      <Avatar id={a.nombre} size={20} />
                      <div className="flex-1"><div className="font-medium">{a.nivel}</div><div className="text-ink3 text-[11px]">{usuario(a.nombre).nombre} · {fechaHora(a.fecha)}</div></div>
                      <span className="text-[11px] text-ink2">{a.version}</span>
                    </motion.div>
                  ))}
                  <div className="px-4 py-3 text-[11.5px] text-ink2">Fecha registrada para la Nota 1: <strong className="text-ink">{fechaLarga(ej.aprobadoEl!)}</strong>. El ejercicio queda en solo lectura; solo el Administrador puede reabrirlo.</div>
                  <div className="px-4 pb-3"><button className="btn btn-p btn-sm" onClick={() => nav("/informes")}>Generar informes regulatorios <ArrowRight size={13} /></button></div>
                </motion.div>
              )}
              <div className="bg-panel border border-rule">
                <div className="px-5 h-14 flex items-center justify-between border-b border-rule">
                  <span className="font-bold text-[14px] flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: "var(--accent-3)" }} /> Observaciones del Directorio</span>
                  <span className="text-[11.5px] text-ink3">{abiertas.length} abiertas</span>
                </div>
                <HiloComentarios comentarios={obsDir} puedeResponder={esProc} />
              </div>
              {esProc && ej.directorio.estado === "devuelto" && abiertas.length > 0 && (
                <div className="bg-panel border border-rule">
                  <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[14px]">Distribuir observaciones a las notas</div>
                  {abiertas.map((c) => {
                    const nn = c.nota ? ej.notas.find((x) => x.n === c.nota) : undefined;
                    return (
                      <div key={c.id} className="px-4 py-3 border-b border-rule2 text-[12px]">
                        <div className="text-ink2 mb-2">“{c.texto}”</div>
                        <div className="flex gap-2 items-center">
                          <select className="inp !h-7 text-[12px]" value={asig[c.id] ?? c.nota ?? ""} onChange={(e) => setAsig({ ...asig, [c.id]: Number(e.target.value) })}>
                            <option value="">Selecciona la nota afectada</option>
                            {pack.notas.map((d) => <option key={d.n} value={d.n}>Nota {d.n} · {d.titulo}</option>)}
                          </select>
                          <button className="btn btn-sm btn-p" disabled={!(asig[c.id] ?? c.nota)} onClick={() => { const n = asig[c.id] ?? c.nota!; asignar(c.id, n); toast(`Observación asignada a la Nota ${n} · vuelve a En corrección`, "info"); }}>Asignar</button>
                        </div>
                        {nn && <div className="mt-2 flex items-center gap-2"><EstadoNotaTag estado={nn.estado} /><button className="text-accent text-[11.5px]" onClick={() => nav(`/notas/${nn.n}?tab=comentarios`)}>Abrir Nota {nn.n}</button></div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={Boolean(nuevo)} onClose={() => setNuevo(null)} width={520} title="Comentario del Directorio"
        footer={<><button className="btn" onClick={() => setNuevo(null)}>Cancelar</button><button className="btn btn-p" disabled={txt.trim().length < 8} onClick={() => { comentar({ nota: nuevo?.nota ?? null, instancia: "Directorio", texto: txt.trim() }); setTxt(""); setNuevo(null); toast("Comentario registrado", "info"); }}>Registrar</button></>}>
        <Label className="mb-1">Alcance</Label>
        <select className="inp mb-3" value={nuevo?.nota ?? ""} onChange={(e) => setNuevo({ nota: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Informe general</option>{pack.notas.map((d) => <option key={d.n} value={d.n}>Nota {d.n} · {d.titulo}</option>)}
        </select>
        <textarea className="inp" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Observación para la administración" />
      </Modal>

      <Modal open={confirmar} onClose={() => setConfirmar(false)} width={560} title="Aprobación final del informe financiero"
        footer={<><button className="btn" onClick={() => setConfirmar(false)}>Cancelar</button><button className="btn btn-p" onClick={() => { aprobar(); setConfirmar(false); setSello(true); toast("Informe aprobado · acta generada · ejercicio en solo lectura", "ok"); }}><Stamp size={14} /> Aprobar y generar acta</button></>}>
        <div className="text-[12.5px] text-ink2 mb-3">Se aprueba el pre-informe v{ej.preinforme?.version} de {soc?.nombre} al {fechaLarga(ej.fechaCierre)}. La fecha de hoy quedará registrada como fecha de aprobación del Directorio en la Nota 1.</div>
        <div className="overflow-x-auto"><table className="tbl">
          <thead><tr><th>Nivel</th><th>Aprobador</th><th>Versión</th></tr></thead>
          <tbody>{acta?.map((a) => <tr key={a.nivel}><td>{a.nivel}</td><td>{usuario(a.nombre).nombre}</td><td>{a.version}</td></tr>)}</tbody>
        </table></div>
      </Modal>
    </div>
  );
}
