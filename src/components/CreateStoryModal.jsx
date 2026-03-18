import { useState, useRef } from 'react';
import { createStory } from '../lib/firestore';
import { uploadPostMedia } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import './CreateStoryModal.css';

export default function CreateStoryModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
      setError('Please select an image or video');
      return;
    }

    // Validate video duration if video
    if (selectedFile.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        if (video.duration > 60) {
          setError('Video must be 60 seconds or less');
          setFile(null);
          setPreview(null);
          return;
        }
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setError('');
      };
      video.src = URL.createObjectURL(selectedFile);
    } else {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !user) return;

    setLoading(true);
    setError('');
    setStatus('Uploading story...');

    try {
      // Upload media
      setStatus('Uploading media...');
      const urls = await uploadPostMedia(null, [file]);
      const mediaUrl = urls[0];

      // Create story
      setStatus('Creating story...');
      await createStory(user.uid, mediaUrl, null);

      setStatus('Story posted!');
      setTimeout(() => {
        onCreated?.();
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error creating story:', err);
      setError(err.message || 'Failed to create story');
      setLoading(false);
    }
  };

  return (
    <div className="create-story-modal-overlay" onClick={onClose}>
      <div className="create-story-modal" onClick={e => e.stopPropagation()}>
        <div className="create-story-header">
          <h2>Create Story</h2>
          <button className="create-story-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="create-story-form">
          {!preview ? (
            <div
              className="create-story-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">📸</div>
              <p>Click or drag to upload photo or video</p>
              <small>Max 60 seconds for videos</small>
            </div>
          ) : (
            <div className="create-story-preview-container">
              {file.type.startsWith('video/') ? (
                <video src={preview} className="create-story-preview" controls />
              ) : (
                <img src={preview} alt="Preview" className="create-story-preview" />
              )}
              <button
                type="button"
                className="create-story-change-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />

          {error && <div className="create-story-error">{error}</div>}
          {status && <div className="create-story-status">{status}</div>}

          <div className="create-story-actions">
            <button
              type="button"
              className="create-story-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-story-btn-submit"
              disabled={!file || loading}
            >
              {loading ? 'Uploading...' : 'Post Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
