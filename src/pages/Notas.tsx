import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Play, RefreshCw, SlidersHorizontal, Send, Download, Lock, AlertTriangle, Bot, CheckCircle2, XCircle, ArrowLeft, FileText, Sparkles, Link2 } from "lucide-react";
import { useApp } from "../engine/store";
import { Encabezado } from "../components/Shell";
import { Label, EstadoNotaTag, Avatar, Modal, usePerfiles, tiene, esperar, TextoAgente, OkKo, Semaforo, estiloNota, Barra } from "../components/ui";
import { TablaCuadro, PanelControles, Trazabilidad, HiloComentarios, Versiones, VistaIntermedia, exportarNota, parseMonto, type CeldaSel } from "../components/NotaPartes";
import type { NotaDef, NotaRun, Ejercicio, IndustriaPack, Control } from "../engine/types";
import { ESTADOS_NOTA } from "../engine/types";
import { EstadosFinancieros } from "../components/Estados";
import { Buscador, Filtros, CabeceraListado, Paginacion, normalizar } from "../components/Listado";
import { controlesOk, insumosTexto, totalNota, evaluarControles } from "../engine/generator";
import { agente } from "../engine/api";
import { miles, fechaHora } from "../engine/util";
import { usuario } from "../config/users";

const SUPERVISION = ["proceso", "aprobador", "admin", "consulta"] as const;

// ---------- Mapa de dependencias ----------

function MapaDependencias({ ej, pack }: { ej: Ejercicio; pack: IndustriaPack }) {
  const nav = useNavigate();
  const deps = pack.notas.filter((d) => d.deps?.length);
  const origenes = [...new Set(deps.flatMap((d) => d.deps!))].sort((a, b) => a - b);
  const W = 800, H = Math.max(origenes.length, deps.length) * 40 + 16;
  const yO = (i: number) => 16 + i * ((H - 32) / Math.max(1, origenes.length - 1));
  const yD = (i: number) => 16 + i * ((H - 32) / Math.max(1, deps.length - 1));
  const nodo = (n: number, x: number, y: number, key: string) => {
    const r = ej.notas.find((z) => z.n === n)!;
    const d = pack.notas.find((z) => z.n === n)!;
    const e = estiloNota(r.estado);
    return (
      <motion.button key={key} onClick={() => nav(`/notas/${n}`)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`absolute flex items-center gap-1.5 h-[22px] px-1.5 text-[11px] border bg-panel hover:border-accent ${r.desactualizada ? "flash-ko" : ""}`} style={{ left: x, top: y - 11, width: 270, borderColor: r.desactualizada ? "var(--warn)" : "var(--rule)" }}>
        <span className="w-2 h-2 shrink-0" style={{ background: e.fill, border: `1px solid ${e.border}` }} />
        <span className="tnum text-ink3">{n}</span>
        <span className="truncate">{d.titulo}</span>
      </motion.button>
    );
  };
  return (
    <div className="relative mx-auto" style={{ width: W, height: H }}>
      <svg width={W} height={H} className="absolute inset-0">
        {deps.flatMap((d, j) => d.deps!.map((o) => {
          const i = origenes.indexOf(o);
          const desact = ej.notas.find((z) => z.n === d.n)!.desactualizada;
          return <motion.path key={`${o}-${d.n}`} d={`M 270 ${yO(i)} C 400 ${yO(i)}, 400 ${yD(j)}, 530 ${yD(j)}`} fill="none" stroke={desact ? "var(--warn)" : "var(--ink-3)"} strokeWidth={desact ? 1.4 : 1} className={desact ? "flow-line" : ""} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: 0.1 * j }} />;
        }))}
      </svg>
      {origenes.map((o, i) => nodo(o, 0, yO(i), `o${o}`))}
      {deps.map((d, j) => nodo(d.n, 530, yD(j), `d${d.n}`))}
    </div>
  );
}

// ---------- Bandeja ----------

