import { puede } from "../constants/roles.js";

export const VIGENCIA_LISTAS_MS = 60_000;
const recursos = {
    "/api/users": ["usuarios", "ver"],
    "/api/roles": ["roles", "ver"],
    "/api/categories": ["categorias", "ver"],
    "/api/products": ["productos", "ver"],
    "/api/ingredients": ["ingredientes", "ver"],
    "/api/combos": ["combos", "ver"],
    "/api/users/roles": ["usuarios", "crear", "editar"],
    "/api/products/categorias": ["productos", "crear", "editar"],
    "/api/combos/productos": ["combos", "crear", "editar"],
};
const relaciones = {
    "/api/users": [],
    "/api/roles": ["/api/users", "/api/users/roles"],
    "/api/categories": ["/api/products", "/api/products/categorias", "/api/combos", "/api/combos/productos"],
    "/api/products": ["/api/categories", "/api/combos", "/api/combos/productos"],
    "/api/ingredients": [],
    "/api/combos": [],
};
const entidades = {
    users: ["usuario", "id_usuario", "nombre_completo"],
    roles: ["rol", "id_rol", "nombre"],
    categories: ["categoria", "id_categoria", "nombre"],
    products: ["producto", "id_producto", "nombre"],
    ingredients: ["ingrediente", "id_ingrediente", "nombre"],
    combos: ["combo", "id_combo", "nombre"],
};
const vacio = Object.freeze({ datos: undefined, error: null, consultando: false, actualizado: 0, pendientes: [] });
const rechazados = new Set();
const entradas = new Map();
const oyentes = new Map();
const busquedas = new Map();
const visibles = new Map();
let sesion = null;
let generacion = 0;
let precargaIniciada = false;
let identidadSesion = 0;

const permitido = (ruta) => {
    const [modulo, ...acciones] = recursos[ruta] ?? [];
    return Boolean(sesion && !rechazados.has(ruta) && acciones.some((accion) => puede(sesion, modulo, accion)));
};
const emitir = (ruta) => oyentes.get(ruta)?.forEach((callback) => callback());
const entrada = (ruta) => {
    if (!entradas.has(ruta)) entradas.set(ruta, { snapshot: vacio, version: 0, pendiente: null });
    return entradas.get(ruta);
};
const publicar = (ruta, cambios) => {
    const item = entrada(ruta);
    item.snapshot = { ...item.snapshot, ...cambios };
    emitir(ruta);
};
const retirar = (ruta) => {
    const item = entradas.get(ruta);
    if (item) {
        item.version++;
        item.controller?.abort();
        entradas.delete(ruta);
    }
    busquedas.delete(ruta);
    emitir(ruta);
};

/** Memoria de una sola sesión. Nunca persiste listas, permisos ni credenciales. */
export function sincronizarListasSesion(usuario) {
    const cambioCuenta = String(sesion?.id_usuario ?? "") !== String(usuario?.id_usuario ?? "");
    const cambioPermisos = JSON.stringify(sesion?.permisos) !== JSON.stringify(usuario?.permisos)
        || sesion?.estado !== usuario?.estado || sesion?.rol !== usuario?.rol;
    sesion = usuario;
    rechazados.clear();
    if (cambioCuenta || !usuario) {
        generacion++;
        identidadSesion++;
        precargaIniciada = false;
        for (const ruta of [...entradas.keys()]) retirar(ruta);
        busquedas.clear();
    } else if (cambioPermisos) {
        generacion++;
        for (const ruta of [...entradas.keys()]) {
            if (!permitido(ruta) || !relaciones[ruta]) retirar(ruta);
            else {
                entradas.get(ruta).controller?.abort();
                publicar(ruta, { pendientes: [] });
                invalidarLista(ruta);
            }
        }
    }
}

export const leerLista = (ruta) => permitido(ruta) ? entradas.get(ruta)?.snapshot ?? vacio : vacio;
export const puedeConsultarLista = permitido;
export const suscribirLista = (ruta, callback) => {
    if (!oyentes.has(ruta)) oyentes.set(ruta, new Set());
    oyentes.get(ruta).add(callback);
    return () => {
        oyentes.get(ruta)?.delete(callback);
        if (!oyentes.get(ruta)?.size) oyentes.delete(ruta);
    };
};
export const listaDesactualizada = (snapshot) => snapshot.datos === undefined
    || !snapshot.actualizado || Date.now() - snapshot.actualizado >= VIGENCIA_LISTAS_MS;
export const leerBusqueda = (ruta) => permitido(ruta) ? busquedas.get(ruta) ?? "" : "";
export const guardarBusqueda = (ruta, texto) => { if (permitido(ruta)) busquedas.set(ruta, texto); };
export const versionListasSesion = () => generacion;
export const identidadListasSesion = () => identidadSesion;
// La pantalla puede iniciar GET inmediatamente; solo la cola de fondo espera.
export function registrarListaVisible(ruta) {
    visibles.set(ruta, (visibles.get(ruta) ?? 0) + 1);
    return () => {
        const cantidad = (visibles.get(ruta) ?? 1) - 1;
        if (cantidad) visibles.set(ruta, cantidad);
        else visibles.delete(ruta);
    };
}
export const esListaVisible = ruta => visibles.has(ruta);
export async function esperarListasVisibles() {
    let pendientes;
    while ((pendientes = [...visibles.keys()].map(ruta => entradas.get(ruta)?.pendiente).filter(Boolean)).length) {
        await Promise.allSettled(pendientes);
    }
}
export function iniciarPrecargaListas() {
    if (precargaIniciada || !sesion?.permisos || sesion.estado !== "ACTIVO") return false;
    precargaIniciada = true;
    return true;
}

