import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import { verificarSesion } from "../services/loginService.js";
import echo from "../services/echo.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargandoSesion, setCargandoSesion] = useState(true);

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

            /*
             * Si el usuario fue desactivado,
             * cerramos inmediatamente su sesión.
             */
            if (estado === "INACTIVO") {
                setUsuario(null);
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

    const cerrarSesion = () => {
        setUsuario(null);
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
        </AuthContext.Provider>
    );
}


export function useAuth() {
    return useContext(AuthContext);
}


