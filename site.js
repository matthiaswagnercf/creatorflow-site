/* Comportement du site creatorflow.ca. Formulaire, balises, Cal.com / Calendly, menu, barre collante, apparitions. */
(function () {
  const S = Object.assign({ formEndpoint: "https://matthias-wagner-guitar--cf-leads-web.modal.run/lead/creatorflow", calLink: null, calendly: "https://calendly.com/matthias-wagner-cf/meeting-with-matthias?utm_source=site", tel: "450 540-1161", telHref: "tel:+14505401161" }, window.SITE || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const EN = (document.documentElement.lang || "").slice(0, 2) === "en";
  const reduit = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  // Balises : une ligne par visite, clic d'appel, clic de rendez-vous, réservation faite. Sans témoin ni identifiant.
  // ?nobeacon=1 pose un drapeau local pour les vérifications après déploiement.
  let muet = false;
  try {
    if (/[?&]nobeacon=1/.test(location.search)) localStorage.setItem("cf_nobeacon", "1");
    muet = localStorage.getItem("cf_nobeacon") === "1";
  } catch (e) {}
  const ev_ = (type, cible) => {
    if (muet || !/(^|\.)creatorflow\.ca$/.test(location.hostname)) return;
    try { navigator.sendBeacon(S.formEndpoint.replace(/\/lead\//, "/event/"), new Blob([JSON.stringify({ type, page: location.pathname, cible })], { type: "application/json" })); } catch (e) {}
  };
  let prov = ""; try { prov = document.referrer ? new URL(document.referrer).host : ""; } catch (e) {}
  ev_("vue", prov);
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a");
    if (!a) return;
    const h = a.getAttribute("href") || "";
    if (h.indexOf("tel:") === 0) ev_("appel", h);
    else if (h.indexOf("calendly") !== -1 || h === "#rendez-vous") ev_("clic_rdv", a.textContent.trim().replace(/\s+/g, " "));
  });

  // Bandeau anglais : visible seulement si aucune langue du navigateur n'est le français (un fondateur américain qui a cherché « Creatorflow »)
  const barre = $(".lang-bar");
  if (barre && !(navigator.languages || [navigator.language || ""]).some(l => /^fr/i.test(l))) barre.hidden = false;

  // Menu mobile
  const nav = $(".nav"), mb = $(".menu-btn");
  if (nav && mb) {
    const fermer = () => { nav.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); };
    mb.addEventListener("click", () => { const o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o ? "true" : "false"); });
    $$(".nav-links a", nav).forEach(a => a.addEventListener("click", fermer));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("open")) { fermer(); mb.focus(); } });
  }

  // Barre collante : cachée tant qu'une des cibles (data-cacher) est à l'écran
  const sticky = $(".sticky-cta");
  if (sticky) {
    const cibles = (sticky.getAttribute("data-cacher") || "#accueil,#rendez-vous").split(",").map(s => $(s.trim())).filter(Boolean);
    if (cibles.length && "IntersectionObserver" in window) {
      const vis = new Map();
      const io = new IntersectionObserver(es => { es.forEach(e => vis.set(e.target, e.isIntersecting)); sticky.classList.toggle("hide", [...vis.values()].some(Boolean)); }, { threshold: 0.12 });
      cibles.forEach(c => io.observe(c));
    } else sticky.classList.remove("hide");
  }

  // Apparitions sous le héros, et la démonstration inbound qui se joue une fois
  const aVoir = $$(".reveal, .demo");
  if (!reduit && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add(e.target.classList.contains("demo") ? "play" : "in");
      io.unobserve(e.target);
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    aVoir.forEach(el => io.observe(el));
  } else aVoir.forEach(el => el.classList.add("in", "play"));

  // Rendez-vous : Cal.com si configuré, sinon le lien Calendly
  const cal = $("#rendez-vous .cal-box"), alt = $("#sans-calendrier");
  if (cal && S.calLink) {
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    Cal("init", { origin: "https://cal.com" });
    Cal("inline", { elementOrSelector: "#rendez-vous .cal-box", calLink: S.calLink, config: { layout: "month_view" } });
    Cal("ui", { theme: "dark", styles: { branding: { brandColor: "#ffffff" } }, hideEventTypeDetails: true });
    cal.hidden = false;
    if (alt) alt.hidden = true;
  }
  // Lien de base par page (data-calendly-base), sinon celui de config.js
  const baseCal = el => (el && el.getAttribute("data-calendly-base")) || S.calendly;
  $$("a[data-calendly]").forEach(a => a.href = baseCal(a) + "&utm_campaign=" + (a.getAttribute("data-calendly") || "site"));

  // Calendly intégré (data-embed="calendly") : chargé quand la section approche, le lien de secours reste si le script est bloqué
  if (cal && !S.calLink && cal.getAttribute("data-embed") === "calendly") {
    let charge = false;
    const monter = () => {
      if (charge) return; charge = true;
      const sc = document.createElement("script");
      sc.src = "https://assets.calendly.com/assets/external/widget.js"; sc.async = true;
      sc.onload = () => {
        if (!window.Calendly || !window.Calendly.initInlineWidget) return;
        cal.hidden = false;
        window.Calendly.initInlineWidget({
          url: baseCal(cal) + "&utm_campaign=" + (cal.getAttribute("data-campaign") || "embed") +
               "&hide_gdpr_banner=1&hide_event_type_details=1&background_color=0b0f16&text_color=f3f5f9&primary_color=9db8ff",
          parentElement: cal
        });
        if (alt) alt.hidden = true;
      };
      document.head.appendChild(sc);
    };
    // Calendly met ~3 s à devenir utilisable : on le charge en arrière-plan dès que la page est prête,
    // pour qu'il soit déjà là quand le visiteur clique (ou plus tôt s'il approche de la section ou clique)
    const plusTard = () => setTimeout(monter, 0);
    if (document.readyState === "complete") plusTard(); else window.addEventListener("load", plusTard);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { monter(); io.disconnect(); } }, { rootMargin: "900px 0px" });
      io.observe($("#rendez-vous"));
    }
    $$('a[href="#rendez-vous"]').forEach(a => a.addEventListener("click", monter));
    // Réservation faite dans le calendrier : une ligne « rdv_reserve » dans le registre
    window.addEventListener("message", e => {
      if (e.origin !== "https://calendly.com" || !e.data || e.data.event !== "calendly.event_scheduled") return;
      ev_("rdv_reserve", location.pathname);
      // Pages FR : réservation faite -> page merci (confirmation et ce qu'il faut avoir sous la main)
      const merci = cal.getAttribute("data-merci");
      const evu = e.data.payload && e.data.payload.event && e.data.payload.event.uri;
      if (merci) setTimeout(() => { location.href = merci + (evu ? "&e=" + encodeURIComponent(evu) : ""); }, 400);
    });
  }

  // Formulaire de demande (form.req) : validation, envoi, merci en liste d'étapes, erreur qui garde la saisie. Aucune page n'en a en ce moment.
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const T = {
    nom: "Écrivez votre nom.",
    telVide: "Écrivez votre numéro de téléphone.",
    courrielVide: "Écrivez votre courriel.",
    tel: "Ce numéro semble incomplet (10 chiffres).",
    courriel: "Ce courriel semble incomplet.",
    resume: "Il manque une information avant l'envoi.",
    envoi: "Envoi…",
    probleme: "L'envoi n'a pas fonctionné. Réessayez dans un instant, ou appelez-moi au <a href=\"" + S.telHref + "\">" + S.tel + "</a>."
  };
  const erreur = (f, champ, msg) => {
    const el = champ.tagName === "FIELDSET" ? $$("input", champ) : [champ];
    const id = "err-" + (champ.name || champ.id || "contact");
    let p = $("#" + id, f);
    if (!p) {
      p = document.createElement("p"); p.className = "err"; p.id = id;
      (champ.tagName === "FIELDSET" ? champ : champ.parentNode).appendChild(p);
    }
    p.textContent = msg;
    el.forEach(i => { i.setAttribute("aria-invalid", "true"); i.setAttribute("aria-describedby", ((i.getAttribute("data-desc") || "") + " " + id).trim()); });
  };
  const nettoyer = f => {
    $$(".err", f).forEach(p => p.remove());
    $$("[aria-invalid]", f).forEach(i => { i.removeAttribute("aria-invalid"); const d = i.getAttribute("data-desc"); if (d) i.setAttribute("aria-describedby", d); else i.removeAttribute("aria-describedby"); });
    const a = $(".alert", f); if (a) a.hidden = true;
  };
  const alerte = (f, html) => {
    let a = $(".alert", f);
    if (!a) { a = document.createElement("div"); a.className = "alert"; a.setAttribute("role", "alert"); f.insertBefore(a, f.firstChild); }
    a.innerHTML = html; a.hidden = false;
  };

  $$("form.req").forEach(f => {
    $$("input[aria-describedby]", f).forEach(i => i.setAttribute("data-desc", i.getAttribute("aria-describedby")));
    f.addEventListener("submit", ev => {
      ev.preventDefault();
      nettoyer(f);
      const d = { page: location.pathname }; new FormData(f).forEach((v, k) => { d[k] = typeof v === "string" ? v.trim() : v; });
      if (d.site_web) return; // pot de miel
      const fautes = [];
      if (!d.nom) { erreur(f, f.elements.nom, T.nom); fautes.push(f.elements.nom); }
      const chiffres = (d.telephone || "").replace(/\D/g, "");
      // Téléphone et courriel obligatoires tous les deux (décision du 2026-09-23)
      if (!d.telephone) { erreur(f, f.elements.telephone, T.telVide); fautes.push(f.elements.telephone); }
      else if (chiffres.length < 10) { erreur(f, f.elements.telephone, T.tel); fautes.push(f.elements.telephone); }
      if (!d.courriel) { erreur(f, f.elements.courriel, T.courrielVide); fautes.push(f.elements.courriel); }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.courriel)) { erreur(f, f.elements.courriel, T.courriel); fautes.push(f.elements.courriel); }
      if (fautes.length) { alerte(f, T.resume); fautes[0].focus(); return; }

      const btn = $("button", f), avant = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.innerHTML = "<span class=\"tw\"><span class=\"t\">" + T.envoi + "</span></span>"; }
      const rater = () => { if (btn) { btn.disabled = false; btn.innerHTML = avant; } alerte(f, T.probleme); };
      const ctl = "AbortController" in window ? new AbortController() : null;
      const minuterie = ctl ? setTimeout(() => ctl.abort(), 20000) : 0;
      fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(d), signal: ctl ? ctl.signal : undefined })
        .then(r => {
          clearTimeout(minuterie);
          if (!r.ok) return rater();
          const canal = d.telephone ? "par texto au " + esc(d.telephone) : "par courriel à " + esc(d.courriel);
          const source = f.getAttribute("data-source") || "à partir de votre fiche Google";
          f.innerHTML = "<div class=\"merci\" tabindex=\"-1\"><p class=\"m-t\">Merci, c'est reçu.</p><p class=\"muted\">Voici ce qui se passe maintenant.</p><ol class=\"next\">" +
            "<li><span><b>Je monte votre page d'accueil</b>" + esc(source) + ", avec votre nom et vos zones.</span></li>" +
            "<li><span><b>Je vous l'envoie " + canal + "</b>d'ici deux jours ouvrables." + (d.courriel ? " Un courriel de confirmation part tout de suite." : "") + "</span></li>" +
            "<li><span><b>Vous la regardez</b>puis vous me dites oui ou non. Si c'est non, je ne vous rappelle pas.</span></li></ol>" +
            "<p class=\"small\">Une question d'ici là : <a class=\"lnk\" href=\"" + S.telHref + "\">" + S.tel + "</a>.</p></div>";
          const m = $(".merci", f); if (m) m.focus();
          ev_("maquette", d.municipalite || "");
        })
        .catch(() => { clearTimeout(minuterie); rater(); });
    });
  });

  // Page merci : l'heure du rendez-vous (route cf-leads, heure seulement) et les boutons « Ajouter à mon agenda »
  const agenda = $(".agenda");
  const evu = new URLSearchParams(location.search).get("e");
  if (agenda && evu && /^https:\/\/api\.calendly\.com\/scheduled_events\//.test(evu)) {
    fetch(S.formEndpoint.replace(/\/lead\/.*$/, "/calendly/heure") + "?e=" + encodeURIComponent(evu))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || !d.debut) return;
        const debut = new Date(d.debut), fin = new Date(d.fin || (debut.getTime() + 20 * 60000));
        if (isNaN(debut)) return;
        const z = t => t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        const titre = "Appel avec Matthias Wagner, Creatorflow";
        const note = "Je vous appelle au numéro que vous avez laissé. Un empêchement : " + S.tel + ".";
        $(".agenda-quand", agenda).textContent = debut.toLocaleString("fr-CA", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });
        $(".add-google", agenda).href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(titre) +
          "&dates=" + z(debut) + "/" + z(fin) + "&details=" + encodeURIComponent(note) + "&location=" + encodeURIComponent("Au téléphone");
        const esci = t => t.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1");  // échappement iCalendar (RFC 5545)
        const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Creatorflow//Appel//FR", "BEGIN:VEVENT",
          "UID:" + z(debut) + "-appel@creatorflow.ca", "DTSTAMP:" + z(new Date()), "DTSTART:" + z(debut), "DTEND:" + z(fin),
          "SUMMARY:" + esci(titre), "DESCRIPTION:" + esci(note), "LOCATION:Au téléphone", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
        $(".add-ics", agenda).href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
        agenda.hidden = false;
      })
      .catch(() => {});
  }

  $$("[data-annee]").forEach(e => e.textContent = new Date().getFullYear());
})();
