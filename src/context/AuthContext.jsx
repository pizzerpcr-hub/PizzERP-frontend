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
import { crearConsultasSesion } from "../services/consultasSesion.js";
import { observarAccesoReverb } from "../services/observarAccesoReverb.js";
import { observarCrudReverb } from "../services/observarCrudReverb.js";
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
    const accesoConfirmado = useRef(null);
    const [consultasSesion] = useState(() => crearConsultasSesion(verificarSesion, obtenerAcceso));
    const aceptarUsuario = useCallback((actual) => {
        usuarioRef.current = actual;
        sincronizarListasSesion(actual);
        setUsuario(actual);
        if (actual?.permisos) void precargarListas(actual, window.location.pathname);
    }, []);
    const confirmarAcceso = useCallback((actual) => {
        accesoConfirmado.current = actual?.permisos
            ? { version: versionSesion.current, hasta: Date.now() + 60_000 } : null;
    }, []);
    const accesoVigente = useCallback(() => Boolean(
        usuarioRef.current?.permisos && !verificacionRef.current && !cierreEnCurso.current
        && accesoConfirmado.current?.version === versionSesion.current
        && Date.now() < accesoConfirmado.current.hasta
    ), []);

    useEffect(() => {
        montado.current = true;

        return () => {
            montado.current = false;
            window.clearTimeout(cierreTimer.current);
            verificacionRef.current?.controller.abort();
            consultasSesion.cancelar();
        };
    }, [consultasSesion]);

    useEffect(() => {
        const controller = new AbortController();
        const version = versionSesion.current;

        const restaurarSesion = async () => {
            try {
                const usuarioActual = await consultasSesion.usuario(
                    controller.signal,
                );

                const acceso = usuarioActual
                    ? await consultasSesion.acceso(controller.signal).catch(() => ({ permisos: null, rol_id: null }))
                    : null;

                if (!controller.signal.aborted && version === versionSesion.current) {
                    confirmarAcceso(usuarioActual ? { ...usuarioActual, ...acceso } : null);
                    aceptarUsuario(usuarioActual ? { ...usuarioActual, ...acceso } : null);
                }
            } catch (error) {
                if (
                    error.name !== "AbortError" &&
                    !controller.signal.aborted && version === versionSesion.current
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
            consultasSesion.cancelar();
        };
    }, [aceptarUsuario, confirmarAcceso, consultasSesion]);

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
        consultasSesion.cancelar();
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
    }, [navigate, aceptarUsuario, consultasSesion]);

    // Comparte verificaciones simultáneas, nunca memoriza una autorización entre solicitudes.
    const verificarAcceso = useCallback(() => {
        if (verificacionRef.current) return verificacionRef.current.promise;
        if (!usuarioRef.current || cierreEnCurso.current) return Promise.resolve(null);
        const controller = new AbortController();
        const version = versionSesion.current;
        const promise = (async () => {
            const actualizado = await consultasSesion.consultar(controller.signal);
            if (!montado.current || controller.signal.aborted || version !== versionSesion.current) return null;
            if (!actualizado) { cerrarPorPermisos(); return null; }
            confirmarAcceso(actualizado);
            const previo = usuarioRef.current;
            if (JSON.stringify(previo) !== JSON.stringify(actualizado)) aceptarUsuario(actualizado);
            return actualizado;
        })().finally(() => {
            if (verificacionRef.current?.promise === promise) verificacionRef.current = null;
        });
        verificacionRef.current = { controller, promise };
        return promise;
    }, [aceptarUsuario, cerrarPorPermisos, confirmarAcceso, consultasSesion]);

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
            actualizar: (actual, forzar) => {
                if (actual) window.dispatchEvent(new CustomEvent("pizzerp:session-verified", { detail: { forzar } }));
            },
        });
    }, [
        usuario?.id_usuario,
        cerrandoSesion,
        cerrarPorPermisos,
        verificarAcceso,
    ]);

    const revisarTrasEvento = useCallback((opciones = {}) => {
        versionSesion.current++;
        verificacionRef.current?.controller.abort();
        verificacionRef.current = null;
        consultasSesion.cancelar();
        void verificarAcceso().then(actual => {
            if (actual && montado.current && opciones.reconexion) {
                window.dispatchEvent(new CustomEvent("pizzerp:session-verified", { detail: { forzar: true } }));
            }
        }).catch(() => {});
    }, [consultasSesion, verificarAcceso]);

    // Los cambios de acceso invalidan cualquier revisión anterior al evento.
    useEffect(() => {
        if (!usuario?.id_usuario || cerrandoSesion || !echo) {
            return undefined;
        }

        return observarAccesoReverb({ echo, usuario, revisar: revisarTrasEvento, revocar: cerrarPorPermisos, accesoVigente });
    }, [usuario, cerrandoSesion, cerrarPorPermisos, revisarTrasEvento, accesoVigente]);

    useEffect(() => {
        if (!usuario?.id_usuario || cerrandoSesion) return undefined;
        return observarCrudReverb({ echo, usuario });
    }, [usuario, cerrandoSesion]);

    const iniciarSesion = useCallback(async (datosUsuario) => {
        const version = ++versionSesion.current;
        consultasSesion.cancelar();
        const acceso = await consultasSesion.acceso().catch(() => ({ permisos: null, rol_id: null }));
        if (montado.current && version === versionSesion.current) {
            confirmarAcceso({ ...datosUsuario, ...acceso });
            aceptarUsuario({ ...datosUsuario, ...acceso });
        }
    }, [aceptarUsuario, confirmarAcceso, consultasSesion]);

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
        consultasSesion.cancelar();

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
    }, [aceptarUsuario, consultasSesion]);

    const actualizarUsuario = useCallback((datosUsuario) => {
        const version = ++versionSesion.current;
        consultasSesion.cancelar();
        if (!datosUsuario) {
            aceptarUsuario(null);
            return;
        }
        const actual = usuarioRef.current;
        const rolCambio = datosUsuario.rol && datosUsuario.rol !== actual?.rol;
        aceptarUsuario({
            ...actual,
            ...datosUsuario,
            permisos: datosUsuario.permisos ?? (rolCambio ? null : actual?.permisos),
            rol_id: datosUsuario.rol_id ?? (rolCambio ? null : actual?.rol_id),
        });
        if (datosUsuario.permisos) return;
        void consultasSesion.acceso().then((acceso) => {
            if (montado.current && version === versionSesion.current && usuarioRef.current) aceptarUsuario({ ...usuarioRef.current, ...acceso });
        }).catch(() => {});
    }, [aceptarUsuario, consultasSesion]);

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
