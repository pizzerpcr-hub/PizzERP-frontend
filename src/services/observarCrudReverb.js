import { puede } from "../constants/roles.js";
import { identidadListasSesion, invalidarAvisoCrud, publicarAvisosCrud } from "./listasSesion.js";

const modulos = ["usuarios", "roles", "categorias", "productos", "ingredientes", "combos"];

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
            if (rutas.size && timer === null) timer = programar(publicar, 200);
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
    return () => {
        sincronizador.detener();
        for (const nombre of canales) echo.leave(nombre);
    };
}
