import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import { normalizarRol } from "../../constants/roles.js";
import "./Productos.css";

const opcionesTamano = ["Personal", "Mediana", "Grande", "Familiar", "600 ml", "Unidad"];
const opcionesIngrediente = ["Harina", "Queso mozzarella", "Salsa de tomate", "Pepperoni"];
const opcionesUnidad = ["g", "kg", "ml", "l", "u"];
const formatoPrecio = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });
let siguienteFilaId = 0;
const nuevaFilaTamano = () => ({ id: `tamano-${++siguienteFilaId}`, nombre: "", precio: "" });
const nuevaFilaIngrediente = () => ({ id: `ingrediente-${++siguienteFilaId}`, nombre: "", cantidad: "", unidad: "" });

function FormularioProducto({ producto, codigosExistentes, onGuardar, onCerrar }) {
    const dialogRef = useRef(null);
    const [datos, setDatos] = useState(() => ({
        codigo: producto?.codigo ?? "",
        nombre: producto?.nombre ?? "",
        descripcion: producto?.descripcion ?? "",
        precio: producto?.precio ?? "",
        estado: producto?.estado ?? "ACTIVO",
        tamanos: producto?.tamanos.map((tamano) => ({ ...tamano })) ?? [nuevaFilaTamano()],
        ingredientes: producto?.ingredientes.map((ingrediente) => ({ ...ingrediente })) ?? [nuevaFilaIngrediente()],
    }));
    const [errorCodigo, setErrorCodigo] = useState("");

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => {
            if (dialog?.open) dialog.close();
        };
    }, []);

    const actualizarFila = (grupo, id, campo, valor) => {
        setDatos((actual) => ({
            ...actual,
            [grupo]: actual[grupo].map((fila) => fila.id === id ? { ...fila, [campo]: valor } : fila),
        }));
    };

    const quitarFila = (grupo, id) => {
        setDatos((actual) => ({ ...actual, [grupo]: actual[grupo].filter((fila) => fila.id !== id) }));
    };

    const guardar = (event) => {
        event.preventDefault();
        const codigo = datos.codigo.trim().toUpperCase();
        if (codigosExistentes.some((existente) => existente !== producto?.codigo && existente === codigo)) {
            setErrorCodigo("Ya existe un producto con este código.");
            return;
        }
        onGuardar({
            ...datos,
            codigo,
            nombre: datos.nombre.trim(),
            descripcion: datos.descripcion.trim(),
            precio: Number(datos.precio),
            tamanos: datos.tamanos.filter((fila) => fila.nombre || fila.precio),
            ingredientes: datos.ingredientes.filter((fila) => fila.nombre || fila.cantidad || fila.unidad),
        }, producto?.codigo);
    };

    return (
        <dialog ref={dialogRef} className="productos-dialog" onCancel={(event) => { event.preventDefault(); onCerrar(); }} aria-labelledby="productoModalTitle">
            <button className="productos-dialog-close" type="button" onClick={onCerrar} aria-label="Cerrar">×</button>
            <header className="productos-dialog-header">
                <span className="productos-eyebrow">Administración</span>
                <h2 id="productoModalTitle">{producto ? "Editar producto" : "Registrar producto"}</h2>
                <p>Completa la información del producto y sus ingredientes asociados.</p>
            </header>
            <form onSubmit={guardar}>
                <section className="productos-form-section" aria-labelledby="productoDatosTitle">
                    <h3 id="productoDatosTitle">Información del producto</h3>
                    <div className="productos-form-grid">
                        <label>Código o número interno
                            <input value={datos.codigo} onChange={(event) => { setDatos({ ...datos, codigo: event.target.value.toUpperCase() }); setErrorCodigo(""); }} placeholder="Ej. PIZ-001" required aria-invalid={Boolean(errorCodigo)} aria-describedby={errorCodigo ? "productoCodigoError" : undefined} />
                            {errorCodigo && <span id="productoCodigoError" className="productos-field-error" role="alert">{errorCodigo}</span>}
                        </label>
                        <label>Nombre del producto
                            <input value={datos.nombre} onChange={(event) => setDatos({ ...datos, nombre: event.target.value })} placeholder="Ej. Pizza Suprema" required />
                        </label>
                    </div>
                    <label>Descripción
                        <textarea value={datos.descripcion} onChange={(event) => setDatos({ ...datos, descripcion: event.target.value })} rows="3" placeholder="Describe el producto..." />
                    </label>
                    <div className="productos-form-grid">
                        <label>Precio
                            <span className="productos-price-input"><span>₡</span><input type="number" min="0.01" step="0.01" value={datos.precio} onChange={(event) => setDatos({ ...datos, precio: event.target.value })} placeholder="0.00" required /></span>
                        </label>
                        <label>Estado
                            <select value={datos.estado} onChange={(event) => setDatos({ ...datos, estado: event.target.value })}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select>
                        </label>
                    </div>
                </section>

                <section className="productos-form-section" aria-labelledby="productoTamanosTitle">
                    <div className="productos-section-heading">
                        <div><h3 id="productoTamanosTitle">Tamaños y precios</h3><p>Configura los tamaños disponibles y el precio correspondiente.</p></div>
                        <button type="button" className="productos-add-button" onClick={() => setDatos((actual) => ({ ...actual, tamanos: [...actual.tamanos, nuevaFilaTamano()] }))}>+ Agregar tamaño</button>
                    </div>
                    <div className="productos-rows">
                        {datos.tamanos.map((fila) => (
                            <div className="productos-size-row" key={fila.id}>
                                <select aria-label="Tamaño" value={fila.nombre} onChange={(event) => actualizarFila("tamanos", fila.id, "nombre", event.target.value)}><option value="">Seleccionar tamaño</option>{opcionesTamano.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>
                                <span className="productos-price-input"><span>₡</span><input type="number" min="0.01" step="0.01" aria-label="Precio del tamaño" placeholder="Precio" value={fila.precio} onChange={(event) => actualizarFila("tamanos", fila.id, "precio", event.target.value)} /></span>
                                <button type="button" className="productos-remove-button" onClick={() => quitarFila("tamanos", fila.id)} aria-label="Eliminar tamaño">×</button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="productos-form-section" aria-labelledby="productoIngredientesTitle">
                    <div className="productos-section-heading">
                        <div><h3 id="productoIngredientesTitle">Ingredientes asociados</h3><p>Asocia los ingredientes utilizados en la preparación del producto.</p></div>
                        <button type="button" className="productos-add-button" onClick={() => setDatos((actual) => ({ ...actual, ingredientes: [...actual.ingredientes, nuevaFilaIngrediente()] }))}>+ Agregar ingrediente</button>
                    </div>
                    <div className="productos-rows">
                        {datos.ingredientes.map((fila) => (
                            <div className="productos-ingredient-row" key={fila.id}>
                                <select aria-label="Ingrediente" value={fila.nombre} onChange={(event) => actualizarFila("ingredientes", fila.id, "nombre", event.target.value)}><option value="">Seleccionar ingrediente</option>{opcionesIngrediente.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>
                                <input type="number" min="0" step="0.01" aria-label="Cantidad" placeholder="Cantidad" value={fila.cantidad} onChange={(event) => actualizarFila("ingredientes", fila.id, "cantidad", event.target.value)} />
                                <select aria-label="Unidad" value={fila.unidad} onChange={(event) => actualizarFila("ingredientes", fila.id, "unidad", event.target.value)}><option value="">Unidad</option>{opcionesUnidad.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>
                                <button type="button" className="productos-remove-button" onClick={() => quitarFila("ingredientes", fila.id)} aria-label="Eliminar ingrediente">×</button>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="productos-form-actions"><button type="button" className="productos-secondary-button" onClick={onCerrar}>Cancelar</button><button type="submit" className="productos-primary-button">{producto ? "Guardar cambios" : "Registrar producto"}</button></div>
            </form>
        </dialog>
    );
}

function Productos() {
    const { usuario } = useAuth();
    const [productos, setProductos] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [productoEditando, setProductoEditando] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const productosFiltrados = productos.filter((producto) =>
        `${producto.codigo} ${producto.nombre} ${producto.descripcion}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()),
    );

    if (normalizarRol(usuario?.rol) !== "ADMINISTRADOR") {
        return <Navigate to="/encargado-ti/usuarios" replace />;
    }

    const guardarProducto = (datos, codigoAnterior) => {
        setProductos((actuales) => codigoAnterior
            ? actuales.map((producto) => producto.codigo === codigoAnterior ? datos : producto)
            : [...actuales, datos]);
        setModalAbierto(false);
        setProductoEditando(null);
    };

    const abrirFormulario = (producto = null) => {
        setProductoEditando(producto);
        setModalAbierto(true);
    };

    return (
        <div className="productos-page">
            <header className="productos-header">
                <div><span className="productos-eyebrow">Administración</span><h1>Productos</h1><p>Gestiona los productos del menú, sus precios, tamaños e ingredientes asociados.</p></div>
                <button type="button" className="productos-primary-button" onClick={() => abrirFormulario()}>+ Registrar producto</button>
            </header>
            <section className="productos-panel" aria-labelledby="productosTitle">
                <div className="productos-panel-heading"><h2 id="productosTitle">Productos registrados</h2><p>Consulta y administra los productos disponibles en el menú.</p><small>Los cambios de esta vista aún no se guardan en el servidor.</small></div>
                <label className="productos-search">Buscar producto<input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o código..." /></label>
                <div className="productos-table-wrap">
                    <table className="productos-table">
                        <thead><tr><th>Código</th><th>Producto</th><th>Tamaños</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {productosFiltrados.length === 0 ? <tr><td colSpan="6" className="productos-empty">{busqueda ? "No se encontraron productos." : "No hay productos registrados."}</td></tr> : productosFiltrados.map((producto) => (
                                <tr key={producto.codigo}>
                                    <td data-label="Código"><strong>{producto.codigo}</strong></td>
                                    <td data-label="Producto"><div className="productos-product-cell"><strong>{producto.nombre}</strong><span className="productos-description">{producto.descripcion}</span></div></td>
                                    <td data-label="Tamaños"><div className="productos-sizes">{producto.tamanos.map((tamano) => <span key={tamano.id}>{tamano.nombre}</span>)}</div></td>
                                    <td data-label="Precio"><strong>{formatoPrecio.format(producto.precio)}</strong></td>
                                    <td data-label="Estado"><span className={`productos-status ${producto.estado === "ACTIVO" ? "active" : "inactive"}`}>{producto.estado === "ACTIVO" ? "Activo" : "Inactivo"}</span></td>
                                    <td data-label="Acciones"><div className="productos-table-actions"><button type="button" onClick={() => abrirFormulario(producto)}>Editar</button><button type="button" onClick={() => setProductos((actuales) => actuales.map((actual) => actual.codigo === producto.codigo ? { ...actual, estado: actual.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO" } : actual))}>{producto.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            {modalAbierto && <FormularioProducto producto={productoEditando} codigosExistentes={productos.map((producto) => producto.codigo)} onGuardar={guardarProducto} onCerrar={() => { setModalAbierto(false); setProductoEditando(null); }} />}
        </div>
    );
}

export default Productos;
