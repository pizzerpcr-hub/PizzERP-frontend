import { useState } from "react";

function LoginForm({ formData, onChange, onSubmit, messageType, isSubmitting, bloqueado, tiempoRestante }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
          <form
            id="loginForm"
            onSubmit={onSubmit}
            noValidate
            aria-busy={isSubmitting}
            aria-describedby="loginAttemptsInfo"
          >
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
                onChange={onChange}
                aria-invalid={messageType === "error"}
                disabled={isSubmitting || bloqueado}
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
                  onChange={onChange}
                  aria-invalid={messageType === "error"}
                  disabled={isSubmitting || bloqueado}
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
                  disabled={isSubmitting || bloqueado}
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
                onChange={onChange}
                disabled={isSubmitting || bloqueado}
              />

              <span>Recordarme en este equipo</span>
            </label>

            <button
              className="login-button"
              type="submit"
              disabled={isSubmitting || bloqueado}
            >
              {bloqueado
                ? `Espera ${tiempoRestante}`
                : isSubmitting
                ? "Verificando..."
                : "Ingresar al sistema"}
            </button>
          </form>
  );
}

export default LoginForm;
