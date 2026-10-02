import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth.js";
import { puede } from "../../constants/roles.js";
import "../ModulePage.css";
import "./Productos.css";
import ProductoForm from "../../components/forms/ProductoForm/ProductoForm.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import { actualizarProducto, obtenerCategoriasParaProducto, obtenerProductos, registrarProducto } from "../../services/catalogoService.js";
import { useBusquedaLista, useListaSesion } from "../../hooks/useListaSesion.js";

const formatoPrecio = new Intl.NumberFormat("es-CR", {
    style: "currency", currency: "CRC", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function Productos() {
    const { usuario } = useAuth();
    const puedeCambiarProductos = puede(usuario, "productos", "crear") || puede(usuario, "productos", "editar");
    const { datos: productos, cargando, error: errorLista, recargar, vigente } = useListaSesion(
        "/api/products", obtenerProductos, { habilitado: puede(usuario, "productos") });
    const { datos: categorias, disponible: categoriasDisponibles, cargando: cargandoCategorias, error: errorCategorias, recargar: recargarCategorias } = useListaSesion(
        "/api/products/categorias", obtenerCategoriasParaProducto, { habilitado: puedeCambiarProductos });
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [busqueda, setBusqueda] = useBusquedaLista("/api/products");
    const [productoEditando, setProductoEditando] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!mensaje) return undefined;
        const temporizador = window.setTimeout(() => setMensaje(""), 5000);
        return () => window.clearTimeout(temporizador);
    }, [mensaje]);

    const productosFiltrados = useMemo(() => productos.filter((producto) =>
        `${producto.codigo_producto} ${producto.nombre} ${producto.descripcion} ${producto.categoria?.nombre ?? ""}`
            .toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
    ), [productos, busqueda]);

    const guardarProducto = async (datos) => {
        setEnviando(true);
        try {
            productoEditando
                ? await actualizarProducto(productoEditando.id_producto, datos)
                : await registrarProducto(datos);
            if (!vigente()) return;
            setModalAbierto(false);
            setProductoEditando(null);
            setMensaje(productoEditando ? "Producto actualizado correctamente." : "Producto registrado correctamente.");
            setError("");
        } finally {
            if (vigente()) setEnviando(false);
        }
    };

    const cambiarEstado = async (producto) => {
        setEnviando(true);
        try {
            await actualizarProducto(producto.id_producto, {
                estado: producto.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO",
            });
            if (!vigente()) return;
            setMensaje("Estado del producto actualizado correctamente.");
            setError("");
        } catch (fallo) {
            if (vigente()) setError(fallo.message);
        } finally {
            if (vigente()) setEnviando(false);
        }
    };

    const abrirFormulario = (producto = null) => {
        setProductoEditando(producto);
        setModalAbierto(true);
    };

    return (
        <div className="module-page productos-page">
            <header className="management-header">
                <div>
                    <p className="eyebrow">Administración</p>
                    <h1>Productos</h1>
                    <div className="header-description">
                        <p>Gestiona los productos del menú, sus categorías y precios.</p>
                        <button type="button" className="management-primary" onClick={() => abrirFormulario()}
                            disabled={cargando || categorias.length === 0 || !puede(usuario, "productos", "crear")}>+ Registrar producto</button>
                    </div>
                </div>
            </header>
            <div className="management-toast-region" aria-live="polite" aria-atomic="true">
                {mensaje && <div className="management-toast exito" role="status">
                    <span>{mensaje}</span>
                    <button type="button" className="management-toast-close" aria-label="Cerrar notificación"
                        onClick={() => setMensaje("")}>×</button>
                </div>}
            </div>
            {error && <p className="productos-error" role="alert">{error}</p>}
            {errorLista && <p className="productos-error" role="alert">{errorLista} <button type="button" onClick={() => void recargar().catch(() => {})}>Reintentar</button></p>}
            {errorCategorias && <p className="productos-error" role="alert">{errorCategorias} <button type="button" onClick={() => void recargarCategorias().catch(() => {})}>Reintentar categorías</button></p>}
            {cargandoCategorias && puedeCambiarProductos && <p role="status">Cargando categorías…</p>}
            {categoriasDisponibles && !errorCategorias && categorias.length === 0 && puede(usuario, "productos", "crear") &&
                <p className="productos-error">Registra una categoría antes de crear productos.</p>}
            <section className="management-panel" aria-labelledby="productosTitle">
                <div className="management-panel-header">
                    <div><h2 id="productosTitle">Productos registrados</h2>
                        <p>Consulta y administra los productos disponibles en el menú.</p></div>
                    <PageSearch className="page-search--header" label="Buscar producto" id="buscarProducto"
                        placeholder="Buscar por nombre, código o categoría..." value={busqueda}
                        onChange={(event) => setBusqueda(event.target.value)} />
                </div>
                <div className="table-wrap">
                    <table className="management-table">
                        <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {cargando ? <tr><td colSpan="6" className="management-loading"><LoadingSpinner label="Cargando productos" /></td></tr>
                                : error && productos.length === 0 ? <tr><td colSpan="6" className="module-empty">No fue posible mostrar los productos.</td></tr>
                                    : productosFiltrados.length === 0 ? <tr><td colSpan="6" className="module-empty">
                                    {busqueda ? "No se encontraron productos." : "No hay productos registrados."}
                                </td></tr> : productosFiltrados.map((producto) => <tr className="management-card" key={producto.id_producto}>
                                    <td data-label="Código"><strong>{producto.codigo_producto}</strong></td>
                                    <td data-label="Producto"><div className="productos-product-cell"><strong>{producto.nombre}</strong>
                                        <span className="productos-description">{producto.descripcion}</span></div></td>
                                    <td data-label="Categoría">{producto.categoria?.nombre ?? "Sin categoría"}</td>
                                    <td data-label="Precio"><strong>{formatoPrecio.format(Number(producto.precio))}</strong></td>
                                    <td data-label="Estado"><span className={`productos-status ${producto.estado === "ACTIVO" ? "active" : "inactive"}`}>
                                        {producto.estado === "ACTIVO" ? "Activo" : "Inactivo"}</span></td>
                                    <td data-label="Acciones"><div className="productos-table-actions">
                                        {puede(usuario, "productos", "editar") && <button type="button" disabled={enviando} onClick={() => abrirFormulario(producto)}>Editar</button>}
                                        {puede(usuario, "productos", producto.estado === "ACTIVO" ? "eliminar" : "editar") && <button type="button" disabled={enviando} onClick={() => cambiarEstado(producto)}>
                                            {producto.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button>}
                                    </div></td>
                                </tr>)}
                        </tbody>
                    </table>
                </div>
            </section>
            {modalAbierto && <ProductoForm key={productoEditando?.id_producto ?? "nuevo"}
                producto={productoEditando} categorias={categorias} enviando={enviando}
                categoriasDisponibles={categoriasDisponibles} errorCategorias={errorCategorias}
                onReintentarCategorias={() => void recargarCategorias().catch(() => {})}
                puedeDesactivar={puede(usuario, "productos", "eliminar")}
                onGuardar={guardarProducto} onCerrar={() => !enviando && setModalAbierto(false)} />}
        </div>
    );
}

export default Productos;
