import isAuth from "./handleAuth/isAuth";
import register from "./handleAuth/register";
import login from "./handleAuth/login";
import { renderDashboardAfterTemplateLoaded } from "./views/dashboard"; //ablandoa

// Rutas
const routes = {

  // Sección autenticada
  "/dashboard": "./src/templates/dashboard.html",
  "/comments": "./src/templates/comments.html",
  "/ranking": "./src/templates/ranking.html",

  // Login y Registro
  "/register": "./src/templates/auth/register.html",
  "/login": "./src/templates/auth/login.html",
};

const url = 'http://localhost:3000';

function setupNavigation() {
  const nav = document.getElementById("navUl");
  if (!nav) return;


  if (!isAuth()) {
    nav.innerHTML = `
      <a href="/register" class="noAuth" data-link>Register</a>
    `;
    return;
  } else {
    nav.innerHTML = `
      <a href="/dashboard" data-link>Comentarios</a>
      <a href="/ranking" data-link>Ranking</a>
      <a href="/logout" data-link id="close-sesion">Logout</a>
    `;
  }
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

  if (pathname === "/login")    login(url);
  if (pathname === "/register") register(url);

  if (pathname === "/dashboard") {                 //ablandoa
    await renderDashboardAfterTemplateLoaded();    //ablandoa
  }                                               //ablandoa

  // Render de navegación después de cargar el template
  setupNavigation();
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
  setupNavigation();

  const path = window.location.pathname;
  if (routes[path]) {
    navigate(path);
  } else {
    if (!isAuth()) navigate("/login");
    else navigate("/dashboard");
  }
});
