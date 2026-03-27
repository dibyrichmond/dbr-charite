import { useState, useContext } from "react";
import { ThemeCtx, APP_NAME } from "../shared.js";
import Logo from "./Logo.jsx";

export default function Aiguillage({ user, onKnow, onDontKnow, onLogout, onBlueprint }) {
  const T = useContext(ThemeCtx);
  const [choice, setChoice] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Logo size={72} /></div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 2 }}>Bienvenue, {user.name}</div>
          <div style={{ fontSize: 12, color: T.blue, letterSpacing: "3px" }}>COMPAGNON {APP_NAME.toUpperCase()}</div>
        </div>
        <div style={{ background: T.cardBg, border: "1px solid rgba(232,84,10,0.25)", borderRadius: 16, padding: "36px 28px" }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: T.orange, marginBottom: 8, textAlign: "center", fontStyle: "italic", lineHeight: 1.6 }}>"Je suis Réel. Ce que tu t'apprêtes à vivre, c'est le plus beau cadeau que tu puisses t'offrir. On commence ?"</div>
          <div style={{ fontSize: 12, color: T.muted, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>Pas un outil de productivité. Vivre de ce pourquoi tu es fait. Pas survivre. Vivre.</div>
          <div style={{ fontSize: 15, color: T.textDim, textAlign: "center", marginBottom: 32, lineHeight: 1.7 }}>Une seule question pour commencer :<br /><strong style={{ color: T.text }}>As-tu déjà une idée, même floue, de la direction que tu veux donner à ta vie ?</strong></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => setChoice("know")} style={{ padding: "18px 24px", background: choice === "know" ? `linear-gradient(135deg,${T.orange},${T.orangeD})` : "rgba(232,84,10,0.08)", border: `2px solid ${choice === "know" ? T.orange : "rgba(232,84,10,0.2)"}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 4 }}>Oui, j'ai une idée 💡</div>
              <div style={{ fontSize: 13, color: T.muted }}>On va vérifier que c'est le vrai rêve, et le transformer en plan</div>
            </button>
            <button onClick={() => setChoice("dontknow")} style={{ padding: "18px 24px", background: choice === "dontknow" ? `linear-gradient(135deg,${T.blueD},${T.blue})` : "rgba(74,184,232,0.06)", border: `2px solid ${choice === "dontknow" ? T.blue : "rgba(74,184,232,0.15)"}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 4 }}>Non, je cherche encore 🧭</div>
              <div style={{ fontSize: 13, color: T.muted }}>On va creuser ensemble pour trouver ta direction</div>
            </button>
          </div>
          {choice && <button onClick={() => choice === "know" ? onKnow() : onDontKnow()} style={{ width: "100%", padding: "15px", marginTop: 24, background: `linear-gradient(135deg,${T.orange},${T.orangeD})`, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: "inherit" }}>Commencer le parcours →</button>}
          {onBlueprint && <button onClick={onBlueprint} style={{ width: "100%", marginTop: 10, padding: 11, background: "rgba(74,184,232,0.08)", border: `1px solid rgba(74,184,232,0.2)`, borderRadius: 10, fontSize: 13, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>📘 Mon Blueprint 90 jours</button>}
          <button onClick={onLogout} style={{ width: "100%", marginTop: 12, background: "none", border: "none", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>Se déconnecter</button>
        </div>
      </div>
    </div>
  );
}
