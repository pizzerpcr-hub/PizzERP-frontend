import { useState } from "react";
import "./Login.css";
import logoMabet from "../../assets/images/logo-mabet.webp";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { iniciarSesion as iniciarSesionService } from "../../services/loginService.js";



function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { usuario, cargandoSesion, iniciarSesion } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    remember: false,
  });

  const currentYear = new Date().getFullYear();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formMessage) {
      setFormMessage("");
      setMessageType("");
    }
  };

  const handleSubmit = async (event) => {
      event.preventDefault();

      if (!formData.username.trim() || !formData.password) {
          setFormMessage("Por favor, completa todos los campos.");
          setMessageType("error");
          return;
      }

      setIsSubmitting(true);
      setFormMessage("");
      setMessageType("");

      try {
          const responseData = await iniciarSesionService({
              username: formData.username.trim(),
              password: formData.password,
              remember: formData.remember,
          });

          setFormMessage(
              `Bienvenido, ${responseData.usuario.nombre_completo}.`
          );
          setMessageType("success");

          iniciarSesion(responseData.usuario);

          setFormData((previousData) => ({
              ...previousData,
              password: "",
          }));
      } catch (error) {
          setFormMessage(
              error.message || "No fue posible iniciar sesión."
          );
          setMessageType("error");
      } finally {
          setIsSubmitting(false);
      }
  };

  if (cargandoSesion) {
    return null;
  }

  if (usuario?.rol?.toUpperCase() === "ADMINISTRADOR") {
    return <Navigate to="/encargado-ti/usuarios" replace />;
  }

  if (
    usuario?.rol?.toUpperCase() === "TI" ||
    usuario?.rol?.toUpperCase() === "ENCARGADO DE TI"
  ) {
    return <Navigate to="/encargado-ti" replace />;
  }

  return (
    <main className="login-layout">
      <aside
        className="login-sidebar"
        aria-label="Información de PizzERP"
      >
        <a
          className="login-logo"
          href="/"
          aria-label="PizzERP, inicio"
        >
          <img
            src={logoMabet}
            alt="Logo de Pizzería Mabet"
          />
        </a>

        <div className="sidebar-copy">
          <p className="kicker">Sistema de gestión</p>

          <h1>Todo el negocio, en un solo lugar.</h1>

          <p>
            Administra pedidos, ventas e inventario con PizzERP
            de forma simple y segura.
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
            aria-busy={isSubmitting}
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
                disabled={isSubmitting}
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
                  type={
                    showPassword ? "text" : "password"
                  }
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
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
                    setShowPassword(
                      (previousValue) => !previousValue,
                    )
                  }
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
              />

              <span>Recordarme en este equipo</span>
            </label>

            <button
              className="login-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Verificando..."
                : "Ingresar al sistema"}
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
