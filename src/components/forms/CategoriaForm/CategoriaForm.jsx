import { useState } from "react";

function CategoriaForm({ categoria, enviando, onGuardar, onCerrar }) {
    const [datos, setDatos] = useState({
        nombre: categoria?.nombre ?? "",
        descripcion: categoria?.descripcion ?? "",
        estado: categoria?.estado ?? "ACTIVO",
    });
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState("");

    const cambiar = (campo, valor) => {
        setDatos((actual) => ({ ...actual, [campo]: valor }));
        setErrores((actual) => ({ ...actual, [campo]: undefined }));
    };

    const guardar = async (event) => {
        event.preventDefault();
        setErrorGeneral("");

        try {
            await onGuardar({
                nombre: datos.nombre.trim(),
                descripcion: datos.descripcion.trim(),
                ...(!categoria && { estado: datos.estado }),
            });
        } catch (error) {
            if (error.status === 422 && error.errors) {
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
                <form onSubmit={guardar}>
                    <div className="form-group">
                        <label htmlFor="nombreCategoria">Nombre de la categoría</label>
                        <input id="nombreCategoria" type="text" maxLength="80" required placeholder="Ej: Pizzas"
                            value={datos.nombre} onChange={(event) => cambiar("nombre", event.target.value)}
                            aria-invalid={Boolean(errores.nombre)} />
                        {errores.nombre && <small className="catalog-error">{errores.nombre}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="descripcionCategoria">Descripción</label>
                        <textarea id="descripcionCategoria" rows="4" maxLength="150" required placeholder="Describe la categoría..."
                            value={datos.descripcion} onChange={(event) => cambiar("descripcion", event.target.value)}
                            aria-invalid={Boolean(errores.descripcion)} />
                        {errores.descripcion && <small className="catalog-error">{errores.descripcion}</small>}
                    </div>
                    {!categoria && <div className="form-group">
                        <label htmlFor="estadoCategoria">Estado</label>
                        <select id="estadoCategoria" value={datos.estado} onChange={(event) => cambiar("estado", event.target.value)}>
                            <option value="ACTIVO">Activa</option>
                            <option value="INACTIVO">Inactiva</option>
                        </select>
                    </div>}
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
