// ===== REGISTRAR FORM =====
let insumoRows = [], resultadoRows = [];

function initRegistrarForm() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('prod-fecha').value = now.toISOString().slice(0,16);
  document.getElementById('prod-observaciones').value = '';
  populateEncargadoSelect();
  insumoRows = []; resultadoRows = [];
  renderInsumos(); renderResultados();
}

function populateEncargadoSelect() {
  const sel = document.getElementById('prod-encargado');
  if (!sel) return;
  const activos = allEncargados.filter(e => e.activo);
  sel.innerHTML = '<option value="">— Seleccionar encargado —</option>' +
    activos.map(e => `<option value="${e.id}">${e.nombre}${e.cargo ? ' — ' + e.cargo : ''}</option>`).join('');
}

function addInsumoRow() {
  const insumos = allMercancias.filter(m => m.activo && m.es_insumo);
  if (!insumos.length) { showToast('No hay mercancías de entrada. Crea mercancías primero.', 'error'); return; }
  insumoRows.push({ mercancia_id: '', peso_bruto_kg: '' });
  renderInsumos();
}

function renderInsumos() {
  const tbody = document.getElementById('insumos-body');
  const empty = document.getElementById('insumos-empty');
  if (!insumoRows.length) { empty && (empty.style.display=''); tbody.innerHTML = ''; return; }
  empty && (empty.style.display='none');
  const insumos = allMercancias.filter(m => m.activo && m.es_insumo);
  tbody.innerHTML = insumoRows.map((row, i) => `
    <tr>
      <td>
        <select class="row-input row-select" onchange="insumoRows[${i}].mercancia_id=this.value">
          <option value="">— Mercancía —</option>
          ${insumos.map(m => `<option value="${m.id}" ${m.id===row.mercancia_id?'selected':''}>${CATEGORIA_EMOJI[m.categoria]||''} ${m.nombre}</option>`).join('')}
        </select>
      </td>
      <td><input type="number" class="row-input" style="width:120px" step="0.001" min="0.001" placeholder="0.000"
          value="${row.peso_bruto_kg}" onchange="insumoRows[${i}].peso_bruto_kg=parseFloat(this.value)||0;updateTotals()"/></td>
      <td><button type="button" class="btn-icon-sm" style="color:#e63946" onclick="removeInsumo(${i})">✕</button></td>
    </tr>`).join('');
  updateTotals();
}

function removeInsumo(i) { insumoRows.splice(i,1); renderInsumos(); }

function addResultadoRow() {
  const resultados = allMercancias.filter(m => m.activo && m.es_resultado);
  if (!resultados.length) { showToast('No hay mercancías de salida. Crea mercancías primero.', 'error'); return; }
  resultadoRows.push({ mercancia_id: '', porciones: 0, peso_neto_kg: '' });
  renderResultados();
}

function renderResultados() {
  const tbody = document.getElementById('resultados-body');
  const empty = document.getElementById('resultados-empty');
  if (!resultadoRows.length) { empty && (empty.style.display=''); tbody.innerHTML = ''; return; }
  empty && (empty.style.display='none');
  const mList = allMercancias.filter(m => m.activo && m.es_resultado);
  tbody.innerHTML = resultadoRows.map((row, i) => {
    return `<tr>
      <td>
        <select class="row-input row-select" style="min-width:180px"
            onchange="updateResultadoMerc(${i}, this.value)">
          <option value="">— Mercancía —</option>
          ${mList.map(m => `<option value="${m.id}" ${m.id===row.mercancia_id?'selected':''}>${CATEGORIA_EMOJI[m.categoria]||''} ${m.nombre} (${m.unidad_medida})</option>`).join('')}
        </select>
      </td>
      <td><input type="number" class="row-input" style="width:90px" step="1" min="0" placeholder="0"
          value="${row.porciones}" onchange="updatePorciones(${i}, this.value)"/></td>
      <td><input type="number" class="row-input" style="width:110px" step="0.001" min="0" placeholder="0.000"
          value="${row.peso_neto_kg}" onchange="resultadoRows[${i}].peso_neto_kg=parseFloat(this.value)||0;updateTotals()"/></td>
      <td><button type="button" class="btn-icon-sm" style="color:#e63946" onclick="removeResultado(${i})">✕</button></td>
    </tr>`;
  }).join('');
  updateTotals();
}

