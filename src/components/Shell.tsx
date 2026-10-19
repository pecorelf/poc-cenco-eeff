import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bot, ChevronDown, LogOut, ScrollText, Settings2, Check, RefreshCcw, Bell, AlertCircle, Info, Menu, X } from "lucide-react";
import { useApp } from "../engine/store";
import { TRACKS, etapaIndice, pendientesCarga, porEstado, aprobacionesPendientes, misPendientes } from "../engine/derivados";
import { USUARIOS, usuario, correo } from "../config/users";
import { PERFIL_NOMBRE } from "../engine/types";
import { DeloitteLogo, ClienteMarca, Avatar, usePerfiles, tiene, Toasts } from "./ui";
import { Asistente } from "./Asistente";
import { fechaCorta } from "../engine/util";

function contador(id: string, ej: ReturnType<ReturnType<typeof useApp.getState>["ej"]>, pack: ReturnType<ReturnType<typeof useApp.getState>["pack"]>) {
  switch (id) {
    case "carga":
      return pendientesCarga(ej, pack).length;
    case "notas": {
      const e = porEstado(ej);
      return e["Lista para generar"] + e.Borrador + e["En corrección"];
    }
    case "preaprobacion":
      return aprobacionesPendientes(ej) + (ej.auditoria.estado === "en revisión" ? 1 : 0);
    case "directorio":
      return ej.directorio.estado === "en revisión" ? 1 : 0;
    case "informes":
      return ej.estado === "Aprobado" ? 3 - new Set(ej.informes.map((i) => i.id)).size : 0;
    default:
      return 0;
  }
}

