import { useState } from "react";

const C = {
  bg: "#0D1F17",
  bgCard: "#112318",
  bgElevated: "#163020",
  bgSurface: "#1C3A28",
  green: "#1A7A4A",
  greenBright: "#22A35F",
  greenGlow: "#22A35F22",
  gold: "#D4A843",
  goldLight: "#E8C97A",
  goldDim: "#A07820",
  goldGlow: "#D4A84322",
  cream: "#F5EDD8",
  creamDim: "#C4B896",
  white: "#FFFFFF",
  textPrimary: "#F0E8D5",
  textSecondary: "#8FAF9A",
  textMuted: "#4D6B58",
  border: "#1E3D2A",
  borderGold: "#D4A84333",
  danger: "#E05050",
  verified: "#22A35F",
  pending: "#D4A843",
  red: "#C94040",
};

const PROFILES = [
  { id:1, name:"Ibrahim Al-Farouq", age:29, gender:"M", location:"London, UK", sect:"Sunni", madhab:"Hanafi", prayer:"5×daily", ethnicity:"Sudanese", profession:"Architect", education:"MArch", languages:["English","Arabic"], bio:"Seeking a pious, family-oriented wife. I pray on time, attend Jumuah, and value Islamic knowledge. Quiet, thoughtful, and financially stable. My wali is my father.", values:["Piety","Family","Knowledge"], verified:true, waliName:"Dr. Yusuf Al-Farouq (Father)", initials:"IA", color:"#1A7A4A", mutualInterest:false },
  { id:2, name:"Omar Bilal", age:31, gender:"M", location:"Toronto, Canada", sect:"Sunni", madhab:"Maliki", prayer:"5×daily", ethnicity:"Moroccan", profession:"Dentist", education:"DDS", languages:["English","Arabic","French"], bio:"Alhamdulillah, practising Muslim seeking a compatible, God-fearing partner. I enjoy Islamic history, hiking, and cooking. Looking to build a home grounded in sunnah.", values:["Sunnah","Balance","Compassion"], verified:true, waliName:"N/A (Brothers handle)", initials:"OB", color:"#8B6914", mutualInterest:true },
  { id:3, name:"Tariq Hassan", age:27, gender:"M", location:"Dubai, UAE", sect:"Sunni", madhab:"Shafi'i", prayer:"5×daily", ethnicity:"Egyptian", profession:"Engineer", education:"BSc", languages:["Arabic","English"], bio:"Simple man with strong deen. Family comes first. Looking for a wife who is practising and kind-hearted. I have my mother's blessing and she will be involved.", values:["Simplicity","Loyalty","Deen"], verified:true, waliName:"Ahmed Hassan (Father)", initials:"TH", color:"#C9A84C", mutualInterest:false },
  { id:4, name:"Yusuf Adeyemi", age:33, gender:"M", location:"Chicago, USA", sect:"Sunni", madhab:"Hanbali", prayer:"5×daily", ethnicity:"Nigerian", profession:"Software Engineer", education:"MSc CS", languages:["English","Yoruba","Arabic"], bio:"Tech professional who doesn't let deen take a back seat. Regular at the masjid. Looking for someone equally committed to building an Islamic household.", values:["Growth","Responsibility","Faith"], verified:true, waliName:"Alhaji Musa Adeyemi (Father)", initials:"YA", color:"#2D5A3D", mutualInterest:true },
  { id:5, name:"Amina Hassan", age:26, gender:"F", location:"Birmingham, UK", sect:"Sunni", madhab:"Hanafi", prayer:"5×daily", ethnicity:"Somali", profession:"Software Engineer", education:"MSc", languages:["English","Somali","Arabic"], bio:"Alhamdulillah, practising Muslimah seeking a kind, God-fearing husband. I value deen above all. I enjoy reading, volunteering, and cooking.", values:["Modesty","Family","Charitable"], verified:true, waliName:"Hassan Mohamed (Father)", initials:"AH", color:"#4A7C5E", mutualInterest:false },
  { id:6, name:"Fatima Al-Rashid", age:24, gender:"F", location:"Toronto, Canada", sect:"Sunni", madhab:"Maliki", prayer:"5×daily", ethnicity:"Arab", profession:"Teacher", education:"BA Islamic Studies", languages:["English","Arabic","French"], bio:"I teach at an Islamic school and am deeply connected to my deen. Seeking a righteous husband with good character.", values:["Piety","Knowledge","Community"], verified:true, waliName:"Dr. Khalid Al-Rashid (Father)", initials:"FA", color:"#8B6914", mutualInterest:true },
  { id:7, name:"Zainab Malik", age:28, gender:"F", location:"Chicago, USA", sect:"Sunni", madhab:"Hanafi", prayer:"5×daily", ethnicity:"Pakistani", profession:"Doctor", education:"MBBS", languages:["English","Urdu","Punjabi"], bio:"Practising Muslimah balancing career with Islamic values. Looking for an understanding partner who appreciates hard work and strong deen.", values:["Ambitious","Caring","Pious"], verified:true, waliName:"Dr. Tariq Malik (Father)", initials:"ZM", color:"#7B4B8E", mutualInterest:false },
  { id:8, name:"Khadijah Yusuf", age:23, gender:"F", location:"Lagos, Nigeria", sect:"Sunni", madhab:"Maliki", prayer:"5×daily", ethnicity:"Nigerian", profession:"Entrepreneur", education:"BA Business", languages:["English","Hausa","Arabic"], bio:"Named after the Mother of Believers. Running my own modest fashion brand while pursuing Islamic knowledge. Seek a partner in deen and life.", values:["Creative","Devout","Independent"], verified:true, waliName:"Alhaji Yusuf Bello (Father)", initials:"KY", color:"#2D5A3D", mutualInterest:true },
];

