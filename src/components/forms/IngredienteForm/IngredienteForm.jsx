function IngredienteForm({ modoEdicion, onCerrar }) {
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
                                    ? "Editar ingrediente"
                                    : "Registrar ingrediente"}
                            </h2>

                            <p>
                                Completa la información del ingrediente.
                            </p>

                        </div>


                        <form onSubmit={manejarSubmit}>

                            <div className="form-group">

                                <label htmlFor="nombreIngrediente">
                                    Nombre del ingrediente
                                </label>

                                <input
                                    id="nombreIngrediente"
                                    type="text"
                                    placeholder="Ej. Harina"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label htmlFor="unidadIngrediente">
                                    Unidad de medida
                                </label>

                                <select
                                    id="unidadIngrediente"
                                    required
                                >
                                    <option value="">
                                        Seleccionar unidad
                                    </option>

                                    <option value="g">
                                        Gramos (g)
                                    </option>

                                    <option value="kg">
                                        Kilogramos (kg)
                                    </option>

                                    <option value="ml">
                                        Mililitros (ml)
                                    </option>

                                    <option value="l">
                                        Litros (l)
                                    </option>

                                    <option value="u">
                                        Unidades (u)
                                    </option>
                                </select>

                            </div>


                            <div className="form-group">

                                <label htmlFor="cantidadIngrediente">
                                    Cantidad disponible
                                </label>

                                <input
                                    id="cantidadIngrediente"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Ej. 25"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label htmlFor="estadoIngrediente">
                                    Estado
                                </label>

                                <select
                                    id="estadoIngrediente"
                                    required
                                >
                                    <option value="activo">
                                        Activo
                                    </option>

                                    <option value="inactivo">
                                        Inactivo
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
                                        : "Registrar ingrediente"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
    );
}

export default IngredienteForm;
