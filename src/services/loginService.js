const API_URL = "";
const MENSAJE_LOGIN_FALLIDO = "No fue posible iniciar sesión.\nVerifica tus credenciales.";
const MENSAJE_SESION_FALLIDA = "No fue posible verificar la sesión.";
const MENSAJE_LOGOUT_FALLIDO = "Error al cerrar sesión.";

const obtenerCookie = (nombre) => {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${nombre}=`));

    if (!cookie) {
        return "";
    }

    return decodeURIComponent(
        cookie.split("=").slice(1).join("=")
    );
};

/*
 * Extrae el mensaje real del backend a partir de una respuesta
 * de error (validación 422/429 con 'errors', o 'message' directo).
 * Si no hay nada útil, devuelve el mensaje de respaldo.
 */
const obtenerMensajeError = (responseData, mensajeRespaldo) => {
    const primerErrorDeValidacion = responseData?.errors
        ? Object.values(responseData.errors).flat()[0]
        : null;

    if (typeof primerErrorDeValidacion === "string" && primerErrorDeValidacion) {
        return primerErrorDeValidacion;
    }

    if (typeof responseData?.message === "string" && responseData.message) {
        return responseData.message;
    }

    return mensajeRespaldo;
};

export const verificarSesion = async (signal) => {
    try {
        const response = await fetch(
            `${API_URL}/api/user`,
            {
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
                signal,
            }
        );

        if (!response.ok) {
            /*
             * 401/403 son un caso esperado (no hay sesión válida),
             * no un error que deba mostrarse al usuario.
             */
            if (response.status === 401 || response.status === 403) {
                return null;
            }

            const responseData = await response
                .json()
                .catch(() => ({}));

            throw new Error(
                obtenerMensajeError(responseData, MENSAJE_SESION_FALLIDA),
            );
        }

        const responseData = await response.json();

        return responseData.usuario;
    } catch (error) {
        if (error.name === "AbortError") {
            throw error;
        }

        throw error;
    }
};

export const iniciarSesion = async (datosLogin) => {
    const csrfResponse = await fetch(
        `${API_URL}/sanctum/csrf-cookie`,
        {
            credentials: "include",
            headers: {
                Accept: "application/json",
            },
        }
    );

    if (!csrfResponse.ok) {
        throw new Error(
            "No fue posible iniciar la conexión segura."
        );
    }

    const csrfToken = obtenerCookie("XSRF-TOKEN");

    const loginResponse = await fetch(
        `${API_URL}/api/login`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": csrfToken,
            },
            body: JSON.stringify(datosLogin),
        }
    );

    const responseData = await loginResponse
        .json()
        .catch(() => ({}));

    if (!loginResponse.ok) {
        const error = new Error(
            obtenerMensajeError(responseData, MENSAJE_LOGIN_FALLIDO),
        );

        // Segundos restantes de bloqueo por IP, si aplica (429).
        error.retryAfter =
            typeof responseData?.retry_after === "number"
                ? responseData.retry_after
                : null;

        throw error;
    }

    return responseData;
};

export const cerrarSesion = async () => {
    const csrfResponse = await fetch("/sanctum/csrf-cookie", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
    });

    if (!csrfResponse.ok) {
        throw new Error("No fue posible preparar el cierre de sesión. Intentá nuevamente.");
    }

    const cookies = document.cookie.split(";");

    let xsrfToken = null;

    for (const cookie of cookies) {
        const [clave, valor] = cookie.trim().split("=");

        if (clave === "XSRF-TOKEN") {
            xsrfToken = decodeURIComponent(valor);
            break;
        }
    }

    const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "X-XSRF-TOKEN": xsrfToken,
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            obtenerMensajeError(data, MENSAJE_LOGOUT_FALLIDO),
        );
        error.status = response.status;
        throw error;
    }

    return data;
};