import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────── SYLLABUS DATA ─────────────── */
const SYLLABUS = {
  "Engineering Mathematics":         { color:"#7C3AED", light:"#EDE9FE", icon:"📐", topics:["Linear Algebra","Calculus","Differential Equations","Complex Variables","Probability & Statistics","Numerical Methods","Laplace Transforms"] },
  "Process Calculations":            { color:"#0891B2", light:"#CFFAFE", icon:"⚗️",  topics:["Stoichiometry","Material Balances","Energy Balances","Recycle & Bypass","Combustion","Humidity & Psychrometry"] },
  "Thermodynamics":                  { color:"#DC2626", light:"#FEE2E2", icon:"🔥", topics:["Laws of Thermodynamics","PVT Relations","Phase Equilibria","Chemical Reaction Equilibria","Fugacity & Activity","Equations of State"] },
  "Fluid Mechanics":                 { color:"#2563EB", light:"#DBEAFE", icon:"🌊", topics:["Fluid Statics","Bernoulli Equation","Flow Measurement","Pipe Flow","Pumps & Compressors","Packed & Fluidized Beds"] },
  "Heat Transfer":                   { color:"#EA580C", light:"#FED7AA", icon:"♨️",  topics:["Conduction","Convection","Radiation","Heat Exchangers","LMTD & NTU Methods","Evaporation"] },
  "Mass Transfer":                   { color:"#059669", light:"#D1FAE5", icon:"💧", topics:["Diffusion","Distillation","Absorption","Extraction","Humidification","Adsorption & Ion Exchange","Membrane Separations"] },
  "Chemical Reaction Engineering":   { color:"#D97706", light:"#FEF3C7", icon:"⚡", topics:["Ideal Reactors (CSTR, PFR)","Rate Laws","Multiple Reactions","Non-ideal Reactors","Residence Time Distribution","Heterogeneous Catalysis"] },
  "Instrumentation & Process Control":{ color:"#9333EA", light:"#F3E8FF", icon:"🎛️", topics:["Sensors & Transducers","Control Loops","PID Controllers","Frequency Response","Stability Analysis","Process Dynamics"] },
  "Plant Design & Economics":        { color:"#DB2777", light:"#FCE7F3", icon:"🏭", topics:["Cost Estimation","Profitability Analysis","Optimization","Heat Integration","Safety & HAZOP","Equipment Design"] },
  "Chemical Technology":             { color:"#0F766E", light:"#CCFBF1", icon:"🧪", topics:["Petroleum Refining","Petrochemicals","Polymers","Fertilizers","Cement & Glass","Dyes & Intermediates"] }
};

/* ─────────────── STORAGE ─────────────── */
const KEY = "gate27_v4";
const load = () => { try { const d=localStorage.getItem(KEY); return d?JSON.parse(d):null; } catch{return null;} };
const save = (d) => { try { localStorage.setItem(KEY,JSON.stringify(d)); } catch{} };

function initData() {
  const s = load();
  if (s?.user !== undefined) return s;
  const progress = {};
  Object.entries(SYLLABUS).forEach(([k,{topics}])=>{ progress[k]={}; topics.forEach(t=>{progress[k][t]=0;}); });
  return {
    user:null, progress, notes:[], tests:[],
    discussions:[
      {id:1,user:"Priya S.",av:"PS",text:"Anyone solved GATE 2024 distillation Q34? Stuck on reflux ratio.",time:"2h ago",subject:"Mass Transfer",likes:7,replies:3},
      {id:2,user:"Rahul M.",av:"RM",text:"Best approach for PDEs in GATE? Separation of variables confusing me.",time:"5h ago",subject:"Engg Math",likes:12,replies:5},
      {id:3,user:"Anjali K.",av:"AK",text:"My complete RTD & non-ideal reactor notes — super detailed!",time:"1d ago",subject:"CRE",likes:24,replies:8}
    ]
  };
}

/* ─────────────── CLAUDE API HELPER ─────────────── */
async function callClaude({ system="", messages=[], max_tokens=2000, imageB64=null, imageMime="image/jpeg" }) {
  // Build the last user message content
  const lastMsg = messages[messages.length-1];
  let content = lastMsg.content;

  // If image provided, prepend it to the last user message
  if (imageB64) {
    content = [
      { type:"image", source:{ type:"base64", media_type: imageMime, data: imageB64 } },
      { type:"text",  text: typeof lastMsg.content === "string" ? lastMsg.content : lastMsg.content[0]?.text || "" }
    ];
  }

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens,
    messages: [
      ...messages.slice(0,-1),
      { role:"user", content }
    ]
  };
  if (system) body.system = system;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content?.map(c=>c.text||"").join("") || "";
}

/* ─────────────── JSON EXTRACTOR ─────────────── */
function extractJSON(text) {
  // Remove markdown fences
  text = text.replace(/```json\s*/gi,"").replace(/```\s*/gi,"").trim();
  // Find first { and last }
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(text.slice(start, end+1));
}

/* ─────────────── QUESTION VALIDATOR ─────────────── */
function validateQuestion(q, idx) {
  const validLetters = ["A","B","C","D"];
  return {
    id: idx+1,
    text: String(q.text || q.question || `Question ${idx+1}`).trim(),
    options: Array.isArray(q.options) && q.options.length === 4
      ? q.options.map((o,i) => {
          const prefix = `${validLetters[i]}) `;
          const s = String(o).trim();
          return s.startsWith(prefix[0]+")") ? s : prefix + s.replace(/^[A-Da-d][).]\s*/,"");
        })
      : [`A) Option A`, `B) Option B`, `C) Option C`, `D) Option D`],
    correct: validLetters.includes(String(q.correct||q.answer||"").toUpperCase().trim())
      ? String(q.correct||q.answer).toUpperCase().trim()
      : "A",
    solution: String(q.solution || q.explanation || "See standard GATE solution.").trim(),
    marks: [1,2].includes(Number(q.marks)) ? Number(q.marks) : 2,
    negative: Number(q.negative) || (Number(q.marks)===1 ? 0.33 : 0.67),
    subject: String(q.subject || q.topic || "General").trim()
  };
}

