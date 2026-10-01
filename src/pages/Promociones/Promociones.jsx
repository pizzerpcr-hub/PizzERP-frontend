import { useState } from "react";
import "../ModulePage.css";
import ComboForm from "../../components/forms/ComboForm/ComboForm.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";

function Combos() {
    const [modalAbierto, setModalAbierto] = useState(false);

    return (
        <div className="module-page">
            <header className="management-header">
                <div>
                    <p className="eyebrow">Administración</p>
                    <h1>Combos y promociones</h1>
                    <div className="header-description">
                        <p>Gestiona los combos y promociones disponibles para la venta en la pizzería.</p>
                        <button className="management-primary" type="button" onClick={() => setModalAbierto(true)}>
                            + Registrar combo
                        </button>
                    </div>
                </div>
            </header>

            <section className="management-panel">
                <div className="management-panel-header">
                    <div>
                        <h2>Combos registrados</h2>
                        <p>Consulta y administra los combos y promociones disponibles.</p>
                    </div>
                    <PageSearch className="page-search--header" label="Buscar combo" id="buscarCombo"
                        placeholder="Buscar por nombre o código..." />
                </div>
                <div className="table-wrap">
                    <table className="management-table">
                        <thead><tr><th>Código</th><th>Combo</th><th>Productos</th><th>Precio</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody><tr><td colSpan="7" className="module-empty">No hay promociones registradas.</td></tr></tbody>
                    </table>
                </div>
            </section>

            {modalAbierto && <ComboForm modoEdicion={false} onCerrar={() => setModalAbierto(false)} />}
        </div>
    );
}

export default Combos;
