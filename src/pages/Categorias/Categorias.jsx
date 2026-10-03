import { useEffect, useState } from "react";
import "../ModulePage.css";
import CategoriaForm from "../../components/forms/CategoriaForm/CategoriaForm.jsx";
import CambiarEstadoUsuarioDialog from "../../components/forms/CambiarEstadoUsuarioDialog/CambiarEstadoUsuarioDialog.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import { useAuth } from "../../context/useAuth.js";
import { puede } from "../../constants/roles.js";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import Paginacion from "../../components/common/Paginacion/Paginacion.jsx";
import { actualizarCategoria, registrarCategoria } from "../../services/catalogoService.js";
import { useBusquedaLista } from "../../hooks/useListaSesion.js";
import { useTablaPaginada } from "../../hooks/useTablaPaginada.js";

function Categorias() {
    const { usuario } = useAuth();
    const [busqueda, setBusqueda] = useBusquedaLista("/api/categories");
    const { datos: categorias, paginacion, cargando, error: errorCarga, recargar } = useTablaPaginada(
        "/api/categories", "categorias", busqueda, puede(usuario, "categorias"));
    const [mensaje, setMensaje] = useState("");
    const [categoriaEditando, setCategoriaEditando] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const [errorEstado, setErrorEstado] = useState("");

    useEffect(() => {
        if (!mensaje) return undefined;
        const temporizador = window.setTimeout(() => setMensaje(""), 5000);
        return () => window.clearTimeout(temporizador);
    }, [mensaje]);

    const guardar = async (datos) => {
        setEnviando(true);
        try {
            categoriaEditando
                ? await actualizarCategoria(categoriaEditando.id_categoria, datos)
                : await registrarCategoria(datos);
            setModalAbierto(false);
            setCategoriaEditando(null);
            setMensaje(categoriaEditando ? "Categoría actualizada correctamente." : "Categoría registrada correctamente.");
        } finally {
            setEnviando(false);
        }
    };

    const abrirFormulario = (categoria = null) => {
        setCategoriaEditando(categoria);
        setModalAbierto(true);
    };

    const cambiarEstado = async () => {
        const categoria = categoriaSeleccionada;
        if (!categoria || enviando) return;
        const nuevoEstado = categoria.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        setEnviando(true);
        setErrorEstado("");
        try {
            await actualizarCategoria(categoria.id_categoria, { estado: nuevoEstado });
            setCategoriaSeleccionada(null);
            setMensaje(nuevoEstado === "ACTIVO" ? "Categoría activada correctamente." : "Categoría desactivada correctamente.");
        } catch (error) {
            setErrorEstado(error.message);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="module-page categorias-page">
            <header className="management-header">
                <div>
                    <p className="eyebrow">Administración</p>
                    <h1>Categorías</h1>
                    <div className="header-description">
                        <p>Gestiona las categorías utilizadas para organizar los productos del menú.</p>
                        {puede(usuario, "categorias", "crear") && <button className="management-primary" type="button" disabled={cargando} onClick={() => abrirFormulario()}>
                            + Registrar categoría
                        </button>}
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
            {errorCarga && <p className="catalog-error" role="alert">{errorCarga} <button type="button" onClick={() => void recargar().catch(() => {})}>Reintentar</button></p>}

            <section className="management-panel">
                <div className="management-panel-header">
                    <div>
                        <h2>Categorías registradas</h2>
                        <p>Consulta y administra las categorías disponibles en el sistema.</p>
                    </div>
                    <PageSearch className="page-search--header" label="Buscar categoría" id="buscarCategoria"
                        placeholder="Buscar por nombre o descripción..." value={busqueda} maxLength={100}
                        onChange={(event) => setBusqueda(event.target.value)} />
                </div>
                <div className="table-wrap">
                    <table className="management-table">
                        <thead><tr><th>Nombre</th><th>Descripción</th><th>Productos</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {cargando ? <tr><td colSpan="5"><LoadingSpinner label="Cargando categorías" /></td></tr>
                                : errorCarga && !categorias.length ? <tr><td colSpan="5" className="module-empty">No fue posible mostrar las categorías.</td></tr>
                                    : categorias.length === 0 ? <tr><td colSpan="5" className="module-empty">
                                    {busqueda ? "No se encontraron categorías." : "No hay categorías registradas."}
                                </td></tr> : categorias.map((categoria) => <tr className="management-card" key={categoria.id_categoria}>
                                    <td data-label="Nombre"><strong>{categoria.nombre}</strong></td>
                                    <td data-label="Descripción">{categoria.descripcion}</td>
                                    <td data-label="Productos">{categoria.productos_count}</td>
                                    <td data-label="Estado"><span className={`catalog-status ${categoria.estado === "ACTIVO" ? "active" : "inactive"}`}>
                                        {categoria.estado === "ACTIVO" ? "Activo" : "Inactivo"}</span></td>
                                    <td data-label="Acciones"><div className="category-table-actions">
                                        {puede(usuario, "categorias", "editar") && <button className="catalog-action" type="button" disabled={enviando}
                                            onClick={() => abrirFormulario(categoria)}>Modificar</button>}
                                        {puede(usuario, "categorias", categoria.estado === "ACTIVO" ? "eliminar" : "editar") &&
                                            <button className="catalog-action" type="button" disabled={enviando} onClick={() => {
                                                setErrorEstado("");
                                                setCategoriaSeleccionada(categoria);
                                            }}>{categoria.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button>}
                                    </div></td>
                                </tr>)}
                        </tbody>
                    </table>
                </div>
                {!cargando && <Paginacion paginacion={paginacion} nombre="categorías" />}
            </section>

            {modalAbierto && <CategoriaForm key={categoriaEditando?.id_categoria ?? "nueva"}
                categoria={categoriaEditando} enviando={enviando} onGuardar={guardar}
                onCerrar={() => !enviando && setModalAbierto(false)} />}
            <CambiarEstadoUsuarioDialog usuarioSeleccionado={categoriaSeleccionada} entidad="categoría"
                descripcion={categoriaSeleccionada && (categoriaSeleccionada.estado === "ACTIVO"
                    ? `¿Desea desactivar la categoría ${categoriaSeleccionada.nombre}? Podrá activarla después.`
                    : `¿Desea activar la categoría ${categoriaSeleccionada.nombre}?`)}
                isSubmitting={enviando} mensajeError={errorEstado}
                textoEnviando={categoriaSeleccionada?.estado === "ACTIVO" ? "Desactivando…" : "Activando…"}
                onConfirm={cambiarEstado} onClose={() => {
                    if (!enviando) {
                        setCategoriaSeleccionada(null);
                        setErrorEstado("");
                    }
                }} />
        </div>
    );
}

export default Categorias;
