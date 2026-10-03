import { test } from "node:test";
import assert from "node:assert/strict";
import { crearConsultasSesion } from "../src/services/consultasSesion.js";
import { obtenerAcceso } from "../src/services/gestionesService.js";
import { verificarSesion } from "../src/services/loginService.js";

test("revisiones simultáneas comparten user y permissions, pero la siguiente revisión no reutiliza permisos", async () => {
    let usuarios = 0, permisos = 0;
    const consultas = crearConsultasSesion(async () => { usuarios++; return { id_usuario: 1 }; },
        async () => { permisos++; await new Promise(setImmediate); return { rol_id: 7, permisos: { usuarios: { ver: true } } }; });
    const resultados = await Promise.all([consultas.consultar(), consultas.consultar(), consultas.acceso()]);
    assert.equal(usuarios, 1); assert.equal(permisos, 1);
    assert.equal(resultados[0].rol_id, 7);
    await consultas.consultar();
    assert.equal(usuarios, 2); assert.equal(permisos, 2);
});

test("sin sesión no consulta permisos", async () => {
    const consultas = crearConsultasSesion(async () => null, () => assert.fail("No hay cuenta confirmada"));
    assert.equal(await consultas.consultar(), null);
});

test("cancelar un consumidor no cancela otra revisión compartida; invalidar aborta el transporte", async () => {
    let resolver, signal;
    const consultas = crearConsultasSesion(s => { signal = s; return new Promise(resolve => { resolver = resolve; }); }, async () => ({ permisos: {} }));
    const controller = new AbortController();
    const primera = consultas.consultar(controller.signal);
    const segunda = consultas.consultar();
    await Promise.resolve(); controller.abort();
    await assert.rejects(primera, { name: "AbortError" });
    assert.equal(signal.aborted, false);
    resolver({ id_usuario: 1 }); await segunda;
    const pendiente = consultas.consultar(); await Promise.resolve();
    consultas.cancelar(); assert.equal(signal.aborted, true);
    resolver(null); await assert.rejects(pendiente, { name: "AbortError" });
});

test("servicios HTTP reales comparten ambas peticiones y conservan ID del canal de rol", async () => {
    const anterior = globalThis.fetch;
    const rutas = [];
    globalThis.fetch = async ruta => {
        rutas.push(ruta);
        return Response.json(ruta === "/api/user" ? { usuario: { id_usuario: 4, estado: "ACTIVO" } }
            : { rol_id: 12, permisos: { roles: { ver: false } } });
    };
    try {
        const consultas = crearConsultasSesion(verificarSesion, obtenerAcceso);
        const [actual] = await Promise.all([consultas.consultar(), consultas.consultar()]);
        assert.deepEqual(rutas, ["/api/user", "/api/permissions"]);
        assert.equal(actual.rol_id, 12);
        assert.equal(actual.permisos.roles.ver, false);
    } finally { globalThis.fetch = anterior; }
});
