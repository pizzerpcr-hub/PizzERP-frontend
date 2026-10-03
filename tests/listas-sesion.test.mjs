import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
    actualizarLista, confirmarLista, consultarLista, guardarBusqueda, invalidarLista,
    leerBusqueda, leerLista, listaDesactualizada, marcarListaPendiente,
    sincronizarListasSesion, suscribirLista, versionListasSesion,
} from "../src/services/listasSesion.js";
import { obtenerProductos, actualizarProducto } from "../src/services/catalogoService.js";
import { obtenerUsuarios } from "../src/services/usuariosService.js";

const rutas = ["/api/users", "/api/roles", "/api/categories", "/api/products", "/api/ingredients", "/api/combos"];
const permisos = Object.fromEntries(["usuarios", "roles", "categorias", "productos", "ingredientes", "combos"]
    .map(modulo => [modulo, { ver: true, crear: true, editar: true, eliminar: true }]));
const cuenta = { id_usuario: 1, estado: "ACTIVO", rol: "GESTOR", permisos };
const diferida = () => {
    let resolve, reject;
    const promise = new Promise((si, no) => { resolve = si; reject = no; });
    return { promise, resolve, reject };
};
beforeEach(() => { sincronizarListasSesion(null); sincronizarListasSesion(cuenta); });
afterEach(() => sincronizarListasSesion(null));

for (const ruta of rutas) test(`${ruta}: navegar ida y vuelta reutiliza lista y búsqueda, sin precargar otro módulo`, async () => {
    let consultas = 0;
    const loader = async () => { consultas++; return [{ id: 1, nombre: "Prueba" }]; };
    await consultarLista(ruta, loader);
    guardarBusqueda(ruta, "prueba");
    const dejarPagina = suscribirLista(ruta, () => {});
    dejarPagina();
    assert.equal(leerLista(ruta).datos[0].nombre, "Prueba");
    await consultarLista(ruta, loader);
    assert.equal(consultas, 1);
    assert.equal(leerBusqueda(ruta), "prueba");
    assert.equal(leerLista(rutas.find(otra => otra !== ruta)).datos, undefined);
});

test("GET simultáneos comparten petición y cancelar un consumidor no afecta al otro", async () => {
    const remoto = diferida();
    const controller = new AbortController();
    let consultas = 0, signalCompartida;
    const loader = signal => { consultas++; signalCompartida = signal; return remoto.promise; };
    const primero = consultarLista("/api/users", loader, { signal: controller.signal });
    const segundo = consultarLista("/api/users", loader, { forzar: true });
    controller.abort();
    await assert.rejects(primero, { name: "AbortError" });
    assert.equal(signalCompartida.aborted, false);
    remoto.resolve([]);
    assert.deepEqual(await segundo, []);
    assert.equal(consultas, 1);
    assert.equal(leerLista("/api/users").consultando, false);
});

test("desactualizar conserva datos; un cambio remoto reemplaza el listado sin perder búsqueda", async () => {
    await consultarLista("/api/roles", async () => [{ id_rol: 1, nombre: "ANTERIOR" }]);
    guardarBusqueda("/api/roles", "rol");
    invalidarLista("/api/roles");
    assert.equal(listaDesactualizada(leerLista("/api/roles")), true);
    const remoto = diferida();
    const consulta = consultarLista("/api/roles", () => remoto.promise);
    assert.equal(leerLista("/api/roles").datos[0].nombre, "ANTERIOR");
    remoto.resolve([{ id_rol: 1, nombre: "NUEVO" }]);
    await consulta;
    assert.equal(leerLista("/api/roles").datos[0].nombre, "NUEVO");
    assert.equal(leerBusqueda("/api/roles"), "rol");
});

test("fallo transitorio mantiene lista, expone error y permite reintento", async () => {
    await consultarLista("/api/products", async () => [{ nombre: "Visible" }]);
    await assert.rejects(consultarLista("/api/products", async () => { throw new TypeError("Sin red"); }, { forzar: true }));
    assert.equal(leerLista("/api/products").datos[0].nombre, "Visible");
    assert.equal(leerLista("/api/products").error.message, "Sin red");
    await consultarLista("/api/products", async () => [{ nombre: "Confirmado" }], { forzar: true });
    assert.equal(leerLista("/api/products").error, null);
});

