/* MediQueue Client Application - Modern UI/UX Architecture */

let map = null;
let markers = [];
let me = null;
let userMarker = null;
let bookTime = null;
let centerSearchQuery = "";
let activeCenterFilter = "all";
let activeDriveFilter = "all";
let currentSelectedService = SERVICES[0];

/* Routing & View Management */
function route() {
  const hash = location.hash.slice(1);
  const validViews = ["book", "track", "centers", "drives", "staff"];
  const id = validViews.includes(hash) ? hash : "book";

  document.querySelectorAll(".view").forEach(v => {
    v.classList.toggle("on", v.id === id);
  });

  document.querySelectorAll("nav a").forEach(a => {
    const targetHash = a.getAttribute("href").replace("#", "");
    a.classList.toggle("on", targetHash === id);
  });

  if (id === "staff" && isStaff()) {
    location.href = "staff.html";
    return;
  }

  if (id === "centers") {
    initMap();
    renderCenters();
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
        if (!me) fitAllCentersOnMap();
      }, 120);
    }
  } else if (id === "book") {
    renderFacilitySnapshot();
    renderCenterAnnouncements($("#bCenter").value);
  } else if (id === "drives") {
    renderAllDrives();
  } else if (id === "track") {
    renderRecentBookingPrompt();
    renderTrack();
  }

  refresh();
  window.scrollTo({ top: 0, behavior: "instant" });
}
addEventListener("hashchange", route);

