import { useEffect, useState } from "react";
import "./Login.css";
import logoMabet from "../../assets/images/logo-mabet.webp";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    remember: false,
  });

  const currentYear = new Date().getFullYear();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formMessage) {
      setFormMessage("");
      setMessageType("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.password.trim()) {
      setFormMessage("Ingresa tu usuario y contraseña.");
      setMessageType("error");
      return;
    }

    if (formData.password.length < 4) {
      setFormMessage("La contraseña debe tener al menos 4 caracteres.");
      setMessageType("error");
      return;
    }

    // Aquí posteriormente conectarías el backend/API.
    setFormMessage("Datos ingresados correctamente.");
    setMessageType("success");

    console.log("Login:", formData);
  };

  return (
    <main className="login-layout">
      <aside
        className="login-sidebar"
        aria-label="Información de PizzERP"
      >
        <a
          className="sidebar-logo"
          href="/"
          aria-label="PizzERP, inicio"
        >
          <img
            src= {logoMabet}
            alt="Logo de Pizzería Mabet"
          />
        </a>

        <div className="sidebar-copy">
          <p className="kicker">Sistema de gestión</p>

          <h1>Todo el negocio, en un solo lugar.</h1>

          <p>
            Administra pedidos, ventas e inventario con PizzERP de forma
            simple y segura.
          </p>
        </div>

        <footer className="sidebar-footer">
          © {currentYear} PizzERP
        </footer>
      </aside>

      <section
        className="login-content"
        aria-labelledby="loginTitle"
      >
        <div className="login-card">
          <div className="welcome">
            <p className="eyebrow">Bienvenido</p>

            <h2 id="loginTitle">Inicia sesión</h2>

            <p>Ingresa tus credenciales para continuar.</p>
          </div>

          <form
            id="loginForm"
            onSubmit={handleSubmit}
            noValidate
          >
            {formMessage && (
              <p
                className={`form-message ${messageType}`}
                role="alert"
                aria-live="polite"
              >
                {formMessage}
              </p>
            )}

            <div className="form-field">
              <label htmlFor="username">
                Nombre de usuario
              </label>

              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Ingresa tu usuario"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <div className="label-row">
                <label htmlFor="password">
                  Contraseña
                </label>
              </div>

              <div className="password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  minLength={4}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  aria-label={
                    showPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <label className="remember">
              <input
                type="checkbox"
                name="remember"
                checked={formData.remember}
                onChange={handleChange}
              />

              <span>Recordarme en este equipo</span>
            </label>

            <button
              className="login-button"
              type="submit"
            >
              Ingresar al sistema
            </button>
          </form>

          <p className="help-text">
            ¿Necesitas ayuda?{" "}
            <a href="mailto:pizzeriamaybet@gmail.com">
              Soporte
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;