import { useEffect, useRef } from 'react';
import './VideoCall.css';

export default function VideoCall({ roomName, userName, userEmail, onClose, isVideoCall = true }) {
  const jitsiContainerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    if (!window.JitsiMeetExternalAPI) {
      console.error('Jitsi Meet API not loaded');
      return;
    }

    const domain = '8x8.vc';
    const options = {
      roomName: `vpaas-magic-cookie-30a7e42068714f67b36f34b0e21dea38/${roomName}`,
      parentNode: jitsiContainerRef.current,
      width: '100%',
      height: '100%',
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: !isVideoCall,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        enableClosePage: false,
        disableInviteFunctions: true,
        hideConferenceSubject: true,
        hideConferenceTimer: false,
        subject: ' ',
        defaultLanguage: 'en',
        disableThirdPartyRequests: true,
        enableNoAudioDetection: true,
        enableNoisyMicDetection: true,
        resolution: 720,
        constraints: {
          video: {
            height: { ideal: 720, max: 720, min: 180 },
            width: { ideal: 1280, max: 1280, min: 320 },
          },
        },
        p2p: {
          enabled: true,
          stunServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'chat',
          'settings',
          'raisehand',
          'videoquality',
          'filmstrip',
          'tileview',
          'select-background',
          'mute-everyone',
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        DISABLE_FOCUS_INDICATOR: true,
        VERTICAL_FILMSTRIP: true,
        FILM_STRIP_MAX_HEIGHT: 120,
        ENABLE_FEEDBACK_ANIMATION: false,
        DEFAULT_BACKGROUND: '#1a1a1a',
        DEFAULT_REMOTE_DISPLAY_NAME: 'CampusKart User',
        DEFAULT_LOCAL_DISPLAY_NAME: 'Me',
        TOOLBAR_ALWAYS_VISIBLE: false,
        TOOLBAR_TIMEOUT: 4000,
        INITIAL_TOOLBAR_TIMEOUT: 20000,
        SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile'],
        VIDEO_QUALITY_LABEL_DISABLED: false,
      },
      userInfo: {
        displayName: userName || 'CampusKart User',
        email: userEmail || '',
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    apiRef.current = api;

    // Event listeners
    api.addListener('videoConferenceJoined', () => {
      console.log('Local user joined');
      api.executeCommand('displayName', userName || 'CampusKart User');
    });

    api.addListener('videoConferenceLeft', () => {
      console.log('Local user left');
      onClose?.();
    });

    api.addListener('readyToClose', () => {
      console.log('Ready to close');
      onClose?.();
    });

    api.addListener('participantLeft', (participant) => {
      console.log('Participant left:', participant);
    });

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, userName, userEmail, isVideoCall, onClose]);

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
            {isVideoCall ? '📹 Video Call' : '📞 Voice Call'}
          </span>
          <span className="video-call-room">CampusKart Call</span>
        </div>
        <button className="video-call-end-btn" onClick={handleEndCall}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
          End Call
        </button>
      </div>
      <div ref={jitsiContainerRef} className="video-call-container" />
    </div>
  );
}
