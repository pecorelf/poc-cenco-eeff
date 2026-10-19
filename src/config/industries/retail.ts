import type { IndustriaPack, NotaDef, LineaDef, CuadroDef } from "../../engine/types";

// Helpers de definición compacta
const L = (id: string, label: string, peso = 1, extra: Partial<LineaDef> = {}): LineaDef => ({ id, label, peso, kind: "line", ...extra });
const cuadro = (id: string, titulo: string, lineas: LineaDef[], comparativo: CuadroDef["comparativo"] = "cierre_anterior", tipo: CuadroDef["tipo"] = "saldos"): CuadroDef => ({
  id,
  titulo,
  comparativo,
  tipo,
  lineas: [...lineas, { id: "total", label: "Total", kind: "total" }]
});
const mov = (id: string, titulo: string): CuadroDef => ({
  id,
  titulo,
  comparativo: "cierre_anterior",
  tipo: "movimiento",
  lineas: [
    { id: "si", label: "Saldo inicial", kind: "line", peso: 1 },
    { id: "adic", label: "Adiciones", kind: "line", peso: 0.09, editable: true },
    { id: "bajas", label: "Bajas y retiros", kind: "line", peso: -0.015, editable: true },
    { id: "dep", label: "Depreciación / amortización del periodo", kind: "line", peso: -0.05 },
    { id: "conv", label: "Diferencias de conversión", kind: "line", peso: 0.012, editable: true },
    { id: "total", label: "Saldo final", kind: "total" }
  ]
});