/* Distance calculation (Haversine formula in kilometers) */
const dist = (a, b) => {
  const r = x => (x * Math.PI) / 180;
  const dl = r(b.lat - a.lat);
  const dn = r(b.lng - a.lng);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dn / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/* Centers sorted by distance or name */
function getSortedCenters() {
  return CENTERS.map(c => ({
    ...c,
    km: me ? dist(me, c) : null
  })).sort((a, b) => {
    if (me && a.km != null && b.km != null) return a.km - b.km;
    return a.name.localeCompare(b.name);
  });
}

/* Service Selection Chips Grid */
function renderServiceChips() {
  const container = $("#serviceChipsGrid");
  if (!container) return;

  container.innerHTML = SERVICES_DATA.map(s => {
    const isSelected = s.name === currentSelectedService;
    const badgeHtml = s.badge ? `<span class="badge badge-event" style="margin-left:6px; font-size:10.5px;">${esc(s.badge)}</span>` : "";
    return `
      <div class="service-card ${isSelected ? 'selected' : ''}" data-service="${esc(s.name)}">
        <span class="srv-icon">${s.icon}</span>
        <div>
          <div class="srv-title">${esc(s.name)} ${badgeHtml}</div>
          <div class="srv-desc">${esc(s.desc)} · <span style="color:var(--primary); font-weight:600;">~${s.duration}</span></div>
        </div>
      </div>
    `;
  }).join("");
}

// Service chip click delegation
document.addEventListener("click", e => {
  const card = e.target.closest(".service-card");
  if (card && card.dataset.service) {
    selectService(card.dataset.service);
  }
});

function selectService(serviceName) {
  currentSelectedService = serviceName;
  $("#bService").value = serviceName;
  document.querySelectorAll(".service-card").forEach(c => {
    c.classList.toggle("selected", c.dataset.service === serviceName);
  });
  renderSlots();
}

/* Facility Snapshot Summary */
function renderFacilitySnapshot() {
  const c = getCenter($("#bCenter").value);
  const container = $("#facilitySnapshot");
  if (!container || !c) return;

  const t = today();
  const waitingCount = waiting(dayList(c.id, t)).length;
  const kmText = me ? ` · <b>${dist(me, c).toFixed(1)} km from you</b>` : "";
  const events = getUpcomingEvents(c.id);
  const eventPill = events.length > 0
    ? `<span class="badge badge-event">📢 ${esc(events[0].badge || "Active Drive")}</span>`
    : `<span class="badge badge-drive">Regular Consultations</span>`;

  container.innerHTML = `
    <div class="facility-top-row">
      <div>
        <div class="facility-title">📍 ${esc(c.name)}</div>
        <div style="font-size:13px; color:var(--mute); margin-top:2px;">${esc(c.addr)}${kmText}</div>
      </div>
      <div class="facility-badges">
        ${eventPill}
        <span class="badge badge-wait ${waitingCount <= 2 ? 'low' : 'med'}">👥 ${waitingCount} waiting today</span>
      </div>
    </div>
    <div class="facility-meta-grid">
      <div>🕒 <b>Clinic Hours:</b> ${esc(c.hours)}</div>
      <div>🩺 <b>Physician on Duty:</b> ${esc(c.doctor || "Municipal Health Officer")}</div>
      <div>📞 <b>Desk Hotline:</b> ${esc(c.phone || "(046) 509-1234")}</div>
      <div>📍 <b>Barangay Coverage:</b> ${esc(c.barangay)}</div>
    </div>
  `;
}

/* Render Center Announcements & Medical Drives */
function renderCenterAnnouncements(centerId) {
  const container = $("#eventAnnounce");
  if (!container) return;
  const c = getCenter(centerId);
  const cName = c ? c.name : "Health Center";
  const events = getUpcomingEvents(centerId);

  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="announcements-header">
        <h3>📢 Community Healthcare Events & Drives</h3>
      </div>
      <p class="muted" style="margin:0; font-size:14px;">No special outreach drives are scheduled at ${esc(cName)} for this date. Regular clinic consultations, immunization, and triage are operating during regular hours.</p>
    `;
    return;
  }

  const cardsHtml = events.map(e => `
    <div class="event-card">
      <div class="event-title-row">
        <h4>${esc(e.title)}</h4>
        <span class="badge ${e.type.includes("Vaccination") ? "badge-drive" : "badge-event"}">${esc(e.badge || e.type)}</span>
      </div>
      <div class="event-meta">
        <span>📅 <b>${esc(e.date)}</b> (${esc(e.time)})</span>
        <span>📍 ${esc(e.location)}</span>
        <span>👥 ${esc(e.eligibility || "Open to all residents")}</span>
      </div>
      <p class="event-desc">${esc(e.description)}</p>
      <button type="button" class="btn-book-drive" data-book-drive="${e.id}">
        Book for this Drive ➔
      </button>
    </div>
  `).join("");

  container.innerHTML = `
    <div class="announcements-header">
      <h2>📢 Healthcare Drives & Events at ${esc(cName)}</h2>
      <span class="badge badge-drive">${events.length} Upcoming Event${events.length > 1 ? "s" : ""}</span>
    </div>
    <div class="event-list">
      ${cardsHtml}
    </div>
  `;
}

// Delegation for booking an event drive directly
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-book-drive]");
  if (btn) {
    const driveId = btn.dataset.bookDrive;
    const ev = EVENTS.find(x => x.id === driveId);
    if (ev) {
      $("#bCenter").value = ev.centerId;
      selectService(ev.targetService || SERVICES[0]);
      $("#bDate").value = ev.date;
      renderFacilitySnapshot();
      renderSlots();
      renderCenterAnnouncements(ev.centerId);
      location.hash = "#book";
      toast(`Selected ${centerName(ev.centerId)} for ${ev.title}. Choose your time slot!`);
    }
  }
});

/* Nearest Center Suggestion Banner */
function updateNearestBanner(nearestCenter) {
  const alertEl = $("#nearestAlert");
  if (!alertEl) return;
  if (!nearestCenter || nearestCenter.km == null) {
    alertEl.hidden = true;
    return;
  }
  alertEl.hidden = false;
  alertEl.innerHTML = `
    <div class="nearest-banner-content">
      <span class="nearest-icon-badge">📍</span>
      <div>
        Nearest Health Center to you: <strong>${esc(nearestCenter.name)}</strong> (${nearestCenter.km.toFixed(1)} km away).
        <div style="font-size:12.5px; color:var(--mute);">Auto-selected for your convenience. You may also choose any other station.</div>
      </div>
    </div>
    <button type="button" class="btn-banner" id="btnSelectNearest">Use Nearest Center</button>
  `;
  const btn = alertEl.querySelector("#btnSelectNearest");
  if (btn) {
    btn.onclick = () => {
      $("#bCenter").value = nearestCenter.id;
      renderFacilitySnapshot();
      renderSlots();
      renderCenterAnnouncements(nearestCenter.id);
      toast(`Selected nearest center: ${nearestCenter.name}`);
    };
  }
}

/* Time Slot Selection */
function renderSlots() {
  const c = $("#bCenter").value;
  const d = $("#bDate").value;
  const counts = {};
  dayList(c, d).forEach(a => {
    if (a.time) counts[a.time] = (counts[a.time] || 0) + 1;
  });
  const now = new Date();
  const isToday = d === today();

  $("#slots").innerHTML = TIMES.map(t => {
    const past = isToday && t <= now.toTimeString().slice(0, 5);
    const bookedCount = counts[t] || 0;
    const remaining = CONFIG.SLOT_CAPACITY - bookedCount;
    const full = remaining <= 0;

    let capTag = `${remaining} left`;
    if (full) capTag = "Full";
    else if (past) capTag = "Past";
    else if (remaining === CONFIG.SLOT_CAPACITY) capTag = "Open";

    return `
      <button type="button" data-t="${t}" ${past || full ? "disabled" : ""}>
        <span>${t}</span>
        <span class="slot-cap-tag">${capTag}</span>
      </button>
    `;
  }).join("");
  bookTime = null;
}

$("#slots").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  document.querySelectorAll("#slots button").forEach(x => x.classList.remove("sel"));
  b.classList.add("sel");
  bookTime = b.dataset.t;
});

/* Booking Submission & Digital Pass Generator */
$("#bookForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!bookTime) return toast("Please select a time slot first.");

  const name = $("#bName").value.trim();
  const email = $("#bEmail").value.trim();
  const centerId = $("#bCenter").value;
  const service = currentSelectedService || $("#bService").value;
  const date = $("#bDate").value;

  if (!name) return toast("Please provide your full name.");
  if (!email) return toast("Please provide an email address for your confirmation pass.");

  const submitBtn = $("#bookForm button[type='submit']");
  const origBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>Dispatching Pass...</span> ⏳`;

  const centerObj = getCenter(centerId);
  const appt = addAppt({
    center: centerId,
    service: service,
    date: date,
    time: bookTime,
    name: name,
    email: email
  });

  localStorage.setItem("mq_ref", appt.ref);

  const events = getUpcomingEvents(appt.center);
  const formalMessage = composeFormalMessage(appt, centerObj, events);

  // Dispatch email with mobile fallback support
  const emailResult = await mail(
    appt,
    `MediQueue Appointment Pass - ${centerObj ? centerObj.name : "Health Center"} [${appt.ref}]`,
    formalMessage
  );

  submitBtn.disabled = false;
  submitBtn.innerHTML = origBtnText;

  // Render Digital Boarding Pass Ticket
  const box = $("#bookResult");
  box.hidden = false;

  let emailFeedbackHtml = "";
  if (emailResult.success) {
    emailFeedbackHtml = `
      <div class="email-status success">
        <span>✓</span>
        <div><b>Official Pass Emailed!</b> A formal copy and pre-arrival guide were dispatched to <b>${esc(email)}</b>.</div>
      </div>
    `;
  } else {
    emailFeedbackHtml = `
      <div class="email-status notice">
        <span>📱</span>
        <div><b>Mobile Delivery Note:</b> Direct background email was restricted on this mobile browser. Tap the button below to view or send in your phone's mail app.</div>
      </div>
    `;
  }

  const qrSvg = generateQrSvg(appt.ref + ":" + appt.no);

  box.innerHTML = `
    <div class="ticket-pass">
      <div class="ticket-header">
        <h3>🏛️ Republic of the Philippines · City Health Office</h3>
        <span class="ticket-ref-pill">REF: ${appt.ref}</span>
      </div>
      <div class="ticket-body">
        <div>
          <div class="ticket-number-area">
            <div>
              <small style="color:var(--mute); font-weight:700; text-transform:uppercase;">Queue Number</small>
              <div class="ticket-queue-big">#${pad(appt.no)}</div>
            </div>
          </div>
          <div class="ticket-grid">
            <div class="ticket-cell">
              <small>Patient Name</small>
              <b>${esc(appt.name)}</b>
            </div>
            <div class="ticket-cell">
              <small>Clinical Service</small>
              <b>${esc(appt.service)}</b>
            </div>
            <div class="ticket-cell">
              <small>Health Facility</small>
              <b>${esc(centerObj ? centerObj.name : centerName(appt.center))}</b>
            </div>
            <div class="ticket-cell">
              <small>Scheduled Slot</small>
              <b>${esc(appt.date)} at ${appt.time}</b>
            </div>
          </div>
          <div style="font-size:12.5px; color:var(--mute);">
            📍 ${esc(centerObj ? centerObj.addr : "")} · 🕒 Hours: ${esc(centerObj ? centerObj.hours : "")}
          </div>
        </div>

        <div class="ticket-qr-area">
          ${qrSvg}
          <small>SCAN AT TRIAGE DESK</small>
          <span style="font-size:11px; color:var(--mute); letter-spacing:0.1em; font-family:monospace;">${appt.ref}</span>
        </div>
      </div>

      <div class="ticket-footer">
        <div style="font-size:13px; color:var(--ink-secondary);">
          ⚠️ <b>Patient Reminder:</b> Please arrive 15 minutes before <b>${appt.time}</b> with a valid ID.
        </div>
        <div class="ticket-actions">
          <a href="${emailResult.mailtoUrl}" class="btn-banner" target="_blank" rel="noopener">
            ✉️ Mobile Mail App
          </a>
          <button type="button" class="btn-secondary" id="btnCopyPass">
            📋 Copy Pass
          </button>
          <button type="button" class="btn-secondary" id="btnPrintPass">
            🖨️ Print Pass
          </button>
          <a href="#track" class="btn-secondary">
            ⏱️ Track Live
          </a>
        </div>
      </div>
    </div>
    ${emailFeedbackHtml}
  `;

  // Attach actions handlers
  const copyBtn = box.querySelector("#btnCopyPass");
  if (copyBtn) {
    copyBtn.onclick = () => {
      fallbackCopyText(formalMessage);
    };
  }

  const printBtn = box.querySelector("#btnPrintPass");
  if (printBtn) {
    printBtn.onclick = () => window.print();
  }

  $("#bookForm").reset();
  $("#bCenter").value = centerId;
  selectService(service);
  $("#bDate").value = appt.date;
  renderFacilitySnapshot();
  renderSlots();
  box.scrollIntoView({ behavior: "smooth" });
});

function fallbackCopyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      toast("Appointment pass copied to clipboard!");
    }).catch(() => {
      execCopy(text);
    });
  } else {
    execCopy(text);
  }
}

function execCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    toast("Appointment pass copied to clipboard!");
  } catch (err) {
    toast("Please copy text manually.");
  }
  document.body.removeChild(ta);
}

/* Recent Booking Prompt in Track View */
function renderRecentBookingPrompt() {
  const container = $("#recentBookingPrompt");
  if (!container) return;
  const savedRef = localStorage.getItem("mq_ref");
  if (!savedRef) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <button type="button" class="chip-btn" id="btnRecallBooking" style="background:var(--primary-light); color:var(--primary); border-color:var(--primary-border);">
      ✨ Check my recent booking: <b>${esc(savedRef)}</b>
    </button>
  `;
  const btn = container.querySelector("#btnRecallBooking");
  if (btn) {
    btn.onclick = () => {
      $("#tRef").value = savedRef;
      renderTrack();
    };
  }
}

/* Live Queue Visual Stepper & Estimator */
function renderTrack() {
  const ref = ($("#tRef").value || "").trim().toUpperCase();
  const out = $("#trackResult");
  if (!ref) {
    out.innerHTML = "";
    return;
  }
  const a = load().find(x => x.ref === ref);
  if (!a) {
    out.innerHTML = `<div class="tracker-hero-card" style="text-align:center;"><p class="muted">No appointment found for reference code <b>${esc(ref)}</b>. Please check your reference code and try again.</p></div>`;
    return;
  }

  const dayAppts = dayList(a.center, a.date);
  const serving = dayAppts.find(x => x.status === "serving");
  const nAhead = ahead(a);
  const estMinutes = (nAhead + 1) * CONFIG.AVG_MINS_PER_PATIENT;

  // Determine active stepper node
  let stepIndex = 0;
  if (a.status === "done") stepIndex = 3;
  else if (a.status === "serving") stepIndex = 2;
  else if (a.status === "waiting") stepIndex = nAhead === 0 ? 2 : 1;

  const stepperHtml = `
    <ul class="queue-stepper">
      <li class="step-node ${stepIndex >= 0 ? 'completed' : ''}">
        <div class="step-node-dot">1</div>
        <div class="step-node-label">Booked</div>
      </li>
      <li class="step-node ${stepIndex === 1 ? 'active' : (stepIndex > 1 ? 'completed' : '')}">
        <div class="step-node-dot">2</div>
        <div class="step-node-label">In Waiting Line</div>
      </li>
      <li class="step-node ${stepIndex === 2 ? 'active' : (stepIndex > 2 ? 'completed' : '')}">
        <div class="step-node-dot">3</div>
        <div class="step-node-label">Now Serving</div>
      </li>
      <li class="step-node ${stepIndex === 3 ? 'completed' : ''}">
        <div class="step-node-dot">4</div>
        <div class="step-node-label">Completed</div>
      </li>
    </ul>
  `;

  let statusMsg = "";
  if (a.status === "serving") {
    statusMsg = "🎉 It's your turn! Please proceed to the consultation / triage counter immediately.";
  } else if (a.status === "done") {
    statusMsg = "✓ Your consultation has been completed. Stay safe and healthy!";
  } else if (a.status === "missed") {
    statusMsg = "⚠️ You were marked as missed. Please inquire at the triage desk or book a new slot.";
  } else if (nAhead === 0) {
    statusMsg = "🔔 You're next in line! Please prepare your ID and stand by the counter.";
  } else {
    statusMsg = `There ${nAhead === 1 ? 'is' : 'are'} <b>${nAhead} patient${nAhead > 1 ? 's' : ''}</b> ahead of you in line.`;
  }

  out.innerHTML = `
    <div class="tracker-hero-card">
      <div class="tracker-sync-bar">
        <span class="sync-pill"><span class="sync-dot"></span> Live Queue Sync</span>
        <span>Auto-refreshing every 3s</span>
      </div>

      ${stepperHtml}

      <div class="tracker-numbers-pair">
        <div>
          <small>Now Serving</small>
          <div class="big-num">${serving ? pad(serving.no) : "–"}</div>
        </div>
        <div>
          <small>Your Number</small>
          <div class="big-num me">#${pad(a.no)}</div>
        </div>
      </div>

      <div class="wait-estimate-card">
        <div class="wait-estimate-text">
          ⏱️ Estimated Wait Time: <b>~${estMinutes} minutes</b> (${nAhead} ahead)
        </div>
        <span class="badge badge-wait ${nAhead <= 2 ? 'low' : 'med'}">${a.status.toUpperCase()}</span>
      </div>

      <p style="font-size:15px; margin:12px 0 6px;">${statusMsg}</p>

      <div style="font-size:13px; color:var(--mute); padding-top:12px; border-top:1px solid var(--line);">
        Patient: <b>${esc(a.name)}</b> · Service: <b>${esc(a.service)}</b><br>
        📍 <b>${esc(centerName(a.center))}</b> · 🗓️ ${esc(a.date)} at ${a.time || "walk-in"}
      </div>
    </div>
  `;
}
$("#trackForm").addEventListener("submit", e => {
  e.preventDefault();
  renderTrack();
});

/* Map & Centers Directory (Zero-Setup, Resilient Multi-Provider) */
function createHealthCenterIcon() {
  return L.divIcon({
    className: "mq-marker-container",
    html: `
      <div class="mq-marker-pin" title="Health Center">
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 0C7.61 0 0 7.61 0 17C0 29.5 17 44 17 44C17 44 34 29.5 34 17C34 7.61 26.39 0 17 0Z" fill="#0f766e"/>
          <path d="M17 2C8.71 2 2 8.71 2 17C2 28 17 41.5 17 41.5C17 41.5 32 28 32 17C32 8.71 25.29 2 17 2Z" fill="#0b7c6d"/>
          <circle cx="17" cy="17" r="11" fill="white"/>
          <path d="M15 10H19V15H24V19H19V24H15V19H10V15H15V10Z" fill="#0f766e"/>
        </svg>
      </div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -42]
  });
}

