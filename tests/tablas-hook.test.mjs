import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, cache, servicio, useTabla, fetchAnterior;
before(async () => {
    server = await createServer({ configFile: false, envDir: false, cacheDir: "node_modules/.vite-tablas-hook-test", server: { middlewareMode: true, ws: false } });
    cache = await server.ssrLoadModule("/src/services/listasSesion.js");
    servicio = await server.ssrLoadModule("/src/services/catalogoService.js");
    useTabla = (await server.ssrLoadModule("/src/hooks/useTablaPaginada.js")).useTablaPaginada;
});
after(async () => { await server?.close(); });
const cuenta = { id_usuario: 1, estado: "ACTIVO", permisos: { productos: { ver: true } } };
beforeEach(() => { fetchAnterior = globalThis.fetch; cache.sincronizarListasSesion(null); cache.sincronizarListasSesion(cuenta); });
afterEach(() => { globalThis.fetch = fetchAnterior; cache.sincronizarListasSesion(null); });
const render = () => {
    let resultado;
    function Vista() {
        resultado = useTabla("/api/products", "productos", cache.leerBusqueda("/api/products"));
        return createElement("span", null, resultado.datos[0]?.nombre ?? "Sin filas");
    }
    renderToStaticMarkup(createElement(Vista));
    return resultado;
};

test("render inicial y regreso usan snapshot compartido: página/búsqueda intactas, sin cargador ni GET", async () => {
    let llamadas = 0;
    globalThis.fetch = async () => {
        llamadas++;
        return Response.json({ productos: [{ nombre: "Pizza" }], paginacion: { pagina: 2, totalPaginas: 3, totalElementos: 21 } });
    };
    cache.guardarBusqueda("/api/products", "pizza"); cache.guardarPagina("/api/products", "pizza", 2);
    await servicio.obtenerPaginaTabla("/api/products", "productos", 2, "pizza");
    for (let vuelta = 0; vuelta < 2; vuelta++) {
        const tabla = render();
        assert.equal(tabla.cargando, false); assert.equal(tabla.datos[0].nombre, "Pizza");
        assert.equal(tabla.paginacion.pagina, 2); assert.equal(tabla.paginacion.totalElementos, 21);
    }
    assert.equal(llamadas, 1);
});

test("refresco pendiente/error no vacía filas; error inicial termina el cargador y permite reintentar", async () => {
    assert.equal(render().cargando, true);
    globalThis.fetch = async () => { throw new TypeError("Sin conexión"); };
    await assert.rejects(servicio.obtenerPaginaTabla("/api/products", "productos", 1, ""));
    assert.equal(render().cargando, false); assert.match(render().error, /Sin conexión/);
    globalThis.fetch = async () => Response.json({ productos: [{ nombre: "Anterior" }], paginacion: { pagina: 1, totalPaginas: 1, totalElementos: 1 } });
    await render().recargar();
    let terminar;
    globalThis.fetch = () => new Promise(resolve => { terminar = resolve; });
    const recarga = render().recargar(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(render().consultando, true); assert.equal(render().cargando, false);
    assert.equal(render().datos[0].nombre, "Anterior");
    terminar(new Response("{}", { status: 503 })); await assert.rejects(recarga);
    assert.equal(render().datos[0].nombre, "Anterior"); assert.equal(render().cargando, false);
});
