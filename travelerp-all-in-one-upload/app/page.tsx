"use client";

import { useEffect, useMemo, useState } from "react";

type View = "dashboard" | "calendar" | "request" | "approvals" | "trips" | "reports" | "settings";
type Role = "user" | "project_manager" | "project_director" | "admin" | "super_admin";
type AdminTab = "people" | "routing" | "requests";
type RequestItem = {
  id: string;
  person: string;
  route: string;
  date: string;
  time: string;
  status: string;
  tone: string;
  budget: string;
  purpose?: string;
  office?: string;
  tripId?: string;
  vehicle?: string;
  driver?: string;
  dispatchedAt?: string;
  mileageKm?: number;
  finalPriceLkr?: number;
  completedAt?: string;
  receiptRef?: string;
  completionNotes?: string;
};
type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  office: string;
  active: boolean;
  protected?: boolean;
};

const roleConfig: Record<Role, {
  label: string;
  description: string;
  email: string;
  name: string;
  initials: string;
  startView: View;
  views: View[];
}> = {
  user: {
    label: "Requester",
    description: "Create and follow vehicle requests",
    email: "lasantha@chrysalis.lk",
    name: "Lasantha Soysa",
    initials: "LS",
    startView: "calendar",
    views: ["calendar", "request"],
  },
  project_manager: {
    label: "Project Manager",
    description: "Review budgets and approve requests",
    email: "nadeesha@chrysalis.lk",
    name: "Nadeesha Fernando",
    initials: "NF",
    startView: "approvals",
    views: ["calendar", "request", "approvals"],
  },
  project_director: {
    label: "Project Director",
    description: "Final approval and management oversight",
    email: "ruwan@chrysalis.lk",
    name: "Dr. Ruwan Silva",
    initials: "RS",
    startView: "approvals",
    views: ["calendar", "request", "approvals"],
  },
  admin: {
    label: "Admin",
    description: "Plan, merge and complete trips",
    email: "shashika@chrysalis.lk",
    name: "Shashika Perera",
    initials: "SP",
    startView: "trips",
    views: ["dashboard", "calendar", "trips", "reports"],
  },
  super_admin: {
    label: "Super Admin",
    description: "Full system and access control",
    email: "yenuka@chrysalis.lk",
    name: "Yenuka K.",
    initials: "YK",
    startView: "dashboard",
    views: ["dashboard", "calendar", "request", "approvals", "trips", "reports", "settings"],
  },
};
const navItems: { id: View; label: string; short: string }[] = [
  { id: "dashboard", label: "Operations", short: "OP" },
  { id: "calendar", label: "Trip calendar", short: "CL" },
  { id: "request", label: "New request", short: "NR" },
  { id: "approvals", label: "Approvals", short: "AP" },
  { id: "trips", label: "Trip planning", short: "TP" },
  { id: "reports", label: "Reports", short: "RP" },
  { id: "settings", label: "Administration", short: "AD" },
];
const initialRequests: RequestItem[] = [
  { id: "VR-260814-042", person: "Lasantha Soysa", route: "Colombo → Badulla", date: "17 Aug", time: "06:30", status: "Awaiting approval", tone: "amber", budget: "COPEJW602162", office: "Head Office" },
  { id: "VR-260814-041", person: "Keerthi Indrajith", route: "Colombo → Badulla", date: "17 Aug", time: "07:00", status: "Approved", tone: "green", budget: "HRD-2026-118", office: "Head Office" },
  { id: "VR-260814-039", person: "Thirumarugan R.", route: "Batticaloa → Kandy", date: "16 Aug", time: "08:30", status: "Needs revision", tone: "red", budget: "OPS-26-771", office: "Batticaloa Area Office" },
  { id: "VR-260813-036", person: "Amali Perera", route: "Galle → Matara", date: "16 Aug", time: "09:00", status: "Trip scheduled", tone: "blue", budget: "FIELD-26-041", office: "Galle Area Office" },
];
const initialUsers: UserRecord[] = [
  { id: "USR-001", name: "Yenuka K.", email: "yenuka@chrysalis.lk", role: "super_admin", office: "Head Office", active: true, protected: true },
  { id: "USR-002", name: "Lasantha Soysa", email: "lasantha@chrysalis.lk", role: "user", office: "Head Office", active: true },
  { id: "USR-003", name: "Nadeesha Fernando", email: "nadeesha@chrysalis.lk", role: "project_manager", office: "Head Office", active: true },
  { id: "USR-004", name: "Dilan Jayawardena", email: "dilan@chrysalis.lk", role: "project_manager", office: "Head Office", active: true },
  { id: "USR-005", name: "Dr. Ruwan Silva", email: "ruwan@chrysalis.lk", role: "project_director", office: "Head Office", active: true },
  { id: "USR-006", name: "Madhavi Karunaratne", email: "madhavi@chrysalis.lk", role: "project_director", office: "Galle Area Office", active: true },
  { id: "USR-007", name: "Shashika Perera", email: "shashika@chrysalis.lk", role: "admin", office: "Head Office", active: true },
];
const initialOffices = ["Head Office","Galle Area Office","Batticaloa Area Office"];
const editableRoles: Role[] = ["user", "project_manager", "project_director", "admin", "super_admin"];
const requestStatuses = ["Draft", "Awaiting approval", "Approved", "Needs revision", "Trip scheduled", "Completed", "Cancelled"];
const toneForStatus = (status: string) => status === "Approved" || status === "Completed" ? "green" : status === "Needs revision" || status === "Cancelled" ? "red" : status === "Trip scheduled" ? "blue" : "amber";
const officeForRequest = (item: RequestItem) => item.office ?? (item.id === "VR-260814-039" ? "Batticaloa Area Office" : item.id === "VR-260813-036" ? "Galle Area Office" : "Head Office");
const announce = (message: string) => window.dispatchEvent(new CustomEvent("chrysalis:notice", { detail: message }));
const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
};

function Login({ onLogin, offices }: { onLogin: (role: Role, adminOffice?: string) => void; offices: string[] }) {
  const [role, setRole] = useState<Role>("user");
  const [email, setEmail] = useState(roleConfig.user.email);
  const [showPassword, setShowPassword] = useState(false);
  const [adminOffice, setAdminOffice] = useState("Head Office");
  const selected = roleConfig[role];

  const chooseRole = (nextRole: Role) => {
    setRole(nextRole);
    setEmail(roleConfig[nextRole].email);
  };

  return <main className="login-page">
    <section className="login-story">
      <div className="login-brand"><div className="brand-mark"><i/><i/><i/><i/><i/></div><div><strong>chrysalis</strong><span>Mobility Operations</span></div></div>
      <div className="login-message"><p className="eyebrow">TRANSPORT OPERATIONS PLATFORM</p><h1>Every request.<br/>One clear journey.</h1><p>Plan, approve and coordinate staff travel through one controlled operational workflow.</p></div>
      <div className="login-flow"><div><b>01</b><span><strong>Request</strong><small>Journey and budget</small></span></div><i/><div><b>02</b><span><strong>Approve</strong><small>Role-based control</small></span></div><i/><div><b>03</b><span><strong>Operate</strong><small>Merge and complete</small></span></div></div>
      <p className="login-security"><span>✓</span> Private company access · Complete activity history</p>
    </section>
    <section className="login-panel-wrap">
      <form className="login-card" onSubmit={(event) => { event.preventDefault(); onLogin(role, adminOffice); }}>
        <div className="login-heading"><p className="eyebrow">SECURE ACCESS</p><h2>Welcome back</h2><p>Select your account type and sign in to continue.</p></div>
        <fieldset className="role-selector"><legend>Account type</legend>{(Object.keys(roleConfig) as Role[]).map((item) => <button type="button" key={item} className={role === item ? "selected" : ""} onClick={() => chooseRole(item)}><span>{roleConfig[item].initials}</span><span><strong>{roleConfig[item].label}</strong><small>{roleConfig[item].description}</small></span><i>{role === item ? "✓" : ""}</i></button>)}</fieldset>
        {role === "admin" && <label className="login-field"><span>Admin office · scope preview</span><select value={adminOffice} onChange={event => setAdminOffice(event.target.value)}>{offices.map(office=><option key={office}>{office}</option>)}</select><small className="scope-helper">Head Office (Colombo) can view all offices. Area Admins are restricted to their own office.</small></label>}
        <label className="login-field"><span>Work email</span><div><i>@</i><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
        <label className="login-field"><span>Password</span><div><i>•</i><input type={showPassword ? "text" : "password"} defaultValue="Chrysalis2026" required /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button></div></label>
        <div className="login-options"><label><input type="checkbox" defaultChecked /> Keep me signed in</label><button type="button" onClick={() => announce("Password reset instructions sent to the selected work email.")}>Forgot password?</button></div>
        <button className="primary login-submit" type="submit">Sign in as {selected.label} <span>→</span></button>
        <div className="demo-note"><span>i</span><p><strong>Prototype access</strong> — choose any role to preview its permitted workspace. Live accounts will be assigned by Super Admin.</p></div>
      </form>
      <p className="login-footer">Chrysalis · Internal mobility management · Version 1.1</p>
    </section>
  </main>;
}

function Status({ tone, children }: { tone: string; children: React.ReactNode }) { return <span className={`status ${tone}`}><span />{children}</span>; }
function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action}</div>;
}

