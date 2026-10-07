import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { observarAccesoReverb } from "../src/services/observarAccesoReverb.js";

const fuente = readFileSync(new URL("../src/context/AuthContext.jsx", import.meta.url), "utf8");
const fragmento = fuente.slice(fuente.indexOf("// Los cambios de acceso invalidan"));
const efecto = fragmento.match(/useEffect\(\(\) => \{([\s\S]*?)\n    \}, \[([^\]]+)\]\);/);
assert.ok(efecto);
const dependencias = efecto[2].split(",").map(valor => valor.trim()).filter(Boolean);
// Ejecuta el cuerpo real del efecto con dependencias/callbacks simulados, sin DOM ni sockets.
const ejecutar = new Function(...dependencias, "echo", "observarAccesoReverb",
    "revisarAccesoEvento", "revocarAccesoEvento", "accesoVigenteEvento", efecto[1]);

function entorno() {
    const suscripciones = [], salidas = [], canales = new Map(), conexiones = new Set();
    const echo = {
        private: nombre => {
            suscripciones.push(nombre);
            canales.set(nombre, new Map());
            return { listen: (evento, callback) => canales.get(nombre).set(evento, callback) };
        },
        leave: nombre => { salidas.push(nombre); canales.delete(nombre); },
        connector: { pusher: { connection: {
            bind: (_, callback) => conexiones.add(callback),
            unbind: (_, callback) => conexiones.delete(callback),
        } } },
    };
    let previas, limpiar, callbacks;
    return {
        suscripciones, salidas, canales, conexiones,
        render: (usuario, actuales = {}, cerrando = false) => {
            callbacks = actuales;
            const valores = {
                idUsuarioCanal: usuario?.id_usuario, idRolCanal: usuario?.rol_id,
                estadoUsuarioCanal: usuario?.estado, cerrandoSesion: cerrando,
            };
            const siguientes = dependencias.map(nombre => valores[nombre]);
            if (previas && siguientes.every((valor, indice) => Object.is(valor, previas[indice]))) return;
            limpiar?.(); previas = siguientes;
            limpiar = ejecutar(...siguientes, echo, observarAccesoReverb,
                opciones => callbacks.revisar?.(opciones), () => callbacks.revocar?.(),
                () => callbacks.vigente?.() ?? true);
        },
        conectar: () => conexiones.forEach(callback => callback()),
        desmontar: () => limpiar?.(),
    };
}
const cuenta = { id_usuario: 2, rol_id: 1, estado: "ACTIVO", permisos: { usuarios: { ver: true } } };

test("navegar y revisar permisos sin cambios no abandona ni suscribe nuevamente; usa callbacks actuales", () => {
    const env = entorno(); let antiguas = 0, nuevas = 0;
    env.render(cuenta, { revisar: () => antiguas++ });
    for (const ruta of ["usuarios", "roles", "productos", "usuarios"]) {
        env.render({ ...cuenta, permisos: { ...cuenta.permisos }, ruta }, { revisar: () => nuevas++ });
    }
    assert.deepEqual(env.suscripciones, ["usuario.2", "rol.1"]);
    assert.deepEqual(env.salidas, []);
    env.canales.get("rol.1").get(".role.access-changed")({ rol_id: 1 });
    assert.equal(antiguas, 0); assert.equal(nuevas, 1);
    assert.match(fuente, /revisarAccesoEvento = useEffectEvent\(opciones => revisarTrasEvento\(opciones\)\)/);
    env.desmontar();
});

test("cambio de rol/cuenta reemplaza canales; revocación, cierre y desmontaje limpian escuchas", () => {
    const env = entorno();
    env.render(cuenta);
    env.render({ ...cuenta, rol_id: 3 });
    assert.ok(!env.canales.has("rol.1")); assert.ok(env.canales.has("rol.3"));
    env.render({ ...cuenta, id_usuario: 4, rol_id: 3 });
    assert.ok(!env.canales.has("usuario.2")); assert.ok(env.canales.has("usuario.4"));
    env.render({ ...cuenta, id_usuario: 4, estado: "INACTIVO" });
    assert.equal(env.canales.size, 0); assert.equal(env.conexiones.size, 0);
    env.render(cuenta);
    env.render(cuenta, {}, true);
    assert.equal(env.canales.size, 0); assert.equal(env.conexiones.size, 0);
    env.render(null); env.desmontar();
});

test("callback de revocación actualizado y reconexión simulada revisan sin resuscripción manual", () => {
    const env = entorno(); let revocaciones = 0; const revisiones = [];
    env.render(cuenta, { revocar: () => assert.fail("callback antiguo") });
    env.render({ ...cuenta }, { revocar: () => revocaciones++, revisar: opciones => revisiones.push(opciones) });
    env.conectar(); assert.deepEqual(revisiones, []);
    env.conectar(); assert.deepEqual(revisiones, [{ reconexion: true }]);
    env.canales.get("usuario.2").get(".user.status-changed")({ usuario: { id_usuario: 2, estado: "INACTIVO" } });
    assert.equal(revocaciones, 1);
    assert.equal(env.suscripciones.length, 2);
    env.desmontar(); assert.equal(env.conexiones.size, 0);
});

test("proveedor único fuera de rutas; temporizador de acceso no reinicia por callbacks de navegación", () => {
    const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
    assert.match(main, /<AuthProvider>\s*<App \/>\s*<\/AuthProvider>/);
    const seccion = fuente.slice(fuente.indexOf("// La consulta periódica"), fuente.indexOf("const revisarTrasEvento"));
    assert.match(seccion, /consultar: \(\) => verificarAccesoEvento\(\)/);
    assert.doesNotMatch(seccion.split("}, [")[1], /verificarAcceso|cerrarPorPermisos/);
    const sesion = readFileSync(new URL("../src/services/observarSesion.js", import.meta.url), "utf8");
    assert.match(sesion, /intervaloMs = 60000/);
});
