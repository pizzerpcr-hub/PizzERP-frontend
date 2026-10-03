import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { once } from "node:events";
import { crearSincronizadorCrud, observarCrudReverb } from "../src/services/observarCrudReverb.js";
import {
    actualizarLista, consultarLista, guardarBusqueda, leerBusqueda, leerLista, listaDesactualizada,
    marcarListaPendiente, puedeConsultarLista, registrarListaVisible, sincronizarListasSesion, suscribirLista,
} from "../src/services/listasSesion.js";
import { configurarSocketReverb } from "../src/services/socketReverb.js";
import { registrarUsuario } from "../src/services/usuariosService.js";
import { registrarIngrediente } from "../src/services/ingredientesService.js";
import { registrarProducto } from "../src/services/catalogoService.js";

const modulos = ["usuarios", "roles", "categorias", "productos", "ingredientes", "combos"];
const cuenta = { id_usuario: 1, estado: "ACTIVO", permisos: Object.fromEntries(modulos
    .map(modulo => [modulo, { ver: true, crear: true, editar: true }])) };
const tick = () => new Promise(resolve => setImmediate(resolve));
const aviso = (modulo = "productos") => ({ modulo, accion: "updated" });
const temporizadores = () => {
    const tareas = new Map(); let id = 0;
    return {
        programar: (fn, ms) => { assert.equal(ms, 200); tareas.set(++id, fn); return id; },
        cancelar: id => tareas.delete(id),
        ejecutar: () => { const callbacks = [...tareas.values()]; tareas.clear(); callbacks.forEach(fn => fn()); },
        cantidad: () => tareas.size,
    };
};
// Mismo criterio del hook: listas visibles, sin limpiar datos ni estados del formulario.
const pantalla = (ruta, loader) => {
    const quitarVisible = registrarListaVisible(ruta);
    const quitar = suscribirLista(ruta, () => {
        const estado = leerLista(ruta);
        if (puedeConsultarLista(ruta) && !estado.refrescoPendiente && !estado.consultando
            && !estado.error && !estado.pendientes.length && listaDesactualizada(estado)) {
            void consultarLista(ruta, loader).catch(() => {});
        }
    });
    return () => { quitar(); quitarVisible(); };
};
beforeEach(() => { sincronizarListasSesion(null); sincronizarListasSesion(cuenta); });
afterEach(() => { sincronizarListasSesion(null); configurarSocketReverb(() => null); });

test("agrupa avisos de varios canales: un GET visible, dependencias invisibles invalidadas y búsqueda intacta", async () => {
    const timer = temporizadores(), sync = crearSincronizadorCrud(timer);
    for (const ruta of ["/api/products", "/api/categories", "/api/combos", "/api/combos/productos"]) actualizarLista(ruta, [{ nombre: "Anterior" }]);
    guardarBusqueda("/api/products", "pizza");
    let consultas = 0;
    const quitar = pantalla("/api/products", async () => { consultas++; return [{ nombre: "Nuevo" }]; });
    try {
        sync.recibir(aviso()); sync.recibir(aviso()); sync.recibir(aviso("categorias"));
        assert.equal(timer.cantidad(), 1); assert.equal(consultas, 0);
        assert.equal(leerLista("/api/products").datos[0].nombre, "Anterior");
        timer.ejecutar(); await tick();
        assert.equal(consultas, 1); assert.equal(leerLista("/api/products").datos[0].nombre, "Nuevo");
        assert.equal(leerBusqueda("/api/products"), "pizza");
        assert.equal(listaDesactualizada(leerLista("/api/combos/productos")), true);
        assert.equal(leerLista("/api/categories").consultando, false);
    } finally { quitar(); sync.detener(); }
});

