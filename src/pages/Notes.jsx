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

// Global Free Learning Resources
const FREE_RESOURCES = [
  // Computer Science
  {
    id: 'mit-ocw-cs',
    title: 'MIT OpenCourseWare - Computer Science',
    description: 'Free courses from MIT including Introduction to CS, Algorithms, Data Structures, AI, and Machine Learning.',
    subject: 'Engineering / CS',
    university: 'MIT (Free)',
    semester: 'All Levels',
    externalUrl: 'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/',
    isExternal: true,
  },
  {
    id: 'cs50-harvard',
    title: 'CS50 - Introduction to Computer Science',
    description: 'Harvard\'s legendary intro to CS course. Learn C, Python, SQL, JavaScript, and web development.',
    subject: 'Engineering / CS',
    university: 'Harvard (Free)',
    semester: 'Beginner',
    externalUrl: 'https://cs50.harvard.edu/x/',
    isExternal: true,
  },
  {
    id: 'freecodecamp',
    title: 'freeCodeCamp - Full Stack Development',
    description: 'Free coding bootcamp with certifications in Web Development, Python, Data Science, and Machine Learning.',
    subject: 'Engineering / CS',
    university: 'freeCodeCamp',
    semester: 'All Levels',
    externalUrl: 'https://www.freecodecamp.org/',
    isExternal: true,
  },
  {
    id: 'codecademy',
    title: 'Codecademy - Learn to Code',
    description: 'Interactive programming courses in Python, JavaScript, SQL, HTML/CSS, and more.',
    subject: 'Engineering / CS',
    university: 'Codecademy',
    semester: 'Beginner',
    externalUrl: 'https://www.codecademy.com/catalog',
    isExternal: true,
  },
  {
    id: 'google-cs',
    title: 'Google Tech Dev Guide',
    description: 'Google\'s free resources for learning CS fundamentals, data structures, and interview prep.',
    subject: 'Engineering / CS',
    university: 'Google',
    semester: 'All Levels',
    externalUrl: 'https://techdevguide.withgoogle.com/',
    isExternal: true,
  },
  
  // Mathematics
  {
    id: 'khan-math',
    title: 'Khan Academy - Mathematics',
    description: 'Complete math courses from basic arithmetic to calculus, linear algebra, and statistics.',
    subject: 'Mathematics',
    university: 'Khan Academy',
    semester: 'All Levels',
    externalUrl: 'https://www.khanacademy.org/math',
    isExternal: true,
  },
  {
    id: 'mit-ocw-math',
    title: 'MIT OpenCourseWare - Mathematics',
    description: 'University-level math courses including Calculus, Linear Algebra, Differential Equations, and more.',
    subject: 'Mathematics',
    university: 'MIT (Free)',
    semester: 'University',
    externalUrl: 'https://ocw.mit.edu/courses/mathematics/',
    isExternal: true,
  },
  {
    id: '3blue1brown',
    title: '3Blue1Brown - Visual Math',
    description: 'Beautiful visual explanations of linear algebra, calculus, neural networks, and complex math concepts.',
    subject: 'Mathematics',
    university: '3Blue1Brown',
    semester: 'All Levels',
    externalUrl: 'https://www.3blue1brown.com/',
    isExternal: true,
  },

  // Physics
  {
    id: 'khan-physics',
    title: 'Khan Academy - Physics',
    description: 'Physics courses covering mechanics, electricity, magnetism, waves, and modern physics.',
    subject: 'Physics',
    university: 'Khan Academy',
    semester: 'All Levels',
    externalUrl: 'https://www.khanacademy.org/science/physics',
    isExternal: true,
  },
  {
    id: 'mit-ocw-physics',
    title: 'MIT OpenCourseWare - Physics',
    description: 'MIT physics courses including Classical Mechanics, Quantum Physics, and Relativity.',
    subject: 'Physics',
    university: 'MIT (Free)',
    semester: 'University',
    externalUrl: 'https://ocw.mit.edu/courses/physics/',
    isExternal: true,
  },
  {
    id: 'feynman-lectures',
    title: 'The Feynman Lectures on Physics',
    description: 'The complete Feynman Lectures on Physics, freely available online from Caltech.',
    subject: 'Physics',
    university: 'Caltech',
    semester: 'University',
    externalUrl: 'https://www.feynmanlectures.caltech.edu/',
    isExternal: true,
  },

  // Chemistry
  {
    id: 'khan-chemistry',
    title: 'Khan Academy - Chemistry',
    description: 'Chemistry courses from basic concepts to organic chemistry and biochemistry.',
    subject: 'Chemistry',
    university: 'Khan Academy',
    semester: 'All Levels',
    externalUrl: 'https://www.khanacademy.org/science/chemistry',
    isExternal: true,
  },
  {
    id: 'mit-ocw-chemistry',
    title: 'MIT OpenCourseWare - Chemistry',
    description: 'MIT chemistry courses including Organic Chemistry, Biochemistry, and Physical Chemistry.',
    subject: 'Chemistry',
    university: 'MIT (Free)',
    semester: 'University',
    externalUrl: 'https://ocw.mit.edu/courses/chemistry/',
    isExternal: true,
  },

  // Biology / Medical
  {
    id: 'khan-biology',
    title: 'Khan Academy - Biology',
    description: 'Biology courses covering cell biology, genetics, evolution, ecology, and human anatomy.',
    subject: 'Medical / Biology',
    university: 'Khan Academy',
    semester: 'All Levels',
    externalUrl: 'https://www.khanacademy.org/science/biology',
    isExternal: true,
  },
  {
    id: 'khan-mcat',
    title: 'Khan Academy - MCAT Prep',
    description: 'Free MCAT preparation covering biology, chemistry, physics, and psychology.',
    subject: 'Medical / Biology',
    university: 'Khan Academy',
    semester: 'Pre-Med',
    externalUrl: 'https://www.khanacademy.org/test-prep/mcat',
    isExternal: true,
  },
  {
    id: 'mit-ocw-bio',
    title: 'MIT OpenCourseWare - Biology',
    description: 'MIT biology courses including Molecular Biology, Genetics, and Neuroscience.',
    subject: 'Medical / Biology',
    university: 'MIT (Free)',
    semester: 'University',
    externalUrl: 'https://ocw.mit.edu/courses/biology/',
    isExternal: true,
  },

  // Business / Commerce
  {
    id: 'khan-economics',
    title: 'Khan Academy - Economics & Finance',
    description: 'Microeconomics, macroeconomics, finance, and capital markets explained clearly.',
    subject: 'Business / Commerce',
    university: 'Khan Academy',
    semester: 'All Levels',
    externalUrl: 'https://www.khanacademy.org/economics-finance-domain',
    isExternal: true,
  },
  {
    id: 'mit-ocw-business',
    title: 'MIT OpenCourseWare - Business',
    description: 'MIT Sloan business courses including Finance, Marketing, Strategy, and Entrepreneurship.',
    subject: 'Business / Commerce',
    university: 'MIT (Free)',
    semester: 'University',
    externalUrl: 'https://ocw.mit.edu/courses/sloan-school-of-management/',
    isExternal: true,
  },
  {
    id: 'coursera-business',
    title: 'Coursera - Free Business Courses',
    description: 'Free courses from top universities on Accounting, Marketing, Management, and Finance.',
    subject: 'Business / Commerce',
    university: 'Coursera (Audit Free)',
    semester: 'All Levels',
    externalUrl: 'https://www.coursera.org/browse/business',
    isExternal: true,
  },

  // General / Other
  {
    id: 'edx-all',
    title: 'edX - Free University Courses',
    description: 'Free courses from Harvard, MIT, Berkeley, and 160+ universities. Audit most courses free.',
    subject: 'Other',
    university: 'edX',
    semester: 'All Levels',
    externalUrl: 'https://www.edx.org/search?tab=course',
    isExternal: true,
  },
  {
    id: 'coursera-all',
    title: 'Coursera - Audit Free Courses',
    description: 'Thousands of courses from top universities. Audit courses for free, pay only for certificates.',
    subject: 'Other',
    university: 'Coursera',
    semester: 'All Levels',
    externalUrl: 'https://www.coursera.org/courses?query=free',
    isExternal: true,
  },
  {
    id: 'khan-all',
    title: 'Khan Academy - All Subjects',
    description: 'Completely free education in Math, Science, Computing, Economics, History, and more.',
    subject: 'Other',
    university: 'Khan Academy',
    semester: 'All Levels',
    externalUrl: 'https://www.khanacademy.org/',
    isExternal: true,
  },
  {
    id: 'nptel',
    title: 'NPTEL - Indian University Courses',
    description: 'Free courses from IITs and IISc covering Engineering, Science, and Management.',
    subject: 'Other',
    university: 'NPTEL India',
    semester: 'University',
    externalUrl: 'https://nptel.ac.in/',
    isExternal: true,
  },
  {
    id: 'open-yale',
    title: 'Open Yale Courses',
    description: 'Free access to Yale University introductory courses with full video lectures.',
    subject: 'Other',
    university: 'Yale (Free)',
    semester: 'University',
    externalUrl: 'https://oyc.yale.edu/',
    isExternal: true,
  },
  {
    id: 'stanford-online',
    title: 'Stanford Online',
    description: 'Free courses from Stanford including Machine Learning, Cryptography, and more.',
    subject: 'Engineering / CS',
    university: 'Stanford (Free)',
    semester: 'University',
    externalUrl: 'https://online.stanford.edu/free-courses',
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

  // Combine user-uploaded notes with free resources
  const allNotes = [...notes, ...FREE_RESOURCES];

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
                      <span className="note-vu-badge">🌐 Free Course</span>
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
                        View Course
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