import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { obtenerPaginaTabla, rutaPaginaTabla } from "../src/services/catalogoService.js";
import {
    sincronizarListasSesion, leerLista, guardarBusqueda, leerBusqueda, guardarPagina, leerPagina,
    invalidarLista, invalidarAvisoCrud, publicarAvisosCrud, confirmarLista, versionListasSesion,
    suscribirLista, listaDesactualizada,
} from "../src/services/listasSesion.js";
import { crearSincronizadorCrud } from "../src/services/observarCrudReverb.js";
import { precargarListas } from "../src/services/precargarListas.js";

const modulos = { users: "usuarios", roles: "roles", categories: "categorias", products: "productos", ingredients: "ingredientes", combos: "combos" };
const cuenta = { id_usuario: 1, estado: "ACTIVO", permisos: Object.fromEntries(Object.values(modulos).map(modulo => [modulo, { ver: true, crear: true, editar: true }])) };
const tick = () => new Promise(resolve => setImmediate(resolve));
const contenido = (clave, datos = [], total = 21) => ({ [clave]: datos, paginacion: { pagina: 2, totalPaginas: 3, totalElementos: total, inicio: 11, fin: 20 } });
let fetchAnterior, windowAnterior;
beforeEach(() => {
    fetchAnterior = globalThis.fetch; windowAnterior = globalThis.window;
    globalThis.window = new EventTarget();
    sincronizarListasSesion(null); sincronizarListasSesion(cuenta);
});
afterEach(() => { globalThis.fetch = fetchAnterior; globalThis.window = windowAnterior; sincronizarListasSesion(null); });

for (const recurso of ["products", "combos"]) test(`${recurso}: filtro de precio comparte GET, conserva navegación y se reconcilia por eventos y guardado`, async () => {
    const ruta = `/api/${recurso}`, clave = modulos[recurso], filtro = " ₡3 500,00 ";
    const llamadas = [];
    globalThis.fetch = async url => { llamadas.push(url); return Response.json(contenido(clave, [{ precio: "3500.00" }], 13)); };
    guardarBusqueda(ruta, "2000"); guardarPagina(ruta, "2000", 3);
    guardarBusqueda(ruta, filtro); assert.equal(leerPagina(ruta), 1);
    const [a, b] = await Promise.all([
        obtenerPaginaTabla(ruta, clave, 1, filtro), obtenerPaginaTabla(ruta, clave, 1, filtro.trim()),
    ]);
    assert.equal(a, b); assert.equal(llamadas.length, 1);
    assert.equal(new URL(llamadas[0], "http://localhost").searchParams.get("search"), filtro.trim());
    guardarPagina(ruta, filtro, 2);
    await obtenerPaginaTabla(ruta, clave, leerPagina(ruta), leerBusqueda(ruta));
    await obtenerPaginaTabla(ruta, clave, leerPagina(ruta), leerBusqueda(ruta));
    assert.equal(llamadas.length, 2);
    publicarAvisosCrud(invalidarAvisoCrud(clave));
    await obtenerPaginaTabla(ruta, clave, leerPagina(ruta), leerBusqueda(ruta));
    assert.equal(llamadas.length, 3);
    confirmarLista(`${ruta}/5`, "PATCH", {}, versionListasSesion());
    globalThis.fetch = async url => {
        llamadas.push(url); return Response.json(contenido(clave, [], 10));
    };
    const resultado = await obtenerPaginaTabla(ruta, clave, leerPagina(ruta), leerBusqueda(ruta));
    assert.equal(llamadas.length, 4); assert.equal(resultado.paginacion.totalElementos, 10);
    assert.deepEqual(resultado.datos, []);
    assert.equal(leerBusqueda(ruta), filtro); assert.equal(leerPagina(ruta), 2);
    guardarBusqueda(ruta, ""); assert.equal(leerPagina(ruta), 1);
});

