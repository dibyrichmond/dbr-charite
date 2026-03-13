import { useState, useEffect, useRef, useCallback } from "react";

const T = {
  orange: "#E8540A", orangeD: "#C4420A", blue: "#4AB8E8", blueD: "#2E95C5",
  dark: "#0D0D0D", darkCard: "#1A1A1A", darkBrd: "#2A2A2A", white: "#FFFFFF",
  muted: "#8A8A8A", green: "#27AE60", red: "#E74C3C", text: "#F0F0F0", textDim: "#AAAAAA",
};

// ── LOGO ──────────────────────────────────────────────────────────────────
const LogoIcon = ({ size = 40 }) => (
  <img
    src="/logo.png"
    alt="DBR"
    style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    onError={e => {
      e.target.style.display = "none";
      e.target.parentNode.innerHTML = `<div style="width:${size}px;height:${size}px;borderRadius:50%;background:linear-gradient(135deg,#E8540A,#C4420A);display:flex;alignItems:center;justifyContent:center;flexShrink:0"><span style="color:#fff;fontWeight:900;fontSize:${Math.round(size * 0.38)}px;letterSpacing:-1px">DBR</span></div>`;
    }}
  />
);

// ── STORAGE ───────────────────────────────────────────────────────────────
const LS = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

function hashPwd(p) {
  let h = 5381;
  for (let i = 0; i < p.length; i++) h = ((h << 5) + h) ^ p.charCodeAt(i);
  return (h >>> 0).toString(36);
}

// ── DONNÉES ───────────────────────────────────────────────────────────────
const CTX = `CONTEXTE GÉOGRAPHIQUE ET CULTUREL :
- Participant basé en Côte d'Ivoire (Abidjan ou autre ville ivoirienne)
- Monnaie : Franc CFA (FCFA) — utilise toujours FCFA, jamais euros ou dollars
- Fuseau horaire : GMT+0 (Abidjan)
- Références culturelles : contexte ivoirien / africain francophone
- Si tu mentionnes des exemples de revenus, utilise des montants en FCFA (ex: 500 000 FCFA/mois)
- Respecte les codes culturels : famille élargie, communauté, respect des aînés`;

const BLOCS_CHA = [
  {
    id: "C", label: "CLARIFIER", desc: "Identifier le rêve racine", questions: [
      { id: "C1", title: "Tes moments de flow", q: "Donne-moi 2 à 3 moments des 30 derniers jours où tu as complètement oublié le temps. Pour chacun : qu'est-ce que tu faisais exactement, combien de temps ça a duré, qu'as-tu produit, et est-ce que quelqu'un t'a sollicité pour ça ?", hint: "Ce que tu fais quand personne ne te demande — c'est là que vit ton rêve.", ph: "Ex : Samedi dernier, j'ai aidé un ami à structurer son business plan de 14h à 18h sans voir le temps passer..." },
      { id: "C2", title: "Les problèmes qui t'attirent", q: "Quels problèmes complexes t'attirent naturellement, même sans être payé ? Qui dans ton entourage vient te voir pour ce type de problème ? Donne un exemple concret récent.", hint: "Cherche ce qui te nourrit sans récompense. C'est souvent là que vit ta valeur unique.", ph: "Ex : Les gens viennent me voir quand ils sont perdus dans leurs projets. La semaine dernière mon cousin m'a appelé depuis Bouaké..." },
    ]
  },
  {
    id: "H", label: "HONORER", desc: "Accepter le coût réel du rêve", questions: [
      { id: "H1", title: "Le prix concret", q: "Ce rêve a un prix. Sois précis : combien d'heures par semaine tu t'engages à y consacrer, pendant combien de mois ? Qu'est-ce que tu es prêt à mettre en pause ? Nomme quelque chose de concret que tu arrêtes.", hint: "Un rêve sans coût accepté reste un caprice. La précision est une preuve d'honnêteté.", ph: "Ex : 3 soirées par semaine pendant 6 mois. J'arrête les matchs du weekend. Je réduis mes sorties à Cocody..." },
      { id: "H2", title: "Tes peurs et obstacles", q: "Si ce rêve réussit totalement dans 2 ans — tu es visible, reconnu à Abidjan et au-delà — qu'est-ce qui te fait peur dans ce succès ? Qui pourrait freiner ce projet ? Et quelle est la peur que tu ne dis jamais à voix haute ?", hint: "Les peurs de réussir sabotent plus souvent que les peurs d'échouer. Nommer c'est déjà désamorcer.", ph: "Ex : Peur que ma famille pense que je les oublie. La peur inavouable : et si je réussis et que ça ne me rend pas heureux ?" },
    ]
  },
  {
    id: "A", label: "ALIGNER", desc: "Libérer l'énergie gaspillée", questions: [
      { id: "A1", title: "Cohérence & Identité", q: "Mesure l'écart entre ce que tu dis vouloir et ce que tu fais vraiment — en heures par semaine ou en FCFA par mois. Quelle contradiction te coûte le plus d'énergie ? Et qui dois-tu devenir pour que ce rêve soit normal dans ta vie ?", hint: "L'incohérence n'est pas un jugement — c'est une mesure. La nommer libère de l'énergie.", ph: "Ex : Je dis que c'est ma priorité mais j'y consacre 0h depuis 3 semaines. Je dépense 50 000 FCFA/mois en divertissements mais rien pour me former..." },
    ]
  },
];

const BLOC_5P = {
  id: "5P", label: "5 POURQUOI", desc: "Vérifier la profondeur du rêve", questions: [
    { id: "5P1", title: "Ton rêve en une phrase", q: "Formule ton rêve en une phrase claire et concrète. Pas d'idéal flou — une direction précise. Je vais ensuite te poser la question «Pourquoi» 5 fois pour m'assurer qu'on travaille sur le vrai problème.", hint: "Dis ce qui vient naturellement. On va creuser ensemble.", ph: "Ex : Je veux créer une agence de communication digitale à Abidjan. Ou : Je veux devenir consultant RH indépendant..." },
  ]
};

