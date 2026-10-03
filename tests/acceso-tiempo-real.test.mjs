import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarCambioAcceso } from "../src/services/accesoEnTiempoReal.js";
import { obtenerItemsNavegacion, obtenerRutaInicio, puede } from "../src/constants/roles.js";

const permisos = (productos) => ({
    usuarios: { ver: false },
    productos: { ver: productos },
    categorias: { ver: false },
});

test("un cambio de rol agrega y retira Productos de la navegación sin consultar HTTP", () => {
    const usuario = { id_usuario: 10, rol: "CAJA", rol_id: 2, estado: "ACTIVO", permisos: permisos(false) };
    const agregado = aplicarCambioAcceso(usuario, {
        rol_id: 2, rol: "CAJA", permisos: permisos(true), revision: 10,
    }, "rol");

    assert.equal(puede(agregado.usuario, "productos"), true);
    assert.ok(obtenerItemsNavegacion(agregado.usuario).some((item) => item.ruta === "/panel/productos"));

    const retirado = aplicarCambioAcceso(agregado.usuario, {
        rol_id: 2, rol: "CAJA", permisos: permisos(false), revision: 11,
    }, "rol", agregado.revisiones);

    assert.equal(puede(retirado.usuario, "productos"), false);
    assert.ok(!obtenerItemsNavegacion(retirado.usuario).some((item) => item.ruta === "/panel/productos"));
    assert.equal(obtenerRutaInicio(retirado.usuario), "/panel");
});

test("un cambio de usuario actualiza el rol y descarta eventos ajenos o anteriores", () => {
    const usuario = { id_usuario: 10, rol: "CAJA", rol_id: 2, estado: "ACTIVO", permisos: permisos(false) };
    const cambio = { user_id: 10, rol_id: 3, rol: "TI", permisos: permisos(true), revision: 21 };
    const actualizado = aplicarCambioAcceso(usuario, cambio, "usuario", { usuario: 20, rol: 0 });

    assert.equal(actualizado.usuario.rol, "TI");
    assert.equal(actualizado.usuario.rol_id, 3);
    assert.equal(puede(actualizado.usuario, "productos"), true);
    assert.equal(aplicarCambioAcceso(actualizado.usuario, cambio, "usuario", actualizado.revisiones), null);
    assert.equal(aplicarCambioAcceso(usuario, { ...cambio, user_id: 11 }, "usuario"), null);
    assert.equal(aplicarCambioAcceso(actualizado.usuario, { ...cambio, rol_id: 2, revision: 22 }, "rol"), null);
});

test("la entrega fuera de orden entre canales conserva los permisos más recientes", () => {
    const usuario = { id_usuario: 10, rol: "CAJA", rol_id: 2, estado: "ACTIVO", permisos: permisos(false) };
    const rolPosterior = aplicarCambioAcceso(usuario, {
        rol_id: 2, rol: "CAJA", permisos: permisos(true), revision: 30,
    }, "rol");
    const usuarioAnterior = aplicarCambioAcceso(rolPosterior.usuario, {
        user_id: 10, rol_id: 2, rol: "CAJA", permisos: permisos(false), revision: 29,
    }, "usuario", rolPosterior.revisiones);

    assert.equal(puede(usuarioAnterior.usuario, "productos"), true);
    assert.equal(aplicarCambioAcceso(usuarioAnterior.usuario, {
        rol_id: 2, rol: "CAJA", permisos: permisos(false), revision: 28,
    }, "rol", usuarioAnterior.revisiones), null);

    const cambioDeRolAnterior = aplicarCambioAcceso(rolPosterior.usuario, {
        user_id: 10, rol_id: 3, rol: "TI", permisos: permisos(false), revision: 29,
    }, "usuario", rolPosterior.revisiones);
    assert.equal(cambioDeRolAnterior.usuario.rol_id, 3);
    assert.equal(puede(cambioDeRolAnterior.usuario, "productos"), false);
});
