import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../../Sidebar/Sidebar.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { normalizarRol } from "../../../constants/roles.js";
import "./EncargadoTILayout.css";

function EncargadoTILayout() {
    const { usuario, cargandoSesion } = useAuth();
    const navItems = [
        ...(normalizarRol(usuario?.rol) === "ADMINISTRADOR"
            ? [
                  {
                      label: "Usuarios",
                      ruta: "/encargado-ti/usuarios",
                  },
              ]
            : []),
        {
            label: "Bitácora de Movimientos",
            disabled: true,
        },
    ];

    if (cargandoSesion) {
        return null;
    }

    if (!usuario) {
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