for (const [recurso, clave] of Object.entries(modulos)) {
    test(`${recurso}: volver conserva búsqueda/página y consulta vigente sin otro GET`, async () => {
        const ruta = `/api/${recurso}`;
        let llamadas = 0;
        globalThis.fetch = async () => { llamadas++; return Response.json(contenido(clave, [{ nombre: "Dato" }])); };
        guardarBusqueda(ruta, " dato "); guardarPagina(ruta, " dato ", 2);
        const primera = await obtenerPaginaTabla(ruta, clave, 2, leerBusqueda(ruta));
        const segunda = await obtenerPaginaTabla(ruta, clave, leerPagina(ruta), leerBusqueda(ruta));
        assert.equal(primera, segunda);
        assert.equal(llamadas, 1);
        assert.equal(leerPagina(ruta), 2);
        assert.equal(leerBusqueda(ruta), " dato ");
        guardarBusqueda(ruta, "otra"); assert.equal(leerPagina(ruta), 1);
        guardarPagina(ruta, "otra", 3);
        guardarBusqueda(ruta, ""); assert.equal(leerPagina(ruta), 1);
        const fechaAnterior = Date.now;
        Date.now = () => fechaAnterior() + 86400000;
        try {
            await obtenerPaginaTabla(ruta, clave, 2, " dato ");
            assert.equal(llamadas, 1, "el tiempo no invalida el listado");
        } finally { Date.now = fechaAnterior; }
    });

    test(`${recurso}: búsquedas rápidas comparten GET y respuestas antiguas no cambian la consulta visible`, async () => {
        const ruta = `/api/${recurso}`, pendientes = new Map(); let llamadas = 0;
        globalThis.fetch = url => { llamadas++; return new Promise(resolve => pendientes.set(url, resolve)); };
        guardarBusqueda(ruta, "ca");
        const vieja = obtenerPaginaTabla(ruta, clave, 1, "ca"); await tick();
        guardarBusqueda(ruta, "cafe");
        const nueva = obtenerPaginaTabla(ruta, clave, 1, "cafe");
        const compartida = obtenerPaginaTabla(ruta, clave, 1, " cafe "); await tick();
        assert.equal(llamadas, 2);
        pendientes.get(rutaPaginaTabla(ruta, 1, "cafe"))(Response.json(contenido(clave, [{ nombre: "Actual" }], 1)));
        assert.equal(await nueva, await compartida);
        pendientes.get(rutaPaginaTabla(ruta, 1, "ca"))(Response.json(contenido(clave, [{ nombre: "Anterior" }], 21)));
        await vieja;
        const visible = leerLista(rutaPaginaTabla(ruta, leerPagina(ruta), leerBusqueda(ruta)));
        assert.equal(visible.datos.datos[0].nombre, "Actual");
        assert.equal(visible.datos.paginacion.totalElementos, 1);
    });

    test(`${recurso}: eventos agrupados y cambio propio reconcilian el filtro; búsquedas ocultas quedan invalidadas`, async () => {
        const ruta = `/api/${recurso}`, visible = rutaPaginaTabla(ruta, 1, "cafe"), oculta = rutaPaginaTabla(ruta, 2, "otra");
        guardarBusqueda(ruta, "cafe");
        globalThis.fetch = async () => Response.json(contenido(clave, [{ nombre: "Inicial" }], 12));
        await obtenerPaginaTabla(ruta, clave, 1, "cafe");
        await obtenerPaginaTabla(ruta, clave, 2, "otra");
        let publicar, llamadas = 0;
        globalThis.fetch = async url => {
            llamadas++; assert.equal(url, visible);
            return Response.json(contenido(clave, [], 0));
        };
        const sincronizador = crearSincronizadorCrud({ programar: callback => { publicar = callback; return 1; }, cancelar: () => {} });
        const retirar = suscribirLista(visible, () => {
            const snapshot = leerLista(visible);
            if (!snapshot.consultando && !snapshot.refrescoPendiente && listaDesactualizada(snapshot)) {
                void obtenerPaginaTabla(ruta, clave, 1, "cafe");
            }
        });
        try {
            sincronizador.recibir({ modulo: clave, accion: "updated" });
            sincronizador.recibir({ modulo: clave, accion: "status" });
            publicar(); await tick(); await tick();
            assert.equal(llamadas, 1);
            assert.equal(leerLista(oculta).actualizado, 0);
            assert.equal(leerLista(visible).datos.paginacion.totalElementos, 0);
            confirmarLista(`${ruta}/5/estado`, "PATCH", {}, versionListasSesion());
            await tick(); await tick();
            await obtenerPaginaTabla(ruta, clave, 1, leerBusqueda(ruta));
            assert.equal(llamadas, 2);
            assert.equal(leerBusqueda(ruta), "cafe");
            assert.deepEqual(leerLista(visible).datos.datos, []);
        } finally { retirar(); sincronizador.detener(); }
    });
}

