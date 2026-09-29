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

    useEffect(() => {
        montado.current = true;

        return () => {
            montado.current = false;
            window.clearTimeout(cierreTimer.current);
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const restaurarSesion = async () => {
            try {
                const usuarioActual = await verificarSesion(
                    controller.signal,
                );

                if (!controller.signal.aborted) {
                    setUsuario(usuarioActual);
                }
            } catch (error) {
                if (
                    error.name !== "AbortError" &&
                    !controller.signal.aborted
                ) {
                    setUsuario(null);
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
    }, []);

    /**
     * Muestra el aviso de revocación y retira la sesión tras una pausa breve.
     * @returns {void}
     */
    const cerrarPorPermisos = useCallback(() => {
        if (!montado.current || cierreEnCurso.current) {
            return;
        }

        cierreEnCurso.current = true;

        setErrorCierre("");
        setMensajeCierre(
            "Tu cuenta ha sido desactivada o ya no tienes permisos para acceder al sistema.",
        );

        setCerrandoSesion(true);

        cierreTimer.current = window.setTimeout(() => {
            if (!montado.current) {
                return;
            }

            setUsuario(null);
            setCerrandoSesion(false);
            cierreEnCurso.current = false;

            navigate("/", { replace: true });
        }, 1500);
    }, []);

    // La consulta periódica respalda la notificación inmediata por WebSocket.
    useEffect(() => {
        if (
            !usuario?.id_usuario ||
            cerrandoSesion
        ) {
            return undefined;
        }

        return observarSesion({
            consultar: verificarSesion,

            actualizar: (actualizado) => {
                if (!actualizado) {
                    cerrarPorPermisos();
                    return;
                }

                setUsuario((actual) => {
                    const campos = [
                        "id_usuario",
                        "nombre_completo",
                        "nombre_usuario",
                        "rol",
                        "estado",
                    ];

                    const sinCambios = campos.every(
                        (campo) =>
                            actual?.[campo] === actualizado[campo],
                    );

                    return sinCambios
                        ? actual
                        : actualizado;
                });
            },
        });
    }, [
        usuario?.id_usuario,
        cerrandoSesion,
        cerrarPorPermisos,
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

    const iniciarSesion = useCallback((datosUsuario) => {
        setUsuario(datosUsuario);
    }, []);

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

        setErrorCierre("");
        setMensajeCierre("Un momento, estamos cerrando tu sesión.");
        setCerrandoSesion(true);

        const TIEMPO_MINIMO_MS = 900;
        const inicio = Date.now();

        cerrarSesionService()
            .then(() => {
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

                    setUsuario(null);
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
    }, []);

    const actualizarUsuario = useCallback((datosUsuario) => {
        setUsuario(datosUsuario);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                usuario,
                cargandoSesion,
                iniciarSesion,
                cerrarSesion,
                actualizarUsuario,
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