test("respuesta previa no pisa filas; un aviso durante GET exige una revisión posterior compartida", async () => {
    actualizarLista("/api/products", [{ nombre: "Confirmado" }]);
    const timer = temporizadores(), sync = crearSincronizadorCrud(timer), resolver = [];
    let consultas = 0;
    const loader = () => { consultas++; return new Promise(resolve => resolver.push(resolve)); };
    const antigua = consultarLista("/api/products", loader, { forzar: true }); await tick();
    const quitar = pantalla("/api/products", loader);
    try {
        sync.recibir(aviso()); timer.ejecutar();
        resolver.shift()([{ nombre: "Obsoleto" }]); await antigua; await tick();
        assert.equal(leerLista("/api/products").datos[0].nombre, "Confirmado");
        assert.equal(consultas, 2);
        const compartida = consultarLista("/api/products", loader, { forzar: true });
        sync.recibir(aviso()); timer.ejecutar();
        resolver.shift()([{ nombre: "También obsoleto" }]); await compartida; await tick();
        assert.equal(consultas, 3);
        resolver.shift()([{ nombre: "Definitivo" }]); await tick();
        assert.equal(leerLista("/api/products").datos[0].nombre, "Definitivo");
        assert.equal(listaDesactualizada(leerLista("/api/products")), false);
    } finally { quitar(); sync.detener(); }
});

test("setDatos tardío y edición optimista no consumen una invalidación remota", async () => {
    actualizarLista("/api/users", [{ id_usuario: 2, nombre_usuario: "ANTERIOR" }]);
    const timer = temporizadores(), sync = crearSincronizadorCrud(timer);
    marcarListaPendiente("/api/users", 2, true);
    actualizarLista("/api/users", [{ id_usuario: 2, nombre_usuario: "PROVISIONAL" }]);
    let consultas = 0;
    const quitar = pantalla("/api/users", async () => { consultas++; return [{ id_usuario: 2, nombre_usuario: "CONFIRMADO" }]; });
    try {
        sync.recibir(aviso("usuarios")); timer.ejecutar(); await tick();
        assert.equal(consultas, 0);
        actualizarLista("/api/users", [{ id_usuario: 2, nombre_usuario: "ANTERIOR" }]);
        assert.equal(listaDesactualizada(leerLista("/api/users")), true);
        marcarListaPendiente("/api/users", 2, false); await tick();
        assert.equal(consultas, 1);
        assert.equal(leerLista("/api/users").datos[0].nombre_usuario, "CONFIRMADO");
    } finally { quitar(); sync.detener(); }
});

test("GET posterior al aviso ya confirmado no se repite al terminar el agrupamiento", async () => {
    actualizarLista("/api/products", []);
    const timer = temporizadores(), sync = crearSincronizadorCrud(timer);
    sync.recibir(aviso());
    let consultas = 0;
    const loader = async () => { consultas++; return [{ nombre: "Actual" }]; };
    await consultarLista("/api/products", loader, { forzar: true });
    const quitar = pantalla("/api/products", loader);
    try { timer.ejecutar(); await tick(); assert.equal(consultas, 1); }
    finally { quitar(); sync.detener(); }
});

test("error transitorio conserva filas y admite reintento", async () => {
    actualizarLista("/api/products", [{ nombre: "Conservar" }]);
    const timer = temporizadores(), sync = crearSincronizadorCrud(timer);
    const quitar = pantalla("/api/products", async () => { throw new Error("Sin red"); });
    try {
        sync.recibir(aviso()); timer.ejecutar(); await tick();
        assert.equal(leerLista("/api/products").datos[0].nombre, "Conservar");
        assert.match(leerLista("/api/products").error.message, /Sin red/);
        await consultarLista("/api/products", async () => [{ nombre: "Recuperado" }]);
        assert.equal(leerLista("/api/products").datos[0].nombre, "Recuperado");
    } finally { quitar(); sync.detener(); }
});

