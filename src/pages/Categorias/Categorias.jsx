import { useState } from "react";
import "../ModulePage.css";

function Categorias() {
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

                    <h1>Categorías</h1>

                    <p>
                        Gestiona las categorías utilizadas para organizar
                        los productos del menú.
                    </p>
                </div>

                <button
                    className="management-primary"
                    type="button"
                    onClick={abrirRegistrar}
                >
                    + Registrar categoría
                </button>

            </header>


            <section className="management-panel">

                <div className="panel-heading">

                    <div>
                        <h2>Categorías registradas</h2>

                        <p>
                            Consulta y administra las categorías disponibles
                            en el sistema.
                        </p>
                    </div>

                </div>


                <div className="search-box">

                    <label htmlFor="buscarCategoria">
                        Buscar categoría
                    </label>

                    <input
                        id="buscarCategoria"
                        type="search"
                        placeholder="Buscar por nombre o descripción..."
                    />

                </div>


                <div className="table-wrap">

                    <table className="management-table">

                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Productos</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr><td colSpan="5" className="module-empty">No hay categorías registradas.</td></tr>
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
                                        : "Registrar categoría"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Categorias;
