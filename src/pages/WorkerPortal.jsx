import { useState, useEffect, useCallback } from "react";
import theme from "../constants/theme";
import Icons from "../components/Icons";
import { Badge, Button, Tabs } from "../components/ui";
import WorkerDashboard from "../features/WorkerDashboard";
import PrintManagement from "../features/PrintManagement";
import InquiriesPanel from "../features/InquiriesPanel";
import LogViewer from "../features/LogViewer";

function WorkerPortal({ user, onLogout, reservations, updateReservations, equipRentals, updateEquipRentals, logs, addLog, notifications, markNotifRead, markAllNotifsRead, unreadCount, sendEmailNotification, inquiries, updateInquiries, printRequests, updatePrintRequests, visitCount, analyticsData, dailyVisits, isMobile, isDark, toggleDark }) {
  const [tab, setTabRaw] = useState("dashboard");
  const setTab = useCallback((newTab) => {
    setTabRaw(prev => {
      if (prev !== newTab) history.pushState({ page: "worker", tab: newTab }, "");
      return newTab;
    });
  }, []);
  useEffect(() => {
    const onPopState = (e) => {
      const s = e.state;
      if (s?.page === "worker") setTabRaw(s.tab || "dashboard");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const pendingInquiries = inquiries?.filter(i => i.status === "pending")?.length || 0;
  const pendingPrints = printRequests?.filter(p => p.status === "pending" || p.status === "processing")?.length || 0;

  return (
    <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 0 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Worker Portal</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>관리 대시보드</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Badge color="accent">{user.name}</Badge>
            <Badge color="dim">{user.shift}</Badge>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={toggleDark}>{isDark ? <Icons.sun size={15} /> : <Icons.moon size={15} />}</Button>
          <Button variant="ghost" size="sm" onClick={onLogout}><Icons.logout size={15} /> 나가기</Button>
        </div>
      </div>

      <div style={{ paddingTop: 24 }}>
        <Tabs
          tabs={[
            { id: "dashboard", label: "대시보드", icon: <Icons.home size={15} />, badge: unreadCount },
            { id: "print", label: "출력 관리", icon: <Icons.file size={15} />, badge: pendingPrints },
            { id: "inquiries", label: "문의", icon: <Icons.file size={15} />, badge: pendingInquiries },
            { id: "logs", label: "일지", icon: <Icons.log size={15} /> },
          ]}
          active={tab} onChange={setTab} isMobile={isMobile}
        />
      </div>

      {tab === "dashboard" && (
        <WorkerDashboard
          reservations={reservations} updateReservations={updateReservations}
          equipRentals={equipRentals} updateEquipRentals={updateEquipRentals}
          notifications={notifications} markNotifRead={markNotifRead} markAllNotifsRead={markAllNotifsRead}
          unreadCount={unreadCount} addLog={addLog} workerName={user.name}
          sendEmailNotification={sendEmailNotification}
          printRequests={printRequests}
          visitCount={visitCount}
          dailyVisits={dailyVisits}
          isMobile={isMobile}
        />
      )}
      {tab === "print" && (
        <PrintManagement printRequests={printRequests} updatePrintRequests={updatePrintRequests} addLog={addLog} workerName={user.name} sendEmailNotification={sendEmailNotification} />
      )}
      {tab === "inquiries" && (
        <InquiriesPanel inquiries={inquiries} updateInquiries={updateInquiries} workerName={user.name} addLog={addLog} />
      )}
      {tab === "logs" && (
        <LogViewer logs={logs} addLog={addLog} />
      )}
    </div>
  );
}

export default WorkerPortal;
