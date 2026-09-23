import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import logoMabet from "../../assets/images/logo-mabet.webp";
import { useAuth } from "../../context/AuthContext.jsx";

function Sidebar({ items = [] }) {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const [menuAbierto, setMenuAbierto] = useState(false);

    const cerrarMenuMovil = () => {
        setMenuAbierto(false);
        document.body.classList.remove("mobile-menu-open");
    };

    const alternarMenu = () => {
        setMenuAbierto((abierto) => {
            const nuevoEstado = !abierto;

            if (nuevoEstado) {
                document.body.classList.add("mobile-menu-open");
            } else {
                document.body.classList.remove("mobile-menu-open");
            }

            return nuevoEstado;
        });
    };

    useEffect(() => {
        return () => {
            document.body.classList.remove("mobile-menu-open");
        };
    }, []);

    const cerrarSesion = async () => {
        try {
            await fetch("/sanctum/csrf-cookie", {
                method: "GET",
                credentials: "include",
            });

            const cookies = document.cookie.split(";");

            let xsrfToken = null;

            for (const cookie of cookies) {
                const [clave, valor] = cookie.trim().split("=");

                if (clave === "XSRF-TOKEN") {
                    xsrfToken = decodeURIComponent(valor);
                    break;
                }
            }

            const response = await fetch("/api/logout", {
                method: "POST",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "X-XSRF-TOKEN": xsrfToken,
                },
            });

            if (!response.ok) {
                const data = await response.json();

                throw new Error(
                    data.message || "Error al cerrar sesión."
                );
            }

            cerrarMenuMovil();
            navigate("/");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    return (
        <>
            <button
                className="mobile-menu-toggle"
                type="button"
                aria-label={
                    menuAbierto
                        ? "Cerrar menú"
                        : "Abrir menú"
                }
                aria-controls="mobileNavigation"
                aria-expanded={menuAbierto}
                onClick={alternarMenu}
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            <aside
                className="management-sidebar"
                id="mobileNavigation"
                aria-label="Navegación de TI"
            >
                <NavLink
                    className="sidebar-logo"
                    to="/encargado-ti"
                    aria-label="PizzERP, inicio"
                    onClick={cerrarMenuMovil}
                >
                    <img
                        src={logoMabet}
                        alt="Logo de Pizzería Mabet"
                    />
                </NavLink>

                <div className="management-brand">
                    <strong>PizzERP</strong>
                    <span>Panel de tecnología</span>
                </div>

                <nav
                    className="management-nav"
                    aria-label="Módulos permitidos"
                >
                    <span className="management-nav-label">
                        MÓDULOS DE TI
                    </span>

                    {items.map((item) => (
                        <NavLink
                            key={item.ruta}
                            to={item.ruta}
                            onClick={cerrarMenuMovil}
                            className={({ isActive }) =>
                                isActive ? "active" : ""
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="management-account">
                    <div className="management-profile">
                        <span className="profile-avatar">
                            TI
                        </span>

                        <div>
                            <strong>
                                {usuario?.nombre_completo ||
                                    "Encargado de TI"}
                            </strong>

                            <small>
                                Rol: {"Encargado de TI"}
                            </small>
                        </div>
                    </div>

                    <button
                        className="logout-button"
                        type="button"
                        onClick={cerrarSesion}
                    >
                        
                        Cerrar sesión
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;