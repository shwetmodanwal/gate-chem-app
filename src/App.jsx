import { useState, useEffect, useRef } from "react";

const GATE_SYLLABUS = {
  "Engineering Mathematics": { color: "#7C3AED", light: "#EDE9FE", icon: "📐", topics: ["Linear Algebra","Calculus","Differential Equations","Complex Variables","Probability & Statistics","Numerical Methods","Laplace Transforms"] },
  "Process Calculations": { color: "#0891B2", light: "#CFFAFE", icon: "⚗️", topics: ["Stoichiometry","Material Balances","Energy Balances","Recycle & Bypass","Combustion","Humidity & Psychrometry"] },
  "Thermodynamics": { color: "#DC2626", light: "#FEE2E2", icon: "🔥", topics: ["Laws of Thermodynamics","PVT Relations","Phase Equilibria","Chemical Reaction Equilibria","Fugacity & Activity","Equations of State"] },
  "Fluid Mechanics": { color: "#2563EB", light: "#DBEAFE", icon: "🌊", topics: ["Fluid Statics","Bernoulli Equation","Flow Measurement","Pipe Flow","Pumps & Compressors","Packed & Fluidized Beds"] },
  "Heat Transfer": { color: "#EA580C", light: "#FED7AA", icon: "♨️", topics: ["Conduction","Convection","Radiation","Heat Exchangers","LMTD & NTU Methods","Evaporation"] },
  "Mass Transfer": { color: "#059669", light: "#D1FAE5", icon: "💧", topics: ["Diffusion","Distillation","Absorption","Extraction","Humidification","Adsorption & Ion Exchange","Membrane Separations"] },
  "Chemical Reaction Engineering": { color: "#D97706", light: "#FEF3C7", icon: "⚡", topics: ["Ideal Reactors (CSTR, PFR)","Rate Laws","Multiple Reactions","Non-ideal Reactors","Residence Time Distribution","Heterogeneous Catalysis"] },
  "Instrumentation & Process Control": { color: "#7C3AED", light: "#EDE9FE", icon: "🎛️", topics: ["Sensors & Transducers","Control Loops","PID Controllers","Frequency Response","Stability Analysis","Process Dynamics"] },
  "Plant Design & Economics": { color: "#DB2777", light: "#FCE7F3", icon: "🏭", topics: ["Cost Estimation","Profitability Analysis","Optimization","Heat Integration","Safety & HAZOP","Equipment Design"] },
  "Chemical Technology": { color: "#0F766E", light: "#CCFBF1", icon: "🧪", topics: ["Petroleum Refining","Petrochemicals","Polymers","Fertilizers","Cement & Glass","Dyes & Intermediates"] }
};

const STORAGE_KEY = "gate_chem_2027_v2";
function loadData() { try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch { return null; } }
function saveData(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }

function initData() {
  const saved = loadData();
  if (saved) return saved;
  const progress = {};
  Object.entries(GATE_SYLLABUS).forEach(([sub, { topics }]) => { progress[sub] = {}; topics.forEach(t => { progress[sub][t] = 0; }); });
  return {
    user: null, progress, notes: [], tests: [],
    discussions: [
      { id: 1, user: "Priya S.", avatar: "PS", text: "Anyone solved GATE 2024 Q.34 on distillation? Struggling with the reflux ratio calculation.", time: "2h ago", subject: "Mass Transfer", replies: 3, likes: 7 },
      { id: 2, user: "Rahul M.", avatar: "RM", text: "Best approach for solving PDEs in GATE? Separation of variables seems tricky.", time: "5h ago", subject: "Engg. Math", replies: 5, likes: 12 },
      { id: 3, user: "Anjali K.", avatar: "AK", text: "Sharing my notes on RTD and non-ideal reactors — really comprehensive!", time: "1d ago", subject: "CRE", replies: 8, likes: 24 }
    ]
  };
}

