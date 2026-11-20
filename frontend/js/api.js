/**
 * SAMGY API Client
 * Centraliza las peticiones HTTP con fetch a la API REST.
 * Maneja credenciales (cookies), respuestas estándar y redirección a login en caso de 401.
 */

let onAuthRequiredCallback = null;

export function setAuthRequiredHandler(callback) {
  onAuthRequiredCallback = callback;
}

export async function apiRequest(endpoint, options = {}) {
  let url = endpoint;
  if (!url.startsWith('/api/') && url !== '/api') {
    url = '/api' + (url.startsWith('/') ? url : `/${url}`);
  }
  
  const defaultHeaders = {
    'Accept': 'application/json'
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const config = {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);

    // Si la sesión expiró o no está autorizado
    if (response.status === 401) {
      if (typeof onAuthRequiredCallback === 'function') {
        onAuthRequiredCallback();
      }
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson?.error?.mensaje || 'Sesión no válida o expirada.';
      throw new Error(errorMsg);
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = json?.error?.mensaje || `Error en la solicitud (${response.status})`;
      const error = new Error(errorMsg);
      error.codigo = json?.error?.codigo || 'ERROR_PETICION';
      error.status = response.status;
      throw error;
    }

    return json;
  } catch (error) {
    throw error;
  }
}

// Métodos auxiliares
export const api = {
  setOnUnauthorized: (callback) => {
    onAuthRequiredCallback = callback;
  },
  setAuthRequiredHandler: (callback) => {
    onAuthRequiredCallback = callback;
  },
  get: (endpoint, params = null) => {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return apiRequest(url, { method: 'GET' });
  },

  post: (endpoint, data) => {
    return apiRequest(endpoint, { method: 'POST', body: data });
  },

  put: (endpoint, data) => {
    return apiRequest(endpoint, { method: 'PUT', body: data });
  },

  patch: (endpoint, data) => {
    return apiRequest(endpoint, { method: 'PATCH', body: data });
  },

  delete: (endpoint) => {
    return apiRequest(endpoint, { method: 'DELETE' });
  }
};

if (typeof window !== 'undefined') {
  window.api = api;
}

