/**
 * SAMGY Hash Router
 * Maneja navegación basada en hash (#/inicio, #/estudiantes, #/ficha/:id, #/reportes, etc.)
 * Soporta parámetros dinámicos, actualización del estado activo en el sidebar y cierre de dropdowns.
 */

export class Router {
  constructor(routes, defaultRoute = '#/inicio') {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.currentRoute = null;
    this.routeParams = {};

    window.addEventListener('hashchange', () => this.handleRouting());
  }

  init() {
    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#/login') {
      window.location.hash = this.defaultRoute;
    } else {
      this.handleRouting();
    }
  }

  navigate(hash) {
    const cleanTarget = hash.split('?')[0];
    const cleanCurrent = (window.location.hash || '').split('?')[0];
    if (window.location.hash === hash) {
      this.handleRouting();
    } else {
      window.location.hash = hash;
      if (cleanTarget === cleanCurrent) {
        this.handleRouting();
      }
    }
  }

  handleRouting() {
    const rawHash = window.location.hash || this.defaultRoute;
    const cleanHash = rawHash.split('?')[0];

    // Cerrar cualquier menú desplegable abierto en la barra superior
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
      const toggle = menu.previousElementSibling;
      if (toggle && window.bootstrap?.Dropdown) {
        window.bootstrap.Dropdown.getInstance(toggle)?.hide();
      } else {
        menu.classList.remove('show');
      }
    });

    let matchedRoute = null;
    let params = {};

    for (const routePattern of Object.keys(this.routes)) {
      const match = this.matchRoute(routePattern, cleanHash);
      if (match) {
        matchedRoute = this.routes[routePattern];
        params = match.params;
        break;
      }
    }

    this.updateSidebarActiveState(cleanHash);
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (matchedRoute) {
      this.currentRoute = cleanHash;
      this.routeParams = params;
      matchedRoute(params);
    } else if (this.routes['404']) {
      this.routes['404']();
    } else {
      this.navigate(this.defaultRoute);
    }
  }

  updateSidebarActiveState(cleanHash) {
    const navItems = document.querySelectorAll('#sidebar-wrapper .list-group-item');
    if (!navItems.length) return;

    const baseSection = '#/' + (cleanHash.replace(/^#\//, '').split('/')[0] || 'inicio');
    navItems.forEach((item) => {
      const href = item.getAttribute('href') || '';
      if (href === baseSection) {
        item.classList.add('active-nav');
      } else {
        item.classList.remove('active-nav');
      }
    });
  }

  matchRoute(pattern, path) {
    const patternSegments = pattern.replace(/^#\//, '').split('/');
    const pathSegments = path.replace(/^#\//, '').split('/');

    if (patternSegments.length !== pathSegments.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < patternSegments.length; i++) {
      const patternSeg = patternSegments[i];
      const pathSeg = pathSegments[i];

      if (patternSeg.startsWith(':')) {
        const paramName = patternSeg.slice(1);
        params[paramName] = decodeURIComponent(pathSeg);
      } else if (patternSeg !== pathSeg) {
        return null;
      }
    }

    return { params };
  }
}

let globalRouter = null;
let configuredRoutes = null;
let configuredDefault = '#/inicio';

export function defineRoutes(routes, defaultRoute = '#/inicio') {
  configuredRoutes = {};
  for (const [route, handler] of Object.entries(routes)) {
    configuredRoutes[route] = (params) => {
      const container = document.getElementById('main-dynamic-container') || document.getElementById('main-content');
      return handler(container, params);
    };
  }
  configuredDefault = defaultRoute;
}

export function initRouter(routes, defaultRoute = '#/inicio') {
  if (routes) {
    defineRoutes(routes, defaultRoute);
  }
  if (!globalRouter) {
    globalRouter = new Router(configuredRoutes || {}, configuredDefault);
    globalRouter.init();
  } else {
    globalRouter.handleRouting();
  }
  return globalRouter;
}

export function navigateTo(hash) {
  if (globalRouter) {
    globalRouter.navigate(hash);
  } else {
    window.location.hash = hash;
  }
}

export function getHashPath() {
  return window.location.hash || '';
}
