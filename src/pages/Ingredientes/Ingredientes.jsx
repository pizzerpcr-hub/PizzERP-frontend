import { useEffect, useState } from "react";
import { useBusquedaLista } from "../../hooks/useListaSesion.js";
import { useTablaPaginada } from "../../hooks/useTablaPaginada.js";
import "../ModulePage.css";
import "./Ingredientes.css";
import IngredienteForm from "../../components/forms/IngredienteForm/IngredienteForm.jsx";
import CambiarEstadoUsuarioDialog from "../../components/forms/CambiarEstadoUsuarioDialog/CambiarEstadoUsuarioDialog.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import Paginacion from "../../components/common/Paginacion/Paginacion.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import { puede } from "../../constants/roles.js";
import { useAuth } from "../../context/useAuth.js";
import {
    actualizarIngrediente,
    cambiarEstadoIngrediente,
    registrarIngrediente,
} from "../../services/ingredientesService.js";

function Ingredientes() {
    const { usuario, cargandoSesion } = useAuth();
    const tieneAcceso = puede(usuario, "ingredientes");
    const [busqueda, setBusqueda] = useBusquedaLista("/api/ingredients");
    const { datos: ingredientes, paginacion, cargando, error: errorLista, recargar } = useTablaPaginada(
        "/api/ingredients", "ingredientes", busqueda, !cargandoSesion && tieneAcceso);
    const [formulario, setFormulario] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState(null);
    const [errorEstado, setErrorEstado] = useState("");

    useEffect(() => {
        if (!mensaje) return undefined;
        const temporizador = window.setTimeout(() => {
            setMensaje((actual) => actual === mensaje ? null : actual);
        }, 5000);
        return () => window.clearTimeout(temporizador);
    }, [mensaje]);

    const guardar = async (datos) => {
        setEnviando(true);
        try {
            formulario.ingrediente
                ? await actualizarIngrediente(formulario.ingrediente.id_ingrediente, datos)
                : await registrarIngrediente(datos);
            setFormulario(null);
            setMensaje({ tipo: "exito", texto: formulario.ingrediente
                ? "Ingrediente actualizado correctamente." : "Ingrediente registrado correctamente." });
        } finally {
            setEnviando(false);
        }
    };

    const cambiarEstado = async () => {
        const ingrediente = ingredienteSeleccionado;
        if (!ingrediente || enviando) return;
        const nuevoEstado = ingrediente.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        setEnviando(true);
        setErrorEstado("");
        try {
            await cambiarEstadoIngrediente(ingrediente.id_ingrediente, nuevoEstado);
            setIngredienteSeleccionado(null);
            setMensaje({ tipo: "exito", texto: nuevoEstado === "ACTIVO"
                ? "Ingrediente activado correctamente." : "Ingrediente desactivado correctamente." });
        } catch (error) {
            setErrorEstado(error.message);
        } finally {
            setEnviando(false);
        }
    };

    if (cargandoSesion) return <LoadingSpinner label="Cargando página" fullPage />;
    if (!tieneAcceso) return <section className="management-panel access-denied" role="alert">
        <h1>Acceso no autorizado</h1>
        <p>No tienes permiso para consultar ingredientes.</p>
    </section>;

    return (
        <div className="module-page ingredients-page">
            <header className="management-header">
                <div>
                    <p className="eyebrow">Administración</p>
                    <h1>Ingredientes</h1>
                    <div className="header-description">
                        <p>Registra y gestiona los ingredientes utilizados para la preparación de los productos.</p>
                        {puede(usuario, "ingredientes", "crear") && <button className="management-primary" type="button" disabled={cargando} onClick={() => setFormulario({ ingrediente: null })}>
                            + Registrar ingrediente
                        </button>}
                    </div>
                </div>
            </header>

            <div className="management-toast-region" aria-live="polite" aria-atomic="true">
                {mensaje && <div className={`management-toast ${mensaje.tipo}`}
                    role={mensaje.tipo === "error" ? "alert" : "status"}>
                    <span>{mensaje.texto}</span>
                    <button type="button" className="management-toast-close" aria-label="Cerrar notificación"
                        onClick={() => setMensaje(null)}>×</button>
                </div>}
            </div>

            {errorLista && <p className="catalog-error" role="alert">{errorLista} <button type="button" onClick={() => void recargar().catch(() => {})}>Reintentar</button></p>}
            <section className="management-panel ingredients-panel">
                <div className="management-panel-header"><div>
                    <h2>Ingredientes registrados</h2>
                    <p>Consulta y administra los ingredientes disponibles en el sistema.</p>
                </div>
                <PageSearch className="page-search--header" label="Buscar ingrediente" id="buscarIngrediente"
                    placeholder="Buscar ingrediente" value={busqueda} maxLength={100} onChange={(event) => setBusqueda(event.target.value)} /></div>
                <div className="table-wrap">
                    <table className="ingredients-table" aria-label="Ingredientes registrados">
                        <thead><tr><th>Nombre</th><th>Unidad de medida</th><th>Cantidad disponible</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {cargando ? <tr><td colSpan="5" className="ingredient-loading"><LoadingSpinner label="Cargando ingredientes" /></td></tr>
                                : ingredientes.length === 0 ? <tr><td colSpan="5" className="module-empty">
                                    {busqueda ? "No se encontraron ingredientes." : "No hay ingredientes registrados."}
                                </td></tr> : ingredientes.map((ingrediente) => <tr className="ingredient-card" key={ingrediente.id_ingrediente}>
                                    <td data-label="Nombre"><strong>{ingrediente.nombre}</strong></td>
                                    <td data-label="Unidad de medida">{ingrediente.unidad_medida}</td>
                                    <td data-label="Cantidad disponible">{ingrediente.cantidad_disponible}</td>
                                    <td data-label="Estado"><span className={`status ${ingrediente.estado === "ACTIVO" ? "active" : "inactive"}`}>
                                        {ingrediente.estado === "ACTIVO" ? "Activo" : "Inactivo"}</span></td>
                                    <td data-label="Acciones"><div className="table-actions">
                                        {puede(usuario, "ingredientes", "editar") && <button className="action-button edit" type="button" disabled={enviando}
                                            onClick={() => setFormulario({ ingrediente })}>Modificar</button>}
                                        {puede(usuario, "ingredientes", ingrediente.estado === "ACTIVO" ? "eliminar" : "editar") &&
                                            <button className={`action-button ${ingrediente.estado === "ACTIVO" ? "deactivate" : "activate"}`}
                                                type="button" disabled={enviando} onClick={() => {
                                                    setErrorEstado("");
                                                    setIngredienteSeleccionado(ingrediente);
                                                }}>{ingrediente.estado === "ACTIVO" ? "Desactivar" : "Activar"}</button>}
                                    </div></td>
                                </tr>)}
                        </tbody>
                    </table>
                </div>
                {!cargando && <Paginacion paginacion={paginacion} nombre="ingredientes" />}
            </section>
            {formulario && <IngredienteForm key={formulario.ingrediente?.id_ingrediente ?? "nuevo"}
                ingrediente={formulario.ingrediente} enviando={enviando} onGuardar={guardar}
                onCerrar={() => !enviando && setFormulario(null)} />}
            <CambiarEstadoUsuarioDialog usuarioSeleccionado={ingredienteSeleccionado} entidad="ingrediente"
                descripcion={ingredienteSeleccionado && (ingredienteSeleccionado.estado === "ACTIVO"
                    ? `¿Desea desactivar el ingrediente ${ingredienteSeleccionado.nombre}? Seguirá registrado y podrá activarlo después.`
                    : `¿Desea activar el ingrediente ${ingredienteSeleccionado.nombre}?`)}
                isSubmitting={enviando} mensajeError={errorEstado}
                textoEnviando={ingredienteSeleccionado?.estado === "ACTIVO" ? "Desactivando…" : "Activando…"}
                onConfirm={cambiarEstado} onClose={() => {
                    if (!enviando) {
                        setIngredienteSeleccionado(null);
                        setErrorEstado("");
                    }
                }} />
        </div>
    );
}

export default Ingredientes;