test("GET idénticos compartidos, cancelar consumidor no cancela red; páginas/filtros/catálogos distintos", async () => {
    const llamadas = []; let resolver;
    globalThis.fetch = (ruta, opciones) => {
        llamadas.push({ ruta, signal: opciones.signal });
        return new Promise(resolve => { resolver = () => resolve(Response.json(contenido("productos"))); });
    };
    const cancelar = new AbortController();
    const a = obtenerPaginaTabla("/api/products", "productos", 2, " pizza ", cancelar.signal);
    const rechazado = assert.rejects(a, { name: "AbortError" });
    const b = obtenerPaginaTabla("/api/products", "productos", 2, "pizza");
    await tick(); cancelar.abort(); await rechazado;
    assert.equal(llamadas.length, 1); assert.equal(llamadas[0].signal.aborted, false);
    resolver(); await b;
    globalThis.fetch = async ruta => { llamadas.push({ ruta }); return Response.json(contenido("productos")); };
    await obtenerPaginaTabla("/api/products", "productos", 1, "pizza");
    await obtenerPaginaTabla("/api/products", "productos", 2, "pizza", undefined, { parametros: { estado: "ACTIVO" } });
    assert.equal(llamadas.length, 3);
    assert.equal(leerLista("/api/products").datos, undefined);
    assert.equal(leerLista("/api/products/categorias").datos, undefined);
});

test("no vence a 60 segundos; invalidación conserva filas y totales durante refresh y error, admite reintento", async () => {
    const fechaAnterior = Date.now; let fecha = 100000, llamadas = 0, resolver;
    Date.now = () => fecha;
    try {
        globalThis.fetch = async () => { llamadas++; return Response.json(contenido("productos", [{ nombre: "Anterior" }])); };
        await obtenerPaginaTabla("/api/products", "productos", 2, "");
        fecha += 59999; await obtenerPaginaTabla("/api/products", "productos", 2, ""); assert.equal(llamadas, 1);
        fecha++;
        await obtenerPaginaTabla("/api/products", "productos", 2, ""); assert.equal(llamadas, 1);
        fecha += 86400000;
        await obtenerPaginaTabla("/api/products", "productos", 2, ""); assert.equal(llamadas, 1);
        invalidarLista("/api/products");
        globalThis.fetch = () => { llamadas++; return new Promise(resolve => { resolver = resolve; }); };
        const refresco = obtenerPaginaTabla("/api/products", "productos", 2, ""); await tick();
        const key = rutaPaginaTabla("/api/products", 2, "");
        assert.equal(leerLista(key).datos.datos[0].nombre, "Anterior"); assert.equal(leerLista(key).consultando, true);
        resolver(new Response("Error", { status: 503 })); await assert.rejects(refresco);
        assert.equal(leerLista(key).consultando, false); assert.equal(leerLista(key).datos.paginacion.totalElementos, 21);
        globalThis.fetch = async () => Response.json(contenido("productos", [{ nombre: "Nuevo" }], 12));
        await obtenerPaginaTabla("/api/products", "productos", 2, "", undefined, { forzar: true });
        assert.equal(leerLista(key).error, null); assert.equal(leerLista(key).datos.paginacion.totalElementos, 12);
    } finally { Date.now = fechaAnterior; }
});

