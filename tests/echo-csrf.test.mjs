import { test } from "node:test";
import assert from "node:assert/strict";
import { crearAutorizadorEcho } from "../src/services/autorizarEcho.js";

const autorizar = (factory, canal) => new Promise(resolve => {
    factory({ name: canal }).authorize("socket", (error, datos) => resolve({ error, datos }));
});

test("dos canales comparten un CSRF pero conservan autorizaciones independientes", async () => {
    const llamadas = [];
    let resolver;
    const factory = crearAutorizadorEcho((ruta, opciones) => {
        llamadas.push({ ruta, opciones });
        if (ruta === "/sanctum/csrf-cookie") return new Promise(resolve => { resolver = resolve; });
        return Promise.resolve(new Response(JSON.stringify({ auth: "autorizado" })));
    }, () => "XSRF-TOKEN=valor%20seguro");
    const uno = autorizar(factory, "private-usuario.1");
    const dos = autorizar(factory, "private-rol.2");
    await Promise.resolve();
    assert.equal(llamadas.length, 1);
    resolver({ ok: true });
    assert.ok(!(await uno).error); assert.ok(!(await dos).error);
    assert.equal(llamadas.length, 3); // Antes: dos CSRF + dos autorizaciones = cuatro.
    assert.deepEqual(llamadas.slice(1).map(({ opciones }) => JSON.parse(opciones.body).channel_name),
        ["private-usuario.1", "private-rol.2"]);
    for (const { opciones } of llamadas.slice(1)) {
        assert.equal(opciones.credentials, "include");
        assert.equal(opciones.headers["X-XSRF-TOKEN"], "valor seguro");
    }
});

test("CSRF fallido no autoriza canales y permite preparar nuevamente", async () => {
    let csrf = 0, autorizaciones = 0;
    const factory = crearAutorizadorEcho(async ruta => {
        if (ruta === "/sanctum/csrf-cookie") return { ok: ++csrf > 1 };
        autorizaciones++; return new Response('{"auth":"ok"}');
    }, () => "");
    const [uno, dos] = await Promise.all([autorizar(factory, "a"), autorizar(factory, "b")]);
    assert.ok(uno.error); assert.ok(dos.error);
    assert.equal(csrf, 1); assert.equal(autorizaciones, 0);
    assert.ok(!(await autorizar(factory, "a")).error);
    assert.equal(csrf, 2); assert.equal(autorizaciones, 1);
});

test("un rechazo de canal no autoriza ni impide el otro; conexiones posteriores renuevan CSRF", async () => {
    let csrf = 0;
    const factory = crearAutorizadorEcho(async (ruta, opciones) => {
        if (ruta === "/sanctum/csrf-cookie") { csrf++; return { ok: true }; }
        return new Response("{}", { status: JSON.parse(opciones.body).channel_name === "denegado" ? 403 : 200 });
    }, () => "");
    const [uno, dos] = await Promise.all([autorizar(factory, "denegado"), autorizar(factory, "permitido")]);
    assert.ok(uno.error); assert.ok(!dos.error); assert.equal(csrf, 1);
    await autorizar(factory, "permitido"); assert.equal(csrf, 2);
});
