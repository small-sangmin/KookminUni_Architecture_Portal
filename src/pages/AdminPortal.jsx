import { useState, useRef, useEffect, useCallback } from "react";
import { EDITABLE, ROOMS } from "../constants/data";
import theme from "../constants/theme";
import { uid, ts, emailTemplate } from "../utils/helpers";
import store from "../utils/storage";
import { certificateStorage, formStorage } from "../supabase";
import Icons from "../components/Icons";
import { Badge, Card, Button, Input, SectionTitle, Empty, Tabs } from "../components/ui";
import AnimatedBorderButton from "../components/AnimatedBorderButton";

const ADMIN_ACCOUNT = EDITABLE.adminAccount;

function AdminPortal({ onLogout, workers, updateWorkers, logs, addLog, updateLogs, sheetConfig, updateSheetConfig, warnings, updateWarnings, blacklist, updateBlacklist, certificates, updateCertificates, sendEmailNotification, communityPosts, setCommunityPosts, exhibitionPosts, setExhibitionPosts, equipmentDB, setEquipmentDB, categoryOrder, setCategoryOrder, roomStatus, updateRoomStatus, formFiles, updateFormFiles, isMobile, isDark, toggleDark }) {
  const [tab, setTabRaw] = useState("accounts");
  const setTab = useCallback((newTab) => {
    setTabRaw(prev => {
      if (prev !== newTab) history.replaceState({ page: "admin", tab: newTab }, "");
      return newTab;
    });
  }, []);
  useEffect(() => {
    const onPopState = (e) => {
      const s = e.state;
      if (s?.page === "admin") setTabRaw(s.tab || "accounts");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", username: "", password: "", shift: "" });
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showPassFor, setShowPassFor] = useState({});
  const [sheetUrl, setSheetUrl] = useState(sheetConfig?.reservationWebhookUrl || "");
  const [warnForm, setWarnForm] = useState({ studentId: "", name: "", reason: "" });
  const [blkForm, setBlkForm] = useState({ studentId: "", name: "", reason: "" });
  const [certModal, setCertModal] = useState(null);
  const [certFileData, setCertFileData] = useState(null);
  const [certFileLoading, setCertFileLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [logSelectMode, setLogSelectMode] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());
  const [logDeleteConfirm, setLogDeleteConfirm] = useState(false);
  // 양식함 관리
  const [showFormUpload, setShowFormUpload] = useState(false);
  const [formUploadFile, setFormUploadFile] = useState(null);
  const [formUploadName, setFormUploadName] = useState("");
  const [formUploadDesc, setFormUploadDesc] = useState("");
  const [formUploading, setFormUploading] = useState(false);
  const [formUploadError, setFormUploadError] = useState("");

  const openCertModal = async (cert) => {
    setCertModal(cert);
    setCertFileData(null);
    setCertFileLoading(true);
    let fileData = null;
    if (cert.storagePath) {
      fileData = await certificateStorage.getSignedUrl(cert.storagePath);
    } else if (cert.driveFileId) {
      fileData = `https://drive.google.com/file/d/${cert.driveFileId}/view`;
    } else {
      fileData = cert.data || await store.get(`certFile_${cert.studentId}`);
    }
    setCertFileData(fileData);
    setCertFileLoading(false);
  };
  // 커뮤니티/전시 관리 상태
  const [exhForm, setExhForm] = useState({ title: "", description: "", dates: "", location: "", instagramUrl: "", posterUrl: "" });
  const [exhSaved, setExhSaved] = useState(false);
  const [exhEditingId, setExhEditingId] = useState(null);
  const [exhDeleteConfirm, setExhDeleteConfirm] = useState(null);
  const [exhPosterFile, setExhPosterFile] = useState(null);
  const [exhPosterUploading, setExhPosterUploading] = useState(false);
  const exhPosterFileRef = useRef(null);
  const [cmDeleteConfirm, setCmDeleteConfirm] = useState(null);
  const [cmExpandedPostId, setCmExpandedPostId] = useState(null);
  const [cmCommentDeleteConfirm, setCmCommentDeleteConfirm] = useState(null);
  // 물품 관리 상태
  const [eqForm, setEqForm] = useState({ name: "", category: "", available: 0, total: 0, deposit: false, maxDays: 1, icon: "" });
  const [eqEditingId, setEqEditingId] = useState(null);
  const [eqDeleteConfirm, setEqDeleteConfirm] = useState(null);
  const dragCatIdx = useRef(null);
  const dragOverCatIdx = useRef(null);
  const [eqShowForm, setEqShowForm] = useState(false);
  const [eqOpenCats, setEqOpenCats] = useState({});
  const [eqNewCat, setEqNewCat] = useState(null);
  const resetEqForm = () => {
    const firstCat = [...new Set(equipmentDB.map(e => e.category))][0] || "";
    setEqForm({ name: "", category: firstCat, available: 0, total: 0, deposit: false, maxDays: 1, icon: "" });
    setEqNewCat(null);
    setEqEditingId(null);
    setEqShowForm(false);
  };

  const handlePosterUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기가 5MB를 초과합니다. 더 작은 이미지를 선택해주세요.");
      return;
    }
    setExhPosterUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setExhForm(p => ({ ...p, posterUrl: reader.result }));
      setExhPosterFile(file);
      setExhPosterUploading(false);
    };
    reader.onerror = () => {
      alert("이미지 업로드 실패");
      setExhPosterUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // 이수증 개수 계산 (승인 완료된 항목 제외)
  const pendingCertificates = certificates
    ? Object.fromEntries(Object.entries(certificates).filter(([_, c]) => !c.approved))
    : {};
  const certificateCount = Object.keys(pendingCertificates).length;

  useEffect(() => {
    setSheetUrl(sheetConfig?.reservationWebhookUrl || "");
  }, [sheetConfig]);

  const resetForm = () => {
    setFormData({ name: "", username: "", password: "", shift: "" });
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "이름을 입력해주세요.";
    if (!formData.username.trim()) return "아이디를 입력해주세요.";
    if (formData.username.trim().length < 3) return "아이디는 3자 이상이어야 합니다.";
    if (!formData.password.trim()) return "비밀번호를 입력해주세요.";
    if (formData.password.trim().length < 4) return "비밀번호는 4자 이상이어야 합니다.";
    if (!formData.shift.trim()) return "근무시간을 입력해주세요.";
    const dup = workers.find(w => w.username === formData.username.trim() && w.id !== editingId);
    if (dup) return "이미 사용중인 아이디입니다.";
    if (formData.username.trim() === ADMIN_ACCOUNT.username) return "사용할 수 없는 아이디입니다.";
    return null;
  };

  const handleSave = () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (editingId) {
      updateWorkers(prev => prev.map(w => w.id === editingId ? { ...w, name: formData.name.trim(), username: formData.username.trim(), password: formData.password.trim(), shift: formData.shift.trim() } : w));
      addLog(`[관리자] 근로학생 계정 수정: ${formData.name} (${formData.username})`, "admin");
    } else {
      const newWorker = { id: `W${Date.now()}`, name: formData.name.trim(), username: formData.username.trim(), password: formData.password.trim(), shift: formData.shift.trim() };
      updateWorkers(prev => [...prev, newWorker]);
      addLog(`[관리자] 근로학생 계정 생성: ${formData.name} (${formData.username})`, "admin");
    }
    resetForm();
  };

  const handleEdit = (worker) => {
    setFormData({ name: worker.name, username: worker.username, password: worker.password, shift: worker.shift });
    setEditingId(worker.id);
    setShowForm(true);
    setFormError("");
  };

  const handleDelete = (workerId) => {
    const worker = workers.find(w => w.id === workerId);
    updateWorkers(prev => prev.filter(w => w.id !== workerId));
    addLog(`[관리자] 근로학생 계정 삭제: ${worker?.name} (${worker?.username})`, "admin");
    setConfirmDelete(null);
  };

  const togglePassVisibility = (id) => setShowPassFor(prev => ({ ...prev, [id]: !prev[id] }));

  const saveSheetConfig = () => {
    updateSheetConfig(prev => ({ ...prev, reservationWebhookUrl: sheetUrl.trim() }));
    addLog("[관리자] 구글시트 연동 URL 저장", "admin");
  };

  const adminLogs = logs.filter(l => l.type === "admin");
  const addWarning = () => {
    if (!warnForm.studentId.trim()) return;
    updateWarnings(prev => {
      const prevItem = prev[warnForm.studentId] || { count: 0 };
      const next = {
        ...prev,
        [warnForm.studentId]: {
          studentId: warnForm.studentId.trim(),
          name: warnForm.name.trim() || prevItem.name || "",
          count: (prevItem.count || 0) + 1,
          reason: warnForm.reason.trim() || prevItem.reason || "",
          updatedAt: ts(),
        }
      };
      return next;
    });
    addLog(`[관리자] 경고 추가: ${warnForm.studentId} ${warnForm.name} ${warnForm.reason ? `| ${warnForm.reason}` : ""}`, "admin");
    setWarnForm({ studentId: "", name: "", reason: "" });
  };

  const removeWarning = (studentId) => {
    updateWarnings(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    addLog(`[관리자] 경고 삭제: ${studentId}`, "admin");
  };

  const addBlacklist = () => {
    if (!blkForm.studentId.trim()) return;
    updateBlacklist(prev => ({
      ...prev,
      [blkForm.studentId.trim()]: {
        studentId: blkForm.studentId.trim(),
        name: blkForm.name.trim() || "",
        reason: blkForm.reason.trim() || "",
        updatedAt: ts(),
      }
    }));
    addLog(`[관리자] 블랙리스트 등록: ${blkForm.studentId} ${blkForm.name} ${blkForm.reason ? `| ${blkForm.reason}` : ""}`, "admin");
    setBlkForm({ studentId: "", name: "", reason: "" });
  };

  const removeBlacklist = (studentId) => {
    updateBlacklist(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    addLog(`[관리자] 블랙리스트 해제: ${studentId}`, "admin");
  };

  const approveCertificate = async (cert) => {
    setApproving(true);
    try {
      const url = EDITABLE.safetySheet?.url?.trim();
      if (url) {
        const payload = {
          action: "add_safety_student",
          key: EDITABLE.apiKey,
          studentId: cert.studentId,
          studentName: cert.studentName || "",
          studentYear: cert.studentYear || "",
          studentMajor: cert.studentMajor || "",
          studentEmail: cert.studentEmail || "",
          password: cert.pin || "",
          sheetName: EDITABLE.safetySheet?.sheetName || "",
          columns: EDITABLE.safetySheet?.columns || {},
        };
        try {
          // text/plain을 사용해야 CORS preflight(OPTIONS)가 발생하지 않아
          // Google Apps Script에 POST가 실제로 전달됨
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: JSON.stringify(payload),
          });
          const text = await res.text();
          let result = null;
          try { result = JSON.parse(text); } catch { }
          if (result?.error) {
            console.error("Google Sheet 추가 실패:", result.error);
          }
        } catch (err) {
          console.warn("POST 실패, GET 재시도:", err);
          const params = new URLSearchParams({
            action: "add_safety_student",
            key: EDITABLE.apiKey,
            studentId: cert.studentId,
            studentName: cert.studentName || "",
            studentYear: cert.studentYear || "",
            studentMajor: cert.studentMajor || "",
            studentEmail: cert.studentEmail || "",
            password: cert.pin || "",
            sheetName: EDITABLE.safetySheet?.sheetName || "",
          });
          try {
            await fetch(`${url}?${params.toString()}`, { method: "GET" });
          } catch (err2) {
            console.error("GET 재시도도 실패:", err2);
          }
        }
      }
      // driveFileId가 없는 레거시 데이터만 Drive에 업로드
      if (!cert.driveFileId) {
        const driveUrl = EDITABLE.driveUpload?.url?.trim();
        if (driveUrl) {
          try {
            let base64Data = null;
            let mimeType = cert.fileType || "application/pdf";

            if (cert.storagePath) {
              const blob = await certificateStorage.download(cert.storagePath);
              if (blob) {
                base64Data = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result.split(",")[1]);
                  reader.readAsDataURL(blob);
                });
                mimeType = blob.type || mimeType;
              }
            } else {
              const localData = cert.data || await store.get(`certFile_${cert.studentId}`);
              if (localData && typeof localData === "string" && localData.startsWith("data:")) {
                const parts = localData.split(",");
                base64Data = parts[1];
                const mimeMatch = parts[0].match(/data:([^;]+)/);
                if (mimeMatch) mimeType = mimeMatch[1];
              }
            }

            if (base64Data) {
              const ext = (cert.fileName || cert.storagePath || "file.pdf").split(".").pop() || "pdf";
              const newFileName = `${cert.studentId}_${cert.studentName}.${ext}`;
              const folderName = EDITABLE.driveUpload?.folderName || "Portal_안전교육이수증";

              await fetch(driveUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=UTF-8" },
                body: JSON.stringify({
                  action: "upload_to_drive",
                  key: EDITABLE.apiKey,
                  fileName: newFileName,
                  mimeType,
                  folderName,
                  fileData: base64Data,
                }),
              });
            }
          } catch (driveErr) {
            console.error("Google Drive 업로드 실패:", driveErr);
          }
        }
      }

      updateCertificates(prev => {
        const next = { ...prev };
        // PIN은 로그인 검증용으로 유지, 나머지 파일 데이터만 제거
        next[cert.studentId] = { pin: cert.pin, approved: true };
        return next;
      });
      // 레거시 파일 정리 (driveFileId 방식은 Drive 파일 유지)
      if (cert.storagePath) {
        await certificateStorage.remove(cert.storagePath);
      } else if (!cert.driveFileId) {
        store.set(`certFile_${cert.studentId}`, null);
      }

      // 승인 이메일 발송
      if (cert.studentEmail && sendEmailNotification) {
        sendEmailNotification({
          to: cert.studentEmail,
          subject: `[국민대 건축대학] 안전교육이수증 승인 완료`,
          body: emailTemplate(cert.studentName, "교학팀에서 안전교육이수증 확인을 완료하였습니다.\n\n해당 메일을 받으신 시점부터 포털 로그인이 가능합니다."),
        });
      }

      addLog(`[관리자] 이수증 승인: ${cert.studentName}(${cert.studentId})`, "admin");
      setCertModal(null);
      setApproving(false);
    } catch (err) {
      setApproving(false);
      alert("승인 처리 실패: " + (err?.message || "알 수 없는 오류"));
    }
  };

  const rejectCertificate = async (cert, reason) => {
    updateCertificates(prev => {
      const next = { ...prev };
      delete next[cert.studentId];
      return next;
    });
    // 파일 삭제
    if (cert.driveFileId) {
      // 구글 드라이브에서 파일 삭제
      const driveUrl = EDITABLE.driveUpload?.url?.trim();
      if (driveUrl) {
        try {
          await fetch(driveUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: JSON.stringify({
              action: "delete_from_drive",
              key: EDITABLE.apiKey,
              fileId: cert.driveFileId,
            }),
          });
        } catch (err) {
          console.error("Drive 파일 삭제 실패:", err);
        }
      }
    } else if (cert.storagePath) {
      await certificateStorage.remove(cert.storagePath);
    } else {
      store.set(`certFile_${cert.studentId}`, null);
    }
    addLog(`[관리자] 이수증 반려: ${cert.studentName}(${cert.studentId})${reason ? ` | 사유: ${reason}` : ""}`, "admin");
    // 학생 이메일로 반려 알림 발송
    if (cert.studentEmail) {
      sendEmailNotification({
        to: cert.studentEmail,
        subject: `[국민대 건축대학] 안전교육 이수증 반려 안내`,
        body: emailTemplate(cert.studentName, [
          "제출하신 안전교육 이수증이 반려되었습니다.",
          "",
          reason ? `[반려 사유]\n${reason}\n` : "",
          "이수증을 다시 확인하신 후 재업로드 부탁드립니다.",
          "문의사항은 포털 사이트의 문의 기능을 이용해주세요.",
        ].filter(Boolean).join("\n")),
      });
    }
    setCertModal(null);
  };

  return (
    <>
    <div className="aurora-bg" />
    <div style={{ position: "fixed", inset: 0, zIndex: 0, background: isDark ? "rgba(26,27,30,0.7)" : "rgba(248,250,252,0.7)", pointerEvents: "none" }} />
    <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div style={{ padding: "20px 0 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: theme.red, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Admin Portal</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>관리자 설정</div>
          <Badge color="red" style={{ marginTop: 8 }}>관리자</Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={toggleDark}>{isDark ? <Icons.sun size={15} /> : <Icons.moon size={15} />}</Button>
          <Button variant="ghost" size="sm" onClick={onLogout}><Icons.logout size={15} /> 로그아웃</Button>
        </div>
      </div>

      <div style={{ paddingTop: 24 }}>
        <Tabs
          tabs={[
            { id: "accounts", label: "근로학생 계정", icon: <Icons.users size={15} /> },
            { id: "roomToggle", label: "실기실 ON/OFF", icon: <Icons.power size={15} /> },
            { id: "discipline", label: "경고/블랙리스트", icon: <Icons.alert size={15} /> },
            { id: "certificates", label: "이수증 관리", icon: <Icons.file size={15} />, badge: certificateCount, badgeCircle: true },
            { id: "equipment", label: "물품 관리", icon: <Icons.tool size={15} /> },
            { id: "community", label: "커뮤니티/전시", icon: <Icons.edit size={15} /> },
            { id: "forms", label: "양식함 관리", icon: <Icons.clipboard size={15} /> },
            { id: "adminLog", label: "관리 이력", icon: <Icons.log size={15} /> },
            { id: "integration", label: "연동 설정", icon: <Icons.refresh size={15} /> },
          ]}
          active={tab} onChange={setTab} isMobile={isMobile} wrap
        />
      </div>

      {tab === "accounts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: theme.textMuted }}>등록된 계정: <strong style={{ color: theme.text }}>{workers.length}명</strong></div>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Icons.plus size={14} /> 계정 추가</Button>
          </div>

          {/* Form */}
          {showForm && (
            <Card style={{ marginBottom: 20, borderColor: theme.accentBorder }}>
              <SectionTitle icon={editingId ? <Icons.edit size={16} color={theme.accent} /> : <Icons.plus size={16} color={theme.accent} />}>
                {editingId ? "계정 수정" : "새 근로학생 계정"}
              </SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <Input label="이름" placeholder="예: 홍길동" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                <Input label="근무시간" placeholder="예: 오전 (09–13시)" value={formData.shift} onChange={e => setFormData(p => ({ ...p, shift: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <Input label="로그인 아이디" placeholder="예: worker4 (3자 이상)" value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} />
                <Input label="비밀번호" placeholder="4자 이상" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
              </div>
              {formError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: `1px solid ${theme.redBorder}`, color: theme.red, fontSize: 13, marginBottom: 14 }}>
                  <Icons.alert size={16} /> {formError}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={handleSave}>{editingId ? "수정 저장" : "계정 생성"}</Button>
                <Button variant="ghost" onClick={resetForm}>취소</Button>
              </div>
            </Card>
          )}

          {/* Worker List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {workers.map(worker => (
              <Card key={worker.id} style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: theme.accentBg, border: `1px solid ${theme.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icons.user size={18} color={theme.accent} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{worker.name}</div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 1 }}>{worker.shift}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 10, paddingLeft: 48 }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: theme.textDim }}>아이디: </span>
                        <code style={{ color: theme.accent, background: theme.accentBg, padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>{worker.username}</code>
                      </div>
                      <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: theme.textDim }}>비밀번호: </span>
                        <code style={{ color: theme.text, background: theme.surface, padding: "1px 6px", borderRadius: 3, fontSize: 12, fontFamily: theme.fontMono }}>
                          {showPassFor[worker.id] ? worker.password : "••••"}
                        </code>
                        <button onClick={() => togglePassVisibility(worker.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}>
                          {showPassFor[worker.id] ? <Icons.eyeOff size={13} /> : <Icons.eye size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(worker)}><Icons.edit size={14} /></Button>
                    {confirmDelete === worker.id ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(worker.id)}>삭제</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>취소</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(worker.id)}><Icons.trash size={14} /></Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {workers.length === 0 && <Empty icon={<Icons.users size={32} />} text="등록된 근로학생 계정이 없습니다" />}
        </div>
      )}

      {tab === "roomToggle" && (
        <div>
          <SectionTitle icon={<Icons.power size={16} color={theme.accent} />}>실기실 예약 ON/OFF</SectionTitle>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
              각 실기실의 예약 가능 여부를 제어합니다. OFF로 설정하면 학생이 해당 실기실을 예약할 수 없습니다.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ROOMS.map(room => {
                const isOn = roomStatus?.[room.id] !== false;
                return (
                  <div key={room.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 18px", borderRadius: theme.radius,
                    background: theme.surface, border: `1px solid ${isOn ? theme.greenBorder : theme.redBorder}`,
                    transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: isOn ? theme.green : theme.red,
                        boxShadow: `0 0 6px ${isOn ? theme.green : theme.red}`,
                      }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{room.name}</div>
                        <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{room.building} · {room.floor} · {room.equipment}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !isOn;
                        updateRoomStatus(prev => ({ ...prev, [room.id]: newVal }));
                        addLog(`[관리자] 실기실 ${room.name} 예약 ${newVal ? "활성화(ON)" : "비활성화(OFF)"}`, "admin");
                      }}
                      style={{
                        padding: "8px 20px", borderRadius: 20, border: "none",
                        background: isOn ? theme.green : theme.red,
                        color: "#fff", fontSize: 13, fontWeight: 700,
                        cursor: "pointer", transition: "all 0.2s",
                        fontFamily: theme.font, minWidth: 70,
                      }}
                    >
                      {isOn ? "ON" : "OFF"}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === "discipline" && (
        <div>
          <SectionTitle icon={<Icons.alert size={16} color={theme.red} />}>경고 누적</SectionTitle>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Input label="학번" value={warnForm.studentId} onChange={e => setWarnForm(p => ({ ...p, studentId: e.target.value }))} />
              <Input label="이름" value={warnForm.name} onChange={e => setWarnForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <Input label="사유 (선택)" value={warnForm.reason} onChange={e => setWarnForm(p => ({ ...p, reason: e.target.value }))} />
            <div style={{ marginTop: 12 }}>
              <Button size="sm" onClick={addWarning}>경고 추가</Button>
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
            {Object.keys(warnings || {}).length === 0 ? (
              <Empty icon={<Icons.alert size={28} />} text="경고 대상이 없습니다" />
            ) : (
              Object.values(warnings).map((w) => (
                <div key={w.studentId} style={{ padding: "12px 18px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name || "(이름 없음)"} <span style={{ color: theme.textMuted }}>({w.studentId})</span></div>
                      <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>누적: {w.count}회 {w.reason ? `· ${w.reason}` : ""}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeWarning(w.studentId)}>삭제</Button>
                  </div>
                </div>
              ))
            )}
          </Card>

          <SectionTitle icon={<Icons.shield size={16} color={theme.red} />}>블랙리스트</SectionTitle>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Input label="학번" value={blkForm.studentId} onChange={e => setBlkForm(p => ({ ...p, studentId: e.target.value }))} />
              <Input label="이름" value={blkForm.name} onChange={e => setBlkForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <Input label="사유 (선택)" value={blkForm.reason} onChange={e => setBlkForm(p => ({ ...p, reason: e.target.value }))} />
            <div style={{ marginTop: 12 }}>
              <Button size="sm" variant="danger" onClick={addBlacklist}>블랙리스트 등록</Button>
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {Object.keys(blacklist || {}).length === 0 ? (
              <Empty icon={<Icons.shield size={28} />} text="블랙리스트가 없습니다" />
            ) : (
              Object.values(blacklist).map((b) => (
                <div key={b.studentId} style={{ padding: "12px 18px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name || "(이름 없음)"} <span style={{ color: theme.textMuted }}>({b.studentId})</span></div>
                      <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>{b.reason || "사유 없음"}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeBlacklist(b.studentId)}>해제</Button>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {tab === "equipment" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: theme.textMuted }}>등록된 물품: <strong style={{ color: theme.text }}>{equipmentDB.length}개</strong></div>
            <Button size="sm" onClick={() => { resetEqForm(); setEqShowForm(true); }}><Icons.plus size={14} /> 물품 추가</Button>
          </div>

          {eqShowForm && (
            <Card style={{ marginBottom: 20, borderColor: theme.accentBorder }}>
              <SectionTitle icon={eqEditingId ? <Icons.edit size={16} color={theme.accent} /> : <Icons.plus size={16} color={theme.accent} />}>
                {eqEditingId ? "물품 수정" : "새 물품 등록"}
              </SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <Input label="물품명" placeholder="예: 3D 프린터" value={eqForm.name} onChange={e => setEqForm(p => ({ ...p, name: e.target.value }))} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.text, letterSpacing: "0.5px", textTransform: "uppercase" }}>카테고리</label>
                  <select
                    value={eqNewCat !== null ? "__new__" : eqForm.category}
                    onChange={e => {
                      if (e.target.value === "__new__") {
                        setEqNewCat("");
                        setEqForm(p => ({ ...p, category: "" }));
                      } else {
                        setEqNewCat(null);
                        setEqForm(p => ({ ...p, category: e.target.value }));
                      }
                    }}
                    style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 13, fontFamily: theme.font }}
                  >
                    {[...new Set(equipmentDB.map(e => e.category))].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__new__">+ 새 카테고리 추가</option>
                  </select>
                  {eqNewCat !== null && (
                    <input
                      autoFocus
                      placeholder="새 카테고리 이름 입력"
                      value={eqNewCat}
                      onChange={e => {
                        setEqNewCat(e.target.value);
                        setEqForm(p => ({ ...p, category: e.target.value }));
                      }}
                      style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.accent}`, background: theme.surface, color: theme.text, fontSize: 13, fontFamily: theme.font, outline: "none" }}
                    />
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <Input label="아이콘 (이모지)" placeholder="🔧" value={eqForm.icon} onChange={e => setEqForm(p => ({ ...p, icon: e.target.value }))} />
                <Input label="총 수량" type="number" value={eqForm.total} onChange={e => setEqForm(p => ({ ...p, total: Math.max(0, parseInt(e.target.value) || 0) }))} />
                <Input label="가용 수량" type="number" value={eqForm.available} onChange={e => setEqForm(p => ({ ...p, available: Math.max(0, parseInt(e.target.value) || 0) }))} />
                <Input label="최대 대여일" type="number" value={eqForm.maxDays} onChange={e => setEqForm(p => ({ ...p, maxDays: Math.max(1, parseInt(e.target.value) || 1) }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: theme.text, cursor: "pointer" }}>
                  <input type="checkbox" checked={eqForm.deposit} onChange={e => setEqForm(p => ({ ...p, deposit: e.target.checked }))} />
                  보증금 필요
                </label>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Button size="sm" disabled={!eqForm.name.trim() || !eqForm.icon.trim() || eqForm.total <= 0 || !eqForm.category.trim()} onClick={() => {
                  if (eqEditingId) {
                    setEquipmentDB(prev => prev.map(e => e.id === eqEditingId ? { ...e, ...eqForm } : e));
                    addLog(`[관리자] 물품 수정: "${eqForm.name}"`, "admin");
                  } else {
                    const newItem = { ...eqForm, id: `E${Date.now()}` };
                    setEquipmentDB(prev => [...prev, newItem]);
                    addLog(`[관리자] 물품 등록: "${eqForm.name}"`, "admin");
                  }
                  resetEqForm();
                }}>
                  {eqEditingId ? "수정 완료" : "등록"}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetEqForm}>취소</Button>
              </div>
            </Card>
          )}

          {(() => {
            const allCats = [...new Set(equipmentDB.map(e => e.category))];
            const cats = categoryOrder.length > 0
              ? [...categoryOrder.filter(c => allCats.includes(c)), ...allCats.filter(c => !categoryOrder.includes(c))]
              : allCats;
            const toggleCat = (cat) => setEqOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }));
            const handleDragStart = (idx) => { dragCatIdx.current = idx; };
            const handleDragOver = (e, idx) => { e.preventDefault(); dragOverCatIdx.current = idx; };
            const handleDrop = () => {
              if (dragCatIdx.current === null || dragOverCatIdx.current === null || dragCatIdx.current === dragOverCatIdx.current) return;
              const newCats = [...cats];
              const [moved] = newCats.splice(dragCatIdx.current, 1);
              newCats.splice(dragOverCatIdx.current, 0, moved);
              setCategoryOrder(newCats);
              dragCatIdx.current = null;
              dragOverCatIdx.current = null;
            };
            return cats.length === 0 ? (
              <Empty icon={<Icons.tool size={32} />} text="등록된 물품이 없습니다" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cats.map((cat, idx) => {
                  const items = equipmentDB.filter(e => e.category === cat);
                  const isOpen = !!eqOpenCats[cat];
                  return (
                    <div key={cat}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={handleDrop}
                    >
                      <div
                        onClick={() => toggleCat(cat)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "14px 18px", background: theme.surface, borderRadius: theme.radius,
                          border: `1px solid ${isOpen ? theme.accent : theme.border}`,
                          cursor: "pointer", transition: "all 0.2s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            title="드래그하여 순서 변경"
                            onClick={e => e.stopPropagation()}
                            style={{ cursor: "grab", color: theme.textDim, fontSize: 14, lineHeight: 1, userSelect: "none", padding: "0 2px" }}
                          >⠿</span>
                          <div style={{ fontSize: 14, fontWeight: 700, color: isOpen ? theme.accent : theme.text }}>{cat}</div>
                          <Badge color={isOpen ? "accent" : "dim"} style={{ fontSize: 10 }}>{items.length}개</Badge>
                        </div>
                        <span style={{ fontSize: 12, color: theme.textDim, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                      </div>
                      {isOpen && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, paddingLeft: 12 }}>
                          {items.map(eq => (
                            <Card key={eq.id} style={{ padding: 14 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ fontSize: 28, width: 40, textAlign: "center" }}>{eq.icon}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{eq.name}</div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <Badge color={eq.available > 0 ? "green" : "red"} style={{ fontSize: 10 }}>가용 {eq.available}/{eq.total}</Badge>
                                    <Badge color="blue" style={{ fontSize: 10 }}>최대 {eq.maxDays}일</Badge>
                                    {eq.deposit && <Badge color="yellow" style={{ fontSize: 10 }}>보증금</Badge>}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setEqForm({ name: eq.name, category: eq.category, available: eq.available, total: eq.total, deposit: eq.deposit, maxDays: eq.maxDays, icon: eq.icon });
                                    setEqNewCat(null);
                                    setEqEditingId(eq.id);
                                    setEqShowForm(true);
                                  }}><Icons.edit size={14} /></Button>
                                  {eqDeleteConfirm === eq.id ? (
                                    <>
                                      <Button size="sm" style={{ background: theme.red, color: "#fff" }} onClick={() => {
                                        setEquipmentDB(prev => prev.filter(e => e.id !== eq.id));
                                        addLog(`[관리자] 물품 삭제: "${eq.name}"`, "admin");
                                        setEqDeleteConfirm(null);
                                      }}>삭제</Button>
                                      <Button variant="ghost" size="sm" onClick={() => setEqDeleteConfirm(null)}>취소</Button>
                                    </>
                                  ) : (
                                    <Button variant="ghost" size="sm" style={{ color: theme.red }} onClick={() => setEqDeleteConfirm(eq.id)}><Icons.x size={14} /></Button>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {tab === "community" && (
        <div>
          {/* 전시회 정보 관리 */}
          <SectionTitle icon={<Icons.edit size={16} color={theme.accent} />}>전시회 정보 관리</SectionTitle>
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.accent, marginBottom: 12 }}>
              {exhEditingId ? "전시회 수정" : "새 전시회 등록"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Input label="전시 제목" value={exhForm.title || ""} onChange={e => setExhForm(p => ({ ...p, title: e.target.value }))} />
              <Input label="장소" value={exhForm.location || ""} onChange={e => setExhForm(p => ({ ...p, location: e.target.value }))} />
              <Input label="기간" placeholder="예: 2026.02.05 ~ 02.09" value={exhForm.dates || ""} onChange={e => setExhForm(p => ({ ...p, dates: e.target.value }))} />
              <Input label="Instagram URL" value={exhForm.instagramUrl || ""} onChange={e => setExhForm(p => ({ ...p, instagramUrl: e.target.value }))} />
            </div>
            <Input label="설명" value={exhForm.description || ""} onChange={e => setExhForm(p => ({ ...p, description: e.target.value }))} />
            {/* 포스터 이미지 업로드 */}
            <input ref={exhPosterFileRef} type="file" accept="image/*" onChange={handlePosterUpload} style={{ display: "none" }} />
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>포스터 이미지</div>
              <button
                onClick={() => exhPosterFileRef.current?.click()}
                disabled={exhPosterUploading}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: exhPosterUploading ? "not-allowed" : "pointer",
                  padding: "10px 16px", background: theme.surface,
                  border: `1px solid ${theme.border}`, borderRadius: 8,
                  fontSize: 13, color: theme.text, transition: "all 0.2s",
                  fontFamily: theme.font, width: "100%", justifyContent: "flex-start",
                  opacity: exhPosterUploading ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!exhPosterUploading) { e.currentTarget.style.borderColor = theme.accent; } }}
                onMouseLeave={e => { if (!exhPosterUploading) { e.currentTarget.style.borderColor = theme.border; } }}
              >
                <Icons.upload size={16} />
                {exhPosterFile ? exhPosterFile.name : (exhForm.posterUrl ? (exhForm.posterUrl.startsWith("data:") ? "이미지 업로드됨 (변경하려면 클릭)" : exhForm.posterUrl) : "포스터 이미지 업로드")}
              </button>
              {exhForm.posterUrl && (
                <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}`, maxHeight: 200 }}>
                  <img src={exhForm.posterUrl} alt="포스터 미리보기" style={{ width: "100%", height: "auto", display: "block", maxHeight: 200, objectFit: "cover" }} />
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
              <Button size="sm" onClick={() => {
                if (!exhForm.title?.trim()) return;
                if (exhEditingId) {
                  setExhibitionPosts(prev => prev.map(p => p.id === exhEditingId ? { ...p, ...exhForm } : p));
                  addLog(`[관리자] 전시회 수정: "${exhForm.title}"`, "admin");
                } else {
                  const newPost = { ...exhForm, id: `exh${Date.now()}`, createdAt: new Date().toISOString() };
                  setExhibitionPosts(prev => [newPost, ...prev]);
                  addLog(`[관리자] 전시회 등록: "${exhForm.title}"`, "admin");
                }
                setExhForm({ title: "", description: "", dates: "", location: "", instagramUrl: "", posterUrl: "" });
                setExhEditingId(null);
                setExhPosterFile(null);
                setExhSaved(true);
                setTimeout(() => setExhSaved(false), 2000);
              }}>
                {exhEditingId ? "수정 저장" : "등록"}
              </Button>
              {exhEditingId && (
                <Button size="sm" variant="ghost" onClick={() => {
                  setExhForm({ title: "", description: "", dates: "", location: "", instagramUrl: "", posterUrl: "" });
                  setExhEditingId(null);
                  setExhPosterFile(null);
                }}>취소</Button>
              )}
              {exhSaved && <span style={{ fontSize: 12, color: theme.green, fontWeight: 600 }}>저장되었습니다</span>}
            </div>
          </Card>

          {/* 등록된 전시회 목록 */}
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
              등록된 전시회 목록입니다. 전시회 홍보 탭에 표시됩니다.
            </div>
            {!exhibitionPosts?.length ? (
              <Empty icon={<Icons.list size={28} />} text="등록된 전시회가 없습니다" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {exhibitionPosts.map((post, idx) => (
                  <div key={post.id} style={{
                    padding: "14px 16px",
                    borderBottom: idx < exhibitionPosts.length - 1 ? `1px solid ${theme.border}` : "none",
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 12 }}>
                      {post.posterUrl && (
                        <img src={post.posterUrl} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: 13, color: theme.text, fontWeight: 600, marginBottom: 4 }}>{post.title}</div>
                        <div style={{ fontSize: 11, color: theme.textDim }}>
                          📅 {post.dates || "미정"} · 📍 {post.location || "미정"}
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", gap: 4 }}>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setExhForm({ title: post.title || "", description: post.description || "", dates: post.dates || "", location: post.location || "", instagramUrl: post.instagramUrl || "", posterUrl: post.posterUrl || "" });
                        setExhEditingId(post.id);
                        setExhPosterFile(null);
                      }}>
                        <Icons.edit size={14} /> 수정
                      </Button>
                      {exhDeleteConfirm === post.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button size="sm" variant="danger" onClick={() => {
                            setExhibitionPosts(prev => prev.filter(p => p.id !== post.id));
                            setExhDeleteConfirm(null);
                            addLog(`[관리자] 전시회 삭제: "${post.title}"`, "admin");
                          }}>확인</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExhDeleteConfirm(null)}>취소</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setExhDeleteConfirm(post.id)} style={{ color: theme.red }}>
                          <Icons.trash size={14} /> 삭제
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 커뮤니티 글 관리 */}
          <SectionTitle icon={<Icons.list size={16} color={theme.accent} />}>커뮤니티 글 관리</SectionTitle>
          <Card>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
              로그인 페이지 커뮤니티 탭에 표시되는 익명 게시글을 관리합니다. 부적절한 글이나 댓글을 삭제할 수 있습니다.
            </div>
            {!communityPosts?.length ? (
              <Empty icon={<Icons.list size={28} />} text="커뮤니티 글이 없습니다" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {communityPosts.map((post, idx) => (
                  <div key={post.id} style={{ borderBottom: idx < communityPosts.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                    {/* 글 헤더 */}
                    <div
                      style={{
                        padding: "14px 16px",
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                        cursor: post.comments?.length > 0 ? "pointer" : "default",
                        background: cmExpandedPostId === post.id ? "rgba(212, 160, 83, 0.05)" : "transparent",
                        transition: "background 0.2s",
                      }}
                      onClick={() => {
                        if (post.comments?.length > 0) {
                          setCmExpandedPostId(cmExpandedPostId === post.id ? null : post.id);
                          setCmCommentDeleteConfirm(null);
                        }
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5, marginBottom: 6, wordBreak: "break-word" }}>{post.content}</div>
                        <div style={{ display: "flex", gap: 12, fontSize: 11, color: theme.textDim }}>
                          <span>{new Date(post.createdAt).toLocaleString("ko-KR")}</span>
                          <span style={{ color: post.comments?.length > 0 ? theme.accent : theme.textDim }}>
                            💬 댓글 {post.comments?.length || 0}개 {post.comments?.length > 0 ? (cmExpandedPostId === post.id ? "▲" : "▼") : ""}
                          </span>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {cmDeleteConfirm === post.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <Button size="sm" variant="danger" onClick={() => {
                              setCommunityPosts(prev => prev.filter(p => p.id !== post.id));
                              setCmDeleteConfirm(null);
                              addLog(`[관리자] 커뮤니티 글 삭제: "${post.content.slice(0, 20)}..."`, "admin");
                            }}>확인</Button>
                            <Button size="sm" variant="ghost" onClick={() => setCmDeleteConfirm(null)}>취소</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setCmDeleteConfirm(post.id)} style={{ color: theme.red }}>
                            <Icons.trash size={14} /> 삭제
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* 댓글 목록 (펼침) */}
                    {cmExpandedPostId === post.id && post.comments?.length > 0 && (
                      <div style={{ padding: "0 16px 14px 32px", background: "rgba(0,0,0,0.15)" }}>
                        {post.comments.map((comment) => (
                          <div key={comment.id} style={{
                            padding: "8px 0",
                            borderBottom: `1px solid rgba(255,255,255,0.05)`,
                            display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.4, marginBottom: 3 }}>
                                ↳ {comment.content}
                              </div>
                              <div style={{ fontSize: 10, color: theme.textDim }}>
                                {new Date(comment.createdAt).toLocaleString("ko-KR")}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0 }}>
                              {cmCommentDeleteConfirm === comment.id ? (
                                <div style={{ display: "flex", gap: 4 }}>
                                  <Button size="sm" variant="danger" onClick={() => {
                                    setCommunityPosts(prev => prev.map(p =>
                                      p.id === post.id
                                        ? { ...p, comments: p.comments.filter(c => c.id !== comment.id) }
                                        : p
                                    ));
                                    setCmCommentDeleteConfirm(null);
                                    addLog(`[관리자] 댓글 삭제: "${comment.content.slice(0, 20)}..."`, "admin");
                                  }}>확인</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setCmCommentDeleteConfirm(null)}>취소</Button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCmCommentDeleteConfirm(comment.id)}
                                  style={{
                                    padding: "3px 8px", border: "none", borderRadius: 3,
                                    background: "transparent", color: theme.textDim,
                                    fontSize: 10, cursor: "pointer", fontFamily: theme.font,
                                    display: "flex", alignItems: "center", gap: 4,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.color = theme.red}
                                  onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                >
                                  <Icons.trash size={12} /> 삭제
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "adminLog" && (
        <div>
          <SectionTitle icon={<Icons.log size={16} color={theme.accent} />}>관리자 작업 이력</SectionTitle>
          {adminLogs.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
              {logSelectMode ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (selectedLogIds.size === adminLogs.length) {
                      setSelectedLogIds(new Set());
                    } else {
                      setSelectedLogIds(new Set(adminLogs.map(l => l.id)));
                    }
                  }}>
                    {selectedLogIds.size === adminLogs.length ? "전체 해제" : "전체 선택"}
                  </Button>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>
                    {selectedLogIds.size}건 선택
                  </div>
                  {logDeleteConfirm ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: theme.red, fontWeight: 600 }}>삭제하시겠습니까?</span>
                      <Button size="sm" variant="danger" onClick={() => {
                        updateLogs(prev => prev.filter(l => !selectedLogIds.has(l.id)));
                        setSelectedLogIds(new Set());
                        setLogDeleteConfirm(false);
                        setLogSelectMode(false);
                      }}>확인</Button>
                      <Button size="sm" variant="ghost" onClick={() => setLogDeleteConfirm(false)}>취소</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="danger" disabled={selectedLogIds.size === 0} onClick={() => setLogDeleteConfirm(true)}>
                      <Icons.trash size={14} /> 선택 삭제
                    </Button>
                  )}
                  <div style={{ flex: 1 }} />
                  <Button size="sm" variant="ghost" onClick={() => { setLogSelectMode(false); setSelectedLogIds(new Set()); setLogDeleteConfirm(false); }}>취소</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setLogSelectMode(true)}>
                  <Icons.trash size={14} /> 선택 삭제
                </Button>
              )}
            </div>
          )}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {adminLogs.length === 0 ? (
              <Empty icon={<Icons.log size={28} />} text="관리 이력이 없습니다" />
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {adminLogs.map(log => (
                  <div key={log.id}
                    style={{
                      padding: "12px 18px", borderBottom: `1px solid ${theme.border}`,
                      borderLeft: `3px solid ${selectedLogIds.has(log.id) ? theme.accent : theme.red}`,
                      background: selectedLogIds.has(log.id) ? theme.accentBg : "transparent",
                      cursor: logSelectMode ? "pointer" : "default",
                      transition: "background 0.15s",
                    }}
                    onClick={() => {
                      if (!logSelectMode) return;
                      setSelectedLogIds(prev => {
                        const next = new Set(prev);
                        if (next.has(log.id)) next.delete(log.id);
                        else next.add(log.id);
                        return next;
                      });
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      {logSelectMode && (
                        <input
                          type="checkbox"
                          checked={selectedLogIds.has(log.id)}
                          onChange={() => {}}
                          style={{ marginTop: 2, accentColor: theme.accent, cursor: "pointer" }}
                        />
                      )}
                      <code style={{ fontSize: 11, color: theme.textDim, fontFamily: theme.fontMono, whiteSpace: "nowrap", marginTop: 1 }}>{log.time}</code>
                      <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{log.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "certificates" && (
        <div>
          <SectionTitle icon={<Icons.file size={16} color={theme.blue} />}>이수증 관리</SectionTitle>
          <Card>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
              학생들이 업로드한 안전교육이수증을 확인하고 관리합니다.
            </div>
            {!Object.keys(pendingCertificates).length ? (
              <Empty icon={<Icons.file size={28} />} text="업로드된 이수증이 없습니다" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.entries(pendingCertificates).map(([studentId, cert]) => (
                  <Card
                    key={studentId}
                    style={{ background: theme.surface, padding: 14, cursor: "pointer" }}
                    hover
                    onClick={() => openCertModal(cert)}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ padding: 12, background: theme.blueBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.blueBorder}` }}>
                        <Icons.file size={24} color={theme.blue} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{cert.studentName || studentId}</span>
                          <Badge color="blue">이수증</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>
                          학번: {studentId} · 파일명: {cert.fileName}
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 11, color: theme.textDim }}>
                          <span>크기: {(cert.fileSize / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>업로드: {new Date(cert.uploadDate).toLocaleString("ko-KR")}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: theme.blue, fontWeight: 600 }}>
                        클릭하여 확인 →
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "integration" && (
        <div>
          <SectionTitle icon={<Icons.refresh size={16} color={theme.accent} />}>구글 시트 연동</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
              예약 발생 시 구글 시트로 실시간 전송됩니다. Google Apps Script 웹앱 URL을 입력하세요.
            </div>
            <Input
              label="Google Apps Script Web App URL"
              placeholder="https://script.google.com/macros/s/XXX/exec"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button size="sm" onClick={saveSheetConfig} disabled={!sheetUrl.trim()}>저장</Button>
              <Button size="sm" variant="ghost" onClick={() => setSheetUrl("")}>초기화</Button>
            </div>
          </Card>
          <Card style={{ background: theme.blueBg, borderColor: theme.blueBorder, padding: 14 }}>
            <div style={{ fontSize: 12, color: theme.blue, lineHeight: 1.6 }}>
              시트로 전송되는 데이터: 학생 정보, 실기실, 날짜/시간, 목적, 인원, 생성시간.
              CORS 허용과 POST 수신이 가능한 웹앱으로 배포되어야 합니다.
            </div>
          </Card>
        </div>
      )}

      {/* 양식함 관리 탭 */}
      {tab === "forms" && (
        <div>
          <SectionTitle icon={
            <AnimatedBorderButton radius={5} duration={3}>
              <div style={{ padding: "5px 6px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icons.clipboard size={14} color={theme.accent} />
              </div>
            </AnimatedBorderButton>
          }>
            양식함 관리
          </SectionTitle>
          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>
            학생들이 다운로드할 수 있는 PDF 양식 파일을 관리합니다.
          </div>

          <Button variant="primary" onClick={() => { setShowFormUpload(true); setFormUploadFile(null); setFormUploadName(""); setFormUploadDesc(""); setFormUploadError(""); }}>
            <Icons.upload size={15} /> 파일 업로드
          </Button>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {(!formFiles || formFiles.length === 0) ? (
              <Empty icon={<Icons.file size={36} />} text="등록된 양식 파일이 없습니다." />
            ) : formFiles.map(file => (
              <Card key={file.id} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Icons.file size={20} color={theme.accent} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div title={file.name} style={{ fontWeight: 600, fontSize: 13, color: theme.text }}>{file.name}</div>
                    {file.description && <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{file.description}</div>}
                    <div style={{ fontSize: 10, color: theme.textDim, marginTop: 3 }}>{file.uploadedAt?.slice(0, 10)}</div>
                  </div>
                  <Button variant="danger" size="sm" onClick={async () => {
                    if (!window.confirm(`"${file.name}" 파일을 삭제하시겠습니까?`)) return;
                    await formStorage.remove(file.path);
                    updateFormFiles(prev => prev.filter(f => f.id !== file.id));
                  }}>
                    <Icons.trash size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* 업로드 모달 */}
          {showFormUpload && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
              onClick={e => { if (e.target === e.currentTarget) setShowFormUpload(false); }}>
              <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 24, width: "100%", maxWidth: 440 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.upload size={16} color={theme.accent} /> 양식 파일 업로드
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.text, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>PDF 파일 선택</label>
                  <input type="file" accept=".pdf,application/pdf"
                    style={{ width: "100%", padding: "10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 13, fontFamily: theme.font, boxSizing: "border-box" }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setFormUploadFile(f); if (!formUploadName) setFormUploadName(f.name.replace(/\.pdf$/i, "")); }
                    }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <Input label="표시 이름" value={formUploadName} onChange={e => setFormUploadName(e.target.value)} placeholder="예: 실기실 예약 신청서" />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <Input label="설명 (선택)" value={formUploadDesc} onChange={e => setFormUploadDesc(e.target.value)} placeholder="파일에 대한 간단한 설명" />
                </div>

                {formUploadError && (
                  <div style={{ fontSize: 12, color: theme.red, marginBottom: 12, padding: "8px 12px", background: theme.redBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.redBorder}` }}>
                    {formUploadError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button variant="ghost" onClick={() => setShowFormUpload(false)} disabled={formUploading}>취소</Button>
                  <Button variant="primary" disabled={formUploading || !formUploadFile || !formUploadName.trim()} onClick={async () => {
                    if (!formUploadFile || !formUploadName.trim()) return;
                    setFormUploading(true);
                    setFormUploadError("");
                    try {
                      const fileName = formUploadName.trim().endsWith(".pdf") ? formUploadName.trim() : `${formUploadName.trim()}.pdf`;
                      const { path, error } = await formStorage.upload(formUploadFile, fileName);
                      if (error) { setFormUploadError(`업로드 실패: ${error}`); return; }
                      const newFile = { id: uid(), name: formUploadName.trim(), description: formUploadDesc.trim(), path, uploadedAt: new Date().toISOString() };
                      updateFormFiles(prev => [...(prev || []), newFile]);
                      setShowFormUpload(false);
                      addLog(`[양식함] "${formUploadName.trim()}" 파일 업로드`, "admin");
                    } catch (e) {
                      setFormUploadError(e?.message || "업로드 중 오류가 발생했습니다.");
                    } finally {
                      setFormUploading(false);
                    }
                  }}>
                    {formUploading ? "업로드 중..." : <><Icons.upload size={14} /> 업로드</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Certificate Preview Modal */}
      {certModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20
        }}
          onClick={() => setCertModal(null)}
        >
          <div style={{
            background: theme.card,
            borderRadius: theme.radius,
            border: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            maxWidth: 900,
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto",
            padding: 24
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                  안전교육이수증 확인
                </div>
                <div style={{ fontSize: 13, color: theme.textMuted }}>
                  {certModal.studentName || "이름 없음"} ({certModal.studentId})
                </div>
              </div>
              <button
                onClick={() => setCertModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: theme.textMuted,
                  cursor: "pointer",
                  fontSize: 24,
                  padding: 4
                }}
              >
                <Icons.x size={20} />
              </button>
            </div>

            <div style={{
              background: theme.surface,
              borderRadius: theme.radiusSm,
              padding: 16,
              marginBottom: 20,
              maxHeight: "60vh",
              overflow: "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}>
              {certFileLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
                  <div style={{ fontSize: 14 }}>파일 로딩 중...</div>
                </div>
              ) : !certFileData ? (
                <div style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
                  <Icons.file size={48} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <div style={{ fontSize: 14 }}>파일을 불러올 수 없습니다</div>
                </div>
              ) : certModal.driveFileId ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <Icons.file size={48} color={theme.blue} style={{ marginBottom: 16, opacity: 0.8 }} />
                  <div style={{ fontSize: 14, color: theme.text, fontWeight: 600, marginBottom: 8 }}>
                    Google Drive에 저장된 파일입니다
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 20 }}>
                    아래 버튼을 클릭하면 새 탭에서 파일을 확인할 수 있습니다
                  </div>
                  <button
                    onClick={() => window.open(certFileData, "_blank")}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 20px", borderRadius: theme.radius,
                      background: theme.blue, color: "#fff",
                      border: "none", cursor: "pointer",
                      fontSize: 14, fontWeight: 600, fontFamily: theme.font,
                    }}
                  >
                    <Icons.external size={16} /> Google Drive에서 열기
                  </button>
                </div>
              ) : certModal.fileType?.startsWith("image/") ? (
                <img
                  src={certFileData}
                  alt="이수증"
                  style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
                />
              ) : certModal.fileType === "application/pdf" ? (
                <iframe
                  src={certFileData}
                  style={{ width: "100%", height: "60vh", border: "none" }}
                  title="PDF 이수증"
                />
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
                  <Icons.file size={48} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <div style={{ fontSize: 14 }}>미리보기를 지원하지 않는 파일 형식입니다</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>{certModal.fileName}</div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, fontSize: 12, color: theme.textDim, marginBottom: 20, padding: "12px 16px", background: theme.surface, borderRadius: theme.radiusSm }}>
              <span>파일명: {certModal.fileName}</span>
              <span>•</span>
              <span>크기: {(certModal.fileSize / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>업로드: {new Date(certModal.uploadDate).toLocaleString("ko-KR")}</span>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button
                variant="ghost"
                onClick={() => {
                  if (!certFileData) return;
                  if (certModal.driveFileId) {
                    window.open(`https://drive.google.com/uc?id=${certModal.driveFileId}&export=download`, "_blank");
                  } else if (certModal.storagePath) {
                    fetch(certFileData)
                      .then(res => res.blob())
                      .then(blob => {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = certModal.fileName;
                        link.click();
                        URL.revokeObjectURL(url);
                      });
                  } else {
                    const link = document.createElement("a");
                    link.href = certFileData;
                    link.download = certModal.fileName;
                    link.click();
                  }
                }}
              >
                <Icons.download size={16} /> 다운로드
              </Button>
              <Button
                variant="success"
                onClick={() => approveCertificate(certModal)}
                disabled={approving}
              >
                <Icons.check size={16} /> {approving ? "처리 중..." : "이상없음 (승인)"}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const reason = window.prompt(`${certModal.studentName}(${certModal.studentId})의 이수증을 반려합니다.\n반려 사유를 입력해주세요:`, "");
                  if (reason !== null) {
                    rejectCertificate(certModal, reason);
                  }
                }}
              >
                <Icons.x size={16} /> 반려
              </Button>
              <Button variant="ghost" onClick={() => setCertModal(null)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default AdminPortal;
