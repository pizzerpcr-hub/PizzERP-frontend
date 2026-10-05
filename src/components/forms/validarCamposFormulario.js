export function validarCamposFormulario(formulario) {
    const errores = {};

    for (const campo of formulario.elements) {
        if (!campo.name || campo.disabled) continue;
        const vacio = campo.required && !campo.value.trim() && !campo.validity.badInput;
        if (!vacio && campo.checkValidity()) continue;

        errores[campo.name] = vacio || campo.validity.valueMissing
            ? campo.dataset.mensajeObligatorio || "Completa este campo."
            : campo.dataset.mensajeInvalido || "Ingresa un valor válido.";
    }

    return errores;
}
