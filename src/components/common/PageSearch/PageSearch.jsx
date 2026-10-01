import "./PageSearch.css";

function PageSearch({ label, placeholder, className = "", ...inputProps }) {
    return (
        <label className={`page-search ${className}`}>
            <svg className="page-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
            </svg>
            <span className="page-search-label">{label}</span>
            <input type="search" placeholder={placeholder} {...inputProps} />
        </label>
    );
}

export default PageSearch;
