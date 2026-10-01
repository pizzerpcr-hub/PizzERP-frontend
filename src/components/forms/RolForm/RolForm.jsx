import { useMemo, useState } from "react";
import "./RolForm.css";

const pestanasSistema = [
    {
        id: "usuarios",
        nombre: "Usuarios",
        permisos: [
            { id: "crear", nombre: "Crear" },
            { id: "ver", nombre: "Ver" },
            { id: "editar", nombre: "Modificar" },
            { id: "eliminar", nombre: "Borrar" },
        ],
    },
    {
        id: "roles",
        nombre: "Roles y permisos",
        permisos: [
            { id: "crear", nombre: "Crear" },
            { id: "ver", nombre: "Ver" },
            { id: "editar", nombre: "Modificar" },
            { id: "eliminar", nombre: "Borrar" },
        ],
    },
    {
        id: "categorias",
        nombre: "Categorías",
        permisos: [
            { id: "crear", nombre: "Crear" },
            { id: "ver", nombre: "Ver" },
            { id: "editar", nombre: "Modificar" },
            { id: "eliminar", nombre: "Borrar" },
        ],
    },
    {
        id: "productos",
        nombre: "Productos",
        permisos: [
            { id: "crear", nombre: "Crear" },
            { id: "ver", nombre: "Ver" },
            { id: "editar", nombre: "Modificar" },
            { id: "eliminar", nombre: "Borrar" },
        ],
    },
    {
        id: "ingredientes",
        nombre: "Ingredientes",
        permisos: [
            { id: "crear", nombre: "Crear" },
            { id: "ver", nombre: "Ver" },
            { id: "editar", nombre: "Modificar" },
            { id: "eliminar", nombre: "Borrar" },
        ],
    },
    {
        id: "combos",
        nombre: "Combos y promociones",
        permisos: [
            { id: "crear", nombre: "Crear" },
            { id: "ver", nombre: "Ver" },
            { id: "editar", nombre: "Modificar" },
            { id: "eliminar", nombre: "Borrar" },
        ],
    },
    {
        id: "pedidos",
        nombre: "Pedidos",
        permisos: [
            { id: "crear", nombre: "Crear pedido" },
            { id: "ver", nombre: "Ver pantalla" },
            { id: "editar", nombre: "Cambiar estado" },
            { id: "eliminar", nombre: "Eliminar pedido" },
        ],
    },
    {
        id: "cocina",
        nombre: "Cocina",
        permisos: [
            { id: "crear", nombre: "Crear pedido" },
            { id: "ver", nombre: "Ver pantalla" },
            { id: "editar", nombre: "Cambiar estado" },
            { id: "eliminar", nombre: "Eliminar pedido" },
        ],
    },
];

const crearPermisosIniciales = () => {
    const resultado = {};

    pestanasSistema.forEach((pestana) => {
        resultado[pestana.id] = {};

        pestana.permisos.forEach((permiso) => {
            resultado[pestana.id][permiso.id] = false;
        });
    });

    return resultado;
};

