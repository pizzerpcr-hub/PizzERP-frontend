import { useCallback, useEffect, useRef, useState } from "react";
import { VIGENCIA_LISTAS_MS } from "../services/listasSesion.js";
import { obtenerPaginaTabla } from "../services/catalogoService.js";

const PAGINA_INICIAL = { pagina: 1, totalPaginas: 1, totalElementos: 0, inicio: 0, fin: 0 };

export function useTablaPaginada(ruta, clave, busqueda, habilitado = true) {
    const [seleccion, setSeleccion] = useState({ busqueda, pagina: 1 });
    const [resultado, setResultado] = useState({ claveVista: null, claveConsulta: null, datos: [], paginacion: PAGINA_INICIAL, error: "" });
    const [revision, setRevision] = useState(0);
    const ultimaCarga = useRef(0);

    if (seleccion.busqueda !== busqueda) {
        setSeleccion({ busqueda, pagina: 1 });
    }

    const pagina = seleccion.busqueda === busqueda ? seleccion.pagina : 1;
    const claveVista = JSON.stringify([ruta, clave, busqueda, pagina]);
    const claveConsulta = JSON.stringify([claveVista, revision]);
    const cargando = habilitado && resultado.claveConsulta !== claveConsulta;
    const recargar = useCallback(async () => setRevision((actual) => actual + 1), []);
    const cambiarPagina = useCallback((nuevaPagina) => {
        setSeleccion({ busqueda, pagina: nuevaPagina });
    }, [busqueda]);

    useEffect(() => {
        if (!habilitado) return undefined;
        const controller = new AbortController();
        ultimaCarga.current = Date.now();
        obtenerPaginaTabla(ruta, clave, pagina, busqueda, controller.signal).then((contenido) => {
            if (controller.signal.aborted) return;
            const paginaRecibida = contenido.paginacion ?? PAGINA_INICIAL;
            if (pagina > paginaRecibida.totalPaginas) {
                setSeleccion({ busqueda, pagina: paginaRecibida.totalPaginas });
                return;
            }
            setResultado({
                claveVista,
                claveConsulta,
                datos: contenido.datos,
                paginacion: paginaRecibida,
                error: "",
            });
            ultimaCarga.current = Date.now();
        }).catch((fallo) => {
            if (controller.signal.aborted) return;
            setResultado((anterior) => anterior.claveVista === claveVista
                ? { ...anterior, claveConsulta, error: fallo.message }
                : { claveVista, claveConsulta, datos: [], paginacion: PAGINA_INICIAL, error: fallo.message });
        });

        return () => controller.abort();
    }, [ruta, clave, busqueda, pagina, habilitado, claveConsulta, claveVista]);

    useEffect(() => {
        const alCambiarLista = (evento) => {
            if (evento.detail?.rutas?.includes(ruta)) void recargar();
        };
        window.addEventListener("pizzerp:list-changed", alCambiarLista);
        return () => window.removeEventListener("pizzerp:list-changed", alCambiarLista);
    }, [ruta, recargar]);

    useEffect(() => {
        if (!habilitado) return undefined;
        const actualizar = () => {
            if (document.visibilityState !== "hidden" && Date.now() - ultimaCarga.current >= VIGENCIA_LISTAS_MS) void recargar();
        };
        window.addEventListener("focus", actualizar);
        window.addEventListener("online", actualizar);
        document.addEventListener("visibilitychange", actualizar);
        return () => {
            window.removeEventListener("focus", actualizar);
            window.removeEventListener("online", actualizar);
            document.removeEventListener("visibilitychange", actualizar);
        };
    }, [habilitado, recargar]);

    return {
        datos: !habilitado || cargando ? [] : resultado.datos,
        cargando,
        error: !habilitado || cargando ? "" : resultado.error,
        recargar,
        paginacion: { ...(!habilitado || cargando ? PAGINA_INICIAL : resultado.paginacion), pagina, cambiarPagina },
    };
}
