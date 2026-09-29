import * as XLSX from "xlsx";

export function descargarBlob(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function descargarXlsx(nombre: string, hojas: { nombre: string; filas: (string | number | null)[][]; anchos?: number[] }[]) {
  const wb = XLSX.utils.book_new();
  hojas.forEach((h) => {
    const ws = XLSX.utils.aoa_to_sheet(h.filas);
    if (h.anchos) ws["!cols"] = h.anchos.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, h.nombre.slice(0, 31));
  });
  XLSX.writeFile(wb, nombre);
}

/** Documento Word compatible (HTML con namespace de Office). */
export function descargarDoc(nombre: string, titulo: string, cuerpoHtml: string, marca?: string) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${titulo}</title>
<style>
body{font-family:Arial,sans-serif;font-size:10pt;color:#16212c}
h1{font-size:14pt;margin:0 0 4pt}h2{font-size:11.5pt;margin:16pt 0 4pt}h3{font-size:10pt;margin:10pt 0 3pt}
table{border-collapse:collapse;width:100%;margin:4pt 0 10pt}td,th{border-bottom:0.5pt solid #bbb;padding:2pt 4pt;font-size:9pt}
th{text-align:left;color:#555}td.n{text-align:right}tr.t td{font-weight:bold;border-top:0.8pt solid #333}
.marca{color:#8a929b;font-size:8pt;border-bottom:0.5pt solid #ccc;padding-bottom:3pt;margin-bottom:10pt}
p{line-height:1.45;margin:0 0 6pt}
</style></head><body>${marca ? `<div class="marca">${marca}</div>` : ""}${cuerpoHtml}</body></html>`;
  descargarBlob(nombre, new Blob(["\ufeff", html], { type: "application/msword" }));
}

export function descargarTexto(nombre: string, contenido: string, mime = "text/plain") {
  descargarBlob(nombre, new Blob([contenido], { type: `${mime};charset=utf-8` }));
}

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
