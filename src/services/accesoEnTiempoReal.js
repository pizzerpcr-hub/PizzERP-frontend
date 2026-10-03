export function aplicarCambioAcceso(usuario, evento, tipo, revisiones = { usuario: 0, rol: 0 }) {
    if (!usuario || !Number.isSafeInteger(evento?.revision)
        || !Number.isSafeInteger(evento?.rol_id)
        || typeof evento?.rol !== "string"
        || !evento?.permisos || typeof evento.permisos !== "object"
        || Array.isArray(evento.permisos)) {
        return null;
    }

    if (tipo === "usuario") {
        if (String(evento.user_id) !== String(usuario.id_usuario)
            || evento.revision <= revisiones.usuario) return null;
        const mismoRol = String(evento.rol_id) === String(usuario.rol_id);
        const rolMasReciente = mismoRol && evento.revision < revisiones.rol;

        return {
            usuario: {
                ...usuario,
                rol: rolMasReciente ? usuario.rol : evento.rol,
                rol_id: evento.rol_id,
                permisos: rolMasReciente ? usuario.permisos : evento.permisos,
            },
            revisiones: { usuario: evento.revision, rol: mismoRol ? revisiones.rol : 0 },
        };
    }

    if (tipo !== "rol" || String(evento.rol_id) !== String(usuario.rol_id)
        || evento.revision <= revisiones.rol
        || evento.revision <= revisiones.usuario) return null;

    return {
        usuario: {
            ...usuario,
            rol: evento.rol,
            rol_id: evento.rol_id,
            permisos: evento.permisos,
        },
        revisiones: { ...revisiones, rol: evento.revision },
    };
}
