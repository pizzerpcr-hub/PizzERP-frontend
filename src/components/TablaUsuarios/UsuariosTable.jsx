import {
    normalizarRol,
    obtenerEtiquetaRol,
} from "../../constants/roles.js";
import LoadingSpinner from "../common/LoadingSpinner/LoadingSpinner.jsx";

function UsuariosTable({
    usuarios,
    cargando,
    hayBusqueda,
    idUsuarioActual,
    usuariosPendientes,
    onEditar,
    onCambiarEstado,
    puedeEditar = true,
    puedeCambiarEstado = () => true,
}) {
    return (
        <div className="table-wrap">
            <table className="usuarios-table" role="table" aria-label="Usuarios registrados">
                <thead role="rowgroup">
                    <tr role="row">
                        <th>Nombre Completo</th>
                        <th>Usuario</th>
                        <th>Rol asignado</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>

                {cargando ? (
                    <tbody role="rowgroup">
                        <tr role="row">
                            <td role="cell" colSpan="5" className="cargando-usuarios">
                                <LoadingSpinner label="Cargando usuarios" />
                            </td>
                        </tr>
                    </tbody>
                ) : (
                    <tbody id="usersTable" role="rowgroup">
                        {usuarios.length === 0 ? (
                            <tr role="row">
                                <td role="cell" colSpan="5" className="empty-row">
                                    {hayBusqueda
                                        ? "No se encontraron usuarios."
                                        : "No hay usuarios registrados."}
                                </td>
                            </tr>
                        ) : (
                            usuarios.map((usuarioListado) => {
                                const rolNormalizado = normalizarRol(
                                    usuarioListado.rol,
                                );
                                const estadoNormalizado = String(
                                    usuarioListado.estado ?? "",
                                ).toUpperCase();
                                const esUsuarioActual =
                                    idUsuarioActual != null &&
                                    String(usuarioListado.id_usuario) ===
                                        String(idUsuarioActual);
                                const autoDesactivacion =
                                    esUsuarioActual &&
                                    estadoNormalizado === "ACTIVO";
                                const cambioPendiente = usuariosPendientes.has(
                                    String(usuarioListado.id_usuario),
                                );

                                return (
                                    <tr role="row" className="usuario-card" key={usuarioListado.id_usuario}>
                                        <td role="cell" className="usuario-card-nombre">
                                            <span className="usuario-field-label" aria-hidden="true">Nombre completo</span>
                                            <span>{usuarioListado.nombre_completo}</span>
                                        </td>

                                        <td role="cell" className="usuario-card-username">
                                            <span className="usuario-field-label" aria-hidden="true">Usuario</span>
                                            <span>{usuarioListado.nombre_usuario}</span>
                                        </td>

                                        <td role="cell">
                                            <span className="usuario-field-label" aria-hidden="true">Rol asignado</span>
                                            <span
                                                className="role-badge"
                                            >
                                                {obtenerEtiquetaRol(
                                                    rolNormalizado,
                                                )}
                                            </span>
                                        </td>

                                        <td role="cell">
                                            <span className="usuario-field-label" aria-hidden="true">Estado</span>
                                            <span
                                                className="user-status"
                                            >
                                                {estadoNormalizado}
                                            </span>
                                        </td>

                                        <td role="cell" className="user-actions">
                                            {puedeEditar && <button
                                                type="button"
                                                onClick={() =>
                                                    onEditar(usuarioListado)
                                                }
                                                disabled={cambioPendiente}
                                            >
                                                Modificar
                                            </button>}

                                            {puedeCambiarEstado(estadoNormalizado) && <button
                                                type="button"
                                                onClick={() =>
                                                    onCambiarEstado(
                                                        usuarioListado,
                                                    )
                                                }
                                                disabled={autoDesactivacion || cambioPendiente}
                                                title={
                                                    autoDesactivacion
                                                        ? "No puedes desactivar tu propia cuenta."
                                                        : undefined
                                                }
                                            >
                                                {estadoNormalizado === "ACTIVO"
                                                    ? "Desactivar"
                                                    : "Activar"}
                                            </button>}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                )}
            </table>
        </div>
    );
}

export default UsuariosTable;
