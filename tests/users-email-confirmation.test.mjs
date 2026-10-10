import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

let server, UsuarioFormBase, hooks;

before(async () => {
    server = await createServer({
        configFile: false, envDir: false, cacheDir: "node_modules/.vite-users-email-test",
        plugins: [{
            name: "user-email-test-hooks",
            transform(source, id) {
                if (id.replaceAll("\\", "/").endsWith("/forms/UsuarioFormBase.jsx")) {
                    return source.replace('from "react"', 'from "virtual:user-email-test-hooks"');
                }
            },
            resolveId(id) { if (id === "virtual:user-email-test-hooks") return "\0" + id; },
            load(id) {
                if (id !== "\0virtual:user-email-test-hooks") return;
                return `
                    let state = [], cursor = 0;
                    export const reset = () => { state = []; cursor = 0; };
                    export const render = (component, props) => { cursor = 0; return component(props); };
                    export const useState = initial => {
                        const index = cursor++;
                        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
                        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
                    };
                    export const useRef = initial => useState(() => ({ current: initial }))[0];
                    export const useEffect = () => {};
                `;
            },
        }, react()],
        server: { middlewareMode: true, ws: false },
    });
    UsuarioFormBase = (await server.ssrLoadModule("/src/components/forms/UsuarioFormBase.jsx")).default;
    hooks = await server.ssrLoadModule("virtual:user-email-test-hooks");
});

after(async () => { await server?.close(); });

const buscar = (elemento, condicion) => {
    if (!elemento || typeof elemento !== "object") return [];
    return [...(condicion(elemento) ? [elemento] : []),
        ...[elemento.props?.children].flat(Infinity).flatMap(hijo => buscar(hijo, condicion))];
};

test("correo vacío de Administrador exige aceptar el aviso antes de guardar", async () => {
    hooks.reset();
    const enviados = [];
    const props = {
        rolesDisponibles: [{ nombre: "ADMINISTRADOR" }], contrasenaObligatoria: true,
        onSubmit: async datos => { enviados.push(datos); }, onClose: () => {},
    };
    const render = () => hooks.render(UsuarioFormBase, props);
    const cambiar = (name, value) => {
        const input = buscar(render(), elemento => elemento.props?.name === name)[0];
        input.props.onChange({ target: { name, value } });
    };
    cambiar("nombre_completo", "Administradora");
    cambiar("nombre_usuario", "ADMIN");
    cambiar("contrasena", "Password123");
    cambiar("confirmar_contrasena", "Password123");
    cambiar("rol", "ADMINISTRADOR");

    const guardar = async () => {
        await buscar(render(), elemento => elemento.type === "form")[0]
            .props.onSubmit({ preventDefault() {} });
    };
    await guardar();
    assert.equal(enviados.length, 0);
    const aviso = () => buscar(render(), elemento => elemento.props?.["aria-labelledby"] === "emailConfirmationTitle")[0];
    assert.ok(aviso());
    assert.match(JSON.stringify(aviso()), /no podrá recibir notificaciones ni alertas por correo electrónico/);

    buscar(aviso(), elemento => elemento.type === "button" && elemento.props.children === "Cancelar")[0].props.onClick();
    assert.equal(aviso(), undefined);
    assert.equal(enviados.length, 0);

    await guardar();
    buscar(aviso(), elemento => elemento.type === "button" && elemento.props.children === "Aceptar")[0].props.onClick();
    await Promise.resolve();
    assert.equal(enviados.length, 1);
    assert.equal(enviados[0].correo_electronico, null);
});
