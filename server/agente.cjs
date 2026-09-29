/* Handler único de agentes. CommonJS: lo usan server/index.cjs (local) y api/agente.ts (Vercel).
   La key de Anthropic solo se lee aquí, desde process.env. Nunca viaja al front. */
const Anthropic = require("@anthropic-ai/sdk");

const MODELO = "claude-sonnet-4-6";

const BASE = `Escribes en español neutro, sin voseo y sin tratamiento de "usted". Frases cortas y precisas.
Sin marketing ni adjetivos de venta. No uses títulos ni encabezados markdown. Puedes usar **negrita** para
una cifra o término clave por párrafo. Montos en M$ con separador de miles chileno (punto), por ejemplo M$ 1.284.
Trabajas SOLO con los datos del contexto JSON. Si un dato no está en el contexto, dilo; nunca lo inventes.`;

const MODOS = {
  asistente: `Eres el Agente Asistente del proceso de cierre de Estados Financieros y Notas en la plataforma de la
compañía indicada en el contexto. Respondes sobre hitos, fechas, entregables, responsables, validaciones,
estado del cierre y dudas frecuentes de EEFF y Notas (NIIF, CMF, XBRL). Tus respuestas se basan en el calendario
y el estado real del ejercicio que viene en el contexto. Cuando corresponda, cierra con una línea que diga
exactamente "Ir a: <track>" donde <track> es uno de: portada, carga, notas, preaprobacion, directorio, informes, auditoria.
Máximo tres párrafos cortos o una lista de hasta 5 líneas con guion.`,

  trazabilidad: `Eres el Agente de Trazabilidad. Recibes una cifra de un cuadro de nota y su cadena de origen:
línea del cuadro → cuentas del consolidado (C480) o fuente manual o nota de origen → cálculo aplicado → ajustes manuales.
Explica la cadena de cálculo en 3 a 5 pasos numerados y breves (1., 2., ...), mostrando la aritmética con las cifras exactas del contexto.
Luego, si el contexto trae cuentas nuevas sin asignar, ajustes manuales o diferencias de cuadratura, agrega un párrafo
"Alertas:" explicando el efecto en la cifra y qué acción concreta corresponde en la plataforma. Si no hay alertas, dilo en una línea.`,

  texto: `Eres el Agente de Generación de Notas de Texto. Recibes el texto de la nota del periodo anterior, los datos
vigentes del periodo (fechas, montos de cuadros) y la documentación cargada (cartas de abogados, hechos esenciales).
Devuelve el texto actualizado de la nota manteniendo la redacción estándar del periodo anterior. Actualiza fechas,
montos y componentes variables. Envuelve CADA fragmento que cambió respecto al periodo anterior entre [[ y ]].
Cuando un cambio se apoye en un documento, agrega al final de esa frase la cita {doc:ID} con el id del documento.
Los montos que cites deben coincidir exactamente con los cuadros del contexto. Solo el texto de la nota, en párrafos,
sin preámbulo ni comentarios tuyos.`,

  informe: `Eres el Agente de Informe de Cierre. Revisas el pre-informe consolidado antes de enviarlo a auditoría y Directorio.
Con el contexto verifica: (1) que el set de notas esté completo y aprobado, (2) totales contra carátula (ESF y ER),
(3) cuadraturas cruzadas entre notas, (4) variaciones relevantes contra el comparativo que merezcan explicación.
Responde con una lista de hallazgos, cada línea con el formato "OK — ..." o "REVISAR — ...", máximo 7 líneas,
y cierra con una línea de conclusión. Si te hacen una pregunta sobre el contenido del documento, respóndela con los datos del contexto.`
};

function leerBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") {
    try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.resolve({}); }
  }
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } });
  });
}

/* Respuesta de respaldo cuando no hay ANTHROPIC_API_KEY: construida solo con el contexto, para que la
   demo no se caiga. La interfaz marca que la respuesta viene del modo sin conexión. */
