import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";

let server, ComboForm, hooks;
before(async () => {
    // Estado síncrono de prueba: ejecuta los manejadores reales y renderiza su JSX,
    // sin navegador, peticiones HTTP ni cambios en el componente de producción.
    server = await createServer({
        configFile: false, envDir: false,
        cacheDir: "node_modules/.vite-combo-errors-test",
        server: { middlewareMode: true, ws: false },
        plugins: [{
            name: "combo-form-test-hooks",
            transform(source, id) {
                if (!id.replaceAll("\\", "/").endsWith("/ComboForm/ComboForm.jsx")) return;
                return source.replace('from "react"', 'from "virtual:combo-test-hooks"');
            },
            resolveId(id) { if (id === "virtual:combo-test-hooks") return "\0" + id; },
            load(id) {
                if (id !== "\0virtual:combo-test-hooks") return;
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
        }],
    });
    ComboForm = (await server.ssrLoadModule("/src/components/forms/ComboForm/ComboForm.jsx")).default;
    hooks = await server.ssrLoadModule("virtual:combo-test-hooks");
});
after(async () => { await server?.close(); });

const find = (element, predicate) => {
    if (!element || typeof element !== "object") return;
    if (predicate(element)) return element;
    for (const child of [element.props?.children].flat(Infinity)) {
        const found = find(child, predicate);
        if (found) return found;
    }
};

const abrir = (props) => {
    hooks.reset();
    const render = () => hooks.render(ComboForm, props);
    const cambiar = (id, value) => {
        const field = find(render(), element => element.props?.id === id || element.props?.name === id);
        assert.ok(field, `Campo ${id} presente`);
        field.props.onChange({ target: { value } });
    };
    cambiar("codigoCombo", "COM-RECHAZADO");
    cambiar("nombreCombo", "Combo ingresado");
    cambiar("descripcionCombo", "Descripción que debe conservarse");
    cambiar("precioCombo", "123.45");
    cambiar("fechaInicio", "2026-10-10");
    cambiar("fechaFin", "2026-11-10");
    cambiar("productos.0.id_producto", "1");
    cambiar("productos.0.cantidad", "3");
    cambiar("productos.1.id_producto", "2");
    cambiar("productos.1.cantidad", "4");
    return { render, cambiar };
};

const submit = async render => {
    // La validez de campos nativos no es objeto de estas pruebas de rechazo 422.
    const form = find(render(), element => element.type === "form");
    await form.props.onSubmit({ preventDefault() {}, currentTarget: { elements: [] } });
};

for (const modo of ["crear", "editar"]) {
    test(`${modo}: producto desactivado tras abrir muestra error raíz, conserva filas y permite reintentar`, async () => {
        let activo = true, cierres = 0, solicitudes = 0;
        const esperado = "El combo requiere al menos dos productos distintos, existentes y activos.";
        const props = {
            productosDisponibles: [{ id_producto: 1, nombre: "Pizza" }, { id_producto: 2, nombre: "Bebida" }],
            onCerrar: () => { cierres++; },
            onGuardar: async datos => {
                solicitudes++;
                assert.equal(datos.nombre, "Combo ingresado");
                assert.equal(datos.descripcion, "Descripción que debe conservarse");
                assert.equal(datos.precio, "123.45");
                assert.equal(datos.fecha_inicio, "2026-10-10");
                assert.equal(datos.fecha_fin, "2026-11-10");
                assert.deepEqual(datos.productos, [{ id_producto: 1, cantidad: 3 }, { id_producto: 2, cantidad: 4 }]);
                if (modo === "editar") assert.equal(datos.motivo, "Ajuste ingresado");
                if (!activo) throw Object.assign(new Error(esperado), { status: 422, errors: { productos: [esperado] } });
            },
            ...(modo === "editar" ? { combo: {
                codigo_combo: "COM-ANTERIOR", nombre: "Anterior", descripcion: "Anterior", precio: "10.00", estado: "ACTIVO",
                fecha_inicio: "2026-01-01", fecha_fin: "2026-12-31",
                productos: [{ id_producto: 1, cantidad: 1 }, { id_producto: 2, cantidad: 1 }],
            } } : {}),
        };
        const { render, cambiar } = abrir(props);
        if (modo === "editar") cambiar("motivoCombo", "Ajuste ingresado");
        assert.doesNotMatch(renderToStaticMarkup(render()), /El combo requiere/);
        activo = false; // Cambio remoto: el catálogo abierto conserva sus opciones antiguas.
        await submit(render);
        const html = renderToStaticMarkup(render());
        assert.match(html, /class="required-field-message" role="alert">El combo requiere/);
        assert.match(html, /class="modal-overlay open"/);
        assert.equal(cierres, 0);
        for (const [id, value] of [["codigoCombo", "COM-RECHAZADO"], ["nombreCombo", "Combo ingresado"],
            ["descripcionCombo", "Descripción que debe conservarse"], ["precioCombo", "123.45"],
            ["fechaInicio", "2026-10-10"], ["fechaFin", "2026-11-10"],
            ["productos.0.id_producto", "1"], ["productos.0.cantidad", "3"],
            ["productos.1.id_producto", "2"], ["productos.1.cantidad", "4"]]) {
            assert.equal(find(render(), element => element.props?.id === id || element.props?.name === id).props.value, value);
        }
        const button = find(render(), element => element.type === "button" && element.props.type === "submit");
        assert.equal(button.props.disabled, false);
        activo = true;
        await submit(render);
        assert.equal(solicitudes, 2);
    });
}

test("422 renderiza descripción, productos y errores por fila juntos sin borrar los datos", async () => {
    const errores = {
        descripcion: ["La descripción no es válida."], productos: ["Revise los productos incluidos."],
        "productos.0.id_producto": ["El producto seleccionado no existe."],
        "productos.1.cantidad": ["La cantidad no es válida."],
    };
    let cierres = 0;
    const { render, cambiar } = abrir({
        productosDisponibles: [{ id_producto: 1 }, { id_producto: 2 }],
        onCerrar: () => { cierres++; },
        onGuardar: async () => { throw Object.assign(new Error("Datos inválidos"), { status: 422, errors: errores }); },
    });
    await submit(render);
    const html = renderToStaticMarkup(render());
    for (const [mensaje] of Object.values(errores)) {
        assert.ok(html.includes(`class="required-field-message" role="alert">${mensaje}</p>`), mensaje);
    }
    assert.equal(find(render(), element => element.props?.id === "descripcionCombo").props["aria-invalid"], true);
    assert.equal(find(render(), element => element.props?.id === "descripcionCombo").props.value, "Descripción que debe conservarse");
    assert.equal(cierres, 0);
    cambiar("descripcionCombo", "Descripción corregida");
    assert.doesNotMatch(renderToStaticMarkup(render()), /La descripción no es válida/);
    assert.match(renderToStaticMarkup(render()), /Revise los productos incluidos/);
});

test("código duplicado 422 muestra el mensaje recibido y conserva el formulario completo", async () => {
    const mensaje = "Ya existe un combo con ese código.";
    let cierres = 0;
    const { render } = abrir({
        productosDisponibles: [{ id_producto: 1 }, { id_producto: 2 }],
        onCerrar: () => { cierres++; },
        onGuardar: async () => {
            throw Object.assign(new Error(mensaje), { status: 422, errors: { codigo_combo: [mensaje] } });
        },
    });
    const valores = () => ["codigoCombo", "nombreCombo", "descripcionCombo", "precioCombo", "fechaInicio", "fechaFin",
        "productos.0.id_producto", "productos.0.cantidad", "productos.1.id_producto", "productos.1.cantidad"]
        .map(id => find(render(), element => element.props?.id === id || element.props?.name === id).props.value);
    const anteriores = valores();
    await submit(render);
    assert.ok(renderToStaticMarkup(render()).includes(`role="alert">${mensaje}</p>`));
    assert.match(renderToStaticMarkup(render()), /class="modal-overlay open"/);
    assert.deepEqual(valores(), anteriores);
    assert.equal(cierres, 0);
});

test("productos repetidos se rechazan localmente sin enviar ni cerrar el formulario", async () => {
    let solicitudes = 0, cierres = 0;
    const { render, cambiar } = abrir({
        productosDisponibles: [{ id_producto: 1 }, { id_producto: 2 }],
        onCerrar: () => { cierres++; },
        onGuardar: async () => { solicitudes++; },
    });
    cambiar("productos.1.id_producto", "1");
    await submit(render);
    assert.equal(solicitudes, 0);
    assert.equal(cierres, 0);
    assert.match(renderToStaticMarkup(render()), /Elegí al menos dos productos activos distintos/);
    assert.equal(find(render(), element => element.props?.id === "nombreCombo").props.value, "Combo ingresado");
});
