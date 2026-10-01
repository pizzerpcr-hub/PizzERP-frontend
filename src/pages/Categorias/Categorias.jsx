import { useState } from "react";
import "../ModulePage.css";
import CategoriaForm from "../../components/forms/CategoriaForm/CategoriaForm.jsx";

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


            {modalAbierto && <CategoriaForm modoEdicion={modoEdicion} onCerrar={cerrarFormulario} />}

        </div>
    );
}

export default Categorias;
