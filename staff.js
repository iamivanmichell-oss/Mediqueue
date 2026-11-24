if (!isStaff()) location.replace("index.html#staff");

/*Render*/
const dayLabel = d => new Date(d + "T00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

function renderStaff() {
  const c = $("#sCenter").value, d = $("#sDate").value, q = $("#sSearch").value.toLowerCase();
  const all = dayList(c, d);
  const count = s => all.filter(a => a.status === s).length;
  const serving = all.find(a => a.status === "serving");
  $("#nowServing").textContent = serving ? pad(serving.no) : "–";
  $("#stats").innerHTML = [["Total", all.length], ["Waiting", count("waiting")], ["Completed", count("done")], ["Missed", count("missed")]].map(([l, n]) => `<div><b>${n}</b><span>${l}</span></div>`).join("");
  $("#sRows").innerHTML = all.filter(a => !q || (a.name + a.service + a.ref + (a.email || "")).toLowerCase().includes(q)).map(a => `<tr class="r-${a.status}">
    <td>${pad(a.no)}</td><td>${esc(a.name)}<br><span class="muted">${a.ref}${a.walkin ? " · walk-in" : ""}</span></td>
    <td>${a.email ? esc(a.email) : "–"}</td><td>${esc(a.service)}</td><td>${a.time || "–"}</td>
    <td><span class="st ${a.status}">${a.status === "done" ? "completed" : a.status}</span></td>
    <td>${["waiting", "serving"].includes(a.status) ? `<button data-a="done" data-r="${a.ref}">Complete</button><button data-a="missed" data-r="${a.ref}">Missed</button>` : ""}${a.status === "missed" ? `<button data-a="resched" data-r="${a.ref}">Reschedule</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7" class="muted">No patients for this day yet.</td></tr>`;

  // Upcoming bookings: next 7 days for the selected center
  const days = [];
  for (let i = 0; i < 7; i++) { const x = new Date(); x.setDate(x.getDate() + i); days.push(iso(x)); }
  $("#upcoming").innerHTML = days.map(day => {
    const n = dayList(c, day).filter(a => a.status !== "rescheduled").length;
    return `<button type="button" data-d="${day}" class="${day === d ? "sel" : ""}"><b>${day === today() ? "Today" : dayLabel(day)}</b><span>${n} booking${n === 1 ? "" : "s"}</span></button>`;
  }).join("");
}

/*Queue actions*/
function notifyApproaching(c, d) {
  const w = waiting(dayList(c, d)), all = load();
  w.forEach((a, i) => { if (i + 1 <= CONFIG.NOTIFY_AHEAD + 1 && !a.notified) { mail(a, "Your turn is coming up", `Hi ${a.name}, ${i} patient(s) are ahead of you at ${centerName(c)}. Please head to the center now. Queue number ${pad(a.no)}.`); all.find(x => x.ref === a.ref).notified = true; } });
  save(all);
}
function setStatus(ref, status) { const all = load(), a = all.find(x => x.ref === ref); if (a) { a.status = status; save(all); if (status === "missed") mail(a, "Appointment missed", `Hi ${a.name}, you were marked as missed at ${centerName(a.center)}. Please book a new slot or ask staff to reschedule.`); } }

$("#callNext").addEventListener("click", () => {
  const c = $("#sCenter").value, d = $("#sDate").value, list = dayList(c, d);
  const cur = list.find(a => a.status === "serving"); if (cur) setStatus(cur.ref, "done");
  const nxt = waiting(dayList(c, d))[0];
  if (!nxt) { toast("No one is waiting."); return renderStaff(); }
  setStatus(nxt.ref, "serving"); notifyApproaching(c, d); toast(`Now serving ${pad(nxt.no)} – ${nxt.name}`); renderStaff();
});
$("#sRows").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.a === "resched") {
    const all = load(), a = all.find(x => x.ref === b.dataset.r), nd = new Date(a.date + "T00:00"); nd.setDate(nd.getDate() + 1);
    a.status = "rescheduled"; save(all); const n = addAppt({ center: a.center, service: a.service, date: iso(nd), time: "", name: a.name, email: a.email, ref: a.ref + "R" });
    toast(`Rescheduled to ${n.date}. New code: ${n.ref}`);
  } else setStatus(b.dataset.r, b.dataset.a);
  renderStaff();
});
$("#walkForm").addEventListener("submit", e => {
  e.preventDefault();
  const a = addAppt({ center: $("#sCenter").value, service: $("#wService").value, date: $("#sDate").value, time: "", name: $("#wName").value.trim(), email: "", walkin: true });
  $("#wName").value = ""; toast(`Added as ${pad(a.no)}`); renderStaff();
});
$("#exportCsv").addEventListener("click", () => {
  const rows = [["No", "Ref", "Name", "Email", "Service", "Time", "Status", "Walk-in"], ...dayList($("#sCenter").value, $("#sDate").value).map(a => [pad(a.no), a.ref, a.name, a.email || "", a.service, a.time, a.status, a.walkin ? "yes" : "no"])];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); l.download = `queue-${$("#sDate").value}.csv`; l.click();
});
$("#upcoming").addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (b) { $("#sDate").value = b.dataset.d; renderStaff(); } });
["sCenter", "sDate", "sSearch"].forEach(i => $("#" + i).addEventListener("input", renderStaff));
const confirmOut = $("#confirmOut");
$("#logout").addEventListener("click", () => confirmOut.showModal());
$("#coCancel").addEventListener("click", () => confirmOut.close());
confirmOut.addEventListener("click", e => { if (e.target === confirmOut) confirmOut.close(); }); // click on backdrop
$("#coOk").addEventListener("click", () => { sessionStorage.removeItem("mq_staff"); location.href = "index.html#book"; });

/*Init*/
$("#sCenter").innerHTML = opts(CENTERS, c => c.id);
$("#wService").innerHTML = opts(SERVICES);
$("#sDate").value = today();
renderStaff();
addEventListener("storage", renderStaff);
setInterval(renderStaff, 3000);
