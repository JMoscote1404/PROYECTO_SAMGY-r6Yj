import { api } from './api.js';
import { defineRoutes, initRouter, navigateTo, getHashPath } from './router.js';
import { showToast, showConfirm } from './ui.js';

import { renderInicioView } from './views/inicio.js';
import { renderEstudiantesView } from './views/estudiantes.js';
import { renderFichaView } from './views/ficha.js';
import { renderAtencionesView } from './views/atenciones.js';
import { renderReportesView } from './views/reportes.js';
import { renderConfiguracionView } from './views/configuracion.js';
import { renderAuditoriaView } from './views/auditoria.js';
import { renderLoginView } from './views/login.js';

let currentUser = null;
let inactivityTimer = null;
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos exactos

document.addEventListener('DOMContentLoaded', async () => {
  // Configurar interceptor de 401 en api.js
  api.setOnUnauthorized(() => {
    mostrarPantallaLogin();
  });

  // Escuchar botón de logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  // Acción rápida de impresión de la vista actual desde el menú superior
  const btnPrintCurrent = document.getElementById('action-print-current');
  if (btnPrintCurrent) {
    btnPrintCurrent.addEventListener('click', () => {
      prepararEncabezadoImpresion();
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        const toggle = menu.previousElementSibling;
        if (toggle && window.bootstrap?.Dropdown) {
          window.bootstrap.Dropdown.getInstance(toggle)?.hide();
        }
      });
      setTimeout(() => window.print(), 80);
    });
  }

  // Reloj en vivo
  updateLiveTimestamp();
  setInterval(updateLiveTimestamp, 30000);

  // Inicializar detector de inactividad
  iniciarControlInactividad();

  // Definir rutas oficiales sin despacharlas aún (se despachan solo con sesión autenticada)
  defineRoutes({
    '#/inicio': (container, params) => {
      setPageTitle('Inicio — Panel Principal');
      return renderInicioView(container, params);
    },
    '#/estudiantes': (container, params) => {
      setPageTitle('Base de Datos — Mis Estudiantes');
      return renderEstudiantesView(container, params);
    },
    '#/ficha': (container, params) => {
      setPageTitle('Ficha Médica & Historia Clínica');
      return renderFichaView(container, params);
    },
    '#/ficha/:id': (container, params) => {
      setPageTitle('Ficha Médica & Historia Clínica');
      return renderFichaView(container, params);
    },
    '#/atenciones': (container, params) => {
      setPageTitle('Atenciones y Registro Diario');
      return renderAtencionesView(container, params);
    },
    '#/reportes': (container, params) => {
      setPageTitle('Centro de Impresión y Reportes');
      return renderReportesView(container, params, currentUser);
    },
    '#/configuracion': (container, params) => {
      setPageTitle('Configuración del Sistema');
      return renderConfiguracionView(container, params);
    },
    '#/auditoria': (container, params) => {
      if (currentUser && currentUser.rol !== 'Administrador') {
        showToast('Acceso restringido: Esta sección es exclusiva de Administradores.', 'danger');
        navigateTo('#/inicio');
        return;
      }
      setPageTitle('Auditoría & Trazabilidad de Accesos');
      return renderAuditoriaView(container, params);
    }
  });

  // Verificar sesión actual con /api/auth/me antes de montar vistas protegidas
  await verificarSesion();
});

export function prepararEncabezadoImpresion() {
  const ahora = new Date().toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  const dateEl = document.getElementById('print-global-date');
  if (dateEl) dateEl.textContent = ahora;

  const pageTitle = document.getElementById('page-title')?.textContent || 'Reporte SAMGY';
  const printTitleEl = document.getElementById('print-global-title');
  if (printTitleEl) printTitleEl.textContent = pageTitle;
}

async function verificarSesion() {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin'
    });
    if (!res.ok) {
      mostrarPantallaLogin();
      return;
    }
    const body = await res.json();
    if (body && body.data) {
      currentUser = body.data;
      actualizarDatosUsuarioUI(currentUser);
      mostrarAppPrincipal();
      initRouter();

      const hash = getHashPath();
      if (!hash || hash === '#/' || hash === '#/login') {
        navigateTo('#/inicio');
      }
    } else {
      mostrarPantallaLogin();
    }
  } catch (err) {
    console.warn('Usuario no autenticado:', err.message);
    mostrarPantallaLogin();
  }
}

