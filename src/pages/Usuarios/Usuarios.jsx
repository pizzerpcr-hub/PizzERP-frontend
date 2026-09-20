import "./Usuarios.css";
import logoMabet from "../../assets/images/logo-mabet.webp";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Usuarios() {
    const navigate = useNavigate();
    const [mostrarForm, setMostrarForm] = useState(false);

  return (
    <div className="management-shell">

      {/* Menú móvil */}
      <button
        className="mobile-menu-toggle"
        id="mobileMenuToggle"
        type="button"
        aria-label="Abrir menú"
        aria-controls="mobileNavigation"
        aria-expanded="false"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Sidebar */}
      <aside
        className="management-sidebar"
        id="mobileNavigation"
        aria-label="Navegación de TI"
      >
        <a
          className="sidebar-logo"
          href="#"
          aria-label="PizzERP, inicio"
        >
          <img
            src={logoMabet}
            alt="Logo de Pizzería Mabet"
          />
        </a>

        <div className="management-brand">
          <strong>PizzERP</strong>
          <span>Panel de tecnología</span>
        </div>

        <nav
          className="management-nav"
          aria-label="Módulos permitidos"
        >
          <span className="management-nav-label">
            MÓDULOS DE TI
          </span>

          <a className="active" href="#">
            Usuarios
          </a>

          <a href="#">
            Bitácora de Movimientos
          </a>
        </nav>

        <div className="management-account">

          <div className="management-profile">
            <span className="profile-avatar">
              TI
            </span>

            <div>
              <strong>Encargado de TI</strong>
              <small>Rol: TI</small>
            </div>
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={() => navigate("/")}
          >
            <span aria-hidden="true"></span>
            Cerrar sesión
          </button>

        </div>
      </aside>

      {/* Contenido principal */}
      <main className="management-main">

        <header className="management-header">

          <div>
            <p className="eyebrow">
              Administración
            </p>

            <h1>Usuarios</h1>

            <div className="header-description">
                <p>
                    Registra y administra las cuentas del sistema.
                </p>

                <button
                    className="management-primary"
                    type="button"
                    onClick={() => setMostrarForm(true)}
                >
                    + Registrar usuario
                </button>
            </div>
          </div>

        </header>

        <p
          className="management-notice"
          id="managementNotice"
          role="status"
          aria-live="polite"
          hidden
        ></p>

        <section className="management-panel users-panel">

          <div className="management-panel-header">

            <div>
              <h2>Usuarios registrados</h2>

              <p>
                Modifica los datos de una cuenta o elimina
                usuarios que ya no requieren acceso.
              </p>
            </div>

            <label className="search-box">
              ⌕
              <input
                id="userSearch"
                type="search"
                placeholder="Buscar usuario"
              />
            </label>

          </div>

          <div className="table-wrap">

            <table>

              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol asignado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody id="usersTable">
                {/* Los usuarios se cargarán posteriormente */}
                <tr>
                   
                </tr>
              </tbody>

            </table>

          </div>

        </section>

      </main>

      {/* Modal registrar usuario */}
      <dialog
        className="user-dialog"
        id="userDialog"
        open = {mostrarForm}
      >
        <form id="userForm" noValidate>

          <div className="dialog-heading">

            <div>
              <p className="eyebrow">
                Gestión de usuarios
              </p>

              <h2 id="dialogTitle">
                Registrar usuario
              </h2>
            </div>

            <button
              className="dialog-close"
              type="button"
              aria-label="Cerrar"
              onClick={() => setMostrarForm(false)}
            >
              ×
            </button>

          </div>

          <input
            id="editingId"
            type="hidden"
          />

          <p
            id="userFormMessage"
            className="dialog-message"
            role="alert"
            aria-live="polite"
          ></p>

          <div className="dialog-field">
            <label htmlFor="formName">
              Nombre completo
            </label>

            <input
              id="formName"
              name="name"
              required
              placeholder="Nombre del usuario"
              autoComplete="name"
            />
          </div>

          <div className="dialog-field">
            <label htmlFor="formUsername">
              Nombre de usuario
            </label>

            <input
              id="formUsername"
              name="username"
              required
              placeholder="Usuario"
              autoComplete="username"
            />
          </div>

          <div className="dialog-field">
            <label htmlFor="formPassword">
              Contraseña
            </label>

            <input
              id="formPassword"
              name="password"
              type="password"
              required
              minLength="8"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div className="dialog-field">
            <label htmlFor="formRole">
              Rol
            </label>

            <select
              id="formRole"
              name="role"
              required
            >
              <option value="">
                Seleccione un rol
              </option>

              <option value="Administrador">
                Administrador
              </option>

              <option value="Caja">
                Caja
              </option>

              <option value="Cocina">
                Cocina
              </option>

              <option value="TI">
                Encargado de TI
              </option>
            </select>
          </div>

          <p className="dialog-hint">
            Todos los campos son obligatorios.
            
          </p>

          <div className="dialog-actions">

            <button
              className="management-secondary"
              type="button"
              onClick={() => setMostrarForm(false)}
            >
              Cancelar
            </button>

            <button
              className="management-primary"
              type="submit"
            >
              Guardar usuario
            </button>

          </div>

        </form>
      </dialog>

      {/* Modal eliminar */}
      <dialog
        className="user-dialog small"
        id="deleteDialog"
      >
        <form id="deleteForm">

          <div className="dialog-heading">

            <div>
              <p className="eyebrow">
                Eliminar usuario
              </p>

              <h2>
                ¿Confirmar eliminación?
              </h2>
            </div>

            <button
              className="dialog-close"
              type="button"
              aria-label="Cerrar"
            >
              ×
            </button>

          </div>

          <p>
            Esta acción no se puede deshacer.
          </p>

          <input
            id="deletingId"
            type="hidden"
          />

          <div className="dialog-actions">

            <button
              className="management-secondary"
              type="button"
            >
              Cancelar
            </button>

            <button
              className="management-danger"
              type="submit"
            >
              Eliminar
            </button>

          </div>

        </form>
      </dialog>

    </div>
  );
}

export default Usuarios;