function createUserIcon() {
  return L.divIcon({
    className: "mq-user-marker-container",
    html: `
      <div class="mq-user-marker" title="Your Location">
        <div class="mq-user-pulse"></div>
        <div class="mq-user-dot"></div>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  });
}

function initMap() {
  if (!map && window.L) {
    const mapEl = $("#map");
    if (!mapEl) return;

    map = L.map("map", {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([CENTERS[0].lat, CENTERS[0].lng], 13);

    // Primary Zero-Config Tiles: Esri World Street Map (Enterprise CDN, NO API Key & NO Watermark)
    const primaryTiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Sources: Esri, USGS, METI, TomTom'
    });

    // Automatic Failover to OpenStreetMap France
    primaryTiles.on("tileerror", function (err) {
      if (err && err.tile && !err.tile.dataset.retried) {
        err.tile.dataset.retried = "1";
        const coords = err.coords;
        err.tile.src = `https://a.tile.openstreetmap.fr/osmfr/${coords.z}/${coords.x}/${coords.y}.png`;
      }
    });

    primaryTiles.addTo(map);

    updateMapMarkers();
    fitAllCentersOnMap();

    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        if (map) map.invalidateSize();
      }).observe(mapEl);
    }
  }

  if (map) {
    requestAnimationFrame(() => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 150);
    setTimeout(() => map.invalidateSize(), 400);
  }
}

