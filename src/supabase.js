import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://airddmpofwbstsuhsjxl.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpcmRkbXBvZndic3RzdWhzanhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjM1MTUsImV4cCI6MjA5Nzk5OTUxNX0.BcRyoCZW_OxeGB9H2vgGXHohyOWKAi_w_h-Md5QkvfU';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || 'admin@gmail.com';
export const ADMIN_WHATSAPP = process.env.REACT_APP_ADMIN_WHATSAPP || '22665413799';

export const USSD_CODE = '*144*10*65413799';
export const FORMULAS = {
  basic: { name: 'Basique', price: 0, maxAnnonces: 10, color: '#6B7280', badge: 'Gratuit' },
  premium: { name: 'Premium', price: 2000, maxAnnonces: 50, color: '#D97706', badge: '2 000 FCFA/mois' },
  certified: { name: 'Certifié Entreprise', price: 5000, maxAnnonces: 200, color: '#059669', badge: '5 000 FCFA/mois', entreprise: true },
};

export const SECTEURS = [
  'Agriculture & Élevage', 'Artisanat & Arts', 'Bâtiment & Construction',
  'Commerce & Distribution', 'Éducation & Formation', 'Emploi & Recrutement',
  'Informatique & Tech', 'Immobilier', 'Santé & Bien-être', 'Services à domicile',
  'Restauration & Alimentation', 'Transport & Logistique', 'Mode & Beauté',
  'Événementiel', 'Juridique & Conseil', 'Finance & Assurance',
  'Énergie & Environnement', 'Tourisme & Loisirs', 'Médias & Communication', 'Autres',
];

export const TYPE_ANNONCE = [
  { value: 'offre', label: 'Offre de service', icon: '🛠' },
  { value: 'emploi', label: 'Offre d\'emploi', icon: '💼' },
  { value: 'formation', label: 'Formation', icon: '🎓' },
  { value: 'article', label: 'Article à vendre', icon: '🛍' },
  { value: 'recherche', label: 'Recherche d\'emploi', icon: '🔍' },
];
