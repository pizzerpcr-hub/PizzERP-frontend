import { useEffect, useRef, useState } from "react";
import "./Login.css";
import logoMabet from "../../assets/images/logo-mabet.webp";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import { obtenerRutaInicio } from "../../constants/roles.js";
import { iniciarSesion as iniciarSesionService } from "../../services/loginService.js";
import Notification from "../../components/Notification/Notification.jsx";
import LoginForm from "../../components/forms/LoginForm/LoginForm.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner/LoadingSpinner.jsx";

const MAX_INTENTOS_LOGIN = 3;

const formatearTiempo = (segundosTotales) => {
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;

    return `${minutos}:${String(segundos).padStart(2, "0")}`;
};

function Login() {
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const bloqueoHastaRef = useRef(0);
  const {
    usuario, cargandoSesion, iniciarSesion,
  } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    remember: false,
  });

  const currentYear = new Date().getFullYear();

  const bloqueado = segundosRestantes > 0;

  useEffect(() => {
      if (!bloqueado) {
          return undefined;
      }

      const intervalo = window.setInterval(() => {
          const restantes = Math.max(
              0,
              Math.ceil((bloqueoHastaRef.current - Date.now()) / 1000),
          );
          setSegundosRestantes(restantes);

          if (restantes === 0) {
              setFormMessage("");
              setMessageType("");
          }
      }, 1000);

      return () => window.clearInterval(intervalo);
  }, [bloqueado]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formMessage && !bloqueado && name !== "remember") {
      setFormMessage("");
      setMessageType("");
    }
  };

  const handleSubmit = async (event) => {
      event.preventDefault();

      if (bloqueado || isSubmitting) {
          return;
      }

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

          iniciarSesion(responseData.usuario);

          setFormData((previousData) => ({
              ...previousData,
              password: "",
          }));
      } catch (error) {
          setMessageType("error");

          if (typeof error.retryAfter === "number" && error.retryAfter > 0) {
              bloqueoHastaRef.current = Date.now() + error.retryAfter * 1000;
              setFormMessage(error.message);
              setSegundosRestantes(Math.ceil(error.retryAfter));
          } else {
              setFormMessage(
                  error instanceof TypeError
                    ? "No fue posible conectar con el servidor. Revisa tu conexión e intenta nuevamente."
                    : error.message || "No fue posible iniciar sesión."
              );
          }
      } finally {
          setIsSubmitting(false);
      }
  };

  if (cargandoSesion) {
    return <LoadingSpinner label="Cargando página" fullPage />;
  }

  const rutaInicio = obtenerRutaInicio(usuario);
  if (rutaInicio) {
    return <Navigate to={rutaInicio} replace />;
  }

  return (
    <main className="login-layout">
      {formMessage && (
        <Notification
          title={bloqueado ? "Acceso temporalmente bloqueado" : "No se pudo iniciar sesión"}
          message={bloqueado
            ? `${formMessage}\nEspera a que termine la cuenta regresiva para volver a intentarlo.`
            : formMessage}
          onClose={() => setFormMessage("")}
        />
      )}
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
            <div className="login-attempts-info" id="loginAttemptsInfo">
              <p>Máximo {MAX_INTENTOS_LOGIN} intentos.</p>
              {bloqueado && (
                <p className="login-lockout-countdown">
                  Podrás intentarlo nuevamente en {formatearTiempo(segundosRestantes)}.
                </p>
              )}
            </div>
          </div>

          <LoginForm
            formData={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            messageType={messageType}
            isSubmitting={isSubmitting}
            bloqueado={bloqueado}
            tiempoRestante={formatearTiempo(segundosRestantes)}
          />

          <div className="login-divider" aria-hidden="true">
            <span>o</span>
          </div>

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
