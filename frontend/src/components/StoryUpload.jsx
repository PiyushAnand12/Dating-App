import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, Image } from 'lucide-react';
import api from '../api/axios';

/**
 * Story Upload Modal — Drag & drop or click to select media.
 *
 * Props:
 * - isOpen: Boolean
 * - onClose: Callback
 * - onUploaded: Callback after successful upload
 */
const StoryUpload = ({ isOpen, onClose, onUploaded, initialFile }) => {
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState(null); // 'image' | 'video'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Handle initial file from direct click flow
  useEffect(() => {
    if (initialFile && isOpen) {
      processFile(initialFile);
    }
  }, [initialFile, isOpen]);

  const ACCEPTED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4'
  ];

  const MAX_SIZE = 20 * 1024 * 1024; // 20MB

  const validateFile = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported file type. Use JPG, PNG, WebP or MP4.');
      return false;
    }
    if (f.size > MAX_SIZE) {
      setError('File too large. Maximum 20MB.');
      return false;
    }
    setError(null);
    return true;
  };

  const processFile = (f) => {
    if (!validateFile(f)) return;

    setFile(f);
    const isVideo = f.type.startsWith('video');
    setPreviewType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('story', file);

      const response = await api.post('users/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Reset & callback (Non-blocking)
      const storyData = response.data.data;
      resetState();
      onUploaded?.(storyData); 
      onClose();
    } catch (err) {
      console.error('Story upload failed:', err);
      const msg = err.response?.data?.message || 'Upload failed. Please try again.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setPreview(null);
    setPreviewType(null);
    setFile(null);
    setError(null);
    setDragging(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="story-upload-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="story-upload-modal"
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Header ─── */}
          <div className="story-upload-header">
            <h2>Add to Story</h2>
            <button className="story-upload-close" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          {uploading ? (
            /* ─── Uploading State ─── */
            <div className="story-upload-progress">
              <div className="story-upload-spinner" />
              <span className="story-upload-progress-text">Uploading your story...</span>
            </div>
          ) : preview ? (
            /* ─── Preview State ─── */
            <>
              <div className="story-preview-container">
                {previewType === 'video' ? (
                  <video src={preview} autoPlay muted loop playsInline />
                ) : (
                  <img src={preview} alt="Story preview" />
                )}
                <button
                  className="story-preview-remove"
                  onClick={() => { setPreview(null); setFile(null); setPreviewType(null); }}
                  aria-label="Remove preview"
                >
                  <X size={16} />
                </button>
              </div>

              {error && (
                <div style={{
                  color: '#ff3b30',
                  fontSize: '13px',
                  textAlign: 'center',
                  marginBottom: '12px',
                  fontWeight: 500
                }}>
                  {error}
                </div>
              )}

              <button
                className="story-upload-btn"
                onClick={handleUpload}
                disabled={uploading}
              >
                <Upload size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                Share Story
              </button>
            </>
          ) : (
            /* ─── Dropzone State ─── */
            <>
              <div
                className={`story-dropzone ${dragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="story-dropzone-icon">
                  <Camera size={28} />
                </div>
                <div className="story-dropzone-text">
                  Tap to select or drag & drop
                </div>
                <div className="story-dropzone-hint">
                  JPG, PNG, WebP or MP4 • Max 20MB
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4"
                  onChange={handleFileSelect}
                />
              </div>

              {error && (
                <div style={{
                  color: '#ff3b30',
                  fontSize: '13px',
                  textAlign: 'center',
                  marginTop: '12px',
                  fontWeight: 500
                }}>
                  {error}
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryUpload;
