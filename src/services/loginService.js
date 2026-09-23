const API_URL = "";

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
            return null;
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
    try {
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
            const validationMessage = responseData.errors
                ? Object.values(responseData.errors).flat()[0]
                : null;

            let errorMessage =
                validationMessage ??
                responseData.message ??
                "No fue posible iniciar sesión.";

            if (
                loginResponse.status === 401 &&
                Number.isInteger(responseData.intentos_restantes)
            ) {
                const remainingAttempts =
                    responseData.intentos_restantes;

                const attemptsMessage =
                    remainingAttempts === 1
                        ? "Te queda 1 intento."
                        : `Te quedan ${remainingAttempts} intentos.`;

                errorMessage = `${errorMessage} ${attemptsMessage}`;
            }

            throw new Error(errorMessage);
        }

        return responseData;
    } catch (error) {
        throw error;
    }
};


export const cerrarSesion = async () => {
    try {
        await fetch("/sanctum/csrf-cookie", {
            method: "GET",
            credentials: "include",
        });

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
            throw new Error(
                data.message || "Error al cerrar sesión."
            );
        }

        return data;
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        throw error;
    }
};