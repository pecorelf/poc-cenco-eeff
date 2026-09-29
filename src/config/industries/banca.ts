import type { IndustriaPack, NotaDef, LineaDef, CuadroDef } from "../../engine/types";

const L = (id: string, label: string, peso = 1, extra: Partial<LineaDef> = {}): LineaDef => ({ id, label, peso, kind: "line", ...extra });
const cuadro = (id: string, titulo: string, lineas: LineaDef[], comparativo: CuadroDef["comparativo"] = "cierre_anterior"): CuadroDef => ({
  id, titulo, comparativo, tipo: "saldos", lineas: [...lineas, { id: "total", label: "Total", kind: "total" }]
});

const notas: NotaDef[] = [
  { n: 1, titulo: "Información general", tipo: "Texto", fuentes: ["doc_word_anterior"], cuadros: [], documentos: ["D5"],
    textoBase: "{{razon}} es una sociedad anónima bancaria autorizada por la Comisión para el Mercado Financiero, con domicilio en Santiago de Chile.\n\nLos presentes estados financieros consolidados intermedios al {{fecha_cierre}} fueron aprobados por el Directorio en sesión celebrada el {{fecha_directorio}}." },
  { n: 2, titulo: "Principales criterios contables", tipo: "Texto", fuentes: ["doc_word_anterior"], cuadros: [], documentos: ["D5"],
    textoBase: "Los estados financieros han sido preparados de acuerdo con el Compendio de Normas Contables para Bancos emitido por la CMF y, en lo no tratado por éste, con las NIIF. Las políticas son consistentes con las del cierre al {{cierre_anterior}}." },
  { n: 3, titulo: "Efectivo y equivalente de efectivo", tipo: "Automática", fuentes: ["core_saldos"], escala: 3.1e9, caratula: { estado: "ESF", linea: "Efectivo y depósitos en bancos" },
    cuadros: [cuadro("comp", "Composición", [L("caja", "Efectivo", 0.12), L("bcch", "Depósitos en el Banco Central", 0.58), L("bext", "Depósitos en bancos del exterior", 0.3)])] },
  { n: 4, titulo: "Instrumentos financieros para negociación", tipo: "Automática", fuentes: ["core_saldos", "tes_posiciones"], escala: 4.4e9, caratula: { estado: "ESF", linea: "Instrumentos para negociación" },
    cuadros: [cuadro("comp", "Composición", [L("bcch", "Instrumentos del Banco Central", 0.41), L("teso", "Instrumentos de la Tesorería", 0.33), L("otr", "Otros instrumentos", 0.26)])] },
  { n: 5, titulo: "Contratos de derivados financieros", tipo: "Automática", fuentes: ["tes_derivados"], escala: 5.6e9, caratula: { estado: "ESF", linea: "Contratos de derivados financieros" },
    cuadros: [cuadro("comp", "Por tipo de contrato", [L("fw", "Forwards", 0.27), L("sw", "Swaps de tasa", 0.46), L("cc", "Cross currency swaps", 0.23), L("op", "Opciones", 0.04)])] },
  { n: 6, titulo: "Adeudado por bancos", tipo: "Automática", fuentes: ["core_saldos"], escala: 1.2e9, cuadros: [cuadro("comp", "Composición", [L("pais", "Bancos del país", 0.36), L("ext", "Bancos del exterior", 0.64)])] },
  { n: 7, titulo: "Créditos y cuentas por cobrar a clientes", tipo: "Automática", fuentes: ["core_colocaciones", "riesgo_provisiones"], escala: 3.9e10, caratula: { estado: "ESF", linea: "Créditos y cuentas por cobrar a clientes" },
    cuadros: [cuadro("cart", "Por cartera", [L("com", "Colocaciones comerciales", 0.54), L("viv", "Colocaciones para vivienda", 0.33), L("con", "Colocaciones de consumo", 0.16), L("prov", "Provisiones constituidas", -0.03, { editable: true })])] },
  { n: 8, titulo: "Instrumentos de inversión", tipo: "Automática", fuentes: ["tes_posiciones"], escala: 6.8e9, cuadros: [cuadro("comp", "Composición", [L("dv", "Disponibles para la venta", 0.78), L("hv", "Hasta el vencimiento", 0.22)])] },
  { n: 9, titulo: "Intangibles", tipo: "Automática", fuentes: ["core_saldos"], escala: 2.7e8, cuadros: [cuadro("comp", "Composición", [L("sw", "Software y desarrollos", 0.83), L("ot", "Otros intangibles", 0.17)])] },
  { n: 10, titulo: "Activo fijo", tipo: "Automática", fuentes: ["core_saldos"], escala: 3.1e8, cuadros: [cuadro("comp", "Composición", [L("ter", "Terrenos y edificios", 0.62), L("eq", "Equipos", 0.26), L("ot", "Otros", 0.12)])] },
  { n: 11, titulo: "Impuestos corrientes e impuestos diferidos", tipo: "Híbrida", fuentes: ["trib_diferidos"], escala: 6.2e8, cuadros: [cuadro("dif", "Activos por impuestos diferidos", [L("prov", "Provisiones sobre colocaciones", 0.62), L("ot", "Otras diferencias", 0.38, { editable: true })])],
    textoBase: "La tasa legal de impuesto de primera categoría es 27%. Los activos por impuestos diferidos se originan principalmente en provisiones sobre colocaciones." },
  { n: 12, titulo: "Depósitos y otras obligaciones a la vista", tipo: "Automática", fuentes: ["core_captaciones"], escala: 1.3e10, caratula: { estado: "ESF", linea: "Depósitos y otras obligaciones a la vista" },
    cuadros: [cuadro("comp", "Composición", [L("cc", "Cuentas corrientes", 0.71), L("vv", "Otras cuentas a la vista", 0.29)])] },
  { n: 13, titulo: "Depósitos y otras captaciones a plazo", tipo: "Automática", fuentes: ["core_captaciones"], escala: 1.6e10, caratula: { estado: "ESF", linea: "Depósitos y otras captaciones a plazo" },
    cuadros: [cuadro("comp", "Composición", [L("dp", "Depósitos a plazo", 0.92, { editable: true }), L("ah", "Cuentas de ahorro a plazo", 0.08)])] },
  { n: 14, titulo: "Obligaciones con bancos", tipo: "Automática", fuentes: ["core_saldos"], escala: 5.4e9, cuadros: [cuadro("comp", "Composición", [L("bcch", "Banco Central (FCIC)", 0.58), L("ext", "Bancos del exterior", 0.42)])] },
  { n: 15, titulo: "Instrumentos de deuda emitidos", tipo: "Automática", fuentes: ["tes_emisiones"], escala: 9.2e9, caratula: { estado: "ESF", linea: "Instrumentos de deuda emitidos" },
    cuadros: [cuadro("comp", "Composición", [L("bc", "Bonos corrientes", 0.71), L("bs", "Bonos subordinados", 0.21), L("lh", "Letras hipotecarias", 0.08)])] },
  { n: 16, titulo: "Provisiones", tipo: "Automática", fuentes: ["riesgo_provisiones"], escala: 4.3e8, cuadros: [cuadro("comp", "Composición", [L("cont", "Provisiones por créditos contingentes", 0.38), L("adic", "Provisiones adicionales", 0.44, { editable: true }), L("ot", "Otras provisiones", 0.18)])] },
  { n: 17, titulo: "Patrimonio", tipo: "Híbrida", fuentes: ["core_saldos"], escala: 5.2e9, cuadros: [cuadro("comp", "Composición", [L("cap", "Capital", 0.52), L("res", "Reservas", 0.31), L("util", "Utilidades retenidas", 0.17)])],
    textoBase: "El capital autorizado del banco está representado por acciones ordinarias sin valor nominal, íntegramente suscritas y pagadas." },
  { n: 18, titulo: "Ingresos y gastos por intereses y reajustes", tipo: "Automática", fuentes: ["core_resultados"], escala: 2.9e9, caratula: { estado: "ER", linea: "Ingreso neto por intereses y reajustes" },
    cuadros: [cuadro("ing", "Ingresos por intereses", [L("com", "Colocaciones comerciales", 0.49), L("viv", "Colocaciones para vivienda", 0.29), L("con", "Colocaciones de consumo", 0.22)], "mismo_periodo")] },
  { n: 19, titulo: "Ingresos y gastos por comisiones", tipo: "Automática", fuentes: ["core_resultados"], escala: 5.1e8, cuadros: [cuadro("com", "Ingresos por comisiones", [L("tar", "Tarjetas", 0.38), L("cta", "Cuentas corrientes", 0.21), L("seg", "Intermediación de seguros", 0.24), L("ot", "Otras", 0.17)], "mismo_periodo")] },
  { n: 20, titulo: "Gasto por pérdidas crediticias", tipo: "Automática", fuentes: ["riesgo_provisiones"], deps: [7], escala: 6.4e8, cuadros: [cuadro("comp", "Por cartera", [L("com", "Comercial", 0.37), L("viv", "Vivienda", 0.08), L("con", "Consumo", 0.55)], "mismo_periodo")] },
  { n: 21, titulo: "Remuneraciones y gastos del personal", tipo: "Automática", fuentes: ["core_resultados"], escala: 4.7e8, cuadros: [cuadro("comp", "Composición", [L("rem", "Remuneraciones", 0.71), L("bon", "Bonos e incentivos", 0.19), L("ot", "Otros gastos del personal", 0.1)], "mismo_periodo")] },
  { n: 22, titulo: "Contingencias y compromisos", tipo: "Híbrida", fuentes: ["legal_juicios"], escala: 2.2e8, documentos: ["D1"], cuadros: [cuadro("comp", "Créditos contingentes", [L("bol", "Boletas de garantía", 0.44), L("lin", "Líneas de crédito disponibles", 0.56)])],
    textoBase: "Al {{fecha_cierre}} existen juicios pendientes en contra del banco relacionados con operaciones propias del giro. La administración, en base a la opinión de sus asesores legales, estima que no se producirán pérdidas significativas no provisionadas." },
  { n: 23, titulo: "Sanciones", tipo: "Texto", fuentes: ["doc_hechos"], cuadros: [], documentos: ["D2"], textoBase: "Durante el periodo, el banco y sus administradores no han sido objeto de sanciones por parte de la CMF." },
  { n: 24, titulo: "Hechos posteriores", tipo: "Texto", fuentes: ["doc_hechos"], cuadros: [], documentos: ["D3"], textoBase: "Entre el {{fecha_cierre}} y la fecha de emisión de estos estados financieros no han ocurrido hechos posteriores significativos." }
];

