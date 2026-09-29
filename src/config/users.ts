import type { UsuarioDef } from "../engine/types";

// Usuarios de demo. Genéricos: el dominio del correo se toma del cliente activo.
export const USUARIOS: UsuarioDef[] = [
  { id: "u_proceso", nombre: "María José Riquelme", cargo: "Subgerente de Contabilidad Corporativa", perfiles: ["proceso", "nota"], iniciales: "MR" },
  { id: "u_nota1", nombre: "Rodrigo Valenzuela", cargo: "Jefe de Consolidación", perfiles: ["nota"], iniciales: "RV" },
  { id: "u_nota2", nombre: "Camila Fuentes", cargo: "Analista Senior de Reportabilidad", perfiles: ["nota", "carga"], iniciales: "CF" },
  { id: "u_carga", nombre: "Tomás Araya", cargo: "Analista de Datos Financieros", perfiles: ["carga"], iniciales: "TA" },
  { id: "u_aprob", nombre: "Patricia Soto", cargo: "Gerente de Contabilidad", perfiles: ["aprobador", "consulta"], iniciales: "PS" },
  { id: "u_audit", nombre: "Ignacio Herrera", cargo: "Socio de auditoría externa", perfiles: ["auditor"], iniciales: "IH" },
  { id: "u_dir", nombre: "Carlos Mena", cargo: "Gerente de Finanzas Corporativas · Directorio", perfiles: ["directorio"], iniciales: "CM" },
  { id: "u_admin", nombre: "Sebastián Rojas", cargo: "Administrador TI Finanzas", perfiles: ["admin", "consulta"], iniciales: "SR" },
  { id: "u_consulta", nombre: "Valentina Pérez", cargo: "Relación con Inversionistas", perfiles: ["consulta"], iniciales: "VP" }
];

export const usuario = (id: string) => USUARIOS.find((u) => u.id === id) ?? USUARIOS[0];
export const correo = (id: string, dominio: string) => {
  const u = usuario(id);
  const [n, a] = u.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(" ");
  return `${n}.${a}@${dominio}`;
};
