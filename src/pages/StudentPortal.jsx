import { useState, useEffect, useCallback } from "react";
import theme from "../constants/theme";
import Icons from "../components/Icons";
import { Badge, Card, Button, Tabs } from "../components/ui";
import RoomReservation from "../features/RoomReservation";
import EquipmentRental from "../features/EquipmentRental";
import PrintRequest from "../features/PrintRequest";
import StudentHistory from "../features/StudentHistory";
import StudentInquiries from "../features/StudentInquiries";

function StudentPortal({ user, onLogout, reservations, updateReservations, equipRentals, updateEquipRentals, equipmentDB, setEquipmentDB, addLog, addNotification, syncReservationToSheet, syncPrintToSheet, sendEmailNotification, warnings, inquiries, updateInquiries, printRequests, updatePrintRequests, isMobile, isDark, toggleDark }) {
  const [tab, setTabRaw] = useState("dashboard");
  const [dashboardDetail, setDashboardDetail] = useState(null);
  const [detailSubmitting, setDetailSubmitting] = useState(false);
  const setTab = useCallback((newTab) => {
    setTabRaw(prev => {
      if (prev !== newTab) history.pushState({ page: "student", tab: newTab }, "");
      return newTab;
    });
  }, []);
  useEffect(() => {
    const onPopState = (e) => {
      const s = e.state;
      if (s?.page === "student") setTabRaw(s.tab || "dashboard");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const isSafe = user.safetyTrained;
  const myInquiries = inquiries?.filter(i => i.name === user.name) || [];
  const myPrintRequests = printRequests?.filter(p => p.studentId === user.id) || [];
  const today = new Date().toISOString().slice(0, 10);
  const myReservations = reservations?.filter(r => r.studentId === user.id) || [];
  const upcomingReservations = myReservations.filter(r => r.date >= today && r.status === "approved").sort((a, b) => a.date.localeCompare(b.date));
  const myRentals = equipRentals?.filter(r => r.studentId === user.id) || [];
  const activeRentals = myRentals.filter(r => !["returned", "cancelled"].includes(r.status));
  const pendingPrints = myPrintRequests.filter(p => p.status === "pending" || p.status === "processing");
  const selectedRoomReservation = dashboardDetail?.type === "room"
    ? upcomingReservations.find(r => r.id === dashboardDetail.id)
    : null;
  const selectedRental = dashboardDetail?.type === "rental"
    ? activeRentals.find(r => r.id === dashboardDetail.id)
    : null;

  const canCancelRoomReservation = (item) => {
    if (!item) return false;
    if (["cancelled", "rejected", "completed"].includes(item.status)) return false;
    return item.date >= today;
  };
  const canCancelRentalReservation = (item) => {
    if (!item) return false;
    return !["ready", "returned", "cancelled"].includes(item.status);
  };

  const openRoomDetail = (item) => {
    setDashboardDetail({ type: "room", id: item.id });
  };

  const openRentalDetail = (item) => {
    setDashboardDetail({ type: "rental", id: item.id });
  };

  const closeDashboardDetail = () => {
    setDashboardDetail(null);
  };

  const handleCancelRoomReservation = () => {
    if (!selectedRoomReservation) return;
    if (!canCancelRoomReservation(selectedRoomReservation)) return;
    if (!window.confirm("해당 예약을 취소하시겠습니까?")) return;
    setDetailSubmitting(true);
    updateReservations(prev =>
      prev.map(r => r.id === selectedRoomReservation.id
        ? { ...r, status: "cancelled", cancelledAt: new Date().toISOString().replace("T", " ").slice(0, 19) }
        : r
      )
    );
    addLog?.(`[예약취소] ${user.name}(${user.id}) → ${selectedRoomReservation.roomName}`, "reservation", { studentId: user.id, roomId: selectedRoomReservation.roomId });
    addNotification?.(`❌ 예약 취소: ${user.name} → ${selectedRoomReservation.roomName}`, "room");
    setDetailSubmitting(false);
    alert("예약이 취소되었습니다.");
    closeDashboardDetail();
  };

  const handleCancelRentalReservation = () => {
    if (!selectedRental) return;
    if (!canCancelRentalReservation(selectedRental)) return;
    if (!window.confirm("해당 물품 대여를 취소하시겠습니까?")) return;
    setDetailSubmitting(true);
    updateEquipRentals(prev => prev.map(r =>
      r.id === selectedRental.id
        ? { ...r, status: "cancelled", cancelledAt: new Date().toISOString().replace("T", " ").slice(0, 19) }
        : r
    ));
    setEquipmentDB(prev => prev.map(eq => {
      const matched = selectedRental.items?.find(i => i.id === eq.id);
      if (!matched) return eq;
      return { ...eq, available: Math.min(eq.total, (eq.available || 0) + 1) };
    }));
    addLog?.(`[대여취소] ${user.name}(${user.id}) → ${selectedRental.items?.map(i => i.name).join(", ")}`, "equipment", { studentId: user.id });
    addNotification?.(`❌ 물품 대여 취소: ${user.name}`, "equipment");
    setDetailSubmitting(false);
    alert("물품 대여가 취소되었습니다.");
    closeDashboardDetail();
  };

  return (
    <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 0 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Student Portal</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>안녕하세요, {user.name}님</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Badge color="dim">{user.dept}</Badge>
            <Badge color="dim">{user.year}학년</Badge>
            <Badge color={isSafe ? "green" : "red"}>{isSafe ? "안전교육 이수 ✓" : "안전교육 미이수 ✗"}</Badge>
            {warnings?.[user.id] && (
              <Badge color="orange">
                <Icons.alert size={12} style={{ marginRight: 4 }} />
                경고 {warnings[user.id].count || 1}회
              </Badge>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={toggleDark}>{isDark ? <Icons.sun size={15} /> : <Icons.moon size={15} />}</Button>
          <Button variant="ghost" size="sm" onClick={onLogout}><Icons.logout size={15} /> 로그아웃</Button>
        </div>
      </div>

      {/* Safety Warning */}
      {!isSafe && (
        <Card style={{ marginTop: 20, background: theme.redBg, borderColor: theme.redBorder }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Icons.alert size={20} color={theme.red} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.red }}>안전교육 미이수</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4, lineHeight: 1.6 }}>
                실기실 예약 및 물품 대여를 위해서는 안전교육을 먼저 이수해야 합니다.
                교학팀에 문의하거나 LMS에서 온라인 안전교육을 수강해주세요.
              </div>
            </div>
          </div>
        </Card>
      )}

      {isSafe && (
        <>
          <div style={{ paddingTop: 24 }}>
            <Tabs
              tabs={[
                { id: "dashboard", label: "대시보드", icon: <Icons.grid size={15} /> },
                { id: "room", label: "실기실 예약", icon: <Icons.door size={15} /> },
                { id: "equipment", label: "물품 대여", icon: <Icons.tool size={15} /> },
                { id: "print", label: "출력 신청", icon: <Icons.file size={15} />, badge: myPrintRequests.filter(p => p.status === "pending" || p.status === "processing").length },
                { id: "history", label: "내 이용내역", icon: <Icons.history size={15} /> },
                {
                  id: "inquiries", label: "문의 내역", icon: <Icons.file size={15} />, badges: [
                    { count: myInquiries.filter(i => i.status === "pending").length, color: theme.red },
                    { count: myInquiries.filter(i => i.status === "answered").length, color: theme.green },
                  ]
                },
              ]}
              active={tab} onChange={setTab} isMobile={isMobile}
            />
          </div>

          {tab === "dashboard" && (
            <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 실기실 예약 현황 */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: theme.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.door size={18} color={theme.accent} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>실기실 예약</div>
                      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                        예정된 예약 <span style={{ color: theme.accent, fontWeight: 700 }}>{upcomingReservations.length}</span>건
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setTab("room")}>예약하기 →</Button>
                </div>
                <div style={{ padding: "14px 20px" }}>
                  {upcomingReservations.length === 0 ? (
                    <div style={{ fontSize: 12, color: theme.textDim, textAlign: "center", padding: "8px 0" }}>예정된 예약이 없습니다</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {upcomingReservations.slice(0, 3).map(r => (
                        <div key={r.id} onClick={() => openRoomDetail(r)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: theme.surface, borderRadius: 8, border: `1px solid ${theme.border}`, cursor: "pointer" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{r.roomName}</div>
                            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                              📅 {r.date} · ⏰ {r.slotLabels?.[0] || ""}{r.slotLabels?.length > 1 ? ` 외 ${r.slotLabels.length - 1}타임` : ""}
                            </div>
                          </div>
                          <Badge color="green">승인</Badge>
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: theme.textDim, textAlign: "right" }}>항목 클릭 시 상세 조정</div>
                      {upcomingReservations.length > 3 && (
                        <div style={{ fontSize: 11, color: theme.textDim, textAlign: "center" }}>외 {upcomingReservations.length - 3}건 더</div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* 물품 대여 현황 */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: theme.blueBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.tool size={18} color={theme.blue} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>물품 대여</div>
                      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                        대여 중 <span style={{ color: theme.blue, fontWeight: 700 }}>{activeRentals.length}</span>건
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setTab("equipment")}>대여하기 →</Button>
                </div>
                <div style={{ padding: "14px 20px" }}>
                  {activeRentals.length === 0 ? (
                    <div style={{ fontSize: 12, color: theme.textDim, textAlign: "center", padding: "8px 0" }}>대여 중인 물품이 없습니다</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {activeRentals.slice(0, 3).map(r => (
                        <div key={r.id} onClick={() => openRentalDetail(r)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: theme.surface, borderRadius: 8, border: `1px solid ${theme.border}`, cursor: "pointer" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
                              {r.items?.map(i => `${i.icon} ${i.name}`).join(", ") || "물품"}
                            </div>
                            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                              반납 예정: {r.returnDate || "미정"}
                            </div>
                          </div>
                          <Badge color={r.status === "pending_pickup" ? "yellow" : "blue"}>
                            {r.status === "pending_pickup" ? "수령 대기" : r.status === "ready" ? "수령 완료" : r.status}
                          </Badge>
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: theme.textDim, textAlign: "right" }}>항목 클릭 시 상세 조정</div>
                      {activeRentals.length > 3 && (
                        <div style={{ fontSize: 11, color: theme.textDim, textAlign: "center" }}>외 {activeRentals.length - 3}건 더</div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* 출력 신청 현황 */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: theme.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.file size={18} color={theme.green} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>출력 신청</div>
                      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                        진행 중 <span style={{ color: theme.green, fontWeight: 700 }}>{pendingPrints.length}</span>건
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setTab("print")}>신청하기 →</Button>
                </div>
                <div style={{ padding: "14px 20px" }}>
                  {pendingPrints.length === 0 ? (
                    <div style={{ fontSize: 12, color: theme.textDim, textAlign: "center", padding: "8px 0" }}>진행 중인 출력 신청이 없습니다</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pendingPrints.slice(0, 3).map(p => (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: theme.surface, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
                              {p.paperSize} {PRINT_TYPE_LABELS[p.colorMode] || p.colorMode} × {p.copies}부{p.plus600Count > 0 ? ` (+600 x ${p.plus600Count})` : ""}
                            </div>
                            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                              💰 {(p.totalPrice || 0).toLocaleString()}원 · {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                            </div>
                          </div>
                          <Badge color={p.status === "pending" ? "yellow" : "blue"}>
                            {p.status === "pending" ? "대기" : "처리 중"}
                          </Badge>
                        </div>
                      ))}
                      {pendingPrints.length > 3 && (
                        <div style={{ fontSize: 11, color: theme.textDim, textAlign: "center" }}>외 {pendingPrints.length - 3}건 더</div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* ── 내 이용내역 ── */}
              {(() => {
                const allHistory = [...myReservations.map(r => ({ ...r, sortTime: r.createdAt })), ...myRentals.map(r => ({ ...r, sortTime: r.createdAt }))].sort((a, b) => b.sortTime.localeCompare(a.sortTime));
                return (
                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: theme.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icons.history size={18} color={theme.textMuted} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>내 이용내역</div>
                          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                            총 <span style={{ fontWeight: 700 }}>{allHistory.length}</span>건
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setTab("history")}>전체보기 →</Button>
                    </div>
                    <div style={{ padding: "14px 20px" }}>
                      {allHistory.length === 0 ? (
                        <div style={{ fontSize: 12, color: theme.textDim, textAlign: "center", padding: "8px 0" }}>이용내역이 없습니다</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {allHistory.slice(0, 4).map(item => (
                            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: theme.surface, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Badge color={item.type === "room" ? "blue" : "accent"} style={{ fontSize: 10 }}>{item.type === "room" ? "실기실" : "기구대여"}</Badge>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>
                                    {item.type === "room" ? item.roomName : item.items?.map(i => `${i.icon} ${i.name}`).join(", ")}
                                  </div>
                                  <div style={{ fontSize: 10, color: theme.textMuted }}>
                                    {item.type === "room" ? `${item.date} · ${item.slotLabels?.[0] || ""}${item.slotLabels?.length > 1 ? ` 외 ${item.slotLabels.length - 1}` : ""}` : `반납: ${item.returnDate || "미정"}`}
                                  </div>
                                </div>
                              </div>
                              <Badge color={item.status === "approved" ? "green" : item.status === "cancelled" || item.status === "rejected" ? "red" : item.status === "returned" ? "dim" : "yellow"} style={{ fontSize: 10 }}>
                                {item.status === "approved" ? "승인" : item.status === "pending_pickup" ? "수령대기" : item.status === "ready" ? "수령완료" : item.status === "cancelled" ? "취소" : item.status === "rejected" ? "반려" : item.status === "returned" ? "반납" : "대기"}
                              </Badge>
                            </div>
                          ))}
                          {allHistory.length > 4 && (
                            <div style={{ fontSize: 11, color: theme.textDim, textAlign: "center", paddingTop: 4 }}>외 {allHistory.length - 4}건 더</div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })()}

              {/* ── 문의 내역 ── */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: theme.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.file size={18} color={theme.textMuted} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>문의 내역</div>
                      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                        대기 <span style={{ color: theme.red, fontWeight: 700 }}>{myInquiries.filter(i => i.status === "pending").length}</span>건 · 답변 <span style={{ color: theme.green, fontWeight: 700 }}>{myInquiries.filter(i => i.status === "answered").length}</span>건
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setTab("inquiries")}>전체보기 →</Button>
                </div>
                <div style={{ padding: "14px 20px" }}>
                  {myInquiries.length === 0 ? (
                    <div style={{ fontSize: 12, color: theme.textDim, textAlign: "center", padding: "8px 0" }}>문의 내역이 없습니다</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {myInquiries.slice(0, 4).map(inq => (
                        <div key={inq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: theme.surface, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{inq.title}</div>
                            <div style={{ fontSize: 10, color: theme.textMuted }}>{inq.createdAt}</div>
                          </div>
                          <Badge color={inq.status === "answered" ? "green" : "yellow"} style={{ fontSize: 10 }}>
                            {inq.status === "answered" ? "답변완료" : "대기중"}
                          </Badge>
                        </div>
                      ))}
                      {myInquiries.length > 4 && (
                        <div style={{ fontSize: 11, color: theme.textDim, textAlign: "center", paddingTop: 4 }}>외 {myInquiries.length - 4}건 더</div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {tab === "room" && (
            <RoomReservation
              user={user}
              reservations={reservations}
              updateReservations={updateReservations}
              addLog={addLog}
              addNotification={addNotification}
              syncReservationToSheet={syncReservationToSheet}
              sendEmailNotification={sendEmailNotification}
              isMobile={isMobile}
            />
          )}
          {tab === "equipment" && (
            <EquipmentRental user={user} equipRentals={equipRentals} updateEquipRentals={updateEquipRentals} equipmentDB={equipmentDB} setEquipmentDB={setEquipmentDB} addLog={addLog} addNotification={addNotification} sendEmailNotification={sendEmailNotification} isMobile={isMobile} />
          )}
          {tab === "print" && (
            <PrintRequest user={user} printRequests={myPrintRequests} updatePrintRequests={updatePrintRequests} addLog={addLog} addNotification={addNotification} syncPrintToSheet={syncPrintToSheet} sendEmailNotification={sendEmailNotification} isMobile={isMobile} />
          )}
          {tab === "history" && (
            <StudentHistory user={user} reservations={reservations} equipRentals={equipRentals} updateReservations={updateReservations} sendEmailNotification={sendEmailNotification} addLog={addLog} addNotification={addNotification} />
          )}
          {tab === "inquiries" && (
            <StudentInquiries user={user} inquiries={myInquiries} updateInquiries={updateInquiries} />
          )}
        </>
      )}

      {dashboardDetail && (
        <div
          onClick={closeDashboardDetail}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Card onClick={e => e.stopPropagation()} style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: theme.text }}>
                {dashboardDetail.type === "room" ? "실기실 예약 상세 조정" : "물품 대여 상세 조정"}
              </div>
              <Button variant="ghost" size="sm" onClick={closeDashboardDetail}><Icons.x size={14} /></Button>
            </div>

            {selectedRoomReservation && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card style={{ background: theme.surface, padding: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{selectedRoomReservation.roomName}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                    {selectedRoomReservation.date} · {selectedRoomReservation.slotLabels?.join(", ")}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>
                    목적: {selectedRoomReservation.purpose || "개인 작업"} · 인원: {selectedRoomReservation.members || 1}명
                  </div>
                </Card>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 4 }}>
                  <Button size="sm" variant="ghost" onClick={closeDashboardDetail}>닫기</Button>
                  {canCancelRoomReservation(selectedRoomReservation) && (
                    <Button size="sm" variant="danger" onClick={handleCancelRoomReservation} disabled={detailSubmitting}>예약 취소</Button>
                  )}
                </div>
              </div>
            )}

            {selectedRental && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card style={{ background: theme.surface, padding: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
                    {selectedRental.items?.map(i => `${i.icon} ${i.name}`).join(", ")}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                    상태: {selectedRental.status} · 신청일: {selectedRental.createdAt?.slice(0, 10)}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                    반납예정일: {selectedRental.returnDate || "미정"}
                  </div>
                </Card>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 4 }}>
                  <Button size="sm" variant="ghost" onClick={closeDashboardDetail}>닫기</Button>
                  <Button size="sm" variant="danger" onClick={handleCancelRentalReservation} disabled={detailSubmitting || !canCancelRentalReservation(selectedRental)}>예약 취소</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default StudentPortal;