const FALLBACK_QUESTIONS = [
  { id:1, text:"For a first-order irreversible reaction A→B in a CSTR, the rate constant k = 0.5 min⁻¹ and conversion X = 0.8. The space time τ (in minutes) is:", options:["A) 8","B) 4","C) 2","D) 16"], correct:"A", solution:"For CSTR: τ = X / [k(1−X)] = 0.8 / [0.5 × 0.2] = 0.8/0.1 = 8 min", marks:2, negative:0.67, subject:"CRE" },
  { id:2, text:"For an ideal solution obeying Raoult's Law, the activity coefficient γᵢ equals:", options:["A) 0","B) 1","C) ∞","D) xᵢ"], correct:"B", solution:"For ideal solution, γᵢ = 1 for all components. Raoult's Law: pᵢ = xᵢPᵢ* (activity coefficient = 1)", marks:1, negative:0.33, subject:"Thermodynamics" },
  { id:3, text:"In the Ergun equation for packed beds, at very low Reynolds number (Re < 10), pressure drop is proportional to:", options:["A) u²","B) u","C) u⁰·⁵","D) u³"], correct:"B", solution:"At low Re, viscous forces dominate (Blake-Kozeny): ΔP/L = 150μu(1−ε)²/(Dp²ε³) → ΔP ∝ u (linear)", marks:2, negative:0.67, subject:"Fluid Mechanics" },
  { id:4, text:"The overall heat transfer coefficient U for a double-pipe HX includes which resistances?", options:["A) Convective only","B) Convection + wall conduction","C) Convection + wall + fouling","D) Fouling only"], correct:"C", solution:"1/UA = 1/hᵢAᵢ + Rfi/Aᵢ + ln(rₒ/rᵢ)/(2πkL) + Rfo/Aₒ + 1/hₒAₒ. All three resistance types included.", marks:2, negative:0.67, subject:"Heat Transfer" },
  { id:5, text:"Which control action completely eliminates steady-state offset?", options:["A) Proportional (P) only","B) Derivative (D) only","C) Integral (I) action","D) On-off control"], correct:"C", solution:"Integral action: u(t) = Kc∫e dt. Drives steady-state error to zero. P-only always has offset.", marks:1, negative:0.33, subject:"Process Control" },
  { id:6, text:"Degrees of freedom for a two-component, two-phase system at equilibrium (Gibbs Phase Rule):", options:["A) 0","B) 1","C) 2","D) 3"], correct:"C", solution:"F = C − P + 2 = 2 − 2 + 2 = 2. T and P can be independently varied.", marks:1, negative:0.33, subject:"Thermodynamics" },
  { id:7, text:"In countercurrent absorption, (L/G)min corresponds to:", options:["A) Flooding condition","B) Pinch point on operating line","C) Maximum theoretical stages","D) Zero driving force at top"], correct:"B", solution:"(L/G)min occurs when operating line touches equilibrium curve (pinch point), requiring infinite stages.", marks:2, negative:0.67, subject:"Mass Transfer" },
  { id:8, text:"The Nusselt number (Nu = hL/k) physically represents:", options:["A) Inertial to viscous forces","B) Convective to conductive heat transfer","C) Momentum to thermal diffusivity","D) Buoyancy to viscous forces"], correct:"B", solution:"Nu = hL/k = convective HT / conductive HT. (Re=inertial/viscous, Pr=momentum/thermal, Gr=buoyancy/viscous)", marks:1, negative:0.33, subject:"Heat Transfer" }
];

