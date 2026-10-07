import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { crearPreparacionCsrf } from "../src/services/csrfSesion.js";
import { crearAutorizadorEcho } from "../src/services/autorizarEcho.js";
import { precargarListas } from "../src/services/precargarListas.js";
import { cambiarEstadoUsuario } from "../src/services/usuariosService.js";
import { obtenerPaginaTabla } from "../src/services/catalogoService.js";
import { sincronizarListasSesion, suscribirLista, leerLista, listaDesactualizada,
    iniciarAccionLista, esperarAccionesLista, invalidarLista } from "../src/services/listasSesion.js";

const originales = { fetch: globalThis.fetch, document: globalThis.document, window: globalThis.window };
const cuenta = { id_usuario: 1, estado: "ACTIVO", permisos: { usuarios: { ver: true, editar: true, eliminar: true } } };
const tick = () => new Promise(resolve => setImmediate(resolve));
beforeEach(() => {
    globalThis.document = { cookie: "XSRF-TOKEN=vigente" };
    globalThis.window = new EventTarget();
    sincronizarListasSesion(null); sincronizarListasSesion(cuenta);
});
afterEach(() => { Object.assign(globalThis, originales); sincronizarListasSesion(null); });

test("CSRF existente evita preparación; preparación ausente simultánea comparte GET y permite reintentar", async () => {
    let cookie = "", llamadas = 0, resolver;
    const preparar = crearPreparacionCsrf(() => {
        llamadas++; return new Promise(resolve => { resolver = resolve; });
    }, () => cookie);
    const a = preparar(), b = preparar();
    await tick(); assert.equal(llamadas, 1);
    resolver({ ok: false });
    assert.equal((await Promise.allSettled([a, b])).filter(item => item.status === "rejected").length, 2);
    const siguiente = preparar(); await tick();
    cookie = "XSRF-TOKEN=nuevo"; resolver({ ok: true });
    assert.equal(await siguiente, "nuevo");
    assert.equal(await preparar(), "nuevo"); assert.equal(llamadas, 2);
});

test("estado reutiliza CSRF; 419 renueva y reintenta exactamente una vez, sin confirmar el fallo", async () => {
    const llamadas = []; let patch = 0;
    globalThis.fetch = async (ruta, opciones) => {
        llamadas.push({ ruta, opciones });
        if (ruta === "/sanctum/csrf-cookie") {
            document.cookie = "XSRF-TOKEN=renovado"; return new Response(null, { status: 204 });
        }
        if (++patch === 1) return Response.json({ message: "CSRF" }, { status: 419 });
        return Response.json({ usuario: { id_usuario: 5, estado: "INACTIVO" } });
    };
    await cambiarEstadoUsuario(5, "INACTIVO");
    assert.deepEqual(llamadas.map(item => item.ruta), ["/api/users/5/estado", "/sanctum/csrf-cookie", "/api/users/5/estado"]);
    assert.equal(llamadas[2].opciones.headers["X-XSRF-TOKEN"], "renovado");
    patch = 0; document.cookie = "XSRF-TOKEN=vigente";
    globalThis.fetch = async ruta => ruta === "/sanctum/csrf-cookie"
        ? new Response(null, { status: 204 }) : Response.json({ message: "Sesión expirada" }, { status: 419 });
    await assert.rejects(cambiarEstadoUsuario(5, "ACTIVO"), /Sesión expirada/);
});

test("una confirmación de estado genera una sola reconciliación visible, con fila definitiva y total servidor", async () => {
    const llamadas = [], ruta = "/api/users?page=1&search=";
    const fila = { id_usuario: 5, nombre_completo: "Prueba", nombre_usuario: "PRUEBA", rol: "CAJA", estado: "ACTIVO" };
    globalThis.fetch = async url => {
        llamadas.push(url);
        return Response.json(url.includes("/estado") ? { usuario: { ...fila, estado: "INACTIVO" } }
            : { usuarios: [{ ...fila, estado: llamadas.length > 1 ? "INACTIVO" : "ACTIVO" }], paginacion: { pagina: 1, totalPaginas: 1, totalElementos: 1 } });
    };
    const consultar = () => obtenerPaginaTabla("/api/users", "usuarios", 1, "");
    await consultar();
    const detener = suscribirLista(ruta, () => {
        const snapshot = leerLista(ruta);
        if (!snapshot.consultando && !snapshot.refrescoPendiente && listaDesactualizada(snapshot)) void consultar();
    });
    try {
        await cambiarEstadoUsuario(5, "INACTIVO"); await tick();
        assert.deepEqual(llamadas, [ruta, "/api/users/5/estado", ruta]);
        assert.equal(leerLista(ruta).datos.datos[0].estado, "INACTIVO");
        assert.equal(leerLista(ruta).datos.paginacion.totalElementos, 1);
        assert.equal(leerLista(ruta).consultando, false);
    } finally { detener(); }
});

