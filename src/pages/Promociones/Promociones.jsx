import { useEffect, useRef, useState } from "react";
import "../ModulePage.css";
import ComboForm from "../../components/forms/ComboForm/ComboForm.jsx";
import CambiarEstadoUsuarioDialog from "../../components/forms/CambiarEstadoUsuarioDialog/CambiarEstadoUsuarioDialog.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import Paginacion from "../../components/common/Paginacion/Paginacion.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import { useAuth } from "../../context/useAuth.js";
import { puede } from "../../constants/roles.js";
import { actualizarCombo, cambiarEstadoCombo, obtenerProductosParaCombo, registrarCombo } from "../../services/gestionesService.js";
import { useBusquedaLista, useListaSesion } from "../../hooks/useListaSesion.js";
import { useTablaPaginada } from "../../hooks/useTablaPaginada.js";

const formatoPrecio = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" });

function Combos() {
    const { usuario } = useAuth();
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [busqueda, setBusqueda] = useBusquedaLista("/api/combos");
    const { datos: combos, paginacion, cargando, error: errorLista, recargar } = useTablaPaginada(
        "/api/combos", "combos", busqueda, puede(usuario, "combos"));
    const [comboEditando, setComboEditando] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const { datos: productosDisponibles, disponible: catalogoDisponible, error: errorProductos,
        recargar: recargarProductos } = useListaSesion("/api/combos/productos", obtenerProductosParaCombo,
        { habilitado: puede(usuario, "combos", "crear") || puede(usuario, "combos", "editar") });
    const [enviandoEstado, setEnviandoEstado] = useState(null);
    const [comboSeleccionado, setComboSeleccionado] = useState(null);
    const [errorEstado, setErrorEstado] = useState("");
    const montado = useRef(true);
    const estadoPendiente = useRef(false);

    useEffect(() => {
        montado.current = true;
        return () => { montado.current = false; };
    }, []);

    useEffect(() => {
        if (!mensaje) return undefined;
        const timer = window.setTimeout(() => setMensaje(""), 5000);
        return () => window.clearTimeout(timer);
    }, [mensaje]);

    const abrir = (combo = null) => {
        setError("");
        setComboEditando(combo);
        setModalAbierto(true);
        if (errorProductos) void recargarProductos().catch(() => {});
    };
    const guardar = async (datos) => {
        comboEditando
            ? await actualizarCombo(comboEditando.id_combo, datos)
            : await registrarCombo(datos);
        if (!montado.current) return;
        setModalAbierto(false);
        setMensaje(comboEditando ? "Combo actualizado correctamente." : "Combo registrado correctamente.");
    };
    const cambiarEstado = async () => {
        const combo = comboSeleccionado;
        if (!combo || estadoPendiente.current) return;
        estadoPendiente.current = true;
        setEnviandoEstado(combo.id_combo);
        setErrorEstado("");
        try {
            const estado = combo.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
            await cambiarEstadoCombo(combo.id_combo, estado);
            if (!montado.current) return;
            setComboSeleccionado(null);
            setMensaje(`Combo ${estado === "ACTIVO" ? "activado" : "desactivado"} correctamente.`);
        } catch (fallo) {
            if (montado.current) setErrorEstado(fallo.message);
        } finally {
            estadoPendiente.current = false;
            if (montado.current) setEnviandoEstado(null);
        }
    };

    return <div className="module-page combos-page">
        <header className="management-header"><div>
            <p className="eyebrow">Administración</p><h1>Combos y promociones</h1>
            <div className="header-description"><p>Gestiona los combos y promociones disponibles para la venta en la pizzería.</p>
                {puede(usuario, "combos", "crear") && <button className="management-primary" type="button"
                    disabled={cargando} onClick={() => abrir()}>+ Registrar combo</button>}
            </div>
        </div></header>
        {mensaje && <p className="combo-page-message" role="status">{mensaje}</p>}
        {error && <p className="combo-page-error" role="alert">{error}</p>}
        {errorLista && <p className="combo-page-error" role="alert">{errorLista} <button type="button" onClick={() => void recargar().catch(() => {})}>Reintentar</button></p>}
        <section className="management-panel"><div className="management-panel-header"><div>
            <h2>Combos registrados</h2><p>Consulta y administra los combos y promociones disponibles.</p>
        </div>
        <PageSearch className="page-search--header" label="Buscar combo" id="buscarCombo"
            placeholder="Buscar por nombre o código..." value={busqueda} maxLength={100} onChange={(event) => setBusqueda(event.target.value)} /></div>
            <div className="table-wrap"><table className="management-table">
                <thead><tr><th>Código</th><th>Combo</th><th>Productos</th><th>Precio</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{cargando ? <tr><td colSpan="7"><LoadingSpinner label="Cargando combos" /></td></tr>
                    : combos.length === 0 ? <tr><td colSpan="7" className="module-empty">{busqueda ? "No se encontraron combos." : "No hay promociones registradas."}</td></tr>
                        : combos.map((combo) => <tr className="management-card" key={combo.id_combo}>
                            <td data-label="Código"><strong>{combo.codigo_combo}</strong></td>
                            <td data-label="Combo"><strong>{combo.nombre}</strong><span className="combo-description">{combo.descripcion}</span></td>
                            <td data-label="Productos">{combo.productos.map((producto) => `${producto.nombre}${producto.tamano ? ` (${producto.tamano})` : ""} ×${producto.cantidad}`).join(", ")}</td>
                            <td data-label="Precio">{formatoPrecio.format(Number(combo.precio))}</td>
                            <td data-label="Vigencia">{combo.fecha_inicio} — {combo.fecha_fin}</td>
                            <td data-label="Estado">{combo.estado === "ACTIVO" ? "Activo" : "Inactivo"}</td>
                            <td data-label="Acciones"><div className="category-table-actions">
                                {puede(usuario, "combos", "editar") && <button className="catalog-action" type="button"
                                    onClick={() => abrir(combo)}>Modificar</button>}
                                {puede(usuario, "combos", combo.estado === "ACTIVO" ? "eliminar" : "editar") &&
                                    <button className="catalog-action"
                                        type="button" disabled={enviandoEstado !== null} onClick={() => {
                                            setErrorEstado("");
                                            setComboSeleccionado(combo);
                                        }}>
                                        {combo.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button>}
                            </div></td>
                        </tr>)}</tbody>
            </table></div>
            {!cargando && <Paginacion paginacion={paginacion} nombre="combos" />}
        </section>
        {modalAbierto && <ComboForm key={comboEditando?.id_combo ?? "nuevo"} combo={comboEditando}
            catalogoDisponible={catalogoDisponible} errorProductos={errorProductos}
            onReintentarProductos={() => void recargarProductos().catch(() => {})}
            productosDisponibles={productosDisponibles} onGuardar={guardar} onCerrar={() => setModalAbierto(false)} />}
        <CambiarEstadoUsuarioDialog usuarioSeleccionado={comboSeleccionado} entidad="combo"
            descripcion={comboSeleccionado && (comboSeleccionado.estado === "ACTIVO"
                ? `¿Desea desactivar el combo ${comboSeleccionado.nombre}?`
                : `¿Desea activar el combo ${comboSeleccionado.nombre}?`)}
            isSubmitting={enviandoEstado !== null} mensajeError={errorEstado}
            textoEnviando={comboSeleccionado?.estado === "ACTIVO" ? "Desactivando…" : "Activando…"}
            onConfirm={cambiarEstado} onClose={() => {
                if (!estadoPendiente.current) {
                    setComboSeleccionado(null);
                    setErrorEstado("");
                }
            }} />
    </div>;
}

export default Combos;
