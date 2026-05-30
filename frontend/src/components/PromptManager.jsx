import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Edit3, Check, MessageSquare } from 'lucide-react';
import api from '../api/axios';
import './PromptManager.css';

const SUGGESTED_PROMPTS = [
  "My biggest fear is...",
  "2 truths and a lie...",
  "The way to my heart is...",
  "I'm a regular at...",
  "Swipe right if...",
  "My simple pleasures...",
  "A social cause I care about...",
  "We'll get along if...",
  "My dream dinner guest is...",
  "Something I'm obsessed with...",
  "If I could travel anywhere...",
  "My favorite way to spend a Sunday..."
];

const PromptManager = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const res = await api.get('/users/prompts');
      setPrompts(res.data.data);
    } catch (err) {
      console.error('Failed to fetch prompts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedQuestion || !answer.trim()) return;
    setSaving(true);
    try {
      await api.post('/users/prompts', {
        question: selectedQuestion,
        answer: answer.trim()
      });
      await fetchPrompts();
      resetState();
    } catch (err) {
      console.error('Failed to save prompt', err);
      alert(err.response?.data?.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/prompts/${id}`);
      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete prompt', err);
    }
  };

  const resetState = () => {
    setSelectedQuestion(null);
    setAnswer('');
    setShowSelector(false);
  };

  if (loading) return <div className="prompt-manager-loading">Loading prompts...</div>;

  return (
    <div className="prompt-manager">
      <div className="prompts-list">
        {prompts.map((prompt) => (
          <motion.div 
            key={prompt.id}
            className="prompt-card glass"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="prompt-content">
              <span className="prompt-question">{prompt.question}</span>
              <p className="prompt-answer">{prompt.answer}</p>
            </div>
            <button className="prompt-delete-btn" onClick={() => handleDelete(prompt.id)}>
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}

        {prompts.length < 3 && !showSelector && !selectedQuestion && (
          <button className="add-prompt-btn" onClick={() => setShowSelector(true)}>
            <Plus size={20} /> Add a profile prompt
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSelector && (
          <motion.div 
            className="prompt-selector-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSelector(false)}
          >
            <motion.div 
              className="prompt-selector-modal glass"
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Select a Prompt</h3>
                <button onClick={() => setShowSelector(false)}><X size={20} /></button>
              </div>
              <div className="prompt-suggestions">
                {SUGGESTED_PROMPTS.filter(q => !prompts.some(p => p.question === q)).map(q => (
                  <button 
                    key={q} 
                    className="suggestion-item"
                    onClick={() => {
                      setSelectedQuestion(q);
                      setShowSelector(false);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedQuestion && (
          <motion.div 
            className="prompt-editor-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="prompt-editor-modal glass"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="editor-header">
                <span className="editor-question-label">Answer this prompt</span>
                <button onClick={resetState}><X size={20} /></button>
              </div>
              <h4 className="editor-question">{selectedQuestion}</h4>
              <textarea 
                className="editor-textarea"
                placeholder="Type your answer..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                autoFocus
                maxLength={200}
              />
              <div className="editor-footer">
                <span className="char-count">{answer.length}/200</span>
                <button 
                  className="save-prompt-btn" 
                  disabled={!answer.trim() || saving}
                  onClick={handleSave}
                >
                  {saving ? 'Saving...' : 'Done'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromptManager;