test("suscripciones cambian por permisos/cuenta; logout cancela agrupamiento y no repuebla datos", () => {
    const callbacks = new Map(), salidas = [], timer = temporizadores();
    const echo = { private: nombre => ({ listen: (evento, callback) => {
        assert.equal(evento, ".crud.changed"); callbacks.set(nombre, callback);
    } }), leave: nombre => salidas.push(nombre) };
    const usuario = { ...cuenta, permisos: { productos: { ver: true } } };
    sincronizarListasSesion(usuario); actualizarLista("/api/products", []);
    const stop = observarCrudReverb({ echo, usuario, temporizadores: timer });
    assert.deepEqual([...callbacks.keys()], ["crud.usuario.1.productos"]);
    callbacks.values().next().value(aviso()); assert.equal(timer.cantidad(), 1);
    sincronizarListasSesion({ ...usuario, permisos: {} }); stop();
    assert.equal(timer.cantidad(), 0); assert.deepEqual(salidas, ["crud.usuario.1.productos"]);
    assert.equal(leerLista("/api/products").datos, undefined);
    callbacks.values().next().value(aviso()); timer.ejecutar();
    assert.equal(leerLista("/api/products").datos, undefined);
    sincronizarListasSesion({ ...cuenta, id_usuario: 2 });
    const siguiente = observarCrudReverb({ echo, usuario: { ...usuario, id_usuario: 2 }, temporizadores: timer });
    assert.ok(callbacks.has("crud.usuario.2.productos"));
    sincronizarListasSesion(null); siguiente();
    assert.ok(salidas.includes("crud.usuario.2.productos"));
});

test("mutaciones de todos los adaptadores envían socket actual, sin cambiar CSRF ni cookies", async () => {
    const originalFetch = globalThis.fetch, originalDocument = globalThis.document;
    const llamadas = [];
    globalThis.document = { cookie: "XSRF-TOKEN=seguro" };
    globalThis.fetch = async (ruta, opciones) => {
        llamadas.push({ ruta, opciones }); return new Response("{}", { status: 200 });
    };
    try {
        configurarSocketReverb(() => "123.456");
        await registrarUsuario({}); await registrarIngrediente({}); await registrarProducto({});
        for (const { opciones } of llamadas.filter(({ opciones }) => opciones.method === "POST")) {
            assert.equal(opciones.headers["X-Socket-ID"], "123.456");
            assert.equal(opciones.headers["X-XSRF-TOKEN"], "seguro");
            assert.equal(opciones.credentials, "include");
        }
        configurarSocketReverb(() => null); await registrarProducto({});
        assert.equal(llamadas.at(-1).opciones.headers["X-Socket-ID"], undefined);
    } finally { globalThis.fetch = originalFetch; globalThis.document = originalDocument; }
});

test("dos sesiones aisladas reciben el mismo aviso simulado y sincronizan sus cachés independientes", async () => {
    const cacheUrl = new URL("../src/services/listasSesion.js", import.meta.url).href;
    const observerUrl = new URL("../src/services/observarCrudReverb.js", import.meta.url).href;
    const codigo = `
        const { parentPort, workerData } = require('node:worker_threads');
        (async () => {
            const cache = await import(workerData.cacheUrl);
            const { observarCrudReverb } = await import(workerData.observerUrl);
            const usuario = {id_usuario: workerData.id, estado:'ACTIVO', permisos:{productos:{ver:true}}};
            cache.sincronizarListasSesion(usuario); cache.actualizarLista('/api/products', [{nombre:'Anterior'}]);
            let callback, flush;
            const echo = {private: () => ({listen: (_evento, fn) => {callback=fn;}}), leave: () => {}};
            const stop = observarCrudReverb({echo, usuario, temporizadores:{programar: fn => {flush=fn; return 1;}, cancelar: () => {}}});
            parentPort.on('message', async evento => {
                callback(evento); flush();
                await cache.consultarLista('/api/products', async () => [{nombre:'Cambio remoto'}]);
                parentPort.postMessage(cache.leerLista('/api/products').datos);
                stop(); parentPort.close();
            });
            parentPort.postMessage('lista');
        })();`;
    const workers = [1, 2].map(id => new Worker(codigo, { eval: true, workerData: { id, cacheUrl, observerUrl } }));
    try {
        await Promise.all(workers.map(worker => once(worker, "message")));
        const resultados = workers.map(worker => once(worker, "message"));
        workers.forEach(worker => worker.postMessage(aviso()));
        for (const [datos] of await Promise.all(resultados)) assert.deepEqual(datos, [{ nombre: "Cambio remoto" }]);
    } finally { await Promise.all(workers.map(worker => worker.terminate())); }
});
