import { useEffect, useRef, useState } from "react";
import { validarCamposFormulario } from "../validarCamposFormulario.js";

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
    const [motivo, setMotivo] = useState("");
    const hayDatos = [datos.codigo_combo, datos.nombre, String(datos.precio), datos.fecha_inicio, datos.fecha_fin, motivo]
        .some((valor) => valor.trim()) || productos.some((producto) =>
        producto.id_producto || Number(producto.cantidad) !== 1);
    const productosActuales = JSON.stringify(productos.map((producto) => [Number(producto.id_producto), Number(producto.cantidad)])
        .sort((a, b) => a[0] - b[0]));
    const productosOriginales = JSON.stringify((combo?.productos ?? []).map((producto) => [Number(producto.id_producto), Number(producto.cantidad)])
        .sort((a, b) => a[0] - b[0]));
    const hayCambios = Boolean(combo) && (
        datos.codigo_combo.trim().toUpperCase() !== combo.codigo_combo || datos.nombre.trim() !== combo.nombre ||
        datos.descripcion.trim() !== (combo.descripcion ?? "") || Number(datos.precio) !== Number(combo.precio) ||
        datos.fecha_inicio !== combo.fecha_inicio || datos.fecha_fin !== combo.fecha_fin ||
        productosActuales !== productosOriginales
    );
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const [erroresCampos, setErroresCampos] = useState({});
    const [avisoCampos, setAvisoCampos] = useState(false);
    const pendiente = useRef(false);
    const montado = useRef(true);
    useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

    const cambiar = (campo, valor) => {
        setDatos((actual) => ({ ...actual, [campo]: valor }));
        setErroresCampos((actuales) => ({ ...actuales, [campo]: undefined }));
        setError("");
    };
    const cambiarProducto = (indice, campo, valor) => {
        setProductos((actual) => actual.map((fila, i) =>
            i === indice ? { ...fila, [campo]: valor } : fila));
        setErroresCampos((actuales) => campo === "id_producto"
            ? Object.fromEntries(Object.entries(actuales).filter(([clave]) => !clave.endsWith(".id_producto")))
            : { ...actuales, [`productos.${indice}.${campo}`]: undefined });
        setError("");
    };
    const guardar = async (event) => {
        event.preventDefault();
        const errores = validarCamposFormulario(event.currentTarget);
        if (Object.keys(errores).length) {
            setErroresCampos(hayDatos ? errores : {});
            setAvisoCampos(true);
            return;
        }
        if (pendiente.current || !catalogoDisponible || productosDisponibles.length < 2) return;
        const ids = productos.map((producto) => Number(producto.id_producto));
        if (productos.length < 2 || ids.some((id) => !id) || new Set(ids).size !== ids.length) {
            setAvisoCampos(true);
            setErroresCampos(Object.fromEntries(productos.map((producto, indice) => [
                `productos.${indice}.id_producto`, "Selecciona un producto distinto.",
            ])));
            setError("Elegí al menos dos productos activos distintos.");
            return;
        }
        if (datos.fecha_fin < datos.fecha_inicio) {
            setErroresCampos({ fecha_fin: "La fecha final debe ser igual o posterior a la inicial." });
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
                ...(combo ? { motivo: motivo.trim() } : {}),
            });
        } catch (fallo) {
            if (montado.current) {
                if (fallo.status === 422 && fallo.errors) {
                    setAvisoCampos(true);
                    setErroresCampos(Object.fromEntries(Object.entries(fallo.errors).map(([campo, mensajes]) => [
                        campo, Array.isArray(mensajes) ? mensajes[0] : mensajes,
                    ])));
                } else {
                    setError(fallo.message || "No fue posible guardar el combo.");
                }
            }
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
            <form onSubmit={guardar} noValidate onInputCapture={() => setAvisoCampos(false)} data-invalid={avisoCampos && hayDatos}>
                <div className="form-section"><div className="form-section-title">Información del combo</div>
                    <div className="form-grid">
                        <div className="form-group"><label htmlFor="codigoCombo">Código del combo</label>
                            <input id="codigoCombo" name="codigo_combo" value={datos.codigo_combo} onChange={(event) => cambiar("codigo_combo", event.target.value)}
                                data-mensaje-obligatorio="Ingresa el código del combo."
                                placeholder="Ej. COM-001" maxLength={30} disabled={enviando} required aria-invalid={Boolean(erroresCampos.codigo_combo)} />
                            {erroresCampos.codigo_combo && <p className="required-field-message" role="alert">{erroresCampos.codigo_combo}</p>}</div>
                        <div className="form-group"><label htmlFor="nombreCombo">Nombre del combo</label>
                            <input id="nombreCombo" name="nombre" value={datos.nombre} onChange={(event) => cambiar("nombre", event.target.value)}
                                data-mensaje-obligatorio="Ingresa el nombre del combo."
                                placeholder="Ej. Combo Familiar" maxLength={50} disabled={enviando} required aria-invalid={Boolean(erroresCampos.nombre)} />
                            {erroresCampos.nombre && <p className="required-field-message" role="alert">{erroresCampos.nombre}</p>}</div>
                    </div>
                    <div className="form-group"><label htmlFor="descripcionCombo">Descripción</label>
                        <textarea id="descripcionCombo" rows="3" value={datos.descripcion}
                            onChange={(event) => cambiar("descripcion", event.target.value)} maxLength={50} disabled={enviando}
                            placeholder="Describe el combo o promoción..." />
                        <small className="field-character-count">{datos.descripcion.length}/50</small></div>
                    <div className="form-grid">
                        <div className="form-group"><label htmlFor="precioCombo">Precio del combo</label>
                            <div className={`price-input${erroresCampos.precio ? " invalid" : ""}`}><span>₡</span><input id="precioCombo" name="precio" type="number" min="0.01" step="0.01"
                                data-mensaje-obligatorio="Ingresa el precio del combo." data-mensaje-invalido="Ingresa un precio mayor que cero."
                                value={datos.precio} onChange={(event) => cambiar("precio", event.target.value)}
                                placeholder="0.00" disabled={enviando} required aria-invalid={Boolean(erroresCampos.precio)} /></div>
                            {erroresCampos.precio && <p className="required-field-message" role="alert">{erroresCampos.precio}</p>}</div>
                        {!combo && <div className="form-group"><label htmlFor="estadoCombo">Estado</label>
                            <select id="estadoCombo" value={datos.estado} onChange={(event) => cambiar("estado", event.target.value)} disabled={enviando}>
                                <option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option>
                            </select></div>}
                    </div>
                </div>
                <div className="form-section"><div className="form-section-title">Vigencia</div>
                    <div className="form-grid">
                        <div className="form-group"><label htmlFor="fechaInicio">Fecha de inicio</label>
                            <input id="fechaInicio" name="fecha_inicio" type="date" value={datos.fecha_inicio} onChange={(event) => cambiar("fecha_inicio", event.target.value)} disabled={enviando} required
                                data-mensaje-obligatorio="Selecciona la fecha de inicio." aria-invalid={Boolean(erroresCampos.fecha_inicio)} />
                            {erroresCampos.fecha_inicio && <p className="required-field-message" role="alert">{erroresCampos.fecha_inicio}</p>}</div>
                        <div className="form-group"><label htmlFor="fechaFin">Fecha de fin</label>
                            <input id="fechaFin" name="fecha_fin" type="date" value={datos.fecha_fin} onChange={(event) => cambiar("fecha_fin", event.target.value)} disabled={enviando} required
                                data-mensaje-obligatorio="Selecciona la fecha final." aria-invalid={Boolean(erroresCampos.fecha_fin)} />
                            {erroresCampos.fecha_fin && <p className="required-field-message" role="alert">{erroresCampos.fecha_fin}</p>}</div>
                    </div>
                </div>
                <div className="form-section"><div className="form-section-header"><div>
                    <div className="form-section-title">Productos incluidos</div>
                    <p className="combo-products-hint">El combo debe contener como mínimo dos productos activos.</p>
                </div><button className="add-item-button" type="button" disabled={enviando || productos.length >= 100}
                    onClick={() => setProductos((actual) => [...actual, filaVacia()])}>+ Agregar producto</button></div>
                    <div className="product-form-list">{productos.map((producto, indice) =>
                        <div className="product-form-row" key={indice}>
                            <div className="combo-row-field"><select name={`productos.${indice}.id_producto`} aria-label={`Producto ${indice + 1}`} value={producto.id_producto} disabled={enviando || !catalogoDisponible} required
                                data-mensaje-obligatorio={`Selecciona el producto ${indice + 1}.`} aria-invalid={Boolean(erroresCampos[`productos.${indice}.id_producto`])}
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
                            {erroresCampos[`productos.${indice}.id_producto`] && <p className="required-field-message" role="alert">{erroresCampos[`productos.${indice}.id_producto`]}</p>}</div>
                            <div className="combo-row-field"><input name={`productos.${indice}.cantidad`} type="number" aria-label={`Cantidad del producto ${indice + 1}`} min="1" max="65535" step="1" required
                                data-mensaje-obligatorio={`Ingresa la cantidad del producto ${indice + 1}.`} data-mensaje-invalido="Ingresa una cantidad entre 1 y 65535."
                                value={producto.cantidad} disabled={enviando}
                                onChange={(event) => cambiarProducto(indice, "cantidad", event.target.value)} aria-invalid={Boolean(erroresCampos[`productos.${indice}.cantidad`])} />
                            {erroresCampos[`productos.${indice}.cantidad`] && <p className="required-field-message" role="alert">{erroresCampos[`productos.${indice}.cantidad`]}</p>}</div>
                            <button className="remove-item-button" type="button" aria-label={`Quitar producto ${indice + 1}`}
                                disabled={enviando || productos.length <= 2}
                                onClick={() => {
                                    setProductos((actual) => actual.filter((_, i) => i !== indice));
                                    setErroresCampos({});
                                }}>×</button>
                        </div>)}</div>
                </div>
                {hayCambios && <div className="form-group change-reason"><label htmlFor="motivoCombo">Motivo de la modificación</label>
                    <p>Indica por qué realizaste este cambio. El motivo quedará registrado en la bitácora.</p>
                    <textarea id="motivoCombo" name="motivo" maxLength={50} required placeholder="Ej: Cambio en los productos" value={motivo}
                        data-mensaje-obligatorio="Ingresa el motivo de la modificación."
                        onChange={(event) => {
                            setMotivo(event.target.value);
                            setErroresCampos((actuales) => ({ ...actuales, motivo: undefined }));
                        }} disabled={enviando} aria-invalid={Boolean(erroresCampos.motivo)} />
                    <small className="field-character-count">{motivo.length}/50</small>
                    {erroresCampos.motivo && <p className="required-field-message" role="alert">{erroresCampos.motivo}</p>}
                </div>}
                {!catalogoDisponible && !errorProductos && <p role="status">Cargando productos disponibles…</p>}
                {errorProductos && <p className="combo-form-error" role="alert">{errorProductos} <button type="button" onClick={onReintentarProductos}>Reintentar</button></p>}
                {catalogoDisponible && !errorProductos && productosDisponibles.length < 2 && <p className="combo-form-error">Registra al menos dos productos activos antes de crear combos.</p>}
                <p className={`required-fields-hint${avisoCampos ? " error" : ""}`} role={avisoCampos ? "alert" : undefined}>
                    Completa los campos obligatorios.
                </p>
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
