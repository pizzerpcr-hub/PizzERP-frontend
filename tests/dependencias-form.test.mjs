import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, ProductoForm, ComboForm, UsuarioForm, CategoriaForm, Productos, categoryHooks;
before(async () => {
    server = await createServer({ configFile: false, envDir: false, cacheDir: "node_modules/.vite-dependencias-test", plugins: [
        {
            name: "category-validation-test-hooks",
            transform(source, id) {
                if (id.replaceAll("\\", "/").endsWith("/pages/Productos/Productos.jsx")) {
                    return source.replace('from "react"', 'from "virtual:category-test-hooks"')
                        .replace('from "../../context/useAuth.js"', 'from "virtual:product-page-test"')
                        .replace('from "../../hooks/useListaSesion.js"', 'from "virtual:product-page-test"')
                        .replace('from "../../hooks/useTablaPaginada.js"', 'from "virtual:product-page-test"');
                }
                if (["/CategoriaForm/CategoriaForm.jsx", "/ProductoForm/ProductoForm.jsx"].some(path => id.replaceAll("\\", "/").endsWith(path))) {
                    return source.replace('from "react"', 'from "virtual:category-test-hooks"');
                }
            },
            resolveId(id) { if (["virtual:category-test-hooks", "virtual:product-page-test"].includes(id)) return "\0" + id; },
            load(id) {
                if (id === "\0virtual:product-page-test") return `
                    export const useAuth = () => ({ usuario: { permisos: { productos: { ver: true } } } });
                    export const useBusquedaLista = () => ['', () => {}];
                    export const useListaSesion = () => ({ datos: [], disponible: true, cargaCompleta: true, cargando: false, recargar: () => {} });
                    export const useTablaPaginada = () => ({ datos: [
                        { id_producto: 1, codigo_producto: 'PIZ-001', nombre: 'Pizza', precio: '2000.00', tamano: 'personal', estado: 'ACTIVO' },
                        { id_producto: 2, codigo_producto: 'BEB-001', nombre: 'Bebida', precio: '500.00', tamano: '', estado: 'ACTIVO' }
                    ], paginacion: null, cargando: false, recargar: () => {} });
                `;
                if (id !== "\0virtual:category-test-hooks") return;
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
        }, react(),
    ], server: { middlewareMode: true, ws: false } });
    ProductoForm = (await server.ssrLoadModule("/src/components/forms/ProductoForm/ProductoForm.jsx")).default;
    ComboForm = (await server.ssrLoadModule("/src/components/forms/ComboForm/ComboForm.jsx")).default;
    UsuarioForm = (await server.ssrLoadModule("/src/components/forms/UsuarioFormBase.jsx")).default;
    CategoriaForm = (await server.ssrLoadModule("/src/components/forms/CategoriaForm/CategoriaForm.jsx")).default;
    categoryHooks = await server.ssrLoadModule("virtual:category-test-hooks");
    Productos = (await server.ssrLoadModule("/src/pages/Productos/Productos.jsx")).default;
});
after(async () => { await server?.close(); });
const render = (component, props) => {
    if (component === ProductoForm) {
        categoryHooks.reset();
        return renderToStaticMarkup(categoryHooks.render(component, props));
    }
    return renderToStaticMarkup(createElement(component, props));
};

const findElements = (element, predicate) => {
    if (!element || typeof element !== "object") return [];
    return [...(predicate(element) ? [element] : []),
        ...[element.props?.children].flat(Infinity).flatMap(child => findElements(child, predicate))];
};

test("listado muestra Tamaño como campo independiente después de Precio y No aplica cuando está vacío", () => {
    categoryHooks.reset();
    const tree = categoryHooks.render(Productos, {});
    const rows = findElements(tree, element => element.type === "tr" && element.props.className === "management-card");
    assert.equal(rows.length, 2);
    const price = findElements(rows[0], element => element.props?.["data-label"] === "Precio")[0];
    const html = renderToStaticMarkup(price);
    assert.match(html, /<strong>₡2\s000,00<\/strong>/);
    assert.doesNotMatch(html, /Personal|productos-price-size/);
    assert.deepEqual(findElements(rows[0], element => element.type === "td").map(element => element.props["data-label"]),
        ["Código", "Producto", "Categoría", "Precio", "Tamaño", "Estado", "Acciones"]);
    const size = findElements(rows[0], element => element.props?.["data-label"] === "Tamaño")[0];
    assert.match(renderToStaticMarkup(size), /<span class="productos-status">Personal<\/span>/);
    assert.equal(findElements(tree, element => element.type === "th").length, 7);
    const name = findElements(rows[0], element => element.props?.["data-label"] === "Producto")[0];
    assert.doesNotMatch(renderToStaticMarkup(name), /Personal|personal|Tamaño/);
    const plain = findElements(rows[1], element => element.props?.["data-label"] === "Tamaño")[0];
    assert.match(renderToStaticMarkup(plain), /<span class="productos-status">No aplica<\/span>/);
});

const abrirReceta = (ingredientesGuardados) => {
    categoryHooks.reset();
    let enviado;
    const props = {
        categorias: [{ id_categoria: 1, nombre: "Pizzas" }],
        ingredientesDisponibles: [
            { id_ingrediente: 1, nombre: "Harina", unidad_medida: "kg" },
            { id_ingrediente: 2, nombre: "Azúcar", unidad_medida: "g" },
            { id_ingrediente: 3, nombre: "Agua", unidad_medida: "l" },
            { id_ingrediente: 4, nombre: "Huevos", unidad_medida: "u" },
        ],
        ...(ingredientesGuardados ? { producto: { nombre: "Pizza", descripcion: "Receta", id_categoria: 1,
            precio: "20.00", estado: "ACTIVO", ingredientes: ingredientesGuardados } } : {}),
        onGuardar: async datos => { enviado = datos; },
    };
    const tree = () => categoryHooks.render(ProductoForm, props);
    const field = name => findElements(tree(), element => element.props?.name === name)[0];
    const cambiar = (name, value) => field(name).props.onChange({ target: { value } });
    const guardar = async () => {
        await findElements(tree(), element => element.type === "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: { elements: [] } });
        return enviado;
    };
    return { tree, field, cambiar, guardar };
};

test("fila nueva selecciona g para ingrediente g/kg y conserva kg como opción", () => {
    for (const id of ["1", "2"]) {
        const form = abrirReceta();
        form.cambiar("ingredientes.0.id_ingrediente", id);
        assert.equal(form.field("ingredientes.0.unidad_medida").props.value, "g");
        assert.equal(form.field("ingredientes.0.cantidad_requerida").props.value, "1");
        assert.deepEqual(findElements(form.field("ingredientes.0.unidad_medida"), element => element.type === "option")
            .map(element => element.props.value), ["g", "kg"]);
    }
    for (const [id, unidad] of [["3", "l"], ["4", "u"]]) {
        const form = abrirReceta();
        form.cambiar("ingredientes.0.id_ingrediente", id);
        assert.equal(form.field("ingredientes.0.unidad_medida").props.value, unidad);
    }
});

test("edición conserva unidad y cantidad guardadas también en el payload", async () => {
    for (const [unidad, cantidad] of [["kg", "1.00"], ["g", "250.00"]]) {
        const form = abrirReceta([{ id_ingrediente: 1, unidad_medida: "kg", pivot: { unidad_medida: unidad, cantidad_requerida: cantidad } }]);
        assert.equal(form.field("ingredientes.0.unidad_medida").props.value, unidad);
        assert.equal(form.field("ingredientes.0.cantidad_requerida").props.value, cantidad);
        const payload = await form.guardar();
        assert.deepEqual(payload.ingredientes, [{ id_ingrediente: 1, unidad_medida: unidad, cantidad_requerida: cantidad }]);
    }
});

test("cambio kg/g convierte exactamente: 1 kg equivale a 1000 g, nunca a 1 g", () => {
    const form = abrirReceta([{ id_ingrediente: 1, unidad_medida: "kg", pivot: { unidad_medida: "kg", cantidad_requerida: "1.00" } }]);
    form.cambiar("ingredientes.0.unidad_medida", "g");
    assert.equal(form.field("ingredientes.0.cantidad_requerida").props.value, "1000.00");
    form.cambiar("ingredientes.0.unidad_medida", "kg");
    assert.equal(form.field("ingredientes.0.cantidad_requerida").props.value, "1.00");
    form.cambiar("ingredientes.0.id_ingrediente", "2");
    assert.equal(form.field("ingredientes.0.unidad_medida").props.value, "kg");
    assert.equal(form.field("ingredientes.0.cantidad_requerida").props.value, "1.00");
});

test("cambio de ingrediente incompatible exige cantidad nueva y conversiones no representables no redondean", () => {
    const form = abrirReceta([{ id_ingrediente: 1, unidad_medida: "kg", pivot: { unidad_medida: "g", cantidad_requerida: "1.00" } }]);
    form.cambiar("ingredientes.0.unidad_medida", "kg");
    assert.equal(form.field("ingredientes.0.unidad_medida").props.value, "g");
    assert.equal(form.field("ingredientes.0.cantidad_requerida").props.value, "1.00");
    assert.match(renderToStaticMarkup(form.tree()), /No se puede convertir esta cantidad exactamente/);
    form.cambiar("ingredientes.0.id_ingrediente", "3");
    assert.equal(form.field("ingredientes.0.unidad_medida").props.value, "l");
    assert.equal(form.field("ingredientes.0.cantidad_requerida").props.value, "");
    assert.match(renderToStaticMarkup(form.tree()), /Ingresa la cantidad en la nueva unidad/);
});

test("producto con tamaño se reabre, edita precio y conserva valores ante duplicado 422", async () => {
    categoryHooks.reset();
    let payload;
    let cierres = 0;
    const props = {
        categorias: [{ id_categoria: 1, nombre: "Categoría editable" }],
        producto: { id_producto: 5, id_categoria: 1, nombre: "Pizza", descripcion: "Receta", precio: "25.00",
            tamano: "mediana", estado: "ACTIVO", ingredientes: [{ id_ingrediente: 1, nombre: "Harina", unidad_medida: "kg",
                pivot: { cantidad_requerida: "250.00", unidad_medida: "g" } }], codigo_producto: "PIZ-005" },
        onCerrar: () => { cierres++; },
        onGuardar: async datos => {
            payload = datos;
            throw Object.assign(new Error("Duplicado"), { status: 422, errors: { nombre: ["Ya existe un producto con ese nombre y tamaño."] } });
        },
    };
    const tree = () => categoryHooks.render(ProductoForm, props);
    const field = name => findElements(tree(), element => element.props?.name === name)[0];
    assert.equal(field("tamano").props.value, "mediana");
    assert.equal(field("precio").props.value, "25.00");
    const opciones = findElements(field("tamano"), element => element.type === "option").map(element => element.props.value);
    assert.deepEqual(opciones, ["", "personal", "mediana", "grande", "familiar"]);
    field("tamano").props.onChange({ target: { value: "familiar" } });
    field("precio").props.onChange({ target: { value: "40.00" } });
    field("motivo").props.onChange({ target: { value: "Cambio de tamaño y precio" } });
    // Esta prueba ejercita el rechazo del servidor, no la validación nativa del navegador.
    await findElements(tree(), element => element.type === "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: { elements: [] } });
    assert.equal(payload.tamano, "familiar");
    assert.equal(payload.precio, "40.00");
    assert.equal(payload.nombre, "Pizza");
    assert.equal(payload.descripcion, "Receta");
    assert.equal(payload.id_categoria, 1);
    assert.equal(payload.estado, "ACTIVO");
    assert.equal(payload.motivo, "Cambio de tamaño y precio");
    assert.deepEqual(payload.ingredientes, [{ id_ingrediente: 1, cantidad_requerida: "250.00", unidad_medida: "g" }]);
    assert.ok(renderToStaticMarkup(tree()).includes('role="alert">Ya existe un producto con ese nombre y tamaño.</span>'));
    assert.equal(field("tamano").props.value, "familiar");
    assert.equal(field("precio").props.value, "40.00");
    assert.equal(field("nombre").props.value, "Pizza");
    assert.equal(field("descripcion").props.value, "Receta");
    assert.equal(field("motivo").props.value, "Cambio de tamaño y precio");
    assert.equal(field("ingredientes.0.cantidad_requerida").props.value, "250.00");
    assert.equal(field("ingredientes.0.unidad_medida").props.value, "g");
    assert.equal(cierres, 0);
    const reopen = render(ProductoForm, { ...props, producto: { ...props.producto, tamano: "familiar", precio: "40.00" } });
    assert.match(reopen, /value="familiar" selected/);
    assert.match(reopen, /value="40.00"/);
});

test("producto existente sin tamaño no recibe una variante ni un precio inventados", () => {
    const html = render(ProductoForm, {
        categorias: [{ id_categoria: 1, nombre: "Pizzas" }],
        producto: { nombre: "Pizza antigua", descripcion: "Existente", precio: "73.25", id_categoria: 1, estado: "ACTIVO", ingredientes: [] },
    });
    assert.match(html, /value="" selected="">No aplica/);
    assert.match(html, /value="73.25"/);
});

test("combo distingue tamaños sin cambiar los identificadores de sus opciones", () => {
    const html = render(ComboForm, {
        productosDisponibles: [
            { id_producto: 1, codigo_producto: "PIZ-001", nombre: "Pizza", tamano: "personal" },
            { id_producto: 2, codigo_producto: "PIZ-002", nombre: "Pizza", tamano: "familiar" },
        ],
    });
    assert.match(html, /<option value="1">PIZ-001 · Pizza · personal<\/option>/);
    assert.match(html, /<option value="2">PIZ-002 · Pizza · familiar<\/option>/);
});

for (const [name, message] of [
    ["nombre", "Ingresa el nombre del producto."],
    ["descripcion", "Ingresa la descripción del producto."],
    ["id_categoria", "Selecciona una categoría."],
    ["precio", "Ingresa el precio del producto."],
]) {
    test(`producto: ${name} vacío muestra su aviso sin guardar ni cerrar`, async () => {
        categoryHooks.reset();
        let envios = 0, cierres = 0;
        const props = {
            categorias: [{ id_categoria: 1, nombre: "Pizzas" }],
            onGuardar: async () => { envios++; }, onCerrar: () => { cierres++; },
        };
        const tree = () => categoryHooks.render(ProductoForm, props);
        for (const [field, value] of [["nombre", "Pizza"], ["descripcion", "Pizza artesanal"], ["id_categoria", "1"], ["precio", "10.00"]]) {
            findElements(tree(), element => element.props?.name === field)[0].props.onChange({ target: { value } });
        }
        findElements(tree(), element => element.props?.name === name)[0].props.onChange({ target: { value: "" } });
        const form = findElements(tree(), element => element.type === "form")[0];
        const elements = findElements(form, element => ["input", "textarea", "select"].includes(element.type))
            .map(({ props: field }) => ({
                name: field.name, value: String(field.value ?? ""), required: field.required, disabled: field.disabled,
                dataset: { mensajeObligatorio: field["data-mensaje-obligatorio"] },
                validity: { badInput: false }, checkValidity: () => !field.required || Boolean(String(field.value ?? "").trim()),
            }));
        await form.props.onSubmit({ preventDefault() {}, currentTarget: { elements } });
        const html = renderToStaticMarkup(tree());
        assert.ok(html.includes(`class="required-field-message" role="alert">${message}</span>`));
        assert.match(html, /<dialog/);
        assert.deepEqual({ envios, cierres }, { envios: 0, cierres: 0 });
    });
}

for (const conDatos of [false, true]) {
    test(`categoría con nombre vacío renderiza ${conDatos ? "error del campo" : "aviso general"} sin guardar ni cerrar`, async () => {
        categoryHooks.reset();
        let envios = 0, cierres = 0;
        const props = { onGuardar: async () => { envios++; }, onCerrar: () => { cierres++; } };
        const tree = () => categoryHooks.render(CategoriaForm, props);
        if (conDatos) {
            for (const [name, value] of [["codigo_categoria", "PIZ"], ["descripcion", "Pizzas artesanales"]]) {
                findElements(tree(), element => element.props?.name === name)[0].props.onChange({ target: { value } });
            }
        }
        const form = findElements(tree(), element => element.type === "form")[0];
        // Simula únicamente campos vacíos; el validador y el JSX son los reales.
        const elements = findElements(form, element => ["input", "textarea", "select"].includes(element.type))
            .map(({ props: field }) => ({
                name: field.name, value: field.value, required: field.required,
                dataset: { mensajeObligatorio: field["data-mensaje-obligatorio"] },
                validity: { badInput: false }, checkValidity: () => !field.required || Boolean(field.value?.trim()),
            }));
        await form.props.onSubmit({ preventDefault() {}, currentTarget: { elements } });
        const html = renderToStaticMarkup(tree());
        assert.match(html, conDatos
            ? /class="required-field-message" role="alert">Ingresa el nombre de la categoría\.<\/small>/
            : /class="required-fields-hint error" role="alert">Completa los campos obligatorios\./);
        assert.match(html, /role="dialog"/);
        assert.deepEqual({ envios, cierres }, { envios: 0, cierres: 0 });
    });
}

test("registro de producto renderiza las categorías del catálogo activo sin opción inactiva heredada", () => {
    const html = render(ProductoForm, {
        categorias: [{ id_categoria: 1, codigo_categoria: "PIZ", nombre: "Pizzas" }],
        categoriasDisponibles: true, categoriasCargadas: true,
    });
    assert.match(html, /<option value="1">PIZ · Pizzas<\/option>/);
    assert.doesNotMatch(html, /inactiva; seleccione otra/);
});

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
