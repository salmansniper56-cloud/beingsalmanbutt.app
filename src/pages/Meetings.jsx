import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createMeeting, getMeetings, getUserMeetings, endMeeting, getUser } from '../lib/firestore';
import VideoCall from '../components/VideoCall';
import './Meetings.css';

export default function Meetings() {
  const { user } = useAuth();
  const [tab, setTab] = useState('all');
  const [meetings, setMeetings] = useState([]);
  const [myMeetings, setMyMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [creators, setCreators] = useState({});

  useEffect(() => {
    loadMeetings();
  }, [user?.uid]);

  async function loadMeetings() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([
        getMeetings(user.uid),
        getUserMeetings(user.uid),
      ]);
      setMeetings(all);
      setMyMeetings(mine);
      
      // Load creator info
      const creatorIds = [...new Set(all.map(m => m.createdBy))];
      const creatorData = {};
      await Promise.all(creatorIds.map(async (id) => {
        const u = await getUser(id);
        if (u) creatorData[id] = u;
      }));
      setCreators(creatorData);
    } catch (err) {
      console.error('Error loading meetings:', err);
    } finally {
      setLoading(false);
    }
  }

  function generateRoomName() {
    return `campuskart-meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async function handleCreateInstantMeeting() {
    if (!user?.uid) return;
    try {
      const roomName = generateRoomName();
      const meetingId = await createMeeting({
        title: `${user.displayName || 'User'}'s Meeting`,
        createdBy: user.uid,
        roomName,
        isInstant: true,
        participants: [user.uid],
      });
      setActiveMeeting({ roomName, title: 'Instant Meeting' });
      loadMeetings();
    } catch (err) {
      console.error('Error creating meeting:', err);
    }
  }

  function handleJoinMeeting(meeting) {
    setActiveMeeting({ roomName: meeting.roomName, title: meeting.title });
  }

  async function handleEndMeeting(meetingId) {
    try {
      await endMeeting(meetingId);
      loadMeetings();
    } catch (err) {
      console.error('Error ending meeting:', err);
    }
  }

  const displayMeetings = tab === 'all' ? meetings : myMeetings;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="meetings-page">
      <div className="meetings-header">
        <h1>📹 Online Meetings</h1>
        <p>Create or join video meetings with anyone</p>
      </div>

      <div className="meetings-actions">
        <button className="meetings-btn primary" onClick={handleCreateInstantMeeting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 10l5-5m0 0v4m0-4h-4M9 14l-5 5m0 0v-4m0 4h4" />
          </svg>
          Start Instant Meeting
        </button>
        <button className="meetings-btn secondary" onClick={() => setShowCreate(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Schedule Meeting
        </button>
      </div>

      <div className="meetings-tabs">
        <button className={`meetings-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          All Meetings
        </button>
        <button className={`meetings-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
          My Meetings
        </button>
      </div>

      {loading ? (
        <div className="meetings-loading">
          <div className="spinner" />
          <p>Loading meetings...</p>
        </div>
      ) : displayMeetings.length === 0 ? (
        <div className="meetings-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M17 12h2M5 12h2" />
          </svg>
          <h3>No meetings yet</h3>
          <p>Start an instant meeting or schedule one for later</p>
        </div>
      ) : (
        <div className="meetings-list">
          {displayMeetings.map((meeting) => {
            const creator = creators[meeting.createdBy];
            const isOwner = meeting.createdBy === user?.uid;
            return (
              <div key={meeting.id} className="meeting-card">
                <div className="meeting-icon">
                  {meeting.isInstant ? '🎥' : '📅'}
                </div>
                <div className="meeting-info">
                  <h3>{meeting.title}</h3>
                  <p className="meeting-creator">
                    By {creator?.displayName || 'Unknown'}
                    {meeting.scheduledAt && ` • ${formatDate(meeting.scheduledAt)}`}
                  </p>
                  <p className="meeting-participants">
                    {meeting.participants?.length || 0} participant(s)
                  </p>
                </div>
                <div className="meeting-actions">
                  <button 
                    className="meeting-join-btn" 
                    onClick={() => handleJoinMeeting(meeting)}
                  >
                    Join
                  </button>
                  {isOwner && (
                    <button 
                      className="meeting-end-btn" 
                      onClick={() => handleEndMeeting(meeting.id)}
                    >
                      End
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreate && (
        <CreateMeetingModal 
          onClose={() => setShowCreate(false)} 
          userId={user?.uid}
          userName={user?.displayName}
          onCreated={loadMeetings}
          generateRoomName={generateRoomName}
        />
      )}

      {/* Active Meeting */}
      {activeMeeting && (
        <VideoCall
          roomName={activeMeeting.roomName}
          userName={user?.displayName || 'CampusKart User'}
          userEmail={user?.email || ''}
          isVideoCall={true}
          onClose={() => setActiveMeeting(null)}
        />
      )}
    </div>
  );
}

function CreateMeetingModal({ onClose, userId, userName, onCreated, generateRoomName }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createMeeting({
        title: title.trim(),
        description: description.trim(),
        createdBy: userId,
        roomName: generateRoomName(),
        scheduledAt: scheduledAt || null,
        isInstant: false,
        participants: [userId],
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating meeting:', err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="meetings-modal-overlay" onClick={onClose}>
      <div className="meetings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="meetings-modal-header">
          <h2>Schedule Meeting</h2>
          <button className="meetings-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="meetings-modal-body">
          <div className="meetings-form-group">
            <label>Meeting Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Project Discussion"
            />
          </div>
          <div className="meetings-form-group">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this meeting about?"
              rows={3}
            />
          </div>
          <div className="meetings-form-group">
            <label>Schedule For (optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>
        <div className="meetings-modal-footer">
          <button className="meetings-btn secondary" onClick={onClose}>Cancel</button>
          <button 
            className="meetings-btn primary" 
            onClick={handleCreate}
            disabled={creating || !title.trim()}
          >
            {creating ? 'Creating...' : 'Create Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}
