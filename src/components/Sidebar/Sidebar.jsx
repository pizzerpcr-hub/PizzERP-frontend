import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import logoMabet from "../../assets/images/logo-mabet.webp";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    normalizarRol,
    obtenerEtiquetaRol,
    obtenerInformacionPanel,
} from "../../constants/roles.js";
import { cerrarSesion as cerrarSesionService } from "../../services/loginService.js";

function Sidebar({ items = [] }) {
    const navigate = useNavigate();
    const {
        usuario,
        cerrarSesion: limpiarSesion,
    } = useAuth();
    const [menuAbierto, setMenuAbierto] = useState(false);

    const rolNormalizado = normalizarRol(usuario?.rol);
    const informacionPanel = obtenerInformacionPanel(rolNormalizado);
    const nombreUsuario = usuario?.nombre_completo || "Usuario";
    const iniciales = nombreUsuario
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte.charAt(0))
        .join("")
        .toUpperCase() || "US";
    const tituloPanel = informacionPanel.panel;
    const tituloModulos = informacionPanel.modulos;

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
            await cerrarSesionService();
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        } finally {
            limpiarSesion();
            cerrarMenuMovil();
            navigate("/");
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
                aria-label={`Navegación de ${tituloPanel}`}
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
                    <span>{tituloPanel}</span>
                </div>

                <nav
                    className="management-nav"
                    aria-label="Módulos permitidos"
                >
                    <span className="management-nav-label">
                        {tituloModulos}
                    </span>

                    {items.map((item) =>
                        item.disabled ? (
                            <span
                                key={item.label}
                                className="management-nav-disabled"
                                aria-disabled="true"
                            >
                                <span>{item.label}</span>
                            </span>
                        ) : (
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
                        ),
                    )}
                </nav>

                <div className="management-account">
                    <div className="management-profile">
                        <span className="profile-avatar">
                            {iniciales}
                        </span>

                        <div>
                            <strong>
                                {nombreUsuario}
                            </strong>

                            <small>
                                Rol: {obtenerEtiquetaRol(rolNormalizado)}
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
