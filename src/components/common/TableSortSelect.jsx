function TableSortSelect({ orden, onOrdenar, opciones }) {
    return (
        <label className="table-sort-mobile">
            <span>Ordenar por</span>
            <select value={orden.campo ? `${orden.campo}:${orden.direccion}` : ""}
                onChange={(event) => {
                    const [campo, direccion] = event.target.value.split(":");
                    onOrdenar(campo, direccion ?? "asc");
                }}>
                <option value="">Orden predeterminado</option>
                {opciones.flatMap(({ campo, label, mayorAMenor = false }) => [
                    <option key={`${campo}:asc`} value={`${campo}:asc`}>
                        {label}: {mayorAMenor ? "menor a mayor" : "A a Z"}
                    </option>,
                    <option key={`${campo}:desc`} value={`${campo}:desc`}>
                        {label}: {mayorAMenor ? "mayor a menor" : "Z a A"}
                    </option>,
                ])}
            </select>
        </label>
    );
}

export default TableSortSelect;
