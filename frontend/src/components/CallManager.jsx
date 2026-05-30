import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, Maximize2, Minimize2, Flag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import './CallManager.css';

const CallManager = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [callState, setCallState] = useState(null); // { type, status, callId, callerId, callerName, matchName, photos }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const onCallReq = (data) => {
      // Don't interrupt an ongoing call
      if (callState) return;
      
      setCallState({
        type: 'incoming',
        status: 'ringing',
        ...data
      });
      playRingtone();
    };

    const onCallAccepted = (data) => {
      setCallState(prev => prev ? { ...prev, status: 'connected' } : null);
      stopRingtone();
    };

    const onCallRejected = () => {
      setCallState(null);
      stopRingtone();
    };

    const onCallEnded = () => {
      setCallState(null);
      stopRingtone();
    };

    const onCallTimeout = () => {
      setCallState(null);
      stopRingtone();
    };

    const onCallStarted = (data) => {
      setCallState({
        type: 'outgoing',
        status: 'ringing',
        ...data
      });
    };

    socket.on('call:request', onCallReq);
    socket.on('call:started', onCallStarted);
    socket.on('call:accepted', onCallAccepted);
    socket.on('call:rejected', onCallRejected);
    socket.on('call:ended', onCallEnded);
    socket.on('call:timeout', onCallTimeout);

    return () => {
      socket.off('call:request', onCallReq);
      socket.off('call:started', onCallStarted);
      socket.off('call:accepted', onCallAccepted);
      socket.off('call:rejected', onCallRejected);
      socket.off('call:ended', onCallEnded);
      socket.off('call:timeout', onCallTimeout);
    };
  }, [socket, callState]);

  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (callState?.status === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setDuration(0);
    }

    return () => clearInterval(timerRef.current);
  }, [callState?.status]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playRingtone = () => {
    // In a real app, use an actual audio file. Simulating with a console log for now
    // or we can use a basic oscillator for a "beep"
    console.log('Ringing...');
  };

  const stopRingtone = () => {
    console.log('Stop Ringing');
  };

  const acceptCall = () => {
    if (socket && callState) {
      socket.emit('call:accept', { 
        callId: callState.callId, 
        callerId: callState.callerId 
      });
    }
  };

  const rejectCall = () => {
    if (socket && callState) {
      socket.emit('call:reject', { 
        callId: callState.callId, 
        callerId: callState.callerId 
      });
      setCallState(null);
    }
  };

  const [isReported, setIsReported] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onReportSuccess = (data) => {
      setIsReported(true);
      setTimeout(() => setIsReported(false), 3000);
    };

    socket.on('call:report_success', onReportSuccess);
    return () => socket.off('call:report_success', onReportSuccess);
  }, [socket]);

  const endCall = () => {
    if (socket && callState) {
      socket.emit('call:end', { callId: callState.callId });
      setCallState(null);
    }
  };

  const reportCall = () => {
    if (!socket || !callState) return;
    
    const targetId = callState.type === 'incoming' ? callState.callerId : callState.receiverId;
    if (!targetId) return;

    if (window.confirm('Are you sure you want to report this call for inappropriate behavior?')) {
      socket.emit('call:report', { 
        callId: callState.callId, 
        targetId,
        reason: 'Inappropriate behavior during video call' 
      });
    }
  };

  if (!callState) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="global-call-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="call-glass-backdrop" />
        
        <motion.div 
          className="call-content"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
        >
          <button 
            className={`call-report-btn ${isReported ? 'reported' : ''}`} 
            onClick={reportCall}
            disabled={isReported}
            title="Report inappropriate behavior"
          >
            <Flag size={16} fill={isReported ? "var(--error)" : "none"} />
            {isReported && <span>Reported</span>}
          </button>

          <div className="call-avatar-wrap">
            <motion.div 
              className="pulse-ring"
              animate={callState.status === 'ringing' ? { scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <img 
              className="call-avatar" 
              src={callState.photos?.[0]?.url || `https://i.pravatar.cc/300?u=${callState.callerId || 'user'}`} 
              alt="Caller" 
            />
          </div>

          <h2 className="call-name">
            {callState.type === 'incoming' ? (callState.callerName || 'Someone') : (callState.matchName || 'Calling...')}
          </h2>
          
          <p className={`call-status-text ${callState.status}`}>
            {callState.status === 'connected' ? (
              <span className="active-timer">
                <span className="dot" /> {formatDuration(duration)}
              </span>
            ) : (
              callState.type === 'incoming' ? 'Incoming Video Call...' : 'Ringing...'
            )}
          </p>

          {callState.status === 'connected' && (
            <div className="voice-waves">
              {[...Array(5)].map((_, i) => (
                <motion.div 
                  key={i}
                  className="wave-bar"
                  animate={{ height: [10, 30, 10] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                />
              ))}
            </div>
          )}

          <div className="call-actions-row">
            {callState.type === 'incoming' && callState.status !== 'connected' ? (
              <>
                <button className="call-btn accept" onClick={acceptCall}>
                  <Phone size={24} fill="currentColor" />
                </button>
                <button className="call-btn reject" onClick={rejectCall}>
                  <PhoneOff size={24} fill="currentColor" />
                </button>
              </>
            ) : (
              <>
                {callState.status === 'connected' && (
                  <div className="connected-tools">
                    <button className={`tool-btn ${isMuted ? 'off' : ''}`} onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button className={`tool-btn ${isVideoOff ? 'off' : ''}`} onClick={() => setIsVideoOff(!isVideoOff)}>
                      {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  </div>
                )}
                <button className="call-btn reject end" onClick={callState.status === 'connected' ? endCall : rejectCall}>
                  <PhoneOff size={24} fill="currentColor" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallManager;
