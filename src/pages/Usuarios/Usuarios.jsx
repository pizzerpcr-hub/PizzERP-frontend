import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import CambiarEstadoUsuarioDialog from "../../components/usuarios/CambiarEstadoUsuarioDialog.jsx";
import UsuariosTable from "../../components/usuarios/UsuariosTable.jsx";
import RegistrarUsuarioForm from "../../components/forms/RegistrarUsuarioForm/RegistrarUsuarioForm.jsx";
import { normalizarRol } from "../../constants/roles.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    actualizarUsuario as actualizarUsuarioService,
    cambiarEstadoUsuario,
    obtenerUsuarios,
    registrarUsuario,
} from "../../services/usuariosService.js";
import "./Usuarios.css";

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
    lista.sort((primero, segundo) =>
        String(primero.nombre_completo ?? "").localeCompare(
            String(segundo.nombre_completo ?? ""),
        ),
    );

const obtenerErroresCampo = (error) => {
    if (error.status !== 422) {
        return null;
    }

    const erroresCampo = {};

    for (const campo of ["nombre_usuario", "contrasena"]) {
        const mensajes = error.errors?.[campo];
        const mensaje = Array.isArray(mensajes) ? mensajes[0] : mensajes;

        if (typeof mensaje === "string" && mensaje) {
            erroresCampo[campo] = mensaje;
        }
    }

    return Object.keys(erroresCampo).length ? erroresCampo : null;
};

const obtenerErrorNoAsociado = (error) => {
    if (error.status !== 422 || !error.errors) {
        return null;
    }

    for (const [campo, mensajes] of Object.entries(error.errors)) {
        if (campo === "nombre_usuario" || campo === "contrasena") {
            continue;
        }

        const mensaje = Array.isArray(mensajes) ? mensajes[0] : mensajes;

        if (typeof mensaje === "string" && mensaje) {
            return mensaje;
        }
    }

    return null;
};

