import "./Usuarios.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RegistrarUsuarioForm from "../../components/forms/RegistrarUsuarioForm/RegistrarUsuarioForm";
import { useAuth } from "../../context/AuthContext.jsx";
import {registrarUsuario,obtenerUsuarios,} from "../../services/usuariosService";

function Usuarios() {
    const navigate = useNavigate();

    const [mostrarForm, setMostrarForm] = useState(false);
    const [usuarios, setUsuarios] = useState([]);
    const [cargandoUsuarios, setCargandoUsuarios] = useState(true);

    const { usuario } = useAuth();


    const handleFormSubmit = async (usuarioNuevo) => {
        try {
            const data = await registrarUsuario(usuarioNuevo);

            setUsuarios((usuariosActuales) => [
                ...usuariosActuales,
                data.usuario,
            ]);

            setMostrarForm(false);
        } catch (error) {
            console.error("Error al registrar el usuario:", error);
        }
    };


    useEffect(() => {
        if (!usuario) {
            navigate("/");
            return;
        }

        const rol = usuario.rol?.toUpperCase();

        if (
            rol !== "ADMINISTRADOR" &&
            rol !== "ENCARGADO DE TI"
        ) {
            navigate("/");
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
    }, [usuario, navigate]);

    if (!usuario) {
        return null;
    }

    const rol = usuario.rol?.toUpperCase();

    if (
        rol !== "ADMINISTRADOR" &&
        rol !== "ENCARGADO DE TI"
    ) {
        return null;
    }


    return (
        <>
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
                                    <td
                                        colSpan="5"
                                        className="cargando-usuarios"
                                    >
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

            {mostrarForm && (
                <RegistrarUsuarioForm
                    onSubmit={handleFormSubmit}
                    onClose={() => setMostrarForm(false)}
                />
            )}

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
        </>
    );
}

export default Usuarios;