import { useState, useRef } from "react";
import theme from "../constants/theme";
import { uid, ts } from "../utils/helpers";
import Icons from "../components/Icons";
import { Badge, Card, Button, Input, SectionTitle, Empty } from "../components/ui";

// ─── Print Request (출력 신청) ───────────────────────────────────
const PRINT_SIZE_OPTIONS = ["A2", "A1", "900x1200", "900x1800", "600x1500"];
const PRINT_TYPE_OPTIONS = ["COATED_DRAWING", "COATED_IMAGE", "MATT_IMAGE", "GLOSS_IMAGE"];
const PRINT_TYPE_LABELS = {
  COATED_DRAWING: "Coated(도면)",
  COATED_IMAGE: "Coated(이미지)",
  MATT_IMAGE: "Matt(이미지)",
  GLOSS_IMAGE: "Gloss(이미지)",
  BW: "흑백",
  COLOR: "컬러",
};
const PRINT_PRICES = {
  A2_COATED_DRAWING: 700,
  A2_COATED_IMAGE: 1400,
  A2_MATT_IMAGE: 2100,
  A2_GLOSS_IMAGE: 4200,
  A1_COATED_DRAWING: 1400,
  A1_COATED_IMAGE: 2800,
  A1_MATT_IMAGE: 3500,
  A1_GLOSS_IMAGE: 7000,
  "900x1200_COATED_DRAWING": 2800,
  "900x1200_COATED_IMAGE": 4900,
  "900x1200_MATT_IMAGE": 7000,
  "900x1200_GLOSS_IMAGE": 14000,
  "900x1800_COATED_DRAWING": 3500,
  "900x1800_COATED_IMAGE": 7000,
  "900x1800_MATT_IMAGE": 10500,
  "900x1800_GLOSS_IMAGE": 21000,
  "600x1500_COATED_DRAWING": 2100,
  "600x1500_COATED_IMAGE": 4900,
  "600x1500_MATT_IMAGE": 7000,
  "600x1500_GLOSS_IMAGE": 14000,
};
const PRINT_PLUS600_PRICES = {
  COATED_DRAWING: 700,
  COATED_IMAGE: 2100,
  MATT_IMAGE: 3500,
  GLOSS_IMAGE: 7000,
};

const KAKAO_BANK_ACCOUNT = "3333-35-7572363 [김경호]"; // 카카오뱅크 계좌번호

