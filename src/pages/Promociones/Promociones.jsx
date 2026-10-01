import { useState } from "react";
import "../ModulePage.css";

function Combos() {
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

    const abrirRegistrar = () => {
        setModoEdicion(false);
        setModalAbierto(true);
    };

    const cerrarFormulario = () => {
        setModalAbierto(false);
        setModoEdicion(false);
    };

    const manejarSubmit = (event) => {
        event.preventDefault();
    };

    return (
        <div className="module-page">

            <header className="management-header">

                <div>

                    <span className="management-eyebrow">
                        Administración
                    </span>

                    <h1>
                        Combos y promociones
                    </h1>

                    <p>
                        Gestiona los combos y promociones disponibles
                        para la venta en la pizzería.
                    </p>

                </div>


                <button
                    className="management-primary"
                    type="button"
                    onClick={abrirRegistrar}
                >
                    + Registrar combo
                </button>

            </header>


            <section className="management-panel">

                <div className="panel-heading">

                    <div>

                        <h2>
                            Combos registrados
                        </h2>

                        <p>
                            Consulta y administra los combos y
                            promociones disponibles.
                        </p>

                    </div>

                </div>


                <div className="search-box">

                    <label htmlFor="buscarCombo">
                        Buscar combo
                    </label>

                    <input
                        id="buscarCombo"
                        type="search"
                        placeholder="Buscar por nombre o código..."
                    />

                </div>


                <div className="table-wrap">

                    <table className="management-table">

                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Combo</th>
                                <th>Productos</th>
                                <th>Precio</th>
                                <th>Vigencia</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr><td colSpan="7" className="module-empty">No hay promociones registradas.</td></tr>
                        </tbody>

                    </table>

                </div>

            </section>


            {modalAbierto && (

                <div
                    className="modal-overlay open"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            cerrarFormulario();
                        }
                    }}
                >

                    <div className="combo-modal">

                        <button
                            className="modal-close"
                            type="button"
                            onClick={cerrarFormulario}
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
                                    onClick={cerrarFormulario}
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

            )}

        </div>
    );
}

export default Combos;
