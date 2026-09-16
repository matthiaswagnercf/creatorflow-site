/* Comportement du site creatorflow.ca. Repris du gabarit client (formulaire, balises, Cal.com), sans le reste. */
(function () {
  const S = window.SITE;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const MERCI = "<p class=\"ok\"><strong>Merci, c'est reçu.</strong> Je regarde votre fiche et je vous écris à l'adresse que vous avez laissée.</p>";
  const PROBLEME = "<p class=\"ok\">Un problème est survenu. Appelez-moi au <a href=\"" + S.telHref + "\">" + S.tel + "</a>.</p>";

  // Menu mobile
  const mb = $(".menu-btn"), nav = $(".nav");
  if (mb && nav) mb.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    mb.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Barre mobile : cachée quand le formulaire de maquette est visible
  const sticky = $(".sticky-cta"), target = $("#maquette");
  if (sticky && target && "IntersectionObserver" in window) {
    new IntersectionObserver(e => sticky.classList.toggle("hide", e[0].isIntersecting), { threshold: 0.15 }).observe(target);
  }

  // Rendez-vous : Cal.com si configuré, sinon le lien Calendly
  const cal = $("#rendez-vous .cal-box"), alt = $("#sans-calendrier");
  if (cal && S.calLink) {
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    Cal("init", { origin: "https://cal.com" });
    Cal("inline", { elementOrSelector: "#rendez-vous .cal-box", calLink: S.calLink, config: { layout: "month_view" } });
    Cal("ui", { theme: "dark", styles: { branding: { brandColor: "#ffffff" } }, hideEventTypeDetails: true });
    cal.hidden = false;
    if (alt) alt.hidden = true;
  } else if (alt) {
    $$("a[data-calendly]", alt).forEach(a => a.href = S.calendly + "&utm_campaign=" + (a.getAttribute("data-calendly") || "site"));
  }

  // Formulaire de maquette
  $$("form.req").forEach(f => f.addEventListener("submit", ev => {
    ev.preventDefault();
    const d = { page: location.pathname }; new FormData(f).forEach((v, k) => { d[k] = v; });
    if (d.site_web) return; // pot de miel
    const btn = $("button", f); if (btn) { btn.disabled = true; btn.textContent = "Envoi..."; }
    fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(d) })
      .then(r => { f.innerHTML = r.ok ? MERCI : PROBLEME; if (r.ok) ev_("maquette", d.municipalite || ""); })
      .catch(() => { f.innerHTML = PROBLEME; });
  }));

  // Balises : clics sur Appeler et sur Rendez-vous, comptés dans le registre (sans cookie, sans identifiant)
  const ev_ = (type, cible) => { try { navigator.sendBeacon(S.formEndpoint.replace(/\/lead\//, "/event/"), new Blob([JSON.stringify({ type, page: location.pathname, cible })], { type: "application/json" })); } catch (e) {} };
  $$('a[href^="tel:"]').forEach(a => a.addEventListener("click", () => ev_("appel", a.getAttribute("href"))));
  $$('a[href*="calendly"], a[href="#rendez-vous"]').forEach(a => a.addEventListener("click", () => ev_("clic_rdv", a.textContent.trim())));

  $$("[data-annee]").forEach(e => e.textContent = new Date().getFullYear());
})();
