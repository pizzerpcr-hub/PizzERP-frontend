import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import CambiarEstadoUsuarioDialog from "../../components/forms/CambiarEstadoUsuarioDialog/CambiarEstadoUsuarioDialog.jsx";
import UsuariosTable from "../../components/TablaUsuarios/UsuariosTable.jsx";
import RegistrarUsuarioForm from "../../components/forms/RegistrarUsuarioForm/RegistrarUsuarioForm.jsx";
import ModificarUsuarioForm from "../../components/forms/ModificarUsuarioForm/ModificarUsuarioForm.jsx";

import { puedeGestionarUsuarios } from "../../constants/roles.js";
import { useAuth } from "../../context/useAuth.js";

import {
    actualizarUsuario as actualizarUsuarioService,
    cambiarEstadoUsuario,
    obtenerUsuarios,
    registrarUsuario,
} from "../../services/usuariosService.js";

import { obtenerRolesAsignables } from "../../services/gestionesService.js";
import { puede } from "../../constants/roles.js";
import { useBusquedaLista, useListaSesion } from "../../hooks/useListaSesion.js";
import { marcarListaPendiente, leerLista, listaDesactualizada, versionListasSesion } from "../../services/listasSesion.js";

import "./Usuarios.css";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";

const MENSAJE_RECARGA_FALLIDA =
    "El cambio fue guardado, pero no fue posible actualizar el listado. Intenta recargar la página.";

const usuarioPublico = (usuarioListado) => ({
    id_usuario: usuarioListado.id_usuario,
    nombre_completo: usuarioListado.nombre_completo,
    nombre_usuario: usuarioListado.nombre_usuario,
    rol: usuarioListado.rol,
    estado: usuarioListado.estado,
});

const ordenarUsuarios = (lista) =>
    [...lista].sort((primero, segundo) =>
        String(primero.nombre_completo ?? "").localeCompare(
            String(segundo.nombre_completo ?? ""),
        ),
    );

const obtenerErroresCampo = (error) => {
    if (error.status !== 422) {
        return null;
    }

    const erroresCampo = {};

    for (const campo of ["nombre_completo", "nombre_usuario", "contrasena", "rol"]) {
        const mensajes = error.errors?.[campo];
        const mensaje = Array.isArray(mensajes) ? mensajes[0] : mensajes;

        if (typeof mensaje === "string" && mensaje) {
            erroresCampo[campo] = mensaje;
        }
    }

    return Object.keys(erroresCampo).length ? erroresCampo : null;
};

