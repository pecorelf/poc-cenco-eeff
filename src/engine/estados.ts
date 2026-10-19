// Estados financieros consolidados: situación financiera, resultados, cambios en el patrimonio y flujos de efectivo.
// Se construyen desde la carátula y los cuadros de las notas, y cuadran entre sí por construcción.
import type { Ejercicio, IndustriaPack, ClienteConfig, NotaDef } from "./types";
import { cuadrosBase, totalNota } from "./generator";
import { rng, fechaCorta, finTrimestre } from "./util";

export type TipoLineaEF = "seccion" | "line" | "subtotal" | "total";

export interface LineaEF {
  id: string;
  label: string;
  kind: TipoLineaEF;
  nota?: number;
  actual: number;
  comp: number;
  /** Para estado de cambios en el patrimonio: valores por columna. */
  cols?: number[];
}

export interface ControlEF {
  nombre: string;
  esperado: number;
  obtenido: number;
  dif: number;
}

export interface CuadraturaNota {
  nota: number;
  estadoFinanciero: number;
  totalNota: number | null;
  dif: number;
}

export interface EstadoEF {
  id: "esf" | "er" | "ecp" | "efe";
  corto: string;
  titulo: string;
  subtitulo: string;
  colA: string;
  colB: string;
  columnas?: string[];
  lineas: LineaEF[];
  controles: ControlEF[];
}

interface Ctx {
  ej: Ejercicio;
  pack: IndustriaPack;
  escala: number;
}

function defDe(c: Ctx, n: number): NotaDef | undefined {
  return c.pack.notas.find((d) => d.n === n);
}

/** Total vigente de una nota: el generado si existe; si no, el base del periodo. */
function totalVigente(c: Ctx, n: number) {
  const nota = c.ej.notas.find((x) => x.n === n);
  if (nota?.generada && nota.cuadros.length) return totalNota(nota.cuadros);
  const d = defDe(c, n);
  if (!d || !d.cuadros.length) return 0;
  return totalNota(cuadrosBase(d, c.ej.sociedad, c.escala, c.ej.anio, c.ej.trimestre));
}

function compNota(c: Ctx, n: number) {
  const d = defDe(c, n);
  if (!d || !d.cuadros.length) return 0;
  return cuadrosBase(d, c.ej.sociedad, c.escala, c.ej.anio, c.ej.trimestre)[0]?.lineas.find((l) => l.kind === "total")?.comp ?? 0;
}

/** Valor del estado: carátula si la nota cuadra contra el estado; si no, total de la nota. */
function valorEstado(c: Ctx, n: number) {
  return c.ej.caratula[n] ?? totalVigente(c, n);
}

const L = (id: string, label: string, actual: number, comp: number, nota?: number): LineaEF => ({ id, label, kind: "line", actual: Math.round(actual), comp: Math.round(comp), nota });
const S = (id: string, label: string): LineaEF => ({ id, label, kind: "seccion", actual: 0, comp: 0 });
const suma = (id: string, label: string, ls: LineaEF[], kind: TipoLineaEF = "subtotal"): LineaEF => ({
  id, label, kind, actual: ls.reduce((a, l) => a + l.actual, 0), comp: ls.reduce((a, l) => a + l.comp, 0)
});

