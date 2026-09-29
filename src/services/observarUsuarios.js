import { puedeGestionarUsuarios } from "../constants/roles.js";
import { observarSesion } from "./observarSesion.js";

/**
 * Revalida permisos antes de actualizar el listado de usuarios.
 * @param {object} opciones - Consulta de sesión, revocación, recarga y entorno.
 * @returns {Function} Detiene la observación de la sesión.
 */
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
