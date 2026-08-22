import './style.css'
import './admin-sticky.css'
import './uploads.css'
import './calendar.css'
import './admin-sections.css'
import './admin-legibility.css'
import signatureUrl from './assets/Signatur2.png?inline'

const portfolio = [
  { title: 'Botanical Flow', type: 'Fineline · Unterarm', position: '50% 68%' },
  { title: 'Nocturne', type: 'Realistic · Custom', position: '50% 47%' },
  { title: 'Wild Peony', type: 'Microrealism · Detail', position: '50% 78%' },
]
const demoRequests = []
const appointments = []
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
const LOCAL_APPOINTMENTS_KEY = 'sfumato-appointments'
const readLocalAppointments = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_APPOINTMENTS_KEY) || '[]') }
  catch { return [] }
}
const saveLocalAppointment = appointment => localStorage.setItem(LOCAL_APPOINTMENTS_KEY, JSON.stringify([...readLocalAppointments(), appointment].slice(-1000)))
const createAppointment = async payload => {
  try {
    const response=await fetch('/api/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const text=await response.text()
    let result
    try { result=text?JSON.parse(text):null } catch { result=null }
    if(response.ok&&result?.id)return result
  } catch {}
  const localAppointment={...payload,id:`APT-LOCAL-${Date.now().toString(36).toUpperCase()}`,createdAt:new Date().toISOString(),source:'local'}
  saveLocalAppointment(localAppointment)
  return localAppointment
}
const LOCAL_REQUESTS_KEY = 'sfumato-booking-requests'
const readLocalRequests = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_REQUESTS_KEY) || '[]') }
  catch { return [] }
}
const saveLocalRequest = request => {
  const requests = [request, ...readLocalRequests()].slice(0, 250)
  try { localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests)) }
  catch {
    const compact = requests.map(item => ({ ...item, references: (item.references || []).map(reference => ({ name: reference.name, type: reference.type })) }))
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(compact))
  }
}
const markLocalRequestRead = id => {
  const requests = readLocalRequests()
  const request = requests.find(item => item.id === id)
  if (!request) return
  request.readAt = request.readAt || new Date().toISOString()
  localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests))
}
const sortRequests = requests => requests.sort((a,b) => Number(Boolean(a.readAt))-Number(Boolean(b.readAt)) || new Date(b.date)-new Date(a.date))
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
const instagram = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'
const adminWelcome = () => {
  const now = new Date()
  const hour = Number(new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }).format(now))
  const greeting = hour < 11 ? 'Guten Morgen.' : hour < 18 ? 'Guten Tag.' : 'Guten Abend.'
  const date = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: 'long' }).format(now).toUpperCase()
  return { greeting, date }
}

function siteMarkup() {
  return `
    <div class="scroll-progress" aria-hidden="true"></div><div class="cursor-dot" aria-hidden="true"></div>
    <header class="site-header">
      <a class="brand" href="#top" aria-label="Tattoo Sfumato Startseite"><span>TATTOO</span><i>·</i><span>SFUMATO</span></a>
      <nav aria-label="Hauptnavigation"><a href="#arbeiten">Arbeiten</a><a href="#about">Das Studio</a><a href="#ablauf">Ablauf</a><a class="mobile-nav-cta" href="#termin">Projekt starten ${arrow}</a></nav>
      <a class="nav-cta" href="#termin">Termin anfragen ${arrow}</a>
      <button class="menu" aria-label="Menü öffnen" aria-expanded="false"><span></span><span></span></button>
    </header>
    <main id="top">
      <section class="hero">
        <div class="hero-copy reveal">
          <p class="eyebrow"><span></span> Tattoo Sfumato · Einbeck</p>
          <h1><span>Skin.</span><br><em>Soul.</em><br><span>Story.</span></h1>
          <p class="hero-lead">Tattoo Sfumato steht für individuelle Kunst, die mit deinem Körper arbeitet — nicht gegen ihn. Entworfen und gestochen in Einbeck.</p>
          <div class="hero-actions"><a class="button primary" href="#termin">Projekt starten ${arrow}</a><a class="text-link" href="#arbeiten">Arbeiten entdecken <span>↓</span></a></div>
        </div>
        <div class="hero-visual reveal">
          <img src="/studio-hero.png" alt="Tattoo Artist bei einer detailreichen Tattoo-Arbeit">
          <div class="image-index"><b>01</b><span></span><small>03</small></div>
        </div>
        <div class="hero-stamp"><b>SFUMATO</b><span>CUSTOM TATTOOING<br>EINBECK · DE</span></div>
        <div class="scroll-note">SCROLL TO EXPLORE <span>↓</span></div>
      </section>
      <div class="marquee" aria-label="Tattoo Stile"><div><span>REALISTIC</span><i>✦</i><span>MICROREALISM</span><i>✦</i><span>FINELINE</span><i>✦</i><span>REALISTIC</span><i>✦</i><span>MICROREALISM</span><i>✦</i><span>FINELINE</span></div></div>
      <section class="statement section-pad"><p class="section-no">[ 01 — PHILOSOPHIE ]</p><h2>Kein Motiv von der Stange.<br><em>Ein Stück von dir.</em></h2><p>Jedes Tattoo beginnt mit Zuhören. Aus deiner Idee, unserer Handschrift und einem sorgfältigen Entwurf entsteht etwas, das nur einmal existiert.</p></section>
      <section id="arbeiten" class="work section-pad">
        <div class="section-head"><div><p class="section-no">[ 02 — AUSGEWÄHLTE ARBEITEN ]</p><h2>Selected <em>work.</em></h2></div><p>Realistic, Microrealism & Fineline — detailgenau, individuell und für deinen Körper entworfen.</p></div>
        <div class="gallery">${portfolio.map((item, i) => `<article class="work-card reveal" style="--pos:${item.position}"><div class="work-image"><img src="/studio-hero.png" alt="${item.title}"><span>0${i+1}</span></div><div><h3>${item.title}</h3><p>${item.type}</p></div></article>`).join('')}</div>
      </section>
      <section id="about" class="about section-pad"><div class="about-image"><img src="/studio-hero.png" alt="Detail aus dem Tattoo-Studio Sfumato"></div><div class="about-copy"><p class="section-no">[ 03 — TATTOO SFUMATO ]</p><h2>Handwerk trifft<br><em>Haltung.</em></h2><p>Bei Tattoo Sfumato treffen professionelles Handwerk und eine familiäre Atmosphäre aufeinander. Wir arbeiten konzentriert und mit höchstem Anspruch — dabei bleibt der Umgang persönlich, locker und ganz ohne steife Studio-Vibes.</p><blockquote>„Sfumato bedeutet so viel wie ‚in Rauch aufgehen‘. Das ist eine alte Maltechnik, die mein Vater damals in seiner Kunstarbeit benutzt hat.“<cite>— Leon Zwezich</cite></blockquote><div class="signature" data-protected-signature><img src="${signatureUrl}" alt="Unterschrift von Leon Zwezich" draggable="false"></div></div></section>
      <section id="imagefilm" class="film-section section-pad">
        <div class="film-heading"><div><p class="section-no">[ 04 — IMAGEFILM ]</p><h2>Inside<br><em>Sfumato.</em></h2></div><p>Ein Blick hinter die Kulissen — Atmosphäre, Handwerk und die Menschen, die Tattoo Sfumato prägen.</p></div>
        <div class="film-frame reveal">
          <video src="/Imagevideo.MP4" poster="/Cover.png" preload="metadata" playsinline aria-label="Imagefilm von Tattoo Sfumato"></video>
          <div class="film-shade"></div>
          <div class="film-status"><i></i><span>IMAGEFILM<br><b>SFUMATO / EINBECK</b></span></div>
          <button class="film-play" type="button" aria-label="Imagefilm abspielen"><span></span></button>
          <div class="film-meta"><button class="film-control-play" type="button" aria-label="Imagefilm abspielen"><span></span></button><input class="film-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Videofortschritt"><span class="film-time">00:00</span><button class="film-fullscreen" type="button" aria-label="Vollbild öffnen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg></button></div>
        </div>
      </section>
      <section id="ablauf" class="process section-pad"><div class="section-head"><div><p class="section-no">[ 05 — DER ABLAUF ]</p><h2>Von der Idee<br><em>unter die Haut.</em></h2></div></div><div class="steps"><article><span>01</span><h3>Deine Anfrage</h3><p>Erzähl uns von deinem Motiv, der Stelle und deiner Wunschgröße. Referenzbilder helfen, müssen aber nicht perfekt sein.</p></article><article><span>02</span><h3>Konzept & Termin</h3><p>Wir klären Stil, Umfang und Budget. Danach erhältst du einen passenden Termin und alle Infos zur Vorbereitung.</p></article><article><span>03</span><h3>Dein Tattoo</h3><p>Am Termin finalisieren wir den Entwurf gemeinsam. Erst wenn alles passt, geht es los — ohne Zeitdruck.</p></article></div></section>
      <section id="termin" class="booking section-pad">
        <div class="booking-intro"><p class="section-no">[ 06 — BOOKING ]</p><h2>Let’s create<br><em>something real.</em></h2><p>Je genauer deine Anfrage, desto besser können wir dein Projekt einschätzen. Wir melden uns in der Regel innerhalb von 3–5 Werktagen.</p><div class="contact-meta"><span>STUDIO</span><p>Tattoo Sfumato<br><a href="https://www.google.com/maps/search/?api=1&query=Altendorfer+Tor+7%2C+37574+Einbeck" target="_blank" rel="noopener noreferrer">Altendorfer Tor 7<br>37574 Einbeck ↗</a></p><span>TELEFON</span><p><a href="tel:+4915734408549">01573 4408549</a></p></div></div>
        <form id="booking-form" class="booking-form"><label>DEIN NAME<input required name="name" placeholder="Vor- und Nachname"></label><div class="form-row"><label>E-MAIL<input required type="email" name="email" placeholder="name@email.de"></label><label>TELEFON <small>OPTIONAL</small><input name="phone" placeholder="+49 ..."></label></div><div class="form-row"><div class="custom-select-field"><span class="form-label">STIL</span><div class="custom-select"><input type="hidden" name="style"><button class="custom-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">Bitte auswählen<span></span></button><div class="custom-select-options" role="listbox" hidden><button type="button" role="option" data-value="Realistic">Realistic</button><button type="button" role="option" data-value="Microrealism">Microrealism</button><button type="button" role="option" data-value="Fineline">Fineline</button><button type="button" role="option" data-value="Andere Richtung">Andere Richtung</button></div></div></div><label>KÖRPERSTELLE<input required name="placement" placeholder="z. B. Unterarm innen"></label></div><div class="form-row"><label>UNGEFÄHRE GRÖSSE <small>IN CM</small><input required name="size" inputmode="decimal" placeholder="z. B. 15 × 10 cm"></label><label class="consultation-toggle"><input type="checkbox" name="consultation" id="consultation" value="yes"><span class="form-check"></span><span class="consultation-label"><b>BERATUNG VORAB</b><small>Bitte erst ein Beratungsgespräch</small></span></label></div><fieldset class="consultation-choice" hidden><legend>WIE DÜRFEN WIR DICH BERATEN?</legend><div class="consultation-options"><label><input type="radio" name="consultationType" value="studio"><span></span><b>Persönlich im Studio</b></label><label><input type="radio" name="consultationType" value="phone"><span></span><b>Telefonisch</b></label></div></fieldset><label>ERZÄHL UNS VON DEINER IDEE<textarea required name="idea" rows="4" placeholder="Motiv, Bedeutung, Wünsche …"></textarea></label><label class="upload" id="reference-dropzone"><input id="reference-input" type="file" name="reference" accept="image/jpeg,image/png,image/webp" multiple><span class="plus">+</span><span><b>Referenzen hinzufügen</b><small>Auswählen oder hierher ziehen · max. 5 Bilder · je 10 MB</small></span></label><div class="upload-previews" aria-live="polite"></div><label class="consent"><input required type="checkbox"><span></span><small>Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung der Anfrage zu.</small></label><button class="button primary submit" type="submit">Anfrage senden ${arrow}</button><p class="form-message" role="status"></p></form>
      </section>
    </main>
    <footer><div class="footer-brand" data-protected-signature><img src="${signatureUrl}" alt="Signatur von Leon Zwezich" draggable="false"></div><div><a href="#arbeiten">Arbeiten</a><a href="#about">Studio</a><a href="#termin">Booking</a><a href="/admin/">Admin</a></div><div class="social"><a href="https://www.instagram.com/tattoo_sfumato/?hl=de" target="_blank" rel="noopener noreferrer" aria-label="Tattoo Sfumato auf Instagram">${instagram}<span>@tattoo_sfumato</span></a></div><p>© 2026 Tattoo Sfumato · Einbeck · Impressum · Datenschutz</p></footer><div class="toast" role="status"></div>`
}