const BLOCS_RITE = [
  {
    id: "R", label: "RENONCER", desc: "Choisir crée la puissance", questions: [
      { id: "R1", title: "Priorité unique & Garde-fous", q: "Quelle est LA seule priorité des 90 prochains jours ? Nomme ce qui passe en pause avec une date précise. Quelle est ta règle d'arrêt ? Et qui sait que c'est ta priorité — quelqu'un qui peut te demander des comptes à Abidjan ?", hint: "Renoncer explicitement est plus puissant qu'ajouter. Un esprit simplifié performe mieux.", ph: "Ex : Priorité : 3 premiers clients avant le 1er avril. En pause : le projet podcast. Stop rule : 0 client après 6 semaines → je revois le positionnement. Mon mentor Kouassi est informé." },
    ]
  },
  {
    id: "I", label: "INSTALLER", desc: "Un système simple qui tient", questions: [
      { id: "I1", title: "Rituel ancré", q: "Quel rituel de 30 à 45 minutes maximum installes-tu — avec un déclencheur précis (après quoi, à quelle heure) ? Que produis-tu pendant ce temps ? Et quelle est ta règle si ce créneau saute un jour ?", hint: "Le rituel s'ancre sur un déclencheur existant. Complexité = abandon. Simplicité = durabilité.", ph: "Ex : Chaque matin après le café avant le bureau, 30 min sur le projet. Si impossible : 20 min le soir après le dîner." },
    ]
  },
  {
    id: "T", label: "TENIR", desc: "La constance sans héroïsme", questions: [
      { id: "T1", title: "Plan de retour", q: "Qu'est-ce qui pourrait te faire décrocher dans les 30 premiers jours ? Quelle est ta règle si tu rates 2 jours ? Si tu rates une semaine entière ? Et qui peut te dire la vérité quand tu es dans le brouillard ?", hint: "La vraie discipline c'est savoir revenir, pas ne jamais tomber.", ph: "Ex : Ce qui peut me faire décrocher : une semaine chargée + un événement familial. 2 jours ratés : je reprends sans commentaire. 1 semaine ratée : j'appelle Aya avant de décider quoi que ce soit." },
    ]
  },
  {
    id: "É", label: "ÉPROUVER", desc: "Le rêve survit-il au réel ?", questions: [
      { id: "E1", title: "Sprint de preuve", q: "Quelle preuve concrète vas-tu produire dans les 7 prochains jours ? Une action par jour qui laisse une trace visible. À qui vas-tu la montrer pour avoir un retour réel dans ton réseau à Abidjan ?", hint: "Le sprint ne prouve pas que tu es bon. Il prouve que le rêve survit au contact de la réalité.", ph: "Ex : Jour 1-7 : je contacte 2 clients potentiels par jour. Je montre mes résultats à mon mentor et 2 personnes de ma cible." },
    ]
  },
];

const SYSTEM = `Tu es le coach DBR — accompagnateur de transformation personnelle, méthode CHARITÉ.

${CTX}

ANALYSE CHAQUE RÉPONSE :
- Identifie les forces (ancré, précis, vivant) et signaux faibles (peur, évitement, vague, contradiction)
- Prose fluide — jamais de listes à puces
- 100 à 180 mots maximum (sauf synthèse)
- "tu" familier, direct mais chaleureux
- Références culturelles ivoiriennes si pertinent
- Termine par : question de précision (si flou) OU "✓ Solide." (si validé)

SYNTHÈSES DE BLOC :
- 3-4 phrases qui résument ce qui a émergé
- 1 force + 1 vigilance
- Pour bloc C : formule "Je [verbe] [problème] pour [bénéficiaire] via [format]"
- Termine : "Est-ce que cette synthèse te semble juste ?"

5 POURQUOI : creuse chaque réponse avec "Et pourquoi c'est important pour toi ?" jusqu'à 5 fois. Identifie si le rêve est une fuite ou une valeur profonde.`;

// ── AUDIO ─────────────────────────────────────────────────────────────────
function cleanTTS(raw) {
  return raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,6}\s/g, "")
    .replace(/---+/g, ".").replace(/[✓→↑⏸⬇←🎤⏹▶]/g, "")
    .replace(/\[.*?\]/g, "").replace(/:\s*\n/g, ". ")
    .replace(/\n{2,}/g, ". ").replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ").replace(/\.{2,}/g, ".").trim();
}

function pickVoice(voices) {
  if (!voices.length) return null;
  const scored = voices.map(v => {
    let s = 0;
    if (v.lang.startsWith("fr")) s += 100;
    if (v.lang === "fr-FR") s += 10;
    const n = v.name.toLowerCase();
    if (n.includes("thomas") || n.includes("amelie") || n.includes("marie") || n.includes("neural") || n.includes("enhanced") || n.includes("google")) s += 50;
    if (n.includes("microsoft") || n.includes("apple")) s += 20;
    if (n.includes("espeak") || n.includes("festival")) s -= 50;
    return { v, s };
  });
  return scored.sort((a, b) => b.s - a.s)[0].v;
}

