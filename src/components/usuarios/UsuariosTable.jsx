import {
    normalizarRol,
    obtenerEtiquetaRol,
} from "../../constants/roles.js";

function UsuariosTable({
    usuarios,
    cargando,
    hayBusqueda,
    idUsuarioActual,
    usuariosPendientes,
    onEditar,
    onCambiarEstado,
}) {
    return (
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

                {cargando ? (
                    <tbody>
                        <tr>
                            <td colSpan="5" className="cargando-usuarios">
                                <span className="cargando-usuarios-texto" role="status">
                                    Cargando usuarios
                                </span>
                            </td>
                        </tr>
                    </tbody>
                ) : (
                    <tbody id="usersTable">
                        {usuarios.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="empty-row">
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
                                    <tr key={usuarioListado.id_usuario}>
                                        <td>{usuarioListado.nombre_completo}</td>

                                        <td>
                                            {usuarioListado.nombre_usuario?.toUpperCase()}
                                        </td>

                                        <td>
                                            <span
                                                className={`role-badge ${rolNormalizado.toLowerCase()}`}
                                            >
                                                {obtenerEtiquetaRol(
                                                    rolNormalizado,
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={`user-status ${estadoNormalizado.toLowerCase()}`}
                                            >
                                                {estadoNormalizado}
                                            </span>
                                        </td>

                                        <td className="user-actions">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onEditar(usuarioListado)
                                                }
                                                disabled={cambioPendiente}
                                            >
                                                Modificar
                                            </button>

                                            <button
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
                                            </button>
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
