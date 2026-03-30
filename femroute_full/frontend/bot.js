// ═══════════════════════════════════════════════════════════════
//  FemRoute — bot.js  (Sakhi Safety Chatbot)
//  Floating bottom-right chatbot with default replies & SOS
// ═══════════════════════════════════════════════════════════════

'use strict';

let botOpen = false, botInited = false;

// ── KNOWLEDGE BASE ───────────────────────────────────────────────
const KB = [
  {
    triggers: ['hi','hello','hey','namaste','hii','good morning','good evening','start'],
    reply: "Hi! 👋 I'm <b>Sakhi</b>, your 24/7 safety assistant on FemRoute.\n\nI can help you with:\n• Safe route guidance\n• Emergency support & SOS\n• Nearby services (police, hospitals)\n• How to book safe rides\n• Women's safety tips\n\nHow can I help you stay safe? 💪",
    qr: ['Safe route tips','I feel unsafe','Emergency numbers','Book a safe ride','Nearby police station']
  },
  {
    triggers: ['sos','emergency','help me','i feel unsafe','unsafe','danger','being followed','someone following','stalker','harassed','attack','threatened','scared','afraid'],
    reply: "🚨 <b>EMERGENCY PROTOCOL</b>\n\nStay calm. Act now:\n\n1️⃣ <b>Move to a crowded, lit place</b> immediately\n2️⃣ <b>Press 🆘 SOS button</b> at the top — alerts your contacts + authorities\n3️⃣ <b>Call 112</b> (Emergency) or <b>1091</b> (Women's Helpline)\n4️⃣ <b>Make noise</b> — draw attention\n5️⃣ <b>Don't go home if followed</b> — go to a shop or police station\n\nYou are <b>NOT alone</b>. Help is coming. 💪",
    qr: ['Trigger SOS now','Call 112','Call 1091 helpline','I am safe now'],
    action: null
  },
  {
    triggers: ['trigger sos','send sos','activate sos','press sos','sos now'],
    reply: "🚨 Triggering SOS alert right now...\n\nYour location is being shared with emergency contacts and local authorities.\n\n📞 <b>112</b> — Police Emergency\n📞 <b>1091</b> — Women's Helpline\n📞 <b>100</b> — Police\n📞 <b>102</b> — Ambulance\n\nStay visible. Stay calm. Help is on the way.",
    qr: ['I am safe now','What else should I do?'],
    action: 'sos'
  },
  {
    triggers: ['i am safe','im safe','safe now','false alarm','dismiss'],
    reply: "So glad you're safe! 💚\n\nA few things to do now:\n• Take a deep breath — you're okay\n• Tell a trusted person what happened\n• Report the incident at <b>safecity.in</b>\n• Save numbers: 112, 1091, 100\n\nFemRoute is always here for you. 🛡️",
    qr: ['Safe route tips','How to report incident','Thank you']
  },
  {
    triggers: ['what is femroute','how does femroute work','about femroute','explain femroute','how this app works','how it works'],
    reply: "FemRoute is an <b>AI-powered safe navigation system</b> built for women. 🗺️\n\n<b>How it works:</b>\n📍 Enter source + destination\n⚙️ Choose your Safety Mode\n🧠 AI analyses crime data, time of day & your profile\n✅ Get the SAFEST route — not just fastest\n\n<b>Extra features:</b>\n• 📍 Nearby police, hospitals, bus stops, NGOs\n• 🚗 Book Ola/Uber directly\n• 🆘 One-tap SOS alert\n• 🤖 Sakhi safety chatbot (that's me!)",
    qr: ['What is a safety score?','What modes are available?','Book a safe ride','Nearby services']
  },
  {
    triggers: ['safety score','score mean','what is safety score','how is score calculated','percentage','85% safe','60% safe'],
    reply: "📊 <b>Safety Score Explained</b>\n\nA score from 0–100%:\n\n🟢 <b>70–100%</b> → Safe — recommended\n🟡 <b>50–69%</b> → Moderate risk — proceed carefully\n🔴 <b>0–49%</b> → High risk — consider alternate\n\nCalculated from:\n🔴 Crime hotspot proximity (Haversine distance formula)\n🌙 Time of day (2.2× at night after 10 PM)\n🚶 Your travel mode\n📍 Segment-by-segment micro-analysis\n\nHigher = safer journey!",
    qr: ['What modes are available?','How does AI calculate risk?','Safe route tips']
  },
  {
    triggers: ['mode','modes','women mode','women safety','night mode','night travel','walking mode','which mode'],
    reply: "FemRoute has <b>3 Safety Modes</b>:\n\n♀ <b>Women Safety Mode</b>\nBoosts risk in areas with high harassment history. Best for daily commute.\n\n🌙 <b>Night Travel Mode</b>\n1.5× risk multiplier after 10 PM. Prioritises lit, busy roads.\n\n🚶 <b>Walking Mode</b>\n1.3× sensitivity — avoids isolated footpaths & dark lanes.\n\n💡 Switch modes anytime and re-analyse!",
    qr: ['What is a safety score?','Safe route tips','Night travel tips']
  },
  {
    triggers: ['book ride','ola','uber','rapido','cab','taxi','auto','how to book','ride'],
    reply: "🚗 <b>Book a Safe Ride</b>\n\nFemRoute connects you directly to:\n\n🟡 <b>Ola Cabs</b> — with trip sharing\n⚫ <b>Uber</b> — real-time track & share\n🟠 <b>Rapido</b> — bike & auto rides\n🗺️ <b>Google Maps</b> — navigate yourself\n\n<b>Before you ride:</b>\n✓ Note the vehicle number plate\n✓ Share trip with a trusted contact\n✓ Sit behind the driver\n✓ Keep SOS ready!\n\nClick <b>🚗 Book Ride</b> in the app!",
    qr: ['Safety tips for rides','What to do if unsafe in cab','Trigger SOS now']
  },
  {
    triggers: ['nearby','police station','hospital','ngo','bus stop','auto stand','pharmacy','where is','find nearby'],
    reply: "📍 <b>Nearby Services</b>\n\nFemRoute shows you:\n\n👮 Police stations\n🏥 Hospitals & clinics\n🤝 NGOs & women's centres\n🚌 Bus stops\n🛺 Auto stands\n💊 Pharmacies\n\nClick <b>📍 Nearby</b> in the quick actions bar at the top to see all services near you with one-tap directions!",
    qr: ['Nearest police station','I feel unsafe','Emergency numbers']
  },
  {
    triggers: ['nearest police','police number','call police'],
    reply: "👮 <b>Police Contacts</b>\n\n📞 <b>100</b> — Police Emergency\n📞 <b>112</b> — National Emergency\n📞 <b>1091</b> — Women's Helpline\n\nNearest police station on FemRoute:\nClick <b>📍 Nearby → 👮 Police</b> to see stations near you with directions.\n\nAlways note the station's name and address when you're travelling!",
    qr: ['Trigger SOS now','I feel unsafe','Emergency numbers']
  },
  {
    triggers: ['emergency numbers','helpline','what number','which number to call','important numbers','1091','112'],
    reply: "📞 <b>Emergency Numbers — India</b>\n\n🚨 <b>112</b> — National Emergency (Police+Ambulance+Fire)\n👮 <b>100</b> — Police\n🚑 <b>102</b> — Ambulance\n♀ <b>1091</b> — Women's Helpline\n💬 <b>iCall:</b> 9152987821 (mental health)\n🛡️ <b>1090</b> — Women Power Line (UP)\n\n<b>Apps to install:</b>\n• Himmat Plus (Delhi Police)\n• Nirbhaya (location sharing)\n\nSave these NOW — don't wait for an emergency!",
    qr: ['Safe route tips','I feel unsafe','How to report incident']
  },
  {
    triggers: ['safe route tips','safety tips','advice','tips','stay safe','how to stay safe','commute tips'],
    reply: "🛡️ <b>Top Safety Tips</b>\n\n<b>Before leaving:</b>\n• Check FemRoute for safest route\n• Share live location with a trusted contact\n• Charge phone to 50%+\n\n<b>While travelling:</b>\n• Stay on well-lit, busy roads\n• Avoid isolated shortcuts at night\n• Trust your gut — if something feels wrong, act\n\n<b>On your phone:</b>\n• Keep 112, 1091 saved\n• FemRoute SOS button is always ready\n• Don't be distracted by headphones in risky areas",
    qr: ['Night travel tips','What to do if followed','Emergency numbers','Book a safe ride']
  },
  {
    triggers: ['night travel','night safety','travel at night','late night','night tips'],
    reply: "🌙 <b>Night Travel Safety</b>\n\n• Switch to <b>Night Travel Mode</b> on FemRoute\n• Pre-book your cab — avoid random autos at night\n• Share live location + cab details with family\n• Sit behind the driver, not front seat\n• Fake a phone call if you feel watched\n• Note the cab number plate before entering\n• Trust your instincts — cancel if uncomfortable\n\n📞 Ola/Uber <b>share trip</b> features are your best friend at night!",
    qr: ['Book a safe ride','Emergency help','What to do if followed']
  },
  {
    triggers: ['followed','being followed','being stalked','stalked','what to do if followed','someone is following'],
    reply: "😰 <b>If you think you're being followed:</b>\n\n1. <b>Don't go home</b> — you'll reveal your address\n2. Enter a <b>shop, restaurant, or police station</b>\n3. <b>Call someone</b> and stay on the line\n4. <b>Change direction suddenly</b> — if they follow, you're sure\n5. Make brief <b>eye contact</b> — they know you've noticed\n6. <b>Scream for help</b> if they approach\n7. <b>Dial 112</b> immediately\n\nPress 🆘 SOS on FemRoute right now if in immediate danger!",
    qr: ['Trigger SOS now','Emergency numbers','I am safe now']
  },
  {
    triggers: ['unsafe in cab','cab driver','driver unsafe','feel unsafe in cab','ola unsafe','uber unsafe'],
    reply: "🚨 <b>If you feel unsafe in a cab:</b>\n\n1. <b>Stay on a phone call</b> with someone you trust\n2. Share your <b>live location</b> immediately\n3. <b>Note the driver's name + car number</b> from the app\n4. Ask to be dropped at a <b>busy public place</b>, not your exact home\n5. If the driver deviates from route — <b>call 112</b> immediately\n6. Press <b>SOS</b> on FemRoute\n\nAll ride apps have an in-app emergency button — use it!",
    qr: ['Trigger SOS now','Call 112','I am safe now']
  },
  {
    triggers: ['how to report','report incident','report harassment','fir','police complaint','safecity'],
    reply: "📋 <b>How to Report an Incident</b>\n\n<b>Online:</b>\n• <b>safecity.in</b> — report anonymously, helps other women\n• <b>cybercrime.gov.in</b> — for online harassment\n• <b>icrpc.nic.in</b> — online FIR portal\n\n<b>In person:</b>\n• Visit your nearest police station\n• Ask for a woman constable if preferred\n• Filing an FIR is FREE and your right\n\n<b>Why report?</b> Every report improves our safety maps and protects the next woman. 🗺️",
    qr: ['Nearby police station','Emergency numbers','Thank you']
  },
  {
    triggers: ['ors','api key','openrouteservice','open route service','real routing','how to get key','api'],
    reply: "🔑 <b>OpenRouteService API Key</b>\n\nFemRoute uses ORS for real distances + timing.\n\n<b>Get your FREE key in 2 minutes:</b>\n1. Go to <b>openrouteservice.org</b>\n2. Click Sign Up (free!)\n3. Dashboard → API Keys → Create Key\n4. Copy & paste into FemRoute's 🔑 box → Save\n\n🎁 Free plan = 2,000 requests/day — perfect for demos!\n\nWithout it, FemRoute uses simulated route data.",
    qr: ['How does FemRoute work?','What is a safety score?','Safe route tips']
  },
  {
    triggers: ['how does ai work','algorithm','machine learning','ai model','how risk','crime data','scoring'],
    reply: "🧠 <b>FemRoute AI Engine</b>\n\nRisk Score formula:\n<b>Risk = (Base + Crime Proximity) × Time × Mode</b>\n\n• <b>Base risk:</b> 0.15 (default any road)\n• <b>Crime proximity:</b> Haversine formula to crime hotspots\n• <b>Time multiplier:</b> 1.0 (day) → 1.2 (evening) → 2.2 (after 10 PM)\n• <b>Mode factor:</b> Women=1.15, Walking=1.30, Night=1.50\n• <b>Safety %</b> = (1 − avg risk) × 100\n\nIn production: connects to SafeCity API + NCRB crime data.",
    qr: ['What is a safety score?','What modes are available?','How does FemRoute work?']
  },
  {
    triggers: ['thank','thanks','thank you','ty','tq','helpful','awesome','great','good'],
    reply: "You're welcome! 💖\n\nFemRoute and Sakhi are always here for you — 24/7.\n\nRemember: You deserve to travel without fear. Stay safe, stay confident! ♀✨\n\nAnything else I can help with?",
    qr: ['Safe route tips','Emergency numbers','How does FemRoute work?']
  },
];