function esfRetail(c: Ctx) {
  const r = rng(`${c.ej.id}|esf`);
  const v = (n: number) => valorEstado(c, n);
  const k = (n: number) => compNota(c, n);
  const g = () => 1 / (1 + r.range(-0.03, 0.09));

  const ac = [
    L("ac5", "Efectivo y equivalentes al efectivo", v(5), k(5), 5),
    L("ac6", "Otros activos financieros corrientes", v(6), k(6), 6),
    L("ac7", "Otros activos no financieros corrientes", v(7) * 0.62, k(7) * 0.62, 7),
    L("ac8", "Deudores comerciales y otras cuentas por cobrar corrientes", v(8), k(8), 8),
    L("ac9", "Cuentas por cobrar a entidades relacionadas, corrientes", v(9), k(9), 9),
    L("ac10", "Inventarios corrientes", v(10), k(10), 10),
    L("ac11", "Activos por impuestos corrientes, corrientes", v(11), k(11), 11),
    L("ac34", "Activos no corrientes mantenidos para la venta", v(34), k(34), 34)
  ];
  const anc = [
    L("anc7", "Otros activos no financieros no corrientes", v(7) * 0.38, k(7) * 0.38, 7),
    L("anc12", "Inversiones contabilizadas utilizando el método de la participación", v(12), k(12), 12),
    L("anc13", "Activos intangibles distintos de la plusvalía", v(13), k(13), 13),
    L("anc14", "Plusvalía", v(14), k(14), 14),
    L("anc15", "Propiedades, planta y equipo", v(15), k(15), 15),
    L("anc23", "Activos por derecho de uso", v(23), k(23), 23),
    L("anc22", "Propiedades de inversión", v(22), k(22), 22),
    L("anc16", "Activos por impuestos diferidos", v(16), k(16), 16)
  ];
  const arr = v(23) * 1.08;
  const arrK = k(23) * 1.08;
  const pc = [
    L("pc17", "Otros pasivos financieros corrientes", v(17) * 0.22, k(17) * 0.22, 17),
    L("pc23", "Pasivos por arrendamiento corrientes", arr * 0.14, arrK * 0.14, 23),
    L("pc18", "Cuentas por pagar comerciales y otras cuentas por pagar", v(18), k(18), 18),
    L("pc19", "Otras provisiones a corto plazo", v(19) * 0.7, k(19) * 0.7, 19),
    L("pc11", "Pasivos por impuestos corrientes, corrientes", v(11) * 0.36, k(11) * 0.36 * g()),
    L("pc20", "Provisiones corrientes por beneficios a los empleados", v(20) * 0.72, k(20) * 0.72, 20),
    L("pc21", "Otros pasivos no financieros corrientes", v(21), k(21), 21)
  ];
  // La parte no corriente de la Nota 17 se calcula por diferencia para que corriente + no corriente = Nota 17
  const pnc = [
    L("pnc17", "Otros pasivos financieros no corrientes", v(17) - Math.round(v(17) * 0.22), k(17) - Math.round(k(17) * 0.22), 17),
    L("pnc23", "Pasivos por arrendamiento no corrientes", arr - Math.round(arr * 0.14), arrK - Math.round(arrK * 0.14), 23),
    L("pnc19", "Otras provisiones a largo plazo", v(19) - Math.round(v(19) * 0.7), k(19) - Math.round(k(19) * 0.7), 19),
    L("pncdif", "Pasivo por impuestos diferidos", v(16) * 0.88, k(16) * 0.88 * g(), 16),
    L("pnc20", "Provisiones no corrientes por beneficios a los empleados", v(20) - Math.round(v(20) * 0.72), k(20) - Math.round(k(20) * 0.72), 20)
  ];
  // Ajuste de redondeo de la Nota 7 (corriente + no corriente)
  ac[2].actual = Math.round(v(7) * 0.62); anc[0].actual = v(7) - ac[2].actual;
  ac[2].comp = Math.round(k(7) * 0.62); anc[0].comp = k(7) - ac[2].comp;
  const tac2 = suma("tac", "Total de activos corrientes", ac);
  const tanc2 = suma("tanc", "Total de activos no corrientes", anc);
  const tact2 = suma("tact", "Total de activos", [tac2, tanc2], "total");

  const tpc = suma("tpc", "Total de pasivos corrientes", pc);
  const tpnc = suma("tpnc", "Total de pasivos no corrientes", pnc);
  const tpas = suma("tpas", "Total de pasivos", [tpc, tpnc]);

  const P1 = tact2.actual - tpas.actual;
  const P0 = tact2.comp - tpas.comp;
  return { ac, anc, tac: tac2, tanc: tanc2, tact: tact2, pc, pnc, tpc, tpnc, tpas, P1, P0, r };
}

