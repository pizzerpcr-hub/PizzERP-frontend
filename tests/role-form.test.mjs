import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, RolForm;
before(async () => {
    server = await createServer({ configFile: false, envDir: false, cacheDir: "node_modules/.vite-role-form-test", plugins: [react()], server: { middlewareMode: true, ws: false } });
    RolForm = (await server.ssrLoadModule("/src/components/forms/RolForm/RolForm.jsx")).default;
});
after(async () => { await server?.close(); });

for (const nombre of ["ADMINISTRADOR", "TI", "CAJA", "COCINA", "PERSONALIZADO"]) {
    test(`${nombre}: nombre y módulos son editables aunque tenga la marca histórica`, () => {
        const permisos = Object.fromEntries(["usuarios", "roles", "categorias", "productos", "ingredientes", "combos", "pedidos", "cocina"].map(modulo => [modulo, { crear: true, ver: true, editar: true, eliminar: true }]));
        const html = renderToStaticMarkup(createElement(RolForm, {
            rol: { id_rol: 1, nombre, es_sistema: true, permisos }, onGuardar: () => {}, onCerrar: () => {},
        }));
        assert.match(html, /id="nombreRol"/);
        assert.doesNotMatch(html, /readOnly|readonly|disabled=""|del sistema son fijos|permanecen activos/);
        assert.match(html, /Guardar cambios/);
    });
}
