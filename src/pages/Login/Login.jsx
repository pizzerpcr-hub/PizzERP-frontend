import { useEffect, useState } from "react";
import "./Login.css";
import logoMabet from "../../assets/images/logo-mabet.webp";

const API_URL =
  import.meta.env.VITE_API_URL ??
  `http://${window.location.hostname}:8000`;

function getCookie(name) {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  if (!cookie) {
    return "";
  }

  return decodeURIComponent(
    cookie.split("=").slice(1).join("="),
  );
}

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    remember: false,
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
  const controller = new AbortController();

  const checkSession = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/user`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        return;
      }

      const responseData = await response.json();

      setFormMessage(
        `Sesión activa: ${responseData.usuario.nombre_completo}.`,
      );
      setMessageType("success");
    } catch (error) {
      if (error.name !== "AbortError") {
        setFormMessage("");
        setMessageType("");
      }
    }
  };

  checkSession();

  return () => {
    controller.abort();
  };
}, []);

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

    if (
      !formData.username.trim() ||
      !formData.password.trim()
    ) {
      setFormMessage("Ingresa tu usuario y contraseña.");
      setMessageType("error");

      return;
    }

    if (formData.password.length < 8) {
      setFormMessage(
        "La contraseña debe tener al menos 8 caracteres.",
      );
      setMessageType("error");

      return;
    }

    setIsSubmitting(true);
    setFormMessage("");

    try {
      const csrfResponse = await fetch(
        `${API_URL}/sanctum/csrf-cookie`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!csrfResponse.ok) {
        throw new Error(
          "No fue posible iniciar la conexión segura.",
        );
      }

      const csrfToken = getCookie("XSRF-TOKEN");

      const loginResponse = await fetch(
        `${API_URL}/api/login`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": csrfToken,
          },
          body: JSON.stringify({
            username: formData.username.trim(),
            password: formData.password,
            remember: formData.remember,
          }),
        },
      );

      const responseData = await loginResponse
        .json()
        .catch(() => ({}));

      if (!loginResponse.ok) {
        const validationMessage = responseData.errors
          ? Object.values(responseData.errors).flat()[0]
          : null;

        throw new Error(
          validationMessage ??
            responseData.message ??
            "No fue posible iniciar sesión.",
        );
      }

      setFormMessage(
        `Bienvenido, ${responseData.usuario.nombre_completo}.`,
      );
      setMessageType("success");

      setFormData((previousData) => ({
        ...previousData,
        password: "",
      }));
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.",
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
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
            onSubmit={inicioSesion}
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