function erRetail(c: Ctx) {
  const v = (n: number) => valorEstado(c, n);
  const k = (n: number) => {
    const d = defDe(c, n);
    if (!d || !d.cuadros.length) return 0;
    return cuadrosBase(d, c.ej.sociedad, c.escala, c.ej.anio, c.ej.trimestre)[0].lineas.find((l) => l.kind === "total")!.comp;
  };
  const I = v(25), I0 = k(25);
  const p = (x: number) => [I * x, I0 * x * (1 + ((x * 1000) % 7) / 100)] as const;
  const lines = [
    L("ing", "Ingresos de actividades ordinarias", I, I0, 25),
    L("cv", "Costo de ventas", -v(30), -k(30), 30)
  ];
  const gb = suma("gb", "Ganancia bruta", lines);
  const op = [
    L("oi", "Otros ingresos", ...p(0.0042)),
    L("cd", "Costos de distribución", ...p(-0.021)),
    L("ga", "Gastos de administración", ...p(-0.168)),
    L("og", "Otros gastos, por función", ...p(-0.0061)),
    L("ogp", "Otras ganancias (pérdidas)", totalVigente(c, 31), k(31), 31),
    L("if", "Ingresos financieros", ...p(0.0032)),
    L("cf", "Costos financieros", -v(32), -k(32), 32),
    L("pa", "Participación en ganancias de asociadas y negocios conjuntos", totalVigente(c, 12) * 0.058, k(12) * 0.054, 12),
    L("dc", "Diferencias de cambio", ...p(-0.0019)),
    L("ur", "Resultados por unidades de reajuste", ...p(-0.0058))
  ];
  const gai = suma("gai", "Ganancia antes de impuestos", [gb, ...op]);
  const imp = L("imp", "Gasto por impuestos a las ganancias", -v(26), -k(26), 26);
  const gan = suma("gan", "Ganancia del periodo", [gai, imp], "total");
  const ctr = L("gctr", "Ganancia atribuible a los propietarios de la controladora", gan.actual * 0.968, gan.comp * 0.97, 27);
  const nc = L("gnc", "Ganancia atribuible a participaciones no controladoras", gan.actual - ctr.actual, gan.comp - ctr.comp);
  return { lines, gb, op, gai, imp, gan, ctr, nc };
}

