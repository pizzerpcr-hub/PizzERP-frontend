import { useState } from "react";
import "../ModulePage.css";

function Ingredientes() {
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

                    <h1>Ingredientes</h1>

                    <p>
                        Registra y gestiona los ingredientes utilizados
                        para la preparación de los productos.
                    </p>
                </div>

                <button
                    className="management-primary"
                    type="button"
                    onClick={abrirRegistrar}
                >
                    + Registrar ingrediente
                </button>

            </header>


            <section className="management-panel">

                <div className="panel-heading">
                    <div>
                        <h2>Ingredientes registrados</h2>

                        <p>
                            Consulta y administra los ingredientes
                            disponibles en el sistema.
                        </p>
                    </div>
                </div>


                <div className="search-box">

                    <label htmlFor="buscarIngrediente">
                        Buscar ingrediente
                    </label>

                    <input
                        id="buscarIngrediente"
                        type="search"
                        placeholder="Buscar por nombre..."
                    />

                </div>


                <div className="table-wrap">

                    <table className="management-table">

                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Unidad de medida</th>
                                <th>Cantidad disponible</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr><td colSpan="5" className="module-empty">No hay ingredientes registrados.</td></tr>
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

                    <div className="category-modal">

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
                                        : "Registrar ingrediente"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Ingredientes;
