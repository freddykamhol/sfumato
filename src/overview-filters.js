export const normalizeFilterText = value => String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('de').trim().replace(/\s+/g, ' ')
export function matchesOverview(text, query, values = {}, filters = {}) {
  const haystack = normalizeFilterText(text)
  return normalizeFilterText(query).split(' ').filter(Boolean).every(word => haystack.includes(word)) && Object.entries(filters).every(([key, value]) => !value || values[key] === value)
}
const definitions = [
  { key: 'requests', rows: '.bulk-request-row', bar: '.request-filters', search: 'input[data-request-search]', empty: '.filter-empty', filters: '[data-request-filter]' },
  { key: 'appointments', rows: '.appointment-file-row', bar: '.appointment-tools', search: 'input[data-appointment-search]', empty: '.appointment-filter-empty' },
  { key: 'portfolio', rows: '[data-portfolio-card]', bar: '.portfolio-toolbar', search: '[data-portfolio-search]', empty: '.portfolio-filter-empty', filters: '[data-portfolio-status]' },
  { key: 'customers', rows: '.customer-list > [data-customer-search]', bar: '.customer-filter', search: '[data-customer-search-input]', empty: '.customer-filter-empty' },
  { key: 'imports', rows: '.bulk-import-row', list: '.bulk-import-list' },
  { key: 'users', rows: '.admin-users > article', list: '.admin-users' }
]
export function installOverviewFilters(content) {
  const saved = new Map()
  let applying = false
  const decode = value => { try { return decodeURIComponent(value || '') } catch { return value || '' } }
  function setup(def) {
    const rows = [...content.querySelectorAll(def.rows)], list = def.list && content.querySelector(def.list)
    let bar = def.bar ? content.querySelector(def.bar) : content.querySelector(`[data-overview="${def.key}"]`)
    if (!bar && !list) return null
    if (!bar) { bar = document.createElement('div'); list.before(bar) }
    if (bar.dataset.overview) return { bar, rows }
    const search = (def.search && content.querySelector(def.search)) || Object.assign(document.createElement('input'), { type: 'search', placeholder: 'Name oder Suchbegriff …' })
    const searchParent = search.closest('.admin-list-search')
    const controls = def.filters ? [...bar.querySelectorAll(def.filters)] : []
    const tabs = bar.querySelector('.archive-tabs')
    const state = saved.get(def.key)
    bar.dataset.overview = def.key; bar.classList.add('overview-filter-bar'); bar.setAttribute('aria-label', 'Übersicht filtern')
    const searchLabel = document.createElement('label'); searchLabel.className = 'overview-search'; searchLabel.textContent = 'Suchen'
    search.dataset.overviewSearch = ''; search.autocomplete = 'off'; search.setAttribute('aria-label', 'Übersicht durchsuchen'); searchLabel.append(search)
    const fields = controls.map(select => {
      const label = document.createElement('label'); label.textContent = select.closest('label')?.firstChild?.textContent?.trim() || 'Status'
      select.dataset.overviewKey = select.dataset.requestFilter || 'status'; label.append(select)
      if (select.dataset.requestFilter === 'status' || select.dataset.requestFilter === 'style') {
        const key = select.dataset.requestFilter, existing = new Set([...select.options].map(option => option.value))
        for (const value of new Set(rows.map(row => row.querySelector('.request-row')?.dataset[key]).filter(Boolean))) if (!existing.has(value)) select.add(new Option(value, value))
      }
      return label
    })
    rows.forEach((row,index)=>{if(row.dataset.overviewOrder===undefined)row.dataset.overviewOrder=String(index)})
    const sort = document.createElement('select');sort.dataset.overviewSort='';sort.setAttribute('aria-label','Einträge sortieren');sort.innerHTML='<option value="date-desc">Datum · neueste zuerst</option><option value="date-asc">Datum · älteste zuerst</option><option value="name-asc">Name · A bis Z</option><option value="name-desc">Name · Z bis A</option><option value="status-asc">Status · A bis Z</option><option value="status-desc">Status · Z bis A</option>'
    const sortLabel=document.createElement('label');sortLabel.textContent='Sortierung';sortLabel.append(sort)
    const reset = document.createElement('button'); reset.type = 'button'; reset.dataset.overviewReset = ''; reset.textContent = 'Zurücksetzen'
    const count = document.createElement('output'); count.dataset.overviewCount = ''; count.setAttribute('aria-live', 'polite')
    bar.replaceChildren(searchLabel, ...fields, sortLabel, ...(tabs ? [tabs] : []), reset, count)
    if (searchParent && !bar.contains(searchParent) && !searchParent.children.length) searchParent.remove()
    if (state) {
      search.value = state.query
      controls.forEach(select => { select.value = state.filters[select.dataset.overviewKey] || '' })
      sort.value=state.sort||'date-desc'
      tabs?.querySelectorAll('[data-archive-mode]').forEach(button => button.classList.toggle('active', button.dataset.archiveMode === state.archive))
    }
    return { bar, rows }
  }
  function apply() {
    if (applying) return
    applying = true
    try {
      for (const def of definitions) {
        const view = setup(def)
        if (!view) continue
        const { bar, rows } = view, query = bar.querySelector('[data-overview-search]').value, filters = Object.fromEntries([...bar.querySelectorAll('[data-overview-key]')].map(select => [select.dataset.overviewKey, select.value])), archive = bar.querySelector('[data-archive-mode].active')?.dataset.archiveMode || 'current',sort=bar.querySelector('[data-overview-sort]')?.value||'date-desc'
        saved.set(def.key, { query, filters, archive, sort })
        const [sortKey,direction]=sort.split('-'),factor=direction==='desc'?-1:1,textValue=(row,key)=>{if(key==='status')return row.querySelector('.request-row')?.dataset.status||row.dataset.status||row.querySelector('.status')?.textContent||row.querySelector('.portfolio-state')?.textContent||'';return row.querySelector('.request-row>span b,.appointment-file-row>button>span b,.customer-row-main>div b,.portfolio-card-copy b,.bulk-import-row>span:last-child b,.admin-users>article span b')?.childNodes[0]?.textContent||row.textContent||''},dateFactor=['appointments','imports'].includes(def.key)?1:-1,ordered=rows.slice().sort((a,b)=>sortKey==='date'?(Number(a.dataset.overviewOrder)-Number(b.dataset.overviewOrder))*factor*dateFactor:textValue(a,sortKey).localeCompare(textValue(b,sortKey),'de',{sensitivity:'base',numeric:true})*factor)
        const parent=ordered[0]?.parentElement,current=parent?[...parent.children].filter(child=>rows.includes(child)):[]
        if(parent&&ordered.some((row,index)=>row!==current[index]))ordered.forEach(row=>parent.append(row))
        let visible = 0
        for (const row of rows) {
          const request = row.querySelector('.request-row'), values = request ? { ...request.dataset, requestType: request.dataset.requestType || 'new' } : { status: row.dataset.status }
          const text = [row.textContent, decode(row.dataset.requestSearch), decode(row.dataset.appointmentSearch), decode(row.dataset.search), decode(row.dataset.customerSearch)].join(' ')
          const show = matchesOverview(text, query, values, filters) && (def.key !== 'appointments' || archive === 'all' || row.dataset.archived === String(archive === 'archive'))
          row.hidden = !show
          if (show) visible++
          else row.querySelectorAll('input[type="checkbox"]:checked').forEach(input => { input.checked = false })
        }
        const count = bar.querySelector('[data-overview-count]'), label = `${visible} von ${rows.length} Einträgen`
        if (count.textContent !== label) count.textContent = label
        let empty = def.empty ? content.querySelector(def.empty) : content.querySelector(`[data-overview-empty="${def.key}"]`)
        if (!empty && !def.empty) { empty = document.createElement('p'); empty.dataset.overviewEmpty = def.key; empty.className = 'overview-empty'; empty.textContent = 'Keine Treffer. Ändere deine Filter oder setze sie zurück.'; bar.after(empty) }
        if (empty) empty.hidden = visible > 0 || rows.length === 0
        for (const [selector, barSelector, countSelector] of [['[data-request-select]', '.request-bulk-bar', '[data-request-selected-count]'], ['[data-appointment-select]', '.appointment-bulk-bar', '[data-appointment-selected-count]']]) {
          const bulk = content.querySelector(barSelector)
          if (!bulk) continue
          const selected = content.querySelectorAll(`${selector}:checked`).length
          bulk.hidden = !selected
          const target = bulk.querySelector(countSelector)
          if (target && target.textContent !== String(selected)) target.textContent = selected
        }
        if (def.key === 'imports') {
          const form = content.querySelector('[data-bulk-import-selection]'), boxes = [...form.querySelectorAll('[name="importId"]')], selected = boxes.filter(input => input.checked).length
          form.querySelectorAll('[data-bulk-count]').forEach(el => { if (el.textContent !== String(selected)) el.textContent = selected })
          form.querySelector('[type="submit"]').disabled = !selected
          const all = form.querySelector('[data-select-all-imports]'), shown = boxes.filter(input => !input.closest('.bulk-import-row').hidden)
          all.checked = shown.length > 0 && shown.every(input => input.checked); all.indeterminate = selected > 0 && !all.checked
        }
      }
    } finally { applying = false }
  }
  content.addEventListener('input', event => { if (event.target.closest('.overview-filter-bar')) apply() })
  content.addEventListener('change', event => { if (event.target.closest('.overview-filter-bar')) apply() })
  content.addEventListener('click', event => {
    const reset = event.target.closest('[data-overview-reset]')
    if (!reset) return
    const bar = reset.closest('.overview-filter-bar')
    bar.querySelectorAll('input,select').forEach(input => { input.value = '' })
    const sort=bar.querySelector('[data-overview-sort]');if(sort)sort.value='date-desc'
    bar.querySelectorAll('[data-archive-mode]').forEach(button => button.classList.toggle('active', button.dataset.archiveMode === 'current'))
    apply()
  })
  const observer = new MutationObserver(apply)
  observer.observe(content, { childList: true, subtree: true })
  queueMicrotask(apply)
  return { apply }
}