export function estadosFinancieros(ej: Ejercicio, pack: IndustriaPack, cliente: ClienteConfig): EstadoEF[] {
  const soc = cliente.sociedades.find((s) => s.id === ej.sociedad) ?? cliente.sociedades[0];
  const c: Ctx = { ej, pack, escala: soc.escala };
  if (pack.id !== "retail") return estadosGenericos(c);

  const fA = fechaCorta(ej.fechaCierre);
  const fB = fechaCorta(finTrimestre(ej.anio - 1, 4));
  const accA = `Acum. ${ej.periodo}`;
  const accB = `Acum. ${ej.trimestre}T ${ej.anio - 1}`;

  const e = esfRetail(c);
  const er = erRetail(c);
  const r = e.r;

  // ---------- Patrimonio y cambios en el patrimonio ----------
  const capital = Math.round(e.P0 * 0.34);
  const nci1 = Math.round(e.P1 * 0.031), nci0 = Math.round(e.P0 * 0.031);
  const or0 = Math.round(e.P0 * 0.1);
  const ori = Math.round(e.P0 * r.range(-0.006, 0.014));
  const or1 = or0 + ori;
  const ga0 = e.P0 - nci0 - capital - or0;
  const ga1 = e.P1 - nci1 - capital - or1;
  const G = er.ctr.actual;
  const Gnc = er.nc.actual;
  const div = -Math.round(Math.abs(er.ctr.comp) * 0.3);
  const otrosGa = ga1 - ga0 - G - div;
  const otrosNc = nci1 - nci0 - Gnc;

  const pat = [
    L("cap", "Capital emitido", capital, capital, 24),
    L("ga", "Ganancias (pérdidas) acumuladas", ga1, ga0, 28),
    L("or", "Otras reservas", or1, or0, 24)
  ];
  const pctr = suma("pctr", "Patrimonio atribuible a los propietarios de la controladora", pat);
  const pnc = L("pnc", "Participaciones no controladoras", nci1, nci0);
  const ptot = suma("ptot", "Patrimonio total", [pctr, pnc]);
  const tpp = suma("tpp", "Total de patrimonio y pasivos", [e.tpas, ptot], "total");

  const esf: EstadoEF = {
    id: "esf", corto: "Situación financiera",
    titulo: "Estado de situación financiera consolidado",
    subtitulo: `Al ${fA} y ${fB} · Expresado en miles de pesos chilenos (M$)`,
    colA: fA, colB: fB,
    lineas: [
      S("s-act", "Activos"), S("s-ac", "Activos corrientes"), ...e.ac, e.tac,
      S("s-anc", "Activos no corrientes"), ...e.anc, e.tanc, e.tact,
      S("s-pp", "Patrimonio y pasivos"), S("s-pc", "Pasivos corrientes"), ...e.pc, e.tpc,
      S("s-pnc", "Pasivos no corrientes"), ...e.pnc, e.tpnc, e.tpas,
      S("s-pat", "Patrimonio"), ...pat, pctr, pnc, ptot, tpp
    ],
    controles: [{ nombre: "Total de activos = Total de patrimonio y pasivos", esperado: e.tact.actual, obtenido: tpp.actual, dif: tpp.actual - e.tact.actual }]
  };

  const erE: EstadoEF = {
    id: "er", corto: "Resultados",
    titulo: "Estado de resultados consolidado por función",
    subtitulo: `Por los periodos terminados al ${fA} y ${fechaCorta(finTrimestre(ej.anio - 1, ej.trimestre))} · M$`,
    colA: accA, colB: accB,
    lineas: [S("s-er", "Ganancia (pérdida)"), ...er.lines, er.gb, ...er.op, er.gai, er.imp, er.gan, S("s-atr", "Ganancia atribuible a"), er.ctr, er.nc],
    controles: [{ nombre: "Ganancia del periodo = atribuible a controladores + no controladoras", esperado: er.gan.actual, obtenido: er.ctr.actual + er.nc.actual, dif: er.ctr.actual + er.nc.actual - er.gan.actual }]
  };

  const fila = (id: string, label: string, cols: number[], kind: TipoLineaEF = "line", nota?: number): LineaEF => {
    const full = [cols[0], cols[1], cols[2], cols[0] + cols[1] + cols[2], cols[3]];
    full.push(full[3] + full[4]);
    return { id, label, kind, nota, actual: full[5], comp: 0, cols: full };
  };
  const ecp: EstadoEF = {
    id: "ecp", corto: "Cambios en el patrimonio",
    titulo: "Estado de cambios en el patrimonio consolidado",
    subtitulo: `Por el periodo terminado al ${fA} · M$`,
    colA: "", colB: "",
    columnas: ["Capital emitido", "Otras reservas", "Ganancias acumuladas", "Patrimonio controladora", "No controladoras", "Patrimonio total"],
    lineas: [
      fila("ini", `Saldo inicial al ${fB}`, [capital, or0, ga0, nci0], "subtotal"),
      S("s-cam", "Cambios en el patrimonio"),
      fila("res", "Ganancia del periodo", [0, 0, G, Gnc], "line", 27),
      fila("ori", "Otro resultado integral", [0, ori, 0, 0]),
      fila("div", "Dividendos", [0, 0, div, 0], "line", 24),
      fila("otr", "Incremento (disminución) por transferencias y otros cambios", [0, 0, otrosGa, otrosNc], "line", 28),
      fila("tcam", "Total de cambios en el patrimonio", [0, ori, G + div + otrosGa, Gnc + otrosNc], "subtotal"),
      fila("fin", `Saldo final al ${fA}`, [capital, or1, ga1, nci1], "total")
    ],
    controles: [{ nombre: "Saldo final = patrimonio total del estado de situación", esperado: ptot.actual, obtenido: capital + or1 + ga1 + nci1, dif: capital + or1 + ga1 + nci1 - ptot.actual }]
  };

  // ---------- Flujos de efectivo, método directo ----------
  const I = er.lines[0].actual, I0 = er.lines[0].comp;
  const cash1 = e.ac[0].actual, cash0 = e.ac[0].comp;
  const cash0p = Math.round(cash0 * 0.96), cashIni0 = Math.round(cash0 * 0.91);
  const q = (x: number) => [Math.round(I * x), Math.round(I0 * x * (1 + ((Math.abs(x) * 7919) % 9) / 100))] as const;
  const opL = [
    S("s-opc", "Clases de cobros por actividades de operación"),
    L("cob", "Cobros procedentes de las ventas de bienes y prestación de servicios", ...q(1.165)),
    L("ocob", "Otros cobros por actividades de operación", ...q(0.0021)),
    S("s-opp", "Clases de pagos"),
    L("prov", "Pagos a proveedores por el suministro de bienes y servicios", ...q(-0.932)),
    L("emp", "Pagos a y por cuenta de los empleados", ...q(-0.1155)),
    L("opag", "Otros pagos por actividades de operación", ...q(-0.0322))
  ];
  const fop = suma("fop", "Flujos de efectivo procedentes de (utilizados en) operaciones", opL.filter((l) => l.kind === "line"));
  const opL2 = [L("imp", "Impuestos a las ganancias pagados (reembolsados)", ...q(-0.0089)), L("oent", "Otras entradas (salidas) de efectivo", ...q(0.0002))];
  const fopT = suma("fopt", "Flujos de efectivo netos procedentes de actividades de operación", [fop, ...opL2]);

  const invL = [
    L("vppe", "Importes procedentes de la venta de propiedades, planta y equipo", ...q(0.00004)),
    L("cppe", "Compras de propiedades, planta y equipo y propiedades de inversión", ...q(-0.0262), 15),
    L("cint", "Compras de activos intangibles", ...q(-0.0037), 13),
    L("divr", "Dividendos recibidos", ...q(0.00026), 12),
    L("intr", "Intereses recibidos", ...q(0.0015), 32),
    L("oinv", "Otras entradas (salidas) de efectivo", ...q(0.0021))
  ];
  const finv = suma("finv", "Flujos de efectivo netos utilizados en actividades de inversión", invL);
  const efc = q(-0.0004);
  const finL0 = [
    L("prest", "Importes procedentes de préstamos", ...q(0.0905), 17),
    L("arrp", "Pagos de pasivos por arrendamientos", ...q(-0.0146), 23),
    L("divp", "Dividendos pagados", div, Math.round(div * 1.12), 24),
    L("intp", "Intereses pagados", ...q(-0.0116), 32),
    L("ofin", "Otras entradas (salidas) de efectivo", ...q(-0.0008))
  ];
  // Reembolsos de préstamos se obtiene por diferencia, para que el efectivo final calce con la Nota 5
  const parcial = (k: "actual" | "comp") => fopT[k] + finv[k] + finL0.reduce((a, l) => a + l[k], 0);
  const reem = L("reem", "Reembolsos de préstamos", cash1 - cash0 - efc[0] - parcial("actual"), cash0p - cashIni0 - efc[1] - parcial("comp"), 17);
  const finL = [finL0[0], reem, ...finL0.slice(1)];
  const ffin = suma("ffin", "Flujos de efectivo netos procedentes de (utilizados en) actividades de financiación", finL);
  const inc = suma("inc", "Incremento (disminución) neto en el efectivo, antes del efecto de los cambios en la tasa de cambio", [fopT, finv, ffin]);
  const efcL = L("efc", "Efectos de la variación en la tasa de cambio sobre el efectivo", efc[0], efc[1]);
  const incN = suma("incn", "Incremento (disminución) neto de efectivo y equivalentes al efectivo", [inc, efcL]);
  const ini = L("ini", "Efectivo y equivalentes al efectivo al principio del periodo", cash0, cashIni0, 5);
  const fin = suma("finc", "Efectivo y equivalentes al efectivo al final del periodo", [incN, ini], "total");
  fin.nota = 5;

  const efe: EstadoEF = {
    id: "efe", corto: "Flujos de efectivo",
    titulo: "Estado de flujos de efectivo consolidado · método directo",
    subtitulo: `Por los periodos terminados al ${fA} y ${fechaCorta(finTrimestre(ej.anio - 1, ej.trimestre))} · M$`,
    colA: accA, colB: accB,
    lineas: [
      S("s-op", "Flujos de efectivo procedentes de (utilizados en) actividades de operación"), ...opL, fop, ...opL2, fopT,
      S("s-inv", "Flujos de efectivo procedentes de (utilizados en) actividades de inversión"), ...invL, finv,
      S("s-fin", "Flujos de efectivo procedentes de (utilizados en) actividades de financiación"), ...finL, ffin,
      inc, efcL, incN, ini, fin
    ],
    controles: [{ nombre: "Efectivo al final del periodo = Nota 5 en el estado de situación", esperado: cash1, obtenido: fin.actual, dif: fin.actual - cash1 }]
  };

  return [esf, erE, ecp, efe];
}

