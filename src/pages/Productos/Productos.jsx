import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth.js";
import { puede } from "../../constants/roles.js";
import "../ModulePage.css";
import "./Productos.css";
import ProductoForm from "../../components/forms/ProductoForm/ProductoForm.jsx";
import CambiarEstadoUsuarioDialog from "../../components/forms/CambiarEstadoUsuarioDialog/CambiarEstadoUsuarioDialog.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import Paginacion from "../../components/common/Paginacion/Paginacion.jsx";
import { actualizarProducto, cambiarEstadoProducto, obtenerCategoriasParaProducto, obtenerIngredientesParaProducto, registrarProducto } from "../../services/catalogoService.js";
import { useBusquedaLista, useListaSesion } from "../../hooks/useListaSesion.js";
import { useTablaPaginada } from "../../hooks/useTablaPaginada.js";
import SortableHeader from "../../components/common/SortableHeader.jsx";
import TableSortSelect from "../../components/common/TableSortSelect.jsx";

const formatoPrecio = new Intl.NumberFormat("es-CR", {
    style: "currency", currency: "CRC", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function Productos() {
    const { usuario } = useAuth();
    const puedeCambiarProductos = puede(usuario, "productos", "crear") || puede(usuario, "productos", "editar");
    const mostrarAcciones = puede(usuario, "productos", "editar") || puede(usuario, "productos", "eliminar");
    const [busqueda, setBusqueda] = useBusquedaLista("/api/products");
    const { datos: productos, paginacion, cargando, error: errorLista, recargar, orden, cambiarOrden, establecerOrden } = useTablaPaginada(
        "/api/products", "productos", busqueda, puede(usuario, "productos"));
    const { datos: categorias, disponible: categoriasDisponibles, cargaCompleta: categoriasCargadas,
        cargando: cargandoCategorias, error: errorCategorias, recargar: recargarCategorias } = useListaSesion(
        "/api/products/categorias", obtenerCategoriasParaProducto, { habilitado: puedeCambiarProductos });
    const { datos: ingredientesDisponibles, disponible: catalogoIngredientesDisponible, error: errorIngredientes,
        recargar: recargarIngredientes } = useListaSesion(
        "/api/products/ingredientes", obtenerIngredientesParaProducto, { habilitado: puedeCambiarProductos });
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [productoEditando, setProductoEditando] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [errorEstado, setErrorEstado] = useState("");

    useEffect(() => {
        if (!mensaje) return undefined;
        const temporizador = window.setTimeout(() => setMensaje(""), 5000);
        return () => window.clearTimeout(temporizador);
    }, [mensaje]);

    const guardarProducto = async (datos) => {
        setEnviando(true);
        try {
            productoEditando
                ? await actualizarProducto(productoEditando.id_producto, datos)
                : await registrarProducto(datos);
            setModalAbierto(false);
            setProductoEditando(null);
            setMensaje(productoEditando ? "Producto actualizado correctamente." : "Producto registrado correctamente.");
            setError("");
        } finally {
            setEnviando(false);
        }
    };

    const cambiarEstado = async () => {
        const producto = productoSeleccionado;
        if (!producto || enviando) return;
        const nuevoEstado = producto.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        setEnviando(true);
        setErrorEstado("");
        try {
            await cambiarEstadoProducto(producto.id_producto, nuevoEstado);
            setProductoSeleccionado(null);
            setMensaje(nuevoEstado === "ACTIVO" ? "Producto activado correctamente." : "Producto desactivado correctamente.");
            setError("");
        } catch (fallo) {
            setErrorEstado(fallo.message);
        } finally {
            setEnviando(false);
        }
    };

    const abrirFormulario = (producto = null) => {
        setProductoEditando(producto);
        setModalAbierto(true);
        if (errorIngredientes) void recargarIngredientes().catch(() => {});
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
                            disabled={cargando || Boolean(errorLista) || !categoriasCargadas || categorias.length === 0
                                || !puede(usuario, "productos", "crear")}>+ Registrar producto</button>
                    </div>
                </div>
            </header>
            <div className="management-toast-region" aria-live="polite" aria-atomic="true">
                {mensaje && <div className="management-toast exito" role="status">
                    <span>{mensaje}</span>
                    <button type="button" className="management-toast-close" aria-label="Cerrar notificación"
                        onClick={() => setMensaje("")}>×</button>
                </div>}
                {categoriasCargadas && categorias.length === 0 && puede(usuario, "productos", "crear") &&
                    <div className="management-toast error" role="alert">
                        <span>Necesitas una categoría activa para registrar productos.</span>
                    </div>}
            </div>
            {error && <p className="productos-error" role="alert">{error}</p>}
            {errorLista && <p className="productos-error" role="alert">{errorLista} <button type="button" onClick={() => void recargar().catch(() => {})}>Reintentar</button></p>}
            {errorCategorias && <p className="productos-error" role="alert">{errorCategorias} <button type="button" onClick={() => void recargarCategorias().catch(() => {})}>Reintentar categorías</button></p>}
            {cargandoCategorias && puedeCambiarProductos && <p role="status">Cargando categorías…</p>}
            <section className="management-panel" aria-labelledby="productosTitle">
                <div className="management-panel-header">
                    <div><h2 id="productosTitle">Productos registrados</h2>
                        <p>Consulta y administra los productos disponibles en el menú.</p></div>
                    <PageSearch className="page-search--header" label="Buscar producto" id="buscarProducto"
                        placeholder="Buscar por nombre, código, categoría, tamaño o precio..." value={busqueda} maxLength={100}
                        onChange={(event) => setBusqueda(event.target.value)} />
                </div>
                <TableSortSelect orden={orden} onOrdenar={establecerOrden} opciones={[
                    { campo: "codigo", label: "Código" }, { campo: "nombre", label: "Producto" },
                    { campo: "categoria", label: "Categoría" }, { campo: "precio", label: "Precio", mayorAMenor: true },
                    { campo: "tamano", label: "Tamaño" }, { campo: "estado", label: "Estado" },
                ]} />
                <div className="table-wrap">
                    <table className="management-table">
                        <thead><tr>
                            <SortableHeader label="Código" campo="codigo" orden={orden} onOrdenar={cambiarOrden} />
                            <SortableHeader label="Producto" campo="nombre" orden={orden} onOrdenar={cambiarOrden} />
                            <SortableHeader label="Categoría" campo="categoria" orden={orden} onOrdenar={cambiarOrden} />
                            <SortableHeader label="Precio" campo="precio" orden={orden} onOrdenar={cambiarOrden} direccionInicial="desc" />
                            <SortableHeader label="Tamaño" campo="tamano" orden={orden} onOrdenar={cambiarOrden} />
                            <SortableHeader label="Estado" campo="estado" orden={orden} onOrdenar={cambiarOrden} />
                            {mostrarAcciones && <th>Acciones</th>}
                        </tr></thead>
                        <tbody>
                            {cargando ? <tr><td colSpan={mostrarAcciones ? 7 : 6} className="management-loading"><LoadingSpinner label="Cargando productos" /></td></tr>
                                : error && productos.length === 0 ? <tr><td colSpan={mostrarAcciones ? 7 : 6} className="module-empty">No fue posible mostrar los productos.</td></tr>
                                    : productos.length === 0 ? <tr><td colSpan={mostrarAcciones ? 7 : 6} className="module-empty">
                                    {busqueda ? "No se encontraron productos." : "No hay productos registrados."}
                                </td></tr> : productos.map((producto) => <tr className="management-card" key={producto.id_producto}>
                                    <td data-label="Código"><strong>{producto.codigo_producto}</strong></td>
                                    <td data-label="Producto"><div className="productos-product-cell"><strong>{producto.nombre}</strong>
                                        <span className="productos-description">{producto.descripcion}</span></div></td>
                                    <td data-label="Categoría">{producto.categoria?.nombre ?? "Sin categoría"}</td>
                                    <td data-label="Precio"><strong>{formatoPrecio.format(Number(producto.precio))}</strong></td>
                                    <td data-label="Tamaño"><span className="productos-status">
                                        {producto.tamano ? producto.tamano.charAt(0).toUpperCase() + producto.tamano.slice(1) : "No aplica"}
                                    </span></td>
                                    <td data-label="Estado"><span className={`productos-status ${producto.estado === "ACTIVO" ? "active" : "inactive"}`}>
                                        {producto.estado === "ACTIVO" ? "Activo" : "Inactivo"}</span></td>
                                    {mostrarAcciones && <td data-label="Acciones"><div className="productos-table-actions">
                                        {puede(usuario, "productos", "editar") && <button type="button" disabled={enviando} onClick={() => abrirFormulario(producto)}>Modificar</button>}
                                        {puede(usuario, "productos", producto.estado === "ACTIVO" ? "eliminar" : "editar") && <button type="button" disabled={enviando} onClick={() => {
                                            setErrorEstado("");
                                            setProductoSeleccionado(producto);
                                        }}>
                                            {producto.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button>}
                                    </div></td>}
                                </tr>)}
                        </tbody>
                    </table>
                </div>
                {!cargando && <Paginacion paginacion={paginacion} nombre="productos" />}
            </section>
            {modalAbierto && <ProductoForm key={productoEditando?.id_producto ?? "nuevo"}
                producto={productoEditando} categorias={categorias} enviando={enviando}
                categoriasDisponibles={categoriasDisponibles} categoriasCargadas={categoriasCargadas} errorCategorias={errorCategorias}
                onReintentarCategorias={() => void recargarCategorias().catch(() => {})}
                ingredientesDisponibles={ingredientesDisponibles} catalogoIngredientesDisponible={catalogoIngredientesDisponible}
                errorIngredientes={errorIngredientes} onReintentarIngredientes={() => void recargarIngredientes().catch(() => {})}
                puedeDesactivar={puede(usuario, "productos", "eliminar")}
                onGuardar={guardarProducto} onCerrar={() => !enviando && setModalAbierto(false)} />}
            <CambiarEstadoUsuarioDialog usuarioSeleccionado={productoSeleccionado} entidad="producto"
                descripcion={productoSeleccionado && (productoSeleccionado.estado === "ACTIVO"
                    ? `¿Desea desactivar el producto ${productoSeleccionado.nombre}?`
                    : `¿Desea activar el producto ${productoSeleccionado.nombre}?`)}
                isSubmitting={enviando} mensajeError={errorEstado}
                textoEnviando={productoSeleccionado?.estado === "ACTIVO" ? "Desactivando…" : "Activando…"}
                onConfirm={cambiarEstado} onClose={() => {
                    if (!enviando) {
                        setProductoSeleccionado(null);
                        setErrorEstado("");
                    }
                }} />
        </div>
    );
}

export default Productos;
