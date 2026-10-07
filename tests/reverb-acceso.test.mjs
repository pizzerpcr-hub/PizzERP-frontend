import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { observarAccesoReverb } from "../src/services/observarAccesoReverb.js";

function entorno() {
    const canales = new Map(), salidas = [], conexion = new Map();
    const echo = {
        private: nombre => {
            if (!canales.has(nombre)) canales.set(nombre, new Map());
            return { listen: (evento, callback) => canales.get(nombre).set(evento, callback) };
        },
        leave: nombre => salidas.push(nombre),
        connector: { pusher: { connection: {
            bind: (evento, callback) => conexion.set(evento, callback),
            unbind: evento => conexion.delete(evento),
        } } },
    };
    return { echo, canales, salidas, conexion };
}

test("suscribe nombres reales de los tres eventos; cambio de rol/permiso revisa y desactivación revoca inmediatamente", () => {
    const env = entorno(); let revisiones = 0, revocaciones = 0;
    const stop = observarAccesoReverb({ echo: env.echo, usuario: { id_usuario: 2, rol_id: 9 },
        revisar: () => revisiones++, revocar: () => revocaciones++ });
    const personal = env.canales.get("usuario.2"), rol = env.canales.get("rol.9");
    personal.get(".user.access-changed")({ user_id: 2, rol_id: 10 });
    rol.get(".role.access-changed")({ rol_id: 9, permisos: {} });
    personal.get(".user.status-changed")({ usuario: { id_usuario: 2, estado: "INACTIVO" } });
    assert.equal(revisiones, 2); assert.equal(revocaciones, 1);
    personal.get(".user.access-changed")({ user_id: 3 });
    rol.get(".role.access-changed")({ rol_id: 8 });
    assert.equal(revisiones, 2);
    env.conexion.get("connected")(); assert.equal(revisiones, 3);
    stop(); assert.deepEqual(env.salidas, ["usuario.2", "rol.9"]);
    assert.equal(env.conexion.size, 0);
});

test("reasignación deja canal anterior y se suscribe al nuevo rol; sin Echo no crea suscripciones", () => {
    const env = entorno();
    const stop = observarAccesoReverb({ echo: env.echo, usuario: { id_usuario: 2, rol_id: 9 }, revisar: () => {}, revocar: () => {} });
    stop();
    observarAccesoReverb({ echo: env.echo, usuario: { id_usuario: 2, rol_id: 10 }, revisar: () => {}, revocar: () => {} })();
    assert.ok(env.canales.has("rol.10")); assert.ok(env.salidas.includes("rol.9"));
    observarAccesoReverb({ echo: null, usuario: { id_usuario: 2 } })();
});

test("omite solo primera conexión con acceso vigente; reconexión y eventos siempre revisan", () => {
    const env = entorno(); let revisiones = 0;
    const opciones = { echo: env.echo, usuario: { id_usuario: 2, rol_id: 9 },
        revisar: () => revisiones++, revocar: () => {}, accesoVigente: () => true };
    const stop = observarAccesoReverb(opciones);
    env.conexion.get("connected")(); assert.equal(revisiones, 0);
    env.canales.get("rol.9").get(".role.access-changed")({ rol_id: 9 });
    assert.equal(revisiones, 1);
    stop();
    observarAccesoReverb(opciones);
    env.conexion.get("connected")(); assert.equal(revisiones, 2);
});

test("primera conexión con permisos no confirmados o vencidos revisa", () => {
    for (const vigente of [false, true]) {
        const env = entorno(); let revisiones = 0;
        if (vigente) env.echo.connector.pusher.connection.state = "connected";
        observarAccesoReverb({ echo: env.echo, usuario: { id_usuario: 2 },
            revisar: () => revisiones++, revocar: () => {}, accesoVigente: () => vigente });
        env.conexion.get("connected")(); assert.equal(revisiones, 1);
    }
});

test("reconexión indica reconciliación de listas, después de revisar acceso; eventos conservan su revisión", () => {
    const env = entorno(), opciones = [];
    observarAccesoReverb({ echo: env.echo, usuario: { id_usuario: 2 },
        revisar: detalle => opciones.push(detalle), revocar: () => {}, accesoVigente: () => true });
    env.conexion.get("connected")(); assert.deepEqual(opciones, []);
    env.conexion.get("connected")(); assert.deepEqual(opciones, [{ reconexion: true }]);
    env.canales.get("usuario.2").get(".user.access-changed")({ user_id: 2 });
    assert.equal(opciones.at(-1), undefined);
});

test("contrato coincide con clases y canales del backend, sin restaurar usuarios general", () => {
    for (const [archivo, canal, evento] of [
        ["RoleAccessChanged", "rol.", "role.access-changed"],
        ["UserAccessChanged", "usuario.", "user.access-changed"],
        ["UserStatus", "usuario.", "user.status-changed"],
    ]) {
        const fuente = readFileSync(new URL(`../../PizzERP-backend/app/Events/${archivo}.php`, import.meta.url), "utf8");
        assert.ok(fuente.includes(`'${canal}'`));
        assert.ok(fuente.includes(`return '${evento}';`));
    }
});
