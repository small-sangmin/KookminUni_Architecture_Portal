import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { EDITABLE, ROOMS, ADMIN_ACCOUNT, STUDENTS_DB } from "../constants/data";
import theme from "../constants/theme";
import { uid, ts } from "../utils/helpers";
import store from "../utils/storage";
import Icons from "../components/Icons";
import { Badge, Card, Button, Input, SectionTitle, Empty, Divider, Tabs } from "../components/ui";
import PortalLoadingScreen from "../components/PortalLoadingScreen";
import AnimatedBorderButton from "../components/AnimatedBorderButton";

function LoginPage({ onLogin, onReset, onHelp, workers, verifyStudentInSheet, rememberSession, onRememberSessionChange, blacklist, warnings, certificates, updateCertificates, inquiries, updateInquiries, savedCredentials, isMobile, isDark, toggleDark }) {
  const [mode, setMode] = useState("student");
  const [isSignUp, setIsSignUp] = useState(false);
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
  const [idPhotoFile, setIdPhotoFile] = useState(null);
  const [idPhotoSuccess, setIdPhotoSuccess] = useState("");
  const [showIdPhotoForm, setShowIdPhotoForm] = useState(false);
  const [idPhotoStudentId, setIdPhotoStudentId] = useState("");
  const [idPhotoEmail, setIdPhotoEmail] = useState("");
  const [idPhotoName, setIdPhotoName] = useState("");
  const [idPhotoSubmitting, setIdPhotoSubmitting] = useState(false);
  const [idPhotoFormSuccess, setIdPhotoFormSuccess] = useState("");
  const fileInputRef = useRef(null);
  const idPhotoInputRef = useRef(null);


  const [haedongHover, setHaedongHover] = useState(false);
  const [certHover, setCertHover] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.innerWidth <= 1400);
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
      setIsCompactLayout(width <= 1400);
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

  const handleIdPhotoSubmit = async () => {
    if (!idPhotoStudentId.trim() || !idPhotoEmail.trim() || !idPhotoName.trim() || !idPhotoFile) return;
    setIdPhotoSubmitting(true);
    let idPhotoDriveFileId = null;
    try {
      const driveUrl = EDITABLE.driveUpload?.url?.trim();
      if (driveUrl) {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(idPhotoFile);
        });
        const ext = idPhotoFile.name.split(".").pop() || "jpg";
        const photoFileName = `${idPhotoName.trim()}_${idPhotoStudentId.trim()}_${idPhotoEmail.trim()}.${ext}`;
        const res = await fetch(driveUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: JSON.stringify({
            action: "upload_to_drive",
            key: EDITABLE.apiKey,
            fileName: photoFileName,
            mimeType: idPhotoFile.type,
            folderName: "Portal_학생증 사진 변경",
            fileData: base64Data,
          }),
        });
        try { const r = JSON.parse(await res.text()); idPhotoDriveFileId = r.fileId || r.id || null; } catch {}
      }
    } catch (err) {
      console.error("학생증 사진 업로드 실패:", err);
    }
    const newInquiry = {
      id: uid(),
      title: "학생증 사진 변경 신청",
      content: `학번: ${idPhotoStudentId.trim()}\n이메일: ${idPhotoEmail.trim()}`,
      name: idPhotoName.trim(),
      contact: idPhotoEmail.trim(),
      createdAt: ts(),
      status: "pending",
      answer: null,
      isLoggedIn: false,
      hasIdPhoto: true,
      ...(idPhotoDriveFileId ? { idPhotoDriveFileId } : {}),
    };
    updateInquiries(prev => [newInquiry, ...prev]);
    setIdPhotoStudentId("");
    setIdPhotoEmail("");
    setIdPhotoName("");
    setIdPhotoFile(null);
    setIdPhotoSuccess("");
    setIdPhotoSubmitting(false);
    setIdPhotoFormSuccess("신청이 완료되었습니다! 검토 후 처리해 드리겠습니다.");
    setTimeout(() => { setIdPhotoFormSuccess(""); setShowIdPhotoForm(false); }, 3000);
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
      const driveUrl = EDITABLE.driveUpload?.url?.trim();
      if (!driveUrl) throw new Error("구글 드라이브 업로드 설정이 없습니다.");
      // 파일을 base64로 읽기
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      const ext = uploadFile.name.split(".").pop() || "pdf";
      const driveFileName = `${sid}_${certSname.trim()}.${ext}`;
      const folderName = EDITABLE.driveUpload?.folderName || "Portal_안전교육이수증";
      // 구글 드라이브에 즉시 업로드
      let driveFileId = null;
      try {
        const res = await fetch(driveUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: JSON.stringify({
            action: "upload_to_drive",
            key: EDITABLE.apiKey,
            fileName: driveFileName,
            mimeType: uploadFile.type,
            folderName,
            fileData: base64Data,
          }),
        });
        const text = await res.text();
        try { const result = JSON.parse(text); driveFileId = result.fileId || result.id || null; } catch {}
      } catch (driveErr) {
        throw new Error("구글 드라이브 업로드 실패: " + (driveErr?.message || "알 수 없는 오류"));
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
        ...(driveFileId ? { driveFileId } : {}),
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
    if (!wUser.trim() || !wPass.trim()) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    const found = workers.find(w => w.username === wUser.trim() && w.password === wPass.trim());
    if (!found) { setError("아이디 또는 비밀번호가 올바르지 않습니다."); return; }
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
    if (!wUser.trim() || !wPass.trim()) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    if (wUser.trim() !== ADMIN_ACCOUNT.username || wPass.trim() !== ADMIN_ACCOUNT.password) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
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
    <>
    {/* Aurora 배경 - 전체 화면 고정 (CSS) */}
    <div className="aurora-bg" />
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: isMobile ? 0 : 140,
      paddingBottom: 60,
      position: "relative",
      overflow: "auto",
      zIndex: 1,
    }}>
      {authLoading && <PortalLoadingScreen isDark={isDark} overlay />}
      {/* Theme Toggle */}
      <AnimatedBorderButton isCircle style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        <button onClick={toggleDark} style={{
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
      </AnimatedBorderButton>

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
          backdropFilter: "blur(12px)",
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          padding: "14px 20px",
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.06)",
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
        zIndex: (haedongHover || certHover) ? 9999 : 5,
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
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              minWidth: 140,
              boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.04)",
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
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              minWidth: 140,
              transform: certHover ? "translateX(4px)" : "translateX(0)",
              boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.04)",
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
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              minWidth: 140,
              transform: haedongHover ? "translateX(4px)" : "translateX(0)",
              boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.04)",
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
      <div className="fade-in" style={{ width: "100%", maxWidth: isMobile ? "100%" : 850, position: "relative", zIndex: 10, transform: isMobile ? "none" : `scale(${loginScale})`, transformOrigin: "center top", padding: isMobile ? "0 4px" : 0 }}>

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

        {/* Welcome Banner */}
        <div style={{ textAlign: "center", marginBottom: 28, marginTop: 8 }}>
          <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.2, background: "linear-gradient(135deg, #FF6B00 0%, #FF9A3C 60%, #FFD580 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            신입생분들 입학을 진심으로 환영합니다!
          </div>
          <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 8, letterSpacing: "0.3px" }}>
            세상에서 가장 긴 여행은 개강한 날부터 마감하는 날까지입니다 — 함께 떠나봅시다! 🎉
          </div>
        </div>

        {/* Main Login Section */}
        {(() => {
          const signInForm = (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 30 }}>
                <h1 style={{ fontSize: 30, fontWeight: 800, color: "#158a3d", lineHeight: 1.3, letterSpacing: "-0.5px" }}>Sign in to Portal</h1>
                <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 8 }}>Kookmin University School of Architecture Portal</div>

                {/* Feature Boxes */}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                  <div style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg, #6BA3D6 0%, #5A8FC2 100%)", color: "#fff", fontSize: 11, fontWeight: 600, boxShadow: "0 4px 12px rgba(107, 163, 214, 0.4)" }}>🏠 실기실 예약</div>
                  <div style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg, #6EBD8E 0%, #5DAD7D 100%)", color: "#fff", fontSize: 11, fontWeight: 600, boxShadow: "0 4px 12px rgba(110, 189, 142, 0.4)" }}>🔧 물품 대여</div>
                  <div style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg, #E9A56A 0%, #D9955A 100%)", color: "#fff", fontSize: 11, fontWeight: 600, boxShadow: "0 4px 12px rgba(233, 165, 106, 0.4)" }}>🖨️ 출력물 보내기</div>
                </div>
              </div>

              {/* Role Switch */}
              <div style={{ display: "flex", gap: 2, background: theme.surface, borderRadius: theme.radius, padding: 3, marginBottom: 20, border: `1px solid ${theme.border}` }}>
                {[{ id: "student", label: "학생", icon: <Icons.user size={15} /> }, { id: "worker", label: "근로학생", icon: <Icons.tool size={15} /> }, { id: "admin", label: "관리자", icon: <Icons.shield size={15} /> }].map(r => (
                  <button key={r.id} disabled={authLoading} onClick={() => { setMode(r.id); setError(""); setWUser(""); setWPass(""); }} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: "none", cursor: authLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: theme.font, transition: "all 0.2s", background: mode === r.id ? theme.card : "transparent", color: mode === r.id ? theme.text : theme.textMuted, opacity: authLoading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: mode === r.id ? "0 1px 4px rgba(0,0,0,0.3)" : "none" }}>{r.icon} {r.label}</button>
                ))}
              </div>

              {/* Login Form */}
              {mode === "student" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Input label="학번" placeholder="예: 2021001" value={sid} onChange={e => setSid(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                  <Input label="이름" placeholder="예: 김건축" value={sname} onChange={e => setSname(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                  <Input label="비밀번호 (4자리 숫자)" placeholder="이수증 업로드 시 설정한 비밀번호" type="password" inputMode="numeric" maxLength={4} value={sPin} onChange={e => setSPin(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                  {error && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: `1px solid ${theme.redBorder}`, color: theme.red, fontSize: 13 }}><Icons.alert size={16} /> {error}</div>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.textMuted }}>
                    <input type="checkbox" checked={!!rememberSession} onChange={e => onRememberSessionChange?.(e.target.checked)} style={{ width: 14, height: 14 }} /> 로그아웃 후에도 로그인 기억
                  </label>
                  <Button size="lg" onClick={handleSubmit} disabled={!sid || !sname || sPin.length !== 4 || studentChecking || authLoading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>{studentChecking || authLoading ? "확인 중..." : "로그인"}</Button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Input label="아이디" placeholder={mode === "admin" ? "관리자 아이디" : "근로학생 아이디"} value={wUser} onChange={e => setWUser(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>비밀번호</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPass ? "text" : "password"} placeholder="비밀번호 입력" value={wPass} onChange={e => setWPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={{ width: "100%", padding: "10px 42px 10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.border} />
                      <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}><Icons.eyeOff size={16} /></button>
                    </div>
                  </div>
                  {error && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: `1px solid ${theme.redBorder}`, color: theme.red, fontSize: 13 }}><Icons.alert size={16} /> {error}</div>
                  )}
                  <Button size="lg" onClick={handleSubmit} disabled={authLoading || !wUser.trim() || !wPass} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>{authLoading ? "로그인 중..." : (mode === "admin" ? "관리자 로그인" : "관리 화면 접속")}</Button>
                </div>
              )}
              <button
                onClick={onHelp}
                style={{ marginTop: 14, width: "100%", padding: "11px 16px", background: theme.blueBg, border: `1px solid ${theme.blueBorder}`, borderRadius: theme.radiusSm, cursor: "pointer", color: theme.blue, fontSize: 13, fontWeight: 600, fontFamily: theme.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "opacity 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <Icons.info size={15} sw={2.8} /> 포털 이용 안내 보기
              </button>
            </div>
          );

          const signUpForm = (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: '100%', height: '100%', justifyContent: 'center' }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <h1 style={{ fontSize: 30, fontWeight: 800, color: "#158a3d", marginBottom: 8 }}>Create Account</h1>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: theme.textMuted, marginBottom: 8 }}>안전교육이수증 업로드</h2>
                <div style={{ fontSize: 13, color: theme.textMuted }}>학번과 이름을 입력한 후 파일을 선택해주세요.</div>
                <div style={{ marginTop: 10 }}>
                  <div onClick={() => setShowSafetyInfo(true)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", background: "rgba(212,93,93,0.15)", border: `1px solid ${theme.red}`, borderRadius: 20, cursor: "pointer", transition: "all 0.2s" }}><span style={{ fontSize: 12, fontWeight: 700, color: theme.red }}>⚠️ 미이수자 안내 꼭 읽어주세요</span></div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="학번" placeholder="예: 2021001" value={certSid} onChange={e => setCertSid(e.target.value)} />
                <Input label="이름" placeholder="예: 김건축" value={certSname} onChange={e => setCertSname(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="학년" placeholder="예: 2" value={certYear} onChange={e => setCertYear(e.target.value)} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>전공</label>
                  <select value={certMajor} onChange={e => setCertMajor(e.target.value)} style={{ width: "100%", padding: "10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", height: 42 }} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.border}>
                    <option value="">선택</option><option value="5년제">5년제</option><option value="4년제">4년제</option><option value="미정">미정</option>
                  </select>
                </div>
              </div>
              <Input label="이메일" placeholder="예: student@school.ac.kr" value={certEmail} onChange={e => setCertEmail(e.target.value)} />
              <Input label="비밀번호 (4자리 숫자)" placeholder="로그인 시 사용할 비밀번호" type="password" inputMode="numeric" maxLength={4} value={certPin} onChange={e => setCertPin(e.target.value.replace(/[^0-9]/g, ""))} />

              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ display: "flex", alignItems: "center", gap: 8, cursor: uploading ? "not-allowed" : "pointer", padding: "10px 16px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, fontSize: 13, color: theme.text, transition: "all 0.2s", fontFamily: theme.font, width: "100%", justifyContent: "flex-start", opacity: uploading ? 0.5 : 1 }}>
                <Icons.file size={16} />{uploadFile ? uploadFile.name : "파일 선택"}
              </button>
              <button onClick={handleConfirmUpload} disabled={uploading || !uploadFile || !certSid.trim() || !certSname.trim() || !certYear.trim() || !certMajor.trim() || !certEmail.trim() || certPin.length !== 4} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: (uploading || !uploadFile || !certSid.trim() || !certSname.trim() || !certYear.trim() || !certMajor.trim() || !certEmail.trim() || certPin.length !== 4) ? "not-allowed" : "pointer", padding: "12px 16px", background: (!uploadFile || !certSid.trim() || !certSname.trim() || !certYear.trim() || !certMajor.trim() || !certEmail.trim() || certPin.length !== 4) ? theme.border : theme.blue, border: "none", borderRadius: theme.radiusSm, fontSize: 13, fontWeight: 600, color: "#fff", transition: "all 0.2s", fontFamily: theme.font, width: "100%", opacity: (uploading || !uploadFile || !certSid.trim() || !certSname.trim() || !certYear.trim() || !certMajor.trim() || !certEmail.trim() || certPin.length !== 4) ? 0.5 : 1 }}>
                {uploading ? <Icons.loading size={16} /> : <Icons.upload size={16} />}{uploading ? "업로드 중..." : "업로드"}
              </button>
              {uploadSuccess && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, color: theme.green, fontSize: 12 }}><Icons.check size={14} /> {uploadSuccess}</div>
              )}

            </div>
          );

          if (isMobile) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Card style={{ background: theme.card, backdropFilter: "blur(12px)", border: `1px solid ${theme.border}`, boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.08)" }}>
                  {signInForm}
                </Card>
                <Card
                  onClick={isSignUp ? undefined : () => setIsSignUp(true)}
                  hover={false}
                  style={{
                    background: isSignUp ? "#fff" : theme.card,
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${theme.border}`,
                    boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.08)",
                    cursor: isSignUp ? "default" : "pointer",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isSignUp ? 12 : 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: theme.green }}>
                      <Icons.upload size={18} color={theme.green} />
                      Create Account
                    </div>
                    {isSignUp && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsSignUp(false); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}
                      >
                        <Icons.x size={16} />
                      </button>
                    )}
                  </div>
                  {!isSignUp ? (
                    <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
                      안전교육이수증 업로드 (처음 이용 시 클릭)
                    </div>
                  ) : (
                    signUpForm
                  )}
                </Card>
              </div>
            );
          }

          return (
            <div style={{ position: 'relative', width: 850, height: 620, background: theme.card, borderRadius: 20, boxShadow: isDark ? "0 12px 48px rgba(0,0,0,0.5)" : "0 12px 48px rgba(0,0,0,0.08)", overflow: 'hidden', border: `1px solid ${theme.border}` }}>
              {/* Sign In Container */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'all 0.6s ease-in-out', transform: isSignUp ? 'translateX(100%)' : 'translateX(0)', opacity: isSignUp ? 0 : 1, zIndex: isSignUp ? 1 : 5, pointerEvents: isSignUp ? 'none' : 'auto' }}>
                {signInForm}
              </div>

              {/* Sign Up Container */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'all 0.6s ease-in-out', transform: isSignUp ? 'translateX(100%)' : 'translateX(0)', opacity: isSignUp ? 1 : 0, zIndex: isSignUp ? 5 : 1, pointerEvents: isSignUp ? 'auto' : 'none' }}>
                {signUpForm}
              </div>

              {/* Overlay Container */}
              <div style={{ position: 'absolute', top: 0, left: '50%', width: '50%', height: '100%', overflow: 'hidden', transition: 'transform 0.6s ease-in-out', transform: isSignUp ? 'translateX(-100%)' : 'translateX(0)', zIndex: 100 }}>
                {/* Overlay Background */}
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%', background: `linear-gradient(135deg, #5aac7a 0%, #2d6e4a 100%)`, color: '#fff', transition: 'transform 0.6s ease-in-out', transform: isSignUp ? 'translateX(50%)' : 'translateX(0)' }}>
                  {/* Watermark Logo */}
                  <img src="/kmu-logo.svg" alt="" style={{ position: 'absolute', top: '50%', left: '25%', transform: 'translate(-50%, -50%)', width: '60%', height: '60%', objectFit: 'contain', opacity: 0.3, pointerEvents: 'none', zIndex: 0 }} />
                  <img src="/kmu-logo.svg" alt="" style={{ position: 'absolute', top: '50%', left: '75%', transform: 'translate(-50%, -50%)', width: '60%', height: '60%', objectFit: 'contain', opacity: 0.3, pointerEvents: 'none', zIndex: 0 }} />

                  {/* Overlay Left (Sign In Prompt) */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px', transition: 'transform 0.6s ease-in-out', transform: isSignUp ? 'translateX(0)' : 'translateX(-20%)' }}>
                    <img src="/kmu-logo.png" alt="KMU Logo" style={{ width: 140, marginBottom: 20, filter: "brightness(0) invert(1)", opacity: 0.9 }} />
                    <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>HELLO!</h2>
                    <p style={{ fontSize: 13, marginBottom: 30, lineHeight: 1.6, opacity: 0.9 }}>
                      안전교육이수증 업로드를 마치셨다면<br />기존 계정으로 로그인해주세요.
                    </p>
                    <button onClick={() => setIsSignUp(false)} style={{ background: 'transparent', border: '2px solid #fff', color: '#fff', padding: '10px 40px', borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>SIGN IN</button>
                  </div>

                  {/* Overlay Right (Sign Up Prompt) */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px', transition: 'transform 0.6s ease-in-out', transform: isSignUp ? 'translateX(20%)' : 'translateX(0)' }}>
                    <img src="/kmu-logo.png" alt="KMU Logo" style={{ width: 140, marginBottom: 20, filter: "brightness(0) invert(1)", opacity: 0.9 }} />
                    <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>WELCOME!</h2>
                    <p style={{ fontSize: 13, marginBottom: 30, lineHeight: 1.6, opacity: 0.9 }}>
                      건축대학 포털을 처음 이용하시나요?<br />안전교육이수증을 먼저 업로드해주세요.
                    </p>
                    <button onClick={() => setIsSignUp(true)} style={{ background: 'transparent', border: '2px solid #fff', color: '#fff', padding: '10px 40px', borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>SIGN UP</button>
                  </div>

                </div>
              </div>
            </div>
          );
        })()}


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
                  비로그인 문의 (로그인 가능한 학생은 로그인 후 "문의 내역" 탭을 이용해주세요)
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
                    📞 비로그인 문의는 근로학생이 연락처 또는 이메일로 직접 답변드립니다.
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

        {/* 학생증 사진 변경 신청 Banner */}
        <div style={{ marginTop: 8 }}>
          <Card
            key={showIdPhotoForm ? "idphoto-expanded" : "idphoto-collapsed"}
            onClick={showIdPhotoForm ? undefined : () => setShowIdPhotoForm(true)}
            hover={false}
            style={{
              background: theme.card,
              borderColor: showIdPhotoForm ? theme.accentBorder : theme.border,
              cursor: showIdPhotoForm ? "default" : "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: theme.accent }}>
                  <Icons.upload size={18} color={theme.accent} />
                  학생증 사진 변경 신청
                </div>
                {showIdPhotoForm && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowIdPhotoForm(false); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}
                  >
                    <Icons.x size={16} />
                  </button>
                )}
              </div>

              {!showIdPhotoForm ? (
                <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
                  학생증 사진 변경을 원하시면 클릭하여 신청해주세요
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: theme.accent, marginBottom: 14, padding: "8px 12px", background: theme.accentBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.accentBorder}` }}>
                    📸 학번, 이름, 이메일을 입력하고 변경할 사진을 첨부해 주세요. 검토 후 처리해 드립니다.
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* 학번 + 이름 */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <Input
                        label="학번 *"
                        placeholder="학번을 입력하세요"
                        value={idPhotoStudentId}
                        onChange={e => setIdPhotoStudentId(e.target.value)}
                      />
                      <Input
                        label="이름 *"
                        placeholder="이름을 입력하세요"
                        value={idPhotoName}
                        onChange={e => setIdPhotoName(e.target.value)}
                      />
                    </div>

                    {/* 이메일 */}
                    <Input
                      label="이메일 *"
                      placeholder="이메일 주소를 입력하세요"
                      value={idPhotoEmail}
                      onChange={e => setIdPhotoEmail(e.target.value)}
                    />

                    {/* 사진 파일 첨부 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        학생증 사진 *
                      </label>
                      <input
                        ref={idPhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIdPhotoFile(file);
                          setIdPhotoSuccess("");
                        }}
                        style={{ display: "none" }}
                      />
                      <button
                        onClick={() => idPhotoInputRef.current?.click()}
                        disabled={idPhotoSubmitting}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "10px 14px",
                          background: theme.surface,
                          border: `1px solid ${idPhotoFile ? theme.accent : theme.border}`,
                          borderRadius: theme.radiusSm,
                          fontSize: 13, color: theme.text,
                          cursor: idPhotoSubmitting ? "not-allowed" : "pointer",
                          fontFamily: theme.font,
                          width: "100%",
                          textAlign: "left",
                          opacity: idPhotoSubmitting ? 0.5 : 1,
                          transition: "border-color 0.2s",
                        }}
                      >
                        <Icons.upload size={15} color={idPhotoFile ? theme.accent : theme.textMuted} />
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {idPhotoFile ? idPhotoFile.name : "사진 파일 선택 (JPG, PNG 등)"}
                        </span>
                        {idPhotoFile && (
                          <span
                            onClick={e => { e.stopPropagation(); setIdPhotoFile(null); setIdPhotoSuccess(""); }}
                            style={{ fontSize: 11, color: theme.textDim, padding: "0 2px", cursor: "pointer" }}
                          >
                            ✕
                          </span>
                        )}
                      </button>
                      {idPhotoFile && (
                        <div style={{ fontSize: 10, color: theme.textMuted }}>
                          {idPhotoFile.name} · {(idPhotoFile.size / 1024).toFixed(0)} KB
                        </div>
                      )}
                    </div>

                    {/* 제출 버튼 */}
                    <Button
                      variant="primary"
                      onClick={handleIdPhotoSubmit}
                      disabled={!idPhotoStudentId.trim() || !idPhotoEmail.trim() || !idPhotoName.trim() || !idPhotoFile || idPhotoSubmitting}
                    >
                      {idPhotoSubmitting ? "업로드 중..." : "신청 제출"}
                    </Button>

                    {idPhotoFormSuccess && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, color: theme.green, fontSize: 12 }}>
                        <Icons.check size={14} /> {idPhotoFormSuccess}
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
    </>
  );
}

export default LoginPage;
