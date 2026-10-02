import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerRutaInicio, obtenerItemsNavegacion, puedeGestionarUsuarios } from '../src/constants/roles.js';

for (const [rol, ruta] of Object.entries({CAJA:'/caja',COCINA:'/cocina',ADMINISTRADOR:'/panel/usuarios',TI:'/panel/usuarios'})) {
    test(`${rol}: inicio protegido, normalizado y permiso de usuarios`, () => {
        const usuario = {rol:` ${rol.toLowerCase()} `,estado:' activo ',permisos:{usuarios:{ver:['ADMINISTRADOR','TI'].includes(rol)},pedidos:{ver:rol==='CAJA'},cocina:{ver:rol==='COCINA'}}};
        assert.equal(obtenerRutaInicio(usuario), ruta);
        assert.equal(puedeGestionarUsuarios(usuario), ['ADMINISTRADOR','TI'].includes(rol));
        assert.equal(obtenerRutaInicio({...usuario,estado:'INACTIVO'}), null);
    });
}
test('sin sesión no hay ruta; los roles personalizados tienen un panel protegido', () => {
    assert.equal(obtenerRutaInicio(null), null);
    assert.equal(obtenerRutaInicio({rol:'OTRO',estado:'ACTIVO',permisos:{}}), '/panel');
});

test('los permisos efectivos, no el nombre del rol, determinan el acceso', () => {
    assert.equal(puedeGestionarUsuarios({rol:'TI',estado:'ACTIVO',permisos:{}}), false);
    assert.equal(obtenerRutaInicio({rol:'TI',estado:'ACTIVO',permisos:{}}), '/panel');
    assert.equal(obtenerRutaInicio({rol:'TI',estado:'ACTIVO',permisos:{roles:{ver:true}}}), '/panel/roles');
    assert.equal(obtenerRutaInicio({rol:'AUDITOR',estado:'ACTIVO',permisos:{productos:{ver:true}}}), '/panel/productos');
});

for (const rol of ['ADMINISTRADOR','TI','CAJA','COCINA','RENOMBRADO']) {
    test(`${rol} no aporta privilegios ni navegación por su nombre`, () => {
        const usuario = {rol,estado:'ACTIVO',permisos:{}};
        assert.equal(obtenerRutaInicio(usuario), '/panel');
        assert.deepEqual(obtenerItemsNavegacion(usuario), []);
        const autorizado = {...usuario,permisos:{usuarios:{ver:true},roles:{ver:true}}};
        assert.equal(obtenerRutaInicio(autorizado), '/panel/usuarios');
        assert.deepEqual(obtenerItemsNavegacion(autorizado).map(item=>item.ruta), ['/panel/usuarios','/panel/roles']);
    });
}

test('renombrar preserva navegación; revocar permisos retira módulos', () => {
    const usuario = {rol:'TI',estado:'ACTIVO',permisos:{usuarios:{ver:true},roles:{ver:true}}};
    const renombrado = {...usuario,rol:'SOPORTE'};
    assert.deepEqual(obtenerItemsNavegacion(renombrado), obtenerItemsNavegacion(usuario));
    assert.equal(obtenerRutaInicio(renombrado), obtenerRutaInicio(usuario));
    const revocado = {...renombrado,permisos:{roles:{ver:true}}};
    assert.equal(obtenerRutaInicio(revocado), '/panel/roles');
    assert.deepEqual(obtenerItemsNavegacion(revocado).map(item=>item.ruta), ['/panel/roles']);
});
