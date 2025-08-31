// src/main.js
import isAuth from "./handleAuth/isAuth";
import register from "./handleAuth/register";
import login from "./handleAuth/login";
import { renderDashboardAfterTemplateLoaded } from "./views/dashboard"; // ablandoa
import { fetchNotifications, buildPopover } from './views/notifications.js';

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

  // Nueva ruta para notifications
  "/notifications": "./src/templates/notifications.html",
};

const url = "https://stack4us.up.railway.app/api/users"; // base solo para auth (login/register)

// helper minúsculo para validar formato de JWT
function hasValidToken() {
  const t = (localStorage.getItem("token") || "").trim();
  return t && t.split(".").length === 3;
}

function setupNavigation(currentPath) {
  const nav = document.getElementById("navUl");
  if (!nav) return;

  const appPages = ["/dashboard", "/ranking", "/about"]; // removed notifications
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

function setupMobileMenu(path){
  const btn=document.getElementById('hamburgerBtn');
  const drawer=document.getElementById('mobileMenu');
  const linksWrap=document.getElementById('mobileNavLinks');
  const footer=document.getElementById('mobileMenuFooter');
  if(!btn||!drawer||!linksWrap) return;
  function build(){
    const isAuthd = isAuth() && hasValidToken();
    linksWrap.innerHTML = isAuthd ? `
      <a href="/dashboard" data-link class="${path==='/dashboard'?'active':''}">Comentarios</a>
      <a href="/ranking" data-link class="${path==='/ranking'?'active':''}">Ranking</a>
      <a href="/about" data-link class="${path==='/about'?'active':''}">About Us</a>
    ` : `<a href="/register" data-link>Register</a>`;
    footer.innerHTML = isAuthd ? `<a href="/logout" data-link id="close-sesion">Logout</a>` : '';
  }
  build();
  function open(){ drawer.classList.remove('hidden'); drawer.classList.add('open'); btn.classList.add('is-open'); btn.setAttribute('aria-expanded','true'); document.body.classList.add('menu-open'); }
  function close(){ drawer.classList.add('hidden'); drawer.classList.remove('open'); btn.classList.remove('is-open'); btn.setAttribute('aria-expanded','false'); document.body.classList.remove('menu-open'); }
  btn.onclick = ()=>{ if(drawer.classList.contains('hidden')) open(); else close(); };
  drawer.addEventListener('click', e=>{ if(e.target.dataset.close==='drawer') close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
  // Rebuild links when navigating
  setupMobileMenu.rebuild = (newPath)=>{ build(); }; // store for external call
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
  if (pathname === "/dashboard" || pathname === "/ranking" || pathname === "/about" || pathname === "/notifications") {
    document.body.classList.add("has-dashboard");
  } else {
    document.body.classList.remove("has-dashboard");
  }

  if (pathname === "/login") login(url);
  if (pathname === "/register") register(url);

  // DASHBOARD: carga CSS (solo 1 vez) + render
  const needsDashCSS = ["/dashboard","/ranking","/about","/notifications"].includes(pathname);
  if (needsDashCSS) {
    if (!document.querySelector('link[data-dashboard-css]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = '/src/css/dashboard.css';
      l.setAttribute('data-dashboard-css', '1');
      document.head.appendChild(l);
    }
  }
  if (pathname === "/dashboard") {
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

  // NOTIFICATIONS
  if (pathname === "/notifications") {
    const mod = await import("./views/notifications.js");
    await mod.renderNotificationsAfterTemplateLoaded();
  }

  // NOTIFICATION POPUP
  const bellBtn=document.getElementById('bellBtn');
  const bellIcon=document.getElementById('bellIconImg');
  const bellBadge=document.getElementById('bellBadge');
  const pop=document.getElementById('notifPopover');
  if(bellBtn && pop){
    let open=false; let loaded=false; let cache=[];
    async function refresh(){ cache=await fetchNotifications(); bellBadge.classList.toggle('hidden', !cache.some(n=> n.status!=='read')); bellIcon.src = cache.some(n=> n.status!=='read')? '/src/assets/img/mdi_bell-badge.png':'/src/assets/img/mdi_bell.png'; pop.innerHTML = `<div class='notif-popover-header'><span>Notificaciones</span><button class='close-pop' data-close>x</button></div>` + buildPopover(cache); loaded=true; bindMarks(); }
    function bindMarks(){ pop.querySelectorAll('.notif-mark').forEach(btn=>{ btn.addEventListener('click', async ev=>{ ev.stopPropagation(); const li=btn.closest('.notif-item'); if(!li) return; const id=li.dataset.id; btn.disabled=true; try{ await fetch(`https://stack4us.up.railway.app/api/notifications/${id}`, {method:'PATCH', headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }}); li.classList.remove('unread'); btn.remove(); cache=cache.map(n=> n.notification_id==id? {...n, status:'read'}:n); bellBadge.classList.toggle('hidden', !cache.some(n=> n.status!=='read')); bellIcon.src = cache.some(n=> n.status!=='read')? '/src/assets/img/mdi_bell-badge.png':'/src/assets/img/mdi_bell.png'; }catch{} }); }); }
    bellBtn.addEventListener('click', async ()=>{ open=!open; pop.classList.toggle('hidden', !open); if(open && !loaded){ await refresh(); } });
    document.addEventListener('click', e=>{ if(!open) return; if(e.target.closest('#bellBtn')|| e.target.closest('#notifPopover')) return; open=false; pop.classList.add('hidden'); });
    pop.addEventListener('click', e=>{ if(e.target.matches('[data-close]')){ open=false; pop.classList.add('hidden'); } });
  }

  // Render de navegación después de cargar el template
  setupNavigation(pathname);
  setupMobileMenu(pathname);
  if(typeof setupMobileMenu.rebuild==='function') setupMobileMenu.rebuild(pathname);
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
