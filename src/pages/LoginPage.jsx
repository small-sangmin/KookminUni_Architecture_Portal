import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { certificateStorage } from "../supabase";
import { EDITABLE, ROOMS, ADMIN_ACCOUNT, STUDENTS_DB } from "../constants/data";
import theme from "../constants/theme";
import { uid, ts } from "../utils/helpers";
import store from "../utils/storage";
import Icons from "../components/Icons";
import { Badge, Card, Button, Input, SectionTitle, Empty, Divider, Tabs } from "../components/ui";
import PortalLoadingScreen from "../components/PortalLoadingScreen";

function LoginPage({ onLogin, onReset, workers, verifyStudentInSheet, rememberSession, onRememberSessionChange, blacklist, warnings, certificates, updateCertificates, inquiries, updateInquiries, savedCredentials, communityPosts, setCommunityPosts, exhibitionPosts, isMobile, isDark, toggleDark }) {
  const [mode, setMode] = useState("student");
  const [sid, setSid] = useState(() => savedCredentials?.role === "student" ? (savedCredentials.user?.id || "") : "");
  const [sname, setSname] = useState(() => savedCredentials?.role === "student" ? (savedCredentials.user?.name || "") : "");
  const [sPin, setSPin] = useState("");
  const [wUser, setWUser] = useState("");
  const [wPass, setWPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [studentChecking, setStudentChecking] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [certSid, setCertSid] = useState("");
  const [certSname, setCertSname] = useState("");
  const [certYear, setCertYear] = useState("");
  const [certMajor, setCertMajor] = useState("");
  const [certEmail, setCertEmail] = useState("");
  const [certPin, setCertPin] = useState("");
  const [showCertUpload, setShowCertUpload] = useState(false);
  const [showSafetyInfo, setShowSafetyInfo] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryContact, setInquiryContact] = useState("");
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState("");
  const fileInputRef = useRef(null);

  // 전시회/커뮤니티 탭 상태
  const [rightPanelTab, setRightPanelTab] = useState("community"); // exhibition | community
  const [expandedExhId, setExpandedExhId] = useState(null); // 펼친 전시회 ID
  const [newPostContent, setNewPostContent] = useState("");
  const [expandedPostId, setExpandedPostId] = useState(null); // 슬라이드 확장된 게시글 ID
  const [newCommentContent, setNewCommentContent] = useState(""); // 새 댓글 내용
  const [myPostIds, setMyPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("myPostIds") || "[]");
    } catch { return []; }
  }); // 내가 작성한 글 ID들
  const [editingPostId, setEditingPostId] = useState(null); // 수정 중인 글 ID
  const [editingContent, setEditingContent] = useState(""); // 수정 중인 내용
  const [myCommentIds, setMyCommentIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("myCommentIds") || "[]");
    } catch { return []; }
  }); // 내가 작성한 댓글 ID들
  const [editingCommentId, setEditingCommentId] = useState(null); // 수정 중인 댓글 ID
  const [editingCommentContent, setEditingCommentContent] = useState(""); // 수정 중인 댓글 내용

  const [haedongHover, setHaedongHover] = useState(false);
  const [certHover, setCertHover] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.innerWidth <= 1200);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const loginScale = useMemo(() => {
    const shouldScaleDown = viewportSize.width < 1600 || viewportSize.height < 900;
    if (!shouldScaleDown) return 1;

    const widthRatio = viewportSize.width / 1600;
    const heightRatio = viewportSize.height / 900;
    return Math.max(0.72, Math.min(1, widthRatio, heightRatio));
  }, [viewportSize]);

  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsCompactLayout(width <= 1200);
      setViewportSize({ width, height });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleInquirySubmit = () => {
    if (!inquiryTitle.trim() || !inquiryContent.trim()) return;
    setInquirySubmitting(true);
    const newInquiry = {
      id: uid(),
      title: inquiryTitle.trim(),
      content: inquiryContent.trim(),
      name: inquiryName.trim() || "익명",
      contact: inquiryContact.trim() || "",
      createdAt: ts(),
      status: "pending",
      answer: null,
      isLoggedIn: false,
    };
    updateInquiries(prev => [newInquiry, ...prev]);
    setInquiryTitle("");
    setInquiryContent("");
    setInquiryName("");
    setInquiryContact("");
    setInquirySubmitting(false);
    setInquirySuccess("문의가 등록되었습니다!");
    setTimeout(() => setInquirySuccess(""), 3000);
  };

  const handleStudentLogin = async () => {
    const sidTrim = sid.trim();
    const snameTrim = sname.trim();
    if (!sidTrim || !snameTrim) return;
    setError("");
    setAuthLoading(true);
    setStudentChecking(true);
    try {
      const result = await verifyStudentInSheet?.(sidTrim, snameTrim);
      setStudentChecking(false);
      if (!result?.ok) {
        setError(result?.error || "조회 실패");
        setAuthLoading(false);
        return;
      }
      const fallback = STUDENTS_DB.find(s => s.id === sidTrim && s.name === snameTrim);
      // 서버에서 최신 블랙리스트/경고 확인 (다른 기기 동기화)
      const freshBlacklist = await store.get("blacklist");
      if (freshBlacklist?.[sidTrim] || blacklist?.[sidTrim]) {
        setError("블랙리스트로 등록되어 로그인할 수 없습니다.");
        setAuthLoading(false);
        return;
      }
      // 비밀번호(PIN) 검증
      const certPin = certificates?.[sidTrim]?.pin || await store.get(`studentPin_${sidTrim}`);
      if (!certPin) {
        setError("안전교육이수증을 먼저 업로드해주세요.");
        setAuthLoading(false);
        return;
      }
      if (certPin !== sPin.trim()) {
        setError("비밀번호가 일치하지 않습니다.");
        setAuthLoading(false);
        return;
      }
      const freshWarnings = await store.get("warnings");
      const warnInfo = freshWarnings?.[sidTrim] || warnings?.[sidTrim];
      const student = {
        id: sidTrim,
        name: snameTrim,
        dept: result?.student?.dept || fallback?.dept || "미상",
        year: result?.student?.year || fallback?.year || 0,
        safetyTrained: result?.safetyTrained ?? true,
        safetyDate: result?.student?.safetyDate || fallback?.safetyDate || null,
        warningCount: warnInfo?.count || 0,
        email: result?.student?.email || "",
      };
      await onLogin(student, "student");
    } catch {
      setStudentChecking(false);
      setAuthLoading(false);
      setError("로그인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadSuccess("");
    setError("");
  };

  const handleConfirmUpload = async () => {
    if (!uploadFile) {
      setError("파일을 먼저 선택해주세요.");
      return;
    }
    if (!certSid.trim() || !certSname.trim() || !certYear.trim() || !certMajor.trim() || !certEmail.trim()) {
      setError("학번, 이름, 학년, 전공, 이메일을 먼저 입력해주세요.");
      return;
    }
    if (!/^\d{4}$/.test(certPin)) {
      setError("비밀번호는 숫자 4자리로 입력해주세요.");
      return;
    }
    setUploading(true);
    setUploadSuccess("");
    setError("");
    try {
      const sid = certSid.trim();
      const { path, error: uploadError } = await certificateStorage.upload(sid, uploadFile);
      if (uploadError || !path) {
        throw new Error(uploadError || "Upload failed");
      }
      const certMeta = {
        studentId: sid,
        studentName: certSname.trim(),
        studentYear: certYear.trim(),
        studentMajor: certMajor.trim(),
        studentEmail: certEmail.trim(),
        pin: certPin.trim(),
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        fileType: uploadFile.type,
        uploadDate: new Date().toISOString(),
        storagePath: path,
      };
      const updatedCerts = { ...(certificates || {}), [sid]: certMeta };
      await store.set("certificates", updatedCerts);
      await store.set(`studentPin_${sid}`, certPin.trim());
      updateCertificates?.(() => updatedCerts);
      setUploading(false);
      setUploadSuccess("✅ 업로드 완료!");
      setShowUploadConfirm(true);
      setUploadFile(null);
    } catch (err) {
      setUploading(false);
      setError("서버 저장 실패: " + (err?.message || "알 수 없는 오류"));
    }
  };

  const handleWorkerLogin = async () => {
    const found = workers.find(w => w.username === wUser.trim() && w.password === wPass) || workers[0];
    if (!found) { setError("근로학생 계정이 없습니다."); return; }
    setError("");
    setAuthLoading(true);
    try {
      await onLogin(found, "worker");
    } catch {
      setAuthLoading(false);
      setError("로그인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleAdminLogin = async () => {
    setError("");
    setAuthLoading(true);
    try {
      await onLogin({ name: ADMIN_ACCOUNT.name, username: ADMIN_ACCOUNT.username, role: "admin" }, "admin");
    } catch {
      setAuthLoading(false);
      setError("로그인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async () => {
    if (mode === "student") await handleStudentLogin();
    else if (mode === "worker") await handleWorkerLogin();
    else await handleAdminLogin();
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 60,
      position: "relative",
      overflow: "auto"
    }}>
      {authLoading && <PortalLoadingScreen isDark={isDark} overlay />}
      {/* Theme Toggle */}
      <button onClick={toggleDark} style={{
        position: "fixed", top: 16, right: 16, zIndex: 100,
        width: 36, height: 36, borderRadius: "50%",
        background: theme.surface, border: `1px solid ${theme.border}`,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: theme.textMuted, transition: "all 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
      >
        {isDark ? <Icons.sun size={16} /> : <Icons.moon size={16} />}
      </button>

      {/* Top Left - User Guide & Notices (Above Quick Links) */}
      <div style={{
        position: "fixed",
        left: 20,
        top: 20,
        zIndex: isCompactLayout ? 2 : 10,
        width: 500,
        transform: `scale(${loginScale})`,
        transformOrigin: "top left",
        display: isMobile ? "none" : undefined,
      }}>
        {/* Horizontal Guide Content */}
        <div style={{
          background: theme.card,
          backdropFilter: "blur(10px)",
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          padding: "14px 20px",
        }}>
          {/* Title Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📖</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.accent }}>이용 안내</span>
            <div style={{ flex: 1, height: 1, background: theme.border, marginLeft: 8 }} />
          </div>

          {/* Quick Start Steps - Horizontal */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                background: theme.accentBg, color: theme.accent,
                fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>1</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>안전교육이수증 제출</span>
            </div>
            <span style={{ color: theme.textDim, fontSize: 10 }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                background: theme.accentBg, color: theme.accent,
                fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>2</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>학번/이름 입력 후 로그인</span>
            </div>
            <span style={{ color: theme.textDim, fontSize: 10 }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                background: theme.accentBg, color: theme.accent,
                fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>3</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>예약/대여/출력 이용</span>
            </div>
          </div>

          {/* Quick Info - Horizontal */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 11, color: theme.text, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: theme.yellow }}>⏰</span> 평일 09:00~17:00
            </div>
            <div style={{ fontSize: 11, color: theme.text, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: theme.blue }}>📍</span> 복지관 602호실 교학팀
            </div>
            <div style={{ fontSize: 11, color: theme.text, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: theme.green }}>📞</span> 02-910-6525
            </div>
          </div>
        </div>
      </div>

      {/* Left Side Banner - Quick Links */}
      <div style={{
        position: "fixed",
        left: 20,
        top: "50%",
        transform: `translateY(-50%) scale(${loginScale})`,
        display: isMobile ? "none" : "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: isCompactLayout ? 2 : 100,
        transformOrigin: "left center",
      }}>
        {/* Banner Title */}
        <div style={{
          padding: "6px 12px",
          background: "transparent",
          marginBottom: 6,
          marginLeft: 4,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: theme.text, letterSpacing: "2px", textTransform: "uppercase" }}>바로가기</span>
        </div>
        {[
          { label: "국민대학교", url: "https://www.kookmin.ac.kr", icon: "🏫", color: "#4A90D9" },
          { label: "건축대학", url: "https://archi.kookmin.ac.kr/", icon: "🏛️", color: "#d4a053" },
          { label: "ON국민", url: "https://portal.kookmin.ac.kr/por/ln", icon: "📋", color: "#6B8E23" },
          { label: "가상대학", url: "https://ecampus.kookmin.ac.kr/login/index.php", icon: "📚", color: "#9370DB" },
          { label: "성곡도서관", url: "https://lib.kookmin.ac.kr/#/", icon: "📖", color: "#20B2AA" },
        ].map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: theme.card,
              backdropFilter: "blur(10px)",
              border: `1px solid ${link.color}40`,
              borderLeft: `3px solid ${link.color}`,
              borderRadius: "0 8px 8px 0",
              textDecoration: "none",
              color: theme.text,
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s ease",
              minWidth: 140,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${link.color}20`;
              e.currentTarget.style.borderColor = link.color;
              e.currentTarget.style.transform = "translateX(4px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = theme.card;
              e.currentTarget.style.borderColor = `${link.color}40`;
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span style={{ fontSize: 16 }}>{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}

        {/* 증명서 발급 with Tooltip */}
        <div style={{ position: "relative" }}>
          <a
            href="https://unc.doculink.co.kr/index/main.do#reload"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: certHover ? "#FF950020" : theme.card,
              backdropFilter: "blur(10px)",
              border: `1px solid ${certHover ? "#FF9500" : "#FF950040"}`,
              borderLeft: "3px solid #FF9500",
              borderRadius: "0 8px 8px 0",
              textDecoration: "none",
              color: theme.text,
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s ease",
              minWidth: 140,
              transform: certHover ? "translateX(4px)" : "translateX(0)",
            }}
            onMouseEnter={() => setCertHover(true)}
            onMouseLeave={() => setCertHover(false)}
          >
            <span style={{ fontSize: 16 }}>📄</span>
            <span>증명서 발급</span>
          </a>

          {/* Tooltip */}
          {certHover && (
            <div style={{
              position: "absolute",
              left: "100%",
              top: "50%",
              transform: "translateY(-50%)",
              marginLeft: 12,
              background: theme.card,
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.border}`,
              borderLeft: "3px solid #FF9500",
              borderRadius: 8,
              padding: "10px 14px",
              zIndex: 9999,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>💰</span>
                <span style={{ fontSize: 12, color: "#FF9500", fontWeight: 600 }}>1건당 3,000원 수수료 있음</span>
              </div>
            </div>
          )}
        </div>

        {/* 해동예약포털 with Tooltip */}
        <div style={{ position: "relative" }}>
          <a
            href="https://lib.kookmin.ac.kr/facility/reservation/room/all-rooms?roomIndex=1"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: haedongHover ? "#FF6B6B20" : theme.card,
              backdropFilter: "blur(10px)",
              border: `1px solid ${haedongHover ? "#FF6B6B" : "#FF6B6B40"}`,
              borderLeft: "3px solid #FF6B6B",
              borderRadius: "0 8px 8px 0",
              textDecoration: "none",
              color: theme.text,
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s ease",
              minWidth: 140,
              transform: haedongHover ? "translateX(4px)" : "translateX(0)",
            }}
            onMouseEnter={() => setHaedongHover(true)}
            onMouseLeave={() => setHaedongHover(false)}
          >
            <span style={{ fontSize: 16 }}>🗓️</span>
            <span>해동예약포털</span>
          </a>

          {/* Tooltip */}
          {haedongHover && (
            <div style={{
              position: "absolute",
              left: "100%",
              top: 0,
              marginLeft: 12,
              width: 320,
              background: theme.card,
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.border}`,
              borderLeft: "3px solid #FF6B6B",
              borderRadius: 10,
              padding: 16,
              zIndex: 9999,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              {/* Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>🗓️</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FF6B6B" }}>해동예약포털 이용방법</span>
              </div>

              {/* Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {[
                  "로그인",
                  "공간/장비 예약 클릭",
                  "예약 클릭 후 해동KL 클릭",
                  "희망하는 날짜 조회 후 원하는 장비 예약하기",
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(255, 107, 107, 0.2)", color: "#FF6B6B",
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>{idx + 1}</span>
                    <span style={{ fontSize: 12, color: theme.text, lineHeight: 1.4 }}>{step}</span>
                  </div>
                ))}
              </div>

              {/* Warning */}
              <div style={{
                background: "rgba(255, 193, 7, 0.1)",
                border: "1px solid rgba(255, 193, 7, 0.3)",
                borderRadius: 6,
                padding: "10px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                  <span style={{ fontSize: 11, color: theme.yellow, lineHeight: 1.5 }}>
                    안전교육 이수 후 해당 장비 사전교육을 해동에서 받아야만 이용할 수 있습니다.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Exhibition Poster - Right Side */}
      <div style={{
        position: "fixed",
        right: 60,
        top: "50%",
        transform: `translateY(-50%) scale(${loginScale})`,
        display: isMobile ? "none" : "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: isCompactLayout ? 2 : 10,
        width: 420,
        transformOrigin: "top right",
      }}>
        {/* Tab Header */}
        <div style={{
          display: "flex",
          gap: 0,
          background: theme.card,
          borderRadius: 8,
          padding: 4,
          border: `1px solid ${theme.border}`,
        }}>
          <button
            onClick={() => setRightPanelTab("community")}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderRadius: 6,
              background: rightPanelTab === "community" ? theme.accent : "transparent",
              color: rightPanelTab === "community" ? "#000" : theme.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: theme.font,
            }}
          >
            💬 커뮤니티
          </button>
          <button
            onClick={() => setRightPanelTab("exhibition")}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderRadius: 6,
              background: rightPanelTab === "exhibition" ? theme.accent : "transparent",
              color: rightPanelTab === "exhibition" ? "#000" : theme.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: theme.font,
            }}
          >
            🎨 전시회 홍보
          </button>
        </div>

        {/* Exhibition Tab Content */}
        {rightPanelTab === "exhibition" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 500, overflowY: "auto" }}>
            {(!exhibitionPosts || exhibitionPosts.length === 0) ? (
              <div style={{
                padding: 30, textAlign: "center", color: theme.textDim, fontSize: 13,
                background: theme.card, borderRadius: 10,
                border: `1px solid ${theme.border}`,
              }}>
                등록된 전시회가 없습니다.
              </div>
            ) : (
              <div style={{
                background: theme.card,
                backdropFilter: "blur(10px)",
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}>
                {exhibitionPosts.map((exhPost, idx) => (
                  <div key={exhPost.id}>
                    {/* 제목 행 (클릭하여 펼침) */}
                    <div
                      onClick={() => setExpandedExhId(expandedExhId === exhPost.id ? null : exhPost.id)}
                      style={{
                        padding: "12px 16px",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer",
                        borderBottom: (expandedExhId === exhPost.id || idx < exhibitionPosts.length - 1) ? `1px solid ${theme.border}` : "none",
                        background: expandedExhId === exhPost.id ? "rgba(212, 160, 83, 0.08)" : "transparent",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={e => { if (expandedExhId !== exhPost.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { if (expandedExhId !== exhPost.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 600, color: expandedExhId === exhPost.id ? theme.accent : theme.text, transition: "color 0.2s" }}>
                          {exhPost.title || "전시회"}
                        </div>
                        <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 3 }}>
                          📅 {exhPost.dates || "미정"} · 📍 {exhPost.location || "미정"}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: theme.textDim, flexShrink: 0, marginLeft: 8, transition: "transform 0.2s", transform: expandedExhId === exhPost.id ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </div>
                    {/* 펼침 내용: 포스터 + 상세정보 */}
                    {expandedExhId === exhPost.id && (
                      <div style={{ borderBottom: idx < exhibitionPosts.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                        {/* Poster Image */}
                        {exhPost.posterUrl && (
                          <div style={{ overflow: "hidden" }}>
                            <a
                              href={exhPost.instagramUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "block" }}
                            >
                              <img
                                src={exhPost.posterUrl}
                                alt={`${exhPost.title || ""} 전시회 포스터`}
                                style={{
                                  width: "100%",
                                  height: "auto",
                                  display: "block",
                                  transition: "transform 0.3s, opacity 0.3s",
                                }}
                                onMouseOver={e => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.opacity = "0.9"; }}
                                onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1"; }}
                                onError={e => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement.innerHTML = `
                                    <div style="padding: 30px 20px; text-align: center; color: #888;">
                                      <div style="font-size: 36px; margin-bottom: 8px;">🎨</div>
                                      <div style="font-size: 11px;">포스터를 불러올 수 없습니다</div>
                                    </div>
                                  `;
                                }}
                              />
                            </a>
                          </div>
                        )}
                        {/* 상세 정보 */}
                        <div style={{ padding: "12px 16px", background: theme.surface }}>
                          <div style={{ fontSize: 18, color: theme.text, lineHeight: 1.6, marginBottom: 8 }}>
                            {exhPost.description || ""}
                          </div>
                          <div style={{ fontSize: 17, color: theme.text, lineHeight: 1.5 }}>
                            📅 {exhPost.dates || ""}<br />
                            📍 {exhPost.location || ""}
                          </div>
                          {exhPost.instagramUrl && (
                            <a href={exhPost.instagramUrl} target="_blank" rel="noopener noreferrer"
                              style={{ display: "inline-block", marginTop: 8, fontSize: 11, color: theme.accent, textDecoration: "none" }}
                              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                            >
                              Instagram →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Community Tab Content */}
        {rightPanelTab === "community" && (
          <>
            {/* New Post Input */}
            <div style={{
              background: theme.card,
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: 14,
            }}>
              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder="익명으로 자유롭게 글을 작성해보세요..."
                style={{
                  width: "100%",
                  height: 70,
                  padding: 12,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  background: theme.surface,
                  color: theme.text,
                  fontSize: 13,
                  resize: "none",
                  fontFamily: theme.font,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
              <button
                onClick={() => {
                  if (!newPostContent.trim()) return;
                  const newPostId = `c${Date.now()}`;
                  const newPost = {
                    id: newPostId,
                    content: newPostContent.trim(),
                    createdAt: new Date().toISOString(),
                    comments: [],
                  };
                  setCommunityPosts(prev => [newPost, ...prev]);
                  setNewPostContent("");
                  // 내가 작성한 글 ID 저장
                  const updatedIds = [...myPostIds, newPostId];
                  setMyPostIds(updatedIds);
                  localStorage.setItem("myPostIds", JSON.stringify(updatedIds));
                }}
                disabled={!newPostContent.trim()}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: 8,
                  background: newPostContent.trim() ? theme.accent : theme.surface,
                  color: newPostContent.trim() ? "#000" : theme.textDim,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: newPostContent.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  fontFamily: theme.font,
                }}
              >
                익명으로 게시하기
              </button>
            </div>

            {/* Posts List */}
            <div style={{
              background: theme.card,
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              maxHeight: 350,
              overflowY: "auto",
            }}>
              {communityPosts.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: theme.textDim, fontSize: 13 }}>
                  아직 게시글이 없습니다.<br />첫 번째 글을 작성해보세요!
                </div>
              ) : (
                communityPosts.map((post, idx) => (
                  <div key={post.id}>
                    {/* 게시글 헤더 */}
                    <div
                      onClick={() => {
                        setExpandedPostId(expandedPostId === post.id ? null : post.id);
                        setNewCommentContent("");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderBottom: expandedPostId !== post.id && idx < communityPosts.length - 1 ? `1px solid ${theme.border}` : "none",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        background: expandedPostId === post.id ? "rgba(212, 160, 83, 0.1)" : "transparent",
                      }}
                      onMouseEnter={e => { if (expandedPostId !== post.id) e.currentTarget.style.background = "rgba(212, 160, 83, 0.05)"; }}
                      onMouseLeave={e => { if (expandedPostId !== post.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* 수정 모드 */}
                      {editingPostId === post.id ? (
                        <div onClick={e => e.stopPropagation()}>
                          <textarea
                            value={editingContent}
                            onChange={e => setEditingContent(e.target.value)}
                            style={{
                              width: "100%",
                              minHeight: 60,
                              padding: 10,
                              border: `1px solid ${theme.accent}`,
                              borderRadius: 6,
                              background: theme.surface,
                              color: theme.text,
                              fontSize: 13,
                              resize: "none",
                              fontFamily: theme.font,
                              outline: "none",
                              boxSizing: "border-box",
                              marginBottom: 8,
                            }}
                          />
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => {
                                setEditingPostId(null);
                                setEditingContent("");
                              }}
                              style={{
                                padding: "6px 12px",
                                border: `1px solid ${theme.border}`,
                                borderRadius: 4,
                                background: "transparent",
                                color: theme.textDim,
                                fontSize: 11,
                                cursor: "pointer",
                                fontFamily: theme.font,
                              }}
                            >
                              취소
                            </button>
                            <button
                              onClick={() => {
                                if (!editingContent.trim()) return;
                                setCommunityPosts(prev => prev.map(p =>
                                  p.id === post.id ? { ...p, content: editingContent.trim() } : p
                                ));
                                setEditingPostId(null);
                                setEditingContent("");
                              }}
                              disabled={!editingContent.trim()}
                              style={{
                                padding: "6px 12px",
                                border: "none",
                                borderRadius: 4,
                                background: editingContent.trim() ? theme.accent : theme.surface,
                                color: editingContent.trim() ? "#000" : theme.textDim,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: editingContent.trim() ? "pointer" : "not-allowed",
                                fontFamily: theme.font,
                              }}
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* 일반 모드 */
                        <>
                          <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5, marginBottom: 8 }}>
                            {post.content}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 10, color: theme.textDim }}>
                                익명 · {new Date(post.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {myPostIds.includes(post.id) && (
                                <span style={{ fontSize: 9, color: theme.accent, background: "rgba(212, 160, 83, 0.2)", padding: "2px 6px", borderRadius: 4 }}>
                                  내 글
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              {myPostIds.includes(post.id) && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPostId(post.id);
                                      setEditingContent(post.content);
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      border: "none",
                                      borderRadius: 4,
                                      background: "transparent",
                                      color: theme.textDim,
                                      fontSize: 10,
                                      cursor: "pointer",
                                      fontFamily: theme.font,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = theme.accent}
                                    onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm("정말 이 글을 삭제하시겠습니까?")) {
                                        setCommunityPosts(prev => prev.filter(p => p.id !== post.id));
                                        const updatedIds = myPostIds.filter(id => id !== post.id);
                                        setMyPostIds(updatedIds);
                                        localStorage.setItem("myPostIds", JSON.stringify(updatedIds));
                                      }
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      border: "none",
                                      borderRadius: 4,
                                      background: "transparent",
                                      color: theme.textDim,
                                      fontSize: 10,
                                      cursor: "pointer",
                                      fontFamily: theme.font,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = theme.red}
                                    onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                  >
                                    삭제
                                  </button>
                                </>
                              )}
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "4px 8px",
                                  color: post.comments.length > 0 ? theme.accent : theme.textDim,
                                  fontSize: 11,
                                  fontFamily: theme.font,
                                }}
                              >
                                💬 {post.comments.length} {expandedPostId === post.id ? "▲" : "▼"}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 슬라이드 댓글 영역 */}
                    <div
                      style={{
                        maxHeight: expandedPostId === post.id ? 300 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.3s ease-in-out",
                        background: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.9)",
                        borderBottom: expandedPostId === post.id && idx < communityPosts.length - 1 ? `1px solid ${theme.border}` : "none",
                      }}
                    >
                      <div style={{ padding: "12px 16px" }}>
                        {/* 댓글 목록 */}
                        {post.comments.length === 0 ? (
                          <div style={{ textAlign: "center", color: theme.textDim, fontSize: 11, padding: "10px 0" }}>
                            아직 댓글이 없습니다. 첫 댓글을 달아보세요!
                          </div>
                        ) : (
                          post.comments.map((comment) => (
                            <div
                              key={comment.id}
                              style={{
                                padding: "8px 0",
                                borderBottom: `1px solid rgba(255,255,255,0.05)`,
                              }}
                            >
                              {editingCommentId === comment.id ? (
                                /* 댓글 수정 모드 */
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <input
                                    type="text"
                                    value={editingCommentContent}
                                    onChange={e => setEditingCommentContent(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      flex: 1,
                                      padding: "6px 10px",
                                      border: `1px solid ${theme.accent}`,
                                      borderRadius: 4,
                                      background: theme.surface,
                                      color: theme.text,
                                      fontSize: 11,
                                      outline: "none",
                                      fontFamily: theme.font,
                                    }}
                                    onKeyPress={e => {
                                      if (e.key === "Enter" && editingCommentContent.trim()) {
                                        setCommunityPosts(prev => prev.map(p =>
                                          p.id === post.id
                                            ? {
                                              ...p, comments: p.comments.map(c =>
                                                c.id === comment.id ? { ...c, content: editingCommentContent.trim() } : c
                                              )
                                            }
                                            : p
                                        ));
                                        setEditingCommentId(null);
                                        setEditingCommentContent("");
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCommentId(null);
                                      setEditingCommentContent("");
                                    }}
                                    style={{
                                      padding: "5px 8px",
                                      border: `1px solid ${theme.border}`,
                                      borderRadius: 4,
                                      background: "transparent",
                                      color: theme.textDim,
                                      fontSize: 10,
                                      cursor: "pointer",
                                      fontFamily: theme.font,
                                    }}
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!editingCommentContent.trim()) return;
                                      setCommunityPosts(prev => prev.map(p =>
                                        p.id === post.id
                                          ? {
                                            ...p, comments: p.comments.map(c =>
                                              c.id === comment.id ? { ...c, content: editingCommentContent.trim() } : c
                                            )
                                          }
                                          : p
                                      ));
                                      setEditingCommentId(null);
                                      setEditingCommentContent("");
                                    }}
                                    disabled={!editingCommentContent.trim()}
                                    style={{
                                      padding: "5px 8px",
                                      border: "none",
                                      borderRadius: 4,
                                      background: editingCommentContent.trim() ? theme.accent : theme.surface,
                                      color: editingCommentContent.trim() ? "#000" : theme.textDim,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      cursor: editingCommentContent.trim() ? "pointer" : "not-allowed",
                                      fontFamily: theme.font,
                                    }}
                                  >
                                    저장
                                  </button>
                                </div>
                              ) : (
                                /* 댓글 일반 모드 */
                                <>
                                  <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.4, marginBottom: 4 }}>
                                    ↳ {comment.content}
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontSize: 9, color: theme.textDim }}>
                                        익명 · {new Date(comment.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                      {myCommentIds.includes(comment.id) && (
                                        <span style={{ fontSize: 8, color: theme.accent, background: "rgba(212, 160, 83, 0.2)", padding: "1px 4px", borderRadius: 3 }}>
                                          내 댓글
                                        </span>
                                      )}
                                    </div>
                                    {myCommentIds.includes(comment.id) && (
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCommentId(comment.id);
                                            setEditingCommentContent(comment.content);
                                          }}
                                          style={{
                                            padding: "2px 6px",
                                            border: "none",
                                            borderRadius: 3,
                                            background: "transparent",
                                            color: theme.textDim,
                                            fontSize: 9,
                                            cursor: "pointer",
                                            fontFamily: theme.font,
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.color = theme.accent}
                                          onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm("이 댓글을 삭제하시겠습니까?")) {
                                              setCommunityPosts(prev => prev.map(p =>
                                                p.id === post.id
                                                  ? { ...p, comments: p.comments.filter(c => c.id !== comment.id) }
                                                  : p
                                              ));
                                              const updatedIds = myCommentIds.filter(id => id !== comment.id);
                                              setMyCommentIds(updatedIds);
                                              localStorage.setItem("myCommentIds", JSON.stringify(updatedIds));
                                            }
                                          }}
                                          style={{
                                            padding: "2px 6px",
                                            border: "none",
                                            borderRadius: 3,
                                            background: "transparent",
                                            color: theme.textDim,
                                            fontSize: 9,
                                            cursor: "pointer",
                                            fontFamily: theme.font,
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.color = theme.red}
                                          onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        )}

                        {/* 댓글 입력 */}
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <input
                            type="text"
                            value={expandedPostId === post.id ? newCommentContent : ""}
                            onChange={e => setNewCommentContent(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            onClick={e => e.stopPropagation()}
                            onKeyPress={e => {
                              if (e.key === "Enter" && newCommentContent.trim()) {
                                const newCommentId = `cm${Date.now()}`;
                                const newComment = {
                                  id: newCommentId,
                                  content: newCommentContent.trim(),
                                  createdAt: new Date().toISOString(),
                                };
                                setCommunityPosts(prev => prev.map(p =>
                                  p.id === post.id
                                    ? { ...p, comments: [...p.comments, newComment] }
                                    : p
                                ));
                                setNewCommentContent("");
                                // 내가 작성한 댓글 ID 저장
                                const updatedIds = [...myCommentIds, newCommentId];
                                setMyCommentIds(updatedIds);
                                localStorage.setItem("myCommentIds", JSON.stringify(updatedIds));
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: `1px solid ${theme.border}`,
                              borderRadius: 6,
                              background: "#ffffff",
                              color: "#1a1a1a",
                              fontSize: 12,
                              outline: "none",
                              fontFamily: theme.font,
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!newCommentContent.trim()) return;
                              const newCommentId = `cm${Date.now()}`;
                              const newComment = {
                                id: newCommentId,
                                content: newCommentContent.trim(),
                                createdAt: new Date().toISOString(),
                              };
                              setCommunityPosts(prev => prev.map(p =>
                                p.id === post.id
                                  ? { ...p, comments: [...p.comments, newComment] }
                                  : p
                              ));
                              setNewCommentContent("");
                              // 내가 작성한 댓글 ID 저장
                              const updatedIds = [...myCommentIds, newCommentId];
                              setMyCommentIds(updatedIds);
                              localStorage.setItem("myCommentIds", JSON.stringify(updatedIds));
                            }}
                            disabled={!newCommentContent.trim()}
                            style={{
                              padding: "8px 14px",
                              border: "none",
                              borderRadius: 6,
                              background: newCommentContent.trim() ? theme.accent : theme.surface,
                              color: newCommentContent.trim() ? "#000" : theme.textDim,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: newCommentContent.trim() ? "pointer" : "not-allowed",
                              fontFamily: theme.font,
                            }}
                          >
                            등록
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Background Logo */}
      <img
        src="/kmu-logo.svg"
        alt="KMU Logo"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "500px",
          height: "500px",
          opacity: 0.15,
          pointerEvents: "none",
          zIndex: 0,
          objectFit: "contain"
        }}
      />

      <div className="fade-in" style={{ width: "100%", maxWidth: isMobile ? "100%" : 420, position: "relative", zIndex: isCompactLayout ? 30 : 1, transform: isMobile ? "none" : `scale(${loginScale})`, transformOrigin: "center top", padding: isMobile ? "0 4px" : 0 }}>

        {/* Mobile Guide Panel */}
        {isMobile && (
          <div style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>📖</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>이용 안내</span>
              <div style={{ flex: 1, height: 1, background: theme.border, marginLeft: 6 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {[
                { n: "1", t: "안전교육이수증 제출" },
                { n: "2", t: "학번/이름 입력 후 로그인" },
                { n: "3", t: "예약/대여/출력 이용" },
              ].map(s => (
                <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: theme.accentBg, color: theme.accent,
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{s.n}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{s.t}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: theme.text }}>
              <span><span style={{ color: theme.yellow }}>⏰</span> 평일 09:00~17:00</span>
              <span><span style={{ color: theme.blue }}>📍</span> 복지관 602호실</span>
              <span><span style={{ color: theme.green }}>📞</span> 02-910-6525</span>
            </div>
          </div>
        )}

        {/* Main Login Section */}
        <div>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>The Best School of Architecture</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: theme.text, lineHeight: 1.3, letterSpacing: "-0.5px" }}>국민대 건축대학 포털사이트</h1>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 8 }}>Kookmin University School of Architecture Portal</div>

            {/* Feature Boxes */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
              <div style={{
                padding: "8px 16px", borderRadius: 8,
                background: "linear-gradient(135deg, #6BA3D6 0%, #5A8FC2 100%)",
                color: "#fff", fontSize: 12, fontWeight: 600,
                boxShadow: "0 2px 8px rgba(107, 163, 214, 0.3)",
              }}>🏠 실기실 예약</div>
              <div style={{
                padding: "8px 16px", borderRadius: 8,
                background: "linear-gradient(135deg, #6EBD8E 0%, #5DAD7D 100%)",
                color: "#fff", fontSize: 12, fontWeight: 600,
                boxShadow: "0 2px 8px rgba(110, 189, 142, 0.3)",
              }}>🔧 물품 대여</div>
              <div style={{
                padding: "8px 16px", borderRadius: 8,
                background: "linear-gradient(135deg, #E9A56A 0%, #D9955A 100%)",
                color: "#fff", fontSize: 12, fontWeight: 600,
                boxShadow: "0 2px 8px rgba(233, 165, 106, 0.3)",
              }}>🖨️ 출력물 보내기</div>
            </div>
          </div>

          {/* Role Switch */}
          <div style={{ display: "flex", gap: 2, background: theme.surface, borderRadius: theme.radius, padding: 3, marginBottom: 24, border: `1px solid ${theme.border}` }}>
            {[
              { id: "student", label: "학생", icon: <Icons.user size={15} /> },
              { id: "worker", label: "근로학생", icon: <Icons.tool size={15} /> },
              { id: "admin", label: "관리자", icon: <Icons.shield size={15} /> },
            ].map(r => (
              <button key={r.id} disabled={authLoading} onClick={() => { setMode(r.id); setError(""); setWUser(""); setWPass(""); }} style={{
                flex: 1, padding: "11px 8px", borderRadius: 8, border: "none", cursor: authLoading ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: theme.font, transition: "all 0.2s",
                background: mode === r.id ? theme.card : "transparent",
                color: mode === r.id ? theme.text : theme.textMuted, opacity: authLoading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: mode === r.id ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}>{r.icon} {r.label}</button>
            ))}
          </div>

          {/* Login Form */}
          <Card style={{ background: theme.card, backdropFilter: "blur(10px)", border: `1px solid ${theme.border}` }}>
            {mode === "student" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Input label="학번" placeholder="예: 2021001" value={sid} onChange={e => setSid(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                <Input label="이름" placeholder="예: 김건축" value={sname} onChange={e => setSname(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                <Input
                  label="비밀번호 (4자리 숫자)"
                  placeholder="이수증 업로드 시 설정한 비밀번호"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={sPin}
                  onChange={e => setSPin(e.target.value.replace(/[^0-9]/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
                {error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: `1px solid ${theme.redBorder}`, color: theme.red, fontSize: 13 }}>
                    <Icons.alert size={16} /> {error}
                  </div>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.textMuted }}>
                  <input
                    type="checkbox"
                    checked={!!rememberSession}
                    onChange={e => onRememberSessionChange?.(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  로그아웃 후에도 로그인 기억
                </label>
                <Button size="lg" onClick={handleSubmit} disabled={!sid || !sname || sPin.length !== 4 || studentChecking || authLoading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {studentChecking || authLoading ? "확인 중..." : "로그인"}
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Input label="아이디" placeholder={mode === "admin" ? "관리자 아이디" : "근로학생 아이디"} value={wUser} onChange={e => setWUser(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>비밀번호</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"} placeholder="비밀번호 입력"
                      value={wPass} onChange={e => setWPass(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSubmit()}
                      style={{ width: "100%", padding: "10px 42px 10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor = theme.accent}
                      onBlur={e => e.target.style.borderColor = theme.border}
                    />
                    <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}>
                      {showPass ? <Icons.eyeOff size={16} /> : <Icons.eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: `1px solid ${theme.redBorder}`, color: theme.red, fontSize: 13 }}>
                    <Icons.alert size={16} /> {error}
                  </div>
                )}
                <Button size="lg" onClick={handleSubmit} disabled={authLoading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {authLoading ? "로그인 중..." : (mode === "admin" ? "관리자 로그인" : "관리 화면 접속")}
                </Button>
              </div>
            )}
          </Card>



        </div>

        {/* Safety Certificate Upload Banner (Student Mode Only) */}
        {mode === "student" && (
          <div style={{ marginTop: 16, width: "100%" }}>
            <Card
              key={showCertUpload ? "cert-expanded" : "cert-collapsed"}
              onClick={showCertUpload ? undefined : () => setShowCertUpload(true)}
              hover={false}
              style={{
                background: theme.card,
                borderColor: theme.border,
                cursor: showCertUpload ? "default" : "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: theme.blue }}>
                    <Icons.upload size={18} color={theme.blue} />
                    안전교육이수증 업로드
                  </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        onClick={(e) => { e.stopPropagation(); setShowSafetyInfo(true); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "4px 10px",
                          background: "rgba(212,93,93,0.15)", border: `1px solid ${theme.red}`,
                          borderRadius: theme.radiusSm, cursor: "pointer",
                          transition: "all 0.2s", whiteSpace: "nowrap",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(212,93,93,0.25)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(212,93,93,0.15)"}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: theme.red }}>꼭 먼저 읽어주세요</span>
                      </div>
                      {showCertUpload && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowCertUpload(false); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}
                        >
                          <Icons.x size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {!showCertUpload ? (
                    <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
                      안전교육이수증을 업로드하려면 클릭하세요
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                        학번과 이름을 입력한 후 파일을 선택해주세요.
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                          <Input
                            label="학번"
                            placeholder="예: 2021001"
                            value={certSid}
                            onChange={e => setCertSid(e.target.value)}
                          />
                          <Input
                            label="이름"
                            placeholder="예: 김건축"
                            value={certSname}
                            onChange={e => setCertSname(e.target.value)}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                          <Input
                            label="학년"
                            placeholder="예: 2"
                            value={certYear}
                            onChange={e => setCertYear(e.target.value)}
                          />
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>전공</label>
                            <select
                              value={certMajor}
                              onChange={e => setCertMajor(e.target.value)}
                              style={{ width: "100%", padding: "10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", height: 42 }}
                              onFocus={e => e.target.style.borderColor = theme.accent}
                              onBlur={e => e.target.style.borderColor = theme.border}
                            >
                              <option value="">선택</option>
                              <option value="5년제">5년제</option>
                              <option value="4년제">4년제</option>
                            </select>
                          </div>
                        </div>
                        <Input
                          label="이메일"
                          placeholder="예: student@school.ac.kr"
                          value={certEmail}
                          onChange={e => setCertEmail(e.target.value)}
                        />
                        <Input
                          label="비밀번호 (4자리 숫자)"
                          placeholder="로그인 시 사용할 비밀번호"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={certPin}
                          onChange={e => setCertPin(e.target.value.replace(/[^0-9]/g, ""))}
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          style={{ display: "none" }}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: uploading ? "not-allowed" : "pointer",
                            padding: "10px 16px",
                            background: theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: theme.radiusSm,
                            fontSize: 13,
                            color: theme.text,
                            transition: "all 0.2s",
                            fontFamily: theme.font,
                            width: "100%",
                            justifyContent: "flex-start",
                            opacity: uploading ? 0.5 : 1
                          }}
                          onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = theme.blue; e.currentTarget.style.background = theme.surfaceHover; } }}
                          onMouseLeave={e => { if (!uploading) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.surface; } }}
                        >
                          <Icons.file size={16} />
                          {uploadFile ? uploadFile.name : "파일 선택"}
                        </button>
                        {uploadFile && (
                          <button
                            onClick={handleConfirmUpload}
                            disabled={uploading}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              cursor: uploading ? "not-allowed" : "pointer",
                              padding: "12px 16px",
                              background: theme.blue,
                              border: "none",
                              borderRadius: theme.radiusSm,
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#fff",
                              transition: "all 0.2s",
                              fontFamily: theme.font,
                              width: "100%",
                              opacity: uploading ? 0.5 : 1
                            }}
                            onMouseEnter={e => { if (!uploading) e.currentTarget.style.opacity = "0.9"; }}
                            onMouseLeave={e => { if (!uploading) e.currentTarget.style.opacity = "1"; }}
                          >
                            {uploading ? <Icons.loading size={16} /> : <Icons.upload size={16} />}
                            {uploading ? "업로드 중..." : "업로드"}
                          </button>
                        )}
                        {uploadSuccess && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, color: theme.green, fontSize: 12 }}>
                            <Icons.check size={14} /> {uploadSuccess}
                          </div>
                        )}
                        {certificates?.[certSid.trim()] && certSid.trim() && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.accentBg, border: `1px solid ${theme.accentBorder}`, color: theme.accent, fontSize: 11 }}>
                            <Icons.file size={14} />
                            기존 업로드: {certificates[certSid.trim()].fileName} ({new Date(certificates[certSid.trim()].uploadDate).toLocaleDateString()})
                          </div>
                        )}
                      </div>
                    </>
                  )}
              </div>
            </Card>
          </div>
        )}

        {/* Safety Info Modal */}
        {showSafetyInfo && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "transparent", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10000, padding: 20,
          }} onClick={() => setShowSafetyInfo(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: theme.card, borderRadius: theme.radius, border: "none",
              padding: 28, maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto",
              boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: theme.red }}>⚠️ 꼭 먼저 읽어주세요</div>
                <button onClick={() => setShowSafetyInfo(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 4 }}>
                  <Icons.x size={18} />
                </button>
              </div>

              <div style={{ padding: "14px 16px", background: "rgba(212,93,93,0.12)", border: `1px solid ${theme.red}`, borderRadius: theme.radiusSm, marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: theme.red, marginBottom: 10 }}>❌ 안전교육 미이수자 ❌</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "출력실 사용 불가(출력X)",
                    "건축대학 실기실 사용 불가",
                    "건축대학 물품대여 불가",
                    "철야불가",
                    "교내 장학 대상자에서 제외",
                    "졸업 논문 심사 시 제재",
                    "일반근로 신청 제재",
                  ].map((item, i) => (
                    <div key={i} style={{ fontSize: 13, color: theme.red, fontWeight: 600, paddingLeft: 8 }}>- {item}</div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 8 }}>⭐안전교육이수증 발급 받는 방법!</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 8 }}>1. 대상</div>
                <div style={{ fontSize: 13, color: theme.text, fontWeight: 600, paddingLeft: 12 }}>건축대학 소속 재학생 전체</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 8 }}>2. 수강 방법</div>
                <div style={{ paddingLeft: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, color: theme.text, fontWeight: 600, marginBottom: 4 }}>1. 연구실안전관리시스템 로그인 (ON국민 계정 사용)</div>
                    <a
                      href="https://safety.kookmin.ac.kr/UserHome/Index?LabNo=0"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: theme.blue, textDecoration: "underline", wordBreak: "break-all" }}
                    >
                      바로가기 : https://safety.kookmin.ac.kr/UserHome/Index?LabNo=0
                    </a>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: theme.text, fontWeight: 600 }}>2. 메인페이지에서 연구실안전교육 클릭 후 수강</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: theme.text, fontWeight: 600 }}>3. 안전교육이수증 다운 후, 업로드하기</div>
                  </div>
                </div>
              </div>

              <Button variant="secondary" size="md" onClick={() => setShowSafetyInfo(false)} style={{ width: "100%" }}>닫기</Button>
            </div>
          </div>
        )}

        {/* Upload Confirm Modal */}
        {showUploadConfirm && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10000,
            animation: "fadeIn 0.2s ease"
          }}>
            <div style={{
              background: theme.card,
              borderRadius: theme.radius,
              border: "none",
              padding: 28,
              maxWidth: 400,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)"
            }}>
              <div style={{
                width: 60, height: 60,
                borderRadius: "50%",
                background: theme.greenBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px"
              }}>
                <Icons.check size={28} color={theme.green} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 12 }}>
                업로드 완료
              </div>
              <div style={{ fontSize: 14, color: theme.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
                교학팀에서 확인 후, 적어주신 이메일 주소로 확인 메일 보내드리겠습니다.
              </div>
              <Button
                variant="primary"
                onClick={() => setShowUploadConfirm(false)}
                style={{ width: "100%" }}
              >
                확인
              </Button>
            </div>
          </div>
        )}

        {/* Inquiry Banner */}
        <div style={{ marginTop: 12 }}>
          <Card
            key={showInquiry ? "inq-expanded" : "inq-collapsed"}
            onClick={showInquiry ? undefined : () => setShowInquiry(true)}
            hover={false}
            style={{
              background: theme.card,
              borderColor: theme.border,
              cursor: showInquiry ? "default" : "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: theme.accent }}>
                    <Icons.file size={18} color={theme.accent} />
                    문의사항
                  </div>
                  {showInquiry && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowInquiry(false); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}
                    >
                      <Icons.x size={16} />
                    </button>
                  )}
                </div>

                {!showInquiry ? (
                  <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
                    비로그인 문의 (로그인 가능한 학생은 "문의 내역" 탭을 이용해주세요)
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                      로그인이 어려운 분들을 위한 문의 창입니다.
                    </div>
                    <div style={{ fontSize: 11, color: theme.yellow, marginBottom: 12, padding: "8px 12px", background: theme.yellowBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.yellowBorder}` }}>
                      ⚠️ 로그인 가능한 학생은 로그인 후 "문의 내역" 탭에서 문의해주세요. 답변 확인이 가능합니다.
                    </div>
                    <div style={{ fontSize: 11, color: theme.accent, marginBottom: 12, padding: "8px 12px", background: theme.accentBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.accentBorder}` }}>
                      📞 비로그인 문의는 근로학생이 연락처로 직접 답변드립니다.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <Input
                          label="이름 *"
                          placeholder="이름을 입력하세요"
                          value={inquiryName}
                          onChange={e => setInquiryName(e.target.value)}
                        />
                        <Input
                          label="연락처 *"
                          placeholder="전화번호 또는 이메일"
                          value={inquiryContact}
                          onChange={e => setInquiryContact(e.target.value)}
                        />
                      </div>
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
                      <Button
                        variant="primary"
                        onClick={handleInquirySubmit}
                        disabled={!inquiryTitle.trim() || !inquiryContent.trim() || !inquiryName.trim() || !inquiryContact.trim() || inquirySubmitting}
                      >
                        {inquirySubmitting ? "등록 중..." : "문의 등록"}
                      </Button>
                      {inquirySuccess && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, color: theme.green, fontSize: 12 }}>
                          <Icons.check size={14} /> {inquirySuccess}
                        </div>
                      )}
                    </div>
                  </>
                )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
