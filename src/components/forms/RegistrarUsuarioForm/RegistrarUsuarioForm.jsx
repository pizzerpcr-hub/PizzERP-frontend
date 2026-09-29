import UsuarioFormBase from "../UsuarioFormBase.jsx";
import "./RegistrarUsuarioForm.css";

function RegistrarUsuarioForm(props) {
    return (
        <UsuarioFormBase
            {...props}
            usuarioInicial={null}
            titulo="Registrar usuario"
            etiquetaContrasena="Contraseña"
            placeholderContrasena="Mínimo 8 caracteres"
            nota="Todos los campos son obligatorios."
            textoGuardar="Guardar usuario"
            contrasenaObligatoria
        />
    );
}

export default RegistrarUsuarioForm;
