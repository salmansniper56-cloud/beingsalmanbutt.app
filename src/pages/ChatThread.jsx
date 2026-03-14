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
  const peerPhoto = peer?.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(peerName)}`;

  return (
    <div className="chat-thread">
      <header className="chat-thread-header">
        <Link to="/messages" className="chat-thread-back">« Back</Link>
        <img src={peerPhoto} alt="" className="chat-thread-avatar" />
        <span className="chat-thread-name">{peerName}</span>
      </header>
      <ul className="chat-thread-messages">
        {messages.map((m) => (
          <li key={m.id} className={m.senderId === user?.uid ? 'sent' : 'received'}>
            <span className="chat-bubble">{m.text}</span>
          </li>
        ))}
        <li ref={bottomRef} />
      </ul>
      <form onSubmit={handleSend} className="chat-thread-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
