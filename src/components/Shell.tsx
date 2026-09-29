import { useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bot, ChevronDown, LogOut, ScrollText, Settings2, Check, RefreshCcw } from "lucide-react";
import { useApp } from "../engine/store";
import { TRACKS, etapaIndice, pendientesCarga, porEstado, aprobacionesPendientes } from "../engine/derivados";
import { USUARIOS, usuario, correo } from "../config/users";
import { PERFIL_NOMBRE } from "../engine/types";
import { DeloitteLogo, ClienteMarca, Avatar, usePerfiles, Toasts } from "./ui";
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
                  {isActive && <motion.span layoutId="navsel" className="absolute inset-y-1 left-1.5 right-1.5 bg-panel border border-rule" transition={{ duration: 0.2 }} />}
                  <span className="relative z-[1] w-[15px] h-[15px] flex items-center justify-center" style={{ background: hecho ? "var(--accent)" : "var(--paper)", border: `1px solid ${hecho || actual ? "var(--accent)" : "var(--ink-3)"}` }}>
                    {hecho && <Check size={10} color="white" strokeWidth={3} />}
                    {actual && <span className="w-[5px] h-[5px] live-dot" style={{ background: "var(--accent)" }} />}
                  </span>
                  <span className="relative z-[1] flex-1 leading-tight">
                    <span className="block text-[10.5px] text-ink3 tnum">{t.n}</span>
                    <span className={`block text-[12.5px] whitespace-nowrap ${isActive ? "font-medium text-ink" : "text-ink2 group-hover:text-ink"}`}>{t.nombre}</span>
                  </span>
                  {c > 0 && <span className="relative z-[1] text-[11px] tnum text-ink2 min-w-[20px] text-right">{c}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
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
  return (
    <div className="relative">
      <button className="flex items-center gap-3 h-8 px-3 border border-rule bg-panel hover:border-ink3" onClick={() => setOpen(!open)}>
        <span className="font-semibold tnum">{ej.periodo}</span>
        <span className="text-ink2">{soc(ej.sociedad)}</span>
        <span className="text-ink3">·</span>
        <span className="text-[12px]" style={{ color: ej.historico ? "var(--ink-3)" : "var(--accent)" }}>{ej.estado}</span>
        <ChevronDown size={14} className="text-ink3" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute left-0 top-9 z-40 w-[380px] bg-panel border border-rule">
              <div className="px-3 pt-3 pb-1 sc text-[11px]">Ejercicios abiertos</div>
              {ejercicios.map((e) => (
                <button key={e.id} className="w-full flex items-center justify-between px-3 h-9 hover:bg-paper text-left" onClick={() => { sel(e.id); setOpen(false); }}>
                  <span><span className="font-medium tnum mr-2">{e.periodo}</span>{soc(e.sociedad)}</span>
                  <span className="text-[12px] text-ink2">{e.estado}</span>
                </button>
              ))}
              <div className="border-t border-rule flex">
                <button className="flex-1 h-9 text-[12.5px] hover:bg-paper" onClick={() => { setOpen(false); nav("/inicio?historicos=1"); }}>Ejercicios históricos</button>
                <button className="flex-1 h-9 text-[12.5px] border-l border-rule hover:bg-paper" onClick={() => { setOpen(false); nav("/inicio?nuevo=1"); }}>Nuevo ejercicio</button>
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
    <div className="relative">
      <button className="flex items-center gap-2 h-8 pl-1 pr-2 hover:bg-rule2" onClick={() => setOpen(!open)}>
        <Avatar id={uid} size={24} />
        <span className="text-left leading-tight">
          <span className="block text-[12px] font-medium">{u.nombre}</span>
          <span className="block text-[10.5px] text-ink3">{u.perfiles.map((p) => PERFIL_NOMBRE[p]).join(" · ")}</span>
        </span>
        <ChevronDown size={13} className="text-ink3" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute right-0 top-9 z-40 w-[340px] bg-panel border border-rule">
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

export function Shell({ children }: { children: ReactNode }) {
  const asistente = useApp((s) => s.asistente);
  const setAsistente = useApp((s) => s.setAsistente);
  const ej = useApp((s) => s.ej());
  const loc = useLocation();
  const perfiles = usePerfiles();
  return (
    <div className="h-full flex flex-col">
      <header className="h-12 shrink-0 flex items-center gap-4 px-4 bg-panel border-b border-rule">
        <DeloitteLogo h={22} />
        <span className="w-px h-6 bg-rule" />
        <span className="text-[12.5px] font-medium text-ink2 whitespace-nowrap">Cierre EEFF y Notas</span>
        <SelectorEjercicio />
        {ej.historico && <span className="text-[11.5px] text-ink3">Solo lectura · cerrado el {fechaCorta(ej.aprobadoEl ?? ej.fechaCierre)}</span>}
        <div className="flex-1" />
        <button className={`btn btn-sm ${asistente ? "btn-d" : ""}`} onClick={() => setAsistente(!asistente)}>
          <Bot size={14} /> Agente del proceso
        </button>
        <MenuUsuario />
        <span className="w-px h-6 bg-rule" />
        <ClienteMarca h={22} />
      </header>
      <div className="flex-1 flex min-h-0">
        <aside className="w-[244px] shrink-0 border-r border-rule flex flex-col bg-paper">
          <Riel />
          <div className="mx-4 my-3 border-t border-rule" />
          <NavLink to="/auditoria" className={({ isActive }) => `mx-1.5 flex items-center gap-2.5 px-[14px] h-9 text-[12.5px] ${isActive ? "bg-panel border border-rule font-medium" : "text-ink2 hover:text-ink border border-transparent"}`}>
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
        </aside>
        <main key={loc.pathname.split("/")[1]} className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
        <AnimatePresence>{asistente && <Asistente />}</AnimatePresence>
      </div>
      <Toasts />
    </div>
  );
}

export function Encabezado({ n, titulo, sub, acciones }: { n?: string; titulo: string; sub?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 px-6 pt-5 pb-4 border-b border-rule bg-panel">
      <div className="min-w-0">
        {n && <div className="text-[11px] text-ink3 tnum mb-0.5">Track {n}</div>}
        <h1 className="text-[21px] font-semibold tracking-[-0.01em] leading-tight">{titulo}</h1>
        {sub && <div className="text-[12.5px] text-ink2 mt-1">{sub}</div>}
      </div>
      {acciones && <div className="flex items-center gap-2 shrink-0">{acciones}</div>}
    </div>
  );
}
