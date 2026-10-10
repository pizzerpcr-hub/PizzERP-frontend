import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { guardarPagina, leerPagina, suscribirLista, puedeConsultarLista } from "../services/listasSesion.js";
import { obtenerPaginaTabla, rutaPaginaTabla } from "../services/catalogoService.js";
import { useListaSesion } from "./useListaSesion.js";

const PAGINA_INICIAL = { pagina: 1, totalPaginas: 1, totalElementos: 0, inicio: 0, fin: 0 };

export function useTablaPaginada(ruta, clave, busqueda, habilitado = true) {
    const [orden, setOrden] = useState({ campo: "", direccion: "asc" });
    const parametros = useMemo(() => orden.campo
        ? { sort: orden.campo, direction: orden.direccion } : {}, [orden]);
    const leer = useCallback(() => leerPagina(ruta, busqueda), [ruta, busqueda]);
    const pagina = useSyncExternalStore(
        useCallback(callback => suscribirLista(ruta, callback), [ruta]),
        leer, leer,
    );
    const consulta = rutaPaginaTabla(ruta, pagina, busqueda, parametros);
    const consultar = useCallback((signal, opciones) =>
        obtenerPaginaTabla(ruta, clave, pagina, busqueda, signal, { ...opciones, parametros }),
    [ruta, clave, pagina, busqueda, parametros]);
    const lista = useListaSesion(consulta, consultar, { habilitado });
    const contenido = lista.disponible ? lista.datos : null;
    const paginacion = contenido?.paginacion ?? PAGINA_INICIAL;
    const cambiarPagina = useCallback(nueva => guardarPagina(ruta, busqueda, nueva), [ruta, busqueda]);
    const cambiarOrden = useCallback((campo, direccionInicial = "asc") => {
        setOrden(actual => ({ campo, direccion: actual.campo === campo
            ? actual.direccion === "asc" ? "desc" : "asc" : direccionInicial }));
        guardarPagina(ruta, busqueda, 1);
    }, [ruta, busqueda]);
    const establecerOrden = useCallback((campo, direccion) => {
        setOrden({ campo, direccion });
        guardarPagina(ruta, busqueda, 1);
    }, [ruta, busqueda]);

    useEffect(() => {
        if (habilitado && contenido && pagina > Math.max(1, paginacion.totalPaginas)) {
            cambiarPagina(Math.max(1, paginacion.totalPaginas));
        }
    }, [habilitado, contenido, pagina, paginacion.totalPaginas, cambiarPagina]);

    // AuthContext comparte los eventos de foco, visibilidad y reconexión con el resto de listas.
    // useListaSesion se suscribe a cada variante y agrupa las invalidaciones de Reverb.
    const recargar = useCallback((forzar = true) => {
        if (!puedeConsultarLista(consulta)) return Promise.resolve();
        return consultar(undefined, { forzar });
    }, [consulta, consultar]);

    return {
        datos: contenido?.datos ?? [],
        cargando: lista.cargando,
        consultando: lista.consultando,
        error: lista.error,
        recargar,
        orden,
        cambiarOrden,
        establecerOrden,
        paginacion: { ...paginacion, pagina, cambiarPagina },
    };
}
