import { api } from '../api.js';

export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="d-flex align-items-center justify-content-center min-vh-100 p-3 login-wrapper">
      <div class="card card-samgy shadow-lg p-4 p-md-5" style="max-width: 440px; width: 100%; border-top: 5px solid var(--samgy-primary);">
        <div class="text-center mb-4">
          <img src="src/logo-samgy.svg" alt="SAMGY Logo" class="img-fluid mb-3 login-logo-img">
          <p class="text-muted small mb-2">Sistema de Gestión de Enfermería Escolar</p>
          <span class="badge bg-samgy-soft text-samgy-primary fw-semibold px-3 py-1">
            <i class="bi bi-building me-1"></i>Colegio San Alberto Magno
          </span>
        </div>

        <div id="login-error-alert" class="alert alert-danger py-2 small d-none" role="alert"></div>

        <form id="form-login" novalidate>
          <div class="mb-3">
            <label for="login-email" class="form-label small fw-bold text-muted">Correo Electrónico</label>
            <div class="input-group">
              <span class="input-group-text bg-light text-muted"><i class="bi bi-envelope-fill"></i></span>
              <input type="email" class="form-control" id="login-email" placeholder="usuario@sanalbertomagno.edu.co" required autofocus autocomplete="username">
              <div class="invalid-feedback">Ingresa un correo electrónico válido.</div>
            </div>
          </div>

          <div class="mb-4">
            <label for="login-password" class="form-label small fw-bold text-muted">Contraseña</label>
            <div class="input-group">
              <span class="input-group-text bg-light text-muted"><i class="bi bi-lock-fill"></i></span>
              <input type="password" class="form-control" id="login-password" placeholder="••••••••" required autocomplete="current-password">
              <div class="invalid-feedback">Ingresa tu contraseña.</div>
            </div>
          </div>

          <button type="submit" id="btn-login-submit" class="btn btn-samgy w-100 py-2 fw-semibold">
            <i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión
          </button>
        </form>

        <div class="text-center mt-4 pt-3 border-top text-muted extra-small">
          <i class="bi bi-shield-lock me-1 text-samgy-primary"></i>Acceso seguro restringido al personal autorizado.
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#form-login');
  const emailInput = container.querySelector('#login-email');
  const passwordInput = container.querySelector('#login-password');
  const btnSubmit = container.querySelector('#btn-login-submit');
  const errorAlert = container.querySelector('#login-error-alert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAlert.classList.add('d-none');
    errorAlert.textContent = '';

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const correo = emailInput.value.trim();
    const password = passwordInput.value;

    btnSubmit.disabled = true;
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Iniciando sesión...`;

    try {
      const res = await api.post('/auth/login', { email: correo, password });
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(res.data.usuario || res.data);
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      errorAlert.textContent = err.message || 'Credenciales inválidas. Por favor intenta de nuevo.';
      errorAlert.classList.remove('d-none');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalText;
    }
  });
}
