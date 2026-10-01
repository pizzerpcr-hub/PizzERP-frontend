import { useCallback, useEffect, useMemo, useState } from "react";
import "../ModulePage.css";
import "./Ingredientes.css";
import IngredienteForm from "../../components/forms/IngredienteForm/IngredienteForm.jsx";
import PageSearch from "../../components/common/PageSearch/PageSearch.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";
import { puedeGestionarUsuarios } from "../../constants/roles.js";
import { useAuth } from "../../context/useAuth.js";
import {
    actualizarIngrediente,
    eliminarIngrediente,
    obtenerIngredientes,
    registrarIngrediente,
} from "../../services/ingredientesService.js";

function Ingredientes() {
    const { usuario, cargandoSesion } = useAuth();
    const tieneAcceso = puedeGestionarUsuarios(usuario);
    const [ingredientes, setIngredientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState("");
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

    const cargarIngredientes = useCallback(async (signal) => {
        const lista = await obtenerIngredientes(signal);
        if (!signal?.aborted) {
            setIngredientes(lista);
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        if (cargandoSesion || !tieneAcceso) return undefined;
        const controller = new AbortController();
        const cargar = async () => {
            try {
                await cargarIngredientes(controller.signal);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setMensaje({ tipo: "error", texto: error.message });
                    setCargando(false);
                }
            }
        };
        cargar();
        return () => controller.abort();
    }, [cargandoSesion, tieneAcceso, cargarIngredientes]);

    const ingredientesFiltrados = useMemo(() => ingredientes.filter((ingrediente) =>
        ingrediente.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
    ), [ingredientes, busqueda]);

    const guardar = async (datos) => {
        setEnviando(true);
        try {
            const respuesta = formulario.ingrediente
                ? await actualizarIngrediente(formulario.ingrediente.id_ingrediente, datos)
                : await registrarIngrediente(datos);
            const confirmado = respuesta.ingrediente;
            setIngredientes((actuales) => [...actuales.filter((item) =>
                item.id_ingrediente !== confirmado.id_ingrediente), confirmado]
                .sort((a, b) => a.nombre.localeCompare(b.nombre)));
            setFormulario(null);
            setMensaje({ tipo: "exito", texto: formulario.ingrediente
                ? "Ingrediente actualizado correctamente." : "Ingrediente registrado correctamente." });
        } finally {
            setEnviando(false);
        }
    };

    const eliminar = async (ingrediente) => {
        if (!window.confirm(`¿Eliminar el ingrediente ${ingrediente.nombre}?`)) return;
        setEnviando(true);
        try {
            await eliminarIngrediente(ingrediente.id_ingrediente);
            setIngredientes((actuales) => actuales.filter((item) =>
                item.id_ingrediente !== ingrediente.id_ingrediente));
            setMensaje({ tipo: "exito", texto: "Ingrediente eliminado correctamente." });
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally {
            setEnviando(false);
        }
    };

    if (cargandoSesion) return <LoadingSpinner label="Cargando página" fullPage />;
    if (!tieneAcceso) return <section className="management-panel access-denied" role="alert">
        <h1>Acceso no autorizado</h1>
        <p>La gestión de ingredientes está disponible para administradores y personal de TI activos.</p>
    </section>;

    return (
        <div className="module-page ingredients-page">
            <header className="management-header">
                <div>
                    <p className="eyebrow">Administración</p>
                    <h1>Ingredientes</h1>
                    <div className="header-description">
                        <p>Registra y gestiona los ingredientes utilizados para la preparación de los productos.</p>
                        <button className="management-primary" type="button" onClick={() => setFormulario({ ingrediente: null })}>
                            + Registrar ingrediente
                        </button>
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
                                        <button className="action-button edit" type="button" disabled={enviando}
                                            onClick={() => setFormulario({ ingrediente })}>Editar</button>
                                        <button className="action-button delete" type="button" disabled={enviando}
                                            onClick={() => eliminar(ingrediente)}>Eliminar</button>
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
