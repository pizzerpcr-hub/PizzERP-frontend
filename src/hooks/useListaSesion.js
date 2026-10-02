import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "../context/useAuth.js";
import {
    actualizarLista, guardarBusqueda, leerBusqueda, leerLista, listaDesactualizada,
    suscribirLista, VIGENCIA_LISTAS_MS, puedeConsultarLista,
} from "../services/listasSesion.js";

export function useListaSesion(ruta, consultar, { habilitado = true, pausado = false } = {}) {
    const { verificarAcceso } = useAuth();
    const montado = useRef(true);
    useEffect(() => {
        montado.current = true;
        return () => { montado.current = false; };
    }, []);
    const vigente = useCallback(() => montado.current && puedeConsultarLista(ruta), [ruta]);
    const snapshot = useSyncExternalStore(
        useCallback((callback) => suscribirLista(ruta, callback), [ruta]),
        useCallback(() => leerLista(ruta), [ruta]),
    );
    const recargar = useCallback((forzar = true) => consultar(undefined, { forzar }), [consultar]);
    useEffect(() => {
        if (!habilitado || !puedeConsultarLista(ruta) || pausado || snapshot.pendientes.length || snapshot.consultando || snapshot.error || !listaDesactualizada(snapshot)) return;
        void recargar(false).catch(() => {});
    }, [habilitado, pausado, snapshot, recargar, ruta]);

    useEffect(() => {
        if (!habilitado) return undefined;
        let detenido = false;
        let pendiente = false;
        const revisar = async (forzar = false) => {
            if (detenido || pendiente || pausado || document.visibilityState === "hidden") return;
            pendiente = true;
            try {
                // No reutilizamos permisos cacheados para autorizar una petición de fondo.
                const vigente = await verificarAcceso?.();
                if (!detenido && vigente && (forzar || listaDesactualizada(leerLista(ruta)))) await recargar(forzar);
            } catch { /* El snapshot conserva datos y expone el error de GET para reintentar. */ }
            finally { pendiente = false; }
        };
        const alFoco = () => void revisar();
        const alReconectar = () => void revisar(true);
        const timer = window.setInterval(alReconectar, VIGENCIA_LISTAS_MS);
        window.addEventListener("focus", alFoco);
        window.addEventListener("online", alReconectar);
        document.addEventListener("visibilitychange", alFoco);
        return () => {
            detenido = true;
            window.clearInterval(timer);
            window.removeEventListener("focus", alFoco);
            window.removeEventListener("online", alReconectar);
            document.removeEventListener("visibilitychange", alFoco);
        };
    }, [habilitado, pausado, verificarAcceso, ruta, recargar]);
    return {
        vigente,
        pendientes: new Set(snapshot.pendientes),
        datos: habilitado ? snapshot.datos ?? [] : [],
        disponible: habilitado && snapshot.datos !== undefined,
        cargando: habilitado && snapshot.datos === undefined && !snapshot.error,
        error: habilitado ? snapshot.error?.message ?? "" : "",
        consultando: snapshot.consultando,
        recargar,
        setDatos: useCallback((datos) => actualizarLista(ruta, datos), [ruta]),
    };
}

export function useBusquedaLista(ruta) {
    const [busqueda, setBusqueda] = useState(() => leerBusqueda(ruta));
    const cambiar = (texto) => {
        guardarBusqueda(ruta, texto);
        setBusqueda(texto);
    };
    return [busqueda, cambiar];
}
