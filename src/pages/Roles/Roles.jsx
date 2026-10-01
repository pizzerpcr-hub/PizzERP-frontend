import { useState } from "react";
import "../ModulePage.css";
import RolForm from "../../components/forms/RolForm/RolForm.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";

function RolesPermisos() {
    const [modalAbierto, setModalAbierto] = useState(false);

    return (
        <div className="module-page">
            <header className="management-header">
                <div>
                    <p className="eyebrow">Administración</p>
                    <h1>Roles y permisos</h1>
                    <div className="header-description">
                        <p>Crea roles y configura las funciones del sistema disponibles para cada uno.</p>
                        <button className="management-primary" type="button" onClick={() => setModalAbierto(true)}>
                            + Crear rol
                        </button>
                    </div>
                </div>
            </header>

            <section className="management-panel">
                <div className="management-panel-header">
                    <div>
                        <h2>Roles registrados</h2>
                        <p>Consulta los roles configurados y los permisos asignados en el sistema.</p>
                    </div>
                    <PageSearch className="page-search--header" label="Buscar rol" id="buscarRol" placeholder="Buscar por nombre..." />
                </div>
                <div className="table-wrap">
                    <table className="management-table">
                        <thead><tr><th>Rol</th><th>Pestañas permitidas</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody><tr><td colSpan="4" className="module-empty">No hay roles registrados.</td></tr></tbody>
                    </table>
                </div>
            </section>

            {modalAbierto && <RolForm onCerrar={() => setModalAbierto(false)} />}
        </div>
    );
}

export default RolesPermisos;
