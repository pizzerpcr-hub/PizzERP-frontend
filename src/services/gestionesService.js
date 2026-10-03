import { enviarMutacion, obtenerLista } from "./catalogoService.js";

export const obtenerAcceso = async (signal) => {
    const response = await fetch("/api/permissions", {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "No fue posible consultar los permisos.");
    if (!data.permisos || typeof data.permisos !== "object" || Array.isArray(data.permisos)) {
        throw new Error("No fue posible confirmar los permisos vigentes.");
    }
    return { permisos: data.permisos, rol_id: data.rol_id ?? null };
};

export const obtenerPermisos = async (signal) => (await obtenerAcceso(signal)).permisos;

export const obtenerRoles = (signal, opciones) => obtenerLista("/api/roles", "roles", "No fue posible cargar los roles.", signal, opciones);
export const obtenerRolesAsignables = (signal, opciones) => obtenerLista("/api/users/roles", "roles", "No fue posible cargar los roles disponibles.", signal, opciones);
export const registrarRol = (datos) => enviarMutacion("/api/roles", "POST", datos, "No fue posible crear el rol.");
export const actualizarRol = (id, datos) => enviarMutacion(`/api/roles/${id}`, "PATCH", datos, "No fue posible actualizar el rol.");
export const cambiarEstadoRol = (id, estado) => enviarMutacion(`/api/roles/${id}/estado`, "PATCH", { estado }, "No fue posible cambiar el estado del rol.");

export const obtenerCombos = (signal, opciones) => obtenerLista("/api/combos", "combos", "No fue posible cargar los combos.", signal, opciones);
export const obtenerProductosParaCombo = (signal, opciones) => obtenerLista("/api/combos/productos", "productos", "No fue posible cargar los productos.", signal, opciones);
export const registrarCombo = (datos) => enviarMutacion("/api/combos", "POST", datos, "No fue posible registrar el combo.");
export const actualizarCombo = (id, datos) => enviarMutacion(`/api/combos/${id}`, "PATCH", datos, "No fue posible actualizar el combo.");
export const cambiarEstadoCombo = (id, estado) => enviarMutacion(`/api/combos/${id}/estado`, "PATCH", { estado }, "No fue posible cambiar el estado del combo.");
