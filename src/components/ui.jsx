import theme from "../constants/theme";

// ─── Base Components ─────────────────────────────────────────────
export const Badge = ({ children, color = "accent", style: st }) => {
  const colors = {
    accent: { bg: theme.accentBg, border: theme.accentBorder, text: theme.accent },
    blue: { bg: theme.blueBg, border: theme.blueBorder, text: theme.blue },
    green: { bg: theme.greenBg, border: theme.greenBorder, text: theme.green },
    red: { bg: theme.redBg, border: theme.redBorder, text: theme.red },
    yellow: { bg: theme.yellowBg, border: theme.yellowBorder, text: theme.yellow },
    dim: { bg: "rgba(255,255,255,0.04)", border: theme.border, text: theme.textMuted },
  };
  const c = colors[color] || colors.accent;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, letterSpacing: "0.2px", background: c.bg, border: `1px solid ${c.border}`, color: c.text, ...st }}>{children}</span>;
};

export const Card = ({ children, style: st, onClick, hover }) => (
  <div onClick={onClick} style={{
    background: theme.card, borderRadius: theme.radius, border: `1px solid ${theme.border}`,
    padding: 20, transition: "all 0.2s ease",
    cursor: onClick ? "pointer" : "default",
    ...st
  }}
    onMouseEnter={e => { if (hover || onClick) { e.currentTarget.style.borderColor = theme.borderLight; e.currentTarget.style.background = theme.surfaceHover; } }}
    onMouseLeave={e => { if (hover || onClick) { e.currentTarget.style.borderColor = st?.borderColor || theme.border; e.currentTarget.style.background = st?.background || theme.card; } }}
  >{children}</div>
);

export const Button = ({ children, variant = "primary", disabled, onClick, style: st, size = "md" }) => {
  const variants = {
    primary: { bg: theme.accent, color: "#0a0a0a", hoverBg: "#e0b060" },
    secondary: { bg: theme.surfaceHover, color: theme.text, hoverBg: "#1e2025" },
    danger: { bg: theme.redBg, color: theme.red, hoverBg: "rgba(212,93,93,0.15)" },
    ghost: { bg: "transparent", color: theme.textMuted, hoverBg: "rgba(255,255,255,0.04)" },
    success: { bg: theme.greenBg, color: theme.green, hoverBg: "rgba(92,184,122,0.15)" },
  };
  const v = variants[variant];
  const sizes = { sm: { padding: "6px 14px", fontSize: 12 }, md: { padding: "10px 22px", fontSize: 13 }, lg: { padding: "14px 28px", fontSize: 15 } };
  const s = sizes[size];
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ ...s, borderRadius: theme.radiusSm, border: variant === "ghost" ? `1px solid ${theme.border}` : "none", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: theme.font, background: disabled ? theme.surfaceHover : v.bg, color: disabled ? theme.textDim : v.color, opacity: disabled ? 0.5 : 1, transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 6, ...st }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = v.hoverBg; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = disabled ? theme.surfaceHover : v.bg; }}
    >{children}</button>
  );
};

export const Input = ({ label, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 11, fontWeight: 600, color: theme.text, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", height: 42, ...props.style }}
      onFocus={e => e.target.style.borderColor = theme.accent}
      onBlur={e => e.target.style.borderColor = theme.border}
    />
  </div>
);

export const SectionTitle = ({ icon, children, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: theme.text }}>
      {icon} {children}
    </div>
    {right}
  </div>
);

export const Empty = ({ icon, text }) => (
  <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textDim }}>
    <div style={{ marginBottom: 8, opacity: 0.5 }}>{icon}</div>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

export const Divider = () => <div style={{ height: 1, background: theme.border, margin: "20px 0" }} />;