function updateResultadoMerc(i, val) {
  resultadoRows[i].mercancia_id = val;
  const merc = allMercancias.find(m => m.id === val);
  if (merc && (merc.unidad_medida === 'Rac' || merc.unidad_medida === 'Porcion')) {
    resultadoRows[i].peso_neto_kg = resultadoRows[i].porciones * (merc.peso_racion_kg || 0);
  }
  updateTotals();
  renderResultados();
}

function updatePorciones(i, val) {
  resultadoRows[i].porciones = parseInt(val) || 0;
  const merc = allMercancias.find(m => m.id === resultadoRows[i].mercancia_id);
  if (merc && (merc.unidad_medida === 'Rac' || merc.unidad_medida === 'Porcion')) {
    resultadoRows[i].peso_neto_kg = resultadoRows[i].porciones * (merc.peso_racion_kg || 0);
  }
  updateTotals();
  renderResultados();
}

function removeResultado(i) { resultadoRows.splice(i,1); renderResultados(); }

function updateTotals() {
  const bruto = insumoRows.reduce((s,r)=>s+(parseFloat(r.peso_bruto_kg)||0),0);
  const neto  = resultadoRows.reduce((s,r)=>s+(parseFloat(r.peso_neto_kg)||0),0);
  const rend  = bruto>0?(neto/bruto*100).toFixed(1):'—';
  
  // As requested, total merma is against Total Bruto
  const merma = bruto > 0 ? (bruto - neto) : 0;

  setText('total-bruto', bruto.toFixed(3)+' kg');
  setText('total-neto',  neto.toFixed(3)+' kg');
  setText('total-merma', merma.toFixed(3)+' kg');
  const rendEl = document.getElementById('total-rend');
  if (rendEl) { rendEl.textContent=rend+'%'; rendEl.className='tfoot-value rend-pct '+rendClass(rend); }
}

async function submitProduction(e) {
  e.preventDefault();
  const encargadoId = document.getElementById('prod-encargado')?.value;
  if (!encargadoId) { showToast('Selecciona un encargado.','error'); return; }
  const validInsumos = insumoRows.filter(r=>r.mercancia_id&&parseFloat(r.peso_bruto_kg)>0);
  const validResultados = resultadoRows.filter(r=>r.mercancia_id&&parseFloat(r.peso_neto_kg)>=0);
  if (!validInsumos.length) { showToast('Agrega al menos un producto de entrada.','error'); return; }
  if (!validResultados.length) { showToast('Agrega al menos un material de producción.','error'); return; }

  const totalBruto = validInsumos.reduce((s,r)=>s+(parseFloat(r.peso_bruto_kg)||0),0);
  const btn = document.getElementById('submit-btn');
  btn.disabled=true; document.getElementById('submit-label').textContent='Guardando...';

  const fecha = document.getElementById('prod-fecha').value;
  const h = new Date(fecha).getHours();
  const turno = h >= 6 && h < 14 ? 'Mañana' : h >= 14 && h < 22 ? 'Tarde' : 'Noche';
  const produccion = {
    fecha,
    turno,
    rol_usuario: session.rol,
    encargado_id: encargadoId,
    estado: 'Listo',
    observaciones: document.getElementById('prod-observaciones').value
  };

  const insumos = validInsumos.map(r=>({ mercancia_id:r.mercancia_id, peso_bruto_kg:parseFloat(r.peso_bruto_kg) }));

  const totalNeto = validResultados.reduce((s,r)=>s+(parseFloat(r.peso_neto_kg)||0), 0);
  const globalMerma = Math.max(0, totalBruto - totalNeto);

  const resultados = validResultados.map(r=>{
    const neto = parseFloat(r.peso_neto_kg)||0;
    const proporcion = totalNeto > 0 ? neto / totalNeto : 0;
    return {
      mercancia_id: r.mercancia_id,
      porciones: r.porciones||0,
      peso_neto_kg: neto,
      peso_esperado_kg: totalBruto,
      merma_kg: globalMerma * proporcion,
      rendimiento_pct: totalBruto > 0 ? (neto/totalBruto*100) : 0,
      variacion_racion_pct: totalBruto > 0 ? (neto/totalBruto*100) : 0
    };
  });

  try {
    await dbSaveProduccion(produccion, insumos, resultados);
    showToast('✅ Producción registrada correctamente');
    const stats=await dbGetStats(); allProducciones=stats.producciones;
    resetProductionForm(); navigateTo('dashboard');
  } catch(err) {
    showToast('Error al guardar: '+err.message,'error');
  } finally {
    btn.disabled=false; document.getElementById('submit-label').textContent='Registrar Producción';
  }
}

