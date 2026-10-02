import { useEffect, useMemo, useRef, useState } from "react";
import "../ModulePage.css";
import "./RolesEstado.css";
import CambiarEstadoUsuarioDialog from "../../components/forms/CambiarEstadoUsuarioDialog/CambiarEstadoUsuarioDialog.jsx";
import RolForm from "../../components/forms/RolForm/RolForm.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import { useAuth } from "../../context/useAuth.js";
import { puede } from "../../constants/roles.js";
import { actualizarRol, cambiarEstadoRol, obtenerRoles, registrarRol } from "../../services/gestionesService.js";
import { useBusquedaLista, useListaSesion } from "../../hooks/useListaSesion.js";

function RolesPermisos() {
    const { usuario, actualizarUsuario } = useAuth();
    const { datos: roles, cargando, error: errorCarga, recargar } = useListaSesion(
        "/api/roles", obtenerRoles, { habilitado: puede(usuario, "roles") });
    const [mensaje, setMensaje] = useState("");
    const [busqueda, setBusqueda] = useBusquedaLista("/api/roles");
    const [rolEditando, setRolEditando] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [enviandoEstado, setEnviandoEstado] = useState(null);
    const [rolSeleccionado, setRolSeleccionado] = useState(null);
    const [errorEstado, setErrorEstado] = useState("");
    const montado = useRef(true);
    const estadoPendiente = useRef(false);

    useEffect(() => {
        montado.current = true;
        return () => { montado.current = false; };
    }, []);

    useEffect(() => {
        if (!mensaje) return undefined;
        const timer = window.setTimeout(() => setMensaje(""), 5000);
        return () => window.clearTimeout(timer);
    }, [mensaje]);

    const filtrados = useMemo(() => roles.filter((rol) => rol.nombre.toLocaleLowerCase()
        .includes(busqueda.trim().toLocaleLowerCase())), [roles, busqueda]);
    const abrir = (rol = null) => {
        setRolEditando(rol);
        setModalAbierto(true);
        setMensaje("");
    };
    const guardar = async (datos) => {
        const respuesta = rolEditando
            ? await actualizarRol(rolEditando.id_rol, datos)
            : await registrarRol(datos);
        if (!montado.current) return;
        setModalAbierto(false);
        setMensaje(rolEditando ? "Rol actualizado correctamente." : "Rol registrado correctamente.");
        if (rolEditando?.nombre === usuario.rol) actualizarUsuario({
            ...usuario, rol: respuesta.rol.nombre,
            permisos: respuesta.rol.estado === "ACTIVO" ? respuesta.rol.permisos : {},
        });
    };
    const abrirCambioEstado = (rol) => {
        if (estadoPendiente.current || !puede(usuario, "roles", rol.estado === "ACTIVO" ? "eliminar" : "editar")) return;
        setErrorEstado("");
        setRolSeleccionado(rol);
    };
    const cerrarCambioEstado = () => {
        if (estadoPendiente.current) return;
        setRolSeleccionado(null);
        setErrorEstado("");
    };
    const cambiarEstado = async () => {
        const rol = rolSeleccionado;
        if (!rol || estadoPendiente.current) return;
        estadoPendiente.current = true;
        setEnviandoEstado(rol.id_rol);
        setErrorEstado("");
        setMensaje("");
        try {
            const nuevo = rol.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
            const respuesta = await cambiarEstadoRol(rol.id_rol, nuevo);
            if (!montado.current) return;
            setRolSeleccionado(null);
            setMensaje(`Rol ${nuevo === "ACTIVO" ? "activado" : "desactivado"} correctamente.`);
            if (rol.nombre === usuario.rol) actualizarUsuario({
                ...usuario, rol: respuesta.rol.nombre,
                permisos: respuesta.rol.estado === "ACTIVO" ? respuesta.rol.permisos : {},
            });
        } catch (error) {
            if (montado.current) setErrorEstado(error instanceof TypeError
                ? "No fue posible cambiar el estado del rol. Revisá tu conexión e intentá nuevamente."
                : error.message || "No fue posible cambiar el estado del rol. Intentá nuevamente.");
        } finally {
            estadoPendiente.current = false;
            if (montado.current) setEnviandoEstado(null);
        }
    };

    return <div className="module-page roles-page">
        <header className="management-header"><div>
            <p className="eyebrow">Administración</p><h1>Roles y permisos</h1>
            <div className="header-description">
                <p>Crea roles y configura las funciones del sistema disponibles para cada uno.</p>
                {puede(usuario, "roles", "crear") && <button className="management-primary" type="button" onClick={() => abrir()}>+ Crear rol</button>}
            </div>
        </div></header>
        {mensaje && <p className="role-page-message" role="status">{mensaje}</p>}
        {errorCarga && <p className="role-page-message" role="alert">{errorCarga} <button type="button" onClick={() => void recargar().catch(() => {})}>Reintentar</button></p>}
        <section className="management-panel">
            <div className="management-panel-header"><div><h2>Roles registrados</h2>
                <p>Consulta los roles configurados y los permisos asignados en el sistema.</p></div>
                <PageSearch className="page-search--header" label="Buscar rol" id="buscarRol"
                    placeholder="Buscar por nombre..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
            </div>
            <div className="table-wrap"><table className="management-table">
                <thead><tr><th>Rol</th><th>Pestañas permitidas</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{cargando ? <tr><td colSpan="4"><LoadingSpinner label="Cargando roles" /></td></tr>
                    : filtrados.length === 0 ? <tr><td colSpan="4" className="module-empty">{busqueda ? "No se encontraron roles." : "No hay roles registrados."}</td></tr>
                        : filtrados.map((rol) => <tr className="management-card" key={rol.id_rol}>
                            <td data-label="Rol">{rol.nombre}</td>
                            <td data-label="Pestañas permitidas">{Object.entries(rol.permisos ?? {}).filter(([, acciones]) => acciones.ver).map(([modulo]) => modulo).join(", ") || "Ninguna"}</td>
                            <td data-label="Estado">{rol.estado === "ACTIVO" ? "Activo" : "Inactivo"}</td>
                            <td data-label="Acciones"><div className="roles-actions" aria-busy={enviandoEstado === rol.id_rol}>
                                {puede(usuario, "roles", "editar") &&
                                    <button type="button" disabled={enviandoEstado === rol.id_rol} onClick={() => abrir(rol)}>Modificar</button>}
                                {puede(usuario, "roles", rol.estado === "ACTIVO" ? "eliminar" : "editar") &&
                                    <button className="roles-state-action" type="button"
                                        disabled={enviandoEstado !== null} onClick={() => abrirCambioEstado(rol)}>
                                        {enviandoEstado === rol.id_rol
                                            ? rol.estado === "ACTIVO" ? "Desactivando…" : "Activando…"
                                            : rol.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button>}
                            </div></td>
                        </tr>)}</tbody>
            </table></div>
        </section>
        {modalAbierto && <RolForm key={rolEditando?.id_rol ?? "nuevo"} rol={rolEditando}
            onGuardar={guardar} onCerrar={() => setModalAbierto(false)} />}
        <CambiarEstadoUsuarioDialog usuarioSeleccionado={rolSeleccionado} entidad="rol"
            isSubmitting={enviandoEstado !== null} mensajeError={errorEstado}
            textoEnviando={rolSeleccionado?.estado === "ACTIVO" ? "Desactivando…" : "Activando…"}
            onConfirm={cambiarEstado} onClose={cerrarCambioEstado} />
    </div>;
}

export default RolesPermisos;
