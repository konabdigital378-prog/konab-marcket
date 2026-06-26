import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Image, Send, MapPin, Crosshair } from 'lucide-react';
import { supabase, SECTEURS, TYPE_ANNONCE, VILLES_COORDS } from '../supabase';
import { useAuth } from '../hooks/useAuth';

const VILLES = Object.keys(VILLES_COORDS);

export default function AnnonceModal({ annonce, onClose, onSaved }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    type: 'offre', titre: '', description: '', prix: '',
    devise: 'FCFA', date_fin: '', whatsapp: '',
    secteur: SECTEURS[0], ville: 'Ouagadougou',
    latitude: null, longitude: null,
  });
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
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
      if (annonce.affiche_url) setImgPreview(annonce.affiche_url);
    } else if (profile?.telephone) {
      setForm(f => ({ ...f, whatsapp: profile.telephone }));
    }
  }, [annonce, profile]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleImg(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Image trop lourde (max 8MB)'); return; }
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    setError('');
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
    if (coords) {
      set('latitude', coords.lat);
      set('longitude', coords.lng);
    }
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('annonces').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error('Erreur upload image: ' + error.message);
    const { data } = supabase.storage.from('annonces').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.titre.trim())       { setError('Le titre est requis'); return; }
    if (!form.description.trim()) { setError('La description est requise'); return; }
    if (!form.whatsapp.trim())    { setError('Le numéro WhatsApp est requis'); return; }
    if (!isEdit && !imgFile)      { setError("L'affiche est obligatoire pour toute annonce"); return; }

    setLoading(true);
    try {
      let affiche_url = annonce?.affiche_url || '';
      if (imgFile) affiche_url = await uploadImage(imgFile);

      const payload = {
        ...form,
        user_id: user.id,
        prix: form.prix !== '' ? parseFloat(form.prix) : null,
        date_fin: form.date_fin || null,
        affiche_url, actif: true,
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

  const showPrix    = ['offre','article','emploi'].includes(form.type);
  const showDateFin = ['formation','emploi'].includes(form.type);

  return (
    <motion.div className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="modal" style={{ maxWidth: 600 }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flag-strip" />
        <div className="modal-header">
          <div>
            <h3>{isEdit ? 'Modifier' : 'Nouvelle annonce'}</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, fontWeight: 400 }}>
              {isEdit ? 'Mettez à jour votre annonce' : 'Publiez sur Konab Marcket'}
            </p>
          </div>
          <motion.button className="modal-close" onClick={onClose}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <X size={18} />
          </motion.button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-danger">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Type d'annonce <span className="form-required">*</span></label>
              <div className="type-pills" style={{ gap: 8 }}>
                {TYPE_ANNONCE.map(t => (
                  <button type="button" key={t.value}
                    className={`type-pill ${form.type === t.value ? 'active' : ''}`}
                    style={{ padding: '8px 16px', fontSize: 13 }}
                    onClick={() => set('type', t.value)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Affiche <span className="form-required">*</span>
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, fontSize: 12 }}>— JPG, PNG, max 8MB</span>
              </label>
              <label className={`upload-zone ${imgPreview ? 'has-img' : ''}`}>
                <input type="file" accept="image/*" onChange={handleImg} />
                {imgPreview
                  ? <img src={imgPreview} alt="preview" className="img-preview" />
                  : <div><div style={{ fontSize: 36, marginBottom: 8, color: 'var(--text3)' }}><Image size={36} style={{ margin: '0 auto' }} /></div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Cliquez pour choisir une affiche</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>L'affiche attire l'attention — choisissez une belle image !</div></div>
                }
              </label>
              {imgPreview && (
                <button type="button" onClick={() => { setImgPreview(''); setImgFile(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
                  ✕ Supprimer l'affiche
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Titre <span className="form-required">*</span></label>
              <input className="form-control" placeholder="Ex: Cours de comptabilité à Ouagadougou"
                value={form.titre} onChange={e => set('titre', e.target.value)} maxLength={100} required />
              <p className="form-hint">{form.titre.length}/100 caractères</p>
            </div>

            <div className="form-group">
              <label className="form-label">Description <span className="form-required">*</span></label>
              <textarea className="form-control" rows={4}
                placeholder="Décrivez en détail votre offre..."
                value={form.description} onChange={e => set('description', e.target.value)} required />
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Secteur <span className="form-required">*</span></label>
                <select className="form-control" value={form.secteur} onChange={e => set('secteur', e.target.value)}>
                  {SECTEURS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <select className="form-control" value={form.ville} onChange={e => handleVilleChange(e.target.value)}>
                  {VILLES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Localisation <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12, color: 'var(--text3)' }}>— activez pour trouver les offres près de chez vous</span></label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {form.latitude && form.longitude ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(57,211,83,0.08)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', border: '1px solid rgba(57,211,83,0.2)' }}>
                    <MapPin size={16} style={{ color: 'var(--vert)' }} />
                    <span style={{ fontSize: 13, color: 'var(--vert)', fontWeight: 600 }}>
                      {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)} — {form.ville}
                    </span>
                  </div>
                ) : (
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text3)' }}>
                    Aucune position définie (utilisez le bouton pour localiser)
                  </div>
                )}
                <motion.button type="button" className="btn btn-outline btn-sm"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleLocate} disabled={locating}
                  style={{ flexShrink: 0 }}>
                  <Crosshair size={14} /> {locating ? '...' : 'Ma position'}
                </motion.button>
              </div>
            </div>

            {showPrix && (
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Prix</label>
                  <input className="form-control" type="number" min={0}
                    placeholder="Laisser vide = Négociable"
                    value={form.prix} onChange={e => set('prix', e.target.value)} />
                  <p className="form-hint">0 ou vide = Gratuit/Négociable</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Devise</label>
                  <select className="form-control" value={form.devise} onChange={e => set('devise', e.target.value)}>
                    <option>FCFA</option><option>EUR</option><option>USD</option>
                  </select>
                </div>
              </div>
            )}

            {showDateFin && (
              <div className="form-group">
                <label className="form-label">Date limite</label>
                <input className="form-control" type="date" value={form.date_fin}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => set('date_fin', e.target.value)} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">WhatsApp <span className="form-required">*</span></label>
              <input className="form-control" placeholder="+226 XX XX XX XX"
                value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} required />
              <p className="form-hint">💬 Les clients vous contactent sur ce numéro</p>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <motion.button type="button" className="btn btn-ghost"
                style={{ borderRadius: 'var(--radius-sm)' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={onClose}>
                Annuler
              </motion.button>
              <motion.button type="submit" className="btn btn-primary"
                disabled={loading}
                style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)', fontSize: 15, padding: '12px' }}
                whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <span className="btn-spinner" /> Publication...
                    </span>
                  : <><Send size={18} /> {isEdit ? 'Sauvegarder' : 'Publier mon annonce'}</>
                }
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}