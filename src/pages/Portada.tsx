import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Plus, SlidersHorizontal, ChevronRight, Download, AlertTriangle, Lock } from "lucide-react";
import { useApp } from "../engine/store";
import { Encabezado } from "../components/Shell";
import { FlujoNotas } from "../components/Flujo";
import { Buscador, Filtros, CabeceraListado, normalizar } from "../components/Listado";
import { Label, Num, EstadoNotaTag, Semaforo, Modal, Avatar, usePerfiles, tiene, OkKo } from "../components/ui";
import { porEstado, proximoHito, pendientesCarga, aprobacionesPendientes, misPendientes, TRACKS } from "../engine/derivados";
import { ESTADOS_EJERCICIO, ESTADOS_NOTA, type EstadoNota, type TipoNota } from "../engine/types";
import { historicos } from "../engine/generator";
import { periodoEnCurso, fechaCorta, hoy, habilesEntre, fechaLarga, finTrimestre } from "../engine/util";
import { usuario, USUARIOS } from "../config/users";

/** Estado del ejercicio como tag, con el detalle del recorrido al pasar el cursor. */
function EstadoEEFF() {
  const ej = useApp((s) => s.ej());
  const idx = ESTADOS_EJERCICIO.indexOf(ej.estado);
  const sig = ESTADOS_EJERCICIO[idx + 1];
  return (
    <span className="group relative inline-flex items-center gap-2 align-middle">
      <span className="inline-flex items-center gap-1.5 h-[28px] px-3 rounded-md text-[12.5px] font-semibold text-white whitespace-nowrap" style={{ background: ej.estado === "Cerrado" ? "var(--ink-2)" : "var(--accent)" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        {ej.estado}
      </span>
      <span className="text-[11.5px] text-ink3 whitespace-nowrap tnum">Etapa {idx + 1} de {ESTADOS_EJERCICIO.length}{sig ? ` · sigue ${sig}` : ""}</span>
      <span className="pointer-events-none absolute left-0 top-9 z-30 hidden group-hover:block bg-panel rounded-xl shadow-[0_12px_32px_rgba(20,28,45,0.18)] px-4 py-3 w-[270px]">
        {ESTADOS_EJERCICIO.map((e, i) => (
          <span key={e} className="flex items-center gap-2 text-[11.5px] py-[2px]" style={{ color: i === idx ? "var(--accent)" : i < idx ? "var(--ink-2)" : "var(--ink-3)", fontWeight: i === idx ? 600 : 400 }}>
            <span className="w-[7px] h-[7px] border" style={{ background: i <= idx ? "var(--accent)" : "transparent", borderColor: i <= idx ? "var(--accent)" : "var(--ink-3)" }} />
            {e}
          </span>
        ))}
      </span>
    </span>
  );
}

function Calendario() {
  const ej = useApp((s) => s.ej());
  const h = hoy();
  const sig = ej.hitos.findIndex((x) => new Date(x.fecha) >= h);
  const ini = new Date(ej.fechaCierre);
  const fin = new Date(ej.hitos[ej.hitos.length - 1].fecha);
  const avance = Math.max(0, Math.min(1, habilesEntre(ini, h) / Math.max(1, habilesEntre(ini, fin))));
  return (
    <div className="px-4 py-4">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <Label>Calendario de hitos</Label>
        <span className="text-[11px] text-ink3 whitespace-nowrap">Cierre {fechaCorta(ej.fechaCierre)}</span>
      </div>
      <div className="text-[11px] text-ink3 mb-3">Días hábiles desde el cierre</div>
      <div className="h-[3px] bg-rule2 mb-3">
        <motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${avance * 100}%` }} transition={{ duration: 1, delay: 0.3 }} />
      </div>
      <ol className="relative">
        <span className="absolute left-[5px] top-2 bottom-2 w-px bg-rule" />
        {ej.hitos.map((x, i) => {
          const pasado = sig === -1 || i < sig;
          const actual = i === sig;
          return (
            <li key={x.id} className="relative flex items-start gap-3 py-1.5">
              <span className="relative z-[1] mt-[3px] w-[11px] h-[11px] shrink-0 border" style={{ background: pasado ? "var(--accent)" : "var(--panel)", borderColor: actual ? "var(--accent-3)" : "var(--accent)" }}>
                {actual && <span className="absolute inset-[2px] live-dot" style={{ background: "var(--accent-3)" }} />}
              </span>
              <span className="w-10 shrink-0 text-[11.5px] font-semibold tnum">D+{x.dh}</span>
              <span className={`flex-1 min-w-0 text-[12px] leading-snug ${pasado ? "text-ink3" : "text-ink"}`}>{x.nombre}</span>
              <span className="text-[11px] tnum text-ink3 whitespace-nowrap">{fechaCorta(x.fecha)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Tablero() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const nav = useNavigate();
  const [fEstados, setFEstados] = useState<string[]>([]);
  const [fTipos, setFTipos] = useState<string[]>([]);
  const [fResps, setFResps] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const pe = porEstado(ej);
  const filas = ej.notas.filter((n) => {
    const d = pack.notas.find((x) => x.n === n.n)!;
    return (!fEstados.length || fEstados.includes(n.estado)) && (!fTipos.length || fTipos.includes(d.tipo)) && (!fResps.length || fResps.includes(usuario(n.responsable).nombre)) && (!q || normalizar(`${n.n} ${d.titulo}`).includes(normalizar(q)));
  });
  const responsables = [...new Set(ej.notas.map((n) => usuario(n.responsable).nombre))];
  const fEstado = fEstados.length === 1 ? fEstados[0] : "";
  return (
    <div className="bg-panel border border-rule">
      <CabeceraListado titulo="Estado de las notas">
        <Buscador valor={q} onChange={setQ} placeholder="Buscar notas por nombre o número" />
        <Filtros grupos={[
          { titulo: "Estado", opciones: ESTADOS_NOTA, seleccion: fEstados, onChange: setFEstados },
          { titulo: "Tipo de nota", opciones: ["Automática", "Híbrida", "Texto"], seleccion: fTipos, onChange: setFTipos },
          { titulo: "Responsable", opciones: responsables, seleccion: fResps, onChange: setFResps }
        ]} />
      </CabeceraListado>
      <div className="flex border-b border-rule text-[11.5px]">
        {ESTADOS_NOTA.map((e) => (
          <button key={e} onClick={() => setFEstados(fEstado === e ? [] : [e])} className={`flex-1 px-3 py-2 text-left border-r border-rule2 last:border-r-0 ${fEstado === e ? "bg-accentSoft" : "hover:bg-paper"}`}>
            <div className="text-ink3 truncate">{e}</div>
            <div className="text-[17px] font-semibold tnum text-ink">{pe[e]}</div>
          </button>
        ))}
        <div className="px-3 py-2 text-right bg-paper">
          <div className="text-ink3">Total</div>
          <div className="text-[17px] font-semibold tnum">{Object.values(pe).reduce((a, b) => a + b, 0)}</div>
        </div>
      </div>
      <div className="max-h-[440px] overflow-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-10">N°</th><th>Nota</th><th>Tipo</th><th>Estado</th><th>Responsable</th><th className="text-center">Controles</th><th>En estado</th><th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {filas.map((n) => {
              const d = pack.notas.find((x) => x.n === n.n)!;
              const ko = n.controles.filter((c) => c.bloqueante && c.dif !== 0).length;
              const sla = n.estado === "Lista para revisión" ? 2 : 3;
              return (
                <tr key={n.n} className="cursor-pointer" onClick={() => nav(n.estado === "Lista para revisión" ? `/preaprobacion/${n.n}` : `/notas/${n.n}`)}>
                  <td className="tnum text-ink3">{n.n}</td>
                  <td className="max-w-[300px]">
                    <div className="truncate">{d.titulo}</div>
                    {n.desactualizada && <div className="text-[10.5px] text-warn">Insumo cambió · requiere actualizar</div>}
                  </td>
                  <td className="text-ink2 text-[12px]">{d.tipo}</td>
                  <td><EstadoNotaTag estado={n.estado} /></td>
                  <td className="text-[12px]"><span className="inline-flex items-center gap-1.5"><Avatar id={n.responsable} size={18} />{usuario(n.responsable).nombre.split(" ")[0]}</span></td>
                  <td className="text-center">{n.generada && n.controles.length ? <OkKo ok={ko === 0} dif={undefined} /> : <span className="text-ink3">—</span>}</td>
                  <td>{n.estado === "Aprobada" ? <span className="text-ink3 text-[12px]">—</span> : <Semaforo dias={n.diasEnEstado} sla={sla} />}</td>
                  <td><ChevronRight size={14} className="text-ink3" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pendientes() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const uid = useApp((s) => s.usuarioId)!;
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const items = misPendientes(ej, pack, uid, perfiles);
  return (
    <div className="bg-panel border border-rule">
      <div className="flex items-center justify-between px-5 h-14 border-b border-rule">
        <div className="font-bold text-[15px]">Mis pendientes</div>
        <span className="text-[12px] tnum text-ink2">{items.length}</span>
      </div>
      <div className="max-h-[300px] overflow-auto divide-y divide-rule2">
        {items.length === 0 && <div className="px-4 py-6 text-[12.5px] text-ink3">No tienes tareas pendientes en este ejercicio.</div>}
        {items.map((p, i) => (
          <motion.button key={p.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} onClick={() => nav(p.ruta)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-paper">
            <span className="text-[10.5px] tnum text-ink3 w-5">{p.track}</span>
            <span className="text-[11px] font-medium w-[86px] shrink-0" style={{ color: p.tipo === "Control KO" ? "var(--ko)" : "var(--accent)" }}>{p.tipo}</span>
            <span className="flex-1 text-[12.5px] truncate">{p.texto}</span>
            <ChevronRight size={13} className="text-ink3" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Historicos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pack = useApp((s) => s.pack());
  const cliente = useApp((s) => s.cliente());
  const sel = useApp((s) => s.seleccionarEjercicio);
  const nav = useNavigate();
  const lista = useMemo(() => historicos(pack, cliente, periodoEnCurso()), [pack.id, cliente.id]);
  const [anio, setAnio] = useState("");
  const [tri, setTri] = useState("");
  const [soc, setSoc] = useState("");
  const filas = lista.filter((e) => (!anio || String(e.anio) === anio) && (!tri || String(e.trimestre) === tri) && (!soc || e.sociedad === soc));
  return (
    <Modal open={open} onClose={onClose} title="Ejercicios históricos" width={860}>
      <div className="flex gap-2 mb-3">
        <select className="inp !w-32" value={anio} onChange={(e) => setAnio(e.target.value)}>
          <option value="">Año</option>
          {[...new Set(lista.map((e) => e.anio))].map((a) => <option key={a}>{a}</option>)}
        </select>
        <select className="inp !w-32" value={tri} onChange={(e) => setTri(e.target.value)}>
          <option value="">Trimestre</option>
          {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{t}T</option>)}
        </select>
        <select className="inp !w-60" value={soc} onChange={(e) => setSoc(e.target.value)}>
          <option value="">Todas las sociedades</option>
          {cliente.sociedades.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select className="inp !w-40" disabled><option>Estado: Cerrado</option></select>
      </div>
      <div className="border border-rule max-h-[52vh] overflow-auto">
        <table className="tbl">
          <thead><tr><th>Periodo</th><th>Sociedad</th><th>Estado</th><th>Aprobación Directorio</th><th>Responsable</th><th>Informes emitidos</th><th /></tr></thead>
          <tbody>
            {filas.map((e) => (
              <tr key={e.id}>
                <td className="font-medium tnum">{e.periodo}</td>
                <td>{cliente.sociedades.find((s) => s.id === e.sociedad)?.nombre}</td>
                <td className="text-ink2 text-[12px]"><Lock size={11} className="inline mr-1 -mt-0.5" />{e.estado}</td>
                <td className="tnum text-[12px]">{fechaCorta(e.aprobadoEl!)}</td>
                <td className="text-[12px]">{usuario(e.responsable).nombre}</td>
                <td className="text-[12px] text-ink2">{e.informes.length} · {e.informes.map((i) => i.id.toUpperCase()).join(", ")}</td>
                <td className="text-right"><button className="btn btn-sm" onClick={() => { sel(e.id); onClose(); nav("/notas"); }}>Abrir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] text-ink3 mt-2">Los ejercicios cerrados se abren en modo lectura, con las versiones aprobadas y los informes tal como fueron emitidos.</p>
    </Modal>
  );
}

function NuevoEjercicio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cliente = useApp((s) => s.cliente());
  const nuevo = useApp((s) => s.nuevoEjercicio);
  const toast = useApp((s) => s.toast);
  const nav = useNavigate();
  const p = periodoEnCurso();
  const [paso, setPaso] = useState(0);
  const [anio, setAnio] = useState(p.anio);
  const [tri, setTri] = useState<1 | 2 | 3 | 4>(p.trimestre);
  const [socs, setSocs] = useState<string[]>([cliente.sociedades[cliente.sociedades.length - 1].id]);
  const [copiar, setCopiar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fc = finTrimestre(anio, tri);
  const pasos = ["Periodo y sociedades", "Fecha de cierre e hitos", "Comparativos", "Parametrización"];
  useEffect(() => { if (open) { setPaso(0); setError(null); } }, [open]);
  const crear = () => {
    for (const s of socs) {
      const err = nuevo({ anio, trimestre: tri, sociedad: s, copiar });
      if (err) { setError(`${cliente.sociedades.find((x) => x.id === s)?.nombre}: ${err}`); return; }
    }
    toast(`Ejercicio ${tri}T ${anio} creado`, "ok");
    onClose();
    nav("/carga");
  };
  const hitos = [4, 8, 12, 16, 20, 23];
  return (
    <Modal open={open} onClose={onClose} title="Nuevo ejercicio financiero" width={700}
      footer={<>
        {paso > 0 && <button className="btn" onClick={() => setPaso(paso - 1)}>Anterior</button>}
        {paso < 3 ? <button className="btn btn-p" disabled={!socs.length} onClick={() => setPaso(paso + 1)}>Siguiente</button> : <button className="btn btn-p" onClick={crear}>Crear ejercicio</button>}
      </>}>
      <div className="flex mb-5 border border-rule">
        {pasos.map((x, i) => (
          <div key={x} className={`flex-1 px-3 py-2 text-[11.5px] ${i ? "border-l border-rule" : ""}`} style={{ background: i === paso ? "var(--accent-soft)" : undefined, color: i <= paso ? "var(--ink)" : "var(--ink-3)" }}>
            <span className="tnum mr-1">{i + 1}.</span>{x}
          </div>
        ))}
      </div>
      <motion.div key={paso} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }} className="min-h-[190px]">
        {paso === 0 && (
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="mb-1.5">Año</Label>
              <select className="inp" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>{[p.anio - 1, p.anio, p.anio + 1].map((a) => <option key={a}>{a}</option>)}</select>
              <Label className="mb-1.5 mt-4">Trimestre</Label>
              <div className="flex gap-1">{[1, 2, 3, 4].map((t) => <button key={t} className={`btn flex-1 justify-center ${tri === t ? "btn-p" : ""}`} onClick={() => setTri(t as 1)}>{t}T{t === 4 ? " · anual" : ""}</button>)}</div>
            </div>
            <div>
              <Label className="mb-1.5">Sociedades</Label>
              {cliente.sociedades.map((s) => (
                <label key={s.id} className="flex items-center gap-2 h-9 px-3 border border-rule mb-1 cursor-pointer">
                  <input type="checkbox" checked={socs.includes(s.id)} onChange={(e) => setSocs(e.target.checked ? [...socs, s.id] : socs.filter((x) => x !== s.id))} />
                  <span className="flex-1">{s.nombre}</span><span className="text-[11px] text-ink3 tnum">{s.rut}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {paso === 1 && (
          <div>
            <div className="flex items-baseline gap-3 mb-3"><Label>Fecha de cierre</Label><span className="font-medium">{fechaLarga(fc)}</span></div>
            <div className="overflow-x-auto"><table className="tbl border border-rule">
              <thead><tr><th>Hito</th><th>Día hábil</th><th>Fecha</th></tr></thead>
              <tbody>
                {["Cargas completas", "Notas generadas y cuadradas", "Pre-aprobación de notas", "Revisión auditoría externa", "Sesión de Directorio", "Envío CMF y XBRL"].map((h, i) => {
                  const d = new Date(fc); let k = 0; while (k < hitos[i]) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) k++; }
                  return <tr key={h}><td>{h}</td><td className="tnum">D+{hitos[i]}</td><td className="tnum">{fechaCorta(d)}</td></tr>;
                })}
              </tbody>
            </table></div>
          </div>
        )}
        {paso === 2 && (
          <div className="space-y-2">
            <p className="text-[12.5px] text-ink2 mb-3">La plataforma trae los comparativos desde los ejercicios históricos aprobados.</p>
            {[["Cierre del año anterior", `4T ${anio - 1}`, "Estado de situación y notas de saldos"], ["Mismo periodo del año anterior", `${tri}T ${anio - 1}`, "Estado de resultados y notas de resultado"]].map(([a, b, c]) => (
              <div key={a} className="flex items-center gap-4 border border-rule px-4 py-3">
                <span className="w-2 h-2 bg-ok" />
                <div className="flex-1"><div className="font-medium">{a}</div><div className="text-[11.5px] text-ink3">{c}</div></div>
                <span className="tnum font-medium">{b}</span><span className="text-[11.5px] text-ok">Aprobado · disponible</span>
              </div>
            ))}
          </div>
        )}
        {paso === 3 && (
          <div>
            <label className="flex items-start gap-3 border border-rule px-4 py-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={copiar} onChange={(e) => setCopiar(e.target.checked)} />
              <span><span className="font-medium block">Copiar la parametrización del ejercicio anterior</span><span className="text-[12px] text-ink2">Responsables por nota, maestros y tabla de homologación vigente.</span></span>
            </label>
            {error && <div className="mt-3 text-ko text-[12.5px] flex gap-2"><AlertTriangle size={14} className="mt-0.5" />{error}</div>}
          </div>
        )}
      </motion.div>
    </Modal>
  );
}

function Parametros({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const act = useApp((s) => s.actualizarParametros);
  const asignar = useApp((s) => s.asignarResponsable);
  const toast = useApp((s) => s.toast);
  const [uf, setUf] = useState(ej.parametros.uf);
  const [usd, setUsd] = useState(ej.parametros.usdCierre);
  const [aviso, setAviso] = useState<number[] | null>(null);
  const perfiles = usePerfiles();
  const editable = tiene(perfiles, "proceso", "admin") && !ej.historico;
  useEffect(() => { if (open) { setUf(ej.parametros.uf); setUsd(ej.parametros.usdCierre); setAviso(null); } }, [open]);
  const guardar = () => {
    const afect = act({ uf, usdCierre: usd });
    setAviso(afect);
    toast(`Parámetros versionados (v${ej.parametros.version + 1})`, "ok");
  };
  const nota = USUARIOS.filter((u) => u.perfiles.includes("nota"));
  return (
    <Modal open={open} onClose={onClose} title={`Parámetros del ejercicio · versión ${ej.parametros.version}`} width={820}
      footer={editable ? <button className="btn btn-p" onClick={guardar} disabled={uf === ej.parametros.uf && usd === ej.parametros.usdCierre}>Guardar nueva versión</button> : undefined}>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div><Label className="mb-1">Fecha del periodo</Label><div className="h-[30px] flex items-center tnum">{fechaCorta(ej.fechaCierre)}</div></div>
        <div><Label className="mb-1">Valor UF de cierre</Label><input disabled={!editable} className="inp tnum" type="number" step="0.01" value={uf} onChange={(e) => setUf(Number(e.target.value))} /></div>
        <div><Label className="mb-1">Dólar observado de cierre</Label><input disabled={!editable} className="inp tnum" type="number" step="0.01" value={usd} onChange={(e) => setUsd(Number(e.target.value))} /></div>
        <div><Label className="mb-1">Homologación vigente</Label><div className="h-[30px] flex items-center tnum">{ej.parametros.homologacion}</div></div>
      </div>
      <div className="mb-5">
        <Label className="mb-1">Dólar promedio mensual</Label>
        <div className="flex gap-6 tnum text-[12.5px]">{ej.parametros.usdPromedio.map((v, i) => <span key={i}><span className="text-ink3 mr-1.5">Mes {i + 1}</span>{v.toLocaleString("es-CL")}</span>)}</div>
      </div>
      {aviso && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-5 border border-warn/40 bg-[color-mix(in_srgb,var(--warn)_6%,white)] px-4 py-3 text-[12.5px]">
          <div className="font-medium text-warn mb-1">{aviso.length} notas deben recalcularse con los nuevos parámetros</div>
          <div className="text-ink2">{aviso.length ? aviso.map((n) => `Nota ${n}`).join(" · ") : "Ninguna nota generada usa estos parámetros."}</div>
        </motion.div>
      )}
      <Label className="mb-2">Responsable por nota</Label>
      <div className="border border-rule max-h-[280px] overflow-auto">
        <table className="tbl">
          <thead><tr><th className="w-10">N°</th><th>Nota</th><th className="w-56">Responsable</th></tr></thead>
          <tbody>
            {ej.notas.map((n) => (
              <tr key={n.n}>
                <td className="tnum text-ink3">{n.n}</td>
                <td>{pack.notas.find((d) => d.n === n.n)!.titulo}</td>
                <td>
                  <select disabled={!editable} className="inp !h-7 text-[12px]" value={n.responsable} onChange={(e) => asignar(n.n, e.target.value)}>
                    {nota.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export default function Portada() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const cliente = useApp((s) => s.cliente());
  const perfiles = usePerfiles();
  const [sp, setSp] = useSearchParams();
  const entrada = sp.get("entrada") === "1";
  const pe = porEstado(ej);
  const total = ej.notas.length;
  const ph = proximoHito(ej);
  const koTotal = ej.notas.filter((n) => n.controles.some((c) => c.bloqueante && c.dif !== 0)).length;
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad);
  const cerrar = (k: string) => { sp.delete(k); setSp(sp); };
  const [param, setParam] = useState(false);
  const d = (i: number) => (entrada ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 + i * 0.12, duration: 0.35 } } : {});

  const kpis = [
    { label: "Notas aprobadas", v: pe.Aprobada, extra: `de ${total}`, barra: pe.Aprobada / total },
    { label: "Cargas pendientes", v: pendientesCarga(ej, pack).length, extra: `de ${ej.fuentes.length} fuentes` },
    { label: "Aprobaciones pendientes", v: aprobacionesPendientes(ej), extra: "notas en revisión" },
    { label: "Notas con control KO", v: koTotal, extra: "bloquean el envío", ko: koTotal > 0 }
  ];

  return (
    <div>
      <Encabezado
        n="01"
        titulo={`${ej.periodo} · ${soc?.nombre}`}
        tag={<EstadoEEFF />}
        sub={<>Cierre al {fechaLarga(ej.fechaCierre)} · Responsable del proceso {usuario(ej.responsable).nombre}</>}
        acciones={<>
          <button className="btn" onClick={() => setParam(true)}><SlidersHorizontal size={14} /> Parámetros</button>
          <button className="btn" onClick={() => { sp.set("historicos", "1"); setSp(sp); }}>Históricos</button>
          {tiene(perfiles, "proceso", "admin") && <button className="btn btn-p" onClick={() => { sp.set("nuevo", "1"); setSp(sp); }}><Plus size={14} /> Nuevo ejercicio</button>}
        </>}
      />

      <div className="mx-6 mt-5 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1.35fr] bg-panel border border-rule [&>*]:border-b [&>*]:border-rule xl:[&>*]:border-b-0">
        {kpis.map((k, i) => (
          <motion.div key={k.label} {...d(i + 1)} className="px-6 py-4 border-r border-rule">
            <Label>{k.label}</Label>
            <div className="flex items-baseline gap-2 mt-1">
              <Num v={k.v} className="text-[32px] font-semibold leading-none tracking-tight" fmt={(x) => String(Math.round(x))} />
              <span className="text-[12px] text-ink3">{k.extra}</span>
            </div>
            {k.barra !== undefined && (
              <div className="h-[3px] bg-rule2 mt-3">
                <motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${k.barra * 100}%` }} transition={{ duration: 1.1, delay: 0.3 }} />
              </div>
            )}
            {k.ko && <div className="text-[11px] text-ko mt-2">Revisar en Generación de notas</div>}
          </motion.div>
        ))}
        <motion.div {...d(5)} className="px-6 py-4">
          <Label>Próximo hito</Label>
          <div className="text-[15px] font-medium mt-1">{ph.nombre}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[26px] font-semibold tnum leading-none" style={{ color: ph.diasHabiles <= 1 ? "var(--ko)" : "var(--ink)" }}>{ph.diasHabiles}</span>
            <span className="text-[12px] text-ink3">días hábiles · {fechaCorta(ph.fecha)}</span>
          </div>
        </motion.div>
      </div>

      <motion.div {...d(6)} className="mx-6 mt-5 bg-panel border border-rule">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 pt-4">
          <div>
            <div className="font-bold text-[15px]">Recorrido de las {total} notas</div>
            <div className="text-[11.5px] text-ink3">Cada cuadro es una nota en la etapa en que está. Se mueve al cambiar de estado.</div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-ink2">
            {ESTADOS_NOTA.map((e) => <span key={e} className="flex items-center gap-1.5"><EstadoNotaTag estado={e} /></span>)}
          </div>
        </div>
        <div className="mt-3">
          <FlujoNotas ej={ej} pack={pack} />
        </div>
      </motion.div>

      <div className="p-6 grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <motion.div {...d(7)} className="min-w-0"><Tablero /></motion.div>
        <motion.div {...d(8)} className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-1 gap-5 content-start">
          <Pendientes />
          <div className="bg-panel border border-rule"><Calendario /></div>
          <div className="bg-panel border border-rule px-4 py-3 md:col-span-2 2xl:col-span-1">
            <Label className="mb-2">Accesos por perfil</Label>
            <div className="flex flex-wrap gap-1.5">
              {TRACKS.filter((t) => t.perfiles.some((p) => perfiles.includes(p))).map((t) => <span key={t.id} className="text-[11.5px] border border-rule px-2 py-0.5 text-ink2"><span className="tnum text-ink3 mr-1">{t.n}</span>{t.nombre}</span>)}
            </div>
          </div>
        </motion.div>
      </div>

      <Historicos open={sp.get("historicos") === "1"} onClose={() => cerrar("historicos")} />
      <NuevoEjercicio open={sp.get("nuevo") === "1" && tiene(perfiles, "proceso", "admin")} onClose={() => cerrar("nuevo")} />
      <Parametros open={param} onClose={() => setParam(false)} />
      {/* Descarga rápida del tablero para el comité */}
      <span className="hidden"><Download /></span>
    </div>
  );
}
