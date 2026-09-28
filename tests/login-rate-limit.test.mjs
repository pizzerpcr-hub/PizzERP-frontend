import { test } from "node:test";
import assert from "node:assert/strict";
import { iniciarSesion } from "../src/services/loginService.js";

test("el servicio conserva el 429 y los segundos para la cuenta regresiva", async () => {
    const fetchOriginal = globalThis.fetch;
    const documentOriginal = globalThis.document;
    let llamadas = 0;

    try {
        globalThis.document = { cookie: "XSRF-TOKEN=token-prueba" };
        globalThis.fetch = async () => {
            llamadas++;
            return llamadas === 1
                ? new Response(null, { status: 204 })
                : Response.json({
                    message: "Se alcanzó el limite de intentos.\n",
                    retry_after: 300,
                }, { status: 429 });
        };

        await assert.rejects(
            iniciarSesion({ username: "PRUEBA", password: "incorrecta" }),
            (error) => error.message === "Se alcanzó el limite de intentos.\n"
                && error.retryAfter === 300,
        );
        assert.equal(llamadas, 2);
    } finally {
        globalThis.fetch = fetchOriginal;
        globalThis.document = documentOriginal;
    }
});
