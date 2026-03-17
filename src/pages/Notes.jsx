import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import './Notes.css';

const SUBJECTS = [
  'All',
  'Engineering / CS',
  'Medical / Biology',
  'Business / Commerce',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Other',
];

const SUBJECT_ICONS = {
  'Engineering / CS': '💻',
  'Medical / Biology': '🧬',
  'Business / Commerce': '📊',
  'Mathematics': '📐',
  'Physics': '⚡',
  'Chemistry': '🧪',
  'Other': '📁',
};

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState('All');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching notes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const filtered = notes.filter(n => {
    const matchSubject = activeSubject === 'All' || n.subject === activeSubject;
    const matchSearch =
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.description?.toLowerCase().includes(search.toLowerCase()) ||
      n.university?.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  return (
    <div className="notes-page">
      <div className="notes-hero">
        <div className="notes-hero-inner">
          <span className="notes-hero-tag">Free Study Resources</span>
          <h1 className="notes-hero-title">Campus Notes</h1>
          <p className="notes-hero-sub">
            High-quality notes for Pakistani university students — completely free to download.
          </p>
          <div className="notes-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="notes-search"
              placeholder="Search by title, subject, university..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="notes-body">
        <div className="notes-filters">
          {SUBJECTS.map(s => (
            <button
              key={s}
              className={`notes-filter-btn ${activeSubject === s ? 'active' : ''}`}
              onClick={() => setActiveSubject(s)}
            >
              {SUBJECT_ICONS[s] && <span>{SUBJECT_ICONS[s]}</span>}
              {s}
            </button>
          ))}
        </div>

        <div className="notes-stats">
          <span>{filtered.length} notes available</span>
          {activeSubject !== 'All' && (
            <span className="notes-stats-subject">in {activeSubject}</span>
          )}
        </div>

        {loading ? (
          <div className="notes-loading">
            {[1,2,3,4,5,6].map(i => <div key={i} className="notes-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="notes-empty">
            <div className="notes-empty-icon">📭</div>
            <p>No notes found{search ? ` for "${search}"` : ''}</p>
            <span>Check back soon — more notes are being added regularly.</span>
          </div>
        ) : (
          <div className="notes-grid">
            {filtered.map(note => (
              <div key={note.id} className="note-card">
                <div className="note-card-top">
                  <div className="note-subject-icon">
                    {SUBJECT_ICONS[note.subject] || '📁'}
                  </div>
                  <span className="note-subject-badge">{note.subject}</span>
                </div>
                <h3 className="note-title">{note.title}</h3>
                {note.description && (
                  <p className="note-desc">{note.description}</p>
                )}
                <div className="note-meta">
                  {note.university && (
                    <span className="note-meta-item">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 9v6c0 3.31 4.48 6 10 6s10-2.69 10-6V9"/>
                      </svg>
                      {note.university}
                    </span>
                  )}
                  {note.semester && (
                    <span className="note-meta-item">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                      {note.semester}
                    </span>
                  )}
                  {note.fileSize && (
                    <span className="note-meta-item">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
                      </svg>
                      {note.fileSize}
                    </span>
                  )}
                </div>
                <a
                  href={note.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="note-download-btn"
                  download
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download free
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}