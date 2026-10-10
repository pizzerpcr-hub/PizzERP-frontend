import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";

let server, IngredienteForm, hooks;
before(async () => {
    // Solo se simula el estado React; se ejecutan el formulario y su validador reales.
    server = await createServer({
        configFile: false, envDir: false,
        cacheDir: "node_modules/.vite-ingredient-validation-test",
        server: { middlewareMode: true, ws: false },
        plugins: [{
            name: "ingredient-form-test-hooks",
            transform(source, id) {
                if (!id.replaceAll("\\", "/").endsWith("/IngredienteForm/IngredienteForm.jsx")) return;
                return source.replace('from "react"', 'from "virtual:ingredient-test-hooks"');
            },
            resolveId(id) { if (id === "virtual:ingredient-test-hooks") return "\0" + id; },
            load(id) {
                if (id !== "\0virtual:ingredient-test-hooks") return;
                return `
                    let state = [], cursor = 0;
                    export const reset = () => { state = []; cursor = 0; };
                    export const render = (component, props) => { cursor = 0; return component(props); };
                    export const useState = initial => {
                        const index = cursor++;
                        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
                        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
                    };
                `;
            },
        }],
    });
    IngredienteForm = (await server.ssrLoadModule("/src/components/forms/IngredienteForm/IngredienteForm.jsx")).default;
    hooks = await server.ssrLoadModule("virtual:ingredient-test-hooks");
});
after(async () => { await server?.close(); });

const findAll = (element, predicate) => {
    if (!element || typeof element !== "object") return [];
    return [
        ...(predicate(element) ? [element] : []),
        ...[element.props?.children].flat(Infinity).flatMap(child => findAll(child, predicate)),
    ];
};

const abrir = (modo = "crear") => {
    hooks.reset();
    let envios = 0, cierres = 0;
    const props = {
        enviando: false, onGuardar: async () => { envios++; }, onCerrar: () => { cierres++; },
        ...(modo === "editar" ? { ingrediente: {
            nombre: "Harina original", unidad_medida: "kg", cantidad_disponible: "10.00", stock_minimo: "1.00", estado: "ACTIVO",
        } } : {}),
    };
    const render = () => hooks.render(IngredienteForm, props);
    const campo = name => findAll(render(), element => element.props?.name === name)[0];
    const cambiar = (name, value) => {
        assert.ok(campo(name), `Campo ${name} presente`);
        campo(name).props.onChange({ target: { value } });
        findAll(render(), element => element.type === "form")[0].props.onInputCapture();
    };
    const guardar = async () => {
        const form = findAll(render(), element => element.type === "form")[0];
        const elements = findAll(form, element => ["input", "select", "textarea"].includes(element.type)).map(({ props: field }) => {
            const value = String(field.value ?? "");
            const valueMissing = Boolean(field.required && !value.trim());
            return {
                name: field.name, required: field.required, disabled: field.disabled, value,
                dataset: { mensajeObligatorio: field["data-mensaje-obligatorio"], mensajeInvalido: field["data-mensaje-invalido"] },
                // Modela solo valueMissing; no reproduce el motor de validación de un navegador.
                validity: { valueMissing, badInput: false }, checkValidity: () => !valueMissing,
            };
        });
        await form.props.onSubmit({ preventDefault() {}, currentTarget: { elements } });
    };
    return { render, campo, cambiar, guardar, contadores: () => ({ envios, cierres }) };
};

const obligatorios = [
    ["nombre", "Ingresa el nombre del ingrediente."],
    ["unidad_medida", "Selecciona una unidad de medida."],
    ["cantidad_disponible", "Ingresa la cantidad disponible."],
    ["stock_minimo", "Ingresa el stock mínimo."],
];

for (const modo of ["crear", "editar"]) {
    const casos = modo === "editar"
        ? [...obligatorios, ["motivo", "Ingresa el motivo de la modificación."]]
        : obligatorios;
    for (const [name, mensaje] of casos) {
        test(`${modo}: ${name} vacío renderiza su mensaje y no guarda ni cierra`, async () => {
            const form = abrir(modo);
            for (const [field, value] of [["nombre", "Harina"], ["unidad_medida", "kg"],
                ["cantidad_disponible", "12.50"], ["stock_minimo", "2"]]) form.cambiar(field, value);
            if (modo === "editar") form.cambiar("motivo", "Conteo físico");
            form.cambiar(name, "");
            assert.ok(!renderToStaticMarkup(form.render()).includes(`role="alert">${mensaje}</small>`));
            await form.guardar();
            const html = renderToStaticMarkup(form.render());
            assert.ok(html.includes(`class="required-field-message" role="alert">${mensaje}</small>`), mensaje);
            assert.equal(form.campo(name).props["aria-invalid"], true);
            assert.match(html, /class="modal-overlay open"/);
            assert.deepEqual(form.contadores(), { envios: 0, cierres: 0 });
            form.cambiar(name, name === "nombre" || name === "motivo" ? "Corregido" : name === "unidad_medida" ? "g" : "1");
            assert.ok(!renderToStaticMarkup(form.render()).includes(`role="alert">${mensaje}</small>`));
            assert.equal(form.campo(name).props["aria-invalid"], false);
        });
    }
}

test("formulario sin datos muestra el aviso general de obligatorios y no envía", async () => {
    const form = abrir();
    await form.guardar();
    const html = renderToStaticMarkup(form.render());
    assert.match(html, /class="required-fields-hint error" role="alert">Completa los campos obligatorios\./);
    assert.deepEqual(form.contadores(), { envios: 0, cierres: 0 });
});

test("el selector renderiza exactamente g, kg, ml, l y u", () => {
    const form = abrir();
    const opciones = findAll(form.campo("unidad_medida"), element => element.type === "option" && element.props.value);
    assert.deepEqual(opciones.map(option => option.props.value), ["g", "kg", "ml", "l", "u"]);
    const html = renderToStaticMarkup(form.render());
    for (const unidad of ["g", "kg", "ml", "l", "u"]) assert.ok(html.includes(`<option value="${unidad}">${unidad}</option>`));
});
