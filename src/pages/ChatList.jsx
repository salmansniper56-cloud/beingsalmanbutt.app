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

  return (
    <div className="chat-list">
      <h1>Messages</h1>
      {chats.length === 0 ? (
        <p className="chat-list-empty">No conversations yet. Message a seller from an ad.</p>
      ) : (
        <ul className="chat-list-ul">
          {chats.map((chat) => {
            const peer = chat.peer;
            const name = peer?.displayName || peer?.email || 'User';
            const photo = peer?.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(name)}`;
            return (
              <li key={chat.id}>
                <Link to={`/messages/${chat.id}`} className="chat-list-item">
                  <img src={photo} alt="" className="chat-list-avatar" />
                  <div className="chat-list-info">
                    <span className="chat-list-name">{name}</span>
                    <span className="chat-list-preview">{chat.lastMessage || 'No messages yet'}</span>
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
