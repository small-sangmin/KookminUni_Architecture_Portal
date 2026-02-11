import { useState, useEffect } from "react";
import { EDITABLE, ROOMS } from "../constants/data";
import theme from "../constants/theme";
import { uid, ts, dateStr, formatDate } from "../utils/helpers";
import store from "../utils/storage";
import Icons from "../components/Icons";
import { Badge, Card, Button, Input, SectionTitle, Empty, Divider } from "../components/ui";

function WorkerDashboard({ reservations, updateReservations, equipRentals, updateEquipRentals, notifications, markNotifRead, markAllNotifsRead, unreadCount, addLog, workerName, sendEmailNotification, printRequests, visitCount, isMobile }) {
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [roomCleanup, setRoomCleanup] = useState({});

  // 실기실 정리 확인 — 오늘 날짜 기준 store 연동
  useEffect(() => {
    const key = `roomCleanup_${dateStr()}`;
    store.get(key).then(v => { if (v) setRoomCleanup(v); });
  }, []);
  const toggleRoomCleanup = (roomId) => {
    setRoomCleanup(prev => {
      const next = { ...prev, [roomId]: !prev[roomId] };
      store.set(`roomCleanup_${dateStr()}`, next);
      return next;
    });
  };

  const todayRes = reservations.filter(r => r.status === "approved");
  const pendingRes = reservations.filter(r => r.status === "pending");
  const pendingRentals = equipRentals.filter(r => r.status === "pending_pickup");
  const activeRentals = equipRentals.filter(r => r.status === "pending_pickup" || r.status === "ready");
  const pendingPrints = (printRequests || []).filter(p => p.status === "pending" || p.status === "processing").length;
  const today = dateStr();

  // 오늘 사용된 실기실 목록
  const todayUsedRooms = ROOMS.filter(room =>
    reservations.some(r => r.roomId === room.id && r.date === today && r.status === "approved")
  );
  const allRoomsChecked = todayUsedRooms.length === 0 || todayUsedRooms.every(r => roomCleanup[r.id]);

  // 체크리스트 완료 상태
  const checklistItems = [
    { key: "pending", label: "승인 대기 예약 처리", icon: <Icons.calendar size={16} />, count: pendingRes.length, done: pendingRes.length === 0 },
    { key: "rental", label: "물품 수령/반납 처리", icon: <Icons.package size={16} />, count: activeRentals.length, done: activeRentals.length === 0 },
    { key: "print", label: "출력 대기 처리", icon: <Icons.file size={16} />, count: pendingPrints, done: pendingPrints === 0 },
    { key: "cleanup", label: "실기실 정리 확인", icon: <Icons.check size={16} />, count: todayUsedRooms.filter(r => !roomCleanup[r.id]).length, done: allRoomsChecked },
  ];
  const doneCount = checklistItems.filter(c => c.done).length;

  // 통계 데이터 계산
  const totalReservations = reservations.length;
  const completedReservations = reservations.filter(r => r.status === "approved" || r.status === "completed").length;
  const cancelledReservations = reservations.filter(r => r.status === "cancelled" || r.status === "rejected").length;
  const totalRentals = equipRentals.length;
  const returnedRentals = equipRentals.filter(r => r.status === "returned").length;

  // 실기실별 예약 통계
  const roomStats = ROOMS.map(room => ({
    name: room.name.replace("실기실 ", ""),
    count: reservations.filter(r => r.roomId === room.id && r.status === "approved").length
  }));
  const maxRoomCount = Math.max(...roomStats.map(r => r.count), 1);

  // 최근 7일 예약 통계
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const dailyStats = last7Days.map(date => ({
    date,
    day: ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()],
    count: reservations.filter(r => r.date === date && r.status === "approved").length
  }));
  const maxDailyCount = Math.max(...dailyStats.map(d => d.count), 20);

  // 도넛 차트 렌더링 함수
  const DonutChart = ({ data, size = 120, strokeWidth = 16 }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.surface} strokeWidth={strokeWidth} />
        {data.map((d, i) => {
          const dashLength = (d.value / total) * circumference;
          const segment = (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={d.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              style={{ transition: "stroke-dasharray 0.5s, stroke-dashoffset 0.5s" }}
            />
          );
          offset += dashLength;
          return segment;
        })}
      </svg>
    );
  };

  // 원형 진행률 표시 컴포넌트
  const CircularProgress = ({ value, max, size = 50, color }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashLength = (percentage / 100) * circumference;

    return (
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.surface} strokeWidth={4} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 10, fontWeight: 700, color }}>{Math.round(percentage)}%</div>
      </div>
    );
  };

  const markEquipReady = (rentalId) => {
    updateEquipRentals(prev => prev.map(r => r.id === rentalId ? {
      ...r,
      status: "ready",
      returnChecklist: r.returnChecklist || EDITABLE.equipmentReturnChecklist.map(label => ({ label, done: false })),
    } : r));
    const rental = equipRentals.find(r => r.id === rentalId);
    if (rental) {
      addLog(`[준비완료] ${rental.studentName}의 기구대여 준비 완료 → ${rental.items.map(i => i.name).join(", ")}`, "equipment");
      if (rental.studentEmail) {
        sendEmailNotification?.({
          to: rental.studentEmail,
          subject: `[물품 준비 완료] ${rental.studentName}님 · ${rental.items.map(i => i.name).join(", ")}`,
          body: `물품 대여 준비가 완료되었습니다.\n\n- 물품: ${rental.items.map(i => `${i.icon} ${i.name}`).join(", ")}\n- 반납 예정일: ${rental.returnDate || "미정"}\n\n교학팀에서 수령해주세요.`,
        });
      }
    }
  };

  const markEquipReturned = (rentalId) => {
    updateEquipRentals(prev => prev.map(r => r.id === rentalId ? { ...r, status: "returned", returnedAt: ts() } : r));
    const rental = equipRentals.find(r => r.id === rentalId);
    if (rental) {
      addLog(`[반납완료] ${rental.studentName}의 기구 반납 완료 → ${rental.items.map(i => i.name).join(", ")}`, "equipment");
    }
  };

  const toggleChecklistItem = (rentalId, idx) => {
    updateEquipRentals(prev => prev.map(r => {
      if (r.id !== rentalId) return r;
      const list = r.returnChecklist || EDITABLE.equipmentReturnChecklist.map(label => ({ label, done: false }));
      const next = list.map((item, i) => i === idx ? { ...item, done: !item.done } : item);
      return { ...r, returnChecklist: next };
    }));
  };

  const approveReservation = (reservationId) => {
    updateReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: "approved", approvedAt: ts(), approvedBy: workerName } : r));
    const res = reservations.find(r => r.id === reservationId);
    if (res) {
      addLog(`[예약승인] ${res.studentName}(${res.studentId}) → ${res.roomName} | ${res.date} ${res.slotLabels?.join(", ")}`, "reservation", { studentId: res.studentId, roomId: res.roomId });
    }
  };

  const rejectReservation = (reservationId) => {
    const reason = window.prompt("반려 사유 (선택)") || "";
    updateReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: "rejected", rejectedAt: ts(), rejectedBy: workerName, rejectedReason: reason } : r));
    const res = reservations.find(r => r.id === reservationId);
    if (res) {
      addLog(`[예약반려] ${res.studentName}(${res.studentId}) → ${res.roomName} | ${res.date} ${res.slotLabels?.join(", ")}${reason ? ` | 사유: ${reason}` : ""}`, "reservation", { studentId: res.studentId, roomId: res.roomId });
    }
  };

  return (
    <div className="fade-in">
      {/* ═══ Header ═══ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: theme.text }}>관리 대시보드</h2>
          <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: theme.green }} />
            <span style={{ fontSize: 12, color: theme.textMuted }}>실시간</span>
          </div>
          {/* 알림 벨 */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotifPopup(!showNotifPopup)} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: showNotifPopup ? theme.accent : theme.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "all 0.2s" }}>
              <Icons.bell size={18} color={showNotifPopup ? "#fff" : theme.textMuted} />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, background: theme.red, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: `2px solid ${theme.bg}` }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            {showNotifPopup && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 360, maxHeight: 400, background: theme.card, borderRadius: theme.radius, border: `1px solid ${theme.border}`, boxShadow: "0 10px 40px rgba(0,0,0,0.4)", zIndex: 1000, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>알림</span>
                    {unreadCount > 0 && <Badge color="red">{unreadCount}</Badge>}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); markAllNotifsRead(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: theme.accent, fontWeight: 600, fontFamily: theme.font }}>모두 읽음</button>
                  )}
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center" }}>
                      <Icons.bell size={32} color={theme.textDim} />
                      <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 12 }}>알림이 없습니다</div>
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((n, i) => (
                      <div key={n.id} onClick={() => markNotifRead(n.id)} style={{ padding: "12px 16px", cursor: "pointer", transition: "background 0.15s", borderBottom: i < Math.min(notifications.length, 15) - 1 ? `1px solid ${theme.border}` : "none", background: !n.read ? (n.urgent ? "rgba(212,93,93,0.06)" : "rgba(212,160,83,0.06)") : "transparent", opacity: n.read ? 0.6 : 1 }}
                        onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.background = !n.read ? (n.urgent ? "rgba(212,93,93,0.06)" : "rgba(212,160,83,0.06)") : "transparent"}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: n.urgent ? theme.red : theme.accent, marginTop: 5, flexShrink: 0 }} />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{n.text}</div>
                            <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>{n.time}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 퇴근 전 체크리스트 ═══ */}
      <Card style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
        {/* 체크리스트 헤더 */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.shield size={18} color={doneCount === 4 ? theme.green : theme.accent} />
            <span style={{ fontSize: 16, fontWeight: 800, color: theme.text }}>퇴근 전 체크리스트</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 80, height: 6, borderRadius: 3, background: theme.surface, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(doneCount / 4) * 100}%`, background: doneCount === 4 ? theme.green : theme.accent, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: doneCount === 4 ? theme.green : theme.accent, fontFamily: theme.fontMono }}>{doneCount}/4</span>
          </div>
        </div>

        {/* 체크리스트 항목들 */}
        {checklistItems.map((item, idx) => (
          <div key={item.key}>
            {/* 항목 행 */}
            <div
              onClick={() => setExpandedChecklist(expandedChecklist === item.key ? null : item.key)}
              style={{
                padding: "14px 20px", cursor: "pointer", transition: "background 0.15s",
                borderBottom: idx < checklistItems.length - 1 || expandedChecklist === item.key ? `1px solid ${theme.border}` : "none",
                display: "flex", alignItems: "center", gap: 12,
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* 체크 아이콘 */}
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: item.done ? theme.greenBg : theme.surface,
                border: `2px solid ${item.done ? theme.green : theme.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s"
              }}>
                {item.done && <Icons.check size={14} color={theme.green} />}
              </div>
              {/* 아이콘 + 라벨 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ color: item.done ? theme.green : theme.textMuted }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: item.done ? theme.green : theme.text, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.7 : 1 }}>{item.label}</span>
              </div>
              {/* 카운트 뱃지 */}
              {item.done ? (
                <Badge color="green">완료</Badge>
              ) : (
                <Badge color={item.count > 0 ? "yellow" : "dim"}>{item.count}건 남음</Badge>
              )}
              {/* 펼침 화살표 */}
              <span style={{ fontSize: 11, color: theme.textDim, transition: "transform 0.2s", transform: expandedChecklist === item.key ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </div>

            {/* 펼침 콘텐츠 */}
            <div style={{
              maxHeight: expandedChecklist === item.key ? 600 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s ease-in-out",
              background: "rgba(0,0,0,0.15)",
            }}>
              <div style={{ padding: "12px 20px" }}>
                {/* 1) 승인 대기 예약 */}
                {item.key === "pending" && (
                  pendingRes.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: theme.textDim, fontSize: 13 }}>
                      <Icons.check size={24} color={theme.green} /><div style={{ marginTop: 8 }}>모든 예약이 처리되었습니다</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pendingRes.map(res => (
                        <div key={res.id} style={{ padding: 14, background: theme.card, borderRadius: theme.radiusSm, border: `1px solid ${theme.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{res.studentName} <span style={{ color: theme.textMuted, fontWeight: 400 }}>({res.studentId})</span></div>
                            <Badge color="yellow">대기</Badge>
                          </div>
                          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>{res.roomName} · {res.date} · {res.slotLabels?.join(", ")}</div>
                          {res.purpose && <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 8 }}>목적: {res.purpose}</div>}
                          <div style={{ display: "flex", gap: 8 }}>
                            <Button size="sm" onClick={() => approveReservation(res.id)}>승인</Button>
                            <Button size="sm" variant="danger" onClick={() => rejectReservation(res.id)}>반려</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 2) 물품 수령/반납 */}
                {item.key === "rental" && (
                  activeRentals.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: theme.textDim, fontSize: 13 }}>
                      <Icons.check size={24} color={theme.green} /><div style={{ marginTop: 8 }}>진행 중인 대여가 없습니다</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {activeRentals.map(rental => (
                        <div key={rental.id} style={{ padding: 14, background: theme.card, borderRadius: theme.radiusSm, border: `1px solid ${theme.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{rental.studentName} <span style={{ color: theme.textMuted, fontWeight: 400 }}>({rental.studentId})</span></div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {rental.returnDate && rental.returnDate < today && <Badge color="red">연체</Badge>}
                              <Badge color={rental.status === "ready" ? "blue" : "yellow"}>{rental.status === "ready" ? "준비완료" : "준비 필요"}</Badge>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 6 }}>{rental.items.map(i => `${i.icon} ${i.name}`).join("  ·  ")}</div>
                          <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 8 }}>반납: {rental.returnDate}</div>
                          {rental.status === "ready" && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 6 }}>반납 체크리스트</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {(rental.returnChecklist || EDITABLE.equipmentReturnChecklist.map(label => ({ label, done: false }))).map((cl, cidx) => (
                                  <label key={cidx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.textMuted, cursor: "pointer" }}>
                                    <input type="checkbox" checked={!!cl.done} onChange={() => toggleChecklistItem(rental.id, cidx)} />
                                    {cl.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            {rental.status === "pending_pickup" && <Button size="sm" onClick={() => markEquipReady(rental.id)}>✓ 준비 완료</Button>}
                            {rental.status === "ready" && <Button size="sm" variant="success" onClick={() => markEquipReturned(rental.id)} disabled={(rental.returnChecklist || []).some(i => !i.done)}>↩ 반납 처리</Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 3) 출력 대기 */}
                {item.key === "print" && (
                  pendingPrints === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: theme.textDim, fontSize: 13 }}>
                      <Icons.check size={24} color={theme.green} /><div style={{ marginTop: 8 }}>대기 중인 출력이 없습니다</div>
                    </div>
                  ) : (
                    <div style={{ padding: 14, background: theme.card, borderRadius: theme.radiusSm, border: `1px solid ${theme.yellowBorder}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: theme.yellow }}>
                        <Icons.alert size={16} />
                        <span style={{ fontWeight: 600 }}>{pendingPrints}건의 출력 요청이 대기 중입니다.</span>
                      </div>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>출력 대기 탭에서 처리해주세요.</div>
                    </div>
                  )
                )}

                {/* 4) 실기실 정리 확인 */}
                {item.key === "cleanup" && (
                  todayUsedRooms.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: theme.textDim, fontSize: 13 }}>
                      <Icons.check size={24} color={theme.green} /><div style={{ marginTop: 8 }}>오늘 사용된 실기실이 없습니다</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {todayUsedRooms.map(room => (
                        <label key={room.id}
                          onClick={(e) => { e.stopPropagation(); toggleRoomCleanup(room.id); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer",
                            background: roomCleanup[room.id] ? theme.greenBg : theme.card,
                            borderRadius: theme.radiusSm, border: `1px solid ${roomCleanup[room.id] ? theme.greenBorder : theme.border}`,
                            transition: "all 0.2s",
                          }}>
                          <input type="checkbox" checked={!!roomCleanup[room.id]} readOnly style={{ accentColor: theme.green }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: roomCleanup[room.id] ? theme.green : theme.text }}>{room.name}</div>
                            <div style={{ fontSize: 11, color: theme.textDim }}>{room.floor} · {room.building}</div>
                          </div>
                          {roomCleanup[room.id] && <Badge color="green">확인됨</Badge>}
                        </label>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* ═══ 간단 요약 카드 ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "오늘 예약", value: todayRes.filter(r => r.date === today).length, icon: <Icons.calendar size={15} color={theme.accent} />, color: theme.accent },
          { label: "총 예약", value: totalReservations, icon: <Icons.list size={15} color={theme.blue} />, color: theme.blue },
          { label: "물품 대여", value: totalRentals, icon: <Icons.package size={15} color={theme.yellow} />, color: theme.yellow },
          { label: "방문자", value: visitCount || 0, icon: <Icons.users size={15} color={theme.green} />, color: theme.green },
        ].map((stat, i) => (
          <Card key={i} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {stat.icon}
              <span style={{ fontSize: 11, color: theme.textMuted }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, fontFamily: theme.fontMono }}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* ═══ Analytics (접을 수 있음) ═══ */}
      <div style={{ marginBottom: 20 }}>
        <div
          onClick={() => setAnalyticsOpen(!analyticsOpen)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: analyticsOpen ? 12 : 0, padding: "8px 0" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: theme.text }}>
            <Icons.grid size={16} color={theme.accent} />
            Analytics
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.textDim }}>{analyticsOpen ? "접기" : "펼치기"}</span>
            <span style={{ fontSize: 11, color: theme.textDim, transition: "transform 0.2s", display: "inline-block", transform: analyticsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </div>
        </div>
        <div style={{ maxHeight: analyticsOpen ? 800 : 0, overflow: "hidden", transition: "max-height 0.4s ease-in-out" }}>
          {/* 도넛 + 주간 차트 + 실기실별 이용 */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* 주간 예약 현황 */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>주간 예약 현황</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>{last7Days[0]} ~ {last7Days[6]}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", height: 140, position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 10, color: theme.textDim }}>
                  <span>{maxDailyCount}</span><span>{Math.round(maxDailyCount / 2)}</span><span>0</span>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginLeft: 24 }}>
                  {dailyStats.map((d, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%" }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
                        <div style={{ width: "70%", height: `${Math.max((d.count / maxDailyCount) * 100, 5)}%`, background: d.date === today ? theme.accent : theme.blue, borderRadius: "4px 4px 0 0", transition: "height 0.3s", minHeight: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-around", marginLeft: 24, marginTop: 8 }}>
                  {dailyStats.map((d, i) => (
                    <span key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: d.date === today ? theme.accent : theme.textDim }}>{d.day}</span>
                  ))}
                </div>
              </div>
            </Card>

            {/* 실기실별 이용 + 도넛 */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>예약 현황</div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <DonutChart data={[{ value: completedReservations, color: theme.green }, { value: pendingRes.length, color: theme.yellow }, { value: cancelledReservations, color: theme.red }]} size={60} strokeWidth={8} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.green }} /><span style={{ color: theme.textMuted }}>승인 {completedReservations}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.yellow }} /><span style={{ color: theme.textMuted }}>대기 {pendingRes.length}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.red }} /><span style={{ color: theme.textMuted }}>취소 {cancelledReservations}</span></div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roomStats.slice(0, 5).map((room, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>{room.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>{room.count}</span>
                    </div>
                    <div style={{ height: 4, background: theme.surface, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(room.count / maxRoomCount) * 100}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.yellow})`, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ═══ 활성 예약 ═══ */}
      <SectionTitle icon={<Icons.calendar size={16} color={theme.accent} />}>활성 예약</SectionTitle>
      <Card style={{ padding: 0, overflow: "hidden", maxHeight: 350, overflowY: "auto" }}>
        {todayRes.length === 0 ? (
          <Empty icon={<Icons.calendar size={28} />} text="승인된 예약이 없습니다" />
        ) : (
          todayRes.map((res, i) => (
            <div key={res.id} style={{ padding: "14px 18px", borderBottom: i < todayRes.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{res.studentName}</span>
                  <span style={{ fontSize: 12, color: theme.textMuted, marginLeft: 8 }}>{res.studentDept}</span>
                </div>
                <Badge color="green">{res.autoApproved ? "자동승인" : "승인"}</Badge>
              </div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>{res.roomName} · {res.date} · {res.slotLabels?.join(", ")}</div>
              {res.purpose && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>목적: {res.purpose}</div>}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

export default WorkerDashboard;
