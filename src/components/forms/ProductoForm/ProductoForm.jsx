import { useEffect, useRef, useState } from "react";

const ingredienteVacio = () => ({ id_ingrediente: "", cantidad_requerida: "1", unidad_medida: "" });
const unidadesCompatibles = (unidad) => {
    if (["g", "kg"].includes(unidad)) return ["g", "kg"];
    if (["ml", "l"].includes(unidad)) return ["ml", "l"];
    return unidad ? [unidad] : [];
};

function ProductoForm({ producto, categorias, enviando, onGuardar, onCerrar, puedeDesactivar = true,
    categoriasDisponibles = true, errorCategorias = "", onReintentarCategorias,
    ingredientesDisponibles = [], catalogoIngredientesDisponible = true, errorIngredientes = "", onReintentarIngredientes }) {
    const dialogRef = useRef(null);
    const [datos, setDatos] = useState({
        id_categoria: producto?.id_categoria ?? "",
        codigo_producto: producto?.codigo_producto ?? "",
        nombre: producto?.nombre ?? "",
        descripcion: producto?.descripcion ?? "",
        precio: producto?.precio ?? "",
        estado: producto?.estado ?? "ACTIVO",
    });
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState("");
    const [ingredientes, setIngredientes] = useState(() => producto?.ingredientes?.map((ingrediente) => ({
        id_ingrediente: String(ingrediente.id_ingrediente),
        cantidad_requerida: String(ingrediente.pivot?.cantidad_requerida ?? ""),
        unidad_medida: ingrediente.pivot?.unidad_medida ?? ingrediente.unidad_medida,
    })) ?? [ingredienteVacio()]);

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => {
            if (dialog?.open) dialog.close();
        };
    }, []);

    const cambiar = (campo, valor) => {
        setDatos((actual) => ({ ...actual, [campo]: valor }));
        setErrores((actual) => ({ ...actual, [campo]: undefined }));
    };

    const cambiarIngrediente = (indice, campo, valor) => {
        setIngredientes((actual) => actual.map((fila, posicion) =>
            posicion === indice ? {
                ...fila,
                [campo]: valor,
                ...(campo === "id_ingrediente" ? { unidad_medida: ingredientesDisponibles.find((disponible) =>
                    String(disponible.id_ingrediente) === valor)?.unidad_medida ?? "" } : {}),
            } : fila));
        setErrores((actual) => ({ ...actual, [`ingredientes.${indice}.${campo}`]: undefined }));
        setErrorGeneral("");
    };

    const guardar = async (event) => {
        event.preventDefault();
        if (!categoriasDisponibles || !categorias.length || enviando) return;
        setErrorGeneral("");
        if (ingredientes.length && !catalogoIngredientesDisponible) return;
        const ids = ingredientes.map((ingrediente) => Number(ingrediente.id_ingrediente));
        if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
            setErrorGeneral("Selecciona ingredientes distintos en cada fila.");
            return;
        }

        try {
            await onGuardar({
                id_categoria: Number(datos.id_categoria),
                codigo_producto: datos.codigo_producto.trim().toUpperCase(),
                nombre: datos.nombre.trim(),
                descripcion: datos.descripcion.trim(),
                precio: datos.precio,
                estado: datos.estado,
                ingredientes: ingredientes.map((ingrediente) => ({
                    id_ingrediente: Number(ingrediente.id_ingrediente),
                    cantidad_requerida: ingrediente.cantidad_requerida,
                    unidad_medida: ingrediente.unidad_medida,
                })),
            });
        } catch (error) {
            if (error.status === 422 && error.errors) {
                setErrores(Object.fromEntries(Object.entries(error.errors).map(([campo, mensajes]) => [
                    campo, Array.isArray(mensajes) ? mensajes[0] : mensajes,
                ])));
            } else {
                setErrorGeneral(error.message || "No fue posible guardar el producto.");
            }
        }
    };

    return (
        <dialog ref={dialogRef} className="productos-dialog" onCancel={(event) => {
            event.preventDefault();
            if (!enviando) onCerrar();
        }} aria-labelledby="productoModalTitle">
            <button className="productos-dialog-close" type="button" onClick={onCerrar} disabled={enviando} aria-label="Cerrar">×</button>
            <header className="productos-dialog-header">
                <span className="productos-eyebrow">Administración</span>
                <h2 id="productoModalTitle">{producto ? "Editar producto" : "Registrar producto"}</h2>
                <p>Completa la información del producto, su categoría y los ingredientes que requiere.</p>
            </header>
            <form onSubmit={guardar}>
                <section className="productos-form-section" aria-labelledby="productoDatosTitle">
                    <h3 id="productoDatosTitle">Información del producto</h3>
                    <div className="productos-form-grid">
                        <label>Código o número interno
                            <input value={datos.codigo_producto} maxLength="30" required placeholder="Ej: PIZ-001"
                                onChange={(event) => cambiar("codigo_producto", event.target.value.toUpperCase())}
                                aria-invalid={Boolean(errores.codigo_producto)} />
                            {errores.codigo_producto && <span className="productos-field-error">{errores.codigo_producto}</span>}
                        </label>
                        <label>Nombre del producto
                            <input value={datos.nombre} maxLength="100" required placeholder="Ej: Pizza Suprema"
                                onChange={(event) => cambiar("nombre", event.target.value)} aria-invalid={Boolean(errores.nombre)} />
                            {errores.nombre && <span className="productos-field-error">{errores.nombre}</span>}
                        </label>
                    </div>
                    <label>Descripción
                        <textarea value={datos.descripcion} maxLength="150" required rows="3" placeholder="Describe el producto..."
                            onChange={(event) => cambiar("descripcion", event.target.value)} aria-invalid={Boolean(errores.descripcion)} />
                        {errores.descripcion && <span className="productos-field-error">{errores.descripcion}</span>}
                    </label>
                    <div className="productos-form-grid">
                        <label>Categoría
                            <select value={datos.id_categoria} required onChange={(event) => cambiar("id_categoria", event.target.value)}
                                disabled={!categoriasDisponibles || enviando} aria-busy={!categoriasDisponibles && !errorCategorias}
                                aria-invalid={Boolean(errores.id_categoria)}>
                                <option value="">{!categoriasDisponibles && !errorCategorias ? "Cargando categorías…" : "Seleccionar categoría"}</option>
                                {categorias.map((categoria) => <option key={categoria.id_categoria} value={categoria.id_categoria}>
                                    {categoria.nombre}
                                </option>)}
                            </select>
                            {errorCategorias && <span className="productos-field-error" role="alert">{errorCategorias} <button type="button" onClick={onReintentarCategorias}>Reintentar</button></span>}
                            {categoriasDisponibles && !errorCategorias && !categorias.length && <span className="productos-field-error">Registra una categoría antes de crear productos.</span>}
                            {errores.id_categoria && <span className="productos-field-error">{errores.id_categoria}</span>}
                        </label>
                        <label>Precio
                            <span className="productos-price-input"><span>₡</span><input type="number" min="0.01" max="99999999.99"
                                step="0.01" value={datos.precio} onChange={(event) => cambiar("precio", event.target.value)}
                                placeholder="0.00" required aria-invalid={Boolean(errores.precio)} /></span>
                            {errores.precio && <span className="productos-field-error">{errores.precio}</span>}
                        </label>
                    </div>
                    <div className="productos-form-grid">
                        <label>Estado
                            <select value={datos.estado} onChange={(event) => cambiar("estado", event.target.value)}>
                                <option value="ACTIVO">Activo</option>
                                <option value="INACTIVO" disabled={Boolean(producto && producto.estado === "ACTIVO" && !puedeDesactivar)}>Inactivo</option>
                            </select>
                        </label>
                    </div>
                </section>
                <section className="productos-form-section" aria-labelledby="productoIngredientesTitle">
                    <div className="form-section-header productos-ingredients-header"><div>
                        <h3 id="productoIngredientesTitle">Ingredientes requeridos</h3>
                        <p>Agrega cada ingrediente con la cantidad necesaria para preparar una unidad del producto más pequeño.</p>
                    </div><button type="button" className="add-item-button" disabled={enviando || !catalogoIngredientesDisponible || !ingredientesDisponibles.length || ingredientes.length >= 100}
                        onClick={() => setIngredientes((actual) => [...actual, ingredienteVacio()])}>+ Agregar ingrediente</button></div>
                    <div className="product-form-list">{ingredientes.map((ingrediente, indice) => {
                        const seleccionado = producto?.ingredientes?.find((anterior) => String(anterior.id_ingrediente) === ingrediente.id_ingrediente);
                        const unidadBase = ingredientesDisponibles.find((disponible) => String(disponible.id_ingrediente) === ingrediente.id_ingrediente)?.unidad_medida
                            ?? seleccionado?.unidad_medida;
                        return <div className="product-form-row productos-ingredient-row" key={indice}>
                            <select aria-label={`Ingrediente ${indice + 1}`} value={ingrediente.id_ingrediente} required disabled={enviando || !catalogoIngredientesDisponible}
                                aria-invalid={Boolean(errores[`ingredientes.${indice}.id_ingrediente`])}
                                onChange={(event) => cambiarIngrediente(indice, "id_ingrediente", event.target.value)}>
                                <option value="">Seleccionar ingrediente</option>
                                {ingredientesDisponibles.map((disponible) => <option key={disponible.id_ingrediente} value={disponible.id_ingrediente}>
                                    {disponible.nombre} · {disponible.unidad_medida}
                                </option>)}
                                {seleccionado && !ingredientesDisponibles.some((disponible) => String(disponible.id_ingrediente) === ingrediente.id_ingrediente) &&
                                    <option value={seleccionado.id_ingrediente}>{seleccionado.nombre} (inactivo)</option>}
                            </select>
                            <div className="productos-quantity-field"><input type="number" aria-label={`Cantidad requerida del ingrediente ${indice + 1}`}
                                min="0.01" max="99999999.99" step="0.01" required value={ingrediente.cantidad_requerida}
                                disabled={enviando} placeholder="Cantidad" aria-invalid={Boolean(errores[`ingredientes.${indice}.cantidad_requerida`])}
                                onChange={(event) => cambiarIngrediente(indice, "cantidad_requerida", event.target.value)} /></div>
                            <select aria-label={`Unidad de medida del ingrediente ${indice + 1}`} value={ingrediente.unidad_medida}
                                required disabled={enviando || !ingrediente.id_ingrediente}
                                aria-invalid={Boolean(errores[`ingredientes.${indice}.unidad_medida`])}
                                onChange={(event) => cambiarIngrediente(indice, "unidad_medida", event.target.value)}>
                                {!ingrediente.id_ingrediente && <option value="">Unidad</option>}
                                {[...new Set([...unidadesCompatibles(unidadBase), ingrediente.unidad_medida].filter(Boolean))].map((unidad) =>
                                    <option key={unidad} value={unidad}>{unidad}</option>)}
                            </select>
                            <button className="remove-item-button" type="button" aria-label={`Quitar ingrediente ${indice + 1}`}
                                disabled={enviando} onClick={() => {
                                    setIngredientes((actual) => actual.filter((_, posicion) => posicion !== indice));
                                    setErrores({});
                                }}>×</button>
                            {(errores[`ingredientes.${indice}.id_ingrediente`] || errores[`ingredientes.${indice}.cantidad_requerida`] || errores[`ingredientes.${indice}.unidad_medida`]) &&
                                <span className="productos-field-error productos-ingredient-error">{errores[`ingredientes.${indice}.id_ingrediente`] || errores[`ingredientes.${indice}.cantidad_requerida`] || errores[`ingredientes.${indice}.unidad_medida`]}</span>}
                        </div>;
                    })}</div>
                    {!catalogoIngredientesDisponible && !errorIngredientes && <p role="status">Cargando ingredientes disponibles…</p>}
                    {errorIngredientes && <p className="productos-field-error" role="alert">{errorIngredientes} <button type="button" onClick={onReintentarIngredientes}>Reintentar</button></p>}
                    {catalogoIngredientesDisponible && !errorIngredientes && !ingredientesDisponibles.length && <p>No hay ingredientes activos para agregar.</p>}
                    {errores.ingredientes && <p className="productos-field-error" role="alert">{errores.ingredientes}</p>}
                </section>
                {errorGeneral && <p className="productos-error" role="alert">{errorGeneral}</p>}
                <div className="productos-form-actions">
                    <button type="button" className="productos-secondary-button" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                    <button type="submit" className="productos-primary-button" disabled={enviando || !categoriasDisponibles || !categorias.length || (ingredientes.length > 0 && !catalogoIngredientesDisponible)}>
                        {enviando ? "Guardando..." : producto ? "Guardar cambios" : "Registrar producto"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default ProductoForm;
