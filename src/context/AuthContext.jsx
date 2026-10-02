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
import { obtenerPermisos } from "../services/gestionesService.js";
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
    const aceptarUsuario = useCallback((actual) => {
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

                const permisos = usuarioActual
                    ? await obtenerPermisos(controller.signal).catch(() => null)
                    : null;

                if (!controller.signal.aborted) {
                    aceptarUsuario(usuarioActual ? { ...usuarioActual, permisos } : null);
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

    // Comparte verificaciones simultáneas, nunca memoriza una autorización entre solicitudes.
    const verificarAcceso = useCallback(() => {
        if (verificacionRef.current) return verificacionRef.current.promise;
        if (!usuarioRef.current || cierreEnCurso.current) return Promise.resolve(null);
        const controller = new AbortController();
        const version = versionSesion.current;
        const promise = (async () => {
            const actual = await verificarSesion(controller.signal);
            const actualizado = actual ? { ...actual, permisos: await obtenerPermisos(controller.signal) } : null;
            if (!montado.current || controller.signal.aborted || version !== versionSesion.current) return null;
            if (!actualizado) { cerrarPorPermisos(); return null; }
            const previo = usuarioRef.current;
            if (JSON.stringify(previo) !== JSON.stringify(actualizado)) aceptarUsuario(actualizado);
            return actualizado;
        })().finally(() => {
            if (verificacionRef.current?.promise === promise) verificacionRef.current = null;
        });
        verificacionRef.current = { controller, promise };
        return promise;
    }, [aceptarUsuario, cerrarPorPermisos]);

    // La consulta periódica respalda la notificación inmediata por WebSocket.
    useEffect(() => {
        if (
            !usuario?.id_usuario ||
            cerrandoSesion
        ) {
            return undefined;
        }

        return observarSesion({
            consultar: verificarAcceso,
            actualizar: () => {},
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

        return () => {
            echo.leave(nombreCanal);
        };
    }, [usuario?.id_usuario, cerrandoSesion, cerrarPorPermisos]);

    const iniciarSesion = useCallback(async (datosUsuario) => {
        const version = ++versionSesion.current;
        const permisos = await obtenerPermisos().catch(() => null);
        if (montado.current && version === versionSesion.current) aceptarUsuario({ ...datosUsuario, permisos });
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
        if (!datosUsuario) {
            aceptarUsuario(null);
            return;
        }
        const actual = usuarioRef.current;
        aceptarUsuario({
            ...actual,
            ...datosUsuario,
            permisos: datosUsuario.permisos ?? (
                datosUsuario.rol && datosUsuario.rol !== actual?.rol ? null : actual?.permisos
            ),
        });
        if (datosUsuario.permisos) return;
        void obtenerPermisos().then((permisos) => {
            if (montado.current && version === versionSesion.current && usuarioRef.current) aceptarUsuario({ ...usuarioRef.current, permisos });
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