const SECTS = ["Sunni","Shia","Ahmadiyya","Ibadi"];
const MADHHABS = ["Hanafi","Maliki","Shafi'i","Hanbali","Ja'fari","Other"];
const PRAYERS = ["5× daily (never miss)","5× mostly regular","Learning & improving"];
const ETHNICITIES = ["Arab","South Asian","African","Southeast Asian","Turkish","European","Other"];
const COUNTRIES = ["United Kingdom","United States","Canada","UAE","Saudi Arabia","Nigeria","Pakistan","Egypt","Malaysia","South Africa","Other"];

const StarPattern = ({ opacity = 0.04 }) => (
  <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity }} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="sp" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
        <polygon points="25,2 30,18 47,18 34,28 39,45 25,35 11,45 16,28 3,18 20,18" fill="none" stroke={C.gold} strokeWidth="0.6"/>
        <polygon points="25,10 28,20 38,20 30,26 33,37 25,31 17,37 20,26 12,20 22,20" fill="none" stroke={C.gold} strokeWidth="0.3"/>
      </pattern>
    </defs>
    <rect width="200" height="200" fill="url(#sp)"/>
  </svg>
);

const ArabicPattern = ({ opacity = 0.05 }) => (
  <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity }} viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="ap" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="30" cy="30" r="20" fill="none" stroke={C.gold} strokeWidth="0.5"/>
        <circle cx="30" cy="30" r="12" fill="none" stroke={C.gold} strokeWidth="0.3"/>
        <line x1="10" y1="30" x2="50" y2="30" stroke={C.gold} strokeWidth="0.3"/>
        <line x1="30" y1="10" x2="30" y2="50" stroke={C.gold} strokeWidth="0.3"/>
        <line x1="16" y1="16" x2="44" y2="44" stroke={C.gold} strokeWidth="0.2"/>
        <line x1="44" y1="16" x2="16" y2="44" stroke={C.gold} strokeWidth="0.2"/>
        <polygon points="30,14 34,26 47,26 37,33 41,46 30,38 19,46 23,33 13,26 26,26" fill="none" stroke={C.gold} strokeWidth="0.4"/>
      </pattern>
    </defs>
    <rect width="300" height="300" fill="url(#ap)"/>
  </svg>
);

const Ic = ({ d, size=18, color="currentColor", fill="none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);

const ic = {
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  check:    "M20 6L9 17l-5-5",
  camera:   "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  id:       "M2 9h20M2 15h20M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
  phone:    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  mail:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  heart:    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  search:   "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  filter:   "M4 6h16M7 12h10M10 18h4",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  x:        "M18 6L6 18M6 6l12 12",
  msg:      "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  face:     "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  moon:     "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  book:     "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  location: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z",
  alert:    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  globe:    "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  home:     "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
};

const Badge = ({ label, variant="green" }) => {
  const styles = {
    green:  { background: C.greenGlow,  border:`1px solid ${C.green}55`,  color: C.greenBright },
    gold:   { background: C.goldGlow,   border:`1px solid ${C.gold}55`,   color: C.goldLight },
    muted:  { background: "#ffffff08",  border:`1px solid ${C.border}`,   color: C.textSecondary },
    danger: { background: "#E0505015",  border:`1px solid ${C.danger}44`, color: C.danger },
  };
  const s = styles[variant] || styles.green;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:"0.04em", ...s }}>
      {label}
    </span>
  );
};

const VerifiedBadge = () => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:C.greenGlow, border:`1px solid ${C.green}55`, color:C.greenBright, padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700 }}>
    <Ic d={ic.check} size={11} color={C.greenBright}/> VERIFIED
  </span>
);

