/* MediQueue Shared Data, Configuration & Core Services */

const CONFIG = {
  STAFF_PIN: "11223344",
  STAFF_PASSWORD: "L3gitAk0",
  // Fill these from your free EmailJS dashboard to enable real emails:
  EMAILJS_PUBLIC_KEY: "LGDDaZsL6fkNgG0TB",
  EMAILJS_SERVICE_ID: "service_ne3unlm",
  EMAILJS_TEMPLATE_ID: "template_kxnh1hh", // template variables: to_email, to_name, subject, message, ref, queue_no, center_name, service, date, time
  SLOT_CAPACITY: 3,
  NOTIFY_AHEAD: 2, // email when this many patients are ahead
  AVG_MINS_PER_PATIENT: 10
};

const SERVICES_DATA = [
  { id: "s1", name: "General consultation", icon: "🩺", desc: "Comprehensive physical check, diagnosis & prescriptions", duration: "15 min" },
  { id: "s2", name: "Free BP & Health Check-up Drive", icon: "❤️", desc: "Free vital signs, blood pressure & glucose screening", duration: "10 min", badge: "Community Drive" },
  { id: "s3", name: "Prenatal check-up", icon: "🤰", desc: "Maternal health, ultrasound consultation & infant nutrition", duration: "25 min" },
  { id: "s4", name: "Vaccination", icon: "💉", desc: "Flu, pneumococcal, pediatric & adult immunization", duration: "10 min" },
  { id: "s5", name: "Medicine pick-up", icon: "💊", desc: "Maintenance medicine refills & pharmacy dispensing", duration: "5 min" },
  { id: "s6", name: "Dental check-up", icon: "🦷", desc: "Basic oral examination, fluoride & dental counseling", duration: "20 min" }
];

const SERVICES = SERVICES_DATA.map(s => s.name);