const notas: NotaDef[] = [
  {
    n: 1, titulo: "Información general", tipo: "Texto", fuentes: ["doc_word_anterior", "doc_actas"], cuadros: [], documentos: ["D1", "D5"],
    textoBase:
      "{{razon}} (en adelante, la Sociedad) es una sociedad anónima abierta, inscrita en el Registro de Valores de la Comisión para el Mercado Financiero bajo el N° 743. Su domicilio legal es Av. Kennedy 9001, piso 4, Las Condes, Santiago de Chile.\n\nLos presentes estados financieros consolidados intermedios al {{fecha_cierre}} fueron aprobados por el Directorio en sesión celebrada el {{fecha_directorio}}.\n\nAl {{fecha_cierre}} la Sociedad y sus filiales cuentan con una dotación de {{dotacion}} trabajadores, distribuidos en Chile, Argentina, Brasil, Perú y Colombia."
  },
  {
    n: 2, titulo: "Resumen de principales políticas contables", tipo: "Texto", fuentes: ["doc_word_anterior"], cuadros: [], documentos: ["D5"],
    textoBase:
      "Los estados financieros consolidados intermedios al {{fecha_cierre}} han sido preparados de acuerdo con la NIC 34 Información Financiera Intermedia, incorporada en las Normas Internacionales de Información Financiera (NIIF) emitidas por el International Accounting Standards Board (IASB).\n\nLas políticas contables aplicadas son consistentes con las utilizadas en los estados financieros consolidados anuales al {{cierre_anterior}}, excepto por la adopción de las enmiendas vigentes a contar del 1 de enero de {{anio}}, que no tuvieron efectos significativos."
  },
  {
    n: 3, titulo: "Gestión del riesgo financiero", tipo: "Híbrida", fuentes: ["bpc_c480", "fin_derivados", "sap_zfi862"], escala: 4.6e9,
    cuadros: [cuadro("liquidez", "Vencimientos de pasivos financieros", [L("m1", "Hasta 1 año", 0.18), L("m2", "1 a 3 años", 0.27), L("m3", "3 a 5 años", 0.24), L("m4", "Más de 5 años", 0.31)])],
    textoBase:
      "La Sociedad está expuesta a riesgo de mercado (tipo de cambio, tasa de interés e inflación), riesgo de crédito y riesgo de liquidez. La administración de estos riesgos se realiza conforme a la Política de Gestión de Riesgos Financieros aprobada por el Directorio.\n\nAl {{fecha_cierre}} los pasivos financieros con vencimiento menor a un año ascienden a {{m1}}, cubiertos por la caja disponible y líneas comprometidas no utilizadas."
  },
  {
    n: 4, titulo: "Estimaciones y juicios contables críticos", tipo: "Híbrida", fuentes: ["bpc_c480", "fin_deuda"], escala: 2.7e9, vistas: ["Sensibilización de tasas"],
    cuadros: [cuadro("deterioro", "Pruebas de deterioro por unidad generadora de efectivo", [L("ch", "Supermercados Chile", 0.34), L("ar", "Supermercados Argentina", 0.12), L("br", "Supermercados Brasil", 0.22), L("pe", "Supermercados Perú", 0.1), L("co", "Supermercados Colombia", 0.08), L("sc", "Centros comerciales", 0.14)])],
    textoBase: "La preparación de los estados financieros requiere estimaciones. Las más relevantes se refieren al deterioro de la plusvalía, la vida útil de propiedades, planta y equipo y el valor razonable de las propiedades de inversión. Una variación de 50 pb en la tasa de descuento no genera deterioro al {{fecha_cierre}}."
  },
  { n: 5, titulo: "Efectivo y equivalentes al efectivo", tipo: "Automática", fuentes: ["bpc_c480", "pack_ar", "pack_br"], escala: 1.12e9, caratula: { estado: "ESF", linea: "Efectivo y equivalentes al efectivo" },
    cuadros: [cuadro("comp", "Composición", [L("caja", "Efectivo en caja", 0.08), L("banco", "Saldos en bancos", 0.37, { editable: true }), L("dep", "Depósitos a plazo", 0.41), L("fm", "Fondos mutuos", 0.14)]), cuadro("mon", "Por moneda", [L("clp", "Peso chileno", 0.44), L("usd", "Dólar estadounidense", 0.21), L("ars", "Peso argentino", 0.09), L("brl", "Real brasileño", 0.13), L("pen", "Nuevo sol peruano", 0.07), L("cop", "Peso colombiano", 0.06)])] },
  { n: 6, titulo: "Otros activos financieros", tipo: "Automática", fuentes: ["bpc_c480", "fin_derivados"], escala: 3.9e8, caratula: { estado: "ESF", linea: "Otros activos financieros corrientes" },
    cuadros: [cuadro("comp", "Composición", [L("cob", "Derivados de cobertura", 0.52), L("neg", "Derivados de negociación", 0.11), L("inv", "Inversiones a costo amortizado", 0.37)])] },
  { n: 7, titulo: "Otros activos no financieros", tipo: "Automática", fuentes: ["bpc_c480"], escala: 1.6e8, cuadros: [cuadro("comp", "Composición", [L("seg", "Seguros pagados por anticipado", 0.21), L("arr", "Arriendos anticipados", 0.33), L("ot", "Otros gastos anticipados", 0.46, { editable: true })])] },
  { n: 8, titulo: "Deudores comerciales y otras cuentas por cobrar", tipo: "Automática", fuentes: ["bpc_c480", "sap_fbl3n", "pack_ar", "pack_pe"], escala: 1.31e9, caratula: { estado: "ESF", linea: "Deudores comerciales y otras cuentas por cobrar" },
    cuadros: [cuadro("comp", "Composición", [L("tc", "Deudores tarjetas de crédito", 0.38), L("dv", "Deudores por ventas", 0.29), L("dc", "Documentos por cobrar", 0.12), L("od", "Otros deudores", 0.26), L("est", "Estimación de incobrables", -0.05, { editable: true })]), cuadro("ven", "Por tramo de vencimiento", [L("v0", "Vigentes", 0.78), L("v30", "1 a 30 días", 0.1), L("v90", "31 a 90 días", 0.07), L("v91", "Más de 90 días", 0.05)])] },
  { n: 9, titulo: "Saldos y transacciones con entidades relacionadas", tipo: "Híbrida", fuentes: ["bpc_c480", "sap_fbl3n"], escala: 4.1e7, cuadros: [cuadro("cxc", "Cuentas por cobrar a entidades relacionadas", [L("r1", "Asociadas y negocios conjuntos", 0.54), L("r2", "Directores y ejecutivos", 0.03), L("r3", "Otras partes relacionadas", 0.43)])],
    textoBase: "Las transacciones con entidades relacionadas se realizan en condiciones de mercado. Durante el periodo no se constituyeron provisiones por deudas de dudoso cobro con partes relacionadas." },
  { n: 10, titulo: "Inventarios", tipo: "Automática", fuentes: ["bpc_c480", "pack_br"], escala: 2.43e9, caratula: { estado: "ESF", linea: "Inventarios" }, cuadros: [cuadro("comp", "Composición", [L("mer", "Mercaderías para la venta", 0.83), L("tra", "Mercaderías en tránsito", 0.09), L("ins", "Suministros e insumos", 0.05), L("pro", "Provisión de obsolescencia", -0.03, { editable: true })])] },
  { n: 11, titulo: "Activos y pasivos por impuestos corrientes", tipo: "Automática", fuentes: ["bpc_c480", "sap_tax"], escala: 2.2e8, cuadros: [cuadro("comp", "Activos por impuestos corrientes", [L("ppm", "Pagos provisionales mensuales", 0.61), L("cre", "Créditos por gastos de capacitación", 0.04), L("iva", "IVA crédito fiscal remanente", 0.35)])] },
  { n: 12, titulo: "Inversiones contabilizadas por el método de la participación", tipo: "Automática", fuentes: ["bpc_c480"], escala: 2.9e8, cuadros: [cuadro("comp", "Detalle de inversiones", [L("i1", "Negocio conjunto servicios financieros Chile", 0.47), L("i2", "Negocio conjunto servicios financieros Perú", 0.21), L("i3", "Asociada inmobiliaria Colombia", 0.32)])] },
  { n: 13, titulo: "Activos intangibles distintos de la plusvalía", tipo: "Automática", fuentes: ["bpc_c480", "bpc_c410"], escala: 9.2e8, caratula: { estado: "ESF", linea: "Activos intangibles distintos de la plusvalía" }, cuadros: [mov("mov", "Movimiento de activos intangibles")] },
  { n: 14, titulo: "Plusvalía", tipo: "Automática", fuentes: ["bpc_c480"], escala: 2.71e9, caratula: { estado: "ESF", linea: "Plusvalía" }, cuadros: [cuadro("ugc", "Plusvalía por unidad generadora de efectivo", [L("ch", "Supermercados Chile", 0.31), L("ar", "Supermercados Argentina", 0.09), L("br", "Supermercados Brasil", 0.33), L("pe", "Supermercados Perú", 0.14), L("co", "Supermercados Colombia", 0.13)])] },
  { n: 15, titulo: "Propiedades, planta y equipo", tipo: "Automática", fuentes: ["bpc_c480", "bpc_c410", "sap_ksb1"], escala: 5.24e9, caratula: { estado: "ESF", linea: "Propiedades, planta y equipo" }, cuadros: [mov("mov", "Movimiento de propiedades, planta y equipo"), cuadro("clase", "Por clase de activo", [L("ter", "Terrenos", 0.24), L("edi", "Edificios", 0.39), L("ins", "Instalaciones", 0.19), L("maq", "Maquinaria y equipos", 0.12), L("obr", "Obras en curso", 0.06)])] },
  { n: 16, titulo: "Impuestos diferidos", tipo: "Híbrida", fuentes: ["bpc_c480", "trib_diferidos"], escala: 6.1e8, caratula: { estado: "ESF", linea: "Activos por impuestos diferidos" }, cuadros: [cuadro("dif", "Activos por impuestos diferidos", [L("pt", "Pérdidas tributarias", 0.44), L("prov", "Provisiones", 0.21), L("arr", "Arrendamientos NIIF 16", 0.26), L("ot", "Otras diferencias temporarias", 0.09, { editable: true })])],
    textoBase: "Los activos por impuestos diferidos se reconocen en la medida que sea probable disponer de utilidades tributarias futuras. Al {{fecha_cierre}} las pérdidas tributarias de filiales en Argentina y Perú se consideran recuperables." },
  { n: 17, titulo: "Otros pasivos financieros", tipo: "Automática", fuentes: ["bpc_c480", "sap_zfi862", "fin_deuda"], escala: 4.83e9, caratula: { estado: "ESF", linea: "Otros pasivos financieros" }, cuadros: [cuadro("comp", "Composición", [L("bon", "Bonos corporativos", 0.64), L("pre", "Préstamos bancarios", 0.27), L("der", "Derivados", 0.04), L("ot", "Otros", 0.05)]), cuadro("mon", "Por moneda", [L("uf", "Unidad de Fomento", 0.46), L("usd", "Dólar estadounidense", 0.39), L("clp", "Peso chileno", 0.15)])] },
  { n: 18, titulo: "Cuentas por pagar comerciales y otras cuentas por pagar", tipo: "Automática", fuentes: ["bpc_c480", "sap_fbl3n", "pack_ar", "pack_co"], escala: 3.92e9, caratula: { estado: "ESF", linea: "Cuentas por pagar comerciales y otras cuentas por pagar" },
    cuadros: [cuadro("comp", "Composición", [L("pn", "Proveedores nacionales", 0.58, { editable: true }), L("pe", "Proveedores extranjeros", 0.17, { editable: true }), L("dp", "Documentos por pagar", 0.09), L("rem", "Remuneraciones por pagar", 0.07), L("ot", "Otras cuentas por pagar", 0.09)])] },
  { n: 19, titulo: "Otras provisiones", tipo: "Automática", fuentes: ["bpc_c480", "legal_juicios"], escala: 1.9e8, cuadros: [cuadro("comp", "Composición", [L("leg", "Provisión por juicios", 0.46, { editable: true }), L("reest", "Reestructuración", 0.11), L("ot", "Otras provisiones", 0.43)])] },
  { n: 20, titulo: "Beneficios a los empleados", tipo: "Automática", fuentes: ["bpc_c480", "rrhh_beneficios", "pack_ar"], escala: 3.4e8, cuadros: [cuadro("comp", "Composición", [L("vac", "Vacaciones", 0.39), L("bon", "Bonos e incentivos", 0.33), L("ias", "Indemnización por años de servicio", 0.28)])] },
  { n: 21, titulo: "Otros pasivos no financieros", tipo: "Automática", fuentes: ["bpc_c480"], escala: 2.3e8, cuadros: [cuadro("comp", "Composición", [L("ing", "Ingresos diferidos", 0.36), L("gc", "Gift cards por redimir", 0.29), L("prog", "Programa de fidelización", 0.35)])] },
  { n: 22, titulo: "Propiedades de inversión", tipo: "Automática", fuentes: ["bpc_c480", "inmob_tasaciones"], escala: 4.34e9, caratula: { estado: "ESF", linea: "Propiedades de inversión" }, cuadros: [cuadro("pais", "Por país", [L("ch", "Chile", 0.63), L("ar", "Argentina", 0.09), L("pe", "Perú", 0.14), L("co", "Colombia", 0.14)])] },
  { n: 23, titulo: "Arrendamientos", tipo: "Automática", fuentes: ["bpc_c480", "sap_recesh"], escala: 2.14e9, cuadros: [cuadro("dru", "Activos por derecho de uso", [L("loc", "Locales comerciales", 0.71), L("cd", "Centros de distribución", 0.22), L("ot", "Otros", 0.07)])] },
  { n: 24, titulo: "Patrimonio", tipo: "Híbrida", fuentes: ["bpc_c480"], deps: [28], escala: 7.1e9, cuadros: [cuadro("comp", "Composición del patrimonio", [L("cap", "Capital emitido", 0.34), L("res", "Resultados acumulados", 0.56), L("otr", "Otras reservas", 0.1)])],
    textoBase: "Al {{fecha_cierre}} el capital emitido y pagado está representado por acciones ordinarias sin valor nominal. La Junta Ordinaria de Accionistas acordó distribuir dividendos definitivos con cargo a las utilidades del ejercicio anterior." },
  { n: 25, titulo: "Ingresos de actividades ordinarias", tipo: "Automática", fuentes: ["bpc_c480", "bw_ventas"], escala: 1.21e10, caratula: { estado: "ER", linea: "Ingresos de actividades ordinarias" }, cuadros: [cuadro("seg", "Ingresos por segmento", [L("sm", "Supermercados", 0.72), L("mi", "Mejoramiento del hogar", 0.13), L("td", "Tiendas por departamento", 0.1), L("cc", "Centros comerciales", 0.03), L("sf", "Servicios financieros", 0.02)], "mismo_periodo")] },
  { n: 26, titulo: "Gasto por impuesto a las ganancias", tipo: "Híbrida", fuentes: ["bpc_c480", "trib_tasa", "sap_tax"], deps: [16], escala: 1.8e8, caratula: { estado: "ER", linea: "Gasto por impuestos a las ganancias" }, vistas: ["Conciliación de tasa en moneda local"],
    cuadros: [cuadro("comp", "Composición del gasto", [L("cor", "Impuesto corriente", 0.72), L("dif", "Impuesto diferido", 0.28, { editable: true })], "mismo_periodo")],
    textoBase: "La tasa efectiva del periodo difiere de la tasa legal de 27% principalmente por diferencias de tasa en filiales extranjeras y efectos de la inflación sobre el capital propio tributario." },
  { n: 27, titulo: "Ganancias por acción", tipo: "Automática", fuentes: ["bpc_c480"], deps: [1, 33], escala: 2.8e8, cuadros: [cuadro("gpa", "Ganancia por acción básica", [L("res", "Resultado atribuible a controladores", 1)], "mismo_periodo")] },
  { n: 28, titulo: "Otras reservas y resultados acumulados", tipo: "Automática", fuentes: ["bpc_c480"], escala: 3.9e9, cuadros: [cuadro("comp", "Movimiento de resultados acumulados", [L("si", "Saldo inicial", 0.93), L("res", "Resultado del periodo", 0.07), L("div", "Dividendos", -0.03), L("ot", "Otros movimientos", 0.03)])] },
  { n: 29, titulo: "Contingencias, juicios y garantías", tipo: "Híbrida", fuentes: ["legal_juicios", "doc_cartas"], escala: 6.2e7, documentos: ["D1", "D2", "D3"],
    cuadros: [cuadro("jui", "Juicios por materia", [L("lab", "Laborales", 0.41), L("civ", "Civiles", 0.23), L("trib", "Tributarios", 0.29), L("cons", "Protección al consumidor", 0.07)])],
    textoBase:
      "Al {{fecha_cierre}} la Sociedad y sus filiales mantienen juicios y contingencias por un monto total estimado de {{total}}, de los cuales se ha provisionado lo que la administración y sus asesores legales estiman como pérdida probable.\n\nEn materia tributaria, la filial en Argentina mantiene una controversia con la administración fiscal por la deducibilidad de gastos del ejercicio 2021. Los asesores legales estiman que existen argumentos sólidos para obtener un resultado favorable.\n\nEn materia de protección al consumidor, se mantienen 12 causas colectivas vigentes ante el SERNAC, sin sentencias desfavorables a la fecha."
  },
  { n: 30, titulo: "Costo de ventas y gastos por naturaleza", tipo: "Automática", fuentes: ["bpc_c480", "sap_ksb1"], escala: 8.81e9, caratula: { estado: "ER", linea: "Costo de ventas" }, cuadros: [cuadro("nat", "Gastos por naturaleza", [L("cv", "Costo de mercaderías", 0.78), L("rem", "Remuneraciones", 0.11), L("dep", "Depreciaciones y amortizaciones", 0.05), L("ser", "Servicios básicos", 0.02), L("ot", "Otros gastos", 0.04, { editable: true })], "mismo_periodo")] },
  { n: 31, titulo: "Otras ganancias (pérdidas)", tipo: "Automática", fuentes: ["bpc_c480"], escala: 4.5e7, cuadros: [cuadro("comp", "Composición", [L("rev", "Revalorización propiedades de inversión", 0.62), L("vta", "Resultado en venta de activos", 0.21), L("ot", "Otros", 0.17)], "mismo_periodo")] },
  { n: 32, titulo: "Ingresos y costos financieros", tipo: "Automática", fuentes: ["bpc_c480", "sap_zfi862"], escala: 3.6e8, caratula: { estado: "ER", linea: "Costos financieros" }, cuadros: [cuadro("cf", "Costos financieros", [L("bon", "Intereses por bonos", 0.52), L("pre", "Intereses por préstamos bancarios", 0.19), L("arr", "Intereses por arrendamientos", 0.24), L("ot", "Otros costos financieros", 0.05)], "mismo_periodo")] },
  { n: 33, titulo: "Información por segmentos", tipo: "Automática", fuentes: ["bpc_c480", "seg_info", "bw_ventas"], escala: 1.21e10, cuadros: [cuadro("pais", "Ingresos por país", [L("ch", "Chile", 0.47), L("ar", "Argentina", 0.14), L("br", "Brasil", 0.19), L("pe", "Perú", 0.1), L("co", "Colombia", 0.1)], "mismo_periodo")] },
  { n: 34, titulo: "Activos no corrientes mantenidos para la venta", tipo: "Automática", fuentes: ["bpc_c480"], escala: 3.8e7, vistas: ["Detalle de activos mantenidos para la venta"], cuadros: [cuadro("comp", "Composición", [L("ter", "Terrenos", 0.58), L("edi", "Edificios", 0.42)])] },
  { n: 35, titulo: "Moneda extranjera", tipo: "Automática", fuentes: ["bpc_c480"], deps: [6, 17, 18], escala: 2.9e9, vistas: ["Vista de moneda extranjera"], cuadros: [cuadro("act", "Activos y pasivos en moneda extranjera", [L("usd", "Dólar estadounidense", 0.46), L("ars", "Peso argentino", 0.12), L("brl", "Real brasileño", 0.2), L("pen", "Nuevo sol peruano", 0.11), L("cop", "Peso colombiano", 0.11)])] },
  { n: 36, titulo: "Medio ambiente", tipo: "Automática", fuentes: ["medioambiente"], escala: 6.4e6, cuadros: [cuadro("des", "Desembolsos del periodo", [L("res", "Gestión de residuos", 0.44), L("ene", "Eficiencia energética", 0.39), L("ref", "Refrigerantes", 0.17)], "mismo_periodo")] },
  { n: 37, titulo: "Sanciones", tipo: "Texto", fuentes: ["doc_hechos"], cuadros: [], documentos: ["D2"],
    textoBase: "Durante el periodo terminado al {{fecha_cierre}}, la Sociedad, sus Directores y Administradores no han sido objeto de sanciones por parte de la Comisión para el Mercado Financiero ni de otras autoridades administrativas." },
  { n: 38, titulo: "Hechos posteriores", tipo: "Texto", fuentes: ["doc_hechos"], cuadros: [], documentos: ["D3", "D4"],
    textoBase:
      "Entre el {{fecha_cierre}} y la fecha de emisión de los presentes estados financieros consolidados intermedios no han ocurrido hechos de carácter financiero o de otra índole que afecten en forma significativa los saldos o la interpretación de los mismos." }
];

