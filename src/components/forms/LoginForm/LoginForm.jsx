import { useState } from "react";

function LoginForm({ formData, onChange, onSubmit, messageType, avisoCampos, isSubmitting, bloqueado, tiempoRestante }) {
  const [showPassword, setShowPassword] = useState(false);
  const mostrarErroresCampos = avisoCampos && Boolean(formData.username.trim() || formData.password);
  const errorUsuario = mostrarErroresCampos && !formData.username.trim();
  const errorContrasena = mostrarErroresCampos && !formData.password;

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
                maxLength={50}
                autoComplete="username"
                placeholder="Ingresa tu usuario"
                value={formData.username}
                onChange={onChange}
                aria-invalid={errorUsuario || (messageType === "error" && !avisoCampos)}
                aria-describedby={errorUsuario ? "loginUsernameError" : undefined}
                disabled={isSubmitting || bloqueado}
                required
              />
              {errorUsuario && <p id="loginUsernameError" className="required-field-message" role="alert">Ingresa el nombre de usuario.</p>}
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
                  aria-invalid={errorContrasena || (messageType === "error" && !avisoCampos)}
                  aria-describedby={errorContrasena ? "loginPasswordError" : undefined}
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
              {errorContrasena && <p id="loginPasswordError" className="required-field-message" role="alert">Ingresa la contraseña.</p>}
            </div>

            <p className={`login-required-hint${avisoCampos ? " error" : ""}`} role={avisoCampos ? "alert" : undefined}>
              Completa todos los campos.
            </p>

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
