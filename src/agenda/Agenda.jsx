import growxLogo from "@/assets/logo-growx-oficial.png";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ListTodo, Plus, ChevronLeft, ChevronRight, Search, Download, LockKeyhole, CircleCheck, Clock3, AlertTriangle, RefreshCw, Trash2, RotateCcw, CalendarCheck, History, Check, X, Flag, Repeat2, Settings2, LogOut, WifiOff, ChevronDown } from "lucide-react";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { PEOPLE, PRODUCTS, AREAS, STATUS, PRIORITY, TYPES, blank, today, displayDate, addDays, occursOn, overlap, itemSchema, makeICS } from "./model";
const options = (o) => Object.entries(o).map(([value, label]) => ({ value, label }));
function Picker({ value, onChange, items, label }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="picker"><SelectValue placeholder={label} /></SelectTrigger><SelectContent position="popper">{items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select>;
}
function Avatar({ id, small = false }) {
  const p = PEOPLE.find((p2) => p2.id === id);
  return <span className={"avatar " + (small ? "small" : "")} title={p.name} style={{ background: p.color + "18", color: p.color }}>{p.initials}</span>;
}
function getWeek(date) {
  let wd = (/* @__PURE__ */ new Date(date + "T12:00Z")).getUTCDay();
  return addDays(date, -((wd + 6) % 7));
}
function sort(a, b) {
  return (a.date + (a.start || "00:00")).localeCompare(b.date + (b.start || "00:00")) || { high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority];
}
function hours(x) {
  if (x.estimatedMinutes) return x.estimatedMinutes / 60;
  if (!x.allDay) return Math.max(0, (Date.parse(x.endDate + "T" + x.end + ":00Z") - Date.parse(x.date + "T" + x.start + ":00Z")) / 36e5);
  return 0;
}
function saveFile(name, body, type) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([body], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function Agenda({ onLogout }) {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [syncing, setSyncing] = useState(false), [synced, setSynced] = useState("");
  const [user, setUser] = useState(null), [settings, setSettings] = useState({ capacity: { fernando: null, jefferson: null, julio: null }, revision: 0 }), [history, setHistory] = useState([]);
  const [date, setDate] = useState(today()), [view, setView] = useState("month"), [page, setPage] = useState("calendar"), [query, setQuery] = useState(""), [owners, setOwners] = useState(PEOPLE.map((p) => p.id)), [product, setProduct] = useState("all"), [status, setStatus] = useState("all"), [area, setArea] = useState("all");
  const [editing, setEditing] = useState(null), [draft, setDraft] = useState(null), [repeat, setRepeat] = useState("none"), [until, setUntil] = useState(addDays(today(), 28)), [busy, setBusy] = useState(false), [formError, setFormError] = useState(""), [deleteItem, setDeleteItem] = useState(null), [checkText, setCheckText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false), [capacityDraft, setCapacityDraft] = useState({}), [imported, setImported] = useState(null), [helpOpen, setHelpOpen] = useState(false);
  const input = useRef(null);
  const initializing = useRef(false);
  const importBatches = useRef([]);
  const [importProgress, setImportProgress] = useState(0);
  const requestId = useRef("");
  const [capacityRevision, setCapacityRevision] = useState(0);
  const api = useCallback(async (body) => {
    const r = await fetch("/api/socios/agenda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Falha ao salvar");
    return d;
  }, []);
  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setSyncing(true);
    try {
      const r = await fetch("/api/socios/agenda", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (!d.initialized && !initializing.current) {
        initializing.current = true;
        await api({ action: "initialize" });
        initializing.current = false;
        return await refresh(true);
      }
      setItems(d.items);
      setSettings(d.settings);
      setHistory(d.history);
      setUser(d.user);
      setError("");
      setSynced((/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e.message);
      initializing.current = false;
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [api]);
  useEffect(() => {
    try {
      const preferred = localStorage.getItem("growx-agenda-view");
      if (preferred && ["month", "week", "day", "list"].includes(preferred)) setView(preferred);
      else if (window.matchMedia("(max-width:767px)").matches) setView("list");
    } catch {
    }
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh(true);
    }, 3e4);
    const focus = () => refresh(true);
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  function openNew(d = date) {
    requestId.current = crypto.randomUUID();
    setEditing(null);
    setDraft(blank(d));
    setRepeat("none");
    setUntil(addDays(d, 28));
    setFormError("");
    setCheckText("");
  }
  function openItem(item) {
    setEditing(item);
    setDraft(JSON.parse(JSON.stringify(item)));
    setRepeat("none");
    setFormError("");
    setCheckText("");
  }
  const active = useMemo(() => items.filter((i) => !i.archived), [items]);
  const weekStart = getWeek(date);
  const weekEnd = addDays(weekStart, 6);
  const filtered = useMemo(() => items.filter((i) => (page === "archive" ? i.archived : !i.archived) && i.owners.some((o) => owners.includes(o)) && (product === "all" || i.product === product) && (status === "all" || i.status === status) && (area === "all" || i.area === area) && (!query || (i.title + " " + i.notes + " " + i.product).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))) && (page !== "tasks" || i.type === "task")).sort(sort), [items, page, owners, product, status, area, query]);
  const display = filtered.filter((i) => page === "today" ? occursOn(i, today()) : true);
  const drafts = active.filter((i) => i.status === "draft").length;
  const overdue = active.filter((i) => i.endDate < today() && !["done", "draft"].includes(i.status));
  const conflictIds = useMemo(() => {
    const ids = /* @__PURE__ */ new Set();
    for (let a = 0; a < active.length; a++) for (let b = a + 1; b < active.length; b++) if (overlap(active[a], active[b])) {
      ids.add(active[a].id);
      ids.add(active[b].id);
    }
    return ids;
  }, [active]);
  const conflicts = draft ? active.filter((x) => x.id !== editing?.id && overlap(draft, x)) : [];
  function update(k, v) {
    setDraft((d) => d ? { ...d, [k]: v } : d);
  }
  async function save() {
    if (!draft) return;
    setFormError("");
    const parsed = itemSchema.safeParse(draft);
    if (!parsed.success) {
      setFormError(parsed.error.issues.map((x) => x.message).join("; "));
      return;
    }
    setBusy(true);
    try {
      const r = await api({ action: "save", item: parsed.data, id: editing?.id, revision: editing?.revision, repeat, until, requestId: requestId.current });
      setDraft(null);
      await refresh(true);
      toast.success(r.count > 1 ? `${r.count} ocorr\xEAncias salvas` : "Item salvo na agenda");
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(item, s) {
    setBusy(true);
    try {
      await api({ action: "save", id: item.id, revision: item.revision, item: { ...item, status: s } });
      await refresh(true);
      toast.success(s === "done" ? "Entrega conclu\xEDda" : "Status atualizado");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function archive(item, restore = false) {
    setBusy(true);
    try {
      await api({ action: restore ? "restore" : "archive", id: item.id, revision: item.revision });
      setDeleteItem(null);
      setDraft(null);
      await refresh(true);
      toast.success(restore ? "Item restaurado" : "Item arquivado. Voc\xEA pode restaur\xE1-lo em Arquivados.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function move(id, target) {
    const x = items.find((i) => i.id === id);
    if (!x || x.date === target) return;
    const delta = Math.round((Date.parse(target) - Date.parse(x.date)) / 864e5);
    try {
      await api({ action: "save", id: x.id, revision: x.revision, item: { ...x, date: target, endDate: addDays(x.endDate, delta) } });
      await refresh(true);
      toast.success("Data alterada para " + displayDate(target));
    } catch (e) {
      toast.error(e.message);
    }
  }
  function navigate(n) {
    if (view === "month") {
      const d = /* @__PURE__ */ new Date(date + "T12:00Z");
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + n);
      setDate(d.toISOString().slice(0, 10));
    } else setDate(addDays(date, n * (view === "week" ? 7 : 1)));
  }
  async function readBackup(file) {
    setImportProgress(0);
    try {
      if (file.size > 25e6) throw new Error("O backup deve ter at\xE9 25 MB.");
      const data = JSON.parse(await file.text());
      if (data.format !== "growx-agenda-v1" || !Array.isArray(data.items)) throw new Error("Use um backup JSON exportado por esta agenda.");
      const valid = data.items.filter((x) => !x.archived).map((x) => itemSchema.parse(x));
      const batches = [];
      let chunk = [], bytes = 0;
      for (const item of valid) {
        const size = new TextEncoder().encode(JSON.stringify(item)).length;
        if (chunk.length && (bytes + size > 9e5 || chunk.length === 100)) {
          batches.push({ items: chunk, requestId: crypto.randomUUID() });
          chunk = [];
          bytes = 0;
        }
        chunk.push(item);
        bytes += size;
      }
      if (chunk.length) batches.push({ items: chunk, requestId: crypto.randomUUID() });
      importBatches.current = batches;
      setImported(valid);
    } catch (e) {
      toast.error(e.message);
    }
    if (input.current) input.current.value = "";
  }
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    Promise.resolve(context.registerTool({ name: "list_agenda_items", title: "Consultar agenda Grow-X", description: "Lista os itens da agenda atualmente vis\xEDveis conforme os filtros, sem alterar dados.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: (input2) => {
      if (!input2 || typeof input2 !== "object" || Object.keys(input2).length) throw new Error("N\xE3o s\xE3o aceitos par\xE2metros.");
      return { items: display.map((x) => ({ id: x.id, title: x.title, date: x.date, start: x.start, status: x.status, owners: x.owners })) };
    } }, { signal: life.signal })).catch(() => {
    });
    return () => life.abort();
  }, [display]);
  function EventCard({ item, compact = false }) {
    return <button className={"event-card " + (compact ? "compact " : "") + "status-" + item.status} draggable={!item.archived} onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)} onClick={() => openItem(item)} style={{ "--owner-color": PEOPLE.find((p) => p.id === item.owners[0])?.color }} title={item.title}><span className="event-top"><span>{item.allDay ? item.type === "milestone" ? "Marco" : "Sem hor\xE1rio" : item.start}</span><span>{item.status === "draft" ? "Proposta" : item.status === "done" ? <Check size={12} /> : item.priority === "high" ? <Flag size={12} /> : null}</span></span><strong>{item.title}</strong>{!compact && <span className="event-bottom"><span>{item.product}</span><span className="mini-owners">{item.owners.map((id) => <Avatar id={id} small key={id} />)}</span></span>}{conflictIds.has(item.id) && <span className="conflict"><AlertTriangle size={12} /> Conflito de horário</span>}</button>;
  }
  const monthFirst = date.slice(0, 8) + "01";
  const monthStart = getWeek(monthFirst);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(monthStart, i));
  function ItemList({ list }) {
    if (!list.length) return <div className="empty"><CalendarCheck size={38} /><h3>Nada por aqui</h3><p>{query || product !== "all" || status !== "all" || owners.length < 3 ? "Tente outros filtros ou uma busca diferente." : "Crie um compromisso ou uma tarefa para come\xE7ar."}</p><button className="button primary" onClick={() => openNew()}><Plus size={17} /> Novo item</button></div>;
    return <div className="item-list">{list.map((item) => <div key={item.id} className={"item-row " + (item.status === "done" ? "completed" : "")}><button className="complete-button" disabled={busy || item.archived} aria-label={(item.status === "done" ? "Reabrir " : "Concluir ") + item.title} onClick={() => changeStatus(item, item.status === "done" ? "planned" : "done")}><CircleCheck size={22} /></button><button className="row-main" onClick={() => openItem(item)}><span className="row-title">{item.title}</span><span className="row-meta">{displayDate(item.date, { day: "2-digit", month: "short", year: "numeric" })}{!item.allDay ? " \xB7 " + item.start + "\u2013" + item.end : " \xB7 sem hor\xE1rio"} · {item.product} · {item.area}</span></button><span className={"status-pill " + item.status}>{STATUS[item.status]}</span><span className="row-owners">{item.owners.map((id) => <Avatar key={id} id={id} small />)}</span>{item.archived && <button className="icon-button" aria-label="Restaurar item" onClick={() => archive(item, true)}><RotateCcw size={18} /></button>}</div>)}</div>;
  }
  return <SidebarProvider style={{ "--sidebar-width": "240px" }}><Sidebar className="app-sidebar"><SidebarHeader className="brand"><img src={growxLogo} alt="Grow-X" /><span>AGENDA DOS SÓCIOS</span></SidebarHeader><SidebarContent><SidebarGroup><SidebarMenu>{[{ id: "calendar", label: "Calend\xE1rio", icon: CalendarDays }, { id: "today", label: "Hoje", icon: CalendarCheck }, { id: "tasks", label: "Tarefas", icon: ListTodo }, { id: "history", label: "Atividade", icon: History }].map((n) => <SidebarMenuItem key={n.id}><SidebarMenuButton isActive={page === n.id} onClick={() => setPage(n.id)}><n.icon /><span>{n.label}</span>{n.id === "tasks" && <span className="nav-count">{active.filter((x) => x.type === "task" && x.status !== "done").length}</span>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup><SidebarGroup><SidebarGroupLabel>SÓCIOS</SidebarGroupLabel><div className="people-filters">{PEOPLE.map((p) => <label key={p.id}><Checkbox checked={owners.includes(p.id)} onCheckedChange={(c) => setOwners(c ? [...owners, p.id] : owners.filter((id) => id !== p.id))} style={{ borderColor: p.color }} /><Avatar id={p.id} small /><span>{p.name}</span></label>)}</div><button className="text-button" onClick={() => {
    setOwners(user ? [user.person] : ["fernando"]);
    setPage("tasks");
  }}>Minhas tarefas</button></SidebarGroup><SidebarGroup><SidebarGroupLabel>ORGANIZAÇÃO</SidebarGroupLabel><SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={() => {
    setCapacityDraft({ ...settings.capacity });
    setCapacityRevision(settings.revision);
    setSettingsOpen(true);
  }}><Settings2 /><span>Capacidade e acesso</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton isActive={page === "archive"} onClick={() => setPage("archive")}><Trash2 /><span>Arquivados</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroup><div className="sidebar-note"><LockKeyhole size={16} /><div><strong>Espaço privado</strong><p>Agenda compartilhada dos três sócios.</p></div></div></SidebarContent><SidebarFooter><button className="help-button" onClick={() => setHelpOpen(true)}>Como usar a agenda</button><div className="account"><Avatar id={user?.person || "fernando"} small /><div><strong>{user ? PEOPLE.find((p) => p.id === user.person)?.name : "Acessando\u2026"}</strong><span>{user?.email || "Conta autenticada"}</span></div></div></SidebarFooter></Sidebar><SidebarInset className="workspace"><header className="topbar"><div className="top-title"><SidebarTrigger className="sidebar-toggle" /><span>Grow-X</span><ChevronRight size={14} /><strong>Agenda dos Sócios</strong></div><div className="top-actions"><span className={"sync-state " + (error ? "failed" : "")} title="Atualiza a cada 30 segundos enquanto aberta">{error ? <WifiOff size={15} /> : <LockKeyhole size={14} />}<span>{error ? "Sem sincroniza\xE7\xE3o" : synced ? "Salvo na nuvem" : "Conectando"}</span></span><button className="icon-button" onClick={() => refresh()} aria-label="Atualizar agenda"><RefreshCw className={syncing ? "spinning" : ""} size={17} /></button><button className="icon-button" disabled={busy} onClick={async () => { setBusy(true); try { await onLogout(); } catch (failure) { toast.error(failure.message); } finally { setBusy(false); } }} aria-label="Sair da agenda"><LogOut size={17} /></button><span className="avatar-stack">{PEOPLE.map((p) => <Avatar key={p.id} id={p.id} small />)}</span></div></header>
<main><div className="page-heading"><div><p className="eyebrow">GROW-X · OPERAÇÃO 2026–2027</p><h1>{page === "calendar" ? "Agenda dos S\xF3cios" : page === "today" ? "Hoje" : page === "tasks" ? "Tarefas e entregas" : page === "archive" ? "Itens arquivados" : "Atividade da equipe"}</h1></div><div className="heading-actions"><DropdownMenu><DropdownMenuTrigger asChild><button className="button export"><Download size={16} /><span>Exportar</span><ChevronDown size={13} /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => saveFile("growx-agenda-" + today() + ".json", JSON.stringify({ format: "growx-agenda-v1", exportedAt: (/* @__PURE__ */ new Date()).toISOString(), timezone: "America/Sao_Paulo", items, settings }, null, 2), "application/json")}>Backup completo · JSON</DropdownMenuItem><DropdownMenuItem onClick={() => saveFile("growx-calendario-" + today() + ".ics", makeICS(filtered), "text/calendar;charset=utf-8")}>Itens filtrados · Calendário ICS</DropdownMenuItem><DropdownMenuItem onClick={() => input.current?.click()}>Importar backup JSON</DropdownMenuItem></DropdownMenuContent></DropdownMenu><button className="button primary" onClick={() => openNew()}><Plus size={18} /> Novo item</button></div></div>
{error && <div className="error-banner" role="alert"><AlertTriangle size={19} /><div><strong>{error}</strong><p>Os dados já exibidos podem estar desatualizados. O formulário é mantido se uma gravação falhar.</p></div><a href="/socios/agenda">Entrar novamente</a><button onClick={() => refresh()}>Tentar novamente</button></div>}
<div className="partner-cards">{PEOPLE.map((p) => {
    const week = active.filter((i) => i.owners.includes(p.id) && i.date <= weekEnd && i.endDate >= weekStart && !["done", "draft"].includes(i.status));
    const load = week.reduce((n, x) => n + hours(x), 0);
    const cap = settings.capacity[p.id];
    return <button key={p.id} className={"partner-card " + (owners.length === 1 && owners[0] === p.id ? "selected" : "")} onClick={() => setOwners(owners.length === 1 && owners[0] === p.id ? PEOPLE.map((p2) => p2.id) : [p.id])}><div className="partner-top"><Avatar id={p.id} /><div><strong>{p.name}</strong><span>{p.role}</span></div><span className="partner-total">{week.length}<small>na semana</small></span></div><div className="load-line"><span>{load.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h estimadas</span><span className={cap !== null && load > cap ? "overload" : ""}>{cap === null ? "Capacidade a definir" : load > cap ? (load - cap).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "h acima da capacidade" : cap + "h dispon\xEDveis"}</span></div><Progress value={cap ? Math.min(100, load / cap * 100) : 0} style={{ "--primary": p.color }} /></button>;
  })}</div>
{page !== "history" && <><div className="calendar-toolbar"><div className="date-navigation"><button className="button today-button" onClick={() => setDate(today())}>Hoje</button><button className="icon-button" aria-label="Período anterior" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button><button className="icon-button" aria-label="Próximo período" onClick={() => navigate(1)}><ChevronRight size={20} /></button><h2>{view === "day" ? displayDate(date, { day: "numeric", month: "long", year: "numeric" }) : view === "week" ? displayDate(weekStart) + " \u2013 " + displayDate(weekEnd, { day: "numeric", month: "long", year: "numeric" }) : displayDate(date, { month: "long", year: "numeric" })}</h2><input aria-label="Ir para data" title="Ir para data" type="date" className="jump-date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>{page === "calendar" && <Tabs value={view} onValueChange={(v) => {
    setView(v);
    try {
      localStorage.setItem("growx-agenda-view", v);
    } catch {
    }
  }}><TabsList className="view-tabs">{[["month", "M\xEAs"], ["week", "Semana"], ["day", "Dia"], ["list", "Lista"]].map(([v, t]) => <TabsTrigger key={v} value={v}>{t}</TabsTrigger>)}</TabsList></Tabs>}</div><div className="filters"><div className="search-field"><Search size={17} /><input aria-label="Buscar na agenda" placeholder="Buscar compromisso, tarefa…" value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button aria-label="Limpar busca" onClick={() => setQuery("")}><X size={14} /></button>}</div><Picker label="Filtrar produto" value={product} onChange={setProduct} items={[{ value: "all", label: "Todos os produtos" }, ...PRODUCTS.map((x) => ({ value: x, label: x }))]} /><Picker label="Filtrar status" value={status} onChange={setStatus} items={[{ value: "all", label: "Todos os status" }, ...options(STATUS)]} /><Picker label="Filtrar área" value={area} onChange={setArea} items={[{ value: "all", label: "Todas as \xE1reas" }, ...AREAS.map((x) => ({ value: x, label: x }))]} />{(owners.length < 3 || query || product !== "all" || status !== "all" || area !== "all") && <button className="text-button" onClick={() => {
    setOwners(PEOPLE.map((p) => p.id));
    setQuery("");
    setProduct("all");
    setStatus("all");
    setArea("all");
  }}>Limpar</button>}</div></>}
{drafts > 0 && page !== "archive" && page !== "history" && <div className="proposal-banner"><span className="proposal-icon"><CalendarDays size={18} /></span><p><strong>{drafts} propostas para revisar.</strong> Os itens do plano começam como rascunhos, sem horário ou compromisso confirmado. Abra um item para ajustar e agendar.</p><button className="text-button" onClick={() => {
    setStatus(status === "draft" ? "all" : "draft");
    setView("list");
    setPage("calendar");
  }}>{status === "draft" ? "Ver todos" : "Revisar propostas"}</button></div>}
{overdue.length > 0 && page !== "archive" && <div className="inline-alert"><AlertTriangle size={16} />{overdue.length} {overdue.length === 1 ? "item passou do prazo" : "itens passaram do prazo"} e ainda não {overdue.length === 1 ? "foi conclu\xEDdo" : "foram conclu\xEDdos"}.</div>}
{loading ? <div className="loading-grid">{Array.from({ length: 14 }, (_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div> : page === "history" ? <section className="history-panel"><h2>Últimas alterações</h2><p className="muted">Registro da conta que alterou a agenda. Horários de Brasília.</p>{!history.length ? <div className="empty"><History size={32} /><h3>A história começa aqui</h3><p>As alterações da equipe aparecerão neste espaço.</p></div> : history.map((h) => <div className="history-row" key={h.id}><span className="history-dot"><History size={17} /></span><div><strong>{h.title}</strong><p>{{ create: "Criado", edit: "Atualizado", archive: "Arquivado", restore: "Restaurado", import: "Importado", settings: "Capacidade atualizada" }[h.action] || h.action} por {h.actor}</p></div><time>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(h.at))}</time></div>)}</section> : page !== "calendar" || view === "list" ? <ItemList list={display} /> : view === "month" ? <div className="calendar-scroll"><div className="month-grid"><div className="weekdays">{["SEG", "TER", "QUA", "QUI", "SEX", "S\xC1B", "DOM"].map((x) => <div key={x}>{x}</div>)}</div><div className="month-days">{monthDays.map((d) => {
    const dayItems = filtered.filter((i) => occursOn(i, d));
    return <div key={d} className={"day-cell " + (d.slice(0, 7) !== date.slice(0, 7) ? "outside " : "") + (d === today() ? "is-today" : "")} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
      e.preventDefault();
      move(e.dataTransfer.getData("text/plain"), d);
    }}><div className="day-number"><button className={d === today() ? "today-circle" : ""} onClick={() => {
      setDate(d);
      setView("day");
    }} aria-label={"Ver " + displayDate(d, { day: "numeric", month: "long" })}>{Number(d.slice(8))}</button><button className="add-day" aria-label={"Adicionar em " + d} onClick={() => openNew(d)}><Plus size={15} /></button></div>{d === "2026-10-12" && <span className="holiday">Nossa Sra. Aparecida</span>}{dayItems.slice(0, 3).map((i) => <EventCard key={i.id} item={i} compact />)}{dayItems.length > 3 && <button className="more-items" onClick={() => {
      setDate(d);
      setView("day");
    }}>+{dayItems.length - 3} itens</button>}</div>;
  })}</div></div></div> : view === "week" ? <div className="week-scroll"><div className="week-grid">{Array.from({ length: 7 }, (_, n) => addDays(weekStart, n)).map((d) => <div className={"week-day " + (d === today() ? "is-today" : "")} key={d} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
    e.preventDefault();
    move(e.dataTransfer.getData("text/plain"), d);
  }}><button className="week-heading" onClick={() => {
    setDate(d);
    setView("day");
  }}><span>{displayDate(d, { weekday: "short" })}</span><strong>{Number(d.slice(8))}</strong></button>{filtered.filter((i) => occursOn(i, d)).map((i) => <EventCard key={i.id} item={i} />)}<button className="add-week" onClick={() => openNew(d)}><Plus size={16} /> Adicionar</button></div>)}</div></div> : <section className="day-view"><div className="day-view-heading"><span className="big-day">{Number(date.slice(8))}</span><div><h2>{displayDate(date, { weekday: "long" })}</h2><p>{displayDate(date, { month: "long", year: "numeric" })} · Horário de Brasília</p></div><button className="button" onClick={() => openNew(date)}><Plus size={16} /> Adicionar neste dia</button></div><ItemList list={filtered.filter((i) => occursOn(i, date))} /></section>}
