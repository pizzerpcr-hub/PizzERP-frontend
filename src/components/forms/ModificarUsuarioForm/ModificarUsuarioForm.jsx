import UsuarioFormBase from "../UsuarioFormBase.jsx";
import "./ModificarUsuarioForm.css";

function ModificarUsuarioForm(props) {
    return (
        <UsuarioFormBase
            {...props}
            titulo="Modificar usuario"
            etiquetaContrasena="Contraseña (opcional)"
            placeholderContrasena="Sin cambios"
            nota="Completa los campos obligatorios. Deja la contraseña vacía para conservar la actual."
            textoGuardar="Guardar cambios"
            contrasenaObligatoria={false}
        />
    );
}

export default ModificarUsuarioForm;