export const banca: IndustriaPack = {
  id: "banca",
  nombre: "Banca",
  descripcion: "Banco comercial con cartera de colocaciones, captaciones y tesorería, bajo el Compendio de Normas Contables de la CMF.",
  clientes: ["bancochile", "santander", "bci", "bancoestado"],
  notas,
  cuentaPrefijos: { "1": "Activos", "2": "Pasivos", "3": "Patrimonio", "4": "Ingresos", "5": "Gastos" },
  fuentes: [
    { id: "core_saldos", nombre: "Core bancario · Balance de saldos", tipo: "integrada", origen: "Data Lake · Core", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 31220 },
    { id: "core_colocaciones", nombre: "Core bancario · Cartera de colocaciones", tipo: "integrada", origen: "Data Lake · Core", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 1840330 },
    { id: "core_captaciones", nombre: "Core bancario · Captaciones", tipo: "integrada", origen: "Data Lake · Core", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 922410 },
    { id: "core_resultados", nombre: "Core bancario · Resultados", tipo: "integrada", origen: "Data Lake · Core", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 18760 },
    { id: "tes_posiciones", nombre: "Tesorería · Posiciones de inversión", tipo: "integrada", origen: "Data Lake · Murex", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 6120 },
    { id: "tes_derivados", nombre: "Tesorería · Cartera de derivados", tipo: "integrada", origen: "Data Lake · Murex", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 14480 },
    { id: "tes_emisiones", nombre: "Tesorería · Emisiones de deuda", tipo: "integrada", origen: "Data Lake · Murex", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 214 },
    { id: "homolog", nombre: "Tabla de homologación cuenta → línea de nota", tipo: "integrada", origen: "Maestros de la plataforma", formato: "Maestro", obligatoriedad: "Obligatoria", responsable: "u_admin", registros: 2210 },
    { id: "riesgo_provisiones", nombre: "Riesgo · Provisiones por riesgo de crédito", tipo: "manual", origen: "Gerencia de Riesgo", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota1" },
    { id: "trib_diferidos", nombre: "Tributaria · Diferencias temporarias", tipo: "manual", origen: "Gerencia Tributaria", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota1" },
    { id: "legal_juicios", nombre: "Fiscalía · Juicios y contingencias", tipo: "manual", origen: "Fiscalía", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "doc_hechos", nombre: "Hechos esenciales publicados a la CMF", tipo: "manual", origen: "Gerencia Legal", formato: "PDF", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "doc_word_anterior", nombre: "Notas del periodo anterior (Word)", tipo: "manual", origen: "Contabilidad", formato: "Word", obligatoriedad: "Obligatoria", responsable: "u_proceso" }
  ],
  documentos: [
    { id: "D1", nombre: "Informe de Fiscalía · Juicios vigentes", tipo: "Carta de abogados", notas: [22], resumen: "Informa 312 juicios vigentes vinculados a operaciones del giro, sin contingencias significativas no provisionadas." },
    { id: "D2", nombre: "Hecho esencial · Emisión de bonos senior", tipo: "Hecho esencial CMF", notas: [15, 23], resumen: "Colocación de bonos senior por UF 3.000.000. Sin sanciones informadas." },
    { id: "D3", nombre: "Hecho esencial · Renuncia de director", tipo: "Hecho esencial CMF", notas: [24], resumen: "Con fecha posterior al cierre, un director presentó su renuncia; el Directorio designará reemplazante." },
    { id: "D5", nombre: "Notas del periodo anterior (Word)", tipo: "Word periodo anterior", notas: [1, 2, 23, 24], resumen: "Texto aprobado del periodo comparativo." }
  ],
  cruzadas: [
    { id: "x1", a: 20, b: 7, nombre: "Nota 20 gasto por pérdidas crediticias vs variación de provisiones Nota 7" },
    { id: "x2", a: 11, b: 16, nombre: "Nota 11 diferidos por provisiones vs Nota 16" }
  ],
  informes: [
    { id: "cmf", nombre: "Estados financieros intermedios CMF", formato: "Word / PDF", descripcion: "Estados financieros consolidados y notas según Compendio de Normas Contables para Bancos." },
    { id: "xbrl", nombre: "Archivo XBRL", formato: "XBRL (taxonomía CMF bancos)", descripcion: "Cifras aprobadas mapeadas a la taxonomía bancaria de la CMF." },
    { id: "i555", nombre: "Archivo MB1 / MR1", formato: "Texto CMF", descripcion: "Archivos normativos de balance y resultados para el Manual de Sistemas de Información." }
  ],
  glosario: [{ termino: "Compendio", def: "Compendio de Normas Contables para Bancos de la CMF." }]
};
