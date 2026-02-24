import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import supabaseStore from "./supabase";
import { EDITABLE, ROOMS, DEFAULT_EQUIPMENT_DB, DEFAULT_WORKERS } from "./constants/data";
import theme, { darkColors, lightColors } from "./constants/theme";
import { uid, ts, dateStr, ACTIVE_PORTAL_SESSION_KEY, emailTemplate } from "./utils/helpers";
import store from "./utils/storage";
import PortalLoadingScreen from "./components/PortalLoadingScreen";
import LoginPage from "./pages/LoginPage";
import StudentPortal from "./pages/StudentPortal";
import WorkerPortal from "./pages/WorkerPortal";
import AdminPortal from "./pages/AdminPortal";

// ════════════════════════════════════════════════════════════════
//  국민대학교 건축대학  포털사이트 v1.0
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
    document.documentElement.classList.toggle("dark", isDark);
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
  const [roomStatus, setRoomStatus] = useState(() => {
    const def = {};
    ROOMS.forEach(r => { def[r.id] = true; });
    return def;
  }); // 실기실 예약 ON/OFF 상태
  const [dataLoaded, setDataLoaded] = useState(false);

  // ─── Community & Exhibition (shared between LoginPage & AdminPortal) ──
  const defaultPosts = useMemo(() => [], []);
  const [communityPosts, setCommunityPostsRaw] = useState(defaultPosts);
  const setCommunityPosts = useCallback((updater) => {
    setCommunityPostsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      store.set("communityPosts", next);
      supabaseStore.set("portal/communityPosts", next).catch(() => { });
      return next;
    });
  }, []);
  const defaultExhibitionPosts = useMemo(() => [], []);
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
      supabaseStore.set("portal/equipmentDB", next).catch(() => { });
      return next;
    });
  }, []);

  // ─── Load persisted data ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // 1단계: 로그인 기억은 로컬 전용 (다른 사용자와 공유되지 않도록)
        const session = store.localGet("session");
        const remember = store.localGet("rememberSession");

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
        const [wk, warn, blk, certs, res, eq, lg, notif, sheet, overdue, inq, prints, visits, visitors, analytics, cmPosts, exhPosts, exhDataOld, eqDB, dVisits, savedRoomStatus] = await Promise.all([
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
          store.get("printRequests_v2"),
          store.get("visitCount"),
          store.get("visitedUsers"),
          store.get("analyticsData"),
          store.get("communityPosts"),
          store.get("exhibitionPosts"),
          store.get("exhibitionData"),
          store.get("equipmentDB"),
          store.get("dailyVisits"),
          store.get("roomStatus"),
        ]);
        // 근로학생: Supabase를 단일 진실 원천(SSOT)으로 사용
        const serverWorkers = await supabaseStore.get("portal/workers");
        if (Array.isArray(serverWorkers) && serverWorkers.length > 0) {
          setWorkers(serverWorkers);
          store.set("workers", serverWorkers).catch(() => { });
        } else if (Array.isArray(wk) && wk.length > 0) {
          setWorkers(wk);
          // 로컬에만 있던 데이터를 Supabase에 동기화
          supabaseStore.set("portal/workers", wk).catch(() => { });
        } else {
          setWorkers(DEFAULT_WORKERS);
          store.set("workers", DEFAULT_WORKERS).catch(() => { });
          supabaseStore.set("portal/workers", DEFAULT_WORKERS).catch(() => { });
        }
        if (warn) setWarnings(warn);
        if (blk) setBlacklist(blk);
        if (certs) setCertificates(certs);
        if (res) setReservations(res);
        if (eq) setEquipRentals(eq);

        // 학생별 키 마이그레이션 (1회성)
        const studentMigrated = await store.get("__student_keys_migrated_v1__");
        if (!studentMigrated && (res || eq)) {
          const safeRes = Array.isArray(res) ? res : [];
          const safeEq = Array.isArray(eq) ? eq : [];
          const allStudentIds = new Set();
          for (const r of safeRes) if (r.studentId) allStudentIds.add(r.studentId);
          for (const r of safeEq) if (r.studentId) allStudentIds.add(r.studentId);
          const migrationPromises = [];
          for (const sid of allStudentIds) {
            migrationPromises.push(store.set(`students/${sid}/reservations`, safeRes.filter(r => r.studentId === sid)));
            migrationPromises.push(store.set(`students/${sid}/equipRentals`, safeEq.filter(r => r.studentId === sid)));
          }
          await Promise.all(migrationPromises);
          await store.set("__student_keys_migrated_v1__", true);
        }
        if (lg) setLogs(lg);
        if (notif) setNotifications(notif);
        if (sheet) setSheetConfig(sheet);
        if (overdue) setOverdueFlags(overdue);
        if (inq) setInquiries(inq);
        // 출력 신청: Supabase + 로컬 중 최신 데이터 사용
        const serverPrintsRaw = await supabaseStore.get("portal/printRequests_v2");
        const serverPrintsParsed = parseArrayData(serverPrintsRaw);
        const localPrintsParsed = Array.isArray(prints) ? prints : parseArrayData(prints);

        // 가장 최근 변경 시점을 비교하여 더 최신인 쪽을 선택
        const getLatestTimestamp = (arr) => {
          if (!arr || arr.length === 0) return 0;
          return Math.max(...arr.map(r => {
            const times = [r.createdAt, r.completedAt, r.rejectedAt].filter(Boolean).map(t => new Date(t).getTime());
            return times.length > 0 ? Math.max(...times) : 0;
          }));
        };

        let resolvedPrints = null;
        if (serverPrintsParsed?.length > 0 && localPrintsParsed?.length > 0) {
          const serverTs = getLatestTimestamp(serverPrintsParsed);
          const localTs = getLatestTimestamp(localPrintsParsed);
          resolvedPrints = localTs > serverTs ? localPrintsParsed : serverPrintsParsed;
          // 로컬이 더 최신이면 Supabase에 동기화
          if (localTs > serverTs) {
            console.log("[PRINT LOAD] 로컬이 더 최신 → Supabase에 동기화");
            supabaseStore.set("portal/printRequests_v2", localPrintsParsed).catch(() => { });
          }
        } else if (serverPrintsParsed?.length > 0) {
          resolvedPrints = serverPrintsParsed;
        } else if (localPrintsParsed?.length > 0) {
          resolvedPrints = localPrintsParsed;
          supabaseStore.set("portal/printRequests_v2", localPrintsParsed).catch(() => { });
        }

        if (resolvedPrints) {
          setPrintRequests(resolvedPrints);
          store.set("printRequests_v2", resolvedPrints).catch(() => { });
        }
        if (visits) setVisitCount(visits);
        if (visitors) setVisitedUsers(visitors);
        if (dVisits) setDailyVisits(dVisits);
        if (analytics) setAnalyticsData(analytics);
        // 커뮤니티: Supabase SSOT
        const serverCmPosts = await supabaseStore.get("portal/communityPosts");
        if (Array.isArray(serverCmPosts) && serverCmPosts.length > 0) {
          setCommunityPostsRaw(serverCmPosts);
          store.set("communityPosts", serverCmPosts).catch(() => { });
        } else if (cmPosts && Array.isArray(cmPosts) && cmPosts.length > 0) {
          setCommunityPostsRaw(cmPosts);
          supabaseStore.set("portal/communityPosts", cmPosts).catch(() => { });
        }
        if (exhPosts && Array.isArray(exhPosts) && exhPosts.length > 0) {
          setExhibitionPostsRaw(exhPosts);
        } else if (exhDataOld) {
          const migrated = [{ ...exhDataOld, id: `exh${Date.now()}`, createdAt: new Date().toISOString() }];
          setExhibitionPostsRaw(migrated);
          store.set("exhibitionPosts", migrated);
        }
        // roomStatus: Supabase를 단일 진실 원천(SSOT)으로 사용
        const serverRoomStatus = await supabaseStore.get("portal/roomStatus");
        if (serverRoomStatus && typeof serverRoomStatus === "object") {
          const defaultStatus = {};
          ROOMS.forEach(r => { defaultStatus[r.id] = true; });
          const merged = { ...defaultStatus, ...serverRoomStatus };
          setRoomStatus(merged);
          store.set("roomStatus", merged).catch(() => { });
        } else if (savedRoomStatus && typeof savedRoomStatus === "object") {
          setRoomStatus(prev => ({ ...prev, ...savedRoomStatus }));
          supabaseStore.set("portal/roomStatus", { ...roomStatus, ...savedRoomStatus }).catch(() => { });
        }
        // 물품 DB: Supabase를 단일 진실 원천(SSOT)으로 사용
        const serverEqDB = await supabaseStore.get("portal/equipmentDB");
        const resolvedEqDB = Array.isArray(serverEqDB) && serverEqDB.length > 0
          ? serverEqDB
          : Array.isArray(eqDB) && eqDB.length > 0 ? eqDB : null;
        if (resolvedEqDB) {
          // 기본 물품 중 저장 데이터에 없는 항목이 있으면 코드가 업데이트된 것이므로 병합
          const savedIdSet = new Set(resolvedEqDB.map(e => e.id));
          const missingDefaults = DEFAULT_EQUIPMENT_DB.filter(d => !savedIdSet.has(d.id));
          if (missingDefaults.length > 0) {
            const merged = [...resolvedEqDB, ...missingDefaults];
            setEquipmentDBRaw(merged);
            store.set("equipmentDB", merged);
            supabaseStore.set("portal/equipmentDB", merged).catch(() => { });
          } else {
            setEquipmentDBRaw(resolvedEqDB);
            if (!serverEqDB) {
              // 로컬에만 있던 데이터를 Supabase에 동기화
              supabaseStore.set("portal/equipmentDB", resolvedEqDB).catch(() => { });
            }
          }
        } else {
          store.set("equipmentDB", DEFAULT_EQUIPMENT_DB);
          supabaseStore.set("portal/equipmentDB", DEFAULT_EQUIPMENT_DB).catch(() => { });
        }
      } catch (error) {
        console.error("Initial data load failed:", error);
        setDataLoaded(true);
      }
    })();
  }, []);

  // JSON 문자열 또는 배열 데이터를 안전하게 파싱하는 헬퍼
  const parseArrayData = (raw) => {
    let parsed = raw;
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch { return null; }
    }
    return Array.isArray(parsed) ? parsed : null;
  };

  // ─── 폴링 기반 크로스브라우저 동기화 (Realtime 할당량 절약) ──────
  // 30초마다 서버에서 최신 데이터를 가져옴
  const POLL_INTERVAL = 30_000;
  const lastLocalPrintWrite = useRef(0);

  useEffect(() => {
    let active = true;

    const pollServerData = async () => {
      if (!active) return;
      try {
        const [serverWorkers, serverCmPosts, serverEqDB, serverRoomStatus, serverPrints] = await Promise.all([
          supabaseStore.get("portal/workers"),
          supabaseStore.get("portal/communityPosts"),
          supabaseStore.get("portal/equipmentDB"),
          supabaseStore.get("portal/roomStatus"),
          supabaseStore.get("portal/printRequests_v2"),
        ]);

        // 근로학생 계정
        const wkItems = parseArrayData(serverWorkers);
        if (wkItems && wkItems.length > 0) setWorkers(wkItems);

        // 커뮤니티 게시글
        const cmItems = parseArrayData(serverCmPosts);
        if (cmItems && cmItems.length > 0) {
          setCommunityPostsRaw(cmItems);
        }

        // 물품 DB
        const eqItems = parseArrayData(serverEqDB);
        if (eqItems && eqItems.length > 0) setEquipmentDBRaw(eqItems);

        // 실기실 ON/OFF
        let roomData = serverRoomStatus;
        if (typeof roomData === "string") {
          try { roomData = JSON.parse(roomData); } catch { roomData = null; }
        }
        if (roomData && typeof roomData === "object" && !Array.isArray(roomData)) {
          const defaultStatus = {};
          ROOMS.forEach(r => { defaultStatus[r.id] = true; });
          setRoomStatus(prev => ({ ...defaultStatus, ...roomData }));
        }

        // 출력 신청 (로컬 쓰기 직후 10초 이내는 건너뜀 — Supabase 쓰기 완료 대기)
        if (Date.now() - lastLocalPrintWrite.current > 10000) {
          const printItems = parseArrayData(serverPrints);
          console.log("[PRINT SYNC] 폴링 읽기 - raw:", typeof serverPrints, "parsed:", printItems?.length ?? "null");
          if (printItems) setPrintRequests(printItems);
        }
      } catch (e) {
        console.warn("[Poll] server sync failed:", e);
      }
    };

    const timerId = setInterval(pollServerData, POLL_INTERVAL);
    return () => { active = false; clearInterval(timerId); };
  }, []);

  // ─── Persist helpers ───────────────────────────────────────────
  const persist = useCallback(async (key, data) => { await store.set(key, data); }, []);
  const persistStudentData = useCallback(async (studentId, dataType, data) => {
    if (!studentId) return;
    await store.set(`students/${studentId}/${dataType}`, data);
  }, []);

  const addLog = useCallback((action, type, extra = {}) => {
    setLogs(prev => {
      const next = [{ id: uid(), time: ts(), action, type, ...extra }, ...prev].slice(0, 500);
      persist("logs", next);
      return next;
    });
  }, [persist]);

  const updateLogs = useCallback((updater) => {
    setLogs(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
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
      // 영향받는 학생별 키 업데이트 (dual-write)
      const affected = new Set();
      for (const r of prev) if (r.studentId) affected.add(r.studentId);
      for (const r of next) if (r.studentId) affected.add(r.studentId);
      for (const sid of affected) {
        persistStudentData(sid, "reservations", next.filter(r => r.studentId === sid));
      }
      return next;
    });
  }, [persist, persistStudentData]);

  const updateEquipRentals = useCallback((updater) => {
    setEquipRentals(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("equipRentals", next);
      // 영향받는 학생별 키 업데이트 (dual-write)
      const affected = new Set();
      for (const r of prev) if (r.studentId) affected.add(r.studentId);
      for (const r of next) if (r.studentId) affected.add(r.studentId);
      for (const sid of affected) {
        persistStudentData(sid, "equipRentals", next.filter(r => r.studentId === sid));
      }
      return next;
    });
  }, [persist, persistStudentData]);

  const updateWorkers = useCallback((updater) => {
    setWorkers(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("workers", next);
      supabaseStore.set("portal/workers", next).catch(() => { });
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

  const updateRoomStatus = useCallback((updater) => {
    setRoomStatus(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("roomStatus", next);
      supabaseStore.set("portal/roomStatus", next).catch(() => { });
      return next;
    });
  }, [persist]);

  const updatePrintRequests = useCallback((updater) => {
    setPrintRequests(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      lastLocalPrintWrite.current = Date.now();

      // 로컬 + Supabase 동시 쓰기 (실패 시 재시도)
      const syncToServer = async () => {
        try {
          await persist("printRequests_v2", next);
        } catch (e) {
          console.error("[PRINT SYNC] persist 실패:", e);
        }
        let ok = await supabaseStore.set("portal/printRequests_v2", next);
        if (!ok) {
          console.warn("[PRINT SYNC] supabase 1차 쓰기 실패, 1초 후 재시도...");
          await new Promise(r => setTimeout(r, 1000));
          ok = await supabaseStore.set("portal/printRequests_v2", next);
          if (!ok) console.error("[PRINT SYNC] supabase 재시도도 실패");
        }
        console.log("[PRINT SYNC] 완료, items:", next?.length, "supabase:", ok ? "성공" : "실패");
      };
      syncToServer();

      return next;
    });
  }, [persist]);

  // 서버에서 최신 출력 신청 데이터를 읽어 state만 갱신
  const refreshPrintRequests = useCallback(async () => {
    const serverData = await supabaseStore.get("portal/printRequests_v2");
    const items = parseArrayData(serverData);
    if (items) {
      setPrintRequests(items);
      return;
    }
    // 직접 조회 실패 시 window.storage 경로로 재시도
    const localData = await store.get("printRequests_v2");
    if (Array.isArray(localData) && localData.length > 0) {
      setPrintRequests(localData);
    }
  }, []);
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
            subject: `[국민대 건축대학] 물품 반납 지연 안내`,
            body: emailTemplate(r.studentName, [
              "물품 대여 반납 기한이 지났습니다.",
              "",
              "[대여 정보]",
              `- 학생: ${r.studentName} (${r.studentId})`,
              `- 전공/학년: ${r.studentDept || "-"}`,
              `- 대여 품목: ${r.items?.map(i => i.name).join(", ")}`,
              `- 반납 예정일: ${r.returnDate}`,
              "",
              "즉시 반납 부탁드립니다.",
            ].join("\n")),
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

  // ─── Archive/Delete prints on Google Drive ──────────────────
  // mode: "move" (완료 → 아카이브 폴더 이동) | "delete" (반려 → 휴지통)
  const archivePrintsToDrive = useCallback(async (requestsToArchive, mode = "move") => {
    const cfg = EDITABLE?.printArchive;
    const gasUrl = cfg?.gasUrl?.trim();
    if (!gasUrl) return { ok: false, error: "printArchive.gasUrl이 설정되지 않았습니다." };

    // driveFileId 수집
    const fileIds = [];
    for (const req of requestsToArchive) {
      if (req.printFile?.driveFileId) fileIds.push(req.printFile.driveFileId);
      if (req.paymentProof?.driveFileId) fileIds.push(req.paymentProof.driveFileId);
    }

    if (fileIds.length === 0) return { ok: true, moved: 0 };

    const action = mode === "delete" ? "delete_print_files" : "move_print_files";
    // 날짜 폴더 (첫 번째 요청의 createdAt 기준)
    const firstReq = requestsToArchive[0];
    const dateFolder = firstReq?.createdAt
      ? (() => { const d = new Date(firstReq.createdAt); return `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; })()
      : (() => { const d = new Date(); return `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; })();

    const payload = {
      action,
      key: EDITABLE.apiKey,
      fileIds,
      dateFolder,
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
      return { ok: data?.ok ?? true, ...data };
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
  }, []);

  // ─── Auth ──────────────────────────────────────────────────────
  const updateRememberSession = useCallback((val) => {
    setRememberSession(val);
    store.localSet("rememberSession", val);
    if (!val) {
      store.localSet("session", null);
      setSavedCredentials(null);
    }
  }, []);

  const handleLogin = async (user, role) => {
    setCurrentUser(user);
    setUserRole(role);
    setPage(role);
    history.pushState({ page: role }, "");
    try {
      sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, JSON.stringify({ user, role, loggedAt: Date.now() }));
    } catch { }
    if (role === "student" && rememberSession) {
      store.localSet("session", { user, role, page: role });
      setSavedCredentials({ user, role });
    } else {
      store.localSet("session", null);
      setSavedCredentials(null);
    }

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
    if (!rememberSession) store.localSet("session", null);
  };

  // ─── Reset data ────────────────────────────────────────────────
  const resetAllData = async () => {
    // 학생별 키 정리: 현재 데이터에서 studentId 수집
    const studentIds = new Set();
    for (const r of reservations) if (r.studentId) studentIds.add(r.studentId);
    for (const r of equipRentals) if (r.studentId) studentIds.add(r.studentId);

    const empty = [];
    setReservations(empty); setEquipRentals(empty); setLogs(empty); setNotifications(empty);
    setWorkers(DEFAULT_WORKERS);

    const cleanupPromises = [
      persist("reservations", empty), persist("equipRentals", empty),
      persist("logs", empty), persist("notifications", empty),
      persist("workers", DEFAULT_WORKERS),
      supabaseStore.set("portal/workers", DEFAULT_WORKERS),
    ];
    // 학생별 per-student 키 삭제
    for (const sid of studentIds) {
      cleanupPromises.push(store.set(`students/${sid}/reservations`, null));
      cleanupPromises.push(store.set(`students/${sid}/equipRentals`, null));
    }
    // 마이그레이션 플래그도 초기화 (재마이그레이션 가능하도록)
    cleanupPromises.push(store.set("__student_keys_migrated_v1__", null));
    await Promise.all(cleanupPromises);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!dataLoaded) return <PortalLoadingScreen isDark={isDark} />;

  // Apply theme colors based on dark/light mode
  Object.assign(theme, isDark ? darkColors : lightColors);

  return (
    <div style={{ fontFamily: theme.font, background: "transparent", color: theme.text, minHeight: "100vh", transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Noto+Sans+KR:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.bg}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        ::selection { background: ${theme.accent}; color: ${isDark ? '#000' : '#fff'}; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(${isDark ? 0.7 : 0}); }
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        .slide-in { animation: slideIn 0.25s ease forwards; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 880, margin: "0 auto", padding: isMobile ? "0 10px" : "0 16px", minHeight: "100vh", display: "flex", flexDirection: "column", boxSizing: "border-box", overflowX: "hidden" }}>
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
            roomStatus={roomStatus}
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
            printRequests={printRequests} updatePrintRequests={updatePrintRequests} refreshPrintRequests={refreshPrintRequests}
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
            logs={logs} addLog={addLog} updateLogs={updateLogs}
            sheetConfig={sheetConfig} updateSheetConfig={updateSheetConfig}
            warnings={warnings} updateWarnings={updateWarnings}
            blacklist={blacklist} updateBlacklist={updateBlacklist}
            certificates={certificates}
            updateCertificates={updateCertificates}
            sendEmailNotification={sendEmailNotification}
            communityPosts={communityPosts} setCommunityPosts={setCommunityPosts}
            exhibitionPosts={exhibitionPosts} setExhibitionPosts={setExhibitionPosts}
            equipmentDB={equipmentDB} setEquipmentDB={setEquipmentDB}
            roomStatus={roomStatus} updateRoomStatus={updateRoomStatus}
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
          objectFit: "contain",
          filter: isDark ? "none" : "brightness(0)",
        }}
      />
    </div>
  );
}
