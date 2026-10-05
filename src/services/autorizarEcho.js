import { notificarInactividad } from "./notificarInactividad.js";

// Solo comparte la preparación en curso; no memoriza cookies ni autorizaciones.
export function crearAutorizadorEcho(solicitar = (...args) => fetch(...args), cookies = () => document.cookie) {
    let preparacion = null;
    const preparar = () => {
        if (!preparacion) {
            preparacion = Promise.resolve().then(() => solicitar("/sanctum/csrf-cookie", {
                credentials: "include", headers: { Accept: "application/json" },
            })).then(response => {
                if (!response.ok) throw new Error("No fue posible autorizar la suscripción.");
            }).finally(() => { preparacion = null; });
        }
        return preparacion;
    };
    return channel => ({
        authorize: async (socketId, callback) => {
            try {
                await preparar();
                const cookie = cookies().split(";").map(value => value.trim())
                    .find(value => value.startsWith("XSRF-TOKEN="));
                const response = await solicitar("/broadcasting/auth", {
                    method: "POST", credentials: "include",
                    headers: {
                        Accept: "application/json", "Content-Type": "application/json",
                        "X-XSRF-TOKEN": cookie ? decodeURIComponent(cookie.slice("XSRF-TOKEN=".length)) : "",
                    },
                    body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
                });
                if (!response.ok) {
                    notificarInactividad(response, await response.json().catch(() => ({})));
                    throw new Error("No fue posible autorizar la suscripción.");
                }
                callback(null, await response.json());
            } catch (error) { callback(error, null); }
        },
    });
}
