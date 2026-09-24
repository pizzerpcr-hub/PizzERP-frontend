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

const leerRespuesta = async (response) => {
    return response.json().catch(() => ({}));
};

const obtenerMensajeError = (data, mensajePredeterminado) => {
    const primerError = data.errors
        ? Object.values(data.errors).flat()[0]
        : null;

    return primerError || data.message || mensajePredeterminado;
};

const solicitarCsrf = async () => {
    const response = await fetch("/sanctum/csrf-cookie", {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("No fue posible iniciar la conexión segura.");
    }

    return obtenerCookie("XSRF-TOKEN");
};

const enviarMutacion = async (
    ruta,
    metodo,
    datos,
    mensajePredeterminado
) => {
    const xsrfToken = await solicitarCsrf();
    const response = await fetch(ruta, {
        method: metodo,
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify(datos),
    });
    const data = await leerRespuesta(response);

    if (!response.ok) {
        throw new Error(
            obtenerMensajeError(data, mensajePredeterminado)
        );
    }

    return data;
};

export const registrarUsuario = async (usuarioNuevo) => {
    return enviarMutacion(
        "/api/users",
        "POST",
        usuarioNuevo,
        "Error al registrar el usuario."
    );
};

export const actualizarUsuario = async (id, datos) => {
    return enviarMutacion(
        `/api/users/${id}`,
        "PATCH",
        datos,
        "Error al actualizar el usuario."
    );
};

export const cambiarEstadoUsuario = async (id, estado) => {
    return enviarMutacion(
        `/api/users/${id}/estado`,
        "PATCH",
        { estado },
        "Error al cambiar el estado del usuario."
    );
};

export const obtenerUsuarios = async (signal) => {
    const response = await fetch("/api/users", {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
        signal,
    });
    const data = await leerRespuesta(response);

    if (!response.ok) {
        throw new Error(
            obtenerMensajeError(
                data,
                "Error al obtener los usuarios."
            )
        );
    }

    return Array.isArray(data.usuarios) ? data.usuarios : [];
};
