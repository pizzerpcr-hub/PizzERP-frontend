import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import logoMabet from "../../assets/images/logo-mabet.webp";
import { useAuth } from "../../context/useAuth.js";
import {
    normalizarRol,
    obtenerEtiquetaRol,
    obtenerInformacionPanel,
} from "../../constants/roles.js";

function Sidebar({ items = [] }) {
    const navigate = useNavigate();
    const ubicacion = useLocation();
    const {
        usuario,
        cerrarSesion: limpiarSesion,
    } = useAuth();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const botonMenu = useRef(null);

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
        const escritorio = window.matchMedia("(min-width: 1101px)");
        const cerrar = () => {
            setMenuAbierto(false);
            document.body.classList.remove("mobile-menu-open");
        };
        const alCambiarAncho = () => {
            if (escritorio.matches) cerrar();
        };
        const alPulsarTecla = (event) => {
            if (event.key === "Escape" && document.body.classList.contains("mobile-menu-open")) {
                cerrar();
                botonMenu.current?.focus();
            }
        };
        escritorio.addEventListener("change", alCambiarAncho);
        document.addEventListener("keydown", alPulsarTecla);
        return () => {
            escritorio.removeEventListener("change", alCambiarAncho);
            document.removeEventListener("keydown", alPulsarTecla);
            document.body.classList.remove("mobile-menu-open");
        };
    }, []);

    // Dispara el logout de inmediato (sin nada async antes),
    // y solo navega / cierra el menú cuando el overlay ya terminó.
    const manejarClicCerrarSesion = () => {
        limpiarSesion(() => {
            cerrarMenuMovil();
            navigate("/", { replace: true });
        });
    };

    return (
        <>
            <div className="mobile-menu-bar" aria-hidden="true" />
            <button
                ref={botonMenu}
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

            {menuAbierto && (
                <button
                    className="mobile-menu-backdrop"
                    type="button"
                    aria-label="Cerrar menú al tocar fuera"
                    onClick={() => {
                        cerrarMenuMovil();
                        botonMenu.current?.focus();
                    }}
                />
            )}

            <aside
                className="management-sidebar"
                id="mobileNavigation"
                aria-label={`Navegación de ${tituloPanel}`}
            >
                <NavLink
                    className="sidebar-logo"
                    to={ubicacion}
                    aria-label="PizzERP, recargar página actual"
                    onClick={(evento) => {
                        evento.preventDefault();
                        window.location.reload();
                    }}
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
                        onClick={manejarClicCerrarSesion}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