function resetProductionForm() {
  insumoRows=[]; resultadoRows=[];
  renderInsumos(); renderResultados(); updateTotals();
  initRegistrarForm();
}

// ===== PRODUCCIONES TABLE =====
let filteredProd = [];

function renderProduccionesTable(prods) {
  filteredProd = prods;
  const tbody=document.getElementById('prod-table-body');
  setText('prod-count', prods.length+' registro'+(prods.length!==1?'s':''));
  if (!prods.length){ tbody.innerHTML='<tr><td colspan="10" class="empty-cell">Sin producciones aún.</td></tr>'; return; }
  tbody.innerHTML=prods.map(p=>{
    const bruto=calcTotalBruto([p]), neto=sumKgNeto([p]), merma=calcTotalMerma([p]), rend=calcRend([p]);
    const enc = allEncargados.find(e=>e.id===p.encargado_id);
    return `<tr>
      <td data-label="Entrada" class="td-clamp">${(p.produccion_insumos||[]).map(i=>i.mercancias?.nombre||'—').join(', ')||'—'}</td>
      <td data-label="Salida" class="td-clamp">${(p.produccion_resultados||[]).map(r=>r.mercancias?.nombre||'—').join(', ')||'—'}</td>
      <td data-label="Kg Bruto">${bruto.toFixed(2)} kg</td>
      <td data-label="Kg Neto">${neto.toFixed(2)} kg</td>
      <td data-label="Merma">${merma.toFixed(2)} kg</td>
      <td data-label="Rend." class="${rendClass(rend)}">${rend}%</td>
      <td data-label="Encargado">${enc?enc.nombre:'—'}</td>
      <td data-label="Estado" class="col-hide-md">${badgeHTML(p.estado)}</td>
      <td data-label="Fecha">${fmtDate(p.fecha)}</td>
      <td data-label="Acciones"><div class="table-actions">
        <button class="btn-icon-sm" onclick="openDetailModal('${p.id}')">👁</button>
        <button class="btn-icon-sm" style="color:#e63946" onclick="deleteProd('${p.id}')">🗑</button>
      </div></td>
    </tr>`;
  }).join('');
}

function applyFilters() {
  const q=(document.getElementById('search-prod')?.value||'').toLowerCase();
  const est=document.getElementById('f-estado')?.value||'';
  const tur=document.getElementById('f-turno')?.value||'';
  const desde=document.getElementById('f-desde')?.value;
  const hasta=document.getElementById('f-hasta')?.value;
  const filtered=allProducciones.filter(p=>{
    const names=[...(p.produccion_insumos||[]).map(i=>i.mercancias?.nombre||''),...(p.produccion_resultados||[]).map(r=>r.mercancias?.nombre||'')].join(' ').toLowerCase();
    const enc=(allEncargados.find(e=>e.id===p.encargado_id)?.nombre||'').toLowerCase();
    const matchQ=!q||names.includes(q)||enc.includes(q)||p.estado.toLowerCase().includes(q);
    const matchE=!est||p.estado===est;
    const matchT=!tur||p.turno===tur;
    const pDate=new Date(p.fecha);
    const matchD=!desde||pDate>=new Date(desde);
    const matchH=!hasta||pDate<=new Date(hasta+'T23:59:59');
    return matchQ&&matchE&&matchT&&matchD&&matchH;
  });
  renderProduccionesTable(filtered);
}

