import { useEffect, useRef } from 'react';
import './VideoCall.css';

export default function VideoCall({ roomName, userName, onClose, isVideoCall = true }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    // Load 8x8 Jitsi script
    const loadScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://8x8.vc/vpaas-magic-cookie-30a3594d6d0d4aa4b2e56d2e2c5b0e1e/external_api.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initMeeting = async () => {
      try {
        await loadScript();

        const domain = '8x8.vc';
        const options = {
          roomName: `vpaas-magic-cookie-30a3594d6d0d4aa4b2e56d2e2c5b0e1e/${roomName}`,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: !isVideoCall,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            disableInviteFunctions: false,
            hideConferenceSubject: false,
            subject: 'CampusKart Meeting',
            defaultLanguage: 'en',
            resolution: 720,
            p2p: { enabled: true },
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'hangup', 'chat', 'raisehand', 'tileview',
              'videoquality', 'settings', 'invite', 'participants-pane'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          },
          userInfo: {
            displayName: userName || 'CampusKart User',
          },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        api.addListener('videoConferenceLeft', () => onClose?.());
        api.addListener('readyToClose', () => onClose?.());
      } catch (err) {
        console.error('Meeting error:', err);
      }
    };

    initMeeting();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, userName, isVideoCall, onClose]);

  const handleEndCall = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    onClose?.();
  };

  return (
    <div className="video-call-overlay">
      <div className="video-call-header">
        <div className="video-call-info">
          <span className="video-call-badge">
            {isVideoCall ? '📹 Video Meeting' : '📞 Voice Call'}
          </span>
          <span className="video-call-room">CampusKart Meeting</span>
        </div>
        <button className="video-call-end-btn" onClick={handleEndCall}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
          Leave Meeting
        </button>
      </div>
      <div ref={containerRef} className="video-call-container" />
    </div>
  );
}
