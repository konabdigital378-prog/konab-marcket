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

export const VILLES_COORDS = {
  'Ouagadougou': { lat: 12.3714, lng: -1.5197 },
  'Bobo-Dioulasso': { lat: 11.1771, lng: -4.2979 },
  'Koudougou': { lat: 12.2526, lng: -2.3628 },
  'Banfora': { lat: 10.6333, lng: -4.7667 },
  'Ouahigouya': { lat: 13.5828, lng: -2.4216 },
  'Kaya': { lat: 13.0917, lng: -1.0844 },
  'Tenkodogo': { lat: 11.7833, lng: -0.3667 },
  'Fada N\'Gourma': { lat: 12.0667, lng: 0.3667 },
  'Dédougou': { lat: 12.4667, lng: -3.4667 },
  'Manga': { lat: 11.6667, lng: -1.0667 },
  'Réo': { lat: 12.3167, lng: -2.4667 },
  'Gaoua': { lat: 10.3333, lng: -3.1833 },
  'Diapaga': { lat: 12.0667, lng: 1.7833 },
  'Dori': { lat: 14.0333, lng: -0.0333 },
  'Tougan': { lat: 13.0667, lng: -3.0667 },
  'Nouna': { lat: 12.7333, lng: -3.8667 },
  'Léo': { lat: 11.1000, lng: -2.1000 },
  'Kombissiri': { lat: 12.0667, lng: -1.3333 },
  'Ziniaré': { lat: 12.5833, lng: -1.3000 },
  'Autre': { lat: 12.3714, lng: -1.5197 },
};

export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function calcDistanceKm(ville1, ville2) {
  if (!ville1 || !ville2) return 0;
  const c1 = VILLES_COORDS[ville1];
  const c2 = VILLES_COORDS[ville2];
  if (!c1 || !c2) return 0;
  return haversine(c1.lat, c1.lng, c2.lat, c2.lng);
}
