import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Image as ImageIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import './ReportModal.css';

const REASONS = [
  { id: 'FAKE_PROFILE', label: 'Fake profile' },
  { id: 'SPAM', label: 'Spam' },
  { id: 'HARASSMENT', label: 'Harassment' },
  { id: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { id: 'UNDERAGE', label: 'Underage' },
  { id: 'OTHER', label: 'Other' }
];

const ReportModal = ({ targetUser, onCancel, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append('targetId', targetUser.userId || targetUser.id);
    formData.append('reason', reason);
    formData.append('details', details);
    if (file) {
      formData.append('evidence', file);
    }

    try {
      await api.post('users/reports', formData);
      setDone(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="report-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div 
        className="report-modal-card"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="report-header">
          <h3>Report {targetUser.firstName}</h3>
          <button className="close-btn" onClick={onCancel}><X size={20}/></button>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div 
              key="success"
              className="report-success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 size={64} color="var(--primary)" />
              <h4>Report Submitted</h4>
              <p>Thank you for helping us keep the community safe. Our team will review this shortly.</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="report-form">
              <p className="report-intro">Select the reason that best describes the issue:</p>
              
              <div className="reason-grid">
                {REASONS.map(r => (
                  <button 
                    key={r.id} 
                    className={`reason-btn ${reason === r.id ? 'active' : ''}`}
                    onClick={() => setReason(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="input-group">
                <label>Additional Details (optional)</label>
                <textarea 
                  placeholder="Provide any extra context..." 
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                />
              </div>

              <div className="evidence-upload">
                <label className="upload-label">
                  <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                  {preview ? (
                    <div className="evidence-preview">
                      <img src={preview} alt="Evidence" />
                      <div className="change-hint">Change screenshot</div>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <ImageIcon size={24} />
                      <span>Upload Screenshot Evidence (optional)</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="report-actions">
                <button className="cancel-btn" onClick={onCancel}>Cancel</button>
                <button 
                  className="submit-btn" 
                  disabled={!reason || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default ReportModal;
