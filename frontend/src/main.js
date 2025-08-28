import isAuth from "./handleAuth/isAuth";
import register from "./handleAuth/register";
import login from "./handleAuth/login";
import { renderDashboardAfterTemplateLoaded } from "./views/dashboard"; //ablandoa

// Rutas
const routes = {
  "/dashboard": "./src/templates/dashboard.html", 
  "/comments": "./src/templates/comments.html",
  "/ranking": "./src/templates/ranking.html",
  "/about": "./src/templates/about.html",
  "/edit-post": "./src/templates/edit-post.html",

  // Login y Registro
  "/register": "./src/templates/auth/register.html",
  "/login": "./src/templates/auth/login.html",
};

const url = 'http://localhost:3000';

function setupNavigation(currentPath) {
  const nav = document.getElementById("navUl");
  if (!nav) return;
  const appPages = ['/dashboard','/ranking','/about'];
  const onAppPages = appPages.includes(currentPath);
  const isMobile = window.innerWidth < 1000;
  const activeClass = (p) => currentPath === p ? 'active' : '';

  if (onAppPages) {
    if (!isAuth()) { nav.innerHTML=''; return; }
    // Petición: en PC quitar los enlaces (solo dejar Logout). En móvil mantenerlos.
    if (isMobile) {
      nav.innerHTML = `
        <a href="/dashboard" data-link class="${activeClass('/dashboard')}">Comentarios</a>
        <a href="/ranking" data-link class="${activeClass('/ranking')}">Ranking</a>
        <a href="/about" data-link class="${activeClass('/about')}">About Us</a>
        <a href="/logout" data-link id="close-sesion">Logout</a>
      `;
    } else {
      nav.innerHTML = `<a href="/logout" data-link id="close-sesion">Logout</a>`;
    }
    return;
  }

  if (!isAuth()) {
    nav.innerHTML = `
      <a href="/register" class="noAuth" data-link>Register</a>
    `;
    return;
  } 
  nav.innerHTML = `
    <a href="/dashboard" data-link>Dashboard</a>
    <a href="/ranking" data-link>Ranking</a>
    <a href="/about" data-link>About Us</a>
    <a href="/logout" data-link id="close-sesion">Logout</a>
  `;
}

export async function navigate(pathname) {
  // Gate para no autenticados (solo permitimos login y register)
  if (!isAuth() && pathname !== "/login" && pathname !== "/register") {
    pathname = "/login";
  }

  const route = routes[pathname];
  const html = await fetch(route).then((res) => res.text());
  document.getElementById("content").innerHTML = html;
  history.pushState({}, "", pathname);

  // Clase para layout con sidebar fijo
  if (pathname === '/dashboard' || pathname === '/ranking') {
    document.body.classList.add('has-dashboard');
  } else {
    document.body.classList.remove('has-dashboard');
  }

  if (pathname === "/login")    login(url);
  if (pathname === "/register") register(url);

  if (pathname === "/dashboard") {                 //ablandoa
    await renderDashboardAfterTemplateLoaded();    //ablandoa
  }                                               //ablandoa
  if (pathname === "/edit-post") {
    const mod = await import('./views/editPost.js');
    await mod.renderEditPostAfterTemplateLoaded();
  }

  // Render de navegación después de cargar el template
  setupNavigation(pathname);
}

document.body.addEventListener("click", (e) => {
  if (e.target.matches("[data-link]")) {
    e.preventDefault();
    const path = e.target.getAttribute("href");

    // Logout
    if (path === "/logout") {
      localStorage.setItem("Auth", "false");
      localStorage.removeItem("role");
      navigate("/login");
      return;
    }

    navigate(path);
  }
});

// Inicialización
window.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  if (routes[path]) {
    navigate(path);
  } else {
    if (!isAuth()) navigate("/login");
    else navigate("/dashboard");
  }
});

window.addEventListener('resize', () => setupNavigation(window.location.pathname));
