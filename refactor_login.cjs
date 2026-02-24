const fs = require('fs');
const file = 'c:/Users/samki/KookminUni_Architecture_Portal/src/pages/LoginPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add setIsSignUp
content = content.replace(
    'const [mode, setMode] = useState("student");',
    'const [mode, setMode] = useState("student");\n  const [isSignUp, setIsSignUp] = useState(false);'
);

// 2. Locate the chunk to replace
const startMarker = '{/* Main Login Section */}';
const endMarker = '{/* Safety Info Modal */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.log("MARKERS NOT FOUND");
    process.exit(1);
}

const replacement = `{/* Main Login Section */}
        {(() => {
          const signInForm = (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 30 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>The Best School of Architecture</div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: theme.text, lineHeight: 1.3, letterSpacing: "-0.5px" }}>국민대 건축대학 포털사이트</h1>
                <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 8 }}>Kookmin University School of Architecture Portal</div>

                {/* Feature Boxes */}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                  <div style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg, #6BA3D6 0%, #5A8FC2 100%)", color: "#fff", fontSize: 11, fontWeight: 600, boxShadow: "0 4px 12px rgba(107, 163, 214, 0.4)" }}>🏠 실기실 예약</div>
                  <div style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg, #6EBD8E 0%, #5DAD7D 100%)", color: "#fff", fontSize: 11, fontWeight: 600, boxShadow: "0 4px 12px rgba(110, 189, 142, 0.4)" }}>🔧 물품 대여</div>
                  <div style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg, #E9A56A 0%, #D9955A 100%)", color: "#fff", fontSize: 11, fontWeight: 600, boxShadow: "0 4px 12px rgba(233, 165, 106, 0.4)" }}>🖨️ 출력물 보내기</div>
                </div>
              </div>

              {/* Role Switch */}
              <div style={{ display: "flex", gap: 2, background: theme.surface, borderRadius: theme.radius, padding: 3, marginBottom: 20, border: \`1px solid \${theme.border}\` }}>
                {[ { id: "student", label: "학생", icon: <Icons.user size={15} /> }, { id: "worker", label: "근로학생", icon: <Icons.tool size={15} /> }, { id: "admin", label: "관리자", icon: <Icons.shield size={15} /> } ].map(r => (
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: \`1px solid \${theme.redBorder}\`, color: theme.red, fontSize: 13 }}><Icons.alert size={16} /> {error}</div>
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
                      <input type={showPass ? "text" : "password"} placeholder="비밀번호 입력" value={wPass} onChange={e => setWPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={{ width: "100%", padding: "10px 42px 10px 14px", background: theme.surface, border: \`1px solid \${theme.border}\`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.border} />
                      <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}><Icons.eyeOff size={16} /></button>
                    </div>
                  </div>
                  {error && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: \`1px solid \${theme.redBorder}\`, color: theme.red, fontSize: 13 }}><Icons.alert size={16} /> {error}</div>
                  )}
                  <Button size="lg" onClick={handleSubmit} disabled={authLoading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>{authLoading ? "로그인 중..." : (mode === "admin" ? "관리자 로그인" : "관리 화면 접속")}</Button>
                </div>
              )}
            </div>
          );

          const signUpForm = (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: '100%', height: '100%', justifyContent: 'center' }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: theme.text, marginBottom: 8 }}>안전교육이수증 업로드</h2>
                <div style={{ fontSize: 13, color: theme.textMuted }}>학번과 이름을 입력한 후 파일을 선택해주세요.</div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="학번" placeholder="예: 2021001" value={certSid} onChange={e => setCertSid(e.target.value)} />
                <Input label="이름" placeholder="예: 김건축" value={certSname} onChange={e => setCertSname(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="학년" placeholder="예: 2" value={certYear} onChange={e => setCertYear(e.target.value)} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>전공</label>
                  <select value={certMajor} onChange={e => setCertMajor(e.target.value)} style={{ width: "100%", padding: "10px 14px", background: theme.surface, border: \`1px solid \${theme.border}\`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", height: 42 }} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.border}>
                    <option value="">선택</option><option value="5년제">5년제</option><option value="4년제">4년제</option><option value="미정">미정</option>
                  </select>
                </div>
              </div>
              <Input label="이메일" placeholder="예: student@school.ac.kr" value={certEmail} onChange={e => setCertEmail(e.target.value)} />
              <Input label="비밀번호 (4자리 숫자)" placeholder="로그인 시 사용할 비밀번호" type="password" inputMode="numeric" maxLength={4} value={certPin} onChange={e => setCertPin(e.target.value.replace(/[^0-9]/g, ""))} />
              
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ display: "flex", alignItems: "center", gap: 8, cursor: uploading ? "not-allowed" : "pointer", padding: "10px 16px", background: theme.surface, border: \`1px solid \${theme.border}\`, borderRadius: theme.radiusSm, fontSize: 13, color: theme.text, transition: "all 0.2s", fontFamily: theme.font, width: "100%", justifyContent: "flex-start", opacity: uploading ? 0.5 : 1 }}>
                <Icons.file size={16} />{uploadFile ? uploadFile.name : "파일 선택"}
              </button>
              {uploadFile && (
                <button onClick={handleConfirmUpload} disabled={uploading || certPin.length !== 4} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: uploading ? "not-allowed" : "pointer", padding: "12px 16px", background: theme.blue, border: "none", borderRadius: theme.radiusSm, fontSize: 13, fontWeight: 600, color: "#fff", transition: "all 0.2s", fontFamily: theme.font, width: "100%", opacity: uploading ? 0.5 : 1 }}>
                  {uploading ? <Icons.loading size={16} /> : <Icons.upload size={16} />}{uploading ? "업로드 중..." : "업로드"}
                </button>
              )}
              {uploadSuccess && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.greenBg, border: \`1px solid \${theme.greenBorder}\`, color: theme.green, fontSize: 12 }}><Icons.check size={14} /> {uploadSuccess}</div>
              )}
              {certificates?.[certSid.trim()] && certSid.trim() && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.accentBg, border: \`1px solid \${theme.accentBorder}\`, color: theme.accent, fontSize: 11 }}><Icons.file size={14} />기존 업로드: {certificates[certSid.trim()].fileName}</div>
              )}
              
              <div style={{textAlign: "center", marginTop: 10}}>
                <div onClick={() => setShowSafetyInfo(true)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", background: "rgba(212,93,93,0.15)", border: \`1px solid \${theme.red}\`, borderRadius: 20, cursor: "pointer", transition: "all 0.2s" }}><span style={{ fontSize: 12, fontWeight: 700, color: theme.red }}>⚠️ 미이수자 안내 꼭 읽어주세요</span></div>
              </div>
            </div>
          );

          if (isMobile) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Card style={{ background: theme.card, backdropFilter: "blur(12px)", border: \`1px solid \${theme.border}\`, boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.08)" }}>
                  {signInForm}
                </Card>
                <Card style={{ background: theme.card, backdropFilter: "blur(12px)", border: \`1px solid \${theme.border}\`, boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.08)" }}>
                  {signUpForm}
                </Card>
              </div>
            );
          }

          return (
            <div style={{ position: 'relative', width: 850, height: 620, background: theme.card, borderRadius: 20, boxShadow: isDark ? "0 12px 48px rgba(0,0,0,0.5)" : "0 12px 48px rgba(0,0,0,0.08)", overflow: 'hidden', border: \`1px solid \${theme.border}\` }}>
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
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%', background: \`linear-gradient(135deg, \${theme.green} 0%, #1f7b5a 100%)\`, color: '#fff', transition: 'transform 0.6s ease-in-out', transform: isSignUp ? 'translateX(50%)' : 'translateX(0)' }}>
                  
                  {/* Overlay Left (Sign In Prompt) */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px', transition: 'transform 0.6s ease-in-out', transform: isSignUp ? 'translateX(0)' : 'translateX(-20%)' }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>다시 오셨군요!</h2>
                    <p style={{ fontSize: 13, marginBottom: 30, lineHeight: 1.6, opacity: 0.9 }}>
                      안전교육이수증 업로드를 마치셨다면<br/>기존 계정으로 로그인해주세요.
                    </p>
                    <button onClick={() => setIsSignUp(false)} style={{ background: 'transparent', border: '2px solid #fff', color: '#fff', padding: '10px 40px', borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>SIGN IN</button>
                  </div>

                  {/* Overlay Right (Sign Up Prompt) */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px', transition: 'transform 0.6s ease-in-out', transform: isSignUp ? 'translateX(20%)' : 'translateX(0)' }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>환영합니다!</h2>
                    <p style={{ fontSize: 13, marginBottom: 30, lineHeight: 1.6, opacity: 0.9 }}>
                      건축대학 포털을 처음 이용하시나요?<br/>안전교육이수증을 먼저 업로드해주세요.
                    </p>
                    <button onClick={() => setIsSignUp(true)} style={{ background: 'transparent', border: '2px solid #fff', color: '#fff', padding: '10px 40px', borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>SIGN UP</button>
                  </div>
                  
                </div>
              </div>
            </div>
          );
        })()}

        \n`;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex);

fs.writeFileSync(file, content);
console.log("SUCCESS");
