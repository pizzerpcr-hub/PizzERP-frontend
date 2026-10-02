import { Navigate } from "react-router-dom";
import LoadingSpinner from "../../common/LoadingSpinner/LoadingSpinner.jsx";
import Sidebar from "../../Sidebar/Sidebar.jsx";
import { useAuth } from "../../../context/useAuth.js";
import { puede, obtenerItemsNavegacion, obtenerRutaInicio } from "../../../constants/roles.js";
import "../EncargadoTILayout/EncargadoTILayout.css";
import "./PanelTemporal.css";

function PanelTemporal({ modulo, titulo }) {
    const { usuario, cargandoSesion } = useAuth();
    if (cargandoSesion || (usuario && !usuario.permisos)) return <LoadingSpinner label="Cargando página" fullPage />;

    const rutaInicio = obtenerRutaInicio(usuario);
    if (!rutaInicio || !puede(usuario, modulo)) {
        return <Navigate to={rutaInicio ?? "/"} replace />;
    }

    return (
        <div className="management-shell temporary-panel">
            <Sidebar items={obtenerItemsNavegacion(usuario)} />
            <main className="management-main" aria-label={`Panel de ${titulo}`} />
        </div>
    );
}

export default PanelTemporal;
