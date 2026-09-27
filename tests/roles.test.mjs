import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerRutaInicio, puedeGestionarUsuarios } from '../src/constants/roles.js';

for (const [rol, ruta] of Object.entries({CAJA:'/caja',COCINA:'/cocina',ADMINISTRADOR:'/encargado-ti/usuarios',TI:'/encargado-ti/usuarios'})) {
    test(`${rol}: inicio protegido, normalizado y permiso de usuarios`, () => {
        const usuario = {rol:` ${rol.toLowerCase()} `,estado:' activo '};
        assert.equal(obtenerRutaInicio(usuario), ruta);
        assert.equal(puedeGestionarUsuarios(usuario), ['ADMINISTRADOR','TI'].includes(rol));
        assert.equal(obtenerRutaInicio({...usuario,estado:'INACTIVO'}), null);
    });
}
test('sin sesión o rol desconocido no hay ruta protegida', () => {
    assert.equal(obtenerRutaInicio(null), null);
    assert.equal(obtenerRutaInicio({rol:'OTRO',estado:'ACTIVO'}), null);
});
