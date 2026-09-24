import { useEffect, useRef, useState } from "react";
import {
    normalizarRol,
    obtenerEtiquetaRol,
    ROLES_PERMITIDOS,
} from "../../../constants/roles.js";
import "./RegistrarUsuarioForm.css";

const formularioVacio = {
    nombre_completo: "",
    nombre_usuario: "",
    contrasena: "",
    rol: "",
};

const obtenerDatosIniciales = (usuarioInicial) => ({
    ...formularioVacio,
    nombre_completo: usuarioInicial?.nombre_completo ?? "",
    nombre_usuario: usuarioInicial?.nombre_usuario?.toUpperCase() ?? "",
    rol: normalizarRol(usuarioInicial?.rol),
});

function RegistrarUsuarioForm({
    modo = "crear",
    usuarioInicial = null,
    onSubmit,
    onClose,
    onClearError,
    isSubmitting = false,
    mensajeError = "",
}) {
    const dialogRef = useRef(null);
    const envioEnCursoRef = useRef(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [errorValidacion, setErrorValidacion] = useState("");
    const [formData, setFormData] = useState(() =>
        obtenerDatosIniciales(usuarioInicial),
    );

    const esEdicion = modo === "editar";

    useEffect(() => {
        const dialog = dialogRef.current;

        if (dialog && !dialog.open) {
            dialog.showModal();
        }

        return () => {
            if (dialog?.open) {
                dialog.close();
            }
        };
    }, []);

    useEffect(() => {
        /* eslint-disable react-hooks/set-state-in-effect */
        setFormData(obtenerDatosIniciales(usuarioInicial));
        setMostrarPassword(false);
        setErrorValidacion("");
        /* eslint-enable react-hooks/set-state-in-effect */
        envioEnCursoRef.current = false;
    }, [modo, usuarioInicial]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((datosActuales) => ({
            ...datosActuales,
            [name]: name === "nombre_usuario" ? value.toUpperCase() : value,
        }));
        setErrorValidacion("");
        onClearError?.();
    };

    const cerrarDialogo = () => {
        if (isSubmitting || envioEnCursoRef.current) {
            return;
        }

        dialogRef.current?.close();
        onClose();
    };

    const handleCancel = (event) => {
        event.preventDefault();
        cerrarDialogo();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSubmitting || envioEnCursoRef.current) {
            return;
        }

        const contrasena = formData.contrasena;

        if (
            !formData.nombre_completo.trim() ||
            !formData.nombre_usuario.trim() ||
            !formData.rol
        ) {
            setErrorValidacion("Completa todos los campos obligatorios.");
            return;
        }

        if (!esEdicion && !contrasena) {
            setErrorValidacion("La contraseña es obligatoria.");
            return;
        }

        if (contrasena && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(contrasena)) {
            setErrorValidacion(
                "La contraseña debe tener al menos 8 caracteres, una letra y un número.",
            );
            return;
        }

        const datosUsuario = {
            nombre_completo: formData.nombre_completo.trim(),
            nombre_usuario: formData.nombre_usuario.trim().toUpperCase(),
            rol: normalizarRol(formData.rol),
        };

        if (contrasena) {
            datosUsuario.contrasena = contrasena;
        }

        envioEnCursoRef.current = true;

        try {
            await onSubmit(datosUsuario);
        } finally {
            envioEnCursoRef.current = false;
        }
    };

    const mensaje = errorValidacion || mensajeError;

    return (
        <dialog
            ref={dialogRef}
            className="user-dialog"
            onCancel={handleCancel}
        >
            <form id="userForm" onSubmit={handleSubmit} noValidate>
                <div className="dialog-heading">
                    <div>
                        <p className="eyebrow">Gestión de usuarios</p>

                        <h2 id="dialogTitle">
                            {esEdicion ? "Modificar usuario" : "Registrar usuario"}
                        </h2>
                    </div>

                    <button
                        className="dialog-close"
                        type="button"
                        aria-label="Cerrar"
                        onClick={cerrarDialogo}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                <p
                    id="userFormMessage"
                    className={`dialog-message${mensaje ? " visible" : ""}`}
                    role="alert"
                    aria-live="polite"
                >
                    {mensaje}
                </p>

                <div className="dialog-field">
                    <label htmlFor="formName">Nombre completo</label>

                    <input
                        id="formName"
                        name="nombre_completo"
                        value={formData.nombre_completo}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required
                        placeholder="Nombre del usuario"
                        autoComplete="name"
                    />
                </div>

                <div className="dialog-field">
                    <label htmlFor="formUsername">Nombre de usuario</label>

                    <input
                        id="formUsername"
                        name="nombre_usuario"
                        value={formData.nombre_usuario}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required
                        placeholder="Usuario"
                        autoComplete="username"
                    />
                </div>

                <div className="dialog-field">
                    <label htmlFor="formPassword">
                        {esEdicion ? "Contraseña (opcional)" : "Contraseña"}
                    </label>

                    <div className="password-field">
                        <input
                            id="formPassword"
                            name="contrasena"
                            type={mostrarPassword ? "text" : "password"}
                            value={formData.contrasena}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            required={!esEdicion}
                            minLength="8"
                            placeholder={
                                esEdicion
                                    ? "Vacía para conservar la actual"
                                    : "Mínimo 8 caracteres"
                            }
                            autoComplete="new-password"
                        />

                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setMostrarPassword(!mostrarPassword)}
                            aria-label={
                                mostrarPassword
                                    ? "Ocultar contraseña"
                                    : "Mostrar contraseña"
                            }
                            disabled={isSubmitting}
                        >
                            {mostrarPassword ? "Ocultar" : "Mostrar"}
                        </button>
                    </div>
                </div>

                <div className="dialog-field">
                    <label htmlFor="formRole">Rol</label>

                    <select
                        id="formRole"
                        name="rol"
                        value={formData.rol}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required
                    >
                        <option value="">Seleccione un rol</option>
                        {ROLES_PERMITIDOS.map((rol) => (
                            <option key={rol} value={rol}>
                                {obtenerEtiquetaRol(rol)}
                            </option>
                        ))}
                    </select>
                </div>

                <p className="dialog-hint">
                    {esEdicion
                        ? "Deja la contraseña vacía para conservar la actual."
                        : "Todos los campos son obligatorios."}
                </p>

                <div className="dialog-actions">
                    <button
                        className="management-secondary"
                        type="button"
                        onClick={cerrarDialogo}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>

                    <button
                        className="management-primary"
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? "Guardando..."
                            : esEdicion
                              ? "Guardar cambios"
                              : "Guardar usuario"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default RegistrarUsuarioForm;
