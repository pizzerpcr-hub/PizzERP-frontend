import { obtenerRutaInicio } from "../constants/roles.js";
import { obtenerCategoriasParaProducto, obtenerIngredientesParaProducto } from "./catalogoService.js";
import { obtenerRolesAsignables, obtenerProductosParaCombo } from "./gestionesService.js";
import { iniciarPrecargaListas, identidadListasSesion, puedeConsultarLista, esListaVisible, esperarListasVisibles } from "./listasSesion.js";

const grupos = {
    usuarios: [["/api/users/roles", obtenerRolesAsignables]],
    roles: [],
    categorias: [],
    productos: [["/api/products/categorias", obtenerCategoriasParaProducto],
        ["/api/products/ingredientes", obtenerIngredientesParaProducto]],
    ingredientes: [],
    combos: [["/api/combos/productos", obtenerProductosParaCombo]],
};

// No espera al render del panel. Comparte los GET de los servicios habituales.
export async function precargarListas(usuario, ruta, catalogos = grupos) {
    if (!iniciarPrecargaListas()) return;
    const sesion = identidadListasSesion();
    const seccion = ruta?.split("/")[2];
    const inicial = catalogos[seccion] ? seccion : obtenerRutaInicio(usuario)?.split("/")[2];
    const cargar = async ([recurso, consultar]) => {
        if (sesion !== identidadListasSesion() || !puedeConsultarLista(recurso)) return;
        try { await consultar(undefined, { forzar: false }); }
        catch { /* El snapshot expone el error y permite reintentar desde la página. */ }
    };
    await Promise.all((catalogos[inicial] ?? []).map(cargar));
    const cola = Object.entries(catalogos).filter(([nombre]) => nombre !== inicial).flatMap(([, tareas]) => tareas);
    while (cola.length && sesion === identidadListasSesion()) {
        await esperarListasVisibles();
        if (sesion !== identidadListasSesion()) return;
        const prioritaria = cola.findIndex(([recurso]) => esListaVisible(recurso));
        await cargar(cola.splice(prioritaria < 0 ? 0 : prioritaria, 1)[0]);
    }
}
