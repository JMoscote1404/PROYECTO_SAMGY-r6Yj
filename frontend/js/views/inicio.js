import { api } from '../api.js';
import { escapeHtml } from '../ui.js';

let causasChartInstance = null;
let secundariaChartInstance = null;
let tipoGraficaCausas = 'bar';
let tipoGraficaSecundaria = 'grado';
let dashboardCache = null;

const PALETA_CAUSAS = [
  '#03658C',
  '#4FB3D9',
  '#0F9D8A',
  '#F59E0B',
  '#EF4444',
  '#6366F1',
  '#EC4899',
  '#64748B'
];

const EQUIPO_SAMGY = [
  {
    nombre: 'Gabriela Martínez',
    rol: 'Líder de Proyecto & UI',
    avatar: 'src/avatars/avatar-gabriela.png'
  },
  {
    nombre: 'Sajoha Vásquez',
    rol: 'Diseño & Experiencia',
    avatar: 'src/avatars/avatar-sajoha.png'
  },
  {
    nombre: 'Andrea Pallares',
    rol: 'Análisis & Documentación',
    avatar: 'src/avatars/avatar-andrea.png'
  },
  {
    nombre: 'Yaricel Bayter',
    rol: 'Calidad & Validación',
    avatar: 'src/avatars/avatar-yaricel.png'
  },
  {
    nombre: 'Mathias Hernández',
    rol: 'Arquitectura & Datos',
    avatar: 'src/avatars/avatar-mathias.png'
  }
];

