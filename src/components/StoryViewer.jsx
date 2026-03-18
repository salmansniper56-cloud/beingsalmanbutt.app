import { useState, useEffect, useCallback } from 'react';
import { getUser, toggleStoryLike, isStoryLiked } from '../lib/firestore';
import { useAuth } from '../contexts/AuthContext';
import './StoryViewer.css';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default function StoryViewer({ storyId, stories, onClose }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(stories.findIndex(s => s.id === storyId));
  const [creator, setCreator] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (!currentStory?.createdBy) return;
    getUser(currentStory.createdBy).then(setCreator);
  }, [currentStory?.createdBy]);

  useEffect(() => {
    if (!user || !currentStory?.id) return;
    const checkLike = async () => {
      const liked = await isStoryLiked(currentStory.id, user.uid);
      setIsLiked(liked);
    };
    checkLike();
  }, [currentStory?.id, user]);

  useEffect(() => {
    setLikeCount(currentStory?.likeCount ?? 0);
  }, [currentStory?.likeCount]);

  // Auto-progress through stories and timer
  useEffect(() => {
    const storyDuration = 5000; // 5 seconds per story
    let progressInterval;
    let autoAdvanceTimeout;

    setProgress(0);

    progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 100 / (storyDuration / 100);
        if (next >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return next;
      });
    }, 100);

    autoAdvanceTimeout = setTimeout(() => {
      goToNext();
    }, storyDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(autoAdvanceTimeout);
    };
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleLike = useCallback(async () => {
    if (!user || !currentStory?.id) return;
    try {
      await toggleStoryLike(currentStory.id, user.uid);
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    } catch (err) {
      console.error('Error liking story:', err);
    }
  }, [user, currentStory?.id, isLiked]);

  const creatorName = creator?.displayName || creator?.email?.split('@')[0] || 'User';
  const creatorPhoto = creator?.photoURL;
  const isOwnStory = user?.uid === currentStory?.createdBy;

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div className="story-viewer" onClick={e => e.stopPropagation()}>
        {/* Progress Bar */}
        <div className="story-progress-bar">
          <div
            className="story-progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Header */}
        <div className="story-viewer-header">
          {creatorPhoto ? (
            <img src={creatorPhoto} alt="" className="story-viewer-avatar" />
          ) : (
            <div className="story-viewer-avatar story-viewer-avatar-fallback">
              {(creatorName[0] || 'U').toUpperCase()}
            </div>
          )}
          <div className="story-viewer-user-info">
            <span className="story-viewer-username">{creatorName}</span>
            <span className="story-viewer-time">{timeAgo(currentStory?.createdAt)}</span>
          </div>
          <button className="story-viewer-close" onClick={onClose}>✕</button>
        </div>

        {/* Media */}
        <div className="story-media-container">
          {currentStory?.mediaUrl ? (
            currentStory.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={currentStory.mediaUrl}
                className="story-media"
                autoPlay
                muted
              />
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt="Story"
                className="story-media"
              />
            )
          ) : (
            <div className="story-media story-no-media">📷</div>
          )}
        </div>

        {/* Caption */}
        {currentStory?.caption && (
          <div className="story-caption">{currentStory.caption}</div>
        )}

        {/* Like Button - Only for other people's stories */}
        {user && !isOwnStory && (
          <div className="story-actions">
            <button
              className={`story-like-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              {isLiked ? (
                <svg viewBox="0 0 24 24" fill="#ed4956">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              )}
              <span className="story-like-count">{likeCount}</span>
            </button>
          </div>
        )}

        {/* View Insights for own story */}
        {isOwnStory && (
          <div className="story-actions">
            <span className="story-view-insights">👁️ View Insights</span>
          </div>
        )}

        {/* Navigation */}
        <button
          className="story-nav-btn story-nav-prev"
          onClick={goToPrev}
          disabled={currentIndex === 0}
          aria-label="Previous story"
        >
          ‹
        </button>
        <button
          className="story-nav-btn story-nav-next"
          onClick={goToNext}
          aria-label="Next story"
        >
          ›
        </button>

        {/* Current/Total indicator */}
        <div className="story-counter">
          {currentIndex + 1} / {stories.length}
        </div>
      </div>
    </div>
  );
}
