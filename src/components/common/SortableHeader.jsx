function SortableHeader({ label, campo, orden = { campo: "", direccion: "asc" }, onOrdenar = () => {}, direccionInicial = "asc" }) {
    const activo = orden.campo === campo;
    const siguienteDireccion = activo
        ? orden.direccion === "asc" ? "desc" : "asc" : direccionInicial;

    return (
        <th aria-sort={activo ? orden.direccion === "asc" ? "ascending" : "descending" : "none"}>
            <button className="table-sort-button" type="button"
                aria-label={`Ordenar por ${label} ${siguienteDireccion === "asc" ? "de menor a mayor" : "de mayor a menor"}`}
                onClick={() => onOrdenar(campo, direccionInicial)}>
                <span>{label}</span>
                <span className="table-sort-indicator" aria-hidden="true">
                    {activo ? orden.direccion === "asc" ? "▲" : "▼" : "↕"}
                </span>
            </button>
        </th>
    );
}

export default SortableHeader;
