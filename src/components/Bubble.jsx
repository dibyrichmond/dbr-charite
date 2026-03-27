import { useContext } from "react";
import { ThemeCtx } from "../shared.js";
import Logo from "./Logo.jsx";

export default function Bubble({ msg, id, onSpeak, speaking, activeSpeakId }) {
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