function Dashboard({ onNew, onNavigate, requests }: { onNew: () => void; onNavigate: (view: View) => void; requests: RequestItem[] }) {
  return <>
    <PageTitle eyebrow="Friday · 14 August 2026" title="Good morning, Yenuka" subtitle="Here is today’s transport operations picture across all offices." action={<button className="primary" onClick={onNew}><span>＋</span> Create request</button>} />
    <section className="metric-grid" aria-label="Operations summary">
      <article className="metric-card accent"><div className="metric-head"><span>Open requests</span><b>Live</b></div><strong>{requests.filter(item => item.status !== "Trip scheduled").length}</strong><p>{requests.length} requests in the local register</p><div className="spark"><i /><i /><i /><i /><i /><i /><i /></div></article>
      <article className="metric-card"><div className="metric-head"><span>Pending approvals</span><b className="warning">Needs action</b></div><strong>{requests.filter(item => item.status === "Awaiting approval").length}</strong><p>Updates immediately after a decision</p><div className="mini-progress"><span style={{ width: "64%" }} /></div></article>
      <article className="metric-card"><div className="metric-head"><span>Trips today</span><b className="calm">On track</b></div><strong>18</strong><p>15 scheduled · 3 completed</p><div className="mini-progress blue"><span style={{ width: "82%" }} /></div></article>
      <article className="metric-card"><div className="metric-head"><span>Merge opportunities</span><b className="saving">Save 3 trips</b></div><strong>4</strong><p>Requests with matching routes</p><div className="route-dots"><i /><span /><i /><span /><i /></div></article>
    </section>
    <section className="dashboard-grid">
      <article className="panel requests-panel"><div className="panel-head"><div><h2>Request control</h2><p>Live queue across every approval stage</p></div><button className="text-button" onClick={() => onNavigate("approvals")}>View all <span>→</span></button></div><div className="table-scroll"><table><thead><tr><th>Request</th><th>Route</th><th>Travel</th><th>Status</th><th /></tr></thead><tbody>{requests.map(item => <tr key={item.id}><td><strong>{item.id}</strong><small>{item.person}</small></td><td>{item.route}<small>{item.budget}</small></td><td><strong>{item.date}</strong><small>{item.time}</small></td><td><Status tone={item.tone}>{item.status}</Status></td><td><button className="more" aria-label={`Open ${item.id}`} onClick={() => { onNavigate("approvals"); announce(`${item.id} opened in the approval queue.`); }}>•••</button></td></tr>)}</tbody></table></div></article>
      <aside className="panel timeline-panel"><div className="panel-head"><div><h2>Today’s movement</h2><p>Next departures</p></div><span className="live"><i /> LIVE</span></div><div className="timeline"><div className="timeline-item now"><time>12:30</time><div><strong>Head Office → Kandy</strong><p>Trip TR-1082 · 4 passengers</p><span>Driver assigned</span></div></div><div className="timeline-item"><time>14:00</time><div><strong>Head Office → Negombo</strong><p>Trip TR-1084 · 2 passengers</p><span>Vehicle confirmed</span></div></div><div className="timeline-item"><time>15:15</time><div><strong>Galle Office → Matara</strong><p>Trip TR-1085 · 5 passengers</p><span>Awaiting dispatch</span></div></div></div><button className="secondary wide" onClick={() => onNavigate("trips")}>Open dispatch board</button></aside>
    </section>
    <section className="lower-grid"><article className="panel alert-panel"><div className="alert-icon">!</div><div><p className="eyebrow">ACTION REQUIRED</p><h3>3 requests break the 3-day notice rule</h3><p>Review the business justification before approval.</p></div><button className="secondary" onClick={() => onNavigate("approvals")}>Review now</button></article><article className="panel coverage-panel"><div><p className="eyebrow">WEEKLY COMPLETION</p><h3>Operations coverage</h3></div><div className="coverage-value"><strong>92%</strong><span>+4.8% vs last week</span></div></article></section>
  </>;
}

function RequestForm({ requester, approvers, offices, onCreate }: { requester: string; approvers: UserRecord[]; offices: string[]; onCreate: (request: RequestItem) => void }) {
  const [requestType, setRequestType] = useState("Field"); const [codes, setCodes] = useState(["COPEJW602162"]); const [holders, setHolders] = useState(["Nadeesha Fernando"]); const [submitted, setSubmitted] = useState(false);
  const [office, setOffice] = useState("Head Office");
  const [origin, setOrigin] = useState("Colombo Head Office"); const [destination, setDestination] = useState("Badulla"); const [travelDate, setTravelDate] = useState("2026-08-17"); const [departure, setDeparture] = useState("06:30"); const [purpose, setPurpose] = useState("Procurement-related works and staff capacity building");
  const [passengers,setPassengers] = useState([requester,"Keerthi Indrajith"]);
  const passengerPool = ["Amali Perera","Dilan Jayawardena","Nadeesha Fernando","Thirumarugan R."];
  const toggleHolder = (name: string) => setHolders(items => items.includes(name) ? items.filter(item => item !== name) : [...items, name]);
  const addPassenger = () => { const next = passengerPool.find(name => !passengers.includes(name)); if (next) setPassengers(items => [...items,next]); else announce("All available prototype passengers are already added."); };
  const saveDraft = () => { window.localStorage.setItem("chrysalis-request-draft",JSON.stringify({requestType,office,origin,destination,travelDate,departure,purpose,codes,holders,passengers})); announce("Request draft saved on this device."); };
  const submitRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedDate = new Date(`${travelDate}T00:00:00`);
    const date = Number.isNaN(parsedDate.getTime()) ? travelDate : parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const suffix = String(Date.now()).slice(-3);
    onCreate({ id: `VR-${travelDate.replaceAll("-", "").slice(2)}-${suffix}`, person: requester, route: `${origin.replace(" Head Office", "")} → ${destination}`, date, time: departure, status: "Awaiting approval", tone: "amber", budget: codes.find(Boolean) ?? "Unassigned", purpose, office });
    setSubmitted(true);
  };
  return <><PageTitle eyebrow="VEHICLE REQUISITION" title="Create a new request" subtitle="Complete the journey details, budget codes and responsible approvers." action={<span className="draft-state">Saved as draft · just now</span>} />
    <div className="form-layout"><form className="request-form" onSubmit={submitRequest}>
      <section className="form-section"><div className="section-number">01</div><div className="section-copy"><h2>Request details</h2><p>Basic information about the requesting office.</p></div><div className="field-grid"><label><span>Base office *</span><select value={office} onChange={event => setOffice(event.target.value)}>{offices.map(item=><option key={item}>{item}</option>)}</select></label><label><span>Request date</span><input type="date" defaultValue="2026-08-14" /></label><fieldset className="full"><legend>Nature of request *</legend><div className="segmented">{["Town","Field","Inter Office","Other"].map(type => <button type="button" key={type} className={requestType === type ? "active" : ""} onClick={() => setRequestType(type)}>{type}</button>)}</div></fieldset></div></section>
      <section className="form-section"><div className="section-number">02</div><div className="section-copy"><h2>Journey</h2><p>When and where the vehicle is required.</p></div><div className="field-grid four"><label><span>From date *</span><input type="date" value={travelDate} onChange={event => setTravelDate(event.target.value)} required /></label><label><span>Departure *</span><input type="time" value={departure} onChange={event => setDeparture(event.target.value)} required /></label><label><span>To date *</span><input type="date" defaultValue="2026-08-17" /></label><label><span>Return *</span><input type="time" defaultValue="19:00" /></label><label className="route-field"><span>From *</span><div className="input-with-dot"><i /><input value={origin} onChange={event => setOrigin(event.target.value)} required /></div></label><div className="route-arrow">→</div><label className="route-field"><span>Destination *</span><div className="input-with-dot destination"><i /><input value={destination} onChange={event => setDestination(event.target.value)} required /></div></label><label className="full"><span>Purpose *</span><textarea value={purpose} onChange={event => setPurpose(event.target.value)} required /></label></div><div className="notice"><span>i</span><p><strong>Notice period met.</strong> This journey is being requested at least 3 days before travel.</p></div></section>
      <section className="form-section"><div className="section-number">03</div><div className="section-copy"><h2>Passengers</h2><p>Add everyone travelling on this request.</p></div>{passengers.map((name,index)=><div className="passenger-row" key={name}><div className={`avatar ${index % 2 ? "blue" : "pink"}`}>{name.split(" ").map(word=>word[0]).slice(0,2).join("")}</div><div><strong>{name}</strong><p>{index===0?"Primary requester":"Staff passenger"}</p></div>{index===0?<span className="tag">Primary</span>:<button type="button" className="remove" aria-label={`Remove ${name}`} onClick={()=>setPassengers(items=>items.filter(item=>item!==name))}>×</button>}</div>)}<button type="button" className="add-row" onClick={addPassenger}>＋ Add passenger</button></section>
      <section className="form-section budget-section"><div className="section-number">04</div><div className="section-copy"><h2>Budget & approval</h2><p>Enter the current budget code and choose responsible approvers.</p></div><div className="budget-grid"><div><p className="block-label">Budget code *</p>{codes.map((code,index) => <div className="code-row" key={index}><span>{String(index+1).padStart(2,"0")}</span><input aria-label={`Budget code ${index + 1}`} value={code} placeholder="Enter budget code" onChange={e => setCodes(items => items.map((item,i) => i === index ? e.target.value : item))} />{codes.length > 1 && <button type="button" aria-label={`Remove budget code ${index + 1}`} onClick={() => setCodes(items => items.filter((_,i) => i !== index))}>×</button>}</div>)}<button type="button" className="add-row" onClick={() => setCodes(items => [...items,""])}>＋ Add another budget code</button></div><div><p className="block-label">Approver(s) *</p><div className="holder-list">{approvers.map((approver) => <button type="button" key={approver.id} className={holders.includes(approver.name) ? "selected" : ""} onClick={() => toggleHolder(approver.name)}><span className="avatar tiny">{approver.name.split(" ").map(word => word[0]).slice(0,2).join("")}</span><span><strong>{approver.name}</strong><small>{roleConfig[approver.role].label}</small></span><i>{holders.includes(approver.name) ? "✓" : ""}</i></button>)}</div><p className="helper">Active Project Managers and Project Directors can be selected.</p></div></div>{holders.length > 1 && <div className="director-rule"><span>↗</span><div><strong>Multi-holder approval activated</strong><p>All selected approvers must complete their decisions before operations can continue.</p></div></div>}</section>
      {submitted && <div className="success-banner"><span>✓</span><div><strong>Request saved to the local register</strong><p>It has been sent to {holders.length} Budget Holder{holders.length === 1 ? "" : "s"} for approval.</p></div></div>}<div className="form-actions"><button type="button" className="secondary" onClick={saveDraft}>Save draft</button><button type="submit" className="primary">Submit request <span>→</span></button></div>
    </form><aside className="summary-card"><p className="eyebrow">REQUEST SUMMARY</p><h3>{origin.replace(" Head Office", "")} → {destination}</h3><div className="journey-line"><i /><span /><i /></div><dl><div><dt>Travel date</dt><dd>{travelDate}</dd></div><div><dt>Duration</dt><dd>12h 30m</dd></div><div><dt>Passengers</dt><dd>{passengers.length} people</dd></div><div><dt>Budget codes</dt><dd>{codes.filter(Boolean).length}</dd></div><div><dt>Approvers</dt><dd>{holders.length} holder{holders.length === 1 ? "" : "s"}</dd></div></dl><div className="approval-path"><p>Approval path</p><div><span className="avatar tiny pink">LS</span><i /><span className="avatar tiny">BH</span>{holders.length > 1 && <><i /><span className="avatar tiny dark">PD</span></>}<i /><span className="avatar tiny blue">AA</span></div><small>Requestor → Budget Holder{holders.length > 1 ? " → Director" : ""} → Area Admin</small></div></aside></div>
  </>;
}

