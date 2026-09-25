import { useEffect, useRef } from "react";

function CambiarEstadoUsuarioDialog({
    usuarioSeleccionado,
    error,
    isSubmitting,
    onConfirm,
    onClose,
}) {
    const dialogRef = useRef(null);
    const envioEnCursoRef = useRef(false);
    const estadoNormalizado = String(
        usuarioSeleccionado?.estado ?? "",
    ).toUpperCase();
    const reactivando = estadoNormalizado === "INACTIVO";

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (dialog.open) {
            dialog.close();
        }

        if (usuarioSeleccionado) {
            dialog.showModal();
        }

        return () => {
            if (dialog.open) {
                dialog.close();
            }
        };
    }, [usuarioSeleccionado]);

    const cerrarDialogo = () => {
        if (isSubmitting || envioEnCursoRef.current) {
            return;
        }

        dialogRef.current?.close();
        onClose();
    };

    const handleCancel = (event) => {
        event.preventDefault();
        cerrarDialogo();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            !usuarioSeleccionado ||
            isSubmitting ||
            envioEnCursoRef.current
        ) {
            return;
        }

        envioEnCursoRef.current = true;

        try {
            await onConfirm();
        } finally {
            envioEnCursoRef.current = false;
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="user-dialog small"
            onCancel={handleCancel}
        >
            <form onSubmit={handleSubmit}>
                <div className="dialog-heading">
                    <div>
                        <p className="eyebrow">
                            {reactivando
                                ? "Reactivar usuario"
                                : "Desactivar usuario"}
                        </p>

                        <h2>
                            {reactivando
                                ? "¿Confirmar reactivación?"
                                : "¿Confirmar desactivación?"}
                        </h2>
                    </div>

                    <button
                        className="dialog-close"
                        type="button"
                        aria-label="Cerrar"
                        onClick={cerrarDialogo}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <p
                        className="dialog-message visible"
                        role="alert"
                        aria-live="polite"
                    >
                        {error}
                    </p>
                )}

                <p className="status-dialog-copy">
                    {reactivando
                        ? `Se restablecerá el acceso de ${usuarioSeleccionado?.nombre_completo}.`
                        : `Se retirará temporalmente el acceso de ${usuarioSeleccionado?.nombre_completo}.`}
                </p>

                <div className="dialog-actions">
                    <button
                        className="management-secondary"
                        type="button"
                        onClick={cerrarDialogo}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>

                    <button
                        className={
                            reactivando
                                ? "management-primary"
                                : "management-danger"
                        }
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? "Guardando..."
                            : reactivando
                              ? "Reactivar"
                              : "Desactivar"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default CambiarEstadoUsuarioDialog;