export async function renderInicioView(container) {
  container.innerHTML = `
    <div class="container-fluid p-0">
        <!-- Hero Jumbotron con Gradiente Editorial de Marca -->
        <div class="p-4 p-md-5 mb-4 text-white hero-samgy">
            <div class="container-fluid py-1 position-relative" style="z-index: 1;">
                <div class="d-inline-flex align-items-center gap-2 badge bg-white text-dark mb-3 px-3 py-2 fw-bold text-uppercase shadow-sm">
                    <i class="bi bi-building text-samgy-primary"></i> Colegio San Alberto Magno
                </div>
                <h1 class="display-6 fw-bold font-title mb-2">Sistema de Gestión de Enfermería Escolar (SAMGY)</h1>
                <p class="col-lg-9 fs-6 mt-2 mb-0 opacity-90 leading-relaxed">
                    Plataforma digital para el registro clínico, control sanitario preventivo, seguimiento de causas frecuentes y fichas médicas de los estudiantes.
                </p>
                <div class="d-flex flex-wrap gap-2 mt-4 no-print">
                    <a href="#/estudiantes" class="btn btn-light btn-md fw-bold text-samgy-primary shadow-sm px-3">
                        <i class="bi bi-people-fill me-2"></i>Mis Estudiantes
                    </a>
                    <a href="#/atenciones" class="btn btn-info btn-md text-white fw-bold bg-samgy-info border-0 shadow-sm px-3">
                        <i class="bi bi-journal-plus me-2"></i>Nueva Atención
                    </a>
                    <a href="#/reportes?tipo=estadistico" class="btn btn-outline-light btn-md fw-semibold px-3">
                        <i class="bi bi-printer-fill me-2"></i>Imprimir Reporte
                    </a>
                </div>
            </div>
        </div>

        <!-- Fila de 3 KPIs Principales -->
        <div class="row g-3 mb-4">
            <div class="col-12 col-md-4">
                <div class="kpi-card p-3 shadow-sm h-100 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="kpi-icon-box bg-samgy-soft text-samgy-primary">
                            <i class="bi bi-mortarboard-fill"></i>
                        </div>
                        <div>
                            <div class="text-uppercase text-muted extra-small fw-bold">Estudiantes Matriculados</div>
                            <div class="fs-3 fw-bold text-dark tabular-nums" id="stat-total-estudiantes">
                                <span class="spinner-border spinner-border-sm text-secondary"></span>
                            </div>
                        </div>
                    </div>
                    <span class="badge bg-light text-muted border extra-small">Activos</span>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="kpi-card p-3 shadow-sm h-100 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="kpi-icon-box bg-success bg-opacity-10 text-success">
                            <i class="bi bi-heart-pulse-fill"></i>
                        </div>
                        <div>
                            <div class="text-uppercase text-muted extra-small fw-bold">Atenciones Registradas</div>
                            <div class="fs-3 fw-bold text-dark tabular-nums" id="stat-total-atenciones">
                                <span class="spinner-border spinner-border-sm text-secondary"></span>
                            </div>
                        </div>
                    </div>
                    <span class="badge bg-success-subtle text-success extra-small">Historial</span>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="kpi-card p-3 shadow-sm h-100 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="kpi-icon-box bg-danger bg-opacity-10 text-danger">
                            <i class="bi bi-exclamation-triangle-fill"></i>
                        </div>
                        <div>
                            <div class="text-uppercase text-muted extra-small fw-bold">Alumnos Recurrentes (≥3)</div>
                            <div class="fs-3 fw-bold text-dark tabular-nums" id="stat-recurrentes">
                                <span class="spinner-border spinner-border-sm text-secondary"></span>
                            </div>
                        </div>
                    </div>
                    <span class="badge bg-danger-subtle text-danger extra-small">Alerta</span>
                </div>
            </div>
        </div>

        <!-- Nueva Sección Analítica: Gráficas de Causas Más Frecuentes y Distribución -->
        <div class="row g-4 mb-4">
            <div class="col-12 col-lg-7">
                <div class="card card-samgy p-4 h-100">
                    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 border-bottom pb-3 mb-3">
                        <div>
                            <h5 class="fw-bold font-title text-dark mb-0">
                                <i class="bi bi-bar-chart-fill text-samgy-primary me-2"></i>Causas Más Frecuentes en Enfermería
                            </h5>
                            <span class="text-muted extra-small">Motivos de consulta clínica con mayor incidencia escolar</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 no-print">
                            <div class="btn-group btn-group-sm" role="group" aria-label="Tipo de gráfica de causas">
                                <button type="button" class="btn btn-samgy active" id="btn-chart-bar" title="Gráfica de barras">
                                    <i class="bi bi-bar-chart-steps me-1"></i>Barras
                                </button>
                                <button type="button" class="btn btn-outline-secondary" id="btn-chart-doughnut" title="Gráfica circular">
                                    <i class="bi bi-pie-chart-fill me-1"></i>Circular
                                </button>
                            </div>
                            <a href="#/reportes?tipo=estadistico" class="btn btn-outline-secondary btn-sm" title="Imprimir reporte estadístico">
                                <i class="bi bi-printer"></i>
                            </a>
                        </div>
                    </div>

                    <div id="causas-chart-container" class="chart-canvas-wrapper">
                        <canvas id="chart-causas-frecuentes"></canvas>
                    </div>
                    <div id="causas-resumen-pills" class="d-flex flex-wrap gap-2 mt-3 pt-2 border-top"></div>
                </div>
            </div>

            <div class="col-12 col-lg-5">
                <div class="card card-samgy p-4 h-100">
                    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 border-bottom pb-3 mb-3">
                        <div>
                            <h5 class="fw-bold font-title text-dark mb-0">
                                <i class="bi bi-activity text-samgy-primary me-2"></i>Comportamiento Escolar
                            </h5>
                            <span class="text-muted extra-small" id="subtitulo-grafica-secundaria">Atenciones agrupadas por grado</span>
                        </div>
                        <div class="btn-group btn-group-sm no-print" role="group" aria-label="Selector de gráfica secundaria">
                            <button type="button" class="btn btn-samgy active" id="btn-sec-grado">Por Grado</button>
                            <button type="button" class="btn btn-outline-secondary" id="btn-sec-tendencia">30 Días</button>
                        </div>
                    </div>

                    <div id="secundaria-chart-container" class="chart-canvas-wrapper">
                        <canvas id="chart-distribucion-secundaria"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Carrusel Interactivo Institucional -->
        <div class="card card-samgy overflow-hidden shadow-sm mb-4">
            <div id="carouselSamgy" class="carousel slide" data-bs-ride="carousel" data-bs-interval="5000">
                <div class="carousel-indicators">
                    <button type="button" data-bs-target="#carouselSamgy" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
                    <button type="button" data-bs-target="#carouselSamgy" data-bs-slide-to="1" aria-label="Slide 2"></button>
                    <button type="button" data-bs-target="#carouselSamgy" data-bs-slide-to="2" aria-label="Slide 3"></button>
                </div>
                <div class="carousel-inner">
                    <div class="carousel-item active">
                        <img src="src/colegio-campus.jpg" class="d-block w-100" alt="Campus Colegio San Alberto Magno" style="max-height: 360px; object-fit: cover;">
                        <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-75 rounded-3 p-3 text-start mb-3" style="max-width: 640px;">
                            <h5 class="fw-bold font-title text-white"><i class="bi bi-building me-2 text-samgy-info"></i>Colegio San Alberto Magno</h5>
                            <p class="small mb-0 text-white-50">Instalaciones seguras y preparadas para el bienestar integral y cuidado de los alumnos.</p>
                        </div>
                    </div>
                    <div class="carousel-item">
                        <img src="src/enfermeria-atencion.jpg" class="d-block w-100" alt="Servicio de Enfermería Escolar" style="max-height: 360px; object-fit: cover;">
                        <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-75 rounded-3 p-3 text-start mb-3" style="max-width: 640px;">
                            <h5 class="fw-bold font-title text-white"><i class="bi bi-heart-pulse-fill me-2 text-samgy-info"></i>Atención Inmediata y Segura</h5>
                            <p class="small mb-0 text-white-50">Registro diario de visitas, suministro de primeros auxilios y protocolos de salud escolar.</p>
                        </div>
                    </div>
                    <div class="carousel-item">
                        <img src="src/interfaz-samgy.jpg" class="d-block w-100" alt="Interfaz SAMGY" style="max-height: 360px; object-fit: cover;">
                        <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-75 rounded-3 p-3 text-start mb-3" style="max-width: 640px;">
                            <h5 class="fw-bold font-title text-white"><i class="bi bi-laptop me-2 text-samgy-info"></i>Sistematización y Monitoreo</h5>
                            <p class="small mb-0 text-white-50">Detección oportuna de pacientes recurrentes, trazabilidad inmutable y fichas médicas al día.</p>
                        </div>
                    </div>
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselSamgy" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Anterior</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselSamgy" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Siguiente</span>
                </button>
            </div>
        </div>

        <!-- Propósito, Objetivos Operacionales y Relevancia -->
        <div class="card card-samgy p-4 shadow-sm mb-4">
            <h5 class="fw-bold font-title text-dark border-bottom pb-3 mb-3">
                <i class="bi bi-file-earmark-medical-fill text-samgy-primary me-2"></i>Propósito y Objetivos de SAMGY
            </h5>
            <p class="text-muted leading-relaxed mb-3">
                <strong>SAMGY</strong> es el Sistema de Gestión de Enfermería Escolar diseñado a la medida para el <strong>Colegio San Alberto Magno</strong>. Su propósito es digitalizar, centralizar y salvaguardar el historial médico y las intervenciones sanitarias que ocurren a diario en el plantel educativo.
            </p>
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="p-3 rounded-3 border bg-light h-100">
                        <h6 class="fw-bold text-dark font-title mb-2">
                            <i class="bi bi-check-circle-fill text-samgy-primary me-2"></i>Objetivos Operacionales
                        </h6>
                        <ul class="small text-muted ps-3 mb-0">
                            <li>Registro rápido de atenciones con validación en tiempo real.</li>
                            <li>Gestión ágil de fichas clínicas individuales y contactos de emergencia.</li>
                            <li>Identificación inmediata de alertas por alergias y afecciones crónicas.</li>
                            <li>Trazabilidad inmutable de tratamientos, reportes e impresión institucional.</li>
                        </ul>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-3 rounded-3 border bg-light h-100">
                        <h6 class="fw-bold text-dark font-title mb-2">
                            <i class="bi bi-shield-fill-check text-samgy-primary me-2"></i>Relevancia Sistematizada
                        </h6>
                        <p class="small text-muted mb-0 leading-relaxed">
                            El registro oportuno permite detectar patrones en alumnos con consultas frecuentes (<span class="fw-semibold text-dark">pacientes recurrentes</span>) y analizar las causas médicas predominantes, facilitando la prevención temprana y la comunicación con acudientes.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Sección "Sobre Nosotros" — Equipo de Trabajo con Avatares Ilustrados (4 mujeres y 1 hombre) -->
        <div class="card card-samgy p-4 shadow-sm mb-4">
            <div class="border-bottom pb-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                <div>
                    <h5 class="fw-bold font-title text-dark mb-1">
                        <i class="bi bi-people-fill text-samgy-primary me-2"></i>Sobre Nosotros — Equipo de Trabajo
                    </h5>
                    <p class="text-muted small mb-0">Desarrollo y diseño del aplicativo web SAMGY para el Colegio San Alberto Magno</p>
                </div>
                <span class="badge bg-samgy-soft text-samgy-primary px-3 py-2 fw-semibold">5 Integrantes</span>
            </div>

            <div class="row g-3 row-cols-2 row-cols-sm-3 row-cols-lg-5 justify-content-center">
                ${EQUIPO_SAMGY.map(miembro => `
                  <div class="col text-center">
                    <div class="team-avatar-card">
                      <div class="team-avatar-ring">
                        <img src="${escapeHtml(miembro.avatar)}" alt="Avatar de ${escapeHtml(miembro.nombre)}" class="team-avatar-img">
                      </div>
                      <div class="fw-bold text-dark small font-title">${escapeHtml(miembro.nombre)}</div>
                      <div class="text-muted extra-small mt-1">${escapeHtml(miembro.rol)}</div>
                    </div>
                  </div>
                `).join('')}
            </div>
        </div>
    </div>
  `;

  // Listeners para cambiar tipo de gráfica
  const btnBar = container.querySelector('#btn-chart-bar');
  const btnDoughnut = container.querySelector('#btn-chart-doughnut');
  const btnSecGrado = container.querySelector('#btn-sec-grado');
  const btnSecTendencia = container.querySelector('#btn-sec-tendencia');

  btnBar?.addEventListener('click', () => {
    tipoGraficaCausas = 'bar';
    btnBar.className = 'btn btn-samgy active';
    btnDoughnut.className = 'btn btn-outline-secondary';
    renderGraficaCausas(container, dashboardCache);
  });

  btnDoughnut?.addEventListener('click', () => {
    tipoGraficaCausas = 'doughnut';
    btnDoughnut.className = 'btn btn-samgy active';
    btnBar.className = 'btn btn-outline-secondary';
    renderGraficaCausas(container, dashboardCache);
  });

  btnSecGrado?.addEventListener('click', () => {
    tipoGraficaSecundaria = 'grado';
    btnSecGrado.className = 'btn btn-samgy active';
    btnSecTendencia.className = 'btn btn-outline-secondary';
    const sub = container.querySelector('#subtitulo-grafica-secundaria');
    if (sub) sub.textContent = 'Atenciones agrupadas por grado';
    renderGraficaSecundaria(container, dashboardCache);
  });

  btnSecTendencia?.addEventListener('click', () => {
    tipoGraficaSecundaria = 'tendencia';
    btnSecTendencia.className = 'btn btn-samgy active';
    btnSecGrado.className = 'btn btn-outline-secondary';
    const sub = container.querySelector('#subtitulo-grafica-secundaria');
    if (sub) sub.textContent = 'Volumen diario de consultas (últimos 30 días)';
    renderGraficaSecundaria(container, dashboardCache);
  });

  // Cargar métricas del dashboard desde la API
  try {
    const res = await api.get('/dashboard');
    dashboardCache = res.data || {};

    const elEst = container.querySelector('#stat-total-estudiantes');
    const elAte = container.querySelector('#stat-total-atenciones');
    const elRec = container.querySelector('#stat-recurrentes');

    if (elEst) elEst.textContent = dashboardCache.total_estudiantes_activos ?? 0;
    if (elAte) elAte.textContent = dashboardCache.total_atenciones ?? 0;
    if (elRec) elRec.textContent = dashboardCache.estudiantes_recurrentes ?? 0;

    renderGraficaCausas(container, dashboardCache);
    renderGraficaSecundaria(container, dashboardCache);
  } catch (error) {
    console.error('Error al cargar métricas de inicio:', error);
  }
}

