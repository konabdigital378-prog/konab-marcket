import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, MessageCircle, Search, User, ExternalLink, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const oneDay = 86400000;
  if (diff < oneDay && d.getDate() === now.getDate()) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function shouldShowDate(messages, idx) {
  if (idx === 0) return true;
  const prev = new Date(messages[idx - 1].created_at);
  const curr = new Date(messages[idx].created_at);
  return prev.toDateString() !== curr.toDateString();
}

function MessageStatus({ lu }) {
  if (lu) return <CheckCheck size={12} style={{ opacity: 0.7 }} />;
  return <Check size={12} style={{ opacity: 0.5 }} />;
}

function DateSeparator({ date }) {
  return (
    <div className="msg-date-sep">
      <span>{formatDate(date)}</span>
    </div>
  );
}

function ConversationRow({ conv, active, onClick, unread }) {
  const other = conv.otherProfile;
  if (!other) return null;
  return (
    <motion.div
      className={`conv-row ${active ? 'active' : ''}`}
      onClick={onClick}
      whileHover={{ background: 'rgba(255,255,255,0.03)' }}
      layout
    >
      <div className="conv-avatar">
        <span>{(other.nom || 'U').slice(0, 2).toUpperCase()}</span>
        {unread > 0 && <div className="conv-online" />}
      </div>
      <div className="conv-info">
        <div className="conv-name">
          {other.entreprise_nom || other.nom}
          {conv.lastMessage?.lu && (
            <CheckCheck size={12} style={{ marginLeft: 6, color: 'var(--vert)', opacity: 0.7 }} />
          )}
        </div>
        <div className="conv-preview">{conv.lastMessage?.contenu?.slice(0, 60) || 'Aucun message'}</div>
      </div>
      <div className="conv-meta">
        {conv.lastMessage && (
          <div className="conv-time">{formatTime(conv.lastMessage.created_at)}</div>
        )}
        {unread > 0 && <div className="conv-unread">{unread}</div>}
      </div>
    </motion.div>
  );
}

