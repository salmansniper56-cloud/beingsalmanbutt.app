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

  // Admin bypass — skip verification safely inside useEffect
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
    if (!eduEmail.trim()) {
      setError('Please enter your university email.'); return;
    }
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
        {
          to_email: eduEmail,
          to_name: user?.displayName || 'Student',
          otp_code: code,
          site_name: 'CampusKart',
        },
        EMAILJS_PUBLIC_KEY
      );
      setStep('otp');
      startResendTimer();
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
      console.error(err);
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
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="svm-overlay">
      <div className="svm-modal">

        <div className="svm-header">
          <div className="svm-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L2 9l10 6 10-6-10-6z" fill="#534AB7"/>
              <path d="M2 9v6c0 3.31 4.48 6 10 6s10-2.69 10-6V9" stroke="#534AB7" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <div>
            <h2 className="svm-title">Student Verification</h2>
            <p className="svm-subtitle">One-time check — never asked again</p>
          </div>
        </div>

        <div className="svm-steps">
          <div className={`svm-step ${step === 'email' ? 'active' : 'done'}`}>
            <div className="svm-step-dot">{step === 'otp' ? '✓' : '1'}</div>
            <span>University email</span>
          </div>
          <div className="svm-step-line" />
          <div className={`svm-step ${step === 'otp' ? 'active' : ''}`}>
            <div className="svm-step-dot">2</div>
            <span>Enter OTP</span>
          </div>
        </div>

        {step === 'email' && (
          <form onSubmit={sendOTP} className="svm-form">
            <p className="svm-desc">
              Enter your university email ending in <strong>.edu.pk</strong> — we'll send a 6-digit verification code.
            </p>
            <div className="svm-field">
              <label>University email</label>
              <input
                type="email"
                placeholder="yourname@university.edu.pk"
                value={eduEmail}
                onChange={e => setEduEmail(e.target.value)}
                autoFocus
              />
            </div>
            {error && <div className="svm-error">{error}</div>}
            <button type="submit" className="svm-btn" disabled={sending}>
              {sending ? 'Sending code...' : 'Send verification code →'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOTP} className="svm-form">
            <p className="svm-desc">
              We sent a 6-digit code to <strong>{eduEmail}</strong>. Check your inbox and enter it below.
            </p>
            <div className="svm-field">
              <label>6-digit code</label>
              <input
                type="text"
                placeholder="_ _ _ _ _ _"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
                className="svm-otp-input"
              />
            </div>
            {error && <div className="svm-error">{error}</div>}
            <button type="submit" className="svm-btn" disabled={verifying || otp.length !== 6}>
              {verifying ? 'Verifying...' : 'Verify & unlock notes →'}
            </button>
            <div className="svm-resend">
              {resendTimer > 0 ? (
                <span>Resend code in {resendTimer}s</span>
              ) : (
                <button type="button" className="svm-resend-btn" onClick={sendOTP}>
                  Resend code
                </button>
              )}
              <button type="button" className="svm-resend-btn" onClick={() => { setStep('email'); setOtp(''); setError(''); }}>
                Change email
              </button>
            </div>
          </form>
        )}

        <p className="svm-footer">
          Your university email is only used for verification and never shared.
        </p>
      </div>
    </div>
  );
}