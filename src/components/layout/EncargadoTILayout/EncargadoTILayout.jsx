import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../../Sidebar/Sidebar.jsx";
import LoadingSpinner from "../../common/LoadingSpinner/LoadingSpinner.jsx";
import { useAuth } from "../../../context/useAuth.js";
import { normalizarRol, puedeGestionarUsuarios } from "../../../constants/roles.js";
import "./EncargadoTILayout.css";

function EncargadoTILayout() {
    const { usuario, cargandoSesion } = useAuth();
    const navItems = [
        ...(puedeGestionarUsuarios(usuario)
            ? [
                  {
                      label: "Usuarios",
                      ruta: "/encargado-ti/usuarios",
                  },
                  {
                      label: "Roles y permisos",
                      ruta: "/encargado-ti/roles",
                  },
              ]
            : []),
        {
            label: "Bitácora de Movimientos",
            disabled: true,
        },
    ];

    if (cargandoSesion) {
        return <LoadingSpinner label="Cargando página" fullPage />;
    }

    if (!puedeGestionarUsuarios(usuario) || normalizarRol(usuario?.rol) !== "TI") {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="management-shell">
            <Sidebar items={navItems} />

            <main className="management-main">
                <Outlet />
            </main>
        </div>
    );
}

export default EncargadoTILayout;
