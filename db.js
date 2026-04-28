// ============================================================
// CarnePro v2 — Capa de Base de Datos (Supabase)
// ============================================================

let _supabase = null;

function getDB() {
  if (!_supabase) {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ============================================================
// MERCANCÍAS
// ============================================================

async function dbGetMercancias(soloActivas = true) {
  const db = getDB();
  let q = db.from('mercancias').select('*').order('nombre');
  if (soloActivas) q = q.eq('activo', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function dbCreateMercancia(m) {
  const db = getDB();
  const { data, error } = await db.from('mercancias').insert([m]).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdateMercancia(id, campos) {
  const db = getDB();
  const { data, error } = await db.from('mercancias').update(campos).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function dbToggleMercancia(id, activo) {
  return dbUpdateMercancia(id, { activo });
}

async function dbDeleteMercancia(id) {
  const db = getDB();
  const { error } = await db.from('mercancias').delete().eq('id', id);
  if (error) throw error;
}

async function dbImportMercancias(rows) {
  const db = getDB();
  const { data, error } = await db.from('mercancias').insert(rows).select();
  if (error) throw error;
  return data;
}

// ============================================================
// PRODUCCIONES
// ============================================================

async function dbGetProducciones(filtros = {}) {
  const db = getDB();
  let q = db.from('producciones')
    .select(`
      *,
      produccion_insumos ( *, mercancias(nombre, categoria) ),
      produccion_resultados ( *, mercancias(nombre, categoria, peso_racion_kg) )
    `)
    .order('fecha', { ascending: false });

  if (filtros.estado) q = q.eq('estado', filtros.estado);
  if (filtros.turno)  q = q.eq('turno', filtros.turno);
  if (filtros.desde)  q = q.gte('fecha', filtros.desde);
  if (filtros.hasta)  q = q.lte('fecha', filtros.hasta);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function dbSaveProduccion(produccion, insumos, resultados) {
  const db = getDB();

  // 1. Insertar producción principal
  const { data: prod, error: errProd } = await db
    .from('producciones').insert([produccion]).select().single();
  if (errProd) throw errProd;

  // 2. Insertar insumos
  if (insumos.length > 0) {
    const insumosConId = insumos.map(i => ({ ...i, produccion_id: prod.id }));
    const { error: errIns } = await db.from('produccion_insumos').insert(insumosConId);
    if (errIns) throw errIns;
  }

  // 3. Insertar resultados
  if (resultados.length > 0) {
    const resConId = resultados.map(r => ({ ...r, produccion_id: prod.id }));
    const { error: errRes } = await db.from('produccion_resultados').insert(resConId);
    if (errRes) throw errRes;
  }

  return prod;
}

async function dbUpdateEstado(id, estado) {
  const db = getDB();
  const { error } = await db.from('producciones').update({ estado }).eq('id', id);
  if (error) throw error;
}

async function dbDeleteProduccion(id) {
  const db = getDB();
  const { error } = await db.from('producciones').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// ESTADÍSTICAS para Dashboard
// ============================================================

// ============================================================
// ENCARGADOS
// ============================================================

async function dbGetEncargados() {
  const { data, error } = await getDB().from('encargados').select('*').order('nombre');
  if (error) throw error;
  return data || [];
}

async function dbCreateEncargado(e) {
  const { data, error } = await getDB().from('encargados').insert([e]).select().single();
  if (error) throw error; return data;
}

async function dbUpdateEncargado(id, campos) {
  const { data, error } = await getDB().from('encargados').update(campos).eq('id', id).select().single();
  if (error) throw error; return data;
}

async function dbDeleteEncargado(id) {
  const { error } = await getDB().from('encargados').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
async function dbGetStats() {
  const prods = await dbGetProducciones();
  const today = new Date().toDateString();
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  const prodHoy = prods.filter(p => new Date(p.fecha).toDateString() === today);
  const prodSemana = prods.filter(p => new Date(p.fecha) >= weekAgo);

  const kgHoy = prodHoy.reduce((s, p) =>
    s + (p.produccion_resultados || []).reduce((a, r) => a + parseFloat(r.peso_neto_kg || 0), 0), 0);
  const kgSemana = prodSemana.reduce((s, p) =>
    s + (p.produccion_resultados || []).reduce((a, r) => a + parseFloat(r.peso_neto_kg || 0), 0), 0);

  return {
    totalProducciones: prods.length,
    prodHoyCount: prodHoy.length,
    kgHoy: kgHoy.toFixed(2),
    kgSemana: kgSemana.toFixed(2),
    lotesActivos: prods.filter(p => p.estado === 'En proceso').length,
    aprobados: prods.filter(p => p.estado === 'Aprobado').length,
    producciones: prods
  };
}
