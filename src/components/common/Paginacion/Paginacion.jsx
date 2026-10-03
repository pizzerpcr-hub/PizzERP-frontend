import "./Paginacion.css";

function Paginacion({ paginacion, nombre }) {
    const { pagina, totalPaginas, totalElementos, inicio, fin, cambiarPagina } = paginacion;

    if (totalElementos === 0) return null;

    return <nav className="table-pagination" aria-label={`Paginación de ${nombre}`}>
        <span className="table-pagination-summary">Mostrando {inicio}–{fin} de {totalElementos}</span>
        <div className="table-pagination-controls">
            <button type="button" onClick={() => cambiarPagina(pagina - 1)} disabled={pagina === 1}>
                Anterior
            </button>
            <span aria-live="polite">Página {pagina} de {totalPaginas}</span>
            <button type="button" onClick={() => cambiarPagina(pagina + 1)} disabled={pagina === totalPaginas}>
                Siguiente
            </button>
        </div>
    </nav>;
}

export default Paginacion;