test("la precarga pendiente espera acciones, incluso si fallan, sin bloquear GET visibles", async () => {
    const terminar = iniciarAccionLista(); let libre = false;
    const espera = esperarAccionesLista().then(() => { libre = true; });
    await tick(); assert.equal(libre, false);
    let consultas = 0;
    globalThis.fetch = async () => { consultas++; return Response.json({ usuarios: [] }); };
    await obtenerPaginaTabla("/api/users", "usuarios", 1, "");
    assert.equal(consultas, 1);
    terminar(); await espera; assert.equal(libre, true);
});

test("reproducción del orden anterior: dos invalidaciones separadas descartan el primer GET y generan dos", async () => {
    let llamadas = 0;
    const ruta = "/api/users?page=1&search=";
    globalThis.fetch = async () => { llamadas++; return Response.json({ usuarios: [], paginacion: { totalElementos: 0 } }); };
    const consultar = () => obtenerPaginaTabla("/api/users", "usuarios", 1, "");
    await consultar(); llamadas = 0;
    const detener = suscribirLista(ruta, () => {
        const snapshot = leerLista(ruta);
        if (!snapshot.consultando && listaDesactualizada(snapshot)) void consultar();
    });
    try {
        invalidarLista("/api/users");
        invalidarLista(ruta);
        await tick();
        assert.equal(llamadas, 2);
    } finally { detener(); }
});

test("Echo y una acción simultánea comparten preparación CSRF global pero no la autorización", async () => {
    document.cookie = "";
    const llamadas = []; let resolver;
    globalThis.fetch = async ruta => {
        llamadas.push(ruta);
        if (ruta === "/sanctum/csrf-cookie") return new Promise(resolve => { resolver = resolve; });
        return Response.json(ruta === "/broadcasting/auth" ? { auth: "permitido" } : { usuario: { id_usuario: 5, estado: "ACTIVO" } });
    };
    const echo = new Promise((resolve, reject) => crearAutorizadorEcho()({ name: "private-usuario.1" })
        .authorize("1.2", error => error ? reject(error) : resolve()));
    const accion = cambiarEstadoUsuario(5, "ACTIVO");
    await tick(); assert.deepEqual(llamadas, ["/sanctum/csrf-cookie"]);
    document.cookie = "XSRF-TOKEN=emitido";
    resolver(new Response(null, { status: 204 }));
    await Promise.all([echo, accion]);
    assert.equal(llamadas.length, 3);
});

test("error de PATCH no invalida ni modifica la fila y libera la espera de precarga", async () => {
    const ruta = "/api/users?page=1&search=";
    globalThis.fetch = async () => Response.json({ usuarios: [{ id_usuario: 5, estado: "ACTIVO" }] });
    await obtenerPaginaTabla("/api/users", "usuarios", 1, "");
    const anterior = leerLista(ruta);
    globalThis.fetch = async () => { throw new TypeError("Sin conexión"); };
    await assert.rejects(cambiarEstadoUsuario(5, "INACTIVO"), /Sin conexión/);
    await esperarAccionesLista();
    assert.equal(leerLista(ruta), anterior);
});

test("la cola real de precarga no inicia el próximo recurso mientras una acción sigue pendiente", async () => {
    const terminar = iniciarAccionLista(), llamadas = [];
    const precarga = precargarListas(cuenta, "/panel/usuarios", {
        usuarios: [["/api/users", async () => { llamadas.push("inicial"); }]],
        roles: [["/api/users", async () => { llamadas.push("fondo"); }]],
    });
    try {
        await tick(); assert.deepEqual(llamadas, ["inicial"]);
        terminar(); await precarga;
        assert.deepEqual(llamadas, ["inicial", "fondo"]);
    } finally { terminar(); }
});
