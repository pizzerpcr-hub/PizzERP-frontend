export const ROLES_PERMITIDOS = [
    "ADMINISTRADOR",
    "CAJA",
    "COCINA",
    "TI",
];

export const ETIQUETAS_ROL = {
    ADMINISTRADOR: "Administrador",
    CAJA: "Caja",
    COCINA: "Cocina",
    TI: "Encargado de TI",
};

const INFORMACION_PANEL = {
    ADMINISTRADOR: {
        panel: "Panel de administración",
        modulos: "MÓDULOS DE ADMINISTRACIÓN",
    },
    TI: {
        panel: "Panel de tecnología",
        modulos: "MÓDULOS DE TI",
    },
    CAJA: {
        panel: "Panel de caja",
        modulos: "MÓDULOS DE CAJA",
    },
    COCINA: {
        panel: "Panel de cocina",
        modulos: "MÓDULOS DE COCINA",
    },
};

const PANEL_DESCONOCIDO = {
    panel: "Panel del sistema",
    modulos: "MÓDULOS",
};

export const normalizarRol = (rol) =>
    String(rol ?? "").trim().toUpperCase();

export const obtenerEtiquetaRol = (rol) => {
    const rolNormalizado = normalizarRol(rol);

    return ETIQUETAS_ROL[rolNormalizado] || rolNormalizado || "Sin rol";
};

export const obtenerInformacionPanel = (rol) =>
    INFORMACION_PANEL[normalizarRol(rol)] || PANEL_DESCONOCIDO;
