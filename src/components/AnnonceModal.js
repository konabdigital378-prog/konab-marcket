import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Image, MapPin, Crosshair, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, SECTEURS, TYPE_ANNONCE, VILLES_COORDS } from '../supabase';
import { useAuth } from '../hooks/useAuth';

const VILLES = Object.keys(VILLES_COORDS);

const STEP_TITLES = ['Type & photos', 'Titre', 'Localisation & prix', 'Contact & publier'];

const TYPE_EMOJIS = {
  offre: '🛒',
  article: '📦',
  service: '🔧',
  emploi: '💼',
  formation: '📚',
  logement: '🏠',
  vehicule: '🚗',
  alimentation: '🍲',
};

const SECTEUR_EMOJIS = [
  ['💻', 'Informatique'], ['📱', 'Téléphonie'], ['👗', 'Mode'], ['🏠', 'Immobilier'],
  ['🚗', 'Véhicules'], ['🍲', 'Alimentation'], ['📚', 'Éducation'], ['🔧', 'Services'],
  ['💼', 'Emploi'], ['🏋️', 'Sport'], ['🎮', 'Divertissement'], ['🌾', 'Agriculture'],
  ['⚕️', 'Santé'], ['🔨', 'Bricolage'], ['🎵', 'Musique'], ['📦', 'Autre'],
];

function TypeCard({ t, selected, onClick }) {
  const emoji = TYPE_EMOJIS[t.value] || '📌';
  return (
    <motion.button type="button"
      onClick={onClick}
      className={`type-card ${selected ? 'active' : ''}`}
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '16px 8px', borderRadius: 16, cursor: 'pointer', border: '2px solid transparent',
        background: selected ? 'rgba(57,211,83,0.12)' : 'rgba(255,255,255,0.04)',
        borderColor: selected ? 'var(--vert)' : 'rgba(255,255,255,0.06)',
        transition: 'var(--transition)', minWidth: 0, flex: '0 0 calc(25% - 10px)',
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: selected ? 'var(--vert)' : 'var(--text2)', textAlign: 'center', lineHeight: 1.2 }}>
        {t.icon} {t.label}
      </span>
    </motion.button>
  );
}

