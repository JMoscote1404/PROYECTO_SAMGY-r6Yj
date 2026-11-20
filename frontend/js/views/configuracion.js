import { api } from '../api.js';
import { escapeHtml, showToast, renderSpinner, renderErrorState } from '../ui.js';

let usuariosCache = [];

export async function renderConfiguracionView(container) {
  container.innerHTML = `
    <div class="container-fluid p-0">
        <div class="row g-4">
            <!-- Columna Izquierda: Mi Cuenta y Cambio de Contraseña -->
            <div class="col-12 col-lg-5">
                <!-- Mi Cuenta / Perfil -->
                <div class="card card-samgy p-4 text-center shadow-sm mb-4">
                    <div class="avatar-initials fs-3 mx-auto mb-3" id="config-user-avatar" style="width:75px; height:75px; background-color: var(--samgy-primary);">--</div>
                    <h5 class="fw-bold font-title text-dark mb-0" id="config-user-name">Cargando...</h5>
                    <p class="text-muted small mb-2" id="config-user-email">...</p>
                    <div><span class="badge bg-success-subtle text-success fw-bold px-3 py-1" id="config-user-role">...</span></div>

                    <div class="text-start mt-4 pt-3 border-top">
                        <div class="row small mb-2">
                            <div class="col-5 text-muted fw-semibold">Nombre:</div>
                            <div class="col-7 text-dark fw-bold" id="profile-text-name">...</div>
                        </div>
                        <div class="row small mb-2">
                            <div class="col-5 text-muted fw-semibold">Correo:</div>
                            <div class="col-7 text-dark" id="profile-text-email">...</div>
                        </div>
                        <div class="row small">
                            <div class="col-5 text-muted fw-semibold">Rol Asignado:</div>
                            <div class="col-7 text-dark fw-semibold" id="profile-text-role">...</div>
                        </div>
                    </div>
                </div>

                <!-- Cambio de Contraseña -->
                <div class="card card-samgy p-4 shadow-sm">
                    <h6 class="fw-bold font-title text-dark mb-3">
                        <i class="bi bi-key-fill text-samgy-primary me-2"></i>Cambiar Contraseña
                    </h6>

                    <form id="form-cambiar-password" novalidate>
                        <div class="mb-3">
                            <label for="pwd-actual" class="form-label small fw-bold text-muted">Contraseña Actual *</label>
                            <input type="password" id="pwd-actual" class="form-control form-control-sm" required autocomplete="current-password">
                            <div class="invalid-feedback">Ingresa tu contraseña actual.</div>
                        </div>

                        <div class="mb-3">
                            <label for="pwd-nueva" class="form-label small fw-bold text-muted">Nueva Contraseña (mínimo 10 caracteres) *</label>
                            <input type="password" id="pwd-nueva" class="form-control form-control-sm" required minlength="10" autocomplete="new-password">
                            <div class="invalid-feedback">La nueva contraseña debe tener mínimo 10 caracteres.</div>
                        </div>

                        <div class="mb-3">
                            <label for="pwd-confirmar" class="form-label small fw-bold text-muted">Confirmar Nueva Contraseña *</label>
                            <input type="password" id="pwd-confirmar" class="form-control form-control-sm" required minlength="10" autocomplete="new-password">
                            <div class="invalid-feedback">Confirma tu contraseña nueva.</div>
                        </div>

                        <div id="pwd-error-alert" class="alert alert-danger py-2 small d-none"></div>

                        <button type="submit" id="btn-cambiar-pwd" class="btn btn-samgy w-100 py-2 shadow-sm">
                            <i class="bi bi-shield-lock me-1"></i>Actualizar Contraseña
                        </button>
                    </form>
                </div>
            </div>

            <!-- Columna Derecha: Ajustes del Sistema y Gestión de Usuarios (Admin) -->
            <div class="col-12 col-lg-7">
                <!-- Parámetros Institucionales y Umbral de Recurrencia -->
                <div class="card card-samgy p-4 shadow-sm mb-4">
                    <h5 class="fw-bold font-title text-dark border-bottom pb-3 mb-3">
                        <i class="bi bi-sliders text-samgy-primary me-2"></i>Parámetros Institucionales y Alertas
                    </h5>
                    
                    <div id="config-institucion-container">
                        ${renderSpinner('Cargando ajustes...')}
                    </div>
                </div>

                <!-- Gestión de Usuarios y Roles (Solo Administrador) -->
                <div class="card card-samgy p-4 shadow-sm" id="card-gestion-usuarios">
                    <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                        <h5 class="fw-bold font-title text-dark mb-0">
                            <i class="bi bi-people-fill text-samgy-primary me-2"></i>Gestión de Usuarios y Roles
                        </h5>
                        <button class="btn btn-samgy btn-sm" id="btn-abrir-modal-usuario">
                            <i class="bi bi-person-plus-fill me-1"></i>Nuevo Usuario
                        </button>
                    </div>

                    <div id="usuarios-table-container">
                        ${renderSpinner('Cargando usuarios...')}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Crear Usuario -->
    <div class="modal fade" id="modal-crear-usuario" tabindex="-1" aria-labelledby="modalCrearUsuarioLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-samgy-primary text-white">
                    <h5 class="modal-title font-title" id="modalCrearUsuarioLabel">
                        <i class="bi bi-person-plus-fill me-2"></i>Crear Nuevo Usuario
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body p-4">
                    <form id="form-crear-usuario" novalidate>
                        <div class="mb-3">
                            <label for="usr-nombre" class="form-label small fw-bold text-muted">Nombre Completo *</label>
                            <input type="text" class="form-control form-control-sm" id="usr-nombre" required minlength="3">
                            <div class="invalid-feedback">Ingresa el nombre completo (mínimo 3 caracteres).</div>
                        </div>

                        <div class="mb-3">
                            <label for="usr-email" class="form-label small fw-bold text-muted">Correo Institucional *</label>
                            <input type="email" class="form-control form-control-sm" id="usr-email" placeholder="usuario@sanalbertomagno.edu.co" required>
                            <div class="invalid-feedback">Ingresa un correo válido.</div>
                        </div>

                        <div class="mb-3">
                            <label for="usr-password" class="form-label small fw-bold text-muted">Contraseña Temporal (mínimo 10 caracteres) *</label>
                            <input type="password" class="form-control form-control-sm" id="usr-password" required minlength="10">
                            <div class="invalid-feedback">La contraseña debe tener al menos 10 caracteres.</div>
                        </div>

                        <div class="mb-3">
                            <label for="usr-rol" class="form-label small fw-bold text-muted">Rol en la Plataforma *</label>
                            <select class="form-select form-select-sm" id="usr-rol" required>
                                <option value="2">Enfermería (Atención diaria y fichas)</option>
                                <option value="1">Administrador (Control total del sistema)</option>
                            </select>
                        </div>

                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="usr-cambiar-pwd" checked>
                            <label class="form-check-label small" for="usr-cambiar-pwd">
                                Exigir cambio de contraseña en el primer inicio de sesión
                            </label>
                        </div>

                        <div id="usr-modal-error" class="alert alert-danger py-2 small d-none"></div>

                        <div class="modal-footer px-0 pb-0 mt-3">
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" id="btn-guardar-usr" class="btn btn-samgy btn-sm px-4">
                                <i class="bi bi-save me-1"></i>Crear Usuario
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
  `;

  // Cargar perfil actual
  let esAdmin = false;
  try {
    const resUser = await api.get('/auth/me');
    const u = resUser.data;
    if (u) {
      esAdmin = (u.rol === 'Administrador');
      container.querySelector('#config-user-name').textContent = u.nombre_completo || u.email;
      container.querySelector('#config-user-email').textContent = u.email;
      container.querySelector('#config-user-role').textContent = u.rol;
      container.querySelector('#profile-text-name').textContent = u.nombre_completo || 'N/A';
      container.querySelector('#profile-text-email').textContent = u.email;
      container.querySelector('#profile-text-role').textContent = u.rol;

      const initials = (u.nombre_completo || u.email).split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
      container.querySelector('#config-user-avatar').textContent = initials || 'US';
    }
  } catch (err) {
    console.error('Error al cargar datos del usuario:', err);
  }

  // Cargar configuración institucional y umbral de recurrencia
  const configContainer = container.querySelector('#config-institucion-container');
  if (esAdmin) {
    try {
      const resConf = await api.get('/configuracion');
      const params = resConf.data?.parametros || {};

      configContainer.innerHTML = `
        <form id="form-configuracion" novalidate>
          <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Nombre de la Institución *</label>
              <input type="text" name="nombre_institucion" class="form-control form-control-sm" value="${escapeHtml(params.nombre_institucion || 'Colegio San Alberto Magno')}" required>
          </div>
          <div class="row g-2 mb-3">
              <div class="col-md-6">
                  <label class="form-label small fw-bold text-muted">Teléfono de Emergencia</label>
                  <input type="text" name="contacto_emergencia" class="form-control form-control-sm" value="${escapeHtml(params.contacto_emergencia || '')}">
              </div>
              <div class="col-md-6">
                  <label class="form-label small fw-bold text-muted">Correo Institucional</label>
                  <input type="email" name="email_notificaciones" class="form-control form-control-sm" value="${escapeHtml(params.email_notificaciones || '')}">
              </div>
          </div>
          <div class="row g-2 mb-3">
              <div class="col-md-6">
                  <label class="form-label small fw-bold text-muted">Año Lectivo</label>
                  <input type="text" name="ano_lectivo" class="form-control form-control-sm" value="${escapeHtml(params.ano_lectivo || '2026')}">
              </div>
              <div class="col-md-6">
                  <label class="form-label small fw-bold text-muted">Umbral de Recurrencia (Visitas mínimas) *</label>
                  <input type="number" name="umbral_recurrencia" min="1" max="20" class="form-control form-control-sm fw-bold text-danger" value="${escapeHtml(params.umbral_recurrencia || '3')}" required>
                  <div class="form-text extra-small">Número de visitas a partir del cual un alumno se clasifica como Recurrente.</div>
              </div>
          </div>

          <div id="cfg-error-alert" class="alert alert-danger py-2 small d-none"></div>

          <button type="submit" id="btn-guardar-cfg" class="btn btn-samgy btn-sm px-4 shadow-sm">
              <i class="bi bi-save me-1"></i>Guardar Ajustes
          </button>
        </form>
      `;

      const formCfg = configContainer.querySelector('#form-configuracion');
      const btnCfg = configContainer.querySelector('#btn-guardar-cfg');
      const errCfg = configContainer.querySelector('#cfg-error-alert');

      formCfg.addEventListener('submit', async (e) => {
        e.preventDefault();
        errCfg.classList.add('d-none');
        errCfg.textContent = '';

        const formData = new FormData(formCfg);
        const payload = {
          nombre_institucion: formData.get('nombre_institucion')?.trim(),
          contacto_emergencia: formData.get('contacto_emergencia')?.trim(),
          email_notificaciones: formData.get('email_notificaciones')?.trim(),
          ano_lectivo: formData.get('ano_lectivo')?.trim(),
          umbral_recurrencia: String(formData.get('umbral_recurrencia')?.trim())
        };

        btnCfg.disabled = true;
        const origHtml = btnCfg.innerHTML;
        btnCfg.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Guardando...`;

        try {
          await api.put('/configuracion', payload);
          showToast('Ajustes institucionales y umbral de recurrencia actualizados.', 'success');
        } catch (err) {
          console.error('Error al actualizar configuración:', err);
          errCfg.textContent = err.message || 'Error al guardar ajustes.';
          errCfg.classList.remove('d-none');
        } finally {
          btnCfg.disabled = false;
          btnCfg.innerHTML = origHtml;
        }
      });

    } catch (err) {
      configContainer.innerHTML = renderErrorState('Error al cargar la configuración.');
    }

    // Cargar Gestión de Usuarios
    const usuariosContainer = container.querySelector('#usuarios-table-container');
    const modalUsrEl = container.querySelector('#modal-crear-usuario');
    const bsModalUsr = new bootstrap.Modal(modalUsrEl);
    const btnAbrirModalUsr = container.querySelector('#btn-abrir-modal-usuario');
    const formCrearUsr = container.querySelector('#form-crear-usuario');

    btnAbrirModalUsr.addEventListener('click', () => {
      formCrearUsr.reset();
      formCrearUsr.classList.remove('was-validated');
      container.querySelector('#usr-modal-error').classList.add('d-none');
      bsModalUsr.show();
    });

    formCrearUsr.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errAlert = container.querySelector('#usr-modal-error');
      errAlert.classList.add('d-none');
      errAlert.textContent = '';

      if (!formCrearUsr.checkValidity()) {
        formCrearUsr.classList.add('was-validated');
        return;
      }

      const payload = {
        nombre_completo: container.querySelector('#usr-nombre').value.trim(),
        email: container.querySelector('#usr-email').value.trim(),
        password: container.querySelector('#usr-password').value,
        id_rol: Number(container.querySelector('#usr-rol').value),
        debe_cambiar_password: container.querySelector('#usr-cambiar-pwd').checked
      };

      const btnSubmitUsr = container.querySelector('#btn-guardar-usr');
      btnSubmitUsr.disabled = true;
      const origHtml = btnSubmitUsr.innerHTML;
      btnSubmitUsr.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Creando...`;

      try {
        await api.post('/usuarios', payload);
        bsModalUsr.hide();
        showToast('Usuario creado exitosamente.', 'success');
        await cargarUsuarios(usuariosContainer);
      } catch (err) {
        console.error('Error al crear usuario:', err);
        errAlert.textContent = err.message || 'Error al crear el usuario.';
        errAlert.classList.remove('d-none');
      } finally {
        btnSubmitUsr.disabled = false;
        btnSubmitUsr.innerHTML = origHtml;
      }
    });

    await cargarUsuarios(usuariosContainer);

  } else {
    // Si no es Administrador, ocultar sección de usuarios y mostrar solo aviso
    configContainer.innerHTML = `
      <div class="alert alert-light border small text-muted">
        <i class="bi bi-info-circle me-1 text-samgy-primary"></i>Configuración del sistema administrada por el personal directivo.
      </div>
    `;
    const cardGestion = container.querySelector('#card-gestion-usuarios');
    if (cardGestion) cardGestion.classList.add('d-none');
  }

  // Cambio de contraseña
  const formPwd = container.querySelector('#form-cambiar-password');
  const btnPwd = container.querySelector('#btn-cambiar-pwd');
  const errPwd = container.querySelector('#pwd-error-alert');

  formPwd.addEventListener('submit', async (e) => {
    e.preventDefault();
    errPwd.classList.add('d-none');
    errPwd.textContent = '';

    if (!formPwd.checkValidity()) {
      formPwd.classList.add('was-validated');
      return;
    }

    const actual = formPwd.querySelector('#pwd-actual').value;
    const nueva = formPwd.querySelector('#pwd-nueva').value;
    const confirmar = formPwd.querySelector('#pwd-confirmar').value;

    if (nueva !== confirmar) {
      errPwd.textContent = 'La nueva contraseña y su confirmación no coinciden.';
      errPwd.classList.remove('d-none');
      return;
    }

    btnPwd.disabled = true;
    const origHtml = btnPwd.innerHTML;
    btnPwd.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Actualizando...`;

    try {
      await api.post('/auth/cambiar-password', {
        password_actual: actual,
        nuevo_password: nueva
      });
      showToast('Contraseña actualizada correctamente.', 'success');
      formPwd.reset();
      formPwd.classList.remove('was-validated');
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      errPwd.textContent = err.message || 'Error al actualizar contraseña.';
      errPwd.classList.remove('d-none');
    } finally {
      btnPwd.disabled = false;
      btnPwd.innerHTML = origHtml;
    }
  });
}

async function cargarUsuarios(container) {
  container.innerHTML = renderSpinner('Cargando lista de usuarios...');
  try {
    const res = await api.get('/usuarios');
    usuariosCache = res.data || [];

    if (usuariosCache.length === 0) {
      container.innerHTML = `<div class="p-3 text-muted text-center">No se encontraron usuarios.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead class="table-light extra-small text-uppercase text-muted">
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th class="text-end">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${usuariosCache.map(u => `
              <tr>
                <td class="fw-bold small text-dark">${escapeHtml(u.nombre_completo)}</td>
                <td class="small text-muted font-monospace">${escapeHtml(u.email)}</td>
                <td>
                  <span class="badge ${u.rol === 'Administrador' ? 'bg-primary' : 'bg-info text-dark'} extra-small">
                    ${escapeHtml(u.rol)}
                  </span>
                </td>
                <td>
                  ${u.activo === 1 ? 
                    '<span class="badge bg-success-subtle text-success extra-small">Activo</span>' : 
                    '<span class="badge bg-danger-subtle text-danger extra-small">Inactivo</span>'
                  }
                </td>
                <td class="text-end">
                  <button class="btn btn-outline-secondary btn-sm py-0 px-2 btn-toggle-usuario" data-user-id="${u.id_usuario}" data-activo="${u.activo}" title="Cambiar estado activo/inactivo" style="font-size: 0.75rem;">
                    ${u.activo === 1 ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('.btn-toggle-usuario').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-user-id'));
        const estadoActual = Number(btn.getAttribute('data-activo')) === 1;
        try {
          await api.patch(`/usuarios/${id}/activo`, { activo: !estadoActual });
          showToast(`Estado del usuario actualizado.`, 'info');
          await cargarUsuarios(container);
        } catch (err) {
          showToast(err.message || 'Error al cambiar estado', 'danger');
        }
      });
    });

  } catch (err) {
    console.error('Error al cargar usuarios:', err);
    container.innerHTML = renderErrorState('No fue posible cargar la lista de usuarios.');
  }
}