test("CRUD invalida variantes/dependencias y rechaza GET anterior; nuevo aviso exige otra revisión", async () => {
    const keys = [rutaPaginaTabla("/api/products", 1, ""), rutaPaginaTabla("/api/products", 2, ""), rutaPaginaTabla("/api/combos", 1, "")];
    globalThis.fetch = async () => Response.json(contenido("productos", [{ nombre: "Inicial" }]));
    for (const pagina of [1, 2]) await obtenerPaginaTabla("/api/products", "productos", pagina, "");
    await obtenerPaginaTabla("/api/combos", "combos", 1, "");
    let terminar;
    globalThis.fetch = () => new Promise(resolve => { terminar = resolve; });
    const vieja = obtenerPaginaTabla("/api/products", "productos", 1, "", undefined, { forzar: true }); await tick();
    const invalidadas = invalidarAvisoCrud("productos");
    for (const key of keys) assert.ok(invalidadas.includes(key));
    publicarAvisosCrud(invalidadas);
    terminar(Response.json(contenido("productos", [{ nombre: "Obsoleto" }]))); await vieja;
    assert.equal(leerLista(keys[0]).datos.datos[0].nombre, "Inicial");
    assert.equal(leerLista(keys[0]).actualizado, 0);
    globalThis.fetch = async () => Response.json(contenido("productos", [{ nombre: "Remoto" }]));
    await obtenerPaginaTabla("/api/products", "productos", 1, "");
    assert.equal(leerLista(keys[0]).datos.datos[0].nombre, "Remoto");
    assert.equal(leerLista(keys[1]).actualizado, 0);
});

test("confirmación conserva fila pública y GET reconciliador devuelve totales exactos; rechazo no altera datos", async () => {
    globalThis.fetch = async () => Response.json(contenido("usuarios", [{ id_usuario: 5, nombre_completo: "Anterior", estado: "ACTIVO" }]));
    const key = rutaPaginaTabla("/api/users", 2, "");
    await obtenerPaginaTabla("/api/users", "usuarios", 2, "");
    confirmarLista("/api/users/5/estado", "PATCH", { usuario: { id_usuario: 5, nombre_completo: "Confirmado", estado: "INACTIVO", contrasena_hash: "NO" } }, versionListasSesion());
    assert.equal(leerLista(key).datos.datos[0].nombre_completo, "Confirmado");
    assert.equal("contrasena_hash" in leerLista(key).datos.datos[0], false);
    assert.equal(leerLista(key).actualizado, 0);
    globalThis.fetch = async () => Response.json(contenido("usuarios", [], 10));
    const lista = await obtenerPaginaTabla("/api/users", "usuarios", 2, "");
    assert.equal(lista.paginacion.totalElementos, 10); assert.deepEqual(lista.datos, []);
});

test("cambio de cuenta y revocación limpian selección y datos; 403 bloquea todas las variantes", async () => {
    guardarBusqueda("/api/products", "pizza"); guardarPagina("/api/products", "pizza", 2);
    globalThis.fetch = async () => Response.json(contenido("productos", [{ nombre: "Privado" }]));
    await obtenerPaginaTabla("/api/products", "productos", 2, "pizza");
    sincronizarListasSesion({ ...cuenta, id_usuario: 2 });
    assert.equal(leerPagina("/api/products"), 1); assert.equal(leerBusqueda("/api/products"), "");
    assert.equal(leerLista(rutaPaginaTabla("/api/products", 2, "pizza")).datos, undefined);
    await obtenerPaginaTabla("/api/products", "productos", 1, "");
    sincronizarListasSesion({ ...cuenta, id_usuario: 2, permisos: {} });
    await assert.rejects(obtenerPaginaTabla("/api/products", "productos", 1, ""), { name: "AbortError" });
    sincronizarListasSesion(cuenta);
    globalThis.fetch = async () => new Response("{}", { status: 403 });
    await assert.rejects(obtenerPaginaTabla("/api/products", "productos", 1, ""), { status: 403 });
    await assert.rejects(obtenerPaginaTabla("/api/products", "productos", 2, ""), { name: "AbortError" });
});

