import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createPost, updatePostMedia } from '../lib/firestore';
import { uploadPostMedia } from '../lib/storage';
import { compressImages } from '../lib/imageResize';
import './CreatePostModal.css';

const MAX_VIDEO_SECONDS = 60;

export default function CreatePostModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.type.startsWith('video/')) {
      const url = URL.createObjectURL(f);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (video.duration > MAX_VIDEO_SECONDS) {
          setError(`Video must be ${MAX_VIDEO_SECONDS} seconds or less. Your video is ${Math.round(video.duration)}s.`);
          setFile(null);
          e.target.value = '';
        } else {
          setError('');
          setFile(f);
        }
      };
    } else {
      setError('');
      setFile(f);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user || !file) return;
    setError('');
    setLoading(true);
    try {
      setStatus('Creating post…');
      const type = file.type.startsWith('video/') ? 'video' : 'photo';
      const postId = await createPost({
        createdBy: user.uid,
        type,
        mediaUrls: [],
        caption: caption.trim() || null,
      });
      setStatus('Uploading…');
      const files = type === 'photo' ? await compressImages([file]) : [file];
      const urls = await uploadPostMedia(postId, files);
      await updatePostMedia(postId, urls);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New post</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {error && <p className="create-post-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="create-post-field">
            <label>Photo or video <span style={{ fontSize: '11px', opacity: 0.5 }}>(max 60s for videos)</span></label>
            <input type="file" accept="image/*,video/*" onChange={onFileChange} required />
            {file && <p className="create-post-filename">{file.name}</p>}
          </div>
          <div className="create-post-field">
            <label>Caption (optional)</label>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="What's on your mind?" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!error}>
              {loading ? status || 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}