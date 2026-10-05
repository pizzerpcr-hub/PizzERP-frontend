import { useState } from "react";
import { validarCamposFormulario } from "../validarCamposFormulario.js";

function CategoriaForm({ categoria, enviando, onGuardar, onCerrar }) {
    const [datos, setDatos] = useState({
        nombre: categoria?.nombre ?? "",
        codigo_categoria: categoria?.codigo_categoria ?? "",
        descripcion: categoria?.descripcion ?? "",
        estado: categoria?.estado ?? "ACTIVO",
        motivo: "",
    });
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState("");
    const [avisoCampos, setAvisoCampos] = useState(false);
    const hayCambios = Boolean(categoria) && (
        datos.nombre.trim() !== categoria.nombre ||
        datos.codigo_categoria.trim().toUpperCase() !== categoria.codigo_categoria ||
        datos.descripcion.trim() !== categoria.descripcion
    );
    const hayDatos = [datos.nombre, datos.codigo_categoria, datos.descripcion, datos.motivo]
        .some((valor) => valor.trim());

    const cambiar = (campo, valor) => {
        setDatos((actual) => ({ ...actual, [campo]: valor }));
        setErrores((actual) => ({ ...actual, [campo]: undefined }));
    };

    const guardar = async (event) => {
        event.preventDefault();
        const erroresCampos = validarCamposFormulario(event.currentTarget);
        if (Object.keys(erroresCampos).length) {
            setErrores(hayDatos ? erroresCampos : {});
            setAvisoCampos(true);
            return;
        }
        setErrorGeneral("");

        try {
            await onGuardar({
                nombre: datos.nombre.trim(),
                codigo_categoria: datos.codigo_categoria.trim().toUpperCase(),
                descripcion: datos.descripcion.trim(),
                ...(!categoria && { estado: datos.estado }),
                ...(categoria && { motivo: datos.motivo.trim() }),
            });
        } catch (error) {
            if (error.status === 422 && error.errors) {
                setAvisoCampos(true);
                setErrores(Object.fromEntries(Object.entries(error.errors).map(([campo, mensajes]) => [
                    campo, Array.isArray(mensajes) ? mensajes[0] : mensajes,
                ])));
            } else {
                setErrorGeneral(error.message || "No fue posible guardar la categoría.");
            }
        }
    };

    return (
        <div className="modal-overlay open" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !enviando) onCerrar();
        }}>
            <div className="category-modal" role="dialog" aria-modal="true" aria-labelledby="categoriaTitulo">
                <button className="modal-close" type="button" onClick={onCerrar} disabled={enviando} aria-label="Cerrar">×</button>
                <div className="modal-header">
                    <span className="management-eyebrow">Administración</span>
                    <h2 id="categoriaTitulo">{categoria ? "Editar categoría" : "Registrar categoría"}</h2>
                    <p>Completa la información de la categoría.</p>
                </div>
                <form onSubmit={guardar} noValidate onInputCapture={() => setAvisoCampos(false)} data-invalid={avisoCampos && hayDatos}>
                    <div className="form-group">
                        <label htmlFor="nombreCategoria">Nombre de la categoría</label>
                        <input id="nombreCategoria" name="nombre" type="text" maxLength="50" required placeholder="Ej: Pizzas"
                            data-mensaje-obligatorio="Ingresa el nombre de la categoría."
                            value={datos.nombre} onChange={(event) => cambiar("nombre", event.target.value)}
                            aria-invalid={Boolean(errores.nombre)} />
                        {errores.nombre && <small className="required-field-message" role="alert">{errores.nombre}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="codigoCategoria">Código de la categoría</label>
                        <input id="codigoCategoria" name="codigo_categoria" type="text" maxLength="15" required placeholder="Ej: PIZ"
                            data-mensaje-obligatorio="Ingresa el código de la categoría."
                            value={datos.codigo_categoria} onChange={(event) => cambiar("codigo_categoria", event.target.value.toUpperCase())}
                            aria-invalid={Boolean(errores.codigo_categoria)} />
                        {errores.codigo_categoria && <small className="required-field-message" role="alert">{errores.codigo_categoria}</small>}
                        {categoria && <small>Al cambiar el código, se renumeran los productos asociados.</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="descripcionCategoria">Descripción</label>
                        <textarea id="descripcionCategoria" name="descripcion" rows="4" maxLength="50" required placeholder="Describe la categoría..."
                            data-mensaje-obligatorio="Ingresa la descripción de la categoría."
                            value={datos.descripcion} onChange={(event) => cambiar("descripcion", event.target.value)}
                            aria-invalid={Boolean(errores.descripcion)} />
                        <small className="field-character-count">{datos.descripcion.length}/50</small>
                        {errores.descripcion && <small className="required-field-message" role="alert">{errores.descripcion}</small>}
                    </div>
                    {!categoria && <div className="form-group">
                        <label htmlFor="estadoCategoria">Estado</label>
                        <select id="estadoCategoria" value={datos.estado} onChange={(event) => cambiar("estado", event.target.value)}>
                            <option value="ACTIVO">Activa</option>
                            <option value="INACTIVO">Inactiva</option>
                        </select>
                    </div>}
                    {hayCambios && <div className="form-group change-reason">
                        <label htmlFor="motivoCategoria">Motivo de la modificación</label>
                        <p>Indica por qué realizaste este cambio. El motivo quedará registrado en la bitácora.</p>
                        <textarea id="motivoCategoria" name="motivo" maxLength="50" required placeholder="Ej: Corrección del nombre" value={datos.motivo}
                            data-mensaje-obligatorio="Ingresa el motivo de la modificación."
                            onChange={(event) => cambiar("motivo", event.target.value)} aria-invalid={Boolean(errores.motivo)} />
                        <small className="field-character-count">{datos.motivo.length}/50</small>
                        {errores.motivo && <small className="required-field-message" role="alert">{errores.motivo}</small>}
                    </div>}
                    <p className={`required-fields-hint${avisoCampos ? " error" : ""}`} role={avisoCampos ? "alert" : undefined}>
                        Completa los campos obligatorios.
                    </p>
                    {errorGeneral && <p className="catalog-error" role="alert">{errorGeneral}</p>}
                    <div className="form-actions">
                        <button className="management-secondary" type="button" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                        <button className="management-primary" type="submit" disabled={enviando}>
                            {enviando ? "Guardando..." : categoria ? "Guardar cambios" : "Registrar categoría"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CategoriaForm;