test("permiso conservado tras revisión aborta GET anterior sin que su finally cierre la nueva petición", async () => {
    let terminarVieja, terminarNueva;
    globalThis.fetch = () => new Promise(resolve => { terminarVieja = resolve; });
    const vieja = obtenerPaginaTabla("/api/products", "productos", 1, "");
    const rechazo = assert.rejects(vieja, { name: "AbortError" }); await tick();
    sincronizarListasSesion({ ...cuenta, rol: "RENOMBRADO" });
    globalThis.fetch = () => new Promise(resolve => { terminarNueva = resolve; });
    const nueva = obtenerPaginaTabla("/api/products", "productos", 1, ""); await tick();
    terminarVieja(Response.json(contenido("productos", [{ nombre: "Viejo" }]))); await rechazo;
    const key = rutaPaginaTabla("/api/products", 1, ""); assert.equal(leerLista(key).consultando, true);
    terminarNueva(Response.json(contenido("productos", [{ nombre: "Actual" }]))); await nueva;
    assert.equal(leerLista(key).consultando, false); assert.equal(leerLista(key).datos.datos[0].nombre, "Actual");
});

test("precarga y pantalla comparten página inicial; no consulta páginas extra ni módulos sin permiso", async () => {
    sincronizarListasSesion({ ...cuenta, permisos: { productos: { ver: true } } });
    let llamadas = 0;
    globalThis.fetch = async () => { llamadas++; return Response.json(contenido("productos")); };
    await Promise.all([precargarListas(cuenta, "/panel/productos"), obtenerPaginaTabla("/api/products", "productos", 1, "")]);
    assert.equal(llamadas, 1);
    invalidarLista("/api/products");
    await obtenerPaginaTabla("/api/products", "productos", 1, ""); assert.equal(llamadas, 2);
});

test("avisos agrupados refrescan solo la página visible y otro aviso durante GET genera seguimiento", async () => {
    const key = rutaPaginaTabla("/api/products", 2, "pizza");
    globalThis.fetch = async () => Response.json(contenido("productos", [{ nombre: "Inicial" }]));
    await obtenerPaginaTabla("/api/products", "productos", 1, "");
    await obtenerPaginaTabla("/api/products", "productos", 2, "pizza");
    let llamadas = 0, terminar, publicar;
    globalThis.fetch = () => { llamadas++; return new Promise(resolve => { terminar = resolve; }); };
    const sincronizador = crearSincronizadorCrud({ programar: callback => { publicar = callback; return 1; }, cancelar: () => {} });
    const retirar = suscribirLista(key, () => {
        const estado = leerLista(key);
        if (!estado.consultando && !estado.refrescoPendiente && !estado.error && listaDesactualizada(estado)) {
            void obtenerPaginaTabla("/api/products", "productos", 2, "pizza").catch(() => {});
        }
    });
    try {
        sincronizador.recibir({ modulo: "productos", accion: "updated" });
        sincronizador.recibir({ modulo: "productos", accion: "status" });
        assert.equal(llamadas, 0); publicar(); await tick(); assert.equal(llamadas, 1);
        sincronizador.recibir({ modulo: "productos", accion: "updated" }); publicar();
        terminar(Response.json(contenido("productos", [{ nombre: "Descartar" }]))); await tick();
        assert.equal(llamadas, 2); assert.equal(leerLista(key).datos.datos[0].nombre, "Inicial");
        terminar(Response.json(contenido("productos", [{ nombre: "Actual" }]))); await tick();
        assert.equal(llamadas, 2); assert.equal(leerLista(key).datos.datos[0].nombre, "Actual");
        assert.equal(leerLista(rutaPaginaTabla("/api/products", 1, "")).actualizado, 0);
    } finally { retirar(); sincronizador.detener(); }
});

