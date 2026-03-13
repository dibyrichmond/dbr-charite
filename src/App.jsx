import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ══════════════════════════════════════════════════════════════════════════
// THÈMES
// ══════════════════════════════════════════════════════════════════════════
const THEMES = {
  dark: {
    orange: "#E8540A", orangeD: "#C4420A", blue: "#4AB8E8", blueD: "#2E95C5",
    bg: "#0D0D0D", card: "#1A1A1A", border: "#2A2A2A", white: "#FFFFFF",
    muted: "#8A8A8A", green: "#27AE60", red: "#E74C3C", text: "#F0F0F0",
    textDim: "#AAAAAA", inputBg: "rgba(255,255,255,0.07)", inputBorder: "rgba(255,255,255,0.12)",
    gradient: "linear-gradient(160deg,#0D0D0D 0%,#1a0a00 100%)",
    cardBg: "rgba(255,255,255,0.04)", shadow: "rgba(0,0,0,0.4)",
  },
  light: {
    orange: "#E8540A", orangeD: "#C4420A", blue: "#2E95C5", blueD: "#1a7aab",
    bg: "#F8F8F8", card: "#FFFFFF", border: "#E2E2E2", white: "#1A1A1A",
    muted: "#6B7280", green: "#27AE60", red: "#E74C3C", text: "#1F2937",
    textDim: "#6B7280", inputBg: "#F3F4F6", inputBorder: "#D1D5DB",
    gradient: "linear-gradient(160deg,#F8F8F8 0%,#FFF5EE 100%)",
    cardBg: "rgba(0,0,0,0.02)", shadow: "rgba(0,0,0,0.08)",
  },
};
const ThemeCtx = createContext(THEMES.dark);

