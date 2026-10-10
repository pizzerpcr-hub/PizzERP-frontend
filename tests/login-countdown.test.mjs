import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";

test("Login renderiza y reduce retry_after, impide enviar durante el bloqueo y libera el formulario al vencer", async () => {
    const originalWindow = globalThis.window;
    const originalNow = Date.now;
    let ahora = 1000000;
    const intervalos = new Map();
    let siguiente = 0;
    let server;
    try {
        Date.now = () => ahora;
        globalThis.window = {
            setInterval(callback) { intervalos.set(++siguiente, callback); return siguiente; },
            clearInterval(id) { intervalos.delete(id); },
        };
        server = await createServer({
            configFile: false, envDir: false,
            cacheDir: "node_modules/.vite-login-countdown-test",
            server: { middlewareMode: true, ws: false },
            plugins: [{
                name: "login-countdown-test-hooks",
                transform(source, id) {
                    if (!id.replaceAll("\\", "/").endsWith("/pages/Login/Login.jsx")) return;
                    return source.replace('from "react"', 'from "virtual:login-hooks"')
                        .replace('from "../../context/useAuth.js"', 'from "virtual:login-service"')
                        .replace('from "../../services/loginService.js"', 'from "virtual:login-service"');
                },
                resolveId(id) { if (id.startsWith("virtual:login-")) return "\0" + id; },
                load(id) {
                    if (id === "\0virtual:login-service") return `
                        export let solicitudes = 0;
                        export const useAuth = () => ({ usuario: null, cargandoSesion: false, iniciarSesion: async () => {} });
                        export async function iniciarSesion() {
                            if (++solicitudes === 1) throw Object.assign(new Error('Se alcanzó el limite de intentos.'), { retryAfter: 300 });
                            return { usuario: { id_usuario: 1 } };
                        }
                    `;
                    if (id !== "\0virtual:login-hooks") return;
                    return `
                        let state = [], cursor = 0, effects = [];
                        export const render = component => {
                            cursor = 0;
                            const result = component();
                            for (const effect of effects) if (effect?.pending) {
                                effect.cleanup?.(); effect.cleanup = effect.callback(); effect.pending = false;
                            }
                            return result;
                        };
                        export const dispose = () => effects.forEach(effect => effect?.cleanup?.());
                        export const useState = initial => {
                            const index = cursor++;
                            if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
                            return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
                        };
                        export const useRef = initial => useState(() => ({ current: initial }))[0];
                        export const useEffect = (callback, deps) => {
                            const index = cursor++, previous = effects[index];
                            if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
                                effects[index] = { callback, deps, cleanup: previous?.cleanup, pending: true };
                            }
                        };
                    `;
                },
            }],
        });
        const Login = (await server.ssrLoadModule("/src/pages/Login/Login.jsx")).default;
        const hooks = await server.ssrLoadModule("virtual:login-hooks");
        const service = await server.ssrLoadModule("virtual:login-service");
        const find = (element, predicate) => {
            if (!element || typeof element !== "object") return;
            if (predicate(element)) return element;
            for (const child of [element.props?.children].flat(Infinity)) {
                const found = find(child, predicate);
                if (found) return found;
            }
        };
        const render = () => hooks.render(Login);
        const form = () => find(render(), element => element.props?.formData);
        for (const [name, value] of [["username", "PRUEBA"], ["password", "Password123"]]) {
            form().props.onChange({ target: { name, value, type: "text" } });
        }
        await form().props.onSubmit({ preventDefault() {} });
        assert.match(renderToStaticMarkup(render()), /Podrás intentarlo nuevamente en 5:00/);
        assert.equal(form().props.bloqueado, true);
        assert.equal(intervalos.size, 1);
        ahora += 61000;
        for (const tick of intervalos.values()) tick();
        assert.match(renderToStaticMarkup(render()), /Podrás intentarlo nuevamente en 3:59/);
        await form().props.onSubmit({ preventDefault() {} });
        assert.equal(service.solicitudes, 1);
        ahora += 239000;
        for (const tick of intervalos.values()) tick();
        assert.doesNotMatch(renderToStaticMarkup(render()), /Podrás intentarlo nuevamente/);
        assert.equal(form().props.bloqueado, false);
        assert.equal(intervalos.size, 0);
        await form().props.onSubmit({ preventDefault() {} });
        assert.equal(service.solicitudes, 2);
        hooks.dispose();
    } finally {
        await server?.close();
        globalThis.window = originalWindow;
        Date.now = originalNow;
    }
});
