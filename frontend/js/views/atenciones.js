import { api } from '../api.js';
import { escapeHtml, showToast, renderSpinner, renderEmptyState, renderErrorState } from '../ui.js';

let estudiantesCache = [];
let gradosCache = [];
let estudianteSeleccionadoActual = null;
let searchDebounceTimer = null;

export async function renderAtencionesView(container, params = {}) {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const preselectedEstudianteId = urlParams.get('estudiante') || '';

  container.innerHTML = `
    <div class="container-fluid p-0">
        <div class="row g-4">
            <!-- Formulario de Nueva Visita con Buscador Autocompletar -->
            <div class="col-12 col-lg-5">
                <div class="card card-samgy p-4 shadow-sm">
                    <div class="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
                        <h5 class="fw-bold font-title text-dark mb-0">
                            <i class="bi bi-journal-plus text-samgy-primary me-2"></i>Nueva Visita
                        </h5>
                        <span class="badge bg-primary-subtle text-samgy-primary fw-bold">Enfermería Escolar</span>
                    </div>

                    <form id="form-nueva-atencion" novalidate>
                        <!-- Buscador con Autocompletar de Estudiante -->
                        <div class="mb-3 position-relative">
                            <label for="buscar-estudiante-input" class="form-label small fw-bold text-muted">Estudiante *</label>
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-light"><i class="bi bi-search"></i></span>
                                <input type="text" id="buscar-estudiante-input" class="form-control" placeholder="Escribe nombre o documento..." autocomplete="off" required>
                                <button class="btn btn-outline-secondary" type="button" id="btn-limpiar-estudiante" title="Limpiar selección">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                            <input type="hidden" id="hidden-id-estudiante" name="id_estudiante" required>
                            <div class="invalid-feedback d-block d-none" id="feedback-estudiante">Por favor selecciona un estudiante de la lista.</div>

                            <!-- Lista flotante desplegable de autocompletar -->
                            <div id="atencion-autocomplete-list" class="list-group position-absolute w-100 shadow-lg d-none" style="z-index: 1050; max-height: 220px; overflow-y: auto;">
                            </div>
                        </div>

                        <!-- Panel de Alerta Dinámica: Alergias y Condiciones del Estudiante Seleccionado -->
                        <div id="alerta-estudiante-container" class="mb-3 d-none">
                            <!-- Renderizado al elegir un estudiante -->
                        </div>

                        <!-- Motivo / Síntomas Presentados -->
                        <div class="mb-3">
                            <label for="atencion-sintomas" class="form-label small fw-bold text-muted">Síntomas Presentados y Motivo *</label>
                            <input type="text" id="atencion-sintomas" name="motivo_sintomas" class="form-control form-control-sm" placeholder="Ej. Dolor de cabeza, mareos, dolor abdominal, fiebre..." required minlength="3">
                            <div class="invalid-feedback">Ingresa los síntomas presentados (mínimo 3 caracteres).</div>
                        </div>

                        <!-- Tratamiento Administrado -->
                        <div class="mb-3">
                            <label for="atencion-tratamiento" class="form-label small fw-bold text-muted">Tratamiento Administrado *</label>
                            <input type="text" id="atencion-tratamiento" name="tratamiento" class="form-control form-control-sm" placeholder="Ej. Reposo en camilla 20 min, hidratación, curación..." required minlength="3">
                            <div class="invalid-feedback">Ingresa el tratamiento o conducta médica aplicada.</div>
                        </div>

                        <!-- Observaciones / Diagnóstico Preliminar -->
                        <div class="mb-3">
                            <label for="atencion-observaciones" class="form-label small fw-bold text-muted">Observaciones / Diagnóstico Preliminar *</label>
                            <textarea id="atencion-observaciones" name="observaciones_diagnostico" rows="2" class="form-control form-control-sm" placeholder="Signos vitales tomados, estado general o recomendaciones..." required minlength="3"></textarea>
                            <div class="invalid-feedback">Ingresa las observaciones o diagnóstico preliminar.</div>
                        </div>

                        <!-- Estampa de Fecha y Hora (Servidor) -->
                        <div class="p-2 bg-light rounded border text-muted small d-flex justify-content-between align-items-center mb-3">
                            <span><i class="bi bi-clock-history me-1"></i>Fecha y Hora:</span>
                            <span class="badge bg-secondary-subtle text-secondary" id="preview-timestamp-atencion">
                                Registrada por el Servidor
                            </span>
                        </div>

                        <div id="atencion-error-alert" class="alert alert-danger py-2 small d-none"></div>

                        <button type="submit" id="btn-guardar-atencion" class="btn btn-samgy w-100 py-2 shadow-sm">
                            <i class="bi bi-floppy-fill me-2"></i>Guardar Atención
                        </button>
                    </form>
                </div>
            </div>

            <!-- Historial de Atenciones con Filtros (Fecha, Grado, Estudiante) -->
            <div class="col-12 col-lg-7">
                <div class="card card-samgy p-4 shadow-sm">
                    <div class="pb-3 mb-3 border-bottom">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="fw-bold font-title text-dark mb-0">
                                <i class="bi bi-clock-history text-samgy-primary me-2"></i>Historial de Atenciones
                            </h5>
                            <div class="d-flex gap-2 no-print">
                                <a href="#/reportes?tipo=atenciones" class="btn btn-samgy-outline btn-sm" title="Imprimir historial">
                                    <i class="bi bi-printer-fill me-1"></i>Imprimir
                                </a>
                                <button id="btn-recargar-atenciones" class="btn btn-outline-secondary btn-sm" title="Recargar historial">
                                    <i class="bi bi-arrow-clockwise"></i>
                                </button>
                            </div>
                        </div>
                        <p class="text-muted small mb-3">Registro cronológico de todas las consultas prestadas en el colegio</p>

                        <!-- Filtros del Historial: Estudiante, Grado, Desde y Hasta -->
                        <div class="row g-2">
                            <div class="col-12 col-sm-4">
                                <input type="text" id="filtro-historial-estudiante" class="form-control form-control-sm" placeholder="Filtrar por estudiante...">
                            </div>
                            <div class="col-6 col-sm-3">
                                <select id="filtro-historial-grado" class="form-select form-select-sm">
                                    <option value="">Todos los Grados</option>
                                </select>
                            </div>
                            <div class="col-6 col-sm-5 d-flex gap-1">
                                <input type="date" id="filtro-historial-desde" class="form-control form-control-sm" title="Fecha Desde">
                                <input type="date" id="filtro-historial-hasta" class="form-control form-control-sm" title="Fecha Hasta">
                                <button id="btn-limpiar-filtros-historial" class="btn btn-outline-secondary btn-sm" title="Limpiar filtros">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="atenciones-history-container" style="max-height: 540px; overflow-y: auto;">
                        ${renderSpinner('Cargando atenciones...')}
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

  const formEl = container.querySelector('#form-nueva-atencion');
  const btnGuardar = container.querySelector('#btn-guardar-atencion');
  const errorAlert = container.querySelector('#atencion-error-alert');
  const inputBuscar = container.querySelector('#buscar-estudiante-input');
  const hiddenId = container.querySelector('#hidden-id-estudiante');
  const autocompleteList = container.querySelector('#atencion-autocomplete-list');
  const btnLimpiarEstudiante = container.querySelector('#btn-limpiar-estudiante');
  const alertaContainer = container.querySelector('#alerta-estudiante-container');
  const feedbackEstudiante = container.querySelector('#feedback-estudiante');

  const filtroEst = container.querySelector('#filtro-historial-estudiante');
  const filtroGrado = container.querySelector('#filtro-historial-grado');
  const filtroDesde = container.querySelector('#filtro-historial-desde');
  const filtroHasta = container.querySelector('#filtro-historial-hasta');
  const btnLimpiarFiltros = container.querySelector('#btn-limpiar-filtros-historial');
  const btnRecargar = container.querySelector('#btn-recargar-atenciones');
  const historyContainer = container.querySelector('#atenciones-history-container');

  // Inicializar estudiantes y grados
  await inicializarDatos(filtroGrado);

  // Si viene un ID preseleccionado por URL
  if (preselectedEstudianteId) {
    const pre = estudiantesCache.find(x => x.id_estudiante === Number(preselectedEstudianteId));
    if (pre) {
      seleccionarEstudiante(pre, inputBuscar, hiddenId, autocompleteList, alertaContainer, feedbackEstudiante);
    }
  }

  // Buscador con autocompletar para el formulario de nueva visita
  inputBuscar.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const query = inputBuscar.value.trim().toLowerCase();
    hiddenId.value = '';
    alertaContainer.classList.add('d-none');
    alertaContainer.innerHTML = '';

    if (!query) {
      autocompleteList.classList.add('d-none');
      autocompleteList.innerHTML = '';
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      const filtrados = estudiantesCache.filter(st => {
        const nom = (st.nombre_completo || '').toLowerCase();
        const doc = (st.numero_documento || st.documento || '').toLowerCase();
        const cod = (st.codigo || '').toLowerCase();
        return nom.includes(query) || doc.includes(query) || cod.includes(query);
      });

      if (filtrados.length === 0) {
        autocompleteList.innerHTML = `<div class="list-group-item small text-muted">No se encontraron estudiantes</div>`;
      } else {
        autocompleteList.innerHTML = filtrados.slice(0, 7).map(e => `
          <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2" data-est-id="${e.id_estudiante}">
            <div>
              <span class="fw-bold text-dark small">${escapeHtml(e.nombre_completo)}</span>
              <span class="text-muted extra-small ms-1">(${escapeHtml(e.curso || '')})</span>
            </div>
            <span class="badge bg-light text-dark font-monospace extra-small">${escapeHtml(e.documento || e.numero_documento || '')}</span>
          </button>
        `).join('');

        autocompleteList.querySelectorAll('[data-est-id]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = Number(btn.getAttribute('data-est-id'));
            const est = estudiantesCache.find(x => x.id_estudiante === id);
            if (est) {
              seleccionarEstudiante(est, inputBuscar, hiddenId, autocompleteList, alertaContainer, feedbackEstudiante);
            }
          });
        });
      }
      autocompleteList.classList.remove('d-none');
    }, 200);
  });

  btnLimpiarEstudiante.addEventListener('click', () => {
    inputBuscar.value = '';
    hiddenId.value = '';
    estudianteSeleccionadoActual = null;
    alertaContainer.classList.add('d-none');
    alertaContainer.innerHTML = '';
    autocompleteList.classList.add('d-none');
  });

  document.addEventListener('click', (evt) => {
    if (!inputBuscar.contains(evt.target) && !autocompleteList.contains(evt.target)) {
      autocompleteList.classList.add('d-none');
    }
  });

  // Filtros de historial con debounce
  let filterDebounce = null;
  const dispararFiltrosHistorial = () => {
    clearTimeout(filterDebounce);
    filterDebounce = setTimeout(() => {
      cargarHistorialAtenciones(historyContainer, {
        estudiante: filtroEst.value.trim(),
        grado: filtroGrado.value,
        desde: filtroDesde.value,
        hasta: filtroHasta.value
      });
    }, 300);
  };

  filtroEst.addEventListener('input', dispararFiltrosHistorial);
  filtroGrado.addEventListener('change', dispararFiltrosHistorial);
  filtroDesde.addEventListener('change', dispararFiltrosHistorial);
  filtroHasta.addEventListener('change', dispararFiltrosHistorial);

  btnLimpiarFiltros.addEventListener('click', () => {
    filtroEst.value = '';
    filtroGrado.value = '';
    filtroDesde.value = '';
    filtroHasta.value = '';
    dispararFiltrosHistorial();
  });

  btnRecargar.addEventListener('click', () => {
    dispararFiltrosHistorial();
  });

  // Carga inicial del historial
  await cargarHistorialAtenciones(historyContainer, {});

  // Envío del formulario de atención
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAlert.classList.add('d-none');
    errorAlert.textContent = '';
    feedbackEstudiante.classList.add('d-none');

    if (!hiddenId.value) {
      feedbackEstudiante.classList.remove('d-none');
      inputBuscar.focus();
      return;
    }

    if (!formEl.checkValidity()) {
      formEl.classList.add('was-validated');
      return;
    }

    const payload = {
      id_estudiante: Number(hiddenId.value),
      motivo_sintomas: formEl.querySelector('#atencion-sintomas').value.trim(),
      tratamiento: formEl.querySelector('#atencion-tratamiento').value.trim(),
      observaciones_diagnostico: formEl.querySelector('#atencion-observaciones').value.trim()
    };

    btnGuardar.disabled = true;
    const btnOriginalHtml = btnGuardar.innerHTML;
    btnGuardar.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Registrando...`;

    try {
      await api.post('/atenciones', payload);
      showToast('Atención médica registrada exitosamente en el expediente.', 'success');
      
      // Limpiar formulario
      formEl.reset();
      formEl.classList.remove('was-validated');
      hiddenId.value = '';
      alertaContainer.classList.add('d-none');
      alertaContainer.innerHTML = '';
      
      // Actualizar estudiantes y recargar historial
      await api.get('/estudiantes?limit=100&activo=1').then(r => {
        estudiantesCache = r.data || [];
      });
      dispararFiltrosHistorial();
    } catch (err) {
      console.error('Error al guardar atención:', err);
      errorAlert.textContent = err.message || 'Error al guardar la atención médica.';
      errorAlert.classList.remove('d-none');
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = btnOriginalHtml;
    }
  });
}

