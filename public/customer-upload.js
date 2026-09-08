const form = document.querySelector('#upload')
const input = form.elements.images
const drop = form.querySelector('.upload-drop')
const previews = form.querySelector('.upload-preview-grid')
const status = form.querySelector('[role="status"]')
const submit = form.querySelector('[type="submit"]')
let files = [], urls = [], sending = false
function render() {
  urls.forEach(URL.revokeObjectURL)
  urls = []
  previews.replaceChildren()
  files.forEach((file, index) => {
    const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption'), remove = document.createElement('button')
    const url = URL.createObjectURL(file); urls.push(url)
    image.src = url; image.alt = `Vorschau: ${file.name}`
    caption.textContent = file.name
    remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `${file.name} entfernen`)
    remove.disabled = sending
    remove.onclick = () => { files.splice(index, 1); render(); input.focus() }
    figure.append(image, caption, remove); previews.append(figure)
  })
  form.querySelector('.upload-counter').textContent = `${files.length} von 5 Bildern ausgewählt`
}
function add(incoming) {
  if (sending) return
  const errors = []
  for (const file of incoming) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { errors.push('Bitte nur JPG, PNG oder WebP auswählen.'); continue }
    if (file.size > 10000000) { errors.push('Ein Bild darf höchstens 10 MB groß sein.'); continue }
    if (files.some(item => item.name === file.name && item.size === file.size)) continue
    if (files.length >= 5) { errors.push('Maximal 5 Bilder pro Einreichung.'); continue }
    files.push(file)
  }
  status.textContent = [...new Set(errors)].join(' ')
  input.value = ''; render()
}
input.addEventListener('change', () => add([...input.files]))
drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('dragging') })
drop.addEventListener('dragleave', () => drop.classList.remove('dragging'))
drop.addEventListener('drop', event => { event.preventDefault(); drop.classList.remove('dragging'); add([...event.dataTransfer.files]) })
form.addEventListener('submit', async event => {
  event.preventDefault()
  if (sending) return
  if (!files.length) { status.textContent = 'Bitte wähle mindestens ein Bild aus.'; input.focus(); return }
  if (!form.reportValidity()) return
  sending = true; submit.disabled = true; input.disabled = true; render()
  submit.textContent = 'Bilder werden gesendet …'; status.textContent = 'Bitte lasse diese Seite geöffnet, bis der Upload abgeschlossen ist.'
  try {
    const references = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, data: reader.result })
      reader.onerror = () => reject(new Error('Ein Bild konnte nicht gelesen werden. Bitte wähle es erneut aus.'))
      reader.readAsDataURL(file)
    })))
    const response = await fetch(location.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ references, consent: form.elements.consent.checked }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'Die Bilder konnten nicht gesendet werden. Bitte versuche es erneut.')
    urls.forEach(URL.revokeObjectURL)
    form.innerHTML = '<section class="upload-success" tabindex="-1"><span class="success-mark" aria-hidden="true">✓</span><h2>Deine Bilder sind angekommen.</h2><p>Wir haben sie deiner bestehenden Anfrage zugeordnet. Du musst keine neue Anfrage stellen.</p><p><strong>Behalte bitte auch deinen Spamordner im Blick.</strong><br>Wir melden uns per E-Mail bei dir.</p><a href="/">Zurück zur Startseite →</a></section>'
    form.querySelector('.upload-success').focus()
  } catch (error) {
    status.textContent = error.message
    sending = false; submit.disabled = false; input.disabled = false; submit.textContent = 'Bilder hochladen und senden →'; render()
  }
})
