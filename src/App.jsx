import { useState, useEffect, useRef, useContext } from "react";
import { THEMES, ThemeCtx, APP_NAME, LS, authHeaders, isTokenExpired, tokenExpiresIn, fmtDate, emptyBlueprint } from "./shared.js";
import { BLOCS_CHA, BLOC_5P, BLOC_VISION, BLOCS_RITE, SYSTEM } from "./data.js";
import useSpeech from "./hooks/useSpeech.js";
import Logo from "./components/Logo.jsx";
import Auth from "./components/Auth.jsx";
import Aiguillage from "./components/Aiguillage.jsx";
import Bubble from "./components/Bubble.jsx";
import BlueprintScreen from "./components/BlueprintScreen.jsx";
import Admin from "./components/AdminPanel.jsx";

// MAIN APP
export default function App() {
  const [theme, setTheme] = useState(() => LS.get("dbr_theme") || "dark");
  const T = THEMES[theme];
  const toggleTheme = () => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); LS.set("dbr_theme", next); };

  const [user, setUser] = useState(() => LS.get("dbr_current_user"));
  const [screen, setScreen] = useState(() => LS.get("dbr_current_user") ? "intro" : "auth");
  const [blueprintReturn, setBlueprintReturn] = useState("intro");
  const [blueprint, setBlueprint] = useState(() => emptyBlueprint());
  const [blueprintSaveMsg, setBlueprintSaveMsg] = useState("");
  const [blueprintSaving, setBlueprintSaving] = useState(false);
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
  const [showCopilotPrompt, setShowCopilotPrompt] = useState(false);
  const [pendingBlocIdx, setPendingBlocIdx] = useState(null);
  const [copilotDraft, setCopilotDraft] = useState({ name: "", contact: "" });
  const [showJ1Prompt, setShowJ1Prompt] = useState(false);
  const [j1DateInput, setJ1DateInput] = useState("");
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
      let past = LS.get(`dbr_all_sessions_${user.email}`) || [];
      if (past.length > 20) { past = past.slice(-20); LS.set(`dbr_all_sessions_${user.email}`, past); }
      setPastSessions(past);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fallback = emptyBlueprint(user.email, user.name);
    setBlueprint(fallback);
    fetch("/api/participant-profile", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ action: "get" })
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.profile) {
          setBlueprint({ ...fallback, ...d.profile, participant_name: user.name, email: user.email });
        }
      })
      .catch(() => {});
  }, [user]);

  // Update body background + data-theme on theme change
  useEffect(() => { document.body.style.background = T.bg; document.documentElement.dataset.theme = theme; }, [T.bg, theme]);

  // Warn before closing tab during active session
  useEffect(() => {
    const handler = (e) => { if (screen === "program" && msgs.length > 0) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [screen, msgs.length]);

  // Check token expiry - warn 30min before and auto-logout when expired
  const [tokenWarning, setTokenWarning] = useState(false);
  useEffect(() => {
    if (!user) return;
    const check = () => {
      if (isTokenExpired()) { handleLogout(); return; }
      const remaining = tokenExpiresIn();
      setTokenWarning(remaining > 0 && remaining < 30 * 60 * 1000);
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [user]);

  // Close modals with Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") { if (showCopilotPrompt) { handleCopilotSave(true); } if (showJ1Prompt) { setShowJ1Prompt(false); setJ1DateInput(""); } } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showCopilotPrompt, showJ1Prompt]);

  const bloc = blocs[bi], q = bloc?.questions[qi];
  const lastMsg = msgs[msgs.length - 1];
  const isValidated = lastMsg?.role === "assistant" && (lastMsg.content?.includes("✓ Solide") || lastMsg.content?.includes("✓ solide"));
  const answerKey = bloc && q ? `${bloc.id}_${q.id}` : null;
  const alreadyAnswered = !!(answerKey && answersRef.current[answerKey]);

  function handleLogin(u) { setUser(u); setScreen("intro"); }
  function handleLogout() { LS.del("dbr_token"); LS.del("dbr_current_user"); setUser(null); setScreen("auth"); setShowAdmin(false); }
  function openBlueprint(fromScreen) { setBlueprintReturn(fromScreen); setScreen("blueprint"); }

  async function saveBlueprint() {
    if (!user) return;
    setBlueprintSaving(true);
    setBlueprintSaveMsg("");
    try {
      const payload = { ...blueprint, email: user.email, participant_name: user.name, updated_at: Date.now() };
      const res = await fetch("/api/participant-profile", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "upsert", profile: payload })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBlueprintSaveMsg(data.error || "Erreur de sauvegarde Blueprint.");
      } else {
        setBlueprint(payload);
        setBlueprintSaveMsg("✓ Blueprint enregistré.");
      }
    } catch {
      setBlueprintSaveMsg("Erreur réseau pendant la sauvegarde.");
    }
    setBlueprintSaving(false);
  }

  function buildSave() { return { msgs, bi, qi, answers: answersRef.current, syntheses, validated, apiHist: apiHistRef.current, blocs: blocsRef.current, blocLabel: blocsRef.current[bi]?.label, qTitle: blocsRef.current[bi]?.questions[qi]?.title, phase: screen, savedAt: Date.now(), totalTime: Math.round((Date.now() - startTime) / 1000) }; }
  const serverSaveRef = useRef(0);
  function doSave(alsoServer) { if (!user || screen === "auth") return; const s = buildSave(); LS.set(`dbr_sess_${user.email}`, s); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000); if (alsoServer || Date.now() - serverSaveRef.current > 30000) { serverSaveRef.current = Date.now(); fetch("/api/sessions", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "save", session: s }) }).catch(() => {}); } }
  useEffect(() => { if (screen === "program" && msgs.length > 0) { const t = setTimeout(() => doSave(false), 1500); return () => clearTimeout(t); } }, [msgs, screen]);

  async function callClaude(userMsg, retries = 1) {
    const hist = [...apiHistRef.current, { role: "user", content: userMsg }];
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1024, system: SYSTEM, messages: hist })
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (retries > 0 && (res.status >= 500 || res.status === 429)) {
        await new Promise(r => setTimeout(r, 2000));
        return callClaude(userMsg, retries - 1);
      }
      throw new Error(d.error || "Erreur serveur (" + res.status + ")");
    }
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
      const r = await callClaude(`[BLOC ${bloc.id} · ${bloc.label} | ${q.title}]\n\nRéponse :\n"${text}"\n\nAnalyse selon le protocole DBR. IMPORTANT : termine par "✓ Solide." UNIQUEMENT si la réponse est suffisamment précise et profonde. Sinon pose UNE question de précision.`);
      const newA = { ...answersRef.current, [answerKey]: text }; setAnswers(newA); answersRef.current = newA;
      if (answerKey === "5P_5P1") {
        setBlueprint((p) => ({ ...p, dream_root: p.dream_root || text.trim() }));
      }
      addMsg({ role: "assistant", content: r });
    } catch (e) { addMsg({ role: "assistant", content: e.message || "Une erreur s'est produite. Réessaie." }); }
    setLoading(false);
  }

  async function submitFollowUp(text, isAudio = false) {
    if (!text.trim() || loading) return; setLoading(true);
    addMsg({ role: "user", content: text, audio: isAudio });
    try { const r = await callClaude(`[Précision sur ${q?.title}]\n"${text}"\n\nContinue. Si suffisant : "✓ Solide." Sinon : UNE question de précision.`); addMsg({ role: "assistant", content: r }); }
    catch (e) { addMsg({ role: "assistant", content: e.message || "Erreur. Réessaie." }); }
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
    const note = `**← Retour : ${pQ.title}**\n\n${pQ.q}${prevAnswer ? "\n\n*Ta réponse précédente est pré-remplie, modifie-la librement.*" : ""}`;
    const m = { role: "assistant", content: note };
    setMsgs(p => [...p, { role: "user", content: "← Retour." }, m]);
    setApiHist(p => { const n = [...p, { role: "user", content: "← Retour." }, { role: "assistant", content: note }]; apiHistRef.current = n; return n; });
    setTimeout(() => { taRef.current?.focus(); }, 100);
  }

  async function handleCopilotSave(skip) {
    setShowCopilotPrompt(false);
    const name = skip ? "" : copilotDraft.name.trim();
    const contact = skip ? "" : copilotDraft.contact.trim();
    if (!skip && name) {
      const updated = { ...blueprint, copilot_name: name, copilot_contact: contact, updated_at: Date.now() };
      setBlueprint(updated);
      try { await fetch("/api/participant-profile", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "upsert", profile: { ...updated, email: user.email } }) }); } catch {}
      const m = { role: "assistant", content: `**Co-Pilote enregistré : ${name}** ✓\n\nC'est la personne de confiance qui aura la responsabilité de renseigner ta fiche de suivi quotidien avec toi. On continue !` };
      addMsg(m); setApiHist(p => { const n = [...p, { role: "assistant", content: m.content }]; apiHistRef.current = n; return n; });
    }
    const nbi = pendingBlocIdx; setPendingBlocIdx(null); setCopilotDraft({ name: "", contact: "" });
    if (nbi !== null && nbi < blocs.length) {
      setBi(nbi); setQi(0);
      const nb = blocs[nbi], nq = nb.questions[0];
      const intro = `---\n**BLOC ${nb.id} · ${nb.label}**\n*${nb.desc}*\n\n---\n\n**${nq.title}**\n\n${nq.q}`;
      addMsg({ role: "assistant", content: intro });
      setApiHist(p => { const n = [...p, { role: "assistant", content: intro }]; apiHistRef.current = n; return n; });
    } else if (nbi !== null) { await genConclusion(); }
  }

  async function genSynthesis() {
    setLoading(true);
    const blocAnswers = Object.entries(answersRef.current).filter(([k]) => k.startsWith(bloc.id + "_")).map(([, v]) => v.slice(0, 400)).join("\n\n---\n\n");
    try {
      const r = await callClaude(`[SYNTHÈSE BLOC ${bloc.id} · ${bloc.label}]\n\nRéponses :\n${blocAnswers}\n\nSynthèse concise (4-5 phrases). 1 force + 1 vigilance.${bloc.id === "C" ? ' Formule le domino : "Je [verbe] [problème] pour [bénéficiaire] via [format]."' : ""} Termine : "Est-ce que cette synthèse te semble juste ?"`);
      setSyntheses(p => ({ ...p, [bloc.id]: r }));
      addMsg({ role: "assistant", content: `---\n**SYNTHÈSE · ${bloc.label}**\n\n${r}`, synth: true }); setShowSynth(true);
    } catch (e) { addMsg({ role: "assistant", content: "Erreur lors de la synthèse : " + (e.message || "Réessaie.") }); }
    setLoading(false);
  }

  async function validateSynth(ok) {
    setShowSynth(false);
    if (ok) {
      setValidated(p => ({ ...p, [bloc.id]: true }));
      addMsg({ role: "user", content: "✓ Cette synthèse me semble juste." });
      setApiHist(p => { const n = [...p, { role: "user", content: "✓ Synthèse validée." }]; apiHistRef.current = n; return n; });
      if (bloc.id === "A") { setPendingBlocIdx(bi + 1); setCopilotDraft({ name: blueprint.copilot_name || "", contact: blueprint.copilot_contact || "" }); setShowCopilotPrompt(true); return; }
      const nbi = bi + 1;
      if (nbi < blocs.length) {
        setBi(nbi); setQi(0); const nb = blocs[nbi], nq = nb.questions[0];
        const intro = `---\n**BLOC ${nb.id} · ${nb.label}**\n*${nb.desc}*\n\n---\n\n**${nq.title}**\n\n${nq.q}`;
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
      const r = await callClaude(`[CONCLUSION FINALE · Compagnon ${APP_NAME}]\n\n${summary}\n\nC'est le moment le plus important du parcours. Convoque les 3 moments de vérité les plus forts de ce parcours. Relie-les en une image cohérente. Utilise les mots exacts que le participant a prononcés, pas tes propres mots. Nomme ce qu'il porte maintenant qu'il ne portait pas en entrant.\n\nTermine par une phrase qui appartient uniquement à ce participant. Pas une formule. Quelque chose de vrai, de spécifique, d'inoubliable.\n\nProse fluide. Dis ce qui est juste. Pas plus. Pas moins.`);
      addMsg({ role: "assistant", content: r, conc: true });
      // Save to multi-sessions
      const session = buildSave();
      session.phase = "conclusion";
      session.completedAt = Date.now();
      const past = LS.get(`dbr_all_sessions_${user.email}`) || [];
      past.push(session);
      LS.set(`dbr_all_sessions_${user.email}`, past);
      setPastSessions(past);
      // Save completed session to server
      fetch("/api/sessions", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "save", session }) }).catch(() => {});
      setShowJ1Prompt(true);
    } catch (e) { addMsg({ role: "assistant", content: "Erreur lors de la conclusion : " + (e.message || "Réessaie.") }); }
    setLoading(false);
  }

  function download() {
    try {
      const lines = msgs.map(m => { if (m.sys) return `\n${"═".repeat(40)}\n${m.content}\n`; const who = m.role === "user" ? `${user.name}${m.audio ? " (audio)" : ""}` : `Réel, Compagnon DBR`; return `[${who}]\n${m.content}\n`; }).join("\n---\n\n");
      const full = `PARCOURS DBR · MÉTHODE CHARITÉ\nCompagnon : ${APP_NAME}\nParticipant : ${user.name} (${user.email})\nDate : ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}\n\n${"═".repeat(50)}\n\n${lines}`;
      const blob = new Blob([full], { type: "text/plain;charset=utf-8" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `DBR_${APP_NAME}_${user.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { alert("Copie le contenu manuellement."); }
  }

  function startPath(knowsDream) {
    setMsgs([]); setBi(0); setQi(0); setAnswers({}); answersRef.current = {};
    setSyntheses({}); setValidated({}); setApiHist([]); apiHistRef.current = []; setShowSynth(false); setInput("");
    setBlueprint((p) => ({ ...p, parcours_dbr: p.parcours_dbr || (knowsDream ? "RITE" : "CHA") }));
    const chosenBlocs = knowsDream ? [BLOC_5P, BLOC_VISION, ...BLOCS_RITE] : [...BLOCS_CHA, BLOC_5P, BLOC_VISION, ...BLOCS_RITE];
    setBlocs(chosenBlocs); blocsRef.current = chosenBlocs;
    const b0 = chosenBlocs[0], q0 = b0.questions[0];
    const path = knowsDream ? "5 Pourquoi → Vision → RITE" : "CHA → 5 Pourquoi → Vision → RITE";
    const intro = `${user.name}, je suis Réel, ton Compagnon. Ce que tu t'apprêtes à vivre, c'est le plus beau cadeau que tu puisses t'offrir. On commence ?

Ton parcours : **${path}**.

Chaque question est là pour creuser. Réponds honnêtement, pas parfaitement. Y'a moyen !

---

**BLOC ${b0.id} · ${b0.label}**
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
    if (loading) return;
    if (sp.listening) { const final = sp.stopListen(); const txt = (final || input || "").trim(); setInput(""); if (taRef.current) taRef.current.style.height = "48px"; if (!txt) return; if (alreadyAnswered) submitFollowUp(txt, true); else submitAnswer(txt, true); return; }
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

  if (screen === "blueprint") {
    return (
      <ThemeCtx.Provider value={T}>
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div>
        <BlueprintScreen
          user={user}
          profile={{ ...blueprint, participant_name: user.name, email: user.email }}
          onChange={setBlueprint}
          onSave={saveBlueprint}
          onBack={() => setScreen(blueprintReturn || "intro")}
          saving={blueprintSaving}
          saveMsg={blueprintSaveMsg}
          onClearMsg={() => setBlueprintSaveMsg("")}
        />
      </ThemeCtx.Provider>
    );
  }

  // INTRO / RESUME / HISTORY
  if (screen === "intro" || screen === "auth") {
    if (savedSession) return (
      <ThemeCtx.Provider value={T}>
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div>
        <div style={{ minHeight: "100vh", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 540, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <Logo size={72} />
              <div style={{ fontSize: 12, color: T.blue, letterSpacing: "3px", marginTop: 10 }}>COMPAGNON {APP_NAME.toUpperCase()}</div>
            </div>
            <div style={{ background: T.cardBg, border: "1px solid rgba(232,84,10,0.25)", borderRadius: 16, padding: "32px 24px" }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 6 }}>Parcours en cours</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, lineHeight: 1.7 }}>
                Dernier arrêt · {savedSession.blocLabel} · {savedSession.qTitle}<br />
                {savedSession.savedAt && new Date(savedSession.savedAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <button onClick={() => resumeSession(savedSession)} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", marginBottom: 10, fontFamily: "inherit" }}>Reprendre où j'en étais →</button>
              <button onClick={() => { setSavedSession(null); setScreen("aiguillage"); }} style={{ width: "100%", padding: 13, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>Recommencer un nouveau parcours</button>
              {pastSessions.length > 0 && <button onClick={() => setShowHistory(!showHistory)} style={{ width: "100%", marginTop: 8, padding: 11, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>🗂️ Mes parcours passés ({pastSessions.length})</button>}
              <button onClick={() => openBlueprint("intro")} style={{ width: "100%", marginTop: 8, padding: 11, background: "rgba(74,184,232,0.08)", border: `1px solid rgba(74,184,232,0.2)`, borderRadius: 10, fontSize: 13, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>📘 Mon Blueprint 90 jours</button>
              {showHistory && pastSessions.map((s, i) => (
                <div key={i} onClick={() => resumeSession(s)} style={{ marginTop: 8, padding: "12px 16px", background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: T.textDim }}>
                  <strong style={{ color: T.text }}>{s.blocLabel}</strong> · {s.qTitle}<br />
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
    return <ThemeCtx.Provider value={T}><div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div><Aiguillage user={user} onKnow={() => startPath(true)} onDontKnow={() => startPath(false)} onLogout={handleLogout} onBlueprint={() => openBlueprint("intro")} /></ThemeCtx.Provider>;
  }
  if (screen === "aiguillage") return <ThemeCtx.Provider value={T}><div style={{ position: "fixed", top: 16, right: 16, zIndex: 999 }}>{themeBtn}</div><Aiguillage user={user} onKnow={() => startPath(true)} onDontKnow={() => startPath(false)} onLogout={handleLogout} onBlueprint={() => openBlueprint("aiguillage")} /></ThemeCtx.Provider>;

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
                <span style={{ fontSize: 11, color: T.muted, letterSpacing: "2px" }}>COMPAGNON {APP_NAME.toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {tokenWarning && <span style={{ fontSize: 10, color: T.red, fontWeight: 600 }}>⚠ Session expire bientôt</span>}
                {savedOk && <span style={{ fontSize: 10, color: T.green }}>✓ Sauvé</span>}
                {themeBtn}
                <button onClick={() => openBlueprint(screen)} style={{ padding: "4px 10px", background: "rgba(74,184,232,0.1)", border: "1px solid rgba(74,184,232,0.2)", borderRadius: 6, fontSize: 11, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>Blueprint</button>
                {user.isAdmin && <button onClick={() => setShowAdmin(true)} style={{ padding: "4px 10px", background: "rgba(74,184,232,0.1)", border: "1px solid rgba(74,184,232,0.2)", borderRadius: 6, fontSize: 11, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>Admin</button>}
                <button onClick={() => { doSave(true); setScreen("intro"); }} style={{ padding: "4px 10px", background: "rgba(39,174,96,0.1)", border: "1px solid rgba(39,174,96,0.25)", borderRadius: 6, fontSize: 11, color: T.green, cursor: "pointer", fontFamily: "inherit" }}>🏠</button>
                <button onClick={handleLogout} style={{ padding: "4px 10px", background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", borderRadius: 6, fontSize: 11, color: T.red, cursor: "pointer", fontFamily: "inherit", opacity: 0.8 }}>↪</button>
                <button onClick={download} style={{ padding: "4px 10px", background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>⬇</button>
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
          {showCopilotPrompt && !loading && (
            <div style={{ margin: "12px 0", background: T.card, border: `2px solid ${T.orange}`, borderRadius: 14, padding: "20px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>👥</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.orange }}>Ton Co-Pilote</span>
              </div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 14, lineHeight: 1.65 }}>
                Qui dans ton entourage aura la responsabilité de renseigner ta fiche de suivi quotidien <em>avec</em> toi ? C’est la personne qui te connaît, qui t’observera et te demandera des comptes.
              </div>
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                <input value={copilotDraft.name} onChange={e => setCopilotDraft(p => ({ ...p, name: e.target.value }))} placeholder="Nom & Prénom du Co-Pilote" style={{ width: "100%", padding: "11px 14px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, fontSize: 14, color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = T.inputBorder} />
                <input value={copilotDraft.contact} onChange={e => setCopilotDraft(p => ({ ...p, contact: e.target.value }))} placeholder="Téléphone ou contact" style={{ width: "100%", padding: "11px 14px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, fontSize: 14, color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = T.inputBorder} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleCopilotSave(false)} disabled={!copilotDraft.name.trim()} style={{ flex: 1, padding: "12px", background: copilotDraft.name.trim() ? `linear-gradient(135deg,${T.orange},${T.orangeD})` : T.cardBg, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: copilotDraft.name.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: copilotDraft.name.trim() ? 1 : 0.5 }}>Enregistrer et continuer →</button>
                <button onClick={() => handleCopilotSave(true)} style={{ padding: "12px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Passer</button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* INPUT BAR */}
        {screen === "program" && !showSynth && !showCopilotPrompt && (
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
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (loading) return; if (isValidated) { nextQ(); } else { const val = (sp.listening ? sp.liveText : input || "").trim(); if (!val) return; handleSend(); } } }}
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
              {isValidated && <div style={{ textAlign: "center", marginTop: 6, fontSize: 12, color: T.green }}>✓ Réponse validée par {APP_NAME}, ajoute une précision ou clique → pour continuer</div>}
            </div>
          </div>
        )}

        {/* J1 DATE PROMPT */}
        {screen === "conclusion" && showJ1Prompt && !loading && (
          <div style={{ position: "fixed", bottom: 72, left: 0, right: 0, zIndex: 60, padding: "0 16px" }}>
            <div style={{ maxWidth: 780, margin: "0 auto", background: T.card, border: `2px solid ${T.orange}`, borderRadius: 14, padding: "16px 18px", boxShadow: `0 -8px 32px ${T.shadow}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.orange, marginBottom: 4 }}>📅 Date de début J1</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 10 }}>Fixe ta date de démarrage officielle, le premier jour de ton sprint de 7 jours.</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="date" value={j1DateInput} onChange={e => setJ1DateInput(e.target.value)} style={{ flex: 1, padding: "10px 12px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, fontSize: 14, color: T.text, outline: "none", fontFamily: "inherit" }} />
                <button onClick={() => { if (!j1DateInput) return; const upd = { ...blueprint, start_date_j1: j1DateInput, updated_at: Date.now() }; setBlueprint(upd); setShowJ1Prompt(false); setJ1DateInput(""); fetch("/api/participant-profile", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "upsert", profile: { ...upd, email: user.email } }) }).catch(() => {}); }} disabled={!j1DateInput} style={{ padding: "10px 20px", background: j1DateInput ? `linear-gradient(135deg,${T.orange},${T.orangeD})` : T.cardBg, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: j1DateInput ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: j1DateInput ? 1 : 0.5 }}>Enregistrer J1</button>
                <button onClick={() => { setShowJ1Prompt(false); setJ1DateInput(""); }} style={{ padding: "10px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Plus tard</button>
              </div>
            </div>
          </div>
        )}
        {/* CONCLUSION FOOTER */}
        {screen === "conclusion" && !loading && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.border}`, padding: "14px 16px", boxShadow: `0 -8px 32px ${T.shadow}` }}>
            <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", gap: 10 }}>
              <button onClick={download} style={{ flex: 1, padding: 14, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 8, color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⬇ Télécharger mon parcours</button>
              <button onClick={() => openBlueprint("conclusion")} style={{ padding: 14, background: "rgba(74,184,232,0.1)", border: "1px solid rgba(74,184,232,0.2)", borderRadius: 8, color: T.blue, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>📘 Blueprint</button>
              <button onClick={() => { setScreen("intro"); setSavedSession(null); LS.del(`dbr_sess_${user.email}`); }} style={{ padding: 14, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Accueil</button>
            </div>
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
