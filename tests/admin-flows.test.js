import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'

const waitForServer=async url=>{for(let attempt=0;attempt<60;attempt++){try{const response=await fetch(`${url}/health`);if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Testserver ist nicht gestartet.')}
const login=async url=>{const response=await fetch(`${url}/admin/login`,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'admin',password:'test-password-123'})});assert.equal(response.status,303);return response.headers.get('set-cookie').split(';')[0]}

test('Absage behält Terminakte, entfernt Kalenderbezug und öffnet Anfrage erneut',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'sfumato-test-')),port=39000+Math.floor(Math.random()*1000),url=`http://127.0.0.1:${port}`,secret='integration-secret'
  const child=spawn(process.execPath,['app.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),DATA_DIRECTORY:directory,ADMIN_SESSION_SECRET:secret,ADMIN_INITIAL_PASSWORD:'test-password-123',PUBLIC_URL:url},stdio:'ignore'})
  t.after(async()=>{child.kill();await rm(directory,{recursive:true,force:true})})
  await waitForServer(url)
  const cookie=await login(url),headers={Cookie:cookie,'Content-Type':'application/json'}
  const requestResponse=await fetch(`${url}/api/requests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test Kunde',email:'test@example.com',phone:'0123',style:'Fineline',placement:'Arm',size:'10 cm',idea:'Testmotiv'})})
  assert.equal(requestResponse.status,201)
  const requestEntry=await requestResponse.json()
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
