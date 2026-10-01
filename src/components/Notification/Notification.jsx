import { useEffect, useEffectEvent } from "react";
import "./Notification.css";

const NOTIFICATION_DURATION_MS = 4500;

export default function Notification({ title, message, type = "error", onClose }) {
    const dismiss = useEffectEvent(() => onClose());

    useEffect(() => {
        const timer = window.setTimeout(() => dismiss(), NOTIFICATION_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [title, message, type]);

    return (
        <div className="notification-region">
            <div
                className={`notification notification--${type}`}
                style={{ "--notification-duration": `${NOTIFICATION_DURATION_MS}ms` }}
                role={type === "success" ? "status" : "alert"}
                aria-atomic="true"
            >
                <span className="notification-icon" aria-hidden="true">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="9" />
                        {type === "success" ? (
                            <path d="m8 12 2.5 2.5L16 9" />
                        ) : (
                            <path d="m9 9 6 6m0-6-6 6" />
                        )}
                    </svg>
                </span>
                <div className="notification-copy">
                    <strong>{title}</strong>
                    <p>{message}</p>
                </div>
                <button
                    className="notification-close"
                    type="button"
                    aria-label="Cerrar notificación"
                    onClick={onClose}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        aria-hidden="true"
                    >
                        <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                </button>
                <span
                    key={`${type}:${title}:${message}`}
                    className="notification-progress"
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