const TIMES = [];
for (let h = 8; h < 16; h++) {
  TIMES.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`);
}

const CENTERS = [
  {
    id: "c1",
    name: "Manggahan Health Center",
    addr: "Brgy. Manggahan, General Trias, Cavite",
    barangay: "Manggahan",
    hours: "Mon–Fri 8:00–16:00",
    phone: "(046) 509-1234",
    doctor: "Dr. Maria Elena Santos, MD",
    lat: 14.3866,
    lng: 120.8817,
    servicesCount: 6
  },
  {
    id: "c2",
    name: "Pinagtipunan Health Station",
    addr: "Brgy. Pinagtipunan, General Trias, Cavite",
    barangay: "Pinagtipunan",
    hours: "Mon–Fri 8:00–16:00",
    phone: "(046) 509-5678",
    doctor: "Dr. Roberto Mendoza, MD",
    lat: 14.3727,
    lng: 120.8786,
    servicesCount: 5
  },
  {
    id: "c3",
    name: "Javalera Health Center",
    addr: "Brgy. Javalera, General Trias, Cavite",
    barangay: "Javalera",
    hours: "Mon–Sat 8:00–17:00",
    phone: "(046) 509-9012",
    doctor: "Dr. Clarissa Reyes, MD",
    lat: 14.3445,
    lng: 120.8650,
    servicesCount: 6
  },
  {
    id: "c4",
    name: "San Francisco Health Center",
    addr: "Brgy. San Francisco, General Trias, Cavite",
    barangay: "San Francisco",
    hours: "Mon–Fri 8:00–16:00",
    phone: "(046) 509-3456",
    doctor: "Dr. Jerome Bautista, MD",
    lat: 14.3592,
    lng: 120.8931,
    servicesCount: 5
  }
];

// Healthcare events and check-up drives tied to centers
const EVENTS = [
  {
    id: "ev1",
    centerId: "c1",
    title: "Free Community Check-Up & Blood Pressure Drive",
    type: "Check-up Drive",
    badge: "Check-up Drive",
    targetService: "Free BP & Health Check-up Drive",
    date: "2026-11-20",
    time: "8:00 AM – 12:00 PM",
    location: "Manggahan Health Center - Main Covered Court",
    description: "Free comprehensive physical check-up, blood pressure screening, random blood glucose testing, and direct physician consultation. Free maintenance medicines will be distributed.",
    eligibility: "Open to all Barangay Manggahan residents"
  },
  {
    id: "ev2",
    centerId: "c1",
    title: "Flu & Pneumococcal Immunization Caravan",
    type: "Vaccination",
    badge: "Vaccination Drive",
    targetService: "Vaccination",
    date: "2026-11-24",
    time: "9:00 AM – 3:00 PM",
    location: "Manggahan Health Center",
    description: "Free seasonal influenza and pneumococcal vaccines for senior citizens (60+), young children, and immunocompromised patients. Please bring an ID or immunization booklet.",
    eligibility: "Seniors (60+), children (6m-5y), and immunocompromised"
  },
  {
    id: "ev3",
    centerId: "c2",
    title: "Hypertension & Diabetes Wellness Screening",
    type: "Check-up Drive",
    badge: "Health Screening",
    targetService: "Free BP & Health Check-up Drive",
    date: "2026-11-22",
    time: "8:30 AM – 1:00 PM",
    location: "Pinagtipunan Health Station",
    description: "Early screening for high blood pressure and diabetes, BMI measurement, and lifestyle nutrition counseling by registered municipal health staff.",
    eligibility: "Adults 25 years old and above"
  },
  {
    id: "ev4",
    centerId: "c3",
    title: "Maternal Health & Prenatal Care Mission",
    type: "Maternal Health",
    badge: "Maternal Mission",
    targetService: "Prenatal check-up",
    date: "2026-11-28",
    time: "8:00 AM – 2:00 PM",
    location: "Javalera Health Center",
    description: "Free prenatal check-ups, ultrasound consultations, iron and folic acid supplement distribution, and newborn care orientation for expectant mothers.",
    eligibility: "Pregnant women and nursing mothers"
  },
  {
    id: "ev5",
    centerId: "c4",
    title: "Barangay Dental & Pediatric Health Outreach",
    type: "Dental & Pediatric",
    badge: "Dental & Pediatric",
    targetService: "Dental check-up",
    date: "2026-11-27",
    time: "8:30 AM – 12:30 PM",
    location: "San Francisco Health Center",
    description: "Free dental check-ups, fluoride treatment for kids, vitamin A supplementation, and routine pediatric wellness evaluations.",
    eligibility: "Children aged 1 to 12 years old"
  }
];

const EMERGENCY_HOTLINES = [
  { label: "City Health Office", number: "(046) 509-1234", hours: "Mon–Fri 8AM–5PM" },
  { label: "General Trias Rescue / EMS", number: "(046) 509-5000", hours: "24/7 Hotline" },
  { label: "Philippine National Police", number: "911 / (046) 402-1234", hours: "24/7 Hotline" },
  { label: "Philippine Red Cross Cavite", number: "143 / (046) 431-0562", hours: "24/7 Assistance" }
];

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const load = () => JSON.parse(localStorage.getItem("mq_appts") || "[]");
const save = a => localStorage.setItem("mq_appts", JSON.stringify(a));
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = () => iso(new Date());
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const getCenter = id => CENTERS.find(c => c.id === id) || null;
const centerName = id => (getCenter(id) || {}).name || id;
const opts = (arr, f = x => x) => arr.map(x => `<option value="${esc(f(x))}">${esc(x.name || x)}</option>`).join("");
const pad = n => String(n).padStart(3, "0");

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), 3500);
}

/* Event Helpers */
function getUpcomingEvents(centerId) {
  if (!centerId) return EVENTS;
  return EVENTS.filter(e => e.centerId === centerId);
}

/* Clean SVG QR Code Generator (Pure JavaScript, Zero External Dependency) */
function generateQrSvg(text) {
  // Generates an elegant, realistic vector matrix pattern simulation for the pass
  const size = 110;
  const modules = 21; // 21x21 QR standard grid
  const cellSize = size / modules;
  
  // Deterministic pattern based on the text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  
  let rects = "";
  // Corner position finder patterns (standard 7x7)
  const drawFinder = (startX, startY) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isCenter) {
          rects += `<rect x="${(startX + c) * cellSize}" y="${(startY + r) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f766e" />`;
        }
      }
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(modules - 7, 0); // Top-right
  drawFinder(0, modules - 7); // Bottom-left

  // Data modules
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= modules - 8;
      const inBottomLeft = r >= modules - 8 && c < 8;
      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        const bit = Math.abs((hash ^ (r * 31 + c * 17) ^ (r * c)) % 3) === 0;
        if (bit) {
          rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1e293b" />`;
        }
      }
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="qr-svg" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#ffffff" rx="8" />
    ${rects}
  </svg>`;
}

/* Formal Email Message Generator */
function composeFormalMessage(a, center, events) {
  const cName = center ? center.name : centerName(a.center);
  const cAddr = center ? center.addr : "Municipal Health Center";
  const cHours = center ? center.hours : "Mon–Fri 8:00–16:00";
  const cPhone = center && center.phone ? center.phone : "(046) 509-1234";

  let eventSection = "Currently no special medical mission drives are scheduled on this date. Regular clinical consultations remain ongoing.";
  if (events && events.length > 0) {
    eventSection = events.map((e, idx) => 
      `  ${idx + 1}. [${e.badge}] ${e.title}\n     Date & Time : ${e.date} (${e.time})\n     Venue       : ${e.location}\n     Overview    : ${e.description}`
    ).join("\n\n");
  }

  return `======================================================================
                 MEDIQUEUE PUBLIC HEALTHCARE SYSTEM
             OFFICIAL APPOINTMENT CONFIRMATION & PASS
