import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, UploadCloud, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle, Database, FileText, ArrowRight, Link2 } from "lucide-react";
import { useApp } from "../engine/store";
import { Encabezado } from "../components/Shell";
import { Label, EstadoFuenteTag, Drawer, Avatar, usePerfiles, tiene, esperar, Num } from "../components/ui";
import type { EstadoFuente, FuenteDef, FuenteRun } from "../engine/types";
import { fechaHora, miles, hashStr } from "../engine/util";
import { usuario } from "../config/users";
import { descargarXlsx } from "../engine/export";

const ESTADOS: EstadoFuente[] = ["Pendiente", "Cargada", "Con errores", "Validada", "Habilitada"];
const COLOR: Record<EstadoFuente, string> = { Pendiente: "var(--ink-3)", Cargada: "var(--ink-2)", "Con errores": "var(--ko)", Validada: "var(--warn)", Habilitada: "var(--ok)" };

// Extracciones en curso (asíncronas: sobreviven al cierre del drawer)
type Extr = { inicio: number; dur: number; objetivo: number };

function useExtracciones() {
  const [ext, setExt] = useState<Record<string, Extr>>({});
  const completar = useApp((s) => s.completarActualizacion);
  const toast = useApp((s) => s.toast);
  const pack = useApp((s) => s.pack());
  const lanzar = (ids: string[]) => {
    const ahora = Date.now();
    const nuevos: Record<string, Extr> = {};
    ids.forEach((id, i) => {
      const def = pack.fuentes.find((f) => f.id === id)!;
      nuevos[id] = { inicio: ahora + i * 280, dur: 1900 + (hashStr(id) % 1400), objetivo: def.registros ?? 1000 };
    });
    setExt((e) => ({ ...e, ...nuevos }));
    ids.forEach((id) => {
      const x = nuevos[id];
      setTimeout(() => {
        completar(id);
        setExt((e) => {
          const c = { ...e };
          delete c[id];
          return c;
        });
      }, x.inicio - ahora + x.dur);
    });
    setTimeout(() => toast(ids.length > 1 ? `Actualización masiva terminada · ${ids.length} fuentes` : `Extracción terminada · ${pack.fuentes.find((f) => f.id === ids[0])?.nombre}`, "ok"), Math.max(...ids.map((id) => nuevos[id].inicio - ahora + nuevos[id].dur)) + 60);
  };
  return { ext, lanzar };
}

