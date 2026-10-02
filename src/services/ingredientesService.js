import { obtenerLista } from "./catalogoService.js";
import { confirmarLista, versionListasSesion } from "./listasSesion.js";

const leerRespuesta = async (response, mensajePredeterminado) => {
    if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new Event("pizzerp:session-check"));
    }

    const data = response.status === 204 ? {} : await response.json().catch(() => ({}));

    if (!response.ok) {
        const mensaje = data.errors ? Object.values(data.errors).flat()[0] : null;
        const error = new Error(mensaje || data.message || mensajePredeterminado);
        error.status = response.status;
        error.errors = data.errors;
        throw error;
    }

    return data;
};

const obtenerCookie = (nombre) => {
    const cookie = document.cookie.split(";").find((parte) => parte.trim().startsWith(`${nombre}=`));
    return cookie ? decodeURIComponent(cookie.trim().slice(nombre.length + 1)) : "";
};

const enviarMutacion = async (ruta, metodo, datos, mensaje) => {
    const epoch = versionListasSesion();
    const csrf = await fetch("/sanctum/csrf-cookie", {
        credentials: "include",
        headers: { Accept: "application/json" },
    });

    if (!csrf.ok) {
        throw new Error("No fue posible iniciar la conexión segura.");
    }

    const response = await fetch(ruta, {
        method: metodo,
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": obtenerCookie("XSRF-TOKEN"),
        },
        ...(datos ? { body: JSON.stringify(datos) } : {}),
    });

    const respuesta = await leerRespuesta(response, mensaje);
    confirmarLista(ruta, metodo, respuesta, epoch);
    return respuesta;
};

export const obtenerIngredientes = (signal, opciones) =>
    obtenerLista("/api/ingredients", "ingredientes", "No fue posible cargar los ingredientes.", signal, opciones);

export const registrarIngrediente = (datos) =>
    enviarMutacion("/api/ingredients", "POST", datos, "No fue posible registrar el ingrediente.");

export const actualizarIngrediente = (id, datos) =>
    enviarMutacion(`/api/ingredients/${id}`, "PATCH", datos, "No fue posible actualizar el ingrediente.");

export const eliminarIngrediente = (id) =>
    enviarMutacion(`/api/ingredients/${id}`, "DELETE", null, "No fue posible eliminar el ingrediente.");