function useSpeech() {
  const synthRef = useRef(null), recogRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [voices, setVoices] = useState([]);
  const accRef = useRef(""), cbRef = useRef(null), shouldRef = useRef(false);

  useEffect(() => {
    try {
      const s = window.speechSynthesis; synthRef.current = s;
      const load = () => { const v = s.getVoices(); if (v.length) setVoices(v); };
      load(); s.addEventListener("voiceschanged", load);
      return () => s.removeEventListener("voiceschanged", load);
    } catch {}
  }, []);

  const speak = useCallback((text, onDone) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel();
      const clean = cleanTTS(text); if (!clean) return;
      const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean];
      let idx = 0;
      const next = () => {
        if (idx >= sentences.length) { setSpeaking(false); onDone?.(); return; }
        const utt = new SpeechSynthesisUtterance(sentences[idx].trim());
        const v = pickVoice(voices);
        if (v) { utt.voice = v; utt.lang = v.lang; } else utt.lang = "fr-FR";
        utt.rate = 0.88; utt.pitch = 1.02; utt.volume = 1;
        if (idx === 0) utt.onstart = () => setSpeaking(true);
        utt.onend = () => { idx++; next(); };
        utt.onerror = (e) => { if (e.error !== "interrupted") { idx++; next(); } else setSpeaking(false); };
        synthRef.current.speak(utt);
      }; next();
    } catch { setSpeaking(false); }
  }, [voices]);

  const stopSpeak = useCallback(() => { try { synthRef.current?.cancel(); } catch {} setSpeaking(false); }, []);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startInstance = useCallback(() => {
    if (!SR || !shouldRef.current) return;
    try {
      const r = new SR(); r.lang = "fr-FR"; r.continuous = false; r.interimResults = true; r.maxAlternatives = 1;
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) { accRef.current = (accRef.current + " " + t).trim(); cbRef.current?.(accRef.current); }
          else interim += t;
        }
        setLiveText((accRef.current + (interim ? " " + interim : "")).trim());
      };
      r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { shouldRef.current = false; setListening(false); cbRef.current?.("__MIC_BLOCKED__"); } };
      r.onend = () => { if (shouldRef.current) setTimeout(() => startInstance(), 150); else setListening(false); };
      r.start(); recogRef.current = r;
    } catch { setListening(false); }
  }, [SR]);

  const startListen = useCallback((cb) => {
    if (!SR) return false;
    cbRef.current = cb; accRef.current = ""; shouldRef.current = true;
    setListening(true); setLiveText(""); startInstance(); return true;
  }, [SR, startInstance]);

  const stopListen = useCallback(() => {
    shouldRef.current = false;
    try { recogRef.current?.stop(); recogRef.current = null; } catch {}
    setListening(false); return accRef.current.trim();
  }, []);

  return { speak, stopSpeak, speaking, startListen, stopListen, listening, liveText, hasSR: !!SR, voices };
}

// ── AUTH ──────────────────────────────────────────────────────────────────
function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""), [pwd, setPwd] = useState(""), [pwd2, setPwd2] = useState(""), [name, setName] = useState("");
  const [err, setErr] = useState(""), [info, setInfo] = useState("");

  const inp = (ph, val, set, type = "text") => (
    <input value={val} onChange={e => set(e.target.value)} type={type} placeholder={ph}
      style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12, color: T.white }}
      onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
  );

  function doLogin() {
    if (!email || !pwd) return setErr("Remplis tous les champs.");
    const users = LS.get("dbr_users") || {}; const u = users[email.toLowerCase()];
    if (!u) return setErr("Aucun compte avec cet email.");
    if (u.hash !== hashPwd(pwd)) return setErr("Mot de passe incorrect.");
    onLogin({ email: email.toLowerCase(), name: u.name, isAdmin: u.isAdmin || false });
  }

  function doRegister() {
    if (!email || !pwd || !name) return setErr("Remplis tous les champs.");
    if (pwd !== pwd2) return setErr("Les mots de passe ne correspondent pas.");
    if (pwd.length < 6) return setErr("6 caractères minimum.");
    const users = LS.get("dbr_users") || {};
    if (users[email.toLowerCase()]) return setErr("Email déjà utilisé.");
    const isFirst = Object.keys(users).length === 0;
    users[email.toLowerCase()] = { name, hash: hashPwd(pwd), isAdmin: isFirst, createdAt: Date.now() };
    LS.set("dbr_users", users);
    onLogin({ email: email.toLowerCase(), name, isAdmin: isFirst });
  }

  function doReset() {
    if (!email) return setErr("Entre ton email.");
    const users = LS.get("dbr_users") || {};
    if (!users[email.toLowerCase()]) return setErr("Aucun compte trouvé.");
    const tmp = Math.random().toString(36).slice(2, 8).toUpperCase();
    users[email.toLowerCase()].hash = hashPwd(tmp); LS.set("dbr_users", users);
    setInfo(`Mot de passe temporaire : ${tmp}`); setMode("login");
  }

  const btn = { width: "100%", padding: "14px", background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, color: T.white, cursor: "pointer", marginBottom: 10, fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${T.dark} 0%,#1a0a00 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <img src="/logo.png" alt="DBR" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: T.white, letterSpacing: "6px" }}>DBR</div>
          <div style={{ fontSize: 11, color: T.blue, letterSpacing: "4px", fontWeight: 600, marginTop: 4 }}>MÉTHODE CHARITÉ</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(232,84,10,0.3)", borderRadius: 16, padding: "32px 28px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 24, textAlign: "center" }}>
            {mode === "login" ? "Connexion" : mode === "register" ? "Créer un compte" : "Mot de passe oublié"}
          </div>
          {err && <div style={{ background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.4)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#ff8a80" }}>⚠ {err}</div>}
          {info && <div style={{ background: "rgba(39,174,96,0.15)", border: "1px solid rgba(39,174,96,0.4)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#a8ffb0" }}>✓ {info}</div>}
          {mode === "register" && inp("Prénom", name, setName)}
          {inp("Email", email, setEmail, "email")}
          {mode !== "reset" && inp("Mot de passe", pwd, setPwd, "password")}
          {mode === "register" && inp("Confirmer le mot de passe", pwd2, setPwd2, "password")}
          <div style={{ marginTop: 4 }}>
            {mode === "login" && <button onClick={doLogin} style={btn}>Se connecter</button>}
            {mode === "register" && <button onClick={doRegister} style={btn}>Créer mon compte</button>}
            {mode === "reset" && <button onClick={doReset} style={btn}>Réinitialiser</button>}
          </div>
          {mode === "login" && <>
            <button onClick={() => { setMode("register"); setErr(""); setInfo(""); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 13, cursor: "pointer", padding: "4px 0", fontFamily: "inherit", display: "block", width: "100%", textAlign: "center", marginBottom: 4 }}>Pas encore de compte → S'inscrire</button>
            <button onClick={() => { setMode("reset"); setErr(""); setInfo(""); }} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", padding: "4px 0", fontFamily: "inherit", display: "block", width: "100%", textAlign: "center" }}>Mot de passe oublié</button>
          </>}
          {mode !== "login" && <button onClick={() => { setMode("login"); setErr(""); setInfo(""); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 13, cursor: "pointer", padding: "6px 0", fontFamily: "inherit", display: "block", width: "100%", textAlign: "center" }}>← Retour à la connexion</button>}
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Clarté · Stabilité · Liberté</div>
      </div>
    </div>
  );
}

