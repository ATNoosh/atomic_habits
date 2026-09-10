import { useMemo, useState } from "react";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Download,
  Flame, Home, Plus, Settings, BarChart3, Archive, RotateCcw,
  Upload, X, Target, Sparkles
} from "lucide-react";

type Frequency = "daily" | "weekly";
type Status = "completed" | "skipped";

type Habit = {
  id: string;
  name: string;
  identity: string;
  cue: string;
  tinyBehavior: string;
  environment: string;
  frequency: Frequency;
  targetDays: number[];
  createdAt: string;
  archivedAt?: string;
};

type Completion = {
  id: string;
  habitId: string;
  date: string;
  status: Status;
  completedAt?: string;
};

type AppData = {
  version: 1;
  exportedAt: string;
  habits: Habit[];
  completions: Completion[];
  settings: { backupReminderDays: number };
  lastBackupAt: string | null;
};

const KEY = "atomic-habits-data-v1";

const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const initial: AppData = {
  version: 1, exportedAt: new Date().toISOString(), lastBackupAt: null,
  settings: { backupReminderDays: 7 },
  habits: [
    {
      id: "demo-study", name: "Study AI", identity: "I am someone who learns every day.",
      cue: "After breakfast", tinyBehavior: "Read for 5 minutes",
      environment: "Keep the book on my desk", frequency: "daily", targetDays: [0,1,2,3,4,5,6],
      createdAt: daysAgo(14)
    },
    {
      id: "demo-english", name: "English speaking", identity: "I am someone who practices English.",
      cue: "After dinner", tinyBehavior: "Speak for 5 minutes",
      environment: "Open the speaking notes before dinner", frequency: "daily", targetDays: [0,1,2,3,4,5,6],
      createdAt: daysAgo(10)
    }
  ],
  completions: []
};

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw);
    return { ...initial, ...parsed };
  } catch { return initial; }
}
function save(data: AppData) { localStorage.setItem(KEY, JSON.stringify(data)); }

