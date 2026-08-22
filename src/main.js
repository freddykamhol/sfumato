import './style.css'
import './admin-sticky.css'
import './uploads.css'
import './calendar.css'
import './admin-sections.css'
import './admin-legibility.css'
import './customer-notes.css'
import QRCode from 'qrcode'
import './customer-contact.css'
import './modal-center.css'
import './lightbox.css'
import './admin-mobile.css'
import './references.css'
import signatureUrl from './assets/Signatur2.png?inline'

const portfolio = [
  { id:'DEMO-1',title: 'Botanical Flow', style:'Fineline',placement:'Unterarm',type: 'Fineline · Unterarm', position: '50% 68%',image:'/studio-hero.png',published:true,order:0 },
  { id:'DEMO-2',title: 'Nocturne',style:'Realistic',placement:'Custom', type: 'Realistic · Custom', position: '50% 47%',image:'/studio-hero.png',published:true,order:1 },
  { id:'DEMO-3',title: 'Wild Peony',style:'Microrealism',placement:'Detail', type: 'Microrealism · Detail', position: '50% 78%',image:'/studio-hero.png',published:true,order:2 },
]
const LOCAL_PORTFOLIO_KEY='sfumato-portfolio'
const SETTINGS_LOCAL_KEY='sfumato-settings',USERS_LOCAL_KEY='sfumato-users'
const apiJson=async(url,options={})=>{const response=await fetch(url,{headers:{'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})},...options}),text=await response.text();if(!response.ok||!text)throw new Error();return JSON.parse(text)}
const saveStudioSettings=async value=>{studioSettings=value;try{studioSettings=await apiJson('/api/settings',{method:'PUT',body:JSON.stringify(value)})}catch{localStorage.setItem(SETTINGS_LOCAL_KEY,JSON.stringify(value))}return studioSettings}
const userRequest=async(method,id,payload)=>{try{return await apiJson(`/api/users${id?`/${id}`:''}`,{method,body:payload?JSON.stringify(payload):undefined})}catch{let users=JSON.parse(localStorage.getItem(USERS_LOCAL_KEY)||'[]');if(method==='POST'){const user={...payload,id:`USR-LOCAL-${Date.now()}`};users.push(user);localStorage.setItem(USERS_LOCAL_KEY,JSON.stringify(users));return user}if(method==='PATCH'){users=users.map(user=>user.id===id?{...user,...payload}:user);localStorage.setItem(USERS_LOCAL_KEY,JSON.stringify(users));return users.find(user=>user.id===id)}if(method==='DELETE'){localStorage.setItem(USERS_LOCAL_KEY,JSON.stringify(users.filter(user=>user.id!==id)));return{deleted:true}}}}
const readLocalPortfolio=()=>{try{return JSON.parse(localStorage.getItem(LOCAL_PORTFOLIO_KEY)||'[]')}catch{return[]}}
const saveLocalPortfolio=entries=>localStorage.setItem(LOCAL_PORTFOLIO_KEY,JSON.stringify(entries))
const portfolioRequest=async(method,id,payload)=>{try{const response=await fetch(`/api/portfolio${id?`/${encodeURIComponent(id)}`:''}`,{method,headers:{'Content-Type':'application/json',Accept:'application/json'},body:payload?JSON.stringify(payload):undefined}),text=await response.text(),result=text?JSON.parse(text):null;if(response.ok)return result;if(response.status!==404)throw new Error(result?.error||'Referenz konnte nicht gespeichert werden.')}catch(error){if(error.message!=='Failed to fetch')throw error}const entries=readLocalPortfolio();if(payload?.featured&&entries.filter(item=>item.featured&&item.id!==id).length>=3)throw new Error('Es können maximal drei Highlights festgelegt werden.');if(method==='POST'){const entry={...payload,id:`REF-LOCAL-${Date.now().toString(36).toUpperCase()}`,image:payload.image,createdAt:new Date().toISOString(),order:entries.length};entries.push(entry);saveLocalPortfolio(entries);return entry}const index=entries.findIndex(item=>item.id===id);if(method==='PATCH'&&index>=0){entries[index]={...entries[index],...payload};saveLocalPortfolio(entries);return entries[index]}if(method==='DELETE'){saveLocalPortfolio(entries.filter(item=>item.id!==id));return{deleted:true}}throw new Error('Referenz konnte nicht gespeichert werden.')}
const demoRequests = []
const appointments = []
const customerNotes = []
let studioSettings={integrations:{pop3:{},smtp:{},telegram:{}},calendar:{webcalToken:'',beforeMinutes:30,afterMinutes:30,hours:Array.from({length:7},(_,index)=>({enabled:index>0&&index<6,start:'10:00',end:'18:00'})),rules:[]}}
let adminUsers=[]
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
const updateAppointment = async (appointment,payload) => {
  Object.assign(appointment,payload)
  try {
    const response=await fetch(`/api/appointments/${encodeURIComponent(appointment.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const text=await response.text();const result=text?JSON.parse(text):null
    if(response.ok&&result?.id){Object.assign(appointment,result);return appointment}
  }catch{}
  const local=readLocalAppointments();const index=local.findIndex(item=>item.id===appointment.id)
  if(index>=0)local[index]={...local[index],...payload};else local.push({...appointment,...payload})
  localStorage.setItem(LOCAL_APPOINTMENTS_KEY,JSON.stringify(local.slice(-1000)))
  return appointment
}
const LOCAL_CUSTOMER_NOTES_KEY = 'sfumato-customer-notes'
const readLocalCustomerNotes = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_CUSTOMER_NOTES_KEY) || '[]') }
  catch { return [] }
}
const saveLocalCustomerNote = note => localStorage.setItem(LOCAL_CUSTOMER_NOTES_KEY, JSON.stringify([note,...readLocalCustomerNotes()].slice(0,1000)))
const deleteLocalCustomerNote = id => localStorage.setItem(LOCAL_CUSTOMER_NOTES_KEY, JSON.stringify(readLocalCustomerNotes().filter(note=>note.id!==id)))
const createCustomerNote = async payload => {
  try {
    const response=await fetch('/api/customer-notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const text=await response.text();let result
    try{result=text?JSON.parse(text):null}catch{result=null}
    if(response.ok&&result?.id)return result
  }catch{}
  const localNote={...payload,id:`NOTE-LOCAL-${Date.now().toString(36).toUpperCase()}`,createdAt:new Date().toISOString()}
  saveLocalCustomerNote(localNote)
  return localNote
}
const deleteCustomerNote = async id => {
  try {
    const response=await fetch(`/api/customer-notes/${encodeURIComponent(id)}`,{method:'DELETE',headers:{Accept:'application/json'}})
    if(response.ok)return true
  }catch{}
  if(id.startsWith('NOTE-LOCAL-')){deleteLocalCustomerNote(id);return true}
  return false
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
const requestReference=request=>request?.reference||`#${String(request?.id||'ANFRAGE').replace(/[^a-z0-9]/gi,'').slice(-6).toUpperCase()}`
const updateRequest=async(request,payload)=>{Object.assign(request,payload);try{const response=await fetch(`/api/requests/${encodeURIComponent(request.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const text=await response.text(),result=text?JSON.parse(text):null;if(response.ok&&result?.id){Object.assign(request,result);return request}}catch{}const local=readLocalRequests(),index=local.findIndex(item=>item.id===request.id);if(index>=0)local[index]={...local[index],...payload};else local.unshift({...request,...payload});localStorage.setItem(LOCAL_REQUESTS_KEY,JSON.stringify(local.slice(0,250)));return request}
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

const publishedPortfolio=()=>portfolio.filter(item=>item.published!==false).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)||(b.order||0)-(a.order||0))
const homepagePortfolio=()=>{const published=publishedPortfolio(),highlights=published.filter(item=>item.featured).slice(0,3);return [...highlights,...published.filter(item=>!highlights.some(highlight=>highlight.id===item.id))].slice(0,3)}
const publicReferenceCard=(item,index)=>`<article class="work-card reveal" style="--pos:${item.position||'50% 50%'}"><div class="work-image"><img src="${item.image||'/studio-hero.png'}" alt="${item.title}"><span>${String(index+1).padStart(2,'0')}</span></div><div><h3>${item.title}</h3><p>${item.type||[item.style,item.placement].filter(Boolean).join(' · ')}</p>${item.description?`<small>${item.description}</small>`:''}</div></article>`

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
        <div class="gallery" data-home-references>${homepagePortfolio().map(publicReferenceCard).join('')}</div><div class="all-references-link"><a class="button primary" href="/referenzen/">Alle Referenzen ansehen ${arrow}</a></div>
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

function allReferencesMarkup(){return `<div class="references-page"><header class="site-header references-header"><a class="brand" href="/" aria-label="Tattoo Sfumato Startseite"><span>TATTOO</span><i>·</i><span>SFUMATO</span></a><nav><a href="/">Startseite</a><a href="/#about">Das Studio</a><a href="/#termin">Anfrage</a></nav><a class="nav-cta" href="/#termin">Termin anfragen ${arrow}</a><button class="menu" aria-label="Menü öffnen" aria-expanded="false"><span></span><span></span></button></header><main><section class="references-hero section-pad"><p class="section-no">[ PORTFOLIO · SFUMATO ]</p><h1>Alle<br><em>Referenzen.</em></h1><p>Realistic, Microrealism und Fineline – ausgewählte Arbeiten aus dem Studio in Einbeck.</p></section><section class="all-references section-pad"><div class="gallery" data-all-references>${publishedPortfolio().map(publicReferenceCard).join('')}</div>${publishedPortfolio().length?'':'<div class="references-empty">Aktuell sind noch keine Arbeiten veröffentlicht.</div>'}</section></main><footer><div class="footer-brand"><img src="${signatureUrl}" alt="Tattoo Sfumato" draggable="false"></div><div><a href="/">Startseite</a><a href="/#termin">Projekt anfragen</a></div><div class="social">Tattoo Sfumato · Einbeck</div><p>© ${new Date().getFullYear()} Tattoo Sfumato</p></footer></div>`}

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
  <div class="calendar-card"><div class="calendar-head"><div><button data-calendar-prev aria-label="Vorheriger Monat">‹</button><h3>${monthName}</h3><button data-calendar-next aria-label="Nächster Monat">›</button></div><div><span class="cal-dot studio"></span>Studio</div></div><div class="calendar-grid">${days.map(d=>`<b>${d}</b>`).join('')}${cells.map(day=>{if(!day)return'<span class="cal-day empty"></span>';const dateKey=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const entries=appointments.filter(item=>String(item.start).slice(0,10)===dateKey);return`<button class="cal-day ${entries.length?'has-event':''} ${dateKey===todayKey?'today':''}" ${entries.length?`data-appointment="${entries[0].id}" aria-label="Termin am ${day}. öffnen"`:''}><span>${day}</span>${entries.slice(0,2).map(item=>`<small>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(item.start))} ${item.clientName}</small>`).join('')}${entries.length>2?`<em>+${entries.length-2} weitere</em>`:''}</button>`}).join('')}</div></div>`
}
function appointmentView(day){
  const client=day==='8'?'Jonas R.':day==='18'?'Sina V.':'Mara K.'
  return `<div class="detail-top"><button class="detail-back" data-back-dashboard>← Kalender</button><div><button class="secondary-action">Termin verschieben</button><button class="save-settings">Kundennachricht senden</button></div></div>
  <div class="appointment-head"><div><span class="admin-kicker">BESTÄTIGTER TERMIN · STUDIO</span><h2>${client}</h2><p>Microrealism · Unterarm innen</p></div><div class="appointment-time"><span>AUG</span><b>${String(day).padStart(2,'0')}</b><small>12:30–16:30</small></div></div>
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
const customerKey = item => (item.email||item.phone||item.clientName||item.name||'').toLowerCase()
const normalizePhone = value => {
  const raw=String(value||'').trim().replace(/[^\d+]/g,'')
  if(raw.startsWith('+'))return `+${raw.slice(1).replace(/\D/g,'')}`
  const digits=raw.replace(/\D/g,'')
  if(digits.startsWith('0'))return `+49${digits.slice(1)}`
  if(digits.startsWith('49'))return `+${digits}`
  return digits?`+49${digits}`:''
}
const formatPhoneBlocks = value => {
  const phone=normalizePhone(value)
  if(!phone)return 'Nicht hinterlegt'
  const country=phone.startsWith('+49')?'+49':phone.match(/^\+\d{1,3}/)?.[0]||''
  const rest=phone.slice(country.length)
  return [country,...(rest.match(/.{1,4}/g)||[])].filter(Boolean).join(' ')
}
function legacyRealAppointmentView(id) {
  const item=appointments.find(appointment=>appointment.id===id)
  if(!item)return `<div class="detail-top"><button class="detail-back" data-back-dashboard>← Kalender</button></div><div class="request-empty"><span>404</span><h3>Termin nicht gefunden.</h3><p>Die Terminakte ist nicht mehr vorhanden.</p></div>`
  const start=new Date(item.start), end=new Date(item.end)
  const request=demoRequests.find(entry=>entry.id===item.requestId)
  return `<div class="detail-top"><button class="detail-back" data-back-dashboard>← Kalender</button><div><button class="secondary-action" data-customer="${encodeURIComponent(customerKey(item))}">Kunde öffnen</button><button class="secondary-action">Termin verschieben</button><button class="save-settings">Kundennachricht senden</button></div></div><div class="appointment-head"><div><span class="admin-kicker">BESTÄTIGTER TERMIN · ${item.source==='google'?'STUDIO':'STUDIO'}</span><h2>${item.clientName}</h2><p>${item.style||'Tattoo-Termin'} · ${item.placement||'Studio'}</p></div><div class="appointment-time"><span>${new Intl.DateTimeFormat('de-DE',{month:'short'}).format(start).toUpperCase()}</span><b>${String(start.getDate()).padStart(2,'0')}</b><small>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(start)}–${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(end)}</small></div></div><div class="request-detail-grid"><section class="project-card"><span>TERMINAKTE</span><dl><div><dt>Stil</dt><dd>${item.style||'Nicht angegeben'}</dd></div><div><dt>Körperstelle</dt><dd>${item.placement||'Nicht angegeben'}</dd></div><div><dt>Dauer</dt><dd>${Math.max(0,(end-start)/3600000).toLocaleString('de-DE')} Stunden</dd></div><div><dt>Kontakt</dt><dd>${item.phone||item.email||'Nicht angegeben'}</dd></div></dl><span>NOTIZ</span><p>${item.notes||request?.idea||'Keine Notiz vorhanden.'}</p>${request?.references?.length?`<span>REFERENZBILDER</span><div class="request-references">${request.references.map((reference,index)=>`<a href="${reference.url||reference.data}" target="_blank" rel="noopener"><img src="${reference.url||reference.data}" alt="Referenzbild ${index+1}"><small>${reference.name||`Referenz ${index+1}`}</small></a>`).join('')}</div>`:''}</section><section class="timeline-card"><span>VORBEREITUNG</span><div><i></i><p><b>Termin bestätigt</b><small>${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium'}).format(start)}</small></p></div><textarea placeholder="Interne Notiz hinzufügen …">${item.internalNote||''}</textarea></section></div>`
}
function realAppointmentView(id) {
  const item=appointments.find(appointment=>appointment.id===id)
  if(!item)return `<div class="detail-top"><button class="detail-back" data-back-dashboard>← Terminakten</button></div><div class="request-empty"><span>404</span><h3>Termin nicht gefunden.</h3></div>`
  const start=new Date(item.start),end=new Date(item.end),request=demoRequests.find(entry=>entry.id===item.requestId)||demoRequests.find(entry=>customerKey(entry)===customerKey(item)),key=encodeURIComponent(customerKey(item)),noteKey=`appointment:${item.id}`.toLowerCase(),rank={kritisch:0,wichtig:1,normal:2}
  const notes=customerNotes.filter(note=>note.customerKey===noteKey||note.customerKey===customerKey(item).toLowerCase()).map(note=>({...note,noteSource:note.customerKey===noteKey?'Termin':'Kunde'})).sort((a,b)=>(rank[a.relevance]??3)-(rank[b.relevance]??3)||new Date(b.createdAt)-new Date(a.createdAt))
  const images=[...(request?.references||[]).map(file=>({...file,category:'Anfrage-Referenz'})),...(item.attachments||[])]
  const imageMarkup=images.length?images.map((file,index)=>`<a href="${file.url||file.data}" target="_blank" rel="noopener"><img src="${file.url||file.data}" alt="Terminbild ${index+1}"><small>${file.category||'Sonstiges'} · ${file.name||`Bild ${index+1}`}</small></a>`).join(''):'<p>Noch keine Bilder vorhanden.</p>'
  const noteMarkup=notes.length?notes.map(note=>`<article class="relevance-${note.relevance} note-source-${note.noteSource.toLowerCase()}"><div><span><b class="note-source">${note.noteSource}</b>${note.category}</span><span class="customer-note-tools"><i>${note.relevance}</i><button data-delete-appointment-note="${note.id}" data-appointment-id="${item.id}" aria-label="Notiz löschen"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"></path></svg></button></span></div><p>${note.text}</p><small>${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(note.createdAt))}</small></article>`).join(''):'<div class="today-empty">Noch keine Kunden- oder Terminnotizen vorhanden.</div>'
  return `<div class="detail-top"><button class="detail-back" data-back-dashboard>← Terminakten</button><div><button class="secondary-action" data-reschedule-appointment="${item.id}">Termin verschieben</button><button class="save-settings" data-call-contact="${key}" data-appointment-message="true">Kunde kontaktieren</button></div></div><div class="appointment-head"><div><span class="admin-kicker">BESTÄTIGTER TERMIN · ${item.source==='google'?'STUDIO':'STUDIO'}</span><h2>${item.clientName}</h2><p>${item.style||'Tattoo-Termin'} · ${item.placement||'Studio'}</p></div><div class="appointment-time"><span>${new Intl.DateTimeFormat('de-DE',{month:'short'}).format(start).toUpperCase()}</span><b>${String(start.getDate()).padStart(2,'0')}</b><small>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(start)}–${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(end)}</small></div></div><button class="appointment-customer-card" data-customer="${key}"><span class="customer-avatar">${item.clientName.split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><span><small>KUNDE</small><b>${item.clientName}</b><em>${item.email||'Keine E-Mail'} · ${item.phone||'Keine Telefonnummer'}</em></span><i>Kundenakte öffnen ↗</i></button><div class="request-detail-grid"><section class="project-card"><span>TERMINDETAILS</span><dl><div><dt>Stil</dt><dd>${item.style||'Nicht angegeben'}</dd></div><div><dt>Körperstelle</dt><dd>${item.placement||'Nicht angegeben'}</dd></div><div><dt>Dauer</dt><dd>${Math.max(0,(end-start)/3600000).toLocaleString('de-DE')} Stunden</dd></div><div><dt>Quelle</dt><dd>${request?'Aus Anfrage übernommen':'Direkt angelegt'}</dd></div></dl><span>BESCHREIBUNG</span><p>${item.notes||request?.idea||'Keine Beschreibung vorhanden.'}</p></section><section class="appointment-media"><div><span class="admin-kicker">BILDER & DOKUMENTATION</span><b>${images.length}</b></div><div class="request-references">${imageMarkup}</div><form data-appointment-upload="${item.id}"><label>KATEGORIE<select name="category"><option>Motiv-Referenz</option><option>Entwurf</option><option>Stencil</option><option>Vorher-Bild</option><option>Ergebnis</option><option>Heilungsverlauf</option><option>Sonstiges</option></select></label><label class="appointment-upload-drop">＋ Bilder auswählen oder hierher ziehen<input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple required></label><button class="save-settings" type="submit">Bilder hochladen →</button><p class="modal-form-error"></p></form></section></div><section class="customer-notes appointment-notes"><div class="customer-notes-head"><div><span class="admin-kicker">INTERNE TERMINNOTIZEN</span><h3>Notizen</h3></div><b>${notes.length}</b></div><form data-appointment-note-form data-appointment-id="${item.id}"><div><label>KATEGORIE<select name="category"><option>Allgemein</option><option>Motiv & Stil</option><option>Vorbereitung</option><option>Durchführung</option><option>Nachsorge</option><option>Zahlung</option></select></label><label>RELEVANZ<select name="relevance"><option value="normal">Normal</option><option value="wichtig">Wichtig</option><option value="kritisch">Kritisch</option></select></label></div><textarea required name="text" rows="3" placeholder="Interne Terminnotiz …"></textarea><button class="save-settings" type="submit">Notiz speichern →</button><p class="modal-form-error"></p></form><div class="customer-note-list">${noteMarkup}</div></section>`
}
function consultationBadge(request) {
  if (!request.consultation) return '<i class="consultation-badge none"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Keine Beratung</span></i>'
  if (request.consultationType === 'phone') return '<i class="consultation-badge phone"><svg viewBox="0 0 24 24"><path d="M7 3h3l1.5 5-2 1.5a15 15 0 0 0 5 5L16 12.5l5 1.5v3c0 2.2-1.8 4-4 4A14 14 0 0 1 3 7c0-2.2 1.8-4 4-4Z"/></svg><span>Telefon</span></i>'
  return '<i class="consultation-badge studio"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg><span>Persönlich</span></i>'
}
function requestDetailView(r){
  const reference=requestReference(r),hours=Math.max(.5,Number(r.estimatedHours)||4),proposals=r.proposals||[],timeline=[{title:'Anfrage eingegangen',text:'Anfrage über das Bookingformular erhalten.',createdAt:r.date},...(r.timeline||[]),...(r.emails||[]).map(mail=>({title:mail.direction==='inbound'?'E-Mail vom Kunden':'E-Mail gesendet',text:`${mail.subject||''}${mail.text?` · ${mail.text}`:''}`,createdAt:mail.createdAt}))].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
  const references=r.references?.length?`<span>REFERENZBILDER</span><div class="request-references">${r.references.map((file,index)=>file.url||file.data?`<a href="${file.url||file.data}" target="_blank" rel="noopener"><img src="${file.url||file.data}" alt="Referenzbild ${index+1}"><small>${file.name||`Referenz ${index+1}`}</small></a>`:`<div class="missing-reference"><span>Bild</span><small>${file.name}</small></div>`).join('')}</div>`:''
  const linkedAppointment=appointments.find(item=>item.id===r.bookedAppointmentId)||appointments.find(item=>item.requestId===r.id)
  const linkedAppointmentMarkup=linkedAppointment?(()=>{const start=new Date(linkedAppointment.start),end=new Date(linkedAppointment.end);return `<section class="linked-appointment"><div><span class="admin-kicker">VERKNÜPFTER TERMIN</span><i>GEBUCHT</i></div><a href="/admin/terminakten/?termin=${encodeURIComponent(linkedAppointment.id)}"><time><b>${String(start.getDate()).padStart(2,'0')}</b><span>${new Intl.DateTimeFormat('de-DE',{month:'short'}).format(start).toUpperCase()}</span></time><span><b>${new Intl.DateTimeFormat('de-DE',{dateStyle:'full'}).format(start)}</b><small>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(start)}–${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(end)} Uhr · ${linkedAppointment.style||'Tattoo-Termin'}</small></span><em>Terminakte öffnen →</em></a></section>`})():''
  const proposalMarkup=linkedAppointment?linkedAppointmentMarkup:(proposals.length?`<section class="stored-proposals"><div><span class="admin-kicker">GESENDETE TERMINVORSCHLÄGE</span><b>${proposals.length}</b></div>${proposals.slice().reverse().map((batch,batchIndex)=>`<article><header><span>VERSENDET ${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(batch.sentAt))}</span><small>${batch.duration} Std.</small></header><div>${batch.slots.map(slot=>`<button data-book-proposal="${slot}" data-request-id="${r.id}"><span><b>${new Intl.DateTimeFormat('de-DE',{dateStyle:'full'}).format(new Date(slot))}</b><small>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(slot))} Uhr · ${batch.duration} Std.</small></span><i>Termin buchen →</i></button>`).join('')}</div></article>`).join('')}<button class="secondary-action" data-manual-booking="${r.id}">Termin manuell erstellen und buchen</button></section>`:'')
  return `<div class="detail-top"><button class="detail-back">← Anfragen</button><div><button class="secondary-action" data-call-contact="${encodeURIComponent(customerKey(r))}" data-appointment-message="true">Kunde kontaktieren</button><button class="secondary-action" data-question>Rückfrage senden</button>${linkedAppointment?'':`<button class="save-settings" data-proposals>Terminvorschläge erstellen</button>`}</div></div><div class="request-hero"><div><span class="admin-kicker">${reference} · EINGANG ${new Intl.DateTimeFormat('de-DE').format(new Date(r.date))}</span><h2>${r.name}</h2><p>${r.phone||'Keine Telefonnummer'} · ${r.email||'Keine E-Mail-Adresse'}</p></div><i class="status neu">${r.status}</i></div><div class="request-detail-grid request-workspace"><section class="project-card"><span>PROJEKTDETAILS</span><dl><div><dt>Stil</dt><dd>${r.style||'Nicht angegeben'}</dd></div><div><dt>Körperstelle</dt><dd>${r.placement||'Nicht angegeben'}</dd></div><div><dt>Größe</dt><dd>${r.size||'Nicht angegeben'}</dd></div><div><dt>Beratung</dt><dd>${r.consultation?(r.consultationType==='phone'?'Telefonisch':'Persönlich im Studio'):'Nicht gewünscht'}</dd></div></dl><form class="request-duration" data-request-duration-form data-request-id="${r.id}"><label>ZEITAUFWAND / DAUER<input type="number" name="estimatedHours" min="0.5" max="24" step="0.5" value="${hours}"><span>Stunden</span></label><button type="submit">Speichern</button></form><span>BESCHREIBUNG</span><p>${r.idea||r.motif||'Keine Beschreibung vorhanden.'}</p>${references}</section><section class="request-timeline"><div class="request-timeline-head"><span class="admin-kicker">VERLAUF</span><b>${timeline.length}</b></div><form data-request-timeline-form data-request-id="${r.id}"><input name="title" required placeholder="Titel, z. B. Motiv abgestimmt"><textarea name="text" rows="3" placeholder="Details zum Verlauf …"></textarea><button class="save-settings" type="submit">Eintrag hinzufügen →</button></form><div>${timeline.map(entry=>`<article><i></i><span><b>${entry.title}</b><p>${entry.text||''}</p><small>${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(entry.createdAt))}</small></span></article>`).join('')}</div></section></div>${proposalMarkup}${linkedAppointment?'':`<div class="request-book-actions"><button class="secondary-action" data-manual-booking="${r.id}">Termin manuell erstellen und buchen</button></div>`}`
}
function requestsView() {
  const rows = demoRequests.map((r,i)=>`<button class="request-row ${r.readAt ? '' : 'unread'}" data-request="${i}" data-style="${r.style || ''}" data-consultation="${r.consultation ? (r.consultationType === 'phone' ? 'phone' : 'studio') : 'none'}" data-status="${r.status}"><span><b>${r.name}${r.readAt ? '' : '<i class="unread-dot" aria-label="Ungelesen"></i>'}</b><small>${r.email || r.phone || 'Keine Kontaktdaten'} · ${requestReference(r)}</small></span><span><b>${r.style || 'Nicht angegeben'}</b><small>${r.placement || 'Körperstelle offen'}</small></span><span><b>${r.size || 'Größe offen'}</b><small>Projektumfang</small></span><span>${consultationBadge(r)}</span><span><i class="status ${r.status.replace(' ','-').toLowerCase()}">${r.status}</i></span><span class="row-arrow">↗</span></button>`).join('')
  return `<div class="admin-title"><div><span class="admin-kicker">INBOX</span><h2>Anfragen</h2><p>Alle eingehenden Tattoo-Projekte priorisiert an einem Ort.</p></div></div><div class="request-filters" aria-label="Anfragen filtern"><label>STIL<select data-request-filter="style"><option value="">Alle Stile</option><option>Realistic</option><option>Microrealism</option><option>Fineline</option><option>Andere Richtung</option></select></label><label>BERATUNG<select data-request-filter="consultation"><option value="">Alle</option><option value="phone">Telefon</option><option value="studio">Persönlich</option></select></label><label>STATUS<select data-request-filter="status"><option value="">Alle Status</option><option>Neu</option><option>In Klärung</option><option>Bestätigt</option></select></label><button type="button" data-reset-filters>Filter zurücksetzen</button></div><div class="request-list request-inbox"><div class="list-head"><span>NAME / KONTAKT</span><span>STIL</span><span>PROJEKT</span><span>BERATUNG</span><span>STATUS</span><span></span></div>${demoRequests.length ? rows+'<div class="request-empty filter-empty" hidden><span>00</span><h3>Keine Treffer.</h3><p>Für diese Filterkombination liegen keine Anfragen vor.</p></div>' : '<div class="request-empty"><span>00</span><h3>Noch keine Anfragen.</h3><p>Neue Booking-Anfragen erscheinen automatisch an dieser Stelle.</p></div>'}</div>`
}
function portfolioView(){const entries=portfolio.slice().sort((a,b)=>(a.order||0)-(b.order||0));return `<div class="admin-title portfolio-title"><div><span class="admin-kicker">PORTFOLIO</span><h2>Referenzen</h2><p>Arbeiten verwalten und für die Website veröffentlichen.</p></div><button class="save-settings" data-new-reference>+ Neue Referenz</button></div><div class="portfolio-stats"><article><b>${entries.length}</b><small>Arbeiten</small></article><article><b>${entries.filter(item=>item.published).length}</b><small>Veröffentlicht</small></article><article><b>${entries.filter(item=>!item.published).length}</b><small>Entwürfe</small></article></div><div class="portfolio-toolbar"><label>SUCHEN<input type="search" data-portfolio-search placeholder="Titel, Stil, Körperstelle …"></label><label>STATUS<select data-portfolio-status><option value="">Alle</option><option value="published">Veröffentlicht</option><option value="draft">Entwurf</option></select></label></div><div class="admin-gallery portfolio-admin-grid" id="admin-gallery">${entries.length?entries.map((item,index)=>`<article data-portfolio-card data-search="${encodeURIComponent(JSON.stringify(item))}" data-status="${item.published?'published':'draft'}"><div class="portfolio-image"><img src="${item.image||'/studio-hero.png'}" alt="${item.title}" style="object-position:${item.position||'50% 50%'}"><span class="portfolio-state ${item.published?'live':'draft'}">${item.published?'LIVE':'ENTWURF'}</span>${item.featured?'<i>FEATURED</i>':''}</div><div class="portfolio-card-copy"><span><b>${item.title}</b><small>${[item.style,item.placement].filter(Boolean).join(' · ')||'Ohne Metadaten'}</small></span><div class="portfolio-card-actions"><button data-portfolio-move="up" data-portfolio-id="${item.id}" ${index===0?'disabled':''} aria-label="Nach oben">↑</button><button data-portfolio-move="down" data-portfolio-id="${item.id}" ${index===entries.length-1?'disabled':''} aria-label="Nach unten">↓</button><button data-edit-reference="${item.id}">Bearbeiten</button><button class="danger" data-delete-reference="${item.id}" aria-label="Löschen">×</button></div></div></article>`).join(''):'<div class="request-empty"><span>00</span><h3>Noch keine Referenzen.</h3><p>Lade die erste Arbeit für das Portfolio hoch.</p></div>'}<div class="portfolio-filter-empty" hidden>Keine passenden Referenzen gefunden.</div></div>`}
function legacySettingsView(){return `<div class="admin-title"><div><span class="admin-kicker">SYSTEM</span><h2>Einstellungen</h2><p>Verbindungen und Verfügbarkeiten für die automatische Terminplanung.</p></div><button class="save-settings">Änderungen speichern</button></div><div class="settings-layout">
  <section class="integration-card"><div class="integration-icon mail">✉</div><div><h3>SMTP E-Mail</h3><p>Rückfragen und Terminvorschläge direkt aus dem Adminpanel senden.</p></div><span class="connected">AKTIV</span><button data-smtp>SMTP konfigurieren</button></section>
  <section class="hours-card"><div class="settings-heading"><div><h3>Öffnungszeiten</h3><p>Basis für automatisch berechnete Terminvorschläge.</p></div><span>Europe/Berlin</span></div>${['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'].map((d,i)=>`<div class="hours-row"><label class="switch"><input type="checkbox" ${i!==0&&i!==5?'checked':''}><i></i></label><b>${d}</b><input type="time" value="10:00" ${i===0||i===5?'disabled':''}><span>bis</span><input type="time" value="18:00" ${i===0||i===5?'disabled':''}></div>`).join('')}<div class="hours-row"><label class="switch"><input type="checkbox"><i></i></label><b>Sonntag</b><span class="closed">Geschlossen</span></div></section>
  </div>`}
function legacySettingsView2(){return ''}
const settingsNav=section=>`<div class="admin-title settings-title"><div><span class="admin-kicker">SYSTEM</span><h2>Einstellungen</h2><p>Studio, Zugänge und verbundene Dienste zentral verwalten.</p></div></div><nav class="settings-subnav"><a class="${section==='interfaces'?'active':''}" href="/admin/einstellungen/schnittstellen/"><span>01</span>Schnittstellen</a><a class="${section==='users'?'active':''}" href="/admin/einstellungen/benutzer/"><span>02</span>Benutzer</a><a class="${section==='calendar'?'active':''}" href="/admin/einstellungen/kalender/"><span>03</span>Kalender</a></nav>`
function settingsView(){const path=location.pathname.replace(/\/+$/,''),section=path.endsWith('/benutzer')?'users':path.endsWith('/kalender')?'calendar':'interfaces',nav=settingsNav(section),integrations=studioSettings.integrations||{},calendar=studioSettings.calendar||{},days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];if(section==='interfaces')return `${nav}<form class="settings-final-form" data-integrations-form><div class="settings-section-head"><span class="admin-kicker">KOMMUNIKATION</span><h3>Schnittstellen</h3><p>POP3-Eingang, SMTP-Versand und Telegram-Benachrichtigungen.</p></div>${[['pop3','POP3 Eingang','Alle eingehenden E-Mails werden gescannt und per #Anfragenummer zugeordnet.'],['smtp','SMTP Versand','Ausgehende Kundennachrichten und Terminvorschläge.'],['telegram','Telegram Bot','Sofortige Benachrichtigungen bei neuen Anfragen und Antworten.']].map(([key,title,text])=>{const value=integrations[key]||{};return `<section class="interface-config"><header><div class="integration-icon">${key==='pop3'?'↙':key==='smtp'?'✉':'T'}</div><span><h3>${title}</h3><p>${text}</p></span><label class="switch"><input type="checkbox" name="${key}.enabled" ${value.enabled?'checked':''}><i></i></label></header><div class="interface-fields">${key==='telegram'?`<label>BOT TOKEN<input type="password" name="telegram.token" value="${value.token||''}"></label><label>CHAT-ID<input name="telegram.chatId" value="${value.chatId||''}"></label>`:`<label>SERVER<input name="${key}.host" value="${value.host||''}" placeholder="${key}.anbieter.de"></label><label>PORT<input type="number" name="${key}.port" value="${value.port||(key==='pop3'?995:587)}"></label><label>BENUTZER / E-MAIL<input name="${key}.user" value="${value.user||''}"></label><label>PASSWORT<input type="password" name="${key}.password" value="${value.password||''}"></label>${key==='smtp'?`<label>ABSENDER<input name="smtp.from" value="${value.from||''}"></label>`:''}`}</div></section>`}).join('')}<button class="save-settings" type="submit">Schnittstellen speichern →</button><p class="modal-form-error"></p></form>`;if(section==='users')return `${nav}<div class="settings-section-head"><span class="admin-kicker">ZUGRIFF & ROLLEN</span><h3>Benutzer</h3><p>Konten für das Studio-Adminpanel verwalten.</p></div><div class="admin-users">${adminUsers.length?adminUsers.map(user=>`<article><div class="avatar">${user.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</div><span><b>${user.name}</b><small>${user.email} · ${user.role}</small></span><i>${user.active?'AKTIV':'INAKTIV'}</i><button data-edit-user="${user.id}">Bearbeiten</button><button data-delete-user="${user.id}">×</button></article>`).join(''):'<div class="today-empty">Noch keine zusätzlichen Benutzer.</div>'}</div><button class="secondary-action settings-add-user" data-new-user>＋ Benutzer anlegen</button>`;const hours=calendar.hours||[];return `${nav}<form class="settings-final-form" data-calendar-settings-form><div class="settings-section-head"><span class="admin-kicker">VERFÜGBARKEIT & REGELN</span><h3>Kalender</h3><p>Alle Werte werden global bei Terminvorschlägen berücksichtigt.</p></div><section class="webcal-card"><div><span class="admin-kicker">WEBCAL</span><h3>Kalender abonnieren</h3><p>Link in Apple Kalender, Outlook oder andere Kalender einfügen.</p></div><input readonly value="${location.origin.replace(/^http/,'webcal')}/api/calendar.ics?token=${calendar.webcalToken||''}"><button type="button" data-copy-webcal>Link kopieren</button></section><section class="buffer-settings"><label>VORLAUF<input type="number" min="0" step="5" name="beforeMinutes" value="${calendar.beforeMinutes??30}"><span>Minuten</span></label><label>NACHLAUF<input type="number" min="0" step="5" name="afterMinutes" value="${calendar.afterMinutes??30}"><span>Minuten</span></label></section><section class="hours-card"><div class="settings-heading"><div><h3>Öffnungszeiten</h3><p>Erlaubte Zeitfenster für Termine.</p></div><span>Europe/Berlin</span></div>${days.map((day,index)=>{const value=hours[index]||{};return `<div class="hours-row" data-hours-day="${index}"><label class="switch"><input type="checkbox" name="hours.${index}.enabled" ${value.enabled?'checked':''}><i></i></label><b>${day}</b><input type="time" name="hours.${index}.start" value="${value.start||'10:00'}"><span>bis</span><input type="time" name="hours.${index}.end" value="${value.end||'18:00'}"></div>`}).join('')}</section><section class="rules-card"><div class="settings-heading"><div><h3>Terminregeln</h3><p>Klassische Wenn-dann-Regeln für mögliche Termine.</p></div><button type="button" data-add-rule>＋ Regel</button></div><div data-rule-list>${(calendar.rules||[]).map((rule,index)=>ruleRow(rule,index)).join('')}</div></section><button class="save-settings" type="submit">Kalendereinstellungen speichern →</button><p class="modal-form-error"></p></form>`}
const ruleRow=(rule={},index=Date.now())=>{const type=rule.type||'weekday',days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],value=rule.value??(type==='weekday'?'0':type==='time'?'18:00':type==='duration'?'6':type==='appointmentName'?'Beerdigung':'3'),operator=rule.operator||(type==='time'?'after':type==='duration'?'max':'is'),condition=type==='weekday'?`<span>Termine an</span><select name="rule-value" aria-label="Wochentag">${days.map((day,dayIndex)=>`<option value="${dayIndex}" ${String(value)===String(dayIndex)?'selected':''}>${day}</option>`).join('')}</select><input type="hidden" name="rule-operator" value="is"><span>nicht vorschlagen</span>`:type==='time'?`<span>Termine</span><select name="rule-operator" aria-label="Zeitrichtung"><option value="after" ${operator==='after'?'selected':''}>ab</option><option value="before" ${operator==='before'?'selected':''}>vor</option></select><input type="time" name="rule-value" value="${value}"><span>nicht vorschlagen</span>`:type==='duration'?`<span>Termine dürfen höchstens</span><input type="number" min="0.5" max="24" step="0.5" name="rule-value" value="${value}"><input type="hidden" name="rule-operator" value="max"><span>Stunden dauern</span>`:type==='appointmentName'?`<span>der Terminname</span><select name="rule-operator"><option value="contains" selected>enthält</option></select><input name="rule-value" value="${value}" placeholder="z. B. Beerdigung"><strong>dann</strong><select name="rule-day-mode"><option value="workday" ${rule.dayMode!=='calendar'?'selected':''}>am darauffolgenden Arbeitstag</option><option value="calendar" ${rule.dayMode==='calendar'?'selected':''}>am nächsten Kalendertag</option></select><select name="rule-action"><option value="open" ${rule.action!=='close'?'selected':''}>ab Uhrzeit öffnen</option><option value="close" ${rule.action==='close'?'selected':''}>ganztägig schließen</option></select><input type="time" name="rule-time" value="${rule.time||'10:00'}" ${rule.action==='close'?'disabled':''}>`:`<span>Termine frühestens</span><input type="number" min="0" max="365" step="1" name="rule-value" value="${value}"><input type="hidden" name="rule-operator" value="is"><span>Tage im Voraus vorschlagen</span>`;return `<article class="calendar-rule" data-rule><header><span class="rule-number">REGEL</span><label class="switch" title="Regel aktivieren"><input type="checkbox" name="rule-enabled" ${rule.enabled!==false?'checked':''}><i></i></label><button type="button" data-remove-rule aria-label="Regel löschen">×</button></header><div class="rule-sentence"><strong>Wenn</strong><select name="rule-type" data-rule-type><option value="weekday" ${type==='weekday'?'selected':''}>ein bestimmter Wochentag ist</option><option value="time" ${type==='time'?'selected':''}>eine Uhrzeit erreicht ist</option><option value="duration" ${type==='duration'?'selected':''}>die Termindauer geplant wird</option><option value="lead" ${type==='lead'?'selected':''}>ein Termin vorgeschlagen wird</option><option value="appointmentName" ${type==='appointmentName'?'selected':''}>ein Termin einen bestimmten Namen hat</option></select>${type==='appointmentName'?'':'<strong>dann</strong>'}${condition}</div><label class="rule-label">INTERNE BEZEICHNUNG <input name="rule-label" value="${rule.label||''}" placeholder="Optional, z. B. Sonntags geschlossen"></label></article>`}
function appointmentFormView(){const date=new Date();date.setMinutes(Math.ceil(date.getMinutes()/30)*30,0,0);const end=new Date(date.getTime()+3*3600000);const localValue=value=>new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16);return `<div class="admin-title"><div><span class="admin-kicker">STUDIO-KALENDER</span><h2>Neuen Termin anlegen</h2><p>Eine neue Terminakte erstellen und direkt im Kalender einplanen.</p></div></div><form class="admin-appointment-form" data-appointment-form><div class="appointment-form-grid"><label>NAME<input required name="clientName" placeholder="Vor- und Nachname"></label><label>E-MAIL<input type="email" name="email" placeholder="name@email.de"></label><label>TELEFON<input name="phone" placeholder="+49 …"></label><label>STIL<input name="style" placeholder="z. B. Fineline"></label><label>KÖRPERSTELLE<input name="placement" placeholder="z. B. Unterarm"></label><label>BEGINN<input required type="datetime-local" name="start" value="${localValue(date)}"></label><label>ENDE<input required type="datetime-local" name="end" value="${localValue(end)}"></label><label class="full">NOTIZ<textarea name="notes" rows="6" placeholder="Vorbereitung, Motiv, Besonderheiten …"></textarea></label></div><p class="modal-form-error" role="alert"></p><button class="save-settings" type="submit">Termin speichern →</button></form>`}
function appointmentFilesView(){return `<div class="admin-title"><div><span class="admin-kicker">ARCHIV</span><h2>Terminakten</h2><p>Alle geplanten und vergangenen Studio-Termine an einem Ort.</p></div><a class="save-settings" href="/admin/termin-neu/">+ Neuer Termin</a></div><div class="appointment-files-list">${appointments.length?appointments.map(item=>{const start=new Date(item.start);return `<button data-appointment="${item.id}"><time><b>${String(start.getDate()).padStart(2,'0')}</b><small>${new Intl.DateTimeFormat('de-DE',{month:'short',year:'numeric'}).format(start)}</small></time><span><b>${item.clientName}</b><small>${item.style||'Tattoo-Termin'} · ${item.placement||'Studio'}</small></span><span><b>${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(start)} Uhr</b><small>${Math.max(0,(new Date(item.end)-start)/3600000).toLocaleString('de-DE')} Stunden</small></span><i>Akte öffnen ↗</i></button>`}).join(''):'<div class="request-empty"><span>00</span><h3>Noch keine Terminakten.</h3><p>Neu angelegte Termine erscheinen automatisch hier.</p></div>'}</div>`}
function customerRecords(){return [...demoRequests,...appointments].reduce((map,item)=>{const key=customerKey(item);if(!key)return map;const current=map.get(key)||{key,name:item.clientName||item.name,email:item.email,phone:item.phone,requests:[],appointments:[]};if(item.id?.startsWith('APT-'))current.appointments.push(item);else current.requests.push(item);current.email=current.email||item.email;current.phone=current.phone||item.phone;map.set(key,current);return map},new Map())}
function customersView(){const customers=[...customerRecords().values()].sort((a,b)=>a.name.localeCompare(b.name,'de'));return `<div class="admin-title"><div><span class="admin-kicker">KARTEI</span><h2>Kunden</h2><p>Kontaktdaten und Projektverlauf aus Anfragen und Terminakten.</p></div><b class="customer-count">${customers.length}</b></div>${customers.length?`<div class="customer-filter"><label for="customer-search">KUNDEN DURCHSUCHEN</label><div><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg><input id="customer-search" type="search" data-customer-search-input placeholder="Name, Kontakt, Stil, Körperstelle, Notizen …" autocomplete="off"><span data-customer-filter-count>${customers.length} Kunden</span></div></div>`:''}<div class="customer-list">${customers.length?customers.map(customer=>{const key=encodeURIComponent(customer.key);const notes=customerNotes.filter(note=>note.customerKey===customer.key);const important=notes.some(note=>note.relevance==='wichtig'||note.relevance==='kritisch');return `<article class="customer-row" data-customer-search="${encodeURIComponent(JSON.stringify({...customer,notes}))}"><button class="customer-row-main" data-customer="${key}"><span class="customer-avatar">${customer.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><div><b>${customer.name}</b><small>${customer.email||'Keine E-Mail'} · ${customer.phone||'Keine Telefonnummer'}</small></div><div><b>${customer.requests.length}</b><small>Anfragen</small></div><div class="customer-row-appointments"><b>${customer.appointments.length}</b><small>Termine</small></div><div class="customer-row-notes"><b>${notes.length}${important?'<i title="Wichtige Notiz vorhanden" aria-label="Wichtige Notiz vorhanden">!</i>':''}</b><small>Notizen</small></div></button><div class="customer-row-actions"><button class="customer-quick-action customer-quick-mail" data-email-contact="${key}" aria-label="E-Mail an ${customer.name} senden" title="E-Mail senden" ${customer.email?'':'disabled'}><svg viewBox="0 0 24 24"><path d="M3.5 6.5h17v11h-17z"></path><path d="m4 7 8 6 8-6"></path></svg></button><button class="customer-quick-action customer-quick-call" data-call-contact="${key}" aria-label="${customer.name} anrufen" title="Anrufen" ${customer.phone?'':'disabled'}><svg viewBox="0 0 24 24"><path d="M7 3h3l1.5 5-2 1.5a15 15 0 0 0 5 5l1.5-2 5 1.5v3c0 2.2-1.8 4-4 4A14 14 0 0 1 3 7c0-2.2 1.8-4 4-4Z"></path></svg></button></div></article>`}).join(''):'<div class="request-empty"><span>00</span><h3>Noch keine Kunden.</h3><p>Kunden werden automatisch aus Anfragen und Terminen übernommen.</p></div>'}<div class="customer-filter-empty" hidden><span>Keine Treffer</span><p>Prüfe den Suchbegriff oder versuche ein anderes Kundenmerkmal.</p></div></div>`}
function customerDetailView(encodedKey){const key=decodeURIComponent(encodedKey);const customer=customerRecords().get(key);if(!customer)return `<div class="detail-top"><button class="detail-back" data-back-customers>← Kunden</button></div><div class="request-empty"><span>404</span><h3>Kunde nicht gefunden.</h3></div>`;const relevanceRank={kritisch:0,wichtig:1,normal:2};const notes=customerNotes.filter(note=>note.customerKey===key).sort((a,b)=>(relevanceRank[a.relevance]??3)-(relevanceRank[b.relevance]??3)||new Date(b.createdAt)-new Date(a.createdAt));return `<div class="detail-top"><button class="detail-back" data-back-customers>← Kunden</button><div><a class="save-settings" href="mailto:${customer.email||''}">Nachricht senden</a></div></div><div class="customer-hero"><span class="customer-avatar">${customer.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><div><span class="admin-kicker">KUNDENAKTE</span><h2>${customer.name}</h2><p>${customer.email||'Keine E-Mail'} · ${customer.phone||'Keine Telefonnummer'}</p></div></div><section class="customer-notes"><div class="customer-notes-head"><div><span class="admin-kicker">INTERNE NOTIZEN</span><h3>Notizen</h3></div><b>${notes.length}</b></div><form data-customer-note-form data-customer-key="${encodeURIComponent(key)}"><div><label>KATEGORIE<select name="category"><option>Allgemein</option><option>Motiv & Stil</option><option>Gesundheit</option><option>Vorbereitung</option><option>Nachsorge</option><option>Zahlung</option></select></label><label>RELEVANZ<select name="relevance"><option value="normal">Normal</option><option value="wichtig">Wichtig</option><option value="kritisch">Kritisch</option></select></label></div><textarea required name="text" rows="3" placeholder="Interne Kundennotiz …"></textarea><p class="modal-form-error" role="alert"></p><button class="save-settings" type="submit">Notiz speichern →</button></form><div class="customer-note-list">${notes.length?notes.map(note=>`<article class="relevance-${note.relevance}"><div><span>${note.category}</span><span class="customer-note-tools"><i>${note.relevance}</i><button data-delete-customer-note="${note.id}" aria-label="Notiz löschen" title="Notiz löschen"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"></path></svg></button></span></div><p>${note.text}</p><small>${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(note.createdAt))}</small></article>`).join(''):'<div class="today-empty">Noch keine Notizen vorhanden.</div>'}</div></section><div class="customer-history"><section><h3>Anfragen <b>${customer.requests.length}</b></h3>${customer.requests.length?customer.requests.map(request=>`<button data-request="${demoRequests.indexOf(request)}"><span><b>${request.style||'Tattoo-Anfrage'}</b><small>${request.placement||'Körperstelle offen'} · ${request.size||'Größe offen'}</small></span><i>${request.status} ↗</i></button>`).join(''):'<p>Keine Anfragen vorhanden.</p>'}</section><section><h3>Terminakten <b>${customer.appointments.length}</b></h3>${customer.appointments.length?customer.appointments.map(item=>`<button data-appointment="${item.id}"><span><b>${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium'}).format(new Date(item.start))}</b><small>${item.style||'Tattoo-Termin'} · ${item.placement||'Studio'}</small></span><i>Akte öffnen ↗</i></button>`).join(''):'<p>Keine Termine vorhanden.</p>'}</section></div>`}
function renderCustomerContacts(encodedKey){const customer=customerRecords().get(decodeURIComponent(encodedKey));const hero=document.querySelector('.customer-hero');if(!customer||!hero)return;hero.insertAdjacentHTML('afterend',`<section class="customer-contact-cards"><article><span>E-MAIL</span><h3>${customer.email||'Nicht hinterlegt'}</h3><button class="secondary-action" data-email-contact="${encodedKey}" ${customer.email?'':'disabled'}>E-Mail senden</button></article><article><span>TELEFON</span><h3>${formatPhoneBlocks(customer.phone)}</h3><button class="secondary-action" data-call-contact="${encodedKey}" ${customer.phone?'':'disabled'}>Anrufen</button></article></section>`)}
function currentAdminView() {
  const path = location.pathname.replace(/\/+$/, '')
  if (path.endsWith('/anfragen')) return 'requests'
  if (path.endsWith('/referenzen')) return 'portfolio'
  if (path.includes('/einstellungen')) return 'settings'
  if (path.endsWith('/termin-neu')) return 'newAppointment'
  if (path.endsWith('/terminakten')) return 'appointmentFiles'
  if (path.endsWith('/kunden')) return 'customers'
  return 'dashboard'
}
function adminViewMarkup(view) { return view==='requests'?requestsView():view==='portfolio'?portfolioView():view==='settings'?settingsView():view==='newAppointment'?appointmentFormView():view==='appointmentFiles'?appointmentFilesView():view==='customers'?customersView():dashboardView() }
function adminMarkup() { const welcome=adminWelcome(); const view=currentAdminView(); return `<div class="admin-shell"><aside class="admin-side"><button class="mobile-nav-backdrop" data-mobile-nav-close aria-label="Menü schließen"></button><a class="brand" href="/"><span>TATTOO</span><i>·</i><span>SFUMATO</span></a><p>STUDIO OS</p><nav aria-label="Adminbereiche"><div class="mobile-nav-head"><span>STUDIO OS</span><b>Navigation</b><button data-mobile-nav-close aria-label="Menü schließen">×</button></div><a class="${view==='dashboard'?'active':''}" data-view="dashboard" href="/admin/"><span>⌂</span>Dashboard</a><a class="${view==='newAppointment'?'active':''}" data-view="newAppointment" href="/admin/termin-neu/"><span>＋</span>Neuer Termin</a><a class="${view==='appointmentFiles'?'active':''}" data-view="appointmentFiles" href="/admin/terminakten/"><span>01</span>Terminakten</a><a class="${view==='customers'?'active':''}" data-view="customers" href="/admin/kunden/"><span>02</span>Kunden</a><a class="${view==='requests'?'active':''}" data-view="requests" href="/admin/anfragen/"><span>03</span>Anfragen <b>${demoRequests.length}</b></a><a class="${view==='portfolio'?'active':''}" data-view="portfolio" href="/admin/referenzen/"><span>04</span>Referenzen</a><a class="${view==='settings'?'active':''}" data-view="settings" href="/admin/einstellungen/"><span>05</span>Einstellungen</a></nav><div class="admin-user"><div class="avatar">TS</div><span><b>Studio Sfumato</b><small>Administrator</small></span></div><a href="/" class="back">← Zur Website</a><div class="mobile-tabbar"><a class="${view==='dashboard'?'active':''}" href="/admin/"><span>⌂</span><small>Übersicht</small></a><a class="${view==='requests'?'active':''}" href="/admin/anfragen/"><span>◌</span><small>Anfragen</small><b>${demoRequests.length}</b></a><a class="${view==='newAppointment'?'active':''}" href="/admin/termin-neu/"><span>＋</span><small>Termin</small></a><button data-mobile-menu aria-expanded="false"><span>•••</span><small>Mehr</small></button></div></aside><main class="admin-main"><header><div><p>${welcome.date}</p><h1>${welcome.greeting}</h1></div><div class="header-actions"><button aria-label="Benachrichtigungen">●</button><div class="avatar">TS</div></div></header><section id="admin-content">${adminViewMarkup(view)}</section></main><div class="admin-modal" aria-hidden="true"></div></div>` }

const mergePortfolio=entries=>{let local=readLocalPortfolio();if(!entries.length&&!local.length){local=portfolio.map(item=>({...item}));saveLocalPortfolio(local)}const merged=[...entries,...local].filter((item,index,all)=>all.findIndex(entry=>entry.id===item.id)===index);if(merged.length)portfolio.splice(0,portfolio.length,...merged)}
const refreshPublicPortfolio=()=>{const gallery=document.querySelector('[data-home-references],[data-all-references]');if(!gallery)return;const entries=gallery.matches('[data-all-references]')?publishedPortfolio():homepagePortfolio();gallery.innerHTML=entries.map((item,index)=>publicReferenceCard(item,index).replace('class="work-card reveal"','class="work-card reveal visible"')).join('')}
const loadPortfolio=()=>fetch('/api/portfolio',{headers:{Accept:'application/json'}}).then(async response=>{const text=await response.text();if(!response.ok||!text)throw new Error();return JSON.parse(text)}).catch(()=>[]).then(entries=>{mergePortfolio(entries);return portfolio})
function initSite() {
  loadPortfolio().then(refreshPublicPortfolio)
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
  document.querySelector('.header-actions')?.insertAdjacentHTML('afterbegin','<a class="admin-logout" href="/admin/logout">Abmelden</a>')
  document.querySelector('.admin-side nav')?.insertAdjacentHTML('beforeend','<a class="admin-nav-logout" href="/admin/logout"><span>↪</span>Abmelden</a>')
  const adminSide=document.querySelector('.admin-side'),mobileMenu=document.querySelector('[data-mobile-menu]')
  const setMobileMenu=open=>{adminSide?.classList.toggle('mobile-nav-open',open);mobileMenu?.setAttribute('aria-expanded',String(open));document.body.classList.toggle('admin-nav-lock',open)}
  mobileMenu?.addEventListener('click',()=>setMobileMenu(!adminSide.classList.contains('mobile-nav-open')))
  adminSide?.querySelectorAll('[data-mobile-nav-close]').forEach(button=>button.addEventListener('click',()=>setMobileMenu(false)))
  loadPortfolio().then(()=>{if(currentAdminView()==='portfolio')content.innerHTML=portfolioView()})
  Promise.all([apiJson('/api/settings').catch(()=>JSON.parse(localStorage.getItem(SETTINGS_LOCAL_KEY)||'null')),apiJson('/api/users').catch(()=>JSON.parse(localStorage.getItem(USERS_LOCAL_KEY)||'[]'))]).then(([settings,users])=>{if(settings)studioSettings=settings;adminUsers=users||[];if(currentAdminView()==='settings')content.innerHTML=settingsView()})
  const normalizeSearch = value => value.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()
  const applyCustomerSearch = input => {
    const query=normalizeSearch(input.value)
    let visible=0
    content.querySelectorAll('.customer-list > [data-customer-search]').forEach(row=>{
      const matches=!query||normalizeSearch(decodeURIComponent(row.dataset.customerSearch)).includes(query)
      row.hidden=!matches
      if(matches)visible++
    })
    const total=content.querySelectorAll('.customer-list > [data-customer-search]').length
    const count=content.querySelector('[data-customer-filter-count]')
    if(count)count.textContent=query?`${visible} von ${total}`:`${total} Kunden`
    const empty=content.querySelector('.customer-filter-empty')
    if(empty)empty.hidden=visible!==0
  }
  const applyPortfolioFilters=()=>{const query=(content.querySelector('[data-portfolio-search]')?.value||'').toLocaleLowerCase('de'),status=content.querySelector('[data-portfolio-status]')?.value||'';let visible=0;content.querySelectorAll('[data-portfolio-card]').forEach(card=>{const show=(!query||decodeURIComponent(card.dataset.search).toLocaleLowerCase('de').includes(query))&&(!status||card.dataset.status===status);card.hidden=!show;if(show)visible++});const empty=content.querySelector('.portfolio-filter-empty');if(empty)empty.hidden=visible!==0}
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
    const customer = params.get('kunde')
    if (appointmentDay) content.querySelector(`[data-appointment="${CSS.escape(appointmentDay)}"]`)?.click()
    if (requestId) {
      const index = demoRequests.findIndex(request => request.id === requestId)
      content.querySelector(`[data-request="${index}"]`)?.click()
      const action = params.get('aktion')
      if (action) queueMicrotask(() => content.querySelector(action === 'rueckfrage' ? '[data-question]' : '[data-proposals]')?.click())
    }
    if (customer) content.querySelector(`[data-customer="${CSS.escape(customer)}"]`)?.click()
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
    const merged=[...entries,...readLocalAppointments()].filter((item,index,all)=>all.findIndex(entry=>entry.id===item.id)===index).map(item=>({...item,source:item.source==='google'?'studio':item.source}))
    appointments.splice(0, appointments.length, ...merged.sort((a,b)=>new Date(a.start)-new Date(b.start)))
    if (currentAdminView() === 'dashboard') content.innerHTML = dashboardView()
    else if (currentAdminView() === 'appointmentFiles') content.innerHTML = appointmentFilesView()
    else if (currentAdminView() === 'customers') content.innerHTML = customersView()
    openAdminDeepLink()
  }).catch(() => {
    appointments.splice(0, appointments.length, ...readLocalAppointments().map(item=>({...item,source:item.source==='google'?'studio':item.source})).sort((a,b)=>new Date(a.start)-new Date(b.start)))
    if (currentAdminView() === 'dashboard') content.innerHTML = dashboardView()
    else if (currentAdminView() === 'appointmentFiles') content.innerHTML = appointmentFilesView()
    else if (currentAdminView() === 'customers') content.innerHTML = customersView()
    openAdminDeepLink()
  })
  fetch('/api/customer-notes', { headers: { Accept: 'application/json' } }).then(async response => {
    const text=await response.text();if(!response.ok||!text)throw new Error()
    return JSON.parse(text)
  }).then(notes => {
    const merged=[...notes,...readLocalCustomerNotes()].filter((note,index,all)=>all.findIndex(item=>item.id===note.id)===index)
    customerNotes.splice(0,customerNotes.length,...merged)
    if(currentAdminView()==='customers')content.innerHTML=customersView()
    openAdminDeepLink()
  }).catch(()=>{
    customerNotes.splice(0,customerNotes.length,...readLocalCustomerNotes())
    if(currentAdminView()==='customers')content.innerHTML=customersView()
    openAdminDeepLink()
  })
  const openModal=html=>{modal.innerHTML=`<div class="modal-backdrop" data-close></div><section class="modal-sheet">${html}</section>`;modal.classList.add('open');modal.setAttribute('aria-hidden','false')}
  const closeModal=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');const url=new URL(location.href);url.searchParams.delete('aktion');history.replaceState(null,'',url)}
  const openQuestionModal=requestEntry=>{const firstName=requestEntry?.name?.split(/\s+/)[0]||'du',reference=requestReference(requestEntry);openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">${reference} · E-MAIL</span><h2>Rückfrage senden</h2><label>AN<input value="${requestEntry?.email||''}"></label><label>BETREFF<input value="${reference} · Rückfrage zu deiner Tattoo-Anfrage"></label><label>NACHRICHT<textarea rows="8">Hallo ${firstName},\n\nvielen Dank für deine Anfrage bei Tattoo Sfumato. Für die Planung habe ich noch eine kurze Rückfrage:\n\n</textarea></label><label class="modal-upload" data-message-upload-drop><input type="file" multiple data-message-upload>＋ Anhänge auswählen oder hierher ziehen</label><div class="message-file-list" data-message-file-list hidden></div><button class="save-settings modal-send" data-send-question>E-Mail senden →</button>`)}
  const localDateTime=value=>new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16)
  const generateAvailableSlots=(durationHours,after=new Date())=>{const calendar=studioSettings.calendar||{},rules=(calendar.rules||[]).filter(rule=>rule.enabled!==false),leadRule=rules.find(rule=>rule.type==='lead'),minimumDays=Math.max(1,Number(leadRule?.value)||1),blockedDays=new Set(rules.filter(rule=>rule.type==='weekday').map(rule=>Number(rule.value))),maxDuration=Number(rules.find(rule=>rule.type==='duration')?.value)||24,nameRules=rules.filter(rule=>rule.type==='appointmentName');if(durationHours>maxDuration)return[];const dateKey=date=>`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,nextRuleDay=(appointment,rule)=>{const target=new Date(appointment.start);target.setHours(0,0,0,0);do{target.setDate(target.getDate()+1)}while(rule.dayMode!=='calendar'&&(!calendar.hours?.[target.getDay()]?.enabled||blockedDays.has(target.getDay())));return target},effects=new Map();nameRules.forEach(rule=>appointments.filter(item=>String(rule.value||'').trim()&&`${item.title||''} ${item.name||''} ${item.clientName||''} ${item.style||''} ${item.notes||''}`.toLocaleLowerCase('de-DE').includes(String(rule.value).trim().toLocaleLowerCase('de-DE'))).forEach(item=>effects.set(dateKey(nextRuleDay(item,rule)),rule)));const slots=[],before=(Number(calendar.beforeMinutes)||0)*60000,afterBuffer=(Number(calendar.afterMinutes)||0)*60000;for(let offset=minimumDays;offset<120&&slots.length<3;offset++){const day=new Date(after);day.setDate(day.getDate()+offset);day.setHours(0,0,0,0);if(blockedDays.has(day.getDay()))continue;const hours=calendar.hours?.[day.getDay()],effect=effects.get(dateKey(day));if(effect?.action==='close'||(!hours?.enabled&&effect?.action!=='open'))continue;const opening=effect?.action==='open'&&effect.time?effect.time:(hours?.start||'10:00'),closing=hours?.end||'18:00',[startHour,startMinute]=opening.split(':').map(Number),[endHour,endMinute]=closing.split(':').map(Number),candidate=new Date(day);candidate.setHours(startHour,startMinute,0,0);const close=new Date(day);close.setHours(endHour,endMinute,0,0);const timeRules=rules.filter(rule=>rule.type==='time');while(candidate.getTime()+durationHours*3600000<=close.getTime()){const end=new Date(candidate.getTime()+durationHours*3600000),blockedByRule=timeRules.some(rule=>{const[valueHour,valueMinute]=String(rule.value).split(':').map(Number),limit=new Date(day);limit.setHours(valueHour||0,valueMinute||0,0,0);return rule.operator==='after'?candidate>=limit:rule.operator==='before'?candidate<limit:false}),conflict=appointments.some(item=>candidate.getTime()-before<new Date(item.end).getTime()+afterBuffer&&end.getTime()+afterBuffer>new Date(item.start).getTime()-before);if(!blockedByRule&&!conflict){slots.push(new Date(candidate));break}candidate.setMinutes(candidate.getMinutes()+30)}}return slots}
  const openSlotsModal=(baseStart,durationHours,customerKeyValue,mode='proposal')=>{const base=new Date(baseStart);const slots=[7,14,21].map(days=>new Date(base.getTime()+days*86400000)),activeRequest=demoRequests.find(item=>item.id===new URLSearchParams(location.search).get('anfrage'));const intro=mode==='reschedule'?'Hallo, leider müssen wir deinen bestehenden Termin verschieben. Hier sind drei neue Vorschläge:':'Hallo, hier sind drei mögliche Termine für dein Tattoo:';openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">${mode==='reschedule'?'TERMIN VERSCHIEBEN':'SMART SCHEDULING'}</span><h2>Drei neue Termine vorschlagen</h2><label>NACHRICHT<textarea rows="5">${intro}</textarea></label><label>ZEITRAUM PRO TERMIN<input type="number" min="0.5" step="0.5" value="${durationHours}" data-slot-duration> Stunden</label><div class="proposal-edit-list">${slots.map((slot,index)=>`<label>VORSCHLAG ${index+1}<input type="datetime-local" value="${localDateTime(slot)}" data-slot-start></label>`).join('')}</div><button class="other-slots" data-regenerate-slots>＋ Drei komplett neue Termine generieren</button><div class="modal-actions"><button data-close>Abbrechen</button><button class="save-settings" data-send-proposals data-request-id="${activeRequest?.id||''}" data-contact-key="${customerKeyValue}">Vorschläge per Nachricht senden →</button></div>`)}
  modal.addEventListener('click',e=>{
    const removeMessageFile=e.target.closest('[data-remove-message-file]')
    if(removeMessageFile){const input=modal.querySelector('[data-message-upload]');if(!input)return;const transfer=new DataTransfer();[...input.files].forEach((file,index)=>{if(index!==Number(removeMessageFile.dataset.removeMessageFile))transfer.items.add(file)});input.files=transfer.files;renderMessageAttachments(input);return}
    const trackedQuestion=e.target.closest('[data-send-question]')
    if(trackedQuestion){const requestEntry=demoRequests.find(item=>item.id===new URLSearchParams(location.search).get('anfrage')),inputs=modal.querySelectorAll('input'),subject=inputs[1]?.value||`${requestReference(requestEntry)} · Rückfrage`,message=modal.querySelector('textarea')?.value||'',files=[...(modal.querySelector('[data-message-upload]')?.files||[])],email={id:`MAIL-${Date.now().toString(36).toUpperCase()}`,direction:'outbound',subject,text:message,attachments:files.map(file=>({name:file.name,size:file.size,type:file.type})),createdAt:new Date().toISOString()};trackedQuestion.disabled=true;if(requestEntry)updateRequest(requestEntry,{emails:[...(requestEntry.emails||[]),email],timeline:[...(requestEntry.timeline||[]),{title:'Rückfrage gesendet',text:`${subject}${files.length?` · ${files.length} Anhänge`:''}`,createdAt:email.createdAt}],status:'In Klärung'}).then(()=>{if(files.length&&navigator.canShare?.({files}))navigator.share({title:subject,text:message,files}).catch(()=>{}).finally(()=>{closeModal();content.innerHTML=requestDetailView(requestEntry)});else{location.href=`mailto:${requestEntry.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;closeModal();content.innerHTML=requestDetailView(requestEntry)}});return}
    const sendQuestion=e.target.closest('[data-send-question]')
    if(sendQuestion){const input=modal.querySelector('[data-message-upload]'),files=[...(input?.files||[])];sendQuestion.disabled=true;sendQuestion.textContent='Wird vorbereitet …';const shareData={title:modal.querySelector('input')?.value||'Tattoo Sfumato',text:modal.querySelector('textarea')?.value||'',files};if(files.length&&navigator.canShare?.({files}))navigator.share(shareData).then(closeModal).catch(()=>{sendQuestion.disabled=false;sendQuestion.textContent='E-Mail senden →'});else{closeModal();content.insertAdjacentHTML('afterbegin',`<div class="response-banner"><div><span>RÜCKFRAGE VORBEREITET</span><b>${files.length?`${files.length} Anhang${files.length===1?'':'änge'} hinzugefügt`:'Ohne Anhänge'}</b><small>Die Nachricht wurde für den Versand vorbereitet.</small></div></div>`)}return}
    const prefixedContactMessage=e.target.closest('[data-contact-message]')
    if(prefixedContactMessage){const customer=customerRecords().get(decodeURIComponent(prefixedContactMessage.dataset.contactMessage)),activeRequest=demoRequests.find(item=>item.id===new URLSearchParams(location.search).get('anfrage'))||customer?.requests?.at(-1),subject=`${activeRequest?`${requestReference(activeRequest)} · `:''}Tattoo Sfumato · Deine Nachricht`;openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">KUNDENKONTAKT</span><h2>Nachricht senden</h2><label>AN<input value="${customer?.email||''}" readonly></label><label>BETREFF<input value="${subject}"></label><label>NACHRICHT<textarea rows="9">Hallo ${customer?.name?.split(' ')[0]||''},\n\n</textarea></label><a class="save-settings modal-send-link" href="mailto:${customer?.email||''}?subject=${encodeURIComponent(subject)}">Im Mailprogramm öffnen →</a>`);return}
    const contactMessage=e.target.closest('[data-contact-message]')
    if(contactMessage){const customer=customerRecords().get(decodeURIComponent(contactMessage.dataset.contactMessage));openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">KUNDENKONTAKT</span><h2>Nachricht senden</h2><label>AN<input value="${customer.email||''}" readonly></label><label>BETREFF<input value="Tattoo Sfumato · Dein Termin"></label><label>NACHRICHT<textarea rows="9">Hallo ${customer.name.split(' ')[0]},\n\n</textarea></label><a class="save-settings modal-send-link" href="mailto:${customer.email||''}?subject=${encodeURIComponent('Tattoo Sfumato · Dein Termin')}">Im Mailprogramm öffnen →</a>`);return}
    if(e.target.closest('[data-regenerate-slots]')){const inputs=[...modal.querySelectorAll('[data-slot-start]')],duration=Number(modal.querySelector('[data-slot-duration]')?.value)||4,last=new Date(inputs.at(-1)?.value||Date.now());generateAvailableSlots(duration,last).forEach((slot,index)=>{if(inputs[index])inputs[index].value=localDateTime(slot)});return}
    if(e.target.closest('[data-send-proposals]')){
      const button=e.target.closest('[data-send-proposals]'),requestEntry=demoRequests.find(item=>item.id===button.dataset.requestId),duration=Number(modal.querySelector('[data-slot-duration]')?.value)||4,slots=[...modal.querySelectorAll('[data-slot-start]')].map(input=>new Date(input.value).toISOString())
      if(requestEntry){const batch={id:`PROP-${Date.now().toString(36).toUpperCase()}`,sentAt:new Date().toISOString(),duration,slots};updateRequest(requestEntry,{estimatedHours:duration,proposals:[...(requestEntry.proposals||[]),batch],timeline:[...(requestEntry.timeline||[]),{title:'Terminvorschläge gesendet',text:`${slots.length} Vorschläge · ${duration} Std.`,createdAt:batch.sentAt}],status:'In Klärung'}).then(()=>{closeModal();content.innerHTML=requestDetailView(requestEntry)})}else closeModal()
    } else if(e.target.closest('[data-confirm-slot]')){
      e.target.closest('.response-banner').innerHTML=`<div><span class="positive">KUNDIN HAT ZUGESAGT</span><b>Do, 03. September · 12:30–16:30 Uhr</b><small>Der Termin ist reserviert und bereit zur Übernahme.</small></div><button class="save-settings" data-calendar-add>Termin buchen →</button>`
    } else if(e.target.closest('[data-calendar-add]')){
      e.target.textContent='✓ Im Kalender eingetragen';e.target.disabled=true
    } else if(e.target.closest('[data-close]')) closeModal()
  })
  const renderMessageAttachments=input=>{const list=modal.querySelector('[data-message-file-list]');if(!list)return;list.innerHTML=[...input.files].map((file,index)=>`<div><span><b>${file.name}</b><small>${(file.size/1024/1024).toLocaleString('de-DE',{maximumFractionDigits:1})} MB</small></span><button type="button" data-remove-message-file="${index}" aria-label="${file.name} entfernen">×</button></div>`).join('');list.hidden=!input.files.length}
  modal.addEventListener('change',e=>{if(e.target.matches('[data-message-upload]'))renderMessageAttachments(e.target);if(e.target.matches('[data-reference-form] input[name="image"]')&&e.target.files[0]){const url=URL.createObjectURL(e.target.files[0]),form=e.target.closest('form');let preview=form.querySelector('.reference-edit-preview');if(!preview){preview=document.createElement('div');preview.className='reference-edit-preview';e.target.closest('label').after(preview)}preview.innerHTML=`<img src="${url}" alt="Vorschau der neuen Referenz">`}})
  modal.addEventListener('dragover',e=>{const drop=e.target.closest('[data-message-upload-drop]');if(drop){e.preventDefault();drop.classList.add('is-dragging')}})
  modal.addEventListener('dragleave',e=>e.target.closest('[data-message-upload-drop]')?.classList.remove('is-dragging'))
  modal.addEventListener('drop',e=>{const drop=e.target.closest('[data-message-upload-drop]');if(!drop)return;e.preventDefault();drop.classList.remove('is-dragging');const input=drop.querySelector('[data-message-upload]'),transfer=new DataTransfer();[...input.files,...e.dataTransfer.files].slice(0,10).forEach(file=>transfer.items.add(file));input.files=transfer.files;renderMessageAttachments(input)})
  modal.addEventListener('submit', async e => {
    const form=e.target.closest('[data-appointment-form]')
    if(!form)return
    e.preventDefault()
    const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Wird gespeichert …'
    try{
      const payload=Object.fromEntries(new FormData(form))
      payload.start=new Date(payload.start).toISOString();payload.end=new Date(payload.end).toISOString()
      const result=await createAppointment(payload)
      appointments.push(result);appointments.sort((a,b)=>new Date(a.start)-new Date(b.start));if(payload.requestId){const requestEntry=demoRequests.find(item=>item.id===payload.requestId);if(requestEntry)await updateRequest(requestEntry,{bookedAppointmentId:result.id,status:'Bestätigt',timeline:[...(requestEntry.timeline||[]),{title:'Termin manuell gebucht',text:new Intl.DateTimeFormat('de-DE',{dateStyle:'full',timeStyle:'short'}).format(new Date(result.start)),createdAt:new Date().toISOString()}]});location.href=`/admin/terminakten/?termin=${encodeURIComponent(result.id)}`;return}closeModal();content.innerHTML=dashboardView()
    }catch(error){form.querySelector('.modal-form-error').textContent=error.message;submit.disabled=false;submit.textContent='Termin speichern →'}
  })
  modal.addEventListener('submit',async e=>{const form=e.target.closest('[data-reference-form]');if(!form)return;e.preventDefault();const submit=form.querySelector('[type="submit"]'),data=Object.fromEntries(new FormData(form)),id=form.dataset.referenceId;submit.disabled=true;submit.textContent='Wird gespeichert …';try{data.published=form.elements.published.checked;data.featured=form.elements.featured.checked;if(!id){const file=form.elements.image.files[0];if(!file)throw new Error('Bitte ein Bild auswählen.');data.image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});const entry=await portfolioRequest('POST','',data);portfolio.push(entry)}else{const entry=await portfolioRequest('PATCH',id,data),index=portfolio.findIndex(item=>item.id===id);if(index>=0)portfolio[index]={...portfolio[index],...entry}}closeModal();content.innerHTML=portfolioView()}catch(error){form.querySelector('.modal-form-error').textContent=error.message||'Referenz konnte nicht gespeichert werden.';submit.disabled=false;submit.textContent='Referenz speichern →'}})
  modal.addEventListener('submit',async e=>{const form=e.target.closest('[data-user-form]');if(!form)return;e.preventDefault();const data=Object.fromEntries(new FormData(form)),id=form.dataset.userId;data.active=form.elements.active.checked;const user=await userRequest(id?'PATCH':'POST',id,data);if(id)adminUsers=adminUsers.map(item=>item.id===id?user:item);else adminUsers.push(user);closeModal();content.innerHTML=settingsView()})
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
  content.addEventListener('submit', async e => {
    const form=e.target.closest('[data-customer-note-form]')
    if(!form)return
    e.preventDefault()
    const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Wird gespeichert …'
    try{
      const payload=Object.fromEntries(new FormData(form));payload.customerKey=decodeURIComponent(form.dataset.customerKey)
      const note=await createCustomerNote(payload);customerNotes.unshift(note)
      content.innerHTML=customerDetailView(form.dataset.customerKey);renderCustomerContacts(form.dataset.customerKey)
    }catch(error){form.querySelector('.modal-form-error').textContent='Notiz konnte nicht gespeichert werden.';submit.disabled=false;submit.textContent='Notiz speichern →'}
  })
  content.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-appointment-note-form]');if(!form)return;e.preventDefault()
    const submit=form.querySelector('[type="submit"]');submit.disabled=true
    try{const payload=Object.fromEntries(new FormData(form));payload.customerKey=`appointment:${form.dataset.appointmentId}`.toLowerCase();const note=await createCustomerNote(payload);customerNotes.unshift(note);content.innerHTML=realAppointmentView(form.dataset.appointmentId)}catch{form.querySelector('.modal-form-error').textContent='Notiz konnte nicht gespeichert werden.';submit.disabled=false}
  })
  content.addEventListener('submit',async e=>{const form=e.target.closest('[data-request-duration-form]');if(!form)return;e.preventDefault();const requestEntry=demoRequests.find(item=>item.id===form.dataset.requestId),hours=Number(form.elements.estimatedHours.value);if(!requestEntry)return;await updateRequest(requestEntry,{estimatedHours:hours});form.querySelector('button').textContent='Gespeichert ✓'})
  content.addEventListener('submit',async e=>{const form=e.target.closest('[data-request-timeline-form]');if(!form)return;e.preventDefault();const requestEntry=demoRequests.find(item=>item.id===form.dataset.requestId);if(!requestEntry)return;const data=Object.fromEntries(new FormData(form)),timeline=[...(requestEntry.timeline||[]),{id:`EVENT-${Date.now().toString(36).toUpperCase()}`,title:data.title,text:data.text,createdAt:new Date().toISOString()}];await updateRequest(requestEntry,{timeline});content.innerHTML=requestDetailView(requestEntry)})
  content.addEventListener('submit',async e=>{const form=e.target.closest('[data-integrations-form]');if(!form)return;e.preventDefault();const integrations=structuredClone(studioSettings.integrations||{});for(const [key,value] of new FormData(form)){const [group,field]=key.split('.');integrations[group]??={};integrations[group][field]=field==='port'?Number(value):value}form.querySelectorAll('input[type="checkbox"]').forEach(input=>{const[group,field]=input.name.split('.');integrations[group]??={};integrations[group][field]=input.checked});await saveStudioSettings({...studioSettings,integrations});form.querySelector('[type="submit"]').textContent='Gespeichert ✓'})
  content.addEventListener('submit',async e=>{const form=e.target.closest('[data-calendar-settings-form]');if(!form)return;e.preventDefault();const calendar={...studioSettings.calendar,beforeMinutes:Number(form.elements.beforeMinutes.value)||0,afterMinutes:Number(form.elements.afterMinutes.value)||0,hours:Array.from({length:7},(_,index)=>({enabled:form.querySelector(`[name="hours.${index}.enabled"]`).checked,start:form.querySelector(`[name="hours.${index}.start"]`).value,end:form.querySelector(`[name="hours.${index}.end"]`).value})),rules:[...form.querySelectorAll('[data-rule]')].map(row=>({type:row.querySelector('[name="rule-type"]').value,operator:row.querySelector('[name="rule-operator"]').value,value:row.querySelector('[name="rule-value"]').value,dayMode:row.querySelector('[name="rule-day-mode"]')?.value,action:row.querySelector('[name="rule-action"]')?.value,time:row.querySelector('[name="rule-time"]')?.value,label:row.querySelector('[name="rule-label"]').value,enabled:row.querySelector('[name="rule-enabled"]').checked}))};await saveStudioSettings({...studioSettings,calendar});form.querySelector('[type="submit"]').textContent='Gespeichert ✓'})
  content.addEventListener('change',e=>{const actionSelect=e.target.closest('[name="rule-action"]');if(actionSelect){const time=actionSelect.closest('[data-rule]').querySelector('[name="rule-time"]');if(time)time.disabled=actionSelect.value==='close';return}const typeSelect=e.target.closest('[data-rule-type]');if(!typeSelect)return;const row=typeSelect.closest('[data-rule]'),label=row.querySelector('[name="rule-label"]').value,enabled=row.querySelector('[name="rule-enabled"]').checked;row.outerHTML=ruleRow({type:typeSelect.value,label,enabled})})
  content.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-appointment-upload]');if(!form)return;e.preventDefault()
    const item=appointments.find(entry=>entry.id===form.dataset.appointmentUpload),files=[...form.elements.images.files],category=form.elements.category.value,submit=form.querySelector('[type="submit"]');if(!item||!files.length)return
    submit.disabled=true;submit.textContent='Bilder werden gespeichert …'
    try{const additions=await Promise.all(files.slice(0,10).map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,type:file.type,category,data:reader.result});reader.onerror=reject;reader.readAsDataURL(file)})));await updateAppointment(item,{attachments:[...(item.attachments||[]),...additions].slice(-30)});content.innerHTML=realAppointmentView(item.id)}catch{form.querySelector('.modal-form-error').textContent='Bilder konnten nicht gespeichert werden.';submit.disabled=false;submit.textContent='Bilder hochladen →'}
  })
  if (currentAdminView() === 'portfolio') initUploads()
  content.addEventListener('input',e=>{
    if(e.target.matches('[data-customer-search-input]'))applyCustomerSearch(e.target)
    if(e.target.matches('[data-portfolio-search]'))applyPortfolioFilters()
  })
  content.addEventListener('change',e=>{if(e.target.matches('[data-portfolio-status]'))applyPortfolioFilters()})
  content.addEventListener('click', async e => {
    const deleteAppointmentNote=e.target.closest('[data-delete-appointment-note]')
    if(deleteAppointmentNote){const note=customerNotes.find(item=>item.id===deleteAppointmentNote.dataset.deleteAppointmentNote);if(!note||!confirm('Diese Terminnotiz wirklich löschen?'))return;deleteAppointmentNote.disabled=true;deleteCustomerNote(note.id).then(deleted=>{if(!deleted){deleteAppointmentNote.disabled=false;alert('Notiz konnte nicht gelöscht werden.');return}const index=customerNotes.findIndex(item=>item.id===note.id);if(index>=0)customerNotes.splice(index,1);content.innerHTML=realAppointmentView(deleteAppointmentNote.dataset.appointmentId)});return}
    if(e.target.closest('[data-question]')){const requestEntry=demoRequests.find(item=>item.id===new URLSearchParams(location.search).get('anfrage'));if(requestEntry){const url=new URL(location.href);url.searchParams.set('aktion','rueckfrage');history.pushState(null,'',url);openQuestionModal(requestEntry)}return}
    if(e.target.closest('[data-add-rule]')){content.querySelector('[data-rule-list]').insertAdjacentHTML('beforeend',ruleRow());return}if(e.target.closest('[data-remove-rule]')){e.target.closest('[data-rule]').remove();return}if(e.target.closest('[data-copy-webcal]')){const input=e.target.closest('.webcal-card').querySelector('input');navigator.clipboard?.writeText(input.value);e.target.textContent='Kopiert ✓';return}
    const newUser=e.target.closest('[data-new-user]'),editUser=e.target.closest('[data-edit-user]')
    if(newUser||editUser){const user=editUser?adminUsers.find(item=>item.id===editUser.dataset.editUser):null;openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">BENUTZER</span><h2>${user?'Benutzer bearbeiten':'Benutzer anlegen'}</h2><form data-user-form ${user?`data-user-id="${user.id}"`:''}><label>NAME<input required name="name" value="${user?.name||''}"></label><label>BENUTZERNAME<input required name="username" value="${user?.username||''}" autocomplete="username"></label><label>E-MAIL<input required type="email" name="email" value="${user?.email||''}"></label><label>ROLLE<select name="role"><option ${user?.role==='Administrator'?'selected':''}>Administrator</option><option ${user?.role==='Studio'?'selected':''}>Studio</option><option ${user?.role==='Lesen'?'selected':''}>Lesen</option></select></label><label>PASSWORT<input ${user?'':'required'} minlength="8" type="password" name="password" autocomplete="new-password" placeholder="${user?'Leer lassen, um es beizubehalten':'Mindestens 8 Zeichen'}"></label><div class="reference-switches"><label><input type="checkbox" name="active" ${user?.active!==false?'checked':''}><span></span>Benutzer aktiv</label></div><p class="modal-form-error"></p><button class="save-settings modal-send" type="submit">Benutzer speichern →</button></form>`);return}
    const deleteUser=e.target.closest('[data-delete-user]');if(deleteUser){if(!confirm('Benutzer wirklich löschen?'))return;await userRequest('DELETE',deleteUser.dataset.deleteUser);adminUsers=adminUsers.filter(user=>user.id!==deleteUser.dataset.deleteUser);content.innerHTML=settingsView();return}
    const newReference=e.target.closest('[data-new-reference]'),editReference=e.target.closest('[data-edit-reference]')
    if(newReference||editReference){const item=editReference?portfolio.find(entry=>entry.id===editReference.dataset.editReference):null;openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">PORTFOLIO</span><h2>${item?'Referenz bearbeiten':'Neue Referenz'}</h2><form data-reference-form ${item?`data-reference-id="${item.id}"`:''}>${item?`<div class="reference-edit-preview"><img src="${item.image}" alt="${item.title}"></div>`:`<label class="modal-upload">BILD<input required type="file" name="image" accept="image/jpeg,image/png,image/webp">＋ Bild auswählen</label>`}<label>TITEL<input required name="title" value="${item?.title||''}" placeholder="Name der Arbeit"></label><div class="smtp-grid"><label>STIL<select name="style"><option ${item?.style==='Realistic'?'selected':''}>Realistic</option><option ${item?.style==='Microrealism'?'selected':''}>Microrealism</option><option ${item?.style==='Fineline'?'selected':''}>Fineline</option><option ${item?.style==='Andere Richtung'?'selected':''}>Andere Richtung</option></select></label><label>KÖRPERSTELLE<input name="placement" value="${item?.placement||''}" placeholder="z. B. Unterarm"></label></div><label>BILDAUSSCHNITT<select name="position"><option value="50% 50%">Mitte</option><option value="50% 30%" ${item?.position==='50% 30%'?'selected':''}>Oben</option><option value="50% 70%" ${item?.position==='50% 70%'?'selected':''}>Unten</option></select></label><label>BESCHREIBUNG<textarea name="description" rows="4">${item?.description||''}</textarea></label><div class="reference-switches"><label><input type="checkbox" name="published" ${item?.published||!item?'checked':''}><span></span>Auf Website veröffentlichen</label><label><input type="checkbox" name="featured" ${item?.featured?'checked':''}><span></span>Als Highlight markieren</label></div><p class="modal-form-error"></p><button class="save-settings modal-send" type="submit">Referenz speichern →</button></form>`);return}
    const deleteReference=e.target.closest('[data-delete-reference]')
    if(deleteReference){if(!confirm('Diese Referenz wirklich löschen?'))return;await portfolioRequest('DELETE',deleteReference.dataset.deleteReference);portfolio.splice(portfolio.findIndex(item=>item.id===deleteReference.dataset.deleteReference),1);content.innerHTML=portfolioView();return}
    const moveReference=e.target.closest('[data-portfolio-move]')
    if(moveReference){const ordered=portfolio.slice().sort((a,b)=>(a.order||0)-(b.order||0)),index=ordered.findIndex(item=>item.id===moveReference.dataset.portfolioId),target=index+(moveReference.dataset.portfolioMove==='up'?-1:1);if(target<0||target>=ordered.length)return;[ordered[index],ordered[target]]=[ordered[target],ordered[index]];await Promise.all(ordered.map((item,order)=>portfolioRequest('PATCH',item.id,{order}).then(()=>{item.order=order})));content.innerHTML=portfolioView();return}
    const deleteNoteButton=e.target.closest('[data-delete-customer-note]')
    if(deleteNoteButton){
      const note=customerNotes.find(item=>item.id===deleteNoteButton.dataset.deleteCustomerNote)
      if(!note||!confirm('Diese Notiz wirklich löschen?'))return
      deleteNoteButton.disabled=true
      deleteCustomerNote(note.id).then(deleted=>{
        if(!deleted){deleteNoteButton.disabled=false;alert('Notiz konnte nicht gelöscht werden.');return}
        const index=customerNotes.findIndex(item=>item.id===note.id)
        if(index>=0)customerNotes.splice(index,1)
        const key=encodeURIComponent(note.customerKey)
        content.innerHTML=customerDetailView(key)
        renderCustomerContacts(key)
      })
      return
    }
    if(e.target.closest('[data-reset-filters]')){
      content.querySelectorAll('[data-request-filter]').forEach(filter => { filter.value = '' })
      applyRequestFilters()
      return
    }
    const proposalBooking=e.target.closest('[data-book-proposal]')
    if(proposalBooking){const requestEntry=demoRequests.find(item=>item.id===proposalBooking.dataset.requestId);if(!requestEntry)return;const start=new Date(proposalBooking.dataset.bookProposal),duration=Math.max(.5,Number(requestEntry.estimatedHours)||4),result=await createAppointment({clientName:requestEntry.name,email:requestEntry.email,phone:requestEntry.phone,style:requestEntry.style,placement:requestEntry.placement,notes:requestEntry.idea,requestId:requestEntry.id,start:start.toISOString(),end:new Date(start.getTime()+duration*3600000).toISOString()});appointments.push(result);await updateRequest(requestEntry,{bookedAppointmentId:result.id,status:'Bestätigt',timeline:[...(requestEntry.timeline||[]),{title:'Termin gebucht',text:new Intl.DateTimeFormat('de-DE',{dateStyle:'full',timeStyle:'short'}).format(start),createdAt:new Date().toISOString()}]});location.href=`/admin/terminakten/?termin=${encodeURIComponent(result.id)}`;return}
    const manualBooking=e.target.closest('[data-manual-booking]')
    if(manualBooking){const requestEntry=demoRequests.find(item=>item.id===manualBooking.dataset.manualBooking);if(!requestEntry)return;const start=new Date();start.setDate(start.getDate()+7);start.setMinutes(0,0,0);const duration=Math.max(.5,Number(requestEntry.estimatedHours)||4),end=new Date(start.getTime()+duration*3600000);openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">${requestReference(requestEntry)} · TERMIN BUCHEN</span><h2>Termin manuell erstellen</h2><form data-appointment-form><input type="hidden" name="requestId" value="${requestEntry.id}"><label>NAME<input required name="clientName" value="${requestEntry.name}"></label><div class="smtp-grid"><label>BEGINN<input required type="datetime-local" name="start" value="${localDateTime(start)}"></label><label>ENDE<input required type="datetime-local" name="end" value="${localDateTime(end)}"></label><label>STIL<input name="style" value="${requestEntry.style||''}"></label><label>KÖRPERSTELLE<input name="placement" value="${requestEntry.placement||''}"></label></div><input type="hidden" name="email" value="${requestEntry.email||''}"><input type="hidden" name="phone" value="${requestEntry.phone||''}"><label>NOTIZ<textarea name="notes" rows="5">${requestEntry.idea||''}</textarea></label><p class="modal-form-error"></p><button class="save-settings modal-send" type="submit">Termin erstellen und buchen →</button></form>`);return}
    if(e.target.closest('[data-new-appointment]')){
      const date=new Date();date.setMinutes(Math.ceil(date.getMinutes()/30)*30,0,0);const end=new Date(date.getTime()+3*3600000)
      const localValue=value=>new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16)
      openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">STUDIO-KALENDER</span><h2>Termin anlegen</h2><form data-appointment-form><label>NAME<input required name="clientName" placeholder="Vor- und Nachname"></label><div class="smtp-grid"><label>BEGINN<input required type="datetime-local" name="start" value="${localValue(date)}"></label><label>ENDE<input required type="datetime-local" name="end" value="${localValue(end)}"></label><label>STIL<input name="style" placeholder="z. B. Fineline"></label><label>KÖRPERSTELLE<input name="placement" placeholder="z. B. Unterarm"></label></div><label>NOTIZ<textarea name="notes" rows="5" placeholder="Vorbereitung, Motiv, Besonderheiten …"></textarea></label><p class="modal-form-error" role="alert"></p><button class="save-settings modal-send" type="submit">Termin speichern →</button></form>`)
      return
    }
    const reschedule=e.target.closest('[data-reschedule-appointment]')
    if(reschedule){const item=appointments.find(entry=>entry.id===reschedule.dataset.rescheduleAppointment);if(item){const duration=Math.max(.5,(new Date(item.end)-new Date(item.start))/3600000);openSlotsModal(item.start,duration,encodeURIComponent(customerKey(item)),'reschedule');generateAvailableSlots(duration,new Date(item.start)).forEach((slot,index)=>{const input=modal.querySelectorAll('[data-slot-start]')[index];if(input)input.value=localDateTime(slot)});const requestEntry=demoRequests.find(entry=>entry.id===item.requestId)||demoRequests.find(entry=>customerKey(entry)===customerKey(item));modal.querySelector('h2')?.insertAdjacentHTML('afterend',`<label>BETREFF<input value="${requestEntry?`${requestReference(requestEntry)} · `:''}Terminverschiebung"></label>`)}return}
    if(e.target.closest('[data-proposals]')){const params=new URLSearchParams(location.search),request=demoRequests.find(item=>item.id===params.get('anfrage'));const duration=Math.max(.5,Number.parseFloat(request?.duration||request?.estimatedHours||4)||4);openSlotsModal(new Date(),duration,encodeURIComponent(customerKey(request||{})),'proposal');generateAvailableSlots(duration).forEach((slot,index)=>{const input=modal.querySelectorAll('[data-slot-start]')[index];if(input)input.value=localDateTime(slot)});modal.querySelector('h2')?.insertAdjacentHTML('afterend',`<label>BETREFF<input value="${requestReference(request)} · Terminvorschläge"></label>`);return}
    const appointmentContact=e.target.closest('[data-call-contact][data-appointment-message]')
    if(appointmentContact){const customer=customerRecords().get(decodeURIComponent(appointmentContact.dataset.callContact)),phone=normalizePhone(customer.phone),phoneDisplay=formatPhoneBlocks(phone),phoneFontSize=Math.max(18,Math.min(34,Math.floor(520/phoneDisplay.length)));openModal(`<button class="modal-close" data-close>×</button><div class="call-dialog-head"><span class="admin-kicker">KUNDENKONTAKT</span><h2>${customer.name}</h2><p>Anrufen oder direkt eine Nachricht vorbereiten.</p></div><div class="call-modal"><div class="call-primary"><span>TELEFONNUMMER</span><strong style="font-size:${phoneFontSize}px">${phoneDisplay}</strong><a href="tel:${phone}"><span>Jetzt anrufen</span><b>→</b></a><button class="contact-message-button" data-contact-message="${appointmentContact.dataset.callContact}">Nachricht senden →</button></div><div class="call-qr-card"><span>SCAN TO CALL</span><div class="call-qr-code"></div><small>Mit dem Handy scannen und anrufen.</small></div></div>`);if(phone)QRCode.toDataURL(`tel:${phone}`,{width:320,margin:1}).then(url=>{const target=modal.querySelector('.call-qr-code');if(target)target.innerHTML=`<img src="${url}" alt="QR-Code zum Anrufen">`});return}
    const prefixedEmailContact=e.target.closest('[data-email-contact]')
    if(prefixedEmailContact){const customer=customerRecords().get(decodeURIComponent(prefixedEmailContact.dataset.emailContact)),requestEntry=customer?.requests?.at(-1),subject=`${requestEntry?`${requestReference(requestEntry)} · `:''}Tattoo Sfumato · Deine Anfrage`;openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">KUNDENKONTAKT</span><h2>E-Mail senden</h2><label>AN<input value="${customer?.email||''}" readonly></label><label>BETREFF<input value="${subject}"></label><label>NACHRICHT<textarea rows="9">Hallo ${customer?.name?.split(' ')[0]||''},\n\n</textarea></label><a class="save-settings modal-send-link" href="mailto:${customer?.email||''}?subject=${encodeURIComponent(subject)}">Im Mailprogramm öffnen →</a>`);return}
    const emailContact=e.target.closest('[data-email-contact]')
    if(emailContact){const customer=customerRecords().get(decodeURIComponent(emailContact.dataset.emailContact));openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">KUNDENKONTAKT</span><h2>E-Mail senden</h2><label>AN<input value="${customer.email}" readonly></label><label>BETREFF<input value="Tattoo Sfumato · Deine Anfrage"></label><label>NACHRICHT<textarea rows="9">Hallo ${customer.name.split(' ')[0]},\n\n</textarea></label><a class="save-settings modal-send-link" href="mailto:${customer.email}?subject=${encodeURIComponent('Tattoo Sfumato · Deine Anfrage')}">Im Mailprogramm öffnen →</a>`);return}
    const callContact=e.target.closest('[data-call-contact]')
    if(callContact){const customer=customerRecords().get(decodeURIComponent(callContact.dataset.callContact));const phone=normalizePhone(customer.phone);if(matchMedia('(max-width: 767px) and (pointer: coarse)').matches){location.href=`tel:${phone}`;return}const phoneDisplay=formatPhoneBlocks(phone);const phoneFontSize=Math.max(18,Math.min(34,Math.floor(520/phoneDisplay.length)));openModal(`<button class="modal-close" data-close>×</button><div class="call-dialog-head"><span class="admin-kicker">KUNDENKONTAKT</span><h2>${customer.name}</h2><p>Direkt anrufen oder den QR-Code mit dem Smartphone scannen.</p></div><div class="call-modal"><div class="call-primary"><div class="call-icon"><svg viewBox="0 0 24 24"><path d="M7 3h3l1.5 5-2 1.5a15 15 0 0 0 5 5L16 12.5l5 1.5v3c0 2.2-1.8 4-4 4A14 14 0 0 1 3 7c0-2.2 1.8-4 4-4Z"/></svg></div><span>TELEFONNUMMER</span><strong style="font-size:${phoneFontSize}px">${phoneDisplay}</strong><a href="tel:${phone}"><span>Jetzt anrufen</span><b>→</b></a></div><div class="call-qr-card"><span>SCAN TO CALL</span><div class="call-qr-code"><div class="qr-loading">QR-Code wird erstellt …</div></div><small>Kamera öffnen, scannen<br>und direkt anrufen.</small></div></div>`);QRCode.toDataURL(`tel:${phone}`,{width:320,margin:1,color:{dark:'#11110f',light:'#ffffff'}}).then(url=>{const target=modal.querySelector('.call-qr-code');if(target)target.innerHTML=`<img src="${url}" alt="QR-Code zum Anrufen von ${phoneDisplay}">`});return}
    const customerButton=e.target.closest('[data-customer]')
    if(customerButton){const url=new URL('/admin/kunden/',location.origin);url.searchParams.set('kunde',customerButton.dataset.customer);if(location.href!==url.href)history.pushState(null,'',url);content.innerHTML=customerDetailView(customerButton.dataset.customer);renderCustomerContacts(customerButton.dataset.customer);return}
    if(e.target.closest('[data-back-customers]')){history.pushState(null,'','/admin/kunden/');content.innerHTML=customersView();return}
    if(e.target.closest('[data-calendar-prev]')){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);content.innerHTML=dashboardView();return}
    if(e.target.closest('[data-calendar-next]')){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);content.innerHTML=dashboardView();return}
    const appointment=e.target.closest('[data-appointment]')
    if(appointment){const url=new URL('/admin/terminakten/',location.origin);url.searchParams.set('termin',appointment.dataset.appointment);if(location.href!==url.href)history.pushState(null,'',url);content.innerHTML=realAppointmentView(appointment.dataset.appointment);return}
    if(e.target.closest('[data-back-dashboard]')){history.pushState(null,'','/admin/terminakten/');content.innerHTML=appointmentFilesView();return}
    if(e.target.closest('[data-confirm-slot]')){
      e.target.closest('.response-banner').innerHTML=`<div><span class="positive">KUNDIN HAT ZUGESAGT</span><b>Do, 03. September · 12:30–16:30 Uhr</b><small>Der Termin ist reserviert und bereit zur Übernahme.</small></div><button class="save-settings" data-calendar-add>Termin buchen →</button>`;return
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
      content.innerHTML=requestDetailView(r)
      content.querySelector('.detail-back').onclick=()=>{history.pushState(null,'','/admin/anfragen/');sortRequests(demoRequests);content.innerHTML=requestsView()}
    }
    if(e.target.closest('[data-question]')) { const currentRequest=demoRequests.find(request=>request.id===new URLSearchParams(location.search).get('anfrage'));const customerName=currentRequest?.name||'';const firstName=customerName.split(/\s+/)[0]||'du';const url=new URL(location.href);url.searchParams.set('aktion','rueckfrage');if(location.href!==url.href)history.pushState(null,'',url);openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">E-MAIL</span><h2>Rückfrage senden</h2><label>AN<input value="${currentRequest?.email||''}"></label><label>BETREFF<input value="Rückfrage zu deiner Tattoo-Anfrage"></label><label>NACHRICHT<textarea rows="8">Hallo ${firstName},\n\nvielen Dank für deine Anfrage bei Tattoo Sfumato. Für die Planung habe ich noch eine kurze Rückfrage:\n\n</textarea></label><label class="modal-upload" data-message-upload-drop><input type="file" multiple data-message-upload>＋ Anhänge auswählen oder hierher ziehen</label><div class="message-file-list" data-message-file-list hidden></div><button class="save-settings modal-send" data-send-question>E-Mail senden →</button>`)}
    if(e.target.closest('[data-proposals]')) { const url=new URL(location.href);url.searchParams.set('aktion','termine');if(location.href!==url.href)history.pushState(null,'',url);openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">SMART SCHEDULING</span><h2>Drei freie Termine</h2><p class="modal-lead">Berechnet aus Zeitaufwand, Öffnungszeiten, Vor- und Nachlauf sowie den globalen Terminregeln.</p><div class="proposal-list"><label><input type="checkbox" checked><span><b>Do, 03. September</b><small>12:30–16:30 Uhr · 4 Std.</small></span><i>FREI</i></label><label><input type="checkbox" checked><span><b>Fr, 04. September</b><small>10:00–14:00 Uhr · 4 Std.</small></span><i>FREI</i></label><label><input type="checkbox" checked><span><b>Mi, 09. September</b><small>13:00–17:00 Uhr · 4 Std.</small></span><i>FREI</i></label></div><button class="other-slots">＋ Drei andere Termine wählen</button><div class="modal-actions"><button data-close>Abbrechen</button><button class="save-settings" data-send-proposals>Vorschläge per Mail senden →</button></div>`)}
    if(e.target.closest('[data-smtp]')) { const url=new URL(location.href);url.searchParams.set('aktion','smtp');if(location.href!==url.href)history.pushState(null,'',url);openModal(`<button class="modal-close" data-close>×</button><span class="admin-kicker">INTEGRATION</span><h2>SMTP konfigurieren</h2><div class="smtp-grid"><label>SERVER<input placeholder="smtp.provider.de"></label><label>PORT<input value="587"></label><label>BENUTZERNAME<input placeholder="studio@domain.de"></label><label>VERSCHLÜSSELUNG<select><option>STARTTLS</option><option>SSL/TLS</option></select></label><label class="full">PASSWORT<input type="password" value="••••••••••••"></label></div><div class="modal-actions"><button>Verbindung testen</button><button class="save-settings" data-close>Speichern</button></div>`)}
  })
  content.addEventListener('change',e=>{
    if(e.target.closest('[data-request-filter]')) applyRequestFilters()
    if(e.target.closest('.asset-upload'))[...e.target.files].forEach(file=>{const url=URL.createObjectURL(file);content.querySelector('.asset-placeholder')?.insertAdjacentHTML('beforebegin',`<article><img src="${url}"><span><b>Zugewiesenes Bild</b><small>${file.name}</small></span><i>NEU</i></article>`)})
  })
  content.addEventListener('dragover',e=>{const drop=e.target.closest('.appointment-upload-drop');if(drop){e.preventDefault();drop.classList.add('is-dragging')}})
  content.addEventListener('dragleave',e=>e.target.closest('.appointment-upload-drop')?.classList.remove('is-dragging'))
  content.addEventListener('drop',e=>{const drop=e.target.closest('.appointment-upload-drop');if(!drop)return;e.preventDefault();drop.classList.remove('is-dragging');const input=drop.querySelector('input[type="file"]');if(input&&e.dataTransfer.files.length){input.files=e.dataTransfer.files;drop.firstChild.textContent=` ${e.dataTransfer.files.length} Bild${e.dataTransfer.files.length===1?'':'er'} ausgewählt `}})
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

function adminLoginFallbackMarkup(){return `<main class="password-gate"><section class="password-panel" aria-labelledby="admin-login-title"><a class="password-brand" href="/">TATTOO <i>·</i> SFUMATO</a><div class="password-copy"><p class="password-kicker">STUDIO OS</p><h1 id="admin-login-title">Admin<br><em>Login.</em></h1><p>Melde dich mit deinem persönlichen Studio-Konto an.</p></div><form class="password-form" method="post" action="/admin/login"><label for="admin-username">BENUTZERNAME ODER E-MAIL</label><div class="password-field"><input id="admin-username" name="username" autocomplete="username" required autofocus></div><label for="admin-password" class="admin-password-label">PASSWORT</label><div class="password-field"><input id="admin-password" name="password" type="password" autocomplete="current-password" required></div><button class="password-submit" type="submit">Anmelden <span>→</span></button></form><p class="password-footer">TATTOO SFUMATO · STUDIO OS</p></section></main>`}

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

function initLightbox(){
  if(document.querySelector('.system-lightbox'))return
  const lightbox=document.createElement('div');lightbox.className='system-lightbox';lightbox.setAttribute('aria-hidden','true');lightbox.innerHTML=`<div class="lightbox-backdrop" data-lightbox-close></div><div class="lightbox-stage" role="dialog" aria-modal="true" aria-label="Bildansicht"><header><span data-lightbox-count></span><button data-lightbox-close aria-label="Lightbox schließen">×</button></header><button class="lightbox-nav prev" data-lightbox-prev aria-label="Vorheriges Bild">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="lightbox-nav next" data-lightbox-next aria-label="Nächstes Bild">›</button></div>`;document.body.append(lightbox)
  let images=[],index=0,touchStart=0
  const eligible=image=>image instanceof HTMLImageElement&&!image.closest('[data-protected-signature],.call-qr-code')&&!image.dataset.noLightbox&&image.src
  const update=()=>{const source=images[index],target=lightbox.querySelector('figure img'),caption=source.alt||source.closest('a,article')?.querySelector('small,b,h3')?.textContent||'Bild';target.src=source.currentSrc||source.src;target.alt=caption;lightbox.querySelector('figcaption').textContent=caption;lightbox.querySelector('[data-lightbox-count]').textContent=`${index+1} / ${images.length}`;lightbox.classList.toggle('single',images.length<2)}
  const close=()=>{lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');document.documentElement.classList.remove('lightbox-open')}
  const move=direction=>{index=(index+direction+images.length)%images.length;update()}
  document.addEventListener('click',event=>{const image=event.target.closest('img');if(!eligible(image))return;event.preventDefault();event.stopPropagation();const group=image.closest('.gallery,.request-references,.admin-gallery,.assigned-assets,.reference-previews,.upload-previews')||document;images=[...group.querySelectorAll('img')].filter(eligible);index=Math.max(0,images.indexOf(image));update();lightbox.classList.add('open');lightbox.setAttribute('aria-hidden','false');document.documentElement.classList.add('lightbox-open');lightbox.querySelector('[data-lightbox-close]').focus()})
  lightbox.addEventListener('click',event=>{if(event.target.closest('[data-lightbox-close]'))close();else if(event.target.closest('[data-lightbox-prev]'))move(-1);else if(event.target.closest('[data-lightbox-next]'))move(1)})
  lightbox.addEventListener('touchstart',event=>{touchStart=event.touches[0].clientX},{passive:true});lightbox.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchStart;if(Math.abs(distance)>55)move(distance>0?-1:1)},{passive:true})
  document.addEventListener('keydown',event=>{if(!lightbox.classList.contains('open'))return;if(event.key==='Escape')close();if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1)})
}

async function render(){
  const cleanPath=location.pathname.replace(/\/+$/, ''),adminLogin=cleanPath==='/admin/login',admin=cleanPath.startsWith('/admin')&&!adminLogin
  const referencesPage=location.pathname.replace(/\/+$/, '')==='/referenzen'
  if(adminLogin){document.querySelector('#app').innerHTML=adminLoginFallbackMarkup();return}
  if(admin){
    document.querySelector('#app').innerHTML='<main class="admin-auth-check"><span>TATTOO · SFUMATO</span><i></i><p>Admin-Session wird geprüft …</p></main>'
    try{const response=await fetch('/api/auth/me',{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'}),type=response.headers.get('content-type')||'',user=type.includes('application/json')?await response.json():null;if(!response.ok||!user?.id){location.replace('/admin/login');return}}
    catch{location.replace('/admin/login');return}
  }
  const serverAccess = document.cookie.split(';').some(cookie => cookie.trim() === 'sfumato_site_client=1')
  if (!admin && !serverAccess && sessionStorage.getItem(ACCESS_KEY) !== 'true') {
    document.querySelector('#app').innerHTML = passwordMarkup()
    initPasswordGate()
    return
  }
  document.querySelector('#app').innerHTML=admin?adminMarkup():referencesPage?allReferencesMarkup():siteMarkup(); admin?initAdmin():initSite();initLightbox();window.scrollTo(0,0)
}
window.addEventListener('hashchange', () => {
  const target = location.hash && document.querySelector(location.hash)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
window.addEventListener('popstate', () => {
  if (location.pathname.replace(/\/+$/, '').startsWith('/admin')) render()
})
render()
