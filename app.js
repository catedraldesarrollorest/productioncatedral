// ===== SESSION & LOGIN =====
let session = { rol: null };
let pinBuffer = '';
let allMercancias = [];
let allProducciones = [];
let allEncargados = [];
let chart = null;

document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('carnepro_session');
  if (saved) { session = JSON.parse(saved); showApp(); }
  updateClock(); setInterval(updateClock, 1000);
});

document.addEventListener('keydown', (e) => {
  const pinStep = document.getElementById('login-step-pin');
  if (!pinStep || pinStep.classList.contains('hidden')) return;
  
  if (e.key >= '0' && e.key <= '9') {
    pinPress(e.key);
  } else if (e.key === 'Backspace') {
    pinDel();
  } else if (e.key === 'Escape') {
    pinClear();
  }
});

function updateClock() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleString('es-ES', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function selectRol(rol) {
  session.rol = rol; pinBuffer = '';
  document.getElementById('login-step-rol').classList.add('hidden');
  document.getElementById('login-step-pin').classList.remove('hidden');
  document.getElementById('pin-label').textContent = `PIN — ${ROLES[rol].label}`;
  updateDots();
}

function backToRol() {
  document.getElementById('login-step-pin').classList.add('hidden');
  document.getElementById('login-step-rol').classList.remove('hidden');
  document.getElementById('pin-error').classList.add('hidden');
  pinBuffer = ''; session.rol = null;
}

function pinPress(d) {
  if (pinBuffer.length >= 6) return;
  pinBuffer += d; updateDots();
  if (pinBuffer.length === 6) setTimeout(checkPin, 150);
}
function pinDel()   { pinBuffer = pinBuffer.slice(0,-1); updateDots(); }
function pinClear() { pinBuffer = ''; updateDots(); }

function updateDots() {
  document.querySelectorAll('.pin-dot').forEach((d,i) => d.classList.toggle('filled', i < pinBuffer.length));
}

function checkPin() {
  if (pinBuffer === ROLES[session.rol].pin) {
    sessionStorage.setItem('carnepro_session', JSON.stringify(session));
    showApp();
  } else {
    document.getElementById('pin-error').classList.remove('hidden');
    pinBuffer = ''; updateDots();
    setTimeout(() => document.getElementById('pin-error').classList.add('hidden'), 2200);
  }
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  buildSidebar(); setUserBadge();
  navigateTo('dashboard'); loadAllData();
}

function logout() {
  sessionStorage.removeItem('carnepro_session');
  session = { rol: null };
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-step-pin').classList.add('hidden');
  document.getElementById('login-step-rol').classList.remove('hidden');
  pinBuffer = '';
}

function buildSidebar() {
  const rol = ROLES[session.rol];
  const items = [
    { id:'dashboard',    icon:'📊', label:'Dashboard' },
    { id:'registrar',    icon:'➕', label:'Registrar' },
    { id:'producciones', icon:'📋', label:'Producciones' },
  ];
  if (rol.permisos.includes('mercancias')) {
    items.push({ divider:true, label:'Administración' });
    items.push({ id:'mercancias',  icon:'🏷️', label:'Mercancías' });
    items.push({ id:'encargados',  icon:'👥', label:'Encargados' });
    items.push({ id:'reportes',    icon:'📈', label:'Reportes' });
  }
  document.getElementById('sidebar-nav').innerHTML = items.map(i => i.divider
    ? `<div class="nav-divider"></div><div class="nav-section-label">${i.label}</div>`
    : `<button class="nav-item" id="nav-${i.id}" onclick="navigateTo('${i.id}')"><span class="nav-icon">${i.icon}</span><span>${i.label}</span></button>`
  ).join('');
}

function setUserBadge() {
  const rol = ROLES[session.rol];
  document.getElementById('user-avatar').textContent = rol.emoji;
  document.getElementById('user-name').textContent = rol.label;
  document.getElementById('user-role').textContent = session.rol;
  document.getElementById('user-avatar').style.background = `linear-gradient(135deg,${rol.color},#f4a422)`;
}

// ===== NAVIGATION =====
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  const nv = document.getElementById('nav-' + page);
  if (nv) nv.classList.add('active');
  const titles = { dashboard:'Dashboard', registrar:'Registrar Producción', producciones:'Producciones', mercancias:'Mercancías', encargados:'Encargados', reportes:'Reportes' };
  document.getElementById('page-title').textContent = titles[page] || page;
  if (page==='dashboard')    renderDashboard();
  if (page==='registrar')    initRegistrarForm();
  if (page==='producciones') renderProduccionesTable(allProducciones);
  if (page==='mercancias')   renderMercanciasTable(allMercancias);
  if (page==='encargados')   renderEncargadosTable(allEncargados);
  if (page==='reportes')     renderReportes();
  if (window.innerWidth<=768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  }
}

