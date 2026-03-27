import { useState, useContext } from "react";
import { ThemeCtx, APP_NAME } from "../shared.js";
import Logo from "./Logo.jsx";

export default function Auth({ onLogin }) {
  const T = useContext(ThemeCtx);
  const [resetToken] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('reset_token');
      if (t) { window.history.replaceState({}, '', window.location.pathname); return t; }
    } catch {}
    return null;
  });
  const [mode, setMode] = useState(resetToken ? "reset-confirm" : "login");
  const [email, setEmail] = useState(""), [pwd, setPwd] = useState(""), [pwd2, setPwd2] = useState(""), [name, setName] = useState(""), [invCode, setInvCode] = useState("");
  const [newPwd, setNewPwd] = useState(""), [newPwd2, setNewPwd2] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false), [showNewPwd2, setShowNewPwd2] = useState(false);
  const [err, setErr] = useState(""), [info, setInfo] = useState("");
  const [showPwd, setShowPwd] = useState(false), [showPwd2, setShowPwd2] = useState(false);
  const [busy, setBusy] = useState(false);

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

  async function doLogin() {
    setErr(""); if (!email || !pwd) return setErr("Remplis tous les champs.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email, password: pwd }) });
      const data = await res.json();
      if (!res.ok) { setBusy(false); return setErr(data.error || "Erreur de connexion."); }
      if (data.token) { try { localStorage.setItem("dbr_token", JSON.stringify(data.token)); } catch {} }
      try { localStorage.setItem("dbr_current_user", JSON.stringify(data.user)); } catch {}
      onLogin(data.user);
    } catch { setErr("Erreur réseau. Vérifie ta connexion."); }
    setBusy(false);
  }

  async function doRegister() {
    setErr(""); if (!email || !pwd || !name || !invCode) return setErr("Remplis tous les champs, y compris le code d'invitation.");
    if (pwd !== pwd2) return setErr("Les mots de passe ne correspondent pas.");
    if (pwd.length < 6) return setErr("6 caractères minimum.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "register", email, password: pwd, name, invCode }) });
      const data = await res.json();
      if (!res.ok) { setBusy(false); return setErr(data.error || "Erreur d'inscription."); }
      if (data.token) { try { localStorage.setItem("dbr_token", JSON.stringify(data.token)); } catch {} }
      try { localStorage.setItem("dbr_current_user", JSON.stringify(data.user)); } catch {}
      onLogin(data.user);
    } catch { setErr("Erreur réseau. Vérifie ta connexion."); }
    setBusy(false);
  }

  async function doReset() {
    setErr(""); if (!email) return setErr("Entre ton email.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset", email }) });
      const data = await res.json();
      if (!res.ok) { setBusy(false); return setErr(data.error || "Erreur."); }
      setInfo(data.message || "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.");
    } catch { setErr("Erreur réseau."); }
    setBusy(false);
  }

  async function doResetConfirm() {
    setErr(""); if (!newPwd) return setErr("Entre un nouveau mot de passe.");
    if (newPwd.length < 6) return setErr("6 caractères minimum.");
    if (newPwd !== newPwd2) return setErr("Les mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset-confirm", token: resetToken, newPassword: newPwd }) });
      const data = await res.json();
      if (!res.ok) { setBusy(false); return setErr(data.error || "Erreur."); }
      if (data.token) { try { localStorage.setItem("dbr_token", JSON.stringify(data.token)); } catch {} }
      try { localStorage.setItem("dbr_current_user", JSON.stringify(data.user)); } catch {}
      onLogin(data.user);
    } catch { setErr("Erreur réseau."); }
    setBusy(false);
  }

  const btn = { width: "100%", padding: "15px", background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", marginBottom: 10, fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Logo size={90} /></div>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.orange, letterSpacing: "6px" }}>DBR</div>
          <div style={{ fontSize: 12, color: T.blue, letterSpacing: "4px", fontWeight: 600, marginTop: 4 }}>MÉTHODE CHARITÉ</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Compagnon {APP_NAME} — Dreams Become Reality</div>
        </div>
        <div style={{ background: T.cardBg, border: `1px solid rgba(232,84,10,0.3)`, borderRadius: 16, padding: "32px 24px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 24, textAlign: "center" }}>
            {mode === "login" ? "Connexion" : mode === "register" ? "Créer un compte" : mode === "reset-confirm" ? "Nouveau mot de passe" : "Mot de passe oublié"}
          </div>
          {err && <div style={{ background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: T.red }}>⚠ {err}</div>}
          {info && <div style={{ background: "rgba(39,174,96,0.12)", border: "1px solid rgba(39,174,96,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: T.green }}>✓ {info}</div>}
          {mode === "reset-confirm" && <>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 16, textAlign: "center", lineHeight: 1.5 }}>Choisis un nouveau mot de passe (6 caractères minimum).</div>
            {pwdField("Nouveau mot de passe", newPwd, setNewPwd, showNewPwd, setShowNewPwd)}
            {pwdField("Confirmer le nouveau mot de passe", newPwd2, setNewPwd2, showNewPwd2, setShowNewPwd2)}
          </>}
          {mode !== "reset-confirm" && mode === "register" && inp("Prénom", name, setName)}
          {mode !== "reset-confirm" && inp("Email", email, setEmail, "email")}
          {mode !== "reset" && mode !== "reset-confirm" && pwdField("Mot de passe", pwd, setPwd, showPwd, setShowPwd)}
          {mode === "register" && pwdField("Confirmer le mot de passe", pwd2, setPwd2, showPwd2, setShowPwd2)}
          {mode === "register" && inp("Code d'invitation", invCode, setInvCode)}
          <div style={{ marginTop: 4 }}>
            {mode === "login" && <button onClick={doLogin} disabled={busy} style={{...btn, opacity: busy ? 0.6 : 1}}>{busy ? "Connexion..." : "Se connecter"}</button>}
            {mode === "register" && <button onClick={doRegister} disabled={busy} style={{...btn, opacity: busy ? 0.6 : 1}}>{busy ? "Création..." : "Créer mon compte"}</button>}
            {mode === "reset" && <button onClick={doReset} disabled={busy} style={{...btn, opacity: busy ? 0.6 : 1}}>{busy ? "Envoi..." : "Envoyer le lien"}</button>}
            {mode === "reset-confirm" && <button onClick={doResetConfirm} disabled={busy} style={{...btn, opacity: busy ? 0.6 : 1}}>{busy ? "Enregistrement..." : "Enregistrer le mot de passe"}</button>}
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
