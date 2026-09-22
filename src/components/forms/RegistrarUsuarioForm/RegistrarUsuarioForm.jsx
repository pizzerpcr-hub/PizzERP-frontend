import { useState } from "react";
import "./RegistrarUsuarioForm.css";

function RegistrarUsuarioForm({ onSubmit, onClose }) {
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();

        const usuario = {
            nombre_completo: event.target.formName.value,
            nombre_usuario: event.target.formUsername.value,
            contrasena: event.target.formPassword.value,
            rol: event.target.formRole.value,
        };

        onSubmit(usuario);
    };

    return (
        <dialog className="user-dialog" open>
            <form
                id="userForm"
                onSubmit={handleSubmit}
                noValidate
            >
                <div className="dialog-heading">
                    <div>
                        <p className="eyebrow">
                            Gestión de usuarios
                        </p>

                        <h2 id="dialogTitle">
                            Registrar usuario
                        </h2>
                    </div>

                    <button
                        className="dialog-close"
                        type="button"
                        aria-label="Cerrar"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <p
                    id="userFormMessage"
                    className="dialog-message"
                    role="alert"
                    aria-live="polite"
                ></p>

                <div className="dialog-field">
                    <label htmlFor="formName">
                        Nombre completo
                    </label>

                    <input
                        id="formName"
                        name="name"
                        required
                        placeholder="Nombre del usuario"
                        autoComplete="name"
                    />
                </div>

                <div className="dialog-field">
                    <label htmlFor="formUsername">
                        Nombre de usuario
                    </label>

                    <input
                        id="formUsername"
                        name="username"
                        required
                        placeholder="Usuario"
                        autoComplete="username"
                    />
                </div>

                <div className="dialog-field">
                    <label htmlFor="formPassword">
                        Contraseña
                    </label>

                    <div className="password-field">
                        <input
                            id="formPassword"
                            name="password"
                            type={mostrarPassword ? "text" : "password"}
                            required
                            minLength="8"
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
                        />

                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() =>
                                setMostrarPassword(!mostrarPassword)
                            }
                            aria-label={
                                mostrarPassword
                                    ? "Ocultar contraseña"
                                    : "Mostrar contraseña"
                            }
                        >
                            {mostrarPassword ? "Ocultar" : "Mostrar"}
                        </button>
                    </div>
                </div>

                <div className="dialog-field">
                    <label htmlFor="formRole">
                        Rol
                    </label>

                    <select
                        id="formRole"
                        name="role"
                        required
                    >
                        <option value="">
                            Seleccione un rol
                        </option>

                        <option value="Administrador">
                            Administrador
                        </option>

                        <option value="Caja">
                            Caja
                        </option>

                        <option value="Cocina">
                            Cocina
                        </option>

                        <option value="Encargado TI">
                            Encargado de TI
                        </option>
                    </select>
                </div>

                <p className="dialog-hint">
                    Todos los campos son obligatorios.
                </p>

                <div className="dialog-actions">
                    <button
                        className="management-secondary"
                        type="button"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        className="management-primary"
                        type="submit"
                    >
                        Guardar usuario
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default RegistrarUsuarioForm;