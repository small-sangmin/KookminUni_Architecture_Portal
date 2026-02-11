import { useState } from "react";
import theme from "../constants/theme";
import { ts } from "../utils/helpers";
import Icons from "../components/Icons";
import { Badge, Card, Button, SectionTitle, Empty } from "../components/ui";

function PrintManagement({ printRequests, updatePrintRequests, addLog, workerName, sendEmailNotification }) {
  const [filter, setFilter] = useState("pending"); // pending | processing | completed | all
  const [selectedRequest, setSelectedRequest] = useState(null);

  const filtered = (printRequests || []).filter(p => {
    if (filter === "pending") return p.status === "pending";
    if (filter === "processing") return p.status === "processing";
    if (filter === "completed") return p.status === "completed" || p.status === "cancelled";
    return true;
  });

  const handleStatusChange = (requestId, newStatus) => {
    const req = (printRequests || []).find(p => p.id === requestId);
    updatePrintRequests(prev => prev.map(p =>
      p.id === requestId
        ? { ...p, status: newStatus, completedAt: newStatus === "completed" ? ts() : p.completedAt, processedBy: workerName }
        : p
    ));
    addLog(`출력 상태 변경: ${newStatus}`, "print", { requestId });
    if (newStatus === "completed" && req?.studentEmail) {
      sendEmailNotification?.({
        to: req.studentEmail,
        subject: `[출력 완료] ${req.studentName}님 · ${req.paperSize} ${req.copies}장`,
        body: `출력이 완료되었습니다.\n\n- 용지: ${req.paperSize}\n- 재질: ${PRINT_TYPE_LABELS[req.colorMode] || req.colorMode}\n- 매수: ${req.copies}장\n- +600 추가: ${req.plus600Count || 0}개\n- 금액: ${(req.totalPrice || 0).toLocaleString()}원\n\n건축대학 출력실(복지관 6층)에서 수령해주세요.`,
      });
    }
  };

  const pendingCount = (printRequests || []).filter(p => p.status === "pending").length;
  const processingCount = (printRequests || []).filter(p => p.status === "processing").length;

  const statusLabels = { pending: "대기중", processing: "출력중", completed: "완료", cancelled: "취소됨" };
  const statusColors = { pending: "yellow", processing: "blue", completed: "green", cancelled: "red" };

  return (
    <div style={{ paddingTop: 20 }}>
      {/* 긴급 알림 */}
      {pendingCount > 0 && (
        <Card style={{ marginBottom: 16, background: theme.yellowBg, borderColor: theme.yellowBorder }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.yellow }}>새 출력 요청 {pendingCount}건</div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>확인 후 출력을 진행해주세요</div>
            </div>
          </div>
        </Card>
      )}

      {/* 필터 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { id: "pending", label: `대기 (${pendingCount})` },
          { id: "processing", label: `출력중 (${processingCount})` },
          { id: "completed", label: "완료" },
          { id: "all", label: "전체" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${filter === f.id ? theme.accent : theme.border}`,
            background: filter === f.id ? theme.accentBg : "transparent",
            color: filter === f.id ? theme.accent : theme.textMuted,
            fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: theme.font,
          }}>{f.label}</button>
        ))}
      </div>

      {/* 요청 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
            출력 요청이 없습니다
          </div>
        ) : (
          filtered.map(req => (
            <Card key={req.id} style={{
              padding: 16, cursor: "pointer",
              borderColor: req.status === "pending" ? theme.yellow : theme.border,
              background: theme.card,
            }} onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{req.studentName}</span>
                    <Badge color="dim">{req.studentDept}</Badge>
                    <Badge color={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 13, color: theme.textMuted }}>
                    <span>📄 {req.paperSize} {PRINT_TYPE_LABELS[req.colorMode] || req.colorMode}{req.plus600Count > 0 ? ` (+600 x ${req.plus600Count})` : ""}</span>
                    <span>📋 {req.copies}장</span>
                    <span>💰 {req.totalPrice?.toLocaleString()}원</span>
                  </div>
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 6 }}>
                    신청: {req.createdAt?.slice(5, 16).replace("T", " ")}
                  </div>
                </div>
              </div>

              {/* 상세 패널 */}
              {selectedRequest?.id === req.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
                  {/* 파일 정보 */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 6 }}>출력 파일</div>
                    <div style={{ padding: 10, background: theme.surface, borderRadius: 6, fontSize: 12, color: theme.text }}>
                      📎 {req.printFile?.name}
                      {req.printFile?.data && (
                        <a href={req.printFile.data} download={req.printFile.name} style={{ marginLeft: 12, color: theme.accent, textDecoration: "none" }}>
                          다운로드 ↓
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 송금 캡처 */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 6 }}>송금 캡처</div>
                    {req.paymentProof?.data && (
                      <img src={req.paymentProof.data} alt="송금 캡처" style={{ maxWidth: 200, borderRadius: 8, border: `1px solid ${theme.border}` }} />
                    )}
                  </div>

                  {/* 상태 변경 버튼 */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {req.status === "pending" && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(req.id, "processing"); }}>
                        🖨️ 출력 시작
                      </Button>
                    )}
                    {req.status === "processing" && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(req.id, "completed"); }}>
                        ✅ 출력 완료
                      </Button>
                    )}
                    {(req.status === "pending" || req.status === "processing") && (
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleStatusChange(req.id, "cancelled"); }}>
                        ❌ 취소
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default PrintManagement;
