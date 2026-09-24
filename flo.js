/* Flo, l'agent d'accueil. Fichier canonique : sites-locaux/gabarit/flo.js (site-cf/flo.js en est la copie, rafraîchie par publier_site_cf.py).
   <script src="flo.js" data-flo="<persona>"> : inspecteurs | metiers-rbq | inbound (creatorflow.ca) ou le slug d'un site client.
   Un site client fournit sa configuration dans window.SITE.flo (généré par build.py) : {nom:{fr,en}, ouverture:{fr,en}, rdv:{fr,en},
   tel, courriel, pied, theme:"clair"|"sombre", accent}. Sans window.SITE.flo, les trois personas de creatorflow.ca sont intégrées.
   Le cadre (bouton, entête, champ) suit la langue de la page, avec un lien FR/EN ; Flo suit la langue du visiteur.
   Historique en sessionStorage, clé flo:<persona> : jamais partagé entre pages, effacé à la fermeture de l'onglet.
   Endpoint dérivé de window.SITE.formEndpoint (/lead/<slug> → /flo/<persona>), comme le beacon de site.js. */
(function () {
  const me = document.currentScript;
  const S = Object.assign({ formEndpoint: "https://matthias-wagner-guitar--cf-leads-web.modal.run/lead/creatorflow" }, window.SITE || {});
  const F = S.flo || null;
  const CF = { "inspecteurs": 1, "metiers-rbq": 1, "inbound": 1 };
  let persona = (me && me.getAttribute("data-flo")) || "";
  if (!/^[a-z0-9-]{2,60}$/.test(persona)) return;
  if (!CF[persona] && !F) return;
  const base = S.formEndpoint.replace(/\/lead\/.*$/, "");
  const slugLead = (S.formEndpoint.match(/\/lead\/([^/?#]+)/) || [])[1] || "creatorflow";
  const pageLang = (document.documentElement.lang || "fr").slice(0, 2) === "en" ? "en" : "fr";
  let lang = pageLang;

  const NOMS = {
    "inspecteurs": { fr: "Sites pour inspecteurs", en: "Inspector websites", page: "/" },
    "metiers-rbq": { fr: "Sites pour entrepreneurs RBQ", en: "RBQ contractor websites", page: "/metiers-rbq.html" },
    "inbound": { fr: "Automatisation pour équipes", en: "AI automation for teams", page: "/inbound.html" }
  };
  const OUVERTURE = {
    "inspecteurs": { fr: "Bonjour, je suis Flo, je réponds pour Matthias. Une question sur le site pour inspecteurs, le prix ou le délai ? Vous êtes inspecteur ou courtier ?", en: "Hi, I'm Flo, I answer for Matthias. A question about the inspector website, the price or the timeline? Are you an inspector or a broker?" },
    "metiers-rbq": { fr: "Bonjour, je suis Flo, je réponds pour Matthias. Une question sur le site pour entrepreneurs RBQ, le prix ou le délai ? Vous faites quels travaux ?", en: "Hi, I'm Flo, I answer for Matthias. A question about the contractor website, the price or the timeline? What kind of work do you do?" },
    "inbound": { fr: "Bonjour, je suis Flo, je réponds pour Matthias. Une question sur les systèmes qu'il bâtit, le prix ou l'appel ? Où est-ce que votre équipe perd des demandes ou des heures ?", en: "Hi, I'm Flo, I answer for Matthias. A question about the systems he builds, the price or the call? Where does your team lose leads or hours?" }
  };
  const CAL = { fr: "https://calendly.com/matthias-wagner-cf/appel-decouverte-creatorflow", en: "https://calendly.com/matthias-wagner-cf/creatorflow-strategy-call" };
  const nomDe = l => (F && F.nom && F.nom[l]) || (NOMS[persona] && NOMS[persona][l]) || "";
  const ouvertureDe = l => (F && F.ouverture && F.ouverture[l]) || (OUVERTURE[persona] && OUVERTURE[persona][l]) || "";
  const rdvDe = l => (F && F.rdv && F.rdv[l]) || (CAL[l] + "?utm_source=flo&utm_campaign=" + persona + "-pied");
  const tel = F ? (F.tel || "") : "450 540-1161";
  const courriel = F ? (F.courriel || "") : "matthias.wagner.cf@gmail.com";
  const pied = (F && F.pied) || "Matthias Wagner, Montréal";
  const qui = (F && F.qui) || "Matthias";
  const T = {
    fr: { fin: "On s'arrête ici pour le clavardage. Pour la suite, " + (tel ? "appelez " + qui + " au " + tel + "." : "utilisez le lien ci-dessous."), ouvrir: "Une question ?", fermer: "Fermer", titre: "Flo", sous: "répond pour " + qui, champ: "Écrivez votre question", envoyer: "Envoyer", ecrit: "Flo écrit", rdv: (F ? "Prendre rendez-vous" : "Réserver l'appel"), voir: "Voir la page", erreur: "Je n'arrive pas à répondre pour l'instant. " + (tel ? "Appelez " + qui + " au " + tel + "." : "Écrivez à " + courriel + "."), nudge: "Une question ? Je réponds tout de suite.", autre: "EN", trop: "Message trop long (600 caractères maximum)." },
    en: { fin: "That's the end of the chat. For the rest, " + (tel ? "call " + qui + " at " + tel + "." : "use the link below."), ouvrir: "A question?", fermer: "Close", titre: "Flo", sous: "answers for " + qui, champ: "Type your question", envoyer: "Send", ecrit: "Flo is typing", rdv: (F ? "Book an inspection" : "Book the call"), voir: "See the page", erreur: "I can't answer right now. " + (tel ? "Call " + qui + " at " + tel + "." : "Email " + courriel + "."), nudge: "A question? I answer right away.", autre: "FR", trop: "Message too long (600 characters max)." }
  };

  // Beacon (même règles que site.js : drapeau cf_nobeacon ; jamais depuis un fichier local)
  let muet = false; try { muet = localStorage.getItem("cf_nobeacon") === "1"; } catch (e) {}
  const ev = (type, cible) => {
    if (muet || location.protocol === "file:" || !S.formEndpoint) return;
    try { navigator.sendBeacon(base + "/event/" + slugLead, new Blob([JSON.stringify({ type, page: location.pathname, cible: cible || persona })], { type: "application/json" })); } catch (e) {}
  };

  // État : {session, messages:[{role,text}], handoff}
  const cle = () => "flo:" + persona;
  const idSession = () => { try { const a = new Uint8Array(6); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, "0")).join(""); } catch (e) { return String(Date.now()); } };
  let etat;
  const charger = () => { try { const j = sessionStorage.getItem(cle()); if (j) { etat = JSON.parse(j); if (etat && etat.messages) return; } } catch (e) {} etat = { session: idSession(), messages: [], handoff: null }; };
  const sauver = () => { try { sessionStorage.setItem(cle(), JSON.stringify(etat)); } catch (e) {} };
  charger();

  // Styles : palette sombre (creatorflow.ca) ou claire (sites clients), accent configurable
  const clair = F && F.theme === "clair";
  const accent = (F && F.accent) || (clair ? "#0f5f5b" : "#9db8ff");
  const P = clair
    ? { fond: "#ffffff", fond2: "#f3f1ec", ink: "#141516", muted: "rgba(20,21,22,.62)", ligne: "rgba(0,0,0,.12)", bulleA: "#f0ede6", bulleU: accent, bulleUInk: "#ffffff", btn: accent, btnInk: "#ffffff", lien: accent, ombre: "rgba(0,0,0,.22)" }
    : { fond: "#0b0f16", fond2: "#10151f", ink: "#f3f5f9", muted: "rgba(243,245,249,.64)", ligne: "rgba(255,255,255,.14)", bulleA: "#161c28", bulleU: "#ffffff", bulleUInk: "#06080d", btn: "#ffffff", btnInk: "#06080d", lien: accent, ombre: "rgba(0,0,0,.45)" };
  const css = `
.flo-btn{position:fixed;right:18px;bottom:18px;z-index:66;display:inline-flex;align-items:center;gap:10px;min-height:52px;padding:0 20px 0 16px;border-radius:999px;border:0;background:${P.btn};color:${P.btnInk};font:600 15px/1 var(--sans,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif);letter-spacing:-.01em;cursor:pointer;box-shadow:0 10px 30px ${P.ombre};transition:transform .15s,box-shadow .3s}
.flo-btn:hover{transform:translateY(-1px)}
.flo-btn svg{width:20px;height:20px}
.flo-btn[hidden]{display:none}
.flo-nudge{position:fixed;right:18px;bottom:82px;z-index:66;max-width:260px;padding:12px 30px 12px 14px;border-radius:14px;background:${P.fond2};color:${P.ink};border:1px solid ${P.ligne};font:15px/1.4 var(--sans,sans-serif);box-shadow:0 10px 30px ${P.ombre};cursor:pointer}
.flo-nudge button{position:absolute;top:4px;right:6px;background:none;border:0;color:${P.muted};font-size:18px;cursor:pointer}
.flo-nudge[hidden]{display:none}
.flo-panel{position:fixed;right:18px;bottom:18px;z-index:70;width:min(400px,calc(100vw - 36px));height:min(620px,calc(100vh - 36px));display:flex;flex-direction:column;background:${P.fond};color:${P.ink};border:1px solid ${P.ligne};border-radius:24px;box-shadow:0 24px 60px ${P.ombre};overflow:hidden;font:15.5px/1.5 var(--sans,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif)}
.flo-panel[hidden]{display:none}
.flo-head{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid ${P.ligne};background:${P.fond2}}
.flo-head .flo-av{width:36px;height:36px;border-radius:50%;background:${accent};color:#fff;display:grid;place-items:center;font-weight:600;flex:none}
.flo-head .flo-ttl{flex:1;min-width:0}
.flo-head .flo-ttl b{display:block;color:${P.ink};font-weight:600}
.flo-head .flo-ttl span{display:block;color:${P.muted};font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.flo-head button{background:none;border:1px solid ${P.ligne};color:${P.ink};border-radius:999px;min-height:32px;padding:0 12px;font:500 13px/1 inherit;cursor:pointer}
.flo-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}
.flo-m{max-width:88%;padding:10px 14px;border-radius:16px;white-space:pre-wrap;word-wrap:break-word}
.flo-m.flo-u{align-self:flex-end;background:${P.bulleU};color:${P.bulleUInk};border-bottom-right-radius:6px}
.flo-m.flo-a{align-self:flex-start;background:${P.bulleA};color:${P.ink};border-bottom-left-radius:6px}
.flo-m.flo-s{align-self:center;background:none;color:${P.muted};font-size:13px;text-align:center;max-width:100%}
.flo-m a{color:${P.lien};word-break:break-all}
.flo-m.flo-u a{color:inherit}
.flo-typing{align-self:flex-start;color:${P.muted};font-size:13px;padding:0 6px}
.flo-typing i{display:inline-block;width:5px;height:5px;margin-left:3px;border-radius:50%;background:currentColor;animation:floB 1s infinite}
.flo-typing i:nth-child(2){animation-delay:.2s}.flo-typing i:nth-child(3){animation-delay:.4s}
@keyframes floB{0%,80%,100%{opacity:.3}40%{opacity:1}}
.flo-form{display:flex;gap:8px;padding:12px;border-top:1px solid ${P.ligne};background:${P.fond2}}
.flo-form textarea{flex:1;resize:none;min-height:44px;max-height:120px;padding:11px 14px;border-radius:14px;border:1px solid ${P.ligne};background:${P.fond};color:${P.ink};font:inherit;line-height:1.35}
.flo-form button{min-height:44px;padding:0 16px;border-radius:999px;border:0;background:${P.btn};color:${P.btnInk};font:600 14px/1 inherit;cursor:pointer}
.flo-form button:disabled{opacity:.5;cursor:default}
.flo-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 16px 12px;background:${P.fond2};font-size:13px;color:${P.muted}}
.flo-foot a{color:${P.lien};text-decoration:none;font-weight:600}
.flo-err{color:#c8321e;font-size:13px;padding:0 16px 8px;background:${P.fond2}}
@media(max-width:760px){.flo-btn{bottom:calc(76px + env(safe-area-inset-bottom,0px))}.flo-nudge{bottom:calc(140px + env(safe-area-inset-bottom,0px))}.flo-panel{right:0;bottom:0;width:100vw;height:100dvh;max-height:100dvh;border-radius:0;border:0}}
@media(prefers-reduced-motion:reduce){.flo-btn{transition:none}.flo-typing i{animation:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // Éléments
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = mk("button", "flo-btn"); btn.type = "button"; btn.setAttribute("aria-haspopup", "dialog");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5v-8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><span class="flo-btn-t"></span>';
  const nudge = mk("div", "flo-nudge"); nudge.hidden = true; nudge.setAttribute("role", "status");
  const panel = mk("section", "flo-panel"); panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "false"); panel.setAttribute("aria-label", "Flo");
  const head = mk("div", "flo-head");
  const av = mk("div", "flo-av", "F"); const ttl = mk("div", "flo-ttl"); const ttlB = mk("b"); const ttlS = mk("span"); ttl.append(ttlB, ttlS);
  const bLang = mk("button"); bLang.type = "button"; const bClose = mk("button"); bClose.type = "button";
  head.append(av, ttl, bLang, bClose);
  const log = mk("div", "flo-log"); log.setAttribute("aria-live", "polite");
  const err = mk("div", "flo-err"); err.hidden = true;
  const form = mk("form", "flo-form"); const ta = mk("textarea"); ta.rows = 1; ta.maxLength = 600; ta.setAttribute("aria-label", "message");
  const send = mk("button"); send.type = "submit"; form.append(ta, send);
  const foot = mk("div", "flo-foot"); const footTxt = mk("span"); const footA = mk("a"); footA.rel = "noopener"; foot.append(footTxt, footA);
  panel.append(head, log, err, form, foot);
  document.body.append(btn, nudge, panel);

  const libelles = () => {
    const t = T[lang];
    btn.querySelector(".flo-btn-t").textContent = t.ouvrir; btn.setAttribute("aria-label", t.ouvrir);
    ttlB.textContent = t.titre + " · " + t.sous; ttlS.textContent = nomDe(lang);
    bLang.textContent = t.autre; bLang.setAttribute("aria-label", t.autre); bClose.textContent = t.fermer;
    ta.placeholder = t.champ; send.textContent = t.envoyer; footTxt.textContent = pied; footA.textContent = t.rdv; footA.href = rdvDe(lang);
    if (/^https?:/.test(footA.href) && !F) footA.target = "_blank";
    nudge.innerHTML = ""; nudge.append(document.createTextNode(t.nudge)); const x = mk("button", null, "×"); x.type = "button"; x.setAttribute("aria-label", t.fermer); x.addEventListener("click", e => { e.stopPropagation(); nudge.hidden = true; }); nudge.append(x);
  };

  // Rendu des messages : texte brut ; seuls les liens https et les pages .html du site deviennent cliquables
  const LIEN = /https:\/\/[^\s<>"')]+|(?:^|\s)(?:\/|\.\.\/)?[a-z0-9-]+\.html\b/g;
  const rendre = (el, texte) => {
    el.textContent = ""; let i = 0, m;
    LIEN.lastIndex = 0;
    while ((m = LIEN.exec(texte))) {
      let url = m[0], pre = "";
      if (/^\s/.test(url)) { pre = url[0]; url = url.slice(1); }
      el.append(document.createTextNode(texte.slice(i, m.index) + pre));
      const a = mk("a", null, url); a.href = url; a.rel = "noopener";
      if (/^https:/.test(url)) a.target = "_blank";
      if (/calendly|rendez-vous/.test(url)) a.addEventListener("click", () => ev("flo_rdv"));
      el.append(a); i = m.index + m[0].length;
    }
    el.append(document.createTextNode(texte.slice(i)));
  };
  const bulle = (role, texte) => { const d = mk("div", "flo-m " + (role === "user" ? "flo-u" : role === "assistant" ? "flo-a" : "flo-s")); rendre(d, texte); log.append(d); log.scrollTop = log.scrollHeight; return d; };
  const dessiner = () => {
    log.textContent = "";
    if (!etat.messages.length) bulle("assistant", ouvertureDe(lang));
    etat.messages.forEach(m => bulle(m.role, m.text));
  };
  let typing = null;
  const ecrit = on => { if (typing) { typing.remove(); typing = null; } if (on) { typing = mk("div", "flo-typing", T[lang].ecrit); typing.append(mk("i"), mk("i"), mk("i")); log.append(typing); log.scrollTop = log.scrollHeight; } };

  // Réseau
  let occupe = false;
  const MAX_TOURS = 20;
  const envoyer = async (texte) => {
    if (occupe) return;
    if (etat.messages.filter(m => m.role === "user").length >= MAX_TOURS) { bulle("assistant", T[lang].fin); ta.disabled = true; send.disabled = true; return; }
    occupe = true; send.disabled = true; err.hidden = true;
    etat.messages.push({ role: "user", text: texte }); sauver(); bulle("user", texte); ecrit(true);
    ev("flo_message");
    const corps = { session: etat.session, page: location.pathname, messages: etat.messages.slice(-12) };
    if (etat.handoff) corps.handoff = etat.handoff;
    let r = null;
    try {
      const ctl = "AbortController" in window ? new AbortController() : null; if (ctl) setTimeout(() => ctl.abort(), 40000);
      const res = await fetch(base + "/flo/" + persona, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(corps), signal: ctl ? ctl.signal : undefined });
      if (res.status === 429) throw new Error("429");
      r = await res.json();
      if (!res.ok || !r || typeof r.reply !== "string") throw new Error("reponse");
    } catch (e) {
      ecrit(false); etat.messages.pop(); sauver();
      err.textContent = T[lang].erreur; err.hidden = false;
      occupe = false; send.disabled = false; return;
    }
    ecrit(false);
    etat.messages.push({ role: "assistant", text: r.reply }); sauver(); bulle("assistant", r.reply);
    if (r.lead) ev("flo_coordonnees");
    if (r.switch && r.switch.vers && CF[r.switch.vers] && CF[persona] && r.switch.vers !== persona) passer(r.switch, texte);
    occupe = false; send.disabled = false;
  };

  // Réacheminement (creatorflow.ca seulement) : nouvelle persona, conversation neuve, seuls les deux derniers messages du visiteur
  // repartent avec la note ; le handoff est signé par le serveur et renvoyé tel quel à chaque tour (n = nombre de passages)
  const passer = (sw, dernier) => {
    const vers = sw.vers;
    const derniers = etat.messages.filter(m => m.role === "user").slice(-2).map(m => m.text);
    const depuis = persona;
    persona = vers; charger();
    etat = { session: idSession(), messages: [], handoff: { depuis, note: String(sw.note || "").slice(0, 300), n: sw.n, t: sw.t } }; sauver();
    libelles(); dessiner();
    ev("flo_passage", depuis + "→" + vers);
    const p = mk("div", "flo-m flo-s"); const a = mk("a", null, T[lang].voir); a.href = NOMS[vers].page; p.append(a); log.append(p);
    const q = derniers.length > 1 ? derniers[0] + " " + derniers[1] : (derniers[0] || dernier);
    setTimeout(() => envoyer(q.slice(0, 600)), 300);
  };

  // Ouverture, fermeture, langue
  const ouvrir = () => { panel.hidden = false; btn.hidden = true; nudge.hidden = true; dessiner(); ta.focus(); ev("flo_ouvert"); };
  const fermer = () => { panel.hidden = true; btn.hidden = false; btn.focus(); };
  btn.addEventListener("click", ouvrir);
  nudge.addEventListener("click", ouvrir);
  bClose.addEventListener("click", fermer);
  bLang.addEventListener("click", () => { lang = lang === "fr" ? "en" : "fr"; libelles(); dessiner(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) fermer(); });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const t = ta.value.trim(); if (!t) return;
    if (t.length > 600) { err.textContent = T[lang].trop; err.hidden = false; return; }
    ta.value = ""; ta.style.height = ""; envoyer(t);
  });
  ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : send.click(); } });
  ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(120, ta.scrollHeight) + "px"; });

  libelles();
  // Petite bulle après 20 s, une fois par session d'onglet
  try {
    if (!sessionStorage.getItem("flo:nudge") && !etat.messages.length) {
      setTimeout(() => { if (panel.hidden) { nudge.hidden = false; try { sessionStorage.setItem("flo:nudge", "1"); } catch (e) {} } }, 20000);
    }
  } catch (e) {}
})();
