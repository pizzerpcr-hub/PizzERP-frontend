import { puede } from "../constants/roles.js";
import { identidadListasSesion, invalidarAvisoCrud, publicarAvisosCrud } from "./listasSesion.js";

const modulos = ["usuarios", "roles", "categorias", "productos", "ingredientes", "combos"];
const conexionesEstablecidas = new WeakSet();

export function crearSincronizadorCrud({ programar = setTimeout, cancelar = clearTimeout } = {}) {
    const identidad = identidadListasSesion();
    const rutas = new Set();
    let timer = null, detenido = false;
    const publicar = () => {
        timer = null;
        if (detenido || identidad !== identidadListasSesion()) return;
        publicarAvisosCrud(rutas);
        rutas.clear();
    };
    return {
        recibir: evento => {
            if (detenido || identidad !== identidadListasSesion()
                || !modulos.includes(evento?.modulo)
                || !["created", "updated", "deleted", "status"].includes(evento?.accion)) return;
            for (const ruta of invalidarAvisoCrud(evento.modulo)) rutas.add(ruta);
            if (rutas.size && timer === null) timer = programar(publicar, 50);
        },
        detener: () => {
            detenido = true;
            if (timer !== null) cancelar(timer);
            if (identidad === identidadListasSesion()) publicarAvisosCrud(rutas);
            rutas.clear();
        },
    };
}

export function observarCrudReverb({ echo, usuario, temporizadores }) {
    if (!echo || !usuario?.id_usuario || usuario.estado !== "ACTIVO") return () => {};
    const sincronizador = crearSincronizadorCrud(temporizadores);
    const canales = modulos.filter(modulo => puede(usuario, modulo, "ver"))
        .map(modulo => `crud.usuario.${usuario.id_usuario}.${modulo}`);
    for (const nombre of canales) echo.private(nombre).listen(".crud.changed", sincronizador.recibir);
    const conexion = echo.connector?.pusher?.connection;
    if (conexion?.state === "connected") conexionesEstablecidas.add(conexion);
    const conectado = () => {
        const primera = !conexionesEstablecidas.has(conexion);
        conexionesEstablecidas.add(conexion);
        if (primera) return;
        // Recupera avisos perdidos: visibles se reconcilian y ocultas quedan invalidadas.
        for (const modulo of modulos) {
            if (puede(usuario, modulo, "ver")) sincronizador.recibir({ modulo, accion: "updated" });
        }
    };
    conexion?.bind("connected", conectado);
    return () => {
        conexion?.unbind("connected", conectado);
        sincronizador.detener();
        for (const nombre of canales) echo.leave(nombre);
    };
}
