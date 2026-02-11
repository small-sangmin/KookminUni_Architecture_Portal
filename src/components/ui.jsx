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

// ─── Tab Component ───────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange, isMobile }) => (
  <div style={{ display: "flex", gap: 2, background: theme.surface, borderRadius: theme.radius, padding: 3, marginBottom: isMobile ? 16 : 24, border: `1px solid ${theme.border}`, ...(isMobile ? { overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" } : {}) }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        flex: isMobile ? "0 0 auto" : 1, padding: isMobile ? "8px 14px" : "10px 8px", borderRadius: theme.radiusSm + 1, border: "none", cursor: "pointer",
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