const Avatar = ({ initials, color, size=64, verified=false }) => (
  <div style={{ position:"relative", flexShrink:0 }}>
    <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}25`, border:`2px solid ${color}60`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.32, fontWeight:700, color, fontFamily:"'Playfair Display', serif" }}>
      {initials}
    </div>
    {verified && (
      <div style={{ position:"absolute", bottom:0, right:0, width:18, height:18, borderRadius:"50%", background:C.greenBright, border:`2px solid ${C.bg}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Ic d={ic.check} size={10} color="#fff"/>
      </div>
    )}
  </div>
);

const Input = ({ label, placeholder, type="text", value, onChange, icon, hint }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</label>}
    <div style={{ position:"relative" }}>
      {icon && <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }}><Ic d={icon} size={15} color={C.textMuted}/></div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width:"100%", padding:"12px 14px", paddingLeft:icon?42:14, borderRadius:10, background:C.bgSurface, border:`1px solid ${C.border}`, color:C.textPrimary, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"'Lato', sans-serif" }}/>
    </div>
    {hint && <span style={{ fontSize:11, color:C.textMuted }}>{hint}</span>}
  </div>
);

const Select = ({ label, options, value, onChange }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</label>}
    <select value={value} onChange={onChange} style={{ padding:"12px 14px", borderRadius:10, background:C.bgSurface, border:`1px solid ${C.border}`, color:value?C.textPrimary:C.textMuted, fontSize:14, outline:"none", cursor:"pointer", fontFamily:"'Lato', sans-serif", appearance:"none" }}>
      <option value="">Select…</option>
      {options.map(o => <option key={o} value={o} style={{ background:C.bgCard }}>{o}</option>)}
    </select>
  </div>
);

const Btn = ({ label, onClick, variant="primary", icon, full=false, small=false }) => {
  const styles = {
    primary: { background:`linear-gradient(135deg, ${C.greenBright}, ${C.green})`, color:"#fff", border:"none" },
    gold:    { background:`linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,     color:C.bg,  border:"none" },
    outline: { background:"transparent", color:C.textPrimary, border:`1px solid ${C.border}` },
    ghost:   { background:C.bgSurface,   color:C.textPrimary, border:`1px solid ${C.border}` },
    danger:  { background:"#C9404015",   color:C.danger,      border:`1px solid ${C.danger}44` },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], padding:small?"8px 16px":"12px 24px", borderRadius:10, fontWeight:700, fontSize:small?12:14, cursor:"pointer", width:full?"100%":"auto", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"'Lato', sans-serif", letterSpacing:"0.03em" }}>
      {icon && <Ic d={icon} size={small?14:16} color={variant==="gold"?C.bg:"#fff"}/>}
      {label}
    </button>
  );
};

const VerificationStep = ({ title, desc, icon, status }) => (
  <div style={{ display:"flex", gap:16, alignItems:"flex-start", padding:"16px 18px", borderRadius:12, background:status==="done"?C.greenGlow:status==="active"?C.bgSurface:C.bgCard, border:`1px solid ${status==="done"?C.green+"44":status==="active"?C.border:C.border+"44"}` }}>
    <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:status==="done"?C.greenBright:status==="active"?C.bgElevated:C.bgCard, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${status==="done"?C.green:C.border}` }}>
      {status==="done" ? <Ic d={ic.check} size={18} color="#fff"/> : <Ic d={icon} size={18} color={status==="active"?C.gold:C.textMuted}/>}
    </div>
    <div style={{ flex:1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
        <span style={{ fontWeight:700, fontSize:14, color:status==="done"?C.greenBright:status==="active"?C.textPrimary:C.textMuted }}>{title}</span>
        {status==="done" && <Badge label="Complete" variant="green"/>}
        {status==="active" && <Badge label="Required" variant="gold"/>}
        {status==="pending" && <Badge label="Pending" variant="muted"/>}
      </div>
      <p style={{ fontSize:12, color:C.textMuted, margin:0, lineHeight:1.6 }}>{desc}</p>
    </div>
  </div>
);

const ProfileCard = ({ p, onView, onInterest, expressed, mutual }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{ background:hov?C.bgElevated:C.bgCard, border:`1px solid ${hov?C.borderGold:C.border}`, borderRadius:16, padding:20, cursor:"pointer", transition:"all 0.25s", position:"relative", overflow:"hidden", boxShadow:hov?`0 8px 32px rgba(212,168,67,0.12)`:"none" }}>
      <ArabicPattern opacity={0.03}/>
      <div style={{ position:"relative" }}>
        <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:14 }}>
          <Avatar initials={p.initials} color={p.color} size={58} verified={p.verified}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:C.textPrimary, marginBottom:3 }}>{p.name}</div>
            <div style={{ fontSize:12, color:C.textSecondary, display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
              <Ic d={ic.location} size={12} color={C.textMuted}/> {p.location} · {p.age}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <VerifiedBadge/>
              {mutual && <Badge label="💚 Mutual Interest" variant="green"/>}
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {[{icon:ic
