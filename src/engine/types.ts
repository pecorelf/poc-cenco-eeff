// Tipos del motor. Agnósticos de cliente e industria.

export type Perfil =
  | "admin"
  | "proceso"
  | "carga"
  | "nota"
  | "aprobador"
  | "auditor"
  | "directorio"
  | "consulta";

export const PERFIL_NOMBRE: Record<Perfil, string> = {
  admin: "Administrador del sistema",
  proceso: "Responsable del proceso",
  carga: "Responsable de carga",
  nota: "Responsable de nota",
  aprobador: "Aprobador de notas",
  auditor: "Auditor externo",
  directorio: "Gerencia – Directorio",
  consulta: "Consulta"
};

export type TipoNota = "Automática" | "Híbrida" | "Texto";

export type EstadoNota =
  | "Pendiente de fuentes"
  | "Lista para generar"
  | "Borrador"
  | "Lista para revisión"
  | "En corrección"
  | "Aprobada";

export const ESTADOS_NOTA: EstadoNota[] = [
  "Pendiente de fuentes",
  "Lista para generar",
  "Borrador",
  "En corrección",
  "Lista para revisión",
  "Aprobada"
];

export type EstadoEjercicio =
  | "Creado"
  | "En carga"
  | "En generación"
  | "En pre-aprobación"
  | "En revisión auditoría"
  | "En aprobación Directorio"
  | "Aprobado"
  | "Emitido"
  | "Cerrado";

export const ESTADOS_EJERCICIO: EstadoEjercicio[] = [
  "Creado",
  "En carga",
  "En generación",
  "En pre-aprobación",
  "En revisión auditoría",
  "En aprobación Directorio",
  "Aprobado",
  "Emitido",
  "Cerrado"
];

export type EstadoFuente = "Pendiente" | "Cargada" | "Con errores" | "Validada" | "Habilitada";

// ---------- Definiciones del pack de industria ----------

export interface LineaDef {
  id: string;
  label: string;
  kind?: "line" | "subtotal" | "total";
  peso?: number; // participación relativa dentro del total del cuadro
  signo?: 1 | -1;
  editable?: boolean; // celda habilitada para ajuste manual
}

export interface CuadroDef {
  id: string;
  titulo: string;
  comparativo: "cierre_anterior" | "mismo_periodo"; // periodo actual vs cierre año anterior o mismo periodo año anterior
  tipo?: "saldos" | "movimiento";
  lineas: LineaDef[];
}

export interface NotaDef {
  n: number;
  titulo: string;
  tipo: TipoNota;
  fuentes: string[]; // ids del catálogo de fuentes
  deps?: number[];
  caratula?: { estado: "ESF" | "ER"; linea: string };
  escala?: number; // tamaño relativo del total del cuadro principal (M$)
  cuadros: CuadroDef[];
  vistas?: string[];
  textoBase?: string; // texto estándar con variables {{...}}
  documentos?: string[]; // documentos que alimentan el agente de texto
}

export interface FuenteDef {
  id: string;
  nombre: string;
  tipo: "integrada" | "manual";
  origen: string; // Data Lake · BPC, SAP, pack país, área
  formato: string;
  obligatoriedad: "Obligatoria" | "Opcional" | "Deseable";
  responsable: string; // id de usuario
  registros?: number;
}

export interface DocumentoDef {
  id: string;
  nombre: string;
  tipo: string;
  notas: number[];
  resumen: string;
}

export interface CruzadaDef {
  id: string;
  a: number;
  b: number;
  nombre: string;
}

export interface UsuarioDef {
  id: string;
  nombre: string;
  cargo: string;
  perfiles: Perfil[];
  iniciales: string;
}

export interface Sociedad {
  id: string;
  nombre: string;
  rut: string;
  escala: number; // multiplicador de montos
}

export interface IndustriaPack {
  id: string;
  nombre: string;
  descripcion: string;
  clientes: string[]; // ids de clientes base
  notas: NotaDef[];
  fuentes: FuenteDef[];
  documentos: DocumentoDef[];
  cruzadas: CruzadaDef[];
  informes: { id: string; nombre: string; formato: string; descripcion: string }[];
  glosario: { termino: string; def: string }[];
  cuentaPrefijos: Record<string, string>; // prefijo → rubro
}

export interface ClienteConfig {
  id: string;
  nombre: string;
  industria: string;
  dominio: string;
  colores: { primario: string; secundario: string; acento: string };
  sociedades: Sociedad[];
  auditora: string;
  logo?: string; // dataURL subido en /admin
}

