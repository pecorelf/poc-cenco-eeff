import type { ClienteConfig } from "../../engine/types";

// RUT con dígito verificador válido pero ficticios. Escalas relativas al pack de industria.
export const CLIENTES: Record<string, ClienteConfig> = {
  cencosud: {
    id: "cencosud", nombre: "Cencosud", industria: "retail", dominio: "cencosud.cl", auditora: "Firma auditora externa",
    colores: { primario: "#3366DB", secundario: "#1F2D4D", acento: "#F9A41E" },
    logo: "/clientes/cencosud.png",
    sociedades: [
      { id: "cencosud-sa", nombre: "Cencosud S.A.", rut: "96.512.340-8", escala: 1 },
      { id: "cencosud-shopping", nombre: "Cencosud Shopping S.A.", rut: "76.433.310-1", escala: 0.061 }
    ]
  },
  falabella: {
    id: "falabella", nombre: "Falabella", industria: "retail", dominio: "falabella.cl", auditora: "Firma auditora externa",
    colores: { primario: "#1F7A3A", secundario: "#1C2B22", acento: "#B8D432" },
    sociedades: [
      { id: "falabella-sa", nombre: "Falabella S.A.", rut: "90.749.120-3", escala: 1.08 },
      { id: "plaza-sa", nombre: "Plaza S.A.", rut: "96.795.700-4", escala: 0.071 }
    ]
  },
  smu: {
    id: "smu", nombre: "SMU", industria: "retail", dominio: "smu.cl", auditora: "Firma auditora externa",
    colores: { primario: "#C8102E", secundario: "#2A1A1C", acento: "#F2B705" },
    sociedades: [{ id: "smu-sa", nombre: "SMU S.A.", rut: "76.012.676-4", escala: 0.21 }]
  },
  ripley: {
    id: "ripley", nombre: "Ripley", industria: "retail", dominio: "ripley.cl", auditora: "Firma auditora externa",
    colores: { primario: "#5B2A86", secundario: "#1F1630", acento: "#E0457B" },
    sociedades: [{ id: "ripley-corp", nombre: "Ripley Corp S.A.", rut: "99.579.730-2", escala: 0.14 }]
  },
  bancochile: {
    id: "bancochile", nombre: "Banco de Chile", industria: "banca", dominio: "bancochile.cl", auditora: "Firma auditora externa",
    colores: { primario: "#00338D", secundario: "#101C33", acento: "#8FB4E3" },
    sociedades: [{ id: "bch", nombre: "Banco de Chile", rut: "97.004.110-K", escala: 1 }]
  },
  santander: {
    id: "santander", nombre: "Santander Chile", industria: "banca", dominio: "santander.cl", auditora: "Firma auditora externa",
    colores: { primario: "#EC0000", secundario: "#1C1917", acento: "#9E0A0A" },
    sociedades: [{ id: "bsch", nombre: "Banco Santander-Chile", rut: "97.036.120-6", escala: 1.05 }]
  },
  bci: {
    id: "bci", nombre: "Bci", industria: "banca", dominio: "bci.cl", auditora: "Firma auditora externa",
    colores: { primario: "#003F7D", secundario: "#0E1B2B", acento: "#F7A600" },
    sociedades: [{ id: "bci", nombre: "Banco de Crédito e Inversiones", rut: "97.006.120-7", escala: 1.12 }]
  },
  bancoestado: {
    id: "bancoestado", nombre: "BancoEstado", industria: "banca", dominio: "bancoestado.cl", auditora: "Firma auditora externa",
    colores: { primario: "#E5701A", secundario: "#1E1A16", acento: "#1E5AA8" },
    sociedades: [{ id: "be", nombre: "Banco del Estado de Chile", rut: "97.032.100-9", escala: 0.93 }]
  }
};