const FALLBACK = {
  reply: "I'm not sure I understood that 🤔\n\nHere's what I can help you with — pick one below or type anything:",
  qr: ['Safe route tips','Emergency help','Nearby police station','Book a safe ride','Emergency numbers','How does FemRoute work?']
};

// ── MATCH ────────────────────────────────────────────────────────
function matchKB(text) {
  const lower = text.toLowerCase().trim();
  for (const entry of KB) {
    for (const t of entry.triggers) {
      if (lower.includes(t)) return entry;
    }
  }
  return FALLBACK;
}

// ── RENDER ───────────────────────────────────────────────────────
function botTime() {
  return new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
}

function renderBotMsg(text, sender='bot', qrs=[]) {
  const container = document.getElementById('bot-msgs');
  const qrWrap = document.getElementById('bot-quick-wrap');

  // Clear old quick replies
  qrWrap.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = `bmsg ${sender}`;

  const av = document.createElement('div');
  av.className = 'bavatar';
  av.textContent = sender === 'bot' ? '♀' : '👤';

  const bub = document.createElement('div');
  bub.className = 'bbubble';
  const html = text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
  bub.innerHTML = `${html}<div class="btime">${botTime()}</div>`;

  if (sender === 'bot') { wrap.appendChild(av); wrap.appendChild(bub); }
  else { wrap.appendChild(bub); wrap.appendChild(av); }

  container.appendChild(wrap);

  // Render quick replies
  if (qrs.length) {
    qrs.forEach(qr => {
      const btn = document.createElement('button');
      btn.className = 'qr-btn' + (qr.toLowerCase().includes('sos')||qr.toLowerCase().includes('emergency')||qr.toLowerCase().includes('unsafe') ? ' qr-sos' : '');
      btn.textContent = qr;
      btn.onclick = () => { qrWrap.innerHTML = ''; handleInput(qr); };
      qrWrap.appendChild(btn);
    });
  }

  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const c = document.getElementById('bot-msgs');
  const wrap = document.createElement('div');
  wrap.className = 'bmsg bot'; wrap.id = 'bot-typing';
  const av = document.createElement('div'); av.className = 'bavatar'; av.textContent = '♀';
  const ind = document.createElement('div'); ind.className = 'typing-ind';
  ind.innerHTML = '<span></span><span></span><span></span>';
  wrap.appendChild(av); wrap.appendChild(ind);
  c.appendChild(wrap);
  c.scrollTop = c.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('bot-typing');
  if (el) el.remove();
}