test("GET inicial descartado por evento no deja consultando permanente y permite obtener la revisión nueva", async () => {
    let terminar;
    globalThis.fetch = () => new Promise(resolve => { terminar = resolve; });
    const vieja = obtenerPaginaTabla("/api/products", "productos", 1, "");
    const rechazo = assert.rejects(vieja, { name: "AbortError" }); await tick();
    publicarAvisosCrud(invalidarAvisoCrud("productos"));
    terminar(Response.json(contenido("productos", [{ nombre: "Viejo" }]))); await rechazo;
    const key = rutaPaginaTabla("/api/products", 1, "");
    assert.equal(leerLista(key).consultando, false); assert.equal(leerLista(key).error, null);
    globalThis.fetch = async () => Response.json(contenido("productos", [{ nombre: "Actual" }]));
    await obtenerPaginaTabla("/api/products", "productos", 1, "");
    assert.equal(leerLista(key).datos.datos[0].nombre, "Actual");
});

test("Productos: cambiar búsqueda y limpiarla vuelve a página uno; navegar reutiliza filas, filtro y página", async () => {
    const ruta = "/api/products", llamadas = [];
    globalThis.fetch = async url => {
        llamadas.push(url);
        const params = new URL(url, "http://localhost").searchParams;
        const pagina = Number(params.get("page"));
        const filtrado = params.get("search") !== "";
        return Response.json({ productos: [{ id_producto: filtrado ? 21 : 1, nombre: filtrado ? "Pizza Familiar" : "Producto" }],
            paginacion: { pagina, totalPaginas: filtrado ? 2 : 3, totalElementos: filtrado ? 12 : 23 } });
    };
    guardarBusqueda(ruta, "mediana"); guardarPagina(ruta, "mediana", 3);
    guardarBusqueda(ruta, " familiar ");
    assert.equal(leerPagina(ruta), 1);
    const datos = await obtenerPaginaTabla(ruta, "productos", leerPagina(ruta), leerBusqueda(ruta));
    assert.equal(datos.paginacion.totalElementos, 12);
    assert.equal(llamadas[0], "/api/products?page=1&search=familiar");
    guardarPagina(ruta, leerBusqueda(ruta), 2);
    await obtenerPaginaTabla(ruta, "productos", leerPagina(ruta), leerBusqueda(ruta));
    const antes = llamadas.length;
    await obtenerPaginaTabla(ruta, "productos", leerPagina(ruta), leerBusqueda(ruta));
    assert.equal(llamadas.length, antes);
    assert.equal(leerBusqueda(ruta), " familiar "); assert.equal(leerPagina(ruta), 2);
    guardarBusqueda(ruta, ""); assert.equal(leerPagina(ruta), 1);
    const completa = await obtenerPaginaTabla(ruta, "productos", leerPagina(ruta), leerBusqueda(ruta));
    assert.equal(completa.paginacion.totalElementos, 23);
    assert.equal(completa.paginacion.totalPaginas, 3);
});

