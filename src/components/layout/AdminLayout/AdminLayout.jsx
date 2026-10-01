import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../../Sidebar/Sidebar.jsx";
import { useAuth } from "../../../context/useAuth.js";
import { normalizarRol, puedeGestionarUsuarios } from "../../../constants/roles.js";
import "./AdminLayout.css";

function AdminLayout() {
    const { usuario, cargandoSesion } = useAuth();
    const navItems = [
        { label: "Categorías", ruta: "/administrador/categorias" },
        { label: "Productos", ruta: "/administrador/productos" },
        { label: "Ingredientes", ruta: "/administrador/ingredientes" },
        { label: "Promociones", ruta: "/administrador/promociones" },
        { label: "Usuarios", ruta: "/administrador/usuarios" },
        { label: "Roles y permisos", ruta: "/administrador/roles" },
    ];

    if (cargandoSesion) {
        return null;
    }

    if (!puedeGestionarUsuarios(usuario) || normalizarRol(usuario?.rol) !== "ADMINISTRADOR") {
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

export default AdminLayout;