<footer className="workspace-footer"><span><Clock3 size={14} /> Horário de Brasília · America/Sao_Paulo</span><span>{active.length} itens · {active.filter((x) => x.status === "done").length} concluídos{synced ? " \xB7 Sincronizado \xE0s " + synced : ""}</span></footer></main></SidebarInset>
<Dialog open={!!draft} onOpenChange={(open) => {
    if (!open && !busy) setDraft(null);
  }}><DialogContent className="editor-dialog"><DialogHeader><DialogTitle>{editing ? "Detalhes do item" : "Novo item na agenda"}</DialogTitle><DialogDescription>{editing?.archived ? "Este item est\xE1 arquivado. Restaure para editar." : "Hor\xE1rio de Bras\xEDlia. As altera\xE7\xF5es s\xE3o salvas para todos os s\xF3cios autorizados."}</DialogDescription></DialogHeader>{draft && <><div className="editor-scroll"><label className="field full">Título<input autoFocus value={draft.title} disabled={editing?.archived} maxLength={180} placeholder="Qual é o próximo passo?" onChange={(e) => update("title", e.target.value)} /></label><div className="form-grid"><label className="field">Tipo<Picker label="Tipo do item" value={draft.type} onChange={(v) => update("type", v)} items={options(TYPES)} /></label><label className="field">Status<Picker label="Status do item" value={draft.status} onChange={(v) => update("status", v)} items={options(STATUS)} /></label></div><fieldset className="owner-field"><legend>Responsáveis</legend><div>{PEOPLE.map((p) => <label key={p.id} className={draft.owners.includes(p.id) ? "checked" : ""}><Checkbox checked={draft.owners.includes(p.id)} onCheckedChange={(c) => update("owners", c ? [...draft.owners, p.id] : draft.owners.filter((id) => id !== p.id))} /><Avatar id={p.id} small />{p.name}</label>)}</div></fieldset><div className="form-grid"><label className="field">Data inicial<input type="date" value={draft.date} onChange={(e) => {
    const v = e.target.value;
    if (v) {
      update("date", v);
      if (draft.endDate < v || draft.endDate === draft.date) update("endDate", v);
    }
  }} /></label><label className="field">Data final<input type="date" value={draft.endDate} min={draft.date} onChange={(e) => update("endDate", e.target.value)} /></label></div><label className="switch-field"><Switch checked={draft.allDay} onCheckedChange={(v) => {
    update("allDay", v);
    if (!v && !draft.start) {
      update("start", "09:00");
      update("end", "10:00");
    }
  }} />Sem horário definido / dia inteiro</label>{!draft.allDay && <div className="form-grid"><label className="field">Início<input type="time" value={draft.start} onChange={(e) => update("start", e.target.value)} /></label><label className="field">Término<input type="time" value={draft.end} onChange={(e) => update("end", e.target.value)} /></label></div>}{conflicts.length > 0 && <div className="inline-alert"><AlertTriangle size={17} /><span>Conflito com {conflicts.map((i) => i.title).join("; ")}. Revise antes de salvar.</span></div>}<div className="form-grid three"><label className="field">Produto<Picker label="Produto do item" value={draft.product} onChange={(v) => update("product", v)} items={PRODUCTS.map((x) => ({ value: x, label: x }))} /></label><label className="field">Área<Picker label="Área do item" value={draft.area} onChange={(v) => update("area", v)} items={AREAS.map((x) => ({ value: x, label: x }))} /></label><label className="field">Prioridade<Picker label="Prioridade do item" value={draft.priority} onChange={(v) => update("priority", v)} items={options(PRIORITY)} /></label></div><div className="form-grid"><label className="field">Esforço estimado (minutos)<input type="number" min="0" max="1440" step="15" value={draft.estimatedMinutes || ""} placeholder="Ainda não estimado" onChange={(e) => update("estimatedMinutes", Number(e.target.value))} /></label><label className="field">Local ou link<input value={draft.location} maxLength={300} placeholder="Sala, endereço ou reunião" onChange={(e) => update("location", e.target.value)} /></label></div>{!editing && <div className="recurrence-box"><div className="form-grid"><label className="field">Repetir<Picker label="Repetição" value={repeat} onChange={setRepeat} items={[{ value: "none", label: "N\xE3o repetir" }, { value: "daily", label: "Todos os dias" }, { value: "weekdays", label: "Segunda a sexta" }, { value: "weekly", label: "Toda semana" }, { value: "monthly", label: "Todo m\xEAs, neste dia" }]} /></label>{repeat !== "none" && <label className="field">Até<input type="date" value={until} min={draft.date} max={addDays(draft.date, 365)} onChange={(e) => setUntil(e.target.value)} /></label>}</div>{repeat !== "none" && <p>Cria ocorrências independentes, editáveis uma a uma. Máximo de 100. Feriados precisam ser revisados.</p>}</div>}{editing?.seriesId && <p className="field-hint"><Repeat2 size={14} /> Você está editando apenas esta ocorrência.</p>}<label className="field">Notas e critério de entrega<textarea rows={3} value={draft.notes} maxLength={6e3} placeholder="Contexto, dependências e o que precisa estar pronto…" onChange={(e) => update("notes", e.target.value)} /></label><div className="checklist"><label>Checklist de entrega</label>{draft.checklist.map((c, i) => <div className="checklist-item" key={i}><Checkbox checked={c.done} onCheckedChange={(v) => update("checklist", draft.checklist.map((a, j) => j === i ? { ...a, done: !!v } : a))} /><span className={c.done ? "checked-text" : ""}>{c.text}</span><button className="icon-button" aria-label="Remover etapa" onClick={() => update("checklist", draft.checklist.filter((_, j) => j !== i))}><X size={14} /></button></div>)}<div className="add-check"><input aria-label="Nova etapa do checklist" placeholder="Adicionar uma etapa…" value={checkText} maxLength={300} onChange={(e) => setCheckText(e.target.value)} onKeyDown={(e) => {
    if (e.key === "Enter" && checkText.trim() && draft.checklist.length < 30) {
      e.preventDefault();
      update("checklist", [...draft.checklist, { text: checkText.trim(), done: false }]);
      setCheckText("");
    }
  }} /><button className="icon-button" aria-label="Adicionar etapa" disabled={!checkText.trim() || draft.checklist.length >= 30} onClick={() => {
    update("checklist", [...draft.checklist, { text: checkText.trim(), done: false }]);
    setCheckText("");
  }}><Plus size={18} /></button></div></div><div className="source-note"><strong>Origem</strong><p>{draft.source}</p>{editing && <p>Última alteração: {editing.updatedBy} · {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(editing.updatedAt))}</p>}</div>{formError && <div className="form-error" role="alert">{formError}</div>}</div><div className="editor-footer">{editing && !editing.archived && <button className="icon-button danger" onClick={() => setDeleteItem(editing)} aria-label="Arquivar item"><Trash2 size={19} /></button>}<div className="footer-right"><button className="button" disabled={busy} onClick={() => setDraft(null)}>Fechar</button>{editing?.archived ? <button className="button primary" disabled={busy} onClick={() => archive(editing, true)}>Restaurar item</button> : <button className="button primary" disabled={busy} onClick={save}>{busy ? "Salvando\u2026" : editing ? "Salvar altera\xE7\xF5es" : "Criar item"}</button>}</div></div></>}</DialogContent></Dialog>
<AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Arquivar este item?</AlertDialogTitle><AlertDialogDescription>“{deleteItem?.title}” sairá da agenda. Você poderá restaurá-lo em Arquivados, sem perder as informações.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(e) => {
    e.preventDefault();
    if (deleteItem) archive(deleteItem);
  }}>Arquivar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
<Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="settings-dialog"><DialogHeader><DialogTitle>Capacidade e acesso</DialogTitle><DialogDescription>Defina a disponibilidade semanal. Horas não informadas ficam em aberto.</DialogDescription></DialogHeader><div className="settings-content">{PEOPLE.map((p) => <label className="capacity-field" key={p.id}><Avatar id={p.id} /><span>{p.name}</span><input type="number" aria-label={"Horas semanais de " + p.name} min="0" max="80" placeholder="Não definida" value={capacityDraft[p.id] ?? ""} onChange={(e) => setCapacityDraft({ ...capacityDraft, [p.id]: e.target.value === "" ? null : Number(e.target.value) })} /><span>h/semana</span></label>)}<p className="field-hint">A carga considera itens ativos na semana selecionada, pelo esforço informado ou duração. Rascunhos e concluídos não consomem capacidade; itens sem estimativa não somam horas.</p><button className="button primary" disabled={busy} onClick={async () => {
    setBusy(true);
    try {
      await api({ action: "settings", settings: { capacity: capacityDraft }, revision: capacityRevision });
      await refresh(true);
      setSettingsOpen(false);
      toast.success("Capacidade atualizada");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }}>Salvar capacidade</button><div className="access-info"><LockKeyhole size={20} /><div><strong>Acesso restrito aos sócios</strong><p>Fernando · Jefferson · Júlio</p><p>Cada sócio entra com seu e-mail e sua própria senha. Todos podem ver e editar a agenda inteira. O histórico registra a conta autenticada; não compartilhe sua senha pessoal.</p></div></div></div></DialogContent></Dialog>
<Dialog open={!!imported} onOpenChange={(o) => !o && !busy && setImported(null)}><DialogContent><DialogHeader><DialogTitle>Importar {imported?.length} itens?</DialogTitle><DialogDescription>Serão adicionados como novos rascunhos. Nada será substituído. Importar o mesmo arquivo novamente cria duplicatas. Arquivados e configurações de capacidade não são importados. Arquivos grandes são enviados em lotes; se houver falha, use este mesmo botão para retomar sem duplicar os lotes já salvos.</DialogDescription></DialogHeader>{importProgress > 0 && <p className="muted">{importProgress} de {imported?.length} itens salvos.</p>}<button className="button primary" disabled={busy || !imported?.length} onClick={async () => {
    setBusy(true);
    try {
      let total = 0;
      for (const batch of importBatches.current) {
        await api({ action: "import", ...batch });
        total += batch.items.length;
        setImportProgress(total);
      }
      setImported(null);
      await refresh(true);
      toast.success(total + " rascunhos importados");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }}>{busy ? "Importando\u2026" : importProgress ? "Retomar importa\xE7\xE3o" : "Confirmar importa\xE7\xE3o"}</button></DialogContent></Dialog>
<Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent><DialogHeader><DialogTitle>Uma agenda para usar juntos</DialogTitle><DialogDescription>Os dados ficam no servidor e só são acessíveis após a autenticação configurada para os sócios.</DialogDescription></DialogHeader><ol className="help-list"><li>Abra uma proposta, revise data e responsáveis e troque Rascunho por Agendado.</li><li>Use Novo item para compromissos, tarefas ou marcos. Adicione horário, notas, prioridade e checklist.</li><li>Arraste um item para outra data no mês ou na semana. No celular, altere a data nos detalhes.</li><li>Conclua uma entrega pelo círculo na lista. Arquivados podem ser restaurados.</li><li>Faça backup JSON para preservar os itens; o arquivo ICS pode ser importado em outro calendário.</li></ol><p className="help-warning">Esta versão não envia convites de reunião, e-mails, notificações com o app fechado ou alterações ao Google Calendar/Metricool. As repetições são ocorrências independentes. Mudanças de outra sessão são verificadas para evitar sobrescrita.</p></DialogContent></Dialog>
<input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && readBackup(e.target.files[0])} /><Toaster position="bottom-right" richColors closeButton /></SidebarProvider>;
}
export {
  Agenda as default
};