// ---------- Estado de runtime ----------

export interface Cuenta {
  codigo: string;
  nombre: string;
  pesos: number; // pesos chilenos
  pesosComp: number;
  nueva?: boolean;
}

export interface LineaCalc {
  id: string;
  label: string;
  kind: "line" | "subtotal" | "total";
  actual: number; // M$
  comp: number; // M$
  trim?: number; // M$ del trimestre (solo cuadros de resultado)
  ajuste?: number; // M$ ajuste manual confirmado incluido en actual
  cuentas: Cuenta[];
  editable: boolean;
  origen: "C480" | "manual" | "nota" | "calculo";
  origenDetalle: string;
}

export interface CuadroCalc {
  id: string;
  titulo: string;
  comparativo: "cierre_anterior" | "mismo_periodo";
  lineas: LineaCalc[];
}

export interface Control {
  id: string;
  nombre: string;
  tipo: "caratula" | "suma" | "movimiento" | "cruzada" | "moneda";
  bloqueante: boolean;
  esperado: number;
  obtenido: number;
  dif: number;
  detalle: string;
}

export interface Ajuste {
  id: string;
  cuadro: string;
  linea: string;
  monto: number; // M$
  justificacion: string;
  usuario: string;
  fecha: string;
  estado: "provisorio" | "confirmado" | "descartado";
}

export interface Comentario {
  id: string;
  nota: number | null;
  celda?: { cuadro: string; linea: string };
  autor: string;
  instancia: "Pre-aprobación" | "Auditoría" | "Directorio";
  fecha: string;
  texto: string;
  estado: "abierto" | "resuelto";
  respuestas: { autor: string; fecha: string; texto: string }[];
}

export interface VersionNota {
  v: number;
  fecha: string;
  usuario: string;
  motivo: string;
  total: number;
  estado: EstadoNota;
  texto?: string;
  snapshot: { c: string; l: string; label: string; a: number }[];
}

export interface NotaRun {
  n: number;
  estado: EstadoNota;
  responsable: string;
  diasEnEstado: number;
  version: number;
  generada: boolean;
  desactualizada: boolean;
  cuadros: CuadroCalc[];
  controles: Control[];
  ajustes: Ajuste[];
  texto?: string;
  textoAceptado: boolean;
  versiones: VersionNota[];
  versionAprobada?: number;
  enviadaEl?: string;
}

export interface FuenteRun {
  id: string;
  estado: EstadoFuente;
  version: number;
  ultimaActualizacion?: string;
  registros?: number;
  cargadoPor?: string;
  errores?: { fila: number; columna: string; regla: string; bloqueante: boolean }[];
  versiones: { v: number; fecha: string; usuario: string; archivo: string; resultado: string }[];
}

export interface Hito {
  id: string;
  nombre: string;
  dh: number; // día hábil desde el cierre
  fecha: string; // ISO
  track: string;
}

export interface EventoLog {
  id: string;
  fecha: string;
  usuario: string;
  perfil: string;
  ejercicio: string;
  track: string;
  objeto: string;
  accion: string;
  antes?: string;
  despues?: string;
  version?: string;
  justificacion?: string;
}

export interface InformeRun {
  id: string;
  nombre: string;
  formato: string;
  version: number;
  uid: string;
  fecha: string;
  usuario: string;
  publicado: boolean;
}

export interface Ejercicio {
  id: string;
  anio: number;
  trimestre: 1 | 2 | 3 | 4;
  periodo: string; // "3T 2026"
  fechaCierre: string; // ISO
  sociedad: string; // id
  estado: EstadoEjercicio;
  responsable: string;
  creado: string;
  aprobadoEl?: string;
  parametros: {
    uf: number;
    usdCierre: number;
    usdPromedio: number[];
    homologacion: string;
    version: number;
  };
  hitos: Hito[];
  notas: NotaRun[];
  fuentes: FuenteRun[];
  caratula: Record<number, number>;
  homologacionPendiente: { cuenta: string; nombre: string; monto: number; nota: number; sugerida: string; asignada?: string }[];
  comentarios: Comentario[];
  preinforme?: { version: number; fecha: string; revisionAgente?: string };
  consolidadoPreaprobado: boolean;
  auditoria: { estado: "no iniciada" | "en revisión" | "cerrada con observaciones" | "cerrada"; cerradaEl?: string };
  directorio: { estado: "no enviado" | "en revisión" | "devuelto" | "aprobado"; acta?: { nivel: string; nombre: string; fecha: string; version: string }[] };
  informes: InformeRun[];
  historico?: boolean;
}
