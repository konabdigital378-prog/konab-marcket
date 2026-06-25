import { useState, useEffect, useCallback } from 'react';
import { supabase, FORMULAS } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonTable } from '../components/Skeleton';
import { toast } from '../components/Toast';

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('paiements');
  const [users, setUsers] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: u }, { data: p }, { data: a }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('paiements').select('*, profiles(nom, email)').order('created_at', { ascending: false }),
      supabase.from('annonces').select('*, profiles(nom, email)').order('created_at', { ascending: false }),
    ]);
    setUsers(u||[]); setPaiements(p||[]); setAnnonces(a||[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin, fetchAll]);

  async function validerPaiement(p) {
    const expire = new Date();
    expire.setMonth(expire.getMonth() + 1);
    await supabase.from('paiements').update({ statut:'valide', valide_le: new Date().toISOString() }).eq('id', p.id);
    await supabase.from('profiles').update({ abonnement: p.formule, abonnement_expire: expire.toISOString(), certifie: p.formule==='certified' }).eq('id', p.user_id);
    fetchAll();
    toast(`✅ Abonnement ${FORMULAS[p.formule]?.name} activé pour ${p.profiles?.nom||p.profiles?.email}`, 'success');
  }

  async function refuserPaiement(id) {
    await supabase.from('paiements').update({ statut:'refuse' }).eq('id', id);
    fetchAll();
  }

  async function toggleAnnonce(a) {
    await supabase.from('annonces').update({ actif: !a.actif }).eq('id', a.id);
    fetchAll();
  }

  async function deleteAnnonce(id) {
    if (!window.confirm('Supprimer définitivement ?')) return;
    await supabase.from('annonces').delete().eq('id', id);
    fetchAll();
  }

  if (!isAdmin) return (
    <div className="page">
      <div className="empty-state"><div className="icon">🚫</div><h3>Accès refusé</h3><p>Réservé à l'administrateur Konab Marcket.</p></div>
    </div>
  );

  const pending = paiements.filter(p => p.statut === 'en_attente');

  return (
    <div className="page">
      {/* En-tête admin */}
      <div style={{ background:'var(--noir)', borderRadius:'var(--radius)', padding:'24px 28px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div className="flag-strip" style={{ position:'absolute', top:0, left:0, right:0 }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, paddingTop:4 }}>
          <div>
            <h2 style={{ color:'white', fontSize:22, fontWeight:900 }}>🛡️ Panneau Administrateur</h2>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:14, marginTop:4 }}>Konab Marcket — Gestion complète</p>
          </div>
          {pending.length > 0 && (
            <div style={{ background:'var(--rouge)', color:'white', padding:'8px 16px', borderRadius:100, fontWeight:800, fontSize:14, animation:'pulse 2s infinite' }}>
              ⚠️ {pending.length} paiement{pending.length>1?'s':''} en attente
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-num rouge">{users.length}</div><div className="stat-label">Utilisateurs</div></div>
        <div className="stat-card"><div className="stat-num vert">{annonces.filter(a=>a.actif).length}</div><div className="stat-label">Annonces actives</div></div>
        <div className="stat-card"><div className="stat-num or">{pending.length}</div><div className="stat-label">À valider</div></div>
        <div className="stat-card"><div className="stat-num noir">{users.filter(u=>u.abonnement!=='basic').length}</div><div className="stat-label">Abonnés payants</div></div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab==='paiements'?'active':''}`} onClick={()=>setTab('paiements')}>
          💳 Paiements {pending.length>0&&`(${pending.length} ⚠️)`}
        </button>
        <button className={`tab-btn ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>👥 Utilisateurs</button>
        <button className={`tab-btn ${tab==='annonces'?'active':''}`} onClick={()=>setTab('annonces')}>📋 Annonces</button>
      </div>

      {loading ? <SkeletonTable rows={6} /> : <>

        {/* PAIEMENTS */}
        {tab==='paiements' && (
          <>
            {pending.length > 0 && (
              <div className="alert alert-warning">⚠️ {pending.length} demande{pending.length>1?'s':''} en attente de validation</div>
            )}
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Utilisateur</th><th>Formule</th><th>Montant</th><th>Date</th><th>Statut</th><th>Preuve</th><th>Actions</th></tr></thead>
                <tbody>
                  {paiements.length===0
                    ? <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--text3)'}}>Aucun paiement enregistré</td></tr>
                    : paiements.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{fontWeight:700}}>{p.profiles?.nom||'—'}</div>
                          <div style={{fontSize:12,color:'var(--text3)'}}>{p.profiles?.email}</div>
                        </td>
                        <td><span className="badge badge-info">{FORMULAS[p.formule]?.name||p.formule}</span></td>
                        <td><strong>{p.montant.toLocaleString('fr-FR')} FCFA</strong></td>
                        <td style={{fontSize:12,color:'var(--text3)'}}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <span className={`badge ${p.statut==='valide'?'badge-success':p.statut==='refuse'?'badge-danger':'badge-warning'}`}>
                            {p.statut==='en_attente'?'⏳ En attente':p.statut==='valide'?'✅ Validé':'❌ Refusé'}
                          </span>
                        </td>
                        <td>
                          {p.capture_url && <a href={p.capture_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">🖼️ Voir</a>}
                        </td>
                        <td>
                          {p.statut==='en_attente' && (
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                              <button className="btn btn-vert btn-sm" onClick={()=>validerPaiement(p)}>✅ Valider</button>
                              <button className="btn btn-danger btn-sm" style={{background:'var(--rouge)',color:'white',borderRadius:100}} onClick={()=>refuserPaiement(p.id)}>❌</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* USERS */}
        {tab==='users' && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Ville</th><th>Abonnement</th><th>Certifié</th><th>Inscrit</th></tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td style={{fontWeight:700}}>{u.nom||'—'}</td>
                    <td style={{fontSize:13}}>{u.email}</td>
                    <td>{u.telephone||'—'}</td>
                    <td>{u.ville||'—'}</td>
                    <td>
                      <span className={`badge ${u.abonnement==='basic'?'badge-gray':u.abonnement==='premium'?'badge-warning':'badge-gold'}`}>
                        {FORMULAS[u.abonnement]?.name||'Basique'}
                      </span>
                      {u.abonnement_expire && <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>exp: {new Date(u.abonnement_expire).toLocaleDateString('fr-FR')}</div>}
                    </td>
                    <td>{u.certifie?'⭐ Oui':'—'}</td>
                    <td style={{fontSize:12,color:'var(--text3)'}}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ANNONCES */}
        {tab==='annonces' && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Titre</th><th>Type</th><th>Auteur</th><th>Secteur</th><th>Vues</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {annonces.map(a=>(
                  <tr key={a.id}>
                    <td style={{fontWeight:700,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.titre}</td>
                    <td><span className={`type-chip chip-${a.type}`} style={{fontSize:11}}>{a.type}</span></td>
                    <td>
                      <div style={{fontSize:13}}>{a.profiles?.nom||'—'}</div>
                      <div style={{fontSize:11,color:'var(--text3)'}}>{a.profiles?.email}</div>
                    </td>
                    <td style={{fontSize:12,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.secteur}</td>
                    <td>👁 {a.vues||0}</td>
                    <td><span className={`badge ${a.actif?'badge-success':'badge-danger'}`}>{a.actif?'✅ Actif':'⏸ Inactif'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>toggleAnnonce(a)}>{a.actif?'⏸':'▶️'}</button>
                        <button className="btn btn-sm" style={{background:'#FFEBEE',color:'var(--rouge)',borderRadius:100}} onClick={()=>deleteAnnonce(a.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>}
    </div>
  );
}
