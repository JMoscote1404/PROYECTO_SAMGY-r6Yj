/**
 * SAMGY UI Helpers
 * Toast notifications, confirmation modals, spinners, empty/error states, and HTML escaping.
 */

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string|number|null|undefined} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Muestra una notificación Toast de Bootstrap
 * @param {string} mensaje 
 * @param {'success'|'danger'|'warning'|'info'} tipo 
 */
export function showToast(mensaje, tipo = 'info') {
  let toastContainer = document.getElementById('samgy-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'samgy-toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1090';
    document.body.appendChild(toastContainer);
  }

  const bgClasses = {
    success: 'text-bg-success',
    danger: 'text-bg-danger',
    warning: 'text-bg-warning text-dark',
    info: 'bg-samgy-primary text-white'
  };

  const icons = {
    success: 'bi-check-circle-fill',
    danger: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  };

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${bgClasses[tipo] || 'text-bg-secondary'} border-0 shadow-lg`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${icons[tipo] || 'bi-bell'} fs-5"></i>
        <div>${escapeHtml(mensaje)}</div>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
  bsToast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

/**
 * Modal de confirmación estilizado que reemplaza confirm()
 * @param {object} opciones 
 * @param {string} opciones.titulo
 * @param {string} opciones.mensaje
 * @param {string} [opciones.textoConfirmar='Confirmar']
 * @param {string} [opciones.btnClase='btn-samgy']
 * @returns {Promise<boolean>}
 */
export function showConfirm({ titulo = 'Confirmación', mensaje, textoConfirmar = 'Aceptar', btnClase = 'btn-samgy' }) {
  return new Promise((resolve) => {
    let modalEl = document.getElementById('samgy-confirm-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'samgy-confirm-modal';
      modalEl.className = 'modal fade';
      modalEl.tabIndex = -1;
      modalEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header bg-light">
            <h5 class="modal-title font-title fw-bold text-dark fs-6">
              <i class="bi bi-question-circle text-samgy-primary me-2"></i>${escapeHtml(titulo)}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body py-4">
            <p class="mb-0 text-secondary">${escapeHtml(mensaje)}</p>
          </div>
          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-sm ${btnClase} px-3" id="confirm-modal-accept-btn">${escapeHtml(textoConfirmar)}</button>
          </div>
        </div>
      </div>
    `;

    const bsModal = new bootstrap.Modal(modalEl);
    let resolved = false;

    const acceptBtn = modalEl.querySelector('#confirm-modal-accept-btn');
    acceptBtn.onclick = () => {
      resolved = true;
      bsModal.hide();
      resolve(true);
    };

    modalEl.addEventListener('hidden.bs.modal', () => {
      if (!resolved) {
        resolve(false);
      }
    }, { once: true });

    bsModal.show();
  });
}

/**
 * Retorna HTML de un Spinner centrado
 * @param {string} [mensaje='Cargando información...']
 */
export function renderSpinner(mensaje = 'Cargando información...') {
  return `
    <div class="text-center py-5">
      <div class="spinner-border text-samgy-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted small mt-2 mb-0">${escapeHtml(mensaje)}</p>
    </div>
  `;
}

/**
 * Retorna HTML de un Estado Vacío
 * @param {string} mensaje
 * @param {string} [icono='bi-inbox']
 */
export function renderEmptyState(mensaje = 'No se encontraron registros.', icono = 'bi-folder-x') {
  return `
    <div class="text-center py-5">
      <i class="bi ${icono} text-muted display-4 mb-3 d-block"></i>
      <h6 class="text-secondary fw-bold">${escapeHtml(mensaje)}</h6>
    </div>
  `;
}

/**
 * Retorna HTML de un Estado de Error
 * @param {string} mensaje
 */
export function renderErrorState(mensaje = 'Ocurrió un error al cargar los datos.') {
  return `
    <div class="alert alert-danger d-flex align-items-center gap-2 m-3" role="alert">
      <i class="bi bi-exclamation-triangle-fill fs-5"></i>
      <div>${escapeHtml(mensaje)}</div>
    </div>
  `;
}

/**
 * Calcula la edad a partir de una fecha YYYY-MM-DD
 * @param {string} fechaNacimiento
 * @returns {number|null}
 */
export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  if (isNaN(nac.getTime())) return null;

  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return edad >= 0 ? edad : null;
}

