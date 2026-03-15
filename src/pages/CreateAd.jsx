import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createAd, createUserIfNeeded, updateAdImages } from '../lib/firestore';
import { uploadAdImages } from '../lib/storage';
import './CreateAd.css';

const CATEGORIES = ['books', 'electronics', 'other'];
const CONDITIONS = ['Like new', 'Good', 'Fair', 'Used'];

export default function CreateAd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('books');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('Good');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      setStatus('Posting ad…');
      await createUserIfNeeded(user.uid, {
        displayName: user.displayName || user.email?.split('@')[0],
        photoURL: user.photoURL || '',
        email: user.email,
      });
      const adId = await createAd({
        title,
        description,
        category,
        price: parseFloat(price) || 0,
        condition,
        location: location || null,
        images: [],
        createdBy: user.uid,
        status: 'active',
        likeCount: 0,
      });
     if (images.length > 0) {
  setStatus('Uploading images…');
  const urls = await uploadAdImages(adId, images, (current, total) => {
    setStatus(`Uploading images (${current}/${total})…`);
  });
  await updateAdImages(adId, urls);
}
      navigate(`/ad/${adId}`);
    } catch (err) {
      setError(err.message || 'Failed to create ad');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }

  function onFilesChange(e) {
    const files = Array.from(e.target.files || []);
    setImages((prev) => prev.concat(files).slice(0, 5));
  }

  function removeImage(i) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="create-ad">
      <h1>Create an ad</h1>
      {error && <p className="create-ad-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Calculus textbook" />
        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Full description of the item" />
        <label>Price (PKR)</label>
        <input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <label>Condition</label>
        <select value={condition} onChange={(e) => setCondition(e.target.value)}>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label>Location (optional)</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Campus or city" />
        <label>Images (up to 5)</label>
        <input type="file" accept="image/*" multiple onChange={onFilesChange} />
        {images.length > 0 && (
          <ul className="create-ad-preview">
            {images.map((f, i) => (
              <li key={i}>
                {f.name} <button type="button" onClick={() => removeImage(i)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (status || 'Creating…') : 'Post ad'}
        </button>
      </form>
    </div>
  );
}
