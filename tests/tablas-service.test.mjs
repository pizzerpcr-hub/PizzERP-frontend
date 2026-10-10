import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { obtenerPaginaTabla } from "../src/services/catalogoService.js";
import { sincronizarListasSesion } from "../src/services/listasSesion.js";
beforeEach(() => sincronizarListasSesion({ id_usuario: 1, estado: "ACTIVO", permisos: { productos: { ver: true } } }));
afterEach(() => sincronizarListasSesion(null));

test("la consulta de tabla solicita la página y búsqueda al servidor", async () => {
    const fetchAnterior = globalThis.fetch;
    let solicitud;
    globalThis.fetch = async (ruta, opciones) => {
        solicitud = { ruta, opciones };
        return new Response(JSON.stringify({
            productos: [{ id_producto: 11, nombre: "Pizza" }],
            paginacion: { pagina: 2, totalPaginas: 3, totalElementos: 21, inicio: 11, fin: 20 },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    try {
        const controller = new AbortController();
        const resultado = await obtenerPaginaTabla("/api/products", "productos", 2, " pizza ", controller.signal);

        assert.equal(solicitud.ruta, "/api/products?page=2&search=pizza");
        assert.equal(solicitud.opciones.credentials, "include");
        assert.ok(solicitud.opciones.signal instanceof AbortSignal);
        assert.notEqual(solicitud.opciones.signal, controller.signal);
        assert.deepEqual(resultado.datos, [{ id_producto: 11, nombre: "Pizza" }]);
        assert.equal(resultado.paginacion.totalElementos, 21);
    } finally {
        globalThis.fetch = fetchAnterior;
    }
});

test("la consulta solicita el orden de precio para toda la página", async () => {
    const fetchAnterior = globalThis.fetch;
    let rutaSolicitada;
    globalThis.fetch = async ruta => {
        rutaSolicitada = ruta;
        return Response.json({ productos: [], paginacion: { pagina: 1, totalPaginas: 1, totalElementos: 0 } });
    };

    try {
        await obtenerPaginaTabla("/api/products", "productos", 1, "pizza", undefined,
            { parametros: { sort: "precio", direction: "desc" } });
        assert.equal(rutaSolicitada, "/api/products?direction=desc&page=1&search=pizza&sort=precio");
    } finally {
        globalThis.fetch = fetchAnterior;
    }
});

test("la consulta de tabla conserva el error de validación del servidor", async () => {
    const fetchAnterior = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ errors: { page: ["Página inválida."] } }), {
        status: 422, headers: { "Content-Type": "application/json" },
    });

    try {
        await assert.rejects(obtenerPaginaTabla("/api/products", "productos", 0, "", undefined),
            { message: "Página inválida.", status: 422 });
    } finally {
        globalThis.fetch = fetchAnterior;
    }
});
