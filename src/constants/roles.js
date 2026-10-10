export const ETIQUETAS_ROL = {
    ADMINISTRADOR: "Administrador",
    CAJA: "Caja",
    COCINA: "Cocina",
    TI: "Encargado de TI",
};

const PANEL_DESCONOCIDO = {
    panel: "Panel del sistema",
    modulos: "MÓDULOS DISPONIBLES",
};

const TITULOS_PANEL = {
    ADMINISTRADOR: "Panel de Administración",
    TI: "Panel de Encargado de Sistemas",
    CAJA: "Panel de Caja",
    COCINA: "Panel de Cocina",
};

export const normalizarRol = (rol) =>
    String(rol ?? "").trim().toUpperCase();

export const puedeGestionarUsuarios = (usuario) =>
    String(usuario?.estado ?? "").trim().toUpperCase() === "ACTIVO" &&
    usuario?.permisos?.usuarios?.ver === true;

export const puede = (usuario, modulo, accion = "ver") =>
    String(usuario?.estado ?? "").trim().toUpperCase() === "ACTIVO" &&
    usuario?.permisos?.[modulo]?.[accion] === true;

export const MODULOS_GESTION = [
    ["categorias", "Categorías"], ["productos", "Productos"],
    ["ingredientes", "Ingredientes"], ["combos", "Promociones"],
    ["usuarios", "Usuarios"], ["roles", "Roles y permisos"],
];

export const obtenerRutaInicio = (usuario) => {
    if (String(usuario?.estado ?? "").trim().toUpperCase() !== "ACTIVO") return null;
    const primero = MODULOS_GESTION.find(([modulo]) => puede(usuario, modulo));
    if (primero) return `/panel/${primero[0]}`;
    if (puede(usuario, "pedidos")) return "/caja";
    if (puede(usuario, "cocina")) return "/cocina";
    return "/panel";
};

export const obtenerItemsNavegacion = (usuario) => [
    ...MODULOS_GESTION.filter(([modulo]) => puede(usuario, modulo))
        .map(([modulo, label]) => ({ label, ruta: `/panel/${modulo}` })),
    ...(puede(usuario, "pedidos") ? [{ label: "Caja", disabled: true }] : []),
    ...(puede(usuario, "cocina") ? [{ label: "Cocina", disabled: true }] : []),
];

export const obtenerEtiquetaRol = (rol) => {
    const rolNormalizado = normalizarRol(rol);

    return ETIQUETAS_ROL[rolNormalizado] || rolNormalizado || "Sin rol";
};

export const obtenerInformacionPanel = (rol) => ({
    ...PANEL_DESCONOCIDO,
    panel: TITULOS_PANEL[normalizarRol(rol)] || PANEL_DESCONOCIDO.panel,
});