// ── AIGUILLAGE ────────────────────────────────────────────────────────────
function Aiguillage({ user, onKnow, onDontKnow, onLogout }) {
  const [choice, setChoice] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${T.dark},#1a0a00)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <img src="/logo.png" alt="DBR" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 2 }}>Bienvenue, {user.name}</div>
          <div style={{ fontSize: 11, color: T.blue, letterSpacing: "3px" }}>MÉTHODE CHARITÉ</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(232,84,10,0.25)", borderRadius: 16, padding: "36px 32px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.white, marginBottom: 10, textAlign: "center" }}>Avant de commencer</div>
          <div style={{ fontSize: 15, color: T.textDim, textAlign: "center", marginBottom: 32, lineHeight: 1.7 }}>As-tu déjà une idée — même floue — de la direction que tu veux donner à ta vie ou à ta carrière ?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => setChoice("know")} style={{ padding: "18px 24px", background: choice === "know" ? `linear-gradient(135deg,${T.orange},${T.orangeD})` : "rgba(232,84,10,0.1)", border: `2px solid ${choice === "know" ? T.orange : "rgba(232,84,10,0.3)"}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.white, marginBottom: 4 }}>Oui, j'ai une idée</div>
              <div style={{ fontSize: 13, color: choice === "know" ? "rgba(255,255,255,0.8)" : T.muted }}>Je sais à peu près ce que je veux — on va vérifier que c'est le vrai rêve</div>
            </button>
            <button onClick={() => setChoice("dontknow")} style={{ padding: "18px 24px", background: choice === "dontknow" ? `linear-gradient(135deg,${T.blueD},${T.blue})` : "rgba(74,184,232,0.08)", border: `2px solid ${choice === "dontknow" ? T.blue : "rgba(74,184,232,0.2)"}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.white, marginBottom: 4 }}>Non, je cherche encore</div>
              <div style={{ fontSize: 13, color: choice === "dontknow" ? "rgba(255,255,255,0.8)" : T.muted }}>Je n'ai pas encore trouvé ma direction — on va l'identifier ensemble</div>
            </button>
          </div>
          {choice && <button onClick={() => choice === "know" ? onKnow() : onDontKnow()} style={{ width: "100%", padding: "15px", marginTop: 24, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, color: T.white, cursor: "pointer", fontFamily: "inherit" }}>Commencer le parcours →</button>}
          <button onClick={onLogout} style={{ width: "100%", marginTop: 12, background: "none", border: "none", fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>Se déconnecter</button>
        </div>
      </div>
    </div>
  );
}