function mostrarPantallaLogin() {
  currentUser = null;
  const appWrapper = document.getElementById('wrapper');
  const loginContainer = document.getElementById('login-container');
  const mainContainer = document.getElementById('main-dynamic-container');

  if (mainContainer) mainContainer.innerHTML = '';
  if (appWrapper) appWrapper.classList.add('d-none');
  if (loginContainer) {
    loginContainer.classList.remove('d-none');
    renderLoginView(loginContainer, async (userData) => {
      currentUser = userData;
      actualizarDatosUsuarioUI(currentUser);
      mostrarAppPrincipal();
      reiniciarTemporizadorInactividad();
      showToast(`¡Bienvenido(a), ${userData.nombre_completo}!`, 'success');
      initRouter();
      navigateTo('#/inicio');
    });
  }
}

function mostrarAppPrincipal() {
  const appWrapper = document.getElementById('wrapper');
  const loginContainer = document.getElementById('login-container');

  if (loginContainer) {
    loginContainer.classList.add('d-none');
    loginContainer.innerHTML = '';
  }
  if (appWrapper) {
    appWrapper.classList.remove('d-none');
  }
}

function actualizarDatosUsuarioUI(user) {
  if (!user) return;
  const nombre = user.nombre_completo || user.email;
  const rol = user.rol || 'Personal';

  const nameEl = document.getElementById('sidebar-user-name');
  if (nameEl) nameEl.textContent = nombre;

  const roleEl = document.getElementById('sidebar-user-role');
  if (roleEl) roleEl.textContent = rol;

  const initials = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const avatarEl = document.getElementById('sidebar-user-avatar');
  if (avatarEl) avatarEl.textContent = initials || 'US';

  // Mostrar u ocultar enlace de auditoría en sidebar si es Administrador
  const navAuditoria = document.getElementById('nav-auditoria');
  if (navAuditoria) {
    if (rol === 'Administrador') {
      navAuditoria.classList.remove('d-none');
    } else {
      navAuditoria.classList.add('d-none');
    }
  }
}

async function handleLogout() {
  const confirmed = await showConfirm({
    titulo: 'Cerrar Sesión',
    mensaje: '¿Deseas cerrar tu sesión en SAMGY?',
    textoConfirmar: 'Salir',
    btnClase: 'btn-danger'
  });
  if (!confirmed) return;

  try {
    await api.post('/auth/logout', {});
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  } finally {
    mostrarPantallaLogin();
    showToast('Sesión cerrada exitosamente.', 'info');
  }
}

function setPageTitle(title) {
  const pageTitleEl = document.getElementById('page-title');
  if (pageTitleEl) pageTitleEl.textContent = title;
  const printTitleEl = document.getElementById('print-global-title');
  if (printTitleEl) printTitleEl.textContent = title;
}

function updateLiveTimestamp() {
  const now = new Date();
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true };
  const formatted = now.toLocaleString('es-CO', options);

  const dateBadge = document.getElementById('current-date-badge');
  if (dateBadge) dateBadge.innerHTML = `<i class="bi bi-calendar-event me-1 text-samgy-primary"></i> ${formatted}`;

  const printDateEl = document.getElementById('print-global-date');
  if (printDateEl) printDateEl.textContent = formatted;
}

// -------------------------------------------------------------
// CONTROL AUTOMÁTICO DE CIERRE DE SESIÓN POR INACTIVIDAD (15 MIN)
// -------------------------------------------------------------
function iniciarControlInactividad() {
  const eventosActividad = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
  
  eventosActividad.forEach(ev => {
    window.addEventListener(ev, () => {
      reiniciarTemporizadorInactividad();
    }, { passive: true });
  });

  reiniciarTemporizadorInactividad();
}

function reiniciarTemporizadorInactividad() {
  clearTimeout(inactivityTimer);
  if (!currentUser) return;

  inactivityTimer = setTimeout(async () => {
    if (currentUser) {
      console.warn('Cierre de sesión automático por inactividad de 15 minutos.');
      try {
        await api.post('/auth/logout', {});
      } catch (_) {}
      mostrarPantallaLogin();
      showToast('Tu sesión ha expirado por inactividad (15 minutos). Por seguridad de los datos de salud, inicia sesión nuevamente.', 'warning');
    }
  }, INACTIVITY_TIMEOUT_MS);
}
