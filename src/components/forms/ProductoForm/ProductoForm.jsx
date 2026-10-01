import { useEffect, useRef, useState } from "react";

function ProductoForm({ producto, categorias, enviando, onGuardar, onCerrar }) {
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

    const guardar = async (event) => {
        event.preventDefault();
        setErrorGeneral("");

        try {
            await onGuardar({
                id_categoria: Number(datos.id_categoria),
                codigo_producto: datos.codigo_producto.trim().toUpperCase(),
                nombre: datos.nombre.trim(),
                descripcion: datos.descripcion.trim(),
                precio: datos.precio,
                estado: datos.estado,
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
                <p>Completa la información del producto y selecciona su categoría.</p>
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
                                aria-invalid={Boolean(errores.id_categoria)}>
                                <option value="">Seleccionar categoría</option>
                                {categorias.map((categoria) => <option key={categoria.id_categoria} value={categoria.id_categoria}>
                                    {categoria.nombre}
                                </option>)}
                            </select>
                            {errores.id_categoria && <span className="productos-field-error">{errores.id_categoria}</span>}
                        </label>
                        <label>Precio
                            <span className="productos-price-input"><span>₡</span><input type="number" min="0.01" max="99999999.99"
                                step="0.01" value={datos.precio} onChange={(event) => cambiar("precio", event.target.value)}
                                placeholder="0.00" required aria-invalid={Boolean(errores.precio)} /></span>
                            {errores.precio && <span className="productos-field-error">{errores.precio}</span>}
                        </label>
                    </div>
                    <label>Estado
                        <select value={datos.estado} onChange={(event) => cambiar("estado", event.target.value)}>
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                        </select>
                    </label>
                </section>
                {errorGeneral && <p className="productos-error" role="alert">{errorGeneral}</p>}
                <div className="productos-form-actions">
                    <button type="button" className="productos-secondary-button" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                    <button type="submit" className="productos-primary-button" disabled={enviando}>
                        {enviando ? "Guardando..." : producto ? "Guardar cambios" : "Registrar producto"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default ProductoForm;
