import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
    actualizarLista, guardarBusqueda, leerBusqueda, leerLista, listaDesactualizada,
    suscribirLista, puedeConsultarLista, registrarListaVisible,
} from "../services/listasSesion.js";

export function useListaSesion(ruta, consultar, { habilitado = true, pausado = false } = {}) {
    const montado = useRef(true);
    useEffect(() => {
        montado.current = true;
        return () => { montado.current = false; };
    }, []);
    const vigente = useCallback(() => montado.current && puedeConsultarLista(ruta), [ruta]);
    const leerSnapshot = useCallback(() => leerLista(ruta), [ruta]);
    const snapshot = useSyncExternalStore(
        useCallback((callback) => suscribirLista(ruta, callback), [ruta]),
        leerSnapshot, leerSnapshot,
    );
    const recargar = useCallback((forzar = true) => consultar(undefined, { forzar }), [consultar]);
    useEffect(() => habilitado ? registrarListaVisible(ruta) : undefined, [habilitado, ruta]);
    useEffect(() => {
        if (!habilitado || !puedeConsultarLista(ruta) || pausado || document.visibilityState === "hidden" || snapshot.refrescoPendiente || snapshot.pendientes.length || snapshot.consultando || snapshot.error || !listaDesactualizada(snapshot)) return;
        void recargar(false).catch(() => {});
    }, [habilitado, pausado, snapshot, recargar, ruta]);

    useEffect(() => {
        if (!habilitado) return undefined;
        let detenido = false;
        let pendiente = false;
        const revisar = async () => {
            if (detenido || pendiente || pausado || document.visibilityState === "hidden") return;
            pendiente = true;
            try {
                // AuthContext es el único observador de sesión. Laravel autoriza cada GET.
                if (!detenido && puedeConsultarLista(ruta) && !leerLista(ruta).refrescoPendiente && listaDesactualizada(leerLista(ruta))) await recargar(false);
            } catch { /* El snapshot conserva datos y expone el error de GET para reintentar. */ }
            finally { pendiente = false; }
        };
        // Una revisión de acceso no invalida listas; Reverb administra sus cambios y reconexiones.
        const trasVerificacion = () => void revisar();
        window.addEventListener("pizzerp:session-verified", trasVerificacion);
        return () => {
            detenido = true;
            window.removeEventListener("pizzerp:session-verified", trasVerificacion);
        };
    }, [habilitado, pausado, ruta, recargar]);
    return {
        vigente,
        pendientes: new Set(snapshot.pendientes),
        datos: habilitado ? snapshot.datos ?? [] : [],
        disponible: habilitado && snapshot.datos !== undefined,
        cargaCompleta: habilitado && snapshot.datos !== undefined && !snapshot.consultando
            && !snapshot.refrescoPendiente && !snapshot.pendientes.length && !snapshot.error
            && !listaDesactualizada(snapshot),
        cargando: habilitado && snapshot.datos === undefined && !snapshot.error,
        error: habilitado ? snapshot.error?.message ?? "" : "",
        consultando: snapshot.consultando,
        recargar,
        setDatos: useCallback((datos) => actualizarLista(ruta, datos), [ruta]),
    };
}

export function useBusquedaLista(ruta) {
    const leer = useCallback(() => leerBusqueda(ruta), [ruta]);
    const busqueda = useSyncExternalStore(
        useCallback(callback => suscribirLista(ruta, callback), [ruta]),
        leer, leer,
    );
    const cambiar = texto => guardarBusqueda(ruta, texto);
    return [busqueda, cambiar];
}
