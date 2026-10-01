import { useState } from "react";
import "../ModulePage.css";
import IngredienteForm from "../../components/forms/IngredienteForm/IngredienteForm.jsx";

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


            {modalAbierto && <IngredienteForm modoEdicion={modoEdicion} onCerrar={cerrarFormulario} />}

        </div>
    );
}

export default Ingredientes;
