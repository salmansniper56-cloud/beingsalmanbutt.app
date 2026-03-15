import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getComments, addComment } from '../lib/firestore';
import { getUser } from '../lib/firestore';
import AdImage from './AdImage';
import './PostCard.css';

const PLACEHOLDER = 'https://placehold.co/600x400?text=No+media';

export default function PostCard({ post, isLiked, onLike }) {
  const { user } = useAuth();
  const [creator, setCreator] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (post?.createdBy) {
      getUser(post.createdBy).then(setCreator);
    }
  }, [post?.createdBy]);

  useEffect(() => {
    if (!commentsOpen || !post?.id) return;
    getComments(post.id).then(setComments);
  }, [commentsOpen, post?.id]);

  async function handleAddComment(e) {
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
  }

  const mediaUrls = Array.isArray(post?.mediaUrls) ? post.mediaUrls : [];
  const firstUrl = mediaUrls[0];
  const isVideo = post?.type === 'video' || (firstUrl && /\.(mp4|webm|ogg)$/i.test(firstUrl));
  const creatorName = creator?.displayName || 'User';
  const creatorPhoto = creator?.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(creatorName)}`;

  return (
    <article className="post-card">
      <header className="post-card-header">
        <Link to={`/profile/${post.createdBy}`} className="post-card-user">
          <img src={creatorPhoto} alt="" className="post-card-avatar" />
          <span className="post-card-name">{creatorName}</span>
        </Link>
      </header>
      <div className="post-card-media">
        {firstUrl ? (
          isVideo ? (
            <video src={firstUrl} controls className="post-card-video" />
          ) : (
            <AdImage src={firstUrl} alt={post.caption || 'Post'} className="post-card-img" />
          )
        ) : (
          <img src={PLACEHOLDER} alt="No media" className="post-card-img" />
        )}
      </div>
      <div className="post-card-body">
        {post.caption && <p className="post-card-caption">{post.caption}</p>}
        <div className="post-card-actions">
          <button
            type="button"
            className={`post-card-like ${isLiked ? 'is-liked' : ''}`}
            onClick={() => onLike?.()}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            ♥ {post.likeCount ?? 0}
          </button>
          <button
            type="button"
            className="post-card-comment-btn"
            onClick={() => setCommentsOpen((o) => !o)}
          >
            💬 {post.commentCount ?? 0}
          </button>
        </div>
      </div>
      {commentsOpen && (
        <div className="post-card-comments">
          <ul className="post-card-comment-list">
            {comments.map((c) => (
              <li key={c.id} className="post-card-comment">
                <Link to={`/profile/${c.userId}`} className="post-card-comment-name">{c.userName}</Link>
                <span className="post-card-comment-text">{c.text}</span>
              </li>
            ))}
          </ul>
          {user && (
            <form onSubmit={handleAddComment} className="post-card-comment-form">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                disabled={commentLoading}
              />
              <button type="submit" className="btn btn-primary" disabled={commentLoading || !commentText.trim()}>
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
