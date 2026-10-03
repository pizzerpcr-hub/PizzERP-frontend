// Solo comparte solicitudes en curso; no memoriza permisos entre revisiones.
export function crearConsultasSesion(consultarUsuario, consultarAcceso) {
    const pendientes = new Map();
    const compartir = (clave, consultar, signal) => {
        if (!pendientes.has(clave)) {
            const controller = new AbortController();
            const item = { controller };
            item.promise = Promise.resolve().then(() => {
                if (controller.signal.aborted) throw new DOMException("Consulta cancelada.", "AbortError");
                return consultar(controller.signal);
            }).then(valor => {
                if (controller.signal.aborted) throw new DOMException("Consulta cancelada.", "AbortError");
                return valor;
            }).finally(() => {
                if (pendientes.get(clave) === item) pendientes.delete(clave);
            });
            pendientes.set(clave, item);
        }
        const promise = pendientes.get(clave).promise;
        if (!signal) return promise;
        if (signal.aborted) return Promise.reject(new DOMException("Consulta cancelada.", "AbortError"));
        return new Promise((resolve, reject) => {
            const cancelar = () => reject(new DOMException("Consulta cancelada.", "AbortError"));
            signal.addEventListener("abort", cancelar, { once: true });
            promise.then(valor => signal.aborted ? cancelar() : resolve(valor), reject)
                .finally(() => signal.removeEventListener("abort", cancelar));
        });
    };
    const usuario = signal => compartir("usuario", consultarUsuario, signal);
    const acceso = signal => compartir("acceso", consultarAcceso, signal);
    return {
        usuario,
        acceso,
        consultar: async signal => {
            const actual = await usuario(signal);
            return actual ? { ...actual, ...await acceso(signal) } : null;
        },
        cancelar: () => {
            for (const item of pendientes.values()) item.controller.abort();
            pendientes.clear();
        },
    };
}
