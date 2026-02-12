import { useState, useEffect, useCallback, useMemo } from "react";
import supabaseStore, { printStorage } from "./supabase";
import { EDITABLE, ROOMS, DEFAULT_EQUIPMENT_DB, DEFAULT_WORKERS } from "./constants/data";
import theme, { darkColors, lightColors } from "./constants/theme";
import { uid, ts, dateStr, ACTIVE_PORTAL_SESSION_KEY } from "./utils/helpers";
import store from "./utils/storage";
import PortalLoadingScreen from "./components/PortalLoadingScreen";
import LoginPage from "./pages/LoginPage";
import StudentPortal from "./pages/StudentPortal";
import WorkerPortal from "./pages/WorkerPortal";
import AdminPortal from "./pages/AdminPortal";

// ════════════════════════════════════════════════════════════════
//  국민대학교 건축대학 포털사이트 v1.0
// ════════════════════════════════════════════════════════════════

export default function App() {
  // ─── Global State ──────────────────────────────────────────────
  const [page, setPage] = useState("login"); // login | student | worker | admin
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // student | worker | admin
  const [rememberSession, setRememberSession] = useState(true);
  const [savedCredentials, setSavedCredentials] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("theme-mode") === "dark"; } catch { return false; }
  });
  const toggleDark = useCallback(() => setIsDark(p => !p), []);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    try { localStorage.setItem("theme-mode", isDark ? "dark" : "light"); } catch { }
  }, [isDark]);

  // ─── Browser History (back/forward) ────────────────────────────
  useEffect(() => {
    history.replaceState({ page: "login" }, "");
  }, []);

  useEffect(() => {
    const onPopState = (e) => {
      const state = e.state;
      if (!state || state.page === "login") {
        setCurrentUser(null);
        setUserRole(null);
        setPage("login");
        try { sessionStorage.removeItem(ACTIVE_PORTAL_SESSION_KEY); } catch { }
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ─── Data State (persistent) ───────────────────────────────────
  const [reservations, setReservations] = useState([]);
  const [equipRentals, setEquipRentals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [workers, setWorkers] = useState(DEFAULT_WORKERS);
  const [sheetConfig, setSheetConfig] = useState({
    reservationWebhookUrl: "https://script.google.com/macros/s/AKfycbwyzzFFUQRLjITW6D6YVw4RzVoB4ye80-tb7Tsan4RspCPAIdq3pV4C9_ixeGp6Hdotpg/exec",
    printWebhookUrl: "https://script.google.com/macros/s/AKfycbxoF7nFIP6neZjGegxwwMYZn5FIt2nXsoPsXUIsWxv5nqmcglf7i9K34PcgL2XutNwD/exec"
  });
  const [overdueFlags, setOverdueFlags] = useState({});
  const [warnings, setWarnings] = useState({});
  const [blacklist, setBlacklist] = useState({});
  const [certificates, setCertificates] = useState({});
  const [inquiries, setInquiries] = useState([]);
  const [printRequests, setPrintRequests] = useState([]); // 출력 신청 데이터
  const [visitCount, setVisitCount] = useState(0); // 홈페이지 방문 횟수 (로그인 기반)
  const [analyticsData, setAnalyticsData] = useState(null); // 관리 대시보드 analytics 스냅샷
  const [visitedUsers, setVisitedUsers] = useState({}); // 방문한 고유 사용자 목록
  const [dailyVisits, setDailyVisits] = useState({}); // 일별 방문자 수 { "2026-02-11": 5, ... }
  const [dataLoaded, setDataLoaded] = useState(false);

  // ─── Community & Exhibition (shared between LoginPage & AdminPortal) ──
  const defaultPosts = useMemo(() => [
    {
      id: "c1", content: "레이저컷터 사용법 알려줄 분 계신가요?", createdAt: "2026-02-07T10:30:00", comments: [
        { id: "cm1", content: "유튜브에 튜토리얼 많아요!", createdAt: "2026-02-07T11:00:00" },
        { id: "cm2", content: "조교실에 문의하시면 교육받으실 수 있어요", createdAt: "2026-02-07T12:30:00" },
      ]
    },
    {
      id: "c2", content: "4학년 졸업전시 준비하시는 분들 화이팅!", createdAt: "2026-02-06T15:20:00", comments: [
        { id: "cm3", content: "감사합니다 ㅠㅠ", createdAt: "2026-02-06T16:00:00" },
      ]
    },
    { id: "c3", content: "실기실 예약 시스템 너무 편하네요 ㅎㅎ", createdAt: "2026-02-05T09:15:00", comments: [] },
  ], []);
  const [communityPosts, setCommunityPostsRaw] = useState(defaultPosts);
  const setCommunityPosts = useCallback((updater) => {
    setCommunityPostsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      store.set("communityPosts", next);
      return next;
    });
  }, []);
  const defaultExhibitionPosts = useMemo(() => [{
    id: "exh1", title: "archi.zip", description: "건축을 구성하는 작은 요소들에 대해",
    dates: "2026.02.05 ~ 02.09", location: "레드로드예술실험센터",
    instagramUrl: "https://www.instagram.com/archi.zip_kmu", posterUrl: "/archzip_poster.jpeg",
    createdAt: "2026-02-01T00:00:00",
  }], []);
  const [exhibitionPosts, setExhibitionPostsRaw] = useState(defaultExhibitionPosts);
  const setExhibitionPosts = useCallback((updater) => {
    setExhibitionPostsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      store.set("exhibitionPosts", next);
      return next;
    });
  }, []);
  const [equipmentDB, setEquipmentDBRaw] = useState(DEFAULT_EQUIPMENT_DB);
  const setEquipmentDB = useCallback((updater) => {
    setEquipmentDBRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      store.set("equipmentDB", next);
      return next;
    });
  }, []);

  // ─── Load persisted data ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // 1단계: 로그인 화면에 꼭 필요한 2개만 먼저 로드 → 즉시 화면 표시
        const [session, remember] = await Promise.all([
          store.get("session"),
          store.get("rememberSession"),
        ]);

        const rememberPref = remember ?? true;
        setRememberSession(rememberPref);

        // 새로고침 시 현재 포털 화면 유지 (브라우저 탭 단위 세션)
        try {
          const rawSession = sessionStorage.getItem(ACTIVE_PORTAL_SESSION_KEY);
          if (rawSession) {
            const parsedSession = JSON.parse(rawSession);
            if (parsedSession?.user && ["student", "worker", "admin"].includes(parsedSession?.role)) {
              setCurrentUser(parsedSession.user);
              setUserRole(parsedSession.role);
              setPage(parsedSession.role);
            }
          }
        } catch { }

        if (rememberPref && session?.user && session?.role) {
          setSavedCredentials({ user: session.user, role: session.role });
        }

        setDataLoaded(true);

        // 2단계: 나머지 데이터 백그라운드 로드 (화면 표시 후)
        const [wk, warn, blk, certs, res, eq, lg, notif, sheet, overdue, inq, prints, visits, visitors, analytics, cmPosts, exhPosts, exhDataOld, eqDB, dVisits] = await Promise.all([
          store.get("workers"),
          store.get("warnings"),
          store.get("blacklist"),
          store.get("certificates"),
          store.get("reservations"),
          store.get("equipRentals"),
          store.get("logs"),
          store.get("notifications"),
          store.get("sheetConfig"),
          store.get("overdueFlags"),
          store.get("inquiries"),
          store.get("printRequests"),
          store.get("visitCount"),
          store.get("visitedUsers"),
          store.get("analyticsData"),
          store.get("communityPosts"),
          store.get("exhibitionPosts"),
          store.get("exhibitionData"),
          store.get("equipmentDB"),
          store.get("dailyVisits"),
        ]);
        if (Array.isArray(wk) && wk.length > 0) {
          setWorkers(wk);
        } else {
          setWorkers(DEFAULT_WORKERS);
          store.set("workers", DEFAULT_WORKERS).catch(() => { });
        }
        if (warn) setWarnings(warn);
        if (blk) setBlacklist(blk);
        if (certs) setCertificates(certs);
        if (res) setReservations(res);
        if (eq) setEquipRentals(eq);
        if (lg) setLogs(lg);
        if (notif) setNotifications(notif);
        if (sheet) setSheetConfig(sheet);
        if (overdue) setOverdueFlags(overdue);
        if (inq) setInquiries(inq);
        if (prints) setPrintRequests(prints);
        if (visits) setVisitCount(visits);
        if (visitors) setVisitedUsers(visitors);
        if (dVisits) setDailyVisits(dVisits);
        if (analytics) setAnalyticsData(analytics);
        if (cmPosts) setCommunityPostsRaw(cmPosts); else store.set("communityPosts", defaultPosts);
        if (exhPosts) {
          setExhibitionPostsRaw(exhPosts);
        } else if (exhDataOld) {
          const migrated = [{ ...exhDataOld, id: `exh${Date.now()}`, createdAt: new Date().toISOString() }];
          setExhibitionPostsRaw(migrated);
          store.set("exhibitionPosts", migrated);
        } else {
          store.set("exhibitionPosts", defaultExhibitionPosts);
        }
        if (eqDB) {
          // 저장된 물품 DB의 ID 목록과 기본 물품 DB의 ID 목록이 다르면 코드가 업데이트된 것이므로 새 목록 사용
          const savedIds = eqDB.map(e => e.id).sort().join(",");
          const defaultIds = DEFAULT_EQUIPMENT_DB.map(e => e.id).sort().join(",");
          if (savedIds !== defaultIds) {
            setEquipmentDBRaw(DEFAULT_EQUIPMENT_DB);
            store.set("equipmentDB", DEFAULT_EQUIPMENT_DB);
          } else {
            setEquipmentDBRaw(eqDB);
          }
        }
      } catch (error) {
        console.error("Initial data load failed:", error);
        setDataLoaded(true);
      }
    })();
  }, []);

  // 근로학생 계정은 서버 데이터(portal/workers)를 기준으로 실시간 동기화
  useEffect(() => {
    const unsubscribe = supabaseStore.subscribe("portal/workers", (serverWorkers) => {
      if (Array.isArray(serverWorkers)) {
        setWorkers(serverWorkers);
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // 출력 신청 데이터 실시간 동기화
  useEffect(() => {
    // 초기 로드: 서버 데이터가 있으면 서버 기준으로 동기화
    supabaseStore.get("portal/printRequests").then(serverData => {
      if (Array.isArray(serverData) && serverData.length > 0) {
        setPrintRequests(serverData);
        store.set("printRequests", serverData).catch(() => { });
      }
    });

    const unsubscribe = supabaseStore.subscribe("portal/printRequests", (serverData) => {
      if (Array.isArray(serverData)) {
        setPrintRequests(serverData);
        store.set("printRequests", serverData).catch(() => { });
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // ─── Persist helpers ───────────────────────────────────────────
  const persist = useCallback(async (key, data) => { await store.set(key, data); }, []);

  const addLog = useCallback((action, type, extra = {}) => {
    setLogs(prev => {
      const next = [{ id: uid(), time: ts(), action, type, ...extra }, ...prev].slice(0, 500);
      persist("logs", next);
      return next;
    });
  }, [persist]);

  const addNotification = useCallback((text, type = "info", urgent = false) => {
    setNotifications(prev => {
      const next = [{ id: uid(), text, type, urgent, read: false, time: ts() }, ...prev].slice(0, 200);
      persist("notifications", next);
      return next;
    });
  }, [persist]);

  const updateReservations = useCallback((updater) => {
    setReservations(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("reservations", next);
      return next;
    });
  }, [persist]);

  const updateEquipRentals = useCallback((updater) => {
    setEquipRentals(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("equipRentals", next);
      return next;
    });
  }, [persist]);

  const updateWorkers = useCallback((updater) => {
    setWorkers(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("workers", next);
      return next;
    });
  }, [persist]);

  const updateSheetConfig = useCallback((updater) => {
    setSheetConfig(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("sheetConfig", next);
      return next;
    });
  }, [persist]);

  const updateOverdueFlags = useCallback((updater) => {
    setOverdueFlags(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("overdueFlags", next);
      return next;
    });
  }, [persist]);

  const updateWarnings = useCallback((updater) => {
    setWarnings(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("warnings", next);
      return next;
    });
  }, [persist]);

  const updateBlacklist = useCallback((updater) => {
    setBlacklist(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("blacklist", next);
      return next;
    });
  }, [persist]);

  const updateCertificates = useCallback((updater) => {
    setCertificates(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("certificates", next);
      return next;
    });
  }, [persist]);

  const updateInquiries = useCallback((updater) => {
    setInquiries(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("inquiries", next);
      return next;
    });
  }, [persist]);

  const updatePrintRequests = useCallback((updater) => {
    setPrintRequests(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("printRequests", next);
      supabaseStore.set("portal/printRequests", next).catch(() => { });
      return next;
    });
  }, [persist]);
  // Auto-prune old student history records to reduce stored data size.
  useEffect(() => {
    if (!dataLoaded) return;

    const safeReservations = Array.isArray(reservations) ? reservations : [];
    const safeEquipRentals = Array.isArray(equipRentals) ? equipRentals : [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isExpiredAfter7Days = (baseDateStr) => {
      if (!baseDateStr) return false;
      const base = new Date(`${baseDateStr}T00:00:00`);
      if (Number.isNaN(base.getTime())) return false;
      base.setDate(base.getDate() + 7);
      return today >= base;
    };

    const nextReservations = safeReservations.filter(r => !isExpiredAfter7Days(r?.date));

    const nextEquipRentals = safeEquipRentals.filter(r => {
      const terminal = ["returned", "cancelled"].includes(r?.status);
      if (!terminal) return true;
      const baseDate =
        (typeof r?.returnDate === "string" && r.returnDate.length >= 10 && r.returnDate.slice(0, 10)) ||
        (typeof r?.returnedAt === "string" && r.returnedAt.length >= 10 && r.returnedAt.slice(0, 10)) ||
        (typeof r?.cancelledAt === "string" && r.cancelledAt.length >= 10 && r.cancelledAt.slice(0, 10)) ||
        (typeof r?.createdAt === "string" && r.createdAt.length >= 10 && r.createdAt.slice(0, 10)) ||
        null;
      return !isExpiredAfter7Days(baseDate);
    });

    if (nextReservations.length !== safeReservations.length || !Array.isArray(reservations)) {
      updateReservations(nextReservations);
    }
    if (nextEquipRentals.length !== safeEquipRentals.length || !Array.isArray(equipRentals)) {
      updateEquipRentals(nextEquipRentals);
    }
  }, [dataLoaded, reservations, equipRentals, updateReservations, updateEquipRentals]);

  // 관리 대시보드 analytics 스냅샷 저장
  useEffect(() => {
    if (!dataLoaded) return;
    const totalReservations = reservations.length;
    const completedReservations = reservations.filter(r => r.status === "approved" || r.status === "completed").length;
    const cancelledReservations = reservations.filter(r => r.status === "cancelled" || r.status === "rejected").length;
    const pendingReservations = reservations.filter(r => r.status === "pending").length;
    const totalRentals = equipRentals.length;
    const returnedRentals = equipRentals.filter(r => r.status === "returned").length;
    const pendingPrints = (printRequests || []).filter(p => p.status === "pending" || p.status === "processing").length;

    const roomStats = ROOMS.map(room => ({
      roomId: room.id,
      roomName: room.name,
      count: reservations.filter(r => r.roomId === room.id && r.status === "approved").length,
    }));

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const dailyStats = last7Days.map(date => ({
      date,
      count: reservations.filter(r => r.date === date && r.status === "approved").length,
    }));

    const snapshot = {
      updatedAt: new Date().toISOString(),
      totals: {
        totalReservations,
        completedReservations,
        cancelledReservations,
        pendingReservations,
        totalRentals,
        returnedRentals,
        pendingPrints,
        visitCount: visitCount || 0,
      },
      roomStats,
      dailyStats,
    };
    setAnalyticsData(snapshot);
    store.set("analyticsData", snapshot).catch(() => { });
  }, [dataLoaded, reservations, equipRentals, printRequests, visitCount]);

  const markNotifRead = useCallback((id) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      persist("notifications", next);
      return next;
    });
  }, [persist]);

  const markAllNotifsRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      persist("notifications", next);
      return next;
    });
  }, [persist]);

  const verifyStudentInSheet = useCallback(async (studentId, studentName) => {
    const cfg = EDITABLE?.safetySheet;
    const url = cfg?.url?.trim();
    if (!url) return { ok: false, error: "연동 URL이 설정되지 않았습니다." };
    const payload = {
      action: "verify_student",
      key: EDITABLE.apiKey,
      studentId: studentId?.trim(),
      studentName: studentName?.trim(),
      sheetName: cfg?.sheetName,
      columns: cfg?.columns,
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = null; }
      if (!res.ok) return { ok: false, error: data?.error || text || `HTTP ${res.status}` };
      if (!data) return { ok: false, error: "응답 형식 오류" };
      if (!data.found) return { ok: false, error: "안전교육 이수자 명단에 없습니다." };
      return { ok: true, student: data.student || {}, safetyTrained: data.safetyTrained ?? true };
    } catch (err) {
      // POST 실패 시 GET 방식으로 재시도 (preflight/CORS 우회)
      try {
        const params = new URLSearchParams({
          action: "verify_student",
          key: EDITABLE.apiKey,
          studentId: payload.studentId || "",
          studentName: payload.studentName || "",
          sheetName: payload.sheetName || "",
        });
        const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch { data = null; }
        if (!res.ok) return { ok: false, error: data?.error || text || `HTTP ${res.status}` };
        if (!data) return { ok: false, error: "응답 형식 오류" };
        if (!data.found) return { ok: false, error: "안전교육 이수자 명단에 없습니다." };
        return { ok: true, student: data.student || {}, safetyTrained: data.safetyTrained ?? true };
      } catch (err2) {
        return { ok: false, error: err2?.message || err?.message || "연동 실패" };
      }
    }
  }, []);

  const sendEmailNotification = useCallback(async ({ to, subject, body }) => {
    const cfg = EDITABLE?.emailNotify;
    if (!cfg?.enabled) return { skipped: true };
    const url = cfg?.url?.trim();
    if (!url) return { skipped: true };
    // to 파라미터가 있으면 해당 이메일로, 없으면 기본 recipients로 발송
    const recipients = to || (Array.isArray(cfg?.recipients) ? cfg.recipients.join(",") : String(cfg?.recipients || ""));
    if (!recipients) return { skipped: true };
    try {
      const payload = {
        action: "send_email",
        key: EDITABLE.apiKey,
        to: recipients,
        subject,
        body,
        senderName: "건축대학 교학팀",
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true };
    } catch (err) {
      // CORS  우회: no-cors POST → 실패 시 GET
      try {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "send_email", key: EDITABLE.apiKey, to: recipients, subject, body, senderName: "건축대학 교학팀" }),
        });
        return { ok: true, opaque: true };
      } catch (err2) {
        try {
          const params = new URLSearchParams({
            action: "send_email",
            to: recipients,
            subject: subject || "",
            body: body || "",
          });
          await fetch(`${url}?${params.toString()}`, { method: "GET" });
          return { ok: true, fallback: "get" };
        } catch (err3) {
          return { ok: false, error: err3?.message || err2?.message || err?.message || "email_failed" };
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!equipRentals?.length) return;
    const today = dateStr();
    const newFlags = { ...overdueFlags };
    let changed = false;
    equipRentals.forEach(r => {
      if (r.status === "returned" || r.status === "cancelled") return;
      if (r.returnDate && r.returnDate < today) {
        if (!newFlags[r.id]) {
          newFlags[r.id] = true;
          changed = true;
          addNotification(`⏰ 연체 알림: ${r.studentName} → ${r.items?.map(i => i.name).join(", ")} (반납일 ${r.returnDate})`, "equipment", true);
          addLog(`[연체] ${r.studentName}(${r.studentId}) → ${r.items?.map(i => i.name).join(", ")} | 반납일 ${r.returnDate}`, "equipment", { studentId: r.studentId });
          sendEmailNotification({
            subject: `[연체 알림] ${r.studentName} · 기구 반납 지연`,
            body: [
              "물품 대여 반납 기한이 지났습니다.",
              "",
              "[대여 정보]",
              `- 학생: ${r.studentName} (${r.studentId})`,
              `- 전공/학년: ${r.studentDept || "-"}`,
              `- 대여 품목: ${r.items?.map(i => i.name).join(", ")}`,
              `- 반납 예정일: ${r.returnDate}`,
              "",
              "즉시 반납 안내 부탁드립니다.",
              "국민대학교 건축대학 교학팀",
            ].join("\n"),
          });
        }
      }
    });
    if (changed) updateOverdueFlags(newFlags);
  }, [equipRentals, overdueFlags, addNotification, addLog, sendEmailNotification, updateOverdueFlags]);

  const syncReservationToSheet = useCallback(async (reservation) => {
    const url = sheetConfig?.reservationWebhookUrl?.trim();
    if (!url) return { skipped: true };
    try {
      const payload = {
        event: "room_reservation",
        key: EDITABLE.apiKey,
        data: {
          id: reservation.id,
          studentId: reservation.studentId,
          studentName: reservation.studentName,
          studentDept: reservation.studentDept,
          roomId: reservation.roomId,
          roomName: reservation.roomName,
          date: reservation.date,
          slots: reservation.slots,
          slotLabels: reservation.slotLabels,
          purpose: reservation.purpose,
          members: reservation.members,
          status: reservation.status,
          createdAt: reservation.createdAt,
        },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true };
    } catch (err) {
      try {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            event: "room_reservation",
            key: EDITABLE.apiKey,
            data: {
              id: reservation.id,
              studentId: reservation.studentId,
              studentName: reservation.studentName,
              studentDept: reservation.studentDept,
              roomId: reservation.roomId,
              roomName: reservation.roomName,
              date: reservation.date,
              slots: reservation.slots,
              slotLabels: reservation.slotLabels,
              purpose: reservation.purpose,
              members: reservation.members,
              status: reservation.status,
              createdAt: reservation.createdAt,
            },
          }),
        });
        return { ok: true, opaque: true };
      } catch (err2) {
        addLog(`[구글시트 연동 실패] ${reservation.studentName}(${reservation.studentId}) → ${reservation.roomName} ${reservation.date}`, "reservation");
        return { ok: false, error: err2?.message || err?.message || "unknown" };
      }
    }
  }, [sheetConfig, addLog]);

  // 출력 신청 → 구글 시트 연동
  const syncPrintToSheet = useCallback(async (printRequest) => {
    const url = sheetConfig?.printWebhookUrl?.trim();
    if (!url) return { skipped: true };
    try {
      const payload = {
        event: "print_request",
        key: EDITABLE.apiKey,
        data: {
          id: printRequest.id,
          studentId: printRequest.studentId,
          studentName: printRequest.studentName,
          studentDept: printRequest.studentDept,
          paperSize: printRequest.paperSize,
          colorMode: printRequest.colorMode,
          copies: printRequest.copies,
          plus600Count: printRequest.plus600Count || 0,
          plus600UnitPrice: printRequest.plus600UnitPrice || 0,
          plus600Price: printRequest.plus600Price || 0,
          unitPrice: printRequest.unitPrice,
          totalPrice: printRequest.totalPrice,
          fileName: printRequest.printFile?.name || "",
          status: printRequest.status,
          createdAt: printRequest.createdAt,
        },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true };
    } catch (err) {
      try {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            event: "print_request",
            key: EDITABLE.apiKey,
            data: {
              id: printRequest.id,
              studentId: printRequest.studentId,
              studentName: printRequest.studentName,
              studentDept: printRequest.studentDept,
              paperSize: printRequest.paperSize,
              colorMode: printRequest.colorMode,
              copies: printRequest.copies,
              plus600Count: printRequest.plus600Count || 0,
              plus600UnitPrice: printRequest.plus600UnitPrice || 0,
              plus600Price: printRequest.plus600Price || 0,
              unitPrice: printRequest.unitPrice,
              totalPrice: printRequest.totalPrice,
              fileName: printRequest.printFile?.name || "",
              status: printRequest.status,
              createdAt: printRequest.createdAt,
            },
          }),
        });
        return { ok: true, opaque: true };
      } catch (err2) {
        addLog(`[출력 시트 연동 실패] ${printRequest.studentName}(${printRequest.studentId})`, "print");
        return { ok: false, error: err2?.message || err?.message || "unknown" };
      }
    }
  }, [sheetConfig, addLog]);

  // ─── Archive prints to Google Drive ──────────────────────────
  const archivePrintsToDrive = useCallback(async (requestsToArchive) => {
    const cfg = EDITABLE?.printArchive;
    const gasUrl = cfg?.gasUrl?.trim();
    if (!gasUrl) return { ok: false, error: "printArchive.gasUrl이 설정되지 않았습니다." };

    const results = [];
    for (const req of requestsToArchive) {
      // Build date folder from createdAt (YY.MM.DD)
      const dateFolder = req.createdAt
        ? new Date(req.createdAt).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "")
        : new Date().toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");

      const studentLabel = `${req.studentId || "unknown"}+${req.studentName || "unknown"}`;

      // Archive print file
      if (req.printFile?.storagePath) {
        const ext = (req.printFile.name || "file").split(".").pop() || "bin";
        const archiveName = `[출력파일]${studentLabel}.${ext}`;
        try {
          const signedUrl = await printStorage.getSignedUrl(req.printFile.storagePath, 600);
          if (!signedUrl) { results.push({ id: req.id, file: "printFile", ok: false, error: "signed URL 생성 실패" }); continue; }
          const res = await archiveFileToGAS(gasUrl, signedUrl, archiveName, dateFolder, cfg.folderName);
          results.push({ id: req.id, file: "printFile", ...res });
        } catch (err) {
          results.push({ id: req.id, file: "printFile", ok: false, error: err?.message || "unknown" });
        }
      }

      // Archive payment proof
      if (req.paymentProof?.storagePath) {
        const ext = (req.paymentProof.name || req.paymentProof.storagePath || "img").split(".").pop() || "jpg";
        const archiveName = `[입금내역]${studentLabel}.${ext}`;
        try {
          const signedUrl = await printStorage.getSignedUrl(req.paymentProof.storagePath, 600);
          if (!signedUrl) { results.push({ id: req.id, file: "paymentProof", ok: false, error: "signed URL 생성 실패" }); continue; }
          const res = await archiveFileToGAS(gasUrl, signedUrl, archiveName, dateFolder, cfg.folderName);
          results.push({ id: req.id, file: "paymentProof", ...res });
        } catch (err) {
          results.push({ id: req.id, file: "paymentProof", ok: false, error: err?.message || "unknown" });
        }
      }
    }

    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      console.warn("Archive failures:", failed);
      return { ok: false, error: `${failed.length}건 아카이브 실패`, details: failed };
    }
    return { ok: true, results };
  }, []);

  // Helper: send one file to GAS for Drive archival (reuses existing no-cors fallback pattern)
  async function archiveFileToGAS(gasUrl, signedUrl, fileName, dateFolder, folderName) {
    const payload = {
      action: "archive_print",
      key: EDITABLE.apiKey,
      fileUrl: signedUrl,
      fileName,
      dateFolder,
      folderName,
    };
    try {
      const res = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = null; }
      if (!res.ok) return { ok: false, error: data?.error || text || `HTTP ${res.status}` };
      if (data?.ok || data?.success) return { ok: true };
      return { ok: true, data };
    } catch {
      // CORS fallback: no-cors POST
      try {
        await fetch(gasUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        return { ok: true, opaque: true };
      } catch (err2) {
        return { ok: false, error: err2?.message || "archive_failed" };
      }
    }
  }

  // ─── Auth ──────────────────────────────────────────────────────
  const updateRememberSession = useCallback(async (val) => {
    setRememberSession(val);
    await store.set("rememberSession", val);
    if (!val) await store.set("session", null);
  }, []);

  const handleLogin = async (user, role) => {
    setCurrentUser(user);
    setUserRole(role);
    setPage(role);
    history.pushState({ page: role }, "");
    try {
      sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, JSON.stringify({ user, role, loggedAt: Date.now() }));
    } catch { }
    if (rememberSession) store.set("session", { user, role, page: role });
    else store.set("session", null);

    // 학생 로그인 시 방문 횟수 증가 (로그인할 때마다 +1)
    if (role === "student" && user?.id) {
      const currentCount = await store.get("visitCount") || 0;
      const newCount = currentCount + 1;
      setVisitCount(newCount);
      await store.set("visitCount", newCount);

      // 일별 방문자 수 기록
      const todayKey = dateStr();
      const currentDailyVisits = await store.get("dailyVisits") || {};
      const updatedDailyVisits = { ...currentDailyVisits, [todayKey]: (currentDailyVisits[todayKey] || 0) + 1 };
      setDailyVisits(updatedDailyVisits);
      await store.set("dailyVisits", updatedDailyVisits);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setPage("login");
    history.pushState({ page: "login" }, "");
    try {
      sessionStorage.removeItem(ACTIVE_PORTAL_SESSION_KEY);
    } catch { }
    if (!rememberSession) store.set("session", null);
  };

  // ─── Reset data ────────────────────────────────────────────────
  const resetAllData = async () => {
    const empty = [];
    setReservations(empty); setEquipRentals(empty); setLogs(empty); setNotifications(empty);
    setWorkers(DEFAULT_WORKERS);
    await Promise.all([
      persist("reservations", empty), persist("equipRentals", empty),
      persist("logs", empty), persist("notifications", empty),
      persist("workers", DEFAULT_WORKERS),
    ]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!dataLoaded) return <PortalLoadingScreen isDark={isDark} />;

  // Apply theme colors based on dark/light mode
  Object.assign(theme, isDark ? darkColors : lightColors);

  return (
    <div style={{ fontFamily: theme.font, background: theme.bg, color: theme.text, minHeight: "100vh", transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Noto+Sans+KR:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.bg}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        ::selection { background: ${theme.accent}; color: ${isDark ? '#000' : '#fff'}; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(${isDark ? 0.7 : 0}); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        .slide-in { animation: slideIn 0.25s ease forwards; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: isMobile ? "0 10px" : "0 16px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {page === "login" && (
          <LoginPage
            onLogin={handleLogin}
            onReset={resetAllData}
            workers={workers}
            verifyStudentInSheet={verifyStudentInSheet}
            rememberSession={rememberSession}
            onRememberSessionChange={updateRememberSession}
            blacklist={blacklist}
            warnings={warnings}
            certificates={certificates}
            updateCertificates={updateCertificates}
            inquiries={inquiries}
            updateInquiries={updateInquiries}
            savedCredentials={savedCredentials}
            communityPosts={communityPosts}
            setCommunityPosts={setCommunityPosts}
            exhibitionPosts={exhibitionPosts}
            isMobile={isMobile}
            isDark={isDark} toggleDark={toggleDark}
          />
        )}
        {page === "student" && (
          <StudentPortal
            user={currentUser} onLogout={handleLogout}
            reservations={reservations} updateReservations={updateReservations}
            equipRentals={equipRentals} updateEquipRentals={updateEquipRentals}
            equipmentDB={equipmentDB} setEquipmentDB={setEquipmentDB}
            addLog={addLog} addNotification={addNotification}
            syncReservationToSheet={syncReservationToSheet}
            syncPrintToSheet={syncPrintToSheet}
            sendEmailNotification={sendEmailNotification}
            warnings={warnings}
            inquiries={inquiries}
            updateInquiries={updateInquiries}
            printRequests={printRequests}
            updatePrintRequests={updatePrintRequests}
            isMobile={isMobile}
            isDark={isDark} toggleDark={toggleDark}
          />
        )}
        {page === "worker" && (
          <WorkerPortal
            user={currentUser} onLogout={handleLogout}
            reservations={reservations} updateReservations={updateReservations}
            equipRentals={equipRentals} updateEquipRentals={updateEquipRentals}
            equipmentDB={equipmentDB} setEquipmentDB={setEquipmentDB}
            logs={logs} addLog={addLog}
            notifications={notifications} markNotifRead={markNotifRead} markAllNotifsRead={markAllNotifsRead}
            unreadCount={unreadCount}
            sendEmailNotification={sendEmailNotification}
            inquiries={inquiries} updateInquiries={updateInquiries}
            printRequests={printRequests} updatePrintRequests={updatePrintRequests}
            archivePrintsToDrive={archivePrintsToDrive}
            visitCount={visitCount}
            analyticsData={analyticsData}
            dailyVisits={dailyVisits}
            isMobile={isMobile}
            isDark={isDark} toggleDark={toggleDark}
          />
        )}
        {page === "admin" && (
          <AdminPortal
            onLogout={handleLogout}
            reservations={reservations} updateReservations={updateReservations}
            workers={workers} updateWorkers={updateWorkers}
            logs={logs} addLog={addLog}
            sheetConfig={sheetConfig} updateSheetConfig={updateSheetConfig}
            warnings={warnings} updateWarnings={updateWarnings}
            blacklist={blacklist} updateBlacklist={updateBlacklist}
            certificates={certificates}
            updateCertificates={updateCertificates}
            sendEmailNotification={sendEmailNotification}
            communityPosts={communityPosts} setCommunityPosts={setCommunityPosts}
            exhibitionPosts={exhibitionPosts} setExhibitionPosts={setExhibitionPosts}
            equipmentDB={equipmentDB} setEquipmentDB={setEquipmentDB}
            isMobile={isMobile}
            isDark={isDark} toggleDark={toggleDark}
          />
        )}
      </div>

      {/* Global KMU Logo - Fixed at bottom (center for login, right for portals) */}
      <img
        src="/kmu-logo.png"
        alt="KMU Logo"
        style={{
          position: "fixed",
          bottom: "15px",
          ...(page === "login" ? {
            left: "50%",
            transform: "translateX(-50%)",
          } : {
            right: "20px",
            left: "auto",
            transform: "none",
          }),
          height: "40px",
          width: "auto",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 1000,
          objectFit: "contain"
        }}
      />
    </div>
  );
}