test("Productos: escritura rápida comparte GET idénticos y una respuesta anterior no cambia el filtro visible", async () => {
    const ruta = "/api/products", respuestas = new Map(), llamadas = [];
    globalThis.fetch = url => {
        llamadas.push(url);
        return new Promise(resolve => respuestas.set(url, resolve));
    };
    guardarBusqueda(ruta, "per");
    const vieja = obtenerPaginaTabla(ruta, "productos", 1, leerBusqueda(ruta)); await tick();
    guardarBusqueda(ruta, "personal");
    const actual = obtenerPaginaTabla(ruta, "productos", 1, leerBusqueda(ruta));
    const compartida = obtenerPaginaTabla(ruta, "productos", 1, " personal "); await tick();
    assert.equal(llamadas.length, 2);
    respuestas.get(rutaPaginaTabla(ruta, 1, "personal"))(Response.json(contenido("productos", [{ nombre: "Actual" }], 1)));
    assert.equal(await actual, await compartida);
    respuestas.get(rutaPaginaTabla(ruta, 1, "per"))(Response.json(contenido("productos", [{ nombre: "Anterior" }], 20)));
    await vieja;
    assert.equal(leerBusqueda(ruta), "personal");
    const visible = leerLista(rutaPaginaTabla(ruta, leerPagina(ruta), leerBusqueda(ruta)));
    assert.equal(visible.datos.datos[0].nombre, "Actual");
    assert.equal(visible.datos.paginacion.totalElementos, 1);
});

for (const modulo of ["productos", "categorias"]) test(`Productos: evento de ${modulo} reconcilia el filtro visible e invalida búsquedas ocultas`, async () => {
    const ruta = "/api/products", visible = rutaPaginaTabla(ruta, 2, "personal"), oculta = rutaPaginaTabla(ruta, 1, "familiar");
    globalThis.fetch = async () => Response.json(contenido("productos", [{ id_producto: 21, nombre: "Antes" }], 12));
    await obtenerPaginaTabla(ruta, "productos", 2, "personal");
    await obtenerPaginaTabla(ruta, "productos", 1, "familiar");
    guardarBusqueda(ruta, "personal"); guardarPagina(ruta, "personal", 2);
    let publicar, llamadas = 0;
    globalThis.fetch = async url => {
        llamadas++; assert.equal(url, visible);
        return Response.json(contenido("productos", [{ id_producto: 22, nombre: "Resultado actualizado" }], 11));
    };
    const sincronizador = crearSincronizadorCrud({ programar: callback => { publicar = callback; return 1; }, cancelar: () => {} });
    const retirar = suscribirLista(visible, () => {
        const snapshot = leerLista(visible);
        if (!snapshot.consultando && !snapshot.refrescoPendiente && listaDesactualizada(snapshot)) {
            void obtenerPaginaTabla(ruta, "productos", 2, "personal");
        }
    });
    try {
        sincronizador.recibir({ modulo, accion: "updated" });
        sincronizador.recibir({ modulo, accion: "status" });
        assert.equal(llamadas, 0); publicar(); await tick(); await tick();
        assert.equal(llamadas, 1);
        assert.equal(leerLista(visible).datos.paginacion.totalElementos, 11);
        assert.equal(leerLista(oculta).actualizado, 0);
        assert.equal(leerBusqueda(ruta), "personal"); assert.equal(leerPagina(ruta), 2);
    } finally { retirar(); sincronizador.detener(); }
});

test("Productos: cambio propio confirmado reconcilia resultados y totales sin perder el filtro", async () => {
    const ruta = "/api/products", key = rutaPaginaTabla(ruta, 1, "personal");
    guardarBusqueda(ruta, "personal");
    globalThis.fetch = async () => Response.json({ productos: [{ id_producto: 5, nombre: "Pizza", tamano: "personal" }],
        paginacion: { pagina: 1, totalPaginas: 1, totalElementos: 1 } });
    await obtenerPaginaTabla(ruta, "productos", 1, "personal");
    confirmarLista("/api/products/5", "PATCH", { producto: { id_producto: 5, nombre: "Pizza", tamano: "mediana" } }, versionListasSesion());
    assert.equal(leerLista(key).actualizado, 0);
    globalThis.fetch = async url => {
        assert.equal(url, key);
        return Response.json({ productos: [], paginacion: { pagina: 1, totalPaginas: 1, totalElementos: 0 } });
    };
    const resultado = await obtenerPaginaTabla(ruta, "productos", 1, leerBusqueda(ruta));
    assert.deepEqual(resultado.datos, []); assert.equal(resultado.paginacion.totalElementos, 0);
    assert.equal(leerBusqueda(ruta), "personal");
});
