import { useEffect, useMemo, useState } from "react";
import { useBusquedaLista, useListaSesion } from "../../hooks/useListaSesion.js";
import "../ModulePage.css";
import "./Ingredientes.css";
import IngredienteForm from "../../components/forms/IngredienteForm/IngredienteForm.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import { puede } from "../../constants/roles.js";
import { useAuth } from "../../context/useAuth.js";
import {
    actualizarIngrediente,
    eliminarIngrediente,
    obtenerIngredientes,
    registrarIngrediente,
} from "../../services/ingredientesService.js";

function Ingredientes() {
    const { usuario, cargandoSesion } = useAuth();
    const tieneAcceso = puede(usuario, "ingredientes");
    const { datos: ingredientes, cargando, error: errorLista, recargar, vigente } = useListaSesion(
        "/api/ingredients", obtenerIngredientes, { habilitado: !cargandoSesion && tieneAcceso });
    const [busqueda, setBusqueda] = useBusquedaLista("/api/ingredients");
    const [formulario, setFormulario] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    useEffect(() => {
        if (!mensaje) return undefined;
        const temporizador = window.setTimeout(() => {
            setMensaje((actual) => actual === mensaje ? null : actual);
        }, 5000);
        return () => window.clearTimeout(temporizador);
    }, [mensaje]);

    const ingredientesFiltrados = useMemo(() => ingredientes.filter((ingrediente) =>
        ingrediente.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
    ), [ingredientes, busqueda]);

    const guardar = async (datos) => {
        setEnviando(true);
        try {
            formulario.ingrediente
                ? await actualizarIngrediente(formulario.ingrediente.id_ingrediente, datos)
                : await registrarIngrediente(datos);
            if (!vigente()) return;
            setFormulario(null);
            setMensaje({ tipo: "exito", texto: formulario.ingrediente
                ? "Ingrediente actualizado correctamente." : "Ingrediente registrado correctamente." });
        } finally {
            if (vigente()) setEnviando(false);
        }
    };

    const eliminar = async (ingrediente) => {
        if (!window.confirm(`¿Eliminar el ingrediente ${ingrediente.nombre}?`)) return;
        setEnviando(true);
        try {
            await eliminarIngrediente(ingrediente.id_ingrediente);
            if (!vigente()) return;
            setMensaje({ tipo: "exito", texto: "Ingrediente eliminado correctamente." });
        } catch (error) {
            if (vigente()) setMensaje({ tipo: "error", texto: error.message });
        } finally {
            if (vigente()) setEnviando(false);
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
                        {puede(usuario, "ingredientes", "crear") && <button className="management-primary" type="button" onClick={() => setFormulario({ ingrediente: null })}>
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
                    placeholder="Buscar ingrediente" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} /></div>
                <div className="table-wrap">
                    <table className="ingredients-table" aria-label="Ingredientes registrados">
                        <thead><tr><th>Nombre</th><th>Unidad de medida</th><th>Cantidad disponible</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {cargando ? <tr><td colSpan="5" className="ingredient-loading"><LoadingSpinner label="Cargando ingredientes" /></td></tr>
                                : ingredientesFiltrados.length === 0 ? <tr><td colSpan="5" className="module-empty">
                                    {busqueda ? "No se encontraron ingredientes." : "No hay ingredientes registrados."}
                                </td></tr> : ingredientesFiltrados.map((ingrediente) => <tr className="ingredient-card" key={ingrediente.id_ingrediente}>
                                    <td data-label="Nombre"><strong>{ingrediente.nombre}</strong></td>
                                    <td data-label="Unidad de medida">{ingrediente.unidad_medida}</td>
                                    <td data-label="Cantidad disponible">{ingrediente.cantidad_disponible}</td>
                                    <td data-label="Estado"><span className={`status ${ingrediente.estado === "ACTIVO" ? "active" : "inactive"}`}>
                                        {ingrediente.estado === "ACTIVO" ? "Activo" : "Inactivo"}</span></td>
                                    <td data-label="Acciones"><div className="table-actions">
                                        {puede(usuario, "ingredientes", "editar") && <button className="action-button edit" type="button" disabled={enviando}
                                            onClick={() => setFormulario({ ingrediente })}>Editar</button>}
                                        {puede(usuario, "ingredientes", "eliminar") && <button className="action-button delete" type="button" disabled={enviando}
                                            onClick={() => eliminar(ingrediente)}>Eliminar</button>}
                                    </div></td>
                                </tr>)}
                        </tbody>
                    </table>
                </div>
            </section>
            {formulario && <IngredienteForm key={formulario.ingrediente?.id_ingrediente ?? "nuevo"}
                ingrediente={formulario.ingrediente} enviando={enviando} onGuardar={guardar}
                onCerrar={() => !enviando && setFormulario(null)} />}
        </div>
    );
}

export default Ingredientes;
