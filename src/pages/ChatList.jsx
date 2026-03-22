import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  getChatsForUser, 
  getGroupChats, 
  getUserCommunities, 
  getUser, 
  getChat,
  subscribeMessages,
  sendMessage,
  createGroupChat,
  searchUsers,
  sendCallNotification,
  updateCallStatus,
  subscribeToIncomingCalls,
} from '../lib/firestore';
import { uploadChatMedia } from '../lib/storage';
import VideoCall from '../components/VideoCall';
import './ChatList.css';

export default function ChatList() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('all');
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  
  // Active chat state
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [peer, setPeer] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [inCall, setInCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  // Subscribe to incoming calls
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToIncomingCalls(user.uid, async (call) => {
      if (call) {
        // Get caller info
        const caller = await getUser(call.callerId);
        setIncomingCall({ ...call, caller });
      } else {
        setIncomingCall(null);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    loadChats();
  }, [user?.uid]);

  useEffect(() => {
    if (chatId) {
      loadActiveChat(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeMessages(chatId, (msgs) => {
      setMessages(msgs.map((m) => ({ 
        ...m, 
        createdAt: m.createdAt?.toDate?.()?.toISOString?.() ?? m.createdAt 
      })));
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChats() {
    setLoading(true);
    const [allChats, groupChats, userCommunities] = await Promise.all([
      getChatsForUser(user.uid),
      getGroupChats(user.uid).catch(() => []),
      getUserCommunities(user.uid).catch(() => []),
    ]);
    
    const withPeers = await Promise.all(
      allChats.filter(c => c.type !== 'group').map(async (chat) => {
        const peerId = chat.participants?.find((p) => p !== user.uid);
        const peerData = peerId ? await getUser(peerId) : null;
        return { ...chat, peer: peerData };
      })
    );
    
    setChats(withPeers);
    setGroups(groupChats);
    setCommunities(userCommunities);
    setLoading(false);
  }

  async function loadActiveChat(id) {
    const chatData = await getChat(id);
    setActiveChat(chatData);
    if (chatData?.participants?.length) {
      const peerId = chatData.participants.find((p) => p !== user?.uid);
      if (peerId) {
        const peerData = await getUser(peerId);
        setPeer(peerData);
      }
    }
  }

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

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !chatId || !user?.uid) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const mediaUrl = await uploadChatMedia(chatId, file);
      await sendMessage(chatId, user.uid, '', mediaUrl, 'image');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      // Clear the input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function startCall(type) {
    if (!chatId || !peer) return;
    
    // Generate unique room name based on chat ID
    const roomName = `campuskart-call-${chatId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
    
    // Send call notification to the other person
    try {
      const callId = await sendCallNotification(user.uid, peer.id, type, roomName);
      
      setInCall({ 
        type, 
        peer, 
        roomName,
        callId,
        isVideoCall: type === 'video'
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      alert('Failed to start call. Please try again.');
    }
  }

  async function endCall() {
    if (inCall?.callId) {
      try {
        await updateCallStatus(inCall.callId, 'ended');
      } catch (err) {
        console.error('Failed to update call status:', err);
      }
    }
    setInCall(null);
  }

  async function acceptIncomingCall() {
    if (!incomingCall) return;
    try {
      await updateCallStatus(incomingCall.id, 'accepted');
      setInCall({
        type: incomingCall.callType,
        peer: incomingCall.caller,
        roomName: incomingCall.roomName,
        callId: incomingCall.id,
        isVideoCall: incomingCall.callType === 'video'
      });
      setIncomingCall(null);
    } catch (err) {
      console.error('Failed to accept call:', err);
    }
  }

  async function declineIncomingCall() {
    if (!incomingCall) return;
    try {
      await updateCallStatus(incomingCall.id, 'declined');
      setIncomingCall(null);
    } catch (err) {
      console.error('Failed to decline call:', err);
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp?.toDate?.() ?? new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 24) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (hours < 168) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getFilteredChats = () => {
    let list = [];
    if (tab === 'all') list = chats;
    else if (tab === 'groups') list = groups;
    else if (tab === 'communities') list = communities;
    else if (tab === 'unread') list = chats.filter(c => c.unreadCount > 0);
    
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(c => 
        c.name?.toLowerCase().includes(lower) || 
        c.peer?.displayName?.toLowerCase().includes(lower) ||
        c.peer?.email?.toLowerCase().includes(lower)
      );
    }
    return list;
  };

  if (loading) return <div className="app-loading">Loading…</div>;

  const peerName = peer?.displayName || peer?.email || activeChat?.name || 'User';
  const peerPhoto = peer?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerName)}&background=3a3b3c&color=fff`;

  return (
    <div className={`messenger-container ${chatId ? 'chat-open' : ''}`}>
      {/* Left Sidebar */}
      <div className="messenger-sidebar">
        <div className="messenger-header">
          <h1>Chats</h1>
          <div className="messenger-header-actions">
            <button className="messenger-icon-btn" title="Options">
              <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>
            </button>
            <button className="messenger-icon-btn" title="New message" onClick={() => setShowCreateGroup(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
        </div>

        <div className="messenger-search">
          <input 
            type="text" 
            className="messenger-search-input" 
            placeholder="Search Messenger" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="messenger-tabs">
          <button className={`messenger-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All</button>
          <button className={`messenger-tab ${tab === 'unread' ? 'active' : ''}`} onClick={() => setTab('unread')}>Unread</button>
          <button className={`messenger-tab ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>Groups</button>
          <button className={`messenger-tab ${tab === 'communities' ? 'active' : ''}`} onClick={() => setTab('communities')}>Communities</button>
        </div>

        <div className="messenger-chat-list">
          {getFilteredChats().length === 0 ? (
            <div className="messenger-empty">
              <div className="messenger-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
              </div>
              <h2>No messages</h2>
              <p>{tab === 'all' ? 'Start a conversation with someone' : `No ${tab} yet`}</p>
            </div>
          ) : (
            getFilteredChats().map((chat) => {
              const isGroup = chat.type === 'group';
              const name = isGroup ? chat.name : (chat.peer?.displayName || chat.peer?.email || 'User');
              const photo = isGroup ? chat.photoURL : (chat.peer?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3a3b3c&color=fff`);
              const isUnread = chat.unreadCount > 0;
              
              return (
                <Link 
                  key={chat.id} 
                  to={`/messages/${chat.id}`} 
                  className={`messenger-chat-item ${chatId === chat.id ? 'active' : ''}`}
                >
                  <div className="messenger-avatar-wrap">
                    {isGroup ? (
                      <div className="messenger-group-avatar">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 000 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85A6.95 6.95 0 0020 14c-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>
                      </div>
                    ) : (
                      <>
                        <img src={photo} alt="" className="messenger-avatar" />
                        <span className="messenger-online-dot" />
                      </>
                    )}
                  </div>
                  <div className="messenger-chat-info">
                    <div className="messenger-chat-name">{name}</div>
                    <div className={`messenger-chat-preview ${isUnread ? 'unread' : ''}`}>
                      <span>{chat.lastMessage || 'No messages yet'}</span>
                      <span>·</span>
                      <span className="messenger-chat-time">{formatTime(chat.lastMessageAt)}</span>
                    </div>
                  </div>
                  {isUnread && <span className="messenger-unread-badge" />}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {chatId && activeChat ? (
        <div className="messenger-main">
          <div className="messenger-main-header">
            <div className="messenger-main-user">
              <Link to="/messages" className="messenger-icon-btn" style={{ marginRight: 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </Link>
              <img src={peerPhoto} alt="" className="messenger-main-avatar" />
              <div className="messenger-main-info">
                <h2>{peerName}</h2>
                <span className="messenger-main-status">Active now</span>
              </div>
            </div>
            <div className="messenger-main-actions">
              <button className="messenger-action-btn" title="Voice call" onClick={() => startCall('voice')}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
              </button>
              <button className="messenger-action-btn" title="Video call" onClick={() => startCall('video')}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              </button>
              <button className="messenger-action-btn" title="Info" onClick={() => setShowRightSidebar(!showRightSidebar)}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              </button>
            </div>
          </div>

          <div className="messenger-messages">
            <div className="messenger-encryption">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
              Messages and calls are secured with end-to-end encryption.
            </div>
            
            {messages.map((m) => (
              <div key={m.id} className={`messenger-msg-wrap ${m.senderId === user?.uid ? 'sent' : 'received'}`}>
                <div>
                  {m.mediaUrl ? (
                    <img src={m.mediaUrl} alt="" className="messenger-msg-image" />
                  ) : (
                    <span className="messenger-msg">{m.text}</span>
                  )}
                  <div className="messenger-msg-time">{formatTime(m.createdAt)}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="messenger-input-area">
            <div className="messenger-media-btns">
              <button type="button" className="messenger-media-btn" title="Voice clip">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
              <button 
                type="button" 
                className="messenger-media-btn" 
                title={uploading ? 'Uploading...' : 'Photo'} 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={uploading ? { opacity: 0.5 } : {}}
              >
                {uploading ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="spin"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                )}
              </button>
              <button type="button" className="messenger-media-btn" title="Sticker">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
              </button>
              <button type="button" className="messenger-media-btn" title="GIF">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 9H13v6h-1.5zM9 9H6c-.6 0-1 .5-1 1v4c0 .5.4 1 1 1h3c.6 0 1-.5 1-1v-2H8.5v1.5h-2v-3H10V10c0-.5-.4-1-1-1zm10 1.5V9h-4.5v6H16v-2h2v-1.5h-2v-1z"/></svg>
              </button>
            </div>
            
            <div className="messenger-input-wrap">
              <input
                type="text"
                className="messenger-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Aa"
                disabled={sending}
              />
              <button type="button" className="messenger-emoji-btn" title="Emoji">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
              </button>
            </div>

            {input.trim() ? (
              <button type="submit" className="messenger-send-btn" disabled={sending}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            ) : (
              <button type="button" className="messenger-send-btn" title="Like">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
              </button>
            )}
          </form>
        </div>
      ) : (
        <div className="messenger-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="messenger-empty">
            <div className="messenger-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            </div>
            <h2>Select a conversation</h2>
            <p>Choose from your existing conversations or start a new one</p>
          </div>
        </div>
      )}

      {/* Right Sidebar */}
      {chatId && showRightSidebar && (
        <div className="messenger-right-sidebar">
          <img src={peerPhoto} alt="" className="messenger-profile-avatar" />
          <div className="messenger-profile-name">{peerName}</div>
          <div className="messenger-profile-status">Active 4h ago</div>
          <div className="messenger-profile-badge">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>
            End-to-end encrypted
          </div>
          
          <div className="messenger-profile-actions">
            <button className="messenger-profile-action">
              <div className="messenger-profile-action-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
              </div>
              <span>Profile</span>
            </button>
            <button className="messenger-profile-action">
              <div className="messenger-profile-action-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              </div>
              <span>Mute</span>
            </button>
            <button className="messenger-profile-action">
              <div className="messenger-profile-action-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              </div>
              <span>Search</span>
            </button>
          </div>

          <div className="messenger-accordion">
            <div className="messenger-accordion-item">
              <button className="messenger-accordion-header">
                Chat info
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <div className="messenger-accordion-item">
              <button className="messenger-accordion-header">
                Customize chat
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <div className="messenger-accordion-item">
              <button className="messenger-accordion-header">
                Media & files
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <div className="messenger-accordion-item">
              <button className="messenger-accordion-header">
                Privacy & support
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} userId={user?.uid} onCreated={loadChats} />
      )}

      {/* Incoming Call Notification */}
      {incomingCall && !inCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-modal">
            <div className="incoming-call-avatar">
              <img 
                src={incomingCall.caller?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(incomingCall.caller?.displayName || 'User')}&background=667eea&color=fff`} 
                alt="" 
              />
            </div>
            <h3>{incomingCall.caller?.displayName || 'Someone'}</h3>
            <p>{incomingCall.callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}</p>
            <div className="incoming-call-actions">
              <button className="incoming-call-btn decline" onClick={declineIncomingCall}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                Decline
              </button>
              <button className="incoming-call-btn accept" onClick={acceptIncomingCall}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Overlay with Jitsi Meet */}
      {inCall && (
        <VideoCall
          roomName={inCall.roomName}
          userName={user?.displayName || 'CampusKart User'}
          userEmail={user?.email || ''}
          isVideoCall={inCall.isVideoCall}
          onClose={endCall}
        />
      )}
    </div>
  );
}

function CreateGroupModal({ onClose, userId, onCreated }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createGroupChat(userId, name.trim(), []);
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="messenger-modal-overlay" onClick={onClose}>
      <div className="messenger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="messenger-modal-header">
          <h2>Create Group</h2>
          <button className="messenger-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="messenger-modal-body">
          <input
            type="text"
            className="messenger-modal-input"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="messenger-modal-footer">
          <button className="messenger-btn messenger-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="messenger-btn messenger-btn-primary" disabled={!name.trim() || creating} onClick={handleCreate}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
