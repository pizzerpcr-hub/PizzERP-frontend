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
    isSubmitting = false,
    notificacion = null,
}) {
    const dialogRef = useRef(null);
    const envioEnCursoRef = useRef(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [errorValidacion, setErrorValidacion] = useState("");
    const [avisosCampo, setAvisosCampo] = useState({
        nombre_usuario: null,
        contrasena: null,
    });
    const [formData, setFormData] = useState(() =>
        obtenerDatosIniciales(usuarioInicial),
    );

    const esEdicion = modo === "editar";
    const [puntosGuardando, setPuntosGuardando] = useState("");

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
        setAvisosCampo({ nombre_usuario: null, contrasena: null });
        /* eslint-enable react-hooks/set-state-in-effect */
        envioEnCursoRef.current = false;
    }, [modo, usuarioInicial]);

    useEffect(() => {
        const aviso = avisosCampo.nombre_usuario;

        if (!aviso) {
            return undefined;
        }

        const temporizador = window.setTimeout(() => {
            setAvisosCampo((actuales) =>
                actuales.nombre_usuario === aviso
                    ? { ...actuales, nombre_usuario: null }
                    : actuales,
            );
        }, 4000);

        return () => window.clearTimeout(temporizador);
    }, [avisosCampo.nombre_usuario]);

    useEffect(() => {
        const aviso = avisosCampo.contrasena;

        if (!aviso) {
            return undefined;
        }

        const temporizador = window.setTimeout(() => {
            setAvisosCampo((actuales) =>
                actuales.contrasena === aviso
                    ? { ...actuales, contrasena: null }
                    : actuales,
            );
        }, 4000);

        return () => window.clearTimeout(temporizador);
    }, [avisosCampo.contrasena]);


    useEffect(() => {
        if (!isSubmitting) {
            setPuntosGuardando("");
            return undefined;
        }

        const secuencia = [".", "..", "...", ""];
        let indice = 0;

        setPuntosGuardando(secuencia[indice]); 

        const intervalo = window.setInterval(() => {
            indice = (indice + 1) % secuencia.length;
            setPuntosGuardando(secuencia[indice]);
        }, 500);

        return () => window.clearInterval(intervalo);
    }, [isSubmitting]);

    const mostrarErroresCampo = (errores) => {
        setAvisosCampo((actuales) => ({
            nombre_usuario: errores.nombre_usuario
                ? { texto: errores.nombre_usuario }
                : actuales.nombre_usuario,
            contrasena: errores.contrasena
                ? { texto: errores.contrasena }
                : actuales.contrasena,
        }));
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((datosActuales) => ({
            ...datosActuales,
            [name]: name === "nombre_usuario" ? value.toUpperCase() : value,
        }));
        if (name === "nombre_usuario" || name === "contrasena") {
            setAvisosCampo((actuales) => ({ ...actuales, [name]: null }));
        }
        setErrorValidacion("");
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
        const faltanDatos =
            !formData.nombre_completo.trim() ||
            !formData.nombre_usuario.trim() ||
            !formData.rol;
        const faltaContrasena = !esEdicion && !contrasena;
        const contrasenaInvalida =
            Boolean(contrasena) &&
            !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(contrasena);

        if (faltanDatos) {
            setErrorValidacion("Completa todos los campos obligatorios.");
        }

        if (faltaContrasena) {
            mostrarErroresCampo({ contrasena: "La contraseña es obligatoria." });
        } else if (contrasenaInvalida) {
            mostrarErroresCampo({
                contrasena:
                    "La contraseña debe tener al menos 8 caracteres, una letra y un número.",
            });
        }

        if (faltanDatos || faltaContrasena || contrasenaInvalida) {
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
            const resultado = await onSubmit(datosUsuario);

            if (resultado?.erroresCampo) {
                mostrarErroresCampo(resultado.erroresCampo);
            }
        } finally {
            envioEnCursoRef.current = false;
        }
    };

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

                {notificacion}

                <p
                    id="userFormMessage"
                    className={`dialog-message${errorValidacion ? " visible" : ""}`}
                    role="alert"
                    aria-live="polite"
                >
                    {errorValidacion}
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
                        aria-invalid={Boolean(avisosCampo.nombre_usuario)}
                        aria-describedby={
                            avisosCampo.nombre_usuario
                                ? "formUsernameError"
                                : undefined
                        }
                    />
                    {avisosCampo.nombre_usuario && (
                        <p
                            id="formUsernameError"
                            className="dialog-message dialog-field-message visible"
                            role="alert"
                        >
                            {avisosCampo.nombre_usuario.texto}
                        </p>
                    )}
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
                            aria-invalid={Boolean(avisosCampo.contrasena)}
                            aria-describedby={
                                avisosCampo.contrasena
                                    ? "formPasswordError"
                                    : undefined
                            }
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
                    {avisosCampo.contrasena && (
                        <p
                            id="formPasswordError"
                            className="dialog-message dialog-field-message visible"
                            role="alert"
                        >
                            {avisosCampo.contrasena.texto}
                        </p>
                    )}
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
                            ? `Guardando${puntosGuardando}`
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