function fitAllCentersOnMap() {
  if (!map || !markers.length) return;
  const group = L.featureGroup(markers);
  map.fitBounds(group.getBounds().pad(0.18));
}

function updateMapMarkers() {
  if (!map || !window.L) return;
  markers.forEach(m => map.removeLayer(m));
  markers = CENTERS.map(c => {
    const events = getUpcomingEvents(c.id);
    const eventBadge = events.length > 0 ? `<br><small style="color:#8a5a00; font-weight:600;">📢 ${esc(events[0].title)}</small>` : "";
    const popupContent = `
      <div style="min-width:200px;">
        <b style="font-size:15px; color:#0f766e;">${esc(c.name)}</b><br>
        <span style="font-size:12.5px; color:#64748b;">${esc(c.addr)}</span><br>
        <small style="color:#64748b;">🕒 ${esc(c.hours)}</small>
        ${eventBadge}
        <div style="margin-top:10px;">
          <a href="#book" class="map-book-link" data-book="${c.id}" style="color:#ffffff !important; background:#0f766e !important; text-decoration:none !important; font-weight:700 !important; display:inline-block !important; padding:8px 16px !important; border-radius:8px !important; box-shadow:0 2px 6px rgba(15,118,110,0.35) !important; font-size:13.5px !important;">Select & Book Station ➔</a>
        </div>
      </div>
    `;
    return L.marker([c.lat, c.lng], { icon: createHealthCenterIcon() })
      .addTo(map)
      .bindPopup(popupContent);
  });
}