// ─── Alert Popup (ref: AlertCard) ───────────────────────────────
export const AlertPopup = ({ isVisible, icon, title, description, children, buttonText = "확인", onClose, color }) => {
  if (!isVisible) return null;
  const accent = color || theme.accent;
  return (
    <>
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
          animation: "alertFadeIn 0.3s ease",
        }}
        onClick={onClose}
      >
        <div
          style={{
            position: "relative", maxWidth: 400, width: "90%",
            borderRadius: 20, overflow: "hidden",
            boxShadow: `0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)`,
            animation: "alertSlideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            padding: "28px 28px 22px", position: "relative",
          }}>
            {/* Dismiss */}
            <button onClick={onClose} style={{
              position: "absolute", top: 14, right: 14,
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.8)", fontSize: 18, fontWeight: 300,
              transition: "background 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            >
              ✕
            </button>
            {/* Icon */}
            {icon && (
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, fontSize: 24,
                animation: "alertPulse 2s ease-in-out infinite",
              }}>
                {icon}
              </div>
            )}
            {/* Title */}
            <div style={{
              fontSize: 22, fontWeight: 800, color: "#fff",
              letterSpacing: "-0.3px", lineHeight: 1.3,
              animation: "alertItemIn 0.4s ease 0.1s both",
            }}>
              {title}
            </div>
            {/* Description */}
            {description && (
              <div style={{
                fontSize: 13, color: "rgba(255,255,255,0.75)",
                marginTop: 8, lineHeight: 1.5, maxWidth: "85%",
                animation: "alertItemIn 0.4s ease 0.2s both",
              }}>
                {description}
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{
            background: theme.card, padding: "20px 28px 28px",
          }}>
            {/* Custom content */}
            {children && (
              <div style={{ marginBottom: 20, animation: "alertItemIn 0.4s ease 0.3s both" }}>
                {children}
              </div>
            )}
            {/* Action button */}
            <button onClick={onClose} style={{
              width: "100%", padding: "15px 20px",
              borderRadius: 14, border: "none",
              background: accent, color: "#0a0a0a",
              fontSize: 16, fontWeight: 700, fontFamily: theme.font,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: `0 4px 16px ${accent}40`,
              animation: "alertItemIn 0.4s ease 0.4s both",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = `0 6px 24px ${accent}60`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 16px ${accent}40`; }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1.02)"}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes alertFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes alertSlideUp { from { opacity: 0; transform: scale(0.9) translateY(30px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes alertItemIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes alertPulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.08) } }
      `}</style>
    </>
  );
};

// ─── Tab Component ───────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange, isMobile, wrap }) => (
  <div style={{ display: "flex", gap: 2, background: theme.surface, borderRadius: theme.radius, padding: 3, marginBottom: isMobile ? 16 : 24, border: `1px solid ${theme.border}`, ...(wrap ? { flexWrap: "wrap" } : {}), ...(isMobile && !wrap ? { overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" } : {}) }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        flex: wrap ? (isMobile ? "1 1 calc(50% - 2px)" : "1 1 calc(25% - 2px)") : (isMobile ? "0 0 auto" : 1), padding: isMobile ? "8px 14px" : "10px 8px", borderRadius: theme.radiusSm + 1, border: "none", cursor: "pointer",
        fontSize: isMobile ? 11.5 : 12.5, fontWeight: 600, fontFamily: theme.font, transition: "all 0.2s", whiteSpace: "nowrap",
        background: active === t.id ? theme.card : "transparent",
        color: active === t.id ? theme.text : theme.textMuted,
        boxShadow: active === t.id ? `0 1px 3px rgba(0,0,0,0.3)` : "none",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, position: "relative",
      }}>
        {t.icon} {t.label}
        {t.badge > 0 && !t.badges && (
          <span style={t.badgeCircle
            ? {
              position: "absolute", top: 4, right: 8, width: 18, height: 18, borderRadius: "50%",
              background: theme.red, color: "#fff", fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center"
            }
            : {
              position: "absolute", top: 4, right: 8, minWidth: 16, height: 16, borderRadius: 8,
              background: theme.red, color: "#fff", fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px"
            }}>
            {t.badge}
          </span>
        )}
        {t.badges && (
          <div style={{ position: "absolute", top: 2, right: 4, display: "flex", gap: 3 }}>
            {t.badges.map((b, idx) => b.count > 0 && (
              <span key={idx} style={{ minWidth: 16, height: 16, borderRadius: 8, background: b.color, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{b.count}</span>
            ))}
          </div>
        )}
      </button>
    ))}
  </div>
);
