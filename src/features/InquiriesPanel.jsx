import { useState } from "react";
import theme from "../constants/theme";
import { ts } from "../utils/helpers";
import Icons from "../components/Icons";
import { Badge, Card, Button, Input, SectionTitle, Empty } from "../components/ui";

function InquiriesPanel({ inquiries, updateInquiries, workerName, addLog }) {
  const [filter, setFilter] = useState("all"); // all | pending | answered
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answerText, setAnswerText] = useState("");

  const filtered = (inquiries || []).filter(i => {
    if (filter === "pending") return i.status === "pending";
    if (filter === "answered") return i.status === "answered";
    return true;
  });

  const handleAnswer = (inquiryId) => {
    if (!answerText.trim()) return;
    updateInquiries(prev => prev.map(i =>
      i.id === inquiryId
        ? { ...i, status: "answered", answer: { text: answerText.trim(), answeredBy: workerName, answeredAt: ts() } }
        : i
    ));
    addLog(`[문의답변] "${selectedInquiry?.title}" 답변 완료 (${workerName})`, "inquiry");
    setAnswerText("");
    setSelectedInquiry(null);
  };

  const handleMarkComplete = (inquiryId) => {
    updateInquiries(prev => prev.map(i =>
      i.id === inquiryId
        ? { ...i, status: "answered", answer: { text: "연락처로 직접 답변 완료", answeredBy: workerName, answeredAt: ts() } }
        : i
    ));
    addLog(`[문의완료] "${selectedInquiry?.title}" 연락 완료 처리 (${workerName})`, "inquiry");
    setSelectedInquiry(null);
  };

  const handleDelete = (inquiryId) => {
    if (!confirm("이 문의를 삭제하시겠습니까?")) return;
    updateInquiries(prev => prev.filter(i => i.id !== inquiryId));
    setSelectedInquiry(null);
  };

  return (
    <div className="fade-in" style={{ paddingTop: 24 }}>
      <SectionTitle icon={<Icons.file size={16} color={theme.accent} />}>
        문의 관리
        <Badge color="accent">{(inquiries || []).filter(i => i.status === "pending").length}건 대기</Badge>
      </SectionTitle>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { id: "all", label: "전체" },
          { id: "pending", label: "대기중" },
          { id: "answered", label: "답변완료" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 12px",
              borderRadius: theme.radiusSm,
              border: `1px solid ${filter === f.id ? theme.accent : theme.border}`,
              background: filter === f.id ? theme.accentBg : "transparent",
              color: filter === f.id ? theme.accent : theme.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: theme.font,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon={<Icons.file size={32} />} text="문의가 없습니다" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(inquiry => (
            <Card
              key={inquiry.id}
              style={{ padding: 16, cursor: "pointer" }}
              hover
              onClick={() => setSelectedInquiry(inquiry)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{inquiry.title}</div>
                <Badge color={inquiry.status === "pending" ? "yellow" : "green"}>
                  {inquiry.status === "pending" ? "대기중" : "답변완료"}
                </Badge>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                {inquiry.content.length > 100 ? inquiry.content.slice(0, 100) + "..." : inquiry.content}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: theme.textDim }}>
                <span>작성자: {inquiry.name}</span>
                {inquiry.contact && <span>연락처: {inquiry.contact}</span>}
                <span>{inquiry.createdAt}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInquiry && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2000,
          padding: 20
        }} onClick={() => setSelectedInquiry(null)}>
          <div
            style={{
              background: theme.card, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              borderRadius: theme.radius,
              padding: 24,
              maxWidth: 500,
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              border: `1px solid ${theme.border}`
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 8 }}>{selectedInquiry.title}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge color={selectedInquiry.status === "pending" ? "yellow" : "green"}>
                    {selectedInquiry.status === "pending" ? "대기중" : "답변완료"}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 4 }}
              >
                <Icons.x size={18} />
              </button>
            </div>

            <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16 }}>
              작성자: {selectedInquiry.name} | 연락처: {selectedInquiry.contact || "없음"} | {selectedInquiry.createdAt}
            </div>

            <div style={{
              padding: 16,
              background: theme.surface,
              borderRadius: theme.radiusSm,
              marginBottom: 16,
              fontSize: 14,
              color: theme.text,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap"
            }}>
              {selectedInquiry.content}
            </div>

            {selectedInquiry.status === "answered" && (
              <div style={{
                padding: 16,
                background: theme.greenBg,
                border: `1px solid ${theme.greenBorder}`,
                borderRadius: theme.radiusSm,
                marginBottom: 16
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.green, marginBottom: 8 }}>
                  답변 ({selectedInquiry.answeredBy} · {selectedInquiry.answeredAt})
                </div>
                <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {selectedInquiry.answer}
                </div>
              </div>
            )}

            {selectedInquiry.status === "pending" && selectedInquiry.isLoggedIn !== false && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  답변 작성
                </label>
                <textarea
                  placeholder="답변을 입력하세요"
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radiusSm,
                    color: theme.text,
                    fontSize: 14,
                    fontFamily: theme.font,
                    outline: "none",
                    boxSizing: "border-box",
                    minHeight: 100,
                    resize: "vertical"
                  }}
                />
              </div>
            )}

            {selectedInquiry.status === "pending" && selectedInquiry.isLoggedIn === false && (
              <div style={{ padding: 16, background: theme.yellowBg, border: `1px solid ${theme.yellowBorder}`, borderRadius: theme.radiusSm, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: theme.yellow, fontWeight: 600, marginBottom: 6 }}>📞 비로그인 문의</div>
                <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5, marginBottom: 12 }}>
                  비로그인 문의는 연락처로 직접 연락해주세요.<br />
                  연락처: <strong style={{ color: theme.text }}>{selectedInquiry.contact || "없음"}</strong>
                </div>
                <Button variant="primary" onClick={() => handleMarkComplete(selectedInquiry.id)}>
                  ✅ 답변 완료 처리
                </Button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {selectedInquiry.status === "pending" && selectedInquiry.isLoggedIn !== false && (
                <Button variant="primary" onClick={() => handleAnswer(selectedInquiry.id)} disabled={!answerText.trim()}>
                  답변 등록
                </Button>
              )}
              <Button variant="ghost" onClick={() => handleDelete(selectedInquiry.id)} style={{ color: theme.red }}>
                삭제
              </Button>
              <Button variant="ghost" onClick={() => setSelectedInquiry(null)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InquiriesPanel;
