// Cliente SSE del backend de agentes. El front llama directo al backend (sin proxy de Vite).
const BASE = (import.meta as any).env?.VITE_API_URL ?? (location.hostname === "localhost" ? "http://localhost:3003" : "");

export type Modo = "asistente" | "trazabilidad" | "texto" | "informe";

export async function agente(
  modo: Modo,
  contexto: unknown,
  messages: { role: "user" | "assistant"; content: string }[],
  onText: (acumulado: string) => void,
  signal?: AbortSignal
): Promise<{ texto: string; fuente: string }> {
  let texto = "";
  let fuente = "modelo";
  const r = await fetch(`${BASE}/api/agente`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modo, contexto, messages }),
    signal
  });
  if (!r.ok || !r.body) throw new Error(`El backend respondió ${r.status}`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const partes = buf.split("\n\n");
    buf = partes.pop() ?? "";
    for (const p of partes) {
      const l = p.trim();
      if (!l.startsWith("data:")) continue;
      const ev = JSON.parse(l.slice(5));
      if (ev.type === "text") {
        texto += ev.text;
        onText(texto);
      } else if (ev.type === "meta") fuente = ev.fuente;
      else if (ev.type === "error") throw new Error(ev.error);
    }
  }
  return { texto, fuente };
}
