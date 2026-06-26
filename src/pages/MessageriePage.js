import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';

function ConversationRow({ conv, active, onClick, unread }) {
  const other = conv.otherProfile;
  if (!other) return null;
  return (
    <motion.div className={`conv-row ${active ? 'active' : ''}`}
      onClick={onClick}
      whileHover={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="conv-avatar">{(other.nom || 'U').slice(0, 2).toUpperCase()}</div>
      <div className="conv-info">
        <div className="conv-name">{other.entreprise_nom || other.nom}</div>
        <div className="conv-preview">{conv.lastMessage?.contenu?.slice(0, 50) || 'Aucun message'}</div>
      </div>
      {unread > 0 && <div className="conv-unread">{unread}</div>}
    </motion.div>
  );
}

function MessageBubble({ msg, isMine }) {
  return (
    <motion.div className={`msg-bubble ${isMine ? 'mine' : 'theirs'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="msg-text">{msg.contenu}</div>
      <div className="msg-time">{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    </motion.div>
  );
}

export default function MessageriePage({ onBack, initialChat, onShowDetail }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

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
    if (!activeConv) return;
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
  }, [activeConv, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadConversations() {
    const { data: msgs } = await supabase.from('messages')
      .select('*')
      .or(`envoyeur_id.eq.${user.id},destinataire_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!msgs) { setLoading(false); return; }

    const otherIds = new Set();
    msgs.forEach(m => {
      if (m.envoyeur_id !== user.id) otherIds.add(m.envoyeur_id);
      if (m.destinataire_id !== user.id) otherIds.add(m.destinataire_id);
    });

    const profiles = {};
    for (const id of otherIds) {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (data) profiles[id] = data;
    }

    const convMap = {};
    msgs.forEach(m => {
      const otherId = m.envoyeur_id === user.id ? m.destinataire_id : m.envoyeur_id;
      if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].lastMessage.created_at)) {
        convMap[otherId] = { ...convMap[otherId], lastMessage: m, otherProfile: profiles[otherId] };
      }
    });

    setConversations(Object.entries(convMap).map(([id, c]) => ({ otherId: id, ...c })));
    setLoading(false);
  }

  async function openConversation(chat) {
    const otherId = chat.vendeurId || chat.otherId;
    setActiveConv(otherId);
    const { data: msgs } = await supabase.from('messages')
      .select('*')
      .or(`and(envoyeur_id.eq.${user.id},destinataire_id.eq.${otherId}),and(envoyeur_id.eq.${otherId},destinataire_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    if (msgs) setMessages(msgs);
  }

  async function sendMessage() {
    if (!inputText.trim() || !activeConv) return;
    const { data, error } = await supabase.from('messages').insert({
      annonce_id: initialChat?.annonceId || null,
      envoyeur_id: user.id,
      destinataire_id: activeConv,
      contenu: inputText.trim(),
    }).select().single();
    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setInputText('');
      loadConversations();
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

  return (
    <div className="page" style={{ padding: '0 0 80px 0', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <motion.button className="btn btn-ghost btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
          <ArrowLeft size={18} />
        </motion.button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0 }}>
          {activeConv ? 'Conversation' : 'Messagerie'}
        </h2>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="conv-list" style={{ width: activeConv ? 320 : '100%', borderRight: activeConv ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
          {loading ? (
            <div style={{ padding: 20 }}>Chargement...</div>
          ) : conversations.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <MessageCircle size={40} className="icon" />
              <h3 style={{ fontSize: 15 }}>Aucune conversation</h3>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>Contactez un vendeur depuis une annonce pour démarrer une conversation.</p>
            </div>
          ) : (
            conversations.map(c => (
              <ConversationRow
                key={c.otherId}
                conv={c}
                active={activeConv === c.otherId}
                onClick={() => setActiveConv ? openConversation(c) : null}
              />
            ))
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeConv ? (
            <motion.div className="conv-chat"
              key={activeConv}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <div className="messages-area" style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 14 }}>
                    Débutez la conversation — envoyez votre premier message
                  </div>
                ) : (
                  messages.map(m => (
                    <MessageBubble key={m.id} msg={m} isMine={m.envoyeur_id === user.id} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="msg-input-area" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input className="form-control"
                    placeholder="Écrivez votre message..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    style={{ flex: 1, padding: '10px 14px' }}
                  />
                  <motion.button className="btn btn-primary"
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    style={{ padding: '10px 16px' }}
                  >
                    <Send size={18} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div className="conv-chat-empty"
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                <MessageCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>Sélectionnez une conversation</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