function renderGraficaCausas(container, data) {
  const wrapper = container.querySelector('#causas-chart-container');
  const pillsEl = container.querySelector('#causas-resumen-pills');
  if (!wrapper || !data) return;

  const motivos = data.motivos_frecuentes || [];
  if (causasChartInstance) {
    causasChartInstance.destroy();
    causasChartInstance = null;
  }

  if (motivos.length === 0) {
    wrapper.innerHTML = `<div class="h-100 d-flex flex-column align-items-center justify-content-center text-muted small">
      <i class="bi bi-bar-chart fs-1 mb-2 opacity-50"></i>No hay suficientes registros clínicos para graficar.
    </div>`;
    if (pillsEl) pillsEl.innerHTML = '';
    return;
  }

  if (!wrapper.querySelector('#chart-causas-frecuentes')) {
    wrapper.innerHTML = `<canvas id="chart-causas-frecuentes"></canvas>`;
  }

  const totalGeneral = motivos.reduce((acc, m) => acc + Number(m.total || 0), 0) || 1;
  if (pillsEl) {
    pillsEl.innerHTML = motivos.slice(0, 4).map((m, idx) => {
      const pct = Math.round((m.total / totalGeneral) * 100);
      return `
        <span class="badge bg-light text-dark border py-1 px-2 extra-small d-inline-flex align-items-center gap-1">
          <span style="width:8px; height:8px; border-radius:50%; background:${PALETA_CAUSAS[idx % PALETA_CAUSAS.length]}; display:inline-block;"></span>
          <span>${escapeHtml(m.motivo)}:</span>
          <strong>${m.total} (${pct}%)</strong>
        </span>
      `;
    }).join('');
  }

  if (typeof window.Chart !== 'function') return;

  const ctx = wrapper.querySelector('#chart-causas-frecuentes').getContext('2d');
  const labels = motivos.map(m => m.motivo);
  const values = motivos.map(m => m.total);
  const colors = motivos.map((_, i) => PALETA_CAUSAS[i % PALETA_CAUSAS.length]);

  const isDoughnut = tipoGraficaCausas === 'doughnut';

  causasChartInstance = new window.Chart(ctx, {
    type: isDoughnut ? 'doughnut' : 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Atenciones',
        data: values,
        backgroundColor: colors,
        borderColor: isDoughnut ? '#ffffff' : colors,
        borderWidth: isDoughnut ? 2 : 0,
        borderRadius: isDoughnut ? 0 : 8,
        maxBarThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isDoughnut ? 'x' : 'y',
      cutout: isDoughnut ? '58%' : undefined,
      plugins: {
        legend: {
          display: isDoughnut,
          position: 'right',
          labels: {
            boxWidth: 12,
            font: { size: 11, family: 'Open Sans' }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctxItem) => {
              const val = Number(ctxItem.raw || 0);
              const pct = Math.round((val / totalGeneral) * 100);
              return ` ${val} atención(es) (${pct}%)`;
            }
          }
        }
      },
      scales: isDoughnut ? {} : {
        x: {
          beginAtZero: true,
          ticks: { precision: 0, font: { size: 11 } },
          grid: { color: '#f1f5f9' }
        },
        y: {
          ticks: { font: { size: 11, weight: '600' }, color: '#334155' },
          grid: { display: false }
        }
      }
    }
  });
}

