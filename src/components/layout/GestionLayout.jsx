import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar.jsx";
import LoadingSpinner from "../common/LoadingSpinner/LoadingSpinner.jsx";
import { useAuth } from "../../context/useAuth.js";
import { obtenerItemsNavegacion } from "../../constants/roles.js";
import "./EncargadoTILayout/EncargadoTILayout.css";

export default function GestionLayout() {
    const { usuario, cargandoSesion } = useAuth();
    if (cargandoSesion || (usuario && !usuario.permisos)) return <LoadingSpinner label="Cargando permisos" fullPage />;
    if (!usuario || usuario.estado !== "ACTIVO") return <Navigate to="/" replace />;
    const items = obtenerItemsNavegacion(usuario);
    return <div className="management-shell">
        <Sidebar items={items} />
        <main className="management-main"><Outlet /></main>
    </div>;
}
