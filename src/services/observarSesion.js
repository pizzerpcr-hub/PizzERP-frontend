// Revalida la sesión únicamente mientras la página está visible.
export const observarSesion = ({ consultar, actualizar, ventana = window, documento = document }) => {
    let pendiente = null;
    let detenido = false;
    const revisar = async () => {
        if (detenido || pendiente || documento.visibilityState === "hidden") return;
        const controller = new AbortController();
        pendiente = controller;
        try {
            const usuario = await consultar(controller.signal);
            if (!detenido && !controller.signal.aborted) await actualizar(usuario);
        } catch {
            // Un fallo de red no confirma revocación; reintentar en la próxima revisión.
        } finally {
            if (pendiente === controller) pendiente = null;
        }
    };
    const intervalo = ventana.setInterval(revisar, 30000);
    ventana.addEventListener("focus", revisar);
    ventana.addEventListener("pizzerp:session-check", revisar);
    documento.addEventListener("visibilitychange", revisar);
    return () => {
        detenido = true;
        pendiente?.abort();
        ventana.clearInterval(intervalo);
        ventana.removeEventListener("focus", revisar);
        ventana.removeEventListener("pizzerp:session-check", revisar);
        documento.removeEventListener("visibilitychange", revisar);
    };
};
