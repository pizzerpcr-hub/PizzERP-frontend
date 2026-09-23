import { Outlet } from "react-router-dom";
import Sidebar from "../../Sidebar/Sidebar.jsx";
import "./EncargadoTILayout.css";

function EncargadoTILayout() {
    const navItems = [
        {
            label: "Usuarios",
            ruta: "/encargado-ti/usuarios",
        },
        {
            label: "Bitácora de Movimientos",
            ruta: " ",
        },
    ];

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