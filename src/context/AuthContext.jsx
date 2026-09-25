import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    verificarSesion,
    cerrarSesion as cerrarSesionService,
} from "../services/loginService.js";

import echo from "../services/echo.js";
import "../styles/cerrarSesion.css";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargandoSesion, setCargandoSesion] = useState(true);
    const [cerrandoSesion, setCerrandoSesion] = useState(false);
    const [mensajeCierre, setMensajeCierre] = useState(
        "Cerrando sesión...",
    );

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
        if (cargandoSesion || !usuario?.id_usuario) {
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
                setMensajeCierre(
                    "Tu cuenta ha sido desactivada.",
                );

                setCerrandoSesion(true);

                window.setTimeout(() => {
                    setUsuario(null);
                    setCerrandoSesion(false);
                }, 1200);
            }
        };

        canal.listen(
            ".user.status-changed",
            manejarCambioEstado,
        );

        return () => {
            echo.leaveChannel("usuarios");
        };
    }, [cargandoSesion, usuario?.id_usuario]);

    const iniciarSesion = (datosUsuario) => {
        setUsuario(datosUsuario);
    };

    
    const cerrarSesion = (onFinalizado) => {
        setMensajeCierre("");
        setCerrandoSesion(true);

        const TIEMPO_MINIMO_MS = 900;
        const inicio = Date.now();

        cerrarSesionService()
            .catch((error) => {
                // Un 401 significa que la sesión ya había expirado:
                // es un caso esperado, no lo tratamos como error real.
                if (error.status !== 401) {
                    console.error("Error al cerrar sesión:", error);
                }
            })
            .finally(() => {
                const transcurrido = Date.now() - inicio;
                const esperaRestante = Math.max(
                    TIEMPO_MINIMO_MS - transcurrido,
                    0,
                );

                window.setTimeout(() => {
                    setUsuario(null);
                    setCerrandoSesion(false);
                    onFinalizado?.();
                }, esperaRestante);
            });
    };

    const actualizarUsuario = (datosUsuario) => {
        setUsuario(datosUsuario);
    };

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

export function useAuth() {
    return useContext(AuthContext);
}