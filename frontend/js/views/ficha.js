import { api } from '../api.js';
import { escapeHtml, renderSpinner, renderEmptyState, renderErrorState, calcularEdad } from '../ui.js';

let estudiantesCache = [];
let searchDebounceTimer = null;

export async function renderFichaView(container, params = {}) {
  const studentId = params.id;

  container.innerHTML = `
    <div class="container-fluid p-0">
        <!-- Barra Superior de Navegación y Búsqueda Rápida con Autocompletar -->
        <div class="card card-samgy p-4 mb-4 shadow-sm">
            <div class="row align-items-center g-3">
                <div class="col-12 col-md-5 d-flex align-items-center">
                    <i class="bi bi-person-badge fs-2 text-samgy-primary me-3"></i>
                    <div>
                        <h4 class="fw-bold text-dark font-title mb-0">Ficha Médica & Historia Clínica</h4>
                        <p class="text-muted small mb-0">Expediente de salud individual y controles de enfermería</p>
                    </div>
                </div>
                <div class="col-12 col-md-7">
                    <div class="position-relative">
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-light"><i class="bi bi-search"></i></span>
                            <input type="text" id="ficha-quick-search" class="form-control" placeholder="Buscar rápido por nombre o documento..." autocomplete="off">
                            <select id="ficha-student-select" class="form-select form-select-sm fw-bold border-secondary-subtle" style="max-width: 260px;">
                                <option value="">Cargando estudiantes...</option>
                            </select>
                        </div>
                        <!-- Lista flotante de autocompletar -->
                        <div id="ficha-autocomplete-results" class="list-group position-absolute w-100 shadow-lg d-none" style="z-index: 1050; max-height: 250px; overflow-y: auto;">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="ficha-content-container">
            <!-- Dinámico -->
        </div>
    </div>
  `;

  const selectEl = container.querySelector('#ficha-student-select');
  const quickInput = container.querySelector('#ficha-quick-search');
  const autocompleteList = container.querySelector('#ficha-autocomplete-results');
  const contentEl = container.querySelector('#ficha-content-container');

  // Cargar estudiantes para el selector y autocompletar
  try {
    const resEst = await api.get('/estudiantes?limit=100&activo=1');
    estudiantesCache = resEst.data || [];

    selectEl.innerHTML = `<option value="">-- Seleccionar Estudiante --</option>` +
      estudiantesCache.map(e => `
        <option value="${e.id_estudiante}" ${studentId && Number(studentId) === e.id_estudiante ? 'selected' : ''}>
          ${escapeHtml(e.nombre_completo)} (${escapeHtml(e.curso || 'Sin Grado')})
        </option>
      `).join('');

    selectEl.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        window.location.hash = `#/ficha/${val}`;
      } else {
        window.location.hash = `#/ficha`;
      }
    });

    // Autocompletar con debounce
    quickInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      const val = quickInput.value.trim().toLowerCase();
      if (!val) {
        autocompleteList.classList.add('d-none');
        autocompleteList.innerHTML = '';
        return;
      }

      searchDebounceTimer = setTimeout(() => {
        const matches = estudiantesCache.filter(st => {
          const nom = (st.nombre_completo || '').toLowerCase();
          const doc = (st.numero_documento || st.documento || '').toLowerCase();
          const cod = (st.codigo || '').toLowerCase();
          return nom.includes(val) || doc.includes(val) || cod.includes(val);
        });

        if (matches.length === 0) {
          autocompleteList.innerHTML = `<div class="list-group-item small text-muted">No se encontraron estudiantes</div>`;
        } else {
          autocompleteList.innerHTML = matches.slice(0, 8).map(m => `
            <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2" data-est-id="${m.id_estudiante}">
              <div>
                <span class="fw-bold text-dark small">${escapeHtml(m.nombre_completo)}</span>
                <span class="text-muted extra-small ms-1">(${escapeHtml(m.curso || '')})</span>
              </div>
              <span class="badge bg-light text-dark font-monospace extra-small">${escapeHtml(m.documento || m.numero_documento || '')}</span>
            </button>
          `).join('');

          autocompleteList.querySelectorAll('[data-est-id]').forEach(btn => {
            btn.addEventListener('click', () => {
              const id = btn.getAttribute('data-est-id');
              autocompleteList.classList.add('d-none');
              quickInput.value = '';
              window.location.hash = `#/ficha/${id}`;
            });
          });
        }
        autocompleteList.classList.remove('d-none');
      }, 200);
    });

    // Cerrar autocompletar al hacer clic fuera
    document.addEventListener('click', (evt) => {
      if (!quickInput.contains(evt.target) && !autocompleteList.contains(evt.target)) {
        autocompleteList.classList.add('d-none');
      }
    });

    // Determinar estudiante a cargar
    const targetId = studentId || (estudiantesCache.length > 0 ? estudiantesCache[0].id_estudiante : null);
    if (targetId) {
      selectEl.value = targetId;
      await cargarFicha(targetId, contentEl);
    } else {
      contentEl.innerHTML = renderEmptyState('No hay estudiantes registrados.', 'bi-person-x');
    }
  } catch (err) {
    console.error('Error al inicializar selector de ficha:', err);
    contentEl.innerHTML = renderErrorState('No se pudieron cargar los estudiantes.');
  }
}

