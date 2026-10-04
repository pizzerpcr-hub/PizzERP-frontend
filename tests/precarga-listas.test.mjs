import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { precargarListas } from "../src/services/precargarListas.js";
import { consultarLista, leerLista, sincronizarListasSesion, guardarBusqueda, leerBusqueda, registrarListaVisible } from "../src/services/listasSesion.js";

const permisos = Object.fromEntries(["usuarios", "roles", "categorias", "productos", "ingredientes", "combos"]
    .map(modulo => [modulo, { ver: true, crear: true, editar: true }]));
const cuenta = { id_usuario: 1, estado: "ACTIVO", permisos };
const tick = () => new Promise(resolve => setImmediate(resolve));
beforeEach(() => { sincronizarListasSesion(null); sincronizarListasSesion(cuenta); });
afterEach(() => sincronizarListasSesion(null));

test("la precarga consulta solo catálogos de formularios y evita descargar tablas completas", async () => {
    const fetchAnterior = globalThis.fetch;
    const llamadas = [];
    globalThis.fetch = async (ruta) => {
        llamadas.push(ruta);
        return new Response(JSON.stringify({ usuarios: [], roles: [], categorias: [], productos: [], ingredientes: [], combos: [] }), {
            status: 200, headers: { "Content-Type": "application/json" },
        });
    };
    try {
        await precargarListas(cuenta, "/panel/usuarios");
        assert.equal(llamadas.length, 4);
        assert.deepEqual(new Set(llamadas), new Set([
            "/api/users/roles", "/api/products/categorias",
            "/api/products/ingredientes", "/api/combos/productos",
        ]));
        assert.equal(llamadas[0], "/api/users/roles");
        await precargarListas(cuenta, "/panel/productos");
        assert.equal(llamadas.length, 4);
    } finally { globalThis.fetch = fetchAnterior; }
});

test("sección inicial y dependencia paralelas; fondo con concurrencia uno y navegación compartida", async () => {
    const llamadas = [], pendientes = [];
    let activas = 0, maximo = 0;
    const recurso = ruta => [ruta, () => consultarLista(ruta, () => {
        llamadas.push(ruta); maximo = Math.max(maximo, ++activas);
        return new Promise(resolve => pendientes.push(() => { activas--; resolve([{ nombre: ruta }]); }));
    })];
    const catalogos = {
        usuarios: [recurso("/api/users"), recurso("/api/users/roles")],
        productos: [recurso("/api/products"), recurso("/api/products/categorias")],
        roles: [recurso("/api/roles")],
    };
    const precarga = precargarListas(cuenta, "/panel/productos", catalogos);
    await tick();
    assert.deepEqual(llamadas, ["/api/products", "/api/products/categorias"]);
    // El panel no necesita esperar: el snapshot pendiente ya está disponible.
    assert.equal(leerLista("/api/products").consultando, true);
    const navegar = catalogos.productos[0][1]();
    assert.equal(llamadas.length, 2);
    pendientes.splice(0).forEach(resolve => resolve());
    await navegar; await tick();
    assert.equal(llamadas.length, 3);
    pendientes.splice(0).forEach(resolve => resolve()); await tick();
    pendientes.splice(0).forEach(resolve => resolve()); await tick();
    pendientes.splice(0).forEach(resolve => resolve()); await precarga;
    assert.equal(maximo, 2);
    guardarBusqueda("/api/products", "pizza");
    await precargarListas(cuenta, "/panel/usuarios", catalogos);
    await catalogos.productos[0][1]();
    assert.equal(llamadas.length, 5);
    assert.equal(leerBusqueda("/api/products"), "pizza");
});

test("navegación inicia sin esperar al fondo; la cola espera la pantalla y comparte su GET", async () => {
    const llamadas = [], pendientes = new Map();
    const recurso = ruta => [ruta, () => consultarLista(ruta, () => {
        llamadas.push(ruta);
        return new Promise(resolve => pendientes.set(ruta, () => resolve([])));
    })];
    const catalogos = {
        usuarios: [recurso("/api/users")], roles: [recurso("/api/roles")],
        ingredientes: [recurso("/api/ingredients")], productos: [recurso("/api/products")],
    };
    const precarga = precargarListas(cuenta, "/panel/usuarios", catalogos);
    await tick(); pendientes.get("/api/users")(); await tick();
    assert.deepEqual(llamadas, ["/api/users", "/api/roles"]);
    const retirar = registrarListaVisible("/api/products");
    try {
        const navegacion = catalogos.productos[0][1](); await tick();
        assert.equal(llamadas.at(-1), "/api/products");
        pendientes.get("/api/roles")(); await tick();
        assert.equal(llamadas.includes("/api/ingredients"), false);
        pendientes.get("/api/products")(); await navegacion; await tick();
        assert.equal(llamadas.filter(ruta => ruta === "/api/products").length, 1);
        pendientes.get("/api/ingredients")(); await precarga;
    } finally { retirar(); }
});