function selectCenterForBooking(centerId) {
  $("#bCenter").value = centerId;
  renderFacilitySnapshot();
  renderSlots();
  renderCenterAnnouncements(centerId);
  location.hash = "#book";
  const c = getCenter(centerId);
  toast(`Selected ${c ? c.name : "Health Center"}. Proceed with your booking!`);
}

/* Filter Health Centers List */
function renderCenters() {
  const t = today();
  const q = centerSearchQuery.toLowerCase().trim();
  const allSorted = getSortedCenters();

  let filtered = allSorted.filter(c => {
    if (!q) return true;
    return c.name.toLowerCase().includes(q) ||
      (c.barangay && c.barangay.toLowerCase().includes(q)) ||
      c.addr.toLowerCase().includes(q);
  });

  if (activeCenterFilter === "nearest" && me) {
    filtered.sort((a, b) => (a.km || 999) - (b.km || 999));
  } else if (activeCenterFilter === "events") {
    filtered = filtered.filter(c => getUpcomingEvents(c.id).length > 0);
  } else if (activeCenterFilter === "lowwait") {
    filtered = filtered.filter(c => waiting(dayList(c.id, t)).length <= 2);
  }

  const summaryEl = $("#searchSummary");
  if (summaryEl) {
    if (q) {
      summaryEl.innerHTML = `Showing <b>${filtered.length}</b> health facility matching "<b>${esc(q)}</b>"`;
    } else if (me) {
      summaryEl.innerHTML = `Showing <b>${filtered.length}</b> facilities sorted by proximity to your location`;
    } else {
      summaryEl.innerHTML = `All available municipal health stations (${filtered.length})`;
    }
  }

  if (filtered.length === 0) {
    $("#centerList").innerHTML = `<li style="padding:28px; text-align:center;" class="muted">No health stations found matching your search. Try another barangay or clear filters.</li>`;
    return;
  }

  const html = filtered.map((c, idx) => {
    const w = waiting(dayList(c.id, t)).length;
    const isNearest = (me != null && idx === 0 && !q && activeCenterFilter === "all");
    const nearestBadge = isNearest ? `<span class="badge badge-nearest">Nearest to You</span>` : "";
    const distText = c.km != null ? ` · <b>${c.km.toFixed(1)} km away</b>` : "";
    const events = getUpcomingEvents(c.id);
    const eventBadge = events.length > 0
      ? `<div style="margin-top:6px;"><span class="badge badge-event">📢 ${esc(events[0].title)} (${esc(events[0].date)})</span></div>`
      : "";
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;

    return `
      <li style="${isNearest ? 'border-color:var(--primary); background:#f9fefd;' : ''}">
        <div class="center-card-info">
          <b>${esc(c.name)} ${nearestBadge}</b>
          <span class="muted">
            ${esc(c.addr)}<br>
            🕒 ${esc(c.hours)}${distText} · 📞 ${esc(c.phone || "")}
          </span>
          ${eventBadge}
          <div style="margin-top:8px;">
            <a href="${gmapsUrl}" target="_blank" rel="noopener" class="directions-link">
              🗺️ Open in Google Maps ↗
            </a>
          </div>
        </div>
        <div class="center-card-actions">
          <span class="badge badge-wait ${w <= 2 ? 'low' : 'med'}">👥 ${w} waiting today (~${w * 10}m)</span>
          <a href="#book" class="center-select-btn" data-book="${c.id}">
            Select & Book ➔
          </a>
        </div>
      </li>
    `;
  }).join("");

  $("#centerList").innerHTML = html;
}

// Center filter chips delegation
document.addEventListener("click", e => {
  const chip = e.target.closest(".filter-chips .chip-btn");
  if (chip && chip.dataset.filter) {
    document.querySelectorAll(".filter-chips .chip-btn").forEach(b => b.classList.remove("active"));
    chip.classList.add("active");
    activeCenterFilter = chip.dataset.filter;
    renderCenters();
  }
});

// Center selection delegation
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-book]");
  if (btn) {
    e.preventDefault();
    selectCenterForBooking(btn.dataset.book);
  }
});

