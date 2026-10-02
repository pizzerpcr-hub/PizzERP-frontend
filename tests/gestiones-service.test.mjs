import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sincronizarListasSesion } from "../src/services/listasSesion.js";
beforeEach(() => sincronizarListasSesion({ id_usuario: 1, estado: "ACTIVO", permisos: {
    combos: { ver: true }, roles: { ver: true },
} }));
afterEach(() => sincronizarListasSesion(null));
import {
    actualizarCombo, actualizarRol, cambiarEstadoCombo, cambiarEstadoRol,
    obtenerCombos, obtenerPermisos, obtenerRoles, registrarCombo, registrarRol,
} from "../src/services/gestionesService.js";

test("combos y roles reutilizan CSRF, cookies y métodos correctos", async () => {
    const anteriores = { fetch: globalThis.fetch, document: globalThis.document, window: globalThis.window };
    const llamadas = [];
    globalThis.document = { cookie: "XSRF-TOKEN=prueba%20aislada" };
    globalThis.window = new EventTarget();
    globalThis.fetch = async (ruta, opciones) => {
        llamadas.push({ ruta, opciones });
        return new Response(JSON.stringify({ combos: [], roles: [] }), { status: 200 });
    };
    try {
        await obtenerCombos();
        await obtenerRoles();
        const operaciones = [
            [() => registrarCombo({ nombre: "Combo" }), "/api/combos", "POST", { nombre: "Combo" }],
            [() => actualizarCombo(7, { precio: "12.00" }), "/api/combos/7", "PATCH", { precio: "12.00" }],
            [() => cambiarEstadoCombo(7, "INACTIVO"), "/api/combos/7/estado", "PATCH", { estado: "INACTIVO" }],
            [() => registrarRol({ nombre: "AUDITOR", permisos: {} }), "/api/roles", "POST", { nombre: "AUDITOR", permisos: {} }],
            [() => actualizarRol(8, { permisos: {} }), "/api/roles/8", "PATCH", { permisos: {} }],
            [() => cambiarEstadoRol(8, "ACTIVO"), "/api/roles/8/estado", "PATCH", { estado: "ACTIVO" }],
        ];
        for (const [ejecutar, ruta, metodo, datos] of operaciones) {
            await ejecutar();
            const [csrf, mutacion] = llamadas.slice(-2);
            assert.equal(csrf.ruta, "/sanctum/csrf-cookie");
            assert.equal(mutacion.ruta, ruta);
            assert.equal(mutacion.opciones.method, metodo);
            assert.equal(mutacion.opciones.headers["X-XSRF-TOKEN"], "prueba aislada");
            assert.deepEqual(JSON.parse(mutacion.opciones.body), datos);
        }
        for (const { opciones } of llamadas) {
            assert.equal(opciones.credentials, "include");
            assert.equal(opciones.headers.Accept, "application/json");
        }
    } finally {
        Object.assign(globalThis, anteriores);
    }
});

test("un 422 conserva el detalle y una respuesta no JSON no oculta el error", async () => {
    const anteriores = { fetch: globalThis.fetch, document: globalThis.document, window: globalThis.window };
    globalThis.document = { cookie: "XSRF-TOKEN=prueba" };
    globalThis.window = new EventTarget();
    try {
        globalThis.fetch = async (ruta) => ruta === "/sanctum/csrf-cookie"
            ? new Response(null, { status: 204 })
            : new Response(JSON.stringify({ errors: { nombre: ["El nombre ya existe."] } }), { status: 422 });
        await assert.rejects(registrarRol({ nombre: "AUDITOR" }), (error) =>
            error.status === 422 && error.errors.nombre[0] === "El nombre ya existe.");
        globalThis.fetch = async () => new Response("Servicio no disponible", { status: 503 });
        await assert.rejects(obtenerCombos(), (error) => error.status === 503 && /cargar los combos/.test(error.message));
    } finally {
        Object.assign(globalThis, anteriores);
    }
});

test("una respuesta incompleta de permisos se rechaza y no confirma revocación", async () => {
    const anterior = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200 });
        await assert.rejects(obtenerPermisos(), /confirmar los permisos/);
        globalThis.fetch = async () => new Response(JSON.stringify({ permisos: { usuarios: { ver: false } } }), { status: 200 });
        assert.deepEqual(await obtenerPermisos(), { usuarios: { ver: false } });
    } finally { globalThis.fetch = anterior; }
});
