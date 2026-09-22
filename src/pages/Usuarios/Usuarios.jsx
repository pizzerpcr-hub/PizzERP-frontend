import "./Usuarios.css";
import { useEffect, useState } from "react";
import logoMabet from "../../assets/images/logo-mabet.webp";
import { useNavigate } from "react-router-dom";
import RegistrarUsuarioForm from "../../components/forms/RegistrarUsuarioForm/RegistrarUsuarioForm";
import { useAuth } from "../../context/AuthContext.jsx";

function Usuarios() {
    const navigate = useNavigate();
    const [mostrarForm, setMostrarForm] = useState(false);
    const [usuarios, setUsuarios] = useState([]);
    const { usuario } = useAuth();
    const [cargandoUsuarios, setCargandoUsuarios] = useState(true);

    const obtenerCookie = (nombre) => {
        const cookies = document.cookie.split(";");

        for (const cookie of cookies) {
            const [clave, valor] = cookie.trim().split("=");

            if (clave === nombre) {
                return decodeURIComponent(valor);
            }
        }
        return null;
    };


    const registrarUsuario = async (usuario) => {
        try {
            await fetch("/sanctum/csrf-cookie", {
                method: "GET",
                credentials: "include",
            });

            const xsrfToken = obtenerCookie("XSRF-TOKEN");

            const response = await fetch("/api/users", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-XSRF-TOKEN": xsrfToken,
                },
                body: JSON.stringify(usuario),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Error al registrar el usuario."
                );
            }

            return data;
        } catch (error) {
            console.error("Error al registrar el usuario:", error);
            throw error;
        }
    };

    const handleFormSubmit = async (usuario) => {
        try {
            const data = await registrarUsuario(usuario);

            setUsuarios((usuariosActuales) => [
                ...usuariosActuales,
                data.usuario,
            ]);

            setMostrarForm(false);
        } catch (error) {
            console.error("Error al registrar el usuario:", error);
        }
    };

    const obtenerUsuarios = async () => {
        try {
            const response = await fetch("/api/users", {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Error al obtener los usuarios."
                );
            }

            return data.usuarios;
        } catch (error) {
            console.error("Error al obtener usuarios:", error);
            throw error;
        }
    };

    useEffect(() => {
          if (!usuario) {
              return;
          }

          const cargarUsuarios = async () => {
              try {
                  setCargandoUsuarios(true);

                  const data = await obtenerUsuarios();
                  setUsuarios(data);
              } catch (error) {
                  console.error(error);
              } finally {
                  setCargandoUsuarios(false);
              }
          };

          cargarUsuarios();
      }, [usuario]);


    useEffect(() => {
          if (!usuario) {
              navigate("/");
              return;
          }

          if (usuario.rol?.toUpperCase() !== "ADMINISTRADOR") {
              navigate("/");
          }
      }, [usuario, navigate]);

      if (!usuario || usuario.rol?.toUpperCase() !== "ADMINISTRADOR") {
          return null;
      }

    const cerrarSesion = async () => {
        try {
            await fetch("/sanctum/csrf-cookie", {
                method: "GET",
                credentials: "include",
            });

            const xsrfToken = obtenerCookie("XSRF-TOKEN");

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

            navigate("/");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    return (
        <div className="management-shell">

            {/* Menú móvil */}
            <button
                className="mobile-menu-toggle"
                id="mobileMenuToggle"
                type="button"
                aria-label="Abrir menú"
                aria-controls="mobileNavigation"
                aria-expanded="false"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* Sidebar */}
            <aside
                className="management-sidebar"
                id="mobileNavigation"
                aria-label="Navegación de TI"
            >
                <a
                    className="sidebar-logo"
                    href="/usuarios"
                    aria-label="PizzERP, inicio"
                >
                    <img
                        src={logoMabet}
                        alt="Logo de Pizzería Mabet"
                    />
                </a>

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

                    <a className="active" href="#">
                        Usuarios
                    </a>

                    <a href="#">
                        Bitácora de Movimientos
                    </a>
                </nav>

                <div className="management-account">
                    <div className="management-profile">
                        <span className="profile-avatar">
                            TI
                        </span>

                        <div>
                            <strong>Encargado de TI</strong>
                            <small>Rol: TI</small>
                        </div>
                    </div>

                    <button
                        className="logout-button"
                        type="button"
                        onClick={cerrarSesion}
                    >
                        <span aria-hidden="true"></span>
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Contenido principal */}
            <main className="management-main">

                <header className="management-header">
                    <div>
                        <p className="eyebrow">
                            Administración
                        </p>

                        <h1>Usuarios</h1>

                        <div className="header-description">
                            <p>
                                Registra y administra las cuentas del sistema.
                            </p>

                            <button
                                className="management-primary"
                                type="button"
                                onClick={() => setMostrarForm(true)}
                            >
                                + Registrar usuario
                            </button>
                        </div>
                    </div>
                </header>

                <p
                    className="management-notice"
                    id="managementNotice"
                    role="status"
                    aria-live="polite"
                    hidden
                ></p>

                <section className="management-panel users-panel">

                    <div className="management-panel-header">
                        <div>
                            <h2>Usuarios registrados</h2>

                            <p>
                                Modifica los datos de una cuenta o elimina
                                usuarios que ya no requieren acceso.
                            </p>
                        </div>

                        <label className="search-box">
                            ⌕

                            <input
                                id="userSearch"
                                type="search"
                                placeholder="Buscar usuario"
                            />
                        </label>
                    </div>

                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre Completo</th>
                                    <th>Usuario</th>
                                    <th>Rol asignado</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            {cargandoUsuarios ? (
                                <tbody>
                                    <tr>
                                        <td colSpan="5" className="cargando-usuarios">  
                                        </td>
                                    </tr>
                                </tbody>
                            ) : (
                                <tbody id="usersTable">
                                    {usuarios.map((usuario) => (
                                        <tr key={usuario.id_usuario}>
                                            <td>
                                                {usuario.nombre_completo}
                                            </td>

                                            <td>
                                                {usuario.nombre_usuario}
                                            </td>

                                            <td>
                                                {usuario.rol}
                                            </td>

                                            <td>
                                                {usuario.estado}
                                            </td>

                                            <td className="user-actions">
                                                <button
                                                    type="button"
                                                    className="management-primary"
                                                >
                                                    Modificar
                                                </button>

                                                <button
                                                    type="button"
                                                    className="management-danger"
                                                >
                                                    {usuario.estado === "ACTIVO" ||
                                                    usuario.estado === "Activo"
                                                        ? "Eliminar"
                                                        : "Activar"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}

                        </table>
                    </div>
                </section>
            </main>

            {/* Formulario de registrar usuario */}
            {mostrarForm && (
                <RegistrarUsuarioForm
                    onSubmit={handleFormSubmit}
                    onClose={() => setMostrarForm(false)}
                />
            )}

            {/* Modal eliminar */}
            <dialog
                className="user-dialog small"
                id="deleteDialog"
            >
                <form id="deleteForm">

                    <div className="dialog-heading">
                        <div>
                            <p className="eyebrow">
                                Eliminar usuario
                            </p>

                            <h2>
                                ¿Confirmar eliminación?
                            </h2>
                        </div>

                        <button
                            className="dialog-close"
                            type="button"
                            aria-label="Cerrar"
                        >
                            ×
                        </button>
                    </div>

                    <p>
                        Esta acción no se puede deshacer.
                    </p>

                    <input
                        id="deletingId"
                        type="hidden"
                    />

                    <div className="dialog-actions">
                        <button
                            className="management-secondary"
                            type="button"
                        >
                            Cancelar
                        </button>

                        <button
                            className="management-danger"
                            type="submit"
                        >
                            Eliminar
                        </button>
                    </div>

                </form>
            </dialog>

        </div>
    );
}

export default Usuarios;