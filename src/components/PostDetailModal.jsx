import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUser, getPostComments, addPostComment, togglePostLike, isPostLiked, deletePost, deleteComment } from '../lib/firestore';
import './PostDetailModal.css';

export default function PostDetailModal({ post, isLiked, onClose, onLike, onDelete }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [author, setAuthor] = useState(null);

  useEffect(() => {
    if (!post) return;
    loadData();
  }, [post?.id]);

  async function loadData() {
    try {
      const [commentsList, authorData] = await Promise.all([
        getPostComments(post.id),
        getUser(post.createdBy)
      ]);

      // Load comment authors
      const commentsWithAuthors = await Promise.all(
        commentsList.map(async (comment) => {
          const commentAuthor = await getUser(comment.createdBy);
          return { ...comment, author: commentAuthor };
        })
      );

      setComments(commentsWithAuthors);
      setAuthor(authorData);
    } catch (err) {
      console.error('Error loading post data:', err);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim() || !user?.uid) return;

    setLoading(true);
    try {
      await addPostComment(post.id, {
        content: newComment,
        createdBy: user.uid,
      });
      setNewComment('');
      await loadData();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(post.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  }

  async function handleDeletePost() {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(post.id);
      onDelete?.(post.id);
      onClose();
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  }

  if (!post) return null;

  const isOwner = user?.uid === post.createdBy;
  const authorName = author?.displayName || author?.email?.split('@')[0] || 'User';
  const authorPhoto = author?.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(authorName)}`;

  return (
    <div className="post-modal-overlay" onClick={onClose}>
      <div className="post-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="post-modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"></path>
          </svg>
        </button>

        <div className="post-modal-content">
          {/* Left: Image */}
          <div className="post-modal-image-section">
            {post.mediaUrls && post.mediaUrls.length > 0 ? (
              <img src={post.mediaUrls[0]} alt="Post" />
            ) : (
              <div className="post-modal-no-image">
                <p>{post.content}</p>
              </div>
            )}
          </div>

          {/* Right: Comments */}
          <div className="post-modal-sidebar">
            {/* Header */}
            <div className="post-modal-header">
              <Link to={`/profile/${post.createdBy}`} className="post-modal-author">
                <img src={authorPhoto} alt={authorName} className="post-modal-avatar" />
                <span className="post-modal-username">{authorName}</span>
              </Link>
              {isOwner && (
                <button className="post-modal-menu" onClick={handleDeletePost}>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
                    <circle cx="12" cy="6" r="1.5" fill="currentColor"></circle>
                    <circle cx="12" cy="18" r="1.5" fill="currentColor"></circle>
                  </svg>
                </button>
              )}
            </div>

            {/* Caption as first comment */}
            <div className="post-modal-comments">
              <div className="post-modal-caption">
                <Link to={`/profile/${post.createdBy}`}>
                  <img src={authorPhoto} alt={authorName} className="comment-avatar" />
                </Link>
                <div className="comment-content">
                  <p>
                    <Link to={`/profile/${post.createdBy}`} className="comment-username">
                      {authorName}
                    </Link>{' '}
                    <span className="comment-text">{post.content}</span>
                  </p>
                  <div className="comment-meta">
                    {post.createdAt && (
                      <span className="comment-time">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments list */}
              {comments.map((comment) => {
                const commentAuthorName = comment.author?.displayName || comment.author?.email?.split('@')[0] || 'User';
                const commentAuthorPhoto = comment.author?.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(commentAuthorName)}`;
                const isCommentOwner = user?.uid === comment.createdBy;

                return (
                  <div key={comment.id} className="post-modal-comment">
                    <Link to={`/profile/${comment.createdBy}`}>
                      <img src={commentAuthorPhoto} alt={commentAuthorName} className="comment-avatar" />
                    </Link>
                    <div className="comment-content">
                      <p>
                        <Link to={`/profile/${comment.createdBy}`} className="comment-username">
                          {commentAuthorName}
                        </Link>{' '}
                        <span className="comment-text">{comment.content}</span>
                      </p>
                      <div className="comment-meta">
                        {comment.createdAt && (
                          <span className="comment-time">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {isCommentOwner && (
                          <button
                            className="comment-delete"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="post-modal-actions">
              <div className="post-modal-buttons">
                <button className="action-btn" onClick={onLike}>
                  {isLiked ? (
                    <svg width="24" height="24" viewBox="0 0 48 48" fill="#ed4956">
                      <path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"></path>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"></path>
                    </svg>
                  )}
                </button>
                <button className="action-btn">
                  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M47.5 46.1l-2.8-11c1.8-3.3 2.8-7.1 2.8-11.1C47.5 11 37 .5 24 .5S.5 11 .5 24 11 47.5 24 47.5c4 0 7.8-1 11.1-2.8l11 2.8c.8.2 1.6-.6 1.4-1.4z"></path>
                  </svg>
                </button>
                <button className="action-btn">
                  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M47.8 3.8c-.3-.5-.8-.8-1.3-.8h-45C.9 3.1.3 3.5.1 4S0 5.2.4 5.7l15.9 15.6 5.5 22.6c.1.6.6 1 1.2 1.1h.2c.5 0 1-.3 1.3-.7l23.2-39c.4-.4.4-1 .1-1.5z"></path>
                  </svg>
                </button>
              </div>

              <div className="post-modal-likes">
                <strong>{post.likeCount || 0}</strong> likes
              </div>

              <div className="post-modal-time">
                {post.createdAt && (
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Add comment */}
            <form className="post-modal-add-comment" onSubmit={handleAddComment}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M15.83 10.997a1.167 1.167 0 1 0 1.167 1.167 1.167 1.167 0 0 0-1.167-1.167zm-6.5 1.167a1.167 1.167 0 1 0-1.166 1.167 1.167 1.167 0 0 0 1.166-1.167zm5.163 3.24a3.406 3.406 0 0 1-4.982 0 .75.75 0 1 0-1.061 1.061 4.906 4.906 0 0 0 7.104 0 .75.75 0 1 0-1.061-1.061zM12 .503a11.5 11.5 0 1 0 11.5 11.5A11.513 11.513 0 0 0 12 .503zm0 21a9.5 9.5 0 1 1 9.5-9.5 9.51 9.51 0 0 1-9.5 9.5z" fill="currentColor"></path>
              </svg>
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={loading}
              />
              {newComment.trim() && (
                <button type="submit" disabled={loading}>
                  Post
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