/* Geolocation Detection */
function setMe(lat, lng, label) {
  me = { lat, lng };
  if (map && window.L) {
    if (userMarker) {
      map.removeLayer(userMarker);
    }
    userMarker = L.marker([lat, lng], { icon: createUserIcon() })
      .addTo(map)
      .bindPopup(`<b>${esc(label || "Your Location")}</b>`)
      .openPopup();
    map.setView([lat, lng], 14);
  }

  const sorted = getSortedCenters();
  if (sorted.length > 0) {
    updateNearestBanner(sorted[0]);
  }
  renderCenters();
  renderFacilitySnapshot();
}

function detectLocation(interactive = true) {
  if (!navigator.geolocation) {
    if (interactive) toast("Geolocation is not supported by your browser.");
    return;
  }

  if (location.protocol === "http:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    if (interactive) {
      toast("Notice: HTTPS is required for live GPS on public domains. Please access via https:// or select a center.");
    }
    return;
  }

  if (interactive) toast("Detecting nearest health center...");

  navigator.geolocation.getCurrentPosition(
    p => {
      setMe(p.coords.latitude, p.coords.longitude, "Your Current Location");
      const sorted = getSortedCenters();
      if (sorted.length > 0) {
        const nearest = sorted[0];
        if (!$("#bCenter").dataset.userSelected) {
          $("#bCenter").value = nearest.id;
          renderFacilitySnapshot();
          renderSlots();
          renderCenterAnnouncements(nearest.id);
        }
        if (interactive) {
          toast(`Nearest station found: ${nearest.name} (${nearest.km.toFixed(1)} km)`);
        }
      }
    },
    err => {
      if (interactive) {
        toast("Location access denied or unavailable. Please pick a center from the list.");
      }
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// Health Center Search Input
const queryInput = $("#gQuery");
if (queryInput) {
  queryInput.addEventListener("input", e => {
    centerSearchQuery = e.target.value;
    renderCenters();
  });
}

$("#geoForm").addEventListener("submit", async e => {
  e.preventDefault();
  const q = ($("#gQuery").value || "").trim();
  centerSearchQuery = q;
  renderCenters();

  const qLower = q.toLowerCase();
  const localMatch = CENTERS.find(c =>
    c.name.toLowerCase().includes(qLower) ||
    (c.barangay && c.barangay.toLowerCase().includes(qLower)) ||
    c.addr.toLowerCase().includes(qLower)
  );

  if (localMatch && map) {
    map.setView([localMatch.lat, localMatch.lng], 15);
    const m = markers.find(marker => {
      const ll = marker.getLatLng();
      return Math.abs(ll.lat - localMatch.lat) < 0.001 && Math.abs(ll.lng - localMatch.lng) < 0.001;
    });
    if (m) m.openPopup();
    return;
  }

  if (q) {
    try {
      const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=" + encodeURIComponent(q));
      const j = await r.json();
      if (!j.length) return toast("No address or barangay found for '" + q + "'.");
      setMe(+j[0].lat, +j[0].lon, j[0].display_name);
    } catch {
      toast("Address search failed. Please check network connection.");
    }
  }
});

$("#gLocate").addEventListener("click", () => {
  detectLocation(true);
});

/* Community Health Drives Section View (#drives) */
function renderAllDrives() {
  const container = $("#allDrivesList");
  if (!container) return;

  let list = EVENTS;
  if (activeDriveFilter !== "all") {
    list = list.filter(e => e.type === activeDriveFilter);
  }

  if (list.length === 0) {
    container.innerHTML = `<p class="muted" style="text-align:center; padding:24px;">No health drives scheduled under this category currently.</p>`;
    return;
  }

  container.innerHTML = list.map(e => {
    const c = getCenter(e.centerId);
    return `
      <div class="event-card">
        <div class="event-title-row">
          <h4>${esc(e.title)}</h4>
          <span class="badge ${e.type.includes("Vaccination") ? "badge-drive" : "badge-event"}">${esc(e.badge || e.type)}</span>
        </div>
        <div class="event-meta">
          <span>📅 <b>${esc(e.date)}</b> (${esc(e.time)})</span>
          <span>📍 <b>${esc(c ? c.name : "Health Station")}</b> · ${esc(e.location)}</span>
          <span>👥 ${esc(e.eligibility || "Open to public")}</span>
        </div>
        <p class="event-desc">${esc(e.description)}</p>
        <button type="button" class="btn-book-drive" data-book-drive="${e.id}">
          Book Appointment for this Drive ➔
        </button>
      </div>
    `;
  }).join("");
}

// Drive type filter chips delegation
document.addEventListener("click", e => {
  const chip = e.target.closest("#driveFilterChips .chip-btn");
  if (chip && chip.dataset.driveType) {
    document.querySelectorAll("#driveFilterChips .chip-btn").forEach(b => b.classList.remove("active"));
    chip.classList.add("active");
    activeDriveFilter = chip.dataset.driveType;
    renderAllDrives();
  }
});

/* Staff Password Reveal Eye */
document.querySelectorAll(".eye").forEach(b => {
  const inp = b.parentElement.querySelector("input");
  const word = b.getAttribute("aria-label").replace("Show ", "");
  const REVEAL_MS = 3000;
  let down = 0, was = false, timer;
  const show = (v, auto) => {
    clearTimeout(timer);
    inp.type = v ? "text" : "password";
    b.classList.toggle("on", v);
    b.setAttribute("aria-pressed", v);
    b.setAttribute("aria-label", (v ? "Hide " : "Show ") + word);
    if (v && auto) timer = setTimeout(() => show(false), REVEAL_MS);
  };
  b.addEventListener("pointerdown", e => { e.preventDefault(); down = Date.now(); was = inp.type === "text"; show(true); });
  const up = () => { if (!down) return; const held = Date.now() - down > 350; down = 0; if (held || was) show(false); else show(true, true); };
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, up));
  b.addEventListener("click", e => { if (e.detail === 0) { const v = inp.type !== "text"; show(v, v); } });
  b.addEventListener("contextmenu", e => e.preventDefault());
});

