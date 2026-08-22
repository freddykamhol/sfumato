import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { connect as connectTls } from 'node:tls'
import { extname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.PORT) || 3000
const serverVersion = '2026-08-22.2'
const applicationSecret = process.env.ADMIN_SESSION_SECRET || process.env.DEMO_PASSWORD || 'Sfumato2026'
const dataDirectory = join(root, 'data')
const requestsFile = join(dataDirectory, 'requests.json')
const appointmentsFile = join(dataDirectory, 'appointments.json')
const customerNotesFile = join(dataDirectory, 'customer-notes.json')
const portfolioFile = join(dataDirectory, 'portfolio.json')
const settingsFile = join(dataDirectory, 'settings.json')
const usersFile = join(dataDirectory, 'users.json')
const adminCookieName = 'sfumato_admin_auth'
const adminSecret = createHmac('sha256', applicationSecret).update('sfumato-admin-session').digest('hex')
const uploadsDirectory = join(dataDirectory, 'uploads')

const readRequests = async () => {
  try { return JSON.parse(await readFile(requestsFile, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}
const saveRequests = async requests => {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(requestsFile, JSON.stringify(requests, null, 2), 'utf8')
}
const readAppointments = async () => {
  try { return JSON.parse(await readFile(appointmentsFile, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}
const saveAppointments = async appointments => {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(appointmentsFile, JSON.stringify(appointments, null, 2), 'utf8')
}
const readCustomerNotes = async () => {
  try { return JSON.parse(await readFile(customerNotesFile, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}
const saveCustomerNotes = async notes => {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(customerNotesFile, JSON.stringify(notes, null, 2), 'utf8')
}
const readPortfolio = async () => { try { return JSON.parse(await readFile(portfolioFile,'utf8')) } catch(error){if(error.code==='ENOENT')return[];throw error} }
const savePortfolio = async entries => { await mkdir(dataDirectory,{recursive:true});await writeFile(portfolioFile,JSON.stringify(entries,null,2),'utf8') }
const defaultSettings={integrations:{pop3:{host:'',port:995,tls:true,user:'',password:'',enabled:false},smtp:{host:'',port:587,secure:false,user:'',password:'',from:''},telegram:{token:'',chatId:'',enabled:false}},calendar:{webcalToken:'',beforeMinutes:30,afterMinutes:30,hours:[{enabled:false,start:'10:00',end:'18:00'},{enabled:true,start:'10:00',end:'18:00'},{enabled:true,start:'10:00',end:'18:00'},{enabled:true,start:'10:00',end:'18:00'},{enabled:true,start:'10:00',end:'18:00'},{enabled:false,start:'10:00',end:'18:00'},{enabled:false,start:'10:00',end:'18:00'}],rules:[]}}
const readSettings=async()=>{try{return {...defaultSettings,...JSON.parse(await readFile(settingsFile,'utf8'))}}catch(error){if(error.code==='ENOENT')return structuredClone(defaultSettings);throw error}}
const saveSettings=async settings=>{await mkdir(dataDirectory,{recursive:true});await writeFile(settingsFile,JSON.stringify(settings,null,2),'utf8')}
const readUsers=async()=>{try{return JSON.parse(await readFile(usersFile,'utf8'))}catch(error){if(error.code==='ENOENT')return[];throw error}}
const saveUsers=async users=>{await mkdir(dataDirectory,{recursive:true});await writeFile(usersFile,JSON.stringify(users,null,2),'utf8')}
const hashPassword=password=>{const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${scryptSync(String(password),salt,64).toString('hex')}`}
const verifyPassword=(password,stored='')=>{if(!stored.startsWith('scrypt:'))return false;const[,salt,expected]=stored.split(':'),actual=scryptSync(String(password),salt,64),expectedBuffer=Buffer.from(expected,'hex');return actual.length===expectedBuffer.length&&timingSafeEqual(actual,expectedBuffer)}
const ensureDefaultAdmin=async()=>{const users=await readUsers(),settings=await readSettings();let changed=false;for(const user of users){if(user.password&&!user.password.startsWith('scrypt:')){user.password=hashPassword(user.password);changed=true}if(!user.username){user.username=user.email?.split('@')[0]||user.name?.toLowerCase().replace(/\s+/g,'.');changed=true}}settings.auth={...(settings.auth||{})};if(settings.auth.adminBootstrapVersion!==2&&!settings.auth.defaultAdminRemoved){let initialAdmin=users.find(user=>user.id==='USR-ADMIN');if(!initialAdmin){initialAdmin={id:'USR-ADMIN',createdAt:new Date().toISOString()};users.push(initialAdmin)}Object.assign(initialAdmin,{username:'admin',name:'Administrator',email:'admin@local',role:'Administrator',active:true,password:hashPassword('admin123'),initial:true});settings.auth.adminBootstrapVersion=2;await saveSettings(settings);changed=true}if(changed)await saveUsers(users)}
const createAdminToken=user=>{const payload=Buffer.from(JSON.stringify({id:user.id,exp:Date.now()+12*3600000})).toString('base64url'),signature=createHmac('sha256',adminSecret).update(payload).digest('base64url');return `${payload}.${signature}`}
const adminUserFromRequest=async request=>{try{const token=request.headers.cookie?.split(';').map(value=>value.trim()).find(value=>value.startsWith(`${adminCookieName}=`))?.slice(adminCookieName.length+1)||'', [payload,signature]=token.split('.'),expected=createHmac('sha256',adminSecret).update(payload).digest('base64url');if(!signature||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(payload,'base64url').toString());if(data.exp<Date.now())return null;return(await readUsers()).find(user=>user.id===data.id&&user.active)||null}catch{return null}}
const notifyTelegram=async(text)=>{try{const settings=await readSettings(),config=settings.integrations?.telegram;if(!config?.enabled||!config.token||!config.chatId)return;await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:config.chatId,text})})}catch(error){console.error('[telegram]',error.message)}}
const cleanText = (value, max = 1000) => String(value || '').replace(/[<>]/g, '').trim().slice(0, max)
const sendJson = (response, status, payload) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}
const pop3Command=(socket,command,multiline=false)=>new Promise((resolve,reject)=>{let buffer='';const onData=chunk=>{buffer+=chunk.toString('utf8');const complete=multiline?buffer.includes('\r\n.\r\n'):buffer.includes('\r\n');if(!complete)return;socket.off('data',onData);if(!buffer.startsWith('+OK'))reject(new Error(buffer.split('\r\n')[0]));else resolve(buffer)};socket.on('data',onData);socket.once('error',reject);socket.write(`${command}\r\n`)})
let pop3Scanning=false
const scanPop3Inbox=async()=>{if(pop3Scanning)return;pop3Scanning=true;let socket;try{const settings=await readSettings(),config=settings.integrations?.pop3;if(!config?.enabled||!config.host||!config.user||!config.password)return;socket=connectTls({host:config.host,port:Number(config.port)||995,servername:config.host,rejectUnauthorized:true});await new Promise((resolve,reject)=>{socket.once('secureConnect',resolve);socket.once('error',reject)});await pop3Command(socket,`USER ${config.user}`);await pop3Command(socket,`PASS ${config.password}`);const uidResponse=await pop3Command(socket,'UIDL',true),lines=uidResponse.split('\r\n').slice(1,-2),processed=new Set(config.processedUids||[]),requests=await readRequests();for(const line of lines.slice(-100)){const[number,uid]=line.split(/\s+/);if(!number||!uid||processed.has(uid))continue;const raw=await pop3Command(socket,`RETR ${number}`,true),reference=raw.match(/#([A-Z0-9]{5,8})\b/i),entry=reference&&requests.find(item=>String(item.reference||item.id).replace(/[^a-z0-9]/gi,'').toLowerCase().endsWith(reference[1].toLowerCase()));if(entry){const subject=raw.match(/^Subject:\s*(.+)$/im)?.[1]?.trim()||'E-Mail-Antwort',from=raw.match(/^From:\s*(.+)$/im)?.[1]?.trim()||config.user;entry.emails=Array.isArray(entry.emails)?entry.emails:[];entry.emails.push({id:`MAIL-${Date.now().toString(36).toUpperCase()}`,direction:'inbound',from:cleanText(from,180),subject:cleanText(subject,300),text:cleanText(raw.split('\r\n\r\n').slice(1).join('\n'),10000),createdAt:new Date().toISOString()})}processed.add(uid)}await saveRequests(requests);settings.integrations.pop3.processedUids=[...processed].slice(-5000);settings.integrations.pop3.lastScanAt=new Date().toISOString();await saveSettings(settings);await pop3Command(socket,'QUIT')}catch(error){console.error('[pop3]',error.message)}finally{socket?.destroy();pop3Scanning=false}}

const adminLoginPage=error=>`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Studio OS · Anmeldung</title><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 75% 20%,#782a2440,transparent 35%),#0d0e0c;color:#f3efe7;font-family:Arial,sans-serif}.login{width:min(440px,100%);padding:42px;border:1px solid #34342f;border-radius:12px;background:#121310;box-shadow:0 35px 100px #0008}.brand{font-size:11px;font-weight:700;letter-spacing:.2em}.brand i{color:#a93d34;font-style:normal}.kicker{margin-top:70px;color:#88887f;font-size:8px;letter-spacing:.22em}h1{margin:12px 0 8px;font:400 42px Georgia,serif}p{margin:0 0 32px;color:#8f8e87;font-size:12px;line-height:1.6}label{display:block;margin:18px 0 7px;color:#aaa9a1;font-size:8px;font-weight:700;letter-spacing:.16em}input{width:100%;height:48px;padding:0 13px;border:1px solid #3b3c36;border-radius:6px;outline:0;background:#191a17;color:#fff;font-size:16px}input:focus{border-color:#a93d34}.error{margin-top:12px;color:#e47b72;font-size:11px}button{width:100%;height:50px;margin-top:24px;border:0;border-radius:6px;background:#f0ece4;color:#11120f;font-size:9px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}@media(max-width:520px){body{padding:0}.login{min-height:100dvh;padding:30px 22px;border:0;border-radius:0}}</style></head><body><main class="login"><div class="brand">TATTOO <i>·</i> SFUMATO</div><div class="kicker">STUDIO OS</div><h1>Admin Login</h1><p>Melde dich mit deinem persönlichen Studio-Konto an.</p><form method="post" action="/admin/login"><label for="username">BENUTZERNAME ODER E-MAIL</label><input id="username" name="username" autocomplete="username" required autofocus><label for="password">PASSWORT</label><input id="password" name="password" type="password" autocomplete="current-password" required>${error?'<div class="error">Benutzername oder Passwort ist nicht korrekt.</div>':''}<button type="submit">Anmelden →</button></form></main></body></html>`

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
}

// Never prevent Passenger/Plesk from binding the HTTP server because a persisted
// data file is temporarily unavailable. Authentication waits for this bootstrap
// separately, while /health remains available for deployment diagnostics.
const adminBootstrap = ensureDefaultAdmin().catch(error => {
  console.error('[admin-bootstrap]', error)
})

createServer(async (request, response) => {
  response.setHeader('X-Sfumato-Server', serverVersion)
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const secureCookie=request.headers['x-forwarded-proto']==='https'?'; Secure':''

  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end('ok')
    return
  }

  await adminBootstrap
  const adminUser=await adminUserFromRequest(request)

  if(pathname==='/admin/login'&&request.method==='GET'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(adminLoginPage(false));return}
  if(pathname==='/admin/login'&&request.method==='POST'){let body='';request.on('data',chunk=>{if(body.length<10000)body+=chunk});request.on('end',async()=>{const data=new URLSearchParams(body),identity=cleanText(data.get('username'),180).toLowerCase(),password=data.get('password')||'',users=await readUsers(),user=users.filter(item=>item.active&&(item.username?.toLowerCase()===identity||item.email?.toLowerCase()===identity)).find(item=>verifyPassword(password,item.password));if(!user){response.writeHead(401,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(adminLoginPage(true));return}response.writeHead(303,{Location:'/admin/','Set-Cookie':`${adminCookieName}=${createAdminToken(user)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secureCookie}`,'Cache-Control':'no-store'});response.end()});return}
  if(pathname==='/admin/logout'){response.writeHead(303,{Location:'/admin/login','Set-Cookie':`${adminCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie}`});response.end();return}

  const publicApi=(pathname==='/api/portfolio'&&request.method==='GET')||(pathname==='/api/requests'&&request.method==='POST')||pathname.startsWith('/api/uploads/')||pathname==='/api/calendar.ics'||pathname==='/api/messages/inbound'
  const adminApi=pathname.startsWith('/api/')&&!publicApi
  if((pathname.startsWith('/admin')||adminApi)&&!adminUser){if(adminApi)return sendJson(response,401,{error:'Admin-Anmeldung erforderlich.',login:'/admin/login'});response.writeHead(303,{Location:'/admin/login','Cache-Control':'no-store'});response.end();return}

  if (pathname === '/api/messages/inbound' && request.method === 'POST') {
    let body='';request.on('data',chunk=>{if(body.length<2000000)body+=chunk});request.on('end',async()=>{try{const input=JSON.parse(body),secret=process.env.INBOUND_EMAIL_SECRET;if(!secret||request.headers['x-inbound-secret']!==secret)return sendJson(response,401,{error:'Webhook nicht autorisiert.'});const haystack=`${input.subject||''} ${input.text||''}`,match=haystack.match(/#([A-Z0-9]{5,8})\b/i);if(!match)return sendJson(response,422,{error:'Keine Anfragenummer gefunden.'});const entries=await readRequests(),entry=entries.find(item=>String(item.reference||item.id).replace(/[^a-z0-9]/gi,'').toLowerCase().endsWith(match[1].toLowerCase()));if(!entry)return sendJson(response,404,{error:'Anfrage nicht gefunden.'});entry.emails=Array.isArray(entry.emails)?entry.emails:[];entry.emails.push({id:`MAIL-${Date.now().toString(36).toUpperCase()}`,direction:'inbound',from:cleanText(input.from,180),subject:cleanText(input.subject,300),text:cleanText(input.text,10000),createdAt:input.date&&Number.isFinite(new Date(input.date).getTime())?new Date(input.date).toISOString():new Date().toISOString()});await saveRequests(entries);sendJson(response,201,{matched:entry.id})}catch{sendJson(response,400,{error:'E-Mail konnte nicht zugeordnet werden.'})}});return
  }

  if(pathname==='/api/calendar.ics'&&request.method==='GET'){const token=new URL(request.url,'http://localhost').searchParams.get('token');Promise.all([readSettings(),readAppointments()]).then(([settings,entries])=>{if(!settings.calendar.webcalToken||token!==settings.calendar.webcalToken)return sendJson(response,401,{error:'Ungültiger Kalender-Link.'});const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const escape=value=>String(value||'').replace(/([,;\\])/g,'\\$1').replace(/\n/g,'\\n');const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Tattoo Sfumato//Studio OS//DE','CALSCALE:GREGORIAN',...entries.flatMap(item=>['BEGIN:VEVENT',`UID:${item.id}@sfumato`,`DTSTAMP:${stamp(item.createdAt||Date.now())}`,`DTSTART:${stamp(item.start)}`,`DTEND:${stamp(item.end)}`,`SUMMARY:${escape(item.clientName)} · Tattoo`,`DESCRIPTION:${escape(item.style)} · ${escape(item.placement)}`,'END:VEVENT']),'END:VCALENDAR'].join('\r\n');response.writeHead(200,{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'no-store'});response.end(ics)}).catch(()=>sendJson(response,500,{error:'Kalender konnte nicht erstellt werden.'}));return}

  if (pathname === '/api/requests' && request.method === 'GET') {
    readRequests().then(requests => sendJson(response, 200, requests)).catch(() => sendJson(response, 500, { error: 'Anfragen konnten nicht geladen werden.' }))
    return
  }

  if(pathname==='/api/auth/me'&&request.method==='GET'){const{password,...safe}=adminUser;sendJson(response,200,safe);return}
  if(pathname==='/api/portfolio'&&request.method==='GET'){readPortfolio().then(entries=>sendJson(response,200,entries)).catch(()=>sendJson(response,500,{error:'Referenzen konnten nicht geladen werden.'}));return}
  if(pathname==='/api/settings'&&request.method==='GET'){readSettings().then(async settings=>{if(!settings.calendar.webcalToken){settings.calendar.webcalToken=createHmac('sha256',applicationSecret).update(String(Date.now())).digest('hex').slice(0,24);await saveSettings(settings)}sendJson(response,200,settings)}).catch(()=>sendJson(response,500,{error:'Einstellungen konnten nicht geladen werden.'}));return}
  if(pathname==='/api/settings'&&request.method==='PUT'){let body='';request.on('data',chunk=>{if(body.length<2000000)body+=chunk});request.on('end',async()=>{try{const input=JSON.parse(body),settings=await readSettings(),next={...settings,...input,integrations:{...settings.integrations,...input.integrations},calendar:{...settings.calendar,...input.calendar}};if(!next.calendar.webcalToken)next.calendar.webcalToken=createHmac('sha256',applicationSecret).update(String(Date.now())).digest('hex').slice(0,24);await saveSettings(next);sendJson(response,200,next)}catch{sendJson(response,400,{error:'Einstellungen konnten nicht gespeichert werden.'})}});return}
  if(pathname==='/api/users'&&request.method==='GET'){readUsers().then(users=>sendJson(response,200,users.map(({password,...user})=>user))).catch(()=>sendJson(response,500,{error:'Benutzer konnten nicht geladen werden.'}));return}
  if(pathname==='/api/users'&&request.method==='POST'){let body='';request.on('data',chunk=>{if(body.length<100000)body+=chunk});request.on('end',async()=>{try{const input=JSON.parse(body),users=await readUsers(),username=cleanText(input.username,80).toLowerCase(),email=cleanText(input.email,180).toLowerCase();if(!username||!email||!input.password||String(input.password).length<8)return sendJson(response,400,{error:'Benutzername, E-Mail und mindestens 8 Zeichen Passwort werden benötigt.'});if(users.some(user=>user.username?.toLowerCase()===username||user.email?.toLowerCase()===email))return sendJson(response,409,{error:'Benutzername oder E-Mail ist bereits vergeben.'});const entry={id:`USR-${Date.now().toString(36).toUpperCase()}`,username,name:cleanText(input.name,120)||username,email,role:['Administrator','Studio','Lesen'].includes(input.role)?input.role:'Studio',active:input.active!==false,password:hashPassword(input.password),createdAt:new Date().toISOString()};users.push(entry);await saveUsers(users);const{password,...safe}=entry;sendJson(response,201,safe)}catch{sendJson(response,400,{error:'Benutzer konnte nicht angelegt werden.'})}});return}
  const userMatch=pathname.match(/^\/api\/users\/([^/]+)$/);if(userMatch&&request.method==='PATCH'){let body='';request.on('data',chunk=>body+=chunk);request.on('end',async()=>{try{const input=JSON.parse(body),users=await readUsers(),entry=users.find(item=>item.id===decodeURIComponent(userMatch[1]));if(!entry)return sendJson(response,404,{error:'Benutzer nicht gefunden.'});for(const field of ['name','email','username','role'])if(input[field]!==undefined)entry[field]=cleanText(input[field],180);if(input.active!==undefined)entry.active=Boolean(input.active);if(input.password){if(String(input.password).length<8)return sendJson(response,400,{error:'Das Passwort benötigt mindestens 8 Zeichen.'});entry.password=hashPassword(input.password)}entry.initial=false;await saveUsers(users);const{password,...safe}=entry;sendJson(response,200,safe)}catch{sendJson(response,400,{error:'Benutzer konnte nicht aktualisiert werden.'})}});return}if(userMatch&&request.method==='DELETE'){readUsers().then(async users=>{const id=decodeURIComponent(userMatch[1]),removed=users.find(item=>item.id===id);await saveUsers(users.filter(item=>item.id!==id));if(removed?.initial||removed?.id==='USR-ADMIN'){const settings=await readSettings();settings.auth={...(settings.auth||{}),defaultAdminRemoved:true};await saveSettings(settings)}sendJson(response,200,{deleted:true})});return}
  if(pathname==='/api/portfolio'&&request.method==='POST'){let body='';request.on('data',chunk=>{if(body.length<20000000)body+=chunk});request.on('end',async()=>{try{const input=JSON.parse(body),match=String(input.image||'').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);if(!match)return sendJson(response,400,{error:'Gültiges Bild fehlt.'});const entries=await readPortfolio();if(input.featured&&entries.filter(item=>item.featured).length>=3)return sendJson(response,409,{error:'Es können maximal drei Highlights festgelegt werden.'});const id=`REF-${Date.now().toString(36).toUpperCase()}`,directory=join(uploadsDirectory,'portfolio');await mkdir(directory,{recursive:true});const extension=match[1]==='image/jpeg'?'.jpg':match[1]==='image/png'?'.png':'.webp',filename=`${id}${extension}`;await writeFile(join(directory,filename),Buffer.from(match[2],'base64'));const entry={id,title:cleanText(input.title,120)||'Neue Arbeit',style:cleanText(input.style,80)||'Fineline',placement:cleanText(input.placement,120),description:cleanText(input.description,1000),published:Boolean(input.published),featured:Boolean(input.featured),position:cleanText(input.position,30)||'50% 50%',image:`/api/uploads/portfolio/${filename}`,order:entries.length,createdAt:new Date().toISOString()};entries.push(entry);await savePortfolio(entries);sendJson(response,201,entry)}catch{sendJson(response,400,{error:'Referenz konnte nicht gespeichert werden.'})}});return}
  const portfolioMatch=pathname.match(/^\/api\/portfolio\/([^/]+)$/)
  if(portfolioMatch&&request.method==='PATCH'){let body='';request.on('data',chunk=>{if(body.length<1000000)body+=chunk});request.on('end',async()=>{try{const input=JSON.parse(body),entries=await readPortfolio(),entry=entries.find(item=>item.id===decodeURIComponent(portfolioMatch[1]));if(!entry)return sendJson(response,404,{error:'Referenz nicht gefunden.'});if(input.featured&&!entry.featured&&entries.filter(item=>item.featured).length>=3)return sendJson(response,409,{error:'Es können maximal drei Highlights festgelegt werden.'});for(const field of ['title','style','placement','description','position'])if(input[field]!==undefined)entry[field]=cleanText(input[field],field==='description'?1000:120);for(const field of ['published','featured'])if(input[field]!==undefined)entry[field]=Boolean(input[field]);if(input.order!==undefined)entry.order=Number(input.order)||0;await savePortfolio(entries);sendJson(response,200,entry)}catch{sendJson(response,400,{error:'Referenz konnte nicht aktualisiert werden.'})}});return}
  if(portfolioMatch&&request.method==='DELETE'){readPortfolio().then(async entries=>{const index=entries.findIndex(item=>item.id===decodeURIComponent(portfolioMatch[1]));if(index<0)return sendJson(response,404,{error:'Referenz nicht gefunden.'});entries.splice(index,1);await savePortfolio(entries);sendJson(response,200,{deleted:true})}).catch(()=>sendJson(response,500,{error:'Referenz konnte nicht gelöscht werden.'}));return}

  if (pathname === '/api/appointments' && request.method === 'GET') {
    readAppointments().then(appointments => sendJson(response, 200, appointments)).catch(() => sendJson(response, 500, { error: 'Termine konnten nicht geladen werden.' }))
    return
  }

  if (pathname === '/api/customer-notes' && request.method === 'GET') {
    readCustomerNotes().then(notes => sendJson(response, 200, notes)).catch(() => sendJson(response, 500, { error: 'Kundennotizen konnten nicht geladen werden.' }))
    return
  }

  if (pathname === '/api/customer-notes' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => { if (body.length < 100000) body += chunk })
    request.on('end', async () => {
      try {
        const input = JSON.parse(body)
        const allowedCategories = ['Allgemein','Motiv & Stil','Gesundheit','Vorbereitung','Durchführung','Nachsorge','Zahlung']
        const allowedRelevance = ['normal','wichtig','kritisch']
        const entry = { id: `NOTE-${Date.now().toString(36).toUpperCase()}`, customerKey: cleanText(input.customerKey, 220).toLowerCase(), category: allowedCategories.includes(input.category) ? input.category : 'Allgemein', relevance: allowedRelevance.includes(input.relevance) ? input.relevance : 'normal', text: cleanText(input.text, 4000), createdAt: new Date().toISOString() }
        if (!entry.customerKey || !entry.text) return sendJson(response, 400, { error: 'Kunde und Notiztext werden benötigt.' })
        const notes = await readCustomerNotes(); notes.unshift(entry); await saveCustomerNotes(notes.slice(0, 5000)); sendJson(response, 201, entry)
      } catch { sendJson(response, 400, { error: 'Kundennotiz konnte nicht gespeichert werden.' }) }
    })
    return
  }

  const customerNoteMatch = pathname.match(/^\/api\/customer-notes\/([^/]+)$/)
  if (customerNoteMatch && request.method === 'DELETE') {
    const noteId = decodeURIComponent(customerNoteMatch[1])
    readCustomerNotes().then(async notes => {
      const remaining = notes.filter(note => note.id !== noteId)
      if (remaining.length === notes.length) return sendJson(response, 404, { error: 'Kundennotiz wurde nicht gefunden.' })
      await saveCustomerNotes(remaining)
      sendJson(response, 200, { deleted: true, id: noteId })
    }).catch(() => sendJson(response, 500, { error: 'Kundennotiz konnte nicht gelöscht werden.' }))
    return
  }

  if (pathname === '/api/appointments' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => { if (body.length < 100000) body += chunk })
    request.on('end', async () => {
      try {
        const input = JSON.parse(body)
        const start = new Date(input.start), end = new Date(input.end)
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return sendJson(response, 400, { error: 'Ungültiger Terminzeitraum.' })
        const entry = { id: `APT-${Date.now().toString(36).toUpperCase()}`, clientName: cleanText(input.clientName, 120), email: cleanText(input.email, 180), phone: cleanText(input.phone, 60), style: cleanText(input.style, 80), placement: cleanText(input.placement, 160), notes: cleanText(input.notes, 4000), requestId: cleanText(input.requestId, 80), source: cleanText(input.source, 30) || 'studio', start: start.toISOString(), end: end.toISOString(), createdAt: new Date().toISOString() }
        if (!entry.clientName) return sendJson(response, 400, { error: 'Kundenname fehlt.' })
        const appointments = await readAppointments(); appointments.push(entry); await saveAppointments(appointments); sendJson(response, 201, entry)
      } catch { sendJson(response, 400, { error: 'Termin konnte nicht gespeichert werden.' }) }
    })
    return
  }

  const appointmentMatch = pathname.match(/^\/api\/appointments\/([^/]+)$/)
  if (appointmentMatch && request.method === 'PATCH') {
    let body = ''
    request.on('data', chunk => { if (body.length < 25000000) body += chunk })
    request.on('end', async () => {
      try {
        const input = JSON.parse(body)
        const appointmentId = decodeURIComponent(appointmentMatch[1])
        const entries = await readAppointments()
        const entry = entries.find(item => item.id === appointmentId)
        if (!entry) return sendJson(response, 404, { error: 'Termin wurde nicht gefunden.' })
        if (Array.isArray(input.attachments)) entry.attachments = input.attachments.slice(0, 30).map(file => ({ name: cleanText(file.name, 180), category: cleanText(file.category, 80) || 'Sonstiges', type: cleanText(file.type, 80), data: String(file.data || '').slice(0, 15000000), createdAt: new Date().toISOString() })).filter(file => file.name && file.data.startsWith('data:image/'))
        await saveAppointments(entries)
        sendJson(response, 200, entry)
      } catch { sendJson(response, 400, { error: 'Terminakte konnte nicht aktualisiert werden.' }) }
    })
    return
  }

  const readRequestMatch = pathname.match(/^\/api\/requests\/([^/]+)\/read$/)
  if (readRequestMatch && request.method === 'PATCH') {
    readRequests().then(async requests => {
      const requestEntry = requests.find(entry => entry.id === decodeURIComponent(readRequestMatch[1]))
      if (!requestEntry) return sendJson(response, 404, { error: 'Anfrage nicht gefunden.' })
      requestEntry.readAt = requestEntry.readAt || new Date().toISOString()
      await saveRequests(requests)
      sendJson(response, 200, { id: requestEntry.id, readAt: requestEntry.readAt })
    }).catch(() => sendJson(response, 500, { error: 'Lesestatus konnte nicht gespeichert werden.' }))
    return
  }

  const requestMatch = pathname.match(/^\/api\/requests\/([^/]+)$/)
  if (requestMatch && request.method === 'PATCH') {
    let body='';request.on('data',chunk=>{if(body.length<3000000)body+=chunk});request.on('end',async()=>{try{const input=JSON.parse(body),entries=await readRequests(),entry=entries.find(item=>item.id===decodeURIComponent(requestMatch[1]));if(!entry)return sendJson(response,404,{error:'Anfrage nicht gefunden.'});if(input.estimatedHours!==undefined)entry.estimatedHours=Math.max(.5,Math.min(24,Number(input.estimatedHours)||4));if(typeof input.status==='string')entry.status=cleanText(input.status,40);if(Array.isArray(input.proposals))entry.proposals=input.proposals.slice(-30);if(Array.isArray(input.timeline))entry.timeline=input.timeline.slice(-200);if(Array.isArray(input.emails))entry.emails=input.emails.slice(-200);if(input.bookedAppointmentId!==undefined)entry.bookedAppointmentId=cleanText(input.bookedAppointmentId,100);await saveRequests(entries);sendJson(response,200,entry)}catch{sendJson(response,400,{error:'Anfrage konnte nicht aktualisiert werden.'})}});return
  }

  if (pathname === '/api/requests' && request.method === 'POST') {
    let body = ''
    let tooLarge = false
    request.on('data', chunk => {
      if (!tooLarge) body += chunk
      if (body.length > 75000000) tooLarge = true
    })
    request.on('end', async () => {
      if (tooLarge) return sendJson(response, 413, { error: 'Anfrage ist zu groß.' })
      try {
        const input = JSON.parse(body)
        const requestId = `REQ-${Date.now().toString(36).slice(-6).toUpperCase()}`
        const references = []
        const incomingReferences = Array.isArray(input.references) ? input.references.slice(0, 5) : []
        if (incomingReferences.length) await mkdir(join(uploadsDirectory, requestId), { recursive: true })
        for (const [index, reference] of incomingReferences.entries()) {
          const match = String(reference.data || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
          if (!match) continue
          const buffer = Buffer.from(match[2], 'base64')
          if (buffer.length > 10000000) continue
          const extension = match[1] === 'image/jpeg' ? '.jpg' : match[1] === 'image/png' ? '.png' : '.webp'
          const filename = `${String(index + 1).padStart(2, '0')}${extension}`
          await writeFile(join(uploadsDirectory, requestId, filename), buffer)
          references.push({ name: cleanText(reference.name, 180) || filename, url: `/api/uploads/${requestId}/${filename}`, type: match[1] })
        }
        const entry = {
          id: requestId,
          reference: `#${requestId.replace(/[^a-z0-9]/gi,'').slice(-6).toUpperCase()}`,
          name: cleanText(input.name, 120), email: cleanText(input.email, 180), phone: cleanText(input.phone, 60),
          style: cleanText(input.style, 80) || 'Nicht angegeben', placement: cleanText(input.placement, 160),
          size: cleanText(input.size, 80), idea: cleanText(input.idea, 4000),
          consultation: Boolean(input.consultation), consultationType: cleanText(input.consultationType, 30),
          references, date: new Date().toISOString(), status: 'Neu', source: 'form',
        }
        if (!entry.name || !entry.email || !entry.placement || !entry.size || !entry.idea) return sendJson(response, 400, { error: 'Bitte alle Pflichtfelder ausfüllen.' })
        const requests = await readRequests()
        requests.unshift(entry)
        await saveRequests(requests.slice(0, 1000))
        notifyTelegram(`Neue Tattoo-Anfrage ${entry.reference}\n${entry.name}\n${entry.style} · ${entry.placement}`)
        sendJson(response, 201, entry)
      } catch { sendJson(response, 400, { error: 'Anfrage konnte nicht verarbeitet werden.' }) }
    })
    return
  }

  if (pathname.startsWith('/api/uploads/') && request.method === 'GET') {
    const uploadPath = normalize(pathname.slice('/api/uploads/'.length)).replace(/^([/\\])+/, '')
    const filePath = join(uploadsDirectory, uploadPath)
    if (relative(uploadsDirectory, filePath).startsWith('..') || !existsSync(filePath) || statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Bild nicht gefunden.' })
    const extension = extname(filePath).toLowerCase()
    response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' })
    createReadStream(filePath).pipe(response)
    return
  }

  const relativePath = normalize(pathname).replace(/^([/\\])+/, '')
  let filePath = join(root, relativePath || 'index.html')
  const escapedRoot = relative(root, filePath).startsWith('..')
  if (escapedRoot || !existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(root, 'index.html')

  const extension = extname(filePath).toLowerCase()
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': ['.html', '.txt', '.xml'].includes(extension) ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  })
  if (request.method === 'HEAD') response.end()
  else createReadStream(filePath).pipe(response)
}).listen(port, () => {console.log(`Sfumato site running on port ${port}`);scanPop3Inbox();setInterval(scanPop3Inbox,120000).unref()})