// ── BUBBLE ────────────────────────────────────────────────────────────────
function Bubble({ msg, id, onSpeak, speaking, activeSpeakId }) {
  const isUser = msg.role === "user"; const raw = msg.content || "";
  const fmt = (text) => text.split("\n").map((line, i) => {
    if (/^-{3,}$/.test(line.trim())) return <hr key={i} style={{ border: "none", borderBottom: "1px solid rgba(232,84,10,0.2)", margin: "10px 0" }} />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return <div key={i} style={{ marginBottom: line.trim() ? 3 : 7, lineHeight: 1.75 }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: T.orange }}>{p}</strong> : p)}</div>;
  });
  if (msg.sys) return (<div style={{ textAlign: "center", padding: "14px 0" }}><span style={{ background: "rgba(232,84,10,0.15)", color: T.orange, fontSize: 10, fontWeight: 700, letterSpacing: "2px", padding: "5px 16px", borderRadius: 20, border: "1px solid rgba(232,84,10,0.3)", textTransform: "uppercase" }}>{raw}</span></div>);
  if (isUser) return (<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}><div style={{ maxWidth: "76%", background: "linear-gradient(135deg,rgba(232,84,10,0.25),rgba(196,66,10,0.2))", border: "1px solid rgba(232,84,10,0.3)", color: T.white, padding: "12px 16px", borderRadius: "14px 14px 3px 14px", fontSize: 14, lineHeight: 1.65 }}>{fmt(raw)}{msg.audio && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>🎤 audio</div>}</div></div>);
  const isSynth = msg.synth; const isConc = msg.conc;
  const boxStyle = isConc ? { background: "linear-gradient(135deg,rgba(232,84,10,0.15),rgba(74,184,232,0.1))", border: `1px solid ${T.orange}`, borderRadius: 12, padding: "22px 26px" } : isSynth ? { background: "rgba(74,184,232,0.08)", border: "1px solid rgba(74,184,232,0.3)", borderLeft: `4px solid ${T.blue}`, borderRadius: 8, padding: "16px 20px" } : { background: T.darkCard, border: `1px solid ${T.darkBrd}`, borderRadius: "3px 14px 14px 14px", padding: "13px 17px" };
  const isTalking = activeSpeakId === id && speaking;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
      <LogoIcon size={34} />
      <div style={{ flex: 1, ...boxStyle, fontSize: 14, color: T.text }}>
        {isConc && <div style={{ fontSize: 10, color: T.orange, letterSpacing: "2px", marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>Conclusion de ton parcours</div>}
        {fmt(raw)}
        <button onClick={() => onSpeak(raw, id)} style={{ marginTop: 8, background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, cursor: "pointer", fontSize: 10, color: T.muted, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}>
          {isTalking ? "⏹ Arrêter" : "▶ Écouter"}
        </button>
      </div>
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────
function Admin({ onBack }) {
  const [tab, setTab] = useState("users");
  const users = LS.get("dbr_users") || {};
  const all = Object.keys(users).map(email => { const sess = LS.get(`dbr_sess_${email}`); return { email, name: users[email].name, isAdmin: users[email].isAdmin, createdAt: users[email].createdAt, session: sess }; });
  const stats = { total: all.length, started: all.filter(s => s.session?.msgs?.length > 0).length, completed: all.filter(s => s.session?.phase === "conclusion").length };

  function dlTranscript(email) {
    const sess = LS.get(`dbr_sess_${email}`); if (!sess || !sess.msgs?.length) return alert("Aucun transcript.");
    const u = users[email];
    const lines = sess.msgs.map(m => { if (m.sys) return `\n${"═".repeat(40)}\n${m.content}\n`; const who = m.role === "user" ? `${u.name}${m.audio ? " (audio)" : ""}` : "Coach DBR"; return `[${who}]\n${m.content}\n`; }).join("\n---\n\n");
    const blob = new Blob([`PARCOURS DBR — MÉTHODE CHARITÉ\nParticipant : ${u.name} (${email})\nDate : ${new Date().toLocaleDateString("fr-FR")}\n${"═".repeat(50)}\n\n${lines}`], { type: "text/plain;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `DBR_${u.name.replace(/\s+/g, "_")}.txt` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  const tabBtn = (id, label) => <button onClick={() => setTab(id)} style={{ padding: "8px 18px", background: tab === id ? T.orange : "transparent", border: `1px solid ${tab === id ? T.orange : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: tab === id ? T.white : T.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>;

  return (
    <div style={{ minHeight: "100vh", background: T.dark, color: T.text, fontFamily: "system-ui,sans-serif" }}>
      <div style={{ background: T.darkCard, borderBottom: `2px solid ${T.orange}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="DBR" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ fontWeight: 700, color: T.white, marginLeft: 4 }}>Console Admin DBR</span>
          </div>
          <button onClick={onBack} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "6px 14px", color: T.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← Retour</button>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
          {[{ label: "Participants inscrits", val: stats.total, color: T.blue }, { label: "Parcours débutés", val: stats.started, color: T.orange }, { label: "Parcours complétés", val: stats.completed, color: T.green }].map(({ label, val, color }, i) => (
            <div key={i} style={{ background: T.darkCard, border: `1px solid ${T.darkBrd}`, borderRadius: 12, padding: "20px 24px", borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 32, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{tabBtn("users", "Participants")}{tabBtn("transcripts", "Transcripts")}</div>
        {tab === "users" && (
          <div style={{ background: T.darkCard, border: `1px solid ${T.darkBrd}`, borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "rgba(255,255,255,0.04)" }}>{["Nom", "Email", "Inscrit le", "Statut", "Actions"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.darkBrd}` }}>{h}</th>)}</tr></thead>
              <tbody>{all.map(({ email, name, isAdmin, createdAt, session }) => {
                const started = session?.msgs?.length > 0; const completed = session?.phase === "conclusion";
                return (<tr key={email} style={{ borderBottom: `1px solid ${T.darkBrd}` }}>
                  <td style={{ padding: "12px 16px", color: T.white, fontWeight: 500 }}>{name}{isAdmin && <span style={{ marginLeft: 6, fontSize: 9, color: T.blue, border: `1px solid ${T.blue}`, borderRadius: 4, padding: "1px 5px" }}>ADMIN</span>}</td>
                  <td style={{ padding: "12px 16px", color: T.muted }}>{email}</td>
                  <td style={{ padding: "12px 16px", color: T.muted }}>{createdAt ? new Date(createdAt).toLocaleDateString("fr-FR") : "—"}</td>
                  <td style={{ padding: "12px 16px" }}><span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: completed ? "rgba(39,174,96,0.15)" : started ? "rgba(232,84,10,0.15)" : "rgba(255,255,255,0.05)", color: completed ? T.green : started ? T.orange : T.muted }}>{completed ? "Complété" : started ? `En cours · ${session?.blocLabel || ""}` : "Non débuté"}</span></td>
                  <td style={{ padding: "12px 16px" }}><button onClick={() => dlTranscript(email)} style={{ padding: "4px 10px", background: "rgba(74,184,232,0.1)", border: "1px solid rgba(74,184,232,0.3)", borderRadius: 6, color: T.blue, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>⬇ Script</button></td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        )}
        {tab === "transcripts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {all.filter(s => s.session?.msgs?.length > 0).length === 0 && <div style={{ textAlign: "center", padding: "40px", color: T.muted }}>Aucun transcript disponible.</div>}
            {all.filter(s => s.session?.msgs?.length > 0).map(({ email, name, session }) => (
              <div key={email} style={{ background: T.darkCard, border: `1px solid ${T.darkBrd}`, borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div><div style={{ fontWeight: 600, color: T.white }}>{name}</div><div style={{ fontSize: 12, color: T.muted }}>{email} · {session.msgs.length} échanges</div></div>
                  <button onClick={() => dlTranscript(email)} style={{ padding: "6px 14px", background: `linear-gradient(135deg,${T.blueD},${T.blue})`, border: "none", borderRadius: 6, color: T.white, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>⬇ Télécharger</button>
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, borderTop: `1px solid ${T.darkBrd}`, paddingTop: 10 }}>
                  {session.msgs.slice(-2).map((m, i) => <div key={i} style={{ marginBottom: 6 }}><span style={{ color: m.role === "user" ? T.orange : T.blue, fontWeight: 600, marginRight: 6 }}>{m.role === "user" ? name : "Coach DBR"}</span>{(m.content || "").slice(0, 150)}{m.content?.length > 150 ? "…" : ""}</div>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null), [screen, setScreen] = useState("auth");
  const [savedSession, setSavedSession] = useState(null), [showAdmin, setShowAdmin] = useState(false);
  const [msgs, setMsgs] = useState([]), [blocs, setBlocs] = useState([]);
  const [bi, setBi] = useState(0), [qi, setQi] = useState(0), [answers, setAnswers] = useState({});
  const [syntheses, setSyntheses] = useState({}), [validated, setValidated] = useState({});
  const [apiHist, setApiHist] = useState([]), [loading, setLoading] = useState(false);
  const [showSynth, setShowSynth] = useState(false), [input, setInput] = useState("");
  const [savedOk, setSavedOk] = useState(false), [activeSpeakId, setActiveSpeakId] = useState(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [startTime] = useState(Date.now());
  const sp = useSpeech();
  const endRef = useRef(null), taRef = useRef(null);
  const answersRef = useRef({}), apiHistRef = useRef([]), blocsRef = useRef([]);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { apiHistRef.current = apiHist; }, [apiHist]);
  useEffect(() => { blocsRef.current = blocs; }, [blocs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);
  useEffect(() => { if (user) { const s = LS.get(`dbr_sess_${user.email}`); if (s && s.msgs?.length > 0) setSavedSession(s); } }, [user]);

  const bloc = blocs[bi], q = bloc?.questions[qi];
  const lastMsg = msgs[msgs.length - 1];
  const isValidated = lastMsg?.role === "assistant" && (lastMsg.content?.includes("✓ Solide") || lastMsg.content?.includes("✓ solide"));
  const answerKey = bloc && q ? `${bloc.id}_${q.id}` : null;
  const alreadyAnswered = !!(answerKey && answersRef.current[answerKey]);

  function buildSave() { return { msgs, bi, qi, answers: answersRef.current, syntheses, validated, apiHist: apiHistRef.current, blocs: blocsRef.current, blocLabel: blocsRef.current[bi]?.label, qTitle: blocsRef.current[bi]?.questions[qi]?.title, phase: screen, savedAt: Date.now(), totalTime: Math.round((Date.now() - startTime) / 1000) }; }
  function doSave() { if (!user || screen === "auth") return; LS.set(`dbr_sess_${user.email}`, buildSave()); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000); }
  useEffect(() => { if (screen === "program" && msgs.length > 0) { const t = setTimeout(doSave, 1500); return () => clearTimeout(t); } }, [msgs, screen]);

  // API via proxy Vercel (sécurisé)
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
    const key = `${bloc.id}_${q.id}`; setLoading(true);
    addMsg({ role: "user", content: text, audio: isAudio });
    try {
      const r = await callClaude(`[BLOC ${bloc.id} — ${bloc.label} | ${q.title}]\n\nRéponse :\n"${text}"\n\nAnalyse selon le protocole DBR. Termine par "✓ Solide." si validé, sinon une question de précision.`);
      const newA = { ...answersRef.current, [key]: text }; setAnswers(newA); answersRef.current = newA;
      addMsg({ role: "assistant", content: r });
    } catch { addMsg({ role: "assistant", content: "Une erreur s'est produite. Réessaie." }); }
    setLoading(false);
  }

  async function submitFollowUp(text, isAudio = false) {
    if (!text.trim() || loading) return; setLoading(true);
    addMsg({ role: "user", content: text, audio: isAudio });
    try { const r = await callClaude(`[Précision sur ${q?.title}]\n"${text}"\n\nContinue. Si suffisant : "✓ Solide." Sinon : une question.`); addMsg({ role: "assistant", content: r }); }
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
    setMsgs(p => [...p, { role: "user", content: "← Je reviens sur la question précédente." }, m]);
    setApiHist(p => { const n = [...p, { role: "user", content: "← Retour." }, { role: "assistant", content: note }]; apiHistRef.current = n; return n; });
    setTimeout(() => { taRef.current?.focus(); taRef.current?.setSelectionRange(9999, 9999); }, 100);
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
      const m = { role: "assistant", content: "Bien sûr. Qu'est-ce qui ne te semble pas juste ?" };
      setMsgs(p => [...p, { role: "user", content: "Je veux préciser quelque chose." }, m]);
      setApiHist(p => { const n = [...p, { role: "user", content: "Je veux préciser." }, { role: "assistant", content: m.content }]; apiHistRef.current = n; return n; });
    }
  }

  async function genConclusion() {
    setLoading(true); setScreen("conclusion");
    const summary = blocsRef.current.map(b => { const ba = Object.entries(answersRef.current).filter(([k]) => k.startsWith(b.id + "_")).map(([, v]) => v.slice(0, 300)).join(" / "); const bs = syntheses[b.id] ? syntheses[b.id].slice(0, 200) : ""; return `BLOC ${b.id} (${b.label}):\n${ba}\nSynthèse: ${bs}`; }).join("\n\n");
    try {
      const r = await callClaude(`[CONCLUSION FINALE — MÉTHODE CHARITÉ]\n\n${summary}\n\nAnalyse ce parcours. Génère :\n1. La conclusion choisie (1 à 4) et pourquoi\n2. La formule du rêve racine\n3. Le programme adapté (plan 90j en 3 phases 30/30/30 avec jalons concrets)\n4. Message final personnel ancré dans le contexte ivoirien\n\nProse fluide, 350 mots max. Commence par "CONCLUSION [N] : [titre]".`);
      addMsg({ role: "assistant", content: r, conc: true });
    } catch { addMsg({ role: "assistant", content: "Erreur lors de la conclusion." }); }
    setLoading(false);
  }

  function download() {
    try {
      const lines = msgs.map(m => { if (m.sys) return `\n${"═".repeat(40)}\n${m.content}\n`; const who = m.role === "user" ? `${user.name}${m.audio ? " (audio)" : ""}` : "Coach DBR"; return `[${who}]\n${m.content}\n`; }).join("\n---\n\n");
      const full = `PARCOURS DBR — MÉTHODE CHARITÉ\nParticipant : ${user.name} (${user.email})\nDate : ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}\n\n${"═".repeat(50)}\n\n${lines}`;
      const blob = new Blob([full], { type: "text/plain;charset=utf-8" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `DBR_${user.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { alert("Copie le contenu manuellement."); }
  }

  function startPath(knowsDream) {
    setMsgs([]); setBi(0); setQi(0); setAnswers({}); answersRef.current = {};
    setSyntheses({}); setValidated({}); setApiHist([]); apiHistRef.current = []; setShowSynth(false); setInput("");
    const chosenBlocs = knowsDream ? [BLOC_5P, ...BLOCS_RITE] : [...BLOCS_CHA, ...BLOCS_RITE];
    setBlocs(chosenBlocs); blocsRef.current = chosenBlocs;
    const b0 = chosenBlocs[0], q0 = b0.questions[0];
    const path = knowsDream ? "5 Pourquoi → RITE" : "CHA → RITE";
    const intro = `Bienvenue ${user.name}. Je suis ton coach DBR.\n\nParcours : **${path}**. Réponds honnêtement — pas parfaitement.\n\n---\n\n**BLOC ${b0.id} — ${b0.label}**\n*${b0.desc}*\n\n---\n\n**${q0.title}**\n\n${q0.q}`;
    const m = { role: "assistant", content: intro }; setMsgs([m]);
    const h = [{ role: "assistant", content: intro }]; setApiHist(h); apiHistRef.current = h; setScreen("program");
  }

  function resumeSession(s) {
    setMsgs(s.msgs || []); setBi(s.bi || 0); setQi(s.qi || 0);
    setAnswers(s.answers || {}); answersRef.current = s.answers || {};
    setSyntheses(s.syntheses || {}); setValidated(s.validated || {});
    setApiHist(s.apiHist || []); apiHistRef.current = s.apiHist || [];
    const b = s.blocs || [...BLOCS_CHA, ...BLOCS_RITE]; setBlocs(b); blocsRef.current = b;
    setShowSynth(false); setScreen("program");
  }

  function handleSend() { const val = input.trim(); if (!val) return; setInput(""); if (taRef.current) taRef.current.style.height = "46px"; if (alreadyAnswered) submitFollowUp(val); else submitAnswer(val); }

  function toggleMic() {
    if (sp.listening) { const final = sp.stopListen(); if (final && final !== "__MIC_BLOCKED__") setInput(prev => (prev + " " + final).trim()); }
    else { setMicBlocked(false); sp.startListen(txt => { if (txt === "__MIC_BLOCKED__") { setMicBlocked(true); sp.stopListen(); } else setInput(txt); }); }
  }

  function handleSpeak(text, id) { if (sp.speaking && activeSpeakId === id) { sp.stopSpeak(); setActiveSpeakId(null); } else { sp.speak(text, () => setActiveSpeakId(null)); setActiveSpeakId(id); } }

  let doneQ = 0; for (let i = 0; i < bi; i++) doneQ += blocs[i]?.questions.length || 0; doneQ += qi;
  const totalQ = blocs.reduce((a, b) => a + b.questions.length, 0) || 9;
  const pct = screen === "conclusion" ? 100 : Math.round((doneQ / totalQ) * 100);

  if (!user) return <Auth onLogin={u => { setUser(u); setScreen("intro"); }} />;
  if (showAdmin && user.isAdmin) return <Admin onBack={() => setShowAdmin(false)} />;

  if (screen === "intro" || screen === "auth") {
    if (savedSession) return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${T.dark},#1a0a00)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ maxWidth: 540, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <img src="/logo.png" alt="DBR" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
            <div style={{ fontSize: 11, color: T.blue, letterSpacing: "3px", marginTop: 10 }}>MÉTHODE CHARITÉ</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(232,84,10,0.25)", borderRadius: 16, padding: "32px 28px" }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.white, marginBottom: 6 }}>Parcours en cours</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, lineHeight: 1.7 }}>
              Dernier arrêt · {savedSession.blocLabel} — {savedSession.qTitle}<br />
              {new Date(savedSession.savedAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <button onClick={() => resumeSession(savedSession)} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, color: T.white, cursor: "pointer", marginBottom: 10, fontFamily: "inherit" }}>Reprendre où j'en étais →</button>
            <button onClick={() => { setSavedSession(null); setScreen("aiguillage"); }} style={{ width: "100%", padding: 13, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 13, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>Recommencer un nouveau parcours</button>
            <button onClick={() => { setUser(null); setScreen("auth"); }} style={{ width: "100%", marginTop: 12, background: "none", border: "none", fontSize: 11, color: "rgba(255,255,255,0.2)", cursor: "pointer", fontFamily: "inherit" }}>Se déconnecter</button>
          </div>
        </div>
      </div>
    );
    return <Aiguillage user={user} onKnow={() => startPath(true)} onDontKnow={() => startPath(false)} onLogout={() => { setUser(null); setScreen("auth"); }} />;
  }
  if (screen === "aiguillage") return <Aiguillage user={user} onKnow={() => startPath(true)} onDontKnow={() => startPath(false)} onLogout={() => { setUser(null); setScreen("auth"); }} />;

  return (
    <div style={{ minHeight: "100vh", background: T.dark, display: "flex", flexDirection: "column", fontFamily: "system-ui,-apple-system,sans-serif", color: T.text }}>
      {/* HEADER */}
      <div style={{ background: T.darkCard, borderBottom: `2px solid ${T.orange}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 50 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/logo.png" alt="DBR" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
              <span style={{ fontSize: 10, color: T.muted, letterSpacing: "2px" }}>MÉTHODE CHARITÉ</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {savedOk && <span style={{ fontSize: 10, color: T.green }}>✓ Sauvegardé</span>}
              {user.isAdmin && <button onClick={() => setShowAdmin(true)} style={{ padding: "4px 10px", background: "rgba(74,184,232,0.15)", border: "1px solid rgba(74,184,232,0.3)", borderRadius: 6, fontSize: 11, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>Admin</button>}
              <button onClick={doSave} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.darkBrd}`, borderRadius: 6, fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>⏸ Pause</button>
              <button onClick={download} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.darkBrd}`, borderRadius: 6, fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>⬇ Script</button>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 70, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${T.orange},${T.blue})`, transition: "width 0.6s" }} /></div>
                <span style={{ fontSize: 10, color: T.orange, minWidth: 24 }}>{pct}%</span>
              </div>
            </div>
          </div>
          {blocs.length > 0 && (
            <div style={{ display: "flex", overflowX: "auto", gap: 2 }}>
              {blocs.map((b, i) => { const done = !!validated[b.id]; const active = i === bi; return <div key={b.id} style={{ padding: "4px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: active ? T.orange : done ? "rgba(232,84,10,0.5)" : "rgba(255,255,255,0.15)", borderBottom: active ? `2px solid ${T.orange}` : "2px solid transparent", whiteSpace: "nowrap", cursor: "default", textTransform: "uppercase" }}>{b.id}{done ? " ✓" : ""}</div>; })}
            </div>
          )}
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, maxWidth: 780, width: "100%", margin: "0 auto", padding: "20px 16px 150px" }}>
        {msgs.map((m, i) => <Bubble key={i} id={i} msg={m} onSpeak={handleSpeak} speaking={sp.speaking} activeSpeakId={activeSpeakId} />)}
        {loading && (
          <div style={{ display: "flex", gap: 5, padding: "14px 48px", alignItems: "center" }}>
            {[0, 1, 2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: j % 2 === 0 ? T.orange : T.blue, animation: `bounce 1.2s ease-in-out ${j * 0.2}s infinite` }} />)}
            <style>{`@keyframes bounce{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
          </div>
        )}
        {showSynth && !loading && (
          <div style={{ display: "flex", gap: 10, padding: "8px 0" }}>
            <button onClick={() => validateSynth(true)} style={{ flex: 1, padding: 13, background: `linear-gradient(135deg,${T.green},#1e8449)`, border: "none", borderRadius: 8, color: T.white, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✓ Je valide</button>
            <button onClick={() => validateSynth(false)} style={{ flex: 1, padding: 13, background: "transparent", border: `1px solid ${T.darkBrd}`, borderRadius: 8, color: T.muted, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>✎ Préciser</button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* INPUT BAR */}
      {screen === "program" && !showSynth && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.darkCard, borderTop: `1px solid ${T.darkBrd}`, padding: "12px 16px 16px", boxShadow: "0 -8px 32px rgba(0,0,0,0.4)", zIndex: 50 }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            {sp.listening && <div style={{ background: "rgba(232,84,10,0.08)", border: "1px solid rgba(232,84,10,0.2)", borderRadius: 6, padding: "6px 12px", marginBottom: 8, fontSize: 12, color: T.orange, display: "flex", gap: 8, alignItems: "center" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: T.red, animation: "bounce 1s infinite" }} />{sp.liveText || "Je t'écoute…"}</div>}
            {micBlocked && <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", borderRadius: 6, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: T.red }}>🎤 Autorise le micro dans les paramètres du navigateur.</div>}
            {q && !isValidated && !sp.listening && <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, fontStyle: "italic" }}>💡 {q.hint}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button onClick={goBack} disabled={loading || (bi === 0 && qi === 0)} title="Question précédente — ta réponse sera pré-remplie"
                style={{ width: 44, height: 46, borderRadius: 8, flexShrink: 0, cursor: bi === 0 && qi === 0 ? "not-allowed" : "pointer", background: bi === 0 && qi === 0 ? "rgba(255,255,255,0.03)" : "rgba(232,84,10,0.15)", border: `2px solid ${bi === 0 && qi === 0 ? "rgba(255,255,255,0.05)" : "rgba(232,84,10,0.6)"}`, color: bi === 0 && qi === 0 ? "rgba(255,255,255,0.15)" : T.orange, fontSize: 20, fontWeight: 700 }}>←</button>
              <textarea ref={taRef} value={sp.listening ? sp.liveText : input}
                onChange={e => { if (!sp.listening) { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; } }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); isValidated ? nextQ() : handleSend(); } }}
                placeholder={sp.listening ? "Je t'écoute…" : q?.ph || "Écris ta réponse…"}
                readOnly={sp.listening} disabled={loading}
                style={{ flex: 1, padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: `1.5px solid ${T.darkBrd}`, borderRadius: 8, fontSize: 14, lineHeight: 1.6, resize: "none", height: 46, minHeight: 46, maxHeight: 140, fontFamily: "inherit", outline: "none", color: T.white, boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = T.darkBrd} />
              {sp.hasSR && <button onClick={toggleMic} disabled={loading} style={{ width: 46, height: 46, borderRadius: 8, border: "none", flexShrink: 0, cursor: "pointer", background: sp.listening ? T.red : "rgba(74,184,232,0.15)", color: sp.listening ? T.white : T.blue, fontSize: 19 }}>{sp.listening ? "⏹" : "🎤"}</button>}
              <button onClick={() => { if (isValidated) nextQ(); else if (sp.listening) { const t = sp.stopListen(); if (t) submitAnswer(t, true); } else handleSend(); }}
                disabled={loading || (!input.trim() && !isValidated && !sp.listening)}
                style={{ width: 46, height: 46, borderRadius: 8, border: "none", flexShrink: 0, cursor: "pointer", fontSize: 20, background: isValidated ? `linear-gradient(135deg,${T.green},#1e8449)` : (loading || (!input.trim() && !sp.listening)) ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg,${T.orange},${T.orangeD})`, color: T.white }}>
                {isValidated ? "→" : "↑"}
              </button>
            </div>
            {isValidated && <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: T.green }}>Réponse validée — ajoute une précision ou clique → pour continuer</div>}
          </div>
        </div>
      )}

      {/* CONCLUSION FOOTER */}
      {screen === "conclusion" && !loading && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.darkCard, borderTop: `1px solid ${T.darkBrd}`, padding: "14px 16px", boxShadow: "0 -8px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", gap: 10 }}>
            <button onClick={download} style={{ flex: 1, padding: 13, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 8, color: T.white, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⬇ Télécharger mon parcours complet</button>
            <button onClick={() => { setScreen("intro"); setSavedSession(null); }} style={{ padding: 13, background: "transparent", border: `1px solid ${T.darkBrd}`, borderRadius: 8, color: T.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Accueil</button>
          </div>
        </div>
      )}
    </div>
  );
}
