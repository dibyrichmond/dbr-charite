import { useContext, useState } from "react";
import { ThemeCtx, SPRINT_STEPS, fmtDate, downloadCSV, downloadExcel, profileToRow, authHeaders } from "../shared.js";

export default function BlueprintScreen({ user, profile, onChange, onSave, onBack, saving, saveMsg, onClearMsg, onComment }) {
  const T = useContext(ThemeCtx);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyMsg, setReplyMsg] = useState("");
  const [generatingCopilotMsg, setGeneratingCopilotMsg] = useState(false);
  const [copilotMsgDraft, setCopilotMsgDraft] = useState("");
  const [showCopilotMsgPanel, setShowCopilotMsgPanel] = useState(false);
  const [copilotMsgCopied, setCopilotMsgCopied] = useState(false);

  const update = (field, value) => onChange({ ...profile, [field]: value, updated_at: Date.now() });
  const updateSprint = (key, value) => onChange({ ...profile, sprint_notes: { ...(profile.sprint_notes || {}), [key]: value }, updated_at: Date.now() });

  async function generateCopilotMessage() {
    if (generatingCopilotMsg) return;
    setGeneratingCopilotMsg(true); setCopilotMsgDraft(""); setShowCopilotMsgPanel(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 400,
          system: "Tu génères des messages courts, sincères, non flatteurs. Jamais de tiret long. Jamais 'coach' ou 'coaching'.",
          messages: [{ role: "user", content: `Génère un message court (moins de 150 mots) à envoyer au Co-Pilote.\nPrénom du Co-Pilote : ${profile.copilot_name || "Co-Pilote"}\nPrénom du participant : ${user?.name || "le participant"}\nRêve racine : ${profile.dream_root || "..."}\nPhrase de singularité : ${profile.singularity_phrase || "..."}\n\nLe message doit être sincère, non flatteur, et donner au Co-Pilote un rôle précis et concret.` }]
        })
      });
      const data = await res.json().catch(() => ({}));
      const text = data.content?.find(b => b.type === "text")?.text || "";
      setCopilotMsgDraft(text || "Impossible de générer le message pour l'instant.");
    } catch { setCopilotMsgDraft("Une erreur est survenue. Tu peux rédiger le message manuellement."); }
    setGeneratingCopilotMsg(false);
  }

  async function shareCopilotMessage() {
    const text = copilotMsgDraft;
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { try { await navigator.clipboard.writeText(text); setCopilotMsgCopied(true); setTimeout(() => setCopilotMsgCopied(false), 2500); } catch { alert("Copie manuelle disponible."); } }
  }

  const isDark = T.bg === "#0D0D0D";
  const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 18px" };
  const sectionNum = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, color: "#fff", fontSize: 13, fontWeight: 700, marginRight: 10, flexShrink: 0 };
  const sectionTitle = { fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", marginBottom: 4 };
  const label = { fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600, letterSpacing: "0.3px" };
  const inp = { width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, fontSize: 14, color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
  const selectStyle = { ...inp, appearance: "auto", WebkitAppearance: "menulist" };
  const optStyle = { background: T.card, color: T.text };
  const v1Msg = <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic", padding: "10px 14px", background: T.cardBg, borderRadius: 8 }}>Cette section est disponible pour les parcours récents.</div>;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, colorScheme: isDark ? "dark" : "light" }}>
      <div style={{ background: T.card, borderBottom: `2px solid ${T.orange}`, padding: "12px 18px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: T.blue, letterSpacing: "2px", marginBottom: 4 }}>MÉTHODE CHARITÉ</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Blueprint 90 jours</div>
            <div style={{ fontSize: 12, color: T.muted }}>Moteur opérationnel J1-J90.</div>
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
            <button onClick={onClearMsg} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
          </div>
        )}

        {/* SECTION 1 — Mon rêve racine */}
        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>1</span>Mon rêve racine</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginLeft: 38 }}>Ce pour quoi ce parcours a été fait. Reviens-y chaque matin.</div>
          <textarea value={profile.dream_root || ""} onChange={(e) => update("dream_root", e.target.value)} rows={3} placeholder="Ex : Je veux créer une agence qui aide les PME africaines à être visibles..." style={{ ...inp, resize: "vertical" }} />
        </div>

        {/* SECTION 2 — Ma phrase de singularité */}
        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>2</span>Ma phrase de singularité</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginLeft: 38 }}>La phrase qui t'appartient uniquement. Celle que Réel t'a aidé à trouver.</div>
          {!String(profile.singularity_phrase || "").trim() ? v1Msg : (
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, lineHeight: 1.7, padding: "14px 16px", background: "rgba(232,84,10,0.05)", borderRadius: 8, borderLeft: `3px solid ${T.orange}` }}>
              "{profile.singularity_phrase}"
            </div>
          )}
        </div>

        {/* SECTION 3 — Mon engagement quotidien */}
        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>3</span>Mon engagement quotidien</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginLeft: 38 }}>Un rituel simple qui tient vaut mieux qu'un plan complexe qui s'abandonne.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
            <div><div style={label}>Déclencheur précis</div><input value={profile.ritual_trigger || ""} onChange={(e) => update("ritual_trigger", e.target.value)} placeholder="Ex : Chaque matin après le café, à 7h00" style={inp} /></div>
            <div><div style={label}>Durée du rituel</div><select value={profile.discipline_minutes || ""} onChange={(e) => update("discipline_minutes", e.target.value)} style={selectStyle}><option value="" style={optStyle}>Choisir</option><option value="30" style={optStyle}>30 min</option><option value="45" style={optStyle}>45 min</option><option value="60" style={optStyle}>60 min</option></select></div>
            <div><div style={label}>Ce qui est produit</div><input value={profile.ritual_output || ""} onChange={(e) => update("ritual_output", e.target.value)} placeholder="Ex : 1 action concrète sur le projet..." style={inp} /></div>
            <div><div style={label}>Date de début J1</div><input type="date" value={profile.start_date_j1 || ""} onChange={(e) => update("start_date_j1", e.target.value)} style={inp} /></div>
            <div><div style={label}>Heure de rendez-vous</div><input type="time" value={profile.meeting_time || ""} onChange={(e) => update("meeting_time", e.target.value)} style={inp} /></div>
            <div><div style={label}>2e heure si raté</div><input type="time" value={profile.fallback_time || ""} onChange={(e) => update("fallback_time", e.target.value)} style={inp} /></div>
          </div>
        </div>

        {/* SECTION 4 — Mes engagements envers ceux qui comptent */}
        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>4</span>Mes engagements envers ceux qui comptent</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginLeft: 38 }}>Ce que tu t'engages à ne pas sacrifier pendant ces 90 jours.</div>
          <textarea value={profile.engagements_proches || ""} onChange={(e) => update("engagements_proches", e.target.value)} rows={4} placeholder="Par exemple : dîner en famille le vendredi, appel hebdomadaire à [prénom], une sortie par mois avec..." style={{ ...inp, resize: "vertical" }} />
        </div>

        {/* SECTION 5 — Mon Co-Pilote */}
        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>5</span>Mon Co-Pilote</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginLeft: 38 }}>La personne de confiance qui marche avec toi pendant ces 90 jours.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginBottom: 14 }}>
            <div><div style={label}>Nom et prénom</div><input value={profile.copilot_name || ""} onChange={(e) => update("copilot_name", e.target.value)} placeholder="Prénom Nom" style={inp} /></div>
            <div><div style={label}>Contact</div><input value={profile.copilot_contact || ""} onChange={(e) => update("copilot_contact", e.target.value)} placeholder="Téléphone / WhatsApp" style={inp} /></div>
          </div>
          {profile.copilot_name && (
            <div>
              <button onClick={generateCopilotMessage} disabled={generatingCopilotMsg} style={{ padding: "12px 20px", background: generatingCopilotMsg ? T.cardBg : `linear-gradient(135deg,${T.blue},${T.blueD})`, border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: generatingCopilotMsg ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: generatingCopilotMsg ? 0.6 : 1, fontSize: 14 }}>
                {generatingCopilotMsg ? "Génération en cours..." : "✉ Générer un message pour mon Co-Pilote"}
              </button>
              {showCopilotMsgPanel && (
                <div style={{ marginTop: 14, padding: "14px 16px", background: "rgba(74,184,232,0.06)", border: `1px solid rgba(74,184,232,0.2)`, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: T.blue, fontWeight: 600, marginBottom: 8 }}>Message généré — modifie-le librement</div>
                  <textarea value={copilotMsgDraft} onChange={(e) => setCopilotMsgDraft(e.target.value)} rows={6} style={{ ...inp, resize: "vertical", marginBottom: 10 }} />
                  <button onClick={shareCopilotMessage} disabled={!copilotMsgDraft} style={{ padding: "10px 20px", background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
                    {copilotMsgCopied ? "✓ Copié !" : "Partager ce message"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 6 — Mon sprint J1-J7 */}
        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>6</span>Mon sprint J1 vers J7</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, marginLeft: 38 }}>Valider la faisabilité avant le déploiement 90 jours. Une action concrète par jour.</div>
          <div style={{ display: "grid", gap: 8 }}>
            {SPRINT_STEPS.map((step) => (
              <div key={step}>
                <div style={label}>{step} · Note d'observation</div>
                <input value={profile.sprint_notes?.[step] || ""} onChange={(e) => updateSprint(step, e.target.value)} style={inp} placeholder="Ex : exécution faite / blocage / ajustement" />
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 7 — Ma règle de retour */}
        <div style={card}>
          <div style={sectionTitle}><span style={sectionNum}>7</span>Ma règle de retour</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 10, marginLeft: 38 }}>La vraie discipline c'est savoir revenir, pas ne jamais tomber.</div>
          <textarea value={profile.return_rule || ""} onChange={(e) => update("return_rule", e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Si je rate 2 jours, je reprends le lendemain avec 15 min minimum. Si je rate une semaine..." />
        </div>

        {/* Paramètres de profil */}
        <div style={{ ...card, opacity: 0.85 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, marginBottom: 12 }}>Paramètres de profil</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <div><div style={label}>Parcours DBR</div><select value={profile.parcours_dbr || ""} onChange={(e) => update("parcours_dbr", e.target.value)} style={selectStyle}><option value="" style={optStyle}>Choisir</option><option value="CHA" style={optStyle}>CHARITÉ</option><option value="RITE" style={optStyle}>RITE</option></select></div>
            <div><div style={label}>Mode d'accompagnement</div><select value={profile.accompagnement_mode || ""} onChange={(e) => update("accompagnement_mode", e.target.value)} style={selectStyle}><option value="" style={optStyle}>Choisir</option><option value="REEL" style={optStyle}>Réel</option><option value="B2B" style={optStyle}>B2B</option><option value="DUO" style={optStyle}>Duo</option></select></div>
            <div><div style={label}>Statut</div><select value={profile.status || "SPRINT"} onChange={(e) => update("status", e.target.value)} style={selectStyle}><option value="SPRINT" style={optStyle}>Sprint</option><option value="ACTIF" style={optStyle}>Actif</option><option value="PAUSE" style={optStyle}>Pause</option><option value="TERMINE" style={optStyle}>Terminé</option></select></div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ ...card, textAlign: "center" }}>
          <button onClick={onSave} disabled={saving} style={{ padding: "14px 40px", background: `linear-gradient(135deg,${T.green},#1e8449)`, border: "none", borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1, minWidth: 220 }}>{saving ? "Sauvegarde en cours..." : "Sauvegarder mon Blueprint"}</button>
        </div>

        {/* Admin validation banner */}
        {profile.admin_validated && (
          <div style={{ ...card, borderColor: "rgba(39,174,96,0.4)", background: "rgba(39,174,96,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.green }}>Blueprint validé par l'administration</div>
                <div style={{ fontSize: 12, color: T.muted }}>{profile.admin_validated_at ? `Validé le ${fmtDate(profile.admin_validated_at)}` : "Validé"}{profile.program_90_started ? " · Programme 90 jours lancé" : ""}</div>
              </div>
            </div>
          </div>
        )}

        {/* Espace d'échange */}
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.orange, marginBottom: 12 }}>Espace d'échange</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>Échanges avec l'administration concernant votre parcours.</div>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            {(!Array.isArray(profile.admin_comments) || profile.admin_comments.length === 0) && (
              <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic", textAlign: "center", padding: 16 }}>Aucun échange pour le moment.</div>
            )}
            {Array.isArray(profile.admin_comments) && profile.admin_comments.map(c => {
              const isParticipant = c.role === "participant";
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: isParticipant ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", background: isParticipant ? "rgba(232,84,10,0.08)" : T.cardBg, border: `1px solid ${isParticipant ? "rgba(232,84,10,0.25)" : T.border}`, borderRadius: isParticipant ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: isParticipant ? T.orange : T.blue }}>{c.author_name || c.author || "Inconnu"}{isParticipant ? "" : " (Admin)"}</span>
                      <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{fmtDate(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {onComment && (
            <div>
              <div style={{ display: "flex", gap: 8 }}>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Écrire un message..." rows={2} style={{ flex: 1, padding: "10px 12px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, fontSize: 13, color: T.text, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                <button onClick={async () => {
                  if (!replyText.trim() || replySending) return;
                  setReplySending(true); setReplyMsg("");
                  const result = await onComment(replyText.trim());
                  if (result?.success) { setReplyText(""); setReplyMsg("✓ Message envoyé"); }
                  else { setReplyMsg(result?.error || "Erreur."); }
                  setReplySending(false); setTimeout(() => setReplyMsg(""), 3000);
                }} disabled={!replyText.trim() || replySending} style={{ padding: "10px 18px", background: replyText.trim() ? `linear-gradient(135deg,${T.orange},${T.orangeD})` : T.cardBg, border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: replyText.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: replyText.trim() ? 1 : 0.5, alignSelf: "flex-end" }}>{replySending ? "..." : "Envoyer"}</button>
              </div>
              {replyMsg && <div style={{ marginTop: 8, fontSize: 12, color: replyMsg.startsWith("✓") ? T.green : T.red, fontWeight: 500 }}>{replyMsg}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