function seleccionarEstudiante(est, inputBuscar, hiddenId, autocompleteList, alertaContainer, feedbackEstudiante) {
  estudianteSeleccionadoActual = est;
  inputBuscar.value = `${est.nombre_completo} (${est.curso || ''})`;
  hiddenId.value = est.id_estudiante;
  autocompleteList.classList.add('d-none');
  feedbackEstudiante.classList.add('d-none');

  // Mostrar Alerta Visible con Alergias y Condiciones
  const alergiasTxt = est.alergias && est.alergias !== 'Ninguna' ? est.alergias : '';
  const enfTxt = est.enfermedades && est.enfermedades !== 'Ninguna' ? est.enfermedades : '';
  const totalVisitas = Number(est.total_atenciones || 0);
  const esRecurrente = est.es_recurrente === 1 || totalVisitas >= 3;

  let alertaHtml = `
    <div class="card p-3 border-2 ${alergiasTxt ? 'border-danger bg-danger bg-opacity-10' : 'border-info bg-info bg-opacity-10'}">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="fw-bold font-title text-dark small">
          <i class="bi bi-shield-exclamation me-1 ${alergiasTxt ? 'text-danger' : 'text-info'}"></i>
          Ficha Rápida: ${escapeHtml(est.nombre_completo)}
        </span>
        <span class="badge ${esRecurrente ? 'bg-danger text-white' : 'bg-secondary text-white'} extra-small">
          ${totalVisitas} visitas ${esRecurrente ? '(Recurrente)' : ''}
        </span>
      </div>
  `;

  if (alergiasTxt) {
    alertaHtml += `
      <div class="small text-danger fw-bold mb-1">
        <i class="bi bi-exclamation-triangle-fill me-1"></i>Alergias: ${escapeHtml(alergiasTxt)}
      </div>
    `;
  } else {
    alertaHtml += `<div class="extra-small text-muted mb-1"><i class="bi bi-check-circle me-1 text-success"></i>Sin alergias conocidas</div>`;
  }

  if (enfTxt) {
    alertaHtml += `
      <div class="small text-info-emphasis mb-1">
        <i class="bi bi-heart-pulse-fill me-1 text-info"></i>Condiciones: ${escapeHtml(enfTxt)}
      </div>
    `;
  }

  alertaHtml += `
      <div class="extra-small text-muted d-flex justify-content-between pt-1 border-top mt-1">
        <span>Contacto Acudiente: <strong>${escapeHtml(est.contacto || 'N/A')}</strong> (${escapeHtml(est.acudiente || 'Tutor')})</span>
        <a href="#/ficha/${est.id_estudiante}" class="text-decoration-none fw-semibold">Ver Ficha Completa &rarr;</a>
      </div>
    </div>
  `;

  alertaContainer.innerHTML = alertaHtml;
  alertaContainer.classList.remove('d-none');
}

