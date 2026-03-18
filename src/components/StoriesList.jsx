import { useState, useEffect, useRef } from 'react';
import { getFollowingStories, getUser } from '../lib/firestore';
import { useAuth } from '../contexts/AuthContext';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';
import './StoriesList.css';

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

export default function StoriesList({ onStoryCreated }) {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [storyCreators, setStoryCreators] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    loadStories();
  }, [user]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const fetchedStories = await getFollowingStories(user.uid, 50);
      setStories(fetchedStories);

      // Fetch creator info for each unique story creator
      const creatorIds = [...new Set(fetchedStories.map(s => s.createdBy))];
      const creators = {};
      for (const creatorId of creatorIds) {
        const creator = await getUser(creatorId);
        if (creator) creators[creatorId] = creator;
      }
      setStoryCreators(creators);
    } catch (err) {
      console.error('Error loading stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryCreated = async () => {
    await loadStories();
    onStoryCreated?.();
  };

  const groupedStories = stories.reduce((acc, story) => {
    const creator = storyCreators[story.createdBy];
    if (!acc[story.createdBy]) {
      acc[story.createdBy] = {
        creator,
        stories: [],
      };
    }
    acc[story.createdBy].stories.push(story);
    return acc;
  }, {});

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = 300;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="stories-loading">
        <div className="stories-spinner"></div>
      </div>
    );
  }

  return (
    <>
      <div className="stories-container">
        <button
          className="stories-scroll-btn stories-scroll-left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div className="stories-list-wrapper" ref={scrollContainerRef}>
          {/* Create Story Button */}
          <button
            className="story-avatar create-story-btn"
            onClick={() => setShowCreateModal(true)}
            title="Create story"
          >
            <div className="create-story-icon">+</div>
            <span className="story-user-label">Your Story</span>
          </button>

          {/* Stories */}
          {Object.entries(groupedStories).map(([creatorId, { creator, stories: creatorStories }]) => (
            <button
              key={creatorId}
              className="story-avatar"
              onClick={() => setSelectedStoryId(creatorStories[0]?.id)}
              title={creator?.displayName || 'User'}
            >
              {creator?.photoURL ? (
                <img src={creator.photoURL} alt={creator.displayName} className="story-avatar-img" />
              ) : (
                <div className="story-avatar-fallback">
                  {(creator?.displayName?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="story-indicator"></div>
              <span className="story-user-label">{creator?.displayName?.split(' ')[0] || 'User'}</span>
            </button>
          ))}
        </div>

        <button
          className="stories-scroll-btn stories-scroll-right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>

      {/* Story Viewer Modal */}
      {selectedStoryId && (
        <StoryViewer
          storyId={selectedStoryId}
          stories={stories}
          onClose={() => setSelectedStoryId(null)}
        />
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <CreateStoryModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleStoryCreated}
        />
      )}
    </>
  );
}
