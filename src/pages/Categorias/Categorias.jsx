import { useEffect, useMemo, useState } from "react";
import "../ModulePage.css";
import CategoriaForm from "../../components/forms/CategoriaForm/CategoriaForm.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import { useAuth } from "../../context/useAuth.js";
import { puede } from "../../constants/roles.js";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import { actualizarCategoria, obtenerCategorias, registrarCategoria } from "../../services/catalogoService.js";
import { useBusquedaLista, useListaSesion } from "../../hooks/useListaSesion.js";

function Categorias() {
    const { usuario } = useAuth();
    const { datos: categorias, cargando, error: errorCarga, recargar, vigente } = useListaSesion(
        "/api/categories", obtenerCategorias, { habilitado: puede(usuario, "categorias") });
    const [mensaje, setMensaje] = useState("");
    const [busqueda, setBusqueda] = useBusquedaLista("/api/categories");
    const [categoriaEditando, setCategoriaEditando] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!mensaje) return undefined;
        const temporizador = window.setTimeout(() => setMensaje(""), 5000);
        return () => window.clearTimeout(temporizador);
    }, [mensaje]);

    const categoriasFiltradas = useMemo(() => categorias.filter((categoria) =>
        `${categoria.nombre} ${categoria.descripcion}`.toLocaleLowerCase()
            .includes(busqueda.trim().toLocaleLowerCase())
    ), [categorias, busqueda]);

    const guardar = async (datos) => {
        setEnviando(true);
        try {
            categoriaEditando
                ? await actualizarCategoria(categoriaEditando.id_categoria, datos)
                : await registrarCategoria(datos);
            if (!vigente()) return;
            setModalAbierto(false);
            setCategoriaEditando(null);
            setMensaje(categoriaEditando ? "Categoría actualizada correctamente." : "Categoría registrada correctamente.");
        } finally {
            if (vigente()) setEnviando(false);
        }
    };

    const abrirFormulario = (categoria = null) => {
        setCategoriaEditando(categoria);
        setModalAbierto(true);
    };

    return (
        <div className="module-page categorias-page">
            <header className="management-header">
                <div>
                    <p className="eyebrow">Administración</p>
                    <h1>Categorías</h1>
                    <div className="header-description">
                        <p>Gestiona las categorías utilizadas para organizar los productos del menú.</p>
                        {puede(usuario, "categorias", "crear") && <button className="management-primary" type="button" onClick={() => abrirFormulario()}>
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
                        placeholder="Buscar por nombre o descripción..." value={busqueda}
                        onChange={(event) => setBusqueda(event.target.value)} />
                </div>
                <div className="table-wrap">
                    <table className="management-table">
                        <thead><tr><th>Nombre</th><th>Descripción</th><th>Productos</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {cargando ? <tr><td colSpan="5"><LoadingSpinner label="Cargando categorías" /></td></tr>
                                : errorCarga && !categorias.length ? <tr><td colSpan="5" className="module-empty">No fue posible mostrar las categorías.</td></tr>
                                    : categoriasFiltradas.length === 0 ? <tr><td colSpan="5" className="module-empty">
                                    {busqueda ? "No se encontraron categorías." : "No hay categorías registradas."}
                                </td></tr> : categoriasFiltradas.map((categoria) => <tr className="management-card" key={categoria.id_categoria}>
                                    <td data-label="Nombre"><strong>{categoria.nombre}</strong></td>
                                    <td data-label="Descripción">{categoria.descripcion}</td>
                                    <td data-label="Productos">{categoria.productos_count}</td>
                                    <td data-label="Estado"><span className={`catalog-status ${categoria.estado === "ACTIVO" ? "active" : "inactive"}`}>
                                        {categoria.estado === "ACTIVO" ? "Activo" : "Inactivo"}</span></td>
                                    <td data-label="Acciones">{puede(usuario, "categorias", "editar") && <button className="catalog-action" type="button" onClick={() => abrirFormulario(categoria)}>Editar</button>}</td>
                                </tr>)}
                        </tbody>
                    </table>
                </div>
            </section>

            {modalAbierto && <CategoriaForm key={categoriaEditando?.id_categoria ?? "nueva"}
                categoria={categoriaEditando} enviando={enviando} onGuardar={guardar}
                puedeDesactivar={puede(usuario, "categorias", "eliminar")}
                onCerrar={() => !enviando && setModalAbierto(false)} />}
        </div>
    );
}

export default Categorias;
