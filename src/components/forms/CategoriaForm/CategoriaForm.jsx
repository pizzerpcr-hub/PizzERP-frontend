function CategoriaForm({ modoEdicion, onCerrar }) {
    const manejarSubmit = (event) => {
        event.preventDefault();
    };

    return (
                <div
                    className="modal-overlay open"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            onCerrar();
                        }
                    }}
                >

                    <div className="category-modal">

                        <button
                            className="modal-close"
                            type="button"
                            onClick={onCerrar}
                            aria-label="Cerrar"
                        >
                            ×
                        </button>


                        <div className="modal-header">

                            <span className="management-eyebrow">
                                Administración
                            </span>

                            <h2>
                                {modoEdicion
                                    ? "Editar categoría"
                                    : "Registrar categoría"}
                            </h2>

                            <p>
                                Completa la información de la categoría.
                            </p>

                        </div>


                        <form onSubmit={manejarSubmit}>

                            <div className="form-group">

                                <label htmlFor="nombreCategoria">
                                    Nombre de la categoría
                                </label>

                                <input
                                    id="nombreCategoria"
                                    type="text"
                                    placeholder="Ej. Pizzas"
                                />

                            </div>


                            <div className="form-group">

                                <label htmlFor="descripcionCategoria">
                                    Descripción
                                </label>

                                <textarea
                                    id="descripcionCategoria"
                                    rows="4"
                                    placeholder="Describe la categoría..."
                                />

                            </div>


                            <div className="form-group">

                                <label htmlFor="estadoCategoria">
                                    Estado
                                </label>

                                <select id="estadoCategoria">

                                    <option value="activa">
                                        Activa
                                    </option>

                                    <option value="inactiva">
                                        Inactiva
                                    </option>

                                </select>

                            </div>


                            <p className="module-notice">El guardado estará disponible cuando se conecte el módulo al servidor.</p>
                            <div className="form-actions">

                                <button
                                    className="management-secondary"
                                    type="button"
                                    onClick={onCerrar}
                                >
                                    Cancelar
                                </button>

                                <button
                                    className="management-primary"
                                    type="submit"
                                    disabled
                                >
                                    {modoEdicion
                                        ? "Guardar cambios"
                                        : "Registrar categoría"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
    );
}

export default CategoriaForm;