// ══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════
const SUPER_ADMIN = "dibyrichmond@gmail.com";
const APP_NAME = "Réel";
const LS = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
function hashPwd(p) { let h = 5381; for (let i = 0; i < p.length; i++) h = ((h << 5) + h) ^ p.charCodeAt(i); return (h >>> 0).toString(36); }
function fmtDate(ts) { return ts ? new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"; }

// ══════════════════════════════════════════════════════════════════════════
// DONNÉES — BLOCS CHARITÉ
// ══════════════════════════════════════════════════════════════════════════
const CTX = `CONTEXTE GÉOGRAPHIQUE ET CULTUREL :
- Participant basé en Côte d'Ivoire (Abidjan ou autre ville ivoirienne)
- Monnaie : Franc CFA (FCFA) — utilise toujours FCFA, jamais euros ou dollars
- Fuseau horaire : GMT+0 (Abidjan)
- Références culturelles : contexte ivoirien / africain francophone
- Si tu mentionnes des exemples de revenus, utilise des montants en FCFA (ex: 500 000 FCFA/mois)
- Respecte les codes culturels : famille élargie, communauté, respect des aînés
- Utilise le jargon ivoirien quand c'est pertinent (ex: "on dit quoi", "c'est comment", "y'a moyen")
- Connais les réalités socio-économiques : débrouillardise, foi, solidarité communautaire
- Références aux traditions ethniques (Baoulé, Bété, Dioula, Sénoufo, etc.) si pertinent
- Comprends le contexte socio-politique : résilience, espoir, ambition malgré les défis`;

const BLOCS_CHA = [
  {
    id: "C", label: "CLARIFIER", desc: "Identifier le rêve racine", questions: [
      { id: "C1", title: "Tes moments de flow", q: "Donne-moi 2 à 3 moments des 30 derniers jours où tu as complètement oublié le temps. Pour chacun : qu'est-ce que tu faisais exactement, combien de temps ça a duré, qu'as-tu produit, et est-ce que quelqu'un t'a sollicité pour ça ?", hint: "Ce que tu fais quand personne ne te demande — c'est là que vit ton rêve.", ph: "Ex : Samedi dernier, j'ai aidé un ami à structurer son business plan de 14h à 18h sans voir le temps passer..." },
      { id: "C2", title: "Les problèmes qui t'attirent", q: "Quels problèmes complexes t'attirent naturellement, même sans être payé ? Qui dans ton entourage vient te voir pour ce type de problème ? Donne un exemple concret récent.", hint: "Cherche ce qui te nourrit sans récompense.", ph: "Ex : Les gens viennent me voir quand ils sont perdus dans leurs projets..." },
    ]
  },
  {
    id: "H", label: "HONORER", desc: "Accepter le coût réel du rêve", questions: [
      { id: "H1", title: "Le prix concret", q: "Ce rêve a un prix. Sois précis : combien d'heures par semaine tu t'engages à y consacrer, pendant combien de mois ? Qu'est-ce que tu es prêt à mettre en pause ? Nomme quelque chose de concret que tu arrêtes.", hint: "Un rêve sans coût accepté reste un caprice.", ph: "Ex : 3 soirées par semaine pendant 6 mois. J'arrête les matchs du weekend..." },
      { id: "H2", title: "Tes peurs et obstacles", q: "Si ce rêve réussit totalement dans 2 ans — tu es visible, reconnu à Abidjan et au-delà — qu'est-ce qui te fait peur dans ce succès ? Qui pourrait freiner ce projet ? Et quelle est la peur que tu ne dis jamais à voix haute ?", hint: "Les peurs de réussir sabotent plus souvent que les peurs d'échouer.", ph: "Ex : Peur que ma famille pense que je les oublie..." },
    ]
  },
  {
    id: "A", label: "ALIGNER", desc: "Libérer l'énergie gaspillée", questions: [
      { id: "A1", title: "Cohérence & Identité", q: "Mesure l'écart entre ce que tu dis vouloir et ce que tu fais vraiment — en heures par semaine ou en FCFA par mois. Quelle contradiction te coûte le plus d'énergie ? Et qui dois-tu devenir pour que ce rêve soit normal dans ta vie ?", hint: "L'incohérence n'est pas un jugement — c'est une mesure.", ph: "Ex : Je dis que c'est ma priorité mais j'y consacre 0h depuis 3 semaines..." },
    ]
  },
];

const BLOC_5P = {
  id: "5P", label: "5 POURQUOI", desc: "Vérifier la profondeur du rêve", questions: [
    { id: "5P1", title: "Ton rêve en une phrase", q: "Formule ton rêve en une phrase claire et concrète. Pas d'idéal flou — une direction précise. Je vais ensuite te poser la question « Pourquoi » 5 fois pour m'assurer qu'on travaille sur le vrai problème.", hint: "Dis ce qui vient naturellement. On va creuser ensemble.", ph: "Ex : Je veux créer une agence de communication digitale à Abidjan..." },
  ]
};

const BLOC_VISION = {
  id: "V", label: "VISION", desc: "Projeter le rêve dans le réel", questions: [
    { id: "V1", title: "Ta vision à 3 ans", q: "Ferme les yeux. Nous sommes en 2029. Ton rêve s'est réalisé. Décris ta journée type : où es-tu ? Avec qui ? Que fais-tu entre 7h et 22h ? Combien gagnes-tu ? Quelle est ta réputation à Abidjan ?", hint: "Plus c'est précis, plus ton cerveau le programme comme atteignable.", ph: "Ex : Je me réveille dans mon appartement à Cocody, je prends mon café en regardant les mails de 3 clients internationaux..." },
    { id: "V2", title: "Le film de ta réussite", q: "Imagine qu'un journaliste de Fraternité Matin écrit un article sur toi dans 3 ans. Quel est le titre ? Que dit l'article sur ton parcours, tes résultats, et ce qui te rend unique ?", hint: "Écris l'article comme si c'était déjà fait. Le futur se construit avec des images.", ph: "Ex : « De zéro à référence : comment [Prénom] a révolutionné [domaine] en Côte d'Ivoire »..." },
  ]
};

const BLOCS_RITE = [
  {
    id: "R", label: "RENONCER", desc: "Choisir crée la puissance", questions: [
      { id: "R1", title: "Priorité unique & Garde-fous", q: "Quelle est LA seule priorité des 90 prochains jours ? Nomme ce qui passe en pause avec une date précise. Quelle est ta règle d'arrêt ? Et qui sait que c'est ta priorité — quelqu'un qui peut te demander des comptes ?", hint: "Renoncer explicitement est plus puissant qu'ajouter.", ph: "Ex : Priorité : 3 premiers clients avant le 1er avril..." },
    ]
  },
  {
    id: "I", label: "INSTALLER", desc: "Un système simple qui tient", questions: [
      { id: "I1", title: "Rituel ancré", q: "Quel rituel de 30 à 45 minutes maximum installes-tu — avec un déclencheur précis (après quoi, à quelle heure) ? Que produis-tu pendant ce temps ? Et quelle est ta règle si ce créneau saute un jour ?", hint: "Complexité = abandon. Simplicité = durabilité.", ph: "Ex : Chaque matin après le café, 30 min sur le projet..." },
    ]
  },
  {
    id: "T", label: "TENIR", desc: "La constance sans héroïsme", questions: [
      { id: "T1", title: "Plan de retour", q: "Qu'est-ce qui pourrait te faire décrocher dans les 30 premiers jours ? Quelle est ta règle si tu rates 2 jours ? Si tu rates une semaine entière ? Et qui peut te dire la vérité quand tu es dans le brouillard ?", hint: "La vraie discipline c'est savoir revenir, pas ne jamais tomber.", ph: "Ex : 2 jours ratés : je reprends sans commentaire..." },
    ]
  },
  {
    id: "É", label: "ÉPROUVER", desc: "Le rêve survit-il au réel ?", questions: [
      { id: "E1", title: "Sprint de preuve", q: "Quelle preuve concrète vas-tu produire dans les 7 prochains jours ? Une action par jour qui laisse une trace visible. À qui vas-tu la montrer pour avoir un retour réel ?", hint: "Le sprint prouve que le rêve survit au contact de la réalité.", ph: "Ex : Jour 1-7 : je contacte 2 clients potentiels par jour..." },
    ]
  },
];

const SYSTEM = `Tu es Réel, coach de transformation personnelle — méthode CHARITÉ de DBR (Dreams Become Reality).

TU ES :
- Expert en psychologie positive, psychologie comportementale et développement personnel
- Spécialiste du coaching de vie et de carrière
- Profond connaisseur de la culture africaine, et plus précisément ivoirienne
- Tu connais les traditions des ethnies (Baoulé, Bété, Dioula, Sénoufo, Agni, Attié, Abbey, etc.)
- Tu maîtrises le jargon ivoirien (nouchi, expressions courantes : "on est ensemble", "c'est comment", "y'a moyen", "on dit quoi", "gbê", "c'est dja")
- Tu comprends l'hospitalité légendaire ivoirienne, l'importance de la communauté, de la famille élargie
- Tu connais le contexte socio-politique et économique : la résilience, la débrouillardise, la foi
- Tu sais que l'ambition en Côte d'Ivoire passe souvent par le commerce, l'entrepreneuriat, le digital

${CTX}

TON STYLE :
- Prose directe, chaleureuse, jamais de listes à puces
- "tu" familier — comme un grand frère ou une grande sœur qui te veut du bien
- 100 à 180 mots maximum (sauf synthèse ou conclusion)
- Tu peux utiliser des expressions ivoiriennes naturellement quand ça renforce le propos
- Tu es exigeant mais bienveillant — tu ne laisses pas passer le flou
- Tu identifies les forces ET les signaux faibles (peur, évitement, vague, contradiction)

RÈGLES STRICTES :
- Termine TOUJOURS par "✓ Solide." quand la réponse est validée
- OU par une question de précision si c'est flou ou insuffisant
- Ne passe JAMAIS à la question suivante si tu n'as pas validé avec "✓ Solide."
- Si l'utilisateur essaie de sauter une étape, ramène-le avec bienveillance

SYNTHÈSES DE BLOC :
- 3-4 phrases qui résument ce qui a émergé
- 1 force + 1 vigilance
- Pour bloc C : formule "Je [verbe] [problème] pour [bénéficiaire] via [format]"
- Termine : "Est-ce que cette synthèse te semble juste ?"

5 POURQUOI :
- Creuse chaque réponse avec "Et pourquoi c'est important pour toi ?" jusqu'à 5 fois
- Identifie si le rêve est une fuite ou une valeur profonde
- Valide uniquement quand tu sens la racine authentique

BLOC VISION :
- Aide à projeter le rêve dans le concret
- Pousse la précision sensorielle (lieu, heure, montant, personnes)
- Challenge les visions trop floues ou trop idéalisées`;

// ══════════════════════════════════════════════════════════════════════════
// LOGO
// ══════════════════════════════════════════════════════════════════════════
const Logo = ({ size = 40 }) => (
  <img src="/logo.png" alt="DBR" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    onError={e => { e.target.style.display = "none"; const d = document.createElement("div"); d.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#E8540A,#C4420A);display:flex;align-items:center;justify-content:center;flex-shrink:0`; d.innerHTML = `<span style="color:#fff;font-weight:900;font-size:${Math.round(size * 0.38)}px;letter-spacing:-1px">DBR</span>`; e.target.parentNode.appendChild(d); }} />
);

// ══════════════════════════════════════════════════════════════════════════
// SPEECH HOOK
// ══════════════════════════════════════════════════════════════════════════
function cleanTTS(raw) {
  return raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,6}\s/g, "")
    .replace(/---+/g, ".").replace(/[✓→↑⏸⬇←🎤⏹▶🌙☀️]/g, "")
    .replace(/\[.*?\]/g, "").replace(/:\s*\n/g, ". ")
    .replace(/\n{2,}/g, ". ").replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ").replace(/\.{2,}/g, ".").trim();
}
function pickVoice(voices) {
  if (!voices.length) return null;
  const scored = voices.map(v => { let s = 0; if (v.lang.startsWith("fr")) s += 100; if (v.lang === "fr-FR") s += 10; const n = v.name.toLowerCase(); if (n.includes("thomas") || n.includes("amelie") || n.includes("marie") || n.includes("neural") || n.includes("enhanced") || n.includes("google")) s += 50; if (n.includes("microsoft") || n.includes("apple")) s += 20; if (n.includes("espeak") || n.includes("festival")) s -= 50; return { v, s }; });
  return scored.sort((a, b) => b.s - a.s)[0].v;
}
function useSpeech() {
  const synthRef = useRef(null), recogRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [voices, setVoices] = useState([]);
  const accRef = useRef(""), cbRef = useRef(null), shouldRef = useRef(false);
  useEffect(() => { try { const s = window.speechSynthesis; synthRef.current = s; const load = () => { const v = s.getVoices(); if (v.length) setVoices(v); }; load(); s.addEventListener("voiceschanged", load); return () => s.removeEventListener("voiceschanged", load); } catch {} }, []);
  const speak = useCallback((text, onDone) => { if (!synthRef.current) return; try { synthRef.current.cancel(); const clean = cleanTTS(text); if (!clean) return; const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean]; let idx = 0; const next = () => { if (idx >= sentences.length) { setSpeaking(false); onDone?.(); return; } const utt = new SpeechSynthesisUtterance(sentences[idx].trim()); const v = pickVoice(voices); if (v) { utt.voice = v; utt.lang = v.lang; } else utt.lang = "fr-FR"; utt.rate = 0.88; utt.pitch = 1.02; utt.volume = 1; if (idx === 0) utt.onstart = () => setSpeaking(true); utt.onend = () => { idx++; next(); }; utt.onerror = (e) => { if (e.error !== "interrupted") { idx++; next(); } else setSpeaking(false); }; synthRef.current.speak(utt); }; next(); } catch { setSpeaking(false); } }, [voices]);
  const stopSpeak = useCallback(() => { try { synthRef.current?.cancel(); } catch {} setSpeaking(false); }, []);
  const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const startInstance = useCallback(() => { if (!SR || !shouldRef.current) return; try { const r = new SR(); r.lang = "fr-FR"; r.continuous = false; r.interimResults = true; r.maxAlternatives = 1; r.onresult = (e) => { let interim = ""; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) { accRef.current = (accRef.current + " " + t).trim(); cbRef.current?.(accRef.current); } else interim += t; } setLiveText((accRef.current + (interim ? " " + interim : "")).trim()); }; r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { shouldRef.current = false; setListening(false); cbRef.current?.("__MIC_BLOCKED__"); } }; r.onend = () => { if (shouldRef.current) setTimeout(() => startInstance(), 150); else setListening(false); }; r.start(); recogRef.current = r; } catch { setListening(false); } }, [SR]);
  const startListen = useCallback((cb) => { if (!SR) return false; cbRef.current = cb; accRef.current = ""; shouldRef.current = true; setListening(true); setLiveText(""); startInstance(); return true; }, [SR, startInstance]);
  const stopListen = useCallback(() => { shouldRef.current = false; try { recogRef.current?.stop(); recogRef.current = null; } catch {} setListening(false); return accRef.current.trim(); }, []);
  return { speak, stopSpeak, speaking, startListen, stopListen, listening, liveText, hasSR: !!SR, voices };
}

