import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, UsuariosTable, UsuarioFormBase;
before(async () => {
    server = await createServer({ configFile: false, envDir: false, cacheDir: "node_modules/.vite-users-actions-test", plugins: [react()], server: { middlewareMode: true, ws: false } });
    UsuariosTable = (await server.ssrLoadModule("/src/components/TablaUsuarios/UsuariosTable.jsx")).default;
    UsuarioFormBase = (await server.ssrLoadModule("/src/components/forms/UsuarioFormBase.jsx")).default;
});
after(async () => { await server?.close(); });

const tabla = (props = {}) => renderToStaticMarkup(createElement(UsuariosTable, {
    usuarios: [{ id_usuario: 2, nombre_completo: "Cuenta de prueba", nombre_usuario: "PRUEBA", rol: "CAJA", estado: "ACTIVO" }],
    usuariosPendientes: new Set(), onEditar: () => {}, onCambiarEstado: () => {}, ...props,
}));

test("permiso confirmado muestra Modificar aunque el catálogo siga pendiente", () => {
    const html = tabla({ puedeEditar: true, edicionDisponible: false, estadoCatalogoRoles: "cargando" });
    assert.doesNotMatch(html, /disabled=""/);
    assert.match(html, /Modificar/);
    assert.doesNotMatch(html, /Cargando roles…/);
    assert.match(html, /Desactivar/);
});

test("el catálogo listo conserva el texto simple de Modificar", () => {
    const html = tabla({ puedeEditar: true, edicionDisponible: true });
    assert.doesNotMatch(html, /disabled=""/);
    assert.doesNotMatch(html, /user-edit-availability/);
    assert.match(html, /Modificar/);
});

test("datos disponibles nunca habilitan una acción sin permiso", () => {
    const html = tabla({ puedeEditar: false, edicionDisponible: true, puedeCambiarEstado: () => false });
    assert.doesNotMatch(html, /Modificar|Activar|Desactivar|<button/);
});

test("fallo del catálogo no impide abrir el formulario", () => {
    const html = tabla({ puedeEditar: true, edicionDisponible: false, estadoCatalogoRoles: "error" });
    assert.doesNotMatch(html, /disabled=""/);
    assert.match(html, /Modificar/);
    assert.doesNotMatch(html, /Cargando roles…/);
});

const formulario = (props = {}) => renderToStaticMarkup(createElement(UsuarioFormBase, {
    usuarioInicial: { nombre_completo: "Cuenta de prueba", nombre_usuario: "PRUEBA", rol: "CAJA" },
    textoGuardar: "Guardar cambios", onSubmit: () => {}, onClose: () => {}, ...props,
}));

test("formulario abre con datos precargados y bloquea guardar durante carga lenta", () => {
    const html = formulario({ estadoCatalogoRoles: "cargando" });
    assert.match(html, /value="Cuenta de prueba"/);
    assert.match(html, /value="PRUEBA"/);
    assert.match(html, /<select[^>]*disabled=""[^>]*aria-busy="true"/);
    assert.match(html, /Cargando roles…/);
    assert.match(html, /type="submit" disabled=""/);
    assert.doesNotMatch(html, /inactivo; selecciona otro/);
});

test("error del catálogo conserva los datos y ofrece reintento sin permitir guardar", () => {
    const html = formulario({ estadoCatalogoRoles: "error" });
    assert.match(html, /No fue posible cargar los roles/);
    assert.match(html, /Reintentar/);
    assert.match(html, /type="submit" disabled=""/);
    assert.match(html, /value="PRUEBA"/);
});

test("roles disponibles permiten guardar y una actualización no borra las opciones", () => {
    const rolesDisponibles = [{ nombre: "CAJA" }];
    assert.doesNotMatch(formulario({ rolesDisponibles }), /type="submit" disabled=""/);
    const html = formulario({ rolesDisponibles, estadoCatalogoRoles: "cargando" });
    assert.match(html, /value="CAJA" selected=""/);
    assert.match(html, /type="submit" disabled=""/);
});

test("una mutación pendiente mantiene ambas acciones deshabilitadas", () => {
    const html = tabla({ usuariosPendientes: new Set(["2"]) });
    assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
});
