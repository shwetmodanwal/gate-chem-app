import { useState, useEffect, useRef, useCallback } from "react";

const GATE_SYLLABUS = {
  "Engineering Mathematics": {
    color: "#7C3AED", light: "#EDE9FE", icon: "📐",
    topics: ["Linear Algebra","Calculus","Differential Equations","Complex Variables","Probability & Statistics","Numerical Methods","Laplace Transforms"]
  },
  "Process Calculations": {
    color: "#0891B2", light: "#CFFAFE", icon: "⚗️",
    topics: ["Stoichiometry","Material Balances","Energy Balances","Recycle & Bypass","Combustion","Humidity & Psychrometry"]
  },
  "Thermodynamics": {
    color: "#DC2626", light: "#FEE2E2", icon: "🔥",
    topics: ["Laws of Thermodynamics","PVT Relations","Phase Equilibria","Chemical Reaction Equilibria","Fugacity & Activity","Equations of State"]
  },
  "Fluid Mechanics": {
    color: "#2563EB", light: "#DBEAFE", icon: "🌊",
    topics: ["Fluid Statics","Bernoulli Equation","Flow Measurement","Pipe Flow","Pumps & Compressors","Packed & Fluidized Beds"]
  },
  "Heat Transfer": {
    color: "#EA580C", light: "#FED7AA", icon: "♨️",
    topics: ["Conduction","Convection","Radiation","Heat Exchangers","LMTD & NTU Methods","Evaporation"]
  },
  "Mass Transfer": {
    color: "#059669", light: "#D1FAE5", icon: "💧",
    topics: ["Diffusion","Distillation","Absorption","Extraction","Humidification","Adsorption & Ion Exchange","Membrane Separations"]
  },
  "Chemical Reaction Engineering": {
    color: "#D97706", light: "#FEF3C7", icon: "⚡",
    topics: ["Ideal Reactors (CSTR, PFR)","Rate Laws","Multiple Reactions","Non-ideal Reactors","Residence Time Distribution","Heterogeneous Catalysis"]
  },
  "Instrumentation & Process Control": {
    color: "#7C3AED", light: "#EDE9FE", icon: "🎛️",
    topics: ["Sensors & Transducers","Control Loops","PID Controllers","Frequency Response","Stability Analysis","Process Dynamics"]
  },
  "Plant Design & Economics": {
    color: "#DB2777", light: "#FCE7F3", icon: "🏭",
    topics: ["Cost Estimation","Profitability Analysis","Optimization","Heat Integration","Safety & HAZOP","Equipment Design"]
  },
  "Chemical Technology": {
    color: "#0F766E", light: "#CCFBF1", icon: "🧪",
    topics: ["Petroleum Refining","Petrochemicals","Polymers","Fertilizers","Cement & Glass","Dyes & Intermediates"]
  }
};

const STORAGE_KEY = "gate_chem_2027";

