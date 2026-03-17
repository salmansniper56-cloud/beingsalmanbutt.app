import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import emailjs from '@emailjs/browser';
import './StudentVerifyModal.css';

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const ADMIN_UID           = import.meta.env.VITE_ADMIN_UID;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function StudentVerifyModal({ onVerified }) {
  const { user } = useAuth();
  const [step, setStep] = useState('email');
  const [eduEmail, setEduEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (user?.uid === ADMIN_UID) {
      onVerified();
    }
  }, [user?.uid]);

  if (user?.uid === ADMIN_UID) return null;

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOTP = async (e) => {
    e?.preventDefault();
    setError('');
    if (!eduEmail.trim()) { setError('Please enter your university email.'); return; }
    if (!eduEmail.toLowerCase().endsWith('.edu.pk')) {
      setError('Only .edu.pk university emails are accepted.'); return;
    }
    setSending(true);
    const code = generateOTP();
    setGeneratedOtp(code);
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        { to_email: eduEmail, to_name: user?.displayName || 'Student', otp_code: code, site_name: 'CampusKart' },
        EMAILJS_PUBLIC_KEY
      );
      setStep('otp');
      startResendTimer();
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.trim() !== generatedOtp) {
      setError('Incorrect code. Please check your email and try again.'); return;
    }
    setVerifying(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isStudentVerified: true,
        verifiedEduEmail: eduEmail,
        verifiedAt: new Date().toISOString(),
      });
      onVerified();
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="svm-overlay">
      <div className="svm-modal">

        {/* Decorative top bar */}
        <div className="svm-topbar" />

        {/* Badge */}
        <div className="svm-badge-wrap">
          <span className="svm-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L2 9l10 6 10-6-10-6z" fill="#fff"/>
              <path d="M2 9v6c0 3.31 4.48 6 10 6s10-2.69 10-6V9" stroke="#fff" strokeWidth="1.5" fill="none"/>
            </svg>
            CampusKart
          </span>
        </div>

        {/* Title */}
        <div className="svm-title-block">
          <h2 className="svm-title">
            {step === 'email' ? 'Verify your student identity' : 'Check your inbox'}
          </h2>
          <p className="svm-subtitle">
            {step === 'email'
              ? 'Enter your university email to unlock free notes — one time only.'
              : `We sent a 6-digit code to ${eduEmail}`}
          </p>
        </div>

        {/* Step pills */}
        <div className="svm-steps">
          <div className={`svm-pill ${step === 'email' ? 'active' : 'done'}`}>
            <span>{step === 'otp' ? '✓' : '1'}</span> University email
          </div>
          <div className="svm-pill-divider">→</div>
          <div className={`svm-pill ${step === 'otp' ? 'active' : ''}`}>
            <span>2</span> Enter OTP
          </div>
        </div>

        {/* Step 1 */}
        {step === 'email' && (
          <form onSubmit={sendOTP} className="svm-form">
            <div className="svm-input-wrap">
              <div className="svm-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <input
                type="email"
                className="svm-input"
                placeholder="yourname@university.edu.pk"
                value={eduEmail}
                onChange={e => setEduEmail(e.target.value)}
                autoFocus
              />
            </div>
            {error && <div className="svm-error">{error}</div>}
            <button type="submit" className="svm-btn" disabled={sending}>
              {sending ? (
                <span className="svm-btn-loading">
                  <span className="svm-spinner" /> Sending code...
                </span>
              ) : 'Send verification code →'}
            </button>
            <p className="svm-hint">Only .edu.pk university emails are accepted</p>
          </form>
        )}

        {/* Step 2 */}
        {step === 'otp' && (
          <form onSubmit={verifyOTP} className="svm-form">
            <div className="svm-otp-boxes">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className={`svm-otp-box ${otp[i] ? 'filled' : ''}`}>
                  {otp[i] || ''}
                </div>
              ))}
              <input
                type="text"
                className="svm-otp-hidden"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
              />
            </div>
            {error && <div className="svm-error">{error}</div>}
            <button type="submit" className="svm-btn" disabled={verifying || otp.length !== 6}>
              {verifying ? (
                <span className="svm-btn-loading">
                  <span className="svm-spinner" /> Verifying...
                </span>
              ) : 'Unlock notes →'}
            </button>
            <div className="svm-resend">
              {resendTimer > 0 ? (
                <span>Resend in {resendTimer}s</span>
              ) : (
                <button type="button" className="svm-link" onClick={sendOTP}>Resend code</button>
              )}
              <span className="svm-dot">·</span>
              <button type="button" className="svm-link" onClick={() => { setStep('email'); setOtp(''); setError(''); }}>
                Change email
              </button>
            </div>
          </form>
        )}

        <p className="svm-footer">
          🔒 Your university email is only used for verification and never shared.
        </p>
      </div>
    </div>
  );
}