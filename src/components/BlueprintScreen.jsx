import { useContext } from "react";
import { ThemeCtx, SPRINT_STEPS, fmtDate, downloadCSV, downloadExcel, profileToRow } from "../shared.js";

export default function BlueprintScreen({ user, profile, onChange, onSave, onBack, saving, saveMsg, onClearMsg }) {
  const T = useContext(ThemeCtx);

  const update = (field, value) => onChange({ ...profile, [field]: value, updated_at: Date.now() });
  const updateSprint = (key, value) => onChange({ ...profile, sprint_notes: { ...(profile.sprint_notes || {}), [key]: value }, updated_at: Date.now() });

  const missing = [
    ["dream_root", "Mon rêve racine"],
    ["discipline_minutes", "Ma discipline quotidienne"],
    ["meeting_time", "Mon heure de rendez-vous"],
    ["start_date_j1", "Date de début J1"],
    ["parcours_dbr", "Parcours DBR"],
    ["accompagnement_mode", "Mode d'accompagnement"],
    ["copilot_name", "Nom et prénom du Co-Pilote"],
    ["copilot_contact", "Contact du Co-Pilote"],
  ].filter(([k]) => !String(profile[k] || "").trim()).map(([, l]) => l);

  const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 18px" };
  const sectionNum = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, color: "#fff", fontSize: 13, fontWeight: 700, marginRight: 10, flexShrink: 0 };
  const sectionTitle = { fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", marginBottom: 4 };
  const label = { fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600, letterSpacing: "0.3px" };
  const input = { width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, fontSize: 14, color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
  const selectStyle = { ...input, appearance: "auto", WebkitAppearance: "menulist" };
  const optStyle = { background: T.card, color: T.text };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      <div style={{ background: T.card, borderBottom: `2px solid ${T.orange}`, padding: "12px 18px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: T.blue, letterSpacing: "2px", marginBottom: 4 }}>MÉTHODE CHARITÉ</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Blueprint 90 jours</div>
            <div style={{ fontSize: 12, color: T.muted }}>Moteur opérationnel J1-J90, rempli pendant le parcours.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => downloadCSV(`DBR_Blueprint_${(user?.name || "participant").replace(/\s+/g, "_")}.csv`, [profileToRow(profile)])} style={{ padding: "10px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>CSV</button>
            <button onClick={() => downloadExcel(`DBR_Blueprint_${(user?.name || "participant").replace(/\s+/g, "_")}.xls`, [profileToRow(profile)])} style={{ padding: "10px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.orange, cursor: "pointer", fontFamily: "inherit" }}>Excel</button>
            <button onClick={onBack} style={{ padding: "10px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>Retour</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 14px 40px", display: "grid", gap: 14 }}>
        {!!saveMsg && (
          <div style={{ ...card, borderColor: saveMsg.startsWith("✓") ? "rgba(39,174,96,0.4)" : "rgba(231,76,60,0.4)", color: saveMsg.startsWith("✓") ? T.green : T.red, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, lineHeight: 1.5 }}>{saveMsg}</div>
            <button onClick={onClearMsg} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16, fontFamily: "inherit", padding: "0 4px", flexShrink: 0 }}>✕</button>
          </div>
        )}
        {missing.length > 0 && <div style={{ ...card, borderColor: "rgba(232,84,10,0.35)" }}><strong style={{ color: T.orange }}>Points manquants :</strong> <span style={{ color: T.muted }}>{missing.join(" · ")}</span></div>}

        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>1</span>Mon engagement</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginLeft: 38 }}>Ce rendez-vous est non négociable. Les 7 premiers jours : même 15 minutes valent mieux que zéro.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
            <div>
              <div style={label}>Mon rêve racine</div>
              <textarea value={profile.dream_root || ""} onChange={(e) => update("dream_root", e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} />
            </div>
            <div>
              <div style={label}>Discipline quotidienne</div>
              <select value={profile.discipline_minutes || ""} onChange={(e) => update("discipline_minutes", e.target.value)} style={selectStyle}>
                <option value="" style={optStyle}>Choisir</option>
                <option value="30" style={optStyle}>30 min</option>
                <option value="45" style={optStyle}>45 min</option>
                <option value="60" style={optStyle}>60 min</option>
              </select>
            </div>
            <div>
              <div style={label}>Heure de rendez-vous</div>
              <input type="time" value={profile.meeting_time || ""} onChange={(e) => update("meeting_time", e.target.value)} style={input} />
            </div>
            <div>
              <div style={label}>2e heure de RDV si raté</div>
              <input type="time" value={profile.fallback_time || ""} onChange={(e) => update("fallback_time", e.target.value)} style={input} />
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>2</span>Structure de ta séance quotidienne</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
            <thead><tr style={{ background: T.cardBg }}><th style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${T.border}` }}>Moment</th><th style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${T.border}` }}>Ce que tu fais</th><th style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${T.border}` }}>Durée</th></tr></thead>
            <tbody>
              <tr><td style={{ padding: 8, borderBottom: `1px solid ${T.border}` }}>Ancrage</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}` }}>Relis ton rêve racine, ton engagement, puis pose l'intention du jour.</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}` }}>2-5 min</td></tr>
              <tr><td style={{ padding: 8, borderBottom: `1px solid ${T.border}` }}>Action du jour</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}` }}>Exécute l'action définie la veille. Une seule action.</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}` }}>80 % du temps</td></tr>
              <tr><td style={{ padding: 8 }}>Bilan</td><td style={{ padding: 8 }}>Oui/Non, blocage, solution, puis action de demain.</td><td style={{ padding: 8 }}>5-10 min</td></tr>
            </tbody>
          </table>
        </div>

        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>3</span>Sprint J1 → J7</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginLeft: 38 }}>Objectif : valider la faisabilité avant le déploiement 90 jours.</div>
          <div style={{ display: "grid", gap: 8 }}>
            {SPRINT_STEPS.map((step) => (
              <div key={step}>
                <div style={label}>{step} · Note d'observation</div>
                <input value={profile.sprint_notes?.[step] || ""} onChange={(e) => updateSprint(step, e.target.value)} style={input} placeholder="Ex : exécution faite / blocage / ajustement" />
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>4</span>Règle de retour</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 10, marginLeft: 38 }}>Que fais-tu si tu rates 2 jours ? Définis ta règle de reprise.</div>
          <textarea value={profile.return_rule || ""} onChange={(e) => update("return_rule", e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} placeholder="Si je rate 2 jours, je reprends le lendemain avec 15 min minimum..." />
        </div>

        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>5</span>Profil participant</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            <div><div style={label}>Date de début J1</div><input type="date" value={profile.start_date_j1 || ""} onChange={(e) => update("start_date_j1", e.target.value)} style={input} /></div>
            <div><div style={label}>Parcours DBR</div><select value={profile.parcours_dbr || ""} onChange={(e) => update("parcours_dbr", e.target.value)} style={selectStyle}><option value="" style={optStyle}>Choisir</option><option value="CHA" style={optStyle}>CHA</option><option value="RITE" style={optStyle}>RITE</option></select></div>
            <div><div style={label}>Mode d'accompagnement</div><select value={profile.accompagnement_mode || ""} onChange={(e) => update("accompagnement_mode", e.target.value)} style={selectStyle}><option value="" style={optStyle}>Choisir</option><option value="REEL" style={optStyle}>Réel</option><option value="B2B" style={optStyle}>B2B</option><option value="DUO" style={optStyle}>Duo (Réel + B2B)</option></select></div>
            <div><div style={label}>Statut</div><select value={profile.status || "SPRINT"} onChange={(e) => update("status", e.target.value)} style={selectStyle}><option value="SPRINT" style={optStyle}>Sprint</option><option value="ACTIF" style={optStyle}>Actif</option><option value="PAUSE" style={optStyle}>Pause</option><option value="TERMINE" style={optStyle}>Terminé</option></select></div>
            <div><div style={label}>Nom et prénom du Co-Pilote (fin de Aligner)</div><input value={profile.copilot_name || ""} onChange={(e) => update("copilot_name", e.target.value)} style={input} /></div>
            <div><div style={label}>Contact du Co-Pilote</div><input value={profile.copilot_contact || ""} onChange={(e) => update("copilot_contact", e.target.value)} style={input} placeholder="Téléphone" /></div>
          </div>
        </div>

        {/* Save button at bottom */}
        <div style={{ ...card, textAlign: "center" }}>
          <button onClick={onSave} disabled={saving} style={{ padding: "14px 40px", background: `linear-gradient(135deg,${T.green},#1e8449)`, border: "none", borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1, minWidth: 220 }}>{saving ? "Sauvegarde en cours..." : "💾 Sauvegarder mon Blueprint"}</button>
        </div>

        {/* Admin validation banner */}
        {profile.admin_validated && (
          <div style={{ ...card, borderColor: "rgba(39,174,96,0.4)", background: "rgba(39,174,96,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.green }}>Blueprint validé par l'administration</div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  {profile.admin_validated_at ? `Validé le ${fmtDate(profile.admin_validated_at)}` : "Validé"}{profile.program_90_started ? " · Programme 90 jours lancé" : ""}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin comments visible to participant */}
        {Array.isArray(profile.admin_comments) && profile.admin_comments.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.orange, marginBottom: 12 }}>💬 Commentaires de l'administration</div>
            <div style={{ display: "grid", gap: 10 }}>
              {profile.admin_comments.map(c => (
                <div key={c.id} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.blue }}>{c.author}</span>
                    <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