function Progreso({ x }: { x: Extr }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setP(Math.max(0, Math.min(1, (Date.now() - x.inicio) / x.dur)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [x]);
  const ease = 1 - Math.pow(1 - p, 2.2);
  return (
    <div className="w-[170px]">
      <div className="flex justify-between text-[10.5px] text-ink3 mb-1">
        <span>{p === 0 ? "En cola" : p < 0.35 ? "Consultando Data Lake" : p < 0.8 ? "Extrayendo registros" : "Validando"}</span>
        <span className="tnum text-ink2">{miles(Math.round(x.objetivo * ease))}</span>
      </div>
      <div className="h-[3px] bg-rule2 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${ease * 100}%` }} />
        <div className="absolute inset-0 shimmer" />
      </div>
    </div>
  );
}

function Semaforos({ ej }: { ej: ReturnType<ReturnType<typeof useApp.getState>["ej"]> }) {
  const c = Object.fromEntries(ESTADOS.map((e) => [e, ej.fuentes.filter((f) => f.estado === e).length])) as Record<EstadoFuente, number>;
  const total = ej.fuentes.length;
  return (
    <div className="bg-panel border border-rule">
      <div className="flex h-2">
        {ESTADOS.map((e) => (
          <motion.div key={e} initial={{ width: 0 }} animate={{ width: `${(c[e] / total) * 100}%` }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} style={{ background: COLOR[e], opacity: e === "Pendiente" ? 0.35 : 1 }} />
        ))}
      </div>
      <div className="grid grid-cols-5">
        {ESTADOS.map((e) => (
          <div key={e} className="px-4 py-3 border-r border-rule2 last:border-r-0">
            <div className="flex items-center gap-1.5 text-[11.5px] text-ink3">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR[e] }} />
              {e}
            </div>
            <div className="text-[22px] font-semibold tnum" style={{ color: e === "Con errores" && c[e] ? "var(--ko)" : undefined }}>
              <Num v={c[e]} fmt={(n) => String(Math.round(n))} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Carga manual con validación animada ----------

const CHECKS_ESTRUCTURA = ["Hojas esperadas de la plantilla", "Columnas y orden del schema", "Tipos de dato por columna", "Campos obligatorios", "Formato de periodo"];
const CHECKS_CONTENIDO = ["Periodo coincide con el ejercicio", "Cuentas existen en la tabla de homologación", "Registros duplicados", "Totales de control contra BPC C480", "Valores dentro del rango histórico (±15%)"];

function CargaManual({ def, f, puede }: { def: FuenteDef; f: FuenteRun; puede: boolean }) {
  const completar = useApp((s) => s.completarCarga);
  const toast = useApp((s) => s.toast);
  const ej = useApp((s) => s.ej());
  const [fase, setFase] = useState<"idle" | "archivo" | "estructura" | "contenido" | "fin">("idle");
  const [archivo, setArchivo] = useState("");
  const [paso, setPaso] = useState(-1);
  const [resultado, setResultado] = useState<"ok" | "advertencias" | "errores">("ok");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const ext = def.formato.startsWith("PDF") ? "pdf" : def.formato.startsWith("Word") ? "docx" : "xlsx";
  const ejemplo = `${def.id}_${ej.anio}T${ej.trimestre}_v${f.version + 1}.${ext}`;

  const procesar = async (nombre: string, forzar?: "ok" | "errores") => {
    const res = forzar ?? (f.estado === "Con errores" || f.estado === "Pendiente" ? "ok" : "ok");
    setArchivo(nombre);
    setResultado(res);
    setFase("archivo");
    await esperar(700);
    setFase("estructura");
    for (let i = 0; i < CHECKS_ESTRUCTURA.length; i++) {
      setPaso(i);
      await esperar(330);
    }
    setFase("contenido");
    for (let i = 0; i < CHECKS_CONTENIDO.length; i++) {
      setPaso(CHECKS_ESTRUCTURA.length + i);
      await esperar(res === "errores" && i === 1 ? 600 : 360);
    }
    setPaso(99);
    setFase("fin");
    completar(def.id, nombre, res);
    toast(res === "errores" ? "Archivo rechazado: errores bloqueantes" : `${def.nombre} validada y habilitada`, res === "errores" ? "ko" : "ok");
  };

  const falla = (i: number) => resultado === "errores" && (i === 2 || i === CHECKS_ESTRUCTURA.length + 1);
  const todos = [...CHECKS_ESTRUCTURA, ...CHECKS_CONTENIDO];

  if (!puede) return <div className="text-[12px] text-ink3">Tu perfil no permite cargar archivos en esta fuente.</div>;

  return (
    <div>
      {fase === "idle" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const fl = e.dataTransfer.files[0]; if (fl) procesar(fl.name); }}
          className="border border-dashed px-5 py-6 text-center transition-colors"
          style={{ borderColor: drag ? "var(--accent)" : "var(--ink-3)", background: drag ? "var(--accent-soft)" : "var(--paper)" }}
        >
          <UploadCloud size={22} className="mx-auto text-ink3 mb-2" />
          <div className="text-[12.5px]">Arrastra el archivo aquí o <button className="text-accent font-medium underline-offset-2 hover:underline" onClick={() => input.current?.click()}>selecciónalo</button></div>
          <div className="text-[11px] text-ink3 mt-1">{def.formato} · asociado a {ej.periodo} · genera la versión v{f.version + 1}</div>
          <input ref={input} type="file" className="hidden" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) procesar(fl.name); }} />
          <div className="flex justify-center gap-2 mt-4">
            <button className="btn btn-sm btn-p" onClick={() => procesar(ejemplo, "ok")}>Usar archivo de ejemplo corregido</button>
            <button className="btn btn-sm" onClick={() => procesar(ejemplo.replace(`.${ext}`, `_borrador.${ext}`), "errores")}>Probar un archivo con errores</button>
          </div>
        </div>
      ) : (
        <div className="border border-rule">
          <div className="flex items-center gap-3 px-4 h-11 border-b border-rule bg-paper">
            <FileSpreadsheet size={16} className="text-accent" />
            <div className="text-[12.5px] font-medium truncate flex-1">{archivo}</div>
            <span className="text-[11px] text-ink3 tnum">v{fase === "fin" ? f.version : f.version + 1}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            {/* hoja escaneada */}
            <div className="relative border-r border-rule overflow-hidden h-[250px] bg-panel">
              {Array.from({ length: 22 }).map((_, r) => (
                <motion.div key={r} className="flex gap-[3px] px-2 py-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: r * 0.025 }}>
                  {[20, 44, 28, 36].map((w, c) => {
                    const mala = resultado === "errores" && fase !== "archivo" && ((r === 8 && c === 3) || (r === 14 && c === 1));
                    return <span key={c} className={`h-[5px] ${mala ? "flash-ko" : ""}`} style={{ width: w, background: r === 0 ? "var(--ink-2)" : mala ? "var(--ko)" : "var(--rule)" }} />;
                  })}
                </motion.div>
              ))}
              {(fase === "estructura" || fase === "contenido") && (
                <div className="absolute inset-0 pointer-events-none">
                  <motion.div className="absolute left-0 right-0 h-10" animate={{ y: [-40, 250] }} transition={{ duration: 1.1, ease: "linear", repeat: Infinity }} style={{ background: "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--accent) 22%, transparent))", borderBottom: "1px solid var(--accent)" }} />
                </div>
              )}
            </div>
            <div className="px-4 py-3 space-y-[3px]">
              <Label>Validación de estructura</Label>
              {todos.map((t, i) => (
                <div key={t}>
                  {i === CHECKS_ESTRUCTURA.length && <Label className="mt-2">Validación de contenido</Label>}
                  <div className="flex items-center gap-2 text-[12px] h-[19px]">
                    <span className="w-4 flex justify-center">
                      {paso > i || fase === "fin" ? (
                        falla(i) ? <XCircle size={13} className="text-ko" /> : resultado === "advertencias" && i === todos.length - 1 ? <AlertTriangle size={13} className="text-warn" /> : <CheckCircle2 size={13} className="text-ok" />
                      ) : paso === i ? (
                        <span className="w-[7px] h-[7px] bg-accent live-dot" />
                      ) : (
                        <span className="w-[7px] h-[7px] border border-ink3" />
                      )}
                    </span>
                    <span className={paso >= i || fase === "fin" ? "text-ink" : "text-ink3"}>{t}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {fase === "fin" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-rule px-4 py-3 overflow-hidden">
                {resultado === "errores" ? (
                  <div className="text-[12px]">
                    <div className="text-ko font-medium mb-1">Archivo rechazado · la versión vigente no se reemplaza</div>
                    <div className="text-ink2">Se registró la versión con errores y el reporte queda disponible más abajo.</div>
                  </div>
                ) : (
                  <div className="text-[12px] text-ok font-medium flex items-center gap-2"><CheckCircle2 size={14} /> Validada y habilitada para la generación de notas</div>
                )}
                <button className="btn btn-sm mt-2" onClick={() => { setFase("idle"); setPaso(-1); }}>Cargar otra versión</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function DetalleFuente({ id, onClose, ext, lanzar }: { id: string | null; onClose: () => void; ext: Record<string, Extr>; lanzar: (ids: string[]) => void }) {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const habilitar = useApp((s) => s.habilitarFuente);
  const registrar = useApp((s) => s.registrar);
  const toast = useApp((s) => s.toast);
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const def = pack.fuentes.find((f) => f.id === id);
  const f = ej.fuentes.find((x) => x.id === id);
  const puede = tiene(perfiles, "carga", "proceso", "admin") && !ej.historico;
  const [confirma, setConfirma] = useState(false);
  useEffect(() => setConfirma(false), [id]);
  if (!def || !f) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;
  const notas = pack.notas.filter((n) => n.fuentes.includes(def.id));
  const bloqueantes = (f.errores ?? []).filter((e) => e.bloqueante);
  const advert = (f.errores ?? []).filter((e) => !e.bloqueante);

  const plantilla = () => {
    descargarXlsx(`plantilla_${def.id}.xlsx`, [
      { nombre: "Datos", filas: [["Periodo", "Sociedad", "Cuenta", "Descripción", "Moneda", "Monto", "País", "Observación"], [`${ej.anio}-${String(ej.trimestre * 3).padStart(2, "0")}`, "", "", "", "CLP", 0, "", ""]], anchos: [10, 12, 14, 36, 8, 16, 10, 30] },
      { nombre: "Schema", filas: [["Columna", "Tipo", "Obligatorio"], ["Periodo", "AAAA-MM", "Sí"], ["Sociedad", "Texto", "Sí"], ["Cuenta", "Texto (10)", "Sí"], ["Descripción", "Texto", "No"], ["Moneda", "ISO 4217", "Sí"], ["Monto", "Número", "Sí"], ["País", "Texto", "Sí"], ["Observación", "Texto", "No"]] }
    ]);
    registrar({ track: "Carga de información", objeto: def.nombre, accion: "Descarga de plantilla" });
  };
  const reporte = () => {
    descargarXlsx(`errores_${def.id}_v${f.version}.xlsx`, [{ nombre: "Errores", filas: [["Fila", "Columna", "Regla incumplida", "Tipo"], ...(f.errores ?? []).map((e) => [e.fila, e.columna, e.regla, e.bloqueante ? "Error bloqueante" : "Advertencia"])], anchos: [6, 20, 70, 18] }]);
    registrar({ track: "Carga de información", objeto: def.nombre, accion: "Descarga de reporte de errores", version: `v${f.version}` });
  };

  return (
    <Drawer open={Boolean(id)} onClose={onClose} width={620} title={<span className="flex items-center gap-2">{def.tipo === "integrada" ? <Database size={15} className="text-accent" /> : <FileSpreadsheet size={15} className="text-accent" />}{def.nombre}</span>}>
      <div className="px-5 py-4 grid grid-cols-3 gap-y-3 gap-x-4 border-b border-rule text-[12px]">
        <div><Label>Tipo</Label>{def.tipo === "integrada" ? "Integrada" : "Manual"}</div>
        <div><Label>Origen</Label>{def.origen}</div>
        <div><Label>Formato</Label>{def.formato}</div>
        <div><Label>Obligatoriedad</Label>{def.obligatoriedad}</div>
        <div><Label>Responsable</Label><span className="flex items-center gap-1.5"><Avatar id={def.responsable} size={18} />{usuario(def.responsable).nombre}</span></div>
        <div><Label>Estado</Label><EstadoFuenteTag estado={f.estado} /></div>
        <div className="col-span-3"><Label>Notas que alimenta</Label>
          <div className="flex flex-wrap gap-1 mt-0.5">{notas.map((n) => <button key={n.n} onClick={() => nav(`/notas/${n.n}`)} className="px-1.5 h-[22px] border border-rule text-[11.5px] hover:border-accent">Nota {n.n}</button>)}</div>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-rule">
        {def.tipo === "integrada" ? (
          <div className="flex items-center gap-4">
            <div className="flex-1 text-[12px] text-ink2">
              Extrae desde {def.origen} la información de <strong className="text-ink">{ej.periodo}</strong>. Si la extracción falla, la versión vigente se mantiene.
              {f.ultimaActualizacion && <div className="text-ink3 mt-1">Última: {fechaHora(f.ultimaActualizacion)} · {miles(f.registros ?? 0)} registros · v{f.version}</div>}
            </div>
            {ext[def.id] ? <Progreso x={ext[def.id]} /> : <button className="btn btn-p" disabled={!puede} onClick={() => lanzar([def.id])}><RefreshCw size={14} /> Actualizar</button>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <Label>Carga manual</Label>
              <button className="btn btn-sm btn-g" onClick={plantilla}><Download size={13} /> Plantilla con schema fijo</button>
            </div>
            <CargaManual key={def.id} def={def} f={f} puede={puede} />
          </>
        )}
      </div>

      {(f.errores?.length ?? 0) > 0 && (
        <div className="px-5 py-4 border-b border-rule">
          <div className="flex items-center justify-between mb-2">
            <Label>Hallazgos de validación · v{f.version}</Label>
            <button className="btn btn-sm btn-g" onClick={reporte}><Download size={13} /> Reporte de errores</button>
          </div>
          <table className="tbl">
            <thead><tr><th>Fila</th><th>Columna</th><th>Regla incumplida</th><th>Tipo</th></tr></thead>
            <tbody>
              {f.errores!.map((e, i) => (
                <motion.tr key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <td className="tnum">{e.fila}</td><td className="whitespace-nowrap">{e.columna}</td><td>{e.regla}</td>
                  <td className="whitespace-nowrap" style={{ color: e.bloqueante ? "var(--ko)" : "var(--warn)" }}>{e.bloqueante ? "Bloqueante" : "Advertencia"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {f.estado === "Validada" && advert.length > 0 && bloqueantes.length === 0 && puede && (
            <div className="mt-3 p-3 bg-paper border border-rule">
              <label className="flex items-start gap-2 text-[12px] cursor-pointer">
                <input type="checkbox" checked={confirma} onChange={(e) => setConfirma(e.target.checked)} className="mt-0.5" />
                Revisé las {advert.length} advertencias y confirmo que los valores son correctos para {ej.periodo}.
              </label>
              <button className="btn btn-sm btn-p mt-2" disabled={!confirma} onClick={() => { habilitar(def.id); toast(`${def.nombre} habilitada`, "ok"); }}>Confirmar y habilitar</button>
            </div>
          )}
          {f.estado === "Con errores" && <div className="text-[11.5px] text-ko mt-2">Con errores bloqueantes la fuente no puede habilitarse. Carga una versión corregida.</div>}
        </div>
      )}

      <div className="px-5 py-4">
        <Label className="mb-2">Versiones</Label>
        {f.versiones.length === 0 ? <div className="text-[12px] text-ink3">Sin cargas en este ejercicio.</div> : (
          <table className="tbl">
            <thead><tr><th>Versión</th><th>Fecha</th><th>Usuario</th><th>Archivo / ejecución</th><th>Resultado</th></tr></thead>
            <tbody>
              {[...f.versiones].reverse().map((v) => (
                <tr key={v.v}><td className="tnum">v{v.v}</td><td className="tnum whitespace-nowrap">{fechaHora(v.fecha)}</td><td className="whitespace-nowrap">{usuario(v.usuario).nombre}</td><td className="text-ink2 max-w-[180px] truncate">{v.archivo}</td><td className="whitespace-nowrap">{v.resultado}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Drawer>
  );
}

function Completitud() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const nav = useNavigate();
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-px bg-rule border border-rule">
      {pack.notas.map((d, i) => {
        const fs = d.fuentes.map((fid) => ({ def: pack.fuentes.find((x) => x.id === fid)!, run: ej.fuentes.find((x) => x.id === fid)! }));
        const ok = fs.filter((x) => x.run.estado === "Habilitada").length;
        const oblig = fs.filter((x) => x.def.obligatoriedad === "Obligatoria");
        const lista = oblig.every((x) => x.run.estado === "Habilitada");
        const n = ej.notas.find((x) => x.n === d.n)!;
        return (
          <motion.button key={d.n} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.012 }} onClick={() => nav(`/notas/${d.n}`)} className="bg-panel px-3 py-2.5 text-left hover:bg-paper">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] text-ink3 tnum w-5">{d.n}</span>
              <span className="text-[12px] truncate flex-1">{d.titulo}</span>
              <span className="text-[11.5px] tnum" style={{ color: lista ? "var(--ok)" : "var(--ink-2)" }}>{ok} de {fs.length}</span>
            </div>
            <div className="flex gap-[2px] mt-1.5 ml-7">
              {fs.map((x) => <span key={x.def.id} title={`${x.def.nombre} · ${x.run.estado}`} className="h-[4px] flex-1" style={{ background: COLOR[x.run.estado], opacity: x.run.estado === "Pendiente" ? 0.3 : 1 }} />)}
            </div>
            <div className="text-[10.5px] ml-7 mt-1" style={{ color: lista ? "var(--ok)" : "var(--ink-3)" }}>
              {n.estado === "Pendiente de fuentes" ? "Faltan fuentes obligatorias" : n.generada ? n.estado : "Lista para generar"}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function Homologacion() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const asignar = useApp((s) => s.asignarHomologacion);
  const toast = useApp((s) => s.toast);
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const [sel, setSel] = useState<Record<string, string>>({});
  const [recien, setRecien] = useState<string | null>(null);
  const puede = tiene(perfiles, "admin", "proceso", "carga", "nota") && !ej.historico;
  // Muestra del maestro: cuentas de las notas generadas
  const muestra = useMemo(() => ej.notas.filter((n) => n.generada && n.cuadros.length).slice(0, 7).flatMap((n) => n.cuadros[0].lineas.filter((l) => l.kind === "line").slice(0, 2).map((l) => ({ c: l.cuentas[0], n: n.n, linea: l.label }))), [ej.id]);
  return (
    <div className="space-y-4">
      <div className="bg-panel border border-rule">
        <div className="px-4 h-11 flex items-center border-b border-rule gap-3">
          <div className="font-medium text-[13px]">Cuentas nuevas sin asignar</div>
          <span className="text-[11.5px] text-ink3">Tabla vigente {ej.parametros.homologacion}</span>
        </div>
        {ej.homologacionPendiente.length === 0 ? <div className="px-4 py-4 text-[12px] text-ink3">No hay cuentas nuevas en el consolidado del periodo.</div> : (
          <table className="tbl">
            <thead><tr><th>Cuenta</th><th>Nombre</th><th className="num">Saldo M$</th><th>Nota</th><th>Línea sugerida</th><th>Asignación</th><th /></tr></thead>
            <tbody>
              {ej.homologacionPendiente.map((h) => {
                const def = pack.notas.find((d) => d.n === h.nota)!;
                const lineas = def.cuadros[0].lineas.filter((l) => l.kind !== "total");
                return (
                  <tr key={h.cuenta} className={recien === h.cuenta ? "" : ""}>
                    <td className="tnum font-medium">{h.cuenta}</td>
                    <td>{h.nombre}{!h.asignada && <div className="text-[10.5px] text-ko">Detectada en BPC C480 · sin línea de nota</div>}</td>
                    <td className="num">{miles(h.monto)}</td>
                    <td><button className="text-accent hover:underline" onClick={() => nav(`/notas/${h.nota}`)}>Nota {h.nota}</button></td>
                    <td className="text-ink2">{lineas.find((l) => l.id === h.sugerida)?.label}</td>
                    <td>
                      {h.asignada ? (
                        <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-1 text-ok text-[12px]"><Link2 size={13} /> {lineas.find((l) => l.id === h.asignada)?.label}</motion.span>
                      ) : (
                        <select className="inp !h-7 !w-[200px] text-[12px]" disabled={!puede} value={sel[h.cuenta] ?? h.sugerida} onChange={(e) => setSel({ ...sel, [h.cuenta]: e.target.value })}>
                          {lineas.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="text-right">
                      {h.asignada ? (
                        <button className="btn btn-sm" onClick={() => nav(`/notas/${h.nota}`)}>Regenerar Nota {h.nota} <ArrowRight size={13} /></button>
                      ) : (
                        <button className="btn btn-sm btn-p" disabled={!puede} onClick={() => { asignar(h.cuenta, sel[h.cuenta] ?? h.sugerida); setRecien(h.cuenta); toast(`Cuenta ${h.cuenta} asignada · Nota ${h.nota} marcada para regenerar`, "ok"); }}>Asignar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="bg-panel border border-rule">
        <div className="px-4 h-11 flex items-center border-b border-rule"><div className="font-medium text-[13px]">Maestro de homologación · cuenta → rubro → concepto → línea de nota</div></div>
        <table className="tbl">
          <thead><tr><th>Cuenta</th><th>Rubro</th><th>Concepto</th><th>Nota</th><th>Línea</th></tr></thead>
          <tbody>
            {muestra.map((m, i) => (
              <tr key={i}><td className="tnum">{m.c.codigo}</td><td>{pack.cuentaPrefijos[m.c.codigo.slice(0, 2)] ?? pack.cuentaPrefijos[m.c.codigo.slice(0, 1)] ?? "—"}</td><td className="text-ink2">{m.c.nombre}</td><td className="tnum">{m.n}</td><td>{m.linea}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-[11px] text-ink3 border-t border-rule2">{miles(pack.fuentes.find((f) => f.id === "homolog")?.registros ?? 0)} cuentas homologadas · cada cambio genera una versión del maestro</div>
      </div>
    </div>
  );
}

function Documentos() {
  const pack = useApp((s) => s.pack());
  const ej = useApp((s) => s.ej());
  return (
    <div className="bg-panel border border-rule">
      <div className="px-4 h-11 flex items-center border-b border-rule"><div className="font-medium text-[13px]">Repositorio documental del ejercicio · alimenta al Agente de texto</div></div>
      <table className="tbl">
        <thead><tr><th>ID</th><th>Documento</th><th>Tipo</th><th>Notas</th><th>Contenido</th></tr></thead>
        <tbody>
          {pack.documentos.map((d) => (
            <tr key={d.id}>
              <td className="tnum font-medium text-accent">{d.id}</td>
              <td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><FileText size={13} className="text-ink3" />{d.nombre}</span></td>
              <td className="text-ink2 whitespace-nowrap">{d.tipo}</td>
              <td className="tnum whitespace-nowrap">{d.notas.join(", ")}</td>
              <td className="text-ink2 text-[11.5px] leading-snug">{d.resumen}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 text-[11px] text-ink3 border-t border-rule2">Asociados a {ej.periodo}</div>
    </div>
  );
}

export default function Carga() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const perfiles = usePerfiles();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"fuentes" | "completitud" | "homologacion" | "documentos">((params.get("tab") as any) ?? "fuentes");
  const [fTipo, setFTipo] = useState("");
  const [fEstado, setFEstado] = useState("");
  const { ext, lanzar } = useExtracciones();
  const abierta = params.get("f");
  const puede = tiene(perfiles, "carga", "proceso", "admin") && !ej.historico;
  const integradas = pack.fuentes.filter((f) => f.tipo === "integrada").map((f) => f.id);
  const filas = pack.fuentes.filter((d) => (!fTipo || d.tipo === fTipo) && (!fEstado || ej.fuentes.find((f) => f.id === d.id)?.estado === fEstado));
  const sinHomologar = ej.homologacionPendiente.filter((h) => !h.asignada).length;

  const TABS = [
    { id: "fuentes", n: "Catálogo de fuentes", c: pack.fuentes.length },
    { id: "completitud", n: "Completitud por nota", c: ej.notas.filter((n) => n.estado === "Pendiente de fuentes").length },
    { id: "homologacion", n: "Maestros y homologación", c: sinHomologar },
    { id: "documentos", n: "Fuentes documentales", c: pack.documentos.length }
  ] as const;

  return (
    <div>
      <Encabezado
        n="02"
        titulo="Carga de información"
        sub={<>Repositorio único de insumos de {ej.periodo}. Solo la información validada se habilita para generar notas.</>}
        acciones={<button className="btn btn-p" disabled={!puede || Object.keys(ext).length > 0} onClick={() => lanzar(integradas)}><RefreshCw size={14} className={Object.keys(ext).length ? "animate-spin" : ""} /> Actualizar todas las integradas</button>}
      />
      <div className="p-6 space-y-5">
        <Semaforos ej={ej} />
        {sinHomologar > 0 && tab !== "homologacion" && (
          <motion.button initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} onClick={() => setTab("homologacion")} className="w-full flex items-center gap-3 px-4 py-2.5 bg-panel border text-left" style={{ borderColor: "var(--ko)" }}>
            <AlertTriangle size={15} className="text-ko" />
            <span className="text-[12.5px] flex-1">{sinHomologar} cuenta nueva en el consolidado sin línea de nota asignada. Bloquea la Nota {ej.homologacionPendiente.find((h) => !h.asignada)?.nota}.</span>
            <span className="text-[12px] text-accent font-medium">Revisar homologación</span>
          </motion.button>
        )}
        <div className="flex gap-0 border-b border-rule">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative px-4 h-9 text-[12.5px] ${tab === t.id ? "font-medium text-ink" : "text-ink2 hover:text-ink"}`}>
              {t.n} <span className="text-ink3 tnum ml-1">{t.c}</span>
              {tab === t.id && <motion.span layoutId="tabcarga" className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" />}
            </button>
          ))}
        </div>

        {tab === "fuentes" && (
          <div className="bg-panel border border-rule">
            <div className="flex items-center gap-3 px-4 h-11 border-b border-rule">
              <select className="inp !w-auto !h-7 text-[12px]" value={fTipo} onChange={(e) => setFTipo(e.target.value)}><option value="">Integradas y manuales</option><option value="integrada">Integradas</option><option value="manual">Manuales</option></select>
              <select className="inp !w-auto !h-7 text-[12px]" value={fEstado} onChange={(e) => setFEstado(e.target.value)}><option value="">Todos los estados</option>{ESTADOS.map((e) => <option key={e}>{e}</option>)}</select>
            </div>
            <table className="tbl">
              <thead><tr><th>Fuente</th><th>Tipo</th><th>Obligatoriedad</th><th>Responsable</th><th className="num">Notas</th><th>Estado</th><th>Última carga</th><th className="num">Registros</th><th className="w-[190px]" /></tr></thead>
              <tbody>
                {filas.map((d) => {
                  const f = ej.fuentes.find((x) => x.id === d.id)!;
                  const nn = pack.notas.filter((n) => n.fuentes.includes(d.id)).length;
                  return (
                    <tr key={d.id} className="cursor-pointer" onClick={() => setParams({ f: d.id })}>
                      <td><div className="flex items-center gap-2">{d.tipo === "integrada" ? <Database size={13} className="text-ink3 shrink-0" /> : <FileSpreadsheet size={13} className="text-ink3 shrink-0" />}<span>{d.nombre}</span></div><div className="text-[10.5px] text-ink3 ml-[21px]">{d.origen} · {d.formato}</div></td>
                      <td className="text-ink2">{d.tipo === "integrada" ? "Integrada" : "Manual"}</td>
                      <td className="text-ink2">{d.obligatoriedad}</td>
                      <td><Avatar id={d.responsable} size={20} /></td>
                      <td className="num">{nn}</td>
                      <td><motion.span key={f.estado + f.version} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}><EstadoFuenteTag estado={f.estado} /></motion.span></td>
                      <td className="tnum text-ink2 whitespace-nowrap text-[11.5px]">{f.ultimaActualizacion ? fechaHora(f.ultimaActualizacion) : "—"}{f.version > 0 && <span className="text-ink3"> · v{f.version}</span>}</td>
                      <td className="num text-ink2">{f.registros ? miles(f.registros) : "—"}</td>
                      <td onClick={(e) => e.stopPropagation()} className="text-right">
                        {ext[d.id] ? <Progreso x={ext[d.id]} /> : d.tipo === "integrada" ? (
                          <button className="btn btn-sm" disabled={!puede} onClick={() => lanzar([d.id])}><RefreshCw size={12} /> Actualizar</button>
                        ) : (
                          <button className="btn btn-sm" onClick={() => setParams({ f: d.id })}>{f.estado === "Validada" ? "Revisar advertencias" : f.estado === "Con errores" ? "Corregir" : f.estado === "Pendiente" ? "Cargar archivo" : "Ver versiones"}</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {tab === "completitud" && <Completitud />}
        {tab === "homologacion" && <Homologacion />}
        {tab === "documentos" && <Documentos />}
      </div>
      <DetalleFuente id={abierta} onClose={() => setParams({})} ext={ext} lanzar={lanzar} />
    </div>
  );
}
