import { useEffect, useRef, useState } from "react";
import { validarCamposFormulario } from "../validarCamposFormulario.js";

const ingredienteVacio = () => ({ id_ingrediente: "", cantidad_requerida: "1", unidad_medida: "" });
const unidadesCompatibles = (unidad) => {
    if (["g", "kg"].includes(unidad)) return ["g", "kg"];
    if (["ml", "l"].includes(unidad)) return ["ml", "l"];
    return unidad ? [unidad] : [];
};
const convertirCantidad = (cantidad, origen, destino) => {
    const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cantidad);
    if (!partes) return null;
    const factores = { g: 1n, kg: 1000n, ml: 1n, l: 1000n };
    if (!factores[origen] || !factores[destino] || !unidadesCompatibles(origen).includes(destino)) return null;
    const centesimas = BigInt(partes[1]) * 100n + BigInt((partes[2] ?? "").padEnd(2, "0"));
    const numerador = centesimas * factores[origen];
    if (numerador % factores[destino] !== 0n) return null;
    const resultado = numerador / factores[destino];
    if (resultado < 1n || resultado > 9999999999n) return null;
    return `${resultado / 100n}.${String(resultado % 100n).padStart(2, "0")}`;
};
const firmaIngredientes = (filas) => JSON.stringify(filas.map((fila) => ({
    id: Number(fila.id_ingrediente), cantidad: Number(fila.cantidad_requerida), unidad: fila.unidad_medida,
})).sort((a, b) => a.id - b.id));

