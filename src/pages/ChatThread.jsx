import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getChat, subscribeMessages, sendMessage } from '../lib/firestore';
import { getUser } from '../lib/firestore';
import './ChatThread.css';

export default function ChatThread() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [peer, setPeer] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    getChat(chatId).then(async (c) => {
      setChat(c);
      if (c?.participants?.length) {
        const peerId = c.participants.find((p) => p !== user?.uid);
        if (peerId) setPeer(await getUser(peerId));
      }
    });
  }, [chatId, user?.uid]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeMessages(chatId, (msgs) => {
      setMessages(msgs.map((m) => ({ ...m, createdAt: m.createdAt?.toDate?.()?.toISOString?.() ?? m.createdAt })));
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !user?.uid || sending) return;
    setSending(true);
    try {
      await sendMessage(chatId, user.uid, input.trim());
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (!chat) return <div className="app-loading">Loading…</div>;

  const peerName = peer?.displayName || peer?.email || 'User';
  const peerPhoto = peer?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerName)}&background=random`;

  return (
    <div className="chat-thread">
      <header className="chat-thread-header">
        <Link to="/messages" className="chat-thread-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        
        <div className="chat-thread-user">
          <img src={peerPhoto} alt="" className="chat-thread-avatar" />
          <div className="chat-thread-user-info">
            <span className="chat-thread-name">{peerName}</span>
            <span className="chat-thread-status">Active now</span>
          </div>
        </div>

        <div className="chat-thread-actions">
          <button className="chat-thread-action-btn" title="Voice call">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          </button>
          <button className="chat-thread-action-btn" title="Video call">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
          <button className="chat-thread-action-btn" title="Info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
        </div>
      </header>

      <ul className="chat-thread-messages">
        {messages.map((m) => (
          <li key={m.id} className={m.senderId === user?.uid ? 'sent' : 'received'}>
            <div>
              <span className="chat-bubble">{m.text}</span>
            </div>
          </li>
        ))}
        <li ref={bottomRef} />
      </ul>

      <form onSubmit={handleSend} className="chat-thread-form">
        <div className="chat-input-wrap">
          <button type="button" className="chat-emoji-btn" title="Emoji">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            disabled={sending}
          />
          {!input.trim() && (
            <div className="chat-quick-actions">
              <button type="button" className="chat-quick-btn" title="Photo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
              <button type="button" className="chat-quick-btn" title="Like">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {input.trim() && (
          <button type="submit" className="chat-send-btn" disabled={sending || !input.trim()}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}
