import { useState, useEffect } from 'react';
import { supabase, SECTEURS, TYPE_ANNONCE } from '../supabase';
import { useAuth } from '../hooks/useAuth';

const VILLES = ['Ouagadougou','Bobo-Dioulasso','Koudougou','Banfora','Ouahigouya','Tenkodogo','Kaya','Dédougou','Fada N\'Gourma','Manga','Réo','Gaoua','Diapaga','Dori','Tougan','Nouna','Léo','Kombissiri','Ziniaré','Autre'];

export default function AnnonceModal({ annonce, onClose, onSaved }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    type: 'offre', titre: '', description: '', prix: '',
    devise: 'FCFA', date_fin: '', whatsapp: '',
    secteur: SECTEURS[0], ville: 'Ouagadougou',
  });
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!annonce;

  useEffect(() => {
    if (annonce) {
      setForm({
        type: annonce.type || 'offre', titre: annonce.titre || '',
        description: annonce.description || '', prix: annonce.prix || '',
        devise: annonce.devise || 'FCFA', date_fin: annonce.date_fin || '',
        whatsapp: annonce.whatsapp || '', secteur: annonce.secteur || SECTEURS[0],
        ville: annonce.ville || 'Ouagadougou',
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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="flag-strip" />
        <div className="modal-header">
          <div>
            <h3>{isEdit ? '✏️ Modifier l\'annonce' : '➕ Nouvelle annonce'}</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, fontWeight: 400 }}>
              {isEdit ? 'Mettez à jour votre annonce' : 'Publiez votre annonce sur Konab Marcket'}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-danger">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            {/* TYPE */}
            <div className="form-group">
              <label className="form-label">Type d'annonce <span className="form-required">*</span></label>
              <div className="type-pills" style={{ gap: 8 }}>
                {TYPE_ANNONCE.map(t => (
                  <button type="button" key={t.value}
                    className={`type-pill ${form.type === t.value ? 'active' : ''}`}
                    style={{ padding: '7px 14px', fontSize: 13 }}
                    onClick={() => set('type', t.value)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AFFICHE */}
            <div className="form-group">
              <label className="form-label">
                Affiche <span className="form-required">*</span>
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>— obligatoire (JPG, PNG, max 8MB)</span>
              </label>
              <label className={`upload-zone ${imgPreview ? 'has-img' : ''}`}>
                <input type="file" accept="image/*" onChange={handleImg} />
                {imgPreview
                  ? <img src={imgPreview} alt="preview" className="img-preview" />
                  : (
                    <div>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
                        Cliquez pour choisir une affiche
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>L'affiche attire l'attention — choisissez une belle image !</div>
                    </div>
                  )
                }
              </label>
              {imgPreview && (
                <button type="button" onClick={() => { setImgPreview(''); setImgFile(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--rouge)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
                  ✕ Supprimer l'affiche
                </button>
              )}
            </div>

            {/* TITRE */}
            <div className="form-group">
              <label className="form-label">Titre de l'annonce <span className="form-required">*</span></label>
              <input className="form-control" placeholder="Ex: Cours de comptabilité à Ouagadougou"
                value={form.titre} onChange={e => set('titre', e.target.value)} maxLength={100} required />
              <p className="form-hint">{form.titre.length}/100 caractères</p>
            </div>

            {/* DESCRIPTION */}
            <div className="form-group">
              <label className="form-label">Description <span className="form-required">*</span></label>
              <textarea className="form-control" rows={4}
                placeholder="Décrivez en détail votre offre : ce que vous proposez, vos conditions, votre expérience..."
                value={form.description} onChange={e => set('description', e.target.value)} required />
            </div>

            {/* SECTEUR + VILLE */}
            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Secteur <span className="form-required">*</span></label>
                <select className="form-control" value={form.secteur} onChange={e => set('secteur', e.target.value)}>
                  {SECTEURS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <select className="form-control" value={form.ville} onChange={e => set('ville', e.target.value)}>
                  {VILLES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* PRIX */}
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

            {/* DATE FIN */}
            {showDateFin && (
              <div className="form-group">
                <label className="form-label">Date limite de candidature / fin de formation</label>
                <input className="form-control" type="date" value={form.date_fin}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => set('date_fin', e.target.value)} />
              </div>
            )}

            {/* WHATSAPP */}
            <div className="form-group">
              <label className="form-label">Votre numéro WhatsApp <span className="form-required">*</span></label>
              <input className="form-control" placeholder="+226 XX XX XX XX ou 00226XXXXXXXX"
                value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} required />
              <p className="form-hint">💬 Les intéressés vous contacteront directement sur ce numéro WhatsApp</p>
            </div>

            {/* SUBMIT */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="button" className="btn btn-outline" style={{ borderRadius: 'var(--radius-sm)' }} onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn-rouge" disabled={loading}
                style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)', fontSize: 15, padding: '12px' }}>
                {loading ? <span style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><span className="btn-spinner" /> Publication...</span> : isEdit ? '✅ Sauvegarder les modifications' : '🚀 Publier mon annonce'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
