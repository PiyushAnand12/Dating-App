import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Gamepad2, ChevronRight, Sparkles } from 'lucide-react';
import './QuizGame.css';

const QUIZ_QUESTIONS = [
  { id: 1, type: 'this-or-that', question: 'Coffee or Tea?', options: ['☕ Coffee', '🍵 Tea'] },
  { id: 2, type: 'this-or-that', question: 'Mountain or Beach?', options: ['⛰️ Mountain', '🏖️ Beach'] },
  { id: 3, type: 'this-or-that', question: 'Night Owl or Early Bird?', options: ['🦉 Night Owl', '🐦 Early Bird'] },
  { id: 4, type: 'this-or-that', question: 'Netflix or Night Out?', options: ['📺 Netflix', '💃 Night Out'] },
  { id: 5, type: 'this-or-that', question: 'Cats or Dogs?', options: ['🐱 Cats', '🐶 Dogs'] },
  { id: 6, type: 'this-or-that', question: 'Spicy or Sweet?', options: ['🌶️ Spicy', '🍩 Sweet'] },
];

const QuizGame = ({ onCancel, onSendResult, matchName }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleOptionSelect = (option) => {
    const newAnswers = { ...answers, [QUIZ_QUESTIONS[currentStep].id]: option };
    setAnswers(newAnswers);

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Game finished
      formatAndSend(newAnswers);
    }
  };

  const formatAndSend = (finalAnswers) => {
    let resultText = "🎮 ICEBREAKER QUIZ! Here are my picks:\n\n";
    QUIZ_QUESTIONS.forEach(q => {
      resultText += `• ${q.question}: ${finalAnswers[q.id]}\n`;
    });
    resultText += `\nYour turn, ${matchName}! What would you choose? ✨`;
    onSendResult(resultText);
  };

  return (
    <motion.div 
      className="quiz-game-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="quiz-card glass"
        initial={{ y: 50, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
      >
        <div className="quiz-header">
          <div className="quiz-title">
            <Gamepad2 size={20} className="quiz-icon" />
            <span>Icebreaker Quiz</span>
          </div>
          <button className="quiz-close" onClick={onCancel}><X size={20} /></button>
        </div>

        <div className="quiz-progress">
          <div className="progress-bar">
            <motion.div 
              className="progress-fill" 
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
            />
          </div>
          <span className="progress-text">Step {currentStep + 1} of {QUIZ_QUESTIONS.length}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            className="quiz-content"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
          >
            <h2 className="quiz-question">{QUIZ_QUESTIONS[currentStep].question}</h2>
            <div className="quiz-options">
              {QUIZ_QUESTIONS[currentStep].options.map((opt, i) => (
                <button 
                  key={i} 
                  className="quiz-option-btn"
                  onClick={() => handleOptionSelect(opt)}
                >
                  {opt}
                  <ChevronRight size={18} className="opt-arrow" />
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="quiz-footer">
          <Sparkles size={16} className="sparkle" />
          <p>Finish to share your results with {matchName}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuizGame;
