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
import "../styles/cerrarSesion.css";

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargandoSesion, setCargandoSesion] = useState(true);
    const [cerrandoSesion, setCerrandoSesion] = useState(false);
    const montado = useRef(true);
    const cierreTimer = useRef(null);
    const cierreEnCurso = useRef(false);
    const [errorCierre, setErrorCierre] = useState("");
    const [mensajeCierre, setMensajeCierre] = useState(
        "Cerrando sesión...",
    );

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

    useEffect(() => {
        if (!usuario?.id_usuario || cerrandoSesion) return undefined;
        return observarSesion({
            consultar: verificarSesion,
            actualizar: (actualizado) => setUsuario((actual) => {
                if (!actualizado) return null;
                const campos = ["id_usuario", "nombre_completo", "nombre_usuario", "rol", "estado"];
                return campos.every((campo) => actual?.[campo] === actualizado[campo])
                    ? actual : actualizado;
            }),
        });
    }, [usuario, cerrandoSesion]);

    const iniciarSesion = (datosUsuario) => {
        setUsuario(datosUsuario);
    };

    const cerrarSesion = (onFinalizado) => {
        if (cierreEnCurso.current) return;
        cierreEnCurso.current = true;
        setErrorCierre("");
        setMensajeCierre("");
        setCerrandoSesion(true);

        const TIEMPO_MINIMO_MS = 900;
        const inicio = Date.now();

        cerrarSesionService()
            .then(() => {
                if (!montado.current) return;
                const transcurrido = Date.now() - inicio;
                const esperaRestante = Math.max(
                    TIEMPO_MINIMO_MS - transcurrido,
                    0,
                );

                cierreTimer.current = window.setTimeout(() => {
                    if (!montado.current) return;
                    cierreEnCurso.current = false;
                    setUsuario(null);
                    setCerrandoSesion(false);
                    onFinalizado?.();
                }, esperaRestante);
            })
            .catch(() => {
                cierreEnCurso.current = false;
                if (!montado.current) return;
                setCerrandoSesion(false);
                setErrorCierre("No fue posible confirmar el cierre de sesión. Revisá tu conexión e intentá nuevamente.");
            });
    };

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
                    <div className="session-closing-content" role="alert">
                        <h1>No fue posible cerrar sesión</h1>
                        <p>{errorCierre}</p>
                        <button type="button" onClick={() => setErrorCierre("")}>
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
