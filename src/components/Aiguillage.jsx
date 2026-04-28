import { useState, useContext } from "react";
import { ThemeCtx, APP_NAME } from "../shared.js";
import { SYSTEM } from "../data.js";
import Logo from "./Logo.jsx";

export default function Aiguillage({ user, onRoute, onKnow, onDontKnow, onLogout, onBlueprint }) {
  const T = useContext(ThemeCtx);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [routeMsg, setRouteMsg] = useState("");
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "", orientation: "" });

  const questions = [
    {
      key: "q1",
      title: "Question 1",
      text: "Qu'est-ce qui t'a amené ici aujourd'hui ? Pas la réponse réfléchie. La première chose qui te vient.",
      placeholder: "Écris librement ce qui t'a amené ici aujourd'hui..."
    },
    {
      key: "q2",
      title: "Question 2",
      text: "Si tu devais décrire en une phrase où tu en es dans ta vie en ce moment, ce serait quoi ?",
      placeholder: "Décris où tu en es aujourd'hui..."
    },
    {
      key: "q3",
      title: "Question 3",
      text: "Y a-t-il quelque chose que tu portes en ce moment et que tu n'as encore dit à personne ?",
      placeholder: "Tu peux poser des mots simples, avec ton rythme..."
    }
  ];

  const wordCount = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;
  const canNext = step < 3 ? wordCount(answers[questions[step]?.key]) >= 10 : wordCount(answers.orientation) >= 5;

  async function evaluateRoute() {
    if (!canNext || loading) return;
    setLoading(true);

    const calibrationContext = `Contexte d'entrée du participant avant le parcours.
Réponse 1 sur ce qui l'a amené :
${answers.q1.trim()}
Réponse 2 sur où il en est :
${answers.q2.trim()}
Réponse 3 sur ce qu'il porte :
${answers.q3.trim()}
Utilise ces informations pour calibrer ton ton et l'intensité de ta première question. Ne les cite pas directement. Laisse-les informer ta présence.`;

    const evalPrompt = `Le participant vient de répondre à la question d'orientation suivante :
'Tu as une idée de direction ? Dis-moi en une phrase ce que c'est. Sans réfléchir trop longtemps.'
Sa réponse est : ${answers.orientation.trim()}

Contexte d'entrée :
${calibrationContext}

Evalue cette reponse selon trois criteres.
1. La reponse est-elle concrete et comportementale ?
2. La reponse est-elle coherente avec le contexte d'entree ?
3. La reponse revele-t-elle une direction ou une fuite ?

Reponds uniquement avec un JSON dans ce format exact.
{
  'decision': 'CHA' ou 'RITE',
  'raison': 'une phrase maximum'
}

Si la reponse est concrete, coherente et orientee vers quelque chose : decision = RITE.
Dans tous les autres cas : decision = CHA.
En cas de doute : decision = CHA.`;

    let decision = "CHA";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: SYSTEM,
          messages: [{ role: "user", content: evalPrompt }]
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const text = data?.content?.find((b) => b.type === "text")?.text || "";
        // Strip markdown code fences, then try to extract the JSON object
        const cleaned = text.trim().replace(/```json|```/g, "").trim();
        // Find first { … } block to avoid picking up stray text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        let parsed = {};
        try { parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}; } catch { parsed = {}; }
        const d = String(parsed?.decision || "").toUpperCase().trim();
        decision = d === "RITE" ? "RITE" : "CHA";
      }
    } catch {
      decision = "CHA";
    }

    const participantMessage = decision === "RITE"
      ? "Tu as une direction. On va s'assurer qu'elle est vraiment la tienne et construire le plan pour y aller."
      : "Ce que tu viens de partager merite qu'on creuse ensemble avant de construire. Est-ce que tu es d'accord pour prendre un peu de temps pour s'assurer qu'on travaille sur le vrai sujet ?";

    setRouteMsg(participantMessage);
    setLoading(false);

    setTimeout(() => {
      if (typeof onRoute === "function") {
        onRoute({ decision, calibrationContext });
        return;
      }
      if (decision === "RITE" && typeof onKnow === "function") onKnow();
      else if (typeof onDontKnow === "function") onDontKnow();
    }, 900);
  }

  return (
    <div style={{ minHeight: "100vh", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Logo size={72} /></div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 2 }}>Bienvenue, {user.name}</div>
          <div style={{ fontSize: 12, color: T.blue, letterSpacing: "3px" }}>COMPAGNON {APP_NAME.toUpperCase()}</div>
        </div>

        <div style={{ background: T.cardBg, border: "1px solid rgba(232,84,10,0.25)", borderRadius: 16, padding: "36px 28px" }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: T.orange, marginBottom: 8, textAlign: "center", fontStyle: "italic", lineHeight: 1.6 }}>
            "Je suis Réel. Ce que tu t'apprêtes à vivre, c'est le plus beau cadeau que tu puisses t'offrir. On commence ?"
          </div>
          <div style={{ fontSize: 12, color: T.muted, textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
            Quelques questions d'entrée pour ajuster le parcours avec justesse.
          </div>

          {!routeMsg && step < 3 && (
            <div>
              <div style={{ fontSize: 12, color: T.blue, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 8 }}>{questions[step].title}</div>
              <div style={{ fontSize: 15, color: T.textDim, marginBottom: 10, lineHeight: 1.6 }}>{questions[step].text}</div>
              <textarea
                value={answers[questions[step].key]}
                onChange={(e) => setAnswers((p) => ({ ...p, [questions[step].key]: e.target.value }))}
                placeholder={questions[step].placeholder}
                rows={4}
                style={{ width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, color: T.text, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6, marginBottom: 8 }}
              />
              <div style={{ fontSize: 12, color: wordCount(answers[questions[step].key]) >= 10 ? T.green : T.muted, marginBottom: 14 }}>
                Minimum 10 mots ({wordCount(answers[questions[step].key])}/10)
              </div>
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                style={{ width: "100%", padding: "15px", background: canNext ? `linear-gradient(135deg,${T.orange},${T.orangeD})` : T.cardBg, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, color: "#FFFFFF", cursor: canNext ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: canNext ? 1 : 0.55 }}
              >
                Continuer {">"}
              </button>
            </div>
          )}

          {!routeMsg && step === 3 && (
            <div>
              <div style={{ fontSize: 12, color: T.blue, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 8 }}>Question d'orientation</div>
              <div style={{ fontSize: 15, color: T.textDim, marginBottom: 10, lineHeight: 1.6 }}>
                Tu as une idée de direction ? Dis-moi en une phrase ce que c'est. Sans réfléchir trop longtemps.
              </div>
              <textarea
                value={answers.orientation}
                onChange={(e) => setAnswers((p) => ({ ...p, orientation: e.target.value }))}
                placeholder="Écris ta direction en une phrase simple..."
                rows={3}
                style={{ width: "100%", padding: "12px 14px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, color: T.text, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6, marginBottom: 8 }}
              />
              <div style={{ fontSize: 12, color: canNext ? T.green : T.muted, marginBottom: 14 }}>
                Reponse libre, en une phrase ({wordCount(answers.orientation)} mots)
              </div>
              <button
                onClick={evaluateRoute}
                disabled={!canNext || loading}
                style={{ width: "100%", padding: "15px", background: canNext && !loading ? `linear-gradient(135deg,${T.orange},${T.orangeD})` : T.cardBg, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, color: "#FFFFFF", cursor: canNext && !loading ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: canNext && !loading ? 1 : 0.55 }}
              >
                {loading ? "Analyse en cours..." : "Continuer le parcours >"}
              </button>
            </div>
          )}

          {!!routeMsg && (
            <div style={{ marginTop: 6, padding: "14px 16px", border: `1px solid rgba(74,184,232,0.2)`, borderRadius: 10, background: "rgba(74,184,232,0.08)", color: T.text, lineHeight: 1.6 }}>
              {routeMsg}
            </div>
          )}

          {onBlueprint && <button onClick={onBlueprint} style={{ width: "100%", marginTop: 10, padding: 11, background: "rgba(74,184,232,0.08)", border: `1px solid rgba(74,184,232,0.2)`, borderRadius: 10, fontSize: 13, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>Mon Blueprint 90 jours</button>}
          <button onClick={onLogout} style={{ width: "100%", marginTop: 12, background: "none", border: "none", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>Se deconnecter</button>
        </div>
      </div>
    </div>
  );
}
