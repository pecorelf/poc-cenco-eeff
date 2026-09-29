# poc-cenco-eeff

La POC de automatización del cierre de Estados Financieros y Notas (6 tracks + log de auditoría) para Cencosud S.A. y Cencosud Shopping S.A. Es multicliente y multiindustria (retail y banca), con configuración en `/admin`.

## Correr en local
```bash
npm install
cp .env.example .env   # agregar ANTHROPIC_API_KEY
npm run dev            # backend :3003 + front :5173
```

## Estructura
- `src/engine`: motor agnóstico (cálculo de notas, controles, estados, store).
- `src/config`: packs de industria (`industries/`), clientes (`clients/`) y usuarios de demo.
- `server/agente.cjs`: agentes (asistente, trazabilidad, texto, informe) vía SSE con `claude-sonnet-4-6`.
- `api/`: funciones de Vercel que reutilizan el mismo handler.

## Despliegue
Vercel con el framework Vite. Cargar la variable `ANTHROPIC_API_KEY` en el proyecto. El guion de la demo está en `DEMO.md`.
