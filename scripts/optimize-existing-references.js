import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root=fileURLToPath(new URL('..',import.meta.url))
const dataDirectory=process.env.DATA_DIRECTORY?resolve(process.env.DATA_DIRECTORY):join(root,'data')
const uploadsDirectory=join(dataDirectory,'uploads')
const portfolioFile=join(dataDirectory,'portfolio.json')
const requestsFile=join(dataDirectory,'requests.json')
const optimize=buffer=>sharp(buffer,{limitInputPixels:40000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toBuffer()
const readJson=async(file,fallback)=>{try{return JSON.parse(await readFile(file,'utf8'))}catch(error){if(error.code==='ENOENT')return fallback;throw error}}
const safeUploadPath=url=>{const prefix='/api/uploads/',value=String(url||'');if(!value.startsWith(prefix))return null;const path=resolve(uploadsDirectory,value.slice(prefix.length));return relative(uploadsDirectory,path).startsWith('..')?null:path}

let converted=0,skipped=0,failed=0
const convertReference=async reference=>{
  const source=safeUploadPath(reference?.url||reference?.image)
  if(!source||!existsSync(source)){skipped++;return false}
  const target=join(dirname(source),`${basename(source,extname(source))}.webp`),temporary=`${target}.optimizing`
  try{
    const output=await optimize(await readFile(source));await mkdir(dirname(target),{recursive:true});await writeFile(temporary,output);if(existsSync(target))await unlink(target);await rename(temporary,target);if(source!==target&&existsSync(source))await unlink(source)
    const publicUrl=`/api/uploads/${relative(uploadsDirectory,target).replaceAll('\\','/')}`
    if('image'in reference)reference.image=publicUrl;else reference.url=publicUrl
    reference.type='image/webp';reference.size=output.length;reference.imageType='image/webp';reference.imageBytes=output.length;converted++;return true
  }catch(error){failed++;console.error(`[webp] ${source}: ${error.message}`);try{if(existsSync(temporary))await unlink(temporary)}catch{}return false}
}

const portfolio=await readJson(portfolioFile,[]),requests=await readJson(requestsFile,[])
let portfolioChanged=false,requestsChanged=false
for(const entry of portfolio)if(await convertReference(entry))portfolioChanged=true
for(const request of requests)for(const reference of request.references||[])if(await convertReference(reference))requestsChanged=true
if(portfolioChanged)await writeFile(portfolioFile,JSON.stringify(portfolio,null,2),'utf8')
if(requestsChanged)await writeFile(requestsFile,JSON.stringify(requests,null,2),'utf8')
console.log(`[webp] ${converted} Referenzen optimiert, ${skipped} übersprungen, ${failed} fehlgeschlagen.`)
if(failed)process.exitCode=1
