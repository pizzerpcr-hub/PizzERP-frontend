import { useState } from "react";

const unidades = ["g", "kg", "ml", "l", "u"];

function IngredienteForm({ ingrediente, onCerrar, onGuardar, enviando }) {
    const modoEdicion = Boolean(ingrediente);
    const [datos, setDatos] = useState({
        nombre: ingrediente?.nombre ?? "",
        unidad_medida: ingrediente?.unidad_medida ?? "",
        cantidad_disponible: ingrediente?.cantidad_disponible ?? "0",
        estado: ingrediente?.estado ?? "ACTIVO",
        motivo: "",
    });
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState("");
    const hayCambios = modoEdicion && (
        datos.nombre.trim() !== ingrediente.nombre ||
        datos.unidad_medida.trim() !== ingrediente.unidad_medida ||
        Number(datos.cantidad_disponible) !== Number(ingrediente.cantidad_disponible) ||
        datos.estado !== ingrediente.estado
    );

    const cambiar = (campo, valor) => {
        setDatos((actual) => ({ ...actual, [campo]: valor }));
        setErrores((actual) => ({ ...actual, [campo]: undefined }));
    };

    const manejarSubmit = async (event) => {
        event.preventDefault();
        setErrorGeneral("");

        if (hayCambios && !datos.motivo.trim()) {
            setErrores({ motivo: "El motivo de la modificación es obligatorio." });
            return;
        }

        try {
            await onGuardar({
                nombre: datos.nombre.trim(),
                unidad_medida: datos.unidad_medida.trim(),
                cantidad_disponible: datos.cantidad_disponible,
                estado: datos.estado,
                ...(modoEdicion ? { motivo: datos.motivo.trim() } : {}),
            });
        } catch (error) {
            if (error.status === 422 && error.errors) {
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
                <form onSubmit={manejarSubmit}>
                    <div className="form-group">
                        <label htmlFor="nombreIngrediente">Nombre del ingrediente</label>
                        <input id="nombreIngrediente" type="text" maxLength="100" required placeholder="Ej: Harina" value={datos.nombre}
                            onChange={(event) => cambiar("nombre", event.target.value)} aria-invalid={Boolean(errores.nombre)} />
                        {errores.nombre && <small className="ingredient-field-error">{errores.nombre}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="unidadIngrediente">Unidad de medida</label>
                        <select id="unidadIngrediente" required value={datos.unidad_medida}
                            onChange={(event) => cambiar("unidad_medida", event.target.value)} aria-invalid={Boolean(errores.unidad_medida)}>
                            <option value="">Seleccionar unidad</option>
                            {[...new Set([...unidades, datos.unidad_medida].filter(Boolean))].map((unidad) =>
                                <option key={unidad} value={unidad}>{unidad}</option>
                            )}
                        </select>
                        {errores.unidad_medida && <small className="ingredient-field-error">{errores.unidad_medida}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="cantidadIngrediente">Cantidad disponible</label>
                        <input id="cantidadIngrediente" type="number" min="0" max="99999999.99" step="0.01" required
                            value={datos.cantidad_disponible} onChange={(event) => cambiar("cantidad_disponible", event.target.value)}
                            aria-invalid={Boolean(errores.cantidad_disponible)} />
                        {errores.cantidad_disponible && <small className="ingredient-field-error">{errores.cantidad_disponible}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="estadoIngrediente">Estado</label>
                        <select id="estadoIngrediente" value={datos.estado} onChange={(event) => cambiar("estado", event.target.value)}>
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                        </select>
                    </div>
                    {modoEdicion && <div className="form-group">
                        <label htmlFor="motivoIngrediente">Motivo de la modificación</label>
                        <textarea id="motivoIngrediente" maxLength="120" required={hayCambios} value={datos.motivo}
                            onChange={(event) => cambiar("motivo", event.target.value)} aria-invalid={Boolean(errores.motivo)} />
                        {errores.motivo && <small className="ingredient-field-error">{errores.motivo}</small>}
                    </div>}
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
