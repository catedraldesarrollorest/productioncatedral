// ===== MERCANCÍAS ADMIN =====
let mercEditId = null;

function renderMercanciasTable(mercs) {
  const tbody = document.getElementById('merc-table-body');
  setText('merc-count', mercs.length + ' mercancías');
  if (!mercs.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Sin mercancías. Crea la primera.</td></tr>'; return; }
  tbody.innerHTML = mercs.map(m => `<tr style="${!m.activo?'opacity:0.45':''}">
    <td><strong>${m.nombre}</strong></td>
    <td>${CATEGORIA_EMOJI[m.categoria]||''} ${m.categoria}</td>
    <td>${m.unidad_medida}</td>
    <td>${(m.unidad_medida==='Rac'||m.unidad_medida==='Porcion') ? `<strong>${m.peso_racion_kg} kg</strong>` : '—'}</td>
    <td>${m.precio_kg>0?'$'+parseFloat(m.precio_kg).toFixed(2):'—'}</td>
    <td>${m.es_insumo?'✅':'—'}</td>
    <td>${m.es_resultado?'✅':'—'}</td>
    <td>${m.activo?'<span class="badge badge-aprobado">Activa</span>':'<span class="badge badge-obs">Inactiva</span>'}</td>
    <td><div class="table-actions">
      <button class="btn-icon-sm" onclick="openMercanciaModal('${m.id}')">✏️</button>
      <button class="btn-icon-sm" onclick="toggleMerc('${m.id}',${!m.activo})">${m.activo?'🚫':'✅'}</button>
      <button class="btn-icon-sm" style="color:#e63946" onclick="deleteMerc('${m.id}')">🗑</button>
    </div></td>
  </tr>`).join('');
  renderFichasRacion();
}

function filterMercancias() {
  const q = (document.getElementById('search-merc')?.value||'').toLowerCase();
  const cat = document.getElementById('f-cat-merc')?.value||'';
  const activo = document.getElementById('f-activo-merc')?.value||'';
  const filtered = allMercancias.filter(m => {
    const matchQ = !q || m.nombre.toLowerCase().includes(q);
    const matchC = !cat || m.categoria===cat;
    const matchA = activo==='' || String(m.activo)===activo;
    return matchQ && matchC && matchA;
  });
  renderMercanciasTable(filtered);
}

function openMercanciaModal(id = null) {
  mercEditId = id;
  const m = id ? allMercancias.find(x => x.id===id) : null;
  document.getElementById('modal-merc-title').textContent = id ? 'Editar Mercancía' : 'Nueva Mercancía';
  document.getElementById('merc-nombre').value = m?.nombre||'';
  document.getElementById('merc-categoria').value = m?.categoria||'';
  document.getElementById('merc-unidad').value = m?.unidad_medida||'kg';
  document.getElementById('merc-peso-racion').value = m?.peso_racion_kg||'';
  document.getElementById('merc-precio').value = m?.precio_kg||'';
  document.getElementById('merc-es-insumo').checked = m ? m.es_insumo : true;
  document.getElementById('merc-es-resultado').checked = m ? m.es_resultado : true;
  togglePesoRacionField();
  document.getElementById('modal-mercancia').classList.add('open');
}

function closeMercanciaModal() {
  document.getElementById('modal-mercancia').classList.remove('open');
  mercEditId = null;
}

function togglePesoRacionField() {
  const u = document.getElementById('merc-unidad')?.value;
  const needsRacion = u==='Rac' || u==='Porcion';
  const row = document.getElementById('peso-racion-row');
  if (row) row.style.display = needsRacion ? '' : 'none';
}

async function saveMercancia(e) {
  e.preventDefault();
  const unidad = document.getElementById('merc-unidad').value;
  const needsRacion = unidad==='Rac'||unidad==='Porcion';
  const pesoRacion = parseFloat(document.getElementById('merc-peso-racion').value)||0;
  if (needsRacion && pesoRacion <= 0) { showToast('Debes declarar el peso por ración (kg).','error'); return; }
  const data = {
    nombre: document.getElementById('merc-nombre').value.trim(),
    categoria: document.getElementById('merc-categoria').value,
    unidad_medida: unidad,
    peso_racion_kg: needsRacion ? pesoRacion : 0,
    precio_kg: parseFloat(document.getElementById('merc-precio').value)||0,
    es_insumo: document.getElementById('merc-es-insumo').checked,
    es_resultado: document.getElementById('merc-es-resultado').checked,
  };
  try {
    if (mercEditId) { await dbUpdateMercancia(mercEditId, data); showToast('Mercancía actualizada.'); }
    else { await dbCreateMercancia(data); showToast('✅ Mercancía creada.'); }
    allMercancias = await dbGetMercancias(false);
    renderMercanciasTable(allMercancias);
    renderFichasRacion();
    closeMercanciaModal();
  } catch(err) { showToast('Error: '+err.message,'error'); }
}

async function toggleMerc(id, activo) {
  try {
    await dbToggleMercancia(id, activo);
    allMercancias = await dbGetMercancias(false);
    filterMercancias();
    showToast(activo?'Mercancía activada.':'Mercancía desactivada.');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function deleteMerc(id) {
  if (!confirm('¿Eliminar esta mercancía? No se puede deshacer.')) return;
  try {
    await dbDeleteMercancia(id);
    allMercancias = allMercancias.filter(m=>m.id!==id);
    filterMercancias();
    showToast('Mercancía eliminada.');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

// Fichas de Ración (sub-sección en mercancías)
function renderFichasRacion() {
  const el = document.getElementById('fichas-racion-list');
  if (!el) return;
  const raciones = allMercancias.filter(m => (m.unidad_medida==='Rac'||m.unidad_medida==='Porcion') && m.activo);
  if (!raciones.length) { el.innerHTML='<div class="empty-state-small">No hay mercancías de tipo Rac/Porcion activas.</div>'; return; }
  el.innerHTML = raciones.map(m=>`
    <div class="ficha-row">
      <div class="ficha-info">
        <span class="ficha-nombre">${CATEGORIA_EMOJI[m.categoria]||''} ${m.nombre}</span>
        <span class="ficha-cat">${m.categoria} · ${m.unidad_medida}</span>
      </div>
      <div class="ficha-editor">
        <span style="font-size:12px;color:#9090a8">1 ${m.unidad_medida} =</span>
        <input type="number" class="row-input" style="width:90px;text-align:right" step="0.001" min="0.001"
          id="ficha-${m.id}" value="${m.peso_racion_kg}" placeholder="0.000"/>
        <span style="font-size:12px;color:#9090a8">kg</span>
        <button class="btn-outline" onclick="updateFicha('${m.id}')">Guardar</button>
      </div>
    </div>`).join('');
}

async function updateFicha(id) {
  const input = document.getElementById('ficha-'+id);
  const val = parseFloat(input?.value)||0;
  if (val<=0) { showToast('El peso por ración debe ser mayor a 0.','error'); return; }
  try {
    await dbUpdateMercancia(id, { peso_racion_kg: val });
    allMercancias = await dbGetMercancias(false);
    showToast('✅ Ficha de ración actualizada.');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

// ===== IMPORT EXCEL =====
let importRows = [];

function openImportModal() { document.getElementById('modal-import').classList.add('open'); }
function closeImportModal() { document.getElementById('modal-import').classList.remove('open'); clearImport(); }

function downloadTemplate() {
  const csv = 'nombre,categoria,unidad_medida,peso_racion_kg,precio_kg,es_insumo,es_resultado\nPechuga Entera Rac,Pollo,Rac,0.200,5.50,TRUE,TRUE\nLomo Fino Kg,Vacuno,kg,0,12.00,TRUE,TRUE\nFilete U,Vacuno,U,0,0,FALSE,TRUE\n';
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download='plantilla_mercancias.csv'; a.click();
}

function handleDrop(e) {
  e.preventDefault(); document.getElementById('drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0]; if (file) processExcel(file);
}

function handleExcelFile(e) { const f=e.target.files[0]; if(f) processExcel(f); }

function processExcel(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type:'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval:'' });
      importRows = data.map(r => ({
        nombre: String(r.nombre||'').trim(),
        categoria: String(r.categoria||'Otro').trim(),
        unidad_medida: String(r.unidad_medida||'kg').trim(),
        peso_racion_kg: parseFloat(r.peso_racion_kg)||0,
        precio_kg: parseFloat(r.precio_kg)||0,
        es_insumo: String(r.es_insumo).toUpperCase()==='TRUE'||r.es_insumo===1,
        es_resultado: String(r.es_resultado).toUpperCase()==='TRUE'||r.es_resultado===1,
        activo: true
      })).filter(r=>r.nombre);
      showImportPreview();
    } catch(err){ showToast('Error al leer el archivo: '+err.message,'error'); }
  };
  reader.readAsBinaryString(file);
}

function showImportPreview() {
  document.getElementById('import-preview').classList.remove('hidden');
  document.getElementById('preview-count').textContent = importRows.length+' mercancías encontradas';
  document.getElementById('preview-thead').innerHTML='<tr><th>Nombre</th><th>Categoría</th><th>Unidad</th><th>Peso Ración</th><th>Precio/kg</th></tr>';
  document.getElementById('preview-tbody').innerHTML = importRows.slice(0,10).map(r=>`<tr>
    <td>${r.nombre}</td><td>${r.categoria}</td><td>${r.unidad_medida}</td>
    <td>${(r.unidad_medida==='Rac'||r.unidad_medida==='Porcion')?r.peso_racion_kg+' kg':'—'}</td>
    <td>${r.precio_kg>0?'$'+r.precio_kg:'—'}</td>
  </tr>`).join('');
  document.getElementById('btn-confirm-import').disabled = false;
}

function clearImport() {
  importRows=[];
  document.getElementById('import-preview').classList.add('hidden');
  document.getElementById('btn-confirm-import').disabled=true;
  document.getElementById('excel-file').value='';
}

async function confirmImport() {
  if (!importRows.length) return;
  try {
    await dbImportMercancias(importRows);
    allMercancias = await dbGetMercancias(false);
    renderMercanciasTable(allMercancias);
    renderFichasRacion();
    showToast('✅ '+importRows.length+' mercancías importadas.');
    closeImportModal();
  } catch(e){ showToast('Error al importar: '+e.message,'error'); }
}

// ===== ENCARGADOS ADMIN =====
let encEditId = null;

function renderEncargadosTable(encs) {
  const tbody = document.getElementById('enc-table-body');
  if (!tbody) return;
  setText('enc-count', encs.length+' encargados');
  if (!encs.length){ tbody.innerHTML='<tr><td colspan="5" class="empty-cell">Sin encargados. Crea el primero.</td></tr>'; return; }
  tbody.innerHTML = encs.map(e=>`<tr style="${!e.activo?'opacity:0.45':''}">
    <td><strong>${e.nombre}</strong></td>
    <td>${e.cargo||'—'}</td>
    <td>${e.activo?'<span class="badge badge-aprobado">Activo</span>':'<span class="badge badge-obs">Inactivo</span>'}</td>
    <td>${fmtDate(e.created_at)}</td>
    <td><div class="table-actions">
      <button class="btn-icon-sm" onclick="openEncModal('${e.id}')">✏️</button>
      <button class="btn-icon-sm" onclick="toggleEnc('${e.id}',${!e.activo})">${e.activo?'🚫':'✅'}</button>
      <button class="btn-icon-sm" style="color:#e63946" onclick="deleteEnc('${e.id}')">🗑</button>
    </div></td>
  </tr>`).join('');
}

function openEncModal(id=null) {
  encEditId=id;
  const e=id?allEncargados.find(x=>x.id===id):null;
  document.getElementById('modal-enc-title').textContent=id?'Editar Encargado':'Nuevo Encargado';
  document.getElementById('enc-nombre').value=e?.nombre||'';
  document.getElementById('enc-cargo').value=e?.cargo||'';
  document.getElementById('modal-encargado').classList.add('open');
}

function closeEncModal(){ document.getElementById('modal-encargado').classList.remove('open'); encEditId=null; }

async function saveEncargado(e) {
  e.preventDefault();
  const data={ nombre:document.getElementById('enc-nombre').value.trim(), cargo:document.getElementById('enc-cargo').value.trim() };
  if (!data.nombre){ showToast('El nombre es obligatorio.','error'); return; }
  try {
    if (encEditId){ await dbUpdateEncargado(encEditId,data); showToast('Encargado actualizado.'); }
    else { await dbCreateEncargado(data); showToast('✅ Encargado creado.'); }
    allEncargados=await dbGetEncargados();
    renderEncargadosTable(allEncargados);
    closeEncModal();
  } catch(err){ showToast('Error: '+err.message,'error'); }
}

async function toggleEnc(id,activo) {
  try {
    await dbUpdateEncargado(id,{activo});
    allEncargados=await dbGetEncargados();
    renderEncargadosTable(allEncargados);
  } catch(e){ showToast('Error: '+e.message,'error'); }
}

async function deleteEnc(id) {
  if (!confirm('¿Eliminar este encargado?')) return;
  try {
    await dbDeleteEncargado(id);
    allEncargados=allEncargados.filter(e=>e.id!==id);
    renderEncargadosTable(allEncargados);
  } catch(e){ showToast('Error: '+e.message,'error'); }
}

// ===== REPORTES =====
function renderReportes() {
  renderRepList('rep-rendimiento', buildRendReport(), '#2ecc71');
  renderRepList('rep-merma',       buildMermaReport(), '#e63946');
  renderRepList('rep-turno',       buildTurnoReport(), '#f4a422');
  renderRepList('rep-estados',     buildEstadoReport(), '#4361ee');
}

function renderRepList(elId, items, color) {
  const el=document.getElementById(elId); if(!el) return;
  if (!items.length){ el.innerHTML='<div class="empty-state-small">Sin datos</div>'; return; }
  const max=items[0].val;
  el.innerHTML=items.map(item=>`
    <div class="report-item">
      <span class="report-label">${item.label}</span>
      <div class="report-bar-wrap"><div class="report-bar-bg">
        <div class="report-bar-fill" style="width:${max>0?(item.val/max*100).toFixed(0):0}%;background:${color}"></div>
      </div></div>
      <span class="report-value">${item.display}</span>
    </div>`).join('');
}

function buildRendReport() {
  const map={};
  allProducciones.forEach(p=>(p.produccion_resultados||[]).forEach(r=>{
    const n=r.mercancias?.nombre||'?';
    if (!map[n]) map[n]={sum:0,count:0};
    map[n].sum+=parseFloat(r.rendimiento_pct||0); map[n].count++;
  }));
  return Object.entries(map).map(([l,v])=>({label:l,val:v.sum/v.count,display:(v.sum/v.count).toFixed(1)+'%'})).sort((a,b)=>b.val-a.val);
}

function buildMermaReport() {
  const map={};
  allProducciones.forEach(p=>(p.produccion_resultados||[]).forEach(r=>{
    const cat=r.mercancias?.categoria||'Otro';
    map[cat]=(map[cat]||0)+parseFloat(r.merma_kg||0);
  }));
  return Object.entries(map).map(([l,v])=>({label:l,val:v,display:v.toFixed(2)+' kg'})).sort((a,b)=>b.val-a.val);
}

function buildTurnoReport() {
  const map={};
  allProducciones.forEach(p=>{ const t=p.turno; map[t]=(map[t]||0)+sumKgNeto([p]); });
  return Object.entries(map).map(([l,v])=>({label:l,val:v,display:v.toFixed(2)+' kg'})).sort((a,b)=>b.val-a.val);
}

function buildEstadoReport() {
  const map={};
  allProducciones.forEach(p=>{ map[p.estado]=(map[p.estado]||0)+1; });
  return Object.entries(map).map(([l,v])=>({label:l,val:v,display:v+' lotes'})).sort((a,b)=>b.val-a.val);
}