/* Staff Login */
$("#loginForm").addEventListener("submit", e => {
  e.preventDefault();
  if ($("#sPin").value === CONFIG.STAFF_PIN && $("#sPass").value === CONFIG.STAFF_PASSWORD) {
    sessionStorage.setItem("mq_staff", "1");
    location.href = "staff.html";
  } else {
    $("#sPass").value = "";
    toast("Wrong PIN or password.");
  }
});

/* Periodic Refresh */
function refresh() {
  if ($("#track").classList.contains("on")) {
    renderTrack();
  }
  if ($("#centers").classList.contains("on")) {
    renderCenters();
  }
  if ($("#book").classList.contains("on")) {
    renderFacilitySnapshot();
  }
}

/* Application Initialization */
["bCenter", "bDate"].forEach(i => $("#" + i).addEventListener("change", () => {
  if (i === "bCenter") {
    $("#bCenter").dataset.userSelected = "1";
    renderFacilitySnapshot();
    renderCenterAnnouncements($("#bCenter").value);
  }
  renderSlots();
}));

$("#bCenter").innerHTML = opts(CENTERS, c => c.id);
$("#bService").innerHTML = opts(SERVICES);
$("#bDate").min = today();
$("#bDate").value = today();
$("#tRef").value = localStorage.getItem("mq_ref") || "";

renderServiceChips();
renderFacilitySnapshot();
renderCenterAnnouncements($("#bCenter").value);
renderSlots();
route();

/* Terms of Service & Data Privacy Gate (RA 10173) */
function initPrivacyGate() {
  const modal = $("#privacyModal");
  if (!modal) return;

  const chk = $("#chkAcceptPrivacy");
  const btnAccept = $("#btnAcceptPrivacy");
  const btnDecline = $("#btnDeclinePrivacy");
  const declineMsg = $("#privacyDeclineMsg");
  const linkOpen = $("#linkOpenPrivacy");

  const hasAccepted = !!localStorage.getItem("mq_terms_accepted");

  if (!hasAccepted) {
    // Show modal immediately on first access before user can interact with the app
    modal.showModal();
  }

  // Prevent closing with Escape key if terms have not been accepted yet
  modal.addEventListener("cancel", e => {
    if (!localStorage.getItem("mq_terms_accepted")) {
      e.preventDefault();
      if (declineMsg) declineMsg.hidden = false;
    }
  });

  if (chk && btnAccept) {
    chk.addEventListener("change", () => {
      btnAccept.disabled = !chk.checked;
      if (chk.checked && declineMsg) {
        declineMsg.hidden = true;
      }
    });
  }

  if (btnAccept) {
    btnAccept.addEventListener("click", () => {
      localStorage.setItem("mq_terms_accepted", new Date().toISOString());
      modal.close();
      toast("Terms & Data Privacy Policy accepted. Welcome to MediQueue!");
    });
  }

  if (btnDecline) {
    btnDecline.addEventListener("click", () => {
      if (declineMsg) declineMsg.hidden = false;
      toast("Consent is required to schedule appointments and generate queue passes.");
    });
  }

  if (linkOpen) {
    linkOpen.addEventListener("click", e => {
      e.preventDefault();
      if (chk) chk.checked = true;
      if (btnAccept) btnAccept.disabled = false;
      if (declineMsg) declineMsg.hidden = true;
      modal.showModal();
    });
  }
}

initPrivacyGate();

// Auto-detect nearest center silently on first load
detectLocation(false);

addEventListener("storage", refresh);
setInterval(refresh, 3000);
