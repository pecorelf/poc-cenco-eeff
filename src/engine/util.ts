// Utilidades del motor: generador determinista, fechas relativas a hoy y formato chileno.

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number | string) {
  let a = typeof seed === "string" ? hashStr(seed) : seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T,>(arr: T[]) => arr[Math.floor(next() * arr.length)],
    split: (n: number) => {
      const w = Array.from({ length: n }, () => 0.3 + next());
      const s = w.reduce((x, y) => x + y, 0);
      return w.map((x) => x / s);
    }
  };
}

// ---------- Fechas ----------

// Feriados fijos de Chile (mes-día). Suficiente para el cálculo de días hábiles de la demo.
const FERIADOS = ["01-01", "05-01", "05-21", "06-20", "06-29", "07-16", "08-15", "09-18", "09-19", "10-12", "10-31", "11-01", "12-08", "12-25"];

export const hoy = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const ahora = () => new Date();

export function esHabil(d: Date) {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const md = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return !FERIADOS.includes(md);
}

export function sumarHabiles(desde: Date, n: number) {
  const d = new Date(desde);
  let k = 0;
  while (k < n) {
    d.setDate(d.getDate() + 1);
    if (esHabil(d)) k++;
  }
  return d;
}

export function habilesEntre(a: Date, b: Date) {
  // días hábiles desde a (excl.) hasta b (incl.); negativo si b < a
  const s = a <= b ? 1 : -1;
  const d = new Date(a);
  let k = 0;
  while ((s > 0 && d < b) || (s < 0 && d > b)) {
    d.setDate(d.getDate() + s);
    if (esHabil(d)) k += s;
  }
  return k;
}

export function finTrimestre(anio: number, t: number) {
  return new Date(anio, t * 3, 0);
}

export function trimestreDe(d: Date) {
  return (Math.floor(d.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

/** Ejercicio en curso: el último trimestre cerrado si terminó hace 60 días o menos; si no, el trimestre en curso. */
export function periodoEnCurso() {
  const h = hoy();
  let anio = h.getFullYear();
  let t = trimestreDe(h) - 1;
  if (t === 0) {
    t = 4;
    anio -= 1;
  }
  const fin = finTrimestre(anio, t);
  const dias = (h.getTime() - fin.getTime()) / 86400000;
  if (dias <= 60) return { anio, trimestre: t as 1 | 2 | 3 | 4 };
  return { anio: h.getFullYear(), trimestre: trimestreDe(h) };
}

export function periodoAnterior(anio: number, t: number, k = 1) {
  let a = anio;
  let q = t;
  for (let i = 0; i < k; i++) {
    q -= 1;
    if (q === 0) {
      q = 4;
      a -= 1;
    }
  }
  return { anio: a, trimestre: q as 1 | 2 | 3 | 4 };
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const fechaCorta = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${String(d.getDate()).padStart(2, "0")}-${MESES_C[d.getMonth()]}-${d.getFullYear()}`;
};
export const fechaLarga = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
export const fechaHora = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${fechaCorta(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const mesNombre = (m: number) => MESES[m];

export const isoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString();

/** Hora hábil plausible hoy (o días atrás) para eventos sintéticos, nunca en el futuro. */
export function horaHabil(diasAtras: number, r: () => number) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  while (!esHabil(d)) d.setDate(d.getDate() - 1);
  const h = 8 + Math.floor(r() * 10);
  d.setHours(h, Math.floor(r() * 60), 0, 0);
  const n = new Date();
  if (d > n) d.setTime(n.getTime() - Math.floor(r() * 3600000) - 300000);
  return d.toISOString();
}

// ---------- Formato ----------

export const miles = (n: number) => {
  const r = Math.round(n);
  const s = Math.abs(r).toLocaleString("es-CL");
  return r < 0 ? `(${s})` : s;
};
export const mm = (n: number) => `M$ ${miles(n)}`;
export const pct = (n: number, d = 1) => `${n.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
export const num = (n: number, d = 2) => n.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });

export const uid = (p = "") => p + Math.random().toString(36).slice(2, 9);
