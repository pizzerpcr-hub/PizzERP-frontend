import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    verificarSesion,
    cerrarSesion as cerrarSesionService,
} from "../services/loginService.js";

import { AuthContext } from "./useAuth.js";
import { observarSesion } from "../services/observarSesion.js";
import echo from "../services/echo.js";
import { obtenerAcceso } from "../services/gestionesService.js";
import { aplicarCambioAcceso } from "../services/accesoEnTiempoReal.js";
import { sincronizarListasSesion } from "../services/listasSesion.js";
import { precargarListas } from "../services/precargarListas.js";
import "../styles/cerrarSesion.css";
import { useNavigate } from "react-router-dom";

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargandoSesion, setCargandoSesion] = useState(true);
    const [cerrandoSesion, setCerrandoSesion] = useState(false);

    const [errorCierre, setErrorCierre] = useState("");
    const [mensajeCierre, setMensajeCierre] = useState(
        "Cerrando sesión...",
    );
    const navigate = useNavigate();
    const montado = useRef(true);
    const cierreTimer = useRef(null);
    const cierreEnCurso = useRef(false);
    const versionSesion = useRef(0);
    const usuarioRef = useRef(null);
    const verificacionRef = useRef(null);
    const ultimaConsultaPermisosRef = useRef(0);
    const generacionAccesoRef = useRef(0);
    const revisionesBroadcastRef = useRef({ usuario: 0, rol: 0 });
    const aceptarUsuario = useCallback((actual) => {
        if (String(usuarioRef.current?.id_usuario ?? "") !== String(actual?.id_usuario ?? "")) {
            revisionesBroadcastRef.current = { usuario: 0, rol: 0 };
        }
        usuarioRef.current = actual;
        sincronizarListasSesion(actual);
        setUsuario(actual);
        if (actual?.permisos) void precargarListas(actual, window.location.pathname);
    }, []);

    useEffect(() => {
        montado.current = true;

        return () => {
            montado.current = false;
            window.clearTimeout(cierreTimer.current);
            verificacionRef.current?.controller.abort();
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const restaurarSesion = async () => {
            try {
                const usuarioActual = await verificarSesion(
                    controller.signal,
                );

                const acceso = usuarioActual
                    ? await obtenerAcceso(controller.signal).catch(() => ({ permisos: null, rol_id: null }))
                    : null;

                if (!controller.signal.aborted) {
                    if (acceso?.permisos) ultimaConsultaPermisosRef.current = Date.now();
                    aceptarUsuario(usuarioActual ? { ...usuarioActual, ...acceso } : null);
                }
            } catch (error) {
                if (
                    error.name !== "AbortError" &&
                    !controller.signal.aborted
                ) {
                    aceptarUsuario(null);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setCargandoSesion(false);
                }
            }
        };

        restaurarSesion();

        return () => {
            controller.abort();
        };
    }, [aceptarUsuario]);

    /**
     * Muestra el aviso de revocación y retira la sesión tras una pausa breve.
     * @returns {void}
     */
    const cerrarPorPermisos = useCallback(() => {
        if (!montado.current || cierreEnCurso.current) {
            return;
        }

        cierreEnCurso.current = true;
        versionSesion.current++;
        sincronizarListasSesion(null);

        setErrorCierre("");
        setMensajeCierre(
            "Tu cuenta ha sido desactivada o ya no tienes permisos para acceder al sistema.",
        );

        setCerrandoSesion(true);

        cierreTimer.current = window.setTimeout(() => {
            if (!montado.current) {
                return;
            }

            aceptarUsuario(null);
            setCerrandoSesion(false);
            cierreEnCurso.current = false;

            navigate("/", { replace: true });
        }, 1500);
    }, [navigate, aceptarUsuario]);

    // Comparte las verificaciones simultáneas y consulta permisos al cambiar el rol.
    const verificarAcceso = useCallback((forzarPermisos = false) => {
        if (verificacionRef.current) return verificacionRef.current.promise;
        if (!usuarioRef.current || cierreEnCurso.current) return Promise.resolve(null);
        const controller = new AbortController();
        const version = versionSesion.current;
        const generacionAcceso = generacionAccesoRef.current;
        const promise = (async () => {
            const actual = await verificarSesion(controller.signal);
            if (!montado.current || controller.signal.aborted || version !== versionSesion.current) return null;
            if (!actual) { cerrarPorPermisos(); return null; }
            if (generacionAcceso !== generacionAccesoRef.current) return usuarioRef.current;
            const previo = usuarioRef.current;
            if (actual.rol !== previo.rol) aceptarUsuario({ ...actual, permisos: null, rol_id: null });
            const consultarPermisos = forzarPermisos || !previo?.permisos
                || actual.rol !== previo.rol
                || Date.now() - ultimaConsultaPermisosRef.current >= 300_000;
            const acceso = consultarPermisos
                ? await obtenerAcceso(controller.signal)
                : { permisos: previo.permisos, rol_id: previo.rol_id };
            if (!montado.current || controller.signal.aborted || version !== versionSesion.current) return null;
            if (generacionAcceso !== generacionAccesoRef.current) return usuarioRef.current;
            if (consultarPermisos) ultimaConsultaPermisosRef.current = Date.now();
            const actualizado = { ...actual, ...acceso };
            if (JSON.stringify(previo) !== JSON.stringify(actualizado)) aceptarUsuario(actualizado);
            return actualizado;
        })().finally(() => {
            if (verificacionRef.current?.promise === promise) verificacionRef.current = null;
        });
        verificacionRef.current = { controller, promise };
        return promise;
    }, [aceptarUsuario, cerrarPorPermisos]);

    const aplicarBroadcast = useCallback((evento, tipo) => {
        const cambio = aplicarCambioAcceso(usuarioRef.current, evento, tipo, revisionesBroadcastRef.current);
        if (!cambio) return;
        revisionesBroadcastRef.current = cambio.revisiones;
        generacionAccesoRef.current++;
        ultimaConsultaPermisosRef.current = Date.now();
        aceptarUsuario(cambio.usuario);
    }, [aceptarUsuario]);

    // La consulta periódica respalda la notificación inmediata por WebSocket.
    useEffect(() => {
        if (
            !usuario?.id_usuario ||
            cerrandoSesion
        ) {
            return undefined;
        }

        return observarSesion({
            consultar: () => verificarAcceso(),
            actualizar: () => {},
            intervaloMs: 30000,
        });
    }, [
        usuario?.id_usuario,
        cerrandoSesion,
        cerrarPorPermisos,
        verificarAcceso,
    ]);

    // WebSocket permite revocar el acceso sin esperar la siguiente consulta.
    useEffect(() => {
        if (!usuario?.id_usuario || cerrandoSesion || !echo) {
            return undefined;
        }

        const nombreCanal = `usuario.${usuario.id_usuario}`;
        const canal = echo.private(nombreCanal);

        const manejarCambioEstado = (evento) => {
            const usuarioActualizado = evento?.usuario;

            if (!usuarioActualizado?.id_usuario) {
                return;
            }

            const esUsuarioActual =
                String(usuarioActualizado.id_usuario) ===
                String(usuario.id_usuario);

            if (!esUsuarioActual) {
                return;
            }

            const estado = String(
                usuarioActualizado.estado ?? "",
            ).toUpperCase();

            if (estado === "INACTIVO") {
                cerrarPorPermisos();
            }
        };

        canal.listen(".user.status-changed", manejarCambioEstado);
        const manejarCambioAcceso = (evento) => aplicarBroadcast(evento, "usuario");
        canal.listen(".user.access-changed", manejarCambioAcceso);

        return () => {
            canal.stopListening(".user.status-changed", manejarCambioEstado);
            canal.stopListening(".user.access-changed", manejarCambioAcceso);
            echo.leave(nombreCanal);
        };
    }, [usuario?.id_usuario, cerrandoSesion, cerrarPorPermisos, aplicarBroadcast]);

    useEffect(() => {
        if (!usuario?.rol_id || cerrandoSesion || !echo) {
            return undefined;
        }

        const nombreCanal = `rol.${usuario.rol_id}`;
        const canal = echo.private(nombreCanal);
        const manejarCambioAcceso = (evento) => aplicarBroadcast(evento, "rol");
        canal.listen(".role.access-changed", manejarCambioAcceso);

        return () => {
            canal.stopListening(".role.access-changed", manejarCambioAcceso);
            echo.leave(nombreCanal);
        };
    }, [usuario?.rol_id, cerrandoSesion, aplicarBroadcast]);

    const iniciarSesion = useCallback(async (datosUsuario) => {
        const version = ++versionSesion.current;
        const acceso = await obtenerAcceso().catch(() => ({ permisos: null, rol_id: null }));
        if (montado.current && version === versionSesion.current) {
            if (acceso.permisos) ultimaConsultaPermisosRef.current = Date.now();
            aceptarUsuario({ ...datosUsuario, ...acceso });
        }
    }, [aceptarUsuario]);

    /**
     * Cierra la sesión en el servidor y ejecuta la acción posterior al terminar.
     * @param {Function} onFinalizado - Acción posterior a un cierre confirmado.
     * @returns {void}
     */
    const cerrarSesion = useCallback((onFinalizado) => {
        if (cierreEnCurso.current) {
            return;
        }

        cierreEnCurso.current = true;
        versionSesion.current++;

        setErrorCierre("");
        setMensajeCierre("Un momento, estamos cerrando tu sesión.");
        setCerrandoSesion(true);

        const TIEMPO_MINIMO_MS = 900;
        const inicio = Date.now();

        cerrarSesionService()
            .then(() => {
                sincronizarListasSesion(null);
                if (!montado.current) {
                    return;
                }

                const transcurrido = Date.now() - inicio;

                const esperaRestante = Math.max(
                    TIEMPO_MINIMO_MS - transcurrido,
                    0,
                );

                cierreTimer.current = window.setTimeout(() => {
                    if (!montado.current) {
                        return;
                    }

                    cierreEnCurso.current = false;

                    aceptarUsuario(null);
                    setCerrandoSesion(false);

                    onFinalizado?.();
                }, esperaRestante);
            })
            .catch(() => {
                cierreEnCurso.current = false;

                if (!montado.current) {
                    return;
                }

                setCerrandoSesion(false);

                setErrorCierre(
                    "No fue posible confirmar el cierre de sesión. Revisá tu conexión e intentá nuevamente.",
                );
            });
    }, [aceptarUsuario]);

    const actualizarUsuario = useCallback((datosUsuario) => {
        const version = ++versionSesion.current;
        const generacionAcceso = generacionAccesoRef.current;
        if (!datosUsuario) {
            aceptarUsuario(null);
            return;
        }
        const actual = usuarioRef.current;
        const rolCambio = datosUsuario.rol && datosUsuario.rol !== actual?.rol;
        if (datosUsuario.permisos) ultimaConsultaPermisosRef.current = Date.now();
        aceptarUsuario({
            ...actual,
            ...datosUsuario,
            permisos: datosUsuario.permisos ?? (rolCambio ? null : actual?.permisos),
            rol_id: datosUsuario.rol_id ?? (rolCambio ? null : actual?.rol_id),
        });
        if (datosUsuario.permisos && (!rolCambio || datosUsuario.rol_id)) return;
        void obtenerAcceso().then((acceso) => {
            if (montado.current && version === versionSesion.current
                && generacionAcceso === generacionAccesoRef.current && usuarioRef.current) {
                ultimaConsultaPermisosRef.current = Date.now();
                aceptarUsuario({ ...usuarioRef.current, ...acceso });
            }
        }).catch(() => {});
    }, [aceptarUsuario]);

    return (
        <AuthContext.Provider
            value={{
                usuario,
                cargandoSesion,
                iniciarSesion,
                cerrarSesion,
                actualizarUsuario,
                verificarAcceso,
            }}
        >
            {children}

            {errorCierre && (
                <div className="session-closing-screen">
                    <div
                        className="session-closing-content"
                        role="alert"
                    >
                        <h1>No fue posible cerrar sesión</h1>

                        <p>{errorCierre}</p>

                        <button
                            type="button"
                            onClick={() => setErrorCierre("")}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {cerrandoSesion && (
                <div className="session-closing-screen">
                    <div className="session-closing-content">
                        <div
                            className="session-closing-spinner"
                            aria-hidden="true"
                        />

                        <h1>Cerrando sesión</h1>

                        <p>{mensajeCierre}</p>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}