/** Cuadratura de cada nota con carátula: suma de sus líneas en los estados contra el total de la nota. */
export function cuadraturaNotas(ej: Ejercicio, pack: IndustriaPack, estados: EstadoEF[]): CuadraturaNota[] {
  const out: CuadraturaNota[] = [];
  const lineas = estados.filter((e) => e.id === "esf" || e.id === "er").flatMap((e) => e.lineas);
  pack.notas.filter((d) => d.caratula).forEach((d) => {
    const ls = lineas.filter((l) => l.kind === "line" && l.nota === d.n && l.id !== "pncdif");
    if (!ls.length) return;
    const ef = ls.reduce((a, l) => a + Math.abs(l.actual), 0);
    const nota = ej.notas.find((x) => x.n === d.n);
    const tn = nota?.generada && nota.cuadros.length ? Math.abs(totalNota(nota.cuadros)) : null;
    const dif = tn === null ? 0 : tn - ef;
    out.push({ nota: d.n, estadoFinanciero: ef, totalNota: tn, dif: Math.abs(dif) <= 1 ? 0 : dif });
  });
  return out;
}

/** Versión genérica para otras industrias: activos, pasivos y patrimonio desde las notas con carátula. */
function estadosGenericos(c: Ctx): EstadoEF[] {
  const { ej, pack } = c;
  const fA = fechaCorta(ej.fechaCierre);
  const fB = fechaCorta(finTrimestre(ej.anio - 1, 4));
  const esPasivo = (d: NotaDef) => /pasiv|pagar|provision|obligacion|depósito|captacion|deuda|emitid/i.test(d.titulo);
  const esf = pack.notas.filter((d) => d.caratula?.estado === "ESF");
  const act = esf.filter((d) => !esPasivo(d)).map((d) => L(`a${d.n}`, d.caratula!.linea, valorEstado(c, d.n), compNota(c, d.n), d.n));
  const pas = esf.filter(esPasivo).map((d) => L(`p${d.n}`, d.caratula!.linea, valorEstado(c, d.n), compNota(c, d.n), d.n));
  const ta = suma("ta", "Total de activos", act, "total");
  const tp = suma("tp", "Total de pasivos", pas);
  const pat = L("pat", "Patrimonio total", ta.actual - tp.actual, ta.comp - tp.comp);
  const tpp = suma("tpp", "Total de pasivos y patrimonio", [tp, pat], "total");
  const er = pack.notas.filter((d) => d.caratula?.estado === "ER").map((d, i) => L(`r${d.n}`, d.caratula!.linea, (i === 0 ? 1 : -1) * valorEstado(c, d.n), (i === 0 ? 1 : -1) * compNota(c, d.n), d.n));
  const res = suma("res", "Resultado del periodo", er, "total");
  return [
    { id: "esf", corto: "Situación financiera", titulo: "Estado de situación financiera consolidado", subtitulo: `Al ${fA} y ${fB} · M$`, colA: fA, colB: fB, lineas: [S("sa", "Activos"), ...act, ta, S("sp", "Pasivos"), ...pas, tp, S("spt", "Patrimonio"), pat, tpp], controles: [{ nombre: "Activos = pasivos + patrimonio", esperado: ta.actual, obtenido: tpp.actual, dif: tpp.actual - ta.actual }] },
    { id: "er", corto: "Resultados", titulo: "Estado de resultados consolidado", subtitulo: `Acumulado al ${fA} · M$`, colA: `Acum. ${ej.periodo}`, colB: `Acum. ${ej.trimestre}T ${ej.anio - 1}`, lineas: [...er, res], controles: [] }
  ];
}