function dashboardView(){
  const days=['Mo','Di','Mi','Do','Fr','Sa','So']
  const year=calendarMonth.getFullYear(), month=calendarMonth.getMonth()
  const firstOffset=(new Date(year,month,1).getDay()+6)%7
  const daysInMonth=new Date(year,month+1,0).getDate()
  const cells=Array.from({length:42},(_,i)=>{const day=i-firstOffset+1;return day>0&&day<=daysInMonth?day:''})
  const key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const todayKey=key(new Date())
  const todayAppointments=appointments.filter(item=>String(item.start).slice(0,10)===todayKey).sort((a,b)=>new Date(a.start)-new Date(b.start))
  const monthName=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(calendarMonth)
  const future=appointments.filter(item=>new Date(item.start)>new Date()).sort((a,b)=>new Date(a.start)-new Date(b.start))[0]
  const todayHours=todayAppointments.reduce((sum,item)=>sum+Math.max(0,(new Date(item.end)-new Date(item.start))/3600000),0)
  return `<div class="admin-title"><div><span class="admin-kicker">ÜBERSICHT</span><h2>Dashboard</h2><p>Termine, offene Anfragen und Auslastung auf einen Blick.</p></div><div class="dashboard-actions"><button class="secondary-action" data-new-appointment>+ Termin anlegen</button><span class="sync-btn"><i></i> Studio-Kalender aktiv</span></div></div>
  <div class="dashboard-stats"><article><span>HEUTE</span><b>${todayAppointments.length}</b><small>Termine · ${todayHours.toLocaleString('de-DE',{maximumFractionDigits:1})} Std.</small></article><article><span>NEUE ANFRAGEN</span><b>${demoRequests.filter(x=>!x.readAt).length}</b><small>noch ungelesen</small></article><article><span>TERMINE</span><b>${appointments.length}</b><small>insgesamt geplant</small></article><article><span>NÄCHSTER TERMIN</span><b class="date-stat">${future?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short'}).format(new Date(future.start)):'—'}</b><small>${future?new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(future.start))+' Uhr':'noch nicht geplant'}</small></article></div>
  <section class="today-files"><div class="today-files-head"><div><span class="admin-kicker">HEUTE</span><h3>Heutige Terminakten</h3></div><b>${todayAppointments.length}</b></div>${todayAppointments.length?`<div class="today-file-list">${todayAppointments.map(item=>`<button data-appointment="${item.id}"><time>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(item.start))}</time><span><b>${item.clientName}</b><small>${item.style||'Tattoo-Termin'} · ${item.placement||'Studio'}</small></span><i>Akte öffnen ↗</i></button>`).join('')}</div>`:'<div class="today-empty">Heute sind keine Terminakten eingeplant.</div>'}</section>
  <div class="calendar-card"><div class="calendar-head"><div><button data-calendar-prev aria-label="Vorheriger Monat">‹</button><h3>${monthName}</h3><button data-calendar-next aria-label="Nächster Monat">›</button></div><div><span class="cal-dot studio"></span>Studio <span class="cal-dot google"></span>Google</div></div><div class="calendar-grid">${days.map(d=>`<b>${d}</b>`).join('')}${cells.map(day=>{if(!day)return'<span class="cal-day empty"></span>';const dateKey=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const entries=appointments.filter(item=>String(item.start).slice(0,10)===dateKey);return`<button class="cal-day ${entries.length?'has-event':''} ${dateKey===todayKey?'today':''}" ${entries.length?`data-appointment="${entries[0].id}" aria-label="Termin am ${day}. öffnen"`:''}><span>${day}</span>${entries.slice(0,2).map(item=>`<small>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(item.start))} ${item.clientName}</small>`).join('')}${entries.length>2?`<em>+${entries.length-2} weitere</em>`:''}</button>`}).join('')}</div></div>`
}
function appointmentView(day){
  const client=day==='8'?'Jonas R.':day==='18'?'Sina V.':'Mara K.'
  return `<div class="detail-top"><button class="detail-back" data-back-dashboard>← Kalender</button><div><button class="secondary-action">Termin verschieben</button><button class="save-settings">Kundennachricht senden</button></div></div>
  <div class="appointment-head"><div><span class="admin-kicker">BESTÄTIGTER TERMIN · GOOGLE CALENDAR</span><h2>${client}</h2><p>Microrealism · Unterarm innen</p></div><div class="appointment-time"><span>AUG</span><b>${String(day).padStart(2,'0')}</b><small>12:30–16:30</small></div></div>
  <div class="appointment-layout">
    <section class="appointment-main">
      <div class="appointment-section-head"><div><span>ANFRAGE</span><h3>Florale Komposition mit Pfingstrose</h3></div><a href="#">Originalanfrage öffnen ↗</a></div>
      <p class="appointment-copy">Gewünscht ist ein organischer Verlauf entlang des inneren Unterarms. Feine Blattstrukturen, eine zentrale Pfingstrose und ausreichend negative Fläche. Kontrastreich, aber nicht zu dunkel.</p>
      <div class="appointment-facts"><div><span>STIL</span><b>Microrealism</b></div><div><span>KÖRPERSTELLE</span><b>Unterarm innen</b></div><div><span>GRÖSSE</span><b>15–20 cm</b></div><div><span>DAUER</span><b>4 Stunden</b></div></div>
      <div class="asset-title"><div><span>ZUGETEILTE BILDER</span><p>Entwürfe und Referenzen für diesen Termin</p></div><label class="asset-upload"><input type="file" accept="image/*" multiple>＋ Bilder zuweisen</label></div>
      <div class="assigned-assets"><article><img src="/studio-hero.png"><span><b>Finaler Entwurf</b><small>sfumato_mara_v3.jpg</small></span><i>FINAL</i></article><article><img src="/studio-hero.png"><span><b>Kundenreferenz</b><small>reference_flower.jpg</small></span><i>REF</i></article><article class="asset-placeholder"><b>＋</b><span>Weitere Datei zuweisen</span></article></div>
      <div class="files-list"><span>ANHÄNGE</span><button><i>JPG</i><span><b>Referenz_Arm.jpg</b><small>2,4 MB · Kunden-Upload</small></span><em>↓</em></button><button><i>PDF</i><span><b>Einverständniserklärung.pdf</b><small>184 KB · unterschrieben</small></span><em>↓</em></button></div>
    </section>
    <aside class="appointment-aside">
      <section><span>KUNDIN</span><h3>${client}</h3><p>mara.k@example.de<br>+49 151 240 988</p><button>Kontakt öffnen</button></section>
      <section><span>VORBEREITUNG</span><label><input type="checkbox" checked> Anzahlung erhalten</label><label><input type="checkbox" checked> Entwurf zugewiesen</label><label><input type="checkbox"> Material vorbereitet</label><label><input type="checkbox"> Einverständnis geprüft</label></section>
      <section><span>INTERNE NOTIZ</span><textarea rows="5">Bitte feine 3RL-Nadel vorbereiten. Kundin reagiert empfindlich auf Pflaster.</textarea><button>Notiz speichern</button></section>
    </aside>
  </div>`
}
function realAppointmentView(id) {
  const item=appointments.find(appointment=>appointment.id===id)
  if(!item)return `<div class="detail-top"><button class="detail-back" data-back-dashboard>← Kalender</button></div><div class="request-empty"><span>404</span><h3>Termin nicht gefunden.</h3><p>Die Terminakte ist nicht mehr vorhanden.</p></div>`
  const start=new Date(item.start), end=new Date(item.end)
  const request=demoRequests.find(entry=>entry.id===item.requestId)
  return `<div class="detail-top"><button class="detail-back" data-back-dashboard>← Kalender</button><div><button class="secondary-action">Termin verschieben</button><button class="save-settings">Kundennachricht senden</button></div></div><div class="appointment-head"><div><span class="admin-kicker">BESTÄTIGTER TERMIN · ${item.source==='google'?'GOOGLE CALENDAR':'STUDIO'}</span><h2>${item.clientName}</h2><p>${item.style||'Tattoo-Termin'} · ${item.placement||'Studio'}</p></div><div class="appointment-time"><span>${new Intl.DateTimeFormat('de-DE',{month:'short'}).format(start).toUpperCase()}</span><b>${String(start.getDate()).padStart(2,'0')}</b><small>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(start)}–${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(end)}</small></div></div><div class="request-detail-grid"><section class="project-card"><span>TERMINAKTE</span><dl><div><dt>Stil</dt><dd>${item.style||'Nicht angegeben'}</dd></div><div><dt>Körperstelle</dt><dd>${item.placement||'Nicht angegeben'}</dd></div><div><dt>Dauer</dt><dd>${Math.max(0,(end-start)/3600000).toLocaleString('de-DE')} Stunden</dd></div><div><dt>Kontakt</dt><dd>${item.phone||item.email||'Nicht angegeben'}</dd></div></dl><span>NOTIZ</span><p>${item.notes||request?.idea||'Keine Notiz vorhanden.'}</p>${request?.references?.length?`<span>REFERENZBILDER</span><div class="request-references">${request.references.map((reference,index)=>`<a href="${reference.url||reference.data}" target="_blank" rel="noopener"><img src="${reference.url||reference.data}" alt="Referenzbild ${index+1}"><small>${reference.name||`Referenz ${index+1}`}</small></a>`).join('')}</div>`:''}</section><section class="timeline-card"><span>VORBEREITUNG</span><div><i></i><p><b>Termin bestätigt</b><small>${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium'}).format(start)}</small></p></div><textarea placeholder="Interne Notiz hinzufügen …">${item.internalNote||''}</textarea></section></div>`
}
function consultationBadge(request) {
  if (!request.consultation) return '<i class="consultation-badge none"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Keine Beratung</span></i>'
  if (request.consultationType === 'phone') return '<i class="consultation-badge phone"><svg viewBox="0 0 24 24"><path d="M7 3h3l1.5 5-2 1.5a15 15 0 0 0 5 5L16 12.5l5 1.5v3c0 2.2-1.8 4-4 4A14 14 0 0 1 3 7c0-2.2 1.8-4 4-4Z"/></svg><span>Telefon</span></i>'
  return '<i class="consultation-badge studio"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg><span>Persönlich</span></i>'
}
function requestsView() {
  const rows = demoRequests.map((r,i)=>`<button class="request-row ${r.readAt ? '' : 'unread'}" data-request="${i}" data-style="${r.style || ''}" data-consultation="${r.consultation ? (r.consultationType === 'phone' ? 'phone' : 'studio') : 'none'}" data-status="${r.status}"><span><b>${r.name}${r.readAt ? '' : '<i class="unread-dot" aria-label="Ungelesen"></i>'}</b><small>${r.email || r.phone || 'Keine Kontaktdaten'} · ${r.id}</small></span><span><b>${r.style || 'Nicht angegeben'}</b><small>${r.placement || 'Körperstelle offen'}</small></span><span><b>${r.size || 'Größe offen'}</b><small>Projektumfang</small></span><span>${consultationBadge(r)}</span><span><i class="status ${r.status.replace(' ','-').toLowerCase()}">${r.status}</i></span><span class="row-arrow">↗</span></button>`).join('')
  return `<div class="admin-title"><div><span class="admin-kicker">INBOX</span><h2>Anfragen</h2><p>Alle eingehenden Tattoo-Projekte priorisiert an einem Ort.</p></div></div><div class="request-filters" aria-label="Anfragen filtern"><label>STIL<select data-request-filter="style"><option value="">Alle Stile</option><option>Realistic</option><option>Microrealism</option><option>Fineline</option><option>Andere Richtung</option></select></label><label>BERATUNG<select data-request-filter="consultation"><option value="">Alle</option><option value="phone">Telefon</option><option value="studio">Persönlich</option></select></label><label>STATUS<select data-request-filter="status"><option value="">Alle Status</option><option>Neu</option><option>In Klärung</option><option>Bestätigt</option></select></label><button type="button" data-reset-filters>Filter zurücksetzen</button></div><div class="request-list request-inbox"><div class="list-head"><span>NAME / KONTAKT</span><span>STIL</span><span>PROJEKT</span><span>BERATUNG</span><span>STATUS</span><span></span></div>${demoRequests.length ? rows+'<div class="request-empty filter-empty" hidden><span>00</span><h3>Keine Treffer.</h3><p>Für diese Filterkombination liegen keine Anfragen vor.</p></div>' : '<div class="request-empty"><span>00</span><h3>Noch keine Anfragen.</h3><p>Neue Booking-Anfragen erscheinen automatisch an dieser Stelle.</p></div>'}</div>`
}
function portfolioView() { return `<div class="admin-title"><div><h2>Referenzen</h2><p>Arbeiten für die öffentliche Galerie verwalten.</p></div><label class="admin-upload"><input id="portfolio-upload" type="file" accept="image/*" multiple>+ Neue Arbeit</label></div><div class="admin-gallery" id="admin-gallery">${portfolio.map(p=>`<article><img src="/studio-hero.png" style="object-position:${p.position}"><div><b>${p.title}</b><small>${p.type}</small></div><button aria-label="Referenz verwalten">···</button></article>`).join('')}</div>` }
function settingsView(){return `<div class="admin-title"><div><span class="admin-kicker">SYSTEM</span><h2>Einstellungen</h2><p>Verbindungen und Verfügbarkeiten für die automatische Terminplanung.</p></div><button class="save-settings">Änderungen speichern</button></div><div class="settings-layout">
  <section class="integration-card"><div class="integration-icon">G</div><div><h3>Google Kalender</h3><p>Termine lesen, freie Zeiten prüfen und bestätigte Termine eintragen.</p></div><span class="connected">VERBUNDEN</span><button>Verbindung verwalten</button></section>
  <section class="integration-card"><div class="integration-icon mail">✉</div><div><h3>SMTP E-Mail</h3><p>Rückfragen und Terminvorschläge direkt aus dem Adminpanel senden.</p></div><span class="connected">AKTIV</span><button data-smtp>SMTP konfigurieren</button></section>
  <section class="hours-card"><div class="settings-heading"><div><h3>Öffnungszeiten</h3><p>Basis für automatisch berechnete Terminvorschläge.</p></div><span>Europe/Berlin</span></div>${['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'].map((d,i)=>`<div class="hours-row"><label class="switch"><input type="checkbox" ${i!==0&&i!==5?'checked':''}><i></i></label><b>${d}</b><input type="time" value="10:00" ${i===0||i===5?'disabled':''}><span>bis</span><input type="time" value="18:00" ${i===0||i===5?'disabled':''}></div>`).join('')}<div class="hours-row"><label class="switch"><input type="checkbox"><i></i></label><b>Sonntag</b><span class="closed">Geschlossen</span></div></section>
  </div>`}
