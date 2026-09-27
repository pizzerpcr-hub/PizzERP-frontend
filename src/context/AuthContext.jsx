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

    /*
     * Controla el montaje del provider y limpia
     * cualquier temporizador pendiente.
     */
    useEffect(() => {
        montado.current = true;

        return () => {
            montado.current = false;
            window.clearTimeout(cierreTimer.current);
        };
    }, []);

    /*
     * Restaurar sesión al cargar la aplicación.
     */
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

    /*
     * Cierra la sesión automáticamente cuando el backend
     * determina que el usuario ya no puede acceder.
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

        /*
         * La pantalla aparece inmediatamente.
         */
        setCerrandoSesion(true);

        /*
         * Después de mostrar el mensaje se elimina la sesión
         * local y se regresa al login.
         */
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

    /*
     * Vigila si el usuario sigue teniendo una sesión válida.
     * (Respaldo por polling, cada 30s o al recuperar foco/visibilidad.)
     */
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
                /*
                 * 401 o 403 desde /api/user terminan aquí
                 * porque verificarSesion() devuelve null.
                 */
                if (!actualizado) {
                    cerrarPorPermisos();
                    return;
                }

                /*
                 * Si el usuario sigue activo, solamente
                 * actualizamos los datos que hayan cambiado.
                 */
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

    /*
     * Reacciona de inmediato cuando el backend notifica, vía
     * WebSocket, que el usuario fue desactivado — sin esperar
     * al polling de respaldo de observarSesion.
     */
    useEffect(() => {
        if (!usuario?.id_usuario || cerrandoSesion) {
            return undefined;
        }

        const canal = echo.channel("usuarios");

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
            echo.leaveChannel("usuarios");
        };
    }, [usuario?.id_usuario, cerrandoSesion, cerrarPorPermisos]);

    /*
     * Establece el usuario después de iniciar sesión.
     */
    const iniciarSesion = useCallback((datosUsuario) => {
        setUsuario(datosUsuario);
    }, []);

    /*
     * Cierre de sesión manual.
     */
    const cerrarSesion = useCallback((onFinalizado) => {
        if (cierreEnCurso.current) {
            return;
        }

        cierreEnCurso.current = true;

        setErrorCierre("");
        setMensajeCierre("Cerrando sesión...");
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

    /*
     * Actualiza los datos del usuario desde otros componentes.
     */
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