function toggleSidebar() {
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sidebar-overlay');
  const mc=document.getElementById('main-content');
  if (window.innerWidth<=768) {
    sb.classList.toggle('open');
    ov.classList.toggle('visible');
  } else {
    sb.classList.toggle('collapsed');
    mc.classList.toggle('expanded');
  }
}

// ===== LOAD DATA =====
async function loadAllData() {
  setBadge('loading','⟳ Conectando...');
  try {
    [allMercancias, allEncargados] = await Promise.all([dbGetMercancias(false), dbGetEncargados()]);
    const stats = await dbGetStats();
    allProducciones = stats.producciones;
    setBadge('ok','● Conectado');
    renderDashboard();
  } catch(e) {
    console.error(e);
    setBadge('err','✕ Sin conexión');
    showToast('Error de conexión. Verifica las credenciales en config.js','error');
  }
}

function setBadge(type, text) {
  const el=document.getElementById('conn-badge');
  el.className='status-badge '+type;
  el.innerHTML=`<span class="status-dot"></span><span class="status-text"> ${text}</span>`;
}

// ===== DASHBOARD =====
function renderDashboard() {
  const today=new Date().toDateString();
  const weekAgo=new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const todayP=allProducciones.filter(p=>new Date(p.fecha).toDateString()===today);
  const weekP =allProducciones.filter(p=>new Date(p.fecha)>=weekAgo);
  const aprob =allProducciones.filter(p=>p.estado==='Aprobado').length;
  setText('kpi-kg-hoy',   sumKgNeto(todayP).toFixed(2)+' kg');
  setText('kpi-lotes-hoy',todayP.length+' lotes hoy');
  setText('kpi-activos',  allProducciones.filter(p=>p.estado==='En proceso').length);
  setText('kpi-aprobados',aprob);
  setText('kpi-aprobados-pct', allProducciones.length ? (aprob/allProducciones.length*100).toFixed(0)+'% del total':'—');
  setText('kpi-kg-semana',sumKgNeto(weekP).toFixed(2)+' kg');
  setText('kpi-lotes-semana',weekP.length+' lotes esta semana');
  renderCatList(); renderDashChart('semana'); renderDashRecent();
}

function sumKgNeto(prods) {
  return prods.reduce((s,p)=>s+(p.produccion_resultados||[]).reduce((a,r)=>a+parseFloat(r.peso_neto_kg||0),0),0);
}
function calcTotalBruto(prods) {
  return prods.reduce((s,p)=>s+(p.produccion_insumos||[]).reduce((a,i)=>a+parseFloat(i.peso_bruto_kg||0),0),0);
}
function calcTotalMerma(prods) {
  return calcTotalBruto(prods) - sumKgNeto(prods);
}
function calcRend(prods) {
  const n=sumKgNeto(prods), b=calcTotalBruto(prods);
  return b>0?(n/b*100).toFixed(1):0;
}
function rendClass(pct){ return pct>=85?'calc-good':pct>=70?'calc-warn':'calc-bad'; }

