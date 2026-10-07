import { useCallback, useEffect, useSyncExternalStore } from "react";
import { guardarPagina, leerPagina, suscribirLista, puedeConsultarLista } from "../services/listasSesion.js";
import { obtenerPaginaTabla, rutaPaginaTabla } from "../services/catalogoService.js";
import { useListaSesion } from "./useListaSesion.js";

const PAGINA_INICIAL = { pagina: 1, totalPaginas: 1, totalElementos: 0, inicio: 0, fin: 0 };

export function useTablaPaginada(ruta, clave, busqueda, habilitado = true) {
    const leer = useCallback(() => leerPagina(ruta, busqueda), [ruta, busqueda]);
    const pagina = useSyncExternalStore(
        useCallback(callback => suscribirLista(ruta, callback), [ruta]),
        leer, leer,
    );
    const consulta = rutaPaginaTabla(ruta, pagina, busqueda);
    const consultar = useCallback((signal, opciones) =>
        obtenerPaginaTabla(ruta, clave, pagina, busqueda, signal, opciones), [ruta, clave, pagina, busqueda]);
    const lista = useListaSesion(consulta, consultar, { habilitado });
    const contenido = lista.disponible ? lista.datos : null;
    const paginacion = contenido?.paginacion ?? PAGINA_INICIAL;
    const cambiarPagina = useCallback(nueva => guardarPagina(ruta, busqueda, nueva), [ruta, busqueda]);

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
        paginacion: { ...paginacion, pagina, cambiarPagina },
    };
}
