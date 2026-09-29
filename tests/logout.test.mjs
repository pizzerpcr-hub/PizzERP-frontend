import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cerrarSesion } from '../src/services/loginService.js';

const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;
afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
});

test('logout solo confirma después del POST con CSRF y cookie', async () => {
    globalThis.document = { cookie: 'XSRF-TOKEN=csrf%3D' };
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        return calls.length === 1
            ? new Response(null, { status: 204 })
            : Response.json({ message: 'Sesión cerrada correctamente.' });
    };
    assert.deepEqual(await cerrarSesion(), { message: 'Sesión cerrada correctamente.' });
    assert.equal(calls[1].url, '/api/logout');
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(calls[1].options.credentials, 'include');
    assert.equal(calls[1].options.headers['X-XSRF-TOKEN'], 'csrf=');
});

test('si falla CSRF no intenta POST ni confirma cierre', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 500 }); };
    await assert.rejects(cerrarSesion(), /No fue posible preparar el cierre/);
    assert.equal(calls, 1);
});

for (const status of [401, 419, 500]) {
    test(`logout HTTP ${status} sin JSON rechaza en vez de confirmar`, async () => {
        globalThis.document = { cookie: 'XSRF-TOKEN=csrf' };
        globalThis.fetch = async (url) => url === '/sanctum/csrf-cookie'
            ? new Response(null, { status: 204 })
            : new Response('Error', { status });
        await assert.rejects(cerrarSesion(), (error) => error.status === status && error.message === 'Error al cerrar sesión.');
    });
}

test('un fallo de red durante el POST no confirma cierre', async () => {
    globalThis.document = { cookie: 'XSRF-TOKEN=csrf' };
    globalThis.fetch = async (url) => {
        if (url === '/sanctum/csrf-cookie') return new Response(null, { status: 204 });
        throw new TypeError('Network unavailable');
    };
    await assert.rejects(cerrarSesion(), /Network unavailable/);
});
