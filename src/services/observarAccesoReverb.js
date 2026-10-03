const conexionesEstablecidas = new WeakSet();

export function observarAccesoReverb({ echo, usuario, revisar, revocar, accesoVigente = () => false }) {
    if (!echo || !usuario?.id_usuario) return () => {};
    const canales = [];
    const personal = `usuario.${usuario.id_usuario}`;
    const canal = echo.private(personal);
    canales.push(personal);
    canal.listen(".user.status-changed", evento => {
        if (String(evento?.usuario?.id_usuario) !== String(usuario.id_usuario)) return;
        if (String(evento.usuario.estado).trim().toUpperCase() === "INACTIVO") revocar();
        else revisar();
    });
    canal.listen(".user.access-changed", evento => {
        if (String(evento?.user_id) === String(usuario.id_usuario)) revisar();
    });
    if (usuario.rol_id != null) {
        const rol = `rol.${usuario.rol_id}`;
        canales.push(rol);
        echo.private(rol).listen(".role.access-changed", evento => {
            if (String(evento?.rol_id) === String(usuario.rol_id)) revisar();
        });
    }
    const conexion = echo.connector?.pusher?.connection;
    if (conexion?.state === "connected") conexionesEstablecidas.add(conexion);
    const conectado = () => {
        const primera = !conexionesEstablecidas.has(conexion);
        conexionesEstablecidas.add(conexion);
        if (!primera || !accesoVigente()) revisar({ reconexion: true });
    };
    conexion?.bind("connected", conectado);
    return () => {
        conexion?.unbind("connected", conectado);
        canales.forEach(nombre => echo.leave(nombre));
    };
}
