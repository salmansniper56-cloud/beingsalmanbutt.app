import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import StudentVerifyModal from '../components/StudentVerifyModal';
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

// Virtual University of Pakistan Free Resources
const VU_RESOURCES = [
  {
    id: 'vu-cs101',
    title: 'CS101 - Introduction to Computing',
    description: 'Complete video lectures and handouts covering basics of computing, hardware, software, and programming fundamentals.',
    subject: 'Engineering / CS',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/CS101',
    isExternal: true,
  },
  {
    id: 'vu-cs201',
    title: 'CS201 - Introduction to Programming',
    description: 'C++ programming fundamentals including variables, loops, functions, arrays, pointers, and object-oriented concepts.',
    subject: 'Engineering / CS',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/CS201',
    isExternal: true,
  },
  {
    id: 'vu-cs301',
    title: 'CS301 - Data Structures',
    description: 'Arrays, linked lists, stacks, queues, trees, graphs, sorting and searching algorithms with C++ implementation.',
    subject: 'Engineering / CS',
    university: 'Virtual University',
    semester: 'Semester 3',
    externalUrl: 'https://www.vu.edu.pk/Courses/CS301',
    isExternal: true,
  },
  {
    id: 'vu-cs304',
    title: 'CS304 - Object Oriented Programming',
    description: 'OOP concepts including classes, inheritance, polymorphism, encapsulation, and design patterns in C++.',
    subject: 'Engineering / CS',
    university: 'Virtual University',
    semester: 'Semester 3',
    externalUrl: 'https://www.vu.edu.pk/Courses/CS304',
    isExternal: true,
  },
  {
    id: 'vu-cs401',
    title: 'CS401 - Computer Architecture',
    description: 'Assembly language, CPU architecture, memory systems, I/O systems, and computer organization.',
    subject: 'Engineering / CS',
    university: 'Virtual University',
    semester: 'Semester 4',
    externalUrl: 'https://www.vu.edu.pk/Courses/CS401',
    isExternal: true,
  },
  {
    id: 'vu-cs403',
    title: 'CS403 - Database Management Systems',
    description: 'Relational databases, SQL, normalization, ER diagrams, and database design principles.',
    subject: 'Engineering / CS',
    university: 'Virtual University',
    semester: 'Semester 4',
    externalUrl: 'https://www.vu.edu.pk/Courses/CS403',
    isExternal: true,
  },
  {
    id: 'vu-cs601',
    title: 'CS601 - Software Engineering',
    description: 'SDLC, requirements engineering, software design, testing, project management, and agile methodologies.',
    subject: 'Engineering / CS',
    university: 'Virtual University',
    semester: 'Semester 6',
    externalUrl: 'https://www.vu.edu.pk/Courses/CS601',
    isExternal: true,
  },
  {
    id: 'vu-mth101',
    title: 'MTH101 - Calculus and Analytical Geometry',
    description: 'Limits, derivatives, integrals, analytical geometry, and applications of calculus.',
    subject: 'Mathematics',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/MTH101',
    isExternal: true,
  },
  {
    id: 'vu-mth301',
    title: 'MTH301 - Calculus II',
    description: 'Advanced calculus including multiple integrals, vector calculus, and differential equations.',
    subject: 'Mathematics',
    university: 'Virtual University',
    semester: 'Semester 3',
    externalUrl: 'https://www.vu.edu.pk/Courses/MTH301',
    isExternal: true,
  },
  {
    id: 'vu-phy101',
    title: 'PHY101 - Physics',
    description: 'Mechanics, thermodynamics, waves, optics, and modern physics fundamentals.',
    subject: 'Physics',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/PHY101',
    isExternal: true,
  },
  {
    id: 'vu-mgt101',
    title: 'MGT101 - Financial Accounting',
    description: 'Accounting principles, journal entries, ledger, trial balance, and financial statements.',
    subject: 'Business / Commerce',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/MGT101',
    isExternal: true,
  },
  {
    id: 'vu-mgt201',
    title: 'MGT201 - Financial Management',
    description: 'Time value of money, capital budgeting, risk analysis, and corporate finance.',
    subject: 'Business / Commerce',
    university: 'Virtual University',
    semester: 'Semester 2',
    externalUrl: 'https://www.vu.edu.pk/Courses/MGT201',
    isExternal: true,
  },
  {
    id: 'vu-mkt501',
    title: 'MKT501 - Marketing Management',
    description: 'Marketing concepts, consumer behavior, market segmentation, and marketing strategies.',
    subject: 'Business / Commerce',
    university: 'Virtual University',
    semester: 'Semester 5',
    externalUrl: 'https://www.vu.edu.pk/Courses/MKT501',
    isExternal: true,
  },
  {
    id: 'vu-bio101',
    title: 'BIO101 - Biology',
    description: 'Cell biology, genetics, evolution, ecology, and human biology fundamentals.',
    subject: 'Medical / Biology',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/BIO101',
    isExternal: true,
  },
  {
    id: 'vu-che101',
    title: 'CHE101 - Chemistry',
    description: 'Atomic structure, chemical bonding, thermodynamics, and organic chemistry basics.',
    subject: 'Chemistry',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/CHE101',
    isExternal: true,
  },
  {
    id: 'vu-eng101',
    title: 'ENG101 - English Comprehension',
    description: 'Reading comprehension, grammar, vocabulary, and basic writing skills.',
    subject: 'Other',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/ENG101',
    isExternal: true,
  },
  {
    id: 'vu-psy101',
    title: 'PSY101 - Introduction to Psychology',
    description: 'Human behavior, cognition, learning, memory, motivation, and psychological disorders.',
    subject: 'Other',
    university: 'Virtual University',
    semester: 'Semester 1',
    externalUrl: 'https://www.vu.edu.pk/Courses/PSY101',
    isExternal: true,
  },
  {
    id: 'vu-all-courses',
    title: 'VU Complete Course Library',
    description: 'Access all 200+ Virtual University courses with free video lectures, handouts, and past papers.',
    subject: 'Other',
    university: 'Virtual University',
    semester: 'All Semesters',
    externalUrl: 'https://www.vu.edu.pk/Courses/',
    isExternal: true,
  },
];

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState('All');
  const [isVerified, setIsVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    const checkVerification = async () => {
      if (!user) { setCheckingVerification(false); return; }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().isStudentVerified) {
          setIsVerified(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingVerification(false);
      }
    };
    checkVerification();
  }, [user]);

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

  // Combine user-uploaded notes with VU resources
  const allNotes = [...notes, ...VU_RESOURCES];

  const filtered = allNotes.filter(n => {
    const matchSubject = activeSubject === 'All' || n.subject === activeSubject;
    const matchSearch =
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.description?.toLowerCase().includes(search.toLowerCase()) ||
      n.university?.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  if (checkingVerification) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 2 }} />
      </div>
    );
  }

  return (
    <div className="notes-page">

      {/* Verification modal — blocks content until verified */}
      {!isVerified && (
        <StudentVerifyModal onVerified={() => setIsVerified(true)} />
      )}

      {/* All content blurred until verified */}
      <div style={{
        filter: isVerified ? 'none' : 'blur(6px)',
        pointerEvents: isVerified ? 'auto' : 'none',
        userSelect: isVerified ? 'auto' : 'none',
      }}>

        {/* Hero */}
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

          {isVerified && (
            <div className="notes-verified-bar">
              <span>✓ Verified student</span>
              <span>You have full access to all notes</span>
            </div>
          )}

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
                <div key={note.id} className={`note-card ${note.isExternal ? 'note-card-external' : ''}`}>
                  <div className="note-card-top">
                    <div className="note-subject-icon">
                      {SUBJECT_ICONS[note.subject] || '📁'}
                    </div>
                    <span className="note-subject-badge">{note.subject}</span>
                    {note.isExternal && (
                      <span className="note-vu-badge">🎓 VU Official</span>
                    )}
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
                    href={note.isExternal ? note.externalUrl : note.fileURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`note-download-btn ${note.isExternal ? 'note-external-btn' : ''}`}
                  >
                    {note.isExternal ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        View on VU
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download free
                      </>
                    )}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}