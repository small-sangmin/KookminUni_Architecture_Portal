import { useState, useMemo } from "react";
import { ROOMS, TIME_SLOTS } from "../constants/data";
import theme from "../constants/theme";
import { uid, ts, dateStr, tomorrow, addDays, formatDate } from "../utils/helpers";
import Icons from "../components/Icons";
import { Badge, Card, Button, Input, SectionTitle, Empty } from "../components/ui";

function RoomReservation({ user, reservations, updateReservations, addLog, addNotification, syncReservationToSheet, sendEmailNotification, isMobile }) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedDate, setSelectedDate] = useState(tomorrow());
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [purpose, setPurpose] = useState("");
  const [members, setMembers] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  const toggleSlot = (id) => setSelectedSlots(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const bookedSlots = useMemo(() => {
    if (!selectedRoom || !selectedDate) return new Set();
    return new Set(
      reservations
        .filter(r => r.roomId === selectedRoom && r.date === selectedDate && !["cancelled", "rejected"].includes(r.status))
        .flatMap(r => r.slots)
    );
  }, [reservations, selectedRoom, selectedDate]);


  const handleSubmit = () => {
    if (!selectedRoom || selectedSlots.length === 0) return;
    if (selectedSlots.some(id => bookedSlots.has(id))) {
      setError("선택한 시간에 이미 예약이 있습니다. 다른 시간대를 선택하세요.");
      return;
    }
    setError("");
    setSubmitting(true);
    setTimeout(() => {
      const room = ROOMS.find(r => r.id === selectedRoom);
      const slotLabels = selectedSlots.map(sid => TIME_SLOTS.find(t => t.id === sid)?.label).filter(Boolean).sort();
      const res = {
        id: uid(), type: "room", studentId: user.id, studentName: user.name, studentDept: user.dept,
        roomId: selectedRoom, roomName: room.name, date: selectedDate, slots: selectedSlots, slotLabels,
        purpose: purpose || "개인 작업", members: parseInt(members) || 1,
        status: "approved", createdAt: ts(), autoApproved: true,
      };
      updateReservations(prev => [res, ...prev]);
      addLog(`[자동승인] ${user.name}(${user.id}) → ${room.name} 예약 | ${selectedDate} ${slotLabels.join(", ")} | ${res.purpose}`, "reservation", { studentId: user.id, roomId: selectedRoom });
      addNotification(`🏠 실기실 예약: ${user.name} → ${room.name} (${formatDate(selectedDate)} ${slotLabels[0]}${slotLabels.length > 1 ? ` 외 ${slotLabels.length - 1}건` : ""})`, "room");
      sendEmailNotification({
        to: user.email || undefined,
        subject: `[실기실 예약 확정] ${user.name} · ${room.name}`,
        body: [
          "국민대학교 건축대학 실기실 예약이 확정되었습니다.",
          "",
          "[예약 정보]",
          `- 예약자: ${user.name} (${user.id})`,
          `- 전공/학년: ${user.dept} ${user.year}학년`,
          `- 실기실: ${room.name}`,
          `- 날짜: ${selectedDate}`,
          `- 시간: ${slotLabels.join(", ")}`,
          `- 목적: ${purpose || "개인 작업"}`,
          `- 인원: ${parseInt(members) || 1}명`,
          "",
          "[안내]",
          "- 이용 수칙을 준수해주세요.",
          "- 예약 변경/취소가 필요하면 근로학생 또는 관리자에게 문의해주세요.",
          "",
          "국민대학교 건축대학 교학팀",
        ].join("\n"),
      });
      syncReservationToSheet?.(res);
      setSuccess(res);
      setSubmitting(false);
      setSelectedSlots([]);
      setPurpose("");
      alert("✅ 예약이 완료되었습니다!\n\n📌 실기실 예약 시간 5분 전 교학팀으로 방문해주세요.");
    }, 800);
  };

  return (
    <div className="fade-in">
      {success && (
        <Card style={{ marginBottom: 20, background: theme.greenBg, borderColor: theme.greenBorder }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.check size={20} color={theme.green} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.green }}>예약 신청 완료!</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>
                {success.roomName} · {success.date} · {success.slotLabels.join(", ")}
              </div>
            </div>
            <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => setSuccess(null)}><Icons.x size={14} /></Button>
          </div>
        </Card>
      )}

      {error && (
        <Card style={{ marginBottom: 20, background: theme.redBg, borderColor: theme.redBorder }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.alert size={18} color={theme.red} />
            <div style={{ fontSize: 13, color: theme.red }}>{error}</div>
          </div>
        </Card>
      )}

      {/* Two Column Layout */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 24, minHeight: isMobile ? "auto" : 500 }}>
        {/* Left: Room List (Vertical) */}
        <div style={{ width: isMobile ? "100%" : 280, flexShrink: 0 }}>
          <SectionTitle icon={<Icons.door size={16} color={theme.accent} />}>실기실 선택</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ROOMS.map(room => {
              const sel = selectedRoom === room.id;
              const todayBookings = reservations.filter(r =>
                r.roomId === room.id &&
                r.date === selectedDate &&
                !["cancelled", "rejected"].includes(r.status)
              ).length;
              return (
                <Card key={room.id} onClick={() => setSelectedRoom(room.id)} style={{
                  padding: 16, cursor: "pointer",
                  borderColor: sel ? theme.accent : theme.border,
                  background: sel ? theme.accentBg : theme.card,
                  transition: "all 0.2s",
                  borderLeft: sel ? `3px solid ${theme.accent}` : `3px solid transparent`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: sel ? theme.accent : theme.text }}>{room.name}</div>
                    <Badge color={sel ? "accent" : "dim"}>{room.floor}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>{room.building}</div>
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>{room.equipment}</span>
                    {todayBookings > 0 && <Badge color="yellow" style={{ fontSize: 10 }}>오늘 {todayBookings}건</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right: Reservation Details */}
        <div style={{ flex: 1 }}>
          {!selectedRoom ? (
            <div style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: theme.surface,
              borderRadius: 16,
              border: `2px dashed ${theme.border}`,
              padding: 40,
            }}>
              <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>🏠</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>실기실을 선택해주세요</div>
              <div style={{ fontSize: 13, color: theme.textDim, textAlign: "center" }}>
                왼쪽 목록에서 원하는 실기실을 클릭하면<br />예약 정보를 입력할 수 있습니다
              </div>
            </div>
          ) : (
            <div>
              {/* Selected Room Header */}
              {(() => {
                const room = ROOMS.find(r => r.id === selectedRoom);
                return (
                  <Card style={{ marginBottom: 20, padding: 20, background: theme.accentBg, borderColor: theme.accent }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: theme.accent, marginBottom: 4 }}>{room?.name}</div>
                        <div style={{ fontSize: 13, color: theme.textMuted }}>{room?.building} · {room?.floor}</div>
                        <div style={{ fontSize: 12, color: theme.textDim, marginTop: 6 }}>🔧 {room?.equipment}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRoom(null)}>
                        <Icons.x size={14} /> 다른 실기실
                      </Button>
                    </div>
                  </Card>
                );
              })()}

              {/* Room Rules */}
              {(() => {
                const room = ROOMS.find(r => r.id === selectedRoom);
                return room?.rules && (
                  <Card style={{ marginBottom: 20, background: theme.yellowBg, borderColor: theme.yellowBorder, padding: 14 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: theme.yellow }}>
                      <Icons.alert size={16} /> <strong>이용 수칙:</strong> {room.rules}
                    </div>
                  </Card>
                );
              })()}

              {/* Date & Time */}
              <SectionTitle icon={<Icons.calendar size={16} color={theme.accent} />}>날짜 및 시간 선택</SectionTitle>
              <Card style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                  <Input label="예약 날짜" type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedSlots([]); }} style={{ maxWidth: 180 }} />
                  <Input label="사용 인원" type="number" min="1" max="30" value={members} onChange={e => setMembers(e.target.value)} style={{ maxWidth: 100 }} />
                </div>

                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 10 }}>시간대 선택 (복수 가능)</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))", gap: 6 }}>
                  {TIME_SLOTS.map(slot => {
                    const booked = bookedSlots.has(slot.id);
                    const sel = selectedSlots.includes(slot.id);
                    return (
                      <button key={slot.id} disabled={booked} onClick={() => !booked && toggleSlot(slot.id)}
                        style={{
                          padding: "9px 8px", borderRadius: theme.radiusSm, fontSize: 12, fontWeight: 500,
                          fontFamily: theme.fontMono, cursor: booked ? "not-allowed" : "pointer",
                          border: `1px solid ${sel ? theme.accent : booked ? theme.border : theme.border}`,
                          background: sel ? theme.accentBg : booked ? "rgba(255,255,255,0.02)" : theme.surface,
                          color: sel ? theme.accent : booked ? theme.textDim : theme.textMuted,
                          opacity: booked ? 0.4 : 1, transition: "all 0.15s",
                          textDecoration: booked ? "line-through" : "none",
                        }}>
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
                {bookedSlots.size > 0 && (
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>취소선 = 이미 예약된 시간</div>
                )}
              </Card>

              {/* Purpose */}
              <SectionTitle icon={<Icons.info size={16} color={theme.accent} />}>사용 목적</SectionTitle>
              <Card style={{ marginBottom: 24 }}>
                <Input placeholder="예: 졸업작품 모형 제작, 스터디 그룹 작업 등" value={purpose} onChange={e => setPurpose(e.target.value)} />
              </Card>

              {/* Summary & Submit */}
              {selectedSlots.length > 0 && (
                <Card style={{ marginBottom: 20, background: theme.surface, padding: 16 }}>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>예약 요약</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <Badge color="accent">{ROOMS.find(r => r.id === selectedRoom)?.name}</Badge>
                    <Badge color="blue">{selectedDate}</Badge>
                    <Badge color="green">{selectedSlots.length}시간</Badge>
                    <Badge color="dim">{members}명</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: theme.textDim }}>
                    시간: {selectedSlots.map(sid => TIME_SLOTS.find(t => t.id === sid)?.label).filter(Boolean).sort().join(", ")}
                  </div>
                </Card>
              )}

              <Button size="lg" onClick={handleSubmit} disabled={selectedSlots.length === 0 || !purpose.trim() || submitting}
                style={{ width: "100%", justifyContent: "center", marginBottom: 40 }}>
                {submitting ? "처리 중..." : `예약 신청 (${selectedSlots.length}시간)`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoomReservation;