function MessageBubble({ msg, isMine }) {
  return (
    <motion.div
      className={`msg-bubble ${isMine ? 'mine' : 'theirs'}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="msg-text">{msg.contenu}</div>
      <div className="msg-footer">
        <span className="msg-time">{formatTime(msg.created_at)}</span>
        {isMine && <MessageStatus lu={msg.lu} />}
      </div>
    </motion.div>
  );
}

export default function MessageriePage({ onBack, initialChat, onShowDetail, onShowVendeur }) {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeConvData, setActiveConvData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const filteredConvs = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c =>
      c.otherProfile?.nom?.toLowerCase().includes(q) ||
      c.otherProfile?.entreprise_nom?.toLowerCase().includes(q) ||
      c.lastMessage?.contenu?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialChat) {
      openConversation(initialChat);
    }
  }, [initialChat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const sub = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `destinataire_id=eq.${user.id}`,
      }, () => { loadConversations(); })
      .subscribe();
    return () => sub.unsubscribe();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadConversations() {
    const { data: msgs } = await supabase.from('messages')
      .select('*')
      .or(`envoyeur_id.eq.${user.id},destinataire_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!msgs) { setLoading(false); return; }

    const otherIds = new Set();
    const annonceIds = new Set();
    msgs.forEach(m => {
      if (m.envoyeur_id !== user.id) otherIds.add(m.envoyeur_id);
      if (m.destinataire_id !== user.id) otherIds.add(m.destinataire_id);
      if (m.annonce_id) annonceIds.add(m.annonce_id);
    });

    const profiles = {};
    for (const id of otherIds) {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (data) profiles[id] = data;
    }

    const annonces = {};
    for (const id of annonceIds) {
      const { data } = await supabase.from('annonces').select('id,titre,prix,images').eq('id', id).single();
      if (data) annonces[id] = data;
    }

    const convMap = {};
    const unreadCount = {};
    msgs.forEach(m => {
      const otherId = m.envoyeur_id === user.id ? m.destinataire_id : m.envoyeur_id;
      if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].lastMessage.created_at)) {
        convMap[otherId] = {
          ...convMap[otherId],
          lastMessage: m,
          otherProfile: profiles[otherId],
          annonce: m.annonce_id ? annonces[m.annonce_id] : null,
        };
      }
      if (m.destinataire_id === user.id && !m.lu) {
        unreadCount[otherId] = (unreadCount[otherId] || 0) + 1;
      }
    });

    setConversations(Object.entries(convMap).map(([id, c]) => ({
      otherId: id,
      unread: unreadCount[id] || 0,
      ...c,
    })));
    setLoading(false);
  }

  async function openConversation(chat) {
    const otherId = chat.vendeurId || chat.otherId;
    setActiveConv(otherId);
    setActiveConvData(chat);
    setShowMobileList(false);

    const { data: msgs } = await supabase.from('messages')
      .select('*')
      .or(`and(envoyeur_id.eq.${user.id},destinataire_id.eq.${otherId}),and(envoyeur_id.eq.${otherId},destinataire_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (msgs) {
      setMessages(msgs);
      const unreadIds = msgs.filter(m => m.destinataire_id === user.id && !m.lu).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ lu: true }).in('id', unreadIds);
        loadConversations();
      }
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  }

  async function sendMessage() {
    if (!inputText.trim() || !activeConv) return;
    const annonceId = activeConvData?.annonce?.id || activeConvData?.annonceId || null;
    const { data, error } = await supabase.from('messages').insert({
      annonce_id: annonceId,
      envoyeur_id: user.id,
      destinataire_id: activeConv,
      contenu: inputText.trim(),
    }).select().single();
    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setInputText('');
      loadConversations();
      try {
        await supabase.rpc('creer_notification', {
          p_user_id: activeConv,
          p_type: 'message',
          p_title: `Nouveau message de ${profile?.nom || 'quelqu\'un'}`,
          p_body: inputText.trim().slice(0, 100),
          p_data: JSON.stringify({ message_id: data.id, annonce_id: annonceId }),
        });
      } catch (_) {}
    }
  }

  function handleBack() {
    if (activeConv && !showMobileList) {
      setShowMobileList(true);
      setActiveConv(null);
      setActiveConvData(null);
      setMessages([]);
    } else {
      onBack?.();
    }
  }

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <MessageCircle size={60} className="icon" />
          <h3>Connectez-vous pour accéder à vos messages</h3>
          <p>Vous devez être connecté pour envoyer et recevoir des messages.</p>
        </div>
      </div>
    );
  }

  const otherProfile = activeConv && conversations.find(c => c.otherId === activeConv)?.otherProfile;
  const activeAnnonce = activeConvData?.annonce || (activeConv && conversations.find(c => c.otherId === activeConv)?.annonce);

  return (
    <motion.div
      className="messagerie-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="msg-header">
        <motion.button className="btn btn-ghost btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleBack}>
          <ArrowLeft size={18} />
        </motion.button>
        <div className="msg-header-info">
          {activeConv && !showMobileList ? (
            <>
              <div className="msg-header-name">{otherProfile?.entreprise_nom || otherProfile?.nom || 'Conversation'}</div>
              {activeAnnonce && (
                <div className="msg-header-annonce">
                  <ExternalLink size={10} /> {activeAnnonce.titre?.slice(0, 40)}...
                </div>
              )}
            </>
          ) : (
            <>
              <div className="msg-header-name">Messagerie</div>
              <div className="msg-header-sub">
                {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
        {otherProfile && (
          <motion.button
            className="btn btn-ghost btn-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onShowVendeur?.(otherProfile.id)}
            title="Voir le profil"
          >
            <User size={16} />
          </motion.button>
        )}
      </div>

      <div className="msg-body">
        <div
          className={`conv-list-panel${activeConv && !showMobileList ? ' hide-on-mobile' : ''}`}
          style={!activeConv ? { width: '100%' } : { width: 320 }}
        >
          <div className="conv-search">
            <Search size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
            <input
              className="conv-search-input"
              placeholder="Rechercher une conversation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="conv-list-scroll">
            {loading ? (
              <div className="conv-loading">
                <div className="conv-loading-dot" />
                <div className="conv-loading-dot" />
                <div className="conv-loading-dot" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <MessageCircle size={36} className="icon" />
                <h3 style={{ fontSize: 15 }}>
                  {search ? 'Aucun résultat' : 'Aucune conversation'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
                  {search
                    ? 'Essayez un autre terme de recherche.'
                    : 'Contactez un vendeur depuis une annonce pour démarrer.'}
                </p>
              </div>
            ) : (
              filteredConvs.map(c => (
                <ConversationRow
                  key={c.otherId}
                  conv={c}
                  active={activeConv === c.otherId}
                  unread={c.unread}
                  onClick={() => openConversation(c)}
                />
              ))
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeConv && !showMobileList ? (
            <motion.div
              className="conv-chat"
              key={activeConv || 'chat'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {activeAnnonce && (
                <div className="msg-annonce-banner">
                  <span className="msg-annonce-label">À propos de :</span>
                  <span className="msg-annonce-title">{activeAnnonce.titre}</span>
                  {activeAnnonce.prix != null && (
                    <span className="msg-annonce-price">
                      {activeAnnonce.prix === 0 ? 'GRATUIT' : `${new Intl.NumberFormat('fr-FR').format(activeAnnonce.prix)} F CFA`}
                    </span>
                  )}
                </div>
              )}

              <div className="messages-area">
                {messages.length === 0 ? (
                  <div className="msg-empty-chat">
                    <div className="msg-empty-avatar">
                      {(otherProfile?.nom || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <h4>{otherProfile?.entreprise_nom || otherProfile?.nom}</h4>
                    <p>Débutez la conversation — envoyez votre premier message</p>
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div key={m.id}>
                      {shouldShowDate(messages, idx) && (
                        <DateSeparator date={m.created_at} />
                      )}
                      <MessageBubble msg={m} isMine={m.envoyeur_id === user.id} />
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="msg-input-area">
                <div className="msg-input-row">
                  <input
                    ref={inputRef}
                    className="form-control msg-input"
                    placeholder="Écrivez votre message..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <motion.button
                    className="btn btn-primary msg-send-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={!inputText.trim()}
                  >
                    <Send size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="conv-chat-empty"
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="conv-empty-inner">
                <div className="conv-empty-icon">
                  <MessageCircle size={40} />
                </div>
                <p>Sélectionnez une conversation</p>
                <span>pour voir vos messages</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