const cancelacion = () => new DOMException("Consulta descartada.", "AbortError");
const esperar = (promise, signal) => {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(cancelacion());
    return new Promise((resolve, reject) => {
        const cancelar = () => reject(cancelacion());
        signal.addEventListener("abort", cancelar, { once: true });
        promise.then((datos) => signal.aborted ? reject(cancelacion()) : resolve(datos), reject)
            .finally(() => signal.removeEventListener("abort", cancelar));
    });
};

/** Comparte solo GET idénticos; cancelar un consumidor no cancela a los demás. */
export function consultarLista(ruta, consultar, { signal, forzar = false } = {}) {
    if (!permitido(ruta)) return Promise.reject(cancelacion());
    const item = entrada(ruta);
    if (item.snapshot.pendientes.length) return esperar(Promise.resolve(item.snapshot.datos), signal);
    if (item.pendiente) return esperar(item.pendiente, signal);
    if (!forzar && !listaDesactualizada(item.snapshot)) return esperar(Promise.resolve(item.snapshot.datos), signal);
    const version = item.version;
    const epoch = generacion;
    item.controller = new AbortController();
    // Instalar la promesa antes de emitir: otro consumidor puede consultar al notificarse.
    item.pendiente = Promise.resolve().then(() => consultar(item.controller.signal)).then((datos) => {
        if (epoch !== generacion || entradas.get(ruta) !== item || !permitido(ruta)) throw cancelacion();
        if (version !== item.version) {
            if (item.snapshot.datos === undefined) throw cancelacion();
            return item.snapshot.datos;
        }
        publicar(ruta, { datos, error: null, actualizado: Date.now() });
        return datos;
    }).catch((error) => {
        if (epoch === generacion && entradas.get(ruta) === item && version === item.version && permitido(ruta)) {
            if (error.status === 401 || error.status === 403) {
                rechazados.add(ruta);
                retirar(ruta);
                if (typeof window !== "undefined") window.dispatchEvent(new Event("pizzerp:session-check"));
            }
            else if (error.name !== "AbortError") publicar(ruta, { error });
        }
        throw error;
    }).finally(() => {
        item.pendiente = null;
        if (entradas.get(ruta) === item) publicar(ruta, { consultando: false });
    });
    publicar(ruta, { consultando: true });
    return esperar(item.pendiente, signal);
}

export function actualizarLista(ruta, actualizar) {
    if (!permitido(ruta)) return;
    const item = entrada(ruta);
    item.version++;
    const datos = typeof actualizar === "function" ? actualizar(item.snapshot.datos ?? []) : actualizar;
    publicar(ruta, { datos, error: null, actualizado: Date.now() });
}
export function invalidarLista(ruta) {
    if (!entradas.has(ruta) || !permitido(ruta)) return;
    entrada(ruta).version++;
    publicar(ruta, { actualizado: 0, error: null });
}
export function marcarListaPendiente(ruta, id, pendiente) {
    if (!permitido(ruta)) return;
    const ids = new Set(entrada(ruta).snapshot.pendientes);
    if (pendiente) ids.add(String(id));
    else ids.delete(String(id));
    publicar(ruta, { pendientes: [...ids] });
}

export function confirmarLista(ruta, metodo, respuesta, epoch) {
    if (epoch !== generacion) return;
    const match = ruta.match(/^\/api\/(users|roles|categories|products|ingredients|combos)(?:\/(\d+))?/);
    if (!match) return;
    const recurso = `/api/${match[1]}`;
    const [campo, id, orden] = entidades[match[1]];
    const confirmado = recurso === "/api/users" && respuesta[campo]
        ? usuarioListadoPublico(respuesta[campo]) : respuesta[campo];
    // Una respuesta puntual no significa que se haya recibido el listado completo.
    if (leerLista(recurso).datos !== undefined && (confirmado || metodo === "DELETE")) {
        actualizarLista(recurso, (datos) => {
            const resto = datos.filter((item) => String(item[id]) !== String(confirmado?.[id] ?? match[2]));
            return (confirmado ? [...resto, confirmado] : resto).sort((a, b) => String(a[orden]).localeCompare(String(b[orden])));
        });
    } else invalidarLista(recurso);
    for (const relacionado of relaciones[recurso] ?? []) invalidarLista(relacionado);
}

// Los usuarios se conservan exclusivamente con sus cinco campos públicos.
export const usuarioListadoPublico = (usuario) => Object.fromEntries(
    ["id_usuario", "nombre_completo", "nombre_usuario", "rol", "estado"].map((campo) => [campo, usuario[campo]]),
);