test("comparación simulada antes/después: servidor serial, pantalla inicial sin retraso y menor espera al navegar", async () => {
    const medir = async anterior => {
        sincronizarListasSesion(null); sincronizarListasSesion(cuenta);
        let tiempo = 0, inicio, destino, terminada = false;
        const colaServidor = [], llamadas = [];
        const recurso = ruta => [ruta, () => consultarLista(ruta, () => {
            llamadas.push(ruta);
            return new Promise(resolve => colaServidor.push(() => resolve([])));
        })];
        const catalogos = {
            usuarios: [recurso("/api/users")], roles: [recurso("/api/roles")],
            ingredientes: [recurso("/api/ingredients")], productos: [recurso("/api/products")],
        };
        // Reproducción de la cola anterior de dos trabajadores, sin llamadas reales.
        const antes = async () => {
            await catalogos.usuarios[0][1]();
            const tareas = [catalogos.roles[0], catalogos.ingredientes[0], catalogos.productos[0]];
            const trabajador = async () => { while (tareas.length) await tareas.shift()[1](); };
            await Promise.all([trabajador(), trabajador()]);
        };
        const precarga = (anterior ? antes() : precargarListas(cuenta, "/panel/usuarios", catalogos))
            .then(() => { terminada = true; });
        await tick(); tiempo += 100; colaServidor.shift()(); await tick(); inicio = tiempo;
        const retirar = registrarListaVisible("/api/products");
        try {
            const navegar = catalogos.productos[0][1]().then(() => { destino = tiempo; });
            await tick();
            while (!terminada || destino === undefined) {
                assert.ok(colaServidor.length);
                tiempo += 100; colaServidor.shift()(); await tick();
            }
            await navegar; await precarga;
            return { inicio, destino, peticiones: llamadas.length };
        } finally { retirar(); }
    };
    assert.deepEqual(await medir(true), { inicio: 100, destino: 400, peticiones: 4 });
    assert.deepEqual(await medir(false), { inicio: 100, destino: 300, peticiones: 4 });
});

test("espera permisos y no consulta recursos revocados o ajenos", async () => {
    sincronizarListasSesion({ ...cuenta, permisos: null });
    let llamadas = 0;
    const catalogos = { usuarios: [["/api/users", async () => { llamadas++; }]], roles: [["/api/roles", async () => { llamadas++; }]] };
    await precargarListas(cuenta, "/panel/usuarios", catalogos);
    assert.equal(llamadas, 0);
    sincronizarListasSesion({ ...cuenta, permisos: { usuarios: { ver: true } } });
    await precargarListas(cuenta, "/panel/usuarios", catalogos);
    assert.equal(llamadas, 1);
});

test("logout cancela GET iniciado y cola; respuesta tardía no repuebla otra sesión", async () => {
    let signal, terminar, otras = 0;
    const catalogos = { usuarios: [["/api/users", () => consultarLista("/api/users", s => {
        signal = s; return new Promise(resolve => { terminar = resolve; });
    })]], roles: [["/api/roles", async () => { otras++; }]] };
    const tarea = precargarListas(cuenta, "/panel/usuarios", catalogos); await tick();
    sincronizarListasSesion(null);
    assert.equal(signal.aborted, true);
    sincronizarListasSesion({ ...cuenta, id_usuario: 2 });
    terminar([{ nombre: "No conservar" }]); await tarea;
    assert.equal(otras, 0);
    assert.equal(leerLista("/api/users").datos, undefined);
    await precargarListas({ ...cuenta, id_usuario: 2 }, "/panel/roles", { roles: catalogos.roles });
    assert.equal(otras, 1);
});

test("fallo de precarga no bloquea otras listas; conserva datos y permite reintento", async () => {
    let intentos = 0;
    const loader = () => consultarLista("/api/users", async () => {
        if (++intentos === 1) throw new Error("Red no disponible");
        return [];
    });
    await precargarListas(cuenta, "/panel/usuarios", {
        usuarios: [["/api/users", loader]], roles: [["/api/roles", () => consultarLista("/api/roles", async () => [])]],
    });
    assert.equal(leerLista("/api/users").datos, undefined);
    assert.match(leerLista("/api/users").error.message, /Red/);
    assert.deepEqual(leerLista("/api/roles").datos, []);
    await loader(); assert.deepEqual(leerLista("/api/users").datos, []);
});

test("revocación durante precarga aborta recurso y elimina datos sin iniciar cola denegada", async () => {
    let signal, terminar, otras = 0;
    const tarea = precargarListas(cuenta, "/panel/usuarios", {
        usuarios: [["/api/users", () => consultarLista("/api/users", s => {
            signal = s; return new Promise(resolve => { terminar = resolve; });
        })]], roles: [["/api/roles", async () => { otras++; }]],
    });
    await tick(); sincronizarListasSesion({ ...cuenta, permisos: {} });
    assert.equal(signal.aborted, true);
    terminar([]); await tarea;
    assert.equal(otras, 0); assert.equal(leerLista("/api/users").datos, undefined);
});