function renderCatList() {
  const el=document.getElementById('category-list');
  const totals={};
  allProducciones.forEach(p=>(p.produccion_resultados||[]).forEach(r=>{
    const cat=r.mercancias?.categoria||'Otro';
    totals[cat]=(totals[cat]||0)+parseFloat(r.peso_neto_kg||0);
  }));
  const total=Object.values(totals).reduce((a,b)=>a+b,0);
  const sorted=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  el.innerHTML=sorted.length?sorted.map(([cat,kg])=>`
    <div class="category-item">
      <div class="cat-dot" style="background:${CATEGORIA_COLOR[cat]||'#666'}"></div>
      <span class="cat-name">${CATEGORIA_EMOJI[cat]||''} ${cat}</span>
      <span class="cat-kg">${kg.toFixed(1)} kg</span>
      <span class="cat-pct">${total>0?(kg/total*100).toFixed(0):0}%</span>
    </div>`).join(''):'<div class="empty-state-small">Sin datos</div>';
}

function renderDashChart(view) {
  const canvas=document.getElementById('productionChart');
  if (!canvas) return;
  const labels=[],data=[],days=view==='semana'?7:30,now=new Date();
  for (let i=days-1;i>=0;i--) {
    const d=new Date(now); d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString('es-ES',{weekday:'short',day:'numeric'}));
    data.push(+sumKgNeto(allProducciones.filter(p=>new Date(p.fecha).toDateString()===d.toDateString())).toFixed(2));
  }
  if (chart) chart.destroy();
  const ctx=canvas.getContext('2d'),grad=ctx.createLinearGradient(0,0,0,200);
  grad.addColorStop(0,'rgba(230,57,70,0.4)'); grad.addColorStop(1,'rgba(230,57,70,0)');
  chart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'kg',data,borderColor:'#e63946',backgroundColor:grad,borderWidth:2.5,pointBackgroundColor:'#e63946',pointRadius:4,fill:true,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'#2a2a35'},ticks:{color:'#5a5a70',font:{size:10}}},y:{grid:{color:'#2a2a35'},ticks:{color:'#5a5a70',font:{size:10}},beginAtZero:true}}}});
}

function setChartView(v,btn) {
  document.querySelectorAll('.card-actions .btn-ghost').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderDashChart(v);
}

function renderDashRecent() {
  const tbody=document.getElementById('dash-recent-body');
  const recent=allProducciones.slice(0,6);
  if (!recent.length){tbody.innerHTML='<tr><td colspan="7" class="empty-cell">Sin registros aún.</td></tr>';return;}
  tbody.innerHTML=recent.map(p=>`<tr>
    <td data-label="Insumos">${(p.produccion_insumos||[]).map(i=>i.mercancias?.nombre||'—').join(', ')||'—'}</td>
    <td data-label="Materiales">${(p.produccion_resultados||[]).map(r=>r.mercancias?.nombre||'—').join(', ')||'—'}</td>
    <td data-label="Kg Neto">${sumKgNeto([p]).toFixed(2)} kg</td>
    <td data-label="Merma">${calcTotalMerma([p]).toFixed(2)} kg</td>
    <td data-label="Rend." class="${rendClass(calcRend([p]))}">${calcRend([p])}%</td>
    <td data-label="Estado">${badgeHTML(p.estado)}</td><td data-label="Fecha">${fmtDate(p.fecha)}</td>
  </tr>`).join('');
}

// ===== HELPERS =====
function setText(id,val){ const e=document.getElementById(id); if(e) e.textContent=val; }
function badgeHTML(estado){
  const m={'En proceso':'badge-proceso','Listo':'badge-listo','Aprobado':'badge-aprobado','Observación':'badge-obs','Rechazado':'badge-rechazado'};
  return `<span class="badge ${m[estado]||''}">${estado}</span>`;
}
function fmtDate(str){ if(!str) return '—'; return new Date(str).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function showToast(msg,type='success'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.style.borderLeftColor=type==='error'?'#e63946':'#2ecc71';
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3500);
}
