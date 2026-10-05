import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observarSesion } from '../src/services/observarSesion.js';
import { verificarSesion } from '../src/services/loginService.js';
import { obtenerRutaInicio } from '../src/constants/roles.js';

function entorno() {
    const ventana = new EventTarget();
    const documento = new EventTarget();
    documento.visibilityState = 'visible';
    let tick;
    ventana.setInterval = (callback, ms) => { assert.equal(ms, 60000); tick = callback; return 1; };
    ventana.clearInterval = () => {};
    return { ventana, documento, tick: () => tick() };
}

for (const rol of ['CAJA', 'COCINA', 'TI', 'ADMINISTRADOR']) {
    test(`sesión abierta se sincroniza a ${rol} sin Reverb`, async () => {
        const env = entorno();
        let actual;
        const stop = observarSesion({...env, consultar: async () => ({rol,estado:'ACTIVO',permisos:{usuarios:{ver:['TI','ADMINISTRADOR'].includes(rol)},pedidos:{ver:rol==='CAJA'},cocina:{ver:rol==='COCINA'}}}), actualizar: value => actual = value});
        await env.tick();
        assert.equal(actual.rol, rol);
        assert.equal(obtenerRutaInicio(actual), {CAJA:'/caja',COCINA:'/cocina',TI:'/panel/usuarios',ADMINISTRADOR:'/panel/usuarios'}[rol]);
        stop();
    });
}
test('revocación confirmada retira usuario; error transitorio no lo retira', async () => {
    const env = entorno();
    let actual = 'sesión';
    let fallo = true;
    const stop = observarSesion({...env, consultar: async () => {if(fallo) throw Error('red'); return null;}, actualizar: value => actual=value});
    await env.tick();
    assert.equal(actual, 'sesión');
    fallo = false;
    await env.tick();
    assert.equal(actual, null);
    stop();
});
test('no duplica consultas y descarta respuestas después de cancelar', async () => {
    const env = entorno();
    let resolve, signal, calls=0, updates=0;
    const stop = observarSesion({...env, consultar: s => {calls++;signal=s;return new Promise(r=>resolve=r);}, actualizar:()=>updates++});
    const pending = env.tick();
    env.ventana.dispatchEvent(new Event('focus'));
    await env.tick();
    assert.equal(calls,1);
    stop();
    resolve({rol:'TI'});
    await pending;
    assert.equal(signal.aborted,true);
    assert.equal(updates,0);
    env.ventana.dispatchEvent(new Event('focus'));
    assert.equal(calls,1);
});
test('401/403 confirman ausencia de acceso; 500 no confirma revocación', async () => {
    const original = globalThis.fetch;
    try {
        for(const status of [401,403]) {
            globalThis.fetch = async()=>new Response(null,{status});
            assert.equal(await verificarSesion(),null);
        }
        globalThis.fetch = async()=>new Response(null,{status:500});
        await assert.rejects(verificarSesion(),/verificar la sesión/);
    } finally {globalThis.fetch=original;}
});

test('la expiración por inactividad notifica la causa sin confundirla con otros rechazos', async () => {
    const originalFetch = globalThis.fetch;
    const originalWindow = globalThis.window;
    const ventana = new EventTarget();
    let avisos = 0;
    ventana.addEventListener('pizzerp:session-idle-expired', () => avisos++);
    globalThis.window = ventana;

    try {
        globalThis.fetch = async () => Response.json({ message: 'Unauthenticated.', reason: 'inactivity' }, { status: 401 });
        assert.equal(await verificarSesion(), null);
        assert.equal(avisos, 1);

        globalThis.fetch = async () => Response.json({ message: 'El usuario se encuentra inactivo.' }, { status: 403 });
        assert.equal(await verificarSesion(), null);
        assert.equal(avisos, 1);
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.window = originalWindow;
    }
});

test('revisa al recuperar foco o recibir rechazo, pero no consulta oculta', async () => {
    const env = entorno();
    let calls = 0;
    const stop = observarSesion({...env, consultar: async () => {calls++; return null;}, actualizar: () => {}});
    env.documento.visibilityState = 'hidden';
    await env.tick();
    assert.equal(calls, 0);
    env.documento.visibilityState = 'visible';
    env.ventana.dispatchEvent(new Event('focus'));
    await new Promise(setImmediate);
    assert.equal(calls, 1);
    env.ventana.dispatchEvent(new Event('pizzerp:session-check'));
    await new Promise(setImmediate);
    assert.equal(calls, 2);
    stop();
});

test('visibilidad y reconexión revisan sesión; al detener elimina ambos listeners', async () => {
    const env = entorno(); let llamadas = 0, forzar = false;
    const stop = observarSesion({ ...env, consultar: async () => { llamadas++; return {}; },
        actualizar: (_, reconexion) => { forzar = reconexion; } });
    env.documento.dispatchEvent(new Event('visibilitychange')); await new Promise(setImmediate);
    assert.equal(llamadas, 1);
    env.ventana.dispatchEvent(new Event('online')); await new Promise(setImmediate);
    assert.equal(llamadas, 2); assert.equal(forzar, true);
    stop(); env.ventana.dispatchEvent(new Event('online'));
    env.documento.dispatchEvent(new Event('visibilitychange')); await new Promise(setImmediate);
    assert.equal(llamadas, 2);
});

test('reconexión simultánea comparte revisión pendiente y conserva el refresco forzado', async () => {
    const env = entorno(); let resolver, llamadas = 0, forzar = false;
    const stop = observarSesion({ ...env, consultar: () => { llamadas++; return new Promise(resolve => { resolver = resolve; }); },
        actualizar: (_, reconexion) => { forzar = reconexion; } });
    const pendiente = env.tick();
    env.ventana.dispatchEvent(new Event('online'));
    resolver({}); await pendiente;
    assert.equal(llamadas, 1); assert.equal(forzar, true);
    stop();
});
