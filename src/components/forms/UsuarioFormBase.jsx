import { useEffect, useRef, useState } from "react";
import {
    normalizarRol,
    obtenerEtiquetaRol,
} from "../../constants/roles.js";

const formularioVacio = {
    nombre_completo: "",
    nombre_usuario: "",
    contrasena: "",
    confirmar_contrasena: "",
    rol: "",
    motivo: "",
};

const requisitosContrasena = [
    { texto: "Mínimo 8 caracteres", cumple: (valor) => valor.length >= 8 },
    { texto: "Al menos una letra", cumple: (valor) => /[A-Za-z]/.test(valor) },
    { texto: "Al menos un número", cumple: (valor) => /\d/.test(valor) },
];

const obtenerDatosIniciales = (usuarioInicial) => ({
    ...formularioVacio,
    nombre_completo: usuarioInicial?.nombre_completo ?? "",
    nombre_usuario: usuarioInicial?.nombre_usuario?.toUpperCase() ?? "",
    rol: normalizarRol(usuarioInicial?.rol),
});

function UsuarioFormBase({
    usuarioInicial = null,
    rolesDisponibles = [],
    estadoCatalogoRoles = "listo",
    errorCatalogoRoles = "",
    onReintentarRoles,
    titulo,
    etiquetaContrasena,
    placeholderContrasena,
    nota,
    textoGuardar,
    contrasenaObligatoria,
    onSubmit,
    onClose,
    isSubmitting = false,
    notificacion = null,
}) {
    const dialogRef = useRef(null);
    const envioEnCursoRef = useRef(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [avisosCampo, setAvisosCampo] = useState({});
    const [errorNota, setErrorNota] = useState(false);
    const [formData, setFormData] = useState(() =>
        obtenerDatosIniciales(usuarioInicial),
    );
    const mostrarRequisitosContrasena =
        !requisitosContrasena.every(({ cumple }) => cumple(formData.contrasena));
    const rolesListos = estadoCatalogoRoles === "listo" && rolesDisponibles.length > 0;
    const hayCambios = Boolean(usuarioInicial) && (
        formData.nombre_completo.trim() !== usuarioInicial.nombre_completo ||
        formData.nombre_usuario.trim().toUpperCase() !== usuarioInicial.nombre_usuario ||
        normalizarRol(formData.rol) !== normalizarRol(usuarioInicial.rol) ||
        Boolean(formData.contrasena)
    );

    const todosVacios = (datos) =>
        Object.values(datos).every((valor) => !valor.trim());
    const validarCampos = (datos) => {
        const errores = {};
        const contrasena = datos.contrasena;
        if (!datos.nombre_completo.trim()) errores.nombre_completo = "Ingresa el nombre completo.";
        if (!datos.nombre_usuario.trim()) errores.nombre_usuario = "Ingresa el nombre de usuario.";
        if (!contrasena && contrasenaObligatoria) errores.contrasena = "La contraseña es obligatoria.";
        else if (contrasena && contrasena.length < 8) errores.contrasena = "La contraseña debe tener al menos 8 caracteres.";
        else if (contrasena && !/(?=.*[A-Za-z])(?=.*\d)/.test(contrasena)) errores.contrasena = "La contraseña debe incluir una letra y un número.";
        if (contrasenaObligatoria || contrasena || datos.confirmar_contrasena) {
            if (!datos.confirmar_contrasena) errores.confirmar_contrasena = "Confirma la contraseña.";
            else if (datos.confirmar_contrasena !== contrasena) errores.confirmar_contrasena = "Las contraseñas no coinciden.";
        }
        if (!datos.rol) errores.rol = "Selecciona un rol.";
        if (hayCambios && !datos.motivo.trim()) errores.motivo = "El motivo de la modificación es obligatorio.";
        return errores;
    };

    const avisosDesdeErrores = (errores) =>
        Object.fromEntries(
            Object.entries(errores).map(([campo, texto]) => [campo, { texto }]),
        );

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
        setAvisosCampo({});
        setErrorNota(false);
        /* eslint-enable react-hooks/set-state-in-effect */
        envioEnCursoRef.current = false;
    }, [usuarioInicial]);

    const mostrarErroresCampo = (errores) => {
        setAvisosCampo((actuales) => ({
            ...actuales,
            ...avisosDesdeErrores(errores),
        }));
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        const datosActualizados = {
            ...formData,
            [name]: name === "nombre_usuario" ? value.toUpperCase() : value,
            ...(name === "contrasena" && !value ? { confirmar_contrasena: "" } : {}),
        };
        setFormData(datosActualizados);
        setErrorNota(false);

        if (errorNota && todosVacios(datosActualizados)) {
            setAvisosCampo({});
        } else {
            setAvisosCampo((actuales) => ({
                ...actuales,
                [name]: null,
                ...(name === "contrasena" ? { confirmar_contrasena: null } : {}),
            }));
        }
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

        if (isSubmitting || envioEnCursoRef.current || !rolesListos) {
            return;
        }

        if (todosVacios(formData)) {
            setErrorNota(true);
            setAvisosCampo({});
            return;
        }

        const contrasena = formData.contrasena;
        const errores = validarCampos(formData);

        if (Object.keys(errores).length) {
            setErrorNota(true);
            mostrarErroresCampo(errores);
            return;
        }

        setErrorNota(false);

        const datosUsuario = {
            nombre_completo: formData.nombre_completo.trim(),
            nombre_usuario: formData.nombre_usuario.trim().toUpperCase(),
            rol: normalizarRol(formData.rol),
            ...(usuarioInicial ? { motivo: formData.motivo.trim() } : {}),
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
                            {titulo}
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

                <div className="dialog-field">
                    <label htmlFor="formName">Nombre completo</label>

                    <input
                        id="formName"
                        name="nombre_completo"
                        value={formData.nombre_completo}
                        maxLength={50}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required
                        placeholder="Ej. María Pérez Rojas"
                        autoComplete="name"
                        aria-invalid={Boolean(avisosCampo.nombre_completo)}
                        aria-describedby={avisosCampo.nombre_completo ? "formNameError" : undefined}
                    />
                    {avisosCampo.nombre_completo && (
                        <p id="formNameError" className="dialog-message dialog-field-message visible" role="alert">
                            {avisosCampo.nombre_completo.texto}
                        </p>
                    )}
                </div>

                <div className="dialog-field">
                    <label htmlFor="formUsername">Nombre de usuario</label>

                    <input
                        id="formUsername"
                        name="nombre_usuario"
                        value={formData.nombre_usuario}
                        maxLength={50}
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
                        {etiquetaContrasena}
                    </label>

                    <div className="password-field">
                        <input
                            id="formPassword"
                            name="contrasena"
                            type={mostrarPassword ? "text" : "password"}
                            value={formData.contrasena}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            required={contrasenaObligatoria}
                            minLength="8"
                            placeholder={placeholderContrasena}
                            autoComplete="new-password"
                            aria-invalid={Boolean(avisosCampo.contrasena)}
                            aria-describedby={[
                                mostrarRequisitosContrasena && "formPasswordRequirements",
                                avisosCampo.contrasena && "formPasswordError",
                            ].filter(Boolean).join(" ") || undefined}
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
                    {mostrarRequisitosContrasena && (
                        <div className="password-requirements-panel">
                            <p className="password-requirements-title">La contraseña debe incluir:</p>
                            <ul id="formPasswordRequirements" className="password-requirements" aria-label="Requisitos de la contraseña">
                                {requisitosContrasena.map(({ texto, cumple }) => {
                                    const cumplido = cumple(formData.contrasena);
                                    return (
                                        <li key={texto} className={cumplido ? "met" : ""}>
                                            <span>{texto}</span>
                                            {cumplido && (
                                                <span className="password-requirement-icon" aria-hidden="true">✓</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="dialog-field">
                        <label htmlFor="formPasswordConfirmation">Confirmar contraseña</label>
                        <input
                            id="formPasswordConfirmation"
                            name="confirmar_contrasena"
                            type={mostrarPassword ? "text" : "password"}
                            value={formData.confirmar_contrasena}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            required={contrasenaObligatoria || Boolean(formData.contrasena)}
                            placeholder="Repite la contraseña"
                            autoComplete="new-password"
                            aria-invalid={Boolean(avisosCampo.confirmar_contrasena)}
                            aria-describedby={avisosCampo.confirmar_contrasena ? "formPasswordConfirmationError" : undefined}
                        />
                        {avisosCampo.confirmar_contrasena && (
                            <p id="formPasswordConfirmationError" className="dialog-message dialog-field-message visible" role="alert">
                                {avisosCampo.confirmar_contrasena.texto}
                            </p>
                        )}
                        {formData.confirmar_contrasena && formData.confirmar_contrasena === formData.contrasena && !avisosCampo.confirmar_contrasena && (
                            <p className="password-match met" role="status">
                                ✓ Las contraseñas coinciden.
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
                        disabled={isSubmitting || !rolesListos}
                        aria-busy={estadoCatalogoRoles === "cargando"}
                        required
                        aria-invalid={Boolean(avisosCampo.rol)}
                        aria-describedby={avisosCampo.rol ? "formRoleError" : undefined}
                    >
                        <option value="">{estadoCatalogoRoles === "cargando" ? "Cargando roles…" : "Seleccione un rol"}</option>
                        {formData.rol && !rolesDisponibles.some((rol) => rol.nombre === formData.rol) &&
                            <option value={formData.rol} disabled>{estadoCatalogoRoles === "cargando" ? "Cargando roles…" : `${obtenerEtiquetaRol(formData.rol)}${estadoCatalogoRoles === "listo" ? " (inactivo; selecciona otro)" : ""}`}</option>}
                        {rolesDisponibles.map((rol) => (
                            <option key={rol.nombre} value={rol.nombre}>
                                {obtenerEtiquetaRol(rol.nombre)}
                            </option>
                        ))}
                    </select>
                    {(estadoCatalogoRoles === "error" || errorCatalogoRoles) && (
                        <p className="dialog-message dialog-field-message visible" role="alert">
                            No fue posible cargar los roles. <button type="button" onClick={onReintentarRoles}>Reintentar</button>
                        </p>
                    )}
                    {estadoCatalogoRoles === "listo" && !errorCatalogoRoles && !rolesDisponibles.length && (
                        <p className="dialog-message dialog-field-message visible" role="alert">No hay roles disponibles para asignar.</p>
                    )}
                    {avisosCampo.rol && (
                        <p id="formRoleError" className="dialog-message dialog-field-message visible" role="alert">
                            {avisosCampo.rol.texto}
                        </p>
                    )}
                </div>

                <p
                    className={`dialog-hint${errorNota ? " error" : ""}`}
                    role={errorNota ? "alert" : undefined}
                >
                    {nota}
                </p>

                {hayCambios && <div className="dialog-field change-reason">
                    <label htmlFor="formReason">Motivo de la modificación</label>
                    <p>Indica por qué realizaste este cambio. El motivo quedará registrado en la bitácora.</p>
                    <textarea id="formReason" name="motivo" maxLength={50} required placeholder="Ej: Corrección de datos"
                        value={formData.motivo} onChange={handleChange} disabled={isSubmitting}
                        aria-invalid={Boolean(avisosCampo.motivo)} />
                    <small className="field-character-count">{formData.motivo.length}/50</small>
                    {avisosCampo.motivo && <p className="dialog-message dialog-field-message visible" role="alert">
                        {avisosCampo.motivo.texto}
                    </p>}
                </div>}

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
                        disabled={isSubmitting || !rolesListos}
                    >
                        {isSubmitting
                            ? "Guardando..."
                            : textoGuardar}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default UsuarioFormBase;