function VilleGrid({ selected, onSelect }) {
  const rows = [];
  for (let i = 0; i < VILLES.length; i += 3) rows.push(VILLES.slice(i, i + 3));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 6 }}>
          {row.map(v => (
            <button key={v} type="button" onClick={() => onSelect(v)}
              style={{
                flex: 1, padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                background: selected === v ? 'rgba(57,211,83,0.15)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${selected === v ? 'var(--vert)' : 'transparent'}`,
                color: selected === v ? 'var(--vert)' : 'var(--text2)',
                fontWeight: selected === v ? 700 : 500, fontSize: 13, textAlign: 'center',
                transition: 'var(--transition)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AnnonceModal({ annonce, onClose, onSaved }) {
  const { user, profile, maxPhotos } = useAuth();
  const maxImg = maxPhotos();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    type: 'offre', titre: '', description: '', prix: '',
    devise: 'FCFA', date_fin: '', whatsapp: '',
    secteur: SECTEURS[0], ville: 'Ouagadougou',
    latitude: null, longitude: null,
  });
  const [imgFiles, setImgFiles] = useState([]);
  const [imgPreviews, setImgPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  const isEdit = !!annonce;

  useEffect(() => {
    if (annonce) {
      setForm({
        type: annonce.type || 'offre', titre: annonce.titre || '',
        description: annonce.description || '', prix: annonce.prix || '',
        devise: annonce.devise || 'FCFA', date_fin: annonce.date_fin || '',
        whatsapp: annonce.whatsapp || '', secteur: annonce.secteur || SECTEURS[0],
        ville: annonce.ville || 'Ouagadougou',
        latitude: annonce.latitude || null, longitude: annonce.longitude || null,
      });
      if (annonce.affiche_url) setImgPreviews([annonce.affiche_url, ...(annonce.images || []).filter(u => u !== annonce.affiche_url)].slice(0, 5));
    } else if (profile?.telephone) {
      setForm(f => ({ ...f, whatsapp: profile.telephone }));
    }
  }, [annonce, profile]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleImg(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const total = imgFiles.length + files.length;
    if (total > maxImg) { setError(`Maximum ${maxImg} images avec votre formule (${total} sélectionnées). Passez en Premium pour plus !`); return; }
    const oversized = files.find(f => f.size > 8 * 1024 * 1024);
    if (oversized) { setError(`Image "${oversized.name}" trop lourde (max 8MB)`); return; }
    setImgFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setImgPreviews(prev => [...prev, ...newPreviews]);
    setError('');
  }

  function removeImg(index) {
    setImgFiles(prev => prev.filter((_, i) => i !== index));
    const removed = imgPreviews[index];
    setImgPreviews(prev => prev.filter((_, i) => i !== index));
    if (removed && removed.startsWith('blob:')) URL.revokeObjectURL(removed);
  }

  function moveImg(from, to) {
    if (to < 0 || to >= imgFiles.length) return;
    const newFiles = [...imgFiles]; [newFiles[from], newFiles[to]] = [newFiles[to], newFiles[from]];
    const newPrevs = [...imgPreviews]; [newPrevs[from], newPrevs[to]] = [newPrevs[to], newPrevs[from]];
    setImgFiles(newFiles);
    setImgPreviews(newPrevs);
  }

  async function handleLocate() {
    if (!navigator.geolocation) { setError('Géolocalisation non supportée'); return; }
    setLocating(true);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      );
      set('latitude', pos.coords.latitude);
      set('longitude', pos.coords.longitude);
      const nearest = Object.entries(VILLES_COORDS).reduce((best, [name, coord]) => {
        const dist = Math.abs(coord.lat - pos.coords.latitude) + Math.abs(coord.lng - pos.coords.longitude);
        return dist < best.dist ? { name, dist } : best;
      }, { name: form.ville, dist: Infinity });
      set('ville', nearest.name);
    } catch (e) {
      setError('Impossible d\'obtenir votre position. Activez la localisation.');
    }
    setLocating(false);
  }

  function handleVilleChange(ville) {
    set('ville', ville);
    const coords = VILLES_COORDS[ville];
    if (coords) { set('latitude', coords.lat); set('longitude', coords.lng); }
  }

  async function uploadImage(file) {
    const { data: { session }, error: sesErr } = await supabase.auth.getSession();
    if (sesErr || !session) throw new Error('Session expirée, reconnectez-vous');
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) throw new Error('Session expirée, reconnectez-vous');
      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (!s2) throw new Error('Session expirée, reconnectez-vous');
      session.access_token = s2.access_token;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const url = `${process.env.REACT_APP_SUPABASE_URL || 'https://airddmpofwbstsuhsjxl.supabase.co'}/storage/v1/object/annonces/${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: file,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Erreur upload image: ${errText}`);
    }
    const { data } = supabase.storage.from('annonces').getPublicUrl(path);
    return data.publicUrl;
  }

  function oldImages() {
    if (!annonce) return [];
    return [annonce.affiche_url, ...(annonce.images || [])].filter(Boolean);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.titre.trim()) { setError('Le titre est requis'); return; }
    if (!form.description.trim()) { setError('La description est requise'); return; }
    if (!form.whatsapp.trim()) { setError('Le numéro WhatsApp est requis'); return; }
    if (!isEdit && imgFiles.length === 0) { setError('Ajoutez au moins une image'); return; }

    setLoading(true);
    try {
      let images = isEdit ? [...oldImages()] : [];
      if (imgFiles.length > 0) {
        const urls = await Promise.all(imgFiles.map(f => uploadImage(f)));
        images = isEdit ? [...urls, ...images.filter(u => u.startsWith('http'))].slice(0, 5) : urls;
      }
      const affiche_url = images[0] || annonce?.affiche_url || '';

      const payload = {
        ...form,
        user_id: user.id,
        prix: form.prix !== '' ? parseFloat(form.prix) : null,
        date_fin: form.date_fin || null,
        affiche_url,
        images: images.length > 1 ? images : [],
        actif: true,
      };

      if (isEdit) {
        const { error } = await supabase.from('annonces').update(payload).eq('id', annonce.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('annonces').insert(payload);
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  }

  const showPrix = ['offre', 'article', 'emploi'].includes(form.type);
  const showDateFin = ['formation', 'emploi'].includes(form.type);

  function nextStep() {
    if (step === 0 && imgPreviews.length === 0) {
      setError('Ajoutez au moins une photo pour votre annonce');
      return;
    }
    if (step === 1 && !form.titre.trim()) {
      setError('Donnez un titre à votre annonce');
      return;
    }
    setError('');
    setStep(s => Math.min(s + 1, 3));
  }

  const showPrixStep2 = showPrix;
  const showDateFinStep2 = showDateFin;

  const stepSections = [
    <div key="step0">
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, textAlign: 'center' }}>
        Choisissez le type et ajoutez des photos 📸
      </p>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ fontSize: 20 }}>📌</span> Type d'annonce
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TYPE_ANNONCE.map(t => (
            <TypeCard key={t.value} t={t} selected={form.type === t.value} onClick={() => set('type', t.value)} />
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ fontSize: 20 }}>🖼️</span> Photos <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: 4, fontSize: 12 }}>({imgPreviews.length}/{maxImg})</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
          {imgPreviews.map((url, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.08)', aspectRatio: '1' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {i === 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--vert)', color: 'white', fontSize: 8, fontWeight: 800, padding: '2px 0', textAlign: 'center' }}>Une</div>}
              <button type="button" onClick={() => removeImg(i)}
                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                ✕
              </button>
              {i > 0 && (
                <button type="button" onClick={() => moveImg(i, i - 1)}
                  style={{ position: 'absolute', bottom: 4, right: 28, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 10 }}>
                  ↑
                </button>
              )}
              {i < imgPreviews.length - 1 && (
                <button type="button" onClick={() => moveImg(i, i + 1)}
                  style={{ position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 10 }}>
                  ↓
                </button>
              )}
            </div>
          ))}
          {imgPreviews.length < maxImg && (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 14,
              padding: 16, textAlign: 'center', aspectRatio: '1', background: 'rgba(255,255,255,0.02)',
              transition: 'var(--transition)',
            }}>
              <input type="file" accept="image/*" onChange={handleImg} multiple hidden />
              <Image size={24} style={{ color: 'var(--text3)', marginBottom: 4 }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Ajouter</span>
            </label>
          )}
        </div>
        <p className="form-hint" style={{ marginTop: 8, textAlign: 'center' }}>📷 Jusqu'à 5 photos · La première est la couverture</p>
      </div>
    </div>,

    <div key="step1">
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, textAlign: 'center' }}>
        Donnez un titre et décrivez votre annonce ✍️
      </p>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ fontSize: 20 }}>🏷️</span> Titre <span className="form-required">*</span>
        </label>
        <input className="form-control" placeholder="Ex: Vélo tout terrain à vendre"
          value={form.titre} onChange={e => set('titre', e.target.value)} maxLength={100} required
          style={{ fontSize: 16, padding: '14px 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span className="form-hint">📝 Donnez un titre clair et court</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{form.titre.length}/100</span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ fontSize: 20 }}>📄</span> Description <span className="form-required">*</span>
        </label>
        <textarea className="form-control" rows={4}
          placeholder="Décrivez votre offre en détail..."
          value={form.description} onChange={e => set('description', e.target.value)}
          style={{ fontSize: 15, padding: '14px 16px' }} />
        <p className="form-hint">💡 Plus de détails = plus de confiance</p>
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ fontSize: 20 }}>🏢</span> Secteur
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {SECTEUR_EMOJIS.map(([emoji, label]) => (
            <button key={label} type="button" onClick={() => set('secteur', label)}
              style={{
                padding: '10px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                background: form.secteur === label ? 'rgba(57,211,83,0.12)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${form.secteur === label ? 'var(--vert)' : 'transparent'}`,
                color: form.secteur === label ? 'var(--vert)' : 'var(--text2)',
                fontWeight: form.secteur === label ? 700 : 500, fontSize: 13,
                transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>{emoji}</span> {label}
            </button>
          ))}
        </div>
      </div>
    </div>,

    <div key="step2">
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, textAlign: 'center' }}>
        Où êtes-vous ? Combien ça coûte ? 📍💵
      </p>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ fontSize: 20 }}>📍</span> Ville
        </label>
        <VilleGrid selected={form.ville} onSelect={handleVilleChange} />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ fontSize: 20 }}>📌</span> Position précise
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {form.latitude && form.longitude ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(57,211,83,0.08)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(57,211,83,0.2)' }}>
              <MapPin size={18} style={{ color: 'var(--vert)' }} />
              <span style={{ fontSize: 13, color: 'var(--vert)', fontWeight: 600 }}>
                {form.ville} · Position activée ✓
              </span>
            </div>
          ) : (
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text3)', padding: '10px 14px' }}>
              📌 Pas de position (appuyez sur le bouton)
            </div>
          )}
          <motion.button type="button" className="btn btn-outline btn-sm"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleLocate} disabled={locating}
            style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 12, fontSize: 13 }}>
            <Crosshair size={16} /> {locating ? '...' : '📍 Ma position'}
          </motion.button>
        </div>
        <p className="form-hint">📡 Activez pour que les clients vous trouvent facilement</p>
      </div>
      {showPrixStep2 && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
              <span style={{ fontSize: 20 }}>💰</span> Prix
            </label>
            <input className="form-control" type="number" min={0}
              placeholder="0 = Gratuit"
              value={form.prix} onChange={e => set('prix', e.target.value)}
              style={{ fontSize: 16, padding: '14px 16px' }} />
            <p className="form-hint">💵 Laissez vide si négociable</p>
          </div>
          <div className="form-group" style={{ width: 110, flexShrink: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
              <span style={{ fontSize: 20 }}>💱</span> Devise
            </label>
            <select className="form-control" value={form.devise} onChange={e => set('devise', e.target.value)}
              style={{ fontSize: 16, padding: '14px 16px' }}>
              <option>FCFA</option><option>EUR</option><option>USD</option>
            </select>
          </div>
        </div>
      )}
      {showDateFinStep2 && (
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
            <span style={{ fontSize: 20 }}>📅</span> Date limite
          </label>
          <input className="form-control" type="date" value={form.date_fin}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => set('date_fin', e.target.value)}
            style={{ fontSize: 16, padding: '14px 16px' }} />
        </div>
      )}
    </div>,

    <div key="step3">
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, textAlign: 'center' }}>
        Vérifiez et publiez votre annonce ✅
      </p>
      <div style={{
        background: 'rgba(57,211,83,0.06)', borderRadius: 16,
        border: '1px solid rgba(57,211,83,0.15)', padding: 16, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
            {imgPreviews[0] && <img src={imgPreviews[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.titre || 'Sans titre'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--vert)', background: 'rgba(57,211,83,0.12)', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
                {form.ville}
              </span>
              {form.prix !== '' && <span style={{ fontSize: 12, color: 'var(--or)', background: 'rgba(245,183,0,0.12)', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
                {parseInt(form.prix).toLocaleString()} {form.devise}
              </span>}
              <span style={{ fontSize: 12, color: 'var(--text2)', background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: 20 }}>
                📷 {imgPreviews.length} photo{imgPreviews.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ fontSize: 20 }}>📞</span> WhatsApp <span className="form-required">*</span>
        </label>
        <input className="form-control" placeholder="+226 XX XX XX XX"
          value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} required
          style={{ fontSize: 16, padding: '14px 16px' }} />
        <p className="form-hint">💬 Les clients vous contactent sur WhatsApp</p>
      </div>
      <div style={{
        background: 'rgba(245,183,0,0.08)', borderRadius: 12, padding: '12px 16px',
        border: '1px solid rgba(245,183,0,0.15)', marginTop: 12,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 24 }}>🔒</span>
        <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>
          Votre annonce sera visible par tous. Les acheteurs vous contacteront directement sur WhatsApp.
        </span>
      </div>
    </div>,
  ];

  return (
    <motion.div className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="modal" style={{ maxWidth: 580 }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flag-strip" />
        <div className="modal-header" style={{ paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.button onClick={() => step > 0 ? (setError(''), setStep(s => s - 1)) : onClose()}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {step > 0 ? <ChevronLeft size={18} /> : <X size={18} />}
            </motion.button>
            <div>
              <h3 style={{ fontSize: 16, margin: 0 }}>{isEdit ? 'Modifier' : STEP_TITLES[step]}</h3>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: step === i ? 20 : 8, height: 6, borderRadius: 3,
                background: i <= step ? 'var(--vert)' : 'rgba(255,255,255,0.12)',
                transition: 'var(--transition)',
              }} />
            ))}
          </div>
        </div>

        <div className="modal-body" style={{ paddingTop: 16 }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 14,
              fontSize: 13, color: '#ef4444', fontWeight: 600, textAlign: 'center',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ minHeight: 280 }}>
              {stepSections[step]}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {step < 3 ? (
                <>
                  <motion.button type="button" className="btn btn-ghost"
                    style={{ borderRadius: 12, padding: '12px 20px', fontSize: 14 }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setError(''); setStep(s => Math.max(0, s - 1)); }}>
                    <ChevronLeft size={16} /> Retour
                  </motion.button>
                  <motion.button type="button" className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center', borderRadius: 12, padding: '12px', fontSize: 15 }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={nextStep}>
                    Suivant <ChevronRight size={18} />
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button type="button" className="btn btn-ghost"
                    style={{ borderRadius: 12, padding: '12px 20px', fontSize: 14 }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={onClose}>
                    Annuler
                  </motion.button>
                  <motion.button type="submit" className="btn btn-primary"
                    disabled={loading}
                    style={{ flex: 1, justifyContent: 'center', borderRadius: 12, padding: '12px', fontSize: 15 }}
                    whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}>
                    {loading
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          <span className="btn-spinner" /> Publication...
                        </span>
                      : <><Send size={18} /> {isEdit ? 'Sauvegarder' : '✅ Publier mon annonce'}</>
                    }
                  </motion.button>
                </>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
