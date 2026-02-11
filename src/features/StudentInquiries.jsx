import { useState } from "react";
import theme from "../constants/theme";
import { uid, ts } from "../utils/helpers";
import Icons from "../components/Icons";
import { Card, Button, Input, SectionTitle, Empty, Badge } from "../components/ui";

function StudentInquiries({ user, inquiries, updateInquiries }) {
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = () => {
    if (!inquiryTitle.trim() || !inquiryContent.trim()) return;
    setSubmitting(true);
    const newInquiry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: inquiryTitle.trim(),
      content: inquiryContent.trim(),
      name: user.name,
      contact: user.id,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: "pending",
      answer: null,
      isLoggedIn: true,
    };
    updateInquiries(prev => [newInquiry, ...prev]);
    setInquiryTitle("");
    setInquiryContent("");
    setSubmitting(false);
    setShowForm(false);
    setSuccess("문의가 등록되었습니다!");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="fade-in">
      <SectionTitle icon={<Icons.file size={16} color={theme.accent} />}>내 문의 내역
        <Badge color="dim">{inquiries.length}건</Badge>
        <Button variant="primary" size="sm" style={{ marginLeft: "auto" }} onClick={() => setShowForm(!showForm)}>
          {showForm ? "취소" : "+ 문의 작성"}
        </Button>
      </SectionTitle>

      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, color: theme.green, fontSize: 13, marginBottom: 16 }}>
          <Icons.check size={16} /> {success}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 16, background: theme.accentBg, borderColor: theme.accentBorder }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent, marginBottom: 12 }}>새 문의 작성</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              label="제목"
              placeholder="문의 제목을 입력하세요"
              value={inquiryTitle}
              onChange={e => setInquiryTitle(e.target.value)}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>내용</label>
              <textarea
                placeholder="문의 내용을 자세히 작성해주세요"
                value={inquiryContent}
                onChange={e => setInquiryContent(e.target.value)}
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
                  transition: "border-color 0.2s",
                  minHeight: 100,
                  resize: "vertical"
                }}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!inquiryTitle.trim() || !inquiryContent.trim() || submitting}
              >
                {submitting ? "등록 중..." : "문의 등록"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {inquiries.length === 0 && !showForm ? (
        <Empty icon={<Icons.file size={32} />} text="등록한 문의가 없습니다" />
      ) : inquiries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {inquiries.map(inquiry => (
            <Card
              key={inquiry.id}
              style={{ padding: 16, cursor: "pointer" }}
              hover
              onClick={() => setSelectedInquiry(inquiry)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{inquiry.title}</div>
                <Badge color={inquiry.status === "answered" ? "green" : "yellow"}>
                  {inquiry.status === "answered" ? "답변완료" : "대기중"}
                </Badge>
              </div>
              <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.5 }}>
                {inquiry.content.length > 80 ? inquiry.content.slice(0, 80) + "..." : inquiry.content}
              </div>
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>{inquiry.createdAt}</div>
              {inquiry.status === "answered" && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: theme.greenBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.greenBorder}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.green, marginBottom: 4 }}>✓ 답변</div>
                  <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.5 }}>
                    {inquiry.answer?.text?.length > 60 ? inquiry.answer.text.slice(0, 60) + "..." : inquiry.answer?.text}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInquiry && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "transparent", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setSelectedInquiry(null)}>
          <div style={{ background: theme.card, borderRadius: theme.radius, padding: 24, maxWidth: 500, width: "100%", maxHeight: "80vh", overflow: "auto", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedInquiry.title}</div>
              <button onClick={() => setSelectedInquiry(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim }}>
                <Icons.x size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 8 }}>
                {selectedInquiry.createdAt} · {selectedInquiry.contact}
              </div>
              <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {selectedInquiry.content}
              </div>
            </div>

            {selectedInquiry.status === "answered" && selectedInquiry.answer && (
              <div style={{ padding: 16, background: theme.greenBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.greenBorder}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.green }}>✓ 답변</div>
                  <div style={{ fontSize: 11, color: theme.textDim }}>{selectedInquiry.answer.answeredAt} · {selectedInquiry.answer.answeredBy}</div>
                </div>
                <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {selectedInquiry.answer.text}
                </div>
              </div>
            )}

            {selectedInquiry.status === "pending" && (
              <div style={{ padding: 12, background: theme.yellowBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.yellowBorder}`, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: theme.yellow }}>⏳ 답변 대기 중입니다. 잠시만 기다려주세요.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentInquiries;
