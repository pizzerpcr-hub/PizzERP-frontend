import { Navigate } from "react-router-dom";
import LoadingSpinner from "../../common/LoadingSpinner/LoadingSpinner.jsx";
import Sidebar from "../../Sidebar/Sidebar.jsx";
import { useAuth } from "../../../context/useAuth.js";
import { normalizarRol, obtenerRutaInicio } from "../../../constants/roles.js";
import "../EncargadoTILayout/EncargadoTILayout.css";
import "./PanelTemporal.css";

function PanelTemporal({ rol, items = [] }) {
    const { usuario, cargandoSesion } = useAuth();
    if (cargandoSesion) return <LoadingSpinner label="Cargando página" fullPage />;

    const rutaInicio = obtenerRutaInicio(usuario);
    if (!rutaInicio || normalizarRol(usuario?.rol) !== rol) {
        return <Navigate to={rutaInicio ?? "/"} replace />;
    }

    return (
        <div className="management-shell temporary-panel">
            <Sidebar items={items} />
            <main className="management-main" aria-label={`Panel de ${rol.toLowerCase()}`} />
        </div>
    );
}

export default PanelTemporal;
