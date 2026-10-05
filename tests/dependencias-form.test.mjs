import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, ProductoForm, ComboForm, UsuarioForm;
before(async () => {
    server = await createServer({ configFile: false, envDir: false, cacheDir: "node_modules/.vite-dependencias-test", plugins: [react()], server: { middlewareMode: true, ws: false } });
    ProductoForm = (await server.ssrLoadModule("/src/components/forms/ProductoForm/ProductoForm.jsx")).default;
    ComboForm = (await server.ssrLoadModule("/src/components/forms/ComboForm/ComboForm.jsx")).default;
    UsuarioForm = (await server.ssrLoadModule("/src/components/forms/UsuarioFormBase.jsx")).default;
});
after(async () => { await server?.close(); });
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("categorías pendiente, vacío confirmado y error no se confunden", () => {
    const pendiente = render(ProductoForm, { categorias: [], categoriasDisponibles: false });
    assert.match(pendiente, /Cargando categorías/);
    assert.doesNotMatch(pendiente, /Necesitas una categoría activa/);
    assert.match(pendiente, /type="submit"[^>]*disabled/);
    assert.doesNotMatch(render(ProductoForm, { categorias: [], categoriasDisponibles: true, categoriasCargadas: false }), /Necesitas una categoría activa/);
    assert.match(render(ProductoForm, { categorias: [], categoriasDisponibles: true, categoriasCargadas: true }), /Necesitas una categoría activa/);
    assert.doesNotMatch(render(ProductoForm, { categorias: [{ id_categoria: 1, nombre: "Pizzas" }], categoriasCargadas: true }), /Necesitas una categoría activa/);
    const error = render(ProductoForm, { categorias: [], categoriasDisponibles: false, errorCategorias: "Red no disponible" });
    assert.match(error, /Red no disponible.*Reintentar/);
    assert.doesNotMatch(error, /Necesitas una categoría activa|Cargando categorías/);
});

test("productos de combo pendiente, vacío y error tienen mensajes distintos y bloquean guardar", () => {
    const pendiente = render(ComboForm, { catalogoDisponible: false });
    assert.match(pendiente, /Cargando productos/);
    assert.doesNotMatch(pendiente, /Registra al menos/);
    assert.match(pendiente, /type="submit"[^>]*disabled/);
    assert.match(render(ComboForm, {}), /Registra al menos dos productos/);
    const error = render(ComboForm, { catalogoDisponible: false, errorProductos: "Red no disponible" });
    assert.match(error, /Red no disponible.*Reintentar/);
    assert.doesNotMatch(error, /Registra al menos|Cargando productos/);
});

test("catálogos válidos conservan opciones y guardado ante error de actualización", () => {
    const producto = render(ProductoForm, { categorias: [{ id_categoria: 1, nombre: "Pizzas" }], categoriasDisponibles: true, errorCategorias: "Red no disponible" });
    assert.match(producto, /Pizzas/);
    assert.doesNotMatch(producto, /type="submit"[^>]*disabled/);
    const usuario = render(UsuarioForm, { rolesDisponibles: [{ nombre: "GESTOR" }], estadoCatalogoRoles: "listo", errorCatalogoRoles: "Red no disponible" });
    assert.match(usuario, /GESTOR/);
    assert.match(usuario, /No fue posible cargar los roles/);
    assert.doesNotMatch(usuario, /type="submit"[^>]*disabled/);
});