function Usuarios() {
    const [mostrarForm, setMostrarForm] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

    const [enviando, setEnviando] = useState(false);

    const [mensajeGeneral, setMensajeGeneral] = useState(null);

    const [busqueda, setBusqueda] = useBusquedaLista("/api/users");

    const montadoRef = useRef(false);
    const controladorListadoRef = useRef(null);
    const solicitudListadoRef = useRef(0);

    const cambiosPendientesRef = useRef(new Map());
    const listadoVigenteRef = useRef(false);

    const { usuario, cargandoSesion, actualizarUsuario } = useAuth();

    const tieneAccesoUsuarios = puedeGestionarUsuarios(usuario);
    const puedeEditarUsuarios = puede(usuario, "usuarios", "editar");
    const puedeCrearUsuarios = puede(usuario, "usuarios", "crear");
    const necesitaCatalogoRoles = puedeEditarUsuarios || puedeCrearUsuarios;
    const { datos: usuarios, setDatos: setUsuarios, cargando: cargandoUsuarios,
        pendientes: usuariosPendientes, error: errorListado, recargar: reintentarListado } = useListaSesion(
        "/api/users", obtenerUsuarios, { habilitado: !cargandoSesion && tieneAccesoUsuarios });
    const { datos: rolesDisponibles, disponible: catalogoRolesDisponible,
        error: errorRoles, recargar: reintentarRoles } = useListaSesion(
        "/api/users/roles", obtenerRolesAsignables,
        { habilitado: !cargandoSesion && tieneAccesoUsuarios && necesitaCatalogoRoles });
    const estadoCatalogoRoles = catalogoRolesDisponible ? "listo" : errorRoles ? "error" : "cargando";

    useEffect(() => {
        montadoRef.current = true;

        return () => {
            montadoRef.current = false;
            solicitudListadoRef.current += 1;
            controladorListadoRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        if (
            mensajeGeneral?.tipo !== "exito" &&
            mensajeGeneral?.tipo !== "error"
        ) {
            return undefined;
        }

        const temporizador = window.setTimeout(() => {
            setMensajeGeneral((mensajeActual) =>
                mensajeActual === mensajeGeneral ? null : mensajeActual,
            );
        }, 5000);

        return () => window.clearTimeout(temporizador);
    }, [mensajeGeneral]);

    /**
     * Consulta el listado y descarta respuestas de solicitudes anteriores.
     * @param {{ mostrarCarga?: boolean }} opciones - Indica si se muestra la carga.
     * @returns {Promise<Array<object> | null>} Usuarios recibidos, o null si se descartó la consulta.
     */
    const cargarUsuarios = useCallback(
        async ({ mostrarCarga = false } = {}) => {
            const idSolicitud = solicitudListadoRef.current + 1;

            solicitudListadoRef.current = idSolicitud;

            controladorListadoRef.current?.abort();

            listadoVigenteRef.current = false;

            const controller = new AbortController();

            controladorListadoRef.current = controller;

            try {
                const listaUsuarios = await obtenerUsuarios(
                    controller.signal, { forzar: !mostrarCarga },
                );

                if (
                    !montadoRef.current ||
                    controller.signal.aborted ||
                    idSolicitud !== solicitudListadoRef.current
                ) {
                    return null;
                }

                setUsuarios(
                    ordenarUsuarios(
                        listaUsuarios.map((usuarioListado) => {
                            const id = String(usuarioListado.id_usuario);

                            return (
                                cambiosPendientesRef.current.get(id)
                                    ?.provisional ??
                                usuarioPublico(usuarioListado)
                            );
                        }),
                    ),
                );

                listadoVigenteRef.current =
                    cambiosPendientesRef.current.size === 0;

                return listaUsuarios;
            } catch (error) {
                if (
                    controller.signal.aborted ||
                    !montadoRef.current ||
                    idSolicitud !== solicitudListadoRef.current
                ) {
                    return null;
                }

                throw error;
            } finally {
                if (controladorListadoRef.current === controller) {
                    controladorListadoRef.current = null;
                }
            }
        },
        [setUsuarios],
    );

    useEffect(() => {
        listadoVigenteRef.current = !cargandoUsuarios && !errorListado && !usuariosPendientes.size
            && Boolean(leerLista("/api/users").actualizado);
    }, [usuarios, cargandoUsuarios, errorListado, usuariosPendientes.size]);

    const usuariosFiltrados = useMemo(() => {
        const termino = busqueda.trim().toLocaleLowerCase();

        if (!termino) {
            return usuarios;
        }

        return usuarios.filter((usuarioListado) =>
            [
                usuarioListado.nombre_completo,
                usuarioListado.nombre_usuario,
                usuarioListado.rol,
                usuarioListado.estado,
            ].some((valor) =>
                String(valor ?? "")
                    .toLocaleLowerCase()
                    .includes(termino),
            ),
        );
    }, [busqueda, usuarios]);

    /**
     * Reconcilia la tabla con el servidor tras un cambio optimista.
     * @returns {Promise<void>} Finaliza después de actualizar o mostrar el fallo de recarga.
     */
    const reconciliarDespuesDeCambio = useCallback(async () => {
        try {
            await cargarUsuarios();
        } catch {
            if (montadoRef.current) {
                setMensajeGeneral((mensajeActual) =>
                    mensajeActual?.tipo === "error"
                        ? mensajeActual
                        : {
                              tipo: "advertencia",
                              texto: MENSAJE_RECARGA_FALLIDA,
                          },
                );
            }
        }
    }, [cargarUsuarios]);

    /**
     * Actualiza o incorpora el usuario confirmado por el servidor.
     * @param {object} usuarioConfirmado - Usuario devuelto por la operación.
     * @returns {void}
     */
    const aplicarUsuarioConfirmado = useCallback((usuarioConfirmado) => {
        if (
            !usuarioConfirmado ||
            usuarioConfirmado.id_usuario == null
        ) {
            return;
        }

        const usuarioSeguro = usuarioPublico(usuarioConfirmado);

        const idConfirmado = String(usuarioSeguro.id_usuario);

        setUsuarios((usuariosActuales) => {
            const existe = usuariosActuales.some(
                (usuarioListado) =>
                    String(usuarioListado.id_usuario) ===
                    idConfirmado,
            );

            const usuariosActualizados = existe
                ? usuariosActuales.map((usuarioListado) =>
                      String(usuarioListado.id_usuario) ===
                      idConfirmado
                          ? usuarioSeguro
                          : usuarioListado,
                  )
                : [...usuariosActuales, usuarioSeguro];

            return ordenarUsuarios(usuariosActualizados);
        });
    }, [setUsuarios]);

    const invalidarListado = () => {
        solicitudListadoRef.current += 1;

        controladorListadoRef.current?.abort();

        controladorListadoRef.current = null;

        listadoVigenteRef.current = false;
    };

    /**
     * Muestra un cambio provisional y registra la operación pendiente.
     * @param {object} anterior - Usuario antes del cambio.
     * @param {object} provisional - Usuario mostrado mientras responde el servidor.
     * @returns {boolean} Si se inició el cambio.
     */
    const iniciarCambioOptimista = (anterior, provisional) => {
        const id = String(anterior.id_usuario);

        if (usuariosPendientes.has(id) || cambiosPendientesRef.current.has(id)) {
            return false;
        }

        invalidarListado();

        cambiosPendientesRef.current.set(id, {
            provisional,
        });

        marcarListaPendiente("/api/users", id, true);

        setUsuarios((usuariosActuales) =>
            ordenarUsuarios(
                usuariosActuales.map((usuarioListado) =>
                    String(usuarioListado.id_usuario) === id
                        ? provisional
                        : usuarioListado,
                ),
            ),
        );

        return true;
    };

    const terminarCambioOptimista = (id) => {
        cambiosPendientesRef.current.delete(String(id));

        marcarListaPendiente("/api/users", id, false);
    };

    /**
     * Confirma un cambio provisional o restaura el usuario anterior si falla.
     * @param {object} anterior - Datos previos del usuario.
     * @param {object} provisional - Datos mostrados durante la solicitud.
     * @param {Function} solicitud - Operación que envía el cambio al servidor.
     * @param {string} mensajeExito - Texto del aviso de confirmación.
     * @param {boolean} sincronizarCuenta - Actualiza la sesión si cambia la cuenta actual.
     * @param {boolean} mostrarErroresDeCampo - Devuelve errores de validación al formulario.
     * @returns {Promise<object | null> | false} Resultado del servidor o false si ya hay un cambio pendiente.
     */
    const ejecutarCambioOptimista = (
        anterior,
        provisional,
        solicitud,
        mensajeExito,
        sincronizarCuenta = false,
        mostrarErroresDeCampo = false,
    ) => {
        if (!iniciarCambioOptimista(anterior, provisional)) {
            return false;
        }

        setMensajeGeneral(null);
        const epoch = versionListasSesion();

        const confirmar = async () => {
            let respuesta;

            try {
                respuesta = await solicitud();
            } catch (error) {
                if (epoch !== versionListasSesion()) return null;
                // También revierte la memoria si se navegó a otro módulo durante el PATCH.
                setUsuarios((actuales) => ordenarUsuarios(actuales.map((item) =>
                    String(item.id_usuario) === String(anterior.id_usuario) ? anterior : item)));
                terminarCambioOptimista(anterior.id_usuario);
                if (!montadoRef.current) {
                    return null;
                }

                invalidarListado();

                const erroresCampo = mostrarErroresDeCampo
                    ? obtenerErroresCampo(error)
                    : null;

                if (erroresCampo) {
                    setMensajeGeneral({
                        tipo: "error",
                        texto: "No se pudo guardar el usuario. Intenta de nuevo.",
                    });

                    return {
                        erroresCampo,
                    };
                }

                setMensajeGeneral({
                    tipo: "error",
                    texto:
                        mostrarErroresDeCampo
                            ? "No se pudo guardar el usuario. Intenta de nuevo."
                            : error.message || "No fue posible guardar el cambio.",
                });

                return null;
            }

            if (epoch !== versionListasSesion()) return null;
            terminarCambioOptimista(anterior.id_usuario);
            if (!montadoRef.current) {
                return null;
            }

            aplicarUsuarioConfirmado(respuesta?.usuario);

            setMensajeGeneral({
                tipo: "exito",
                texto: mensajeExito,
            });

            if (sincronizarCuenta && respuesta?.usuario) {
                actualizarUsuario({
                    ...usuario,
                    ...usuarioPublico(respuesta.usuario),
                });
            }

            void reconciliarDespuesDeCambio();

            return {
                confirmado: true,
            };
        };

        return confirmar();
    };

    const abrirRegistro = () => {
        if (!puedeCrearUsuarios || rolesDisponibles.length === 0) return;
        setUsuarioEditando(null);
        setMensajeGeneral(null);
        setMostrarForm(true);
    };

    const abrirEdicion = (usuarioListado) => {
        if (
            !puedeEditarUsuarios ||
            usuariosPendientes.has(
                String(usuarioListado.id_usuario),
            )
        ) {
            return;
        }

        setUsuarioEditando(usuarioListado);
        setMensajeGeneral(null);
        setMostrarForm(true);
        if (estadoCatalogoRoles === "error") void reintentarRoles().catch(() => {});
    };

    const cerrarFormulario = () => {
        if (enviando) {
            return;
        }

        setMostrarForm(false);
        setUsuarioEditando(null);
    };

    /**
     * Guarda los datos del formulario y actualiza la tabla tras la respuesta.
     * @param {object} datosUsuario - Campos validados del formulario.
     * @returns {Promise<object | null | void>} Resultado de validación o confirmación.
     */
    const handleFormSubmit = async (datosUsuario) => {
        const usuarioEnEdicion = usuarioEditando;
        const esEdicion = Boolean(usuarioEnEdicion);
        if (!(esEdicion ? puedeEditarUsuarios : puedeCrearUsuarios) ||
            estadoCatalogoRoles !== "listo" || !rolesDisponibles.length) return null;

        const nombreUsuario = datosUsuario.nombre_usuario
            .trim()
            .toUpperCase();

        // La validación local solo es fiable mientras el listado esté vigente.
        if (
            listadoVigenteRef.current && !listaDesactualizada(leerLista("/api/users")) &&
            usuarios.some(
                (usuarioListado) =>
                    String(usuarioListado.id_usuario) !==
                        String(
                            usuarioEnEdicion?.id_usuario,
                        ) &&
                    String(usuarioListado.nombre_usuario ?? "")
                        .trim()
                        .toUpperCase() === nombreUsuario,
            )
        ) {
            return {
                erroresCampo: {
                    nombre_usuario:
                        "El nombre de usuario ya está registrado.",
                },
            };
        }

        if (esEdicion) {
            const anterior = usuarioPublico(
                usuarios.find(
                    (usuarioListado) =>
                        String(usuarioListado.id_usuario) ===
                        String(usuarioEnEdicion.id_usuario),
                ) ?? usuarioEnEdicion,
            );

            const provisional = {
                ...anterior,
                nombre_completo:
                    datosUsuario.nombre_completo,
                nombre_usuario:
                    datosUsuario.nombre_usuario,
                rol: datosUsuario.rol,
            };

            setEnviando(true);

            const cambio = ejecutarCambioOptimista(
                anterior,
                provisional,
                () =>
                    actualizarUsuarioService(
                        anterior.id_usuario,
                        datosUsuario,
                    ),
                "Usuario actualizado correctamente.",
                String(anterior.id_usuario) ===
                    String(usuario?.id_usuario),
                true,
            );

            if (!cambio) {
                if (montadoRef.current) {
                    setEnviando(false);
                }

                return null;
            }

            const resultado = await cambio;

            if (montadoRef.current) {
                setEnviando(false);

                if (resultado?.confirmado) {
                    setMostrarForm(false);
                    setUsuarioEditando(null);
                }
            }

            return resultado;
        }

        setEnviando(true);
        setMensajeGeneral(null);

        let respuesta;

        try {
            respuesta = await registrarUsuario(datosUsuario);
        } catch (error) {
            if (montadoRef.current) {
                setEnviando(false);

                const erroresCampo =
                    obtenerErroresCampo(error);

                if (erroresCampo) {
                    setMensajeGeneral({
                        tipo: "error",
                        texto: "No se pudo guardar el usuario. Intenta de nuevo.",
                    });

                    return {
                        erroresCampo,
                    };
                }

                setMensajeGeneral({
                    tipo: "error",
                    texto:
                        "No se pudo guardar el usuario. Intenta de nuevo.",
                });
            }

            return null;
        }

        if (!montadoRef.current) {
            return;
        }

        const usuarioConfirmado = respuesta?.usuario;

        aplicarUsuarioConfirmado(usuarioConfirmado);

        listadoVigenteRef.current = false;

        setMostrarForm(false);
        setUsuarioEditando(null);
        setEnviando(false);

        setMensajeGeneral({
            tipo: "exito",
            texto: "Usuario registrado correctamente.",
        });

        void reconciliarDespuesDeCambio();
    };

    const abrirCambioEstado = (usuarioListado) => {
        if (
            usuariosPendientes.has(
                String(usuarioListado.id_usuario),
            )
        ) {
            return;
        }

        setUsuarioSeleccionado(usuarioListado);
        setMensajeGeneral(null);
    };

    const cerrarCambioEstado = () => {
        if (enviando) {
            return;
        }

        setUsuarioSeleccionado(null);
    };

    /**
     * Solicita el estado contrario al actual con actualización provisional.
     * @returns {Promise<void>} Termina al iniciar o descartar el cambio.
     */
    const handleCambioEstado = async () => {
        const usuarioObjetivo = usuarioSeleccionado;

        if (!usuarioObjetivo) {
            return;
        }

        const anterior = usuarioPublico(
            usuarios.find(
                (usuarioListado) =>
                    String(usuarioListado.id_usuario) ===
                    String(usuarioObjetivo.id_usuario),
            ) ?? usuarioObjetivo,
        );

        const estadoActual = String(
            anterior.estado ?? "",
        ).toUpperCase();

        const nuevoEstado =
            estadoActual === "ACTIVO"
                ? "INACTIVO"
                : "ACTIVO";

        const cambioIniciado =
            ejecutarCambioOptimista(
                anterior,
                {
                    ...anterior,
                    estado: nuevoEstado,
                },
                () =>
                    cambiarEstadoUsuario(
                        anterior.id_usuario,
                        nuevoEstado,
                    ),
                nuevoEstado === "ACTIVO"
                    ? "Usuario reactivado correctamente."
                    : "Usuario desactivado correctamente.",
            );

        if (cambioIniciado) {
            setUsuarioSeleccionado(null);
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
        <>
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
                            disabled={rolesDisponibles.length === 0}
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
                        placeholder="Buscar usuario" value={busqueda}
                        onChange={(event) => setBusqueda(event.target.value)} />
                </div>

                <UsuariosTable
                    usuarios={usuariosFiltrados}
                    cargando={cargandoUsuarios}
                    hayBusqueda={Boolean(busqueda.trim())}
                    idUsuarioActual={usuario?.id_usuario}
                    usuariosPendientes={usuariosPendientes}
                    onEditar={abrirEdicion}
                    onCambiarEstado={abrirCambioEstado}
                    puedeEditar={puedeEditarUsuarios}
                    puedeCambiarEstado={(estado) => puede(usuario, "usuarios", estado === "ACTIVO" ? "eliminar" : "editar")}
                />
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
        </>
    );
}

export default Usuarios;
