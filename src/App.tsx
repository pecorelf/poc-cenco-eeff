import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./engine/store";
import { useTema } from "./components/ui";
import { Shell } from "./components/Shell";
import Login from "./pages/Login";
import Portada from "./pages/Portada";
import Carga from "./pages/Carga";
import Notas, { NotaDetalle } from "./pages/Notas";
import PreAprobacion, { Revision } from "./pages/PreAprobacion";
import Directorio from "./pages/Directorio";
import Informes from "./pages/Informes";
import Auditoria from "./pages/Auditoria";
import Admin from "./admin/Admin";

function Protegida({ children }: { children: ReactNode }) {
  const u = useApp((s) => s.usuarioId);
  if (!u) return <Navigate to="/" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  useTema();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inicio" element={<Protegida><Portada /></Protegida>} />
        <Route path="/carga" element={<Protegida><Carga /></Protegida>} />
        <Route path="/notas" element={<Protegida><Notas /></Protegida>} />
        <Route path="/notas/:n" element={<Protegida><NotaDetalle /></Protegida>} />
        <Route path="/preaprobacion" element={<Protegida><PreAprobacion /></Protegida>} />
        <Route path="/preaprobacion/:n" element={<Protegida><Revision /></Protegida>} />
        <Route path="/directorio" element={<Protegida><Directorio /></Protegida>} />
        <Route path="/informes" element={<Protegida><Informes /></Protegida>} />
        <Route path="/auditoria" element={<Protegida><Auditoria /></Protegida>} />
        <Route path="/admin" element={<Protegida><Admin /></Protegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
