import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, collection, addDoc, deleteDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import './VideoCall.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export default function VideoCall({ roomName, userName, onClose, isVideoCall = true }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const roomId = roomName.replace(/[^a-zA-Z0-9-]/g, '');
  const odIdRef = useRef(`user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // Get user media
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall ? { width: 1280, height: 720, facingMode: 'user' } : false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      alert('Could not access camera/microphone. Please allow permissions.');
      return null;
    }
  }, [isVideoCall]);

  // Create peer connection for a participant
  const createPeerConnection = useCallback((odId, isInitiator) => {
    if (peerConnections.current[odId]) {
      return peerConnections.current[odId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current[odId] = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [odId]: event.streams[0],
      }));
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const candidateRef = collection(db, 'calls', roomId, 'candidates');
        await addDoc(candidateRef, {
          odId: odIdRef.current,
          toId: odId,
          candidate: event.candidate.toJSON(),
          timestamp: serverTimestamp(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[odId];
          return newStreams;
        });
        setParticipants(prev => prev.filter(p => p.odId !== odId));
      }
    };

    return pc;
  }, [roomId]);

  // Initialize room and signaling
  useEffect(() => {
    let unsubscribeParticipants;
    let unsubscribeCandidates;
    let unsubscribeOffers;
    let unsubscribeAnswers;
    let unsubscribeChat;

    const init = async () => {
      const stream = await startMedia();
      if (!stream) return;

      const roomRef = doc(db, 'calls', roomId);
      const participantsRef = collection(roomRef, 'participants');
      const offersRef = collection(roomRef, 'offers');
      const answersRef = collection(roomRef, 'answers');
      const candidatesRef = collection(roomRef, 'candidates');
      const chatRef = collection(roomRef, 'chat');

      // Join room
      const myParticipantRef = doc(participantsRef, odIdRef.current);
      await setDoc(myParticipantRef, {
        odId: odIdRef.current,
        name: userName || 'Guest',
        joinedAt: serverTimestamp(),
      });

      // Listen for participants
      unsubscribeParticipants = onSnapshot(participantsRef, async (snapshot) => {
        const parts = snapshot.docs.map(d => d.data());
        setParticipants(parts);

        // Create offers for new participants
        for (const part of parts) {
          if (part.odId !== odIdRef.current && !peerConnections.current[part.odId]) {
            // Only initiate if our ID is "greater" to avoid duplicate connections
            if (odIdRef.current > part.odId) {
              const pc = createPeerConnection(part.odId, true);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              await addDoc(offersRef, {
                fromId: odIdRef.current,
                toId: part.odId,
                offer: { type: offer.type, sdp: offer.sdp },
                timestamp: serverTimestamp(),
              });
            }
          }
        }
      });

      // Listen for offers
      unsubscribeOffers = onSnapshot(offersRef, async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.toId === odIdRef.current) {
              const pc = createPeerConnection(data.fromId, false);
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              await addDoc(answersRef, {
                fromId: odIdRef.current,
                toId: data.fromId,
                answer: { type: answer.type, sdp: answer.sdp },
                timestamp: serverTimestamp(),
              });
            }
          }
        }
      });

      // Listen for answers
      unsubscribeAnswers = onSnapshot(answersRef, async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.toId === odIdRef.current) {
              const pc = peerConnections.current[data.fromId];
              if (pc && !pc.currentRemoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              }
            }
          }
        }
      });

      // Listen for ICE candidates
      unsubscribeCandidates = onSnapshot(candidatesRef, async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.toId === odIdRef.current) {
              const pc = peerConnections.current[data.odId];
              if (pc) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                  console.error('ICE error:', e);
                }
              }
            }
          }
        }
      });

      // Listen for chat messages
      unsubscribeChat = onSnapshot(chatRef, (snapshot) => {
        const msgs = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        setChatMessages(msgs);
      });
    };

    init();

    return () => {
      // Cleanup
      if (unsubscribeParticipants) unsubscribeParticipants();
      if (unsubscribeCandidates) unsubscribeCandidates();
      if (unsubscribeOffers) unsubscribeOffers();
      if (unsubscribeAnswers) unsubscribeAnswers();
      if (unsubscribeChat) unsubscribeChat();

      // Close all peer connections
      Object.values(peerConnections.current).forEach(pc => pc.close());

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Remove participant from room
      const participantRef = doc(db, 'calls', roomId, 'participants', odIdRef.current);
      deleteDoc(participantRef).catch(() => {});
    };
  }, [roomId, userName, startMedia, createPeerConnection]);

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Screen share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share, switch back to camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      const videoTrack = stream.getVideoTracks()[0];

      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });

      localStreamRef.current.getVideoTracks()[0]?.stop();
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setLocalStream(stream);
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => toggleScreenShare();

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  };

  // Copy meeting link
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send chat message
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const chatRef = collection(db, 'calls', roomId, 'chat');
    await addDoc(chatRef, {
      sender: userName || 'Guest',
      senderId: odIdRef.current,
      message: chatInput.trim(),
      timestamp: serverTimestamp(),
    });
    setChatInput('');
  };

  // End call
  const handleEndCall = async () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());

    // Remove from participants
    try {
      const participantRef = doc(db, 'calls', roomId, 'participants', odIdRef.current);
      await deleteDoc(participantRef);
    } catch (e) {}

    onClose?.();
  };

  const remoteStreamEntries = Object.entries(remoteStreams);

  return (
    <div className="vc-overlay">
      {/* Header */}
      <div className="vc-header">
        <div className="vc-header-left">
          <span className="vc-logo">📹</span>
          <span className="vc-title">CampusKart Meet</span>
          <span className="vc-participants-count">{participants.length} in call</span>
        </div>
        <div className="vc-header-right">
          <button className="vc-copy-btn" onClick={copyLink}>
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
          <button className="vc-end-btn" onClick={handleEndCall}>
            Leave
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="vc-main">
        <div className={`vc-grid vc-grid-${Math.min(remoteStreamEntries.length + 1, 4)}`}>
          {/* Local Video */}
          <div className="vc-video-container vc-local">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={isVideoOff ? 'vc-video-hidden' : ''}
            />
            {isVideoOff && (
              <div className="vc-avatar">
                <span>{(userName || 'G')[0].toUpperCase()}</span>
              </div>
            )}
            <div className="vc-video-label">
              <span className="vc-name">You {isMuted && '🔇'}</span>
            </div>
            {isScreenSharing && <div className="vc-screen-badge">Presenting</div>}
          </div>

          {/* Remote Videos */}
          {remoteStreamEntries.map(([odId, stream]) => {
            const participant = participants.find(p => p.odId === odId);
            return (
              <div key={odId} className="vc-video-container">
                <video
                  autoPlay
                  playsInline
                  ref={el => { if (el) el.srcObject = stream; }}
                />
                <div className="vc-video-label">
                  <span className="vc-name">{participant?.name || 'Guest'}</span>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {remoteStreamEntries.length === 0 && (
            <div className="vc-video-container vc-empty">
              <div className="vc-waiting">
                <span>👥</span>
                <p>Waiting for others to join...</p>
                <p className="vc-room-code">Room: {roomId}</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="vc-chat">
            <div className="vc-chat-header">
              <span>Chat</span>
              <button onClick={() => setShowChat(false)}>✕</button>
            </div>
            <div className="vc-chat-messages">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`vc-chat-msg ${msg.senderId === odIdRef.current ? 'mine' : ''}`}>
                  <span className="vc-chat-sender">{msg.sender}</span>
                  <p>{msg.message}</p>
                </div>
              ))}
            </div>
            <div className="vc-chat-input">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Type a message..."
              />
              <button onClick={sendChat}>Send</button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="vc-controls">
        <button className={`vc-ctrl-btn ${isMuted ? 'off' : ''}`} onClick={toggleMute}>
          {isMuted ? '🔇' : '🎤'}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
        {isVideoCall && (
          <button className={`vc-ctrl-btn ${isVideoOff ? 'off' : ''}`} onClick={toggleVideo}>
            {isVideoOff ? '📷' : '🎥'}
            <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </button>
        )}
        <button className={`vc-ctrl-btn ${isScreenSharing ? 'active' : ''}`} onClick={toggleScreenShare}>
          🖥️
          <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
        </button>
        <button className="vc-ctrl-btn" onClick={() => setShowChat(!showChat)}>
          💬
          <span>Chat</span>
        </button>
        <button className="vc-ctrl-btn end" onClick={handleEndCall}>
          📞
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
}
