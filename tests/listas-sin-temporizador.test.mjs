import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consultarLista, sincronizarListasSesion, guardarBusqueda, guardarPagina,
    leerLista, listaDesactualizada, suscribirLista } from "../src/services/listasSesion.js";
import { observarCrudReverb } from "../src/services/observarCrudReverb.js";
import { obtenerPaginaTabla } from "../src/services/catalogoService.js";
import { precargarListas } from "../src/services/precargarListas.js";

const cuenta = { id_usuario: 1, estado: "ACTIVO", permisos: Object.fromEntries(
    ["usuarios", "roles", "categorias", "productos", "ingredientes", "combos"]
        .map(modulo => [modulo, { ver: true, crear: true, editar: true }])) };
const tick = () => new Promise(resolve => setImmediate(resolve));
beforeEach(() => { sincronizarListasSesion(null); sincronizarListasSesion(cuenta); });
afterEach(() => sincronizarListasSesion(null));

test("los cuatro catálogos y las listas no caducan por tiempo", async () => {
    const reloj = Date.now; let fecha = 1000, llamadas = 0;
    Date.now = () => fecha;
    try {
        for (const ruta of ["/api/users/roles", "/api/products/categorias", "/api/products/ingredientes", "/api/combos/productos", "/api/users", "/api/roles", "/api/categories", "/api/products", "/api/ingredients", "/api/combos"]) {
            const loader = async () => { llamadas++; return []; };
            await consultarLista(ruta, loader);
            fecha += 86400000;
            await consultarLista(ruta, loader);
            assert.equal(listaDesactualizada(leerLista(ruta)), false);
        }
        assert.equal(llamadas, 10);
    } finally { Date.now = reloj; }
});

test("hook sin temporizador ni fuerza por revisión de acceso; sesión conserva intervalo de 60 segundos", () => {
    const hook = readFileSync(new URL("../src/hooks/useListaSesion.js", import.meta.url), "utf8");
    assert.doesNotMatch(hook, /setInterval|VIGENCIA_LISTAS|detail\?\.forzar/);
    assert.match(hook, /session-verified/);
    const sesion = readFileSync(new URL("../src/services/observarSesion.js", import.meta.url), "utf8");
    assert.match(sesion, /intervaloMs = 60000/);
    assert.match(sesion, /setInterval\(revisar, intervaloMs\)/);
});

test("precarga prioriza selección visible y solo primera página sin búsqueda del resto", async () => {
    const fetchOriginal = globalThis.fetch, llamadas = [];
    guardarBusqueda("/api/users", "visible"); guardarPagina("/api/users", "visible", 2);
    guardarBusqueda("/api/products", "oculta"); guardarPagina("/api/products", "oculta", 3);
    globalThis.fetch = async ruta => { llamadas.push(ruta); return Response.json({}); };
    try {
        await precargarListas(cuenta, "/panel/usuarios");
        assert.equal(llamadas[0], "/api/users?page=2&search=visible");
        assert.ok(llamadas.includes("/api/products?page=1&search="));
        assert.ok(!llamadas.includes("/api/products?page=3&search=oculta"));
    } finally { globalThis.fetch = fetchOriginal; }
});

test("reconexión agrupa recuperación: GET visible, páginas ocultas invalidadas y limpieza de escucha", async () => {
    const fetchOriginal = globalThis.fetch, tareas = new Map(), conexiones = new Set();
    let llamadas = 0, id = 0;
    globalThis.fetch = async () => { llamadas++; return Response.json({ usuarios: [], paginacion: { pagina: 1, totalPaginas: 1 } }); };
    const consultar = pagina => obtenerPaginaTabla("/api/users", "usuarios", pagina, "");
    await consultar(1); await consultar(2); llamadas = 0;
    const visible = "/api/users?page=1&search=", oculta = "/api/users?page=2&search=";
    const quitar = suscribirLista(visible, () => {
        const s = leerLista(visible);
        if (!s.consultando && !s.refrescoPendiente && listaDesactualizada(s)) void consultar(1);
    });
    const conexion = { bind: (_, fn) => conexiones.add(fn), unbind: (_, fn) => conexiones.delete(fn) };
    const echo = { private: () => ({ listen: () => {} }), leave: () => {}, connector: { pusher: { connection: conexion } } };
    const detener = observarCrudReverb({ echo, usuario: cuenta, temporizadores: {
        programar: fn => { tareas.set(++id, fn); return id; }, cancelar: id => tareas.delete(id),
    } });
    const conectar = () => conexiones.forEach(fn => fn());
    try {
        conectar(); assert.equal(tareas.size, 0); // Primera conexión no duplica la precarga.
        conectar(); assert.equal(tareas.size, 1); assert.equal(llamadas, 0);
        for (const fn of tareas.values()) fn(); tareas.clear();
        await tick(); assert.equal(llamadas, 1);
        assert.equal(listaDesactualizada(leerLista(oculta)), true);
        await consultar(2); assert.equal(llamadas, 2);
        detener(); assert.equal(conexiones.size, 0);
        conectar(); assert.equal(tareas.size, 0);
    } finally { detener(); quitar(); globalThis.fetch = fetchOriginal; }
});