function Approvals({ requests, onStatus }: { requests: RequestItem[]; onStatus: (id: string, status: string, tone: string) => void }) {
  const [filter,setFilter] = useState<"pending"|"approved"|"all">("pending");
  const filtered = requests.filter(item => filter === "all" || (filter === "approved" ? item.status === "Approved" : item.status === "Awaiting approval"));
  return <><PageTitle eyebrow="MY WORKSPACE" title="Approval queue" subtitle="Review vehicle requests assigned to you and keep operations moving." action={<div className="filter-group"><button className={`filter ${filter === "pending" ? "active" : ""}`} onClick={()=>setFilter("pending")}>Pending <b>{requests.filter(item=>item.status==="Awaiting approval").length}</b></button><button className={`filter ${filter === "approved" ? "active" : ""}`} onClick={()=>setFilter("approved")}>Approved</button><button className={`filter ${filter === "all" ? "active" : ""}`} onClick={()=>setFilter("all")}>All</button></div>} /><div className="approval-layout"><section className="approval-list">{filtered.length ? filtered.map((item,index) => <article className={`approval-card ${index === 0 ? "featured" : ""}`} key={item.id}><div className="approval-top"><div><Status tone={item.tone}>{item.status}</Status><h2>{item.route}</h2><p>{item.id} · Requested by {item.person}</p></div><div className="date-box"><strong>{item.date.split(" ")[0]}</strong><span>{item.date.split(" ")[1]?.toUpperCase() ?? "TRIP"}</span></div></div><div className="approval-facts"><div><span>Departure</span><strong>{item.date} · {item.time}</strong></div><div><span>Passengers</span><strong>{index+2} people</strong></div><div><span>Budget code</span><strong>{item.budget}</strong></div></div><p className="purpose">“{item.purpose ?? "Procurement-related works and staff capacity building across the regional programme."}”</p><div className="card-actions">{item.status === "Awaiting approval" ? <><button className="secondary" onClick={()=>onStatus(item.id,"Needs revision","red")}>Request changes</button><button className="approve" onClick={() => onStatus(item.id,"Approved","green")}>✓ Approve request</button></> : <Status tone={item.tone}>{item.status}</Status>}</div></article>) : <article className="panel empty-state"><h2>No requests here</h2><p>Decisions and new submissions will appear automatically.</p></article>}</section><aside className="panel approval-guide"><p className="eyebrow">APPROVAL STANDARD</p><h3>Before you approve</h3>{["Journey has a clear business purpose","Budget code is valid for this activity","Passenger list is complete","Notice period or exception is acceptable"].map(text => <p className="check" key={text}><span>✓</span>{text}</p>)}<hr/><small>Your decision, date and any comment is retained in this local prototype.</small></aside></div></>;
}