test("GET anterior no pisa edición confirmada ni reversión optimista", async () => {
    const anterior = { id_usuario: 1, nombre_completo: "Anterior" };
    await consultarLista("/api/users", async () => [anterior]);
    const remoto = diferida();
    const viejo = consultarLista("/api/users", () => remoto.promise, { forzar: true });
    marcarListaPendiente("/api/users", 1, true);
    actualizarLista("/api/users", [{ ...anterior, nombre_completo: "Provisional" }]);
    assert.deepEqual(leerLista("/api/users").pendientes, ["1"]);
    actualizarLista("/api/users", [anterior]);
    marcarListaPendiente("/api/users", 1, false);
    remoto.resolve([{ ...anterior, nombre_completo: "Obsoleto" }]);
    await viejo;
    assert.deepEqual(leerLista("/api/users").datos, [anterior]);
    const otra = diferida();
    const get = consultarLista("/api/users", () => otra.promise, { forzar: true });
    confirmarLista("/api/users/1", "PATCH", { usuario: { ...anterior, nombre_completo: "Confirmado", contrasena_hash: "NO-GUARDAR" } }, versionListasSesion());
    otra.resolve([anterior]);
    await get;
    assert.equal(leerLista("/api/users").datos[0].nombre_completo, "Confirmado");
    assert.equal("contrasena_hash" in leerLista("/api/users").datos[0], false);
});

test("mutación de producto actualiza fila e invalida dependencias sin precargarlas", async () => {
    for (const ruta of ["/api/products", "/api/categories", "/api/combos", "/api/combos/productos"])
        await consultarLista(ruta, async () => []);
    confirmarLista("/api/products/2", "PATCH", { producto: { id_producto: 2, nombre: "Nuevo" } }, versionListasSesion());
    assert.equal(leerLista("/api/products").datos[0].nombre, "Nuevo");
    for (const ruta of ["/api/categories", "/api/combos", "/api/combos/productos"])
        assert.equal(listaDesactualizada(leerLista(ruta)), true);
    assert.equal(leerLista("/api/roles").datos, undefined);
});

test("roles invalidan asignaciones y catálogo; DELETE retira solo ingrediente confirmado", async () => {
    for (const ruta of ["/api/roles", "/api/users", "/api/users/roles"]) await consultarLista(ruta, async () => []);
    confirmarLista("/api/roles/3/estado", "PATCH", { rol: { id_rol: 3, nombre: "RENOMBRADO" } }, versionListasSesion());
    assert.equal(listaDesactualizada(leerLista("/api/users")), true);
    assert.equal(listaDesactualizada(leerLista("/api/users/roles")), true);
    await consultarLista("/api/ingredients", async () => [{ id_ingrediente: 1 }, { id_ingrediente: 2 }]);
    await consultarLista("/api/products/ingredientes", async () => [{ id_ingrediente: 1 }]);
    confirmarLista("/api/ingredients/1", "DELETE", {}, versionListasSesion());
    assert.deepEqual(leerLista("/api/ingredients").datos, [{ id_ingrediente: 2 }]);
    assert.equal(listaDesactualizada(leerLista("/api/products/ingredientes")), true);
});

test("logout y cambio de cuenta limpian memoria, búsquedas y descartan respuestas pendientes", async () => {
    await consultarLista("/api/users", async () => []);
    guardarBusqueda("/api/users", "Privado");
    const remoto = diferida();
    const consulta = consultarLista("/api/users", () => remoto.promise, { forzar: true });
    const epoch = versionListasSesion();
    sincronizarListasSesion(null);
    sincronizarListasSesion({ ...cuenta, id_usuario: 2 });
    remoto.resolve([{ nombre_usuario: "VIEJA-CUENTA" }]);
    await assert.rejects(consulta, { name: "AbortError" });
    confirmarLista("/api/users/1", "PATCH", { usuario: { id_usuario: 1 } }, epoch);
    assert.equal(leerLista("/api/users").datos, undefined);
    assert.equal(leerBusqueda("/api/users"), "");
});

