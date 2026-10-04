let obtenerSocket = () => null;

export const configurarSocketReverb = obtener => { obtenerSocket = obtener; };
export const cabecerasSocketReverb = () => {
    const id = obtenerSocket();
    return id ? { "X-Socket-ID": id } : {};
};
