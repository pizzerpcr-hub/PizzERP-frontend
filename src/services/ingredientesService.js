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

    return leerRespuesta(response, mensaje);
};

export const obtenerIngredientes = async (signal) => {
    const response = await fetch("/api/ingredients", {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
    });
    const data = await leerRespuesta(response, "No fue posible cargar los ingredientes.");
    return Array.isArray(data.ingredientes) ? data.ingredientes : [];
};

export const registrarIngrediente = (datos) =>
    enviarMutacion("/api/ingredients", "POST", datos, "No fue posible registrar el ingrediente.");

export const actualizarIngrediente = (id, datos) =>
    enviarMutacion(`/api/ingredients/${id}`, "PATCH", datos, "No fue posible actualizar el ingrediente.");

export const eliminarIngrediente = (id) =>
    enviarMutacion(`/api/ingredients/${id}`, "DELETE", null, "No fue posible eliminar el ingrediente.");