function loadData() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    return d ? JSON.parse(d) : null;
  } catch { return null; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function initData() {
  const saved = loadData();
  if (saved) return saved;
  const progress = {};
  Object.entries(GATE_SYLLABUS).forEach(([sub, { topics }]) => {
    progress[sub] = {};
    topics.forEach(t => { progress[sub][t] = 0; });
  });
  return {
    user: null,
    progress,
    notes: [],
    discussions: [
      { id: 1, user: "Priya S.", avatar: "PS", text: "Anyone solved GATE 2024 Q.34 on distillation? Struggling with the reflux ratio calculation.", time: "2h ago", subject: "Mass Transfer", replies: 3, likes: 7 },
      { id: 2, user: "Rahul M.", avatar: "RM", text: "Best approach for solving PDEs in GATE? Separation of variables seems tricky.", time: "5h ago", subject: "Engg. Math", replies: 5, likes: 12 },
      { id: 3, user: "Anjali K.", avatar: "AK", text: "Sharing my notes on RTD and non-ideal reactors — really comprehensive!", time: "1d ago", subject: "CRE", replies: 8, likes: 24 }
    ],
    tests: []
  };
}

export default function GateApp() {
  const [data, setData] = useState(initData);
  const [tab, setTab] = useState("dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [newNote, setNewNote] = useState({ title: "", subject: "", content: "", file: null });
  const [newPost, setNewPost] = useState("");
  const [newPostSubject, setNewPostSubject] = useState("General");
  const [testState, setTestState] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [noteFilter, setNoteFilter] = useState("All");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Hi! I'm your GATE Chemical Engineering AI tutor. Ask me anything about the syllabus, concepts, or problem-solving!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const fileRef = useRef();
  const imgRef = useRef();
  const chatEndRef = useRef();

  const update = (fn) => {
    setData(prev => {
      const next = fn(prev);
      saveData(next);
      return next;
    });
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const login = () => {
    if (!authForm.email || !authForm.password) return;
    update(d => ({ ...d, user: { name: authForm.name || authForm.email.split("@")[0], email: authForm.email, avatar: authForm.email.slice(0,2).toUpperCase() } }));
  };

  const logout = () => update(d => ({ ...d, user: null }));

  const setProgress = (subject, topic, val) => {
    update(d => ({ ...d, progress: { ...d.progress, [subject]: { ...d.progress[subject], [topic]: val } } }));
  };

  const addNote = () => {
    if (!newNote.title) return;
    const note = { id: Date.now(), ...newNote, uploader: data.user?.name || "Anonymous", time: new Date().toLocaleString(), fileUrl: newNote.file ? URL.createObjectURL(newNote.file) : null, fileName: newNote.file?.name };
    update(d => ({ ...d, notes: [note, ...d.notes] }));
    setNewNote({ title: "", subject: "", content: "", file: null });
  };

  const addPost = () => {
    if (!newPost.trim()) return;
    const post = { id: Date.now(), user: data.user?.name || "Anonymous", avatar: (data.user?.name || "AN").slice(0,2).toUpperCase(), text: newPost, time: "Just now", subject: newPostSubject, replies: 0, likes: 0 };
    update(d => ({ ...d, discussions: [post, ...d.discussions] }));
    setNewPost("");
  };

  const likePost = (id) => {
    update(d => ({ ...d, discussions: d.discussions.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p) }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (ev) => setImageB64(ev.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const generateTest = async () => {
    if (!imageB64) return;
    setAiLoading(true);
    setAiMessage("Analyzing your question paper image...");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageB64 } },
              { type: "text", text: `You are a GATE Chemical Engineering exam expert. Analyze this image of previous year GATE questions. Extract all visible questions and create a structured test. Respond ONLY with valid JSON (no markdown, no backticks):
{"questions":[{"id":1,"text":"Full question text here","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","solution":"Step-by-step solution explanation","marks":2,"subject":"Subject name","type":"MCQ"}],"totalMarks":0,"duration":1800}
If the image doesn't show clear GATE questions, generate 5 relevant GATE Chemical Engineering MCQs on common topics.` }
            ]
          }]
        })
      });
      const d = await res.json();
      let text = d.content?.map(c => c.text || "").join("") || "";
      text = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      parsed.questions.forEach((q, i) => { if (!q.id) q.id = i + 1; });
      parsed.totalMarks = parsed.questions.reduce((s, q) => s + (q.marks || 2), 0);
      setTestState({ ...parsed, startTime: Date.now(), timeLeft: parsed.duration || 1800, active: true });
      setCurrentAnswer({});
      setTestResult(null);
      setAiMessage("");
    } catch (err) {
      setAiMessage("Could not parse image. Generating sample GATE questions...");
      const fallback = { questions: [
        { id:1, text:"For a first-order irreversible reaction in a CSTR, if conversion X=0.8 and rate constant k=0.5 min⁻¹, what is the residence time τ?", options:["A) 8 min","B) 4 min","C) 2 min","D) 1.6 min"], correct:"A", solution:"For CSTR: τ = X/(k(1-X)) = 0.8/(0.5×0.2) = 8 min", marks:2, subject:"CRE", type:"MCQ"},
        { id:2, text:"Which equation describes vapor-liquid equilibrium for an ideal solution?", options:["A) Raoult's Law","B) Henry's Law","C) Dalton's Law","D) Van Laar equation"], correct:"A", solution:"Raoult's Law: pᵢ = xᵢPᵢ* describes VLE for ideal solutions where activity coefficient γ=1.", marks:1, subject:"Thermodynamics", type:"MCQ"},
        { id:3, text:"The overall heat transfer coefficient U for a double-pipe heat exchanger depends on:", options:["A) Fouling resistance only","B) Tube wall, fouling, and convective resistances","C) Convective resistance only","D) Log mean temperature difference"], correct:"B", solution:"1/U = 1/hᵢ + rᵢ + Rwall + rₒ + 1/hₒ. All resistances contribute in series.", marks:2, subject:"Heat Transfer", type:"MCQ"},
        { id:4, text:"In the Ergun equation for packed bed pressure drop, the Blake-Kozeny term dominates at:", options:["A) High Reynolds number","B) Low Reynolds number (Re<10)","C) Re = 100","D) Fluidization point"], correct:"B", solution:"At low Re (<10, viscous flow), Ergun reduces to Blake-Kozeny: ΔP/L = 150μu(1-ε)²/(Dp²ε³)", marks:2, subject:"Fluid Mechanics", type:"MCQ"},
        { id:5, text:"Which control action eliminates steady-state offset?", options:["A) Proportional only","B) Derivative only","C) Integral action","D) On-off control"], correct:"C", solution:"Integral (I) action accumulates error over time and drives the steady-state error to zero, eliminating offset.", marks:1, subject:"Process Control", type:"MCQ"}
      ], totalMarks: 8, duration: 1800 };
      setTestState({ ...fallback, startTime: Date.now(), timeLeft: 1800, active: true });
      setCurrentAnswer({});
      setTestResult(null);
      setAiMessage("");
    }
    setAiLoading(false);
  };

  const submitTest = () => {
    if (!testState) return;
    let score = 0, correct = 0, wrong = 0, unattempted = 0;
    testState.questions.forEach(q => {
      const ans = currentAnswer[q.id];
      if (!ans) { unattempted++; }
      else if (ans === q.correct) { score += q.marks || 2; correct++; }
      else { score -= (q.marks || 2) * 0.33; wrong++; }
    });
    const result = { score: Math.max(0, score).toFixed(2), correct, wrong, unattempted, total: testState.questions.length, maxScore: testState.totalMarks, timeTaken: Math.round((Date.now() - testState.startTime) / 60000) };
    setTestResult(result);
    setTestState(prev => ({ ...prev, active: false }));
    update(d => ({ ...d, tests: [{ id: Date.now(), ...result, date: new Date().toLocaleDateString() }, ...d.tests] }));
  };

  useEffect(() => {
    if (!testState?.active) return;
    const t = setInterval(() => {
      setTestState(prev => {
        if (!prev || prev.timeLeft <= 1) { clearInterval(t); submitTest(); return prev; }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [testState?.active]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput;
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are an expert GATE Chemical Engineering tutor helping students prepare for GATE 2027. Give concise, accurate, exam-focused answers. Use formulas and step-by-step solutions when needed. Keep responses under 200 words unless solving a detailed problem.",
          messages: newHistory.slice(-10)
        })
      });
      const d = await res.json();
      const reply = d.content?.map(c => c.text || "").join("") || "Sorry, I couldn't respond.";
      setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Network error. Please try again!" }]);
    }
    setChatLoading(false);
  };

  const totalTopics = Object.values(GATE_SYLLABUS).reduce((s, { topics }) => s + topics.length, 0);
  const completedTopics = Object.entries(data.progress).reduce((s, [sub, topics]) => s + Object.values(topics).filter(v => v === 2).length, 0);
  const inProgressTopics = Object.entries(data.progress).reduce((s, [sub, topics]) => s + Object.values(topics).filter(v => v === 1).length, 0);
  const overallPct = Math.round((completedTopics / totalTopics) * 100);

  const subjectProgress = Object.entries(GATE_SYLLABUS).map(([name, { topics, color, light, icon }]) => {
    const done = Object.values(data.progress[name] || {}).filter(v => v === 2).length;
    const inProg = Object.values(data.progress[name] || {}).filter(v => v === 1).length;
    const pct = Math.round(((done + inProg * 0.5) / topics.length) * 100);
    return { name, topics: topics.length, done, inProg, pct, color, light, icon };
  });

  if (!data.user) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e40af 60%, #065f46 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 24, padding: "2.5rem", width: 420, boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>⚗️</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #4338ca, #0891b2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GATE Chem 2027</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Your complete GATE preparation hub</p>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => setAuthMode(m)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: authMode === m ? "2px solid #4338ca" : "1px solid #e2e8f0", background: authMode === m ? "#ede9fe" : "white", color: authMode === m ? "#4338ca" : "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 14, textTransform: "capitalize" }}>{m === "login" ? "Login" : "Sign Up"}</button>
            ))}
          </div>
          {authMode === "signup" && <input placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 10, fontSize: 15, boxSizing: "border-box" }} />}
          <input placeholder="Email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 10, fontSize: 15, boxSizing: "border-box" }} />
          <input type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16, fontSize: 15, boxSizing: "border-box" }} />
          <button onClick={login} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #4338ca, #0891b2)", color: "white", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>{authMode === "login" ? "Login" : "Create Account"}</button>
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 12 }}>Demo: any email + any password</p>
        </div>
      </div>
    );
  }

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const tabs = [
    { id: "dashboard", label: "Dashboard", emoji: "🏠" },
    { id: "progress", label: "Progress", emoji: "📊" },
    { id: "notes", label: "Notes", emoji: "📝" },
    { id: "discuss", label: "Discuss", emoji: "💬" },
    { id: "test", label: "Mock Test", emoji: "📸" },
    { id: "tutor", label: "AI Tutor", emoji: "🤖" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)", color: "white", padding: "0 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>⚗️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>GATE Chem 2027</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Chemical Engineering Prep Hub</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 14px", borderRadius: 20, border: "none", background: tab === t.id ? "rgba(255,255,255,0.25)" : "transparent", color: "white", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{data.user.avatar}</div>
            <span style={{ fontSize: 13, opacity: 0.9 }}>{data.user.name}</span>
            <button onClick={logout} style={{ padding: "5px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "white", cursor: "pointer", fontSize: 12 }}>Logout</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <h2 style={{ margin: "0 0 1.5rem", color: "#1e1b4b", fontSize: 22, fontWeight: 700 }}>👋 Welcome back, {data.user.name.split(" ")[0]}!</h2>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Overall Progress", value: `${overallPct}%`, color: "#4338ca", bg: "#ede9fe", emoji: "🎯" },
                { label: "Topics Done", value: completedTopics, color: "#059669", bg: "#d1fae5", emoji: "✅" },
                { label: "In Progress", value: inProgressTopics, color: "#d97706", bg: "#fef3c7", emoji: "⏳" },
                { label: "Notes Saved", value: data.notes.length, color: "#0891b2", bg: "#cffafe", emoji: "📝" },
                { label: "Tests Taken", value: data.tests.length, color: "#db2777", bg: "#fce7f3", emoji: "📋" }
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: "1.2rem", border: `2px solid ${s.color}20` }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{s.emoji}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Overall progress bar */}
            <div style={{ background: "white", borderRadius: 16, padding: "1.5rem", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: "#1e1b4b" }}>Overall GATE Syllabus Coverage</span>
                <span style={{ fontWeight: 800, color: "#4338ca", fontSize: 18 }}>{overallPct}%</span>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 999, height: 14, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg, #4338ca, #0891b2)", borderRadius: 999, transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13 }}>
                <span style={{ color: "#059669" }}>✅ {completedTopics} completed</span>
                <span style={{ color: "#d97706" }}>⏳ {inProgressTopics} in progress</span>
                <span style={{ color: "#64748b" }}>📚 {totalTopics - completedTopics - inProgressTopics} pending</span>
              </div>
            </div>

            {/* Subject cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              {subjectProgress.map(s => (
                <div key={s.name} style={{ background: "white", borderRadius: 16, padding: "1.2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${s.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <span style={{ fontWeight: 600, color: "#1e1b4b", fontSize: 14 }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.pct}%</span>
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: 999, height: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{s.done}/{s.topics} topics completed</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROGRESS TRACKER */}
        {tab === "progress" && (
          <div>
            <h2 style={{ margin: "0 0 1.5rem", color: "#1e1b4b" }}>📊 GATE 2027 Syllabus Progress</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.entries(GATE_SYLLABUS).map(([sub, { topics, color, light, icon }]) => {
                const prog = data.progress[sub] || {};
                const done = Object.values(prog).filter(v => v === 2).length;
                const inP = Object.values(prog).filter(v => v === 1).length;
                const pct = Math.round(((done + inP * 0.5) / topics.length) * 100);
                return (
                  <div key={sub} style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
                    <div style={{ background: color, padding: "1rem 1.3rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{icon}</span>
                        <div>
                          <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{sub}</div>
                          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{topics.length} topics · {done} done · {inP} in progress</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "white", fontWeight: 800, fontSize: 22 }}>{pct}%</div>
                        <div style={{ background: "rgba(255,255,255,0.3)", borderRadius: 999, height: 6, width: 80, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "white", borderRadius: 999 }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: "1rem 1.3rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                      {topics.map(topic => {
                        const val = prog[topic] || 0;
                        const states = [
                          { label: "Not Started", bg: "#f1f5f9", color: "#94a3b8", emoji: "○" },
                          { label: "In Progress", bg: "#fef3c7", color: "#d97706", emoji: "◑" },
                          { label: "Completed", bg: "#d1fae5", color: "#059669", emoji: "●" }
                        ];
                        const st = states[val];
                        return (
                          <div key={topic} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: st.bg, borderRadius: 10, border: `1px solid ${st.color}30` }}>
                            <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{topic}</span>
                            <div style={{ display: "flex", gap: 4 }}>
                              {states.map((s, i) => (
                                <button key={i} onClick={() => setProgress(sub, topic, i)} title={s.label} style={{ width: 28, height: 28, borderRadius: 8, border: val === i ? `2px solid ${color}` : "1px solid #e2e8f0", background: val === i ? light : "white", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {s.emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NOTES */}
        {tab === "notes" && (
          <div>
            <h2 style={{ margin: "0 0 1.5rem", color: "#1e1b4b" }}>📝 Notes Repository</h2>
            {/* Upload form */}
            <div style={{ background: "white", borderRadius: 18, padding: "1.5rem", marginBottom: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", border: "2px dashed #c7d2fe" }}>
              <h3 style={{ margin: "0 0 1rem", color: "#4338ca" }}>📤 Upload Notes</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <input placeholder="Note Title *" value={newNote.title} onChange={e => setNewNote(n => ({ ...n, title: e.target.value }))} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <select value={newNote.subject} onChange={e => setNewNote(n => ({ ...n, subject: e.target.value }))} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }}>
                  <option value="">Select Subject</option>
                  {Object.keys(GATE_SYLLABUS).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <textarea placeholder="Description or key points..." value={newNote.content} onChange={e => setNewNote(n => ({ ...n, content: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, resize: "vertical", minHeight: 80, boxSizing: "border-box", marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "1px dashed #7c3aed", color: "#7c3aed", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                  📎 {newNote.file ? newNote.file.name : "Attach File (PDF/Image/Doc)"}
                  <input type="file" accept="*/*" ref={fileRef} style={{ display: "none" }} onChange={e => setNewNote(n => ({ ...n, file: e.target.files[0] }))} />
                </label>
                <button onClick={addNote} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #4338ca, #0891b2)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Upload Note</button>
              </div>
            </div>

            {/* Filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["All", ...Object.keys(GATE_SYLLABUS)].map(f => (
                <button key={f} onClick={() => setNoteFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: noteFilter === f ? "none" : "1px solid #e2e8f0", background: noteFilter === f ? "#4338ca" : "white", color: noteFilter === f ? "white" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: noteFilter === f ? 600 : 400 }}>{f}</button>
              ))}
            </div>

            {/* Notes grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {data.notes.filter(n => noteFilter === "All" || n.subject === noteFilter).map(note => {
                const sub = GATE_SYLLABUS[note.subject];
                return (
                  <div key={note.id} style={{ background: "white", borderRadius: 16, padding: "1.2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderTop: `4px solid ${sub?.color || "#4338ca"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <h4 style={{ margin: 0, color: "#1e1b4b", fontSize: 15 }}>{note.title}</h4>
                      {note.subject && <span style={{ fontSize: 11, background: sub?.light || "#ede9fe", color: sub?.color || "#4338ca", padding: "3px 8px", borderRadius: 6, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 8 }}>{note.subject}</span>}
                    </div>
                    {note.content && <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>{note.content}</p>}
                    <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
                      <span>👤 {note.uploader}</span>
                      <span>🕐 {note.time}</span>
                    </div>
                    {note.fileName && (
                      <a href={note.fileUrl} download={note.fileName} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "6px 12px", borderRadius: 8, background: "#f1f5f9", color: "#4338ca", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
                        📎 {note.fileName}
                      </a>
                    )}
                  </div>
                );
              })}
              {data.notes.filter(n => noteFilter === "All" || n.subject === noteFilter).length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                  <div>No notes yet. Upload your first note!</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISCUSSION */}
        {tab === "discuss" && (
          <div>
            <h2 style={{ margin: "0 0 1.5rem", color: "#1e1b4b" }}>💬 Community Discussion</h2>
            {/* New post */}
            <div style={{ background: "white", borderRadius: 18, padding: "1.5rem", marginBottom: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#4338ca", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{data.user.avatar}</div>
                <div style={{ flex: 1 }}>
                  <textarea placeholder="Share a doubt, insight, or resource with the community..." value={newPost} onChange={e => setNewPost(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, resize: "none", minHeight: 80, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <select value={newPostSubject} onChange={e => setNewPostSubject(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}>
                      <option>General</option>
                      {Object.keys(GATE_SYLLABUS).map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={addPost} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "#4338ca", color: "white", fontWeight: 600, cursor: "pointer" }}>Post</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.discussions.map(post => {
                const sub = GATE_SYLLABUS[post.subject];
                return (
                  <div key={post.id} style={{ background: "white", borderRadius: 16, padding: "1.3rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${sub?.color || "#4338ca"}, #0891b2)`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{post.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontWeight: 700, color: "#1e1b4b" }}>{post.user}</span>
                            {post.subject && <span style={{ fontSize: 11, background: sub?.light || "#ede9fe", color: sub?.color || "#4338ca", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{post.subject}</span>}
                          </div>
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>{post.time}</span>
                        </div>
                        <p style={{ margin: "0 0 12px", color: "#334155", lineHeight: 1.6, fontSize: 14 }}>{post.text}</p>
                        <div style={{ display: "flex", gap: 16 }}>
                          <button onClick={() => likePost(post.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>❤️ {post.likes}</button>
                          <button style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>💬 {post.replies} replies</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MOCK TEST */}
        {tab === "test" && (
          <div>
            <h2 style={{ margin: "0 0 1.5rem", color: "#1e1b4b" }}>📸 AI-Powered Mock Test</h2>

            {!testState && (
              <div>
                <div style={{ background: "white", borderRadius: 18, padding: "2rem", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", textAlign: "center" }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>📸</div>
                  <h3 style={{ margin: "0 0 8px", color: "#1e1b4b" }}>Upload Previous Year Question Paper</h3>
                  <p style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>Take a photo of any GATE previous year question paper and our AI will convert it into a timed test with evaluation and solutions!</p>

                  <label style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: 14, border: "2px dashed #4338ca", color: "#4338ca", cursor: "pointer", fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                    📷 {uploadedImage ? "Change Image" : "Upload Question Paper Photo"}
                    <input type="file" accept="image/*" ref={imgRef} style={{ display: "none" }} onChange={handleImageUpload} />
                  </label>

                  {uploadedImage && (
                    <div style={{ marginTop: 16, marginBottom: 20 }}>
                      <img src={uploadedImage} alt="Uploaded" style={{ maxWidth: 400, maxHeight: 300, objectFit: "contain", borderRadius: 12, border: "2px solid #e2e8f0" }} />
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <button onClick={generateTest} disabled={aiLoading} style={{ padding: "14px 32px", borderRadius: 14, border: "none", background: aiLoading ? "#94a3b8" : "linear-gradient(135deg, #4338ca, #0891b2)", color: "white", fontWeight: 700, fontSize: 16, cursor: aiLoading ? "not-allowed" : "pointer" }}>
                      {aiLoading ? "🤖 Analyzing..." : "🚀 Generate Test from Image"}
                    </button>
                  </div>
                  {aiMessage && <p style={{ color: "#d97706", fontSize: 14 }}>{aiMessage}</p>}

                  <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 20, paddingTop: 16 }}>
                    <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 10px" }}>Or generate a sample GATE test without image:</p>
                    <button onClick={() => { setImageB64("sample"); generateTest(); }} disabled={aiLoading} style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid #4338ca", background: "white", color: "#4338ca", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>🎲 Generate Sample Test</button>
                  </div>
                </div>

                {/* Past tests */}
                {data.tests.length > 0 && (
                  <div style={{ background: "white", borderRadius: 18, padding: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
                    <h3 style={{ margin: "0 0 1rem", color: "#1e1b4b" }}>📋 Test History</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                      {data.tests.slice(0, 6).map(t => (
                        <div key={t.id} style={{ background: "#f8fafc", borderRadius: 12, padding: "1rem", border: "1px solid #e2e8f0" }}>
                          <div style={{ fontWeight: 700, fontSize: 20, color: "#4338ca" }}>{t.score}/{t.maxScore}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>✅ {t.correct} correct · ❌ {t.wrong} wrong</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{t.date} · {t.timeTaken} min</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {testState && (
              <div>
                {/* Timer bar */}
                <div style={{ background: testState.timeLeft < 300 ? "#fee2e2" : "#ede9fe", borderRadius: 14, padding: "1rem 1.5rem", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: "#1e1b4b", fontSize: 16 }}>🕐 Time Remaining: <span style={{ color: testState.timeLeft < 300 ? "#dc2626" : "#4338ca", fontSize: 22, fontFamily: "monospace" }}>{formatTime(testState.timeLeft)}</span></div>
                  <div style={{ color: "#64748b", fontSize: 14 }}>
                    {Object.keys(currentAnswer).length}/{testState.questions.length} answered · Max marks: {testState.totalMarks}
                  </div>
                  {testState.active && <button onClick={submitTest} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#dc2626", color: "white", fontWeight: 700, cursor: "pointer" }}>Submit Test</button>}
                </div>

                {testResult && (
                  <div style={{ background: "linear-gradient(135deg, #1e1b4b, #065f46)", borderRadius: 18, padding: "2rem", marginBottom: 20, color: "white", textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                    <h2 style={{ margin: "0 0 16px", fontSize: 24 }}>Test Completed!</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 16 }}>
                      {[
                        { label: "Score", value: `${testResult.score}/${testResult.maxScore}` },
                        { label: "Correct", value: testResult.correct },
                        { label: "Wrong", value: testResult.wrong },
                        { label: "Unattempted", value: testResult.unattempted },
                        { label: "Time Taken", value: `${testResult.timeTaken} min` }
                      ].map(s => (
                        <div key={s.label} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "12px" }}>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setTestState(null); setTestResult(null); setUploadedImage(null); setImageB64(null); }} style={{ padding: "10px 24px", borderRadius: 10, border: "2px solid white", background: "transparent", color: "white", fontWeight: 700, cursor: "pointer" }}>Take Another Test</button>
                  </div>
                )}

                {/* Questions */}
                {testState.questions.map((q, idx) => {
                  const answered = currentAnswer[q.id];
                  const showResult = !!testResult;
                  const isCorrect = answered === q.correct;
                  return (
                    <div key={q.id} style={{ background: "white", borderRadius: 18, padding: "1.5rem", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: showResult ? `2px solid ${isCorrect ? "#059669" : answered ? "#dc2626" : "#94a3b8"}` : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ background: "#ede9fe", color: "#4338ca", fontWeight: 700, padding: "4px 10px", borderRadius: 8, fontSize: 13 }}>Q{idx + 1}</span>
                          {q.subject && <span style={{ background: "#f1f5f9", color: "#64748b", padding: "4px 10px", borderRadius: 8, fontSize: 12 }}>{q.subject}</span>}
                        </div>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{q.marks || 2} marks</span>
                      </div>
                      <p style={{ margin: "0 0 16px", color: "#1e1b4b", fontWeight: 500, lineHeight: 1.6 }}>{q.text}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {(q.options || []).map((opt, oi) => {
                          const optLetter = ["A","B","C","D"][oi];
                          const isSelected = answered === optLetter;
                          const isCorrectOpt = q.correct === optLetter;
                          let bg = "#f8fafc", border = "#e2e8f0", color = "#334155";
                          if (showResult) {
                            if (isCorrectOpt) { bg = "#d1fae5"; border = "#059669"; color = "#065f46"; }
                            else if (isSelected && !isCorrectOpt) { bg = "#fee2e2"; border = "#dc2626"; color = "#7f1d1d"; }
                          } else if (isSelected) {
                            bg = "#ede9fe"; border = "#4338ca"; color = "#1e1b4b";
                          }
                          return (
                            <button key={oi} onClick={() => { if (testState.active) setCurrentAnswer(a => ({ ...a, [q.id]: optLetter })); }}
                              style={{ padding: "10px 14px", borderRadius: 10, border: `2px solid ${border}`, background: bg, color, textAlign: "left", cursor: testState.active ? "pointer" : "default", fontSize: 14, fontWeight: isSelected || (showResult && isCorrectOpt) ? 600 : 400 }}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {showResult && q.solution && (
                        <div style={{ marginTop: 14, padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                          <div style={{ fontWeight: 700, color: "#059669", fontSize: 13, marginBottom: 6 }}>✅ Solution:</div>
                          <div style={{ color: "#065f46", fontSize: 13, lineHeight: 1.6 }}>{q.solution}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AI TUTOR */}
        {tab === "tutor" && (
          <div>
            <h2 style={{ margin: "0 0 1.5rem", color: "#1e1b4b" }}>🤖 AI Tutor — GATE Expert</h2>
            <div style={{ background: "white", borderRadius: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              {/* Chat header */}
              <div style={{ background: "linear-gradient(135deg, #1e1b4b, #0891b2)", padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
                <div>
                  <div style={{ color: "white", fontWeight: 700 }}>GATE Chem AI Tutor</div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Powered by Claude · Expert in Chemical Engineering</div>
                </div>
              </div>
              {/* Messages */}
              <div style={{ height: 480, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: 14, background: "#f8fafc" }}>
                {chatHistory.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? "linear-gradient(135deg, #4338ca, #0891b2)" : "white", color: m.role === "user" ? "white" : "#1e1b4b", fontSize: 14, lineHeight: 1.6, boxShadow: "0 2px 6px rgba(0,0,0,0.08)", whiteSpace: "pre-wrap" }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex" }}>
                    <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#4338ca", animation: "bounce 1.4s infinite", animationDelay: `${i*0.2}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              {/* Quick prompts */}
              <div style={{ padding: "10px 1.5rem", background: "white", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Explain CSTR vs PFR", "Solve a heat exchanger problem", "Key thermodynamics formulas", "RTD analysis tips"].map(p => (
                  <button key={p} onClick={() => { setChatInput(p); }} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid #c7d2fe", background: "#ede9fe", color: "#4338ca", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{p}</button>
                ))}
              </div>
              {/* Input */}
              <div style={{ padding: "1rem 1.5rem", background: "white", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="Ask anything about GATE Chemical Engineering..." style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14 }} />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: chatLoading || !chatInput.trim() ? "#e2e8f0" : "linear-gradient(135deg, #4338ca, #0891b2)", color: chatLoading || !chatInput.trim() ? "#94a3b8" : "white", fontWeight: 700, cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer" }}>Send</button>
              </div>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)}40%{transform:scale(1)} }`}</style>
    </div>
  );
}
