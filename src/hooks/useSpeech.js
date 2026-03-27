import { useState, useEffect, useRef, useCallback } from "react";

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

export default function useSpeech() {
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
