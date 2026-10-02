import { test } from "node:test";
import assert from "node:assert/strict";
import { observarUsuarios } from "../src/services/observarUsuarios.js";

function entorno() {
    const ventana = new EventTarget();
    const documento = new EventTarget();
    documento.visibilityState = "visible";
    let tick, cancelado = false;
    ventana.setInterval = (callback, ms) => {
        assert.equal(ms, 10000);
        tick = callback;
        return 1;
    };
    ventana.clearInterval = () => { cancelado = true; };
    return { ventana, documento, tick: () => tick(), cancelado: () => cancelado };
}

for (const usuario of [null, { rol: "CAJA", estado: "ACTIVO" },
    { rol: "COCINA", estado: "ACTIVO" }, { rol: "TI", estado: "INACTIVO" },
    { rol: "ADMINISTRADOR", estado: "INACTIVO" }]) {
    test(`no consulta listado sin permiso vigente: ${JSON.stringify(usuario)}`, async () => {
        const env = entorno();
        let revocado, recargas = 0;
        const stop = observarUsuarios({
            ...env, consultar: async () => usuario,
            revocar: (actual) => { revocado = actual; },
            recargar: () => { recargas++; },
        });
        await env.tick();
        assert.equal(revocado, usuario);
        assert.equal(recargas, 0);
        stop();
    });
}

for (const rol of ["ADMINISTRADOR", "TI", "AUDITOR"]) {
    test(`foco y temporizador verifican permiso antes del listado: ${rol}`, async () => {
        const env = entorno(), llamadas = [];
        const stop = observarUsuarios({
            ...env,
            consultar: async () => { llamadas.push("sesion"); return { rol, estado: "ACTIVO", permisos: { usuarios: { ver: true } } }; },
            revocar: () => assert.fail("permiso vigente"),
            recargar: async () => { llamadas.push("listado"); },
        });
        env.ventana.dispatchEvent(new Event("focus"));
        await new Promise(setImmediate);
        await env.tick();
        assert.deepEqual(llamadas, ["sesion", "listado", "sesion", "listado"]);
        env.documento.visibilityState = "hidden";
        await env.tick();
        assert.equal(llamadas.length, 4);
        stop();
        assert.equal(env.cancelado(), true);
        env.documento.visibilityState = "visible";
        env.ventana.dispatchEvent(new Event("focus"));
        await env.tick();
        assert.equal(llamadas.length, 4);
    });
}

test("espera el listado anterior y descarta una verificación cancelada", async () => {
    const env = entorno();
    let resolver, consultas = 0, recargas = 0;
    const stop = observarUsuarios({
        ...env,
        consultar: async () => { consultas++; return { rol: "TI", estado: "ACTIVO", permisos: { usuarios: { ver: true } } }; },
        revocar: () => assert.fail(),
        recargar: () => { recargas++; return new Promise((r) => { resolver = r; }); },
    });
    const pendiente = env.tick();
    await new Promise(setImmediate);
    await env.tick();
    assert.equal(consultas, 1);
    resolver();
    await pendiente;
    stop();
    assert.equal(recargas, 1);

    const otro = entorno();
    const cancelar = observarUsuarios({
        ...otro, consultar: () => new Promise((r) => { resolver = r; }),
        recargar: () => assert.fail("desmontado"), revocar: () => assert.fail("desmontado"),
    });
    const verificacion = otro.tick();
    cancelar();
    resolver({ rol: "TI", estado: "ACTIVO" });
    await verificacion;
});

test("fallo de sesión no provoca GET ni revocación; puede reintentar", async () => {
    const env = entorno();
    let fallo = true, recargas = 0;
    const stop = observarUsuarios({
        ...env,
        consultar: async () => { if (fallo) throw Error("red"); return { rol: "TI", estado: "ACTIVO", permisos: { usuarios: { ver: true } } }; },
        recargar: () => { recargas++; }, revocar: () => assert.fail("error no es revocación"),
    });
    await env.tick();
    assert.equal(recargas, 0);
    fallo = false;
    await env.tick();
    assert.equal(recargas, 1);
    stop();
});

test("mantiene permisos mientras consulta y aplica la revocación solo al confirmarla", async () => {
    const env = entorno();
    const previo = { rol: "TI", estado: "ACTIVO", permisos: { usuarios: { ver: true, editar: true } } };
    let actual = previo, resolver, recargas = 0;
    const stop = observarUsuarios({
        ...env, consultar: () => new Promise((resolve) => { resolver = resolve; }),
        revocar: (confirmado) => { actual = confirmado; },
        recargar: (confirmado) => { actual = confirmado; recargas++; },
    });
    const primera = env.tick();
    assert.equal(actual, previo);
    resolver({ ...previo, permisos: { usuarios: { ver: true, editar: false } } });
    await primera;
    assert.equal(actual.permisos.usuarios.editar, false);
    assert.equal(recargas, 1);
    const segunda = env.tick();
    assert.equal(actual.permisos.usuarios.ver, true);
    resolver({ ...previo, permisos: { usuarios: { ver: false, editar: false } } });
    await segunda;
    assert.equal(actual.permisos.usuarios.ver, false);
    assert.equal(recargas, 1);
    stop();
});
