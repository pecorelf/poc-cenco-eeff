export default function salud(_req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, ia: Boolean(process.env.ANTHROPIC_API_KEY) }));
}