function dateAdd(date: string, n: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function completionFor(data: AppData, habitId: string, date: string) {
  return data.completions.find(c => c.habitId === habitId && c.date === date);
}
function isScheduled(h: Habit, date: string) {
  if (h.frequency === "daily") return true;
  const day = new Date(date + "T12:00:00").getDay();
  return h.targetDays.includes(day);
}
function currentStreak(data: AppData, h: Habit) {
  let d = todayISO(), count = 0;
  if (!completionFor(data, h.id, d)) d = dateAdd(d, -1);
  for (let i=0; i<370; i++) {
    if (!isScheduled(h, d)) { d = dateAdd(d, -1); continue; }
    const c = completionFor(data, h.id, d);
    if (c?.status === "completed") { count++; d = dateAdd(d, -1); }
    else break;
  }
  return count;
}
function bestStreak(data: AppData, h: Habit) {
  let best=0, run=0;
  for (let i=369; i>=0; i--) {
    const d = dateAdd(todayISO(), -i);
    if (!isScheduled(h,d)) continue;
    const c = completionFor(data,h.id,d);
    if (c?.status === "completed") { run++; best=Math.max(best,run); }
    else run=0;
  }
  return best;
}
function rate(data: AppData, h: Habit, days=30) {
  let scheduled=0, done=0;
  for(let i=0;i<days;i++){
    const d=dateAdd(todayISO(),-i);
    if(isScheduled(h,d)){ scheduled++; if(completionFor(data,h.id,d)?.status==="completed") done++; }
  }
  return scheduled ? Math.round(done/scheduled*100) : 0;
}

function App() {
  const [data, setData] = useState<AppData>(load);
  const [tab, setTab] = useState<"today"|"calendar"|"stats"|"settings">("today");
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Habit|null>(null);
  const [month, setMonth] = useState(new Date());
  const [toast, setToast] = useState("");

  const update = (next: AppData) => { setData(next); save(next); };
  const active = data.habits.filter(h=>!h.archivedAt);
  const showToast = (s:string) => { setToast(s); setTimeout(()=>setToast(""),2200); };

  const toggle = (h:Habit, status:Status="completed") => {
    const date=todayISO(), existing=completionFor(data,h.id,date);
    let completions=data.completions.filter(c=>!(c.habitId===h.id && c.date===date));
    if (!existing || existing.status!==status) completions.push({id:uid(),habitId:h.id,date,status,completedAt:new Date().toISOString()});
    update({...data,completions}); showToast(status==="completed" ? "Habit completed ✓" : "Marked as skipped");
  };

  const exportJSON = () => {
    const out:AppData={...data,exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`atomic-habits-backup-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(a.href);
    update({...data,lastBackupAt:new Date().toISOString(),exportedAt:out.exportedAt});
    showToast("Backup exported");
  };

  const importJSON = (file:File) => {
    const r=new FileReader();
    r.onload=()=>{ try {
      const p=JSON.parse(String(r.result));
      if(!p || p.version!==1 || !Array.isArray(p.habits) || !Array.isArray(p.completions)) throw new Error();
      update(p); showToast("Backup imported");
    } catch { showToast("Invalid backup file"); }};
    r.readAsText(file);
  };

  const addHabit = (h:Habit) => {
    const habits=edit ? data.habits.map(x=>x.id===h.id?h:x) : [...data.habits,h];
    update({...data,habits}); setShowForm(false); setEdit(null); showToast(edit?"Habit updated":"Habit created");
  };

  return <div className="app">
    <header className="topbar">
      <div className="brand"><Sparkles size={20}/><span>Atomic Habits</span></div>
      <button className="icon-btn" onClick={()=>setTab("settings")}><Settings size={20}/></button>
    </header>

    <main>
      {tab==="today" && <Today data={data} active={active} toggle={toggle} onAdd={()=>setShowForm(true)} onEdit={(h)=>{setEdit(h);setShowForm(true)}} />}
      {tab==="calendar" && <Calendar data={data} month={month} setMonth={setMonth} />}
      {tab==="stats" && <Stats data={data} active={active}/>}
      {tab==="settings" && <SettingsPage data={data} update={update} exportJSON={exportJSON} importJSON={importJSON} onArchive={(h)=>update({...data,habits:data.habits.map(x=>x.id===h.id?{...x,archivedAt:new Date().toISOString()}:x)})} />}
    </main>

    <nav className="nav">
      <Nav active={tab==="today"} icon={<Home/>} label="Today" onClick={()=>setTab("today")}/>
      <Nav active={tab==="calendar"} icon={<CalendarDays/>} label="Calendar" onClick={()=>setTab("calendar")}/>
      <Nav active={tab==="stats"} icon={<BarChart3/>} label="Stats" onClick={()=>setTab("stats")}/>
      <Nav active={tab==="settings"} icon={<Settings/>} label="Settings" onClick={()=>setTab("settings")}/>
    </nav>

    {showForm && <HabitForm initial={edit} onClose={()=>{setShowForm(false);setEdit(null)}} onSave={addHabit}/>}
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function Nav({active,icon,label,onClick}:{active:boolean;icon:React.ReactNode;label:string;onClick:()=>void}) {
  return <button className={active?"nav-item active":"nav-item"} onClick={onClick}>{icon}<span>{label}</span></button>
}

function Today({data,active,toggle,onAdd,onEdit}:{data:AppData;active:Habit[];toggle:(h:Habit,s?:Status)=>void;onAdd:()=>void;onEdit:(h:Habit)=>void}) {
  const date=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  const done=active.filter(h=>completionFor(data,h.id,todayISO())?.status==="completed").length;
  return <section className="page">
    <div className="hero">
      <div><p className="eyebrow">TODAY</p><h1>{date}</h1><p className="muted">{done} of {active.length} habits completed</p></div>
      <button className="primary" onClick={onAdd}><Plus size={18}/> New habit</button>
    </div>
    {active.length===0 && <Empty onAdd={onAdd}/>}
    <div className="habit-list">
      {active.map(h=><HabitCard key={h.id} data={data} h={h} onToggle={()=>toggle(h)} onSkip={()=>toggle(h,"skipped")} onEdit={()=>onEdit(h)}/>)}
    </div>
  </section>
}

function HabitCard({data,h,onToggle,onSkip,onEdit}:{data:AppData;h:Habit;onToggle:()=>void;onSkip:()=>void;onEdit:()=>void}) {
  const c=completionFor(data,h.id,todayISO()), done=c?.status==="completed";
  return <article className={done?"habit done":"habit"}>
    <button className="check" onClick={onToggle} aria-label="complete">{done?<Check/>:<span/>}</button>
    <div className="habit-body">
      <div className="habit-title-row"><h3>{h.name}</h3><button className="text-btn" onClick={onEdit}>Edit</button></div>
      <p className="identity">“{h.identity}”</p>
      <div className="tiny"><Target size={15}/><span>{h.tinyBehavior}</span></div>
      <div className="cue">↳ {h.cue}</div>
      <div className="habit-meta"><span><Flame size={14}/> {currentStreak(data,h)} day streak</span><span>{rate(data,h)}% / 30d</span></div>
      {!done && <button className="skip" onClick={onSkip}>Skip today</button>}
      {c?.status==="skipped" && <span className="skipped">Skipped today</span>}
    </div>
  </article>
}
function Empty({onAdd}:{onAdd:()=>void}) {
  return <div className="empty"><Sparkles size={34}/><h2>Start with one tiny habit</h2><p>Make it obvious, attractive, easy, and satisfying.</p><button className="primary" onClick={onAdd}><Plus size={18}/> Create habit</button></div>
}

function HabitForm({initial,onClose,onSave}:{initial:Habit|null;onClose:()=>void;onSave:(h:Habit)=>void}) {
  const [name,setName]=useState(initial?.name||"");
  const [identity,setIdentity]=useState(initial?.identity||"");
  const [cue,setCue]=useState(initial?.cue||"");
  const [tiny,setTiny]=useState(initial?.tinyBehavior||"");
  const [env,setEnv]=useState(initial?.environment||"");
  const [frequency,setFrequency]=useState<Frequency>(initial?.frequency||"daily");
  const [days,setDays]=useState<number[]>(initial?.targetDays||[0,1,2,3,4,5,6]);
  const saveIt=()=>{if(!name.trim()||!tiny.trim())return; onSave({id:initial?.id||uid(),name:name.trim(),identity:identity.trim(),cue:cue.trim(),tinyBehavior:tiny.trim(),environment:env.trim(),frequency,targetDays:days,createdAt:initial?.createdAt||new Date().toISOString(),archivedAt:initial?.archivedAt});};
  return <div className="modal-bg"><div className="modal">
    <div className="modal-head"><div><p className="eyebrow">ATOMIC HABITS</p><h2>{initial?"Edit habit":"Create a habit"}</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <Field label="Who do you want to become?" value={identity} onChange={setIdentity} placeholder="I am someone who learns every day."/>
    <Field label="Habit" value={name} onChange={setName} placeholder="Study AI"/>
    <Field label="After / Cue" value={cue} onChange={setCue} placeholder="After breakfast"/>
    <Field label="Make it tiny" value={tiny} onChange={setTiny} placeholder="Read for 5 minutes"/>
    <Field label="Make it easy" value={env} onChange={setEnv} placeholder="Keep the book on my desk"/>
    <label className="field"><span>Frequency</span><select value={frequency} onChange={e=>setFrequency(e.target.value as Frequency)}><option value="daily">Every day</option><option value="weekly">Selected days</option></select></label>
    {frequency==="weekly" && <div className="days">{["S","M","T","W","T","F","S"].map((x,i)=><button key={i} className={days.includes(i)?"day selected":"day"} onClick={()=>setDays(days.includes(i)?days.filter(d=>d!==i):[...days,i])}>{x}</button>)}</div>}
    <button className="primary wide" onClick={saveIt}>{initial?"Save changes":"Create habit"}</button>
  </div></div>
}
function Field({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string}) {
  return <label className="field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>
}

function Calendar({data,month,setMonth}:{data:AppData;month:Date;setMonth:(d:Date)=>void}) {
  const y=month.getFullYear(), m=month.getMonth(), first=new Date(y,m,1).getDay(), count=new Date(y,m+1,0).getDate();
  const cells=Array.from({length:first+count},(_,i)=>i<first?null:i-first+1);
  const active=data.habits.filter(h=>!h.archivedAt);
  return <section className="page"><div className="section-head"><div><p className="eyebrow">HISTORY</p><h1>Calendar</h1></div><div className="month-nav"><button className="icon-btn" onClick={()=>setMonth(new Date(y,m-1,1))}><ChevronLeft/></button><strong>{month.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</strong><button className="icon-btn" onClick={()=>setMonth(new Date(y,m+1,1))}><ChevronRight/></button></div></div>
    <div className="calendar">{["S","M","T","W","T","F","S"].map((d,i)=><div className="cal-label" key={i}>{d}</div>)}{cells.map((day,i)=>{
      if(!day)return <div key={i}/>;
      const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const completed=active.filter(h=>completionFor(data,h.id,ds)?.status==="completed").length;
      return <div className={completed?"cal-day has-done":"cal-day"} key={i}><span>{day}</span>{completed>0&&<i>{completed}</i>}</div>
    })}</div>
    <div className="legend"><span><i className="dot done-dot"/>Completed habits</span><span>Tap a day to review later</span></div>
  </section>
}

function Stats({data,active}:{data:AppData;active:Habit[]}) {
  const total=active.length, todayDone=active.filter(h=>completionFor(data,h.id,todayISO())?.status==="completed").length;
  const avg=total?Math.round(active.reduce((s,h)=>s+rate(data,h),0)/total):0;
  const best=active.length?Math.max(...active.map(h=>bestStreak(data,h))):0;
  return <section className="page"><p className="eyebrow">PROGRESS</p><h1>Statistics</h1>
    <div className="stat-grid"><Stat icon={<Check/>} value={`${todayDone}/${total}`} label="Today"/><Stat icon={<Target/>} value={`${avg}%`} label="30-day average"/><Stat icon={<Flame/>} value={best} label="Best streak"/></div>
    <h2 className="subhead">Your habits</h2>
    {active.map(h=><div className="stat-row" key={h.id}><div><strong>{h.name}</strong><span>{currentStreak(data,h)} day current streak</span></div><div className="bar"><i style={{width:`${rate(data,h)}%`}}/></div><b>{rate(data,h)}%</b></div>)}
    <div className="principle"><Sparkles/><div><strong>Focus on identity, not perfection.</strong><p>Missing once is normal. The goal is to return to the habit before missing twice.</p></div></div>
  </section>
}
function Stat({icon,value,label}:{icon:React.ReactNode;value:string|number;label:string}) {
  return <div className="stat"><div className="stat-icon">{icon}</div><strong>{value}</strong><span>{label}</span></div>
}

function SettingsPage({data,update,exportJSON,importJSON,onArchive}:{data:AppData;update:(d:AppData)=>void;exportJSON:()=>void;importJSON:(f:File)=>void;onArchive:(h:Habit)=>void}) {
  const [showArchived,setShowArchived]=useState(false);
  const archived=data.habits.filter(h=>h.archivedAt);
  const last=data.lastBackupAt?new Date(data.lastBackupAt):null;
  const days=last?Math.floor((Date.now()-last.getTime())/86400000):Infinity;
  const overdue=days>=data.settings.backupReminderDays;
  return <section className="page"><p className="eyebrow">PREFERENCES</p><h1>Settings</h1>
    <div className={overdue?"backup-card warning":"backup-card"}><div><Download/><div><strong>Last backup</strong><p>{last?`${days} day${days===1?"":"s"} ago`:"Never"}</p></div></div>{overdue&&<span className="warning-text">Backup recommended</span>}<button className="primary" onClick={exportJSON}>Backup Now</button></div>
    <div className="settings-card"><h3>Data</h3><button className="setting-btn" onClick={exportJSON}><Download/><span><strong>Export JSON</strong><small>Save a portable backup file</small></span></button>
      <label className="setting-btn upload"><Upload/><span><strong>Import JSON</strong><small>Restore from a backup file</small></span><input type="file" accept="application/json" onChange={e=>e.target.files?.[0]&&importJSON(e.target.files[0])}/></label>
      <label className="setting-inline"><span>Backup reminder</span><select value={data.settings.backupReminderDays} onChange={e=>update({...data,settings:{backupReminderDays:Number(e.target.value)}})}><option value={3}>Every 3 days</option><option value={7}>Every 7 days</option><option value={14}>Every 14 days</option><option value={30}>Every 30 days</option></select></label>
    </div>
    <div className="settings-card"><div className="setting-header"><h3>Archived habits</h3><button className="text-btn" onClick={()=>setShowArchived(!showArchived)}>{showArchived?"Hide":"Show"}</button></div>{showArchived&&archived.map(h=><div className="archived" key={h.id}><span>{h.name}</span><button className="text-btn" onClick={()=>update({...data,habits:data.habits.map(x=>x.id===h.id?{...x,archivedAt:undefined}:x)})}><RotateCcw size={15}/> Restore</button></div>)}{!archived.length&&showArchived&&<p className="muted">No archived habits.</p>}</div>
    <p className="storage-note"><Archive size={15}/> Data is stored locally on this device. Export a backup before clearing browser data, resetting your phone, or changing browsers.</p>
  </section>
}

export default App;