async function cargarFicha(id, container) {
  container.innerHTML = renderSpinner('Cargando ficha médica...');
  try {
    const res = await api.get(`/estudiantes/${id}/ficha`);
    const ficha = res.data;
    if (!ficha) {
      container.innerHTML = renderErrorState('Estudiante no encontrado');
      return;
    }

    renderFichaDetalle(ficha, container);
  } catch (err) {
    console.error('Error al cargar ficha:', err);
    container.innerHTML = renderErrorState(err.message || 'Error al obtener la ficha médica');
  }
}

function renderFichaDetalle(data, container) {
  const e = data.estudiante || {};
  const acudientes = data.acudientes || [];
  const alergias = data.alergias || [];
  const condiciones = data.condiciones || [];
  const atenciones = data.ultimas_atenciones || data.atenciones || [];
  const totalVisitas = data.total_visitas ?? data.total_atenciones ?? atenciones.length;
  const esRecurrente = data.es_recurrente === 1 || totalVisitas >= 3;

  // Iniciales para avatar
  const initials = (e.nombres ? e.nombres[0] : '') + (e.apellidos ? e.apellidos[0] : '');

  // Alergias badges con indicador especial para GRAVE
  let alergiasHtml = '';
  if (alergias.length === 0) {
    alergiasHtml = `<span class="badge bg-success-subtle text-success py-2 px-3 border border-success-subtle"><i class="bi bi-shield-check me-1"></i>Sin alergias documentadas</span>`;
  } else {
    alergiasHtml = alergias.map(a => {
      const desc = a.descripcion || '';
      const esGrave = desc.toLowerCase().includes('sever') || desc.toLowerCase().includes('grav') || desc.toLowerCase().includes('emerg');
      const badgeClass = esGrave ? 'bg-danger text-white fw-bold shadow-sm' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';

      return `
        <span class="badge ${badgeClass} p-2 me-2 mb-2" style="font-size: 0.85rem;">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>
          <strong>${escapeHtml(a.tipo || 'Alergia')}:</strong> ${escapeHtml(a.descripcion)}
          ${esGrave ? '<span class="badge bg-white text-danger ms-1 fw-bold">GRAVE</span>' : ''}
        </span>
      `;
    }).join('');
  }

  // Condiciones o Enfermedades Crónicas
  let condicionesHtml = '';
  if (condiciones.length === 0) {
    condicionesHtml = `<span class="badge bg-secondary-subtle text-secondary py-2 px-3 border border-secondary-subtle">Sin enfermedades o condiciones crónicas registradas</span>`;
  } else {
    condicionesHtml = condiciones.map(c => `
      <div class="p-2 mb-2 rounded bg-light border border-info-subtle">
        <div class="fw-bold text-info-emphasis small"><i class="bi bi-heart-pulse-fill me-1 text-info"></i>${escapeHtml(c.nombre || c.tipo || 'Condición')}</div>
        <div class="small text-muted">${escapeHtml(c.descripcion || '')}</div>
      </div>
    `).join('');
  }

  // Acudientes con enlace directo tel:
  let acudientesHtml = '';
  if (acudientes.length === 0) {
    acudientesHtml = `<p class="text-muted small mb-0">No hay acudientes registrados.</p>`;
  } else {
    acudientesHtml = `
      <div class="row g-3">
        ${acudientes.map(ac => `
          <div class="col-12">
            <div class="p-3 border rounded bg-light shadow-sm">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-dark font-title">${escapeHtml(ac.nombre_completo || 'Acudiente')}</span>
                <span class="badge bg-primary text-white">${escapeHtml(ac.parentesco || 'Tutor')}</span>
              </div>
              <div class="small text-muted mb-1">
                <i class="bi bi-telephone-fill me-1 text-success"></i>
                <a href="tel:${escapeHtml(ac.telefono)}" class="fw-bold text-dark text-decoration-none">
                  ${escapeHtml(ac.telefono)}
                </a>
                <span class="text-muted extra-small ms-1">(Llamar directo)</span>
              </div>
              ${ac.correo ? `
                <div class="small text-muted">
                  <i class="bi bi-envelope-fill me-1 text-samgy-primary"></i>
                  <a href="mailto:${escapeHtml(ac.correo)}" class="text-muted text-decoration-none">
                    ${escapeHtml(ac.correo)}
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Historial de Atenciones
  let atencionesHtml = '';
  if (atenciones.length === 0) {
    atencionesHtml = `
      <div class="p-4 text-center text-muted">
        <i class="bi bi-journal-x fs-2 text-secondary d-block mb-2"></i>
        <span>No se registran visitas a la enfermería para este estudiante.</span>
      </div>
    `;
  } else {
    atencionesHtml = atenciones.map(a => {
      const fechaObj = new Date(a.fecha_hora);
      const fechaStr = isNaN(fechaObj.getTime()) ? a.fecha_hora : fechaObj.toLocaleString('es-CO', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
      });

      return `
        <div class="p-3 border rounded mb-3 bg-white shadow-sm hover-shadow transition">
          <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
            <div>
              <span class="badge bg-light text-dark font-monospace me-2">${escapeHtml(a.codigo || '')}</span>
              <span class="fw-bold text-samgy-primary">${escapeHtml(a.motivo_sintomas || a.motivo_consulta)}</span>
            </div>
            <span class="badge bg-light text-dark border small">
              <i class="bi bi-clock me-1"></i>${escapeHtml(fechaStr)}
            </span>
          </div>
          <div class="small text-muted mb-1">
            <strong>Tratamiento / Procedimiento:</strong> ${escapeHtml(a.tratamiento || a.tratamiento_aplicado || 'N/A')}
          </div>
          ${a.observaciones_diagnostico ? `
            <div class="small text-secondary mb-1">
              <strong>Diagnóstico / Observaciones:</strong> ${escapeHtml(a.observaciones_diagnostico)}
            </div>
          ` : ''}
          <div class="text-end text-muted extra-small pt-1">
            <i class="bi bi-person-check me-1"></i>Atendido por: <strong>${escapeHtml(a.atendido_por || 'Enfermería')}</strong>
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="row g-4">
      <!-- Columna Izquierda: Perfil, Documento, Dirección, Correo y Acudientes -->
      <div class="col-12 col-lg-4">
        <!-- Tarjeta Perfil -->
        <div class="card card-samgy p-4 mb-4 text-center shadow-sm">
          <div class="avatar-initials fs-2 mx-auto mb-3" style="width:75px; height:75px; background-color: var(--samgy-primary);">
            ${escapeHtml(initials)}
          </div>
          <h5 class="fw-bold font-title text-dark mb-1">${escapeHtml(e.nombre_completo)}</h5>
          <p class="text-muted small mb-2">${escapeHtml(e.grado || 'Sin Grado')}</p>
          
          <div class="d-flex justify-content-center gap-2 mb-3">
            <span class="badge ${esRecurrente ? 'bg-danger-subtle text-danger border border-danger-subtle fw-bold' : 'bg-primary-subtle text-samgy-primary'} px-3 py-1">
              ${esRecurrente ? '<i class="bi bi-exclamation-circle-fill me-1"></i>Paciente Recurrente' : 'Paciente Regular'}
            </span>
            <span class="badge bg-light text-dark border px-2 py-1">
              ${totalVisitas} visitas
            </span>
          </div>

          <!-- Botón "Añadir Nueva Visita" e "Imprimir Ficha" -->
          <div class="d-grid gap-2">
            <a href="#/atenciones?estudiante=${e.id_estudiante}" class="btn btn-samgy btn-sm w-100 py-2 shadow-sm no-print">
              <i class="bi bi-plus-circle me-1"></i>Añadir Nueva Visita
            </a>
            <a href="#/reportes?tipo=ficha&estudiante=${e.id_estudiante}" class="btn btn-samgy-outline btn-sm w-100 py-2 no-print">
              <i class="bi bi-printer-fill me-1"></i>Imprimir Ficha Oficial
            </a>
          </div>
        </div>

        <!-- Tarjeta Datos Personales y Familiares -->
        <div class="card card-samgy p-4 mb-4 shadow-sm">
          <h6 class="fw-bold font-title text-dark border-bottom pb-2 mb-3">
            <i class="bi bi-person-lines-fill text-samgy-primary me-2"></i>Datos Personales y Ubicación
          </h6>
          <dl class="row small mb-0">
            <dt class="col-sm-5 text-muted">Documento:</dt>
            <dd class="col-sm-7 fw-semibold font-monospace">${escapeHtml(e.tipo_documento || 'TI')} ${escapeHtml(e.numero_documento)}</dd>

            <dt class="col-sm-5 text-muted">Edad:</dt>
            <dd class="col-sm-7">${escapeHtml(e.edad ? e.edad + ' años' : 'N/A')}</dd>

            <dt class="col-sm-5 text-muted">Dirección:</dt>
            <dd class="col-sm-7">${escapeHtml(e.direccion || 'No registrada')}</dd>

            <dt class="col-sm-5 text-muted">Correo Electrónico:</dt>
            <dd class="col-sm-7 text-truncate">
              ${e.correo ? `<a href="mailto:${escapeHtml(e.correo)}" class="text-decoration-none">${escapeHtml(e.correo)}</a>` : 'No registrado'}
            </dd>

            <dt class="col-sm-5 text-muted">Grupo Sanguíneo:</dt>
            <dd class="col-sm-7">
              <span class="badge bg-danger-subtle text-danger fw-bold">${escapeHtml(data.ficha_medica?.grupo_sanguineo || 'N/A')}</span>
            </dd>

            <dt class="col-sm-5 text-muted">EPS:</dt>
            <dd class="col-sm-7">${escapeHtml(data.ficha_medica?.eps || 'No registrada')}</dd>
          </dl>
        </div>

        <!-- Tarjeta Acudientes -->
        <div class="card card-samgy p-4 shadow-sm">
          <h6 class="fw-bold font-title text-dark border-bottom pb-2 mb-3">
            <i class="bi bi-telephone-outbound text-samgy-primary me-2"></i>Representantes Legales
          </h6>
          ${acudientesHtml}
        </div>
      </div>

      <!-- Columna Derecha: Alertas Médicas, Condiciones e Historial -->
      <div class="col-12 col-lg-8">
        <!-- Registro Médico: Alergias y Condiciones -->
        <div class="card card-samgy p-4 mb-4 shadow-sm">
          <h6 class="fw-bold font-title text-dark border-bottom pb-2 mb-3">
            <i class="bi bi-shield-exclamation text-danger me-2"></i>Registro Médico de Alertas & Alergias
          </h6>
          <div class="mb-3">
            <label class="small fw-bold text-muted d-block mb-2">Alergias Conocidas (Medicamentos / Alimentos):</label>
            <div>${alergiasHtml}</div>
          </div>
          <div>
            <label class="small fw-bold text-muted d-block mb-2">Condiciones o Enfermedades Preexistentes:</label>
            <div>${condicionesHtml}</div>
          </div>
        </div>

        <!-- Historial e Indicador de Visitas -->
        <div class="card card-samgy p-4 shadow-sm">
          <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <h6 class="fw-bold font-title text-dark mb-0">
              <i class="bi bi-journal-medical text-samgy-primary me-2"></i>Historial de Consultas de Enfermería
            </h6>
            <span class="badge bg-light text-dark border">${totalVisitas} atenciones registradas</span>
          </div>
          <div style="max-height: 520px; overflow-y: auto;">
            ${atencionesHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}
