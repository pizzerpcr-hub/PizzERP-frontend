const leerRespuesta = async (response, mensajePredeterminado) => {
    if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new Event("pizzerp:session-check"));
    }

    const data = await response.json().catch(() => ({}));

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

const obtenerLista = async (ruta, clave, mensaje, signal) => {
    const response = await fetch(ruta, {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
    });
    const data = await leerRespuesta(response, mensaje);
    return Array.isArray(data[clave]) ? data[clave] : [];
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
        body: JSON.stringify(datos),
    });

    return leerRespuesta(response, mensaje);
};

export const obtenerCategorias = (signal) =>
    obtenerLista("/api/categories", "categorias", "No fue posible cargar las categorías.", signal);

export const registrarCategoria = (datos) =>
    enviarMutacion("/api/categories", "POST", datos, "No fue posible registrar la categoría.");

export const actualizarCategoria = (id, datos) =>
    enviarMutacion(`/api/categories/${id}`, "PATCH", datos, "No fue posible actualizar la categoría.");

export const obtenerProductos = (signal) =>
    obtenerLista("/api/products", "productos", "No fue posible cargar los productos.", signal);

export const registrarProducto = (datos) =>
    enviarMutacion("/api/products", "POST", datos, "No fue posible registrar el producto.");

export const actualizarProducto = (id, datos) =>
    enviarMutacion(`/api/products/${id}`, "PATCH", datos, "No fue posible actualizar el producto.");
