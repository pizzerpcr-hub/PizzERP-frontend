import { useEffect, useState } from "react";

import CambiarEstadoUsuarioDialog from "../../components/forms/CambiarEstadoUsuarioDialog/CambiarEstadoUsuarioDialog.jsx";
import UsuariosTable from "../../components/TablaUsuarios/UsuariosTable.jsx";
import Paginacion from "../../components/common/Paginacion/Paginacion.jsx";
import { useTablaPaginada } from "../../hooks/useTablaPaginada.js";
import RegistrarUsuarioForm from "../../components/forms/RegistrarUsuarioForm/RegistrarUsuarioForm.jsx";
import ModificarUsuarioForm from "../../components/forms/ModificarUsuarioForm/ModificarUsuarioForm.jsx";

import { puedeGestionarUsuarios } from "../../constants/roles.js";
import { useAuth } from "../../context/useAuth.js";

import {
    actualizarUsuario as actualizarUsuarioService,
    cambiarEstadoUsuario,
    registrarUsuario,
} from "../../services/usuariosService.js";

import { obtenerRolesAsignables } from "../../services/gestionesService.js";
import { puede } from "../../constants/roles.js";
import { useBusquedaLista, useListaSesion } from "../../hooks/useListaSesion.js";

import "../ModulePage.css";
import "./Usuarios.css";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";

const usuarioPublico = (usuarioListado) => ({
    id_usuario: usuarioListado.id_usuario,
    nombre_completo: usuarioListado.nombre_completo,
    nombre_usuario: usuarioListado.nombre_usuario,
    rol: usuarioListado.rol,
    estado: usuarioListado.estado,
});

const obtenerErroresCampo = (error) => {
    if (error.status !== 422) return null;
    const erroresCampo = {};
    for (const campo of ["nombre_completo", "nombre_usuario", "contrasena", "rol"]) {
        const mensajes = error.errors?.[campo];
        const mensaje = Array.isArray(mensajes) ? mensajes[0] : mensajes;
        if (typeof mensaje === "string" && mensaje) erroresCampo[campo] = mensaje;
    }
    return Object.keys(erroresCampo).length ? erroresCampo : null;
};