// ── HANDLE INPUT ─────────────────────────────────────────────────
function handleInput(text) {
  if (!text.trim()) return;
  renderBotMsg(text, 'user');
  const match = matchKB(text);
  showTyping();
  setTimeout(() => {
    hideTyping();
    if (match.action === 'sos') setTimeout(() => triggerSOS(), 400);
    renderBotMsg(match.reply, 'bot', match.qr || []);
  }, 600 + Math.random()*350);
}

// ── SEND FROM INPUT ───────────────────────────────────────────────
function sendMsg() {
  const inp = document.getElementById('bot-inp');
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  handleInput(text);
}

// ── TOGGLE ───────────────────────────────────────────────────────
function toggleBot() {
  botOpen = !botOpen;
  document.getElementById('bot-window').classList.toggle('open', botOpen);
  document.getElementById('bot-fab').classList.toggle('open', botOpen);
  document.getElementById('bot-fab-icon').textContent = botOpen ? '✕' : '♀';
  document.getElementById('bot-badge').style.display = 'none';

  if (botOpen && !botInited) {
    botInited = true;
    setTimeout(() => {
      renderBotMsg(
        "Hi! 👋 I'm <b>Sakhi</b>, your FemRoute safety assistant.\n\nI'm here 24/7 — ask me anything about safe routes, emergencies, or nearby services.",
        'bot',
        ['Safe route tips','I feel unsafe','Emergency numbers','Book a safe ride','Nearby services']
      );
    }, 300);
    setTimeout(() => document.getElementById('bot-inp').focus(), 500);
  }
}

// Show badge after 3s
setTimeout(() => {
  if (!botOpen) {
    const b = document.getElementById('bot-badge');
    if (b) b.style.display = 'flex';
  }
}, 3000);