function TripPlanning({ requests, onUpdateRequest }: { requests: RequestItem[]; onUpdateRequest: (id: string, patch: Partial<RequestItem>) => void }) {
  const candidates = requests.filter(item => item.status !== "Cancelled" && item.status !== "Completed" && item.status !== "Trip scheduled").slice(0,6);
  const activeTrips = Array.from(new Map(requests.filter(item => item.status === "Trip scheduled").map(item => [item.tripId ?? item.id,item])).values());
  const [selected,setSelected] = useState<string[]>([]);
  const [focusedId,setFocusedId] = useState(candidates[0]?.id ?? "");
  const [vehicle,setVehicle] = useState("");
  const [driver,setDriver] = useState("");
  const [coordinator,setCoordinator] = useState("Shashika Perera");
  const [pickup,setPickup] = useState("Main entrance · 15 minutes before departure");
  const [adminNotes,setAdminNotes] = useState("");
  const [merged,setMerged] = useState(false);
  const [standaloneMode,setStandaloneMode] = useState(false);
  const [mileage,setMileage] = useState("");
  const [finalPrice,setFinalPrice] = useState("");
  const [completedAt,setCompletedAt] = useState("2026-08-17");
  const [receiptRef,setReceiptRef] = useState("");
  const [completionNotes,setCompletionNotes] = useState("");
  const [closed,setClosed] = useState(false);
  const focused = requests.find(item => item.id === focusedId) ?? candidates[0] ?? activeTrips[0];
  const passengerCount = (id: string) => id.endsWith("042") ? 3 : id.endsWith("041") ? 2 : 1;
  const totalPassengers = selected.reduce((total,id) => total + passengerCount(id),0);
  const canCloseTrip = closed || (selected.length > 0 && selected.every(id => merged || requests.find(item => item.id === id)?.status === "Trip scheduled"));
  const toggleRequest = (id: string) => { setMerged(false); setClosed(false); setSelected(items => items.includes(id) ? items.filter(item => item !== id) : [...items,id]); };
  const createTrip = () => { const tripId = `TR-${String(Date.now()).slice(-4)}`; selected.forEach(id => onUpdateRequest(id,{status:"Trip scheduled",tone:"blue",tripId,vehicle,driver,dispatchedAt:new Date().toISOString()})); setMerged(true); announce(`${standaloneMode ? "Standalone trip" : "Operational trip"} ${tripId} dispatched and added to Trips out now.`); };
  const openActiveTrip = (item: RequestItem) => {
    const linkedIds = requests.filter(request => request.status === "Trip scheduled" && (item.tripId ? request.tripId === item.tripId : request.id === item.id)).map(request => request.id);
    setSelected(linkedIds);
    setFocusedId(item.id);
    setVehicle(item.vehicle ?? "");
    setDriver(item.driver ?? "");
    setStandaloneMode(false);
    setMerged(true);
    setClosed(false);
    setMileage("");
    setFinalPrice("");
    setReceiptRef("");
    setCompletionNotes("");
    announce(`${item.tripId ?? item.id} opened for return entry.`);
  };
  const toggleStandalone = () => { setStandaloneMode(value => !value); setSelected([]); setMerged(false); setClosed(false); };
  const printManifest = () => { if (!focused) return; const names=[focused.person,...(passengerCount(focused.id)>1?["Keerthi Indrajith"]:[]),...(passengerCount(focused.id)>2?["Amali Perera"]:[])]; downloadCsv(`${focused.id}-passenger-manifest.csv`,[["Request","Passenger","Role","Status"],...names.map((name,index)=>[focused.id,name,index===0?"Primary requester":"Staff passenger","Confirmed"])]); announce("Passenger manifest downloaded."); };
  const closeTrip = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    selected.forEach(id => onUpdateRequest(id,{status:"Completed",tone:"green",mileageKm:Number(mileage),finalPriceLkr:Number(finalPrice),completedAt,receiptRef,completionNotes,tripId:requests.find(item => item.id === id)?.tripId ?? `TR-${String(Date.now()).slice(-4)}`}));
    setClosed(true);
  };

  return <><PageTitle eyebrow="AREA ADMIN CONTROL" title="Trip planning & operations" subtitle="Review complete request information, allocate transport and create a controlled operational trip." action={<button className="primary" onClick={toggleStandalone}>{standaloneMode?"× Cancel standalone setup":"＋ Create standalone trip"}</button>} />
    <div className="merge-banner"><div className="merge-symbol"><i/><i/><span>→</span><b/></div><div><p className="eyebrow">OPERATIONAL QUEUE</p><h3>{candidates.length} requests ready for admin review</h3><p>Select requests to merge, or open any request to inspect its full journey and approval details.</p></div><Status tone="blue">{requests.length} in office scope</Status></div>
    <div className="planning-workspace"><div className="planning-main">
      <section className="panel active-trips-panel"><div className="panel-head"><div><p className="eyebrow">LIVE MOVEMENT</p><h2>Trips out now</h2><p>Dispatched vehicles stay here until the Admin records their return and closes the trip.</p></div><span className="active-trip-count"><i/>{activeTrips.length} out</span></div>
        {activeTrips.length ? <div className="active-trip-list">{activeTrips.map(item => { const linkedCount = item.tripId ? requests.filter(request => request.status === "Trip scheduled" && request.tripId === item.tripId).length : 1; return <article className={selected.includes(item.id) && merged ? "active" : ""} key={item.tripId ?? item.id}><div className="active-trip-id"><span>OUT NOW</span><strong>{item.tripId ?? item.id}</strong></div><div><strong>{item.route}</strong><small>{item.date} · {item.time} · {linkedCount} request{linkedCount === 1 ? "" : "s"}</small></div><div><span>DRIVER / VEHICLE</span><strong>{item.driver?.split(" · ")[0] ?? "Driver not recorded"}</strong><small>{item.vehicle?.split(" · ").slice(0,2).join(" · ") ?? "Vehicle not recorded"}</small></div><button onClick={() => openActiveTrip(item)}>Enter return details <span>→</span></button></article>})}</div> : <div className="active-trip-empty"><span>✓</span><div><strong>No vehicles are currently out</strong><p>Newly dispatched trips will appear here automatically.</p></div></div>}
      </section>
      <section className="panel trip-queue-panel"><div className="panel-head"><div><h2>Request queue</h2><p>Choose requests and inspect the full operational record before allocation.</p></div><span className="queue-count">{selected.length} selected</span></div>
        <div className="trip-request-list">{candidates.map((item,index) => <article className={`trip-request-card ${focused?.id === item.id ? "focused" : ""} ${selected.includes(item.id) ? "selected" : ""}`} key={item.id}><button className="trip-check" aria-label={`Select ${item.id}`} onClick={() => toggleRequest(item.id)}>{selected.includes(item.id) ? "✓" : ""}</button><span className={`avatar ${index % 2 ? "blue" : "pink"}`}>{item.person.split(" ").map(word=>word[0]).slice(0,2).join("")}</span><div className="trip-card-main"><div><strong>{item.person}</strong><Status tone={item.tone}>{item.status}</Status></div><p>{item.id} · {officeForRequest(item)}</p><b>{item.route}</b></div><div className="trip-card-travel"><span>TRAVEL</span><strong>{item.date} · {item.time}</strong><small>{passengerCount(item.id)} passenger{passengerCount(item.id) === 1 ? "" : "s"}</small></div><button className="details-button" onClick={() => setFocusedId(item.id)}>View full details <span>→</span></button></article>)}</div>
        <div className="combined-trip"><div><span>SELECTED REQUESTS</span><strong>{selected.length}</strong></div><div><span>TOTAL PASSENGERS</span><strong>{totalPassengers}</strong></div><div><span>EARLIEST DEPARTURE</span><strong>{candidates.find(item => selected.includes(item.id))?.time ?? "—"}</strong></div></div>
      </section>

      {focused && <section className="panel trip-detail-panel"><div className="trip-detail-title"><div><p className="eyebrow">FULL REQUEST DETAILS</p><h2>{focused.route}</h2><p>{focused.id} · Submitted by {focused.person}</p></div><Status tone={focused.tone}>{focused.status}</Status></div>
        <div className="trip-detail-grid"><div><span>Base office</span><strong>{officeForRequest(focused)}</strong></div><div><span>Departure</span><strong>{focused.date} · {focused.time}</strong></div><div><span>Expected return</span><strong>{focused.date} · 19:00</strong></div><div><span>Request type</span><strong>Field / Inter-office</strong></div><div><span>Budget code</span><strong>{focused.budget}</strong></div><div><span>Notice period</span><strong className="detail-ok">✓ Policy met</strong></div></div>
        <div className="detail-split"><article><span className="detail-label">BUSINESS PURPOSE</span><p>{focused.purpose ?? "Procurement-related works, staff capacity building and programme coordination at the destination office."}</p></article><article><span className="detail-label">REQUESTER CONTACT</span><p><strong>{focused.person}</strong><br/>{focused.person.toLowerCase().replaceAll(" ",".")}@chrysalis.lk · +94 77 245 1180</p></article></div>
        <div className="passenger-detail"><div className="detail-section-head"><div><h3>Passenger manifest</h3><p>{passengerCount(focused.id)} confirmed traveller{passengerCount(focused.id) === 1 ? "" : "s"}</p></div><button className="secondary" onClick={printManifest}>Download manifest</button></div><div className="manifest-list">{[focused.person,...(passengerCount(focused.id) > 1 ? ["Keerthi Indrajith"] : []),...(passengerCount(focused.id) > 2 ? ["Amali Perera"] : [])].map((name,index)=><div key={name}><span className={`avatar tiny ${index % 2 ? "blue" : "pink"}`}>{name.split(" ").map(word=>word[0]).slice(0,2).join("")}</span><span><strong>{name}</strong><small>{index === 0 ? "Primary requester" : "Staff passenger"} · +94 77 245 11{80 + index}</small></span><b>{index === 0 ? "Lead" : "Confirmed"}</b></div>)}</div></div>
        <div className="approval-audit"><div className="detail-section-head"><div><h3>Approval & audit path</h3><p>Decision trail for this request</p></div></div><div className="audit-steps"><div className="done"><i>✓</i><span><strong>Request submitted</strong><small>{focused.person} · 14 Aug, 09:12</small></span></div><b/><div className={focused.status === "Awaiting approval" ? "current" : "done"}><i>{focused.status === "Awaiting approval" ? "2" : "✓"}</i><span><strong>Budget approval</strong><small>Nadeesha Fernando · {focused.status === "Awaiting approval" ? "Pending" : "Approved"}</small></span></div><b/><div><i>3</i><span><strong>Area admin allocation</strong><small>Vehicle and driver assignment</small></span></div></div></div>
      </section>}
    </div>

    <aside className="panel fleet-panel expanded-fleet"><div className="panel-head"><div><h2>Trip setup</h2><p>Complete operational allocation</p></div><span className="edit-live"><i/> LIVE</span></div>
      <label><span>Vehicle *</span><select value={vehicle} onChange={event => setVehicle(event.target.value)}><option value="" disabled>Select vehicle</option><option>CP CAB-1842 · Toyota HiAce · 9 seats</option><option>WP KV-7712 · Nissan Caravan · 12 seats</option><option>SP CAD-5521 · Toyota KDH · 8 seats</option></select></label>
      <label><span>Driver *</span><select value={driver} onChange={event => setDriver(event.target.value)}><option value="" disabled>Select driver</option><option>Sunil Rathnayake · +94 77 318 4402</option><option>Mohamed Irfan · +94 76 552 0911</option><option>Chamara Silva · +94 71 884 2106</option></select></label>
      <label><span>Area Administrator</span><input value={coordinator} onChange={event => setCoordinator(event.target.value)} /></label>
      <label><span>Pickup instructions</span><textarea value={pickup} onChange={event => setPickup(event.target.value)} /></label>
      <label><span>Admin notes</span><textarea placeholder="Special requirements, route risks, accommodation or coordination notes" value={adminNotes} onChange={event => setAdminNotes(event.target.value)} /></label>
      <div className="capacity"><span>Passenger capacity</span><div><i style={{width:`${Math.min(totalPassengers * 11,100)}%`}}/></div><p>{totalPassengers} of {vehicle.includes("12 seats") ? 12 : vehicle.includes("8 seats") ? 8 : 9} passenger seats selected</p></div>
      {standaloneMode && <div className="demo-note"><span>i</span><p><strong>Standalone mode</strong> — allocate a vehicle and driver without linking a request.</p></div>}
      <div className="setup-checks"><p className={vehicle ? "done" : ""}><span>{vehicle ? "✓" : "1"}</span>Vehicle confirmed</p><p className={driver ? "done" : ""}><span>{driver ? "✓" : "2"}</span>Driver confirmed</p><p className={selected.length >= 1 || standaloneMode ? "done" : ""}><span>{selected.length >= 1 || standaloneMode ? "✓" : "3"}</span>{standaloneMode?"Standalone trip enabled":"Request selected"}</p></div>
      {merged ? <div className="success-banner"><span>✓</span><div><strong>{standaloneMode?"Standalone trip":"Operational trip"} created</strong><p>Allocation and admin notes were saved.</p></div></div> : <button className="primary wide create-trip-button" disabled={(!selected.length && !standaloneMode) || !vehicle || !driver} onClick={createTrip}>Create {standaloneMode?"standalone":"operational"} trip <span>→</span></button>}
      <section className={`trip-closure ${canCloseTrip ? "ready" : ""}`}><div className="closure-head"><span>↙</span><div><strong>Return details & close trip</strong><p>After the vehicle returns, enter actual mileage and actual trip cost to complete the trip.</p></div></div>{canCloseTrip && (closed ? <div className="closure-success"><span>✓</span><div><strong>Actual mileage and cost saved to reports</strong><p>{mileage} km · LKR {Number(finalPrice).toLocaleString()} · {completedAt}</p></div></div> : <form onSubmit={closeTrip}><div className="closure-grid"><label><span>Actual mileage (km) *</span><input type="number" min="1" value={mileage} onChange={event => setMileage(event.target.value)} required /></label><label><span>Actual trip cost (LKR) *</span><input type="number" min="0" value={finalPrice} onChange={event => setFinalPrice(event.target.value)} required /></label><label><span>Completion date *</span><input type="date" value={completedAt} onChange={event => setCompletedAt(event.target.value)} required /></label><label><span>Receipt / voucher reference</span><input value={receiptRef} placeholder="PV-2026-0081" onChange={event => setReceiptRef(event.target.value)} /></label></div><label><span>Completion notes</span><textarea value={completionNotes} placeholder="Journey completed safely, delays, route changes or vehicle observations" onChange={event => setCompletionNotes(event.target.value)} /></label><button className="close-trip-button" type="submit">✓ Save actuals & complete trip</button></form>)}</section>
    </aside></div>
  </>; 
}

