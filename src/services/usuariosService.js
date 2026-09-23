const obtenerCookie = (nombre) => {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const [clave, valor] = cookie.trim().split("=");

        if (clave === nombre) {
            return decodeURIComponent(valor);
        }
    }

    return null;
};

export const registrarUsuario = async (usuarioNuevo) => {
    try {
        await fetch("/sanctum/csrf-cookie", {
            method: "GET",
            credentials: "include",
        });

        const xsrfToken = obtenerCookie("XSRF-TOKEN");

        const response = await fetch("/api/users", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-XSRF-TOKEN": xsrfToken,
            },
            body: JSON.stringify(usuarioNuevo),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Error al registrar el usuario."
            );
        }

        return data;
    } catch (error) {
        console.error("Error al registrar el usuario:", error);
        throw error;
    }
};

export const obtenerUsuarios = async () => {
    try {
        const response = await fetch("/api/users", {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Error al obtener los usuarios."
            );
        }

        return data.usuarios;
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        throw error;
    }
};