export default function GateApp() {
  const [data, setData] = useState(initData);
  const [tab, setTab] = useState("dashboard");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authMode, setAuthMode] = useState("login");
  const [newNote, setNewNote] = useState({ title: "", subject: "", content: "", file: null });
  const [newPost, setNewPost] = useState("");
  const [newPostSubject, setNewPostSubject] = useState("General");
  const [testState, setTestState] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [currentAnswer, setCurrentAnswer] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [noteFilter, setNoteFilter] = useState("All");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([{ role: "assistant", content: "Hi! I'm your GATE Chemical Engineering AI tutor 🤖\n\nAsk me anything — concepts, formulas, problem solving, or exam strategy!" }]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef();
  const timerRef = useRef();

  const update = (fn) => setData(prev => { const next = fn(prev); saveData(next); return next; });
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const login = () => {
    if (!authForm.email || !authForm.password) return;
    update(d => ({ ...d, user: { name: authForm.name || authForm.email.split("@")[0], email: authForm.email, avatar: (authForm.name || authForm.email).slice(0,2).toUpperCase() } }));
  };
  const logout = () => update(d => ({ ...d, user: null }));
  const setProgress = (subject, topic, val) => update(d => ({ ...d, progress: { ...d.progress, [subject]: { ...d.progress[subject], [topic]: val } } }));

  const addNote = () => {
    if (!newNote.title) return;
    const note = { id: Date.now(), ...newNote, uploader: data.user?.name || "Anonymous", time: new Date().toLocaleString(), fileUrl: newNote.file ? URL.createObjectURL(newNote.file) : null, fileName: newNote.file?.name };
    update(d => ({ ...d, notes: [note, ...d.notes] }));
    setNewNote({ title: "", subject: "", content: "", file: null });
  };

  const addPost = () => {
    if (!newPost.trim()) return;
    update(d => ({ ...d, discussions: [{ id: Date.now(), user: d.user?.name || "Anonymous", avatar: (d.user?.name || "AN").slice(0,2).toUpperCase(), text: newPost, time: "Just now", subject: newPostSubject, replies: 0, likes: 0 }, ...d.discussions] }));
    setNewPost("");
  };
  const likePost = (id) => update(d => ({ ...d, discussions: d.discussions.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p) }));

  const handleImageFile = (file) => {
    if (!file) return;
    setUploadedImage(URL.createObjectURL(file));
    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => setImageB64(ev.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const generateTest = async (useSample = false) => {
    setAiLoading(true);
    setTestResult(null);
    setCurrentAnswer({});
    if (useSample) {
      setAiMessage("Loading GATE questions...");
      await new Promise(r => setTimeout(r, 600));
      setTestState({ questions: FALLBACK_QUESTIONS, totalMarks: FALLBACK_QUESTIONS.reduce((s,q)=>s+q.marks,0), duration: FALLBACK_QUESTIONS.length * 120, startTime: Date.now(), timeLeft: FALLBACK_QUESTIONS.length * 120, active: true });
      setAiMessage(""); setAiLoading(false); return;
    }
    if (!imageB64) { setAiMessage("Please capture or upload an image first."); setAiLoading(false); return; }
    setAiMessage("🤖 Analyzing your question paper...");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imageMime, data: imageB64 } },
              { type: "text", text: `You are a GATE Chemical Engineering expert. Analyze this image of a question paper.

INSTRUCTIONS:
1. Extract ALL visible MCQ questions from this image
2. If image is unclear or contains no GATE questions, generate 8 high-quality GATE Chemical Engineering MCQs

FORMAT RULES (VERY IMPORTANT):
- "correct" field must be EXACTLY one of: "A", "B", "C", or "D" — nothing else
- "options" must have exactly 4 items starting with "A) ", "B) ", "C) ", "D) "
- "marks" is 1 or 2 (integer only)
- "negative" is 0.33 for 1-mark or 0.67 for 2-mark
- "solution" must be a complete step-by-step explanation

Respond ONLY with raw JSON. No markdown. No explanation. No backticks.

{"questions":[{"id":1,"text":"full question","options":["A) opt1","B) opt2","C) opt3","D) opt4"],"correct":"B","solution":"full solution here","marks":2,"negative":0.67,"subject":"Subject"}],"totalMarks":16,"duration":960}` }
            ]
          }]
        })
      });
      const d = await res.json();
      let text = d.content?.map(c => c.text || "").join("") || "";
      text = text.replace(/```json/gi,"").replace(/```/g,"").trim();
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s === -1 || e === -1) throw new Error("No JSON");
      const parsed = JSON.parse(text.slice(s, e+1));
      if (!parsed.questions?.length) throw new Error("No questions");
      parsed.questions = parsed.questions.map((q,i) => ({
        ...q, id: i+1,
        correct: ["A","B","C","D"].includes(String(q.correct).toUpperCase()) ? String(q.correct).toUpperCase() : "A",
        marks: Number(q.marks)||2, negative: Number(q.negative)||0.67,
        options: Array.isArray(q.options)&&q.options.length===4 ? q.options : ["A) Option A","B) Option B","C) Option C","D) Option D"]
      }));
      parsed.totalMarks = parsed.questions.reduce((s,q)=>s+q.marks,0);
      parsed.duration = parsed.questions.length * 120;
      setTestState({ ...parsed, startTime: Date.now(), timeLeft: parsed.duration, active: true });
      setAiMessage("");
    } catch(err) {
      console.error(err);
      setAiMessage("Image unclear — loading curated GATE questions instead...");
      await new Promise(r => setTimeout(r, 800));
      setTestState({ questions: FALLBACK_QUESTIONS, totalMarks: FALLBACK_QUESTIONS.reduce((s,q)=>s+q.marks,0), duration: FALLBACK_QUESTIONS.length*120, startTime: Date.now(), timeLeft: FALLBACK_QUESTIONS.length*120, active: true });
      setAiMessage("");
    }
    setAiLoading(false);
  };

  const currentAnswerRef = useRef(currentAnswer);
  useEffect(() => { currentAnswerRef.current = currentAnswer; }, [currentAnswer]);

  const doSubmit = (ts) => {
    const qs = ts?.questions || [];
    const ans = currentAnswerRef.current;
    let score = 0, correct = 0, wrong = 0, unattempted = 0;
    qs.forEach(q => {
      const a = ans[q.id];
      if (!a) unattempted++;
      else if (a === q.correct) { score += q.marks; correct++; }
      else { score -= (q.negative||0.67); wrong++; }
    });
    const maxScore = qs.reduce((s,q)=>s+q.marks,0);
    const result = { score: Math.max(0,score).toFixed(2), correct, wrong, unattempted, total:qs.length, maxScore, timeTaken: Math.round((Date.now()-(ts?.startTime||Date.now()))/60000) };
    setTestResult(result);
    setTestState(prev => prev ? {...prev, active:false} : prev);
    update(d => ({ ...d, tests: [{ id:Date.now(), ...result, date:new Date().toLocaleDateString() }, ...d.tests] }));
  };

  useEffect(() => {
    if (!testState?.active) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTestState(prev => {
        if (!prev?.active) { clearInterval(timerRef.current); return prev; }
        if (prev.timeLeft <= 1) { clearInterval(timerRef.current); doSubmit(prev); return {...prev, timeLeft:0, active:false}; }
        return {...prev, timeLeft: prev.timeLeft - 1};
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [testState?.active, testState?.startTime]);

  const submitTest = () => { clearInterval(timerRef.current); doSubmit(testState); };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput; setChatInput("");
    const newHistory = [...chatHistory, { role:"user", content:msg }];
    setChatHistory(newHistory); setChatLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800,
          system:"You are an expert GATE Chemical Engineering tutor for GATE 2027. Give concise, exam-focused answers. Show step-by-step working for numerical problems. Keep under 150 words unless solving a detailed problem.",
          messages: newHistory.slice(-8) })
      });
      const d = await res.json();
      setChatHistory(prev => [...prev, { role:"assistant", content: d.content?.map(c=>c.text||"").join("")||"Sorry, error!" }]);
    } catch { setChatHistory(prev => [...prev, { role:"assistant", content:"Network error. Please try again!" }]); }
    setChatLoading(false);
  };

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const totalTopics = Object.values(GATE_SYLLABUS).reduce((s,{topics})=>s+topics.length,0);
  const completedTopics = Object.values(data.progress).reduce((s,topics)=>s+Object.values(topics).filter(v=>v===2).length,0);
  const inProgressTopics = Object.values(data.progress).reduce((s,topics)=>s+Object.values(topics).filter(v=>v===1).length,0);
  const overallPct = Math.round((completedTopics/totalTopics)*100);
  const subjectProgress = Object.entries(GATE_SYLLABUS).map(([name,{topics,color,light,icon}]) => {
    const done = Object.values(data.progress[name]||{}).filter(v=>v===2).length;
    const inP = Object.values(data.progress[name]||{}).filter(v=>v===1).length;
    return { name, topics:topics.length, done, inP, pct:Math.round(((done+inP*0.5)/topics.length)*100), color, light, icon };
  });

  const tabs = [
    {id:"dashboard",label:"Home",emoji:"🏠"},
    {id:"progress",label:"Progress",emoji:"📊"},
    {id:"notes",label:"Notes",emoji:"📝"},
    {id:"discuss",label:"Discuss",emoji:"💬"},
    {id:"test",label:"Test",emoji:"📸"},
    {id:"tutor",label:"AI Tutor",emoji:"🤖"}
  ];

  if (!data.user) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e1b4b,#312e81,#1e40af,#065f46)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",boxSizing:"border-box"}}>
      <div style={{background:"rgba(255,255,255,0.97)",borderRadius:24,padding:"2rem",width:"100%",maxWidth:400,boxSizing:"border-box",boxShadow:"0 25px 60px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:52,marginBottom:8}}>⚗️</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,background:"linear-gradient(135deg,#4338ca,#0891b2)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>GATE Chem 2027</h1>
          <p style={{margin:"4px 0 0",color:"#64748b",fontSize:13}}>Complete GATE Chemical Engineering Hub</p>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{flex:1,padding:"10px",borderRadius:10,border:authMode===m?"2px solid #4338ca":"1px solid #e2e8f0",background:authMode===m?"#ede9fe":"white",color:authMode===m?"#4338ca":"#64748b",fontWeight:600,cursor:"pointer",fontSize:14}}>{m==="login"?"Login":"Sign Up"}</button>
          ))}
        </div>
        {authMode==="signup"&&<input placeholder="Full Name" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:10,fontSize:15,boxSizing:"border-box"}} />}
        <input placeholder="Email" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:10,fontSize:15,boxSizing:"border-box"}} />
        <input type="password" placeholder="Password" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()} style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:16,fontSize:15,boxSizing:"border-box"}} />
        <button onClick={login} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4338ca,#0891b2)",color:"white",fontWeight:700,fontSize:16,cursor:"pointer"}}>{authMode==="login"?"Login":"Create Account"}</button>
        <p style={{textAlign:"center",color:"#94a3b8",fontSize:12,marginTop:12}}>Demo: any email + any password works</p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"'Segoe UI',system-ui,sans-serif",paddingBottom:68}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81,#1e40af)",color:"white",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 1rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>⚗️</span>
            <div>
              <div style={{fontWeight:800,fontSize:14,letterSpacing:-0.3}}>GATE Chem 2027</div>
              <div style={{fontSize:10,opacity:0.7}}>Chemical Engg.</div>
            </div>
          </div>
          {/* Desktop nav */}
          <div style={{display:"flex",gap:2}} className="desk-nav">
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 11px",borderRadius:16,border:"none",background:tab===t.id?"rgba(255,255,255,0.25)":"transparent",color:"white",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:400,whiteSpace:"nowrap"}}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{data.user.avatar}</div>
            <button onClick={logout} style={{padding:"4px 9px",borderRadius:8,border:"1px solid rgba(255,255,255,0.4)",background:"transparent",color:"white",cursor:"pointer",fontSize:12}}>Out</button>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"white",borderTop:"1px solid #e2e8f0",display:"flex",zIndex:100,boxShadow:"0 -2px 10px rgba(0,0,0,0.08)"}} className="mob-nav">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 2px 5px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:17}}>{t.emoji}</span>
            <span style={{fontSize:9,color:tab===t.id?"#4338ca":"#94a3b8",fontWeight:tab===t.id?700:400}}>{t.label}</span>
            {tab===t.id&&<div style={{width:18,height:2,background:"#4338ca",borderRadius:2}}/>}
          </button>
        ))}
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"1rem"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e1b4b",fontSize:19}}>👋 Hey {data.user.name.split(" ")[0]}!</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
              {[{l:"Overall",v:`${overallPct}%`,c:"#4338ca",bg:"#ede9fe",e:"🎯"},{l:"Completed",v:completedTopics,c:"#059669",bg:"#d1fae5",e:"✅"},{l:"In Progress",v:inProgressTopics,c:"#d97706",bg:"#fef3c7",e:"⏳"},{l:"Notes",v:data.notes.length,c:"#0891b2",bg:"#cffafe",e:"📝"},{l:"Tests",v:data.tests.length,c:"#db2777",bg:"#fce7f3",e:"📋"}].map(s=>(
                <div key={s.l} style={{background:s.bg,borderRadius:14,padding:"0.9rem"}}>
                  <div style={{fontSize:22,marginBottom:4}}>{s.e}</div>
                  <div style={{fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:"white",borderRadius:14,padding:"1rem",marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontWeight:700,color:"#1e1b4b",fontSize:14}}>Syllabus Coverage</span>
                <span style={{fontWeight:800,color:"#4338ca",fontSize:17}}>{overallPct}%</span>
              </div>
              <div style={{background:"#e2e8f0",borderRadius:999,height:12,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${overallPct}%`,background:"linear-gradient(90deg,#4338ca,#0891b2)",borderRadius:999}}/>
              </div>
              <div style={{display:"flex",gap:12,marginTop:8,fontSize:12,flexWrap:"wrap"}}>
                <span style={{color:"#059669"}}>✅ {completedTopics} done</span>
                <span style={{color:"#d97706"}}>⏳ {inProgressTopics} in progress</span>
                <span style={{color:"#64748b"}}>📚 {totalTopics-completedTopics-inProgressTopics} pending</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10}}>
              {subjectProgress.map(s=>(
                <div key={s.name} onClick={()=>setTab("progress")} style={{background:"white",borderRadius:14,padding:"0.9rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${s.color}`,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:16}}>{s.icon}</span>
                      <span style={{fontWeight:600,color:"#1e1b4b",fontSize:13}}>{s.name}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:s.color}}>{s.pct}%</span>
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:999,height:6,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${s.pct}%`,background:s.color,borderRadius:999}}/>
                  </div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:5}}>{s.done}/{s.topics} topics</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROGRESS */}
        {tab==="progress"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e1b4b",fontSize:19}}>📊 Syllabus Tracker</h2>
            {Object.entries(GATE_SYLLABUS).map(([sub,{topics,color,light,icon}])=>{
              const prog=data.progress[sub]||{};
              const done=Object.values(prog).filter(v=>v===2).length;
              const inP=Object.values(prog).filter(v=>v===1).length;
              const pct=Math.round(((done+inP*0.5)/topics.length)*100);
              return (
                <div key={sub} style={{background:"white",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:14}}>
                  <div style={{background:color,padding:"0.8rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:18}}>{icon}</span>
                      <div>
                        <div style={{color:"white",fontWeight:700,fontSize:14}}>{sub}</div>
                        <div style={{color:"rgba(255,255,255,0.8)",fontSize:11}}>{topics.length} topics · {done} done</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:"white",fontWeight:800,fontSize:18}}>{pct}%</div>
                      <div style={{background:"rgba(255,255,255,0.3)",borderRadius:999,height:4,width:50,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:"white",borderRadius:999}}/>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:"0.8rem",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:7}}>
                    {topics.map(topic=>{
                      const val=prog[topic]||0;
                      const states=[{bg:"#f8fafc",c:"#94a3b8",e:"○"},{bg:"#fef9c3",c:"#d97706",e:"◑"},{bg:"#dcfce7",c:"#059669",e:"●"}];
                      const st=states[val];
                      return (
                        <div key={topic} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 9px",background:st.bg,borderRadius:9}}>
                          <span style={{fontSize:12,color:"#334155",fontWeight:500,flex:1,marginRight:6}}>{topic}</span>
                          <div style={{display:"flex",gap:3,flexShrink:0}}>
                            {states.map((s,i)=>(
                              <button key={i} onClick={()=>setProgress(sub,topic,i)} style={{width:24,height:24,borderRadius:6,border:val===i?`2px solid ${color}`:"1px solid #e2e8f0",background:val===i?light:"white",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{s.e}</button>
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
        )}

        {/* NOTES */}
        {tab==="notes"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e1b4b",fontSize:19}}>📝 Notes Repository</h2>
            <div style={{background:"white",borderRadius:14,padding:"1.1rem",marginBottom:18,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"2px dashed #c7d2fe"}}>
              <h3 style={{margin:"0 0 10px",color:"#4338ca",fontSize:15}}>📤 Upload Notes</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginBottom:8}}>
                <input placeholder="Title *" value={newNote.title} onChange={e=>setNewNote(n=>({...n,title:e.target.value}))} style={{padding:"9px 11px",borderRadius:9,border:"1px solid #e2e8f0",fontSize:14,boxSizing:"border-box"}}/>
                <select value={newNote.subject} onChange={e=>setNewNote(n=>({...n,subject:e.target.value}))} style={{padding:"9px 11px",borderRadius:9,border:"1px solid #e2e8f0",fontSize:14}}>
                  <option value="">Subject</option>
                  {Object.keys(GATE_SYLLABUS).map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <textarea placeholder="Description..." value={newNote.content} onChange={e=>setNewNote(n=>({...n,content:e.target.value}))} style={{width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid #e2e8f0",fontSize:14,resize:"vertical",minHeight:60,boxSizing:"border-box",marginBottom:8}}/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <label style={{display:"inline-flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:9,border:"1px dashed #7c3aed",color:"#7c3aed",cursor:"pointer",fontSize:13,fontWeight:500}}>
                  📎 {newNote.file?newNote.file.name.slice(0,18)+"...":"Attach File"}
                  <input type="file" accept="*/*" style={{display:"none"}} onChange={e=>setNewNote(n=>({...n,file:e.target.files[0]}))}/>
                </label>
                <button onClick={addNote} style={{padding:"8px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#4338ca,#0891b2)",color:"white",fontWeight:700,cursor:"pointer",fontSize:14}}>Upload</button>
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {["All",...Object.keys(GATE_SYLLABUS)].map(f=>(
                <button key={f} onClick={()=>setNoteFilter(f)} style={{padding:"4px 10px",borderRadius:14,border:noteFilter===f?"none":"1px solid #e2e8f0",background:noteFilter===f?"#4338ca":"white",color:noteFilter===f?"white":"#64748b",cursor:"pointer",fontSize:12,fontWeight:noteFilter===f?600:400}}>{f}</button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
              {data.notes.filter(n=>noteFilter==="All"||n.subject===noteFilter).map(note=>{
                const sub=GATE_SYLLABUS[note.subject];
                return (
                  <div key={note.id} style={{background:"white",borderRadius:14,padding:"1rem",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",borderTop:`4px solid ${sub?.color||"#4338ca"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                      <h4 style={{margin:0,color:"#1e1b4b",fontSize:14}}>{note.title}</h4>
                      {note.subject&&<span style={{fontSize:10,background:sub?.light||"#ede9fe",color:sub?.color||"#4338ca",padding:"2px 6px",borderRadius:6,fontWeight:600,marginLeft:6,flexShrink:0}}>{note.subject.split(" ")[0]}</span>}
                    </div>
                    {note.content&&<p style={{fontSize:13,color:"#64748b",margin:"0 0 8px",lineHeight:1.5}}>{note.content}</p>}
                    <div style={{fontSize:11,color:"#94a3b8",display:"flex",justifyContent:"space-between"}}>
                      <span>👤 {note.uploader}</span><span>{note.time}</span>
                    </div>
                    {note.fileName&&<a href={note.fileUrl} download={note.fileName} style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:8,padding:"5px 9px",borderRadius:7,background:"#f1f5f9",color:"#4338ca",fontSize:12,textDecoration:"none",fontWeight:600}}>📎 {note.fileName}</a>}
                  </div>
                );
              })}
              {data.notes.filter(n=>noteFilter==="All"||n.subject===noteFilter).length===0&&(
                <div style={{gridColumn:"1/-1",textAlign:"center",padding:"2.5rem",color:"#94a3b8"}}>
                  <div style={{fontSize:36,marginBottom:8}}>📭</div>
                  <div>No notes yet. Upload the first one!</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISCUSS */}
        {tab==="discuss"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e1b4b",fontSize:19}}>💬 Community</h2>
            <div style={{background:"white",borderRadius:14,padding:"1rem",marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <textarea placeholder="Share a doubt, tip, or resource..." value={newPost} onChange={e=>setNewPost(e.target.value)} style={{width:"100%",padding:"9px 11px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:14,resize:"none",minHeight:70,boxSizing:"border-box"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,flexWrap:"wrap",gap:8}}>
                <select value={newPostSubject} onChange={e=>setNewPostSubject(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13}}>
                  <option>General</option>
                  {Object.keys(GATE_SYLLABUS).map(s=><option key={s}>{s}</option>)}
                </select>
                <button onClick={addPost} style={{padding:"7px 18px",borderRadius:9,border:"none",background:"#4338ca",color:"white",fontWeight:600,cursor:"pointer"}}>Post</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {data.discussions.map(post=>{
                const sub=GATE_SYLLABUS[post.subject];
                return (
                  <div key={post.id} style={{background:"white",borderRadius:14,padding:"1rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                    <div style={{display:"flex",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${sub?.color||"#4338ca"},#0891b2)`,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{post.avatar}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,flexWrap:"wrap",gap:4}}>
                          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                            <span style={{fontWeight:700,color:"#1e1b4b",fontSize:14}}>{post.user}</span>
                            {post.subject&&<span style={{fontSize:10,background:sub?.light||"#ede9fe",color:sub?.color||"#4338ca",padding:"2px 6px",borderRadius:5,fontWeight:600}}>{post.subject}</span>}
                          </div>
                          <span style={{fontSize:11,color:"#94a3b8"}}>{post.time}</span>
                        </div>
                        <p style={{margin:"0 0 8px",color:"#334155",lineHeight:1.6,fontSize:14,wordBreak:"break-word"}}>{post.text}</p>
                        <div style={{display:"flex",gap:12}}>
                          <button onClick={()=>likePost(post.id)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:13}}>❤️ {post.likes}</button>
                          <span style={{color:"#94a3b8",fontSize:13}}>💬 {post.replies}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TEST */}
        {tab==="test"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e1b4b",fontSize:19}}>📸 AI Mock Test</h2>
            {!testState&&(
              <div>
                <div style={{background:"white",borderRadius:16,padding:"1.5rem",marginBottom:18,boxShadow:"0 2px 8px rgba(0,0,0,0.07)",textAlign:"center"}}>
                  <div style={{fontSize:48,marginBottom:10}}>📷</div>
                  <h3 style={{margin:"0 0 8px",color:"#1e1b4b",fontSize:17}}>Capture or Upload Question Paper</h3>
                  <p style={{color:"#64748b",margin:"0 0 18px",fontSize:13,lineHeight:1.6}}>Click a photo of any GATE previous year paper. AI reads the questions and creates a timed test with solutions!</p>

                  {/* TWO BUTTONS: Camera + Gallery */}
                  <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:18}}>
                    {/* Direct camera — capture="environment" opens rear camera on mobile */}
                    <label style={{display:"inline-flex",alignItems:"center",gap:8,padding:"13px 22px",borderRadius:14,background:"linear-gradient(135deg,#4338ca,#7c3aed)",color:"white",cursor:"pointer",fontSize:15,fontWeight:700,boxShadow:"0 4px 14px rgba(67,56,202,0.35)"}}>
                      📷 Open Camera
                      <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleImageFile(e.target.files[0]);}}/>
                    </label>
                    {/* Gallery picker */}
                    <label style={{display:"inline-flex",alignItems:"center",gap:8,padding:"13px 22px",borderRadius:14,border:"2px solid #4338ca",color:"#4338ca",cursor:"pointer",fontSize:15,fontWeight:700,background:"white"}}>
                      🖼️ From Gallery
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleImageFile(e.target.files[0]);}}/>
                    </label>
                  </div>

                  {uploadedImage&&(
                    <div style={{marginBottom:18}}>
                      <img src={uploadedImage} alt="Paper" style={{maxWidth:"100%",maxHeight:240,objectFit:"contain",borderRadius:12,border:"2px solid #e2e8f0"}}/>
                      <p style={{color:"#059669",fontSize:13,marginTop:8,fontWeight:600}}>✅ Image ready — click Generate Test!</p>
                    </div>
                  )}

                  <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                    <button onClick={()=>generateTest(false)} disabled={aiLoading||!imageB64} style={{padding:"12px 24px",borderRadius:13,border:"none",background:aiLoading||!imageB64?"#cbd5e1":"linear-gradient(135deg,#059669,#0891b2)",color:"white",fontWeight:700,fontSize:15,cursor:aiLoading||!imageB64?"not-allowed":"pointer"}}>
                      {aiLoading?"🤖 Analyzing...":"🚀 Generate from Image"}
                    </button>
                    <button onClick={()=>generateTest(true)} disabled={aiLoading} style={{padding:"12px 20px",borderRadius:13,border:"2px solid #4338ca",background:"white",color:"#4338ca",fontWeight:700,fontSize:14,cursor:aiLoading?"not-allowed":"pointer"}}>
                      🎲 Sample Test
                    </button>
                  </div>
                  {aiMessage&&<p style={{color:"#d97706",fontSize:13,marginTop:12}}>{aiMessage}</p>}
                </div>

                {data.tests.length>0&&(
                  <div style={{background:"white",borderRadius:14,padding:"1rem",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                    <h3 style={{margin:"0 0 10px",color:"#1e1b4b",fontSize:15}}>📋 Test History</h3>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                      {data.tests.slice(0,6).map(t=>(
                        <div key={t.id} style={{background:"#f8fafc",borderRadius:10,padding:"0.8rem",border:"1px solid #e2e8f0"}}>
                          <div style={{fontWeight:700,fontSize:17,color:"#4338ca"}}>{t.score}/{t.maxScore}</div>
                          <div style={{fontSize:12,color:"#64748b"}}>✅{t.correct} ❌{t.wrong} ○{t.unattempted}</div>
                          <div style={{fontSize:11,color:"#94a3b8",marginTop:3}}>{t.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {testState&&(
              <div>
                <div style={{background:testState.timeLeft<300?"#fee2e2":"#ede9fe",borderRadius:13,padding:"0.8rem 1rem",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,position:"sticky",top:54,zIndex:50}}>
                  <div style={{fontWeight:700,color:"#1e1b4b",fontSize:14}}>⏱ <span style={{color:testState.timeLeft<300?"#dc2626":"#4338ca",fontFamily:"monospace",fontSize:20}}>{formatTime(testState.timeLeft)}</span></div>
                  <div style={{fontSize:13,color:"#64748b"}}>{Object.keys(currentAnswer).length}/{testState.questions.length} answered</div>
                  {testState.active&&<button onClick={submitTest} style={{padding:"8px 16px",borderRadius:9,border:"none",background:"#dc2626",color:"white",fontWeight:700,cursor:"pointer"}}>Submit</button>}
                </div>

                {testResult&&(
                  <div style={{background:"linear-gradient(135deg,#1e1b4b,#065f46)",borderRadius:16,padding:"1.3rem",marginBottom:16,color:"white",textAlign:"center"}}>
                    <div style={{fontSize:36,marginBottom:8}}>🎉</div>
                    <h2 style={{margin:"0 0 12px",fontSize:18}}>Test Completed!</h2>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:8,marginBottom:14}}>
                      {[{l:"Score",v:`${testResult.score}/${testResult.maxScore}`},{l:"Correct",v:testResult.correct},{l:"Wrong",v:testResult.wrong},{l:"Skipped",v:testResult.unattempted},{l:"Time",v:`${testResult.timeTaken}m`}].map(s=>(
                        <div key={s.l} style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 5px"}}>
                          <div style={{fontSize:18,fontWeight:800}}>{s.v}</div>
                          <div style={{fontSize:11,opacity:0.8}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>{setTestState(null);setTestResult(null);setUploadedImage(null);setImageB64(null);}} style={{padding:"9px 20px",borderRadius:9,border:"2px solid white",background:"transparent",color:"white",fontWeight:700,cursor:"pointer"}}>New Test</button>
                  </div>
                )}

                {testState.questions.map((q,idx)=>{
                  const answered=currentAnswer[q.id];
                  const show=!!testResult;
                  const isCorr=answered===q.correct;
                  let cardBorder=show?`2px solid ${isCorr?"#059669":answered?"#dc2626":"#94a3b8"}`:"1px solid #e2e8f0";
                  return (
                    <div key={q.id} style={{background:"white",borderRadius:14,padding:"1rem",marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:cardBorder}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:5}}>
                        <div style={{display:"flex",gap:5}}>
                          <span style={{background:"#ede9fe",color:"#4338ca",fontWeight:700,padding:"3px 8px",borderRadius:7,fontSize:12}}>Q{idx+1}</span>
                          {q.subject&&<span style={{background:"#f1f5f9",color:"#64748b",padding:"3px 8px",borderRadius:7,fontSize:11}}>{q.subject}</span>}
                        </div>
                        <span style={{fontSize:12,color:"#64748b"}}>{q.marks}m | −{q.negative||0.67}</span>
                      </div>
                      <p style={{margin:"0 0 12px",color:"#1e1b4b",fontWeight:500,lineHeight:1.65,fontSize:14}}>{q.text}</p>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:7}}>
                        {(q.options||[]).map((opt,oi)=>{
                          const letter=["A","B","C","D"][oi];
                          const isSel=answered===letter;
                          const isCorrOpt=q.correct===letter;
                          let bg="#f8fafc",border="1px solid #e2e8f0",col="#334155";
                          if(show){if(isCorrOpt){bg="#d1fae5";border="2px solid #059669";col="#065f46";}else if(isSel){bg="#fee2e2";border="2px solid #dc2626";col="#7f1d1d";}}
                          else if(isSel){bg="#ede9fe";border="2px solid #4338ca";col="#1e1b4b";}
                          return (
                            <button key={oi} onClick={()=>{if(testState.active)setCurrentAnswer(a=>({...a,[q.id]:letter}));}}
                              style={{padding:"9px 11px",borderRadius:9,border,background:bg,color:col,textAlign:"left",cursor:testState.active?"pointer":"default",fontSize:13,fontWeight:isSel||(show&&isCorrOpt)?600:400,lineHeight:1.4}}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {show&&q.solution&&(
                        <div style={{marginTop:10,padding:"9px 12px",background:"#f0fdf4",borderRadius:9,border:"1px solid #bbf7d0"}}>
                          <div style={{fontWeight:700,color:"#059669",fontSize:13,marginBottom:4}}>✅ Solution:</div>
                          <div style={{color:"#065f46",fontSize:13,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{q.solution}</div>
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
        {tab==="tutor"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e1b4b",fontSize:19}}>🤖 AI Tutor</h2>
            <div style={{background:"white",borderRadius:16,boxShadow:"0 2px 10px rgba(0,0,0,0.07)",overflow:"hidden"}}>
              <div style={{background:"linear-gradient(135deg,#1e1b4b,#0891b2)",padding:"0.8rem 1rem",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
                <div>
                  <div style={{color:"white",fontWeight:700,fontSize:14}}>GATE Chem AI Tutor</div>
                  <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>Powered by Claude · GATE 2027 Expert</div>
                </div>
              </div>
              <div style={{height:360,overflowY:"auto",padding:"0.9rem",display:"flex",flexDirection:"column",gap:10,background:"#f8fafc"}}>
                {chatHistory.map((m,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                    <div style={{maxWidth:"82%",padding:"9px 13px",borderRadius:m.role==="user"?"15px 15px 4px 15px":"15px 15px 15px 4px",background:m.role==="user"?"linear-gradient(135deg,#4338ca,#0891b2)":"white",color:m.role==="user"?"white":"#1e1b4b",fontSize:14,lineHeight:1.6,boxShadow:"0 2px 6px rgba(0,0,0,0.07)",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading&&(
                  <div style={{display:"flex"}}>
                    <div style={{padding:"9px 13px",borderRadius:"15px 15px 15px 4px",background:"white",boxShadow:"0 2px 6px rgba(0,0,0,0.07)"}}>
                      <div style={{display:"flex",gap:4,alignItems:"center"}}>
                        {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#4338ca",animation:"bounce 1.2s infinite",animationDelay:`${i*0.2}s`}}/>)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
              <div style={{padding:"7px 10px",background:"white",borderTop:"1px solid #f1f5f9",display:"flex",gap:5,flexWrap:"wrap"}}>
                {["CSTR vs PFR","Raoult's Law","GATE tips 2027","Key CRE formulas"].map(p=>(
                  <button key={p} onClick={()=>setChatInput(p)} style={{padding:"5px 9px",borderRadius:14,border:"1px solid #c7d2fe",background:"#ede9fe",color:"#4338ca",cursor:"pointer",fontSize:12,fontWeight:500}}>{p}</button>
                ))}
              </div>
              <div style={{padding:"0.8rem",background:"white",borderTop:"1px solid #f1f5f9",display:"flex",gap:7}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()} placeholder="Ask anything about GATE Chem..." style={{flex:1,padding:"10px 13px",borderRadius:11,border:"1px solid #e2e8f0",fontSize:14,minWidth:0}}/>
                <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()} style={{padding:"10px 16px",borderRadius:11,border:"none",background:chatLoading||!chatInput.trim()?"#e2e8f0":"linear-gradient(135deg,#4338ca,#0891b2)",color:chatLoading||!chatInput.trim()?"#94a3b8":"white",fontWeight:700,cursor:chatLoading||!chatInput.trim()?"not-allowed":"pointer",fontSize:14,flexShrink:0}}>Send</button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        input,textarea,select,button{outline:none;font-family:inherit;}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#c7d2fe;border-radius:4px}
        @media(max-width:640px){
          .desk-nav{display:none!important}
        }
        @media(min-width:641px){
          .mob-nav{display:none!important}
        }
      `}</style>
    </div>
  );
}