function TripCalendar({ requests, currentUser, approvedOnly = false, onNew }: { requests: RequestItem[]; currentUser: string; approvedOnly?: boolean; onNew: () => void }) {
  type CalendarEvent = { id: string; owner: string; route: string; day: number; time: string; end: string; office: string; status: string; tone: string; passengers: number; purpose: string };
  const personInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();
  const [showMine,setShowMine] = useState(true);
  const [showTeam,setShowTeam] = useState(true);
  const [mode,setMode] = useState<"week"|"schedule">("week");
  const [selectedId,setSelectedId] = useState<string | null>(null);
  const [weekOffset,setWeekOffset] = useState(0);
  const [monthOffset,setMonthOffset] = useState(0);
  const [selectedMiniDate,setSelectedMiniDate] = useState(17);
  const weekStart = new Date(2026,7,17 + weekOffset * 7);
  const days = Array.from({length:5},(_,index)=>{const date=new Date(weekStart);date.setDate(weekStart.getDate()+index);return {name:date.toLocaleDateString("en-US",{weekday:"short"}).toUpperCase(),date:date.getDate()};});
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+4);
  const weekLabel = `${weekStart.getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString("en-US",{month:"long",year:"numeric"})}`;
  const miniMonth = new Date(2026,7+monthOffset,1).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const hours = Array.from({length:13},(_,index)=>index+6);
  const requestEvents: CalendarEvent[] = requests.map((item,index) => ({id:item.id,owner:item.person,route:item.route,day:Number.parseInt(item.date,10)-17,time:item.time,end:`${String(Math.min(Number.parseInt(item.time,10)+3,19)).padStart(2,"0")}:00`,office:officeForRequest(item),status:item.status,tone:item.tone,passengers:index % 3 + 1,purpose:item.purpose ?? "Field visit and programme coordination"})).filter(item => item.day >= 0 && item.day < 5);
  const teamEvents: CalendarEvent[] = [
    {id:"CAL-201",owner:"Nadeesha Fernando",route:"Colombo → Kandy",day:1,time:"08:30",end:"12:30",office:"Head Office",status:"Trip scheduled",tone:"blue",passengers:4,purpose:"Partner review meeting and programme monitoring"},
    {id:"CAL-202",owner:"M. F. Ameen",route:"Batticaloa → Ampara",day:1,time:"13:00",end:"17:00",office:"Batticaloa Area Office",status:"Approved",tone:"green",passengers:3,purpose:"Community consultation and field monitoring"},
    {id:"CAL-203",owner:"Dilan Jayawardena",route:"Colombo → Kurunegala",day:2,time:"07:30",end:"14:00",office:"Head Office",status:"Trip scheduled",tone:"blue",passengers:5,purpose:"Regional training programme"},
    {id:"CAL-204",owner:"Amali Perera",route:"Galle → Matara",day:3,time:"09:00",end:"12:00",office:"Galle Area Office",status:"Awaiting approval",tone:"amber",passengers:2,purpose:"Finance document collection"},
    {id:"CAL-205",owner:"Keerthi Indrajith",route:"Colombo → Negombo",day:3,time:"14:30",end:"17:30",office:"Head Office",status:"Approved",tone:"green",passengers:3,purpose:"Supplier coordination meeting"},
    {id:"CAL-206",owner:"Thirumarugan R.",route:"Batticaloa → Trincomalee",day:4,time:"08:00",end:"16:00",office:"Batticaloa Area Office",status:"Trip scheduled",tone:"blue",passengers:4,purpose:"Staff capacity-building workshop"},
  ];
  const allEvents = [...requestEvents,...teamEvents.filter(team => !requestEvents.some(request => request.id === team.id))];
  const statusEvents = approvedOnly ? allEvents.filter(item => item.status === "Approved" || item.status === "Trip scheduled") : allEvents;
  const calendarEvents = weekOffset === 0 ? statusEvents : [];
  const visibleEvents = calendarEvents.filter(item => (item.owner === currentUser && showMine) || (item.owner !== currentUser && showTeam));
  const selected = calendarEvents.find(item => item.id === selectedId) ?? null;
  const eventTop = (time: string) => { const [hour,minute] = time.split(":").map(Number); return ((hour-6)*60+minute)/60*54; };
  const eventHeight = (start: string,end: string) => { const [sh,sm]=start.split(":").map(Number); const [eh,em]=end.split(":").map(Number); return Math.max(40,((eh*60+em)-(sh*60+sm))/60*54); };

  return <><PageTitle eyebrow="SHARED MOBILITY CALENDAR" title="Trips calendar" subtitle="See your journeys and the wider team schedule in a familiar Outlook-style calendar." action={<button className="primary" onClick={onNew}>＋ New vehicle request</button>} />
    <div className="calendar-shell"><aside className="panel calendar-sidebar"><button className="calendar-new" onClick={onNew}>＋ New request</button><div className="mini-calendar"><div><button aria-label="Previous month" onClick={()=>setMonthOffset(value=>value-1)}>‹</button><strong>{miniMonth}</strong><button aria-label="Next month" onClick={()=>setMonthOffset(value=>value+1)}>›</button></div><div className="mini-weekdays">{["M","T","W","T","F","S","S"].map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div><div className="mini-days">{Array.from({length:35},(_,index)=>{const date=index-4;return <button key={index} onClick={()=>{if(date>0&&date<=31){setSelectedMiniDate(date);announce(`Calendar date ${date} ${miniMonth} selected.`)}}} className={date===selectedMiniDate?"today":date<1||date>31?"muted":""}>{date>0&&date<=31?date:""}</button>})}</div></div><div className="calendar-lists"><p>MY CALENDARS</p><label><input type="checkbox" checked={showMine} onChange={event=>setShowMine(event.target.checked)}/><i className="mine"/><span>My trips</span><b>{calendarEvents.filter(item=>item.owner===currentUser).length}</b></label><label><input type="checkbox" checked={showTeam} onChange={event=>setShowTeam(event.target.checked)}/><i className="team"/><span>Team trips</span><b>{calendarEvents.filter(item=>item.owner!==currentUser).length}</b></label></div><div className="calendar-legend"><p>STATUS</p><span><i className="green"/>Approved</span><span><i className="blue"/>Scheduled</span>{!approvedOnly && <span><i className="amber"/>Awaiting approval</span>}</div><div className="calendar-tip"><span>i</span><p>{approvedOnly ? "Only approved and scheduled journeys are shown to requesters." : "Team calendars show journey timing and coordination details without exposing budget information."}</p></div></aside>
      <section className="panel calendar-main"><div className="calendar-toolbar"><div><button onClick={()=>{setWeekOffset(0);setSelectedId(null)}}>Today</button><button aria-label="Previous week" onClick={()=>{setWeekOffset(value=>value-1);setSelectedId(null)}}>‹</button><button aria-label="Next week" onClick={()=>{setWeekOffset(value=>value+1);setSelectedId(null)}}>›</button><h2>{weekLabel}</h2></div><div className="calendar-view-switch"><button className={mode==="week"?"active":""} onClick={()=>setMode("week")}>Work week</button><button className={mode==="schedule"?"active":""} onClick={()=>setMode("schedule")}>Schedule</button></div></div>
        {mode === "week" ? <div className="week-calendar"><div className="week-header"><span/><>{days.map(day=><div key={day.date} className={day.date===17?"today":""}><small>{day.name}</small><strong>{day.date}</strong></div>)}</></div><div className="week-body"><div className="time-axis">{hours.map(hour=><span key={hour}>{String(hour).padStart(2,"0")}:00</span>)}</div>{days.map((day,dayIndex)=><div className={`day-column ${day.date===17?"today":""}`} key={day.date}>{hours.map(hour=><i key={hour}/>)}{visibleEvents.filter(item=>item.day===dayIndex).map(event=><button key={event.id} className={`calendar-event ${event.owner===currentUser?"mine":"team"} ${event.tone}`} style={{top:eventTop(event.time),height:eventHeight(event.time,event.end)}} onClick={()=>setSelectedId(event.id)}><span>{event.time}–{event.end}</span><strong>{event.route}</strong><small>{event.owner===currentUser?"My trip":event.owner}</small></button>)}</div>)}</div></div> : <div className="schedule-view">{days.map((day,dayIndex)=><section key={day.date}><div className="schedule-date"><strong>{day.date}</strong><span>{day.name}<small>AUGUST</small></span></div><div>{visibleEvents.filter(item=>item.day===dayIndex).length ? visibleEvents.filter(item=>item.day===dayIndex).map(event=><button key={event.id} onClick={()=>setSelectedId(event.id)}><time>{event.time}</time><i className={event.owner===currentUser?"mine":"team"}/><span><strong>{event.route}</strong><small>{event.owner} · {event.passengers} passengers · {event.office}</small></span><Status tone={event.tone}>{event.status}</Status></button>) : <p>No trips scheduled</p>}</div></section>)}</div>}
        {selected && <div className="trip-modal-backdrop">
          <section className="trip-modal" role="dialog" aria-modal="true" aria-labelledby="trip-modal-title">
            <button className="trip-modal-close" aria-label="Close trip details" onClick={()=>setSelectedId(null)}>×</button>
            <header className="trip-modal-header">
              <div className="trip-modal-date"><span>{days[selected.day].name}</span><strong>{days[selected.day].date}</strong><small>AUG 2026</small></div>
              <div><p>SHARED TRIP REQUEST</p><h2 id="trip-modal-title">{selected.route}</h2><span>Visible to the wider team for journey coordination</span></div>
              <Status tone={selected.tone}>{selected.status}</Status>
            </header>
            <div className="trip-route-visual"><i/><div><small>DEPARTURE</small><strong>{selected.route.split(" → ")[0]}</strong></div><span>→</span><div><small>DESTINATION</small><strong>{selected.route.split(" → ")[1] ?? selected.route}</strong></div></div>
            <div className="trip-modal-facts">
              <div><small>DEPARTURE TIME</small><strong>{selected.time}</strong><span>{days[selected.day].name}, {days[selected.day].date} August</span></div>
              <div><small>EXPECTED RETURN</small><strong>{selected.end}</strong><span>Same day</span></div>
              <div><small>BASE OFFICE</small><strong>{selected.office}</strong><span>Coordinating office</span></div>
              <div><small>REQUEST REFERENCE</small><strong>{selected.id}</strong><span>Approved travel request</span></div>
            </div>
            <div className="trip-modal-sections">
              <article><small>TRIP PURPOSE</small><h3>{selected.purpose}</h3><p>Use this information to confirm whether your journey can be coordinated with this trip.</p></article>
              <article><small>COORDINATION CONTACT</small><h3>{selected.owner}{selected.owner===currentUser?" (You)":""}</h3><p>Primary requester and coordination contact for this journey.</p></article>
            </div>
            <section className="trip-modal-passengers">
              <div><small>PEOPLE TRAVELLING</small><strong>{selected.passengers} {selected.passengers===1?"person":"people"}</strong></div>
              <div className="trip-people-list">{[selected.owner,...["Keerthi Indrajith","Amali Perera","Dilan Jayawardena","Nadeesha Fernando"].filter(name=>name!==selected.owner).slice(0,Math.max(0,selected.passengers-1))].map((name,index)=><div key={`${selected.id}-${name}`}><span>{personInitials(name)}</span><p><strong>{name}{name===currentUser?" (You)":""}</strong><small>{index===0?"Requester / traveller":"Passenger"}</small></p></div>)}</div>
            </section>
            <footer className="trip-modal-footer"><p><strong>Shared operational information</strong><span>Journey details are visible to team users. Budget and financial details remain private.</span></p><button className="secondary" onClick={()=>setSelectedId(null)}>Done</button></footer>
          </section>
        </div>}
      </section></div>
  </>;
}