async function inicializarDatos(selectGrado) {
  try {
    const [resEst, resGrados] = await Promise.all([
      api.get('/estudiantes?limit=100&activo=1'),
      api.get('/grados')
    ]);

    estudiantesCache = resEst.data || [];
    gradosCache = resGrados.data || [];

    selectGrado.innerHTML = `<option value="">Todos los Grados</option>` +
      gradosCache.map(g => `<option value="${escapeHtml(g.nombre)}">${escapeHtml(g.nombre)}</option>`).join('');

  } catch (err) {
    console.error('Error al inicializar datos de atenciones:', err);
  }
}

async function cargarHistorialAtenciones(container, { estudiante, grado, desde, hasta }) {
  container.innerHTML = renderSpinner('Cargando atenciones...');
  try {
    let url = `/atenciones?limit=50`;
    if (estudiante) url += `&estudiante=${encodeURIComponent(estudiante)}`;
    if (grado) url += `&grado=${encodeURIComponent(grado)}`;
    if (desde) url += `&desde=${encodeURIComponent(desde)}`;
    if (hasta) url += `&hasta=${encodeURIComponent(hasta)}`;

    const res = await api.get(url);
    const atenciones = res.data || [];

    if (atenciones.length === 0) {
      container.innerHTML = renderEmptyState('No se encontraron registros de atenciones para los filtros aplicados.', 'bi-journal-x');
      return;
    }

    container.innerHTML = atenciones.map(a => {
      const fechaObj = new Date(a.fecha_hora);
      const fechaStr = isNaN(fechaObj.getTime()) ? a.fecha_hora : fechaObj.toLocaleString('es-CO', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
      });

      return `
        <div class="card p-3 mb-3 border bg-white shadow-sm hover-shadow transition">
            <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center border-bottom pb-2 mb-2 gap-1">
                <div>
                    <span class="badge bg-light text-dark font-monospace border me-1">${escapeHtml(a.codigo_atencion || a.codigo || '')}</span>
                    <a href="#/ficha/${a.id_estudiante}" class="fw-bold text-samgy-primary text-decoration-none">
                        ${escapeHtml(a.nombre_estudiante || 'Estudiante')}
                    </a>
                    <span class="badge bg-primary-subtle text-samgy-primary ms-1">${escapeHtml(a.curso || '')}</span>
                </div>
                <span class="badge bg-light text-dark border small">
                    <i class="bi bi-clock me-1"></i>${escapeHtml(fechaStr)}
                </span>
            </div>
            
            <div class="mb-2">
                <span class="badge bg-secondary-subtle text-secondary me-1">Motivo / Síntomas:</span>
                <span class="fw-semibold text-dark">${escapeHtml(a.motivo_sintomas || a.motivo_consulta)}</span>
            </div>

            <div class="small text-muted mb-2">
                <strong>Tratamiento Administrado:</strong> ${escapeHtml(a.tratamiento || a.tratamiento_aplicado || 'N/A')}
            </div>

            ${a.observaciones_diagnostico ? `
                <div class="small text-secondary mb-2 bg-light p-2 rounded">
                    <strong>Observaciones / Diagnóstico:</strong> ${escapeHtml(a.observaciones_diagnostico)}
                </div>
            ` : ''}

            <div class="d-flex justify-content-between align-items-center text-muted extra-small pt-1 border-top">
                <span>Atendido por: <strong>${escapeHtml(a.atendido_por || 'Enfermería')}</strong></span>
                <a href="#/ficha/${a.id_estudiante}" class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size: 0.75rem;">
                    <i class="bi bi-file-earmark-person me-1"></i>Ver Ficha
                </a>
            </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error al cargar historial de atenciones:', err);
    container.innerHTML = renderErrorState('Error al cargar el historial de atenciones.');
  }
}
