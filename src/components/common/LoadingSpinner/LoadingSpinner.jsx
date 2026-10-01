import "./LoadingSpinner.css";

function LoadingSpinner({ label, fullPage = false }) {
    return (
        <div className={fullPage ? "loading-spinner-page" : "loading-spinner-content"} role="status" aria-label={label}>
            <span className="loading-spinner" aria-hidden="true" />
        </div>
    );
}

export default LoadingSpinner;