function ProductoForm({ producto, categorias, enviando, onGuardar, onCerrar, puedeDesactivar = true,
    categoriasDisponibles = true, categoriasCargadas = categoriasDisponibles, errorCategorias = "", onReintentarCategorias,
    ingredientesDisponibles = [], catalogoIngredientesDisponible = true, errorIngredientes = "", onReintentarIngredientes }) {
    const dialogRef = useRef(null);
    const [datos, setDatos] = useState({
        id_categoria: producto?.id_categoria ?? "",
        nombre: producto?.nombre ?? "",
        descripcion: producto?.descripcion ?? "",
        precio: producto?.precio ?? "",
        tamano: producto?.tamano ?? "",
        estado: producto?.estado ?? "ACTIVO",
        motivo: "",
    });
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState("");
    const [avisoCampos, setAvisoCampos] = useState(false);
    const [ingredientes, setIngredientes] = useState(() => producto?.ingredientes?.map((ingrediente) => ({
        id_ingrediente: String(ingrediente.id_ingrediente),
        cantidad_requerida: String(ingrediente.pivot?.cantidad_requerida ?? ""),
        unidad_medida: ingrediente.pivot?.unidad_medida ?? ingrediente.unidad_medida,
    })) ?? [ingredienteVacio()]);
    const hayDatos = [datos.nombre, datos.descripcion, String(datos.id_categoria), String(datos.precio), datos.motivo]
        .some((valor) => valor.trim()) || ingredientes.some((ingrediente) =>
        ingrediente.id_ingrediente || ingrediente.unidad_medida || ingrediente.cantidad_requerida !== "1");
    const hayCambios = Boolean(producto) && (
        Number(datos.id_categoria) !== Number(producto.id_categoria) ||
        datos.nombre.trim() !== producto.nombre || datos.descripcion.trim() !== producto.descripcion ||
        Number(datos.precio) !== Number(producto.precio) || datos.estado !== producto.estado ||
        datos.tamano !== (producto.tamano ?? "") ||
        firmaIngredientes(ingredientes) !== firmaIngredientes(producto.ingredientes.map((ingrediente) => ({
            id_ingrediente: ingrediente.id_ingrediente,
            cantidad_requerida: ingrediente.pivot?.cantidad_requerida,
            unidad_medida: ingrediente.pivot?.unidad_medida ?? ingrediente.unidad_medida,
        })))
    );

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
        const fila = ingredientes[indice];
        if (!fila) return;
        const cambio = { [campo]: valor };
        let avisoCantidad;
        if (campo === "id_ingrediente") {
            const unidadBase = ingredientesDisponibles.find((disponible) => String(disponible.id_ingrediente) === valor)?.unidad_medida ?? "";
            const compatibles = unidadesCompatibles(unidadBase);
            cambio.unidad_medida = compatibles.includes(fila.unidad_medida)
                ? fila.unidad_medida : compatibles.includes("g") ? "g" : unidadBase;
            if (fila.unidad_medida && !compatibles.includes(fila.unidad_medida)) {
                cambio.cantidad_requerida = "";
                avisoCantidad = "La unidad del ingrediente cambió. Ingresa la cantidad en la nueva unidad.";
            }
        } else if (campo === "unidad_medida" && valor !== fila.unidad_medida && fila.cantidad_requerida.trim()) {
            const convertida = convertirCantidad(fila.cantidad_requerida, fila.unidad_medida, valor);
            if (convertida === null) {
                setErrores((actual) => ({ ...actual, [`ingredientes.${indice}.unidad_medida`]:
                    "No se puede convertir esta cantidad exactamente con dos decimales dentro del rango permitido. Conserva la unidad o vacía la cantidad antes de cambiarla." }));
                return;
            }
            cambio.cantidad_requerida = convertida;
        }
        setIngredientes((actual) => actual.map((actualFila, posicion) => posicion === indice ? { ...actualFila, ...cambio } : actualFila));
        setErrores((actual) => ({
            ...actual,
            [`ingredientes.${indice}.${campo}`]: undefined,
            ...(campo === "id_ingrediente" ? { [`ingredientes.${indice}.unidad_medida`]: undefined } : {}),
            ...(campo === "id_ingrediente" || campo === "unidad_medida"
                ? { [`ingredientes.${indice}.cantidad_requerida`]: avisoCantidad } : {}),
        }));
        setErrorGeneral("");
    };

    const guardar = async (event) => {
        event.preventDefault();
        const erroresCampos = validarCamposFormulario(event.currentTarget);
        if (Object.keys(erroresCampos).length) {
            setErrores(hayDatos ? erroresCampos : {});
            setAvisoCampos(true);
            return;
        }
        if (!categoriasDisponibles || !categorias.length || enviando) return;
        setErrorGeneral("");
        if (ingredientes.length && !catalogoIngredientesDisponible) return;
        const ids = ingredientes.map((ingrediente) => Number(ingrediente.id_ingrediente));
        if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
            setAvisoCampos(true);
            setErrores(Object.fromEntries(ingredientes.map((ingrediente, indice) => [
                `ingredientes.${indice}.id_ingrediente`, "Selecciona un ingrediente distinto.",
            ])));
            setErrorGeneral("Selecciona ingredientes distintos en cada fila.");
            return;
        }

        try {
            await onGuardar({
                id_categoria: Number(datos.id_categoria),
                nombre: datos.nombre.trim(),
                descripcion: datos.descripcion.trim(),
                precio: datos.precio,
                tamano: datos.tamano,
                estado: datos.estado,
                ingredientes: ingredientes.map((ingrediente) => ({
                    id_ingrediente: Number(ingrediente.id_ingrediente),
                    cantidad_requerida: ingrediente.cantidad_requerida,
                    unidad_medida: ingrediente.unidad_medida,
                })),
                ...(producto && { motivo: datos.motivo.trim() }),
            });
        } catch (error) {
            if (error.status === 422 && error.errors) {
                setAvisoCampos(true);
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
            <form onSubmit={guardar} noValidate onInputCapture={() => setAvisoCampos(false)} data-invalid={avisoCampos && hayDatos}>
                <section className="productos-form-section" aria-labelledby="productoDatosTitle">
                    <h3 id="productoDatosTitle">Información del producto</h3>
                    <div className="productos-form-grid">
                        {producto && <p>Código: {producto.codigo_producto}</p>}
                        <label>Nombre del producto
                            <input name="nombre" value={datos.nombre} maxLength="50" required placeholder="Ej: Pizza Suprema"
                                data-mensaje-obligatorio="Ingresa el nombre del producto."
                                onChange={(event) => cambiar("nombre", event.target.value)} aria-invalid={Boolean(errores.nombre)} />
                            {errores.nombre && <span className="required-field-message" role="alert">{errores.nombre}</span>}
                        </label>
                    </div>
                    <label>Descripción
                        <textarea name="descripcion" value={datos.descripcion} maxLength="50" required rows="3" placeholder="Describe el producto..."
                            data-mensaje-obligatorio="Ingresa la descripción del producto."
                            onChange={(event) => cambiar("descripcion", event.target.value)} aria-invalid={Boolean(errores.descripcion)} />
                        <small className="field-character-count">{datos.descripcion.length}/50</small>
                        {errores.descripcion && <span className="required-field-message" role="alert">{errores.descripcion}</span>}
                    </label>
                    <div className="productos-form-grid">
                        <label>Categoría
                            <select name="id_categoria" value={datos.id_categoria} required onChange={(event) => cambiar("id_categoria", event.target.value)}
                                data-mensaje-obligatorio="Selecciona una categoría."
                                disabled={!categoriasDisponibles || enviando} aria-busy={!categoriasDisponibles && !errorCategorias}
                                aria-invalid={Boolean(errores.id_categoria)}>
                                <option value="">{!categoriasDisponibles && !errorCategorias ? "Cargando categorías…" : "Seleccionar categoría"}</option>
                                {categorias.map((categoria) => <option key={categoria.id_categoria} value={categoria.id_categoria}>
                                    {categoria.codigo_categoria} · {categoria.nombre}
                                </option>)}
                                {producto?.categoria && !categorias.some((categoria) => Number(categoria.id_categoria) === Number(producto.id_categoria)) &&
                                    <option value={producto.id_categoria}>{producto.categoria.nombre} (inactiva; seleccione otra para cambiarla)</option>}
                            </select>
                            {errorCategorias && <span className="productos-field-error" role="alert">{errorCategorias} <button type="button" onClick={onReintentarCategorias}>Reintentar</button></span>}
                            {categoriasCargadas && !errorCategorias && !categorias.length && <span className="productos-field-error">Necesitas una categoría activa para registrar productos.</span>}
                            {errores.id_categoria && <span className="required-field-message" role="alert">{errores.id_categoria}</span>}
                        </label>
                        <label>Precio
                            <span className={`productos-price-input${errores.precio ? " invalid" : ""}`}><span>₡</span><input name="precio" type="number" min="0.01" max="99999999.99"
                                data-mensaje-obligatorio="Ingresa el precio del producto." data-mensaje-invalido="Ingresa un precio mayor que cero."
                                step="0.01" value={datos.precio} onChange={(event) => cambiar("precio", event.target.value)}
                                placeholder="0.00" required aria-invalid={Boolean(errores.precio)} /></span>
                            {errores.precio && <span className="required-field-message" role="alert">{errores.precio}</span>}
                        </label>
                    </div>
                    <div className="productos-form-grid">
                        <label>Tamaño de pizza
                            <select name="tamano" value={datos.tamano} disabled={enviando}
                                onChange={(event) => cambiar("tamano", event.target.value)} aria-invalid={Boolean(errores.tamano)}>
                                <option value="">No aplica</option>
                                <option value="personal">Personal</option>
                                <option value="mediana">Mediana</option>
                                <option value="grande">Grande</option>
                                <option value="familiar">Familiar</option>
                            </select>
                            {errores.tamano && <span className="required-field-message" role="alert">{errores.tamano}</span>}
                        </label>
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
                            <div className="productos-row-field"><select name={`ingredientes.${indice}.id_ingrediente`} aria-label={`Ingrediente ${indice + 1}`} value={ingrediente.id_ingrediente} required disabled={enviando || !catalogoIngredientesDisponible}
                                data-mensaje-obligatorio={`Selecciona el ingrediente ${indice + 1}.`}
                                aria-invalid={Boolean(errores[`ingredientes.${indice}.id_ingrediente`])}
                                onChange={(event) => cambiarIngrediente(indice, "id_ingrediente", event.target.value)}>
                                <option value="">Seleccionar ingrediente</option>
                                {ingredientesDisponibles.map((disponible) => <option key={disponible.id_ingrediente} value={disponible.id_ingrediente}>
                                    {disponible.nombre} · {disponible.unidad_medida}
                                </option>)}
                                {seleccionado && !ingredientesDisponibles.some((disponible) => String(disponible.id_ingrediente) === ingrediente.id_ingrediente) &&
                                    <option value={seleccionado.id_ingrediente}>{seleccionado.nombre} (inactivo)</option>}
                            </select>
                            {errores[`ingredientes.${indice}.id_ingrediente`] && <span className="required-field-message" role="alert">{errores[`ingredientes.${indice}.id_ingrediente`]}</span>}</div>
                            <div className="productos-row-field"><div className="productos-quantity-field"><input name={`ingredientes.${indice}.cantidad_requerida`} type="number" aria-label={`Cantidad requerida del ingrediente ${indice + 1}`}
                                data-mensaje-obligatorio={`Ingresa la cantidad del ingrediente ${indice + 1}.`} data-mensaje-invalido="Ingresa una cantidad mayor que cero."
                                min="0.01" max="99999999.99" step="0.01" required value={ingrediente.cantidad_requerida}
                                disabled={enviando} placeholder="Cantidad" aria-invalid={Boolean(errores[`ingredientes.${indice}.cantidad_requerida`])}
                                onChange={(event) => cambiarIngrediente(indice, "cantidad_requerida", event.target.value)} /></div>
                            {errores[`ingredientes.${indice}.cantidad_requerida`] && <span className="required-field-message" role="alert">{errores[`ingredientes.${indice}.cantidad_requerida`]}</span>}</div>
                            <div className="productos-row-field"><select name={`ingredientes.${indice}.unidad_medida`} aria-label={`Unidad de medida del ingrediente ${indice + 1}`} value={ingrediente.unidad_medida}
                                data-mensaje-obligatorio={`Selecciona la unidad del ingrediente ${indice + 1}.`}
                                required disabled={enviando || !ingrediente.id_ingrediente}
                                aria-invalid={Boolean(errores[`ingredientes.${indice}.unidad_medida`])}
                                onChange={(event) => cambiarIngrediente(indice, "unidad_medida", event.target.value)}>
                                {!ingrediente.id_ingrediente && <option value="">Unidad</option>}
                                {[...new Set([...unidadesCompatibles(unidadBase), ingrediente.unidad_medida].filter(Boolean))].map((unidad) =>
                                    <option key={unidad} value={unidad}>{unidad}</option>)}
                            </select>
                            {errores[`ingredientes.${indice}.unidad_medida`] && <span className="required-field-message" role="alert">{errores[`ingredientes.${indice}.unidad_medida`]}</span>}</div>
                            <button className="remove-item-button" type="button" aria-label={`Quitar ingrediente ${indice + 1}`}
                                disabled={enviando} onClick={() => {
                                    setIngredientes((actual) => actual.filter((_, posicion) => posicion !== indice));
                                    setErrores({});
                                }}>×</button>
                        </div>;
                    })}</div>
                    {!catalogoIngredientesDisponible && !errorIngredientes && <p role="status">Cargando ingredientes disponibles…</p>}
                    {errorIngredientes && <p className="productos-field-error" role="alert">{errorIngredientes} <button type="button" onClick={onReintentarIngredientes}>Reintentar</button></p>}
                    {catalogoIngredientesDisponible && !errorIngredientes && !ingredientesDisponibles.length && <p>No hay ingredientes activos para agregar.</p>}
                    {errores.ingredientes && <p className="productos-field-error" role="alert">{errores.ingredientes}</p>}
                </section>
                {hayCambios && <label className="change-reason">Motivo de la modificación
                    <span>Indica por qué realizaste este cambio. El motivo quedará registrado en la bitácora.</span>
                    <textarea name="motivo" value={datos.motivo} maxLength="50" required rows="2" placeholder="Ej: Actualización de precio"
                        data-mensaje-obligatorio="Ingresa el motivo de la modificación."
                        onChange={(event) => cambiar("motivo", event.target.value)} aria-invalid={Boolean(errores.motivo)} />
                    <small className="field-character-count">{datos.motivo.length}/50</small>
                    {errores.motivo && <span className="required-field-message" role="alert">{errores.motivo}</span>}
                </label>}
                <p className={`required-fields-hint${avisoCampos ? " error" : ""}`} role={avisoCampos ? "alert" : undefined}>
                    Completa los campos obligatorios.
                </p>
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
