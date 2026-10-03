import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { crearAutorizadorEcho } from "./autorizarEcho.js";
import { configurarSocketReverb } from "./socketReverb.js";

window.Pusher = Pusher;

const echo = import.meta.env.VITE_REVERB_APP_KEY ? new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    authorizer: crearAutorizadorEcho(),
}) : null;

configurarSocketReverb(() => echo?.socketId());

export default echo;
