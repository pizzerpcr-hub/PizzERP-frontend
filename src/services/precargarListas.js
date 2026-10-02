import { obtenerRutaInicio } from "../constants/roles.js";
import { obtenerUsuarios } from "./usuariosService.js";
import { obtenerCategorias, obtenerCategoriasParaProducto, obtenerProductos } from "./catalogoService.js";
import { obtenerIngredientes } from "./ingredientesService.js";
import { obtenerRoles, obtenerRolesAsignables, obtenerCombos, obtenerProductosParaCombo } from "./gestionesService.js";
import { iniciarPrecargaListas, identidadListasSesion, puedeConsultarLista } from "./listasSesion.js";

const grupos = {
    usuarios: [["/api/users", obtenerUsuarios], ["/api/users/roles", obtenerRolesAsignables]],
    roles: [["/api/roles", obtenerRoles]],
    categorias: [["/api/categories", obtenerCategorias]],
    productos: [["/api/products", obtenerProductos], ["/api/products/categorias", obtenerCategoriasParaProducto]],
    ingredientes: [["/api/ingredients", obtenerIngredientes]],
    combos: [["/api/combos", obtenerCombos], ["/api/combos/productos", obtenerProductosParaCombo]],
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
    const trabajador = async () => {
        while (cola.length && sesion === identidadListasSesion()) await cargar(cola.shift());
    };
    await Promise.all([trabajador(), trabajador()]);
}
