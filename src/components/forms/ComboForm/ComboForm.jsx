function ComboForm({ modoEdicion, onCerrar }) {
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

                    <div className="combo-modal">

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
                                    ? "Editar combo"
                                    : "Registrar combo"}
                            </h2>

                            <p>
                                Completa la información del combo
                                y los productos incluidos.
                            </p>

                        </div>


                        <form onSubmit={manejarSubmit}>

                            <div className="form-section">

                                <div className="form-section-title">
                                    Información del combo
                                </div>


                                <div className="form-grid">

                                    <div className="form-group">

                                        <label htmlFor="codigoCombo">
                                            Código del combo
                                        </label>

                                        <input
                                            id="codigoCombo"
                                            type="text"
                                            placeholder="Ej. COM-001"
                                            required
                                        />

                                    </div>


                                    <div className="form-group">

                                        <label htmlFor="nombreCombo">
                                            Nombre del combo
                                        </label>

                                        <input
                                            id="nombreCombo"
                                            type="text"
                                            placeholder="Ej. Combo Familiar"
                                            required
                                        />

                                    </div>

                                </div>


                                <div className="form-group">

                                    <label htmlFor="descripcionCombo">
                                        Descripción
                                    </label>

                                    <textarea
                                        id="descripcionCombo"
                                        rows="3"
                                        placeholder="Describe el combo o promoción..."
                                    />

                                </div>


                                <div className="form-grid">

                                    <div className="form-group">

                                        <label htmlFor="precioCombo">
                                            Precio del combo
                                        </label>

                                        <div className="price-input">

                                            <span>
                                                ₡
                                            </span>

                                            <input
                                                id="precioCombo"
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                placeholder="0.00"
                                                required
                                            />

                                        </div>

                                    </div>


                                    <div className="form-group">

                                        <label htmlFor="estadoCombo">
                                            Estado
                                        </label>

                                        <select
                                            id="estadoCombo"
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

                                </div>

                            </div>


                            <div className="form-section">

                                <div className="form-section-title">
                                    Vigencia
                                </div>


                                <div className="form-grid">

                                    <div className="form-group">

                                        <label htmlFor="fechaInicio">
                                            Fecha de inicio
                                        </label>

                                        <input
                                            id="fechaInicio"
                                            type="date"
                                            required
                                        />

                                    </div>


                                    <div className="form-group">

                                        <label htmlFor="fechaFin">
                                            Fecha de fin
                                        </label>

                                        <input
                                            id="fechaFin"
                                            type="date"
                                            required
                                        />

                                    </div>

                                </div>

                            </div>


                            <div className="form-section">

                                <div className="form-section-header">

                                    <div>

                                        <div className="form-section-title">
                                            Productos incluidos
                                        </div>

                                        <p>
                                            El combo debe contener como mínimo
                                            dos productos activos.
                                        </p>

                                    </div>

                                </div>


                                <div className="product-form-list">

                                    <div className="product-form-row">

                                        <select required>
                                            <option value="">
                                                Seleccionar producto
                                            </option>
                                        </select>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="Cantidad"
                                            required
                                        />

                                    </div>


                                    <div className="product-form-row">

                                        <select required>
                                            <option value="">
                                                Seleccionar producto
                                            </option>
                                        </select>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="Cantidad"
                                            required
                                        />

                                    </div>

                                </div>

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
                                        : "Registrar combo"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
    );
}

export default ComboForm;
