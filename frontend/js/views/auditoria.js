import { api } from '../api.js';
import { escapeHtml, renderSpinner, renderEmptyState, renderErrorState } from '../ui.js';

let debounceTimer = null;

export async function renderAuditoriaView(container) {
  container.innerHTML = `
    <div class="container-fluid p-0">
        <!-- Header -->
        <div class="card card-samgy p-4 mb-4 shadow-sm">
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                <div>
                    <h4 class="fw-bold text-dark font-title mb-1">
                        <i class="bi bi-shield-check text-samgy-primary me-2"></i>Pistas de Auditoría y Trazabilidad
                    </h4>
                    <p class="text-muted small mb-0">Registro inmutable de accesos a datos sensibles de salud de menores y operaciones administrativas</p>
                </div>
                <button class="btn btn-outline-secondary btn-sm" id="btn-recargar-auditoria" title="Recargar registros">
                    <i class="bi bi-arrow-clockwise me-1"></i>Actualizar
                </button>
            </div>
        </div>

        <!-- Filtros de Búsqueda -->
        <div class="card card-samgy p-3 mb-4 shadow-sm">
            <div class="row g-2 align-items-center">
                <div class="col-12 col-sm-3">
                    <label class="form-label extra-small fw-bold text-muted mb-1">Usuario / Email</label>
                    <input type="text" id="filtro-aud-usuario" class="form-control form-control-sm" placeholder="Buscar usuario...">
                </div>
                <div class="col-12 col-sm-3">
                    <label class="form-label extra-small fw-bold text-muted mb-1">Acción Registrada</label>
                    <select id="filtro-aud-accion" class="form-select form-select-sm">
                        <option value="">Todas las Acciones</option>
                        <option value="LOGIN_EXITOSO">LOGIN_EXITOSO</option>
                        <option value="CONSULTAR_FICHA">CONSULTAR_FICHA</option>
                        <option value="CREAR_ATENCION">CREAR_ATENCION</option>
                        <option value="CREAR_ESTUDIANTE">CREAR_ESTUDIANTE</option>
                        <option value="CREAR_USUARIO">CREAR_USUARIO</option>
                        <option value="DESACTIVAR_USUARIO">DESACTIVAR_USUARIO</option>
                        <option value="ACTIVAR_USUARIO">ACTIVAR_USUARIO</option>
                        <option value="ACTUALIZAR_CONFIGURACION">ACTUALIZAR_CONFIGURACION</option>
                        <option value="CAMBIAR_PASSWORD">CAMBIAR_PASSWORD</option>
                    </select>
                </div>
                <div class="col-6 col-sm-2">
                    <label class="form-label extra-small fw-bold text-muted mb-1">Desde</label>
                    <input type="date" id="filtro-aud-desde" class="form-control form-control-sm">
                </div>
                <div class="col-6 col-sm-2">
                    <label class="form-label extra-small fw-bold text-muted mb-1">Hasta</label>
                    <input type="date" id="filtro-aud-hasta" class="form-control form-control-sm">
                </div>
                <div class="col-12 col-sm-2 d-flex align-items-end mt-sm-auto">
                    <button id="btn-limpiar-aud-filtros" class="btn btn-outline-secondary btn-sm w-100">
                        <i class="bi bi-x-circle me-1"></i>Limpiar
                    </button>
                </div>
            </div>
        </div>

        <!-- Tabla de Registros de Auditoría -->
        <div class="card card-samgy shadow-sm">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0" id="tabla-auditoria">
                    <thead class="table-light text-uppercase small text-muted">
                        <tr>
                            <th>Fecha y Hora</th>
                            <th>Usuario Responsable</th>
                            <th>Rol</th>
                            <th>Acción</th>
                            <th>Detalles / Entidad Afectada</th>
                            <th>IP / Origen</th>
                        </tr>
                    </thead>
                    <tbody id="auditoria-table-body">
                        <!-- Dinámico -->
                    </tbody>
                </table>
            </div>

            <!-- Paginación -->
            <div class="card-footer bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
                <span class="text-muted small" id="auditoria-contador-footer">Cargando eventos...</span>
                <div class="btn-group btn-group-sm" id="auditoria-paginacion">
                    <button class="btn btn-outline-secondary" id="btn-pag-ant" disabled>&laquo; Anterior</button>
                    <span class="btn btn-light disabled px-3 fw-bold" id="indicador-pagina">Pág 1</span>
                    <button class="btn btn-outline-secondary" id="btn-pag-sig" disabled>Siguiente &raquo;</button>
                </div>
            </div>
        </div>
    </div>
  `;

  const inputUsuario = container.querySelector('#filtro-aud-usuario');
  const selectAccion = container.querySelector('#filtro-aud-accion');
  const inputDesde = container.querySelector('#filtro-aud-desde');
  const inputHasta = container.querySelector('#filtro-aud-hasta');
  const btnLimpiar = container.querySelector('#btn-limpiar-aud-filtros');
  const btnRecargar = container.querySelector('#btn-recargar-auditoria');
  const btnAnt = container.querySelector('#btn-pag-ant');
  const btnSig = container.querySelector('#btn-pag-sig');

  let paginaActual = 1;
  const limite = 15;

  const ejecutarConsulta = () => {
    cargarAuditoria(container, {
      usuario: inputUsuario.value.trim(),
      accion: selectAccion.value,
      desde: inputDesde.value,
      hasta: inputHasta.value,
      page: paginaActual,
      limit: limite
    });
  };

  const dispararFiltrosConDebounce = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      paginaActual = 1;
      ejecutarConsulta();
    }, 300);
  };

  inputUsuario.addEventListener('input', dispararFiltrosConDebounce);
  selectAccion.addEventListener('change', () => { paginaActual = 1; ejecutarConsulta(); });
  inputDesde.addEventListener('change', () => { paginaActual = 1; ejecutarConsulta(); });
  inputHasta.addEventListener('change', () => { paginaActual = 1; ejecutarConsulta(); });

  btnLimpiar.addEventListener('click', () => {
    inputUsuario.value = '';
    selectAccion.value = '';
    inputDesde.value = '';
    inputHasta.value = '';
    paginaActual = 1;
    ejecutarConsulta();
  });

  btnRecargar.addEventListener('click', ejecutarConsulta);

  btnAnt.addEventListener('click', () => {
    if (paginaActual > 1) {
      paginaActual--;
      ejecutarConsulta();
    }
  });

  btnSig.addEventListener('click', () => {
    paginaActual++;
    ejecutarConsulta();
  });

  // Carga inicial
  ejecutarConsulta();
}

