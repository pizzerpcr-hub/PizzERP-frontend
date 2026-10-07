import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/pages/ModulePage.css", import.meta.url), "utf8");
const tarjetas = css.slice(css.indexOf("@media (max-width: 1100px)"));

test("las tarjetas anulan los porcentajes de columnas sin cambiar la tabla de escritorio", () => {
    const selector = ".module-page .management-table .management-card > td";
    assert.ok(css.indexOf(selector) > css.indexOf("@media (max-width: 1100px)"));
    assert.match(tarjetas, /\.module-page \.management-table \.management-card > td\s*\{\s*width: auto;\s*max-width: none;\s*word-break: normal;\s*overflow-wrap: break-word;/);
});

test("productos y vigencia de Combos aprovechan toda la tarjeta", () => {
    assert.match(tarjetas, /\.module-page\.combos-page \.management-card > td:nth-child\(3\),\s*\.module-page\.combos-page \.management-card > td:nth-child\(5\)\s*\{\s*grid-column: 1 \/ -1;/);
    const jsx = readFileSync(new URL("../src/pages/Promociones/Promociones.jsx", import.meta.url), "utf8");
    const campos = [...jsx.matchAll(/<td data-label="([^"]+)"/g)].map(match => match[1]);
    assert.equal(campos[2], "Productos");
    assert.equal(campos[4], "Vigencia");
});

test("los teléfonos usan una columna; las tabletas conservan dos", () => {
    assert.match(tarjetas, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(css, /@media \(max-width: 600px\)\s*\{\s*\.module-page \.management-table \.management-card \{ grid-template-columns: 1fr; \}/);
});
