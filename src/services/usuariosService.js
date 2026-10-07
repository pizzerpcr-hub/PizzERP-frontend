import { confirmarLista, consultarLista, usuarioListadoPublico, versionListasSesion } from "./listasSesion.js";
import { cabecerasSocketReverb } from "./socketReverb.js";
import { notificarInactividad } from "./notificarInactividad.js";
import { solicitarConCsrf } from "./csrfSesion.js";
import { iniciarAccionLista } from "./listasSesion.js";

const leerRespuesta = async (response) => {
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        notificarInactividad(response, data);
        window.dispatchEvent(new Event("pizzerp:session-check"));
    }

    return data;
};

const obtenerMensajeError = (data, mensajePredeterminado) => {
    const primerError = data.errors
        ? Object.values(data.errors).flat()[0]
        : null;

    return primerError || data.message || mensajePredeterminado;
};

/**
 * Envía una escritura autenticada y conserva los errores de validación por campo.
 * @param {string} ruta - Ruta de la API.
 * @param {string} metodo - Método HTTP.
 * @param {object} datos - Datos enviados al servidor.
 * @param {string} mensajePredeterminado - Texto usado si la respuesta no incluye error.
 * @returns {Promise<object>} Cuerpo de la respuesta confirmada.
 */
const enviarMutacion = async (
    ruta,
    metodo,
    datos,
    mensajePredeterminado
) => {
    const epoch = versionListasSesion();
    const terminar = iniciarAccionLista();
    try {
        const response = await solicitarConCsrf(ruta, {
            method: metodo,
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...cabecerasSocketReverb(),
            },
            body: JSON.stringify(datos),
        });
        const data = await leerRespuesta(response);

        if (!response.ok) {
            const error = new Error(
                obtenerMensajeError(data, mensajePredeterminado)
            );

            if (response.status === 422) {
                error.status = response.status;
                error.errors = data.errors;
            }

            throw error;
        }
        confirmarLista(ruta, metodo, data, epoch);
        return data;
    } finally { terminar(); }
};

export const registrarUsuario = async (usuarioNuevo) => {
    return enviarMutacion(
        "/api/users",
        "POST",
        usuarioNuevo,
        "Error al registrar el usuario."
    );
};

export const actualizarUsuario = async (id, datos) => {
    return enviarMutacion(
        `/api/users/${id}`,
        "PATCH",
        datos,
        "Error al actualizar el usuario."
    );
};

export const cambiarEstadoUsuario = async (id, estado) => {
    return enviarMutacion(
        `/api/users/${id}/estado`,
        "PATCH",
        { estado },
        "Error al cambiar el estado del usuario."
    );
};

export const obtenerUsuarios = (signal, opciones = {}) => consultarLista("/api/users", async (signalCompartida) => {
    const response = await fetch("/api/users", {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
        signal: signalCompartida,
    });
    const data = await leerRespuesta(response);

    if (!response.ok) {
        const error = new Error(
            obtenerMensajeError(
                data,
                "Error al obtener los usuarios."
            )
        );
        error.status = response.status;
        throw error;
    }

    return Array.isArray(data.usuarios) ? data.usuarios.map(usuarioListadoPublico) : [];
}, { ...opciones, signal });
