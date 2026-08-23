import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { createDAVClient } from 'tsdav'

const waitForServer=async url=>{for(let attempt=0;attempt<60;attempt++){try{const response=await fetch(`${url}/health`);if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Testserver ist nicht gestartet.')}
const login=async url=>{const response=await fetch(`${url}/admin/login`,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'admin',password:'test-password-123'})});assert.equal(response.status,303);return response.headers.get('set-cookie').split(';')[0]}

test('Absage behält Terminakte, entfernt Kalenderbezug und öffnet Anfrage erneut',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'sfumato-test-')),port=39000+Math.floor(Math.random()*1000),url=`http://127.0.0.1:${port}`,secret='integration-secret'
  const child=spawn(process.execPath,['app.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),DATA_DIRECTORY:directory,ADMIN_SESSION_SECRET:secret,ADMIN_INITIAL_PASSWORD:'test-password-123',PUBLIC_URL:url},stdio:'ignore'})
  t.after(async()=>{child.kill();await rm(directory,{recursive:true,force:true})})
  await waitForServer(url)
  const cookie=await login(url),headers={Cookie:cookie,'Content-Type':'application/json'}
  const requestResponse=await fetch(`${url}/api/requests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test Kunde',email:'test@example.com',phone:'0123',style:'Fineline',placement:'Arm',size:'10 cm',idea:'Testmotiv',references:[{name:'Vorlage.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='}]})})
  assert.equal(requestResponse.status,201)
  const requestEntry=await requestResponse.json()
  assert.match(requestEntry.references[0].url,/\.webp$/);assert.equal(requestEntry.references[0].type,'image/webp');assert.equal((await readFile(join(directory,'uploads',requestEntry.id,'01.webp'))).subarray(0,4).toString(),'RIFF')
  const start=new Date(Date.now()+14*86400000);start.setUTCHours(10,0,0,0);const end=new Date(start.getTime()+2*3600000)
  const appointmentResponse=await fetch(`${url}/api/appointments`,{method:'POST',headers,body:JSON.stringify({requestId:requestEntry.id,clientName:requestEntry.name,email:'',start:start.toISOString(),end:end.toISOString(),override:true})})
  assert.equal(appointmentResponse.status,201)
  const appointment=await appointmentResponse.json(),token=createHmac('sha256',secret).update(`appointment-management:${appointment.id}`).digest('base64url')
  const cancellation=await fetch(`${url}/terminverwaltung`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({termin:appointment.id,token,action:'cancel'})})
  assert.equal(cancellation.status,200)
  const appointments=await fetch(`${url}/api/appointments`,{headers:{Cookie:cookie}}).then(response=>response.json())
  assert.equal(appointments.find(item=>item.id===appointment.id)?.status,'Stornierung angefragt')
  const requests=await fetch(`${url}/api/requests`,{headers:{Cookie:cookie}}).then(response=>response.json()),updated=requests.find(item=>item.id===requestEntry.id)
  assert.equal(updated.status,'Neu')
  assert.equal(updated.bookedAppointmentId,undefined)
  assert.equal(updated.timeline.filter(item=>item.title==='Absage angefragt').length,1)
  const managementPage=await fetch(`${url}/terminverwaltung?termin=${encodeURIComponent(appointment.id)}&token=${encodeURIComponent(token)}`)
  assert.equal(managementPage.status,200)
  const settings=await fetch(`${url}/api/settings`,{headers:{Cookie:cookie}}).then(response=>response.json())
  const calendar=await fetch(`${url}/api/calendar.ics?token=${settings.calendar.webcalToken}`).then(response=>response.text())
  assert.equal(calendar.includes(`UID:${appointment.id}@sfumato`),false)

  const readerResponse=await fetch(`${url}/api/users`,{method:'POST',headers,body:JSON.stringify({username:'reader',name:'Lesekonto',email:'reader@example.com',password:'reader-password-123',role:'Lesen',active:true})})
  assert.equal(readerResponse.status,201)
  const readerLogin=await fetch(`${url}/admin/login`,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'reader',password:'reader-password-123'})})
  const readerCookie=readerLogin.headers.get('set-cookie').split(';')[0]
  const forbidden=await fetch(`${url}/api/requests/${requestEntry.id}`,{method:'PATCH',headers:{Cookie:readerCookie,'Content-Type':'application/json'},body:JSON.stringify({status:'Bestätigt'})})
  assert.equal(forbidden.status,403)

  const movedStart=new Date(start.getTime()+7*86400000),movedEnd=new Date(movedStart.getTime()+2*3600000)
  const replacementResponse=await fetch(`${url}/api/appointments`,{method:'POST',headers,body:JSON.stringify({requestId:requestEntry.id,clientName:requestEntry.name,email:'',start:movedStart.toISOString(),end:movedEnd.toISOString(),override:true})})
  const replacement=await replacementResponse.json(),replacementToken=createHmac('sha256',secret).update(`appointment-management:${replacement.id}`).digest('base64url')
  const rescheduleRequest=await fetch(`${url}/terminverwaltung`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({termin:replacement.id,token:replacementToken,action:'reschedule'})})
  assert.equal(rescheduleRequest.status,200)
  const afterMove=await fetch(`${url}/api/appointments`,{headers:{Cookie:cookie}}).then(response=>response.json())
  assert.equal(afterMove.find(item=>item.id===replacement.id)?.status,'Verschiebung angefragt')
  const calendarAfterMove=await fetch(`${url}/api/calendar.ics?token=${settings.calendar.webcalToken}`).then(response=>response.text())
  assert.equal(calendarAfterMove.includes(`UID:${replacement.id}@sfumato`),false)
})

test('CalDAV synchronisiert Termine bidirektional und archiviert Löschungen',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'sfumato-caldav-')),port=40000+Math.floor(Math.random()*1000),url=`http://127.0.0.1:${port}`
  const child=spawn(process.execPath,['app.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),DATA_DIRECTORY:directory,ADMIN_SESSION_SECRET:'caldav-test-secret',ADMIN_INITIAL_PASSWORD:'test-password-123',PUBLIC_URL:url},stdio:'ignore'})
  t.after(async()=>{child.kill();await rm(directory,{recursive:true,force:true})})
  await waitForServer(url)
  const cookie=await login(url),adminHeaders={Cookie:cookie,'Content-Type':'application/json'},settings=await fetch(`${url}/api/settings`,{headers:{Cookie:cookie}}).then(response=>response.json())
  settings.calendar.caldav={enabled:true,username:'studio',password:'very-secure-calendar-password'}
  assert.equal((await fetch(`${url}/api/settings`,{method:'PUT',headers:adminHeaders,body:JSON.stringify(settings)})).status,200)
  const profile=await fetch(`${url}/api/caldav.mobileconfig`,{headers:{Cookie:cookie}});assert.equal(profile.status,200);assert.match(profile.headers.get('content-type'),/application\/x-apple-aspen-config/);const profileText=await profile.text();assert.match(profileText,/<key>CalDAVHostName<\/key>/);assert.match(profileText,/<string>studio<\/string>/)
  const authorization=`Basic ${Buffer.from('studio:very-secure-calendar-password').toString('base64')}`,headers={Authorization:authorization}
  const davClient=await createDAVClient({serverUrl:`${url}/caldav/`,credentials:{username:'studio',password:'very-secure-calendar-password'},authMethod:'Basic',defaultAccountType:'caldav'}),davCalendars=await davClient.fetchCalendars();assert.equal(davCalendars.length,1);assert.match(davCalendars[0].displayName,/Tattoo Sfumato/)
  assert.equal((await fetch(`${url}/caldav/`,{method:'OPTIONS',headers})).status,204)
  const discovery=await fetch(`${url}/caldav/`,{method:'PROPFIND',headers:{...headers,Depth:'1'}})
  assert.equal(discovery.status,207);assert.match(await discovery.text(),/calendar-home-set/)
  const firstStart=new Date(Date.now()+20*86400000);firstStart.setUTCHours(9,0,0,0);const secondStart=new Date(firstStart.getTime()+86400000)
  const event=start=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:device-event-1\r\nDTSTART:${start.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}\r\nDTEND:${new Date(start.getTime()+3600000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}\r\nSUMMARY:Endgerät Termin\r\nDESCRIPTION:Vom Smartphone erstellt\r\nEND:VEVENT\r\nEND:VCALENDAR`
  const created=await fetch(`${url}/caldav/calendar/device-event-1.ics`,{method:'PUT',headers:{...headers,'Content-Type':'text/calendar'},body:event(firstStart)})
  assert.equal(created.status,201);const etag=created.headers.get('etag');assert.ok(etag)
  const changed=await fetch(`${url}/caldav/calendar/device-event-1.ics`,{method:'PUT',headers:{...headers,'Content-Type':'text/calendar','If-Match':etag},body:event(secondStart)})
  assert.equal(changed.status,204)
  const appointments=await fetch(`${url}/api/appointments`,{headers:{Cookie:cookie}}).then(response=>response.json()),item=appointments.find(entry=>entry.caldavUid==='device-event-1')
  assert.equal(item.start,secondStart.toISOString());assert.equal(item.source,'caldav')
  assert.equal((await fetch(`${url}/caldav/calendar/device-event-1.ics`,{method:'DELETE',headers})).status,204)
  const archived=await fetch(`${url}/api/appointments`,{headers:{Cookie:cookie}}).then(response=>response.json())
  assert.equal(archived.find(entry=>entry.id===item.id).status,'Storniert')
  const report=await fetch(`${url}/caldav/calendar/`,{method:'REPORT',headers})
  assert.equal(report.status,207);assert.equal((await report.text()).includes('device-event-1'),false)
})