async function deleteProd(id) {
  if (!confirm('¿Eliminar esta producción? No se puede deshacer.')) return;
  try {
    await dbDeleteProduccion(id);
    allProducciones=allProducciones.filter(p=>p.id!==id);
    renderProduccionesTable(allProducciones);
    showToast('Producción eliminada.');
  } catch(e){ showToast('Error: '+e.message,'error'); }
}

function openDetailModal(id) {
  const p=allProducciones.find(x=>x.id===id); if(!p) return;
  const enc=allEncargados.find(e=>e.id===p.encargado_id);
  const body=document.getElementById('detail-body');
  const bruto=calcTotalBruto([p]), neto=sumKgNeto([p]), merma=calcTotalMerma([p]), rend=calcRend([p]);
  body.innerHTML=`
    <div class="detail-grid">
      <div class="detail-item"><label>Fecha</label><span>${fmtDate(p.fecha)}</span></div>
      <div class="detail-item"><label>Turno</label><span>${p.turno}</span></div>
      <div class="detail-item"><label>Encargado</label><span>${enc?enc.nombre:'—'}</span></div>
      <div class="detail-item"><label>Estado</label><span>${badgeHTML(p.estado)}</span></div>
      <div class="detail-item"><label>Kg Bruto Total</label><span>${bruto.toFixed(3)} kg</span></div>
      <div class="detail-item"><label>Kg Neto Total</label><span>${neto.toFixed(3)} kg</span></div>
      <div class="detail-item"><label>Merma Total</label><span>${merma.toFixed(3)} kg</span></div>
      <div class="detail-item"><label>Rendimiento</label><span class="${rendClass(rend)}">${rend}%</span></div>
    </div>
    <div class="detail-section-title">Productos de Entrada</div>
    ${(p.produccion_insumos||[]).map(i=>`<div style="padding:4px 0;font-size:13px;color:#9090a8">${i.mercancias?.nombre||'?'} — <b style="color:#f0f0f5">${parseFloat(i.peso_bruto_kg).toFixed(3)} kg</b></div>`).join('')||'<span style="color:#5a5a70">—</span>'}
    <div class="detail-section-title">Materiales de Producción</div>
    ${(p.produccion_resultados||[]).map(r=>`<div style="padding:4px 0;font-size:13px;color:#9090a8">${r.mercancias?.nombre||'?'} — <b style="color:#f0f0f5">${r.porciones} porciones / ${parseFloat(r.peso_neto_kg).toFixed(3)} kg</b></div>`).join('')||'<span style="color:#5a5a70">—</span>'}
    ${p.observaciones?`<div class="detail-section-title">Observaciones</div><p style="font-size:13px;color:#9090a8">${p.observaciones}</p>`:''}`;
  document.getElementById('detail-delete-btn').onclick=()=>{deleteProd(id);closeDetailModal();};
  document.getElementById('modal-detail').classList.add('open');
}

function closeDetailModal(){ document.getElementById('modal-detail').classList.remove('open'); }

function exportCSV() {
  const prods=filteredProd.length?filteredProd:allProducciones;
  if (!prods.length){showToast('Sin datos para exportar.','error');return;}
  const rows=[['Fecha','Turno','Encargado','Estado','Kg Bruto','Kg Neto','Merma','Rendimiento%','Productos Entrada','Materiales Salida','Observaciones']];
  prods.forEach(p=>{
    const enc=allEncargados.find(e=>e.id===p.encargado_id);
    rows.push([
      fmtDate(p.fecha), p.turno, enc?enc.nombre:'—', p.estado,
      calcTotalBruto([p]).toFixed(3), sumKgNeto([p]).toFixed(3),
      calcTotalMerma([p]).toFixed(3), calcRend([p]),
      (p.produccion_insumos||[]).map(i=>i.mercancias?.nombre||'?').join(' | '),
      (p.produccion_resultados||[]).map(r=>`${r.mercancias?.nombre||'?'}(${r.porciones}p,${parseFloat(r.peso_neto_kg).toFixed(2)}kg)`).join(' | '),
      p.observaciones||''
    ]);
  });
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download='carnepro_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click(); showToast('✅ CSV exportado');
}
