import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import { obtenerRutaInicio, puede } from "../../constants/roles.js";
import LoadingSpinner from "../common/LoadingSpinner/LoadingSpinner.jsx";

export default function PermissionRoute({ modulo, children }) {
    const { usuario, cargandoSesion } = useAuth();
    if (cargandoSesion || (usuario && !usuario.permisos)) return <LoadingSpinner label="Cargando permisos" fullPage />;
    if (!puede(usuario, modulo)) return <Navigate to={obtenerRutaInicio(usuario) ?? "/"} replace />;
    return children;
}
