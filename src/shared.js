import { createContext } from "react";

// ══════════════════════════════════════════════════════════════════════════
// THÈMES
// ══════════════════════════════════════════════════════════════════════════
export const THEMES = {
  dark: {
    orange: "#E8540A", orangeD: "#C4420A", blue: "#4AB8E8", blueD: "#2E95C5",
    bg: "#0D0D0D", card: "#1A1A1A", border: "#2A2A2A", white: "#FFFFFF",
    muted: "#8A8A8A", green: "#27AE60", red: "#E74C3C", text: "#F0F0F0",
    textDim: "#AAAAAA", inputBg: "rgba(255,255,255,0.07)", inputBorder: "rgba(255,255,255,0.12)",
    gradient: "linear-gradient(160deg,#0D0D0D 0%,#1a0a00 100%)",
    cardBg: "rgba(255,255,255,0.04)", shadow: "rgba(0,0,0,0.4)",
  },
  light: {
    orange: "#E8540A", orangeD: "#C4420A", blue: "#2E95C5", blueD: "#1a7aab",
    bg: "#F8F8F8", card: "#FFFFFF", border: "#E2E2E2", white: "#1A1A1A",
    muted: "#6B7280", green: "#27AE60", red: "#E74C3C", text: "#1F2937",
    textDim: "#6B7280", inputBg: "#F3F4F6", inputBorder: "#D1D5DB",
    gradient: "linear-gradient(160deg,#F8F8F8 0%,#FFF5EE 100%)",
    cardBg: "rgba(0,0,0,0.02)", shadow: "rgba(0,0,0,0.08)",
  },
};
export const ThemeCtx = createContext(THEMES.dark);

// ══════════════════════════════════════════════════════════════════════════
// CONSTANTES & UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════
export const SUPER_ADMIN = import.meta.env.VITE_SUPER_ADMIN || "dibyrichmond@gmail.com";
export const APP_NAME = "Réel";
export const LS = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
export function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
export function authHeaders() { const t = LS.get("dbr_token"); const h = { "Content-Type": "application/json" }; if (t) h["Authorization"] = "Bearer " + t; return h; }
export function isTokenExpired() { try { const t = LS.get("dbr_token"); if (!t) return true; const payload = JSON.parse(atob(t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))); return !payload.exp || Date.now() > payload.exp; } catch { return true; } }
export function tokenExpiresIn() { try { const t = LS.get("dbr_token"); if (!t) return 0; const payload = JSON.parse(atob(t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))); return Math.max(0, (payload.exp || 0) - Date.now()); } catch { return 0; } }
export function fmtDate(ts) { return ts ? new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "-"; }

export const STATUS_LABEL = { SPRINT: "Sprint", ACTIF: "Actif", PAUSE: "Pause", TERMINE: "Terminé" };
export const SPRINT_STEPS = ["J1", "J2-J3", "J4", "J5-J6", "J7"];

export function emptyBlueprint(email = "", name = "") {
  return {
    email,
    participant_name: name,
    dream_root: "",
    discipline_minutes: "",
    meeting_time: "",
    fallback_time: "",
    start_date_j1: "",
    parcours_dbr: "",
    accompagnement_mode: "",
    copilot_name: "",
    copilot_contact: "",
    status: "SPRINT",
    return_rule: "",
    sprint_notes: { J1: "", "J2-J3": "", J4: "", "J5-J6": "", J7: "" },
    updated_at: Date.now(),
  };
}

export function profileToRow(p) {
  return {
    "Participant": p.participant_name || "",
    "Email": p.email || "",
    "Rêve racine": p.dream_root || "",
    "Discipline": p.discipline_minutes ? `${p.discipline_minutes} min` : "",
    "Heure rendez-vous": p.meeting_time || "",
    "2e heure RDV": p.fallback_time || "",
    "Date début J1": p.start_date_j1 || "",
    "Parcours DBR": p.parcours_dbr || "",
    "Mode accompagnement": p.accompagnement_mode || "",
    "Co-Pilote": p.copilot_name || "",
    "Contact Co-Pilote": p.copilot_contact || "",
    "Statut": STATUS_LABEL[p.status] || p.status || "",
    "Règle de retour": p.return_rule || "",
    "Sprint J1": p.sprint_notes?.J1 || "",
    "Sprint J2-J3": p.sprint_notes?.["J2-J3"] || "",
    "Sprint J4": p.sprint_notes?.J4 || "",
    "Sprint J5-J6": p.sprint_notes?.["J5-J6"] || "",
    "Sprint J7": p.sprint_notes?.J7 || "",
    "Dernière mise à jour": fmtDate(p.updated_at),
  };
}

export function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

export function downloadExcel(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const table = `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const html = `<html><head><meta charset="UTF-8" /></head><body>${table}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
