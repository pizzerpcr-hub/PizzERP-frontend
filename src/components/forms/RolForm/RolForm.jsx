import { useState } from "react";

const pestanasSistema = [
    {
        id: "usuarios",
        nombre: "Usuarios",
        descripcion: "Administración de cuentas de usuario.",
    },
    {
        id: "roles",
        nombre: "Roles y permisos",
        descripcion: "Configuración de roles y niveles de acceso.",
    },
    {
        id: "categorias",
        nombre: "Categorías",
        descripcion: "Administración de categorías del menú.",
    },
    {
        id: "productos",
        nombre: "Productos",
        descripcion: "Administración de productos disponibles.",
    },
    {
        id: "ingredientes",
        nombre: "Ingredientes",
        descripcion: "Administración de ingredientes e inventario.",
    },
    {
        id: "combos",
        nombre: "Combos y promociones",
        descripcion: "Administración de combos y promociones.",
    },
    {
        id: "pedidos",
        nombre: "Pedidos",
        descripcion: "Registro y administración de pedidos.",
    },
    {
        id: "cocina",
        nombre: "Cocina",
        descripcion: "Consulta y actualización de pedidos en cocina.",
    },
];

const permisosIniciales = {};

pestanasSistema.forEach((pestana) => {
    permisosIniciales[pestana.id] = {
        permitido: false,
        ver: false,
        crear: false,
        editar: false,
        eliminar: false,
    };
});

function RolForm({ onCerrar }) {
    const [nombreRol, setNombreRol] = useState("");

    const [permisos, setPermisos] = useState(permisosIniciales);

    const cambiarAccesoPestana = (id) => {
        setPermisos((actual) => {
            const nuevoEstado = !actual[id].permitido;

            return {
                ...actual,

                [id]: {
                    permitido: nuevoEstado,
                    ver: nuevoEstado,
                    crear: false,
                    editar: false,
                    eliminar: false,
                },
            };
        });
    };

    const cambiarPermiso = (id, permiso) => {
        setPermisos((actual) => ({
            ...actual,

            [id]: {
                ...actual[id],
                [permiso]: !actual[id][permiso],
            },
        }));
    };

    const seleccionarTodos = (id) => {
        setPermisos((actual) => {
            const todosSeleccionados =
                actual[id].ver &&
                actual[id].crear &&
                actual[id].editar &&
                actual[id].eliminar;

            return {
                ...actual,

                [id]: {
                    permitido: true,
                    ver: !todosSeleccionados,
                    crear: !todosSeleccionados,
                    editar: !todosSeleccionados,
                    eliminar: !todosSeleccionados,
                },
            };
        });
    };

    const guardarRol = (event) => {
        event.preventDefault();

        // El guardado se conectará al servicio de roles.
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

                    <div className="role-modal">

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
                                Crear rol
                            </h2>

                            <p>
                                Define el nombre del rol y selecciona las
                                pestañas y acciones que podrá utilizar.
                            </p>

                        </div>


                        <form onSubmit={guardarRol}>

                            <div className="form-section">

                                <div className="form-section-title">
                                    Información del rol
                                </div>

                                <div className="form-group">

                                    <label htmlFor="nombreRol">
                                        Nombre del rol
                                    </label>

                                    <input
                                        id="nombreRol"
                                        type="text"
                                        value={nombreRol}
                                        onChange={(event) =>
                                            setNombreRol(event.target.value)
                                        }
                                        placeholder="Ej. Encargado de inventario"
                                        required
                                    />

                                </div>

                            </div>


                            <div className="form-section">

                                <div className="permissions-header">

                                    <div>

                                        <div className="form-section-title">
                                            Pestañas existentes y permisos
                                        </div>

                                        <p>
                                            Selecciona las pestañas a las que
                                            tendrá acceso este rol y las acciones
                                            permitidas dentro de cada módulo.
                                        </p>

                                    </div>

                                </div>


                                <div className="permissions-table-wrap">

                                    <table className="permissions-table">

                                        <thead>

                                            <tr>
                                                <th className="module-column">
                                                    Pestaña
                                                </th>

                                                <th>
                                                    Acceso
                                                </th>

                                                <th>
                                                    Ver
                                                </th>

                                                <th>
                                                    Crear
                                                </th>

                                                <th>
                                                    Editar
                                                </th>

                                                <th>
                                                    Eliminar
                                                </th>

                                                <th>
                                                    Todo
                                                </th>
                                            </tr>

                                        </thead>


                                        <tbody>

                                            {pestanasSistema.map((pestana) => {

                                                const permiso =
                                                    permisos[pestana.id];

                                                return (

                                                    <tr
                                                        key={pestana.id}
                                                        className={
                                                            permiso.permitido
                                                                ? "permission-active"
                                                                : ""
                                                        }
                                                    >

                                                        <td
                                                            className="
                                                                module-info
                                                            "
                                                        >

                                                            <strong>
                                                                {
                                                                    pestana.nombre
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    pestana.descripcion
                                                                }
                                                            </span>

                                                        </td>


                                                        <td>

                                                            <label
                                                                className="
                                                                    checkbox-wrapper
                                                                "
                                                            >

                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        permiso.permitido
                                                                    }
                                                                    onChange={() =>
                                                                        cambiarAccesoPestana(
                                                                            pestana.id
                                                                        )
                                                                    }
                                                                />

                                                                <span
                                                                    className="
                                                                        custom-checkbox
                                                                    "
                                                                />

                                                            </label>

                                                        </td>


                                                        {[
                                                            "ver",
                                                            "crear",
                                                            "editar",
                                                            "eliminar",
                                                        ].map(
                                                            (
                                                                tipoPermiso
                                                            ) => (

                                                                <td
                                                                    key={
                                                                        tipoPermiso
                                                                    }
                                                                >

                                                                    <label
                                                                        className="
                                                                            checkbox-wrapper
                                                                        "
                                                                    >

                                                                        <input
                                                                            type="checkbox"
                                                                            checked={
                                                                                permiso[
                                                                                    tipoPermiso
                                                                                ]
                                                                            }
                                                                            disabled={
                                                                                !permiso.permitido
                                                                            }
                                                                            onChange={() =>
                                                                                cambiarPermiso(
                                                                                    pestana.id,
                                                                                    tipoPermiso
                                                                                )
                                                                            }
                                                                        />

                                                                        <span
                                                                            className="
                                                                                custom-checkbox
                                                                            "
                                                                        />

                                                                    </label>

                                                                </td>

                                                            )
                                                        )}


                                                        <td>

                                                            <label
                                                                className="
                                                                    checkbox-wrapper
                                                                "
                                                            >

                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        permiso.ver &&
                                                                        permiso.crear &&
                                                                        permiso.editar &&
                                                                        permiso.eliminar
                                                                    }
                                                                    disabled={
                                                                        !permiso.permitido
                                                                    }
                                                                    onChange={() =>
                                                                        seleccionarTodos(
                                                                            pestana.id
                                                                        )
                                                                    }
                                                                />

                                                                <span
                                                                    className="
                                                                        custom-checkbox
                                                                    "
                                                                />

                                                            </label>

                                                        </td>

                                                    </tr>

                                                );

                                            })}

                                        </tbody>

                                    </table>

                                </div>

                            </div>


                            <div className="permissions-note">

                                <strong>
                                    ¿Cómo funcionan los permisos?
                                </strong>

                                <p>
                                    El acceso habilita la pestaña para el rol.
                                    Luego puedes definir si el usuario puede
                                    consultar, crear, editar o eliminar
                                    información dentro de ella.
                                </p>

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
                                    Crear rol
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
    );
}

export default RolForm;
