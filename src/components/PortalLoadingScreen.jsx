import theme from "../constants/theme";

export default function PortalLoadingScreen({ isDark, overlay = false, message = "잠시만 기다려주세요…" }) {
  return (
    <div style={{
      fontFamily: theme.font,
      background: isDark ? "#0a0a1a" : "#ffffff",
      color: theme.text,
      minHeight: overlay ? undefined : "100vh",
      position: overlay ? "fixed" : "relative",
      inset: overlay ? 0 : undefined,
      zIndex: overlay ? 2000 : undefined,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <style>{`
        .cube-perspective { perspective: 1200px; }
        .cube-preserve-3d { transform-style: preserve-3d; }
        @keyframes cubeSpin {
          0% { transform: rotateX(0deg) rotateY(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }
        @keyframes breathe {
          0%, 100% { transform: translateZ(48px); opacity: 0.8; }
          50% { transform: translateZ(80px); opacity: 0.4; border-color: rgba(255,255,255,0.8); }
        }
        @keyframes cubePulseFast {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes shadowBreathe {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.5); opacity: 0.2; }
        }
        .cube-spin { animation: cubeSpin 8s linear infinite; }
        .cube-pulse-fast { animation: cubePulseFast 2s ease-in-out infinite; }
        .cube-shadow-breathe { animation: shadowBreathe 3s ease-in-out infinite; }
        .cube-side {
          position: absolute; width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          transform-style: preserve-3d;
        }
        .cube-face {
          width: 100%; height: 100%; position: absolute;
          animation: breathe 3s ease-in-out infinite;
          backdrop-filter: blur(2px);
        }
        .cube-front  { transform: rotateY(0deg); }
        .cube-back   { transform: rotateY(180deg); }
        .cube-right  { transform: rotateY(90deg); }
        .cube-left   { transform: rotateY(-90deg); }
        .cube-top    { transform: rotateX(90deg); }
        .cube-bottom { transform: rotateX(-90deg); }
      `}</style>
      <div className="cube-perspective" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48, padding: 48 }}>
        <div className="cube-preserve-3d" style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="cube-preserve-3d cube-spin" style={{ position: "relative", width: "100%", height: "100%" }}>
            <div className="cube-pulse-fast" style={{ position: "absolute", inset: 0, margin: "auto", width: 32, height: 32, background: "#fff", borderRadius: "50%", filter: "blur(8px)", boxShadow: "0 0 40px rgba(255,255,255,0.8)" }} />
            <div className="cube-side cube-front"><div className="cube-face" style={{ background: "rgba(34,211,238,0.1)", border: "2px solid rgb(34,211,238)", boxShadow: "0 0 15px rgba(34,211,238,0.4)" }} /></div>
            <div className="cube-side cube-back"><div className="cube-face" style={{ background: "rgba(34,211,238,0.1)", border: "2px solid rgb(34,211,238)", boxShadow: "0 0 15px rgba(34,211,238,0.4)" }} /></div>
            <div className="cube-side cube-right"><div className="cube-face" style={{ background: "rgba(168,85,247,0.1)", border: "2px solid rgb(168,85,247)", boxShadow: "0 0 15px rgba(168,85,247,0.4)" }} /></div>
            <div className="cube-side cube-left"><div className="cube-face" style={{ background: "rgba(168,85,247,0.1)", border: "2px solid rgb(168,85,247)", boxShadow: "0 0 15px rgba(168,85,247,0.4)" }} /></div>
            <div className="cube-side cube-top"><div className="cube-face" style={{ background: "rgba(99,102,241,0.1)", border: "2px solid rgb(99,102,241)", boxShadow: "0 0 15px rgba(99,102,241,0.4)" }} /></div>
            <div className="cube-side cube-bottom"><div className="cube-face" style={{ background: "rgba(99,102,241,0.1)", border: "2px solid rgb(99,102,241)", boxShadow: "0 0 15px rgba(99,102,241,0.4)" }} /></div>
          </div>
          <div className="cube-shadow-breathe" style={{ position: "absolute", bottom: -80, width: 96, height: 32, background: "rgba(0,0,0,0.4)", filter: "blur(12px)", borderRadius: "100%" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.3em", color: isDark ? "rgb(103,232,249)" : "rgb(14,116,144)", textTransform: "uppercase", margin: 0 }}>Loading</h3>
          <p style={{ fontSize: 12, color: isDark ? "rgb(148,163,184)" : "rgb(100,116,139)", margin: 0 }}>{message}</p>
        </div>
      </div>
    </div>
  );
}
