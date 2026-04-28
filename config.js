// ============================================================
// CarnePro v2 — Configuración
// ⚠️  Reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con tus credenciales
//     Supabase Dashboard → Settings → API
// ============================================================

const SUPABASE_URL      = 'https://gfdrwgcagjnjmlgbctza.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZHJ3Z2NhZ2puam1sZ2JjdHphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjY1MDMsImV4cCI6MjA5MjkwMjUwM30.MFmmuY3sELpmIg-eMv7cV09gejogiSmywNYcbQJuhZ0';

// Roles y PINs (se validan localmente, no se envían a Supabase)
const ROLES = {
  Carniceria: {
    pin: '123456',
    label: 'Carnicería',
    emoji: '🔪',
    color: '#e63946',
    permisos: ['dashboard', 'registrar', 'producciones']
  },
  Contabilidad: {
    pin: '910331',
    label: 'Contabilidad',
    emoji: '📊',
    color: '#4361ee',
    permisos: ['dashboard', 'registrar', 'producciones', 'mercancias', 'reportes']
  }
};

// Opciones de turno
const TURNOS = ['Mañana', 'Tarde', 'Noche'];

// Categorías de mercancías
const CATEGORIAS = ['Vacuno', 'Cerdo', 'Pollo', 'Cordero', 'Embutidos', 'Otro'];

const CATEGORIA_EMOJI = {
  Vacuno: '🐄', Cerdo: '🐷', Pollo: '🐔',
  Cordero: '🐑', Embutidos: '🌭', Otro: '📦'
};

const CATEGORIA_COLOR = {
  Vacuno: '#e63946', Cerdo: '#f4a422', Pollo: '#ffd166',
  Cordero: '#2ecc71', Embutidos: '#4361ee', Otro: '#9090a8'
};

// Estados de producción
const ESTADOS = ['En proceso', 'Listo', 'Aprobado', 'Observación', 'Rechazado'];
