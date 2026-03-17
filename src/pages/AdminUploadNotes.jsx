import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import './AdminUploadNotes.css';

// ← Put your Firebase UID here (find it in Firebase Console → Authentication)
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

const SUBJECTS = [
  'Engineering / CS',
  'Medical / Biology',
  'Business / Commerce',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Other',
];

const SEMESTERS = [
  '1st Semester', '2nd Semester', '3rd Semester', '4th Semester',
  '5th Semester', '6th Semester', '7th Semester', '8th Semester',
];

export default function AdminUploadNotes() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: 'Engineering / CS',
    university: '',
    semester: '',
    course: '',
  });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Block non-admins
  if (!user || user.uid !== ADMIN_UID) {
    return <Navigate to="/" replace />;
  }

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const formatFileSize = bytes => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async e => {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    if (!form.title.trim()) { setError('Please enter a title.'); return; }

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      const fileRef = ref(storage, `notes/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        snapshot => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(pct);
        },
        err => {
          setError('Upload failed: ' + err.message);
          setUploading(false);
        },
        async () => {
          const fileURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'notes'), {
            ...form,
            fileURL,
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            downloads: 0,
            createdAt: serverTimestamp(),
          });
          setSuccess(true);
          setUploading(false);
          setProgress(0);
          setFile(null);
          setForm({
            title: '', description: '', subject: 'Engineering / CS',
            university: '', semester: '', course: '',
          });
        }
      );
    } catch (err) {
      setError('Something went wrong: ' + err.message);
      setUploading(false);
    }
  };

  return (
    <div className="admin-upload">
      <div className="admin-upload-header">
        <h1>Upload Notes</h1>
        <p>Files are stored in Firebase Storage and listed publicly for students to download.</p>
      </div>

      <form className="admin-upload-form" onSubmit={handleUpload}>
        {success && (
          <div className="admin-alert success">
            Notes uploaded successfully! Students can now download them.
          </div>
        )}
        {error && (
          <div className="admin-alert error">{error}</div>
        )}

        <div className="admin-form-grid">
          <div className="admin-field full">
            <label>Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Data Structures Complete Notes"
              required
            />
          </div>

          <div className="admin-field full">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Brief description of what's covered in these notes..."
              rows={3}
            />
          </div>

          <div className="admin-field">
            <label>Subject *</label>
            <select name="subject" value={form.subject} onChange={handleChange}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="admin-field">
            <label>Semester</label>
            <select name="semester" value={form.semester} onChange={handleChange}>
              <option value="">— Select semester —</option>
              {SEMESTERS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="admin-field">
            <label>University</label>
            <input
              name="university"
              value={form.university}
              onChange={handleChange}
              placeholder="e.g. FAST-NUCES, NUST, COMSATS"
            />
          </div>

          <div className="admin-field">
            <label>Course / Subject Code</label>
            <input
              name="course"
              value={form.course}
              onChange={handleChange}
              placeholder="e.g. CS301, PHY101"
            />
          </div>

          <div className="admin-field full">
            <label>PDF / File *</label>
            <div
              className={`admin-dropzone ${file ? 'has-file' : ''}`}
              onClick={() => document.getElementById('file-input').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0])}
              />
              {file ? (
                <div className="admin-file-selected">
                  <span>📄</span>
                  <div>
                    <p>{file.name}</p>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}>✕</button>
                </div>
              ) : (
                <div className="admin-dropzone-idle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p>Click or drag & drop your file here</p>
                  <span>PDF, DOC, PPT — max 50MB</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {uploading && (
          <div className="admin-progress">
            <div className="admin-progress-bar">
              <div className="admin-progress-fill" style={{ width: progress + '%' }} />
            </div>
            <span>{progress}% uploaded...</span>
          </div>
        )}

        <button type="submit" className="admin-submit-btn" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Notes'}
        </button>
      </form>
    </div>
  );
}
