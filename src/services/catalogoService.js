import { confirmarLista, consultarLista, versionListasSesion } from "./listasSesion.js";

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

export const obtenerLista = (ruta, clave, mensaje, signal, opciones = {}) => consultarLista(ruta, async (signalCompartida) => {
    const response = await fetch(ruta, {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: signalCompartida,
    });
    const data = await leerRespuesta(response, mensaje);
    return Array.isArray(data[clave]) ? data[clave] : [];
}, { ...opciones, signal });

export const obtenerPaginaTabla = async (ruta, clave, pagina, busqueda, signal) => {
    const parametros = new URLSearchParams({ page: String(pagina), search: busqueda.trim() });
    const response = await fetch(`${ruta}?${parametros}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
    });
    const data = await leerRespuesta(response, "No fue posible cargar el listado.");
    return {
        datos: Array.isArray(data[clave]) ? data[clave] : [],
        paginacion: data.paginacion,
    };
};

export const enviarMutacion = async (ruta, metodo, datos, mensaje) => {
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
        body: JSON.stringify(datos),
    });

    const respuesta = await leerRespuesta(response, mensaje);
    confirmarLista(ruta, metodo, respuesta, epoch);
    return respuesta;
};

export const obtenerCategorias = (signal, opciones) =>
    obtenerLista("/api/categories", "categorias", "No fue posible cargar las categorías.", signal, opciones);

export const obtenerCategoriasParaProducto = (signal, opciones) =>
    obtenerLista("/api/products/categorias", "categorias", "No fue posible cargar las categorías disponibles.", signal, opciones);

export const obtenerIngredientesParaProducto = (signal, opciones) =>
    obtenerLista("/api/products/ingredientes", "ingredientes", "No fue posible cargar los ingredientes disponibles.", signal, opciones);

export const registrarCategoria = (datos) =>
    enviarMutacion("/api/categories", "POST", datos, "No fue posible registrar la categoría.");

export const actualizarCategoria = (id, datos) =>
    enviarMutacion(`/api/categories/${id}`, "PATCH", datos, "No fue posible actualizar la categoría.");

export const obtenerProductos = (signal, opciones) =>
    obtenerLista("/api/products", "productos", "No fue posible cargar los productos.", signal, opciones);

export const registrarProducto = (datos) =>
    enviarMutacion("/api/products", "POST", datos, "No fue posible registrar el producto.");

export const actualizarProducto = (id, datos) =>
    enviarMutacion(`/api/products/${id}`, "PATCH", datos, "No fue posible actualizar el producto.");

export const cambiarEstadoProducto = (id, estado) =>
    enviarMutacion(`/api/products/${id}/estado`, "PATCH", { estado }, "No fue posible cambiar el estado del producto.");