======================================================================

Dear ${a.name},

Thank you for coordinating with MediQueue Public Healthcare Services. 
We are pleased to formally confirm that your medical appointment has 
been successfully registered in our municipal queue management registry.

----------------------------------------------------------------------
1. APPOINTMENT & QUEUE SUMMARY
----------------------------------------------------------------------
• Reference Code    : ${a.ref}
• Queue Number      : #${pad(a.no)}
• Medical Service   : ${a.service}
• Appointment Date  : ${a.date}
• Designated Slot   : ${a.time || "Regular Walk-in Hours"}
• Health Facility   : ${cName}
• Facility Address  : ${cAddr}
• Operating Hours   : ${cHours}
• Contact Hotline   : ${cPhone}

----------------------------------------------------------------------
2. PATIENT PRE-ARRIVAL INSTRUCTIONS
----------------------------------------------------------------------
To facilitate prompt and efficient healthcare delivery, kindly review 
the following reminders prior to your visit:

1. Arrival Window: Please arrive at the health center 10 to 15 minutes 
   before your scheduled slot (${a.time || "clinic opening"}).
2. Triage Check-in: Present your Reference Code (${a.ref}) and Queue 
   Number (#${pad(a.no)}) to the triage or receptionist on duty.
3. Required Documents: Please bring a valid government-issued ID, 
   Barangay ID, or PhilHealth card, along with past medical records 
   or maintenance prescriptions.
4. Infection Control: If you are experiencing fever, coughing, or 
   flu-like symptoms, please wear a well-fitted protective face mask.
5. Live Status: You may monitor live queue numbers at any time on the 
   MediQueue tracking page using your Reference Code: ${a.ref}.

----------------------------------------------------------------------
3. UPCOMING HEALTHCARE DRIVES & COMMUNITY EVENTS AT THIS CENTER
----------------------------------------------------------------------
${eventSection}

----------------------------------------------------------------------
Should you need to reschedule or require urgent assistance, please 
visit the tracking portal or coordinate directly with health center staff.

We look forward to serving your healthcare needs.

Respectfully yours,

PATIENT CARE & QUEUE MANAGEMENT SERVICES
${cName}
Municipal Health Office
MediQueue Healthcare Automated Dispatch
======================================================================`;
}

/* Email Dispatch (EmailJS with Mobile Fallback & Timeout) */
if (window.emailjs && CONFIG.EMAILJS_PUBLIC_KEY) {
  try {
    emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });
  } catch (err) {
    console.warn("EmailJS init error:", err);
  }
}

async function mail(a, subject, message) {
  if (!a.email) {
    return { success: false, reason: "no_email" };
  }

  const center = getCenter(a.center);
  const mailtoUrl = `mailto:${encodeURIComponent(a.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  let success = false;
  if (window.emailjs && CONFIG.EMAILJS_PUBLIC_KEY && CONFIG.EMAILJS_SERVICE_ID) {
    try {
      const templateParams = {
        to_email: a.email,
        email: a.email,
        to_name: a.name,
        name: a.name,
        subject: subject,
        message: message,
        ref: a.ref,
        queue_no: pad(a.no),
        center_name: center ? center.name : a.center,
        center_address: center ? center.addr : "",
        service: a.service,
        date: a.date,
        time: a.time || "Walk-in"
      };

      // Set a 4.5s timeout so mobile browsers never hang indefinitely
      const sendPromise = emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, templateParams);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4500));

      await Promise.race([sendPromise, timeoutPromise]);
      success = true;
    } catch (err) {
      console.warn("Direct EmailJS dispatch failed or blocked on this device:", err);
      success = false;
    }
  }

  return {
    success,
    mailtoUrl,
    subject,
    message
  };
}

/* Queue helpers */
const dayList = (c, d) => load().filter(a => a.center === c && a.date === d).sort((x, y) => x.no - y.no);
const waiting = list => list.filter(a => a.status === "waiting");
const ahead = a => waiting(dayList(a.center, a.date)).filter(x => x.no < a.no).length;
function nextNo(c, d) { return Math.max(0, ...dayList(c, d).map(a => a.no)) + 1; }
function addAppt(o) {
  const all = load();
  const a = { ref: "MQ-" + Math.random().toString(36).slice(2, 6).toUpperCase(), status: "waiting", notified: false, walkin: false, ...o, no: nextNo(o.center, o.date) };
  all.push(a);
  save(all);
  return a;
}

/* Staff session */
const isStaff = () => sessionStorage.getItem("mq_staff") === "1";