// ══════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════
function Auth({ onLogin }) {
  const T = useContext(ThemeCtx);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""), [pwd, setPwd] = useState(""), [pwd2, setPwd2] = useState(""), [name, setName] = useState(""), [invCode, setInvCode] = useState("");
  const [err, setErr] = useState(""), [info, setInfo] = useState("");
  const [showPwd, setShowPwd] = useState(false), [showPwd2, setShowPwd2] = useState(false);

  // Ensure super admin exists
  useEffect(() => {
    const users = LS.get("dbr_users") || {};
    if (!users[SUPER_ADMIN]) {
      users[SUPER_ADMIN] = { name: "Admin DBR", hash: hashPwd("Dbr@2026!"), isAdmin: true, role: "superadmin", createdAt: Date.now(), approved: true };
      LS.set("dbr_users", users);
    }
    // Ensure default invitation codes exist
    const codes = LS.get("dbr_invitations") || [];
    if (codes.length === 0) {
      const defaults = Array.from({ length: 3 }, () => ({ code: genCode(), createdBy: SUPER_ADMIN, createdAt: Date.now(), usedBy: null, role: "participant" }));
      LS.set("dbr_invitations", defaults);
    }
  }, []);

  const pwdField = (ph, val, set, show, setShow) => (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <input value={val} onChange={e => set(e.target.value)} type={show ? "text" : "password"} placeholder={ph}
        style={{ width: "100%", padding: "14px 44px 14px 16px", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: T.text }}
        onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = T.inputBorder} />
      <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.muted, padding: 0 }}>{show ? "🙈" : "👁️"}</button>
    </div>
  );
  const inp = (ph, val, set, type = "text") => (
    <input value={val} onChange={e => set(e.target.value)} type={type} placeholder={ph}
      style={{ width: "100%", padding: "14px 16px", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12, color: T.text }}
      onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = T.inputBorder} />
  );

  function doLogin() {
    setErr(""); if (!email || !pwd) return setErr("Remplis tous les champs.");
    const users = LS.get("dbr_users") || {}; const u = users[email.toLowerCase().trim()];
    if (!u) return setErr("Aucun compte avec cet email.");
    if (u.hash !== hashPwd(pwd)) return setErr("Mot de passe incorrect.");
    if (!u.approved && !u.isAdmin) return setErr("Ton compte est en attente d'approbation par l'administrateur.");
    const usr = { email: email.toLowerCase().trim(), name: u.name, isAdmin: u.isAdmin || false, role: u.role || "participant" };
    LS.set("dbr_current_user", usr);
    onLogin(usr);
  }

  function doRegister() {
    setErr(""); if (!email || !pwd || !name || !invCode) return setErr("Remplis tous les champs, y compris le code d'invitation.");
    if (pwd !== pwd2) return setErr("Les mots de passe ne correspondent pas.");
    if (pwd.length < 6) return setErr("6 caractères minimum.");
    const codes = LS.get("dbr_invitations") || [];
    const codeObj = codes.find(c => c.code === invCode.trim().toUpperCase() && !c.usedBy);
    if (!codeObj) return setErr("Code d'invitation invalide ou déjà utilisé.");
    if (codeObj.expiresAt && Date.now() > codeObj.expiresAt) return setErr("Ce code a expiré. Demande un nouveau code à l'administrateur.");
    const em = email.toLowerCase().trim();
    if (codeObj.forEmail && codeObj.forEmail !== em) return setErr("Ce code est réservé à une autre adresse email.");
    const users = LS.get("dbr_users") || {};
    if (users[em]) return setErr("Email déjà utilisé.");
    users[em] = { name: name.trim(), hash: hashPwd(pwd), isAdmin: false, role: codeObj.role || "participant", createdAt: Date.now(), approved: true, invitedBy: codeObj.createdBy };
    LS.set("dbr_users", users);
    codeObj.usedBy = em; codeObj.usedAt = Date.now();
    LS.set("dbr_invitations", codes);
    const usr = { email: em, name: name.trim(), isAdmin: false, role: codeObj.role || "participant" };
    LS.set("dbr_current_user", usr);
    onLogin(usr);
  }

  function doReset() {
    setErr(""); if (!email) return setErr("Entre ton email.");
    const users = LS.get("dbr_users") || {};
    if (!users[email.toLowerCase().trim()]) return setErr("Aucun compte trouvé.");
    const tmp = genCode();
    users[email.toLowerCase().trim()].hash = hashPwd(tmp); LS.set("dbr_users", users);
    setInfo(`Mot de passe temporaire : ${tmp}`); setMode("login");
  }

  const btn = { width: "100%", padding: "15px", background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", marginBottom: 10, fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Logo size={90} /></div>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.orange, letterSpacing: "6px" }}>DBR</div>
          <div style={{ fontSize: 12, color: T.blue, letterSpacing: "4px", fontWeight: 600, marginTop: 4 }}>MÉTHODE CHARITÉ</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Coach {APP_NAME} — Dreams Become Reality</div>
        </div>
        <div style={{ background: T.cardBg, border: `1px solid rgba(232,84,10,0.3)`, borderRadius: 16, padding: "32px 24px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 24, textAlign: "center" }}>
            {mode === "login" ? "Connexion" : mode === "register" ? "Créer un compte" : "Mot de passe oublié"}
          </div>
          {err && <div style={{ background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: T.red }}>⚠ {err}</div>}
          {info && <div style={{ background: "rgba(39,174,96,0.12)", border: "1px solid rgba(39,174,96,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: T.green }}>✓ {info}</div>}
          {mode === "register" && inp("Prénom", name, setName)}
          {inp("Email", email, setEmail, "email")}
          {mode !== "reset" && pwdField("Mot de passe", pwd, setPwd, showPwd, setShowPwd)}
          {mode === "register" && pwdField("Confirmer le mot de passe", pwd2, setPwd2, showPwd2, setShowPwd2)}
          {mode === "register" && inp("Code d'invitation", invCode, setInvCode)}
          <div style={{ marginTop: 4 }}>
            {mode === "login" && <button onClick={doLogin} style={btn}>Se connecter</button>}
            {mode === "register" && <button onClick={doRegister} style={btn}>Créer mon compte</button>}
            {mode === "reset" && <button onClick={doReset} style={btn}>Réinitialiser</button>}
          </div>
          {mode === "login" && <>
            <button onClick={() => { setMode("register"); setErr(""); setInfo(""); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 14, cursor: "pointer", padding: "6px 0", fontFamily: "inherit", display: "block", width: "100%", textAlign: "center", marginBottom: 4 }}>Pas encore de compte ? S'inscrire</button>
            <button onClick={() => { setMode("reset"); setErr(""); setInfo(""); }} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", padding: "4px 0", fontFamily: "inherit", display: "block", width: "100%", textAlign: "center" }}>Mot de passe oublié</button>
          </>}
          {mode !== "login" && <button onClick={() => { setMode("login"); setErr(""); setInfo(""); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 14, cursor: "pointer", padding: "6px 0", fontFamily: "inherit", display: "block", width: "100%", textAlign: "center" }}>← Retour à la connexion</button>}
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: T.muted, opacity: 0.5 }}>Clarté · Stabilité · Liberté</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// AIGUILLAGE
// ══════════════════════════════════════════════════════════════════════════
function Aiguillage({ user, onKnow, onDontKnow, onLogout }) {
  const T = useContext(ThemeCtx);
  const [choice, setChoice] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Logo size={72} /></div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 2 }}>Bienvenue, {user.name}</div>
          <div style={{ fontSize: 12, color: T.blue, letterSpacing: "3px" }}>COACH {APP_NAME.toUpperCase()}</div>
        </div>
        <div style={{ background: T.cardBg, border: "1px solid rgba(232,84,10,0.25)", borderRadius: 16, padding: "36px 28px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 10, textAlign: "center" }}>À toi de jouer</div>
          <div style={{ fontSize: 15, color: T.textDim, textAlign: "center", marginBottom: 32, lineHeight: 1.7 }}>Une seule question pour commencer :<br /><strong style={{ color: T.text }}>As-tu déjà une idée — même floue — de la direction que tu veux donner à ta vie ?</strong></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => setChoice("know")} style={{ padding: "18px 24px", background: choice === "know" ? `linear-gradient(135deg,${T.orange},${T.orangeD})` : "rgba(232,84,10,0.08)", border: `2px solid ${choice === "know" ? T.orange : "rgba(232,84,10,0.2)"}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 4 }}>Oui, j'ai une idée 💡</div>
              <div style={{ fontSize: 13, color: T.muted }}>On va vérifier que c'est le vrai rêve — et le transformer en plan</div>
            </button>
            <button onClick={() => setChoice("dontknow")} style={{ padding: "18px 24px", background: choice === "dontknow" ? `linear-gradient(135deg,${T.blueD},${T.blue})` : "rgba(74,184,232,0.06)", border: `2px solid ${choice === "dontknow" ? T.blue : "rgba(74,184,232,0.15)"}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 4 }}>Non, je cherche encore 🧭</div>
              <div style={{ fontSize: 13, color: T.muted }}>On va creuser ensemble pour trouver ta direction</div>
            </button>
          </div>
          {choice && <button onClick={() => choice === "know" ? onKnow() : onDontKnow()} style={{ width: "100%", padding: "15px", marginTop: 24, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: "inherit" }}>Commencer le parcours →</button>}
          <button onClick={onLogout} style={{ width: "100%", marginTop: 12, background: "none", border: "none", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>Se déconnecter</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BUBBLE
// ══════════════════════════════════════════════════════════════════════════
function Bubble({ msg, id, onSpeak, speaking, activeSpeakId }) {
  const T = useContext(ThemeCtx);
  const isUser = msg.role === "user"; const raw = msg.content || "";
  const fmt = (text) => text.split("\n").map((line, i) => {
    if (/^-{3,}$/.test(line.trim())) return <hr key={i} style={{ border: "none", borderBottom: `1px solid rgba(232,84,10,0.2)`, margin: "10px 0" }} />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return <div key={i} style={{ marginBottom: line.trim() ? 3 : 7, lineHeight: 1.75 }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: T.orange }}>{p}</strong> : p)}</div>;
  });
  if (msg.sys) return (<div style={{ textAlign: "center", padding: "14px 0" }}><span style={{ background: "rgba(232,84,10,0.12)", color: T.orange, fontSize: 10, fontWeight: 700, letterSpacing: "2px", padding: "5px 16px", borderRadius: 20, border: "1px solid rgba(232,84,10,0.25)", textTransform: "uppercase" }}>{raw}</span></div>);
  if (isUser) return (<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}><div style={{ maxWidth: "80%", background: `linear-gradient(135deg,rgba(232,84,10,0.2),rgba(196,66,10,0.15))`, border: "1px solid rgba(232,84,10,0.25)", color: T.text, padding: "13px 17px", borderRadius: "14px 14px 3px 14px", fontSize: 15, lineHeight: 1.65 }}>{fmt(raw)}{msg.audio && <div style={{ fontSize: 10, color: T.muted, marginTop: 4, opacity: 0.6 }}>🎤 audio</div>}</div></div>);
  const isSynth = msg.synth; const isConc = msg.conc;
  const boxStyle = isConc ? { background: `linear-gradient(135deg,rgba(232,84,10,0.12),rgba(74,184,232,0.08))`, border: `1px solid ${T.orange}`, borderRadius: 12, padding: "22px 24px" } : isSynth ? { background: "rgba(74,184,232,0.06)", border: "1px solid rgba(74,184,232,0.2)", borderLeft: `4px solid ${T.blue}`, borderRadius: 8, padding: "16px 20px" } : { background: T.card, border: `1px solid ${T.border}`, borderRadius: "3px 14px 14px 14px", padding: "13px 17px" };
  const isTalking = activeSpeakId === id && speaking;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
      <Logo size={34} />
      <div style={{ flex: 1, ...boxStyle, fontSize: 15, color: T.text }}>
        {isConc && <div style={{ fontSize: 10, color: T.orange, letterSpacing: "2px", marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>Conclusion de ton parcours</div>}
        {fmt(raw)}
        <button onClick={() => onSpeak(raw, id)} style={{ marginTop: 8, background: "none", border: `1px solid ${T.border}`, borderRadius: 4, cursor: "pointer", fontSize: 10, color: T.muted, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}>
          {isTalking ? "⏹ Arrêter" : "▶ Écouter"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN CONSOLE
// ══════════════════════════════════════════════════════════════════════════
function Admin({ user, onBack }) {
  const T = useContext(ThemeCtx);
  const [tab, setTab] = useState("dashboard");
  const [__, bump] = useState(0);
  const refresh = () => bump(n => n + 1);
  const [newRole, setNewRole] = useState("participant");
  const [codeEmail, setCodeEmail] = useState("");
  const [codeCount, setCodeCount] = useState(1);
  const [copied, setCopied] = useState(null);
  const [codeSending, setCodeSending] = useState(null);
  const [codeMsg, setCodeMsg] = useState("");
  const [emailTo, setEmailTo] = useState(""), [emailSubject, setEmailSubject] = useState(""), [emailBody, setEmailBody] = useState("");
  const [emailStatus, setEmailStatus] = useState("");

  const users = LS.get("dbr_users") || {};
  const codes = LS.get("dbr_invitations") || [];
  const WEEK = 7 * 24 * 3600 * 1000;
  const isExpired = (c) => c.expiresAt && Date.now() > c.expiresAt;
  const codeStatusFn = (c) => c.usedBy ? "used" : isExpired(c) ? "expired" : "available";
  const allUsers = Object.keys(users).map(em => {
    const u = users[em];
    const sessions = LS.get(`dbr_all_sessions_${em}`) || [];
    const current = LS.get(`dbr_sess_${em}`);
    return { email: em, ...u, sessions, currentSession: current, sessionCount: sessions.length + (current ? 1 : 0) };
  });
  const stats = {
    total: allUsers.length,
    admins: allUsers.filter(u => u.isAdmin).length,
    started: allUsers.filter(u => u.currentSession?.msgs?.length > 0).length,
    completed: allUsers.filter(u => u.currentSession?.phase === "conclusion" || u.sessions.some(s => s.phase === "conclusion")).length,
    codesUsed: codes.filter(c => c.usedBy).length,
    codesAvailable: codes.filter(c => codeStatusFn(c) === "available").length,
  };

  function generateCodes() {
    const existing = LS.get("dbr_invitations") || [];
    const email = codeEmail.trim().toLowerCase();
    const cnt = email ? 1 : Math.max(1, Math.min(10, codeCount));
    const newCodes = Array.from({ length: cnt }, () => ({
      code: genCode(), createdBy: user.email, createdAt: Date.now(), usedBy: null, role: newRole,
      ...(email ? { forEmail: email, expiresAt: Date.now() + WEEK } : {}),
    }));
    LS.set("dbr_invitations", [...existing, ...newCodes]);
    setCodeEmail("");
    setCodeMsg(`✓ ${cnt} code${cnt > 1 ? "s" : ""} créé${cnt > 1 ? "s" : ""}${email ? ` pour ${email} (7j)` : ""}`);
    setTimeout(() => setCodeMsg(""), 4000);
    refresh();
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code).then(() => { setCopied(code); setTimeout(() => setCopied(null), 2000); }).catch(() => {});
  }

  async function sendCodeEmail(c) {
    const to = c.forEmail || ""; if (!to) return;
    setCodeSending(c.code);
    try {
      const expire = c.expiresAt ? `<br><br>Ce code est valable jusqu'au ${new Date(c.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.` : "";
      const res = await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, subject: `Ton code d'invitation DBR — Coach ${APP_NAME}`, html: `<div style="font-family:system-ui;background:#0D0D0D;color:#F0F0F0;padding:40px 24px;"><div style="max-width:520px;margin:0 auto;background:#1A1A1A;border:1px solid rgba(232,84,10,0.3);border-radius:16px;padding:36px;"><div style="text-align:center;margin-bottom:24px;font-size:24px;font-weight:900;letter-spacing:6px;color:#E8540A;">DBR</div><div style="text-align:center;font-size:12px;color:#4AB8E8;letter-spacing:3px;margin-bottom:32px;">MÉTHODE CHARITÉ</div><div style="font-size:15px;line-height:1.8;color:#AAAAAA;margin-bottom:24px;">Tu as été invité(e) à rejoindre le parcours de coaching DBR avec le coach ${APP_NAME}.</div><div style="text-align:center;background:rgba(232,84,10,0.08);border:2px dashed rgba(232,84,10,0.4);border-radius:12px;padding:24px;margin-bottom:24px;"><div style="font-size:12px;color:#8A8A8A;margin-bottom:8px;">TON CODE D'INVITATION</div><div style="font-size:32px;font-weight:900;letter-spacing:6px;color:#E8540A;font-family:monospace;">${c.code}</div></div><div style="font-size:13px;color:#8A8A8A;text-align:center;">Utilise ce code lors de ton inscription.${expire}</div></div></div>` }) });
      if (res.ok) setCodeMsg(`✓ Code envoyé à ${to}`); else setCodeMsg("Erreur d'envoi.");
    } catch { setCodeMsg("Erreur réseau."); }
    setCodeSending(null); setTimeout(() => setCodeMsg(""), 4000);
  }

  function toggleAdmin(email) {
    if (email === SUPER_ADMIN) return;
    const u = LS.get("dbr_users") || {};
    if (!u[email]) return;
    u[email].isAdmin = !u[email].isAdmin;
    u[email].role = u[email].isAdmin ? "admin" : "participant";
    LS.set("dbr_users", u);
    refresh();
  }

  function removeUser(email) {
    if (email === SUPER_ADMIN || email === user.email) return;
    if (!window.confirm(`Supprimer ${email} ?`)) return;
    const u = LS.get("dbr_users") || {};
    delete u[email];
    LS.set("dbr_users", u);
    LS.del(`dbr_sess_${email}`);
    LS.del(`dbr_all_sessions_${email}`);
    refresh();
  }

  function dlTranscript(email) {
    const sess = LS.get(`dbr_sess_${email}`); if (!sess || !sess.msgs?.length) return alert("Aucun transcript.");
    const u = users[email];
    const lines = sess.msgs.map(m => { if (m.sys) return `\n${"═".repeat(40)}\n${m.content}\n`; const who = m.role === "user" ? `${u.name}${m.audio ? " (audio)" : ""}` : `Coach ${APP_NAME}`; return `[${who}]\n${m.content}\n`; }).join("\n---\n\n");
    const blob = new Blob([`PARCOURS DBR — MÉTHODE CHARITÉ\nCoach : ${APP_NAME}\nParticipant : ${u.name} (${email})\nDate : ${new Date().toLocaleDateString("fr-FR")}\n${"═".repeat(50)}\n\n${lines}`], { type: "text/plain;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `DBR_${u.name.replace(/\s+/g, "_")}.txt` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function exportCSV() {
    const headers = ["Nom", "Email", "Rôle", "Admin", "Inscrit le", "Sessions", "Statut"];
    const rows = allUsers.map(u => [u.name, u.email, u.role || "participant", u.isAdmin ? "Oui" : "Non", fmtDate(u.createdAt), u.sessionCount, u.currentSession?.phase === "conclusion" ? "Complété" : u.currentSession?.msgs?.length > 0 ? "En cours" : "Non débuté"]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `DBR_Export_${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  async function sendEmail() {
    if (!emailTo || !emailSubject || !emailBody) return setEmailStatus("Remplis tous les champs.");
    setEmailStatus("Envoi en cours...");
    try {
      const res = await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: emailTo, subject: emailSubject, html: `<div style="font-family:system-ui;background:#0D0D0D;color:#F0F0F0;padding:40px 24px;"><div style="max-width:560px;margin:0 auto;background:#1A1A1A;border:1px solid rgba(232,84,10,0.3);border-radius:16px;padding:32px;"><div style="text-align:center;margin-bottom:20px;font-size:22px;font-weight:900;letter-spacing:6px;color:#E8540A;">DBR</div><div style="font-size:14px;line-height:1.8;color:#AAAAAA;">${emailBody.replace(/\n/g, "<br>")}</div></div></div>` }) });
      if (res.ok) { setEmailStatus("✓ Email envoyé !"); setEmailTo(""); setEmailSubject(""); setEmailBody(""); } else setEmailStatus("Erreur d'envoi.");
    } catch { setEmailStatus("Erreur réseau."); }
  }

  const tabBtn = (id, label) => <button onClick={() => setTab(id)} style={{ padding: "8px 16px", background: tab === id ? T.orange : "transparent", border: `1px solid ${tab === id ? T.orange : T.border}`, borderRadius: 6, color: tab === id ? "#FFFFFF" : T.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{label}</button>;
  const statCard = (label, val, color) => (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", borderTop: `3px solid ${color}`, flex: "1 1 140px", minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{val}</div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "system-ui,sans-serif" }}>
      <div style={{ background: T.card, borderBottom: `2px solid ${T.orange}`, padding: "0 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={28} />
            <span style={{ fontWeight: 700, color: T.text }}>Console Admin — {APP_NAME}</span>
          </div>
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 14px", color: T.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← Retour</button>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* DASHBOARD */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 28 }}>
          {statCard("Participants", stats.total, T.blue)}
          {statCard("Admins", stats.admins, T.orange)}
          {statCard("En cours", stats.started, "#F39C12")}
          {statCard("Complétés", stats.completed, T.green)}
          {statCard("Codes dispo", stats.codesAvailable, T.blue)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {tabBtn("users", "👥 Participants")}
          {tabBtn("codes", "🔑 Invitations")}
          {tabBtn("email", "📧 Email")}
          {tabBtn("export", "📊 Export")}
        </div>

        {/* USERS TAB */}
        {tab === "users" && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: T.cardBg }}>{["Nom", "Email", "Rôle", "Inscrit", "Sessions", "Actions"].map(h => <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{allUsers.map(u => (
                <tr key={u.email} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "12px 14px", color: T.text, fontWeight: 500 }}>{u.name}{u.email === SUPER_ADMIN && <span style={{ marginLeft: 6, fontSize: 9, color: T.orange, border: `1px solid ${T.orange}`, borderRadius: 4, padding: "1px 5px" }}>SUPER</span>}{u.isAdmin && u.email !== SUPER_ADMIN && <span style={{ marginLeft: 6, fontSize: 9, color: T.blue, border: `1px solid ${T.blue}`, borderRadius: 4, padding: "1px 5px" }}>ADMIN</span>}</td>
                  <td style={{ padding: "12px 14px", color: T.muted, fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: "12px 14px" }}><span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, background: u.isAdmin ? "rgba(232,84,10,0.1)" : "rgba(74,184,232,0.1)", color: u.isAdmin ? T.orange : T.blue }}>{u.role || "participant"}</span></td>
                  <td style={{ padding: "12px 14px", color: T.muted, fontSize: 12 }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ padding: "12px 14px", color: T.muted }}>{u.sessionCount}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {u.currentSession?.msgs?.length > 0 && <button onClick={() => dlTranscript(u.email)} style={{ padding: "3px 8px", background: "rgba(74,184,232,0.1)", border: "1px solid rgba(74,184,232,0.2)", borderRadius: 6, color: T.blue, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>⬇ Script</button>}
                    {u.email !== SUPER_ADMIN && <button onClick={() => toggleAdmin(u.email)} style={{ padding: "3px 8px", background: "rgba(232,84,10,0.08)", border: "1px solid rgba(232,84,10,0.2)", borderRadius: 6, color: T.orange, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{u.isAdmin ? "Retirer admin" : "→ Admin"}</button>}
                    {u.email !== SUPER_ADMIN && u.email !== user.email && <button onClick={() => removeUser(u.email)} style={{ padding: "3px 8px", background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", borderRadius: 6, color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* INVITATION CODES TAB */}
        {tab === "codes" && (
          <div>
            {/* Generator */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>Générer des codes d'invitation</div>
              {/* Role selector */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 500 }}>Rôle</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["participant", "Participant"], ["admin", "Admin"]].map(([val, label]) => (
                    <button key={val} onClick={() => setNewRole(val)} style={{
                      padding: "8px 20px", borderRadius: 8, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                      background: newRole === val ? (val === "admin" ? T.orange : T.blue) : "transparent",
                      border: `1.5px solid ${newRole === val ? (val === "admin" ? T.orange : T.blue) : T.border}`,
                      color: newRole === val ? "#FFFFFF" : T.muted, fontWeight: newRole === val ? 600 : 400,
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              {/* Email (optional) */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 500 }}>Email du destinataire <span style={{ opacity: 0.6 }}>(optionnel — laisse vide pour un code libre)</span></div>
                <input value={codeEmail} onChange={e => setCodeEmail(e.target.value)} type="email" placeholder="ex: participant@email.com"
                  style={{ width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, fontSize: 14, color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = T.inputBorder} />
                {codeEmail.trim() && <div style={{ fontSize: 11, color: T.blue, marginTop: 4 }}>⏱ Code lié à cet email, valable 7 jours</div>}
              </div>
              {/* Count (random codes only) */}
              {!codeEmail.trim() && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 500 }}>Nombre de codes</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 3, 5, 10].map(n => (
                      <button key={n} onClick={() => setCodeCount(n)} style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                        background: codeCount === n ? T.orange : "transparent",
                        border: `1.5px solid ${codeCount === n ? T.orange : T.border}`,
                        color: codeCount === n ? "#FFFFFF" : T.muted,
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={generateCodes} style={{ padding: "12px 28px", background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 8, color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Générer {codeEmail.trim() ? "le code" : `${codeCount} code${codeCount > 1 ? "s" : ""}`}
              </button>
              {codeMsg && <div style={{ marginTop: 12, fontSize: 13, color: codeMsg.startsWith("✓") ? T.green : T.red, fontWeight: 500 }}>{codeMsg}</div>}
            </div>
            {/* Codes list */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: T.cardBg }}>{["Code", "Rôle", "Destinataire", "Expire", "Statut", "Actions"].map(h => <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                <tbody>{codes.slice().reverse().map((c, i) => {
                  const st = codeStatusFn(c);
                  const stColors = { available: { bg: "rgba(232,84,10,0.1)", color: T.orange, label: "Disponible" }, expired: { bg: "rgba(231,76,60,0.1)", color: T.red, label: "Expiré" }, used: { bg: "rgba(39,174,96,0.1)", color: T.green, label: "Utilisé" } };
                  const sc = stColors[st];
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, opacity: st === "expired" ? 0.5 : 1 }}>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 700, color: st === "available" ? T.orange : T.muted, fontSize: 15, letterSpacing: "2px" }}>{c.code}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, background: c.role === "admin" ? "rgba(232,84,10,0.1)" : "rgba(74,184,232,0.1)", color: c.role === "admin" ? T.orange : T.blue }}>{c.role || "participant"}</span></td>
                      <td style={{ padding: "12px 14px", color: T.muted, fontSize: 12 }}>{c.forEmail || c.usedBy || "— libre"}</td>
                      <td style={{ padding: "12px 14px", color: T.muted, fontSize: 11 }}>{c.expiresAt ? fmtDate(c.expiresAt) : "∞"}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 11, background: sc.bg, color: sc.color, fontWeight: 500 }}>{sc.label}</span></td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {st === "available" && <>
                            <button onClick={() => copyCode(c.code)} style={{ padding: "4px 10px", background: copied === c.code ? "rgba(39,174,96,0.15)" : "rgba(74,184,232,0.08)", border: `1px solid ${copied === c.code ? "rgba(39,174,96,0.3)" : "rgba(74,184,232,0.2)"}`, borderRadius: 6, color: copied === c.code ? T.green : T.blue, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                              {copied === c.code ? "✓ Copié" : "📋 Copier"}
                            </button>
                            {c.forEmail && <button onClick={() => sendCodeEmail(c)} disabled={codeSending === c.code} style={{ padding: "4px 10px", background: "rgba(232,84,10,0.08)", border: "1px solid rgba(232,84,10,0.2)", borderRadius: 6, color: T.orange, fontSize: 11, cursor: "pointer", fontFamily: "inherit", opacity: codeSending === c.code ? 0.5 : 1 }}>
                              {codeSending === c.code ? "Envoi..." : "📧 Envoyer"}
                            </button>}
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
              {codes.length === 0 && <div style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 14 }}>Aucun code créé</div>}
            </div>
          </div>
        )}

        {/* EMAIL TAB */}
        {tab === "email" && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>Envoyer un email</div>
            <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="Email destinataire" style={{ width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.text, marginBottom: 10, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Sujet" style={{ width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.text, marginBottom: 10, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
            <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Message..." rows={5} style={{ width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.text, marginBottom: 12, boxSizing: "border-box", resize: "vertical", outline: "none", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={sendEmail} style={{ padding: "10px 24px", background: T.orange, border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Envoyer</button>
              {emailStatus && <span style={{ fontSize: 13, color: emailStatus.includes("✓") ? T.green : emailStatus.includes("Envoi") ? T.blue : T.red }}>{emailStatus}</span>}
            </div>
          </div>
        )}

        {/* EXPORT TAB */}
        {tab === "export" && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>Exporter les données</div>
            <button onClick={exportCSV} style={{ padding: "14px 32px", background: `linear-gradient(135deg,${T.green},#1e8449)`, border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⬇ Télécharger CSV</button>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>Exporte la liste des participants, rôles, statuts</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useState(() => LS.get("dbr_theme") || "dark");
  const T = THEMES[theme];
  const toggleTheme = () => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); LS.set("dbr_theme", next); };

  const [user, setUser] = useState(() => LS.get("dbr_current_user"));
  const [screen, setScreen] = useState(() => LS.get("dbr_current_user") ? "intro" : "auth");
  const [savedSession, setSavedSession] = useState(null), [showAdmin, setShowAdmin] = useState(false);
  const [msgs, setMsgs] = useState([]), [blocs, setBlocs] = useState([]);
  const [bi, setBi] = useState(0), [qi, setQi] = useState(0), [answers, setAnswers] = useState({});
  const [syntheses, setSyntheses] = useState({}), [validated, setValidated] = useState({});
  const [apiHist, setApiHist] = useState([]), [loading, setLoading] = useState(false);
  const [showSynth, setShowSynth] = useState(false), [input, setInput] = useState("");
  const [savedOk, setSavedOk] = useState(false), [activeSpeakId, setActiveSpeakId] = useState(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [startTime] = useState(Date.now());
  const sp = useSpeech();
  const endRef = useRef(null), taRef = useRef(null);
  const answersRef = useRef({}), apiHistRef = useRef([]), blocsRef = useRef([]);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { apiHistRef.current = apiHist; }, [apiHist]);
  useEffect(() => { blocsRef.current = blocs; }, [blocs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);
  useEffect(() => {
    if (user) {
      const s = LS.get(`dbr_sess_${user.email}`);
      if (s && s.msgs?.length > 0) setSavedSession(s);
      setPastSessions(LS.get(`dbr_all_sessions_${user.email}`) || []);
    }
  }, [user]);

  // Update body background on theme change
  useEffect(() => { document.body.style.background = T.bg; }, [T.bg]);

  const bloc = blocs[bi], q = bloc?.questions[qi];
  const lastMsg = msgs[msgs.length - 1];
  const isValidated = lastMsg?.role === "assistant" && (lastMsg.content?.includes("✓ Solide") || lastMsg.content?.includes("✓ solide"));
  const answerKey = bloc && q ? `${bloc.id}_${q.id}` : null;
  const alreadyAnswered = !!(answerKey && answersRef.current[answerKey]);

  function handleLogin(u) { setUser(u); setScreen("intro"); }
  function handleLogout() { LS.del("dbr_current_user"); setUser(null); setScreen("auth"); setShowAdmin(false); }

  function buildSave() { return { msgs, bi, qi, answers: answersRef.current, syntheses, validated, apiHist: apiHistRef.current, blocs: blocsRef.current, blocLabel: blocsRef.current[bi]?.label, qTitle: blocsRef.current[bi]?.questions[qi]?.title, phase: screen, savedAt: Date.now(), totalTime: Math.round((Date.now() - startTime) / 1000) }; }
  function doSave() { if (!user || screen === "auth") return; LS.set(`dbr_sess_${user.email}`, buildSave()); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000); }
  useEffect(() => { if (screen === "program" && msgs.length > 0) { const t = setTimeout(doSave, 1500); return () => clearTimeout(t); } }, [msgs, screen]);

  async function callClaude(userMsg) {
    const hist = [...apiHistRef.current, { role: "user", content: userMsg }];
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1024, system: SYSTEM, messages: hist })
    });
    if (!res.ok) throw new Error("API " + res.status);
    const data = await res.json();
    const text = data.content?.find(b => b.type === "text")?.text || "Erreur.";
    const newH = [...hist, { role: "assistant", content: text }];
    setApiHist(newH); apiHistRef.current = newH; return text;
  }

  const addMsg = (m) => setMsgs(p => [...p, m]);

  async function submitAnswer(text, isAudio = false) {
    if (!text.trim() || loading) return;
    setLoading(true);
    addMsg({ role: "user", content: text, audio: isAudio });
    try {
      const r = await callClaude(`[BLOC ${bloc.id} — ${bloc.label} | ${q.title}]\n\nRéponse :\n"${text}"\n\nAnalyse selon le protocole DBR. IMPORTANT : termine par "✓ Solide." UNIQUEMENT si la réponse est suffisamment précise et profonde. Sinon pose UNE question de précision.`);
      const newA = { ...answersRef.current, [answerKey]: text }; setAnswers(newA); answersRef.current = newA;
      addMsg({ role: "assistant", content: r });
    } catch { addMsg({ role: "assistant", content: "Une erreur s'est produite. Réessaie." }); }
    setLoading(false);
  }

  async function submitFollowUp(text, isAudio = false) {
    if (!text.trim() || loading) return; setLoading(true);
    addMsg({ role: "user", content: text, audio: isAudio });
    try { const r = await callClaude(`[Précision sur ${q?.title}]\n"${text}"\n\nContinue. Si suffisant : "✓ Solide." Sinon : UNE question de précision.`); addMsg({ role: "assistant", content: r }); }
    catch { addMsg({ role: "assistant", content: "Erreur. Réessaie." }); }
    setLoading(false);
  }

  async function nextQ() {
    const nqi = qi + 1;
    if (nqi < bloc.questions.length) {
      setQi(nqi); const nq = bloc.questions[nqi];
      const m = { role: "assistant", content: `**${nq.title}**\n\n${nq.q}` }; addMsg(m);
      setApiHist(p => { const n = [...p, { role: "assistant", content: m.content }]; apiHistRef.current = n; return n; });
    } else { await genSynthesis(); }
  }

  function goBack() {
    if (loading) return; let pbi = bi, pqi = qi - 1;
    if (pqi < 0) { if (bi === 0) return; pbi = bi - 1; pqi = blocs[pbi].questions.length - 1; }
    setBi(pbi); setQi(pqi); setShowSynth(false);
    const pBloc = blocs[pbi], pQ = pBloc.questions[pqi];
    const prevKey = `${pBloc.id}_${pQ.id}`, prevAnswer = answersRef.current[prevKey] || "";
    setInput(prevAnswer);
    if (pbi !== bi) setValidated(p => { const n = { ...p }; delete n[pBloc.id]; return n; });
    const note = `**← Retour : ${pQ.title}**\n\n${pQ.q}${prevAnswer ? "\n\n*Ta réponse précédente est pré-remplie — modifie-la librement.*" : ""}`;
    const m = { role: "assistant", content: note };
    setMsgs(p => [...p, { role: "user", content: "← Retour." }, m]);
    setApiHist(p => { const n = [...p, { role: "user", content: "← Retour." }, { role: "assistant", content: note }]; apiHistRef.current = n; return n; });
    setTimeout(() => { taRef.current?.focus(); }, 100);
  }

  async function genSynthesis() {
    setLoading(true);
    const blocAnswers = Object.entries(answersRef.current).filter(([k]) => k.startsWith(bloc.id + "_")).map(([, v]) => v.slice(0, 400)).join("\n\n---\n\n");
    try {
      const r = await callClaude(`[SYNTHÈSE BLOC ${bloc.id} — ${bloc.label}]\n\nRéponses :\n${blocAnswers}\n\nSynthèse concise (4-5 phrases). 1 force + 1 vigilance.${bloc.id === "C" ? ' Formule le domino : "Je [verbe] [problème] pour [bénéficiaire] via [format]."' : ""} Termine : "Est-ce que cette synthèse te semble juste ?"`);
      setSyntheses(p => ({ ...p, [bloc.id]: r }));
      addMsg({ role: "assistant", content: `---\n**SYNTHÈSE · ${bloc.label}**\n\n${r}`, synth: true }); setShowSynth(true);
    } catch { addMsg({ role: "assistant", content: "Erreur lors de la synthèse." }); }
    setLoading(false);
  }

  async function validateSynth(ok) {
    setShowSynth(false);
    if (ok) {
      setValidated(p => ({ ...p, [bloc.id]: true }));
      addMsg({ role: "user", content: "✓ Cette synthèse me semble juste." });
      setApiHist(p => { const n = [...p, { role: "user", content: "✓ Synthèse validée." }]; apiHistRef.current = n; return n; });
      const nbi = bi + 1;
      if (nbi < blocs.length) {
        setBi(nbi); setQi(0); const nb = blocs[nbi], nq = nb.questions[0];
        const intro = `---\n**BLOC ${nb.id} — ${nb.label}**\n*${nb.desc}*\n\n---\n\n**${nq.title}**\n\n${nq.q}`;
        addMsg({ role: "assistant", content: intro });
        setApiHist(p => { const n = [...p, { role: "assistant", content: intro }]; apiHistRef.current = n; return n; });
      } else { await genConclusion(); }
    } else {
      const m = { role: "assistant", content: "Dis-moi ce qui ne te semble pas juste. On ajuste ensemble." };
      setMsgs(p => [...p, { role: "user", content: "Je veux préciser quelque chose." }, m]);
      setApiHist(p => { const n = [...p, { role: "user", content: "Je veux préciser." }, { role: "assistant", content: m.content }]; apiHistRef.current = n; return n; });
    }
  }

  async function genConclusion() {
    setLoading(true); setScreen("conclusion");
    const summary = blocsRef.current.map(b => { const ba = Object.entries(answersRef.current).filter(([k]) => k.startsWith(b.id + "_")).map(([, v]) => v.slice(0, 300)).join(" / "); const bs = syntheses[b.id] ? syntheses[b.id].slice(0, 200) : ""; return `BLOC ${b.id} (${b.label}):\n${ba}\nSynthèse: ${bs}`; }).join("\n\n");
    try {
      const r = await callClaude(`[CONCLUSION FINALE — MÉTHODE CHARITÉ — Coach ${APP_NAME}]\n\n${summary}\n\nGénère une conclusion puissante :\n1. La conclusion choisie (1 à 4) et pourquoi\n2. La formule du rêve racine\n3. Le programme adapté (plan 90j en 3 phases 30/30/30 avec jalons concrets en FCFA)\n4. Message personnel ancré dans le contexte ivoirien\n\nProse fluide, 350 mots max. Commence par "CONCLUSION [N] : [titre]".`);
      addMsg({ role: "assistant", content: r, conc: true });
      // Save to multi-sessions
      const session = buildSave();
      session.phase = "conclusion";
      session.completedAt = Date.now();
      const past = LS.get(`dbr_all_sessions_${user.email}`) || [];
      past.push(session);
      LS.set(`dbr_all_sessions_${user.email}`, past);
      setPastSessions(past);
    } catch { addMsg({ role: "assistant", content: "Erreur lors de la conclusion." }); }
    setLoading(false);
  }

  function download() {
    try {
      const lines = msgs.map(m => { if (m.sys) return `\n${"═".repeat(40)}\n${m.content}\n`; const who = m.role === "user" ? `${user.name}${m.audio ? " (audio)" : ""}` : `Coach ${APP_NAME}`; return `[${who}]\n${m.content}\n`; }).join("\n---\n\n");
      const full = `PARCOURS DBR — MÉTHODE CHARITÉ\nCoach : ${APP_NAME}\nParticipant : ${user.name} (${user.email})\nDate : ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}\n\n${"═".repeat(50)}\n\n${lines}`;
      const blob = new Blob([full], { type: "text/plain;charset=utf-8" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `DBR_${APP_NAME}_${user.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { alert("Copie le contenu manuellement."); }
  }

  function startPath(knowsDream) {
    setMsgs([]); setBi(0); setQi(0); setAnswers({}); answersRef.current = {};
    setSyntheses({}); setValidated({}); setApiHist([]); apiHistRef.current = []; setShowSynth(false); setInput("");
    const chosenBlocs = knowsDream ? [BLOC_5P, BLOC_VISION, ...BLOCS_RITE] : [...BLOCS_CHA, BLOC_5P, BLOC_VISION, ...BLOCS_RITE];
    setBlocs(chosenBlocs); blocsRef.current = chosenBlocs;
    const b0 = chosenBlocs[0], q0 = b0.questions[0];
    const path = knowsDream ? "5 Pourquoi → Vision → RITE" : "CHA → 5 Pourquoi → Vision → RITE";
    const intro = `On est ensemble, ${user.name} ! 🔥 Je suis ${APP_NAME}, ton coach DBR.

Ton parcours : **${path}**.

Chaque question est là pour creuser. Réponds honnêtement, pas parfaitement. Y'a moyen !

---

**BLOC ${b0.id} — ${b0.label}**
*${b0.desc}*

---

**${q0.title}**

${q0.q}`;
    const m = { role: "assistant", content: intro }; setMsgs([m]);
    const h = [{ role: "assistant", content: intro }]; setApiHist(h); apiHistRef.current = h; setScreen("program");
  }

  function resumeSession(s) {
    setMsgs(s.msgs || []); setBi(s.bi || 0); setQi(s.qi || 0);
    setAnswers(s.answers || {}); answersRef.current = s.answers || {};
    setSyntheses(s.syntheses || {}); setValidated(s.validated || {});
    setApiHist(s.apiHist || []); apiHistRef.current = s.apiHist || [];
    const b = s.blocs || [...BLOCS_CHA, BLOC_5P, BLOC_VISION, ...BLOCS_RITE]; setBlocs(b); blocsRef.current = b;
    setShowSynth(false); setScreen(s.phase === "conclusion" ? "conclusion" : "program");
  }

  function handleSend() {
    if (sp.listening) { const final = sp.stopListen(); const txt = (final || input || "").trim(); setInput(""); if (taRef.current) taRef.current.style.height = "48px"; if (txt) { if (alreadyAnswered) submitFollowUp(txt, true); else submitAnswer(txt, true); } return; }
    const val = input.trim(); if (!val) return; setInput(""); if (taRef.current) taRef.current.style.height = "48px"; if (alreadyAnswered) submitFollowUp(val); else submitAnswer(val);
  }

  function toggleMic() {
    if (sp.listening) { const final = sp.stopListen(); if (final && final !== "__MIC_BLOCKED__") setInput(final); }
    else { setMicBlocked(false); setInput(""); sp.startListen(txt => { if (txt === "__MIC_BLOCKED__") { setMicBlocked(true); sp.stopListen(); } else setInput(txt); }); }
  }

  function handleSpeak(text, id) { if (sp.speaking && activeSpeakId === id) { sp.stopSpeak(); setActiveSpeakId(null); } else { sp.speak(text, () => setActiveSpeakId(null)); setActiveSpeakId(id); } }

  let doneQ = 0; for (let i = 0; i < bi; i++) doneQ += blocs[i]?.questions.length || 0; doneQ += qi;
  const totalQ = blocs.reduce((a, b) => a + b.questions.length, 0) || 12;
  const pct = screen === "conclusion" ? 100 : Math.round((doneQ / totalQ) * 100);

  // Theme toggle button
  const themeBtn = <button onClick={toggleTheme} title={theme === "dark" ? "Mode clair" : "Mode sombre"} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", color: T.muted, cursor: "pointer", fontSize: 16 }}>{theme === "dark" ? "☀️" : "🌙"}</button>;

  // AUTH
  if (!user) return <ThemeCtx.Provider value={T}><div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div><Auth onLogin={handleLogin} /></ThemeCtx.Provider>;

  // ADMIN
  if (showAdmin && user.isAdmin) return <ThemeCtx.Provider value={T}><div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div><Admin user={user} onBack={() => setShowAdmin(false)} /></ThemeCtx.Provider>;

  // INTRO / RESUME / HISTORY
  if (screen === "intro" || screen === "auth") {
    if (savedSession) return (
      <ThemeCtx.Provider value={T}>
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div>
        <div style={{ minHeight: "100vh", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 540, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <Logo size={72} />
              <div style={{ fontSize: 12, color: T.blue, letterSpacing: "3px", marginTop: 10 }}>COACH {APP_NAME.toUpperCase()}</div>
            </div>
            <div style={{ background: T.cardBg, border: "1px solid rgba(232,84,10,0.25)", borderRadius: 16, padding: "32px 24px" }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 6 }}>Parcours en cours</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, lineHeight: 1.7 }}>
                Dernier arrêt · {savedSession.blocLabel} — {savedSession.qTitle}<br />
                {savedSession.savedAt && new Date(savedSession.savedAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <button onClick={() => resumeSession(savedSession)} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", marginBottom: 10, fontFamily: "inherit" }}>Reprendre où j'en étais →</button>
              <button onClick={() => { setSavedSession(null); setScreen("aiguillage"); }} style={{ width: "100%", padding: 13, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>Recommencer un nouveau parcours</button>
              {pastSessions.length > 0 && <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", marginTop: 8, padding: 11, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>🗂️ Mes parcours passés ({pastSessions.length})</button>}
              {showHistory && pastSessions.map((s, i) => (
                <div key={i} onClick={() => resumeSession(s)} style={{ marginTop: 8, padding: "12px 16px", background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: T.textDim }}>
                  <strong style={{ color: T.text }}>{s.blocLabel}</strong> — {s.qTitle}<br />
                  <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(s.savedAt)} · {s.phase === "conclusion" ? "✓ Complété" : "En cours"}</span>
                </div>
              ))}
              {user.isAdmin && <button onClick={() => setShowAdmin(true)} style={{ width: "100%", marginTop: 10, padding: 11, background: "rgba(232,84,10,0.08)", border: `1px solid rgba(232,84,10,0.2)`, borderRadius: 10, fontSize: 13, color: T.orange, cursor: "pointer", fontFamily: "inherit" }}>⚙ Console Admin</button>}
              <button onClick={handleLogout} style={{ width: "100%", marginTop: 10, background: "none", border: "none", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "inherit", opacity: 0.5 }}>Se déconnecter</button>
            </div>
          </div>
        </div>
      </ThemeCtx.Provider>
    );
    return <ThemeCtx.Provider value={T}><div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div><Aiguillage user={user} onKnow={() => startPath(true)} onDontKnow={() => startPath(false)} onLogout={handleLogout} /></ThemeCtx.Provider>;
  }
  if (screen === "aiguillage") return <ThemeCtx.Provider value={T}><div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div><Aiguillage user={user} onKnow={() => startPath(true)} onDontKnow={() => startPath(false)} onLogout={handleLogout} /></ThemeCtx.Provider>;

  // PROGRAM + CONCLUSION
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", fontFamily: "system-ui,-apple-system,sans-serif", color: T.text }}>
        {/* HEADER */}
        <div style={{ background: T.card, borderBottom: `2px solid ${T.orange}`, position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Logo size={30} />
                <span style={{ fontSize: 11, color: T.muted, letterSpacing: "2px" }}>COACH {APP_NAME.toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {savedOk && <span style={{ fontSize: 10, color: T.green }}>✓ Sauvé</span>}
                {themeBtn}
                {user.isAdmin && <button onClick={() => setShowAdmin(true)} style={{ padding: "4px 10px", background: "rgba(74,184,232,0.1)", border: "1px solid rgba(74,184,232,0.2)", borderRadius: 6, fontSize: 11, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>Admin</button>}
                <button onClick={doSave} style={{ padding: "4px 10px", background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>⏸ Pause</button>
                <button onClick={download} style={{ padding: "4px 10px", background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>⬇ Script</button>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 90, height: 7, background: T.border, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${T.orange},${T.blue})`, borderRadius: 4, transition: "width 0.6s ease", boxShadow: pct > 0 ? "0 0 8px rgba(232,84,10,0.4)" : "none" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.orange, minWidth: 32 }}>{pct}%</span>
                </div>
              </div>
            </div>
            {blocs.length > 0 && (
              <div style={{ display: "flex", overflowX: "auto", gap: 0, paddingBottom: 6, paddingTop: 2, alignItems: "center" }}>
                {blocs.map((b, i) => {
                  const done = !!validated[b.id]; const active = i === bi;
                  return (
                    <div key={b.id} style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 4px" }}>
                        <div style={{
                          width: active ? 22 : 16, height: active ? 22 : 16, borderRadius: "50%",
                          background: done ? T.green : active ? T.orange : "transparent",
                          border: `2px solid ${done ? T.green : active ? T.orange : T.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, color: done || active ? "#fff" : T.muted, fontWeight: 700,
                          transition: "all 0.3s", boxShadow: active ? "0 0 10px rgba(232,84,10,0.4)" : "none",
                        }}>{done ? "✓" : ""}</div>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", marginTop: 2, color: active ? T.orange : done ? T.green : T.muted, opacity: i > bi ? 0.35 : 1, whiteSpace: "nowrap" }}>
                          {b.id === "V" ? "VIS" : b.id === "5P" ? "5P" : b.id}
                        </div>
                      </div>
                      {i < blocs.length - 1 && <div style={{ width: 14, height: 2, background: done ? T.green : T.border, borderRadius: 1, transition: "background 0.3s" }} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES */}
        <div style={{ flex: 1, maxWidth: 780, width: "100%", margin: "0 auto", padding: "20px 16px 160px" }}>
          {msgs.map((m, i) => <Bubble key={i} id={i} msg={m} onSpeak={handleSpeak} speaking={sp.speaking} activeSpeakId={activeSpeakId} />)}
          {loading && (
            <div style={{ display: "flex", gap: 6, padding: "18px 48px", alignItems: "center" }}>
              <Logo size={20} />
              <span style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>{APP_NAME} réfléchit</span>
              {[0, 1, 2].map(j => <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: j % 2 === 0 ? T.orange : T.blue, animation: `bounce 1.2s ease-in-out ${j * 0.2}s infinite` }} />)}
              <style>{`@keyframes bounce{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
            </div>
          )}
          {showSynth && !loading && (
            <div style={{ display: "flex", gap: 10, padding: "8px 0" }}>
              <button onClick={() => validateSynth(true)} style={{ flex: 1, padding: 14, background: `linear-gradient(135deg,${T.green},#1e8449)`, border: "none", borderRadius: 8, color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✓ Je valide</button>
              <button onClick={() => validateSynth(false)} style={{ flex: 1, padding: 14, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>✎ Préciser</button>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* INPUT BAR */}
        {screen === "program" && !showSynth && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.border}`, padding: "12px 16px 16px", boxShadow: `0 -8px 32px ${T.shadow}`, zIndex: 50 }}>
            <div style={{ maxWidth: 780, margin: "0 auto" }}>
              {sp.listening && <div style={{ background: "rgba(232,84,10,0.06)", border: "1px solid rgba(232,84,10,0.15)", borderRadius: 6, padding: "6px 12px", marginBottom: 8, fontSize: 13, color: T.orange, display: "flex", gap: 8, alignItems: "center" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: T.red, animation: "bounce 1s infinite" }} />{sp.liveText || "Je t'écoute…"}</div>}
              {micBlocked && <div style={{ background: "rgba(231,76,60,0.06)", border: "1px solid rgba(231,76,60,0.15)", borderRadius: 6, padding: "8px 12px", marginBottom: 8, fontSize: 13, color: T.red }}>🎤 Autorise le micro dans les paramètres du navigateur.</div>}
              {q && !isValidated && !sp.listening && <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontStyle: "italic" }}>💡 {q.hint}</div>}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <button onClick={goBack} disabled={loading || (bi === 0 && qi === 0)} title="Question précédente"
                  style={{ width: 44, height: 48, borderRadius: 8, flexShrink: 0, cursor: bi === 0 && qi === 0 ? "not-allowed" : "pointer", background: bi === 0 && qi === 0 ? T.cardBg : "rgba(232,84,10,0.12)", border: `2px solid ${bi === 0 && qi === 0 ? T.border : "rgba(232,84,10,0.5)"}`, color: bi === 0 && qi === 0 ? T.muted : T.orange, fontSize: 20, fontWeight: 700 }}>←</button>
                <textarea ref={taRef} value={sp.listening ? sp.liveText : input}
                  onClick={() => { if (sp.listening) { const final = sp.stopListen(); setInput(final || sp.liveText || ""); } }}
                  onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); isValidated ? nextQ() : handleSend(); } }}
                  placeholder={sp.listening ? "Tape ici pour éditer…" : q?.ph || "Écris ta réponse…"}
                  readOnly={false} disabled={loading}
                  style={{ flex: 1, padding: "12px 14px", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 15, lineHeight: 1.6, resize: "none", height: 48, minHeight: 48, maxHeight: 140, fontFamily: "inherit", outline: "none", color: T.text, boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = T.border} />
                {sp.hasSR && <button onClick={toggleMic} disabled={loading} style={{ width: 48, height: 48, borderRadius: 8, border: "none", flexShrink: 0, cursor: "pointer", background: sp.listening ? T.red : "rgba(74,184,232,0.12)", color: sp.listening ? "#FFFFFF" : T.blue, fontSize: 20 }}>{sp.listening ? "⏹" : "🎤"}</button>}
                <button onClick={() => { if (isValidated) nextQ(); else handleSend(); }}
                  disabled={loading || (!input.trim() && !isValidated && !sp.listening)}
                  style={{ width: 48, height: 48, borderRadius: 8, border: "none", flexShrink: 0, cursor: "pointer", fontSize: 20, background: isValidated ? `linear-gradient(135deg,${T.green},#1e8449)` : (loading || (!input.trim() && !sp.listening)) ? T.cardBg : `linear-gradient(135deg,${T.orange},${T.orangeD})`, color: "#FFFFFF" }}>
                  {isValidated ? "→" : "↑"}
                </button>
              </div>
              {isValidated && <div style={{ textAlign: "center", marginTop: 6, fontSize: 12, color: T.green }}>✓ Réponse validée par {APP_NAME} — ajoute une précision ou clique → pour continuer</div>}
            </div>
          </div>
        )}

        {/* CONCLUSION FOOTER */}
        {screen === "conclusion" && !loading && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.border}`, padding: "14px 16px", boxShadow: `0 -8px 32px ${T.shadow}` }}>
            <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", gap: 10 }}>
              <button onClick={download} style={{ flex: 1, padding: 14, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 8, color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⬇ Télécharger mon parcours</button>
              <button onClick={() => { setScreen("intro"); setSavedSession(null); LS.del(`dbr_sess_${user.email}`); }} style={{ padding: 14, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Accueil</button>
            </div>
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
