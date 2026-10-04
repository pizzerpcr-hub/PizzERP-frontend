/**
 * Revalida la sesión con temporizador y eventos solo si la página está visible.
 * @param {object} opciones - Funciones de consulta y actualización, con entorno opcional.
 * @returns {Function} Detiene los eventos, el temporizador y la consulta pendiente.
 */
export const observarSesion = ({ consultar, actualizar, intervaloMs = 60000, ventana = window, documento = document }) => {
    let pendiente = null;
    let detenido = false;
    let reconexionPendiente = false;
    const revisar = async (evento) => {
        if (evento?.type === "online") reconexionPendiente = true;
        if (detenido || pendiente || documento.visibilityState === "hidden") return;
        const controller = new AbortController();
        pendiente = controller;
        try {
            const usuario = await consultar(controller.signal);
            if (!detenido && !controller.signal.aborted) {
                const reconexion = reconexionPendiente;
                reconexionPendiente = false;
                await actualizar(usuario, reconexion);
            }
        } catch {
            // Un fallo de red no confirma revocación; reintentar en la próxima revisión.
        } finally {
            if (pendiente === controller) pendiente = null;
        }
    };
    const intervalo = ventana.setInterval(revisar, intervaloMs);
    ventana.addEventListener("focus", revisar);
    ventana.addEventListener("online", revisar);
    ventana.addEventListener("pizzerp:session-check", revisar);
    documento.addEventListener("visibilitychange", revisar);
    return () => {
        detenido = true;
        pendiente?.abort();
        ventana.clearInterval(intervalo);
        ventana.removeEventListener("focus", revisar);
        ventana.removeEventListener("online", revisar);
        ventana.removeEventListener("pizzerp:session-check", revisar);
        documento.removeEventListener("visibilitychange", revisar);
    };
};
