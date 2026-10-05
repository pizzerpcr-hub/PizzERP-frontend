export const notificarInactividad = (response, data) => {
    if (response.status === 401 && data?.reason === "inactivity" && typeof window !== "undefined") {
        window.dispatchEvent(new Event("pizzerp:session-idle-expired"));
    }
};
