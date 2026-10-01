import { useState } from "react";
import "../ModulePage.css";
import RolForm from "../../components/forms/RolForm/RolForm.jsx";

function RolesPermisos() {
    const [modalAbierto, setModalAbierto] = useState(false);

    const abrirFormulario = () => {
        setModalAbierto(true);
    };

    const cerrarFormulario = () => {
        setModalAbierto(false);
    };

    return (
        <div className="module-page">

            <header className="management-header">

                <div>
                    <span className="management-eyebrow">
                        Administración
                    </span>

                    <h1>
                        Roles y permisos
                    </h1>

                    <p>
                        Crea roles y configura las funciones del sistema
                        disponibles para cada uno.
                    </p>
                </div>

                <button
                    className="management-primary"
                    type="button"
                    onClick={abrirFormulario}
                >
                    + Crear rol
                </button>

            </header>


            <section className="management-panel">

                <div className="panel-heading">

                    <div>
                        <h2>
                            Roles registrados
                        </h2>

                        <p>
                            Consulta los roles configurados y los permisos
                            asignados en el sistema.
                        </p>
                    </div>

                </div>


                <div className="search-box">

                    <label htmlFor="buscarRol">
                        Buscar rol
                    </label>

                    <input
                        id="buscarRol"
                        type="search"
                        placeholder="Buscar por nombre..."
                    />

                </div>


                <div className="table-wrap">

                    <table className="management-table">

                        <thead>
                            <tr>
                                <th>Rol</th>
                                <th>Pestañas permitidas</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr><td colSpan="4" className="module-empty">No hay roles registrados.</td></tr>
                        </tbody>

                    </table>

                </div>

            </section>


            {modalAbierto && <RolForm onCerrar={cerrarFormulario} />}

        </div>
    );
}

export default RolesPermisos;
