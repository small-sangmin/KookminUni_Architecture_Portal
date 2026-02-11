import { useState } from "react";
import theme from "../constants/theme";
import { formatDate } from "../utils/helpers";
import Icons from "../components/Icons";
import { Badge, Card, Button, SectionTitle, Empty } from "../components/ui";

function StudentHistory({ user, reservations, equipRentals, updateReservations, sendEmailNotification, addLog, addNotification }) {
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const myRes = reservations.filter(r => r.studentId === user.id);
  const myRentals = equipRentals.filter(r => r.studentId === user.id);
  const all = [...myRes.map(r => ({ ...r, sortTime: r.createdAt })), ...myRentals.map(r => ({ ...r, sortTime: r.createdAt }))]
    .sort((a, b) => b.sortTime.localeCompare(a.sortTime));

  // 예약이 취소 가능한지 확인 (예약일이 아직 지나지 않은 경우)
  const canCancel = (item) => {
    if (item.type !== "room") return false;
    if (["cancelled", "rejected", "completed"].includes(item.status)) return false;
    const today = new Date().toISOString().slice(0, 10);
    return item.date >= today;
  };

  const handleCancelReservation = (item) => {
    setCancelling(true);
    setTimeout(() => {
      updateReservations(prev =>
        prev.map(r => r.id === item.id ? { ...r, status: "cancelled", cancelledAt: new Date().toISOString().replace('T', ' ').slice(0, 19) } : r)
      );
      addLog?.(`[예약취소] ${user.name}(${user.id}) → ${item.roomName} | ${item.date} ${item.slotLabels?.join(", ")} 예약을 취소했습니다.`, "reservation", { studentId: user.id, roomId: item.roomId });
      addNotification?.(`❌ 예약 취소: ${user.name} → ${item.roomName} (${item.date})`, "room");

      // 취소 확인 이메일 발송
      sendEmailNotification?.({
        to: user.email || undefined,
        subject: `[실기실 예약 취소] ${user.name} · ${item.roomName}`,
        body: [
          "국민대학교 건축대학 실기실 예약이 취소되었습니다.",
          "",
          "[취소된 예약 정보]",
          `- 예약자: ${user.name} (${user.id})`,
          `- 전공/학년: ${user.dept} ${user.year}학년`,
          `- 실기실: ${item.roomName}`,
          `- 날짜: ${item.date}`,
          `- 시간: ${item.slotLabels?.join(", ")}`,
          `- 목적: ${item.purpose || "개인 작업"}`,
          "",
          "[안내]",
          "- 예약이 취소되어 해당 시간대는 다른 학생이 예약할 수 있습니다.",
          "- 다시 예약이 필요한 경우 새로 예약을 진행해주세요.",
          "",
          "국민대학교 건축대학 교학팀",
        ].join("\n"),
      });

      setCancelling(false);
      setCancelConfirm(null);
      alert("✅ 예약이 취소되었습니다.\n확인 이메일이 발송됩니다.");
    }, 500);
  };

  return (
    <div className="fade-in">
      <SectionTitle icon={<Icons.history size={16} color={theme.accent} />}>이용 내역
        <Badge color="dim">{all.length}건</Badge>
      </SectionTitle>
      {all.length === 0 ? (
        <Empty icon={<Icons.calendar size={32} />} text="아직 이용 내역이 없습니다" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {all.map(item => (
            <Card key={item.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Badge color={item.type === "room" ? "blue" : "accent"}>{item.type === "room" ? "실기실" : "기구대여"}</Badge>
                <Badge color={item.status === "approved" ? "green" : item.status === "ready" ? "blue" : item.status === "cancelled" || item.status === "rejected" ? "red" : "yellow"}>
                  {item.status === "approved" ? "승인" : item.status === "ready" ? "준비완료" : item.status === "cancelled" ? "취소" : item.status === "rejected" ? "반려" : item.status === "returned" ? "반납" : "대기중"}
                </Badge>
              </div>
              {item.type === "room" ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.roomName}</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>{item.date} · {item.slotLabels?.join(", ")}</div>
                  {item.purpose && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>목적: {item.purpose}</div>}
                  {canCancel(item) && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      {cancelConfirm === item.id ? (
                        <>
                          <span style={{ fontSize: 13, color: theme.red }}>정말 취소하시겠습니까?</span>
                          <Button variant="primary" size="sm" style={{ background: theme.red }} onClick={() => handleCancelReservation(item)} disabled={cancelling}>
                            {cancelling ? "취소 중..." : "예, 취소합니다"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setCancelConfirm(null)}>아니오</Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" style={{ color: theme.red, borderColor: theme.red }} onClick={() => setCancelConfirm(item.id)}>
                          <Icons.x size={14} /> 예약 취소
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.items?.map(i => `${i.icon} ${i.name}`).join(", ")}</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>반납: {item.returnDate}</div>
                </div>
              )}
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>{item.createdAt}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentHistory;