function RolForm({ onCerrar }) {
    const [nombreRol, setNombreRol] = useState("");
    const [permisos, setPermisos] = useState(crearPermisosIniciales);
    const [expandidos, setExpandidos] = useState([]);

    const totalPermisos = useMemo(() => {
        return pestanasSistema.reduce(
            (total, modulo) => total + modulo.permisos.length,
            0
        );
    }, []);

    const seleccionados = useMemo(() => {
        return pestanasSistema.reduce((total, modulo) => {
            const cantidad = modulo.permisos.filter(
                (permiso) => permisos[modulo.id]?.[permiso.id]
            ).length;

            return total + cantidad;
        }, 0);
    }, [permisos]);

    const cambiarPermiso = (moduloId, permisoId) => {
        setPermisos((actual) => ({
            ...actual,

            [moduloId]: {
                ...actual[moduloId],

                [permisoId]: !actual[moduloId][permisoId],
            },
        }));
    };

    const cambiarTodosModulo = (modulo) => {
        const todosMarcados = modulo.permisos.every(
            (permiso) => permisos[modulo.id]?.[permiso.id]
        );

        setPermisos((actual) => {
            const nuevosPermisosModulo = {};

            modulo.permisos.forEach((permiso) => {
                nuevosPermisosModulo[permiso.id] = !todosMarcados;
            });

            return {
                ...actual,

                [modulo.id]: nuevosPermisosModulo,
            };
        });
    };

    const alternarModulo = (id) => {
        setExpandidos((actual) =>
            actual.includes(id)
                ? actual.filter((moduloId) => moduloId !== id)
                : [...actual, id]
        );
    };

    const expandirTodo = () => {
        const todosExpandidos =
            expandidos.length === pestanasSistema.length;

        if (todosExpandidos) {
            setExpandidos([]);
            return;
        }

        setExpandidos(
            pestanasSistema.map((modulo) => modulo.id)
        );
    };

    const marcarTodo = () => {
        const nuevosPermisos = {};

        pestanasSistema.forEach((modulo) => {
            nuevosPermisos[modulo.id] = {};

            modulo.permisos.forEach((permiso) => {
                nuevosPermisos[modulo.id][permiso.id] = true;
            });
        });

        setPermisos(nuevosPermisos);
    };

    const limpiarTodo = () => {
        setPermisos(crearPermisosIniciales());
    };

    const guardarRol = (event) => {
        event.preventDefault();

        const datos = {
            nombre: nombreRol.trim(),
            permisos,
        };

        console.log("Rol:", datos);

        // Aquí conectas posteriormente tu endpoint Laravel.
    };

    return (
        <div
            className="modal-overlay open"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onCerrar?.();
                }
            }}
        >
            <div
                className="role-modal"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="role-modal-close"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                >
                    ×
                </button>

                <form onSubmit={guardarRol}>
                    <div className="role-form-header">
                        <h2>Crear rol</h2>

                        <p>
                            Define el nombre y los permisos disponibles
                            para este rol.
                        </p>
                    </div>

                    <div className="role-form-group">
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
                            placeholder="Ej. Administrador, Cocinero..."
                            autoComplete="off"
                            required
                        />
                    </div>

                    <div className="permissions-section">
                        <div className="permissions-title-row">
                            <div>
                                <h3>Permisos</h3>

                                <span className="permissions-total">
                                    {seleccionados}/{totalPermisos}
                                </span>
                            </div>

                            <div className="permissions-tools">
                                <button
                                    type="button"
                                    onClick={expandirTodo}
                                >
                                    {expandidos.length ===
                                    pestanasSistema.length
                                        ? "Contraer todo"
                                        : "Expandir todo"}
                                </button>

                                <button
                                    type="button"
                                    onClick={marcarTodo}
                                >
                                    Marcar todo
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarTodo}
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>

                        <div className="permission-list">
                            {pestanasSistema.map((modulo) => {
                                const estaExpandido =
                                    expandidos.includes(modulo.id);

                                const cantidadMarcada =
                                    modulo.permisos.filter(
                                        (permiso) =>
                                            permisos[modulo.id]?.[
                                                permiso.id
                                            ]
                                    ).length;

                                const todosMarcados =
                                    cantidadMarcada ===
                                    modulo.permisos.length;

                                const algunoMarcado =
                                    cantidadMarcada > 0;

                                return (
                                    <div
                                        className={`permission-module ${
                                            estaExpandido
                                                ? "expanded"
                                                : ""
                                        }`}
                                        key={modulo.id}
                                    >
                                        <div className="permission-module-header">
                                            <label
                                                className="permission-module-check"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={todosMarcados}
                                                    ref={(elemento) => {
                                                        if (elemento) {
                                                            elemento.indeterminate =
                                                                algunoMarcado &&
                                                                !todosMarcados;
                                                        }
                                                    }}
                                                    onChange={() =>
                                                        cambiarTodosModulo(
                                                            modulo
                                                        )
                                                    }
                                                />

                                                <span className="checkmark" />
                                            </label>

                                            <button
                                                type="button"
                                                className="permission-module-toggle"
                                                onClick={() =>
                                                    alternarModulo(
                                                        modulo.id
                                                    )
                                                }
                                            >
                                                <span
                                                    className={`permission-arrow ${
                                                        estaExpandido
                                                            ? "open"
                                                            : ""
                                                    }`}
                                                >
                                                    ▶
                                                </span>

                                                <strong>
                                                    {modulo.nombre}
                                                </strong>

                                                <span className="permission-count">
                                                    {cantidadMarcada}/
                                                    {
                                                        modulo
                                                            .permisos
                                                            .length
                                                    }
                                                </span>
                                            </button>
                                        </div>

                                        {estaExpandido && (
                                            <div className="permission-options">
                                                {modulo.permisos.map(
                                                    (permiso) => (
                                                        <label
                                                            className="permission-option"
                                                            key={
                                                                permiso.id
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    permisos[
                                                                        modulo
                                                                            .id
                                                                    ]?.[
                                                                        permiso
                                                                            .id
                                                                    ] ??
                                                                    false
                                                                }
                                                                onChange={() =>
                                                                    cambiarPermiso(
                                                                        modulo.id,
                                                                        permiso.id
                                                                    )
                                                                }
                                                            />

                                                            <span className="checkmark" />

                                                            <span>
                                                                {
                                                                    permiso.nombre
                                                                }
                                                            </span>
                                                        </label>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="role-form-actions">
                        <button
                            type="button"
                            className="role-cancel-button"
                            onClick={onCerrar}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="role-save-button"
                            disabled={!nombreRol.trim()}
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