import { useState } from "react";
import { validarCamposFormulario } from "../validarCamposFormulario.js";

const unidades = ["g", "kg", "ml", "l", "u"];

function IngredienteForm({ ingrediente, onCerrar, onGuardar, enviando }) {
    const modoEdicion = Boolean(ingrediente);
    const [datos, setDatos] = useState({
        nombre: ingrediente?.nombre ?? "",
        unidad_medida: ingrediente?.unidad_medida ?? "",
        cantidad_disponible: ingrediente?.cantidad_disponible ?? "0",
        stock_minimo: ingrediente?.stock_minimo ?? "0",
        estado: ingrediente?.estado ?? "ACTIVO",
        motivo: "",
    });
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState("");
    const [avisoCampos, setAvisoCampos] = useState(false);
    const hayCambios = modoEdicion && (
        datos.nombre.trim() !== ingrediente.nombre ||
        datos.unidad_medida.trim() !== ingrediente.unidad_medida ||
        Number(datos.cantidad_disponible) !== Number(ingrediente.cantidad_disponible) ||
        Number(datos.stock_minimo) !== Number(ingrediente.stock_minimo) ||
        datos.estado !== ingrediente.estado
    );
    const hayDatos = Boolean(datos.nombre.trim() || datos.unidad_medida || datos.motivo.trim()
        || (!modoEdicion && (String(datos.cantidad_disponible) !== "0" || String(datos.stock_minimo) !== "0")));

    const cambiar = (campo, valor) => {
        setDatos((actual) => ({ ...actual, [campo]: valor }));
        setErrores((actual) => ({ ...actual, [campo]: undefined }));
    };

    const manejarSubmit = async (event) => {
        event.preventDefault();
        const erroresCampos = validarCamposFormulario(event.currentTarget);
        if (Object.keys(erroresCampos).length) {
            setErrores(hayDatos ? erroresCampos : {});
            setAvisoCampos(true);
            return;
        }
        setErrorGeneral("");

        if (hayCambios && !datos.motivo.trim()) {
            setAvisoCampos(true);
            setErrores({ motivo: "El motivo de la modificación es obligatorio." });
            return;
        }

        try {
            await onGuardar({
                nombre: datos.nombre.trim(),
                unidad_medida: datos.unidad_medida.trim(),
                cantidad_disponible: datos.cantidad_disponible,
                stock_minimo: datos.stock_minimo,
                estado: datos.estado,
                ...(modoEdicion ? { motivo: datos.motivo.trim() } : {}),
            });
        } catch (error) {
            if (error.status === 422 && error.errors) {
                setAvisoCampos(true);
                setErrores(Object.fromEntries(Object.entries(error.errors).map(([campo, mensajes]) => [
                    campo, Array.isArray(mensajes) ? mensajes[0] : mensajes,
                ])));
            } else {
                setErrorGeneral(error.message || "No fue posible guardar el ingrediente.");
            }
        }
    };

    return (
        <div className="modal-overlay open" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !enviando) onCerrar();
        }}>
            <div className="category-modal" role="dialog" aria-modal="true" aria-labelledby="ingredienteTitulo">
                <button className="modal-close" type="button" onClick={onCerrar} disabled={enviando} aria-label="Cerrar">×</button>
                <div className="modal-header">
                    <span className="management-eyebrow">Administración</span>
                    <h2 id="ingredienteTitulo">{modoEdicion ? "Editar ingrediente" : "Registrar ingrediente"}</h2>
                    <p>Completa la información del ingrediente.</p>
                </div>
                <form onSubmit={manejarSubmit} noValidate onInputCapture={() => setAvisoCampos(false)} data-invalid={avisoCampos && hayDatos}>
                    <div className="form-group">
                        <label htmlFor="nombreIngrediente">Nombre del ingrediente</label>
                        <input id="nombreIngrediente" name="nombre" type="text" maxLength="50" required placeholder="Ej: Harina" value={datos.nombre}
                            data-mensaje-obligatorio="Ingresa el nombre del ingrediente."
                            onChange={(event) => cambiar("nombre", event.target.value)} aria-invalid={Boolean(errores.nombre)} />
                        {errores.nombre && <small className="required-field-message" role="alert">{errores.nombre}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="unidadIngrediente">Unidad de medida</label>
                        <select id="unidadIngrediente" name="unidad_medida" required value={datos.unidad_medida}
                            data-mensaje-obligatorio="Selecciona una unidad de medida."
                            onChange={(event) => cambiar("unidad_medida", event.target.value)} aria-invalid={Boolean(errores.unidad_medida)}>
                            <option value="">Seleccionar unidad</option>
                            {unidades.map((unidad) =>
                                <option key={unidad} value={unidad}>{unidad}</option>
                            )}
                        </select>
                        {errores.unidad_medida && <small className="required-field-message" role="alert">{errores.unidad_medida}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="cantidadIngrediente">Cantidad disponible</label>
                        <input id="cantidadIngrediente" name="cantidad_disponible" type="number" min="0" max="99999999.99" step="0.01" required
                            data-mensaje-obligatorio="Ingresa la cantidad disponible." data-mensaje-invalido="Ingresa una cantidad disponible válida."
                            value={datos.cantidad_disponible} onChange={(event) => cambiar("cantidad_disponible", event.target.value)}
                            aria-invalid={Boolean(errores.cantidad_disponible)} />
                        {errores.cantidad_disponible && <small className="required-field-message" role="alert">{errores.cantidad_disponible}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="stockMinimoIngrediente">Stock mínimo</label>
                        <input id="stockMinimoIngrediente" name="stock_minimo" type="number" min="0" max="99999999.99" step="0.01" required
                            data-mensaje-obligatorio="Ingresa el stock mínimo." data-mensaje-invalido="Ingresa un stock mínimo válido."
                            value={datos.stock_minimo} onChange={(event) => cambiar("stock_minimo", event.target.value)}
                            aria-invalid={Boolean(errores.stock_minimo)} />
                        {errores.stock_minimo && <small className="required-field-message" role="alert">{errores.stock_minimo}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="estadoIngrediente">Estado</label>
                        <select id="estadoIngrediente" value={datos.estado} onChange={(event) => cambiar("estado", event.target.value)}>
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                        </select>
                    </div>
                    {hayCambios && <div className="form-group change-reason">
                        <label htmlFor="motivoIngrediente">Motivo de la modificación</label>
                        <p>Indica por qué realizaste este cambio. El motivo quedará registrado en la bitácora.</p>
                        <textarea id="motivoIngrediente" name="motivo" maxLength="50" required placeholder="Ej: Ajuste del stock mínimo" value={datos.motivo}
                            data-mensaje-obligatorio="Ingresa el motivo de la modificación."
                            onChange={(event) => cambiar("motivo", event.target.value)} aria-invalid={Boolean(errores.motivo)} />
                        <small className="field-character-count">{datos.motivo.length}/50</small>
                        {errores.motivo && <small className="required-field-message" role="alert">{errores.motivo}</small>}
                    </div>}
                    <p className={`required-fields-hint${avisoCampos ? " error" : ""}`} role={avisoCampos ? "alert" : undefined}>
                        Completa los campos obligatorios.
                    </p>
                    {errorGeneral && <p className="ingredient-error" role="alert">{errorGeneral}</p>}
                    <div className="form-actions">
                        <button className="management-secondary" type="button" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                        <button className="management-primary" type="submit" disabled={enviando}>
                            {enviando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Registrar ingrediente"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default IngredienteForm;