async function cargarAuditoria(container, { usuario, accion, desde, hasta, page, limit }) {
  const tbody = container.querySelector('#auditoria-table-body');
  const footerContador = container.querySelector('#auditoria-contador-footer');
  const indicadorPagina = container.querySelector('#indicador-pagina');
  const btnAnt = container.querySelector('#btn-pag-ant');
  const btnSig = container.querySelector('#btn-pag-sig');

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">${renderSpinner('Cargando pistas de auditoría...')}</td></tr>`;

  try {
    let url = `/auditoria?page=${page}&limit=${limit}`;
    if (usuario) url += `&usuario=${encodeURIComponent(usuario)}`;
    if (accion) url += `&accion=${encodeURIComponent(accion)}`;
    if (desde) url += `&desde=${encodeURIComponent(desde)}`;
    if (hasta) url += `&hasta=${encodeURIComponent(hasta)}`;

    const res = await api.get(url);
    const eventos = res.data || [];
    const meta = res.meta || { total: eventos.length, pagina: page, total_paginas: 1 };

    footerContador.textContent = `Total: ${meta.total} registro(s) de auditoría (Página ${meta.pagina} de ${meta.total_paginas})`;
    indicadorPagina.textContent = `Pág ${meta.pagina} de ${meta.total_paginas}`;

    btnAnt.disabled = (meta.pagina <= 1);
    btnSig.disabled = (meta.pagina >= meta.total_paginas);

    if (eventos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            <i class="bi bi-shield-x fs-2 d-block mb-1"></i>
            No se encontraron eventos para los filtros seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = eventos.map(ev => {
      const fechaObj = new Date(ev.created_at);
      const fechaStr = isNaN(fechaObj.getTime()) ? ev.created_at : fechaObj.toLocaleString('es-CO', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });

      let accionBadge = 'bg-secondary text-white';
      if (ev.accion.includes('LOGIN')) accionBadge = 'bg-info-subtle text-info-emphasis';
      else if (ev.accion.includes('FICHA')) accionBadge = 'bg-primary-subtle text-primary fw-bold';
      else if (ev.accion.includes('CREAR')) accionBadge = 'bg-success-subtle text-success fw-bold';
      else if (ev.accion.includes('DESACTIVAR')) accionBadge = 'bg-danger-subtle text-danger fw-bold';

      let detallesStr = '';
      if (ev.detalles) {
        try {
          const obj = typeof ev.detalles === 'string' ? JSON.parse(ev.detalles) : ev.detalles;
          detallesStr = Object.entries(obj).map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}`).join(' • ');
        } catch (_) {
          detallesStr = escapeHtml(String(ev.detalles));
        }
      }

      return `
        <tr>
          <td class="small text-nowrap">
            <i class="bi bi-clock me-1 text-muted"></i>${escapeHtml(fechaStr)}
          </td>
          <td>
            <div class="fw-bold small text-dark">${escapeHtml(ev.usuario_email || 'Sistema')}</div>
          </td>
          <td>
            <span class="badge ${ev.rol === 'Administrador' ? 'bg-primary' : 'bg-secondary'} extra-small">
              ${escapeHtml(ev.rol || 'N/A')}
            </span>
          </td>
          <td>
            <span class="badge ${accionBadge} font-monospace extra-small">
              ${escapeHtml(ev.accion)}
            </span>
          </td>
          <td class="small text-muted" style="max-width: 380px;">
            <div class="text-truncate" title="${escapeHtml(JSON.stringify(ev.detalles || {}))}">
              ${detallesStr || 'Sin detalles'}
            </div>
          </td>
          <td class="extra-small font-monospace text-muted">
            ${escapeHtml(ev.ip || '127.0.0.1')}
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error al cargar auditoría:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${escapeHtml(err.message || 'Error al obtener auditoría')}</td></tr>`;
  }
}

