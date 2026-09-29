/* Backend local (Express, CommonJS, puerto 3003). En Vercel el mismo handler corre como api/agente.ts. */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const agente = require("./agente.cjs");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.get("/api/salud", (_req, res) => res.json({ ok: true, ia: Boolean(process.env.ANTHROPIC_API_KEY) }));
app.post("/api/agente", (req, res) => agente(req, res));

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));
