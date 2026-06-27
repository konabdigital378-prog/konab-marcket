import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Package, CreditCard, CheckCircle, XCircle, Eye, BarChart3, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel('admin-paiements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'paiements' },
        () => { fetchAll(); }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'paiements' },
        () => { fetchAll(); }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isAdmin, fetchAll]);

  async function validerPaiement(p) {
    const expire = new Date();
    expire.setMonth(expire.getMonth() + 1);
    await supabase.from('paiements').update({ statut:'valide', valide_le: new Date().toISOString() }).eq('id', p.id);
    await supabase.from('profiles').update({ abonnement: p.formule, abonnement_expire: expire.toISOString(), certifie: p.formule==='certified' }).eq('id', p.user_id);
    fetchAll();
    toast(`✅ Abonnement ${FORMULAS[p.formule]?.name} activé`, 'success');
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
      <motion.div className="empty-state"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="icon"><Shield size={60} style={{ color: 'var(--text3)' }} /></div>
        <h3>Accès refusé</h3>
        <p>Réservé à l'administrateur Konab Marcket.</p>
      </motion.div>
    </div>
  );

  const pending = paiements.filter(p => p.statut === 'en_attente');

  const tabs = [
    { id: 'paiements', label: 'Paiements', icon: <CreditCard size={16} />, count: pending.length },
    { id: 'users', label: 'Utilisateurs', icon: <Users size={16} /> },
    { id: 'annonces', label: 'Annonces', icon: <Package size={16} /> },
  ];

  return (
    <div className="page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: 'linear-gradient(135deg, var(--noir2), var(--noir))',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius)',
          padding: '28px 32px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="flag-strip" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}>
          <div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={24} style={{ color: 'var(--vert)' }} /> Administration
            </h2>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 4 }}>Konab Marcket — Gestion complète</p>
          </div>
          {pending.length > 0 && (
            <motion.div
              style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)', padding: '8px 18px', borderRadius: 100, fontWeight: 800, fontSize: 13, border: '1px solid rgba(255,71,87,0.2)' }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ⚠️ {pending.length} paiement{pending.length>1?'s':''} en attente
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div className="stats-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="stat-card">
          <Users size={20} style={{ color: 'var(--vert)', margin: '0 auto 8px' }} />
          <div className="stat-num vert">{users.length}</div>
          <div className="stat-label">Utilisateurs</div>
        </div>
        <div className="stat-card">
          <Package size={20} style={{ color: 'var(--or)', margin: '0 auto 8px' }} />
          <div className="stat-num or">{annonces.filter(a=>a.actif).length}</div>
          <div className="stat-label">Annonces actives</div>
        </div>
        <div className="stat-card">
          <CreditCard size={20} style={{ color: 'white', margin: '0 auto 8px' }} />
          <div className="stat-num blanc">{pending.length}</div>
          <div className="stat-label">À valider</div>
        </div>
        <div className="stat-card">
          <BarChart3 size={20} style={{ color: 'var(--or)', margin: '0 auto 8px' }} />
          <div className="stat-num or">{users.filter(u=>u.abonnement!=='basic').length}</div>
          <div className="stat-label">Abonnés</div>
        </div>
      </motion.div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`}
            onClick={()=>setTab(t.id)}
          >
            {t.icon} {t.label}{t.count > 0 && ` (${t.count})`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {loading ? <SkeletonTable rows={6} /> : <>
            {tab==='paiements' && (
              <>
                {pending.length > 0 && (
                  <div className="alert alert-warning">⚠️ {pending.length} demande{pending.length>1?'s':''} en attente</div>
                )}
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Utilisateur</th><th>Formule</th><th>Montant</th><th>Date</th><th>Statut</th><th>Preuve</th><th>Actions</th></tr></thead>
                    <tbody>
                      {paiements.length===0
                        ? <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--text3)'}}>Aucun paiement</td></tr>
                        : paiements.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div style={{fontWeight:700,color:'white'}}>{p.profiles?.nom||'—'}</div>
                              <div style={{fontSize:12,color:'var(--text3)'}}>{p.profiles?.email}</div>
                            </td>
                            <td><span className="badge badge-info">{FORMULAS[p.formule]?.name||p.formule}</span></td>
                            <td><strong style={{color:'var(--vert)'}}>{p.montant.toLocaleString('fr-FR')} FCFA</strong></td>
                            <td style={{fontSize:12,color:'var(--text3)'}}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                            <td>
                              <span className={`badge ${p.statut==='valide'?'badge-success':p.statut==='refuse'?'badge-danger':'badge-warning'}`}>
                                {p.statut==='en_attente'?'⏳ En attente':p.statut==='valide'?'✅ Validé':'❌ Refusé'}
                              </span>
                            </td>
                            <td>
                              {p.capture_url && <a href={p.capture_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Eye size={14} /> Voir</a>}
                            </td>
                            <td>
                              {p.statut==='en_attente' && (
                                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                                  <motion.button className="btn btn-sm"
                                    style={{background:'linear-gradient(135deg, var(--vert), var(--vert-dark))',color:'white',borderRadius:100}}
                                    whileHover={{scale:1.03}}
                                    whileTap={{scale:0.97}}
                                    onClick={()=>validerPaiement(p)}
                                  >
                                    <CheckCircle size={14} /> Valider
                                  </motion.button>
                                  <motion.button className="btn btn-sm"
                                    style={{background:'rgba(255,71,87,0.1)',color:'var(--danger)',borderRadius:100}}
                                    whileHover={{scale:1.03}}
                                    whileTap={{scale:0.97}}
                                    onClick={()=>refuserPaiement(p.id)}
                                  >
                                    <XCircle size={14} />
                                  </motion.button>
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

            {tab==='users' && (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Ville</th><th>Abonnement</th><th>Certifié</th><th>Inscrit</th></tr></thead>
                  <tbody>
                    {users.map(u=>(
                      <tr key={u.id}>
                        <td style={{fontWeight:700,color:'white'}}>{u.nom||'—'}</td>
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

            {tab==='annonces' && (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Titre</th><th>Type</th><th>Auteur</th><th>Secteur</th><th>Vues</th><th>Statut</th><th>Actions</th></tr></thead>
                  <tbody>
                    {annonces.map(a=>(
                      <tr key={a.id}>
                        <td style={{fontWeight:700,color:'white',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.titre}</td>
                        <td><span className={`product-card-type ${`type-${a.type}`}`} style={{fontSize:11}}>{a.type}</span></td>
                        <td>
                          <div style={{fontSize:13}}>{a.profiles?.nom||'—'}</div>
                          <div style={{fontSize:11,color:'var(--text3)'}}>{a.profiles?.email}</div>
                        </td>
                        <td style={{fontSize:12,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.secteur}</td>
                        <td><Eye size={12} style={{display:'inline'}} /> {a.vues||0}</td>
                        <td><span className={`badge ${a.actif?'badge-success':'badge-danger'}`}>{a.actif?'✅ Actif':'⏸ Inactif'}</span></td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <motion.button className="btn btn-ghost btn-sm"
                              whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                              onClick={()=>toggleAnnonce(a)}
                            >
                              {a.actif?'⏸':'▶️'}
                            </motion.button>
                            <motion.button className="btn btn-sm"
                              style={{background:'rgba(255,71,87,0.1)',color:'var(--danger)',borderRadius:100}}
                              whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                              onClick={()=>deleteAnnonce(a.id)}
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
