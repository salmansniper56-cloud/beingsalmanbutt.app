import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUser, setUser } from '../lib/firestore';
import { uploadProfilePhoto } from '../lib/storage';
import './Onboarding.css';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then((profile) => {
      if (profile?.photoURL && profile?.displayName) {
        navigate('/feed', { replace: true });
        return;
      }
      setDisplayName(profile?.displayName || user.displayName || '');
      setBio(profile?.bio || '');
      setPhotoPreview(profile?.photoURL || user.photoURL || '');
      setChecking(false);
    });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      let photoURL = user.photoURL || (await getUser(user.uid))?.photoURL;
      if (photoFile) {
        photoURL = await uploadProfilePhoto(user.uid, photoFile);
      }
      await setUser(user.uid, {
        displayName: displayName || user.displayName || user.email?.split('@')[0],
        bio: bio || '',
        photoURL: photoURL || '',
        email: user.email,
      });
      navigate('/feed', { replace: true });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  if (checking) return <div className="app-loading">Loading…</div>;

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1>Complete your profile</h1>
        <p className="onboarding-sub">Add a photo and a short bio so others can recognize you.</p>
        <form onSubmit={handleSubmit}>
          <div className="avatar-upload">
            <label>
              <img src={photoPreview || '/default-avatar.png'} alt="Avatar" onError={(e) => { e.target.src = 'https://ui-avatars.com/api?name=' + encodeURIComponent(displayName || 'User'); }} />
              <input type="file" accept="image/*" onChange={onFileChange} />
            </label>
          </div>
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <textarea
            placeholder="Short bio (optional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