function Usuarios() {
    const [mostrarForm, setMostrarForm] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [mensajeGeneral, setMensajeGeneral] = useState(null);
    const [usuariosPendientes, setUsuariosPendientes] = useState(new Set());
    const [busqueda, setBusqueda] = useBusquedaLista("/api/users");
    const { usuario, cargandoSesion, actualizarUsuario } = useAuth();
    const tieneAccesoUsuarios = puedeGestionarUsuarios(usuario);
    const puedeEditarUsuarios = puede(usuario, "usuarios", "editar");
    const puedeCrearUsuarios = puede(usuario, "usuarios", "crear");
    const necesitaCatalogoRoles = puedeEditarUsuarios || puedeCrearUsuarios;
    const { datos: usuarios, paginacion, cargando: cargandoUsuarios,
        error: errorListado, recargar: reintentarListado } = useTablaPaginada(
        "/api/users", "usuarios", busqueda, !cargandoSesion && tieneAccesoUsuarios);
    const { datos: rolesDisponibles, disponible: catalogoRolesDisponible,
        error: errorRoles, recargar: reintentarRoles } = useListaSesion(
        "/api/users/roles", obtenerRolesAsignables,
        { habilitado: !cargandoSesion && tieneAccesoUsuarios && necesitaCatalogoRoles });
    const estadoCatalogoRoles = catalogoRolesDisponible ? "listo" : errorRoles ? "error" : "cargando";

    useEffect(() => {
        if (!mensajeGeneral) return undefined;
        const temporizador = window.setTimeout(() => setMensajeGeneral(null), 5000);
        return () => window.clearTimeout(temporizador);
    }, [mensajeGeneral]);

    const abrirRegistro = () => {
        if (!puedeCrearUsuarios || rolesDisponibles.length === 0) return;
        setUsuarioEditando(null);
        setMensajeGeneral(null);
        setMostrarForm(true);
    };

    const abrirEdicion = (usuarioListado) => {
        if (!puedeEditarUsuarios || usuariosPendientes.has(String(usuarioListado.id_usuario))) return;
        setUsuarioEditando(usuarioListado);
        setMensajeGeneral(null);
        setMostrarForm(true);
        if (estadoCatalogoRoles === "error") void reintentarRoles().catch(() => {});
    };

    const cerrarFormulario = () => {
        if (enviando) return;
        setMostrarForm(false);
        setUsuarioEditando(null);
    };

    const handleFormSubmit = async (datosUsuario) => {
        const usuarioEnEdicion = usuarioEditando;
        if (!(usuarioEnEdicion ? puedeEditarUsuarios : puedeCrearUsuarios)
            || estadoCatalogoRoles !== "listo" || !rolesDisponibles.length) return null;

        setEnviando(true);
        setMensajeGeneral(null);
        try {
            const respuesta = usuarioEnEdicion
                ? await actualizarUsuarioService(usuarioEnEdicion.id_usuario, datosUsuario)
                : await registrarUsuario(datosUsuario);
            if (usuarioEnEdicion && String(usuarioEnEdicion.id_usuario) === String(usuario?.id_usuario)) {
                actualizarUsuario(usuarioPublico(respuesta.usuario));
            }
            setMostrarForm(false);
            setUsuarioEditando(null);
            setMensajeGeneral({
                tipo: "exito",
                texto: usuarioEnEdicion ? "Usuario actualizado correctamente." : "Usuario registrado correctamente.",
            });
            return { confirmado: true };
        } catch (error) {
            const erroresCampo = obtenerErroresCampo(error);
            setMensajeGeneral({ tipo: "error", texto: error.message || "No fue posible guardar el usuario." });
            return erroresCampo ? { erroresCampo } : null;
        } finally {
            setEnviando(false);
        }
    };

    const abrirCambioEstado = (usuarioListado) => {
        if (usuariosPendientes.has(String(usuarioListado.id_usuario))) return;
        setUsuarioSeleccionado(usuarioListado);
        setMensajeGeneral(null);
    };

    const cerrarCambioEstado = () => {
        if (!enviando) setUsuarioSeleccionado(null);
    };

    const handleCambioEstado = async () => {
        const objetivo = usuarioSeleccionado;
        if (!objetivo || enviando) return;
        const id = String(objetivo.id_usuario);
        const nuevoEstado = objetivo.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        setEnviando(true);
        setUsuariosPendientes((actuales) => new Set([...actuales, id]));
        try {
            await cambiarEstadoUsuario(objetivo.id_usuario, nuevoEstado);
            setUsuarioSeleccionado(null);
            setMensajeGeneral({
                tipo: "exito",
                texto: nuevoEstado === "ACTIVO" ? "Usuario reactivado correctamente." : "Usuario desactivado correctamente.",
            });
        } catch (error) {
            setMensajeGeneral({ tipo: "error", texto: error.message || "No fue posible guardar el cambio." });
        } finally {
            setUsuariosPendientes((actuales) => {
                const siguientes = new Set(actuales);
                siguientes.delete(id);
                return siguientes;
            });
            setEnviando(false);
        }
    };

    if (cargandoSesion) {
        return <LoadingSpinner label="Cargando página" fullPage />;
    }

    if (!tieneAccesoUsuarios) {
        return (
            <section
                className="management-panel access-denied"
                role="alert"
            >
                <h1>Acceso no autorizado</h1>

                <p>
                    No tienes permiso para consultar usuarios.
                </p>
            </section>
        );
    }

    const notificacionGeneral = (
        <div
            className="management-toast-region"
            aria-live="polite"
            aria-atomic="true"
        >
            {mensajeGeneral && (
                <div
                    className={`management-toast ${mensajeGeneral.tipo}`}
                    role={
                        mensajeGeneral.tipo === "exito"
                            ? "status"
                            : "alert"
                    }
                >
                    <span>{mensajeGeneral.texto}</span>

                    <button
                        type="button"
                        className="management-toast-close"
                        aria-label="Cerrar notificación"
                        onClick={() =>
                            setMensajeGeneral(null)
                        }
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );

    const FormularioUsuario = usuarioEditando
        ? ModificarUsuarioForm
        : RegistrarUsuarioForm;

    return (
        <div className="module-page users-page">
            <header className="management-header users-header">
                <div>
                    <p className="eyebrow">
                        Administración
                    </p>

                    <h1>Usuarios</h1>

                    <div className="header-description">
                        <p>
                            Registra y administra las cuentas
                            del sistema.
                        </p>

                        {puede(usuario, "usuarios", "crear") && <button
                            className="management-primary"
                            type="button"
                            onClick={abrirRegistro}
                            disabled={cargandoUsuarios || rolesDisponibles.length === 0}
                        >
                            + Registrar usuario
                        </button>}
                    </div>
                </div>
            </header>

            {!mostrarForm && notificacionGeneral}
            {errorListado && <p className="catalog-error" role="alert">{errorListado} <button type="button" onClick={() => void reintentarListado().catch(() => {})}>Reintentar</button></p>}

            <section className="management-panel users-panel">
                <div className="management-panel-header">
                    <div>
                        <h2>Usuarios registrados</h2>

                        <p>
                            Modifica los datos de una cuenta o
                            cambia su acceso mediante activación
                            y desactivación.
                        </p>
                    </div>

                    <PageSearch className="page-search--header" label="Buscar usuario" id="userSearch"
                        placeholder="Buscar usuario" value={busqueda} maxLength={100}
                        onChange={(event) => setBusqueda(event.target.value)} />
                </div>

                <UsuariosTable
                    usuarios={usuarios}
                    cargando={cargandoUsuarios}
                    hayBusqueda={Boolean(busqueda.trim())}
                    idUsuarioActual={usuario?.id_usuario}
                    usuariosPendientes={usuariosPendientes}
                    onEditar={abrirEdicion}
                    onCambiarEstado={abrirCambioEstado}
                    puedeEditar={puedeEditarUsuarios}
                    puedeCambiarEstado={(estado) => puede(usuario, "usuarios", estado === "ACTIVO" ? "eliminar" : "editar")}
                />
                {!cargandoUsuarios && <Paginacion paginacion={paginacion} nombre="usuarios" />}
            </section>

            {mostrarForm && (usuarioEditando ? puedeEditarUsuarios : puedeCrearUsuarios) && (
                <FormularioUsuario
                    usuarioInicial={usuarioEditando}
                    rolesDisponibles={rolesDisponibles}
                    estadoCatalogoRoles={estadoCatalogoRoles}
                    errorCatalogoRoles={errorRoles}
                    onReintentarRoles={() => void reintentarRoles().catch(() => {})}
                    onSubmit={handleFormSubmit}
                    onClose={cerrarFormulario}
                    isSubmitting={enviando}
                    notificacion={notificacionGeneral}
                />
            )}

            <CambiarEstadoUsuarioDialog
                usuarioSeleccionado={
                    usuarioSeleccionado
                }
                isSubmitting={enviando}
                onConfirm={handleCambioEstado}
                onClose={cerrarCambioEstado}
            />
        </div>
    );
}

export default Usuarios;
