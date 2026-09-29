// Función de Vercel: reutiliza el handler CommonJS del backend local.
// @ts-ignore - módulo CommonJS sin tipos
import handler from "../server/agente.cjs";
export default handler;
