import { useState } from "react";
import "../ModulePage.css";
import ComboForm from "../../components/forms/ComboForm/ComboForm.jsx";

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


            {modalAbierto && <ComboForm modoEdicion={modoEdicion} onCerrar={cerrarFormulario} />}

        </div>
    );
}

export default Combos;
