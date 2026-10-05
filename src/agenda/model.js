import { z } from "zod";
const PEOPLE = [{ id: "fernando", name: "Fernando", role: "CEO \xB7 Marketing e vendas", color: "#1a8431", initials: "FS" }, { id: "jefferson", name: "Jefferson", role: "CFO \xB7 P&D e vendas", color: "#215cc2", initials: "JF" }, { id: "julio", name: "J\xFAlio", role: "Jur\xEDdico \xB7 GXP e M\xF3dulo", color: "#9052bd", initials: "JL" }];
const PRODUCTS = ["Corporativo", "SPP", "SPI", "GXP", "M\xF3dulo", "REDE"];
const AREAS = ["Estrat\xE9gia", "Financeiro", "Marketing", "Vendas", "Produto e P&D", "Jur\xEDdico", "Opera\xE7\xE3o"];
const STATUS = { draft: "Rascunho", planned: "Agendado", doing: "Em andamento", done: "Conclu\xEDdo", blocked: "Bloqueado" };
const PRIORITY = { high: "Alta", medium: "M\xE9dia", low: "Baixa" };
const TYPES = { task: "Tarefa", event: "Compromisso", milestone: "Marco" };
const TZ = "America/Sao_Paulo";
const daySchema = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine((d) => !isNaN(Date.parse(d)) && (/* @__PURE__ */ new Date(d + "T12:00:00Z")).toISOString().slice(0, 10) === d, "Data inv\xE1lida");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const itemSchema = z.object({ title: z.string().trim().min(2).max(180), type: z.enum(["task", "event", "milestone"]), date: daySchema, endDate: daySchema, allDay: z.boolean(), start: z.union([timeSchema, z.literal("")]), end: z.union([timeSchema, z.literal("")]), owners: z.array(z.enum(["fernando", "jefferson", "julio"])).min(1).max(3), product: z.enum(["Corporativo", "SPP", "SPI", "GXP", "M\xF3dulo", "REDE"]), area: z.enum(["Estrat\xE9gia", "Financeiro", "Marketing", "Vendas", "Produto e P&D", "Jur\xEDdico", "Opera\xE7\xE3o"]), priority: z.enum(["high", "medium", "low"]), status: z.enum(["draft", "planned", "doing", "done", "blocked"]), notes: z.string().max(6e3), location: z.string().max(300), checklist: z.array(z.object({ text: z.string().trim().min(1).max(300), done: z.boolean() })).max(30), estimatedMinutes: z.number().int().min(0).max(1440), source: z.string().max(400), seriesId: z.string().max(100).optional() }).superRefine((x, c) => {
  if (x.endDate < x.date) c.addIssue({ code: "custom", message: "A data final deve ser posterior ou igual \xE0 inicial" });
  if (!x.allDay && (!x.start || !x.end || x.date === x.endDate && x.end <= x.start)) c.addIssue({ code: "custom", message: "Informe um hor\xE1rio final posterior ao inicial" });
  if (new Set(x.owners).size !== x.owners.length) c.addIssue({ code: "custom", message: "Respons\xE1veis repetidos" });
});
function addDays(day, n) {
  const d = /* @__PURE__ */ new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
}
function displayDate(d, opts = { day: "2-digit", month: "short" }) {
  return new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: "UTC" }).format(/* @__PURE__ */ new Date(d + "T12:00:00Z"));
}
function blank(date) {
  return { title: "", type: "task", date, endDate: date, allDay: true, start: "", end: "", owners: ["fernando"], product: "Corporativo", area: "Estrat\xE9gia", priority: "medium", status: "planned", notes: "", location: "", checklist: [], estimatedMinutes: 0, source: "Criado na agenda" };
}
function occursOn(x, date) {
  return x.date <= date && x.endDate >= date;
}
function overlap(a, b) {
  return a.status !== "draft" && b.status !== "draft" && a.status !== "done" && b.status !== "done" && !a.allDay && !b.allDay && a.owners.some((o) => b.owners.includes(o)) && a.date + "T" + a.start < b.endDate + "T" + b.end && b.date + "T" + b.start < a.endDate + "T" + a.end;
}
function occurrenceDates(first, mode, until) {
  let out = [];
  const firstDay = (/* @__PURE__ */ new Date(first + "T12:00Z")).getUTCDay();
  if (mode !== "weekdays" || firstDay > 0 && firstDay < 6) out.push(first);
  if (mode === "none") return out;
  for (let i = 1; i <= 366; i++) {
    const d = addDays(first, i);
    if (d > until) break;
    const wd = (/* @__PURE__ */ new Date(d + "T12:00Z")).getUTCDay();
    if (mode === "daily" || mode === "weekdays" && wd > 0 && wd < 6 || mode === "weekly" && i % 7 === 0 || mode === "monthly" && d.slice(8) === first.slice(8)) out.push(d);
    if (out.length > 100) throw new Error("Limite de 100 ocorr\xEAncias por vez");
  }
  return out;
}
function makeICS(items) {
  const esc = (s) => s.replace(/\r\n|\r/g, "\n").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const stamp = (s) => s.replaceAll("-", "").replaceAll(":", "");
  let lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Grow-X//Agenda dos Socios//PT-BR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Agenda dos S\xF3cios Grow-X", "X-WR-TIMEZONE:America/Sao_Paulo"];
  for (const x of items.filter((i) => !i.archived)) {
    lines.push("BEGIN:VEVENT", "UID:" + x.id + "@growx-agenda", "DTSTAMP:" + (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""), x.allDay ? "DTSTART;VALUE=DATE:" + stamp(x.date) : "DTSTART;TZID=America/Sao_Paulo:" + stamp(x.date) + "T" + stamp(x.start) + "00", x.allDay ? "DTEND;VALUE=DATE:" + stamp(addDays(x.endDate, 1)) : "DTEND;TZID=America/Sao_Paulo:" + stamp(x.endDate) + "T" + stamp(x.end) + "00", "SUMMARY:" + esc((x.status === "draft" ? "[RASCUNHO] " : "") + x.title), "DESCRIPTION:" + esc(x.notes + "\nRespons\xE1veis: " + x.owners.map((id) => PEOPLE.find((p) => p.id === id)?.name).join(", ") + "\n" + STATUS[x.status]), "LOCATION:" + esc(x.location), "STATUS:" + (x.status === "draft" ? "TENTATIVE" : "CONFIRMED"), "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map((line) => {
    let result = "", chunk = "", bytes = 0;
    for (const char of line) {
      const len = new TextEncoder().encode(char).length;
      if (bytes + len > 73) {
        result += chunk + "\r\n ";
        chunk = "";
        bytes = 1;
      }
      chunk += char;
      bytes += len;
    }
    return result + chunk;
  }).join("\r\n") + "\r\n";
}
export {
  AREAS,
  PEOPLE,
  PRIORITY,
  PRODUCTS,
  STATUS,
  TYPES,
  TZ,
  addDays,
  blank,
  daySchema,
  displayDate,
  itemSchema,
  makeICS,
  occurrenceDates,
  occursOn,
  overlap,
  today
};