function Usuarios() {
    const [mostrarForm, setMostrarForm] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [mensajeEstado, setMensajeEstado] = useState("");
    const [mensajeGeneral, setMensajeGeneral] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [usuariosPendientes, setUsuariosPendientes] = useState(new Set());
    const montadoRef = useRef(false);
    const controladorListadoRef = useRef(null);
    const solicitudListadoRef = useRef(0);
    const cambiosPendientesRef = useRef(new Map());
    const listadoVigenteRef = useRef(false);

    const {
        usuario,
        cargandoSesion,
        actualizarUsuario,
    } = useAuth();
    const rolActual = normalizarRol(usuario?.rol);
    const esAdministrador = rolActual === "ADMINISTRADOR";

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
        }, mensajeGeneral.tipo === "error" ? 5000 : 4000);

        return () => window.clearTimeout(temporizador);
    }, [mensajeGeneral]);

    const cargarUsuarios = useCallback(async ({ mostrarCarga = false } = {}) => {
        const idSolicitud = solicitudListadoRef.current + 1;
        solicitudListadoRef.current = idSolicitud;
        controladorListadoRef.current?.abort();
        listadoVigenteRef.current = false;

        const controller = new AbortController();
        controladorListadoRef.current = controller;

        if (mostrarCarga && montadoRef.current) {
            setCargandoUsuarios(true);
        }

        try {
            const listaUsuarios = await obtenerUsuarios(controller.signal);

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
                            cambiosPendientesRef.current.get(id)?.provisional ??
                            usuarioPublico(usuarioListado)
                        );
                    }),
                ),
            );
            listadoVigenteRef.current = cambiosPendientesRef.current.size === 0;
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
            if (
                montadoRef.current &&
                idSolicitud === solicitudListadoRef.current
            ) {
                setCargandoUsuarios(false);
            }

            if (controladorListadoRef.current === controller) {
                controladorListadoRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        if (cargandoSesion || !esAdministrador) {
            return undefined;
        }

        const cargar = async () => {
            try {
                await cargarUsuarios({ mostrarCarga: true });
            } catch (error) {
                if (montadoRef.current) {
                    setMensajeGeneral({
                        tipo: "error",
                        texto:
                            error.message ||
                            "No fue posible cargar los usuarios.",
                    });
                }
            }
        };

        cargar();

        return () => {
            controladorListadoRef.current?.abort();
        };
    }, [cargandoSesion, cargarUsuarios, esAdministrador]);

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
                String(valor ?? "").toLocaleLowerCase().includes(termino),
            ),
        );
    }, [busqueda, usuarios]);

    const reconciliarDespuesDeCambio = useCallback(
        async () => {
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
        },
        [cargarUsuarios],
    );

    const aplicarUsuarioConfirmado = (usuarioConfirmado) => {
        if (!usuarioConfirmado || usuarioConfirmado.id_usuario == null) {
            return;
        }

        const usuarioSeguro = usuarioPublico(usuarioConfirmado);

        setUsuarios((usuariosActuales) => {
            const idConfirmado = String(usuarioSeguro.id_usuario);
            const existe = usuariosActuales.some(
                (usuarioListado) =>
                    String(usuarioListado.id_usuario) === idConfirmado,
            );
            const usuariosActualizados = existe
                ? usuariosActuales.map((usuarioListado) =>
                      String(usuarioListado.id_usuario) === idConfirmado
                          ? usuarioSeguro
                          : usuarioListado,
                  )
                : [...usuariosActuales, usuarioSeguro];

            return ordenarUsuarios(usuariosActualizados);
        });
    };

    const invalidarListado = () => {
        solicitudListadoRef.current += 1;
        controladorListadoRef.current?.abort();
        controladorListadoRef.current = null;
        listadoVigenteRef.current = false;
    };

    const iniciarCambioOptimista = (anterior, provisional) => {
        const id = String(anterior.id_usuario);

        if (cambiosPendientesRef.current.has(id)) {
            return false;
        }

        invalidarListado();
        cambiosPendientesRef.current.set(id, { provisional });
        setUsuariosPendientes(new Set(cambiosPendientesRef.current.keys()));
        setUsuarios((usuariosActuales) =>
            ordenarUsuarios(
                usuariosActuales.map((usuarioListado) =>
                    String(usuarioListado.id_usuario) === id
                        ? provisional
                        : usuarioListado,
                ),
            ),
        );
        setCargandoUsuarios(false);

        return true;
    };

    const terminarCambioOptimista = (id) => {
        cambiosPendientesRef.current.delete(String(id));
        setUsuariosPendientes(new Set(cambiosPendientesRef.current.keys()));
    };

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

        const confirmar = async () => {
            let respuesta;

            try {
                respuesta = await solicitud();
            } catch (error) {
                if (!montadoRef.current) {
                    return null;
                }

                invalidarListado();
                terminarCambioOptimista(anterior.id_usuario);
                setUsuarios((usuariosActuales) =>
                    ordenarUsuarios(
                        usuariosActuales.map((usuarioListado) =>
                            String(usuarioListado.id_usuario) ===
                            String(anterior.id_usuario)
                                ? anterior
                                : usuarioListado,
                        ),
                    ),
                );

                const erroresCampo = mostrarErroresDeCampo
                    ? obtenerErroresCampo(error)
                    : null;

                if (erroresCampo) {
                    const mensajeGeneral = obtenerErrorNoAsociado(error);

                    if (mensajeGeneral) {
                        setMensajeGeneral({ tipo: "error", texto: mensajeGeneral });
                    }

                    return { erroresCampo };
                }

                setMensajeGeneral({
                    tipo: "error",
                    texto: error.message || "No fue posible guardar el cambio.",
                });
                return null;
            }

            if (!montadoRef.current) {
                return null;
            }

            terminarCambioOptimista(anterior.id_usuario);
            aplicarUsuarioConfirmado(respuesta?.usuario);
            setMensajeGeneral({ tipo: "exito", texto: mensajeExito });

            if (sincronizarCuenta && respuesta?.usuario) {
                actualizarUsuario({
                    ...usuario,
                    ...usuarioPublico(respuesta.usuario),
                });
            }

            void reconciliarDespuesDeCambio();
            return { confirmado: true };
        };

        return confirmar();
    };

    const abrirRegistro = () => {
        setUsuarioEditando(null);
        setMensajeGeneral(null);
        setMostrarForm(true);
    };

    const abrirEdicion = (usuarioListado) => {
        if (cambiosPendientesRef.current.has(String(usuarioListado.id_usuario))) {
            return;
        }

        setUsuarioEditando(usuarioListado);
        setMensajeGeneral(null);
        setMostrarForm(true);
    };

    const cerrarFormulario = () => {
        if (enviando) {
            return;
        }

        setMostrarForm(false);
        setUsuarioEditando(null);
    };

    const handleFormSubmit = async (datosUsuario) => {
        const usuarioEnEdicion = usuarioEditando;
        const esEdicion = Boolean(usuarioEnEdicion);
        const nombreUsuario = datosUsuario.nombre_usuario.trim().toUpperCase();

        if (
            listadoVigenteRef.current &&
            usuarios.some(
                (usuarioListado) =>
                    String(usuarioListado.id_usuario) !==
                        String(usuarioEnEdicion?.id_usuario) &&
                    String(usuarioListado.nombre_usuario ?? "")
                        .trim()
                        .toUpperCase() === nombreUsuario,
            )
        ) {
            return {
                erroresCampo: {
                    nombre_usuario: "El nombre de usuario ya está registrado.",
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
                nombre_completo: datosUsuario.nombre_completo,
                nombre_usuario: datosUsuario.nombre_usuario,
                rol: datosUsuario.rol,
            };
            const cambio = ejecutarCambioOptimista(
                anterior,
                provisional,
                () =>
                    actualizarUsuarioService(
                        anterior.id_usuario,
                        datosUsuario,
                    ),
                "Usuario actualizado correctamente.",
                String(anterior.id_usuario) === String(usuario?.id_usuario),
                true,
            );

            if (!cambio) {
                return null;
            }

            const resultado = await cambio;

            if (montadoRef.current && resultado?.confirmado) {
                setMostrarForm(false);
                setUsuarioEditando(null);
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
                const erroresCampo = obtenerErroresCampo(error);

                if (erroresCampo) {
                    const mensajeGeneral = obtenerErrorNoAsociado(error);

                    if (mensajeGeneral) {
                        setMensajeGeneral({ tipo: "error", texto: mensajeGeneral });
                    }

                    return { erroresCampo };
                }

                setMensajeGeneral({
                    tipo: "error",
                    texto: error.message || "No fue posible guardar el usuario.",
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
        setCargandoUsuarios(false);
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
        if (cambiosPendientesRef.current.has(String(usuarioListado.id_usuario))) {
            return;
        }

        setUsuarioSeleccionado(usuarioListado);
        setMensajeEstado("");
        setMensajeGeneral(null);
    };

    const cerrarCambioEstado = () => {
        if (enviando) {
            return;
        }

        setUsuarioSeleccionado(null);
        setMensajeEstado("");
    };

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
        const estadoActual = String(anterior.estado ?? "").toUpperCase();
        const nuevoEstado = estadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        const cambioIniciado = ejecutarCambioOptimista(
            anterior,
            { ...anterior, estado: nuevoEstado },
            () => cambiarEstadoUsuario(anterior.id_usuario, nuevoEstado),
            nuevoEstado === "ACTIVO"
                ? "Usuario reactivado correctamente."
                : "Usuario desactivado correctamente.",
        );

        if (cambioIniciado) {
            setUsuarioSeleccionado(null);
            setMensajeEstado("");
        }
    };

    if (cargandoSesion) {
        return null;
    }

    if (!esAdministrador) {
        return (
            <section className="management-panel access-denied" role="alert">
                <h1>Acceso no autorizado</h1>
                <p>
                    La gestión de usuarios está disponible únicamente para
                    administradores.
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
                    role={mensajeGeneral.tipo === "exito" ? "status" : "alert"}
                >
                    <span>{mensajeGeneral.texto}</span>
                    <button
                        type="button"
                        className="management-toast-close"
                        aria-label="Cerrar notificación"
                        onClick={() => setMensajeGeneral(null)}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <>
            <header className="management-header">
                <div>
                    <p className="eyebrow">Administración</p>

                    <h1>Usuarios</h1>

                    <div className="header-description">
                        <p>Registra y administra las cuentas del sistema.</p>

                        <button
                            className="management-primary"
                            type="button"
                            onClick={abrirRegistro}
                        >
                            + Registrar usuario
                        </button>
                    </div>
                </div>
            </header>

            {!mostrarForm && notificacionGeneral}

            <section className="management-panel users-panel">
                <div className="management-panel-header">
                    <div>
                        <h2>Usuarios registrados</h2>

                        <p>
                            Modifica los datos de una cuenta o cambia su acceso
                            mediante activación y desactivación.
                        </p>
                    </div>

                    <label className="search-box">
                        ⌕
                        <input
                            id="userSearch"
                            type="search"
                            placeholder="Buscar usuario"
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                        />
                    </label>
                </div>

                <UsuariosTable
                    usuarios={usuariosFiltrados}
                    cargando={cargandoUsuarios}
                    hayBusqueda={Boolean(busqueda.trim())}
                    idUsuarioActual={usuario?.id_usuario}
                    usuariosPendientes={usuariosPendientes}
                    onEditar={abrirEdicion}
                    onCambiarEstado={abrirCambioEstado}
                />
            </section>

            {mostrarForm && (
                <RegistrarUsuarioForm
                    modo={usuarioEditando ? "editar" : "crear"}
                    usuarioInicial={usuarioEditando}
                    onSubmit={handleFormSubmit}
                    onClose={cerrarFormulario}
                    isSubmitting={enviando}
                    notificacion={notificacionGeneral}
                />
            )}

            <CambiarEstadoUsuarioDialog
                usuarioSeleccionado={usuarioSeleccionado}
                error={mensajeEstado}
                isSubmitting={enviando}
                onConfirm={handleCambioEstado}
                onClose={cerrarCambioEstado}
            />
        </>
    );
}

export default Usuarios;
