import { test } from "node:test";
import assert from "node:assert/strict";
import {
    actualizarIngrediente,
    eliminarIngrediente,
    obtenerIngredientes,
} from "../src/services/ingredientesService.js";

const respuesta = (status, data) => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
});

test("consulta ingredientes y envía motivo al actualizar con CSRF", async () => {
    const anteriorFetch = globalThis.fetch;
    const anteriorDocument = globalThis.document;
    const anteriorWindow = globalThis.window;
    const llamadas = [];
    globalThis.document = { cookie: "XSRF-TOKEN=token%20seguro" };
    globalThis.window = new EventTarget();
    globalThis.fetch = async (ruta, opciones) => {
        llamadas.push({ ruta, opciones });
        if (ruta === "/api/ingredients") return respuesta(200, { ingredientes: [{ id_ingrediente: 3, nombre: "Harina" }] });
        if (ruta === "/sanctum/csrf-cookie") return respuesta(204, {});
        return respuesta(200, { ingrediente: { id_ingrediente: 3, nombre: "Harina" } });
    };

    try {
        assert.equal((await obtenerIngredientes())[0].nombre, "Harina");
        await actualizarIngrediente(3, { nombre: "Harina", motivo: "Conteo físico" });
        assert.equal(llamadas[0].opciones.credentials, "include");
        assert.equal(llamadas[2].ruta, "/api/ingredients/3");
        assert.equal(llamadas[2].opciones.method, "PATCH");
        assert.equal(llamadas[2].opciones.headers["X-XSRF-TOKEN"], "token seguro");
        assert.equal(JSON.parse(llamadas[2].opciones.body).motivo, "Conteo físico");
        await eliminarIngrediente(3);
        assert.equal(llamadas[4].opciones.method, "DELETE");
    } finally {
        globalThis.fetch = anteriorFetch;
        globalThis.document = anteriorDocument;
        globalThis.window = anteriorWindow;
    }
});

test("conserva el error por campo del servidor", async () => {
    const anteriorFetch = globalThis.fetch;
    const anteriorDocument = globalThis.document;
    const anteriorWindow = globalThis.window;
    globalThis.document = { cookie: "XSRF-TOKEN=abc" };
    globalThis.window = new EventTarget();
    globalThis.fetch = async (ruta) => ruta === "/sanctum/csrf-cookie"
        ? respuesta(204, {})
        : respuesta(422, { errors: { motivo: ["El motivo de la modificación es obligatorio."] } });

    try {
        await assert.rejects(
            actualizarIngrediente(3, { motivo: "" }),
            (error) => error.status === 422 && error.errors.motivo[0] === "El motivo de la modificación es obligatorio.",
        );
    } finally {
        globalThis.fetch = anteriorFetch;
        globalThis.document = anteriorDocument;
        globalThis.window = anteriorWindow;
    }
});