function appointmentFormView(){const date=new Date();date.setMinutes(Math.ceil(date.getMinutes()/30)*30,0,0);const end=new Date(date.getTime()+3*3600000);const localValue=value=>new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16);return `<div class="admin-title"><div><span class="admin-kicker">STUDIO-KALENDER</span><h2>Neuen Termin anlegen</h2><p>Eine neue Terminakte erstellen und direkt im Kalender einplanen.</p></div></div><form class="admin-appointment-form" data-appointment-form><div class="appointment-form-grid"><label>NAME<input required name="clientName" placeholder="Vor- und Nachname"></label><label>E-MAIL<input type="email" name="email" placeholder="name@email.de"></label><label>TELEFON<input name="phone" placeholder="+49 …"></label><label>STIL<input name="style" placeholder="z. B. Fineline"></label><label>KÖRPERSTELLE<input name="placement" placeholder="z. B. Unterarm"></label><label>BEGINN<input required type="datetime-local" name="start" value="${localValue(date)}"></label><label>ENDE<input required type="datetime-local" name="end" value="${localValue(end)}"></label><label class="full">NOTIZ<textarea name="notes" rows="6" placeholder="Vorbereitung, Motiv, Besonderheiten …"></textarea></label></div><p class="modal-form-error" role="alert"></p><button class="save-settings" type="submit">Termin speichern →</button></form>`}
function appointmentFilesView(){return `<div class="admin-title"><div><span class="admin-kicker">ARCHIV</span><h2>Terminakten</h2><p>Alle geplanten und vergangenen Studio-Termine an einem Ort.</p></div><a class="save-settings" href="/admin/termin-neu/">+ Neuer Termin</a></div><div class="appointment-files-list">${appointments.length?appointments.map(item=>{const start=new Date(item.start);return `<button data-appointment="${item.id}"><time><b>${String(start.getDate()).padStart(2,'0')}</b><small>${new Intl.DateTimeFormat('de-DE',{month:'short',year:'numeric'}).format(start)}</small></time><span><b>${item.clientName}</b><small>${item.style||'Tattoo-Termin'} · ${item.placement||'Studio'}</small></span><span><b>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(start)} Uhr</b><small>${Math.max(0,(new Date(item.end)-start)/3600000).toLocaleString('de-DE')} Stunden</small></span><i>Akte öffnen ↗</i></button>`}).join(''):'<div class="request-empty"><span>00</span><h3>Noch keine Terminakten.</h3><p>Neu angelegte Termine erscheinen automatisch hier.</p></div>'}</div>`}
function customersView(){const records=[...demoRequests,...appointments].reduce((map,item)=>{const key=(item.email||item.phone||item.clientName||item.name||'').toLowerCase();if(!key)return map;const current=map.get(key)||{name:item.clientName||item.name,email:item.email,phone:item.phone,requests:0,appointments:0};if(item.id?.startsWith('APT-'))current.appointments++;else current.requests++;current.email=current.email||item.email;current.phone=current.phone||item.phone;map.set(key,current);return map},new Map());const customers=[...records.values()].sort((a,b)=>a.name.localeCompare(b.name,'de'));return `<div class="admin-title"><div><span class="admin-kicker">KARTEI</span><h2>Kunden</h2><p>Kontaktdaten und Projektverlauf aus Anfragen und Terminakten.</p></div><b class="customer-count">${customers.length}</b></div><div class="customer-list">${customers.length?customers.map(customer=>`<article><span class="customer-avatar">${customer.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><div><b>${customer.name}</b><small>${customer.email||'Keine E-Mail'} · ${customer.phone||'Keine Telefonnummer'}</small></div><div><b>${customer.requests}</b><small>Anfragen</small></div><div><b>${customer.appointments}</b><small>Termine</small></div></article>`).join(''):'<div class="request-empty"><span>00</span><h3>Noch keine Kunden.</h3><p>Kunden werden automatisch aus Anfragen und Terminen übernommen.</p></div>'}</div>`}
function currentAdminView() {
  const path = location.pathname.replace(/\/+$/, '')
  if (path.endsWith('/anfragen')) return 'requests'
  if (path.endsWith('/referenzen')) return 'portfolio'
  if (path.endsWith('/einstellungen')) return 'settings'
  if (path.endsWith('/termin-neu')) return 'newAppointment'
  if (path.endsWith('/terminakten')) return 'appointmentFiles'
  if (path.endsWith('/kunden')) return 'customers'
  return 'dashboard'
}
function adminViewMarkup(view) { return view==='requests'?requestsView():view==='portfolio'?portfolioView():view==='settings'?settingsView():view==='newAppointment'?appointmentFormView():view==='appointmentFiles'?appointmentFilesView():view==='customers'?customersView():dashboardView() }
function adminMarkup() { const welcome=adminWelcome(); const view=currentAdminView(); return `<div class="admin-shell"><aside class="admin-side"><a class="brand" href="/"><span>TATTOO</span><i>·</i><span>SFUMATO</span></a><p>STUDIO OS</p><nav><a class="${view==='dashboard'?'active':''}" data-view="dashboard" href="/admin/"><span>⌂</span>Dashboard</a><a class="${view==='newAppointment'?'active':''}" data-view="newAppointment" href="/admin/termin-neu/"><span>＋</span>Neuer Termin</a><a class="${view==='appointmentFiles'?'active':''}" data-view="appointmentFiles" href="/admin/terminakten/"><span>01</span>Terminakten</a><a class="${view==='customers'?'active':''}" data-view="customers" href="/admin/kunden/"><span>02</span>Kunden</a><a class="${view==='requests'?'active':''}" data-view="requests" href="/admin/anfragen/"><span>03</span>Anfragen <b>${demoRequests.length}</b></a><a class="${view==='portfolio'?'active':''}" data-view="portfolio" href="/admin/referenzen/"><span>04</span>Referenzen</a><a class="${view==='settings'?'active':''}" data-view="settings" href="/admin/einstellungen/"><span>05</span>Einstellungen</a></nav><div class="admin-user"><div class="avatar">TS</div><span><b>Studio Sfumato</b><small>Administrator</small></span></div><a href="/" class="back">← Zur Website</a></aside><main class="admin-main"><header><div><p>${welcome.date}</p><h1>${welcome.greeting}</h1></div><div class="header-actions"><button aria-label="Benachrichtigungen">●</button><div class="avatar">TS</div></div></header><section id="admin-content">${adminViewMarkup(view)}</section></main><div class="admin-modal" aria-hidden="true"></div></div>` }

function initSite() {
  const menuButton = document.querySelector('.menu')
  const siteNav = document.querySelector('.site-header nav')
  const setMenu = open => {
    siteNav.classList.toggle('open', open)
    document.body.classList.toggle('menu-open', open)
    menuButton.setAttribute('aria-expanded', String(open))
    menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen')
  }
  menuButton?.addEventListener('click', () => setMenu(!siteNav.classList.contains('open')))
  siteNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)))
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false) })
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    const hash = link.getAttribute('href')
    if (!hash || hash === '#') return
    const target = document.querySelector(hash)
    if (!target) return
    event.preventDefault()
    setMenu(false)
    history.pushState(null, '', hash)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }))
  document.querySelectorAll('[data-protected-signature]').forEach(element => {
    element.addEventListener('contextmenu', event => event.preventDefault())
    element.addEventListener('dragstart', event => event.preventDefault())
  })
  const customSelect = document.querySelector('.custom-select')
  const selectTrigger = customSelect?.querySelector('.custom-select-trigger')
  const selectOptions = customSelect?.querySelector('.custom-select-options')
  const selectInput = customSelect?.querySelector('input')
  const closeSelect = () => { selectOptions.hidden = true; selectTrigger.setAttribute('aria-expanded', 'false') }
  selectTrigger?.addEventListener('click', () => {
    const opening = selectOptions.hidden
    selectOptions.hidden = !opening
    selectTrigger.setAttribute('aria-expanded', String(opening))
  })
  selectOptions?.addEventListener('click', event => {
    const option = event.target.closest('[data-value]')
    if (!option) return
    selectInput.value = option.dataset.value
    selectTrigger.firstChild.textContent = option.textContent
    selectOptions.querySelectorAll('[role="option"]').forEach(item => item.setAttribute('aria-selected', String(item === option)))
    closeSelect()
  })
  document.addEventListener('click', event => { if (customSelect && !customSelect.contains(event.target)) closeSelect() })
  customSelect?.addEventListener('keydown', event => { if (event.key === 'Escape') { closeSelect(); selectTrigger.focus() } })
  const consultation = document.querySelector('#consultation')
  const consultationChoice = document.querySelector('.consultation-choice')
  const consultationTypes = [...document.querySelectorAll('[name="consultationType"]')]
  consultation?.addEventListener('change', () => {
    const requested = consultation.checked
    consultationChoice.hidden = !requested
    consultationTypes.forEach((option, index) => { option.required = requested && index === 0; if (!requested) option.checked = false })
  })
  const referenceInput = document.querySelector('#reference-input')
  const referenceDropzone = document.querySelector('#reference-dropzone')
  const referencePreviews = document.querySelector('.upload-previews')
  let referenceFiles = []
  let previewUrls = []
  const renderReferencePreviews = () => {
    previewUrls.forEach(URL.revokeObjectURL)
    previewUrls = referenceFiles.map(file => URL.createObjectURL(file))
    referencePreviews.innerHTML = referenceFiles.map((file, index) => `<article><img src="${previewUrls[index]}" alt="Vorschau ${index + 1}"><button type="button" data-remove-reference="${index}" aria-label="${file.name} entfernen">×</button><small>${file.name}</small></article>`).join('')
    referenceDropzone.classList.toggle('has-files', referenceFiles.length > 0)
  }
  const addReferenceFiles = files => {
    const valid = [...files].filter(file => ['image/jpeg','image/png','image/webp'].includes(file.type) && file.size <= 10000000)
    referenceFiles = [...referenceFiles, ...valid].filter((file, index, all) => all.findIndex(item => item.name === file.name && item.size === file.size) === index).slice(0, 5)
    renderReferencePreviews()
    if (valid.length !== files.length) document.querySelector('.form-message').textContent = 'Bitte nur JPG, PNG oder WebP mit maximal 10 MB pro Bild verwenden.'
  }
  referenceInput?.addEventListener('change', event => addReferenceFiles(event.target.files))
  referenceDropzone?.addEventListener('dragover', event => { event.preventDefault(); referenceDropzone.classList.add('dragging') })
  referenceDropzone?.addEventListener('dragleave', () => referenceDropzone.classList.remove('dragging'))
  referenceDropzone?.addEventListener('drop', event => { event.preventDefault(); referenceDropzone.classList.remove('dragging'); addReferenceFiles(event.dataTransfer.files) })
  referencePreviews?.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-reference]')
    if (!remove) return
    referenceFiles.splice(Number(remove.dataset.removeReference), 1)
    renderReferencePreviews()
  })
  const fileAsDataUrl = file => new Promise((resolve, reject) => { const reader=new FileReader();reader.onload=()=>resolve({name:file.name,type:file.type,data:reader.result});reader.onerror=reject;reader.readAsDataURL(file) })
  document.querySelector('#booking-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const form = e.currentTarget
    const submit = form.querySelector('.submit')
    const message = form.querySelector('.form-message')
    const f = new FormData(form)
    const payload = Object.fromEntries([...f.entries()].filter(([, value]) => typeof value === 'string'))
    payload.consultation = f.get('consultation') === 'yes'
    submit.disabled = true
    submit.textContent = 'Anfrage wird gesendet …'
    message.textContent = ''
    try {
      payload.references = await Promise.all(referenceFiles.map(fileAsDataUrl))
      const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const responseText = await response.text()
      let result
      try { result = responseText ? JSON.parse(responseText) : null } catch { result = null }
      if (!response.ok || !result?.id) {
        result = { ...payload, id: `LOCAL-${Date.now()}`, date: new Date().toISOString(), status: 'Neu', source: 'form', localOnly: true }
        saveLocalRequest(result)
      }
      demoRequests.unshift(result)
      form.reset(); referenceFiles=[]; renderReferencePreviews(); selectTrigger.firstChild.textContent='Bitte auswählen'; selectOptions.querySelectorAll('[role="option"]').forEach(item=>item.removeAttribute('aria-selected')); consultationChoice.hidden=true; consultationTypes.forEach(option=>option.required=false)
      message.textContent='Danke! Deine Anfrage ist angekommen. Wir melden uns persönlich bei dir.'
      const toast=document.querySelector('.toast'); toast.textContent='Anfrage erfolgreich gesendet'; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3500)
    } catch (error) {
      message.textContent = error.message || 'Die Anfrage konnte nicht gesendet werden. Bitte versuche es erneut.'
    } finally {
      submit.disabled = false
      submit.innerHTML = `Anfrage senden ${arrow}`
    }
  })
  const observer = new IntersectionObserver(entries => entries.forEach(x => x.isIntersecting && x.target.classList.add('visible')), {threshold:.12}); document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))
  const film = document.querySelector('.film-frame video')
  const filmButton = document.querySelector('.film-play')
  const filmControlButton = document.querySelector('.film-control-play')
  const filmProgress = document.querySelector('.film-progress')
  const filmFullscreen = document.querySelector('.film-fullscreen')
  const filmFrame = document.querySelector('.film-frame')
  const filmTime = document.querySelector('.film-time')
  let filmControlsTimer
  const showFilmControls = () => {
    filmFrame?.classList.add('controls-visible')
    clearTimeout(filmControlsTimer)
    if (!film?.paused) filmControlsTimer = setTimeout(() => filmFrame?.classList.remove('controls-visible'), 1800)
  }
  const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  film?.addEventListener('loadedmetadata', () => { filmTime.textContent = formatTime(film.duration) })
  filmButton?.addEventListener('click', () => film.paused ? film.play() : film.pause())
  filmControlButton?.addEventListener('click', () => film.paused ? film.play() : film.pause())
  filmFrame?.addEventListener('pointermove', showFilmControls)
  filmFrame?.addEventListener('pointerdown', showFilmControls)
  filmFrame?.addEventListener('pointerleave', () => { if (!film.paused) filmFrame.classList.remove('controls-visible') })
  filmProgress?.addEventListener('input', () => { if (film.duration) film.currentTime = film.duration * (filmProgress.value / 100) })
  film?.addEventListener('timeupdate', () => { if (film.duration) { filmProgress.value = (film.currentTime / film.duration) * 100; filmProgress.style.setProperty('--film-progress', `${filmProgress.value}%`); filmTime.textContent = `${formatTime(film.currentTime)} / ${formatTime(film.duration)}` } })
  filmFullscreen?.addEventListener('click', async () => { if (!document.fullscreenElement) await (filmFrame.requestFullscreen?.() || film.webkitEnterFullscreen?.()); else await document.exitFullscreen?.() })
  film?.addEventListener('play', () => { filmFrame.classList.add('is-playing'); filmButton.classList.add('playing'); filmButton.setAttribute('aria-label', 'Imagefilm pausieren'); filmControlButton.classList.add('playing'); filmControlButton.setAttribute('aria-label', 'Imagefilm pausieren'); showFilmControls() })
  film?.addEventListener('pause', () => { clearTimeout(filmControlsTimer); filmFrame.classList.remove('is-playing'); filmFrame.classList.add('controls-visible'); filmButton.classList.remove('playing'); filmButton.setAttribute('aria-label', 'Imagefilm abspielen'); filmControlButton.classList.remove('playing'); filmControlButton.setAttribute('aria-label', 'Imagefilm abspielen') })
  film?.addEventListener('ended', () => { film.currentTime = 0 })
  const progress = document.querySelector('.scroll-progress')
  window.addEventListener('scroll', () => { const max=document.documentElement.scrollHeight-innerHeight; progress.style.transform=`scaleX(${max ? scrollY/max : 0})` }, {passive:true})
  const dot=document.querySelector('.cursor-dot')
  if(matchMedia('(pointer:fine)').matches){ window.addEventListener('pointermove',e=>{dot.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`}); document.querySelectorAll('a,button,label').forEach(el=>{el.addEventListener('mouseenter',()=>dot.classList.add('active'));el.addEventListener('mouseleave',()=>dot.classList.remove('active'))}) }

  const motionAllowed = matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches
  if (motionAllowed) {
    const heroVisual = document.querySelector('.hero-visual')
    heroVisual?.addEventListener('pointermove', event => {
      const bounds = heroVisual.getBoundingClientRect()
      heroVisual.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`)
      heroVisual.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`)
      heroVisual.classList.add('spotlight-active')
    })
    heroVisual?.addEventListener('pointerleave', () => heroVisual.classList.remove('spotlight-active'))

    document.querySelectorAll('.work-image').forEach(card => {
      card.addEventListener('pointermove', event => {
        const bounds = card.getBoundingClientRect()
        const rotateX = ((event.clientY - bounds.top) / bounds.height - .5) * -5
        const rotateY = ((event.clientX - bounds.left) / bounds.width - .5) * 5
        card.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`)
        card.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`)
        card.classList.add('tilting')
      })
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilting')
        card.style.removeProperty('--tilt-x')
        card.style.removeProperty('--tilt-y')
      })
    })

    const footerSignature = document.querySelector('.footer-brand img')
    const scheduleNeonFlicker = () => {
      const delay = 2200 + Math.random() * 8500
      setTimeout(() => {
        if (!document.body.contains(footerSignature)) return
        const flashes = 2 + Math.floor(Math.random() * 5)
        const frames = [{ opacity: 1, filter: 'brightness(1) drop-shadow(0 0 5px #fff8) drop-shadow(0 0 18px #9e2c24cc)' }]
        for (let index = 0; index < flashes; index++) {
          const offset = (index + 1) / (flashes + 1)
          const dimmed = Math.random() > .18
          frames.push({
            offset,
            opacity: dimmed ? .18 + Math.random() * .45 : .02,
            filter: `brightness(${dimmed ? .45 + Math.random() * .45 : .15}) drop-shadow(0 0 ${2 + Math.random() * 4}px #fff5) drop-shadow(0 0 ${5 + Math.random() * 9}px #9e2c2488)`,
          })
        }
        frames.push({ opacity: 1, filter: 'brightness(1.08) drop-shadow(0 0 7px #fffc) drop-shadow(0 0 24px #9e2c24ee)' })
        const flicker = footerSignature.animate(frames, { duration: 170 + Math.random() * 520, easing: 'steps(1, end)' })
        flicker.finished.finally(scheduleNeonFlicker)
      }, delay)
    }
    if (footerSignature) scheduleNeonFlicker()
  }
}
function initUploads(){ document.querySelector('#portfolio-upload')?.addEventListener('change', e=>[...e.target.files].forEach(file=>{const url=URL.createObjectURL(file); document.querySelector('#admin-gallery').insertAdjacentHTML('afterbegin',`<article><img src="${url}"><div><b>${file.name.replace(/\.[^.]+$/,'')}</b><small>Neu hochgeladen</small></div><button>···</button></article>`) })) }
function initAdmin() {
  const content=document.querySelector('#admin-content')
  const modal=document.querySelector('.admin-modal')
  const applyRequestFilters = () => {
    const style = content.querySelector('[data-request-filter="style"]')?.value || ''
    const consultation = content.querySelector('[data-request-filter="consultation"]')?.value || ''
    const status = content.querySelector('[data-request-filter="status"]')?.value || ''
    let visible = 0
    content.querySelectorAll('.request-row').forEach(row => {
      const show = (!style || row.dataset.style === style) && (!consultation || row.dataset.consultation === consultation) && (!status || row.dataset.status === status)
      row.hidden = !show
      if (show) visible++
    })
    const empty = content.querySelector('.filter-empty')
    if (empty) empty.hidden = visible !== 0
  }
  const openAdminDeepLink = () => {
    const params = new URLSearchParams(location.search)
    const appointmentDay = params.get('termin')
    const requestId = params.get('anfrage')
    if (appointmentDay) content.querySelector(`[data-appointment="${CSS.escape(appointmentDay)}"]`)?.click()
    if (requestId) {
      const index = demoRequests.findIndex(request => request.id === requestId)
      content.querySelector(`[data-request="${index}"]`)?.click()
      const action = params.get('aktion')
      if (action) queueMicrotask(() => content.querySelector(action === 'rueckfrage' ? '[data-question]' : '[data-proposals]')?.click())
    }
    if (params.get('aktion') === 'smtp') queueMicrotask(() => content.querySelector('[data-smtp]')?.click())
  }
  const syncAdminRequests = requests => {
    const merged = sortRequests([...requests, ...readLocalRequests()].filter((request, index, all) => all.findIndex(item => item.id === request.id) === index))
    demoRequests.splice(0, demoRequests.length, ...merged)
    const badge = document.querySelector('[data-view="requests"] b')
    if (badge) badge.textContent = demoRequests.filter(request => !request.readAt).length
    const activeView = document.querySelector('[data-view].active')?.dataset.view
    if (activeView === 'requests') content.innerHTML = requestsView()
    else if (activeView === 'dashboard') content.innerHTML = dashboardView()
    else if (activeView === 'customers') content.innerHTML = customersView()
    openAdminDeepLink()
  }
  fetch('/api/requests', { headers: { Accept: 'application/json' } }).then(async response => {
    const text = await response.text()
    if (!response.ok || !text) throw new Error('Anfragen konnten nicht geladen werden.')
    return JSON.parse(text)
  }).then(syncAdminRequests).catch(() => syncAdminRequests([]))
  fetch('/api/appointments', { headers: { Accept: 'application/json' } }).then(async response => {
    const text = await response.text()
    if (!response.ok || !text) throw new Error('Termine konnten nicht geladen werden.')
    return JSON.parse(text)
  }).then(entries => {
    const merged=[...entries,...readLocalAppointments()].filter((item,index,all)=>all.findIndex(entry=>entry.id===item.id)===index)
    appointments.splice(0, appointments.length, ...merged.sort((a,b)=>new Date(a.start)-new Date(b.start)))
    if (currentAdminView() === 'dashboard') content.innerHTML = dashboardView()
    else if (currentAdminView() === 'appointmentFiles') content.innerHTML = appointmentFilesView()
    else if (currentAdminView() === 'customers') content.innerHTML = customersView()
    openAdminDeepLink()
  }).catch(() => {
    appointments.splice(0, appointments.length, ...readLocalAppointments().sort((a,b)=>new Date(a.start)-new Date(b.start)))
    if (currentAdminView() === 'dashboard') content.innerHTML = dashboardView()
    else if (currentAdminView() === 'appointmentFiles') content.innerHTML = appointmentFilesView()
    else if (currentAdminView() === 'customers') content.innerHTML = customersView()
    openAdminDeepLink()
  })
  const openModal=html=>{modal.innerHTML=`<div class="modal-backdrop" data-close></div><section class="modal-sheet">${html}</section>`;modal.classList.add('open');modal.setAttribute('aria-hidden','false')}
  const closeModal=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');const url=new URL(location.href);url.searchParams.delete('aktion');history.replaceState(null,'',url)}
  modal.addEventListener('click',e=>{
    if(e.target.closest('[data-send-proposals]')){
      closeModal()
      content.insertAdjacentHTML('afterbegin',`<div class="response-banner"><div><span>TERMINVORSCHLÄGE VERSENDET</span><b>Warte auf Rückmeldung von Mara K.</b><small>Der Status wird aktualisiert, sobald die Kundin per E-Mail zu- oder absagt.</small></div><button data-confirm-slot>Antwort simulieren</button></div>`)
    } else if(e.target.closest('[data-confirm-slot]')){
      e.target.closest('.response-banner').innerHTML=`<div><span class="positive">KUNDIN HAT ZUGESAGT</span><b>Do, 03. September · 12:30–16:30 Uhr</b><small>Der Termin ist reserviert und bereit zur Übernahme.</small></div><button class="save-settings" data-calendar-add>In Google Kalender eintragen →</button>`
    } else if(e.target.closest('[data-calendar-add]')){
      e.target.textContent='✓ Im Kalender eingetragen';e.target.disabled=true
    } else if(e.target.closest('[data-close]')) closeModal()
  })
  modal.addEventListener('submit', async e => {
    const form=e.target.closest('[data-appointment-form]')
    if(!form)return
    e.preventDefault()
    const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Wird gespeichert …'
    try{
      const payload=Object.fromEntries(new FormData(form))
      payload.start=new Date(payload.start).toISOString();payload.end=new Date(payload.end).toISOString()
      const result=await createAppointment(payload)
      appointments.push(result);appointments.sort((a,b)=>new Date(a.start)-new Date(b.start));closeModal();content.innerHTML=dashboardView()
    }catch(error){form.querySelector('.modal-form-error').textContent=error.message;submit.disabled=false;submit.textContent='Termin speichern →'}
  })
  content.addEventListener('submit', async e => {
    const form=e.target.closest('[data-appointment-form]')
    if(!form)return
    e.preventDefault()
    const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Wird gespeichert …'
    try{
      const payload=Object.fromEntries(new FormData(form));payload.start=new Date(payload.start).toISOString();payload.end=new Date(payload.end).toISOString()
      const result=await createAppointment(payload)
      appointments.push(result);appointments.sort((a,b)=>new Date(a.start)-new Date(b.start));location.href=`/admin/terminakten/?termin=${encodeURIComponent(result.id)}`
    }catch(error){form.querySelector('.modal-form-error').textContent=error.message;submit.disabled=false;submit.textContent='Termin speichern →'}
  })
  if (currentAdminView() === 'portfolio') initUploads()
  content.addEventListener('click', e => {
    if(e.target.closest('[data-reset-filters]')){
      content.querySelectorAll('[data-request-filter]').forEach(filter => { filter.value = '' })
      applyRequestFilters()
      return
    }
    if(e.target.closest('[data-new-appointment]')){
      const date=new Date();date.setMinutes(Math.ceil(date.getMinutes()/30)*30,0,0);const end=new Date(date.getTime()+3*3600000)
      const localValue=value=>new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16)
      openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">STUDIO-KALENDER</span><h2>Termin anlegen</h2><form data-appointment-form><label>NAME<input required name="clientName" placeholder="Vor- und Nachname"></label><div class="smtp-grid"><label>BEGINN<input required type="datetime-local" name="start" value="${localValue(date)}"></label><label>ENDE<input required type="datetime-local" name="end" value="${localValue(end)}"></label><label>STIL<input name="style" placeholder="z. B. Fineline"></label><label>KÖRPERSTELLE<input name="placement" placeholder="z. B. Unterarm"></label></div><label>NOTIZ<textarea name="notes" rows="5" placeholder="Vorbereitung, Motiv, Besonderheiten …"></textarea></label><p class="modal-form-error" role="alert"></p><button class="save-settings modal-send" type="submit">Termin speichern →</button></form>`)
      return
    }
    if(e.target.closest('[data-calendar-prev]')){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);content.innerHTML=dashboardView();return}
    if(e.target.closest('[data-calendar-next]')){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);content.innerHTML=dashboardView();return}
    const appointment=e.target.closest('[data-appointment]')
    if(appointment){const url=new URL('/admin/terminakten/',location.origin);url.searchParams.set('termin',appointment.dataset.appointment);if(location.href!==url.href)history.pushState(null,'',url);content.innerHTML=realAppointmentView(appointment.dataset.appointment);return}
    if(e.target.closest('[data-back-dashboard]')){history.pushState(null,'','/admin/terminakten/');content.innerHTML=appointmentFilesView();return}
    if(e.target.closest('[data-confirm-slot]')){
      e.target.closest('.response-banner').innerHTML=`<div><span class="positive">KUNDIN HAT ZUGESAGT</span><b>Do, 03. September · 12:30–16:30 Uhr</b><small>Der Termin ist reserviert und bereit zur Übernahme.</small></div><button class="save-settings" data-calendar-add>In Google Kalender eintragen →</button>`;return
    }
    if(e.target.closest('[data-calendar-add]')){e.target.textContent='✓ Im Kalender eingetragen';e.target.disabled=true;return}
    const row=e.target.closest('[data-request]')
    if(row){
      const r=demoRequests[row.dataset.request]
      if (!r.readAt) {
        r.readAt = new Date().toISOString()
        markLocalRequestRead(r.id)
        fetch(`/api/requests/${encodeURIComponent(r.id)}/read`, { method: 'PATCH' }).catch(() => {})
        const badge = document.querySelector('[data-view="requests"] b')
        if (badge) badge.textContent = demoRequests.filter(request => !request.readAt).length
      }
      const url=new URL('/admin/anfragen/',location.origin);url.searchParams.set('anfrage',r.id);if(location.href!==url.href)history.pushState(null,'',url)
      content.innerHTML=`<div class="detail-top"><button class="detail-back">← Anfragen</button><div><button class="secondary-action" data-question>Rückfrage senden</button><button class="save-settings" data-proposals>Terminvorschläge erstellen</button></div></div>
      <div class="request-hero"><div><span class="admin-kicker">${r.id} · EINGANG ${r.source === 'form' ? new Date(r.date).toLocaleDateString('de-DE') : r.date}</span><h2>${r.name}</h2><p>${r.phone || 'Keine Telefonnummer'} · ${r.email || 'Keine E-Mail-Adresse'}</p></div><i class="status neu">${r.status}</i></div>
      <div class="request-detail-grid"><section class="project-card"><span>PROJEKTDETAILS</span><dl><div><dt>Stil</dt><dd>${r.style || 'Nicht angegeben'}</dd></div><div><dt>Körperstelle</dt><dd>${r.placement || 'Nicht angegeben'}</dd></div><div><dt>Größe</dt><dd>${r.size || 'Nicht angegeben'}</dd></div><div><dt>Beratung</dt><dd>${r.consultation ? (r.consultationType === 'phone' ? 'Telefonisch' : 'Persönlich im Studio') : 'Nicht gewünscht'}</dd></div></dl><span>BESCHREIBUNG</span><p>${r.idea || r.motif || 'Keine Beschreibung vorhanden.'}</p>${r.references?.length ? `<span>REFERENZBILDER</span><div class="request-references">${r.references.map((reference,index)=>reference.url || reference.data ? `<a href="${reference.url || reference.data}" target="_blank" rel="noopener"><img src="${reference.url || reference.data}" alt="Referenzbild ${index + 1}"><small>${reference.name || `Referenz ${index + 1}`}</small></a>` : `<div class="missing-reference"><span>Bild</span><small>${reference.name}</small></div>`).join('')}</div>` : ''}</section>
      <section class="timeline-card"><span>VERLAUF</span><div><i></i><p><b>Anfrage eingegangen</b><small>Heute · 09:42 Uhr</small></p></div><div><i></i><p><b>Automatische Bestätigung versendet</b><small>Heute · 09:43 Uhr</small></p></div><textarea placeholder="Interne Notiz hinzufügen …"></textarea></section></div>`
      content.querySelector('.detail-back').onclick=()=>{history.pushState(null,'','/admin/anfragen/');sortRequests(demoRequests);content.innerHTML=requestsView()}
    }
    if(e.target.closest('[data-question]')) { const url=new URL(location.href);url.searchParams.set('aktion','rueckfrage');if(location.href!==url.href)history.pushState(null,'',url);openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">E-MAIL</span><h2>Rückfrage senden</h2><label>AN<input value="mara.k@example.de"></label><label>BETREFF<input value="Rückfrage zu deiner Tattoo-Anfrage"></label><label>NACHRICHT<textarea rows="8">Hallo Mara,\n\nvielen Dank für deine Anfrage bei Tattoo Sfumato. Für die Planung habe ich noch eine kurze Rückfrage:\n\n</textarea></label><label class="modal-upload"><input type="file" multiple>＋ Anhänge hinzufügen</label><button class="save-settings modal-send" data-close>E-Mail senden →</button>`)}
    if(e.target.closest('[data-proposals]')) { const url=new URL(location.href);url.searchParams.set('aktion','termine');if(location.href!==url.href)history.pushState(null,'',url);openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">SMART SCHEDULING</span><h2>Drei freie Termine</h2><p class="modal-lead">Berechnet aus 4 Std. Zeitaufwand, Öffnungszeiten und verbundenem Google Kalender.</p><div class="proposal-list"><label><input type="checkbox" checked><span><b>Do, 03. September</b><small>12:30–16:30 Uhr · 4 Std.</small></span><i>FREI</i></label><label><input type="checkbox" checked><span><b>Fr, 04. September</b><small>10:00–14:00 Uhr · 4 Std.</small></span><i>FREI</i></label><label><input type="checkbox" checked><span><b>Mi, 09. September</b><small>13:00–17:00 Uhr · 4 Std.</small></span><i>FREI</i></label></div><button class="other-slots">＋ Drei andere Termine wählen</button><div class="modal-actions"><button data-close>Abbrechen</button><button class="save-settings" data-send-proposals>Vorschläge per Mail senden →</button></div>`)}
    if(e.target.closest('[data-smtp]')) { const url=new URL(location.href);url.searchParams.set('aktion','smtp');if(location.href!==url.href)history.pushState(null,'',url);openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">INTEGRATION</span><h2>SMTP konfigurieren</h2><div class="smtp-grid"><label>SERVER<input placeholder="smtp.provider.de"></label><label>PORT<input value="587"></label><label>BENUTZERNAME<input placeholder="studio@domain.de"></label><label>VERSCHLÜSSELUNG<select><option>STARTTLS</option><option>SSL/TLS</option></select></label><label class="full">PASSWORT<input type="password" value="••••••••••••"></label></div><div class="modal-actions"><button>Verbindung testen</button><button class="save-settings" data-close>Speichern</button></div>`)}
  })
  content.addEventListener('change',e=>{
    if(e.target.closest('[data-request-filter]')) applyRequestFilters()
    if(e.target.closest('.asset-upload'))[...e.target.files].forEach(file=>{const url=URL.createObjectURL(file);content.querySelector('.asset-placeholder')?.insertAdjacentHTML('beforebegin',`<article><img src="${url}"><span><b>Zugewiesenes Bild</b><small>${file.name}</small></span><i>NEU</i></article>`)})
  })
}
const ACCESS_PASSWORD = 'Sfumato2026'
const ACCESS_KEY = 'sfumato-access-granted'

