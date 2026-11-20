import { api } from '../api.js';
import { escapeHtml, showToast, renderSpinner, renderEmptyState, renderErrorState, calcularEdad } from '../ui.js';

let gradosCache = [];
let estudiantesPorGrado = {};
let gradoSeleccionadoActual = null; // null = todos, o id_grado
let debounceTimer = null;

export async function renderEstudiantesView(container) {
  container.innerHTML = `
    <div class="container-fluid p-0">
        <!-- Header & Acciones -->
        <div class="card card-samgy p-4 mb-4 shadow-sm">
            <div class="row align-items-center g-3">
                <div class="col-md-6">
                    <h4 class="fw-bold text-dark font-title mb-1">
                        <i class="bi bi-people-fill text-samgy-primary me-2"></i>Mis Estudiantes
                    </h4>
                    <p class="text-muted small mb-0">Organización por grados académicos, control de visitas y expedientes de salud</p>
                </div>
                <div class="col-md-6 d-flex flex-wrap justify-content-md-end align-items-center gap-2 no-print">
                    <button class="btn btn-samgy btn-sm px-3 py-2 shadow-sm" id="btn-abrir-modal-nuevo">
                        <i class="bi bi-person-plus-fill me-1"></i>Añadir Estudiante
                    </button>
                    <a href="#/reportes?tipo=estudiantes" class="btn btn-samgy-outline btn-sm px-3 py-2">
                        <i class="bi bi-printer-fill me-1"></i>Imprimir Lista
                    </a>
                    <button class="btn btn-outline-secondary btn-sm px-3 py-2" id="btn-reset-filtros">
                        <i class="bi bi-arrow-counterclockwise me-1"></i>Todos los Cursos
                    </button>
                </div>
            </div>
        </div>

        <!-- Tarjetas de Grados Académicos (6° a 11°) -->
        <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold font-title text-dark mb-0">
                    <i class="bi bi-grid-fill text-samgy-primary me-2"></i>Distribución por Grados
                </h6>
                <span class="text-muted extra-small">Haz clic en una tarjeta para filtrar los alumnos de ese grado</span>
            </div>
            <div class="row g-3" id="cards-grados-container">
                <div class="col-12">${renderSpinner('Cargando grados y estadísticas...')}</div>
            </div>
        </div>

        <!-- Tabla de Estudiantes con Buscador Dinámico -->
        <div class="card card-samgy shadow-sm">
            <div class="card-header bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
                <div>
                    <h5 class="fw-bold font-title mb-0 text-dark" id="tabla-titulo-alumnos">
                        Listado General de Alumnos Matriculados
                    </h5>
                    <span class="text-muted small" id="tabla-subtitulo-filtro">Mostrando todos los cursos</span>
                </div>
                <div class="input-group input-group-sm w-100 w-sm-auto" style="max-width: 350px;">
                    <span class="input-group-text bg-light"><i class="bi bi-search"></i></span>
                    <input type="text" id="search-student-input" class="form-control" placeholder="Buscar por nombre o documento..." aria-label="Buscar alumno por nombre o documento">
                    <button class="btn btn-outline-secondary" type="button" id="btn-clear-search" title="Limpiar búsqueda" aria-label="Limpiar búsqueda">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0" id="tabla-estudiantes">
                    <thead class="table-light text-uppercase small text-muted">
                        <tr>
                            <th scope="col">Estudiante</th>
                            <th scope="col">Documento</th>
                            <th scope="col">Curso</th>
                            <th scope="col">Alergias / Diagnóstico</th>
                            <th scope="col" class="text-center">Frecuencia / Visitas</th>
                            <th scope="col" class="text-end">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="students-table-body">
                        <!-- Filas dinámicas -->
                    </tbody>
                </table>
            </div>
            
            <div class="card-footer bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
                <span class="text-muted small" id="contador-estudiantes-footer">Cargando alumnos...</span>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-danger-subtle text-danger border border-danger-subtle">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>Recurrente (≥ 3 visitas)
                    </span>
                    <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                        <i class="bi bi-clock-history me-1"></i>Ocasional (1-2 visitas)
                    </span>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Nuevo Estudiante -->
    <div class="modal fade" id="modal-nuevo-estudiante" tabindex="-1" aria-labelledby="modalNuevoEstudianteLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header bg-samgy-primary text-white">
                    <h5 class="modal-title font-title" id="modalNuevoEstudianteLabel">
                        <i class="bi bi-person-plus-fill me-2"></i>Registrar Nuevo Alumno
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body p-4">
                    <form id="form-nuevo-estudiante" novalidate>
                        <!-- Información Básica -->
                        <h6 class="fw-bold font-title text-dark border-bottom pb-2 mb-3">1. Datos Personales</h6>
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label for="est-nombres" class="form-label small fw-bold text-muted">Nombres *</label>
                                <input type="text" class="form-control form-control-sm" id="est-nombres" required minlength="2">
                                <div class="invalid-feedback">Por favor ingresa los nombres.</div>
                            </div>
                            <div class="col-md-6">
                                <label for="est-apellidos" class="form-label small fw-bold text-muted">Apellidos *</label>
                                <input type="text" class="form-control form-control-sm" id="est-apellidos" required minlength="2">
                                <div class="invalid-feedback">Por favor ingresa los apellidos.</div>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-4">
                                <label for="est-tipo-doc" class="form-label small fw-bold text-muted">Tipo Documento *</label>
                                <select class="form-select form-select-sm" id="est-tipo-doc" required>
                                    <option value="1">TI — Tarjeta de Identidad</option>
                                    <option value="2">CC — Cédula de Ciudadanía</option>
                                    <option value="3">RC — Registro Civil</option>
                                    <option value="4">CE — Cédula de Extranjería</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label for="est-num-doc" class="form-label small fw-bold text-muted">Número Documento *</label>
                                <input type="text" class="form-control form-control-sm" id="est-num-doc" required minlength="5" maxlength="20">
                                <div class="invalid-feedback">Ingresa un documento válido (mínimo 5 caracteres).</div>
                            </div>
                            <div class="col-md-4">
                                <label for="est-grado" class="form-label small fw-bold text-muted">Curso / Grado *</label>
                                <select class="form-select form-select-sm" id="est-grado" required>
                                    <option value="">-- Seleccionar Grado --</option>
                                </select>
                                <div class="invalid-feedback">Selecciona el grado académico.</div>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-4">
                                <label for="est-edad" class="form-label small fw-bold text-muted">Edad *</label>
                                <input type="number" class="form-control form-control-sm" id="est-edad" min="4" max="25" required>
                                <div class="invalid-feedback">Ingresa una edad válida.</div>
                            </div>
                            <div class="col-md-4">
                                <label for="est-correo" class="form-label small fw-bold text-muted">Correo Electrónico</label>
                                <input type="email" class="form-control form-control-sm" id="est-correo" placeholder="alumno@sanalbertomagno.edu.co">
                                <div class="invalid-feedback">Ingresa un correo válido.</div>
                            </div>
                            <div class="col-md-4">
                                <label for="est-direccion" class="form-label small fw-bold text-muted">Dirección de Residencia</label>
                                <input type="text" class="form-control form-control-sm" id="est-direccion" placeholder="Calle / Carrera...">
                            </div>
                        </div>

                        <!-- Ficha Médica Inicial -->
                        <h6 class="fw-bold font-title text-dark border-bottom pb-2 mb-3 mt-4">2. Ficha Médica Inicial</h6>
                        <div class="row g-3 mb-3">
                            <div class="col-md-4">
                                <label for="est-rh" class="form-label small fw-bold text-muted">Grupo Sanguíneo y RH</label>
                                <select class="form-select form-select-sm" id="est-rh">
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label for="est-eps" class="form-label small fw-bold text-muted">EPS / Seguro Médico</label>
                                <input type="text" class="form-control form-control-sm" id="est-eps" placeholder="Ej. Sura, Sanitas, Compensar...">
                            </div>
                            <div class="col-md-4">
                                <label for="est-alergia" class="form-label small fw-bold text-muted">Alergia Grave o Alerta</label>
                                <input type="text" class="form-control form-control-sm" id="est-alergia" placeholder="Ej. Penicilina (GRAVE)...">
                            </div>
                            <div class="col-md-4">
                                <label for="est-obs-medicas" class="form-label small fw-bold text-muted">Observaciones Médicas</label>
                                <input type="text" class="form-control form-control-sm" id="est-obs-medicas" placeholder="Antecedentes importantes...">
                            </div>
                        </div>

                        <!-- Acudiente Principal -->
                        <h6 class="fw-bold font-title text-dark border-bottom pb-2 mb-3 mt-4">3. Acudiente / Contacto Principal</h6>
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label for="est-acudiente-nombre" class="form-label small fw-bold text-muted">Nombre del Acudiente *</label>
                                <input type="text" class="form-control form-control-sm" id="est-acudiente-nombre" required minlength="3">
                                <div class="invalid-feedback">Ingresa el nombre del acudiente.</div>
                            </div>
                            <div class="col-md-3">
                                <label for="est-acudiente-tel" class="form-label small fw-bold text-muted">Teléfono Móvil *</label>
                                <input type="tel" class="form-control form-control-sm" id="est-acudiente-tel" required minlength="7">
                                <div class="invalid-feedback">Ingresa un teléfono de contacto.</div>
                            </div>
                            <div class="col-md-3">
                                <label for="est-acudiente-parentesco" class="form-label small fw-bold text-muted">Parentesco</label>
                                <select class="form-select form-select-sm" id="est-acudiente-parentesco">
                                    <option value="Madre">Madre</option>
                                    <option value="Padre">Padre</option>
                                    <option value="Tutor Legal">Tutor Legal</option>
                                    <option value="Abuelo/a">Abuelo/a</option>
                                    <option value="Familiar">Familiar</option>
                                </select>
                            </div>
                        </div>

                        <div id="modal-error-alert" class="alert alert-danger py-2 small d-none"></div>

                        <div class="modal-footer px-0 pb-0 mt-4">
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" id="btn-guardar-estudiante" class="btn btn-samgy btn-sm px-4">
                                <i class="bi bi-floppy-fill me-1"></i>Guardar Estudiante
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
  `;

  const searchInput = container.querySelector('#search-student-input');
  const btnClearSearch = container.querySelector('#btn-clear-search');
  const btnResetFiltros = container.querySelector('#btn-reset-filtros');
  const btnNuevo = container.querySelector('#btn-abrir-modal-nuevo');
  const formNuevo = container.querySelector('#form-nuevo-estudiante');
  const modalEl = container.querySelector('#modal-nuevo-estudiante');
  const bsModal = new bootstrap.Modal(modalEl);

  // Cargar grados y estudiantes iniciales
  await cargarGradosYEstudiantes(container);

  // Eventos de Búsqueda con debounce (300 ms)
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      ejecutarConsultaEstudiantes(container);
    }, 300);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    ejecutarConsultaEstudiantes(container);
  });

  btnResetFiltros.addEventListener('click', () => {
    gradoSeleccionadoActual = null;
    actualizarCardsGradosUI(container);
    actualizarTituloFiltro(container);
    ejecutarConsultaEstudiantes(container);
  });

  btnNuevo.addEventListener('click', () => {
    formNuevo.reset();
    formNuevo.classList.remove('was-validated');
    container.querySelector('#modal-error-alert').classList.add('d-none');
    bsModal.show();
  });

  // Guardar nuevo estudiante
  formNuevo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorAlert = container.querySelector('#modal-error-alert');
    errorAlert.classList.add('d-none');
    errorAlert.textContent = '';

    if (!formNuevo.checkValidity()) {
      formNuevo.classList.add('was-validated');
      return;
    }

    const payload = {
      nombres: container.querySelector('#est-nombres').value.trim(),
      apellidos: container.querySelector('#est-apellidos').value.trim(),
      id_tipo_documento: Number(container.querySelector('#est-tipo-doc').value),
      numero_documento: container.querySelector('#est-num-doc').value.trim(),
      id_grado: Number(container.querySelector('#est-grado').value),
      edad: Number(container.querySelector('#est-edad').value),
      correo: container.querySelector('#est-correo').value.trim() || undefined,
      direccion: container.querySelector('#est-direccion').value.trim() || undefined,
      ficha_medica: {
        grupo_sanguineo: container.querySelector('#est-rh').value,
        eps: container.querySelector('#est-eps').value.trim() || undefined,
        observaciones_generales: container.querySelector('#est-obs-medicas').value.trim() || undefined
      },
      alergias: container.querySelector('#est-alergia')?.value.trim()
        ? [{ tipo: 'Medicamento', descripcion: container.querySelector('#est-alergia').value.trim() }]
        : undefined,
      acudiente: {
        nombre_completo: container.querySelector('#est-acudiente-nombre').value.trim(),
        telefono: container.querySelector('#est-acudiente-tel').value.trim(),
        parentesco: container.querySelector('#est-acudiente-parentesco').value
      }
    };

    const btnSubmit = container.querySelector('#btn-guardar-estudiante');
    btnSubmit.disabled = true;
    const origHtml = btnSubmit.innerHTML;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Guardando...`;

    try {
      await api.post('/estudiantes', payload);
      bsModal.hide();
      showToast('Estudiante registrado exitosamente.', 'success');
      // Recargar grados y tabla
      await cargarGradosYEstudiantes(container);
    } catch (err) {
      console.error('Error al guardar estudiante:', err);
      errorAlert.textContent = err.message || 'Error al guardar el estudiante.';
      errorAlert.classList.remove('d-none');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = origHtml;
    }
  });
}

async function cargarGradosYEstudiantes(container) {
  try {
    const [resGrados, resEstudiantes] = await Promise.all([
      api.get('/grados'),
      api.get('/estudiantes?limit=100&activo=1')
    ]);

    gradosCache = resGrados.data || [];
    const todosEstudiantes = resEstudiantes.data || [];

    // Llenar selector de grados del modal
    const selectModalGrado = container.querySelector('#est-grado');
    if (selectModalGrado) {
      selectModalGrado.innerHTML = `<option value="">-- Seleccionar Grado --</option>` +
        gradosCache.map(g => `<option value="${g.id_grado}">${escapeHtml(g.nombre)}</option>`).join('');
    }

    // Calcular estadísticas por grado (6° a 11°)
    estudiantesPorGrado = {};
    gradosCache.forEach(g => {
      estudiantesPorGrado[g.id_grado] = {
        grado: g,
        total: 0,
        recurrentes: 0
      };
    });

    todosEstudiantes.forEach(est => {
      const gId = est.id_grado;
      if (estudiantesPorGrado[gId]) {
        estudiantesPorGrado[gId].total++;
        if (est.es_recurrente === 1 || est.total_atenciones >= 3) {
          estudiantesPorGrado[gId].recurrentes++;
        }
      }
    });

    // Renderizar tarjetas de grados
    renderCardsGrados(container);

    // Renderizar tabla inicial
    renderTablaEstudiantes(todosEstudiantes, container);

  } catch (err) {
    console.error('Error al cargar datos:', err);
    container.querySelector('#cards-grados-container').innerHTML = 
      `<div class="col-12">${renderErrorState('No fue posible cargar los grados.')}</div>`;
  }
}

function renderCardsGrados(container) {
  const cardsContainer = container.querySelector('#cards-grados-container');
  if (!cardsContainer) return;

  cardsContainer.innerHTML = gradosCache.map(g => {
    const stats = estudiantesPorGrado[g.id_grado] || { total: 0, recurrentes: 0 };
    const isSelected = gradoSeleccionadoActual === g.id_grado;

    return `
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card card-samgy p-3 text-center cursor-pointer h-100 shadow-sm border-2 ${isSelected ? 'border-primary bg-primary bg-opacity-10' : ''}"
             data-grado-id="${g.id_grado}"
             style="cursor: pointer; transition: all 0.2s ease-in-out;">
          <div class="fw-bold font-title text-dark mb-1">${escapeHtml(g.nombre)}</div>
          <div class="extra-small text-muted mb-2">${escapeHtml(g.nivel || 'Secundaria')}</div>
          
          <div class="d-flex justify-content-center align-items-baseline gap-1 mb-1">
            <span class="fs-4 fw-bold text-samgy-primary">${stats.total}</span>
            <span class="extra-small text-muted">alumnos</span>
          </div>

          <div class="mt-auto">
            ${stats.recurrentes > 0 ? `
              <span class="badge bg-danger-subtle text-danger extra-small py-1 px-2 border border-danger-subtle" title="Alumnos con 3 o más atenciones">
                <i class="bi bi-exclamation-circle-fill me-1"></i>${stats.recurrentes} rec.
              </span>
            ` : `
              <span class="badge bg-light text-muted extra-small py-1 px-2 border">0 rec.</span>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Event listeners para seleccionar grado
  cardsContainer.querySelectorAll('[data-grado-id]').forEach(card => {
    card.addEventListener('click', () => {
      const gId = Number(card.getAttribute('data-grado-id'));
      if (gradoSeleccionadoActual === gId) {
        // Deseleccionar si ya estaba activo
        gradoSeleccionadoActual = null;
      } else {
        gradoSeleccionadoActual = gId;
      }
      actualizarCardsGradosUI(container);
      actualizarTituloFiltro(container);
      ejecutarConsultaEstudiantes(container);
    });
  });
}

function actualizarCardsGradosUI(container) {
  const cardsContainer = container.querySelector('#cards-grados-container');
  if (!cardsContainer) return;

  cardsContainer.querySelectorAll('[data-grado-id]').forEach(card => {
    const gId = Number(card.getAttribute('data-grado-id'));
    if (gradoSeleccionadoActual === gId) {
      card.classList.add('border-primary', 'bg-primary', 'bg-opacity-10');
      card.style.transform = 'translateY(-3px)';
    } else {
      card.classList.remove('border-primary', 'bg-primary', 'bg-opacity-10');
      card.style.transform = 'none';
    }
  });
}

function actualizarTituloFiltro(container) {
  const subEl = container.querySelector('#tabla-subtitulo-filtro');
  if (!subEl) return;

  if (gradoSeleccionadoActual) {
    const g = gradosCache.find(x => x.id_grado === gradoSeleccionadoActual);
    subEl.textContent = `Filtrado por: ${g ? g.nombre : 'Grado seleccionado'}`;
  } else {
    subEl.textContent = 'Mostrando todos los cursos';
  }
}

async function ejecutarConsultaEstudiantes(container) {
  const tbody = container.querySelector('#students-table-body');
  const footerContador = container.querySelector('#contador-estudiantes-footer');
  const searchInput = container.querySelector('#search-student-input');
  const query = searchInput ? searchInput.value.trim() : '';

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">${renderSpinner('Buscando estudiantes...')}</td></tr>`;

  try {
    let url = `/estudiantes?limit=100&activo=1`;
    if (gradoSeleccionadoActual) url += `&grado=${encodeURIComponent(gradoSeleccionadoActual)}`;
    if (query) url += `&q=${encodeURIComponent(query)}`;

    const res = await api.get(url);
    const estudiantes = res.data || [];
    renderTablaEstudiantes(estudiantes, container);

    if (footerContador) {
      footerContador.textContent = `${estudiantes.length} estudiante(s) encontrado(s)`;
    }
  } catch (err) {
    console.error('Error al consultar estudiantes:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${escapeHtml(err.message || 'Error al cargar estudiantes')}</td></tr>`;
  }
}

function renderTablaEstudiantes(estudiantes, container) {
  const tbody = container.querySelector('#students-table-body');
  const footerContador = container.querySelector('#contador-estudiantes-footer');
  if (!tbody) return;

  if (footerContador) {
    footerContador.textContent = `${estudiantes.length} estudiante(s) listado(s)`;
  }

  if (estudiantes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5">
          <i class="bi bi-person-x fs-1 text-muted d-block mb-2"></i>
          <span class="text-muted">No se encontraron estudiantes para los filtros seleccionados.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = estudiantes.map(e => {
    const totalAte = Number(e.total_atenciones || 0);
    const esRecurrente = e.es_recurrente === 1 || totalAte >= 3;

    // Badges de alerta de visitas
    let visitasBadge = '';
    if (esRecurrente) {
      visitasBadge = `
        <span class="badge bg-danger-subtle text-danger fw-bold border border-danger-subtle px-2 py-1" title="Paciente Recurrente (3 o más atenciones registradas)">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>${totalAte} visitas (Recurrente)
        </span>
      `;
    } else if (totalAte > 0) {
      visitasBadge = `
        <span class="badge bg-warning-subtle text-warning-emphasis fw-semibold border border-warning-subtle px-2 py-1">
          <i class="bi bi-clock-history me-1"></i>${totalAte} ${totalAte === 1 ? 'visita' : 'visitas'}
        </span>
      `;
    } else {
      visitasBadge = `
        <span class="badge bg-light text-muted border px-2 py-1">
          0 visitas
        </span>
      `;
    }

    // Alergias / Enfermedades
    let alertaMedica = '';
    const alergiasTxt = e.alergias && e.alergias !== 'Ninguna' ? e.alergias : '';
    const enfTxt = e.enfermedades && e.enfermedades !== 'Ninguna' ? e.enfermedades : '';

    if (alergiasTxt || enfTxt) {
      alertaMedica = `
        <div class="small text-danger fw-semibold">
          <i class="bi bi-shield-exclamation me-1"></i>${escapeHtml([alergiasTxt, enfTxt].filter(Boolean).join(' • '))}
        </div>
      `;
    } else {
      alertaMedica = `<span class="small text-muted">Sin alertas documentadas</span>`;
    }

    return `
      <tr>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(e.nombre_completo)}</div>
          <div class="extra-small text-muted">${escapeHtml(e.codigo || '')} • ${escapeHtml(e.edad ? e.edad + ' años' : '')}</div>
        </td>
        <td>
          <span class="font-monospace small bg-light px-2 py-1 rounded border">
            ${escapeHtml(e.documento || e.numero_documento || 'S/D')}
          </span>
        </td>
        <td>
          <span class="badge bg-primary-subtle text-samgy-primary border border-primary-subtle">
            ${escapeHtml(e.curso || 'Sin Grado')}
          </span>
        </td>
        <td>
          ${alertaMedica}
        </td>
        <td class="text-center">
          ${visitasBadge}
        </td>
        <td class="text-end text-nowrap">
          <a href="#/ficha/${e.id_estudiante}" class="btn btn-sm btn-outline-primary me-1" title="Ver Ficha Médica">
            <i class="bi bi-file-earmark-medical me-1"></i>Ficha
          </a>
          <a href="#/atenciones?estudiante=${e.id_estudiante}" class="btn btn-sm btn-samgy" title="Nueva Atención Inmediata">
            <i class="bi bi-plus-lg"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}
