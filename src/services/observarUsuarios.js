import { puedeGestionarUsuarios } from "../constants/roles.js";
import { observarSesion } from "./observarSesion.js";

export const observarUsuarios = ({ consultar, revocar, recargar, ...entorno }) =>
    observarSesion({
        ...entorno,
        consultar,
        actualizar: async (usuario) => {
            if (!puedeGestionarUsuarios(usuario)) {
                revocar(usuario);
                return;
            }
            await recargar(usuario);
        },
    });