function Riel() {
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const perfiles = usePerfiles();
  const etapa = etapaIndice(ej);
  const visibles = TRACKS.filter((t) => t.perfiles.some((p) => perfiles.includes(p)));
  const idx = visibles.findIndex((t) => TRACKS.indexOf(t) === Math.min(etapa, 5));
  const pasoAlto = 44;
  return (
    <nav className="relative pt-3">
      <div className="px-4 pb-2 sc text-[11px]">Proceso de cierre</div>
      <div className="relative">
        {/* riel */}
        <div className="absolute left-[27px] top-[22px] w-px bg-rule" style={{ height: (visibles.length - 1) * pasoAlto }} />
        <motion.div
          className="absolute left-[27px] top-[22px] w-px"
          style={{ background: "var(--accent)" }}
          initial={{ height: 0 }}
          animate={{ height: Math.max(0, idx) * pasoAlto }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
        />
        {visibles.map((t, i) => {
          const hecho = i < idx || ej.estado === "Cerrado";
          const actual = i === idx && ej.estado !== "Cerrado";
          const c = contador(t.id, ej, pack);
          return (
            <NavLink key={t.id} to={t.ruta} className="relative flex items-center gap-3 pl-[20px] pr-3 group" style={{ height: pasoAlto }}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="navsel" className="absolute inset-y-1 left-2 right-2 bg-accentSoft rounded-lg" transition={{ duration: 0.2 }} />}
                  <span className="relative z-[1] w-[16px] h-[16px] rounded-full flex items-center justify-center" style={{ background: hecho ? "var(--accent)" : "var(--panel)", border: `1.5px solid ${hecho || actual ? "var(--accent)" : "#b8bec8"}` }}>
                    {hecho && <Check size={10} color="white" strokeWidth={3} />}
                    {actual && <span className="w-[6px] h-[6px] rounded-full live-dot" style={{ background: "var(--accent)" }} />}
                  </span>
                  <span className="relative z-[1] flex-1 leading-tight">
                    <span className="block text-[10.5px] text-ink3 tnum">{t.n}</span>
                    <span className={`block text-[12.5px] whitespace-nowrap ${isActive ? "font-semibold text-accent" : "font-medium text-ink2 group-hover:text-ink"}`}>{t.nombre}</span>
                  </span>
                  {c > 0 && <span className="relative z-[1] text-[11px] font-semibold tnum min-w-[22px] h-[20px] px-1.5 rounded-full inline-flex items-center justify-center" style={{ background: isActive ? "var(--accent)" : "var(--head)", color: isActive ? "white" : "var(--ink-2)" }}>{c}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function BanderaChile() {
  return (
    <svg width="26" height="17" viewBox="0 0 30 20" className="rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] shrink-0" aria-hidden>
      <rect width="30" height="10" fill="#ffffff" /><rect y="10" width="30" height="10" fill="#d52b1e" /><rect width="10" height="10" fill="#0039a6" />
      <polygon points="5,2.2 5.9,4.6 8.4,4.6 6.4,6.1 7.1,8.5 5,7.1 2.9,8.5 3.6,6.1 1.6,4.6 4.1,4.6" fill="#ffffff" />
    </svg>
  );
}

function Campana() {
  const [open, setOpen] = useState(false);
  const ej = useApp((s) => s.ej());
  const pack = useApp((s) => s.pack());
  const uid = useApp((s) => s.usuarioId)!;
  const perfiles = usePerfiles();
  const nav = useNavigate();
  const items = misPendientes(ej, pack, uid, perfiles);
  return (
    <div className="relative shrink-0">
      <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-ink2 hover:bg-head" onClick={() => setOpen(!open)} aria-label="Notificaciones">
        <Bell size={19} />
        {items.length > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-bold text-white flex items-center justify-center" style={{ background: "var(--ko)" }}>{items.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-11 z-40 w-[380px] max-w-[calc(100vw-24px)] max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[60px] max-sm:w-auto bg-panel rounded-xl shadow-[0_12px_32px_rgba(20,28,45,0.18)] overflow-hidden">
              <div className="px-4 pt-3 pb-2 font-bold text-[14px]">Notificaciones</div>
              {items.length === 0 && <div className="px-4 pb-4 text-[12.5px] text-ink3">No tienes pendientes en este ejercicio.</div>}
              <div className="max-h-[360px] overflow-auto">
                {items.map((p) => (
                  <button key={p.id} onClick={() => { setOpen(false); nav(p.ruta); }} className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-accentSoft">
                    {p.tipo === "Control KO" || p.tipo === "Corregir" ? <AlertCircle size={18} className="text-ko shrink-0 mt-0.5" /> : <Info size={18} className="text-accent shrink-0 mt-0.5" />}
                    <span className="min-w-0"><span className="block text-[12.5px] font-semibold text-ink">{p.tipo}</span><span className="block text-[12px] text-ink2 truncate">{p.texto}</span></span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectorEjercicio() {
  const [open, setOpen] = useState(false);
  const todosEj = useApp((s) => s.ejercicios);
  const ejercicios = todosEj.filter((e) => !e.historico);
  const ej = useApp((s) => s.ej());
  const cliente = useApp((s) => s.cliente());
  const sel = useApp((s) => s.seleccionarEjercicio);
  const nav = useNavigate();
  const soc = (id: string) => cliente.sociedades.find((s) => s.id === id)?.nombre;
  const puedeCrear = tiene(usePerfiles(), "proceso", "admin");
  return (
    <div className="relative min-w-0 shrink">
      <div className="flex items-center gap-2 min-w-0">
        <button className="hidden sm:flex items-center gap-2 h-9 pl-2.5 pr-2 border border-[#9aa3b2] rounded-lg bg-panel hover:border-accent whitespace-nowrap shrink-0" onClick={() => setOpen(!open)} title="Sociedad y país">
          <BanderaChile />
          <span className="text-[12.5px] font-medium text-ink2 hidden md:inline">CL</span>
          <ChevronDown size={15} className="text-ink2" />
        </button>
        <button className="flex items-center gap-2 h-9 px-3 border border-[#9aa3b2] rounded-lg bg-panel hover:border-accent min-w-0 max-w-full whitespace-nowrap" onClick={() => setOpen(!open)} title={`${ej.periodo} · ${soc(ej.sociedad)} · ${ej.estado}`}>
          <span className="text-[12.5px] font-medium text-ink truncate min-w-0 hidden md:inline">{soc(ej.sociedad)}</span>
          <span className="w-px h-4 bg-rule hidden md:inline" />
          <span className="text-[12.5px] font-semibold tnum shrink-0">{ej.periodo}</span>
          <span className="text-[11.5px] shrink-0 hidden xl:inline" style={{ color: ej.historico ? "var(--ink-3)" : "var(--accent)" }}>{ej.estado}</span>
          <ChevronDown size={15} className="text-ink2 shrink-0" />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute left-0 top-11 z-40 w-[400px] max-w-[calc(100vw-24px)] bg-panel rounded-xl shadow-[0_12px_32px_rgba(20,28,45,0.18)] overflow-hidden">
              <div className="px-4 pt-3 pb-1 sc">Ejercicios abiertos</div>
              {ejercicios.map((e) => (
                <button key={e.id} className="w-full flex items-center justify-between px-4 h-10 hover:bg-accentSoft text-left" onClick={() => { sel(e.id); setOpen(false); }}>
                  <span><span className="font-medium tnum mr-2">{e.periodo}</span>{soc(e.sociedad)}</span>
                  <span className="text-[12px] text-ink2">{e.estado}</span>
                </button>
              ))}
              <div className="border-t border-rule flex">
                <button className="flex-1 h-10 text-[12.5px] font-semibold text-accent hover:bg-accentSoft" onClick={() => { setOpen(false); nav("/inicio?historicos=1"); }}>Ejercicios históricos</button>
                {puedeCrear && <button className="flex-1 h-10 text-[12.5px] font-semibold text-accent border-l border-rule hover:bg-accentSoft" onClick={() => { setOpen(false); nav("/inicio?nuevo=1"); }}>Nuevo ejercicio</button>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuUsuario() {
  const [open, setOpen] = useState(false);
  const uid = useApp((s) => s.usuarioId)!;
  const login = useApp((s) => s.login);
  const logout = useApp((s) => s.logout);
  const dominio = useApp((s) => s.cliente().dominio);
  const nav = useNavigate();
  const u = usuario(uid);
  return (
    <div className="relative shrink-0">
      <button className="flex items-center gap-3 h-10 pl-3 pr-1 rounded-lg hover:bg-head" onClick={() => setOpen(!open)}>
        <span className="text-right leading-tight hidden md:block whitespace-nowrap">
          <span className="block text-[11px] text-ink3 hidden xl:block">{PERFIL_NOMBRE[u.perfiles[0]]}</span>
          <span className="block text-[13px] font-semibold text-ink max-w-[170px] truncate">{u.nombre}</span>
        </span>
        <Avatar id={uid} size={34} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute right-0 top-12 z-40 w-[340px] max-w-[calc(100vw-24px)] bg-panel rounded-xl shadow-[0_12px_32px_rgba(20,28,45,0.18)] overflow-hidden">
              <div className="px-3 py-2 border-b border-rule text-[11.5px] text-ink3">{correo(uid, dominio)}</div>
              <div className="px-3 pt-2 pb-1 sc text-[11px]">Cambiar de usuario (demo)</div>
              {USUARIOS.map((x) => (
                <button key={x.id} className="w-full flex items-center gap-2 px-3 h-10 hover:bg-paper text-left" onClick={() => { login(x.id); setOpen(false); nav("/inicio"); }}>
                  <Avatar id={x.id} size={22} />
                  <span className="flex-1 leading-tight">
                    <span className="block text-[12px]">{x.nombre}</span>
                    <span className="block text-[10.5px] text-ink3">{x.perfiles.map((p) => PERFIL_NOMBRE[p]).join(" · ")}</span>
                  </span>
                  {x.id === uid && <Check size={13} className="text-accent" />}
                </button>
              ))}
              <button className="w-full flex items-center gap-2 px-3 h-9 border-t border-rule hover:bg-paper text-[12.5px]" onClick={() => { logout(); nav("/"); }}>
                <LogOut size={13} /> Cerrar sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Lateral() {
  const perfiles = usePerfiles();
  return (
    <>
          <Riel />
          <div className="mx-4 my-3 border-t border-rule" />
          <NavLink to="/auditoria" className={({ isActive }) => `mx-2 flex items-center gap-2.5 px-[14px] h-10 rounded-lg text-[12.5px] ${isActive ? "bg-accentSoft text-accent font-semibold" : "text-ink2 font-medium hover:text-ink"}`}>
            <ScrollText size={14} /> Log de auditoría
          </NavLink>
          <div className="flex-1" />
          {perfiles.includes("admin") && (
            <NavLink to="/admin" className="mx-1.5 mb-1 flex items-center gap-2.5 px-[14px] h-9 text-[12.5px] text-ink2 hover:text-ink">
              <Settings2 size={14} /> Configuración
            </NavLink>
          )}
          <button className="mx-1.5 mb-3 flex items-center gap-2.5 px-[14px] h-8 text-[11.5px] text-ink3 hover:text-ink" onClick={() => { useApp.getState().reiniciar(); location.reload(); }} title="Vuelve el ejercicio al escenario de demo inicial">
            <RefreshCcw size={12} /> Reiniciar demo
          </button>
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const asistente = useApp((s) => s.asistente);
  const setAsistente = useApp((s) => s.setAsistente);
  const ej = useApp((s) => s.ej());
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname, loc.search]);
  return (
    <div className="h-full flex flex-col">
      <header className="h-[56px] sm:h-[60px] shrink-0 flex items-center gap-2 sm:gap-3 xl:gap-4 px-3 sm:px-5 bg-panel border-b border-rule min-w-0 shadow-[0_1px_0_rgba(20,28,45,0.04)]">
        <button className="lg:hidden w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-ink hover:bg-head shrink-0" onClick={() => setMenu(true)} aria-label="Abrir menú"><Menu size={21} /></button>
        <span className="shrink-0 hidden sm:block"><DeloitteLogo h={22} /></span>
        <span className="w-px h-6 bg-rule shrink-0 hidden sm:block" />
        <span className="text-[15px] font-bold text-ink whitespace-nowrap hidden xl:inline">Cierre EEFF y Notas</span>
        <SelectorEjercicio />
        {ej.historico && <span className="text-[11.5px] text-ink3 whitespace-nowrap hidden 2xl:inline">Solo lectura · cerrado el {fechaCorta(ej.aprobadoEl ?? ej.fechaCierre)}</span>}
        <div className="flex-1" />
        <button className={`btn btn-sm shrink-0 max-sm:!px-2 ${asistente ? "btn-d" : ""}`} onClick={() => setAsistente(!asistente)} title="Agente del proceso">
          <Bot size={14} /> <span className="hidden lg:inline">Agente del proceso</span>
        </button>
        <Campana />
        <span className="w-px h-8 bg-rule shrink-0 hidden sm:block" />
        <MenuUsuario />
        <span className="w-px h-8 bg-rule shrink-0 hidden sm:block" />
        <span className="shrink-0 hidden sm:block"><ClienteMarca h={34} /></span>
      </header>
      <div className="flex-1 flex min-h-0">
        <aside className="hidden lg:flex w-[210px] xl:w-[250px] shrink-0 border-r border-rule flex-col bg-panel">
          <Lateral />
        </aside>
        <AnimatePresence>
          {menu && (
            <motion.div className="lg:hidden fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-[rgba(30,36,48,0.45)]" onClick={() => setMenu(false)} />
              <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-panel flex flex-col shadow-[12px_0_40px_rgba(20,28,45,0.2)]">
                <div className="h-[56px] flex items-center justify-between px-4 border-b border-rule shrink-0">
                  <span className="text-[15px] font-bold">Cierre EEFF y Notas</span>
                  <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-head" onClick={() => setMenu(false)} aria-label="Cerrar menú"><X size={18} /></button>
                </div>
                <div className="flex-1 flex flex-col overflow-auto"><Lateral /></div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
        <main key={loc.pathname.split("/")[1]} className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
        <AnimatePresence>{asistente && <Asistente />}</AnimatePresence>
      </div>
      <Toasts />
    </div>
  );
}

export function Encabezado({ n, titulo, sub, acciones, tag }: { n?: string; titulo: string; sub?: ReactNode; acciones?: ReactNode; tag?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-6 pt-6 pb-1">
      <div className="min-w-0">
        {n && <div className="text-[11.5px] font-semibold text-accent tnum mb-1">Track {n}</div>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-[26px] font-bold tracking-[-0.01em] leading-tight">{titulo}</h1>
          {tag}
        </div>
        {sub && <div className="text-[13px] text-ink2 mt-1.5">{sub}</div>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}