test("revocación retira listas y catálogos y nunca ejecuta loader sin permiso", async () => {
    await consultarLista("/api/users", async () => []);
    await consultarLista("/api/users/roles", async () => []);
    sincronizarListasSesion({ ...cuenta, permisos: { ...permisos, usuarios: { ver: false, crear: false, editar: false } } });
    assert.equal(leerLista("/api/users").datos, undefined);
    assert.equal(leerLista("/api/users/roles").datos, undefined);
    await assert.rejects(consultarLista("/api/users", () => assert.fail("No autorizado")), { name: "AbortError" });
});

test("servicios reales comparten GET y actualizan la caché solo después de PATCH exitoso", async () => {
    const anterior = { fetch: globalThis.fetch, document: globalThis.document, window: globalThis.window };
    const llamadas = [];
    globalThis.document = { cookie: "XSRF-TOKEN=aislado" };
    globalThis.window = new EventTarget();
    globalThis.fetch = async (ruta, opciones) => {
        llamadas.push({ ruta, metodo: opciones.method ?? "GET" });
        return new Response(JSON.stringify({ productos: [{ id_producto: 1, nombre: "Viejo" }], producto: { id_producto: 1, nombre: "Nuevo" }, usuarios: [{ id_usuario: 1, contrasena: "privada", contrasena_hash: "privado" }] }));
    };
    try {
        await Promise.all([obtenerProductos(), obtenerProductos()]);
        await obtenerProductos();
        assert.equal(llamadas.length, 1);
        await actualizarProducto(1, { nombre: "Nuevo" });
        assert.equal(leerLista("/api/products").datos[0].nombre, "Nuevo");
        await obtenerUsuarios();
        assert.deepEqual(Object.keys(leerLista("/api/users").datos[0]), ["id_usuario", "nombre_completo", "nombre_usuario", "rol", "estado"]);
    } finally { Object.assign(globalThis, anterior); }
});

test("consulta vacía confirmada cuenta como datos: volver no muestra cargador ni consulta", async () => {
    await consultarLista("/api/combos", async () => []);
    assert.equal(listaDesactualizada(leerLista("/api/combos")), false);
    await consultarLista("/api/combos", () => assert.fail("Ya cargado"));
});

test("sin sesión no se conserva ni se consulta ningún módulo", async () => {
    sincronizarListasSesion(null);
    await assert.rejects(consultarLista("/api/users", () => assert.fail("No debe enviar GET")), { name: "AbortError" });
    assert.equal(leerLista("/api/users").datos, undefined);
});

test("catálogos filtrados y listas completas no se comparten por tener contratos diferentes", async () => {
    let consultas = 0;
    const completos = await consultarLista("/api/categories", async () => { consultas++; return [{ nombre: "INACTIVA" }]; });
    const asignables = await consultarLista("/api/products/categorias", async () => { consultas++; return [{ nombre: "ACTIVA" }]; });
    assert.equal(consultas, 2);
    assert.notDeepEqual(completos, asignables);
});

for (const status of [401, 403]) test(`${status} retira los datos y bloquea reintentos sin autorización nueva`, async () => {
    await consultarLista("/api/users", async () => []);
    await assert.rejects(consultarLista("/api/users", async () => { throw Object.assign(new Error("Denegado"), { status }); }, { forzar: true }));
    assert.equal(leerLista("/api/users").datos, undefined);
    await assert.rejects(consultarLista("/api/users", () => assert.fail("No repetir un recurso denegado")), { name: "AbortError" });
});

test("revocar permiso durante un GET descarta su respuesta aunque más tarde se recupere el permiso", async () => {
    const remoto = diferida();
    const consulta = consultarLista("/api/users", () => remoto.promise);
    await Promise.resolve();
    sincronizarListasSesion({ ...cuenta, permisos: { ...permisos, usuarios: { ver: false } } });
    sincronizarListasSesion(cuenta);
    remoto.resolve([{ nombre_usuario: "RESPUESTA-ANTIGUA" }]);
    await assert.rejects(consulta, { name: "AbortError" });
    assert.equal(leerLista("/api/users").datos, undefined);
});
