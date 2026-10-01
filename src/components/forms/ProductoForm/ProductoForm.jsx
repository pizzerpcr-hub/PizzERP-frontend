import { useEffect, useRef, useState } from "react";

const opcionesTamano = ["Personal", "Mediana", "Grande", "Familiar", "600 ml", "Unidad"];
const opcionesIngrediente = ["Harina", "Queso mozzarella", "Salsa de tomate", "Pepperoni"];
const opcionesUnidad = ["g", "kg", "ml", "l", "u"];
let siguienteFilaId = 0;
const nuevaFilaTamano = () => ({ id: `tamano-${++siguienteFilaId}`, nombre: "", precio: "" });
const nuevaFilaIngrediente = () => ({ id: `ingrediente-${++siguienteFilaId}`, nombre: "", cantidad: "", unidad: "" });

function ProductoForm({ producto, codigosExistentes, onGuardar, onCerrar }) {
    const dialogRef = useRef(null);
    const [datos, setDatos] = useState(() => ({
        codigo: producto?.codigo ?? "",
        nombre: producto?.nombre ?? "",
        descripcion: producto?.descripcion ?? "",
        precio: producto?.precio ?? "",
        estado: producto?.estado ?? "ACTIVO",
        tamanos: producto?.tamanos.map((tamano) => ({ ...tamano })) ?? [nuevaFilaTamano()],
        ingredientes: producto?.ingredientes.map((ingrediente) => ({ ...ingrediente })) ?? [nuevaFilaIngrediente()],
    }));
    const [errorCodigo, setErrorCodigo] = useState("");

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => {
            if (dialog?.open) dialog.close();
        };
    }, []);

    const actualizarFila = (grupo, id, campo, valor) => {
        setDatos((actual) => ({
            ...actual,
            [grupo]: actual[grupo].map((fila) => fila.id === id ? { ...fila, [campo]: valor } : fila),
        }));
    };

    const quitarFila = (grupo, id) => {
        setDatos((actual) => ({ ...actual, [grupo]: actual[grupo].filter((fila) => fila.id !== id) }));
    };

    const guardar = (event) => {
        event.preventDefault();
        const codigo = datos.codigo.trim().toUpperCase();
        if (codigosExistentes.some((existente) => existente !== producto?.codigo && existente === codigo)) {
            setErrorCodigo("Ya existe un producto con este código.");
            return;
        }
        onGuardar({
            ...datos,
            codigo,
            nombre: datos.nombre.trim(),
            descripcion: datos.descripcion.trim(),
            precio: Number(datos.precio),
            tamanos: datos.tamanos.filter((fila) => fila.nombre || fila.precio),
            ingredientes: datos.ingredientes.filter((fila) => fila.nombre || fila.cantidad || fila.unidad),
        }, producto?.codigo);
    };

    return (
        <dialog ref={dialogRef} className="productos-dialog" onCancel={(event) => { event.preventDefault(); onCerrar(); }} aria-labelledby="productoModalTitle">
            <button className="productos-dialog-close" type="button" onClick={onCerrar} aria-label="Cerrar">×</button>
            <header className="productos-dialog-header">
                <span className="productos-eyebrow">Administración</span>
                <h2 id="productoModalTitle">{producto ? "Editar producto" : "Registrar producto"}</h2>
                <p>Completa la información del producto y sus ingredientes asociados.</p>
            </header>
            <form onSubmit={guardar}>
                <section className="productos-form-section" aria-labelledby="productoDatosTitle">
                    <h3 id="productoDatosTitle">Información del producto</h3>
                    <div className="productos-form-grid">
                        <label>Código o número interno
                            <input value={datos.codigo} onChange={(event) => { setDatos({ ...datos, codigo: event.target.value.toUpperCase() }); setErrorCodigo(""); }} placeholder="Ej. PIZ-001" required aria-invalid={Boolean(errorCodigo)} aria-describedby={errorCodigo ? "productoCodigoError" : undefined} />
                            {errorCodigo && <span id="productoCodigoError" className="productos-field-error" role="alert">{errorCodigo}</span>}
                        </label>
                        <label>Nombre del producto
                            <input value={datos.nombre} onChange={(event) => setDatos({ ...datos, nombre: event.target.value })} placeholder="Ej. Pizza Suprema" required />
                        </label>
                    </div>
                    <label>Descripción
                        <textarea value={datos.descripcion} onChange={(event) => setDatos({ ...datos, descripcion: event.target.value })} rows="3" placeholder="Describe el producto..." />
                    </label>
                    <div className="productos-form-grid">
                        <label>Precio
                            <span className="productos-price-input"><span>₡</span><input type="number" min="0.01" step="0.01" value={datos.precio} onChange={(event) => setDatos({ ...datos, precio: event.target.value })} placeholder="0.00" required /></span>
                        </label>
                        <label>Estado
                            <select value={datos.estado} onChange={(event) => setDatos({ ...datos, estado: event.target.value })}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select>
                        </label>
                    </div>
                </section>

                <section className="productos-form-section" aria-labelledby="productoTamanosTitle">
                    <div className="productos-section-heading">
                        <div><h3 id="productoTamanosTitle">Tamaños y precios</h3><p>Configura los tamaños disponibles y el precio correspondiente.</p></div>
                        <button type="button" className="productos-add-button" onClick={() => setDatos((actual) => ({ ...actual, tamanos: [...actual.tamanos, nuevaFilaTamano()] }))}>+ Agregar tamaño</button>
                    </div>
                    <div className="productos-rows">
                        {datos.tamanos.map((fila) => (
                            <div className="productos-size-row" key={fila.id}>
                                <select aria-label="Tamaño" value={fila.nombre} onChange={(event) => actualizarFila("tamanos", fila.id, "nombre", event.target.value)}><option value="">Seleccionar tamaño</option>{opcionesTamano.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>
                                <span className="productos-price-input"><span>₡</span><input type="number" min="0.01" step="0.01" aria-label="Precio del tamaño" placeholder="Precio" value={fila.precio} onChange={(event) => actualizarFila("tamanos", fila.id, "precio", event.target.value)} /></span>
                                <button type="button" className="productos-remove-button" onClick={() => quitarFila("tamanos", fila.id)} aria-label="Eliminar tamaño">×</button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="productos-form-section" aria-labelledby="productoIngredientesTitle">
                    <div className="productos-section-heading">
                        <div><h3 id="productoIngredientesTitle">Ingredientes asociados</h3><p>Asocia los ingredientes utilizados en la preparación del producto.</p></div>
                        <button type="button" className="productos-add-button" onClick={() => setDatos((actual) => ({ ...actual, ingredientes: [...actual.ingredientes, nuevaFilaIngrediente()] }))}>+ Agregar ingrediente</button>
                    </div>
                    <div className="productos-rows">
                        {datos.ingredientes.map((fila) => (
                            <div className="productos-ingredient-row" key={fila.id}>
                                <select aria-label="Ingrediente" value={fila.nombre} onChange={(event) => actualizarFila("ingredientes", fila.id, "nombre", event.target.value)}><option value="">Seleccionar ingrediente</option>{opcionesIngrediente.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>
                                <input type="number" min="0" step="0.01" aria-label="Cantidad" placeholder="Cantidad" value={fila.cantidad} onChange={(event) => actualizarFila("ingredientes", fila.id, "cantidad", event.target.value)} />
                                <select aria-label="Unidad" value={fila.unidad} onChange={(event) => actualizarFila("ingredientes", fila.id, "unidad", event.target.value)}><option value="">Unidad</option>{opcionesUnidad.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>
                                <button type="button" className="productos-remove-button" onClick={() => quitarFila("ingredientes", fila.id)} aria-label="Eliminar ingrediente">×</button>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="productos-form-actions"><button type="button" className="productos-secondary-button" onClick={onCerrar}>Cancelar</button><button type="submit" className="productos-primary-button">{producto ? "Guardar cambios" : "Registrar producto"}</button></div>
            </form>
        </dialog>
    );
}

export default ProductoForm;
