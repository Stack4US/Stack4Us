// src/main.js
import isAuth from "./handleAuth/isAuth";
import register from "./handleAuth/register";
import login from "./handleAuth/login";
import { renderDashboardAfterTemplateLoaded } from "./views/dashboard"; // ablandoa

// Rutas
const routes = {
  "/dashboard": "./src/templates/dashboard.html",
  "/comments": "./src/templates/comments.html",
  "/ranking": "./src/templates/ranking.html",
  "/about": "./src/templates/about.html",
  "/edit-post": "./src/templates/edit-post.html",
  "/profile": "./src/templates/profile.html",

  // Login y Registro
  "/register": "./src/templates/auth/register.html",
  "/login": "./src/templates/auth/login.html",
};

const url = "http://localhost:3000/api/users"; // base solo para auth (login/register)

// helper minúsculo para validar formato de JWT
function hasValidToken() {
  const t = (localStorage.getItem("token") || "").trim();
  return t && t.split(".").length === 3;
}

function setupNavigation(currentPath) {
  const nav = document.getElementById("navUl");
  if (!nav) return;

  const appPages = ["/dashboard", "/ranking", "/about"];
  const onAppPages = appPages.includes(currentPath);
  const isMobile = window.innerWidth < 1000;
  const activeClass = (p) => (currentPath === p ? "active" : "");

  if (onAppPages) {
    if (!isAuth() || !hasValidToken()) {
      nav.innerHTML = "";
      return;
    }
    // En PC mostrar solo Logout; en móvil todos los enlaces
    if (isMobile) {
      nav.innerHTML = `
        <a href="/dashboard" data-link class="${activeClass("/dashboard")}">Comentarios</a>
        <a href="/ranking" data-link class="${activeClass("/ranking")}">Ranking</a>
        <a href="/about" data-link class="${activeClass("/about")}">About Us</a>
        <a href="/logout" data-link id="close-sesion">Logout</a>
      `;
    } else {
      nav.innerHTML = `<a href="/logout" data-link id="close-sesion">Logout</a>`;
    }
    return;
  }

  if (!isAuth() || !hasValidToken()) {
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
  // Gate para no autenticados o token inválido (solo permitimos login y register)
  if ((!isAuth() || !hasValidToken()) && pathname !== "/login" && pathname !== "/register") {
    pathname = "/login";
  }

  const route = routes[pathname];
  const html = await fetch(route).then((res) => res.text());
  document.getElementById("content").innerHTML = html;
  history.pushState({}, "", pathname);

  // Sidebar/layout fijo (ahora también para /about)
  if (pathname === "/dashboard" || pathname === "/ranking" || pathname === "/about") {
    document.body.classList.add("has-dashboard");
  } else {
    document.body.classList.remove("has-dashboard");
  }

  if (pathname === "/login") login(url);
  if (pathname === "/register") register(url);

  // DASHBOARD: carga CSS (solo 1 vez) + render
  if (pathname === "/dashboard") {
    if (!document.querySelector('link[data-dashboard-css]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = '/src/css/dashboard.css';
      l.setAttribute('data-dashboard-css', '1');
      document.head.appendChild(l);
    }
    await renderDashboardAfterTemplateLoaded();
  }

  // RANKING
  if (pathname === "/ranking") {
    const mod = await import("./views/ranking.js");
    await mod.renderRankingAfterTemplateLoaded();
  }

  // EDIT POST
  if (pathname === "/edit-post") {
    const mod = await import("./views/editPost.js");
    await mod.renderEditPostAfterTemplateLoaded();
  }

  // PROFILE
  if (pathname === "/profile") {
    const mod = await import("./views/profile.js");
    await mod.renderProfileAfterTemplateLoaded();
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
      localStorage.removeItem("token");     // limpiar token
      localStorage.removeItem("role");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_name");
      navigate("/login");
      return;
    }

    navigate(path);
  }

  // Click en tarjeta usuario sidebar -> perfil
  const uc = e.target.closest('#sidebarUserCard');
  if (uc) {
    e.preventDefault();
    navigate('/profile');
  }
});

// Inicialización
window.addEventListener("DOMContentLoaded", () => {
  // si Auth quedó en true pero no hay token válido, forzar login
  if (localStorage.getItem("Auth") === "true" && !hasValidToken()) {
    localStorage.setItem("Auth", "false");
  }

  const path = window.location.pathname;
  if (routes[path]) {
    navigate(path);
  } else {
    if (!isAuth() || !hasValidToken()) navigate("/login");
    else navigate("/dashboard");
  }
});

// Recalcular el contenido del nav al redimensionar
window.addEventListener("resize", () => setupNavigation(window.location.pathname));