function respaldo(modo, ctx, pregunta) {
  const fmt = (n) => (typeof n === "number" ? "M$ " + Math.round(n).toLocaleString("es-CL") : String(n));
  try {
    if (modo === "trazabilidad" && ctx.cifra) {
      const c = ctx.cifra;
      const pasos = [];
      pasos.push(`1. La cifra ${fmt(c.valor)} corresponde a la línea "${c.linea}" de la Nota ${c.nota}, columna ${c.columna}.`);
      if (c.cuentas && c.cuentas.length) {
        const suma = c.cuentas.reduce((a, x) => a + x.pesos, 0);
        pasos.push(`2. Se compone de ${c.cuentas.length} cuentas del consolidado ${c.fuente}, que suman $ ${Math.round(suma).toLocaleString("es-CL")} en pesos.`);
        const mm = Math.round(suma / 1000);
        pasos.push(`3. Conversión a M$: $ ${Math.round(suma).toLocaleString("es-CL")} / 1.000 = ${fmt(mm)}${mm !== Math.round(c.valor) && c.esTotal ? `; el cuadro redondea cada línea por separado, por eso el total publicado difiere en ${fmt(Math.round(c.valor) - mm)}` : ", redondeado"}.`);
      }
      if (c.ajustes && c.ajustes.length) {
        const a = c.ajustes.reduce((s, x) => s + x.monto, 0);
        pasos.push(`${pasos.length + 1}. Ajuste manual registrado por ${fmt(a)} (${c.ajustes[0].justificacion}).`);
      }
      pasos.push(`${pasos.length + 1}. Valor publicado en el cuadro: ${fmt(c.valor)}.`);
      let alertas = "Alertas: sin alertas para esta cifra.";
      if (c.cuentasNuevas && c.cuentasNuevas.length) {
        const cn = c.cuentasNuevas[0];
        alertas = `Alertas: la cuenta ${cn.cuenta} (${cn.nombre}) tiene saldo ${fmt(cn.monto)} en ${c.fuente} y no está asignada a ninguna línea de la nota. Esa es la diferencia contra la carátula. Asígnala en la tabla de homologación y vuelve a generar la nota.`;
      }
      return pasos.join("\n") + "\n\n" + alertas;
    }
    if (modo === "texto" && ctx.textoAnterior) {
      let t = ctx.textoAnterior;
      (ctx.reemplazos || []).forEach((r) => { t = t.split(r.de).join(`[[${r.a}]]${r.doc ? ` {doc:${r.doc}}` : ""}`); });
      (ctx.agregados || []).forEach((a) => { t += `\n\n[[${a.texto}]] {doc:${a.doc}}`; });
      return t;
    }
    if (modo === "informe") {
      const lineas = [];
      lineas.push(`OK — Set de notas completo: ${ctx.notasAprobadas}/${ctx.notasTotal} aprobadas.`);
      const car = ctx.caratula || [];
      const carKo = car.filter((c) => Math.abs(c.dif) > 1);
      lineas.push(carKo.length ? `REVISAR — ${carKo.length} líneas de carátula con diferencia: ${carKo.map((c) => c.linea).join(", ")}.` : `OK — Las ${car.length} líneas de carátula (ESF y ER) cuadran con el total de su nota.`);
      const cr = ctx.cruzadas || [];
      const crKo = cr.filter((c) => !c.ok);
      lineas.push(crKo.length ? `REVISAR — Cuadraturas cruzadas con diferencia: ${crKo.map((c) => c.nombre).join("; ")}.` : `OK — ${cr.length} cuadraturas cruzadas entre notas sin diferencias.`);
      (ctx.variaciones || []).slice(0, 3).forEach((v) => lineas.push(`REVISAR — Nota ${v.nota} varía ${v.pct}% contra el comparativo; conviene explicarlo en el texto.`));
      lineas.push("Conclusión: el pre-informe está en condiciones de pasar a revisión de auditoría externa.");
      return lineas.slice(0, 8).join("\n");
    }
    if (modo === "asistente") {
      const e = ctx.ejercicio || {};
      return `El ejercicio ${e.periodo || ""} de ${e.sociedad || ""} está en estado **${e.estado || "—"}**. ${e.proximoHito ? `El próximo hito es ${e.proximoHito.nombre}, el ${e.proximoHito.fecha} (${e.proximoHito.diasHabiles} días hábiles).` : ""}\n\nHay ${e.notasPorEstado ? Object.entries(e.notasPorEstado).map(([k, v]) => `${v} en ${k}`).join(", ") : "notas en distintos estados"}.\n\nEsta respuesta se armó sin conexión al modelo: configura ANTHROPIC_API_KEY para respuestas completas a "${(pregunta || "").slice(0, 80)}".\nIr a: portada`;
    }
  } catch (e) { /* cae al genérico */ }
  return "Sin conexión al modelo. Configura ANTHROPIC_API_KEY en el backend.";
}

async function handler(req, res) {
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
  if (req.method !== "POST") { res.statusCode = 405; res.end(JSON.stringify({ error: "Usa POST." })); return; }

  const body = await leerBody(req);
  const modo = MODOS[body.modo] ? body.modo : "asistente";
  const contexto = body.contexto || {};
  const mensajes = (body.messages || [])
    .filter((m) => m && m.content && String(m.content).trim())
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).trim() }));
  if (!mensajes.length) mensajes.push({ role: "user", content: "Procesa el contexto." });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const enviar = (p) => { try { res.write(`data: ${JSON.stringify(p)}\n\n`); } catch { /* cerrada */ } };
  const latido = setInterval(() => enviar({ type: "ping" }), 3000);
  let abortado = false;
  res.on("close", () => { abortado = true; clearInterval(latido); });

  try {
    let texto;
    let fuente = "modelo";
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      texto = respaldo(modo, contexto, mensajes[mensajes.length - 1].content);
      fuente = "respaldo";
      await new Promise((s) => setTimeout(s, 700));
    } else {
      const anthropic = new Anthropic({ apiKey: key });
      const r = await anthropic.messages.create({
        model: MODELO,
        max_tokens: modo === "texto" ? 1800 : 1100,
        system: `${MODOS[modo]}\n\n${BASE}\n\n=== CONTEXTO (JSON) ===\n${JSON.stringify(contexto).slice(0, 60000)}`,
        messages: mensajes
      });
      texto = r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    }
    enviar({ type: "meta", fuente });
    for (let i = 0; i < texto.length && !abortado; i += 14) {
      enviar({ type: "text", text: texto.slice(i, i + 14) });
      await new Promise((s) => setTimeout(s, 14));
    }
    clearInterval(latido);
    if (!abortado) { enviar({ type: "done" }); res.end(); }
  } catch (err) {
    clearInterval(latido);
    enviar({ type: "error", error: `${(err && err.status) || ""} ${(err && err.message) || String(err)}`.trim() });
    try { res.end(); } catch { /* ya cerrada */ }
  }
}

module.exports = handler;
module.exports.default = handler;
