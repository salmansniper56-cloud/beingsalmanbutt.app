import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getChatsForUser } from '../lib/firestore';
import { getUser } from '../lib/firestore';
import './ChatList.css';

export default function ChatList() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getChatsForUser(user.uid).then(async (list) => {
      const withPeer = await Promise.all(
        list.map(async (chat) => {
          const peerId = chat.participants?.find((p) => p !== user.uid);
          const peer = peerId ? await getUser(peerId) : null;
          return { ...chat, peerId, peer };
        })
      );
      setChats(withPeer);
      setLoading(false);
    });
  }, [user?.uid]);

  if (loading) return <div className="app-loading">Loading…</div>;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate?.() ?? new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (hours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h1>
          {user?.displayName || 'Messages'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </h1>
        <button className="chat-list-new-btn" title="New message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>

      {chats.length === 0 ? (
        <div className="chat-list-empty">
          <div className="chat-list-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
          </div>
          <h2>Your messages</h2>
          <p>Send private messages to a seller from their ad</p>
        </div>
      ) : (
        <ul className="chat-list-ul">
          {chats.map((chat) => {
            const peer = chat.peer;
            const name = peer?.displayName || peer?.email || 'User';
            const photo = peer?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            const isUnread = chat.unreadCount > 0;
            
            return (
              <li key={chat.id}>
                <Link to={`/messages/${chat.id}`} className="chat-list-item">
                  <div className="chat-list-avatar-wrap">
                    <img src={photo} alt="" className="chat-list-avatar" />
                  </div>
                  <div className="chat-list-info">
                    <div className="chat-list-row">
                      <span className={`chat-list-name ${isUnread ? 'unread' : ''}`}>{name}</span>
                      <span className="chat-list-time">{formatTime(chat.updatedAt)}</span>
                    </div>
                    <div className="chat-list-row">
                      <span className={`chat-list-preview ${isUnread ? 'unread' : ''}`}>
                        {chat.lastMessage || 'No messages yet'}
                      </span>
                      {isUnread && <span className="chat-list-unread-dot" />}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
