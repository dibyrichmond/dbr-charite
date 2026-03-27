import { useState, useEffect, useContext } from "react";
import { ThemeCtx, SUPER_ADMIN, APP_NAME, LS, authHeaders, fmtDate, STATUS_LABEL, profileToRow, downloadCSV, downloadExcel } from "../shared.js";
import Logo from "./Logo.jsx";

export default function Admin({ user, onBack }) {
  const T = useContext(ThemeCtx);
  const [tab, setTab] = useState("dashboard");
  const [allUsers, setAllUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [codes, setCodes] = useState([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ started: 0, completed: 0, details: [] });
  const [newRole, setNewRole] = useState("participant");
  const [codeEmail, setCodeEmail] = useState("");
  const [codeCount, setCodeCount] = useState(1);
  const [copied, setCopied] = useState(null);
  const [codeSending, setCodeSending] = useState(null);
  const [codeMsg, setCodeMsg] = useState("");
  const [emailTo, setEmailTo] = useState(""), [emailSubject, setEmailSubject] = useState(""), [emailBody, setEmailBody] = useState("");
  const [emailStatus, setEmailStatus] = useState("");

  const WEEK = 7 * 24 * 3600 * 1000;
  const isExpired = (c) => c.expires_at && Date.now() > c.expires_at;
  const codeStatusFn = (c) => c.used_by ? "used" : isExpired(c) ? "expired" : "available";

  async function loadData() {
    setAdminLoading(true);
    try {
      const [usersRes, codesRes, statsRes, profilesRes] = await Promise.all([
        fetch("/api/admin-users", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "list", adminEmail: user.email }) }),
        fetch("/api/codes", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "list", adminEmail: user.email }) }),
        fetch("/api/sessions", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "stats" }) }),
        fetch("/api/participant-profile", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "list" }) })
      ]);
      if (usersRes.ok) { const d = await usersRes.json(); setAllUsers(d.users || []); }
      if (codesRes.ok) { const d = await codesRes.json(); setCodes(d.codes || []); }
      if (statsRes.ok) { const d = await statsRes.json(); setSessionStats(d); }
      if (profilesRes.ok) { const d = await profilesRes.json(); setProfiles(d.profiles || []); }
    } catch {}
    setAdminLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const stats = {
    total: allUsers.length,
    admins: allUsers.filter(u => u.is_admin).length,
    started: sessionStats.started || 0,
    completed: sessionStats.completed || 0,
    profiles: profiles.length,
    codesUsed: codes.filter(c => c.used_by).length,
    codesAvailable: codes.filter(c => codeStatusFn(c) === "available").length,
  };

  async function generateCodes() {
    try {
      const res = await fetch("/api/codes", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ action: "create", adminEmail: user.email, role: newRole, forEmail: codeEmail, count: codeCount })
      });
      const data = await res.json();
      if (res.ok) {
        setCodeEmail("");
        setCodeMsg(`✓ ${data.created} code${data.created > 1 ? "s" : ""} créé${data.created > 1 ? "s" : ""}${codeEmail.trim() ? ` pour ${codeEmail.trim()} (7j)` : ""}`);
        loadData();
      } else setCodeMsg(data.error || "Erreur.");
    } catch { setCodeMsg("Erreur réseau."); }
    setTimeout(() => setCodeMsg(""), 4000);
  }

  async function deleteCode(codeId) {
    if (!window.confirm("Supprimer ce code ?")) return;
    try {
      const res = await fetch("/api/codes", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ action: "delete", adminEmail: user.email, codeId })
      });
      if (res.ok) { setCodeMsg("✓ Code supprimé"); loadData(); }
      else { const d = await res.json(); setCodeMsg(d.error || "Erreur suppression."); }
    } catch { setCodeMsg("Erreur réseau."); }
    setTimeout(() => setCodeMsg(""), 3000);
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code).then(() => { setCopied(code); setTimeout(() => setCopied(null), 2000); }).catch(() => {});
  }

  async function sendCodeEmail(c) {
    const to = c.for_email || ""; if (!to) return;
    setCodeSending(c.code);
    try {
      const expire = c.expires_at ? `<br><br>Ce code est valable jusqu'au ${new Date(c.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.` : "";
      const res = await fetch("/api/email", { method: "POST", headers: authHeaders(), body: JSON.stringify({ to, subject: `DBR - Code d'invitation accompagnement Méthode CHARITE`, html: `<div style="font-family:system-ui;background:#0D0D0D;color:#F0F0F0;padding:40px 24px;"><div style="max-width:520px;margin:0 auto;background:#1A1A1A;border:1px solid rgba(232,84,10,0.3);border-radius:16px;padding:36px;"><div style="text-align:center;margin-bottom:24px;font-size:24px;font-weight:900;letter-spacing:6px;color:#E8540A;">DBR</div><div style="text-align:center;font-size:12px;color:#4AB8E8;letter-spacing:3px;margin-bottom:32px;">MÉTHODE CHARITÉ</div><div style="font-size:15px;line-height:1.8;color:#AAAAAA;margin-bottom:24px;">Tu as été invité(e) à rejoindre le parcours d'accompagnement avec ton Compagnon ${APP_NAME}.</div><div style="text-align:center;background:rgba(232,84,10,0.08);border:2px dashed rgba(232,84,10,0.4);border-radius:12px;padding:24px;margin-bottom:24px;"><div style="font-size:12px;color:#8A8A8A;margin-bottom:8px;">TON CODE D'INVITATION</div><div style="font-size:32px;font-weight:900;letter-spacing:6px;color:#E8540A;font-family:monospace;">${c.code}</div></div><div style="font-size:13px;color:#8A8A8A;text-align:center;">Utilise ce code lors de ton inscription.${expire}</div></div></div>` }) });
      if (res.ok) setCodeMsg(`✓ Code envoyé à ${to}`); else { const d = await res.json(); setCodeMsg(d.error || "Erreur d'envoi."); }
    } catch { setCodeMsg("Erreur réseau."); }
    setCodeSending(null); setTimeout(() => setCodeMsg(""), 4000);
  }

  async function toggleAdmin(email) {
    if (email === SUPER_ADMIN) return;
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ action: "toggle-admin", adminEmail: user.email, targetEmail: email })
      });
      if (res.ok) loadData();
    } catch {}
  }

  async function removeUser(email) {
    if (email === SUPER_ADMIN || email === user.email) return;
    if (!window.confirm(`Supprimer ${email} ?`)) return;
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ action: "remove", adminEmail: user.email, targetEmail: email })
      });
      if (res.ok) loadData();
    } catch {}
  }

  async function dlTranscript(email) {
    let sess = null;
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "get", targetEmail: email }) });
      if (res.ok) { const d = await res.json(); if (d.sessions?.length > 0) sess = d.sessions[0]; }
    } catch {}
    if (!sess) sess = LS.get(`dbr_sess_${email}`);
    if (!sess || !sess.msgs?.length) return alert("Aucun transcript disponible pour ce participant.");
    const u = allUsers.find(x => x.email === email);
    const lines = sess.msgs.map(m => { if (m.sys) return `\n${"═".repeat(40)}\n${m.content}\n`; const who = m.role === "user" ? `${u?.name || email}${m.audio ? " (audio)" : ""}` : `Réel — Compagnon DBR`; return `[${who}]\n${m.content}\n`; }).join("\n---\n\n");
    const blob = new Blob([`PARCOURS DBR — MÉTHODE CHARITÉ\nCompagnon : ${APP_NAME}\nParticipant : ${u?.name || email} (${email})\nDate : ${new Date().toLocaleDateString("fr-FR")}\n${"═".repeat(50)}\n\n${lines}`], { type: "text/plain;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `DBR_${(u?.name || email).replace(/\s+/g, "_")}.txt` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function exportCSV() {
    const headers = ["Nom", "Email", "Rôle", "Admin", "Inscrit le"];
    const rows = allUsers.map(u => [u.name, u.email, u.role || "participant", u.is_admin ? "Oui" : "Non", fmtDate(u.created_at)]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `DBR_Export_${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function exportProfilesCSV() {
    if (!profiles.length) return;
    const rows = profiles.map((p) => profileToRow({ ...p, participant_name: allUsers.find((u) => u.email === p.email)?.name || "" }));
    downloadCSV(`DBR_Blueprints_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function exportProfilesExcel() {
    if (!profiles.length) return;
    const rows = profiles.map((p) => profileToRow({ ...p, participant_name: allUsers.find((u) => u.email === p.email)?.name || "" }));
    downloadExcel(`DBR_Blueprints_${new Date().toISOString().slice(0, 10)}.xls`, rows);
  }

  async function sendEmail() {
    if (!emailTo || !emailSubject || !emailBody) return setEmailStatus("Remplis tous les champs.");
    setEmailStatus("Envoi en cours...");
    try {
      const res = await fetch("/api/email", { method: "POST", headers: authHeaders(), body: JSON.stringify({ to: emailTo, subject: emailSubject, html: `<div style="font-family:system-ui;background:#0D0D0D;color:#F0F0F0;padding:40px 24px;"><div style="max-width:560px;margin:0 auto;background:#1A1A1A;border:1px solid rgba(232,84,10,0.3);border-radius:16px;padding:32px;"><div style="text-align:center;margin-bottom:20px;font-size:22px;font-weight:900;letter-spacing:6px;color:#E8540A;">DBR</div><div style="font-size:14px;line-height:1.8;color:#AAAAAA;">${emailBody.replace(/\n/g, "<br>")}</div></div></div>` }) });
      if (res.ok) { setEmailStatus("✓ Email envoyé !"); setEmailTo(""); setEmailSubject(""); setEmailBody(""); } else { const d = await res.json(); setEmailStatus(d.error || "Erreur d'envoi."); }
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
        {adminLoading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Chargement des données...</div>}
        {!adminLoading && <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 28 }}>
          {statCard("Participants", stats.total, T.blue)}
          {statCard("Admins", stats.admins, T.orange)}
          {statCard("Blueprints", stats.profiles, "#8E44AD")}
          {statCard("Parcours initiés", stats.started, "#9B59B6")}
          {statCard("Parcours achevés", stats.completed, T.green)}
          {statCard("Codes dispo", stats.codesAvailable, "#3498DB")}
          {statCard("Codes utilisés", stats.codesUsed, "#F39C12")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {tabBtn("users", "👥 Participants")}
          {tabBtn("profiles", "📘 Blueprint")}
          {tabBtn("codes", "🔑 Invitations")}
          {tabBtn("email", "📧 Email")}
          {tabBtn("export", "📊 Export")}
        </div>

        {tab === "users" && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: T.cardBg }}>{["Nom", "Email", "Rôle", "Inscrit", "Actions"].map(h => <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{allUsers.map(u => (
                <tr key={u.email} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "12px 14px", color: T.text, fontWeight: 500 }}>{u.name}{u.email === SUPER_ADMIN && <span style={{ marginLeft: 6, fontSize: 9, color: T.orange, border: `1px solid ${T.orange}`, borderRadius: 4, padding: "1px 5px" }}>SUPER</span>}{u.is_admin && u.email !== SUPER_ADMIN && <span style={{ marginLeft: 6, fontSize: 9, color: T.blue, border: `1px solid ${T.blue}`, borderRadius: 4, padding: "1px 5px" }}>ADMIN</span>}</td>
                  <td style={{ padding: "12px 14px", color: T.muted, fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: "12px 14px" }}><span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, background: u.is_admin ? "rgba(232,84,10,0.1)" : "rgba(74,184,232,0.1)", color: u.is_admin ? T.orange : T.blue }}>{u.role || "participant"}</span></td>
                  <td style={{ padding: "12px 14px", color: T.muted, fontSize: 12 }}>{fmtDate(u.created_at)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => dlTranscript(u.email)} style={{ padding: "3px 8px", background: "rgba(74,184,232,0.1)", border: "1px solid rgba(74,184,232,0.2)", borderRadius: 6, color: T.blue, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>⬇ Script</button>
                    {u.email !== SUPER_ADMIN && <button onClick={() => toggleAdmin(u.email)} style={{ padding: "3px 8px", background: "rgba(232,84,10,0.08)", border: "1px solid rgba(232,84,10,0.2)", borderRadius: 6, color: T.orange, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{u.is_admin ? "Retirer admin" : "→ Admin"}</button>}
                    {u.email !== SUPER_ADMIN && u.email !== user.email && <button onClick={() => removeUser(u.email)} style={{ padding: "3px 8px", background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", borderRadius: 6, color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === "codes" && (
          <div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>Générer des codes d'invitation</div>
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
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 500 }}>Email du destinataire <span style={{ opacity: 0.6 }}>(optionnel — laisse vide pour un code libre)</span></div>
                <input value={codeEmail} onChange={e => setCodeEmail(e.target.value)} type="email" placeholder="ex: participant@email.com"
                  style={{ width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, fontSize: 14, color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = T.orange} onBlur={e => e.target.style.borderColor = T.inputBorder} />
                {codeEmail.trim() && <div style={{ fontSize: 11, color: T.blue, marginTop: 4 }}>⏱ Code lié à cet email, valable 7 jours</div>}
              </div>
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
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: T.cardBg }}>{["Code", "Rôle", "Destinataire", "Expire", "Statut", "Actions"].map(h => <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                <tbody>{codes.map((c, i) => {
                  const st = codeStatusFn(c);
                  const stColors = { available: { bg: "rgba(232,84,10,0.1)", color: T.orange, label: "Disponible" }, expired: { bg: "rgba(231,76,60,0.1)", color: T.red, label: "Expiré" }, used: { bg: "rgba(39,174,96,0.1)", color: T.green, label: "Utilisé" } };
                  const sc = stColors[st];
                  return (
                    <tr key={c.id || i} style={{ borderBottom: `1px solid ${T.border}`, opacity: st === "expired" ? 0.5 : 1 }}>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 700, color: st === "available" ? T.orange : T.muted, fontSize: 15, letterSpacing: "2px" }}>{c.code}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, background: c.role === "admin" ? "rgba(232,84,10,0.1)" : "rgba(74,184,232,0.1)", color: c.role === "admin" ? T.orange : T.blue }}>{c.role || "participant"}</span></td>
                      <td style={{ padding: "12px 14px", color: T.muted, fontSize: 12 }}>{c.for_email || c.used_by || "— libre"}</td>
                      <td style={{ padding: "12px 14px", color: T.muted, fontSize: 11 }}>{c.expires_at ? fmtDate(c.expires_at) : "∞"}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 11, background: sc.bg, color: sc.color, fontWeight: 500 }}>{sc.label}</span></td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {st === "available" && <>
                            <button onClick={() => copyCode(c.code)} style={{ padding: "4px 10px", background: copied === c.code ? "rgba(39,174,96,0.15)" : "rgba(74,184,232,0.08)", border: `1px solid ${copied === c.code ? "rgba(39,174,96,0.3)" : "rgba(74,184,232,0.2)"}`, borderRadius: 6, color: copied === c.code ? T.green : T.blue, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                              {copied === c.code ? "✓ Copié" : "📋 Copier"}
                            </button>
                            {c.for_email && <button onClick={() => sendCodeEmail(c)} disabled={codeSending === c.code} style={{ padding: "4px 10px", background: "rgba(232,84,10,0.08)", border: "1px solid rgba(232,84,10,0.2)", borderRadius: 6, color: T.orange, fontSize: 11, cursor: "pointer", fontFamily: "inherit", opacity: codeSending === c.code ? 0.5 : 1 }}>
                              {codeSending === c.code ? "Envoi..." : "📧 Envoyer"}
                            </button>}
                          </>}
                          <button onClick={() => deleteCode(c.id)} style={{ padding: "4px 10px", background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", borderRadius: 6, color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑 Supprimer</button>
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

        {tab === "profiles" && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: T.cardBg }}>{["Participant", "Email", "Parcours", "Discipline", "Statut", "Co-Pilote", "Maj"].map(h => <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>
                {profiles.map((p, i) => {
                  const participant = allUsers.find((u) => u.email === p.email);
                  return (
                    <tr key={p.email || i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "12px 14px", color: T.text, fontWeight: 600 }}>{participant?.name || "—"}</td>
                      <td style={{ padding: "12px 14px", color: T.muted }}>{p.email}</td>
                      <td style={{ padding: "12px 14px", color: T.text }}>{p.parcours_dbr || "—"}</td>
                      <td style={{ padding: "12px 14px", color: T.text }}>{p.discipline_minutes ? `${p.discipline_minutes} min` : "—"}</td>
                      <td style={{ padding: "12px 14px", color: T.text }}>{STATUS_LABEL[p.status] || p.status || "—"}</td>
                      <td style={{ padding: "12px 14px", color: T.text }}>{p.copilot_name || "—"}</td>
                      <td style={{ padding: "12px 14px", color: T.muted }}>{fmtDate(p.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {profiles.length === 0 && <div style={{ padding: 24, textAlign: "center", color: T.muted }}>Aucun profil Blueprint enregistré.</div>}
          </div>
        )}

        {tab === "export" && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>Exporter les données</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={exportCSV} style={{ padding: "12px 20px", background: `linear-gradient(135deg,${T.green},#1e8449)`, border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⬇ Participants CSV</button>
              <button onClick={exportProfilesCSV} disabled={!profiles.length} style={{ padding: "12px 20px", background: "transparent", border: `1px solid ${T.blue}`, borderRadius: 8, color: T.blue, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: profiles.length ? 1 : 0.5 }}>⬇ Blueprint CSV</button>
              <button onClick={exportProfilesExcel} disabled={!profiles.length} style={{ padding: "12px 20px", background: "transparent", border: `1px solid ${T.orange}`, borderRadius: 8, color: T.orange, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: profiles.length ? 1 : 0.5 }}>⬇ Blueprint Excel</button>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>Participant et administrateur peuvent extraire les fiches profil participant en CSV/Excel.</div>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
