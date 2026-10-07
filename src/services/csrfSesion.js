// Lee la cookie actual; no conserva tokens ni autorizaciones en memoria.
export function crearPreparacionCsrf(solicitar = (...args) => fetch(...args), cookies = () => document.cookie) {
    let pendiente = null;
    const token = () => {
        const cookie = cookies().split(";").map(parte => parte.trim())
            .find(parte => parte.startsWith("XSRF-TOKEN="));
        return cookie ? decodeURIComponent(cookie.slice("XSRF-TOKEN=".length)) : "";
    };
    return async (forzar = false) => {
        if (pendiente) return pendiente;
        if (!forzar && token()) return token();
        pendiente = Promise.resolve().then(() => solicitar("/sanctum/csrf-cookie", {
            credentials: "include", headers: { Accept: "application/json" },
        })).then(response => {
            if (!response.ok) throw new Error("No fue posible iniciar la conexión segura.");
            return token();
        }).finally(() => { pendiente = null; });
        return pendiente;
    };
}

export const prepararCsrf = crearPreparacionCsrf();

export async function solicitarConCsrf(ruta, opciones) {
    const enviar = async forzar => fetch(ruta, {
        ...opciones,
        headers: { ...opciones.headers, "X-XSRF-TOKEN": await prepararCsrf(forzar) },
    });
    const respuesta = await enviar(false);
    return respuesta.status === 419 ? enviar(true) : respuesta;
}
