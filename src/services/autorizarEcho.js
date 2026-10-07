import { notificarInactividad } from "./notificarInactividad.js";
import { crearPreparacionCsrf, prepararCsrf } from "./csrfSesion.js";

// Solo comparte la preparación en curso; no memoriza cookies ni autorizaciones.
export function crearAutorizadorEcho(solicitar = (...args) => fetch(...args), cookies = () => document.cookie, preparar = prepararCsrf) {
    if (arguments.length && arguments.length < 3) preparar = crearPreparacionCsrf(solicitar, cookies);
    return channel => ({
        authorize: async (socketId, callback) => {
            try {
                const enviar = async forzar => solicitar("/broadcasting/auth", {
                    method: "POST", credentials: "include",
                    headers: {
                        Accept: "application/json", "Content-Type": "application/json",
                        "X-XSRF-TOKEN": await preparar(forzar),
                    },
                    body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
                });
                let response = await enviar(false);
                if (response.status === 419) response = await enviar(true);
                if (!response.ok) {
                    notificarInactividad(response, await response.json().catch(() => ({})));
                    throw new Error("No fue posible autorizar la suscripción.");
                }
                callback(null, await response.json());
            } catch (error) { callback(error, null); }
        },
    });
}