/* ─────────────── SAMPLE QUESTIONS ─────────────── */
const SAMPLE_QS = [
  {text:"For a first-order irreversible reaction A→B in a CSTR, rate constant k=0.5 min⁻¹, conversion X=0.8. Space time τ (min) is:",options:["A) 8","B) 4","C) 2","D) 16"],correct:"A",solution:"CSTR design: τ = X/[k(1−X)] = 0.8/[0.5×0.2] = 0.8/0.1 = 8 min ✓",marks:2,subject:"CRE"},
  {text:"For an ideal solution obeying Raoult's Law, the activity coefficient γᵢ equals:",options:["A) 0","B) 1","C) ∞","D) xᵢ"],correct:"B",solution:"Ideal solution: γᵢ = 1 for all components. Raoult's Law: pᵢ = xᵢ·Pᵢ* (γ=1 assumption) ✓",marks:1,subject:"Thermodynamics"},
  {text:"In Ergun equation for packed beds at very low Re (<10), pressure drop ΔP is proportional to:",options:["A) u²","B) u (linear)","C) u⁰·⁵","D) u³"],correct:"B",solution:"Low Re → Blake-Kozeny term dominates: ΔP/L = 150μu(1−ε)²/(Dp²ε³). ΔP ∝ u (viscous flow) ✓",marks:2,subject:"Fluid Mechanics"},
  {text:"Overall heat transfer coefficient U for a double-pipe HX includes resistances from:",options:["A) Convection only","B) Convection + wall conduction","C) Convection + wall + fouling (both sides)","D) Fouling only"],correct:"C",solution:"1/UA = 1/hᵢAᵢ + Rfi/Aᵢ + ln(rₒ/rᵢ)/(2πkL) + Rfo/Aₒ + 1/hₒAₒ. All resistances in series ✓",marks:2,subject:"Heat Transfer"},
  {text:"Which control action completely eliminates steady-state offset (error)?",options:["A) Proportional (P) only","B) Derivative (D) only","C) Integral (I) action","D) On-off control"],correct:"C",solution:"Integral: u(t)=Kc∫e dt. Integrates error until e=0, so steady-state offset → 0. P-only always has offset ✓",marks:1,subject:"Process Control"},
  {text:"Gibbs Phase Rule: degrees of freedom for 2-component, 2-phase system at equilibrium:",options:["A) 0","B) 1","C) 2","D) 3"],correct:"C",solution:"F = C − P + 2 = 2 − 2 + 2 = 2. Can independently vary T and P (within 2-phase region) ✓",marks:1,subject:"Thermodynamics"},
  {text:"In countercurrent absorption, (L/G)min corresponds to:",options:["A) Flooding condition","B) Pinch point (operating line touches equilibrium curve)","C) Maximum theoretical stages","D) Zero driving force at column top"],correct:"B",solution:"(L/G)min → operating line just touches equilibrium curve = pinch point → infinite stages needed. Actual L/G = 1.2–1.5×minimum ✓",marks:2,subject:"Mass Transfer"},
  {text:"Nusselt number Nu = hL/k physically represents:",options:["A) Ratio of inertial to viscous forces","B) Ratio of convective to conductive heat transfer","C) Ratio of momentum to thermal diffusivity","D) Ratio of buoyancy to viscous forces"],correct:"B",solution:"Nu = hL/k = convective HT rate / conductive HT rate. (Re=inertial/viscous, Pr=momentum/thermal, Gr=buoyancy/viscous) ✓",marks:1,subject:"Heat Transfer"},
  {text:"The Damköhler number (Da) for a first-order reaction in a CSTR is defined as:",options:["A) Da = k/τ","B) Da = kτ","C) Da = k·Cₐ₀·τ","D) Da = τ/k"],correct:"B",solution:"Da = kτ (first-order). At X=0.8: Da = X/(1−X) = 0.8/0.2 = 4. Da = kτ = 0.5×8 = 4 ✓",marks:2,subject:"CRE"},
  {text:"McCabe-Thiele method is used for design of:",options:["A) Heat exchangers","B) Binary distillation columns","C) Packed absorption towers","D) Evaporators"],correct:"B",solution:"McCabe-Thiele: graphical method for binary distillation using operating lines + equilibrium curve to find theoretical stages ✓",marks:1,subject:"Mass Transfer"}
];

/* ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [data, setData]       = useState(initData);
  const [tab,  setTab]        = useState("dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({name:"",email:"",password:""});

  // Notes
  const [newNote, setNewNote] = useState({title:"",subject:"",content:"",file:null});
  const [noteFilter, setNoteFilter] = useState("All");

  // Discussion
  const [newPost, setNewPost]   = useState("");
  const [postSub, setPostSub]   = useState("General");

  // Test states
  const [imgFile,      setImgFile]      = useState(null);   // File object
  const [imgPreview,   setImgPreview]   = useState(null);   // object URL
  const [imgB64,       setImgB64]       = useState(null);   // base64 string
  const [imgMime,      setImgMime]      = useState("image/jpeg");
  const [testState,    setTestState]    = useState(null);
  const [answers,      setAnswers]      = useState({});
  const [testResult,   setTestResult]   = useState(null);
  const [testLoading,  setTestLoading]  = useState(false);
  const [testStatus,   setTestStatus]   = useState("");
  const [testStep,     setTestStep]     = useState(0); // 0=upload, 1=preview, 2=active, 3=result

  // Chat
  const [chatMsgs,    setChatMsgs]    = useState([{role:"assistant",content:"👋 Hi! I'm your GATE 2027 AI Tutor.\n\nAsk me anything — formulas, concepts, problems, strategy. I'll give you exam-focused answers with step-by-step solutions!"}]);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatContext, setChatContext] = useState("General"); // subject context

  const timerRef   = useRef(null);
  const answersRef = useRef({});
  const chatEndRef = useRef(null);

  useEffect(()=>{answersRef.current=answers;},[answers]);
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chatMsgs]);

  const upd = useCallback((fn)=>{
    setData(prev=>{ const next=fn(prev); save(next); return next; });
  },[]);

  /* ── AUTH ── */
  const login = () => {
    if (!authForm.email||!authForm.password) return;
    const name = authForm.name||authForm.email.split("@")[0];
    upd(d=>({...d, user:{name, email:authForm.email, av:name.slice(0,2).toUpperCase()}}));
  };
  const logout = () => upd(d=>({...d,user:null}));

  /* ── PROGRESS ── */
  const setProg = (sub,topic,val) => upd(d=>({...d,progress:{...d.progress,[sub]:{...d.progress[sub],[topic]:val}}}));

  /* ── NOTES ── */
  const addNote = () => {
    if (!newNote.title.trim()) return;
    const note = {
      id:Date.now(), ...newNote,
      uploader: data.user?.name||"Anonymous",
      time: new Date().toLocaleString(),
      fileUrl: newNote.file ? URL.createObjectURL(newNote.file) : null,
      fileName: newNote.file?.name||null
    };
    upd(d=>({...d,notes:[note,...d.notes]}));
    setNewNote({title:"",subject:"",content:"",file:null});
  };

  /* ── DISCUSS ── */
  const addPost = () => {
    if (!newPost.trim()) return;
    upd(d=>({...d,discussions:[{id:Date.now(),user:d.user?.name||"Anonymous",av:(d.user?.name||"AN").slice(0,2).toUpperCase(),text:newPost,time:"Just now",subject:postSub,likes:0,replies:0},...d.discussions]}));
    setNewPost("");
  };
  const likePost = id => upd(d=>({...d,discussions:d.discussions.map(p=>p.id===id?{...p,likes:p.likes+1}:p)}));

  /* ── IMAGE HANDLING ── */
  const handleImageFile = (file) => {
    if (!file) return;
    setImgFile(file);
    setImgMime(file.type||"image/jpeg");
    setImgPreview(URL.createObjectURL(file));
    setTestStep(1);
    const reader = new FileReader();
    reader.onload = ev => setImgB64(ev.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  /* ── GENERATE TEST FROM IMAGE ── */
  const generateFromImage = async () => {
    if (!imgB64) { setTestStatus("⚠️ Please capture or upload an image first."); return; }
    setTestLoading(true);
    setTestStatus("📸 Step 1/3 — Reading your question paper...");

    try {
      // STEP 1: Extract raw text from image
      setTestStatus("📝 Step 2/3 — Extracting questions from image...");
      const extracted = await callClaude({
        imageB64, imageMime: imgMime,
        max_tokens: 3000,
        messages:[{ role:"user", content:
          `You are an OCR expert. This image shows a GATE exam question paper.

TASK: Read and transcribe ALL questions visible in this image EXACTLY as they appear.
- Include question numbers, all 4 options (A, B, C, D), and any numerical values/formulas
- If any part is blurry, make your best guess based on context
- List every question you can see, even partially
- For each question, also identify: the correct answer if shown, the subject area

Format each question like:
Q1: [full question text]
A) [option]
B) [option]  
C) [option]
D) [option]
Answer: [A/B/C/D if visible, otherwise write UNKNOWN]
Subject: [Chemical Engineering subject]

Transcribe ALL visible questions now:`
        }]
      });

      setTestStatus("🤖 Step 3/3 — AI formatting questions into test...");

      // STEP 2: Convert extracted text into structured JSON
      const structured = await callClaude({
        max_tokens: 4000,
        system: `You are a GATE Chemical Engineering exam expert. Convert extracted question text into a perfect JSON test format.

STRICT RULES:
1. "correct" field: MUST be exactly one capital letter: "A", "B", "C", or "D"
2. "options": array of exactly 4 strings, each starting with "A) ", "B) ", "C) ", "D) "
3. "marks": integer 1 or 2 only
4. "negative": 0.33 for 1-mark, 0.67 for 2-mark
5. "solution": detailed step-by-step solution showing full working
6. If correct answer is UNKNOWN, use your Chemical Engineering expertise to determine it
7. Output ONLY valid JSON, no explanation, no markdown fences

Output format:
{"questions":[{"id":1,"text":"complete question","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","solution":"Step 1: ...\\nStep 2: ...\\nAnswer: A","marks":2,"negative":0.67,"subject":"CRE"}]}`,
        messages:[{ role:"user", content:
          `Here are the questions extracted from the GATE paper image:\n\n${extracted}\n\nConvert ALL of these into the JSON format. For any answer marked UNKNOWN, determine the correct answer using your GATE expertise. Return JSON only:`
        }]
      });

      const parsed = extractJSON(structured);
      if (!parsed.questions || parsed.questions.length === 0) throw new Error("No questions parsed");

      const questions = parsed.questions.map(validateQuestion);
      const totalMarks = questions.reduce((s,q)=>s+q.marks,0);
      const duration   = questions.length * 120; // 2 min per question

      setTestState({ questions, totalMarks, duration, startTime:Date.now(), timeLeft:duration, active:true });
      setAnswers({});
      setTestResult(null);
      setTestStep(2);
      setTestStatus("");

    } catch(err) {
      console.error("Test generation error:", err);
      setTestStatus(`❌ Could not read image clearly. Loaded ${SAMPLE_QS.length} curated GATE questions instead.`);
      loadSampleTest();
    }
    setTestLoading(false);
  };

  const loadSampleTest = () => {
    const questions = SAMPLE_QS.map(validateQuestion);
    const totalMarks = questions.reduce((s,q)=>s+q.marks,0);
    const duration   = questions.length * 120;
    setTestState({ questions, totalMarks, duration, startTime:Date.now(), timeLeft:duration, active:true });
    setAnswers({}); setTestResult(null); setTestStep(2);
  };

  /* ── TIMER ── */
  useEffect(()=>{
    if (!testState?.active) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{
      setTestState(prev=>{
        if (!prev?.active) { clearInterval(timerRef.current); return prev; }
        if (prev.timeLeft<=1) { clearInterval(timerRef.current); submitTest(prev); return {...prev,timeLeft:0,active:false}; }
        return {...prev, timeLeft:prev.timeLeft-1};
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[testState?.active, testState?.startTime]);

  /* ── SUBMIT TEST ── */
  const submitTest = (ts) => {
    clearInterval(timerRef.current);
    const state = ts || testState;
    if (!state?.questions) return;
    const ans = answersRef.current;
    let score=0, correct=0, wrong=0, skip=0;
    state.questions.forEach(q=>{
      const a = ans[q.id];
      if (!a) skip++;
      else if (a===q.correct) { score+=q.marks; correct++; }
      else { score-=q.negative||0.67; wrong++; }
    });
    const maxScore = state.questions.reduce((s,q)=>s+q.marks,0);
    const result = { score:Math.max(0,score).toFixed(2), correct, wrong, skip, total:state.questions.length, maxScore, pct:Math.round((Math.max(0,score)/maxScore)*100), timeTaken:Math.round((Date.now()-state.startTime)/60000) };
    setTestResult(result);
    setTestState(p=>p?{...p,active:false}:p);
    setTestStep(3);
    upd(d=>({...d,tests:[{id:Date.now(),...result,date:new Date().toLocaleDateString()},...d.tests]}));
  };

  /* ── AI TUTOR CHAT ── */
  const sendChat = async () => {
    if (!chatInput.trim()||chatLoading) return;
    const msg = chatInput; setChatInput("");
    const userMsg = {role:"user",content:msg};
    const history = [...chatMsgs, userMsg];
    setChatMsgs(history);
    setChatLoading(true);
    try {
      const reply = await callClaude({
        max_tokens:1200,
        system:`You are an expert GATE Chemical Engineering tutor helping a student prepare for GATE 2027.

PERSONALITY: Encouraging, patient, exam-focused.
STYLE: 
- For concepts: clear explanation with key formula highlighted
- For numericals: full step-by-step working with units
- For strategy: practical tips from toppers
- Use bullet points and line breaks for clarity
- End numerical solutions with "∴ Answer = [value]"
- Keep under 200 words unless it's a full problem solution
- Current subject context: ${chatContext}

You know everything about: Thermodynamics, Fluid Mechanics, Heat Transfer, Mass Transfer, CRE, Process Control, Plant Design, Engineering Math, Process Calculations, Chemical Technology.`,
        messages: history.slice(-12).map(m=>({role:m.role,content:m.content}))
      });
      setChatMsgs(prev=>[...prev,{role:"assistant",content:reply}]);
    } catch(err) {
      setChatMsgs(prev=>[...prev,{role:"assistant",content:`⚠️ Connection issue. Please try again!\n\nError: ${err.message}`}]);
    }
    setChatLoading(false);
  };

  /* ── DERIVED STATS ── */
  const allTopics   = Object.values(SYLLABUS).reduce((s,{topics})=>s+topics.length,0);
  const doneTopics  = Object.values(data.progress).reduce((s,t)=>s+Object.values(t).filter(v=>v===2).length,0);
  const inPTopics   = Object.values(data.progress).reduce((s,t)=>s+Object.values(t).filter(v=>v===1).length,0);
  const overallPct  = Math.round((doneTopics/allTopics)*100);
  const fmtTime     = s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const TABS = [
    {id:"dashboard",label:"Home",   e:"🏠"},
    {id:"progress", label:"Progress",e:"📊"},
    {id:"notes",    label:"Notes",  e:"📝"},
    {id:"discuss",  label:"Discuss",e:"💬"},
    {id:"test",     label:"Test",   e:"📸"},
    {id:"tutor",    label:"AI Tutor",e:"🤖"}
  ];

  /* ═══════════════ AUTH SCREEN ═══════════════ */
  if (!data.user) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"white",borderRadius:24,padding:"2rem",width:"100%",maxWidth:400,boxShadow:"0 30px 80px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:56}}>⚗️</div>
          <h1 style={{margin:"8px 0 0",fontSize:26,fontWeight:900,background:"linear-gradient(135deg,#4338ca,#0891b2)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>GATE Chem 2027</h1>
          <p style={{margin:"6px 0 0",color:"#64748b",fontSize:13}}>AI-Powered GATE Chemical Engineering Hub</p>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:18,background:"#f1f5f9",borderRadius:12,padding:4}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:authMode===m?"white":"transparent",color:authMode===m?"#4338ca":"#64748b",fontWeight:700,cursor:"pointer",fontSize:14,boxShadow:authMode===m?"0 2px 8px rgba(0,0,0,0.1)":"none"}}>
              {m==="login"?"🔑 Login":"✨ Sign Up"}
            </button>
          ))}
        </div>
        {authMode==="signup"&&<input placeholder="Full Name" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",marginBottom:10,fontSize:15,boxSizing:"border-box"}}/>}
        <input placeholder="Email address" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",marginBottom:10,fontSize:15,boxSizing:"border-box"}}/>
        <input type="password" placeholder="Password" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()} style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",marginBottom:18,fontSize:15,boxSizing:"border-box"}}/>
        <button onClick={login} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#4338ca,#0891b2)",color:"white",fontWeight:800,fontSize:16,cursor:"pointer",letterSpacing:0.5}}>
          {authMode==="login"?"Login →":"Create Account →"}
        </button>
        <p style={{textAlign:"center",color:"#94a3b8",fontSize:12,margin:"14px 0 0"}}>Any email + any password works for demo</p>
      </div>
    </div>
  );

  /* ═══════════════ MAIN APP ═══════════════ */
  return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Segoe UI',system-ui,sans-serif",paddingBottom:66}}>

      {/* ── TOP HEADER ── */}
      <header style={{background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",color:"white",position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 20px rgba(0,0,0,0.3)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 1rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>⚗️</span>
            <div>
              <div style={{fontWeight:900,fontSize:14}}>GATE Chem 2027</div>
              <div style={{fontSize:9,opacity:0.6,letterSpacing:1}}>CHEMICAL ENGINEERING</div>
            </div>
          </div>
          <nav style={{display:"flex",gap:2}} className="desk-nav">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 11px",borderRadius:16,border:"none",background:tab===t.id?"rgba(255,255,255,0.2)":"transparent",color:"white",cursor:"pointer",fontSize:12,fontWeight:tab===t.id?700:400,transition:"all 0.2s"}}>
                {t.e} {t.label}
              </button>
            ))}
          </nav>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#4338ca,#0891b2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11}}>{data.user.av}</div>
            <button onClick={logout} style={{padding:"4px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"transparent",color:"white",cursor:"pointer",fontSize:11}}>Logout</button>
          </div>
        </div>
      </header>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mob-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:"white",borderTop:"1px solid #e2e8f0",display:"flex",zIndex:200,boxShadow:"0 -4px 20px rgba(0,0,0,0.1)"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 2px 5px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
            <span style={{fontSize:16}}>{t.e}</span>
            <span style={{fontSize:9,color:tab===t.id?"#4338ca":"#94a3b8",fontWeight:tab===t.id?700:400}}>{t.label}</span>
            {tab===t.id&&<div style={{width:16,height:2.5,background:"#4338ca",borderRadius:2,marginTop:1}}/>}
          </button>
        ))}
      </nav>

      <main style={{maxWidth:1100,margin:"0 auto",padding:"1rem"}}>

        {/* ══════════ DASHBOARD ══════════ */}
        {tab==="dashboard"&&(
          <div>
            <div style={{background:"linear-gradient(135deg,#4338ca,#0891b2)",borderRadius:18,padding:"1.3rem",marginBottom:18,color:"white"}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:800}}>👋 Welcome back, {data.user.name.split(" ")[0]}!</h2>
              <p style={{margin:"6px 0 0",opacity:0.85,fontSize:14}}>GATE 2027 — {365-Math.floor((new Date("2027-02-07")-new Date())/86400000)} days to go. Keep pushing! 💪</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
              {[
                {l:"Coverage",v:`${overallPct}%`,c:"#4338ca",bg:"linear-gradient(135deg,#ede9fe,#ddd6fe)",e:"🎯"},
                {l:"Completed",v:doneTopics,c:"#059669",bg:"linear-gradient(135deg,#d1fae5,#a7f3d0)",e:"✅"},
                {l:"In Progress",v:inPTopics,c:"#d97706",bg:"linear-gradient(135deg,#fef3c7,#fde68a)",e:"⏳"},
                {l:"Notes",v:data.notes.length,c:"#0891b2",bg:"linear-gradient(135deg,#cffafe,#a5f3fc)",e:"📝"},
                {l:"Tests Taken",v:data.tests.length,c:"#db2777",bg:"linear-gradient(135deg,#fce7f3,#fbcfe8)",e:"📋"}
              ].map(s=>(
                <div key={s.l} style={{background:s.bg,borderRadius:14,padding:"1rem"}}>
                  <div style={{fontSize:24,marginBottom:4}}>{s.e}</div>
                  <div style={{fontSize:26,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:12,color:"#475569",fontWeight:500}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{background:"white",borderRadius:16,padding:"1.2rem",marginBottom:18,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontWeight:700,color:"#1e293b",fontSize:15}}>📈 Syllabus Coverage</span>
                <span style={{fontWeight:900,color:"#4338ca",fontSize:20}}>{overallPct}%</span>
              </div>
              <div style={{background:"#e2e8f0",borderRadius:999,height:14,overflow:"hidden",marginBottom:10}}>
                <div style={{height:"100%",width:`${overallPct}%`,background:"linear-gradient(90deg,#4338ca,#0891b2,#059669)",borderRadius:999,transition:"width 0.8s ease"}}/>
              </div>
              <div style={{display:"flex",gap:14,fontSize:12,flexWrap:"wrap"}}>
                <span style={{color:"#059669",fontWeight:600}}>✅ {doneTopics} completed</span>
                <span style={{color:"#d97706",fontWeight:600}}>⏳ {inPTopics} in progress</span>
                <span style={{color:"#94a3b8"}}>📚 {allTopics-doneTopics-inPTopics} not started</span>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10}}>
              {Object.entries(SYLLABUS).map(([name,{color,icon,topics}])=>{
                const p=data.progress[name]||{};
                const done=Object.values(p).filter(v=>v===2).length;
                const inP=Object.values(p).filter(v=>v===1).length;
                const pct=Math.round(((done+inP*0.5)/topics.length)*100);
                return (
                  <div key={name} onClick={()=>setTab("progress")} style={{background:"white",borderRadius:14,padding:"1rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",borderLeft:`4px solid ${color}`,cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{fontSize:16}}>{icon}</span>
                        <span style={{fontWeight:700,color:"#1e293b",fontSize:13,lineHeight:1.3}}>{name}</span>
                      </div>
                      <span style={{fontWeight:800,color:color,fontSize:14,flexShrink:0,marginLeft:6}}>{pct}%</span>
                    </div>
                    <div style={{background:"#f1f5f9",borderRadius:999,height:7,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:999,transition:"width 0.5s"}}/>
                    </div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:5}}>{done}/{topics.length} topics done</div>
                  </div>
                );
              })}
            </div>

            {data.tests.length>0&&(
              <div style={{background:"white",borderRadius:16,padding:"1.2rem",marginTop:18,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                <h3 style={{margin:"0 0 12px",color:"#1e293b",fontSize:15}}>📊 Recent Test Performance</h3>
                <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
                  {data.tests.slice(0,5).map((t,i)=>(
                    <div key={t.id} style={{background:`linear-gradient(135deg,${t.pct>=60?"#d1fae5":"#fee2e2"},${t.pct>=60?"#a7f3d0":"#fecaca"})`,borderRadius:12,padding:"0.9rem",minWidth:130,flexShrink:0,textAlign:"center"}}>
                      <div style={{fontWeight:900,fontSize:22,color:t.pct>=60?"#059669":"#dc2626"}}>{t.pct}%</div>
                      <div style={{fontSize:13,color:"#475569",fontWeight:600}}>{t.score}/{t.maxScore}</div>
                      <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{t.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ PROGRESS ══════════ */}
        {tab==="progress"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e293b",fontSize:19,fontWeight:800}}>📊 GATE 2027 Syllabus Tracker</h2>
            <div style={{background:"linear-gradient(135deg,#4338ca,#0891b2)",borderRadius:14,padding:"1rem",marginBottom:18,color:"white",display:"flex",gap:16,flexWrap:"wrap"}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:900}}>{overallPct}%</div><div style={{fontSize:11,opacity:0.8}}>Overall</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:900}}>{doneTopics}</div><div style={{fontSize:11,opacity:0.8}}>Done</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:900}}>{inPTopics}</div><div style={{fontSize:11,opacity:0.8}}>In Progress</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:900}}>{allTopics-doneTopics-inPTopics}</div><div style={{fontSize:11,opacity:0.8}}>Pending</div></div>
            </div>
            {Object.entries(SYLLABUS).map(([sub,{topics,color,light,icon}])=>{
              const prog=data.progress[sub]||{};
              const done=Object.values(prog).filter(v=>v===2).length;
              const inP=Object.values(prog).filter(v=>v===1).length;
              const pct=Math.round(((done+inP*0.5)/topics.length)*100);
              return (
                <div key={sub} style={{background:"white",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",marginBottom:14}}>
                  <div style={{background:color,padding:"0.8rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:20}}>{icon}</span>
                      <div>
                        <div style={{color:"white",fontWeight:800,fontSize:14}}>{sub}</div>
                        <div style={{color:"rgba(255,255,255,0.75)",fontSize:11}}>{topics.length} topics · {done} done · {inP} in progress</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{color:"white",fontWeight:900,fontSize:20}}>{pct}%</div>
                      <div style={{background:"rgba(255,255,255,0.3)",borderRadius:999,height:5,width:60,overflow:"hidden",marginTop:3}}>
                        <div style={{height:"100%",width:`${pct}%`,background:"white",borderRadius:999}}/>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:"0.8rem",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:7}}>
                    {topics.map(topic=>{
                      const val=prog[topic]||0;
                      const S=[{bg:"#f8fafc",e:"○",label:"Not Started"},{bg:"#fef9c3",e:"◑",label:"In Progress"},{bg:"#dcfce7",e:"●",label:"Completed"}];
                      return (
                        <div key={topic} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:S[val].bg,borderRadius:10,border:`1px solid ${val===2?color+"30":val===1?"#fde68a":"#e2e8f0"}`}}>
                          <span style={{fontSize:12,color:"#334155",fontWeight:500,flex:1,marginRight:6,lineHeight:1.3}}>{topic}</span>
                          <div style={{display:"flex",gap:3,flexShrink:0}}>
                            {S.map((s,i)=>(
                              <button key={i} onClick={()=>setProg(sub,topic,i)} title={s.label} style={{width:24,height:24,borderRadius:6,border:val===i?`2px solid ${color}`:"1px solid #e2e8f0",background:val===i?light:"white",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                                {s.e}
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
        )}

        {/* ══════════ NOTES ══════════ */}
        {tab==="notes"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e293b",fontSize:19,fontWeight:800}}>📝 Notes Repository</h2>
            <div style={{background:"white",borderRadius:16,padding:"1.2rem",marginBottom:18,boxShadow:"0 2px 10px rgba(0,0,0,0.06)",border:"2px dashed #a5b4fc"}}>
              <h3 style={{margin:"0 0 12px",color:"#4338ca",fontSize:15,fontWeight:800}}>📤 Upload Your Notes</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9,marginBottom:9}}>
                <input placeholder="Title *" value={newNote.title} onChange={e=>setNewNote(n=>({...n,title:e.target.value}))} style={{padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,boxSizing:"border-box"}}/>
                <select value={newNote.subject} onChange={e=>setNewNote(n=>({...n,subject:e.target.value}))} style={{padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14}}>
                  <option value="">Select Subject</option>
                  {Object.keys(SYLLABUS).map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <textarea placeholder="Key points, formulas, or description..." value={newNote.content} onChange={e=>setNewNote(n=>({...n,content:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,resize:"vertical",minHeight:65,boxSizing:"border-box",marginBottom:9}}/>
              <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center"}}>
                <label style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:10,border:"1.5px dashed #7c3aed",color:"#7c3aed",cursor:"pointer",fontSize:13,fontWeight:600}}>
                  📎 {newNote.file ? newNote.file.name.slice(0,22)+(newNote.file.name.length>22?"...":"") : "Attach Any File"}
                  <input type="file" accept="*/*" style={{display:"none"}} onChange={e=>setNewNote(n=>({...n,file:e.target.files[0]}))}/>
                </label>
                <button onClick={addNote} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4338ca,#0891b2)",color:"white",fontWeight:700,cursor:"pointer",fontSize:14}}>Upload ✓</button>
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {["All",...Object.keys(SYLLABUS)].map(f=>(
                <button key={f} onClick={()=>setNoteFilter(f)} style={{padding:"5px 11px",borderRadius:14,border:noteFilter===f?"none":"1px solid #e2e8f0",background:noteFilter===f?"#4338ca":"white",color:noteFilter===f?"white":"#64748b",cursor:"pointer",fontSize:12,fontWeight:noteFilter===f?700:400}}>
                  {f==="All"?"All Notes":f.split(" ")[0]}
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
              {data.notes.filter(n=>noteFilter==="All"||n.subject===noteFilter).map(note=>{
                const sub=SYLLABUS[note.subject];
                return (
                  <div key={note.id} style={{background:"white",borderRadius:14,padding:"1rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",borderTop:`4px solid ${sub?.color||"#4338ca"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <h4 style={{margin:0,color:"#1e293b",fontSize:14,fontWeight:700,lineHeight:1.3}}>{note.title}</h4>
                      {note.subject&&<span style={{fontSize:10,background:sub?.light||"#ede9fe",color:sub?.color||"#4338ca",padding:"2px 7px",borderRadius:6,fontWeight:700,marginLeft:6,flexShrink:0}}>{note.subject.split(" ").slice(0,2).join(" ")}</span>}
                    </div>
                    {note.content&&<p style={{fontSize:13,color:"#64748b",margin:"0 0 9px",lineHeight:1.5}}>{note.content}</p>}
                    <div style={{fontSize:11,color:"#94a3b8",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                      <span>👤 {note.uploader}</span><span>{note.time}</span>
                    </div>
                    {note.fileName&&<a href={note.fileUrl} download={note.fileName} style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:9,padding:"5px 10px",borderRadius:8,background:"#f1f5f9",color:"#4338ca",fontSize:12,textDecoration:"none",fontWeight:600,border:"1px solid #c7d2fe"}}>📎 {note.fileName}</a>}
                  </div>
                );
              })}
              {data.notes.filter(n=>noteFilter==="All"||n.subject===noteFilter).length===0&&(
                <div style={{gridColumn:"1/-1",textAlign:"center",padding:"3rem",color:"#94a3b8"}}>
                  <div style={{fontSize:48,marginBottom:10}}>📭</div>
                  <div style={{fontSize:15,fontWeight:600}}>No notes yet</div>
                  <div style={{fontSize:13,marginTop:5}}>Upload your first note above!</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ DISCUSS ══════════ */}
        {tab==="discuss"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e293b",fontSize:19,fontWeight:800}}>💬 Study Community</h2>
            <div style={{background:"white",borderRadius:16,padding:"1.2rem",marginBottom:18,boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#4338ca,#0891b2)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>{data.user.av}</div>
                <div style={{flex:1}}>
                  <textarea placeholder="Share a doubt, tip, resource, or solution..." value={newPost} onChange={e=>setNewPost(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:14,resize:"none",minHeight:75,boxSizing:"border-box"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:9,flexWrap:"wrap",gap:8}}>
                    <select value={postSub} onChange={e=>setPostSub(e.target.value)} style={{padding:"7px 10px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:13}}>
                      <option>General</option>
                      {Object.keys(SYLLABUS).map(s=><option key={s}>{s}</option>)}
                    </select>
                    <button onClick={addPost} style={{padding:"8px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4338ca,#0891b2)",color:"white",fontWeight:700,cursor:"pointer",fontSize:14}}>Post 📤</button>
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {data.discussions.map(post=>{
                const sub=SYLLABUS[post.subject];
                return (
                  <div key={post.id} style={{background:"white",borderRadius:14,padding:"1.1rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",transition:"box-shadow 0.2s"}}>
                    <div style={{display:"flex",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${sub?.color||"#4338ca"},#0891b2)`,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>{post.av}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:6,flexWrap:"wrap"}}>
                          <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
                            <span style={{fontWeight:700,color:"#1e293b",fontSize:14}}>{post.user}</span>
                            {post.subject&&<span style={{fontSize:10,background:sub?.light||"#ede9fe",color:sub?.color||"#4338ca",padding:"2px 7px",borderRadius:6,fontWeight:700}}>{post.subject}</span>}
                          </div>
                          <span style={{fontSize:11,color:"#94a3b8",flexShrink:0}}>{post.time}</span>
                        </div>
                        <p style={{margin:"0 0 10px",color:"#334155",lineHeight:1.65,fontSize:14,wordBreak:"break-word"}}>{post.text}</p>
                        <div style={{display:"flex",gap:14}}>
                          <button onClick={()=>likePost(post.id)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:13,padding:0,fontWeight:600}}>❤️ {post.likes}</button>
                          <span style={{color:"#94a3b8",fontSize:13}}>💬 {post.replies} replies</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ TEST ══════════ */}
        {tab==="test"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e293b",fontSize:19,fontWeight:800}}>📸 AI-Powered Mock Test</h2>

            {/* STEP 0: Upload screen */}
            {testStep===0&&(
              <div>
                <div style={{background:"white",borderRadius:18,padding:"2rem",marginBottom:18,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",textAlign:"center"}}>
                  <div style={{fontSize:64,marginBottom:14}}>📷</div>
                  <h3 style={{margin:"0 0 10px",color:"#1e293b",fontSize:20,fontWeight:800}}>Snap Your Question Paper</h3>
                  <p style={{color:"#64748b",margin:"0 0 24px",fontSize:14,lineHeight:1.7,maxWidth:440,marginLeft:"auto",marginRight:"auto"}}>
                    Take a clear photo of any GATE previous year question paper.<br/>
                    Our AI reads every question and creates a <strong>timed test</strong> with auto-evaluation and detailed solutions!
                  </p>

                  <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
                    {/* CAMERA */}
                    <label style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:8,padding:"18px 28px",borderRadius:16,background:"linear-gradient(135deg,#4338ca,#7c3aed)",color:"white",cursor:"pointer",boxShadow:"0 6px 20px rgba(67,56,202,0.4)",transition:"transform 0.2s"}}>
                      <span style={{fontSize:32}}>📷</span>
                      <span style={{fontSize:15,fontWeight:800}}>Open Camera</span>
                      <span style={{fontSize:11,opacity:0.8}}>Take photo directly</span>
                      <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleImageFile(e.target.files[0]);}}/>
                    </label>
                    {/* GALLERY */}
                    <label style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:8,padding:"18px 28px",borderRadius:16,border:"2.5px solid #4338ca",color:"#4338ca",cursor:"pointer",background:"white",transition:"transform 0.2s"}}>
                      <span style={{fontSize:32}}>🖼️</span>
                      <span style={{fontSize:15,fontWeight:800}}>From Gallery</span>
                      <span style={{fontSize:11,color:"#64748b"}}>Pick existing photo</span>
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleImageFile(e.target.files[0]);}}/>
                    </label>
                  </div>

                  <div style={{borderTop:"1px solid #f1f5f9",paddingTop:20}}>
                    <p style={{color:"#94a3b8",fontSize:13,marginBottom:12}}>Don't have a paper? Try our curated GATE questions:</p>
                    <button onClick={loadSampleTest} style={{padding:"11px 24px",borderRadius:12,border:"2px solid #059669",background:"white",color:"#059669",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                      🎲 Start Sample Test ({SAMPLE_QS.length} Questions)
                    </button>
                  </div>
                </div>

                {data.tests.length>0&&(
                  <div style={{background:"white",borderRadius:16,padding:"1.2rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
                    <h3 style={{margin:"0 0 12px",color:"#1e293b",fontSize:15,fontWeight:800}}>📋 Test History</h3>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:9}}>
                      {data.tests.slice(0,6).map(t=>(
                        <div key={t.id} style={{background:t.pct>=60?"linear-gradient(135deg,#d1fae5,#a7f3d0)":"linear-gradient(135deg,#fee2e2,#fecaca)",borderRadius:12,padding:"0.9rem",textAlign:"center"}}>
                          <div style={{fontWeight:900,fontSize:22,color:t.pct>=60?"#059669":"#dc2626"}}>{t.pct}%</div>
                          <div style={{fontSize:12,color:"#475569",fontWeight:600}}>{t.score}/{t.maxScore} marks</div>
                          <div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>{t.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: Preview image */}
            {testStep===1&&(
              <div style={{background:"white",borderRadius:18,padding:"1.5rem",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
                <h3 style={{margin:"0 0 14px",color:"#1e293b",fontSize:17,fontWeight:800}}>📄 Paper Preview</h3>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <img src={imgPreview} alt="Question paper" style={{maxWidth:"100%",maxHeight:320,objectFit:"contain",borderRadius:12,border:"2px solid #e2e8f0",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}/>
                </div>
                {testStatus&&(
                  <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"1rem",marginBottom:16,textAlign:"center"}}>
                    <div style={{fontSize:14,color:"#1d4ed8",fontWeight:600}}>{testStatus}</div>
                    {testLoading&&(
                      <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:10}}>
                        {[0,1,2,3,4].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#4338ca",animation:"bounce 1.4s infinite",animationDelay:`${i*0.15}s`}}/>)}
                      </div>
                    )}
                  </div>
                )}
                <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
                  <button onClick={generateFromImage} disabled={testLoading} style={{padding:"13px 28px",borderRadius:14,border:"none",background:testLoading?"#94a3b8":"linear-gradient(135deg,#4338ca,#0891b2)",color:"white",fontWeight:800,fontSize:15,cursor:testLoading?"not-allowed":"pointer",boxShadow:"0 4px 14px rgba(67,56,202,0.3)"}}>
                    {testLoading?"🤖 AI Reading Paper...":"🚀 Generate Test from This Paper"}
                  </button>
                  <button onClick={()=>{setTestStep(0);setImgPreview(null);setImgB64(null);setTestStatus("");}} disabled={testLoading} style={{padding:"13px 20px",borderRadius:14,border:"2px solid #e2e8f0",background:"white",color:"#64748b",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                    ← Retake
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Active test */}
            {testStep===2&&testState&&(
              <div>
                {/* Sticky timer bar */}
                <div style={{background:testState.timeLeft<180?"#fee2e2":testState.timeLeft<600?"#fef3c7":"linear-gradient(135deg,#ede9fe,#ddd6fe)",borderRadius:14,padding:"0.9rem 1.2rem",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,position:"sticky",top:54,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}>
                  <div>
                    <span style={{color:"#64748b",fontSize:13,fontWeight:600}}>⏱ Time Left: </span>
                    <span style={{color:testState.timeLeft<180?"#dc2626":testState.timeLeft<600?"#d97706":"#4338ca",fontFamily:"'Courier New',monospace",fontSize:24,fontWeight:900}}>{fmtTime(testState.timeLeft)}</span>
                  </div>
                  <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:13,color:"#64748b",fontWeight:600}}>
                      {Object.keys(answers).length}/{testState.questions.length} answered
                    </span>
                    <span style={{fontSize:13,color:"#059669",fontWeight:600}}>Max: {testState.totalMarks}m</span>
                    {testState.active&&<button onClick={()=>submitTest()} style={{padding:"8px 18px",borderRadius:10,border:"none",background:"#dc2626",color:"white",fontWeight:800,cursor:"pointer",fontSize:14}}>Submit Test</button>}
                  </div>
                </div>

                {/* Questions */}
                {testState.questions.map((q,idx)=>{
                  const ans=answers[q.id];
                  return (
                    <div key={q.id} style={{background:"white",borderRadius:16,padding:"1.2rem",marginBottom:14,boxShadow:"0 2px 10px rgba(0,0,0,0.06)",border:ans?"2px solid #c7d2fe":"1px solid #e2e8f0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
                        <div style={{display:"flex",gap:7,alignItems:"center"}}>
                          <span style={{background:"linear-gradient(135deg,#4338ca,#0891b2)",color:"white",fontWeight:800,padding:"3px 10px",borderRadius:8,fontSize:13}}>Q{idx+1}</span>
                          <span style={{background:"#f1f5f9",color:"#64748b",padding:"3px 9px",borderRadius:7,fontSize:12,fontWeight:600}}>{q.subject}</span>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <span style={{fontSize:12,background:"#d1fae5",color:"#059669",padding:"2px 8px",borderRadius:6,fontWeight:600}}>+{q.marks}m</span>
                          <span style={{fontSize:12,background:"#fee2e2",color:"#dc2626",padding:"2px 8px",borderRadius:6,fontWeight:600}}>−{q.negative}m</span>
                        </div>
                      </div>
                      <p style={{margin:"0 0 14px",color:"#1e293b",fontWeight:500,lineHeight:1.7,fontSize:14}}>{q.text}</p>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>
                        {q.options.map((opt,oi)=>{
                          const letter=["A","B","C","D"][oi];
                          const sel=ans===letter;
                          return (
                            <button key={oi} onClick={()=>{ if(testState.active) setAnswers(a=>({...a,[q.id]:letter})); }}
                              style={{padding:"10px 13px",borderRadius:11,border:sel?"2.5px solid #4338ca":"1.5px solid #e2e8f0",background:sel?"linear-gradient(135deg,#ede9fe,#ddd6fe)":"#fafafa",color:sel?"#1e1b4b":"#334155",textAlign:"left",cursor:testState.active?"pointer":"default",fontSize:13,fontWeight:sel?700:400,lineHeight:1.45,transition:"all 0.15s"}}>
                              <span style={{fontWeight:800,color:sel?"#4338ca":"#94a3b8",marginRight:6}}>{letter})</span>{opt.replace(/^[A-D]\)\s*/,"")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STEP 3: Results */}
            {testStep===3&&testResult&&testState&&(
              <div>
                {/* Result card */}
                <div style={{background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",borderRadius:20,padding:"2rem",marginBottom:20,color:"white",textAlign:"center",boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
                  <div style={{fontSize:56,marginBottom:12}}>
                    {testResult.pct>=75?"🏆":testResult.pct>=50?"🎯":"💪"}
                  </div>
                  <h2 style={{margin:"0 0 6px",fontSize:24,fontWeight:900}}>
                    {testResult.pct>=75?"Excellent!":testResult.pct>=50?"Good Job!":"Keep Practicing!"}
                  </h2>
                  <div style={{fontSize:42,fontWeight:900,color:testResult.pct>=60?"#34d399":"#f87171",marginBottom:8}}>
                    {testResult.pct}%
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10,marginBottom:20}}>
                    {[
                      {l:"Score",v:`${testResult.score}/${testResult.maxScore}`},
                      {l:"Correct",v:`✅ ${testResult.correct}`},
                      {l:"Wrong",v:`❌ ${testResult.wrong}`},
                      {l:"Skipped",v:`○ ${testResult.skip}`},
                      {l:"Time",v:`${testResult.timeTaken}m`}
                    ].map(s=>(
                      <div key={s.l} style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"10px 6px",backdropFilter:"blur(10px)"}}>
                        <div style={{fontSize:18,fontWeight:900}}>{s.v}</div>
                        <div style={{fontSize:11,opacity:0.7,marginTop:2}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>{setTestStep(0);setTestState(null);setTestResult(null);setImgPreview(null);setImgB64(null);setAnswers({});}} style={{padding:"11px 26px",borderRadius:12,border:"2px solid rgba(255,255,255,0.5)",background:"rgba(255,255,255,0.15)",color:"white",fontWeight:800,cursor:"pointer",fontSize:15,backdropFilter:"blur(10px)"}}>
                    📸 New Test
                  </button>
                </div>

                {/* Solutions */}
                <h3 style={{margin:"0 0 14px",color:"#1e293b",fontSize:17,fontWeight:800}}>📖 Solutions & Explanations</h3>
                {testState.questions.map((q,idx)=>{
                  const ans=answers[q.id];
                  const isCorr=ans===q.correct;
                  const attempted=!!ans;
                  return (
                    <div key={q.id} style={{background:"white",borderRadius:16,padding:"1.2rem",marginBottom:14,boxShadow:"0 2px 10px rgba(0,0,0,0.06)",borderLeft:`5px solid ${!attempted?"#94a3b8":isCorr?"#059669":"#dc2626"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
                        <div style={{display:"flex",gap:7}}>
                          <span style={{background:!attempted?"#f1f5f9":isCorr?"#d1fae5":"#fee2e2",color:!attempted?"#64748b":isCorr?"#059669":"#dc2626",fontWeight:800,padding:"3px 10px",borderRadius:8,fontSize:13}}>
                            Q{idx+1} {!attempted?"○":isCorr?"✅":"❌"}
                          </span>
                          <span style={{background:"#f1f5f9",color:"#64748b",padding:"3px 9px",borderRadius:7,fontSize:12}}>{q.subject}</span>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <span style={{fontSize:12,color:"#64748b"}}>Your: <strong style={{color:!attempted?"#94a3b8":isCorr?"#059669":"#dc2626"}}>{ans||"—"}</strong></span>
                          <span style={{fontSize:12,color:"#059669"}}>Correct: <strong>{q.correct}</strong></span>
                        </div>
                      </div>
                      <p style={{margin:"0 0 12px",color:"#1e293b",fontWeight:500,lineHeight:1.7,fontSize:14}}>{q.text}</p>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:7,marginBottom:12}}>
                        {q.options.map((opt,oi)=>{
                          const letter=["A","B","C","D"][oi];
                          const isC=q.correct===letter;
                          const isSel=ans===letter;
                          let bg="#f8fafc",border="1px solid #e2e8f0",col="#334155";
                          if(isC){bg="#d1fae5";border="2px solid #059669";col="#065f46";}
                          else if(isSel&&!isC){bg="#fee2e2";border="2px solid #dc2626";col="#7f1d1d";}
                          return (
                            <div key={oi} style={{padding:"9px 12px",borderRadius:10,border,background:bg,color:col,fontSize:13,fontWeight:isC||isSel?700:400,lineHeight:1.4}}>
                              <span style={{fontWeight:800,marginRight:5}}>{letter})</span>{opt.replace(/^[A-D]\)\s*/,"")}
                              {isC&&<span style={{marginLeft:6,fontSize:11}}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",borderRadius:12,padding:"11px 14px",border:"1px solid #bbf7d0"}}>
                        <div style={{fontWeight:800,color:"#059669",fontSize:13,marginBottom:6}}>💡 Solution:</div>
                        <div style={{color:"#064e3b",fontSize:13,lineHeight:1.75,whiteSpace:"pre-wrap"}}>{q.solution}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ AI TUTOR ══════════ */}
        {tab==="tutor"&&(
          <div>
            <h2 style={{margin:"0 0 1rem",color:"#1e293b",fontSize:19,fontWeight:800}}>🤖 AI Tutor — GATE Expert</h2>

            {/* Subject context selector */}
            <div style={{background:"white",borderRadius:14,padding:"1rem",marginBottom:14,boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:13,color:"#64748b",fontWeight:600,marginBottom:8}}>📚 Focus Subject (gives more targeted answers):</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["General",...Object.keys(SYLLABUS)].map(s=>(
                  <button key={s} onClick={()=>setChatContext(s)} style={{padding:"5px 11px",borderRadius:12,border:chatContext===s?"none":"1px solid #e2e8f0",background:chatContext===s?"linear-gradient(135deg,#4338ca,#0891b2)":"white",color:chatContext===s?"white":"#64748b",cursor:"pointer",fontSize:12,fontWeight:chatContext===s?700:400}}>
                    {chatContext===s&&SYLLABUS[s]?SYLLABUS[s].icon+" ":""}{s==="General"?"🎯 General":s.split(" ").slice(0,2).join(" ")}
                  </button>
                ))}
              </div>
            </div>

            <div style={{background:"white",borderRadius:18,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",overflow:"hidden"}}>
              {/* Chat header */}
              <div style={{background:"linear-gradient(135deg,#0f0c29,#302b63)",padding:"1rem 1.2rem",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#4338ca,#0891b2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>🤖</div>
                <div>
                  <div style={{color:"white",fontWeight:800,fontSize:15}}>GATE Chem AI Tutor</div>
                  <div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>Powered by Claude · Expert in all GATE subjects · {chatContext} focus</div>
                </div>
                <div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d399"}}/>
              </div>

              {/* Messages */}
              <div style={{height:420,overflowY:"auto",padding:"1rem",display:"flex",flexDirection:"column",gap:12,background:"#f8fafc"}}>
                {chatMsgs.map((m,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:8}}>
                    {m.role==="assistant"&&<div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#4338ca,#0891b2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🤖</div>}
                    <div style={{maxWidth:"78%",padding:"11px 15px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?"linear-gradient(135deg,#4338ca,#0891b2)":"white",color:m.role==="user"?"white":"#1e293b",fontSize:14,lineHeight:1.7,boxShadow:"0 2px 8px rgba(0,0,0,0.08)",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                      {m.content}
                    </div>
                    {m.role==="user"&&<div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#059669,#0891b2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:10,flexShrink:0,color:"white"}}>{data.user.av}</div>}
                  </div>
                ))}
                {chatLoading&&(
                  <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#4338ca,#0891b2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤖</div>
                    <div style={{padding:"12px 16px",borderRadius:"18px 18px 18px 4px",background:"white",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
                      <div style={{display:"flex",gap:5,alignItems:"center"}}>
                        {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#4338ca",animation:"bounce 1.2s infinite",animationDelay:`${i*0.2}s`}}/>)}
                        <span style={{color:"#94a3b8",fontSize:12,marginLeft:4}}>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>

              {/* Quick prompts */}
              <div style={{padding:"10px 12px",background:"white",borderTop:"1px solid #f1f5f9",overflowX:"auto"}}>
                <div style={{display:"flex",gap:7,width:"max-content"}}>
                  {[
                    "Explain CSTR vs PFR with formulas",
                    "Solve: k=0.5/min, X=0.8 in CSTR, find τ",
                    "Key formulas for Heat Transfer GATE",
                    "McCabe-Thiele method explained",
                    "Raoult's vs Henry's Law differences",
                    "PID controller tuning tips",
                    "How to score 50+ in GATE 2027?",
                    "Bernoulli equation applications"
                  ].map(p=>(
                    <button key={p} onClick={()=>{ setChatInput(p); }} style={{padding:"6px 12px",borderRadius:16,border:"1px solid #c7d2fe",background:"linear-gradient(135deg,#ede9fe,#ddd6fe)",color:"#4338ca",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div style={{padding:"1rem",background:"white",borderTop:"1px solid #f1f5f9",display:"flex",gap:9,alignItems:"flex-end"}}>
                <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
                  placeholder={`Ask anything about ${chatContext==="General"?"GATE Chemical Engineering":chatContext}... (Enter to send, Shift+Enter for new line)`}
                  style={{flex:1,padding:"11px 14px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:14,resize:"none",minHeight:44,maxHeight:120,lineHeight:1.5,fontFamily:"inherit",boxSizing:"border-box"}}
                  rows={1}
                />
                <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()} style={{padding:"11px 18px",borderRadius:12,border:"none",background:chatLoading||!chatInput.trim()?"#e2e8f0":"linear-gradient(135deg,#4338ca,#0891b2)",color:chatLoading||!chatInput.trim()?"#94a3b8":"white",fontWeight:800,cursor:chatLoading||!chatInput.trim()?"not-allowed":"pointer",fontSize:15,flexShrink:0,boxShadow:chatLoading||!chatInput.trim()?"none":"0 4px 12px rgba(67,56,202,0.3)"}}>
                  ↑
                </button>
              </div>
            </div>

            {/* Clear chat */}
            <div style={{textAlign:"center",marginTop:10}}>
              <button onClick={()=>setChatMsgs([{role:"assistant",content:"Chat cleared! I'm ready for your next question. 😊"}])} style={{padding:"7px 16px",borderRadius:10,border:"1px solid #e2e8f0",background:"white",color:"#94a3b8",cursor:"pointer",fontSize:13}}>🗑️ Clear Chat</button>
            </div>
          </div>
        )}

      </main>

      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        input,textarea,select,button{outline:none;font-family:inherit;}
        @keyframes bounce{0%,80%,100%{transform:scale(0.5);opacity:0.3}40%{transform:scale(1);opacity:1}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#c7d2fe;border-radius:4px}
        @media(max-width:680px){.desk-nav{display:none!important}}
        @media(min-width:681px){.mob-nav{display:none!important}}
      `}</style>
    </div>
  );
}