function Reports({ requests, office, offices, canViewAll }: { requests: RequestItem[]; office: string; offices: string[]; canViewAll: boolean }) {
  const [officeFilter, setOfficeFilter] = useState(canViewAll ? "All offices" : office);
  const [period,setPeriod] = useState<"month"|"last"|"custom">("month");
  const [statusFilter,setStatusFilter] = useState("All statuses");
  const officeRequests = officeFilter === "All offices" ? requests : requests.filter(item => officeForRequest(item) === officeFilter);
  const scopedRequests = statusFilter === "All statuses" ? officeRequests : officeRequests.filter(item=>item.status===statusFilter);
  const approved = scopedRequests.filter(item => item.status === "Approved" || item.status === "Completed").length;
  const scheduled = scopedRequests.filter(item => item.status === "Trip scheduled").length;
  const attention = scopedRequests.filter(item => item.status === "Awaiting approval" || item.status === "Needs revision").length;
  const completedTrips = scopedRequests.filter(item => item.status === "Completed");
  const totalMileage = completedTrips.reduce((total,item) => total + (item.mileageKm ?? 0),0);
  const totalPrice = completedTrips.reduce((total,item) => total + (item.finalPriceLkr ?? 0),0);
  const completionRate = scopedRequests.length ? Math.round(((approved + scheduled) / scopedRequests.length) * 100) : 0;
  const exportReport = () => {
    const rows = [["Trip","Request","Office","Route","Completed","Mileage (km)","Actual trip cost (LKR)","Receipt","Status"],...completedTrips.map(item => [item.tripId ?? "—",item.id,officeForRequest(item),item.route,item.completedAt ?? "—",String(item.mileageKm ?? 0),String(item.finalPriceLkr ?? 0),item.receiptRef ?? "—",item.status])];
    downloadCsv(`chrysalis-trip-report-${officeFilter.toLowerCase().replaceAll(" ","-")}.csv`,rows);
    announce("Completed-trip report downloaded.");
  };
  return <><PageTitle eyebrow="MANAGEMENT INFORMATION" title="Reports & status" subtitle={canViewAll ? "Colombo administration overview across every office." : `Restricted to ${office} records only.`} action={<button className="primary" onClick={exportReport}>Export completed trips <span>↓</span></button>} />
    <section className={`scope-notice ${canViewAll ? "all-scope" : ""}`}><span>{canViewAll ? "◎" : "⌂"}</span><div><strong>{canViewAll ? "All-office access" : "Office-restricted access"}</strong><p>{canViewAll ? "Colombo Head Office Admin can review all branches or narrow the report to one office." : `You can only view requests, status and reports belonging to ${office}.`}</p></div><b>{canViewAll ? "COLOMBO ADMIN" : office.toUpperCase()}</b></section>
    <div className="report-toolbar"><div className="filter-group"><button className={`filter ${period==="month"?"active":""}`} onClick={()=>setPeriod("month")}>This month</button><button className={`filter ${period==="last"?"active":""}`} onClick={()=>setPeriod("last")}>Last month</button><button className={`filter ${period==="custom"?"active":""}`} onClick={()=>{setPeriod("custom");announce("Custom reporting period enabled for the visible register.")}}>Custom</button></div><div><select aria-label="Report office" value={officeFilter} disabled={!canViewAll} onChange={event => setOfficeFilter(event.target.value)}>{canViewAll && <option>All offices</option>}{offices.map(item=><option key={item}>{item}</option>)}</select><select aria-label="Report status" value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option>All statuses</option>{requestStatuses.map(status => <option key={status}>{status}</option>)}</select></div></div>
    <section className="metric-grid reports"><article className="metric-card"><span>Total requests</span><strong>{scopedRequests.length}</strong><p>Within the permitted office scope</p></article><article className="metric-card"><span>Completed trips</span><strong>{completedTrips.length}</strong><p><b className="up">Closed by Admin</b></p></article><article className="metric-card"><span>Total mileage</span><strong>{totalMileage.toLocaleString()} <small>km</small></strong><p>Actual completed-trip mileage</p></article><article className="metric-card"><span>Actual trip cost</span><strong><small>LKR</small> {totalPrice.toLocaleString()}</strong><p>Actual cost entered after vehicle return</p></article></section>
    <div className="reports-grid"><article className="panel chart-panel"><div className="panel-head"><div><h2>Request status picture</h2><p>{officeFilter} · visible records only</p></div><div className="legend"><span><i className="pink-dot"/>Requests</span><span><i className="navy-dot"/>Progress</span></div></div><div className="chart"><div className="axis"><span>100%</span><span>66%</span><span>33%</span><span>0</span></div>{[["Pending",attention],["Approved",approved],["Scheduled",scheduled],["Completed",completedTrips.length]].map(([label,value],index)=><div className="bar-group" key={String(label)}><div><i style={{height:`${Math.max(8,Number(value) * 22)}%`}}/><b style={{height:`${Math.max(5,(Number(value)+index) * 15)}%`}}/></div><span>{label}</span></div>)}</div></article><article className="panel efficiency-panel"><div className="panel-head"><div><h2>Workflow progress</h2><p>Approved and scheduled share</p></div></div><div className="donut" style={{background:`conic-gradient(var(--pink) 0 ${completionRate}%,#edf0f3 ${completionRate}% 100%)`}}><div><strong>{completionRate}%</strong><span>progress</span></div></div><div className="efficiency-stats"><p><span>Visible requests</span><strong>{scopedRequests.length}</strong></p><p><span>Needs attention</span><strong>{attention}</strong></p><p><span>Completed</span><strong>{completedTrips.length}</strong></p></div></article></div>
    <article className="panel report-table"><div className="panel-head"><div><h2>Completed trip financial register</h2><p>Actual mileage and trip cost entered after vehicle return.</p></div><button className="secondary" onClick={exportReport}>Download Excel-ready CSV</button></div><div className="table-scroll"><table><thead><tr><th>Trip</th><th>Request</th><th>Office / route</th><th>Completed</th><th>Mileage</th><th>Actual cost</th><th>Receipt</th></tr></thead><tbody>{completedTrips.length ? completedTrips.map(item=><tr key={item.id}><td><strong>{item.tripId ?? "—"}</strong></td><td>{item.id}<small>{item.person}</small></td><td>{officeForRequest(item)}<small>{item.route}</small></td><td>{item.completedAt ?? "—"}</td><td><strong>{(item.mileageKm ?? 0).toLocaleString()} km</strong></td><td><strong>LKR {(item.finalPriceLkr ?? 0).toLocaleString()}</strong></td><td>{item.receiptRef ?? "—"}</td></tr>) : <tr><td colSpan={7}><div className="report-empty"><strong>No completed trips yet</strong><span>Complete a scheduled trip from Trip Planning to add actual mileage and cost here.</span></div></td></tr>}</tbody></table></div></article>
  </>;
}

