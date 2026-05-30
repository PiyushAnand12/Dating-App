import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, MoreVertical, ShieldCheck, Heart, MessageCircle, ArrowRight, Phone, Video, Search, Image, Mic, X, Flag, UserX, Volume2, Copy, Reply, Trash2, Edit3, Share, Gamepad2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import QuizGame from '../components/QuizGame';
import ReportModal from '../components/ReportModal';
import PremiumLoader from '../components/PremiumLoader';
import './Chat.css';

const EMOJIS = ['❤️','😂','😮','😢','🔥'];
const ICEBREAKERS = [
  "If you could travel anywhere tomorrow, where would you go? ✈️",
  "What's the best meal you've ever had? 🍽️",
  "What's your go-to karaoke song? 🎤",
  "Coffee or chai? And where's the best one you've had? ☕",
  "What's something on your bucket list? 🌟",
  "Two truths and a lie — you go first! 😏",
];

const fmtTime = d => new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const fmtDate = d => {
  const dt = new Date(d), now = new Date();
  const diff = Math.floor((now - dt) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return dt.toLocaleDateString([],{day:'numeric',month:'short',year: dt.getFullYear()!==now.getFullYear()?'numeric':undefined});
};
const isSameDay = (a,b) => {
  const d1=new Date(a),d2=new Date(b);
  return d1.getFullYear()===d2.getFullYear()&&d1.getMonth()===d2.getMonth()&&d1.getDate()===d2.getDate();
};

const Chat = () => {
  const [matches,setMatches]=useState([]);
  const [active,setActive]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [text,setText]=useState('');
  const [typing,setTyping]=useState(false);
  const [replyTo,setReplyTo]=useState(null);
  const [editMsg,setEditMsg]=useState(null);
  const [menuId,setMenuId]=useState(null);
  const [fwdModal,setFwdModal]=useState(null);
  const [headerMenu,setHeaderMenu]=useState(false);
  const [profilePeek,setProfilePeek]=useState(false);
  const [fwdMessage, setFwdMessage] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      try {
        const getRect = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: r.top, left: r.left, width: r.width, height: r.height, display: window.getComputedStyle(el).display, visibility: window.getComputedStyle(el).visibility };
        };
        const report = {
          viewport: { w: window.innerWidth, h: window.innerHeight },
          appContainer: getRect('.app-container'),
          chatPage: getRect('.chat-page'),
          chatWindow: getRect('.chat-window'),
          chatHeader: getRect('.chat-header'),
          messagesArea: getRect('.messages-area'),
          inputContainer: getRect('.input-container')
        };
        fetch('http://localhost:9999/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        }).catch(e => console.error('report error:', e));
      } catch (e) {}
    }, 1500);
  }, [active]);

  const [searchOpen,setSearchOpen]=useState(false);
  const [searchQ,setSearchQ]=useState('');
  const [sideSearch,setSideSearch]=useState('');
  const [showQuiz,setShowQuiz]=useState(false);
  const [showReport, setShowReport] = useState(false);

  const messagesAreaRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recTimer = useRef(null);

  const startRecording = async () => {
    if (!active) return;
    const targetId = active.userId; // Capture stable ID

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        if (audioBlob.size < 500) return; // Ignore accidental taps

        const tid = `temp-voice-${Date.now()}`;
        // Optimistic update
        setMsgs(p => [...p, {
          id: tid,
          tempId: tid,
          senderId: userRef.current.id,
          receiverId: targetId,
          type: 'AUDIO',
          status: 'SENDING',
          createdAt: new Date().toISOString()
        }]);

        const formData = new FormData();
        formData.append('voice', audioBlob, 'voice_note.webm');
        formData.append('receiverId', targetId);
        formData.append('tempId', tid); // Pass tempId for socket resolution

        try {
          await api.post('users/messages/voice-note', formData);
        } catch (err) {
          setMsgs(p => p.map(m => m.tempId === tid ? { ...m, status: 'ERROR' } : m));
          console.error('Failed to upload voice note', err);
        }
      };

      mediaRecorder.current.start();
      setRecording(true);
      setRecTime(0);
      recTimer.current = setInterval(() => {
        setRecTime(p => {
          if (p >= 119) { // 120 seconds limit
            stopRecording();
            return 120;
          }
          return p + 1;
        });
      }, 1000);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = (cancel = false) => {
    if (!mediaRecorder.current) return;
    if (cancel) audioChunks.current = [];
    mediaRecorder.current.stop();
    mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
    clearInterval(recTimer.current);
  };

  const fmtDuration = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const AudioPlayer = ({ url }) => {
    const [playing, setPlaying] = useState(false);
    const [prog, setProg] = useState(0);
    const [speed, setSpeed] = useState(1);
    const audio = useRef(null);
    const bars = React.useMemo(() => Array.from({length: 28}, () => Math.random() * 14 + 4), []);

    useEffect(() => {
      if (audio.current) {
        audio.current.playbackRate = speed;
      }
    }, [speed]);

    useEffect(() => {
      if (!url) return;
      
      // Cleanup previous audio if url changes
      if (audio.current) {
        audio.current.pause();
        audio.current = null;
        setPlaying(false);
        setProg(0);
      }

      let a;
      try {
        a = new Audio(url);
        a.playbackRate = speed;
        audio.current = a;
      } catch (e) {
        console.error('Audio initialization failed', e);
        return;
      }
      
      const onEnd = () => { setPlaying(false); setProg(0); };
      const onTime = () => {
        if (a.duration) setProg((a.currentTime / a.duration) * 100);
      };
      a.addEventListener('ended', onEnd);
      a.addEventListener('timeupdate', onTime);
      return () => {
        a.pause();
        a.removeEventListener('ended', onEnd);
        a.removeEventListener('timeupdate', onTime);
      };
    }, [url]);

    const toggle = () => {
      if (!audio.current) return;
      if (playing) audio.current.pause();
      else audio.current.play();
      setPlaying(!playing);
    };

    const cycleSpeed = () => {
      setSpeed(s => s === 1 ? 1.5 : s === 1.5 ? 2 : 1);
    };

    return (
      <div className="voice-player">
        <button className="v-play" onClick={toggle}>{playing ? '||' : '▶'}</button>
        <div className="v-waveform">
          {bars.map((h, i) => (
            <div 
              key={i} 
              className={`v-bar ${prog > (i / bars.length) * 100 ? 'active' : ''}`} 
              style={{ height: h }} 
            />
          ))}
        </div>
        <button className="v-speed" onClick={cycleSpeed}>{speed}x</button>
        <span className="voice-dur" style={{ opacity: 0.6, marginLeft: '8px' }}>
          {fmtDuration(audio.current?.currentTime || 0)}
        </span>
      </div>
    );
  };

  const {user,loading}=useAuth();
  const {socket, connected}=useSocket();
  const nav=useNavigate();
  const activeRef=useRef(active);
  const userRef=useRef(user);
  useEffect(()=>{activeRef.current=active},[active]);
  useEffect(()=>{userRef.current=user},[user]);

  useEffect(()=>{if(!loading&&!user) nav('/login')},[user,loading,nav]);
  useEffect(() => {
    if (user || active) {
      console.log('[DEBUG-STATE] User:', user?.id, 'Active:', active?.userId);
    }
  }, [user, active]);
  useEffect(()=>{
    if(!user) return;
    api.get('users/matches').then(r=>setMatches(r.data.data)).catch(()=>{});
  },[user]);

  // Socket
  useEffect(()=>{
    if(!socket) return;
 
     const onMsg=msg=>{
       console.log('[DEBUG] Message Received:', msg);
       const am=activeRef.current, me=userRef.current;
       const sId = msg.senderId || msg.userId;
       const rId = msg.receiverId;
       
       // Broaden relevance check to handle various ID field names
        const isRelevant = am && (
          sId === am.userId || sId === am.id || 
          rId === am.userId || rId === am.id
        );
        console.log('[DEBUG] IsRelevant:', isRelevant, { active: am?.userId || am?.id, sId, rId });

       if(isRelevant){
         setMsgs(p=>{
           const ex=p.some(m=>m.id===msg.id||(msg.tempId&&m.tempId===msg.tempId));
           if(ex) return p.map(m=>(m.id===msg.id||(msg.tempId&&m.tempId===msg.tempId))?{...msg,status:m.status==='READ'?'READ':msg.status}:m);
           return [...p,msg];
         });
         if(sId===am.userId || sId === am.id) socket.emit('message_seen',{senderId: sId});
       }
       
       setMatches(p=>p.map(m=>{
         const oid = sId === me?.id ? rId : sId;
         if (m.user.userId===oid || m.user.id===oid) {
           const preview = msg.type === 'AUDIO' ? '🎤 Voice Note' : (msg.body || '📷 Photo');
           return {...m,lastMessage: preview,lastMessageAt:msg.createdAt};
         }
         return m;
       }));
     };
    const onTyp=({userId:uid,isTyping})=>{if(activeRef.current?.userId===uid) setTyping(isTyping)};
    const onEdit=u=>setMsgs(p=>p.map(m=>m.id===u.id?{...m,...u}:m));
    const onDel=({messageId})=>setMsgs(p=>p.map(m=>m.id===messageId?{...m,isDeleted:true,body:null}:m));
    const onReact=({messageId,reactions})=>setMsgs(p=>p.map(m=>m.id===messageId?{...m,reactions}:m));
    const onRead=({readerId})=>setMsgs(p=>p.map(m=>m.senderId!==readerId?{...m,status:'READ'}:m));
    const onStatus=s=>{
      setMatches(p=>p.map(m=>m.user.userId===s.userId?{...m,user:{...m.user,isOnline:s.isOnline,lastActiveAt:s.lastActiveAt}}:m));
      if(activeRef.current?.userId===s.userId) setActive(p=>p?{...p,isOnline:s.isOnline,lastActiveAt:s.lastActiveAt}:null);
    };
    const onScreenshot=({userId:uid})=>{
      const am=activeRef.current;
      if(am&&uid===am.userId){
        setMsgs(p=>[...p,{
          id:`system-${Date.now()}`,
          type:'SYSTEM',
          body:`📸 ${am.firstName} took a screenshot of this chat!`,
          createdAt:new Date().toISOString()
        }]);
      }
    };

    socket.on('new_message',onMsg); socket.on('typing_update',onTyp);
    socket.on('message_edited',onEdit); socket.on('message_deleted',onDel);
    socket.on('message_reaction',onReact); socket.on('messages_read',onRead);
    socket.on('user_status',onStatus);
    socket.on('screenshot_alert',onScreenshot);

    const onBlock = ({ targetUserId, actorId }) => {
      const blockedId = targetUserId || actorId;
      if (activeRef.current?.userId === blockedId) {
        closeConvo();
        alert('This conversation is no longer available.');
      }
      setMatches(p => p.filter(m => m.user.userId !== blockedId));
    };

    socket.on('user_blocked', onBlock);
    socket.on('blocked_by_user', onBlock);

     socket.on('voice_note_received', onMsg);

     return ()=>{
       ['new_message','typing_update','message_edited','message_deleted',
        'message_reaction','messages_read','user_status','screenshot_alert',
        'user_blocked', 'blocked_by_user', 'voice_note_received'
       ].forEach(e=>socket.off(e));
     };
  },[socket]);

  useEffect(()=>{
    if(!active||!socket) return;
    setMsgs([]); setTyping(false); setReplyTo(null); setEditMsg(null); setMenuId(null);
    api.get(`users/messages/${active.userId}`).then(r=>{
      setMsgs(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = r.data.data.filter(m => !existingIds.has(m.id));
        return [...prev, ...newMsgs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
      socket.emit('message_seen',{senderId:active.userId});
    }).catch(()=>{});
    socket.emit('join_conversation',{otherUserId:active.userId});
  },[active,socket]);

  // Screenshot Detection
  useEffect(() => {
    const handleScreenshot = (e) => {
      // Detection for common screenshot keys
      // PrtSc, Win+Shift+S, Cmd+Shift+4 (macOS), etc.
      const isScreenshot = 
        e.key === 'PrintScreen' || 
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
        (e.ctrlKey && e.key === 'p'); // Print

      if (isScreenshot && active && socket) {
        socket.emit('chat_screenshot', { receiverId: active.userId });
        // Local warning
        setMsgs(p => [...p, {
          id: `system-me-${Date.now()}`,
          type: 'SYSTEM',
          body: 'You took a screenshot! The other person has been notified. 📸',
          createdAt: new Date().toISOString()
        }]);
      }
    };

    window.addEventListener('keyup', handleScreenshot);
    return () => window.removeEventListener('keyup', handleScreenshot);
  }, [active, socket]);

  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTo({
        top: messagesAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [msgs]);

  const startCall=(type)=>{
    if(!socket || !connected) {
      alert('Connection lost. Reconnecting…');
      return;
    }
    if(!active) return;
    socket.emit('call:initiate',{receiverId:active.userId});
    setHeaderMenu(false);
  };

  // Actions
  const send=()=>{
    if(!text.trim()||!active||!socket) return;
    if(editMsg){
      api.patch(`users/messages/${editMsg.id}`,{body:text});
      setMsgs(p=>p.map(m=>m.id===editMsg.id?{...m,body:text,isEdited:true}:m));
      socket.emit('edit_message',{messageId:editMsg.id,receiverId:active.userId,newBody:text});
      setEditMsg(null);
    } else {
      const tid=`temp-${Date.now()}`;
      setMsgs(p=>[...p,{id:tid,tempId:tid,senderId:user.id,receiverId:active.userId,body:text,createdAt:new Date().toISOString(),status:'SENDING',replyTo}]);
      socket.emit('send_message',{receiverId:active.userId,body:text,replyToId:replyTo?.id,tempId:tid});
      setReplyTo(null);
    }
    setText('');
    socket.emit('typing',{otherUserId:active.userId,isTyping:false});
  };

  const onInput=e=>{
    setText(e.target.value);
    if(socket&&active){
      socket.emit('typing',{otherUserId:active.userId,isTyping:true});
      clearTimeout(window.__tt);
      window.__tt=setTimeout(()=>socket.emit('typing',{otherUserId:active.userId,isTyping:false}),2000);
    }
  };

  const doReply=m=>{setReplyTo(m);setEditMsg(null);setMenuId(null)};
  const doEdit=m=>{
    if(m.senderId!==user.id) return;
    setEditMsg(m);setText(m.body);setReplyTo(null);setMenuId(null);
  };
  const doDel=async id=>{
    if(!confirm('Delete for everyone?')) return;
    await api.delete(`users/messages/${id}`);
    setMsgs(p=>p.map(m=>m.id===id?{...m,isDeleted:true,body:null}:m));
    socket.emit('delete_message',{messageId:id,receiverId:active.userId});
    setMenuId(null);
  };
  const doCopy=t=>{navigator.clipboard.writeText(t);setMenuId(null)};
  const doFwd=m=>{setFwdModal(m);setMenuId(null)};
  const doReact=async(id,emoji)=>{
    try{
      const r=await api.post(`users/messages/${id}/react`,{emoji});
      setMsgs(p=>p.map(m=>m.id===id?{...m,reactions:r.data.data}:m));
      socket.emit('message_reaction',{messageId:id,reactions:r.data.data,receiverId:active.userId});
    }catch(e){}
    setMenuId(null);
  };
  const confirmFwd=async tid=>{
    await api.post(`users/messages/${fwdModal.id}/forward`,{receiverId:tid});
    setFwdModal(null);
  };
  const doBlock=async(skipConfirm = false)=>{
    if(!skipConfirm && !confirm(`Block ${active.firstName}?`)) return;
    try{await api.post('users/block',{targetUserId:active.userId})}catch(e){}
    setActive(null); setHeaderMenu(false);
    setMatches(p=>p.filter(m=>m.user.userId!==active?.userId));
  };
  const doUnmatch=async()=>{
    if(!confirm(`Unmatch ${active.firstName}? This cannot be undone.`)) return;
    try{await api.delete(`users/matches/${active.userId}`)}catch(e){}
    setActive(null); setHeaderMenu(false);
    setMatches(p=>p.filter(m=>m.user.userId!==active?.userId));
  };


  const saveVoiceNote = async (msgId) => {
    try {
      const resp = await api.get(`users/messages/${msgId}/download`);
      const { downloadUrl } = resp.data.data;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMenuId(null);
    } catch (err) {
      console.error('Failed to save voice note', err);
      alert('Could not download voice note.');
    }
  };

  const useIcebreaker=prompt=>{setText(prompt);setMenuId(null)};
  const openConvo=mu=>{setActive(mu);setSearchOpen(false);setSearchQ('')};
  
  const getSmartStarters = (otherUser) => {
    const myInterests = user?.interests?.map(i => i.interest?.name || i) || [];
    const theirInterests = otherUser?.interests || [];
    const common = myInterests.filter(i => theirInterests.includes(i));
    
    if (common.length > 0) {
      const topic = common[Math.floor(Math.random() * common.length)];
      return [
        `I see we both like ${topic}! What's your favorite thing about it?`,
        `How long have you been into ${topic}? I'm obsessed!`,
        `Always good to meet a fellow ${topic} lover. Any recommendations?`
      ];
    }
    return ICEBREAKERS;
  };

  const closeConvo=()=>{
    if(socket&&active) socket.emit('leave_conversation',{otherUserId:active.userId});
    setActive(null);setMsgs([]);setTyping(false);
  };
  const fmtLastSeen=iso=>iso?`Last seen ${fmtTime(iso)}`:'Offline';

  const filteredMatches=sideSearch?matches.filter(m=>m.user.firstName.toLowerCase().includes(sideSearch.toLowerCase())):matches;
  const filteredMsgs=searchQ?msgs.filter(m=>m.body?.toLowerCase().includes(searchQ.toLowerCase())):msgs;

  if(loading||!user) return(
    <div className="chat-page loading-state">
      <PremiumLoader text="Preparing your messages..." />
    </div>
  );

  const iceIdx=active?Math.abs(active.userId.charCodeAt(0))%ICEBREAKERS.length:0;
  const isNewConvo=active&&filteredMsgs.length===0;

  return(
    <div className="chat-page">
      {/* Dynamic Background Auras */}
      <div className="chat-bg-aura aura-1" />
      <div className="chat-bg-aura aura-2" />
      <div className="chat-bg-noise" />

      {/* ═══ SIDEBAR ═══ */}
      <div className={`match-sidebar${active?' hidden':''}`}>
        <div className="sidebar-header">
          <ArrowLeft className="nav-icon" size={20} onClick={()=>nav('/')}/>
          <h3>Messages</h3>
          <ShieldCheck size={18} className="verified-icon"/>
        </div>
        <div className="sidebar-search"><div className="search-wrapper">
          <Search size={14} className="search-icon"/>
          <input placeholder="Search conversations…" value={sideSearch} onChange={e=>setSideSearch(e.target.value)}/>
        </div></div>
        <div className="match-list">
          {filteredMatches.length===0&&<div className="match-empty">{sideSearch?'No results':'No matches yet.\nKeep swiping! 💫'}</div>}
          {filteredMatches.map(md=>{
            const mu=md.user;
            return(
              <div key={md.matchId} className={`match-item${active?.userId===mu.userId?' active':''}`} onClick={()=>openConvo(mu)}>
                <div className="match-avatar">
                  <img src={mu.photos?.[0]?.url||`https://i.pravatar.cc/100?u=${mu.userId}`} alt={mu.firstName}/>
                  {mu.isOnline&&<div className="online-dot"/>}
                </div>
                <div className="match-info">
                  <h4>{mu.firstName}</h4>
                  <p>{md.lastMessage||'New match! Say hello 👋'}</p>
                </div>
                {md.lastMessageAt&&<span className="match-time">{fmtTime(md.lastMessageAt)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ CHAT WINDOW ═══ */}
      <div className={`chat-window${!active?' hidden':''}`}>
        {active?(
          <>
            {/* Header */}
            <div className="chat-header">
              <button className="back-btn" onClick={closeConvo}><ArrowLeft size={22}/></button>
              <div className="header-user" onClick={()=>setProfilePeek(true)}>
                <img src={active.photos?.[0]?.url||`https://i.pravatar.cc/100?u=${active.userId}`} alt="" className={active.isOnline?'online-ring':''}/>
                <div>
                  <h4>{active.firstName}</h4>
                  <span className={`header-status${typing?' typing':active.isOnline?' online':''}`}>
                    {typing?'typing…':active.isOnline?'Online':fmtLastSeen(active.lastActiveAt)}
                  </span>
                </div>
              </div>
              <div className="header-actions">
                <span className={`conn-badge ${connected?'on':'off'}`}>{connected?'LIVE':'…'}</span>
                <button className="header-action-btn call" onClick={()=>startCall('video')}><Video size={18}/></button>
                <button className="header-action-btn" onClick={()=>startCall('audio')}><Phone size={16}/></button>
                <button className="header-action-btn" onClick={e=>{e.stopPropagation();setHeaderMenu(!headerMenu)}}><MoreVertical size={18}/></button>
              </div>
              {headerMenu&&<>
                <div className="header-menu-overlay" onClick={()=>setHeaderMenu(false)}/>
                <div className="header-menu">
                  <button onClick={()=>{setSearchOpen(!searchOpen);setHeaderMenu(false)}}><Search size={14}/>Search chat</button>
                  <button onClick={()=>{setProfilePeek(true);setHeaderMenu(false)}}><Heart size={14}/>View profile</button>
                  <button onClick={()=>{setShowQuiz(true);setHeaderMenu(false)}}><Gamepad2 size={14} color="var(--primary)"/>Play Icebreaker Quiz</button>
                  <hr className="divider"/>
                  <button className="danger" onClick={doUnmatch}><UserX size={14}/>Unmatch</button>
                  <button className="danger" onClick={() => { setShowReport(true); setHeaderMenu(false); }}><Flag size={14}/>Block & Report</button>
                </div>
              </>}
            </div>

            {/* Search bar */}
            <AnimatePresence>{searchOpen&&(
              <motion.div className="sidebar-search" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}>
                <div className="search-wrapper">
                  <Search size={14} className="search-icon"/>
                  <input placeholder="Search messages…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} autoFocus/>
                </div>
              </motion.div>
            )}</AnimatePresence>

            {/* Messages */}
            <div className="messages-area" ref={messagesAreaRef} onClick={()=>{setMenuId(null);setHeaderMenu(false)}}>
              {isNewConvo&&(
                <div className="icebreaker">
                  <span className="ice-emoji">✨</span>
                  <p className="ice-text">
                    You matched with {active.firstName}!<br/>
                    {active.interests?.length > 0 ? (
                      <span>You both like <b>{active.interests.slice(0, 2).join(' & ')}</b>!</span>
                    ) : 'Break the ice with a conversation starter'}
                  </p>
                  <div className="ice-suggestions">
                    {getSmartStarters(active).slice(0, 2).map((p, idx) => (
                      <div key={idx} className="ice-prompt" onClick={()=>useIcebreaker(p)}>{p}</div>
                    ))}
                  </div>
                  <button className="quiz-ice-btn" onClick={() => setShowQuiz(true)}>
                    <Gamepad2 size={16} /> Play a Quick Quiz
                  </button>
                </div>
              )}
              {filteredMsgs.map((msg,i)=>{
                const mine=msg.senderId===user.id;
                const showDate=i===0||!isSameDay(msg.createdAt,filteredMsgs[i-1].createdAt);
                return(
                  <React.Fragment key={msg.id||i}>
                    {showDate&&<div className="date-sep"><span>{fmtDate(msg.createdAt)}</span></div>}
                    {msg.type === 'SYSTEM' ? (
                      <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:.12}} className="system-msg-wrap">
                        <div className="system-msg">
                          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{msg.body}</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:.12}} className={`msg-wrap ${mine?'sent':'received'}`}>
                        <div className="msg-group"><div className="msg-row">
                          <div className={`bubble${msg.type==='IMAGE'?' img-bubble':''}`} onDoubleClick={()=>!msg.isDeleted&&doReact(msg.id,'❤️')}>
                            {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                              <div className="reactions">
                                {msg.reactions.map((r, j) => <span key={j} className="react-pill">{r.emoji}</span>)}
                              </div>
                            )}
                            {msg.replyTo&&<div className="reply-in"><small>{msg.replyTo.senderId===user.id?'You':active.firstName}</small><p>{msg.replyTo.body}</p></div>}
                            {msg.isDeleted?<span className="del-text">Message deleted</span>
                             :msg.type==='IMAGE'?<img src={msg.mediaUrl} alt=""/>
                             :msg.type==='AUDIO'?(
                              <div className="voice-message">
                                <AudioPlayer url={msg.mediaUrl} />
                                <div className="voice-wave-visual">
                                  {[...Array(8)].map((_,k)=><motion.span key={k} animate={{height:[4,12,4]}} transition={{repeat:Infinity,duration:.8,delay:k*.1}}/>)}
                                </div>
                              </div>
                             ):(
                              <div className="message-body">{msg.body}{msg.isEdited&&<span className="edited-tag">(edited)</span>}</div>
                             )}
                            {!msg.isDeleted&&<div className="msg-meta">
                              <span className="msg-time">{fmtTime(msg.createdAt)}</span>
                              {mine&&<span className={`msg-tick${msg.status==='READ'?' seen':''}`}>{msg.status==='READ'?'✓✓':'✓'}</span>}
                            </div>}
                          </div>
                          {!msg.isDeleted&&<div className="msg-menu-wrap">
                            <button className="menu-dot" onClick={e=>{e.stopPropagation();setMenuId(menuId===msg.id?null:msg.id)}}><MoreVertical size={14}/></button>
                            {menuId===msg.id&&<div className="ctx-menu" onClick={e=>e.stopPropagation()}>
                              <div className="react-row">{EMOJIS.map(em=><button key={em} onClick={()=>doReact(msg.id,em)}>{em}</button>)}</div>
                              <hr className="divider"/>
                              <button onClick={()=>doReply(msg)}>Reply</button>
                              <button onClick={()=>doFwd(msg)}>Forward</button>
                              <button onClick={()=>doCopy(msg.body)}>Copy</button>
                              {msg.type === 'AUDIO' && (
                                <button onClick={() => saveVoiceNote(msg.id)}>Save to device</button>
                              )}
                              {mine&&!String(msg.id).startsWith('temp-')&&<>
                                <button onClick={()=>doEdit(msg)}>Edit</button>
                                <button className="del" onClick={()=>doDel(msg.id)}>Delete</button>
                              </>}
                            </div>}
                          </div>}
                        </div></div>
                      </motion.div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Input */}
            <div className="input-container">
              <AnimatePresence>
                {replyTo&&<motion.div className="reply-bar" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}>
                  <div className="bar-info"><small>Replying to {replyTo.senderId===user.id?'yourself':active.firstName}</small><p>{replyTo.body}</p></div>
                  <button className="bar-close" onClick={()=>setReplyTo(null)}>✕</button>
                </motion.div>}
                {editMsg&&<motion.div className="edit-bar" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}>
                  <div className="bar-info"><small>Editing message</small><p>{editMsg.body}</p></div>
                  <button className="bar-close" onClick={()=>{setEditMsg(null);setText('')}}>✕</button>
                </motion.div>}
                {recording && (
                  <motion.div className="recording-bar" initial={{height:0}} animate={{height:'auto'}} exit={{height:0}}>
                    <div className={`rec-info ${recTime > 110 ? 'limit-near' : ''}`}>
                      <div className="rec-dot" />
                      <span>{fmtDuration(recTime)}</span>
                    </div>
                    <div className="rec-actions">
                      <button className="rec-cancel" onClick={() => stopRecording(true)}>Cancel</button>
                      <button className="rec-send" onClick={() => stopRecording(false)}>Send</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="input-row">
                <input type="text" placeholder={editMsg?'Edit message…':recording?'Recording…':'Type a message…'} value={text} onChange={onInput} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} disabled={recording}/>
                {text.trim() || editMsg ? (
                  <button className="send-btn" onClick={send} aria-label="Send"><Send size={18}/></button>
                ) : (
                  <button className={`mic-btn ${recording?'active':''}`} onClick={recording?()=>stopRecording(false):startRecording} aria-label="Record Voice">
                    <Mic size={20}/>
                  </button>
                )}
              </div>
            </div>
          </>
        ):(<div className="no-chat"><MessageCircle size={52} className="faded-icon"/><h3>Select a match to start chatting</h3></div>)}
      </div>

      {/* ═══ PROFILE PEEK ═══ */}
      {profilePeek&&active&&(
        <div className="peek-overlay" onClick={()=>setProfilePeek(false)}>
          <div className="peek-card" onClick={e=>e.stopPropagation()}>
            <img className="peek-photo" src={active.photos?.[0]?.url||`https://i.pravatar.cc/400?u=${active.userId}`} alt=""/>
            <div className="peek-body">
              <h3>{active.firstName}{active.age?`, ${active.age}`:''}</h3>
              <p className="peek-sub">{active.location||'Nearby'}{active.isOnline?' • Online':''}</p>
              {active.interests?.length>0&&<div className="peek-tags">{(active.interests||[]).slice(0,6).map((t,i)=><span key={i} className="peek-tag">{typeof t==='string'?t:t.name||t}</span>)}</div>}
              <div className="peek-actions">
                <button className="peek-close" onClick={()=>setProfilePeek(false)}>Close</button>
                <button className="peek-view" onClick={()=>{nav(`/profile/${active.userId}`);setProfilePeek(false)}}>Full Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORWARD MODAL ═══ */}
      {fwdModal&&(
        <div className="fwd-overlay" onClick={()=>setFwdModal(null)}>
          <div className="fwd-modal" onClick={e=>e.stopPropagation()}>
            <h3>Forward Message</h3>
            <div className="fwd-list">{matches.map(m=>(
              <div key={m.matchId} className="fwd-item" onClick={()=>confirmFwd(m.user.userId)}>
                <img src={m.user.photos?.[0]?.url||`https://i.pravatar.cc/60?u=${m.user.userId}`} alt=""/>
                <span>{m.user.firstName}</span><ArrowRight size={14} style={{color:'rgba(255,255,255,.2)'}}/>
              </div>
            ))}</div>
            <button className="fwd-cancel" onClick={()=>setFwdModal(null)}>Cancel</button>
          </div>
        </div>
      )}



      <AnimatePresence>
        {showQuiz && active && (
          <QuizGame 
            matchName={active.firstName}
            onCancel={() => setShowQuiz(false)}
            onSendResult={(res) => {
              setText(res);
              setShowQuiz(false);
              // Small delay to ensure text is set before sending if we wanted auto-send
              // For now, let user review and click send
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showReport && active && (
          <ReportModal 
            targetUser={active}
            onCancel={() => setShowReport(false)}
            onSuccess={() => {
              setShowReport(false);
              doBlock(true); // Automatically block user after reporting
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
