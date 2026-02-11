import { useState } from "react";
import theme from "../constants/theme";
import Icons from "../components/Icons";
import { Badge, Card, Button, Input, SectionTitle, Empty } from "../components/ui";

function LogViewer({ logs }) {
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  const typeLabels = { all: "전체", reservation: "실기실 예약", equipment: "물품 대여" };
  const typeColors = { reservation: theme.blue, equipment: theme.yellow };

  const filtered = logs.filter(l => {
    if (filter !== "all" && l.type !== filter) return false;
    if (searchQ && !l.action.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const header = "시간,구분,내용\n";
    const rows = filtered.map(l => `"${l.time}","${l.type}","${l.action.replace(/"/g, '""')}"`).join("\n");
    const csv = "\uFEFF" + header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `일지_${dateStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportText = () => {
    const title = `국민대학교 건축대학 포털사이트 일지\n내보내기 일시: ${ts()}\n${"═".repeat(60)}\n\n`;
    const body = filtered.map(l => `[${l.time}] ${l.action}`).join("\n");
    const blob = new Blob([title + body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `일지_${dateStr()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <Card style={{ marginBottom: 20, background: theme.greenBg, borderColor: theme.greenBorder, padding: 14 }}>
        <div style={{ fontSize: 13, color: theme.green, display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.check size={16} /> 모든 일지는 시스템에 의해 자동 생성됩니다. 수기 작성이 필요 없습니다.
        </div>
      </Card>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {Object.entries(typeLabels).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: "6px 12px", borderRadius: 6, border: `1px solid ${filter === key ? theme.accent : theme.border}`,
              background: filter === key ? theme.accentBg : "transparent",
              color: filter === key ? theme.accent : theme.textMuted,
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: theme.font,
            }}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ position: "relative" }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="검색..."
              style={{ width: "100%", padding: "7px 12px 7px 32px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 13, fontFamily: theme.font, outline: "none", boxSizing: "border-box" }} />
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.textDim }}><Icons.search size={14} /></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="secondary" size="sm" onClick={exportCSV}><Icons.download size={14} /> CSV</Button>
          <Button variant="secondary" size="sm" onClick={exportText}><Icons.download size={14} /> TXT</Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
        총 {filtered.length}건 {filter !== "all" && `(${typeLabels[filter]})`}
      </div>

      {/* Log List */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <Empty icon={<Icons.log size={28} />} text="일지가 없습니다" />
        ) : (
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {filtered.map((log, i) => (
              <div key={log.id} className={i < 3 ? "slide-in" : ""} style={{
                padding: "12px 18px", borderBottom: `1px solid ${theme.border}`,
                borderLeft: `3px solid ${typeColors[log.type] || theme.textDim}`,
                animationDelay: `${i * 0.05}s`,
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <code style={{ fontSize: 11, color: theme.textDim, fontFamily: theme.fontMono, whiteSpace: "nowrap", marginTop: 1 }}>{log.time}</code>
                  <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{log.action}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default LogViewer;