export default function Notas() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const uid = useApp((s) => s.usuarioId)!;
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const vista = params.get("vista") ?? "notas";
  const supervisa = tiene(perfiles, ...SUPERVISION);
  const [mias, setMias] = useState(!supervisa);
  const [q, setQ] = useState("");
  const [fTipos, setFTipos] = useState<string[]>([]);
  const [fEstados, setFEstados] = useState<string[]>([]);
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(20);
  const filas = ej.notas.filter((n) => {
    const d = pack.notas.find((x) => x.n === n.n)!;
    return (!mias || n.responsable === uid) && (!fTipos.length || fTipos.includes(d.tipo)) && (!fEstados.length || fEstados.includes(n.estado)) && (!q || normalizar(`${n.n} ${d.titulo}`).includes(normalizar(q)));
  });
  useEffect(() => setPagina(0), [q, fTipos, fEstados, mias]);
  const visibles = filas.slice(pagina * porPagina, (pagina + 1) * porPagina);
  const desact = ej.notas.filter((n) => n.desactualizada).length;
  const TABS = [
    { id: "notas", t: "Notas", c: filas.length },
    { id: "estados", t: "Estados financieros", c: 4 },
    { id: "mapa", t: "Mapa de dependencias", c: desact || undefined }
  ];
  return (
    <div>
      <Encabezado n="03" titulo="Generación de notas" sub={`${ej.notas.length} notas y 4 estados financieros · cuadros, controles, ajustes y trazabilidad de ${ej.periodo}`} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap border-b border-rule">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setParams({ vista: t.id })} className={`relative px-4 h-9 text-[12.5px] whitespace-nowrap ${vista === t.id ? "font-medium" : "text-ink2 hover:text-ink"}`}>
              {t.t}{t.c ? <span className={`ml-1.5 tnum ${t.id === "mapa" ? "text-warn" : "text-ink3"}`}>{t.c}</span> : null}
              {vista === t.id && <motion.span layoutId="tabbandeja" className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" />}
            </button>
          ))}
        </div>

        {vista === "estados" && <EstadosFinancieros />}

        {vista === "mapa" && (
          <div className="bg-panel border border-rule">
            <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[15px]">Mapa de dependencias entre notas</div>
            <div className="p-5 overflow-x-auto"><MapaDependencias ej={ej} pack={pack} /></div>
            <div className="px-4 py-2 border-t border-rule2 text-[11px] text-ink3">Si cambia una nota de origen, la dependiente queda desactualizada y no puede enviarse a revisión hasta actualizarla.</div>
          </div>
        )}

        {vista === "notas" && (
          <div className="bg-panel border border-rule min-w-0">
            <CabeceraListado titulo={mias ? "Mis notas" : "Notas del ejercicio"}
              extra={
                <div className="flex p-1 rounded-lg bg-head">
                  <button onClick={() => setMias(true)} className={`px-3 h-8 rounded-md text-[12.5px] font-semibold ${mias ? "bg-panel text-accent shadow-sm" : "text-ink2"}`}>Mis notas</button>
                  <button onClick={() => setMias(false)} disabled={!supervisa} title={supervisa ? "" : "Solo perfiles de supervisión y consulta"} className={`px-3 h-8 rounded-md text-[12.5px] font-semibold ${!mias ? "bg-panel text-accent shadow-sm" : "text-ink2"}`}>Todas</button>
                </div>
              }>
              <Buscador valor={q} onChange={setQ} placeholder="Buscar notas por nombre o número" />
              <Filtros grupos={[
                { titulo: "Estado", opciones: ESTADOS_NOTA, seleccion: fEstados, onChange: setFEstados },
                { titulo: "Tipo de nota", opciones: ["Automática", "Híbrida", "Texto"], seleccion: fTipos, onChange: setFTipos }
              ]} />
            </CabeceraListado>
            <div className="overflow-x-auto">
              <table className="tbl min-w-[980px]">
                <thead><tr><th className="w-8">N°</th><th>Nota</th><th>Tipo</th><th>Estado</th><th className="text-center">Cuadros</th><th className="text-center">Fuentes</th><th className="text-center">Controles</th><th>Depende de</th><th className="num">Coment.</th><th className="num">Versión</th><th>Resp.</th></tr></thead>
                <tbody>
                  {visibles.map((n, i) => {
                    const d = pack.notas.find((x) => x.n === n.n)!;
                    const fs = d.fuentes.map((f) => ej.fuentes.find((x) => x.id === f)!);
                    const ok = fs.filter((f) => f.estado === "Habilitada").length;
                    const ko = n.controles.filter((c) => c.bloqueante && c.dif !== 0).length;
                    const com = ej.comentarios.filter((c) => c.nota === n.n && c.estado === "abierto").length;
                    return (
                      <motion.tr key={n.n} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.012 }} className="cursor-pointer" onClick={() => nav(`/notas/${n.n}`)}>
                        <td className="tnum text-ink3">{n.n}</td>
                        <td className="min-w-[240px]"><div className="line-clamp-2">{d.titulo}</div>{n.desactualizada && <div className="text-[10.5px] text-warn">Insumo cambió · actualizar</div>}</td>
                        <td className="text-ink2 text-[12px] whitespace-nowrap">{d.tipo}</td>
                        <td><EstadoNotaTag estado={n.estado} /></td>
                        <td className="text-center tnum text-[12px] text-ink2">{d.cuadros.length || "—"}</td>
                        <td className="min-w-[130px]"><Barra animar={false} estado={ok === fs.length ? "Completas" : "Faltan"} detalle={`${ok}/${fs.length}`} valor={ok / fs.length} color={ok === fs.length ? "var(--ok)" : "var(--accent)"} /></td>
                        <td className="text-center">{n.generada && d.cuadros.length ? <OkKo ok={!ko} dif={undefined} /> : <span className="text-ink3">—</span>}</td>
                        <td className="tnum text-[12px] text-ink2 whitespace-nowrap">{d.deps?.map((x) => `Nota ${x}`).join(", ") ?? "—"}</td>
                        <td className="num" style={{ color: com ? "var(--warn)" : "var(--ink-3)" }}>{com || "—"}</td>
                        <td className="num text-ink2">{n.version ? `v${n.version}` : "—"}</td>
                        <td><Avatar id={n.responsable} size={20} /></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filas.length === 0 && <div className="px-6 py-8 text-center text-[13px] text-ink3">No hay notas con esos filtros.</div>}
            <Paginacion total={filas.length} pagina={pagina} porPagina={porPagina} onPagina={setPagina} onPorPagina={setPorPagina} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Generación animada ----------

function Generando({ def, onFin }: { def: NotaDef; onFin: () => void }) {
  const ej = useApp((s) => s.ej());
  const [paso, setPaso] = useState(0);
  const nCuentas = def.cuadros.reduce((a, c) => a + c.lineas.length * 3, 0) + 7;
  const pasos = [
    { t: "Mapeo de cuentas a líneas", s: `${nCuentas} cuentas de BPC C480 → ${def.cuadros.reduce((a, c) => a + c.lineas.length - 1, 0)} líneas · tabla ${ej.parametros.homologacion}` },
    { t: "Conversión a M$", s: "Pesos ÷ 1.000 con redondeo por línea" },
    def.cuadros.some((c) => c.tipo === "movimiento")
      ? { t: "Movimientos saldo inicial → saldo final", s: "Adiciones, bajas, depreciación y conversión" }
      : def.cuadros.some((c) => c.comparativo === "mismo_periodo")
        ? { t: "Trimestre por diferencia", s: `Acumulado ${ej.periodo} − acumulado del trimestre anterior` }
        : { t: "Aperturas por moneda, país y plazo", s: "Aperturas secundarias cuadradas al total" },
    { t: "Armado de comparativos", s: def.cuadros.some((c) => c.comparativo === "mismo_periodo") ? "Mismo periodo del año anterior" : "Cierre del año anterior" },
    { t: "Controles y cuadraturas", s: "Carátula, sumas y cuadraturas cruzadas" }
  ];
  useEffect(() => {
    let vivo = true;
    (async () => {
      for (let i = 1; i <= pasos.length; i++) {
        await esperar(i === 1 ? 900 : 560);
        if (!vivo) return;
        setPaso(i);
      }
      await esperar(250);
      if (vivo) onFin();
    })();
    return () => { vivo = false; };
  }, []);
  const codigos = useMemo(() => Array.from({ length: 28 }, (_, i) => `${def.caratula?.estado === "ER" ? "51" : "11"}${String(def.n).padStart(2, "0")}${String((i % 6) + 1).padStart(2, "0")}${String(1000 + ((i * 7919) % 9000)).slice(0, 4)}`), [def.n]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-panel border border-accent overflow-hidden">
      <div className="grid grid-cols-[220px_1fr]">
        <div className="relative h-[250px] overflow-hidden bg-ink text-[10.5px] tnum">
          <motion.div animate={{ y: [0, -420] }} transition={{ duration: 3.2, ease: "linear", repeat: Infinity }} className="px-4 py-2 space-y-[3px]">
            {[...codigos, ...codigos].map((c, i) => (
              <div key={i} className="flex justify-between" style={{ color: i % 5 === 0 ? "#9cc3ff" : "rgba(255,255,255,0.55)" }}>
                <span>{c}</span><span>{miles(((i * 104729) % 9_000_000) + 120_000)}</span>
              </div>
            ))}
          </motion.div>
          <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: "linear-gradient(transparent, var(--ink))" }} />
          <div className="absolute left-3 top-2 text-[10px] text-white/60">BPC C480 · {ej.periodo}</div>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4"><Play size={14} className="text-accent" /><span className="font-bold text-[15px]">Generando Nota {def.n} · v{(useApp.getState().nota(def.n)?.version ?? 0) + 1}</span></div>
          {pasos.map((p, i) => (
            <div key={p.t} className="flex items-start gap-3 py-1.5">
              <span className="w-4 mt-0.5 flex justify-center">{paso > i ? <CheckCircle2 size={14} className="text-ok" /> : paso === i ? <span className="w-[7px] h-[7px] mt-1 bg-accent live-dot" /> : <span className="w-[7px] h-[7px] mt-1 border border-rule" />}</span>
              <div className="flex-1">
                <div className={`text-[12.5px] ${paso >= i ? "" : "text-ink3"}`}>{p.t}</div>
                <div className="text-[11px] text-ink3">{p.s}</div>
                {paso === i && <div className="h-[2px] mt-1 bg-rule2 overflow-hidden"><motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: i === 0 ? 0.9 : 0.56, ease: "linear" }} /></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Ajustes manuales (capa provisoria en línea) ----------

function IndiceCuadros({ cuadros }: { cuadros: { id: string; titulo: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-ink3 mr-1">{cuadros.length} cuadros:</span>
      {cuadros.map((c, i) => (
        <button key={c.id} onClick={() => document.getElementById(`cuadro-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="h-7 px-2.5 border border-rule bg-panel text-[11.5px] hover:border-accent hover:text-accent whitespace-nowrap">
          <span className="tnum text-ink3 mr-1">{i + 1}</span>{c.titulo}
        </button>
      ))}
    </div>
  );
}

function AjustesRegistrados({ nota }: { nota: NotaRun }) {
  const conf = nota.ajustes.filter((a) => a.estado === "confirmado");
  if (!conf.length) return null;
  return (
    <div className="bg-panel border border-rule">
      <div className="px-5 h-14 flex items-center justify-between border-b border-rule">
        <span className="font-bold text-[14px] flex items-center gap-2"><span className="w-2.5 h-2.5" style={{ background: "color-mix(in srgb, var(--accent-3) 40%, white)", boxShadow: "inset 2px 0 0 var(--accent-3)" }} /> Ajustes manuales registrados</span>
        <span className="text-[11px] text-ink3">{conf.length} · registros separados de la cifra calculada</span>
      </div>
      <div className="overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Cuadro · línea</th><th className="num">Ajuste M$</th><th>Justificación</th></tr></thead>
          <tbody>{conf.map((a) => { const c = nota.cuadros.find((x) => x.id === a.cuadro); return <tr key={a.id}><td className="tnum whitespace-nowrap text-ink2">{fechaHora(a.fecha)}</td><td className="whitespace-nowrap">{usuario(a.usuario).nombre}</td><td>{c?.titulo} · {c?.lineas.find((l) => l.id === a.linea)?.label}</td><td className="num">{a.monto > 0 ? "+" : ""}{miles(a.monto)}</td><td className="text-ink2">{a.justificacion}</td></tr>; })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Envío a revisión ----------

function EnviarRevision({ open, onClose, nota, def }: { open: boolean; onClose: () => void; nota: NotaRun; def: NotaDef }) {
  const ej = useApp((s) => s.ej());
  const enviar = useApp((s) => s.enviarRevision);
  const toast = useApp((s) => s.toast);
  const [paso, setPaso] = useState(0);
  const checks = [
    { t: "Controles bloqueantes OK", ok: controlesOk(nota.controles) },
    { t: "Sin comentarios abiertos", ok: !ej.comentarios.some((c) => c.nota === nota.n && c.estado === "abierto") },
    { t: "Dependencias actualizadas", ok: !nota.desactualizada },
    { t: def.textoBase ? "Texto aceptado por el responsable" : "Sin texto que aceptar", ok: !def.textoBase || nota.textoAceptado }
  ];
  useEffect(() => {
    if (!open) return;
    setPaso(0);
    let i = 0;
    const t = setInterval(() => { i++; setPaso(i); if (i >= checks.length) clearInterval(t); }, 260);
    return () => clearInterval(t);
  }, [open]);
  const todo = checks.every((c) => c.ok);
  return (
    <Modal open={open} onClose={onClose} width={480} title={`Enviar Nota ${nota.n} a revisión`}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-p" disabled={!todo || paso < checks.length} onClick={() => { const e = enviar(nota.n); if (e) toast(e, "ko"); else toast(`Nota ${nota.n} v${nota.version} congelada y enviada · se notificó al aprobador`, "ok"); onClose(); }}><Lock size={13} /> Congelar v{nota.version} y enviar</button></>}>
      <div className="space-y-2">
        {checks.map((c, i) => (
          <div key={c.t} className="flex items-center gap-3 h-8 px-3 border border-rule">
            {paso > i ? (c.ok ? <CheckCircle2 size={15} className="text-ok" /> : <XCircle size={15} className="text-ko" />) : <span className="w-[7px] h-[7px] mx-1 bg-accent live-dot" />}
            <span className="text-[12.5px]">{c.t}</span>
          </div>
        ))}
      </div>
      <div className="text-[11.5px] text-ink3 mt-3">Al enviar, la versión queda congelada, la edición se bloquea y se notifica a {usuario("u_aprob").nombre}.</div>
    </Modal>
  );
}

// ---------- Texto con Agente ----------

const AGREGADOS: Record<number, { texto: string; doc: string }[]> = {
  29: [{ texto: "En materia civil, durante el periodo se notificó a una filial una demanda por término anticipado de un contrato de arriendo en Concepción, con una cuantía de M$ 1.870.000. Los asesores legales califican el resultado como posible, por lo que no se ha constituido provisión.", doc: "D1" }],
  38: [{ texto: "Con fecha posterior al cierre, la filial en Perú suscribió una promesa de compraventa de un terreno en Lima clasificado como activo mantenido para la venta (Nota 34), por USD 18,4 millones.", doc: "D3" }],
  37: []
};

function limpiar(t: string) {
  return t.replace(/\[\[|\]\]/g, "").replace(/\s?\{doc:[A-Z0-9]+\}/g, "");
}

function TextoNota({ nota, def, editable }: { nota: NotaRun; def: NotaDef; editable: boolean }) {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const cliente = useApp((s) => s.cliente());
  const aceptar = useApp((s) => s.aceptarTexto);
  const toast = useApp((s) => s.toast);
  const [prop, setProp] = useState("");
  const [cargando, setCargando] = useState(false);
  const [fuente, setFuente] = useState("");
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const ins = useMemo(() => insumosTexto(pack, cliente, ej, nota.n), [ej.id, nota.version, nota.n]);
  const docs = Object.fromEntries(pack.documentos.map((d) => [d.id, d.nombre]));
  const docsNota = pack.documentos.filter((d) => d.notas.includes(nota.n) || def.documentos?.includes(d.id));

  const proponer = async () => {
    setCargando(true);
    setProp("");
    setEditando(false);
    const reemplazos = Object.keys(ins.vAct).filter((k) => ins.vAnt[k] !== ins.vAct[k] && ins.textoAnterior.includes(ins.vAnt[k])).map((k) => ({ de: ins.vAnt[k], a: ins.vAct[k], doc: k === "fecha_directorio" ? "D4" : undefined }));
    let agregados = AGREGADOS[nota.n] ?? [];
    let textoAnt = ins.textoAnterior;
    if (nota.n === 38) {
      // El hecho posterior reemplaza el párrafo estándar "no han ocurrido hechos"
      agregados = [];
      const t = AGREGADOS[38][0];
      reemplazos.push({ de: textoAnt.split("\n\n")[0].replace(ins.vAnt.fecha_cierre, ins.vAct.fecha_cierre), a: t.texto, doc: t.doc } as any);
      textoAnt = textoAnt.split(ins.vAnt.fecha_cierre).join(ins.vAct.fecha_cierre);
    }
    const contexto = {
      nota: nota.n, titulo: def.titulo, periodo: ej.periodo, sociedad: cliente.sociedades.find((s) => s.id === ej.sociedad)?.nombre,
      textoAnterior: textoAnt,
      datosPeriodoAnterior: ins.vAnt, datosPeriodoActual: ins.vAct,
      cuadros: ins.cuadros.map((c) => ({ titulo: c.titulo, lineas: c.lineas.map((l) => ({ linea: l.label, actual: l.actual, comparativo: l.comp })) })),
      documentos: docsNota.map((d) => ({ id: d.id, nombre: d.nombre, contenido: d.resumen })),
      reemplazos, agregados
    };
    try {
      const r = await agente("texto", contexto, [{ role: "user", content: `Propón el texto actualizado de la Nota ${nota.n} para ${ej.periodo}.` }], setProp);
      setProp(r.texto);
      setFuente(r.fuente);
    } catch (e: any) {
      setProp(`No se pudo consultar al Agente de texto: ${e.message}`);
    }
    setCargando(false);
  };

  const final = editando ? borrador : prop;
  const montos = [...limpiar(final).matchAll(/M\$ ?([\d.]+)/g)].map((m) => Number(m[1].replace(/\./g, "")));
  const valores = new Set(ins.cuadros.flatMap((c) => c.lineas.flatMap((l) => [l.actual, l.comp])));
  const docsMonto = new Set([3940000, 1870000]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-panel border border-rule">
        <div className="px-5 h-14 flex items-center justify-between border-b border-rule"><span className="font-bold text-[14px]">Texto del periodo anterior</span><span className="text-[11px] text-ink3">Aprobado · base de redacción [D5]</span></div>
        <div className="px-4 py-3 text-[12.5px] text-ink2 whitespace-pre-wrap leading-[1.65]">{ins.textoAnterior}</div>
        <div className="px-4 py-3 border-t border-rule">
          <Label className="mb-1">Documentación vigente del periodo</Label>
          {docsNota.map((d) => <div key={d.id} className="text-[11.5px] flex gap-2 py-0.5"><span className="text-accent font-medium tnum w-6">{d.id}</span><span>{d.nombre}</span></div>)}
        </div>
      </div>
      <div className="bg-panel border border-rule flex flex-col">
        <div className="px-5 h-14 flex items-center justify-between border-b border-rule">
          <span className="font-bold text-[14px] flex items-center gap-2"><Bot size={14} className="text-accent" /> Propuesta del Agente de texto</span>
          <div className="flex gap-2">
            {prop && !cargando && editable && <button className="btn btn-sm btn-g" onClick={() => { setEditando(!editando); setBorrador(prop); }}>{editando ? "Ver marcas" : "Editar"}</button>}
            <button className="btn btn-sm btn-p" disabled={!editable || cargando} onClick={proponer}><Sparkles size={13} /> {prop ? "Volver a proponer" : "Proponer texto"}</button>
          </div>
        </div>
        <div className="px-4 py-3 text-[12.5px] flex-1 min-h-[180px]">
          {!prop && !cargando && (nota.texto ? (
            <div><div className="text-[11px] text-ink3 mb-2">{nota.textoAceptado ? "Texto vigente aceptado" : "Texto vigente sin aceptar"} · v{nota.version}</div><div className="whitespace-pre-wrap leading-[1.65]">{nota.texto}</div></div>
          ) : <div className="text-ink3">El Agente toma el texto del periodo anterior, actualiza fechas, montos y componentes variables, marca los cambios y cita la documentación usada.</div>)}
          {cargando && !prop && <div className="space-y-2"><div className="h-3 w-full shimmer" /><div className="h-3 w-4/5 shimmer" /><div className="h-3 w-2/3 shimmer" /></div>}
          {prop && (editando ? <textarea className="inp h-full min-h-[220px] text-[12.5px]" value={borrador} onChange={(e) => setBorrador(e.target.value)} /> : <TextoAgente texto={prop} docs={docs} cursor={cargando} />)}
        </div>
        {prop && !cargando && (
          <div className="px-4 py-3 border-t border-rule">
            <Label className="mb-1">Montos citados vs cuadros</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] mb-3">
              {montos.length === 0 && <span className="text-ink3">El texto no cita montos.</span>}
              {montos.map((m, i) => { const ok = valores.has(m) || docsMonto.has(m); return <span key={i} className="inline-flex items-center gap-1 tnum">{ok ? <CheckCircle2 size={12} className="text-ok" /> : <AlertTriangle size={12} className="text-warn" />}M$ {miles(m)} <span className="text-ink3">{valores.has(m) ? "coincide con cuadro" : docsMonto.has(m) ? "según documento" : "no está en los cuadros"}</span></span>; })}
            </div>
            <div className="flex items-center justify-between">
              {fuente === "respaldo" ? <span className="text-[10.5px] text-ink3">Respuesta sin conexión al modelo</span> : <span />}
              <button className="btn btn-p btn-sm" disabled={!editable} onClick={() => { aceptar(nota.n, limpiar(final)); setProp(""); setEditando(false); toast(`Texto de la Nota ${nota.n} aceptado`, "ok"); }}>Aceptar texto</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Detalle ----------

export function NotaDetalle() {
  const { n: nParam } = useParams();
  const n = Number(nParam);
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const cliente = useApp((s) => s.cliente());
  const generar = useApp((s) => s.generar);
  const toast = useApp((s) => s.toast);
  const uid = useApp((s) => s.usuarioId)!;
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const nota = ej.notas.find((x) => x.n === n);
  const def = pack.notas.find((d) => d.n === n);
  const [generando, setGenerando] = useState(false);
  const [recien, setRecien] = useState(false);
  const [traza, setTraza] = useState<CeldaSel | null>(null);
  const [modoAjuste, setModoAjuste] = useState(false);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [justif, setJustif] = useState("");
  const confirmarAjustes = useApp((s) => s.confirmarAjustes);
  const descartarAjustes = useApp((s) => s.descartarAjustes);
  const [enviar, setEnviar] = useState(false);
  const [exp, setExp] = useState(false);
  const tab = params.get("tab") ?? (def?.tipo === "Texto" ? "texto" : "cuadros");
  const setTab = (t: string) => setParams({ tab: t }, { replace: true });
  useEffect(() => { setRecien(false); setModoAjuste(false); setBorrador({}); setJustif(""); }, [n]);

  // Capa provisoria: diferencias entre lo escrito y la cifra vigente
  const items = useMemo(() => {
    if (!nota) return [];
    const out: { cuadro: string; linea: string; monto: number }[] = [];
    Object.entries(borrador).forEach(([k, t]) => {
      const [cid, lid] = k.split("|");
      const l = nota.cuadros.find((c) => c.id === cid)?.lineas.find((x) => x.id === lid);
      const v = parseMonto(t);
      if (l && v !== null && v !== l.actual) out.push({ cuadro: cid, linea: lid, monto: v - l.actual });
    });
    return out;
  }, [borrador, nota]);
  const preview = useMemo(() => {
    if (!nota) return [];
    return nota.cuadros.map((c) => {
      const lineas = c.lineas.map((l) => ({ ...l, actual: l.actual + items.filter((i) => i.cuadro === c.id && i.linea === l.id).reduce((a, i) => a + i.monto, 0) }));
      const tot = lineas.find((l) => l.kind === "total")!;
      tot.actual = lineas.filter((l) => l.kind !== "total").reduce((a, l) => a + l.actual, 0);
      return { ...c, lineas };
    });
  }, [nota, items]);
  const controlesPrev = useMemo(() => (nota && def && modoAjuste ? evaluarControles(def, { ...nota, cuadros: preview }, ej, pack) : []), [preview, modoAjuste]);

  if (!nota || !def) return <div className="p-6">Nota no encontrada.</div>;

  const salirAjuste = (descartar: boolean) => {
    if (descartar && items.length) { descartarAjustes(n, items.length); toast(`${items.length} cambio${items.length > 1 ? "s" : ""} descartado${items.length > 1 ? "s" : ""} · la nota queda como estaba`); }
    setModoAjuste(false); setBorrador({}); setJustif("");
  };
  const confirmar = () => {
    confirmarAjustes(n, items, justif.trim());
    toast(`${items.length} ajuste${items.length > 1 ? "s" : ""} confirmado${items.length > 1 ? "s" : ""} · Nota ${n} v${nota.version + 1}`, "ok");
    setModoAjuste(false); setBorrador({}); setJustif("");
  };

  const esResp = nota.responsable === uid || tiene(perfiles, "proceso", "admin");
  const editableEstado = ["Lista para generar", "Borrador", "En corrección"].includes(nota.estado);
  const editable = esResp && tiene(perfiles, "nota", "proceso", "admin") && editableEstado && !ej.historico;
  const faltan = def.fuentes.filter((f) => pack.fuentes.find((x) => x.id === f)?.obligatoriedad === "Obligatoria" && ej.fuentes.find((x) => x.id === f)?.estado !== "Habilitada");
  const nuevas = ej.homologacionPendiente.filter((h) => h.nota === n && !h.asignada);
  const asignadasPendientes = ej.homologacionPendiente.filter((h) => h.nota === n && h.asignada && nota.desactualizada);
  const coment = ej.comentarios.filter((c) => c.nota === n);
  const abiertos = coment.filter((c) => c.estado === "abierto").length;
  const cambiadas = (def.deps ?? []).filter((d) => nota.desactualizada);
  const motivoNoGenerar = faltan.length ? `Faltan fuentes obligatorias: ${faltan.map((f) => pack.fuentes.find((x) => x.id === f)!.nombre).join(", ")}` : nuevas.length ? `Hay ${nuevas.length} cuenta nueva sin asignar en homologación` : "";
  const razon = cliente.sociedades.find((s) => s.id === ej.sociedad)?.nombre ?? cliente.nombre;

  const lanzarGen = () => {
    if (motivoNoGenerar) return toast(motivoNoGenerar, "ko");
    setTab(def.cuadros.length ? "cuadros" : "texto");
    setGenerando(true);
  };
  const finGen = () => {
    const antes = totalNota(nota.cuadros);
    generar(n);
    setGenerando(false);
    setRecien(true);
    const nn = useApp.getState().nota(n)!;
    const ko = nn.controles.filter((c) => c.bloqueante && c.dif !== 0).length;
    toast(nota.generada ? `Nota ${n} regenerada · v${nn.version}${antes !== totalNota(nn.cuadros) ? ` · total M$ ${miles(totalNota(nn.cuadros))}` : ""}` : `Nota ${n} generada · v${nn.version}`, ko ? "ko" : "ok");
  };

  const TABS = [
    ...(def.cuadros.length ? [{ id: "cuadros", t: "Cuadros" }, { id: "controles", t: "Controles", c: nota.controles.filter((c) => c.bloqueante && c.dif !== 0).length || undefined }] : []),
    ...(def.textoBase ? [{ id: "texto", t: "Texto" }] : []),
    ...(def.vistas?.length ? [{ id: "vistas", t: "Vistas intermedias" }] : []),
    ...(def.cuadros.length ? [{ id: "trazabilidad", t: "Trazabilidad" }] : []),
    { id: "versiones", t: "Versiones", c: nota.versiones.length || undefined },
    { id: "comentarios", t: "Observaciones", c: abiertos || undefined }
  ];

  return (
    <div>
      <div className="px-6 pt-5 pb-2">
        <button className="text-[11.5px] text-ink3 hover:text-ink flex items-center gap-1 mb-1" onClick={() => nav("/notas")}><ArrowLeft size={12} /> Generación de notas</button>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold tracking-[-0.01em]">Nota {n} · {def.titulo}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[12px] text-ink2">
              <EstadoNotaTag estado={nota.estado} />
              <span>{def.tipo}</span>
              <span className="tnum">{nota.version ? `v${nota.version}` : "Sin versiones"}{nota.versionAprobada ? ` · aprobada v${nota.versionAprobada}` : ""}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap"><Avatar id={nota.responsable} size={18} />{usuario(nota.responsable).nombre}</span>
              {def.caratula && <span className="text-ink3">Carátula {def.caratula.estado}: {def.caratula.linea}</span>}
              {!editableEstado && nota.generada && <span className="flex items-center gap-1 text-ink3"><Lock size={12} /> Versión congelada</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(nota.estado === "Lista para generar" || (nota.generada && editableEstado)) && def.cuadros.length > 0 && (
              <button className={`btn ${nota.estado === "Lista para generar" || nota.desactualizada ? "btn-p" : ""}`} disabled={!editable || generando} title={motivoNoGenerar} onClick={lanzarGen}>
                {nota.generada ? <RefreshCw size={14} /> : <Play size={14} />}{nota.generada ? (nota.desactualizada ? "Actualizar" : "Regenerar") : "Generar"}
              </button>
            )}
            {def.cuadros.length > 0 && <button className={`btn ${modoAjuste ? "btn-d" : ""}`} disabled={!editable || !nota.generada || generando} onClick={() => { if (modoAjuste) salirAjuste(true); else { setModoAjuste(true); setTab("cuadros"); } }}><SlidersHorizontal size={14} /> {modoAjuste ? "Salir de ajustes" : "Ajustes manuales"}</button>}
            <div className="relative">
              <button className="btn" disabled={!nota.generada} onClick={() => setExp(!exp)}><Download size={14} /> Exportar</button>
              <AnimatePresence>
                {exp && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-9 z-20 bg-panel border border-rule w-[190px]">
                    {(["xlsx", "doc"] as const).map((f) => <button key={f} className="w-full text-left px-3 h-9 text-[12px] hover:bg-paper" onClick={() => { exportarNota(f, nota, def, ej, razon); useApp.getState().registrar({ track: "Generación de notas", objeto: `Nota ${n}`, accion: `Exportación ${f === "xlsx" ? "Excel" : "Word"}`, version: `v${nota.version}` }); setExp(false); }}>{f === "xlsx" ? "Excel (.xlsx)" : "Word (.doc)"} · v{nota.version}</button>)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button className="btn btn-d" disabled={!editable || !nota.generada} onClick={() => setEnviar(true)}><Send size={14} /> Lista para revisión</button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Alertas */}
        {faltan.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-panel border border-rule">
            <span className="w-2 h-2 hatch border border-ink3" />
            <span className="text-[12.5px] flex-1 min-w-[260px]">Pendiente de fuentes: {faltan.map((f) => pack.fuentes.find((x) => x.id === f)!.nombre).join(" · ")}</span>
            <button className="btn btn-sm" onClick={() => nav(`/carga?f=${faltan[0]}`)}>Ir a la carga</button>
          </div>
        )}
        {nuevas.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-panel border" style={{ borderColor: "var(--ko)" }}>
            <AlertTriangle size={15} className="text-ko" />
            <span className="text-[12.5px] flex-1 min-w-[260px]">La cuenta {nuevas[0].cuenta} ({nuevas[0].nombre}) tiene saldo M$ {miles(nuevas[0].monto)} y no está asignada a ninguna línea. No se puede regenerar hasta homologarla.</span>
            <button className="btn btn-sm" onClick={() => setTraza({ cuadro: nota.cuadros[0]?.id, linea: "total", col: "actual" })}>Ver trazabilidad</button>
            <button className="btn btn-sm btn-p" onClick={() => nav("/carga?tab=homologacion")}>Homologar</button>
          </motion.div>
        )}
        {nota.desactualizada && nota.generada && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-panel border" style={{ borderColor: "var(--warn)" }}>
            <RefreshCw size={14} className="text-warn" />
            <span className="text-[12.5px] flex-1 min-w-[260px]">
              {asignadasPendientes.length ? `La cuenta ${asignadasPendientes[0].cuenta} ya fue asignada. Regenera la nota para incorporarla.` : def.deps?.length ? `Cambió una nota de la que depende (Nota ${def.deps.join(", ")}). Actualízala antes de enviarla a revisión.` : "Cambió una fuente o parámetro que usa esta nota. Actualízala antes de enviarla a revisión."}
            </span>
            <button className="btn btn-sm btn-p" disabled={!editable} onClick={lanzarGen}>Actualizar</button>
          </motion.div>
        )}
        {abiertos > 0 && tab !== "comentarios" && (
          <button onClick={() => setTab("comentarios")} className="w-full flex flex-wrap items-center gap-3 px-4 py-2.5 bg-panel border text-left" style={{ borderColor: "var(--warn)" }}>
            <span className="text-[12.5px] flex-1 min-w-[260px]">{abiertos} observación{abiertos > 1 ? "es" : ""} abierta{abiertos > 1 ? "s" : ""} de revisión. La nota no puede reenviarse hasta resolverlas.</span>
            <span className="text-[12px] text-accent font-medium">Ver observaciones</span>
          </button>
        )}

        <div className="flex flex-wrap border-b border-rule">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative px-4 h-9 text-[12.5px] whitespace-nowrap ${tab === t.id ? "font-medium" : "text-ink2 hover:text-ink"}`}>
              {t.t}{t.c ? <span className={`ml-1.5 tnum ${t.id === "controles" ? "text-ko" : "text-ink3"}`}>{t.c}</span> : null}
              {tab === t.id && <motion.span layoutId="tabnota" className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {generando ? (
            <Generando key="gen" def={def} onFin={finGen} />
          ) : (
            <motion.div key={tab + nota.version} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
              {tab === "cuadros" && (nota.generada ? (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                  <div className="space-y-4 min-w-0">
                    {nota.cuadros.length > 1 && <IndiceCuadros cuadros={nota.cuadros} />}
                    {modoAjuste && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-2.5 border border-dashed text-[12px]" style={{ borderColor: "var(--accent-3)", background: "color-mix(in srgb, var(--accent-3) 8%, white)" }}>
                        <strong>Modo ajuste.</strong> Escribe el nuevo valor en cualquier monto del periodo. Los cambios quedan en una capa provisoria, se recalculan totales y controles, y solo se publican al confirmar con justificación.
                      </motion.div>
                    )}
                    {(modoAjuste ? preview : nota.cuadros).map((c, i) => (
                      <TablaCuadro key={c.id} idAncla={`cuadro-${c.id}`} c={c} ej={ej} nota={nota} onCifra={modoAjuste ? undefined : (sel) => setTraza(sel)} comentarios={coment} flash={recien}
                        edicion={modoAjuste ? { valores: borrador, original: nota.cuadros[i], onCambiar: (k, t) => setBorrador((b) => ({ ...b, [k]: t })) } : undefined} />
                    ))}
                    {!modoAjuste && <div className="text-[11px] text-ink3">Selecciona cualquier cifra para ver su trazabilidad. La flecha abre las cuentas que componen cada línea. Las celdas en naranjo tienen ajustes manuales.</div>}
                    {!modoAjuste && <AjustesRegistrados nota={nota} />}
                  </div>
                  <ResumenControles controles={modoAjuste ? controlesPrev : nota.controles} provisoria={modoAjuste && items.length > 0} onVer={() => setTab("controles")} onTrazar={() => setTraza({ cuadro: nota.cuadros[0].id, linea: "total", col: "actual" })} />
                </div>
              ) : (
                <SinGenerar nota={nota} motivo={motivoNoGenerar} onGenerar={lanzarGen} editable={editable} />
              ))}
              {tab === "controles" && (nota.generada ? <PanelControles controles={nota.controles} onTrazar={() => setTraza({ cuadro: nota.cuadros[0].id, linea: "total", col: "actual" })} /> : <SinGenerar nota={nota} motivo={motivoNoGenerar} onGenerar={lanzarGen} editable={editable} />)}
              {tab === "texto" && ((faltan.length && !nota.texto) || (def.cuadros.length > 0 && !nota.generada) ? <SinGenerar nota={nota} motivo={motivoNoGenerar || (def.cuadros.length ? "Genera primero los cuadros: el texto usa sus montos." : "")} onGenerar={lanzarGen} editable={editable} /> : <TextoNota nota={nota} def={def} editable={editable} />)}
              {tab === "vistas" && <VistaIntermedia nota={nota} def={def} ej={ej} />}
              {tab === "trazabilidad" && <OrigenLineas nota={nota} onTrazar={setTraza} />}
              {tab === "versiones" && <Versiones nota={nota} />}
              {tab === "comentarios" && <div className="bg-panel border border-rule"><HiloComentarios comentarios={coment} nota={nota} def={def} puedeResponder={esResp && !ej.historico} /></div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {modoAjuste && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="sticky bottom-0 z-20 bg-panel border-t-2 px-6 py-3 flex flex-wrap items-center gap-3" style={{ borderTopColor: "var(--accent-3)" }}>
            <div className="text-[12.5px] min-w-[180px]">
              <div className="font-medium">{items.length ? `${items.length} monto${items.length > 1 ? "s" : ""} modificado${items.length > 1 ? "s" : ""}` : "Sin cambios todavía"}</div>
              {items.length > 0 && <div className="text-[11px] text-ink3 tnum">Efecto neto M$ {miles(items.reduce((a, i) => a + i.monto, 0))} · {controlesPrev.filter((c) => c.bloqueante && c.dif !== 0).length ? <span className="text-ko">controles con diferencia</span> : <span className="text-ok">controles OK</span>}</div>}
            </div>
            <input className="inp flex-1 min-w-[240px]" placeholder="Justificación del ajuste (obligatoria, mínimo 10 caracteres)" value={justif} onChange={(e) => setJustif(e.target.value)} />
            <button className="btn" onClick={() => salirAjuste(true)}>Descartar</button>
            <button className="btn btn-p" disabled={!items.length || justif.trim().length < 10} onClick={confirmar}>Confirmar y publicar v{nota.version + 1}</button>
          </motion.div>
        )}
      </AnimatePresence>
      <Trazabilidad sel={traza} nota={nota} def={def} onClose={() => setTraza(null)} />
      <EnviarRevision open={enviar} onClose={() => setEnviar(false)} nota={nota} def={def} />
    </div>
  );
}

function SinGenerar({ nota, motivo, onGenerar, editable }: { nota: NotaRun; motivo: string; onGenerar: () => void; editable: boolean }) {
  return (
    <div className="bg-panel border border-rule px-6 py-10 text-center">
      <FileText size={22} className="mx-auto text-ink3 mb-2" />
      <div className="text-[13px] font-medium">{nota.estado === "Pendiente de fuentes" ? "La nota no se puede generar todavía" : "La nota está lista para generar"}</div>
      <div className="text-[12px] text-ink2 mt-1 max-w-[520px] mx-auto">{motivo || "Ejecuta la parametrización: mapeo de cuentas, conversión a M$, trimestre por diferencia, comparativos y controles."}</div>
      {!motivo && <button className="btn btn-p mt-4" disabled={!editable} onClick={onGenerar}><Play size={14} /> Generar</button>}
    </div>
  );
}

function ResumenControles({ controles, provisoria, onVer, onTrazar }: { controles: Control[]; provisoria?: boolean; onVer: () => void; onTrazar: () => void }) {
  const ko = controles.filter((c) => c.bloqueante && c.dif !== 0);
  return (
    <div className="bg-panel border border-rule xl:sticky xl:top-4">
      <div className="px-5 h-14 flex items-center justify-between border-b border-rule">
        <span className="font-bold text-[14px]">Controles{provisoria && <span className="ml-2 text-[10.5px] font-normal" style={{ color: "#9a5a00" }}>con capa provisoria</span>}</span>
        <button className="text-[11.5px] text-accent" onClick={onVer}>Detalle</button>
      </div>
      {controles.map((c, i) => (
        <motion.div key={c.id} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: provisoria ? 0 : 0.15 + i * 0.08 }} className="px-4 py-2 border-b border-rule2 flex items-start gap-2 text-[11.5px]">
          {c.dif === 0 ? <CheckCircle2 size={13} className="text-ok mt-0.5 shrink-0" /> : c.bloqueante ? <XCircle size={13} className="text-ko mt-0.5 shrink-0" /> : <AlertTriangle size={13} className="text-warn mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0"><div className="leading-snug">{c.nombre}</div>{c.dif !== 0 && <div className={`tnum ${c.bloqueante ? "text-ko" : "text-warn"}`}>Diferencia M$ {miles(c.dif)}</div>}</div>
        </motion.div>
      ))}
      {ko.length > 0 && !provisoria && <div className="px-4 py-3"><button className="btn btn-sm btn-p w-full justify-center" onClick={onTrazar}><Bot size={13} /> Preguntar al Agente de trazabilidad</button></div>}
    </div>
  );
}

function OrigenLineas({ nota, onTrazar }: { nota: NotaRun; onTrazar: (s: CeldaSel) => void }) {
  if (!nota.generada) return <div className="text-[12px] text-ink3">Genera la nota para ver la trazabilidad.</div>;
  return (
    <div className="bg-panel border border-rule">
      <div className="px-5 h-14 flex items-center border-b border-rule font-bold text-[14px]">Origen de cada línea publicada</div>
      <div className="overflow-x-auto"><table className="tbl">
        <thead><tr><th>Cuadro</th><th>Línea</th><th>Origen</th><th className="num">Cuentas</th><th className="num">Ajustes</th><th className="num">M$</th><th /></tr></thead>
        <tbody>
          {nota.cuadros.flatMap((c) => c.lineas.filter((l) => l.kind !== "total").map((l) => (
            <tr key={c.id + l.id}>
              <td className="text-ink2">{c.titulo}</td>
              <td>{l.label}</td>
              <td className="text-[12px]"><span className="inline-flex items-center gap-1"><Link2 size={12} className="text-ok" />{l.origenDetalle}</span></td>
              <td className="num">{l.cuentas.length}</td>
              <td className="num">{l.ajuste ? <span style={{ color: "var(--accent-3)" }}>{miles(l.ajuste)}</span> : "—"}</td>
              <td className="num">{miles(l.actual)}</td>
              <td className="text-right"><button className="btn btn-sm btn-g text-accent" onClick={() => onTrazar({ cuadro: c.id, linea: l.id, col: "actual" })}>Trazar</button></td>
            </tr>
          )))}
        </tbody>
      </table></div>
      <div className="px-4 py-2 text-[11px] text-ink3 border-t border-rule2">Todas las cifras publicadas tienen origen identificable. Los ajustes manuales se muestran como registros separados.</div>
    </div>
  );
}

export { Semaforo };
