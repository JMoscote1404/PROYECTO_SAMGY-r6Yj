import { api } from '../api.js';
import { escapeHtml, renderSpinner, renderErrorState } from '../ui.js';

let reportChartInstance = null;

export async function renderReportesView(container, params = {}, currentUser = null) {
  const hashQuery = window.location.hash.split('?')[1] || '';
  const urlParams = new URLSearchParams(hashQuery);
  const tipoInicial = urlParams.get('tipo') || 'estadistico';
  const idEstudianteUrl = urlParams.get('estudiante') || '';

  container.innerHTML = `
    <div class="container-fluid p-0">
      <!-- Panel de Control e Impresión (Oculto al imprimir) -->
      <div class="card card-samgy p-4 mb-4 no-print">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 pb-3 mb-3 border-bottom">
          <div>
            <h4 class="fw-bold font-title text-dark mb-1">
              <i class="bi bi-printer-fill text-samgy-primary me-2"></i>Centro de Impresión y Reportes
            </h4>
            <p class="text-muted small mb-0">Previsualiza documentos clínicos oficiales y envíalos a impresora o PDF con formato institucional</p>
          </div>
          <button type="button" id="btn-ejecutar-impresion" class="btn btn-samgy px-4 py-2 shadow-sm">
            <i class="bi bi-printer-fill me-2"></i>Imprimir / Guardar PDF
          </button>
        </div>

        <!-- Selector de Tipo de Reporte -->
        <div class="row g-2 mb-3" id="selector-tipo-reporte">
          <div class="col-6 col-lg-3">
            <button type="button" class="btn w-100 text-start p-3 border rounded-3 report-type-btn" data-tipo="estadistico">
              <div class="fw-bold small font-title"><i class="bi bi-bar-chart-line-fill text-info me-2"></i>Causas Frecuentes</div>
              <div class="extra-small text-muted mt-1">Estadísticas y motivos clínicos</div>
            </button>
          </div>
          <div class="col-6 col-lg-3">
            <button type="button" class="btn w-100 text-start p-3 border rounded-3 report-type-btn" data-tipo="estudiantes">
              <div class="fw-bold small font-title"><i class="bi bi-people-fill text-primary me-2"></i>Listado de Estudiantes</div>
              <div class="extra-small text-muted mt-1">Directorio por grado y alertas</div>
            </button>
          </div>
          <div class="col-6 col-lg-3">
            <button type="button" class="btn w-100 text-start p-3 border rounded-3 report-type-btn" data-tipo="atenciones">
              <div class="fw-bold small font-title"><i class="bi bi-journal-medical text-success me-2"></i>Atenciones Clínicas</div>
              <div class="extra-small text-muted mt-1">Bitácora por rango de fechas</div>
            </button>
          </div>
          <div class="col-6 col-lg-3">
            <button type="button" class="btn w-100 text-start p-3 border rounded-3 report-type-btn" data-tipo="ficha">
              <div class="fw-bold small font-title"><i class="bi bi-file-earmark-medical-fill text-danger me-2"></i>Ficha Médica Oficial</div>
              <div class="extra-small text-muted mt-1">Expediente individual completo</div>
            </button>
          </div>
        </div>

        <!-- Filtros Dinámicos del Reporte -->
        <div id="filtros-reporte-bar" class="p-3 bg-light rounded-3 border"></div>
      </div>

      <!-- Hoja de Previsualización Lista para Imprimir -->
      <div class="print-sheet" id="hoja-impresion">
        ${renderSpinner('Preparando documento para impresión...')}
      </div>
    </div>
  `;

  let tipoActual = ['estadistico', 'estudiantes', 'atenciones', 'ficha'].includes(tipoInicial)
    ? tipoInicial
    : 'estadistico';

  // Obtener información institucional segura (solo si es Admin se consulta /configuracion para evitar 403)
  let nombreInstitucion = 'Colegio San Alberto Magno';
  let usuarioNombre = currentUser?.nombre_completo || 'Enfermería Escolar';
  try {
    if (!currentUser) {
      const me = await api.get('/auth/me');
      currentUser = me.data;
      usuarioNombre = currentUser?.nombre_completo || usuarioNombre;
    }
    if (currentUser?.rol === 'Administrador') {
      const conf = await api.get('/configuracion');
      nombreInstitucion = conf.data?.parametros?.nombre_institucion || nombreInstitucion;
    }
  } catch (_) {}

  // Cargar catálogos compartidos (grados y estudiantes)
  let grados = [];
  let estudiantes = [];
  try {
    const [resGrados, resEst] = await Promise.all([
      api.get('/grados'),
      api.get('/estudiantes?limit=200&activo=1')
    ]);
    grados = resGrados.data || [];
    estudiantes = resEst.data || [];
  } catch (err) {
    container.querySelector('#hoja-impresion').innerHTML = renderErrorState('No se pudieron cargar los datos para generar el reporte.');
    return;
  }

  const btnImprimir = container.querySelector('#btn-ejecutar-impresion');
  btnImprimir.addEventListener('click', () => {
    window.print();
  });

  const typeBtns = container.querySelectorAll('.report-type-btn');
  const actualizarBotonesTipo = () => {
    typeBtns.forEach(btn => {
      const esActivo = btn.getAttribute('data-tipo') === tipoActual;
      btn.classList.toggle('bg-samgy-soft', esActivo);
      btn.classList.toggle('border-primary', esActivo);
      btn.classList.toggle('bg-white', !esActivo);
    });
  };

  const renderFiltrosYDocumento = async () => {
    actualizarBotonesTipo();
    const filtrosBar = container.querySelector('#filtros-reporte-bar');
    const hoja = container.querySelector('#hoja-impresion');

    if (tipoActual === 'estadistico') {
      filtrosBar.innerHTML = `
        <div class="d-flex justify-content-between align-items-center small text-muted">
          <span><i class="bi bi-info-circle me-1 text-samgy-primary"></i>Este informe consolida todas las causas clínicas activas, distribución por grados e indicadores de recurrencia.</span>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-refrescar-reporte">
            <i class="bi bi-arrow-clockwise me-1"></i>Actualizar Datos
          </button>
        </div>
      `;
      filtrosBar.querySelector('#btn-refrescar-reporte')?.addEventListener('click', () => {
        cargarDocumentoEstadistico(hoja, { nombreInstitucion, usuarioNombre });
      });
      await cargarDocumentoEstadistico(hoja, { nombreInstitucion, usuarioNombre });
      return;
    }

    if (tipoActual === 'estudiantes') {
      filtrosBar.innerHTML = `
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-4">
            <label class="form-label extra-small fw-bold text-muted mb-1">Filtrar por Grado</label>
            <select id="rep-est-grado" class="form-select form-select-sm">
              <option value="">Todos los Grados (6° a 11°)</option>
              ${grados.map(g => `<option value="${g.id_grado}">${escapeHtml(g.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="col-12 col-md-4">
            <div class="form-check mb-1">
              <input class="form-check-input" type="checkbox" id="rep-est-recurrentes">
              <label class="form-check-label small fw-semibold" for="rep-est-recurrentes">
                Incluir solo pacientes recurrentes (≥ 3 visitas)
              </label>
            </div>
          </div>
          <div class="col-12 col-md-4 text-md-end">
            <button type="button" class="btn btn-samgy btn-sm px-3" id="btn-generar-rep-est">
              <i class="bi bi-funnel me-1"></i>Aplicar al Documento
            </button>
          </div>
        </div>
      `;
      const generar = () => cargarDocumentoEstudiantes(hoja, {
        nombreInstitucion,
        usuarioNombre,
        gradoId: filtrosBar.querySelector('#rep-est-grado').value,
        soloRecurrentes: filtrosBar.querySelector('#rep-est-recurrentes').checked,
        grados
      });
      filtrosBar.querySelector('#rep-est-grado').addEventListener('change', generar);
      filtrosBar.querySelector('#rep-est-recurrentes').addEventListener('change', generar);
      filtrosBar.querySelector('#btn-generar-rep-est').addEventListener('click', generar);
      await generar();
      return;
    }

    if (tipoActual === 'atenciones') {
      filtrosBar.innerHTML = `
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-4">
            <label class="form-label extra-small fw-bold text-muted mb-1">Grado</label>
            <select id="rep-ate-grado" class="form-select form-select-sm">
              <option value="">Todos los Grados</option>
              ${grados.map(g => `<option value="${escapeHtml(g.nombre)}">${escapeHtml(g.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label extra-small fw-bold text-muted mb-1">Desde</label>
            <input type="date" id="rep-ate-desde" class="form-control form-control-sm">
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label extra-small fw-bold text-muted mb-1">Hasta</label>
            <input type="date" id="rep-ate-hasta" class="form-control form-control-sm">
          </div>
          <div class="col-12 col-md-2 text-md-end">
            <button type="button" class="btn btn-samgy btn-sm w-100" id="btn-generar-rep-ate">Aplicar</button>
          </div>
        </div>
      `;
      const generar = () => cargarDocumentoAtenciones(hoja, {
        nombreInstitucion,
        usuarioNombre,
        grado: filtrosBar.querySelector('#rep-ate-grado').value,
        desde: filtrosBar.querySelector('#rep-ate-desde').value,
        hasta: filtrosBar.querySelector('#rep-ate-hasta').value
      });
      filtrosBar.querySelector('#rep-ate-grado').addEventListener('change', generar);
      filtrosBar.querySelector('#btn-generar-rep-ate').addEventListener('click', generar);
      await generar();
      return;
    }

    if (tipoActual === 'ficha') {
      const seleccionado = idEstudianteUrl || (estudiantes[0]?.id_estudiante || '');
      filtrosBar.innerHTML = `
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-8">
            <label class="form-label extra-small fw-bold text-muted mb-1">Seleccionar Estudiante para Imprimir Ficha Oficial</label>
            <select id="rep-ficha-estudiante" class="form-select form-select-sm">
              ${estudiantes.map(e => `
                <option value="${e.id_estudiante}" ${Number(seleccionado) === e.id_estudiante ? 'selected' : ''}>
                  ${escapeHtml(e.nombre_completo)} — ${escapeHtml(e.curso || '')} (${escapeHtml(e.documento || '')})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="col-12 col-md-4 text-md-end">
            <button type="button" class="btn btn-samgy btn-sm px-3" id="btn-generar-rep-ficha">
              <i class="bi bi-file-earmark-medical me-1"></i>Cargar Ficha
            </button>
          </div>
        </div>
      `;
      const selectEst = filtrosBar.querySelector('#rep-ficha-estudiante');
      const generar = () => cargarDocumentoFicha(hoja, {
        nombreInstitucion,
        usuarioNombre,
        idEstudiante: selectEst.value
      });
      selectEst.addEventListener('change', generar);
      filtrosBar.querySelector('#btn-generar-rep-ficha').addEventListener('click', generar);
      if (seleccionado) {
        await generar();
      } else {
        hoja.innerHTML = `<p class="text-muted text-center py-4">No hay estudiantes registrados.</p>`;
      }
    }
  };

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tipoActual = btn.getAttribute('data-tipo');
      renderFiltrosYDocumento();
    });
  });

  await renderFiltrosYDocumento();
}

function crearMembreteHtml({ nombreInstitucion, tituloDocumento, subtituloDocumento, usuarioNombre }) {
  const fechaStr = new Date().toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  return `
    <div class="print-sheet-header d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
      <div class="d-flex align-items-center gap-3">
        <img src="src/logo-samgy.svg" alt="SAMGY" style="height: 52px; width: auto;">
        <div>
          <div class="text-uppercase extra-small fw-bold text-samgy-primary">${escapeHtml(nombreInstitucion)}</div>
          <h4 class="fw-bold font-title text-dark mb-0">${escapeHtml(tituloDocumento)}</h4>
          <div class="small text-muted">${escapeHtml(subtituloDocumento)}</div>
        </div>
      </div>
      <div class="text-sm-end extra-small text-muted">
        <div><strong>Fecha de emisión:</strong> ${escapeHtml(fechaStr)}</div>
        <div><strong>Generado por:</strong> ${escapeHtml(usuarioNombre)}</div>
        <div><strong>Sistema:</strong> SAMGY v1.0</div>
      </div>
    </div>
  `;
}

function crearPieFirmasHtml() {
  return `
    <div class="row mt-5 pt-2">
      <div class="col-6 text-center px-4">
        <div class="print-signature-line small fw-bold text-dark">Enfermería Escolar</div>
        <div class="extra-small text-muted">Profesional Responsable</div>
      </div>
      <div class="col-6 text-center px-4">
        <div class="print-signature-line small fw-bold text-dark">Coordinación / Rectoría</div>
        <div class="extra-small text-muted">Visto Bueno Institucional</div>
      </div>
    </div>
  `;
}

async function cargarDocumentoEstadistico(hoja, meta) {
  hoja.innerHTML = renderSpinner('Generando informe estadístico...');
  if (reportChartInstance) {
    reportChartInstance.destroy();
    reportChartInstance = null;
  }

  try {
    const res = await api.get('/dashboard');
    const data = res.data || {};
    const motivos = data.motivos_frecuentes || [];
    const porGrado = data.atenciones_por_grado || [];
    const totalCausas = motivos.reduce((acc, m) => acc + Number(m.total || 0), 0) || 1;

    hoja.innerHTML = `
      ${crearMembreteHtml({
        nombreInstitucion: meta.nombreInstitucion,
        tituloDocumento: 'Informe Estadístico de Enfermería Escolar',
        subtituloDocumento: 'Causas más frecuentes de atención y distribución por grados',
        usuarioNombre: meta.usuarioNombre
      })}

      <div class="row g-3 mb-4">
        <div class="col-4">
          <div class="p-3 border rounded bg-light text-center">
            <div class="extra-small text-muted text-uppercase fw-bold">Estudiantes Activos</div>
            <div class="fs-3 fw-bold text-samgy-primary tabular-nums">${data.total_estudiantes_activos ?? 0}</div>
          </div>
        </div>
        <div class="col-4">
          <div class="p-3 border rounded bg-light text-center">
            <div class="extra-small text-muted text-uppercase fw-bold">Total Atenciones</div>
            <div class="fs-3 fw-bold text-success tabular-nums">${data.total_atenciones ?? 0}</div>
          </div>
        </div>
        <div class="col-4">
          <div class="p-3 border rounded bg-light text-center">
            <div class="extra-small text-muted text-uppercase fw-bold">Pacientes Recurrentes (≥3)</div>
            <div class="fs-3 fw-bold text-danger tabular-nums">${data.estudiantes_recurrentes ?? 0}</div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-12 col-md-6">
          <h6 class="fw-bold font-title text-dark mb-3">Gráfica de Causas Más Frecuentes</h6>
          <div style="height: 240px; position: relative;">
            <canvas id="report-causas-canvas"></canvas>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <h6 class="fw-bold font-title text-dark mb-3">Tabla de Motivos Clínicos</h6>
          <table class="table table-sm table-bordered align-middle">
            <thead class="table-light">
              <tr>
                <th>Motivo / Síntoma</th>
                <th class="text-center">Casos</th>
                <th class="text-end">%</th>
              </tr>
            </thead>
            <tbody>
              ${motivos.length === 0 ? '<tr><td colspan="3" class="text-center text-muted">Sin registros</td></tr>' :
                motivos.map(m => `
                  <tr>
                    <td class="small fw-semibold">${escapeHtml(m.motivo)}</td>
                    <td class="text-center tabular-nums">${m.total}</td>
                    <td class="text-end tabular-nums">${Math.round((m.total / totalCausas) * 100)}%</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>

      <h6 class="fw-bold font-title text-dark mb-2">Atenciones Acumuladas por Grado</h6>
      <table class="table table-sm table-bordered align-middle mb-4">
        <thead class="table-light">
          <tr>
            ${porGrado.map(g => `<th class="text-center">${escapeHtml(g.grado)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            ${porGrado.map(g => `<td class="text-center fw-bold tabular-nums">${g.total}</td>`).join('')}
          </tr>
        </tbody>
      </table>

      ${crearPieFirmasHtml()}
    `;

    if (motivos.length > 0 && typeof window.Chart === 'function') {
      const ctx = hoja.querySelector('#report-causas-canvas').getContext('2d');
      reportChartInstance = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: motivos.map(m => m.motivo),
          datasets: [{
            label: 'Atenciones',
            data: motivos.map(m => m.total),
            backgroundColor: '#03658C',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }
  } catch (err) {
    hoja.innerHTML = renderErrorState('Error al generar el informe estadístico.');
  }
}

async function cargarDocumentoEstudiantes(hoja, { nombreInstitucion, usuarioNombre, gradoId, soloRecurrentes, grados }) {
  hoja.innerHTML = renderSpinner('Cargando listado de estudiantes...');
  try {
    let url = '/estudiantes?limit=200&activo=1';
    if (gradoId) url += `&grado=${encodeURIComponent(gradoId)}`;

    const res = await api.get(url);
    let lista = res.data || [];
    if (soloRecurrentes) {
      lista = lista.filter(e => e.es_recurrente === 1 || Number(e.total_atenciones || 0) >= 3);
    }

    const gradoObj = grados.find(g => String(g.id_grado) === String(gradoId));
    const filtroDesc = `${gradoObj ? gradoObj.nombre : 'Todos los grados'}${soloRecurrentes ? ' • Solo recurrentes' : ''}`;

    hoja.innerHTML = `
      ${crearMembreteHtml({
        nombreInstitucion,
        tituloDocumento: 'Directorio Médico de Estudiantes',
        subtituloDocumento: `Alcance: ${filtroDesc} (${lista.length} estudiante(s))`,
        usuarioNombre
      })}

      <table class="table table-sm table-bordered align-middle">
        <thead class="table-light">
          <tr>
            <th>Código</th>
            <th>Estudiante</th>
            <th>Documento</th>
            <th>Grado</th>
            <th>Alergias / Condiciones</th>
            <th>Acudiente</th>
            <th class="text-center">Visitas</th>
          </tr>
        </thead>
        <tbody>
          ${lista.length === 0 ? '<tr><td colspan="7" class="text-center text-muted py-4">No hay estudiantes para los criterios seleccionados.</td></tr>' :
            lista.map(e => {
              const total = Number(e.total_atenciones || 0);
              const esRec = e.es_recurrente === 1 || total >= 3;
              return `
                <tr>
                  <td class="extra-small font-monospace">${escapeHtml(e.codigo)}</td>
                  <td class="small fw-bold">${escapeHtml(e.nombre_completo)}</td>
                  <td class="extra-small font-monospace">${escapeHtml(e.documento)}</td>
                  <td class="small">${escapeHtml(e.curso)}</td>
                  <td class="extra-small">${escapeHtml([e.alergias !== 'Ninguna' ? e.alergias : '', e.enfermedades !== 'Ninguna' ? e.enfermedades : ''].filter(Boolean).join(' • ') || 'Ninguna')}</td>
                  <td class="extra-small">${escapeHtml(e.acudiente)} (${escapeHtml(e.contacto)})</td>
                  <td class="text-center small fw-bold ${esRec ? 'text-danger' : ''}">${total}${esRec ? ' ★' : ''}</td>
                </tr>
              `;
            }).join('')
          }
        </tbody>
      </table>
      <div class="extra-small text-muted">Nota: El símbolo ★ indica estudiante recurrente (≥ 3 visitas registradas en enfermería).</div>
      ${crearPieFirmasHtml()}
    `;
  } catch (err) {
    hoja.innerHTML = renderErrorState('Error al cargar el listado de estudiantes.');
  }
}

async function cargarDocumentoAtenciones(hoja, { nombreInstitucion, usuarioNombre, grado, desde, hasta }) {
  hoja.innerHTML = renderSpinner('Cargando historial de atenciones...');
  try {
    let url = '/atenciones?limit=200';
    if (grado) url += `&grado=${encodeURIComponent(grado)}`;
    if (desde) url += `&desde=${encodeURIComponent(desde)}`;
    if (hasta) url += `&hasta=${encodeURIComponent(hasta)}`;

    const res = await api.get(url);
    const lista = res.data || [];

    const rangoTxt = `${grado || 'Todos los grados'} • ${desde || 'Inicio'} a ${hasta || 'Hoy'}`;

    hoja.innerHTML = `
      ${crearMembreteHtml({
        nombreInstitucion,
        tituloDocumento: 'Bitácora Oficial de Atenciones de Enfermería',
        subtituloDocumento: `Filtros: ${rangoTxt} (${lista.length} registro(s))`,
        usuarioNombre
      })}

      <table class="table table-sm table-bordered align-middle">
        <thead class="table-light">
          <tr>
            <th>Código</th>
            <th>Fecha / Hora</th>
            <th>Estudiante</th>
            <th>Grado</th>
            <th>Motivo / Síntomas</th>
            <th>Tratamiento y Observaciones</th>
            <th>Atendido Por</th>
          </tr>
        </thead>
        <tbody>
          ${lista.length === 0 ? '<tr><td colspan="7" class="text-center text-muted py-4">No se encontraron atenciones para este filtro.</td></tr>' :
            lista.map(a => `
              <tr>
                <td class="extra-small font-monospace">${escapeHtml(a.codigo_atencion)}</td>
                <td class="extra-small text-nowrap">${escapeHtml(a.fecha_hora)}</td>
                <td class="small fw-bold">${escapeHtml(a.nombre_estudiante)}</td>
                <td class="extra-small">${escapeHtml(a.curso)}</td>
                <td class="small fw-semibold">${escapeHtml(a.motivo_sintomas)}</td>
                <td class="extra-small">
                  <div><strong>Tx:</strong> ${escapeHtml(a.tratamiento)}</div>
                  <div class="text-muted">${escapeHtml(a.observaciones_diagnostico)}</div>
                </td>
                <td class="extra-small">${escapeHtml(a.atendido_por)}</td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
      ${crearPieFirmasHtml()}
    `;
  } catch (err) {
    hoja.innerHTML = renderErrorState('Error al cargar el historial de atenciones.');
  }
}

async function cargarDocumentoFicha(hoja, { nombreInstitucion, usuarioNombre, idEstudiante }) {
  hoja.innerHTML = renderSpinner('Cargando ficha médica oficial...');
  try {
    const res = await api.get(`/estudiantes/${idEstudiante}/ficha`);
    const data = res.data;
    const e = data.estudiante || {};
    const acudientes = data.acudientes || [];
    const alergias = data.alergias || [];
    const condiciones = data.condiciones || [];
    const atenciones = data.ultimas_atenciones || [];

    hoja.innerHTML = `
      ${crearMembreteHtml({
        nombreInstitucion,
        tituloDocumento: 'Ficha Médica Individual del Estudiante',
        subtituloDocumento: `Código: ${e.codigo || ''} • Grado: ${e.grado || ''}`,
        usuarioNombre
      })}

      <div class="row g-3 mb-4">
        <div class="col-12 col-md-7">
          <div class="p-3 border rounded bg-light h-100">
            <h6 class="fw-bold font-title text-samgy-primary border-bottom pb-2 mb-2">1. Identificación del Estudiante</h6>
            <div class="row small g-1">
              <div class="col-5 text-muted">Nombre completo:</div>
              <div class="col-7 fw-bold">${escapeHtml(e.nombre_completo)}</div>
              <div class="col-5 text-muted">Documento:</div>
              <div class="col-7 font-monospace">${escapeHtml(e.tipo_documento)} ${escapeHtml(e.numero_documento)}</div>
              <div class="col-5 text-muted">Edad / Grado:</div>
              <div class="col-7">${escapeHtml(e.edad ? e.edad + ' años' : 'N/A')} — ${escapeHtml(e.grado)}</div>
              <div class="col-5 text-muted">Dirección / Correo:</div>
              <div class="col-7">${escapeHtml(e.direccion || 'N/A')} ${e.correo ? '• ' + escapeHtml(e.correo) : ''}</div>
              <div class="col-5 text-muted">Grupo Sanguíneo / EPS:</div>
              <div class="col-7 fw-bold text-danger">${escapeHtml(data.ficha_medica?.grupo_sanguineo || 'N/A')} <span class="text-dark fw-normal">— ${escapeHtml(data.ficha_medica?.eps || 'Sin EPS')}</span></div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-5">
          <div class="p-3 border rounded bg-light h-100">
            <h6 class="fw-bold font-title text-samgy-primary border-bottom pb-2 mb-2">2. Acudiente y Seguimiento</h6>
            ${acudientes.map(ac => `
              <div class="small mb-2">
                <div class="fw-bold">${escapeHtml(ac.nombre_completo)} (${escapeHtml(ac.parentesco || 'Tutor')})</div>
                <div>Tel: <strong>${escapeHtml(ac.telefono)}</strong></div>
              </div>
            `).join('')}
            <div class="mt-3 pt-2 border-top small">
              <strong>Total visitas registradas:</strong> ${data.total_visitas ?? 0}
              <span class="badge ${data.es_recurrente ? 'bg-danger text-white' : 'bg-secondary text-white'} ms-1">
                ${data.es_recurrente ? 'Paciente Recurrente' : 'Regular'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 border rounded mb-4">
        <h6 class="fw-bold font-title text-danger border-bottom pb-2 mb-2">3. Alertas Médicas, Alergias y Condiciones</h6>
        <p class="small mb-1"><strong>Alergias:</strong> ${alergias.length ? alergias.map(a => `${escapeHtml(a.tipo || 'General')}: ${escapeHtml(a.descripcion)}`).join(' | ') : 'Ninguna documentada'}</p>
        <p class="small mb-1"><strong>Condiciones médicas:</strong> ${condiciones.length ? condiciones.map(c => `${escapeHtml(c.nombre)} (${escapeHtml(c.descripcion || '')})`).join(' | ') : 'Ninguna documentada'}</p>
        <p class="small mb-0"><strong>Observaciones generales:</strong> ${escapeHtml(data.ficha_medica?.observaciones_generales || 'Sin observaciones adicionales.')}</p>
      </div>

      <h6 class="fw-bold font-title text-dark mb-2">4. Historial Reciente de Atenciones</h6>
      <table class="table table-sm table-bordered align-middle">
        <thead class="table-light">
          <tr>
            <th>Código</th>
            <th>Fecha</th>
            <th>Motivo / Síntomas</th>
            <th>Diagnóstico y Tratamiento</th>
            <th>Atendido Por</th>
          </tr>
        </thead>
        <tbody>
          ${atenciones.length === 0 ? '<tr><td colspan="5" class="text-center text-muted py-3">Sin atenciones registradas.</td></tr>' :
            atenciones.map(a => `
              <tr>
                <td class="extra-small font-monospace">${escapeHtml(a.codigo)}</td>
                <td class="extra-small text-nowrap">${escapeHtml(a.fecha_hora)}</td>
                <td class="small fw-semibold">${escapeHtml(a.motivo_sintomas)}</td>
                <td class="extra-small">
                  <div><strong>Dx:</strong> ${escapeHtml(a.observaciones_diagnostico)}</div>
                  <div><strong>Tx:</strong> ${escapeHtml(a.tratamiento)}</div>
                </td>
                <td class="extra-small">${escapeHtml(a.atendido_por)}</td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>

      ${crearPieFirmasHtml()}
    `;
  } catch (err) {
    hoja.innerHTML = renderErrorState('No fue posible generar la ficha médica imprimible.');
  }
}