// Aperturas adicionales por nota: cada una cuadra contra el total del cuadro principal.
const cnc = () => cuadro("cnc", "Corriente y no corriente", [L("c", "Corriente", 0.62), L("nc", "No corriente", 0.38)]);
const porPais = (comparativo: CuadroDef["comparativo"] = "cierre_anterior") =>
  cuadro("paisx", "Por país", [L("ch", "Chile", 0.46), L("ar", "Argentina", 0.12), L("br", "Brasil", 0.2), L("pe", "Perú", 0.12), L("co", "Colombia", 0.1)], comparativo);
const porMoneda = () => cuadro("monx", "Por moneda", [L("clp", "Peso chileno", 0.56), L("usd", "Dólar estadounidense", 0.17), L("ars", "Peso argentino", 0.08), L("brl", "Real brasileño", 0.11), L("otr", "Otras monedas", 0.08)]);
const porVenc = () => cuadro("venx", "Por vencimiento", [L("v1", "Hasta 90 días", 0.21), L("v2", "91 días a 1 año", 0.19), L("v3", "1 a 3 años", 0.24), L("v4", "3 a 5 años", 0.17), L("v5", "Más de 5 años", 0.19)]);

const EXTRA: Record<number, CuadroDef[]> = {
  3: [porMoneda()],
  5: [porPais()],
  6: [cnc(), porMoneda()],
  7: [cnc()],
  8: [porMoneda(), cnc(), porPais()],
  9: [porPais()],
  10: [porPais(), cuadro("seg", "Por segmento", [L("sm", "Supermercados", 0.64), L("mi", "Mejoramiento del hogar", 0.21), L("td", "Tiendas por departamento", 0.15)])],
  11: [porPais()],
  12: [cuadro("mov", "Movimiento de la inversión", [L("si", "Saldo inicial", 0.94), L("par", "Participación en resultados", 0.05), L("div", "Dividendos recibidos", -0.02), L("conv", "Diferencias de conversión", 0.03)])],
  13: [cuadro("clase", "Por clase de activo", [L("sw", "Software y desarrollos", 0.38), L("mar", "Marcas", 0.44), L("der", "Derechos de uso de marcas y licencias", 0.12), L("ot", "Otros", 0.06)]), porPais()],
  15: [porPais()],
  16: [porPais(), cuadro("orig", "Por origen del efecto", [L("res", "Reconocido en resultados", 0.83), L("pat", "Reconocido en patrimonio", 0.17)])],
  17: [porVenc(), cnc(), cuadro("tasa", "Por tipo de tasa", [L("fija", "Tasa fija", 0.81), L("var", "Tasa variable", 0.19)])],
  18: [porMoneda(), cnc(), porPais()],
  19: [cnc(), porPais()],
  20: [cnc(), porPais()],
  21: [cnc()],
  22: [cuadro("tipo", "Por tipo de activo", [L("cc", "Centros comerciales", 0.71), L("ter", "Terrenos", 0.14), L("ofi", "Oficinas", 0.09), L("ot", "Otros", 0.06)]), cuadro("valor", "Jerarquía de valor razonable", [L("n2", "Nivel 2", 0.18), L("n3", "Nivel 3", 0.82)])],
  23: [porPais(), cuadro("pas", "Pasivos por arrendamiento por vencimiento", [L("p1", "Hasta 1 año", 0.14), L("p2", "1 a 5 años", 0.41), L("p3", "Más de 5 años", 0.45)])],
  24: [cuadro("atr", "Atribución del patrimonio", [L("ctr", "Propietarios de la controladora", 0.97), L("nc", "Participaciones no controladoras", 0.03)])],
  25: [porPais("mismo_periodo"), cuadro("canal", "Por canal de venta", [L("tie", "Tiendas físicas", 0.86), L("ecom", "Comercio electrónico", 0.14)], "mismo_periodo"), cuadro("rec", "Por oportunidad de reconocimiento", [L("pt", "En un punto del tiempo", 0.96), L("tt", "A lo largo del tiempo", 0.04)], "mismo_periodo")],
  26: [porPais("mismo_periodo")],
  30: [porPais("mismo_periodo"), cuadro("fun", "Por función", [L("cv", "Costo de ventas", 0.79), L("dis", "Costos de distribución", 0.03), L("adm", "Gastos de administración", 0.18)], "mismo_periodo")],
  31: [porPais("mismo_periodo")],
  32: [cuadro("if", "Ingresos financieros", [L("dep", "Intereses por depósitos", 0.64), L("inv", "Intereses por inversiones", 0.36)], "mismo_periodo"), porPais("mismo_periodo")],
  33: [cuadro("segx", "Por segmento", [L("sm", "Supermercados", 0.72), L("mi", "Mejoramiento del hogar", 0.13), L("td", "Tiendas por departamento", 0.1), L("cc", "Centros comerciales", 0.03), L("sf", "Servicios financieros", 0.02)], "mismo_periodo")],
  34: [porPais()],
  35: [cuadro("tipo", "Por tipo de partida", [L("act", "Activos monetarios", 0.42), L("pas", "Pasivos monetarios", 0.58)])],
  36: [porPais("mismo_periodo")]
};
notas.forEach((n) => {
  if (EXTRA[n.n]) n.cuadros = [...n.cuadros, ...EXTRA[n.n]];
});