function PrintRequest({ user, printRequests, updatePrintRequests, addLog, addNotification, syncPrintToSheet, sendEmailNotification, isMobile }) {
  const [paperSize, setPaperSize] = useState("A2");
  const [colorMode, setColorMode] = useState("COATED_DRAWING");
  const [copies, setCopies] = useState(1);
  const [plus600Count, setPlus600Count] = useState(0);
  const [printFile, setPrintFile] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const printFileRef = useRef(null);
  const paymentFileRef = useRef(null);

  const priceKey = `${paperSize}_${colorMode}`;
  const unitPrice = PRINT_PRICES[priceKey] || 0;
  const plus600UnitPrice = PRINT_PLUS600_PRICES[colorMode] || 0;
  const colorModeLabel = PRINT_TYPE_LABELS[colorMode] || colorMode;
  const totalPrice = (unitPrice * copies) + (plus600UnitPrice * plus600Count * copies);

  const handlePrintFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPrintFile({ name: file.name, size: file.size, type: file.type, data: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handlePaymentUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentProof({ name: file.name, size: file.size, type: file.type, data: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!printFile) {
      alert("출력할 파일을 업로드해주세요.");
      return;
    }
    if (!paymentProof) {
      alert("입금 완료 캡처를 업로드해주세요.");
      return;
    }

    setSubmitting(true);
    const newRequest = {
      id: uid(),
      studentId: user.id,
      studentName: user.name,
      studentDept: user.dept,
      studentEmail: user.email || "",
      paperSize,
      colorMode,
      copies,
      plus600Count,
      unitPrice,
      totalPrice,
      plus600UnitPrice,
      plus600Price: plus600UnitPrice * plus600Count * copies,
      printFile,
      paymentProof,
      status: "pending",
      createdAt: ts(),
      completedAt: null,
    };

    updatePrintRequests(prev => [newRequest, ...prev]);
    addLog(`출력 신청: ${paperSize} ${colorModeLabel} ${copies}장${plus600Count > 0 ? ` (+600 x ${plus600Count})` : ""}`, "print", { studentId: user.id });
    addNotification(`🖨️ 새 출력 신청: ${user.name} - ${paperSize} ${copies}장`, "info", true);

    await syncPrintToSheet?.(newRequest);

    sendEmailNotification?.({
      to: user.email || undefined,
      subject: `[출력 신청 접수] ${user.name} · ${paperSize} ${copies}장`,
      body: `출력 신청이 접수되었습니다.\n\n- 학생: ${user.name} (${user.id})\n- 용지: ${paperSize}\n- 재질: ${colorModeLabel}\n- 매수: ${copies}장\n- +600 추가: ${plus600Count}개\n- 금액: ${totalPrice.toLocaleString()}원\n\n근로학생이 확인 후 출력해드립니다.`,
    });

    setPrintFile(null);
    setPaymentProof(null);
    setCopies(1);
    setPlus600Count(0);
    setSubmitting(false);
    alert("출력 신청이 완료되었습니다! 근로학생이 확인 후 출력해드립니다.");
  };

  const statusLabels = { pending: "대기중", processing: "출력중", completed: "완료", cancelled: "취소됨" };
  const statusColors = { pending: "yellow", processing: "blue", completed: "green", cancelled: "red" };

  return (
    <div style={{ paddingTop: 20 }}>
      <Card style={{ marginBottom: 20, background: theme.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Icons.file size={20} color={theme.accent} />
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>📋 출력 가격표 및 안내</div>
        </div>

        <div style={{ overflowX: "auto", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ border: `1px solid ${theme.border}`, padding: "8px 10px", textAlign: "left", fontSize: 12, color: theme.textMuted }}>사이즈</th>
                {PRINT_TYPE_OPTIONS.map(type => (
                  <th key={type} style={{ border: `1px solid ${theme.border}`, padding: "8px 10px", textAlign: "right", fontSize: 12, color: theme.textMuted }}>
                    {PRINT_TYPE_LABELS[type]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRINT_SIZE_OPTIONS.map(size => (
                <tr key={size}>
                  <td style={{ border: `1px solid ${theme.border}`, padding: "8px 10px", fontSize: 13, fontWeight: 600, color: theme.text }}>{size}</td>
                  {PRINT_TYPE_OPTIONS.map(type => (
                    <td key={`${size}_${type}`} style={{ border: `1px solid ${theme.border}`, padding: "8px 10px", textAlign: "right", fontSize: 13, color: theme.text }}>
                      {(PRINT_PRICES[`${size}_${type}`] || 0).toLocaleString()}원
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.6 }}>
          💳 <strong>입금 계좌:</strong> 카카오뱅크 {KAKAO_BANK_ACCOUNT}<br />
          🕒 <strong>운영시간:</strong> 평일 10:00~17:00 (점심시간 12:00~13:00 제외)<br />
          📍 <strong>수령장소:</strong> 건축대학 출력실 (복지관 6층)<br />
          ℹ️ <strong>안내:</strong> 표 기준은 1장 단가이며, <code>+600</code>은 추가 600mm 길이 기준입니다.
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: theme.textMuted }}>
          <strong>+600 추가금(개당):</strong>{" "}
          {PRINT_TYPE_OPTIONS.map(type => `${PRINT_TYPE_LABELS[type]} ${PRINT_PLUS600_PRICES[type].toLocaleString()}원`).join(" · ")}
        </div>

        <button
          onClick={() => setShowHistoryModal(true)}
          style={{
            width: "100%", marginTop: 16, padding: "14px 16px", borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.accentBg} 0%, ${theme.surface} 100%)`,
            border: `1px solid ${theme.accent}`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "all 0.2s", fontFamily: theme.font,
          }}
          onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>내 출력 신청 내역</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {printRequests.length > 0 ? (
              <>
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  {printRequests.filter(r => r.status === "pending").length > 0 && (
                    <Badge color="yellow" style={{ marginRight: 6 }}>대기 {printRequests.filter(r => r.status === "pending").length}</Badge>
                  )}
                  {printRequests.filter(r => r.status === "processing").length > 0 && (
                    <Badge color="blue" style={{ marginRight: 6 }}>출력중 {printRequests.filter(r => r.status === "processing").length}</Badge>
                  )}
                  {printRequests.filter(r => r.status === "completed").length > 0 && (
                    <Badge color="green">완료 {printRequests.filter(r => r.status === "completed").length}</Badge>
                  )}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: theme.textDim }}>신청 내역 없음</span>
            )}
            <span style={{ fontSize: 16, color: theme.accent }}>→</span>
          </div>
        </button>
      </Card>

      {showHistoryModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "transparent", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }} onClick={() => setShowHistoryModal(false)}>
          <div style={{
            background: theme.card, borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column",
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: "16px 20px", borderBottom: `1px solid ${theme.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>📋 내 출력 신청 내역</div>
              <button onClick={() => setShowHistoryModal(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: theme.surface, color: theme.textMuted, fontSize: 16,
                cursor: "pointer", fontFamily: theme.font,
              }}>✕</button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              {printRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🖨</div>
                  <div style={{ fontSize: 14 }}>출력 신청 내역이 없습니다</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {printRequests.map(req => (
                    <div key={req.id} style={{
                      padding: 16, background: theme.surface, borderRadius: 12,
                      border: `1px solid ${theme.border}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{req.paperSize}</span>
                          <span style={{
                            fontSize: 12, marginLeft: 8, padding: "2px 8px", borderRadius: 4,
                            background: theme.surface, color: theme.textMuted, border: `1px solid ${theme.border}`,
                          }}>{PRINT_TYPE_LABELS[req.colorMode] || req.colorMode}</span>
                          <span style={{ fontSize: 13, color: theme.textMuted, marginLeft: 8 }}>× {req.copies}장</span>
                          {req.plus600Count > 0 && <span style={{ fontSize: 13, color: theme.textMuted, marginLeft: 8 }}>+600 × {req.plus600Count}</span>}
                        </div>
                        <Badge color={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>
                        📄 {req.printFile?.name || "파일 정보 없음"}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: theme.textDim }}>
                          신청: {req.createdAt?.slice(0, 10)} {req.createdAt?.slice(11, 16)}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent }}>
                          {req.totalPrice?.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: `1px solid ${theme.border}`, background: theme.surface }}>
              <Button size="sm" variant="ghost" onClick={() => setShowHistoryModal(false)} style={{ width: "100%", justifyContent: "center" }}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: theme.text }}>🖨️ 출력 신청</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>용지 크기</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRINT_SIZE_OPTIONS.map(size => (
              <button key={size} onClick={() => setPaperSize(size)} style={{
                padding: "10px 20px", borderRadius: 8, border: `1px solid ${paperSize === size ? theme.accent : theme.border}`,
                background: paperSize === size ? theme.accentBg : "transparent",
                color: paperSize === size ? theme.accent : theme.textMuted,
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: theme.font,
              }}>{size}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>재질</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRINT_TYPE_OPTIONS.map(type => (
              <button key={type} onClick={() => setColorMode(type)} style={{
                padding: "10px 14px", borderRadius: 8, border: `1px solid ${colorMode === type ? theme.accent : theme.border}`,
                background: colorMode === type ? theme.accentBg : "transparent",
                color: colorMode === type ? theme.accent : theme.textMuted,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: theme.font,
              }}>{PRINT_TYPE_LABELS[type]}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>매수</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setCopies(Math.max(1, copies - 1))} style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 18, cursor: "pointer", fontFamily: theme.font,
            }}>-</button>
            <input type="number" value={copies} onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))} min={1} style={{
              width: 60, padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 16, fontWeight: 600, textAlign: "center", fontFamily: theme.font,
            }} />
            <button onClick={() => setCopies(copies + 1)} style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 18, cursor: "pointer", fontFamily: theme.font,
            }}>+</button>
            <span style={{ fontSize: 13, color: theme.textMuted, marginLeft: 8 }}>장당 {unitPrice.toLocaleString()}원</span>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>+600 추가 개수</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setPlus600Count(Math.max(0, plus600Count - 1))} style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 18, cursor: "pointer", fontFamily: theme.font,
            }}>-</button>
            <input type="number" value={plus600Count} onChange={e => setPlus600Count(Math.max(0, parseInt(e.target.value) || 0))} min={0} style={{
              width: 60, padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 16, fontWeight: 600, textAlign: "center", fontFamily: theme.font,
            }} />
            <button onClick={() => setPlus600Count(plus600Count + 1)} style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 18, cursor: "pointer", fontFamily: theme.font,
            }}>+</button>
            <span style={{ fontSize: 13, color: theme.textMuted, marginLeft: 8 }}>
              개당 {plus600UnitPrice.toLocaleString()}원 (총 {(plus600UnitPrice * plus600Count * copies).toLocaleString()}원)
            </span>
          </div>
        </div>

        <div style={{ padding: 16, background: theme.accentBg, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>총 결제 금액</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: theme.accent }}>{totalPrice.toLocaleString()}원</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>출력 파일 업로드 <span style={{ color: theme.red }}>*</span></div>
          <input type="file" ref={printFileRef} onChange={handlePrintFileUpload} accept=".pdf,.jpg,.jpeg,.png,.ai,.psd,.dwg" style={{ display: "none" }} />
          <button onClick={() => printFileRef.current?.click()} style={{
            width: "100%", padding: 16, borderRadius: 8, border: `2px dashed ${printFile ? theme.green : theme.border}`,
            background: printFile ? theme.greenBg : "transparent", color: printFile ? theme.green : theme.textMuted,
            fontSize: 13, cursor: "pointer", fontFamily: theme.font, textAlign: "center",
          }}>
            {printFile ? `✅ ${printFile.name}` : "📎 파일을 선택하세요 (PDF, JPG, PNG, AI, PSD, DWG)"}
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>입금 완료 캡처 <span style={{ color: theme.red }}>*</span></div>
          <div style={{ fontSize: 11, color: theme.yellow, marginBottom: 8, padding: "8px 12px", background: theme.yellowBg, borderRadius: 6 }}>
            💡 카카오뱅크 {KAKAO_BANK_ACCOUNT}로 {totalPrice.toLocaleString()}원을 입금 후 캡처해주세요
          </div>
          <input type="file" ref={paymentFileRef} onChange={handlePaymentUpload} accept=".jpg,.jpeg,.png" style={{ display: "none" }} />
          <button onClick={() => paymentFileRef.current?.click()} style={{
            width: "100%", padding: 16, borderRadius: 8, border: `2px dashed ${paymentProof ? theme.green : theme.border}`,
            background: paymentProof ? theme.greenBg : "transparent", color: paymentProof ? theme.green : theme.textMuted,
            fontSize: 13, cursor: "pointer", fontFamily: theme.font, textAlign: "center",
          }}>
            {paymentProof ? `✅ ${paymentProof.name}` : "💰 입금 캡처 이미지를 업로드하세요"}
          </button>
        </div>

        <Button size="lg" onClick={handleSubmit} disabled={submitting || !printFile || !paymentProof} style={{ width: "100%", justifyContent: "center" }}>
          {submitting ? "신청 중..." : "출력 신청하기"}
        </Button>
      </Card>
    </div>
  );
}

export default PrintRequest;
