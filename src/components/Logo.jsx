export default function Logo({ size = 40 }) {
  return (
    <img src="/logo.png" alt="DBR" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      onError={e => { e.target.style.display = "none"; const d = document.createElement("div"); d.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#E8540A,#C4420A);display:flex;align-items:center;justify-content:center;flex-shrink:0`; d.innerHTML = `<span style="color:#fff;font-weight:900;font-size:${Math.round(size * 0.38)}px;letter-spacing:-1px">DBR</span>`; e.target.parentNode.appendChild(d); }} />
  );
}