export const retail: IndustriaPack = {
  id: "retail",
  nombre: "Retail",
  descripcion: "Holding de supermercados, mejoramiento del hogar y centros comerciales con operación multi-país.",
  clientes: ["cencosud", "falabella", "smu", "ripley"],
  notas,
  cuentaPrefijos: { "11": "Activo corriente", "12": "Activo no corriente", "21": "Pasivo corriente", "22": "Pasivo no corriente", "3": "Patrimonio", "4": "Ingresos", "5": "Costos y gastos" },
  fuentes: [
    { id: "bpc_c480", nombre: "BPC C480 · Consolidado de saldos", tipo: "integrada", origen: "Data Lake · SAP BPC", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 48210 },
    { id: "bpc_c410", nombre: "BPC C410 · Movimientos de activos", tipo: "integrada", origen: "Data Lake · SAP BPC", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 12876 },
    { id: "bw_ventas", nombre: "BW · Ingresos por segmento y país", tipo: "integrada", origen: "Data Lake · SAP BW", formato: "Consulta", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 3120 },
    { id: "sap_fbl3n", nombre: "SAP FBL3N · Partidas de mayor", tipo: "integrada", origen: "Data Lake · SAP ECC", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 214560 },
    { id: "sap_recesh", nombre: "SAP RECESH · Contratos de arriendo", tipo: "integrada", origen: "Data Lake · SAP RE-FX", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 4388 },
    { id: "sap_zfi862", nombre: "SAP ZFI862 · Deuda financiera", tipo: "integrada", origen: "Data Lake · SAP ECC", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 612 },
    { id: "sap_ksb1", nombre: "SAP KSB1 · Gastos por centro de costo", tipo: "integrada", origen: "Data Lake · SAP CO", formato: "Tabla", obligatoriedad: "Opcional", responsable: "u_carga", registros: 96044 },
    { id: "sap_tax", nombre: "SAP TAX · Impuestos corrientes", tipo: "integrada", origen: "Data Lake · SAP TAX", formato: "Tabla", obligatoriedad: "Obligatoria", responsable: "u_carga", registros: 2210 },
    { id: "homolog", nombre: "Tabla de homologación cuenta → línea de nota", tipo: "integrada", origen: "Maestros de la plataforma", formato: "Maestro", obligatoriedad: "Obligatoria", responsable: "u_admin", registros: 3840 },
    { id: "pack_ar", nombre: "Pack de notas · Argentina", tipo: "manual", origen: "Contraloría Argentina", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "pack_br", nombre: "Pack de notas · Brasil", tipo: "manual", origen: "Contraloría Brasil", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "pack_pe", nombre: "Pack de notas · Perú", tipo: "manual", origen: "Contraloría Perú", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "pack_co", nombre: "Pack de notas · Colombia", tipo: "manual", origen: "Contraloría Colombia", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "fin_derivados", nombre: "Finanzas · Derivados y coberturas", tipo: "manual", origen: "Tesorería Corporativa", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_carga" },
    { id: "fin_deuda", nombre: "Finanzas · Covenants y clasificación de deuda", tipo: "manual", origen: "Tesorería Corporativa", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_carga" },
    { id: "rrhh_beneficios", nombre: "RR.HH. · Beneficios a empleados (cálculo actuarial)", tipo: "manual", origen: "Gerencia de Personas", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_carga" },
    { id: "legal_juicios", nombre: "Legales · Juicios y contingencias", tipo: "manual", origen: "Fiscalía", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "trib_diferidos", nombre: "Tributaria · Diferencias temporarias", tipo: "manual", origen: "Gerencia Tributaria", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota1" },
    { id: "trib_tasa", nombre: "Tributaria · Conciliación de tasa efectiva", tipo: "manual", origen: "Gerencia Tributaria", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota1" },
    { id: "inmob_tasaciones", nombre: "Inmobiliario · Tasaciones de propiedades de inversión", tipo: "manual", origen: "Gerencia Inmobiliaria", formato: "Excel (plantilla)", obligatoriedad: "Obligatoria", responsable: "u_nota1" },
    { id: "seg_info", nombre: "Control de gestión · Información por segmentos", tipo: "manual", origen: "Control de Gestión", formato: "Excel (plantilla)", obligatoriedad: "Deseable", responsable: "u_nota2" },
    { id: "medioambiente", nombre: "Sostenibilidad · Desembolsos medioambientales", tipo: "manual", origen: "Gerencia de Sostenibilidad", formato: "Excel (plantilla)", obligatoriedad: "Opcional", responsable: "u_nota2" },
    { id: "doc_cartas", nombre: "Cartas de abogados del periodo", tipo: "manual", origen: "Fiscalía", formato: "PDF", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "doc_hechos", nombre: "Hechos esenciales publicados a la CMF", tipo: "manual", origen: "Gerencia Legal", formato: "PDF", obligatoriedad: "Obligatoria", responsable: "u_nota2" },
    { id: "doc_word_anterior", nombre: "Notas del periodo anterior (Word)", tipo: "manual", origen: "Contabilidad Corporativa", formato: "Word", obligatoriedad: "Obligatoria", responsable: "u_proceso" },
    { id: "doc_actas", nombre: "Actas de Directorio y Junta", tipo: "manual", origen: "Secretaría del Directorio", formato: "PDF", obligatoriedad: "Deseable", responsable: "u_proceso" }
  ],
  documentos: [
    { id: "D1", nombre: "Carta de abogados · Estudio Larraín & Asociados", tipo: "Carta de abogados", notas: [1, 29], resumen: "Informa 184 juicios laborales, 61 civiles y 9 tributarios vigentes. Estima pérdida probable en causas laborales de M$ 3.940.000. Controversia tributaria Argentina 2021 con probabilidad de resultado favorable. Nuevo juicio civil por término anticipado de contrato de arriendo en Concepción, cuantía M$ 1.870.000, probabilidad posible." },
    { id: "D2", nombre: "Hecho esencial · Colocación de bonos serie AQ", tipo: "Hecho esencial CMF", notas: [17, 29, 37], resumen: "La Sociedad colocó bonos serie AQ por UF 5.000.000 a 10 años, tasa de colocación 3,48%. No informa sanciones de la CMF en el periodo." },
    { id: "D3", nombre: "Hecho esencial · Acuerdo de venta de terreno en Lima", tipo: "Hecho esencial CMF", notas: [29, 34, 38], resumen: "Con fecha posterior al cierre, la filial peruana suscribió promesa de venta de un terreno en Lima clasificado como mantenido para la venta, por USD 18,4 millones." },
    { id: "D4", nombre: "Acta de Directorio · Sesión ordinaria", tipo: "Acta", notas: [1, 38], resumen: "El Directorio acordó convocar a revisión de los estados financieros intermedios y aprobó la política de dividendos provisorios." },
    { id: "D5", nombre: "Notas a los EEFF del periodo anterior (Word)", tipo: "Word periodo anterior", notas: [1, 2, 29, 37, 38], resumen: "Texto aprobado de las notas del periodo comparativo, usado como base de redacción." }
  ],
  cruzadas: [
    { id: "x1", a: 24, b: 28, nombre: "Nota 24 Patrimonio · resultados acumulados vs Nota 28" },
    { id: "x2", a: 15, b: 14, nombre: "Nota 15 PPE · deterioro por UGC vs Nota 14" },
    { id: "x3", a: 26, b: 16, nombre: "Nota 26 impuesto diferido vs variación Nota 16" },
    { id: "x4", a: 35, b: 17, nombre: "Nota 35 pasivos en USD vs Nota 17 por moneda" },
    { id: "x5", a: 33, b: 25, nombre: "Nota 33 segmentos vs Nota 25 ingresos" }
  ],
  informes: [
    { id: "cmf", nombre: "Estados financieros consolidados CMF", formato: "Word / PDF", descripcion: "Estados financieros consolidados intermedios y sus notas, en el formato requerido por la CMF." },
    { id: "xbrl", nombre: "Archivo XBRL", formato: "XBRL (taxonomía IFRS-CL)", descripcion: "Cifras aprobadas mapeadas a la taxonomía, con validación previa de completitud y consistencia." },
    { id: "i555", nombre: "Informe 555", formato: "Excel", descripcion: "Información complementaria generada desde la versión aprobada del ejercicio." }
  ],
  glosario: [
    { termino: "Carátula", def: "Estado de situación financiera (ESF) y estado de resultados (ER) contra los que cuadran las notas." },
    { termino: "C480", def: "Reporte de saldos consolidados de SAP BPC, fuente principal de los cuadros." },
    { termino: "Homologación", def: "Tabla que asigna cada cuenta contable a rubro, concepto y línea de nota." }
  ]
};
