import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const echo = import.meta.env.VITE_REVERB_APP_KEY ? new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    authorizer: (channel) => ({
        authorize: async (socketId, callback) => {
            try {
                const csrf = await fetch("/sanctum/csrf-cookie", {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                });
                if (!csrf.ok) {
                    throw new Error("No fue posible autorizar la suscripción.");
                }
                const cookie = document.cookie.split(";")
                    .map((value) => value.trim())
                    .find((value) => value.startsWith("XSRF-TOKEN="));
                const response = await fetch("/broadcasting/auth", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-XSRF-TOKEN": cookie
                            ? decodeURIComponent(cookie.slice("XSRF-TOKEN=".length))
                            : "",
                    },
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name,
                    }),
                });
                if (!response.ok) {
                    throw new Error("No fue posible autorizar la suscripción.");
                }
                callback(null, await response.json());
            } catch (error) {
                callback(error, null);
            }
        },
    }),
}) : null;

export default echo;