function RootSettings({ users, requests, offices, onAddUser, onAddOffice, onUpdateUser, onUpdateRequest }: {
  users: UserRecord[];
  requests: RequestItem[];
  offices: string[];
  onAddUser: (user: UserRecord) => void;
  onAddOffice: (office: string) => void;
  onUpdateUser: (id: string, patch: Partial<UserRecord>) => void;
  onUpdateRequest: (id: string, patch: Partial<RequestItem>) => void;
}) {
  const [tab, setTab] = useState<AdminTab>("people");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("user");
  const [newOffice, setNewOffice] = useState("Head Office");
  const [officeName,setOfficeName] = useState("");
  const visibleUsers = users.filter(user => `${user.name} ${user.email} ${roleConfig[user.role].label}`.toLowerCase().includes(search.toLowerCase()));
  const managers = users.filter(user => user.role === "project_manager" && user.active);
  const directors = users.filter(user => user.role === "project_director" && user.active);

  const addPerson = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAddUser({ id: `USR-${String(Date.now()).slice(-6)}`, name: newName.trim(), email: newEmail.trim(), role: newRole, office: newOffice, active: true });
    setNewName(""); setNewEmail(""); setNewRole("user"); setShowAdd(false);
  };
  const addOffice = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const name=officeName.trim(); if (!name) return; onAddOffice(name); setOfficeName(""); };

  return <>
    <PageTitle eyebrow="ROOT SYSTEM ADMINISTRATION" title="People, access & request control" subtitle="Super Admin has full authority across users, approval routing and every vehicle request." action={<span className="root-badge">ROOT ACCESS</span>} />
    <section className="root-access-banner"><span>✦</span><div><strong>Full system control enabled</strong><p>Add any account type, change access levels, manage approval routing and correct any request record.</p></div><small>SUPER ADMIN ONLY</small></section>
    <div className="admin-tabs" role="tablist" aria-label="Administration sections">
      <button role="tab" aria-selected={tab === "people"} className={tab === "people" ? "active" : ""} onClick={() => setTab("people")}>People & access <b>{users.length}</b></button>
      <button role="tab" aria-selected={tab === "routing"} className={tab === "routing" ? "active" : ""} onClick={() => setTab("routing")}>Approval routing</button>
      <button role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>All requests <b>{requests.length}</b></button>
    </div>

    {tab === "people" && <section className="panel root-panel">
      <div className="panel-head admin-panel-head"><div><h2>Organisation users</h2><p>Manage Requesters, Project Managers, Project Directors, Admins and Super Admins.</p></div><div className="admin-head-actions"><label className="search"><span>⌕</span><input aria-label="Search all users" placeholder="Search people" value={search} onChange={event => setSearch(event.target.value)} /></label><button className="primary" onClick={() => setShowAdd(value => !value)}>＋ Add person</button></div></div>
      {showAdd && <form className="add-person-form" onSubmit={addPerson}><label><span>Full name</span><input value={newName} onChange={event => setNewName(event.target.value)} required /></label><label><span>Work email</span><input type="email" value={newEmail} onChange={event => setNewEmail(event.target.value)} required /></label><label><span>Access role</span><select value={newRole} onChange={event => setNewRole(event.target.value as Role)}>{editableRoles.map(item => <option key={item} value={item}>{roleConfig[item].label}</option>)}</select></label><label><span>Office</span><select value={newOffice} onChange={event => setNewOffice(event.target.value)}>{offices.map(item=><option key={item}>{item}</option>)}</select></label><button className="primary" type="submit">Create account</button><button className="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</button></form>}
      <div className="user-directory"><div className="directory-head"><span>Person</span><span>Access role</span><span>Office</span><span>Status</span></div>{visibleUsers.map((user,index) => <div className="directory-row" key={user.id}><div className="directory-person"><span className={`avatar ${index % 2 ? "blue" : "pink"}`}>{user.name.split(" ").map(word => word[0]).slice(0,2).join("")}</span><span><strong>{user.name}</strong><small>{user.email} · {user.id}</small></span></div><select aria-label={`Role for ${user.name}`} value={user.role} disabled={user.protected} onChange={event => onUpdateUser(user.id,{role:event.target.value as Role})}>{editableRoles.map(item => <option key={item} value={item}>{roleConfig[item].label}</option>)}</select><select aria-label={`Office for ${user.name}`} value={user.office} onChange={event => onUpdateUser(user.id,{office:event.target.value})}>{offices.map(item=><option key={item}>{item}</option>)}</select><div className="directory-status">{user.protected ? <span className="root-owner">Root owner</span> : <button className={`access-switch ${user.active ? "active" : ""}`} onClick={() => onUpdateUser(user.id,{active:!user.active})}><i />{user.active ? "Active" : "Disabled"}</button>}</div></div>)}</div>
      <section className="office-management"><div><p className="eyebrow">OFFICE MANAGEMENT</p><h3>Organisation offices</h3><p>Add an office once and use it across users, requests, Admin scope and reports.</p></div><form onSubmit={addOffice}><label><span>New office name</span><input value={officeName} onChange={event=>setOfficeName(event.target.value)} placeholder="Example: Jaffna Area Office" required /></label><button className="primary" type="submit">＋ Add office</button></form><div className="office-chip-list">{offices.map((item,index)=><span key={item}><b>{index+1}</b>{item}</span>)}</div></section>
    </section>}

    {tab === "routing" && <div className="routing-root-grid"><section className="panel root-panel"><div className="panel-head"><div><h2>Project Managers</h2><p>First-level budget approval accounts</p></div><Status tone="green">{managers.length} active</Status></div>{managers.map(user => <div className="person-row" key={user.id}><span className="avatar pink">{user.name.split(" ").map(word=>word[0]).slice(0,2).join("")}</span><div><strong>{user.name}</strong><p>{user.email} · {user.office}</p></div><Status tone="green">Active</Status></div>)}</section><section className="panel root-panel"><div className="panel-head"><div><h2>Project Directors</h2><p>Final approval and oversight accounts</p></div><Status tone="blue">{directors.length} active</Status></div>{directors.map(user => <div className="person-row" key={user.id}><span className="avatar blue">{user.name.split(" ").map(word=>word[0]).slice(0,2).join("")}</span><div><strong>{user.name}</strong><p>{user.email} · {user.office}</p></div><Status tone="green">Active</Status></div>)}</section><section className="panel routing-map-full"><div className="panel-head"><div><h2>Approval chain mapping</h2><p>Each Project Manager routes to a Project Director for final approval.</p></div></div>{managers.map((manager,index) => <div className="mapping" key={manager.id}><span><small>PROJECT MANAGER</small><strong>{manager.name}</strong></span><i>→</i><span><small>PROJECT DIRECTOR</small><select aria-label={`Director for ${manager.name}`} defaultValue={directors[index % Math.max(directors.length,1)]?.id}>{directors.map(director => <option key={director.id} value={director.id}>{director.name}</option>)}</select></span></div>)}</section></div>}

{tab === "requests" && <section className="panel root-panel request-control-panel"><div className="panel-head"><div><h2>Root request register</h2><p>Edit every field and workflow status. Changes are saved immediately on this device.</p></div><span className="edit-live"><i /> LIVE EDIT</span></div><div className="root-request-list">{requests.map(item => <article className="root-request-card" key={item.id}><div className="root-request-id"><strong>{item.id}</strong><Status tone={item.tone}>{item.status}</Status></div><div className="root-request-fields"><label><span>Requester</span><input value={item.person} onChange={event => onUpdateRequest(item.id,{person:event.target.value})} /></label><label><span>Route</span><input value={item.route} onChange={event => onUpdateRequest(item.id,{route:event.target.value})} /></label><label><span>Travel date</span><input value={item.date} onChange={event => onUpdateRequest(item.id,{date:event.target.value})} /></label><label><span>Departure</span><input type="time" value={item.time} onChange={event => onUpdateRequest(item.id,{time:event.target.value})} /></label><label><span>Budget code</span><input value={item.budget} onChange={event => onUpdateRequest(item.id,{budget:event.target.value})} /></label><label><span>Office access scope</span><select value={officeForRequest(item)} onChange={event => onUpdateRequest(item.id,{office:event.target.value})}>{offices.map(office=><option key={office}>{office}</option>)}</select></label><label><span>Workflow status</span><select value={item.status} onChange={event => onUpdateRequest(item.id,{status:event.target.value,tone:toneForStatus(event.target.value)})}>{requestStatuses.map(status => <option key={status}>{status}</option>)}</select></label><label className="request-purpose-edit"><span>Purpose / admin note</span><input value={item.purpose ?? ""} placeholder="Add purpose or correction note" onChange={event => onUpdateRequest(item.id,{purpose:event.target.value})} /></label></div></article>)}</div></section>}
  </>;
}

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [offices,setOffices] = useState(initialOffices);
  const [adminOffice, setAdminOffice] = useState("Head Office");
  const [searchOpen,setSearchOpen] = useState(false);
  const [notificationsOpen,setNotificationsOpen] = useState(false);
  const [searchQuery,setSearchQuery] = useState("");
  const [notice,setNotice] = useState("");

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const savedRole = window.localStorage.getItem("chrysalis-role") as Role | null;
      const savedRequests = window.localStorage.getItem("chrysalis-requests");
      const savedUsers = window.localStorage.getItem("chrysalis-users");
      const savedOffices = window.localStorage.getItem("chrysalis-offices");
      const savedAdminOffice = window.localStorage.getItem("chrysalis-admin-office");
      if (savedRole && roleConfig[savedRole]) { setRole(savedRole); setView(roleConfig[savedRole].startView); }
      if (savedRequests) { try { setRequests((JSON.parse(savedRequests) as RequestItem[]).map(item => ({ ...item, office: officeForRequest(item) }))); } catch { window.localStorage.removeItem("chrysalis-requests"); } }
      if (savedUsers) { try { setUsers(JSON.parse(savedUsers) as UserRecord[]); } catch { window.localStorage.removeItem("chrysalis-users"); } }
      if (savedOffices) { try { const parsed=JSON.parse(savedOffices) as string[]; if (parsed.length) setOffices(parsed); } catch { window.localStorage.removeItem("chrysalis-offices"); } }
      if (savedAdminOffice) setAdminOffice(savedAdminOffice);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => { window.localStorage.setItem("chrysalis-requests", JSON.stringify(requests)); }, [requests]);
  useEffect(() => { window.localStorage.setItem("chrysalis-users", JSON.stringify(users)); }, [users]);
  useEffect(() => { window.localStorage.setItem("chrysalis-offices", JSON.stringify(offices)); }, [offices]);
  useEffect(() => {
    const showNotice = (event: Event) => { const message=(event as CustomEvent<string>).detail; setNotice(message); window.setTimeout(()=>setNotice(""),3200); };
    window.addEventListener("chrysalis:notice",showNotice);
    return () => window.removeEventListener("chrysalis:notice",showNotice);
  },[]);

  const login = (nextRole: Role, selectedAdminOffice = "Head Office") => {
    setRole(nextRole);
    setView(roleConfig[nextRole].startView);
    window.localStorage.setItem("chrysalis-role", nextRole);
    if (nextRole === "admin") { setAdminOffice(selectedAdminOffice); window.localStorage.setItem("chrysalis-admin-office", selectedAdminOffice); }
  };

  const logout = () => {
    setRole(null);
    setSidebarOpen(false);
    window.localStorage.removeItem("chrysalis-role");
  };

  const updateStatus = (id: string, status: string, tone: string) => setRequests(items => items.map(item => item.id === id ? { ...item, status, tone } : item));
  const updateRequest = (id: string, patch: Partial<RequestItem>) => setRequests(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  const createRequest = (request: RequestItem) => setRequests(items => [request, ...items]);
  const addUser = (user: UserRecord) => setUsers(items => [user, ...items]);
  const addOffice = (office: string) => setOffices(items => { if (items.some(item=>item.toLowerCase()===office.toLowerCase())) { announce("That office already exists."); return items; } announce(`${office} added to the organisation.`); return [...items,office]; });
  const updateUser = (id: string, patch: Partial<UserRecord>) => setUsers(items => items.map(item => item.id === id ? { ...item, ...patch } : item));

  const activeLabel = useMemo(() => navItems.find(item => item.id === view)?.label, [view]);
  if (!role) return <Login onLogin={login} offices={offices} />;

  const account = roleConfig[role];
  const allowedNav = navItems.filter(item => account.views.includes(item.id));
  const approvers = users.filter(user => user.active && (user.role === "project_manager" || user.role === "project_director"));
  const accountOffice = role === "admin" ? adminOffice : users.find(user => user.email === account.email)?.office ?? "Head Office";
  const canAccessReports = role === "admin" || role === "super_admin";
  const canViewAllOffices = role === "super_admin" || (role === "admin" && accountOffice === "Head Office");
  const visibleRequests = role === "admin" && !canViewAllOffices ? requests.filter(item => officeForRequest(item) === accountOffice) : requests;
  const navigate = (nextView: View) => { if (account.views.includes(nextView)) { setView(nextView); setSidebarOpen(false); setSearchOpen(false); } else if (nextView === "approvals" && account.views.includes("trips")) { setView("trips"); setSidebarOpen(false); setSearchOpen(false); announce("Admin operational request queue opened."); } else announce(`${account.label} does not have access to ${navItems.find(item=>item.id===nextView)?.label ?? "this section"}.`); };
  const content = view === "dashboard" ? <Dashboard requests={visibleRequests} onNew={() => navigate("request")} onNavigate={navigate} /> : view === "calendar" ? <TripCalendar requests={role === "admin" ? visibleRequests : requests} currentUser={account.name} approvedOnly={role === "user"} onNew={()=>navigate("request")}/> : view === "request" ? <RequestForm requester={account.name} approvers={approvers} offices={offices} onCreate={createRequest}/> : view === "approvals" ? <Approvals requests={requests} onStatus={updateStatus}/> : view === "trips" ? <TripPlanning requests={visibleRequests} onUpdateRequest={updateRequest}/> : view === "reports" && canAccessReports ? <Reports requests={role === "admin" ? visibleRequests : requests} office={accountOffice} offices={offices} canViewAll={canViewAllOffices}/> : view === "settings" && role === "super_admin" ? <RootSettings users={users} requests={requests} offices={offices} onAddUser={addUser} onAddOffice={addOffice} onUpdateUser={updateUser} onUpdateRequest={updateRequest}/> : <Dashboard requests={visibleRequests} onNew={() => navigate("request")} onNavigate={navigate} />;

  return <>
    <div className="app-shell"><aside className={`sidebar ${sidebarOpen?"open":""}`}><div className="brand"><div className="brand-mark"><i/><i/><i/><i/><i/></div><div><strong>chrysalis</strong><span>Mobility Operations</span></div></div><div className="role-badge"><span>{account.initials}</span><div><small>SIGNED IN AS</small><strong>{account.label}</strong>{role === "admin" && <small>{accountOffice}</small>}</div></div><nav aria-label="Primary navigation">{allowedNav.map(item=><button key={item.id} className={view===item.id?"active":""} onClick={()=>navigate(item.id)}><span>{item.short}</span>{item.label}{item.id==="approvals"&&<b>{requests.filter(request=>request.status==="Awaiting approval").length}</b>}</button>)}</nav><div className="sidebar-bottom"><button className="support-card" onClick={()=>announce("Operations guide opened. Choose a section from the sidebar to continue.")}><span>?</span><strong>Need help?</strong><p>Read the operations guide</p></button><button className="profile" onClick={logout} title="Sign out"><span className="avatar pink">{account.initials}</span><span><strong>{account.name}</strong><small>{account.label} · Sign out</small></span><i>↗</i></button></div></aside>{sidebarOpen&&<button className="overlay" aria-label="Close menu" onClick={()=>setSidebarOpen(false)}/>}<main><header className="topbar"><button className="mobile-menu" onClick={()=>setSidebarOpen(true)}>☰</button><p><span>Mobility Operations</span><b>/</b>{activeLabel}</p><div className="top-actions"><span className="header-role">{account.label}{role === "admin" ? ` · ${accountOffice}` : ""}</span><button aria-label="Search" onClick={()=>{setSearchOpen(true);setNotificationsOpen(false)}}>⌕</button><button aria-label="Notifications" className="notification" onClick={()=>{setNotificationsOpen(value=>!value);setSearchOpen(false)}}>○<i/></button><span className="top-date">14 AUG 2026</span></div></header><div className="content">{content}</div></main></div>
    {searchOpen && <div className="utility-backdrop"><section className="utility-dialog" role="dialog" aria-modal="true" aria-label="Search workspace"><header><h2>Search workspace</h2><button aria-label="Close search" onClick={()=>setSearchOpen(false)}>×</button></header><input placeholder="Search sections or requests" value={searchQuery} onChange={event=>setSearchQuery(event.target.value)}/><div className="utility-results">{allowedNav.filter(item=>item.label.toLowerCase().includes(searchQuery.toLowerCase())).map(item=><button key={item.id} onClick={()=>navigate(item.id)}><span>{item.short}</span><p><strong>{item.label}</strong><small>Open workspace section</small></p><b>→</b></button>)}{requests.filter(item=>`${item.id} ${item.person} ${item.route}`.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,5).map(item=><button key={item.id} onClick={()=>{navigate(account.views.includes("approvals")?"approvals":"calendar");announce(`${item.id} selected.`)}}><span>VR</span><p><strong>{item.id} · {item.route}</strong><small>{item.person} · {item.status}</small></p><b>→</b></button>)}</div></section></div>}
    {notificationsOpen && <aside className="notification-panel"><header><h2>Notifications</h2><button aria-label="Close notifications" onClick={()=>setNotificationsOpen(false)}>×</button></header><button onClick={()=>{navigate(account.views.includes("approvals")?"approvals":"calendar");setNotificationsOpen(false)}}><span className="notice-icon">!</span><p><strong>{requests.filter(item=>item.status==="Awaiting approval").length} requests awaiting approval</strong><small>Open the queue to review current requests.</small></p></button><button onClick={()=>{navigate("calendar");setNotificationsOpen(false)}}><span className="notice-icon blue">✓</span><p><strong>{requests.filter(item=>item.status==="Approved"||item.status==="Trip scheduled").length} journeys ready</strong><small>View approved and scheduled travel.</small></p></button></aside>}
    {notice && <div className="app-toast" role="status"><span>✓</span>{notice}<button aria-label="Dismiss message" onClick={()=>setNotice("")}>×</button></div>}
  </>;
}
