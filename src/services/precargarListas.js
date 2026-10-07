import { obtenerRutaInicio } from "../constants/roles.js";
import { obtenerCategoriasParaProducto, obtenerIngredientesParaProducto, obtenerPaginaTabla, rutaPaginaTabla } from "./catalogoService.js";
import { obtenerRolesAsignables, obtenerProductosParaCombo } from "./gestionesService.js";
import { iniciarPrecargaListas, identidadListasSesion, puedeConsultarLista, esListaVisible, esperarListasVisibles, leerPagina, leerBusqueda } from "./listasSesion.js";
import { esperarAccionesLista } from "./listasSesion.js";

const grupos = {
    usuarios: [["/api/users/roles", obtenerRolesAsignables]],
    roles: [],
    categorias: [],
    productos: [["/api/products/categorias", obtenerCategoriasParaProducto],
        ["/api/products/ingredientes", obtenerIngredientesParaProducto]],
    ingredientes: [],
    combos: [["/api/combos/productos", obtenerProductosParaCombo]],
};
const tablas = {
    usuarios: ["/api/users", "usuarios"], roles: ["/api/roles", "roles"],
    categorias: ["/api/categories", "categorias"], productos: ["/api/products", "productos"],
    ingredientes: ["/api/ingredients", "ingredientes"], combos: ["/api/combos", "combos"],
};
const tareasAutorizadas = seccion => Object.fromEntries(Object.entries(tablas).map(([modulo, [ruta, clave]]) => {
    const busqueda = modulo === seccion ? leerBusqueda(ruta) : "";
    const pagina = modulo === seccion ? leerPagina(ruta, busqueda) : 1;
    return [modulo, [[rutaPaginaTabla(ruta, pagina, busqueda), (signal, opciones) =>
        obtenerPaginaTabla(ruta, clave, pagina, busqueda, signal, opciones)], ...grupos[modulo]]];
}));

// No espera al render del panel. Comparte los GET de los servicios habituales.
export async function precargarListas(usuario, ruta, catalogos) {
    if (!iniciarPrecargaListas()) return;
    const sesion = identidadListasSesion();
    const solicitada = ruta?.split("/")[2];
    const seccion = solicitada === "promociones" ? "combos" : solicitada;
    catalogos ??= tareasAutorizadas(seccion ?? obtenerRutaInicio(usuario)?.split("/")[2]);
    const inicial = catalogos[seccion] ? seccion : obtenerRutaInicio(usuario)?.split("/")[2];
    const cargar = async ([recurso, consultar]) => {
        if (sesion !== identidadListasSesion() || !puedeConsultarLista(recurso)) return;
        try { await consultar(undefined, { forzar: false }); }
        catch { /* El snapshot expone el error y permite reintentar desde la página. */ }
    };
    await Promise.all((catalogos[inicial] ?? []).map(cargar));
    const cola = Object.entries(catalogos).filter(([nombre]) => nombre !== inicial).flatMap(([, tareas]) => tareas);
    while (cola.length && sesion === identidadListasSesion()) {
        await esperarAccionesLista();
        await esperarListasVisibles();
        if (sesion !== identidadListasSesion()) return;
        const prioritaria = cola.findIndex(([recurso]) => esListaVisible(recurso));
        await cargar(cola.splice(prioritaria < 0 ? 0 : prioritaria, 1)[0]);
    }
}
