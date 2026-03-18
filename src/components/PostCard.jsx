import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getComments, addComment, deletePost } from '../lib/firestore';
import { getUser } from '../lib/firestore';
import AdImage from './AdImage';
import './PostCard.css';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}

export default function PostCard({ post, isLiked, onLike, onDelete }) {
  const { user } = useAuth();
  const [creator, setCreator] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [doubleTapLiked, setDoubleTapLiked] = useState(false);
  const lastTapRef = useRef(0);

  const isOwner = user?.uid === post?.createdBy;

  useEffect(() => {
    if (post?.createdBy) getUser(post.createdBy).then(setCreator);
  }, [post?.createdBy]);

  useEffect(() => {
    if (!showComments || !post?.id) return;
    getComments(post.id).then(setComments);
  }, [showComments, post?.id]);

  useEffect(() => {
    function handleClick() { setMenuOpen(false); }
    if (menuOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuOpen]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this post?')) return;
    setDeleting(true);
    try {
      await deletePost(post.id);
      onDelete?.(post.id);
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }, [post?.id, onDelete]);

  const handleAddComment = useCallback(async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user || !post?.id) return;
    setCommentLoading(true);
    try {
      await addComment(post.id, {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userPhotoURL: user.photoURL || '',
        text: commentText.trim(),
      });
      setCommentText('');
      const updated = await getComments(post.id);
      setComments(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  }, [commentText, user, post?.id]);

  // Double tap to like
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) {
        onLike?.();
        setDoubleTapLiked(true);
        setTimeout(() => setDoubleTapLiked(false), 1000);
      }
    }
    lastTapRef.current = now;
  };

  const mediaUrls = Array.isArray(post?.mediaUrls) ? post.mediaUrls : [];
  const firstUrl = mediaUrls[0];
  const isVideo = post?.type === 'video' || (firstUrl && /\.(mp4|webm|ogg)$/i.test(firstUrl));
  const creatorName = creator?.displayName || creator?.email?.split('@')[0] || 'User';
  const creatorInitial = creatorName[0]?.toUpperCase() || 'U';
  const creatorPhoto = creator?.photoURL;
  const likeCount = post.likeCount ?? 0;
  const commentCount = post.commentCount ?? 0;
  const caption = post.caption || '';
  const shouldTruncate = caption.length > 100;

  if (deleting) return null;

  return (
    <article className="ig-post">
      {/* Header */}
      <header className="ig-post-header">
        <Link to={`/profile/${post.createdBy}`} className="ig-post-user">
          {creatorPhoto ? (
            <img src={creatorPhoto} alt="" className="ig-post-avatar" />
          ) : (
            <div className="ig-post-avatar ig-post-avatar-fallback">{creatorInitial}</div>
          )}
          <div className="ig-post-user-info">
            <span className="ig-post-username">{creatorName}</span>
            <span className="ig-post-time">{timeAgo(post.createdAt)}</span>
          </div>
        </Link>
        <button
          type="button"
          className="ig-post-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          aria-label="More options"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="6" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="18" r="1.5"/>
          </svg>
        </button>
        {menuOpen && (
          <div className="ig-post-menu" onClick={(e) => e.stopPropagation()}>
            {isOwner && (
              <button type="button" className="ig-menu-item danger" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button type="button" className="ig-menu-item" onClick={() => setMenuOpen(false)}>
              Cancel
            </button>
          </div>
        )}
      </header>

      {/* Media */}
      <div className="ig-post-media" onClick={handleDoubleTap}>
        {firstUrl ? (
          isVideo ? (
            <video src={firstUrl} controls className="ig-post-video" playsInline />
          ) : (
            <AdImage src={firstUrl} alt={caption || 'Post'} className="ig-post-img" />
          )
        ) : (
          <div className="ig-post-no-media">
            <span>📷</span>
          </div>
        )}
        {doubleTapLiked && (
          <div className="ig-post-heart-animation">
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="ig-post-actions">
        <div className="ig-post-actions-left">
          <button
            type="button"
            className={`ig-action-btn ${isLiked ? 'liked' : ''}`}
            onClick={() => onLike?.()}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            {isLiked ? (
              <svg viewBox="0 0 24 24" fill="#ed4956">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            )}
          </button>
          <button
            type="button"
            className="ig-action-btn"
            onClick={() => setShowComments(!showComments)}
            aria-label="Comment"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </button>
          <button type="button" className="ig-action-btn" aria-label="Share">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <button type="button" className="ig-action-btn" aria-label="Save">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      {/* Likes */}
      {likeCount > 0 && (
        <div className="ig-post-likes">
          <span>{likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}</span>
        </div>
      )}

      {/* Caption */}
      {caption && (
        <div className="ig-post-caption">
          <Link to={`/profile/${post.createdBy}`} className="ig-caption-username">
            {creatorName}
          </Link>
          <span className="ig-caption-text">
            {shouldTruncate && !showFullCaption ? (
              <>
                {caption.slice(0, 100)}...
                <button className="ig-more-btn" onClick={() => setShowFullCaption(true)}>more</button>
              </>
            ) : (
              caption
            )}
          </span>
        </div>
      )}

      {/* View Comments */}
      {commentCount > 0 && !showComments && (
        <button className="ig-view-comments" onClick={() => setShowComments(true)}>
          View all {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </button>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="ig-comments">
          {comments.length === 0 ? (
            <p className="ig-no-comments">No comments yet</p>
          ) : (
            <ul className="ig-comment-list">
              {comments.map((c) => (
                <li key={c.id} className="ig-comment">
                  <Link to={`/profile/${c.userId}`} className="ig-comment-username">
                    {c.userName}
                  </Link>
                  <span className="ig-comment-text">{c.text}</span>
                </li>
              ))}
            </ul>
          )}
          {user && (
            <form onSubmit={handleAddComment} className="ig-comment-form">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                disabled={commentLoading}
              />
              <button
                type="submit"
                disabled={commentLoading || !commentText.trim()}
              >
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