function renderGraficaSecundaria(container, data) {
  const wrapper = container.querySelector('#secundaria-chart-container');
  if (!wrapper || !data) return;

  if (secundariaChartInstance) {
    secundariaChartInstance.destroy();
    secundariaChartInstance = null;
  }

  if (!wrapper.querySelector('#chart-distribucion-secundaria')) {
    wrapper.innerHTML = `<canvas id="chart-distribucion-secundaria"></canvas>`;
  }

  if (typeof window.Chart !== 'function') return;

  const ctx = wrapper.querySelector('#chart-distribucion-secundaria').getContext('2d');

  if (tipoGraficaSecundaria === 'grado') {
    const porGrado = data.atenciones_por_grado || [];
    if (porGrado.length === 0) {
      wrapper.innerHTML = `<div class="h-100 d-flex align-items-center justify-content-center text-muted small">Sin datos por grado.</div>`;
      return;
    }

    secundariaChartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: porGrado.map(g => g.grado.replace('Grado ', '')),
        datasets: [{
          label: 'Atenciones',
          data: porGrado.map(g => g.total),
          backgroundColor: '#4FB3D9',
          hoverBackgroundColor: '#03658C',
          borderRadius: 8,
          maxBarThickness: 34
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 11 } },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { size: 11, weight: '600' }, color: '#334155' },
            grid: { display: false }
          }
        }
      }
    });
  } else {
    const serie = data.atenciones_ultimos_30_dias || [];
    if (serie.length === 0) {
      wrapper.innerHTML = `<div class="h-100 d-flex align-items-center justify-content-center text-muted small">Sin atenciones en los últimos 30 días.</div>`;
      return;
    }

    secundariaChartInstance = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: serie.map(s => s.fecha.slice(5)),
        datasets: [{
          label: 'Consultas diarias',
          data: serie.map(s => s.total),
          borderColor: '#03658C',
          backgroundColor: 'rgba(79, 179, 217, 0.22)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#03658C',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 11 } },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { size: 10 }, color: '#475569' },
            grid: { display: false }
          }
        }
      }
    });
  }
}