function passwordMarkup() {
  return `<main class="password-gate">
    <section class="password-panel" aria-labelledby="password-title">
      <a class="password-brand" href="#" aria-label="Tattoo Sfumato">TATTOO <i>·</i> SFUMATO</a>
      <div class="password-copy">
        <p class="password-kicker">GESCHÜTZTER BEREICH</p>
        <h1 id="password-title">Willkommen bei<br><em>Sfumato.</em></h1>
        <p>Diese Seite ist derzeit nur mit Passwort zugänglich.</p>
      </div>
      <form id="password-form" class="password-form">
        <label for="site-password">PASSWORT</label>
        <div class="password-field">
          <input id="site-password" name="password" type="password" autocomplete="current-password" autofocus required>
          <button type="button" class="password-toggle" aria-label="Passwort anzeigen" aria-pressed="false">ANZEIGEN</button>
        </div>
        <p class="password-error" role="alert" aria-live="polite"></p>
        <button class="password-submit" type="submit">Seite betreten <span>→</span></button>
      </form>
      <p class="password-footer">TATTOO SFUMATO · EINBECK</p>
    </section>
  </main>`
}

function initPasswordGate() {
  const form = document.querySelector('#password-form')
  const input = document.querySelector('#site-password')
  const toggle = document.querySelector('.password-toggle')
  const error = document.querySelector('.password-error')

  toggle.addEventListener('click', () => {
    const show = input.type === 'password'
    input.type = show ? 'text' : 'password'
    toggle.textContent = show ? 'AUSBLENDEN' : 'ANZEIGEN'
    toggle.setAttribute('aria-pressed', String(show))
    toggle.setAttribute('aria-label', show ? 'Passwort ausblenden' : 'Passwort anzeigen')
    input.focus()
  })

  form.addEventListener('submit', event => {
    event.preventDefault()
    if (input.value !== ACCESS_PASSWORD) {
      error.textContent = 'Das Passwort ist nicht korrekt.'
      input.value = ''
      input.setAttribute('aria-invalid', 'true')
      input.focus()
      return
    }
    sessionStorage.setItem(ACCESS_KEY, 'true')
    render()
  })
}

function render(){
  const serverAccess = document.cookie.split(';').some(cookie => cookie.trim() === 'sfumato_site_client=1')
  if (!serverAccess && sessionStorage.getItem(ACCESS_KEY) !== 'true') {
    document.querySelector('#app').innerHTML = passwordMarkup()
    initPasswordGate()
    return
  }
  const admin=location.pathname.replace(/\/+$/, '').startsWith('/admin'); document.querySelector('#app').innerHTML=admin?adminMarkup():siteMarkup(); admin?initAdmin():initSite(); window.scrollTo(0,0)
}
window.addEventListener('hashchange', () => {
  const target = location.hash && document.querySelector(location.hash)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
window.addEventListener('popstate', () => {
  if (location.pathname.replace(/\/+$/, '').startsWith('/admin')) render()
})
render()
