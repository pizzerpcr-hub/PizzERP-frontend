import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import { normalizarRol } from "../../constants/roles.js";
import "./Productos.css";
import ProductoForm from "../../components/forms/ProductoForm/ProductoForm.jsx";

const formatoPrecio = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });

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
                <label className="productos-search"><span>Buscar producto</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o código..." /></label>
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
            {modalAbierto && <ProductoForm producto={productoEditando} codigosExistentes={productos.map((producto) => producto.codigo)} onGuardar={guardarProducto} onCerrar={() => { setModalAbierto(false); setProductoEditando(null); }} />}
        </div>
    );
}

export default Productos;
