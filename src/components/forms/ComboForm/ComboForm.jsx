import { useEffect, useRef, useState } from "react";

const vacio = { codigo_combo: "", nombre: "", descripcion: "", precio: "", estado: "ACTIVO", fecha_inicio: "", fecha_fin: "" };
const filaVacia = () => ({ id_producto: "", cantidad: 1 });

function ComboForm({ combo = null, productosDisponibles = [], onGuardar, onCerrar,
    catalogoDisponible = true, errorProductos = "", onReintentarProductos }) {
    const [datos, setDatos] = useState(() => combo ? {
        codigo_combo: combo.codigo_combo, nombre: combo.nombre, descripcion: combo.descripcion ?? "",
        precio: combo.precio, estado: combo.estado, fecha_inicio: combo.fecha_inicio, fecha_fin: combo.fecha_fin,
    } : { ...vacio });
    const [productos, setProductos] = useState(() => combo?.productos?.map((producto) => ({
        id_producto: String(producto.id_producto), cantidad: producto.cantidad,
    })) ?? [filaVacia(), filaVacia()]);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const pendiente = useRef(false);
    const montado = useRef(true);
    useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

    const cambiar = (campo, valor) => setDatos((actual) => ({ ...actual, [campo]: valor }));
    const cambiarProducto = (indice, campo, valor) => setProductos((actual) => actual.map((fila, i) =>
        i === indice ? { ...fila, [campo]: valor } : fila));
    const guardar = async (event) => {
        event.preventDefault();
        if (pendiente.current || !catalogoDisponible || productosDisponibles.length < 2) return;
        const ids = productos.map((producto) => Number(producto.id_producto));
        if (productos.length < 2 || ids.some((id) => !id) || new Set(ids).size !== ids.length) {
            setError("Elegí al menos dos productos activos distintos.");
            return;
        }
        if (datos.fecha_fin < datos.fecha_inicio) {
            setError("La fecha final debe ser igual o posterior a la inicial.");
            return;
        }
        pendiente.current = true;
        setEnviando(true);
        setError("");
        try {
            const { estado, ...campos } = datos;
            await onGuardar({ ...campos, ...(!combo ? { estado } : {}),
                productos: productos.map((producto) => ({
                    id_producto: Number(producto.id_producto), cantidad: Number(producto.cantidad),
                })),
            });
        } catch (fallo) {
            if (montado.current) setError(fallo.message || "No fue posible guardar el combo.");
        } finally {
            pendiente.current = false;
            if (montado.current) setEnviando(false);
        }
    };

    return <div className="modal-overlay open" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !enviando) onCerrar();
    }}>
        <div className="combo-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={onCerrar} disabled={enviando} aria-label="Cerrar">×</button>
            <div className="modal-header"><span className="management-eyebrow">Administración</span>
                <h2>{combo ? "Editar combo" : "Registrar combo"}</h2>
                <p>Completa la información del combo y los productos incluidos.</p>
            </div>
            <form onSubmit={guardar}>
                <div className="form-section"><div className="form-section-title">Información del combo</div>
                    <div className="form-grid">
                        <div className="form-group"><label htmlFor="codigoCombo">Código del combo</label>
                            <input id="codigoCombo" value={datos.codigo_combo} onChange={(event) => cambiar("codigo_combo", event.target.value)}
                                placeholder="Ej. COM-001" maxLength={30} disabled={enviando} required /></div>
                        <div className="form-group"><label htmlFor="nombreCombo">Nombre del combo</label>
                            <input id="nombreCombo" value={datos.nombre} onChange={(event) => cambiar("nombre", event.target.value)}
                                placeholder="Ej. Combo Familiar" maxLength={100} disabled={enviando} required /></div>
                    </div>
                    <div className="form-group"><label htmlFor="descripcionCombo">Descripción</label>
                        <textarea id="descripcionCombo" rows="3" value={datos.descripcion}
                            onChange={(event) => cambiar("descripcion", event.target.value)} maxLength={150} disabled={enviando}
                            placeholder="Describe el combo o promoción..." /></div>
                    <div className="form-grid">
                        <div className="form-group"><label htmlFor="precioCombo">Precio del combo</label>
                            <div className="price-input"><span>₡</span><input id="precioCombo" type="number" min="0.01" step="0.01"
                                value={datos.precio} onChange={(event) => cambiar("precio", event.target.value)}
                                placeholder="0.00" disabled={enviando} required /></div></div>
                        {!combo && <div className="form-group"><label htmlFor="estadoCombo">Estado</label>
                            <select id="estadoCombo" value={datos.estado} onChange={(event) => cambiar("estado", event.target.value)} disabled={enviando}>
                                <option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option>
                            </select></div>}
                    </div>
                </div>
                <div className="form-section"><div className="form-section-title">Vigencia</div>
                    <div className="form-grid">
                        <div className="form-group"><label htmlFor="fechaInicio">Fecha de inicio</label>
                            <input id="fechaInicio" type="date" value={datos.fecha_inicio} onChange={(event) => cambiar("fecha_inicio", event.target.value)} disabled={enviando} required /></div>
                        <div className="form-group"><label htmlFor="fechaFin">Fecha de fin</label>
                            <input id="fechaFin" type="date" value={datos.fecha_fin} onChange={(event) => cambiar("fecha_fin", event.target.value)} disabled={enviando} required /></div>
                    </div>
                </div>
                <div className="form-section"><div className="form-section-header"><div>
                    <div className="form-section-title">Productos incluidos</div>
                    <p>El combo debe contener como mínimo dos productos activos.</p>
                </div><button className="add-item-button" type="button" disabled={enviando || productos.length >= 100}
                    onClick={() => setProductos((actual) => [...actual, filaVacia()])}>+ Agregar producto</button></div>
                    <div className="product-form-list">{productos.map((producto, indice) =>
                        <div className="product-form-row" key={indice}>
                            <select aria-label={`Producto ${indice + 1}`} value={producto.id_producto} disabled={enviando || !catalogoDisponible} required
                                onChange={(event) => cambiarProducto(indice, "id_producto", event.target.value)}>
                                <option value="">{!catalogoDisponible && !errorProductos ? "Cargando productos…" : "Seleccionar producto"}</option>
                                {productosDisponibles.map((disponible) => <option key={disponible.id_producto} value={disponible.id_producto}>
                                    {disponible.codigo_producto} · {disponible.nombre}
                                </option>)}
                                {combo?.productos?.filter((anterior) => anterior.estado !== "ACTIVO" && String(anterior.id_producto) === producto.id_producto)
                                    .map((anterior) => <option key={anterior.id_producto} value={anterior.id_producto} disabled>
                                        {anterior.nombre} (inactivo; reemplazar)
                                    </option>)}
                            </select>
                            <input type="number" aria-label={`Cantidad del producto ${indice + 1}`} min="1" max="65535" step="1" required
                                value={producto.cantidad} disabled={enviando}
                                onChange={(event) => cambiarProducto(indice, "cantidad", event.target.value)} />
                            <button className="remove-item-button" type="button" aria-label={`Quitar producto ${indice + 1}`}
                                disabled={enviando || productos.length <= 2}
                                onClick={() => setProductos((actual) => actual.filter((_, i) => i !== indice))}>×</button>
                        </div>)}</div>
                </div>
                {!catalogoDisponible && !errorProductos && <p role="status">Cargando productos disponibles…</p>}
                {errorProductos && <p className="combo-form-error" role="alert">{errorProductos} <button type="button" onClick={onReintentarProductos}>Reintentar</button></p>}
                {catalogoDisponible && !errorProductos && productosDisponibles.length < 2 && <p className="combo-form-error">Registra al menos dos productos activos antes de crear combos.</p>}
                {error && <p className="combo-form-error" role="alert">{error}</p>}
                <div className="form-actions">
                    <button className="management-secondary" type="button" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                    <button className="management-primary" type="submit" disabled={enviando || !catalogoDisponible || productosDisponibles.length < 2}>
                        {enviando ? "Guardando..." : combo ? "Guardar cambios" : "Registrar combo"}
                    </button>
                </div>
            </form>
        </div>
    </div>;
}

export default ComboForm;
