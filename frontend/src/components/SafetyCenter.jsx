import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Phone, Plus, Trash2, MapPin, AlertTriangle, ArrowLeft, Heart, User, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import './SafetyCenter.css';

const SafetyCenter = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPanicking, setIsPanicking] = useState(false);
  const [alertId, setAlertId] = useState(null);
  
  const { user, token } = useAuth();
  const { socket } = useSocket(token);
  
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relation: ''
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get('users/safety/contacts');
      setContacts(res.data.data);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      await api.post('users/safety/contacts', newContact);
      setNewContact({ name: '', phone: '', relation: '' });
      setShowAddForm(false);
      fetchContacts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add contact');
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Remove this emergency contact?')) return;
    try {
      await api.delete(`users/safety/contacts/${id}`);
      fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact', err);
    }
  };

  const triggerPanic = async () => {
    if (!window.confirm('TRIGGER EMERGENCY ALERT? This will notify all your contacts with your location.')) return;
    
    setIsPanicking(true);
    
    // Get current location
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await api.post('users/safety/panic', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        const alertId = res.data.data.alertId;
        setAlertId(alertId);

        // REAL-TIME: Emit panic alert via socket
        if (socket) {
          socket.emit('panic_trigger', {
            alertId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        }
      } catch (err) {
        console.error('Panic failed', err);
        setIsPanicking(false);
      }
    }, (err) => {
      alert('Location access is required for the Panic Button.');
      setIsPanicking(false);
    });
  };

  const resolveAlert = async () => {
    try {
      await api.patch(`users/safety/alert/${alertId}/resolve`);
      
      // REAL-TIME: Emit resolution via socket
      if (socket) {
        socket.emit('panic_resolve', { alertId });
      }

      setIsPanicking(false);
      setAlertId(null);
      alert('Your alert has been resolved. Stay safe!');
    } catch (err) {
      console.error('Resolve failed', err);
    }
  };

  return (
    <div className={`safety-page ${isPanicking ? 'panic-mode' : ''}`}>
      <nav className="safety-nav">
        <ArrowLeft onClick={() => navigate(-1)} className="nav-back" />
        <h2>Safety Center</h2>
        <ShieldCheck className="nav-shield" />
      </nav>

      <main className="safety-content">
        <section className="safety-hero glass">
          <div className="hero-icon-box">
            <ShieldAlert size={48} className="hero-shield" />
          </div>
          <h1>Your Safety Matters</h1>
          <p>Set up your safety network and access real-time assistance whenever you need it.</p>
        </section>

        <section className="panic-section">
          {!isPanicking ? (
            <motion.button 
              className="panic-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerPanic}
            >
              <div className="panic-inner">
                <AlertTriangle size={32} />
                <span>PANIC BUTTON</span>
              </div>
              <div className="panic-pulse" />
            </motion.button>
          ) : (
            <div className="active-panic glass">
              <div className="panic-header">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="alert-dot"
                />
                <h3>ALERT ACTIVE</h3>
              </div>
              <p>Your contacts have been notified with your current location. Help is on the way.</p>
              <button className="resolve-btn" onClick={resolveAlert}>I am Safe Now</button>
            </div>
          )}
        </section>

        <section className="safety-management glass">
          <div className="manage-item" onClick={() => navigate('/profile/blocked')}>
            <div className="manage-info">
              <UserX size={20} className="manage-icon" />
              <div>
                <h4>Block List</h4>
                <span>Manage users you've blocked</span>
              </div>
            </div>
            <ArrowLeft className="manage-arrow" style={{ transform: 'rotate(180deg)' }} />
          </div>
        </section>

        <section className="contacts-section">
          <div className="section-header">
            <h3>Emergency Contacts</h3>
            <button className="add-btn" onClick={() => setShowAddForm(true)}>
              <Plus size={18} />
              Add
            </button>
          </div>

          <div className="contacts-list">
            {loading ? <p>Loading contacts...</p> : (
              contacts.map(contact => (
                <div key={contact.id} className="contact-card glass">
                  <div className="contact-info">
                    <User size={20} className="contact-icon" />
                    <div>
                      <h4>{contact.name}</h4>
                      <span>{contact.relation || 'Contact'} • {contact.phone}</span>
                    </div>
                  </div>
                  <button className="delete-contact" onClick={() => handleDeleteContact(contact.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
            {!loading && contacts.length === 0 && (
              <div className="no-contacts glass">
                <Phone size={32} />
                <p>No contacts added yet. Add someone you trust.</p>
              </div>
            )}
          </div>
        </section>

        <section className="safety-tips-expanded">
          <div className="section-header">
            <h3>Safety Tips</h3>
          </div>
          <div className="tips-container">
            <div className="tip-group glass">
              <h4>📅 Before You Meet</h4>
              <ul>
                <li>Get to know the other person before meeting them off-app.</li>
                <li>Always meet in a public, well-lit place.</li>
                <li>Share your date plans with a trusted friend or family member.</li>
                <li>Arrange your own transportation to and from the date.</li>
              </ul>
            </div>
            <div className="tip-group glass">
              <h4>🛡️ On the Date</h4>
              <ul>
                <li>Keep your personal belongings (phone, wallet, keys) with you at all times.</li>
                <li>Be mindful of your alcohol consumption; don't leave your drink unattended.</li>
                <li>If you feel uncomfortable, don't be afraid to leave early.</li>
                <li>Trust your instincts—if something feels off, it probably is.</li>
              </ul>
            </div>
            <div className="tip-group glass">
              <h4>🚫 Protecting Your Info</h4>
              <ul>
                <li>Never share your home address or financial information early on.</li>
                <li>Be wary of anyone who asks for money or financial assistance.</li>
                <li>Keep your social media handles private until you've established trust.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="safety-resources">
          <h3>Resources</h3>
          <div className="resources-grid">
            <a href="https://www.rainn.org/" target="_blank" rel="noopener noreferrer" className="resource-link glass">
              <div className="resource-content">
                <strong>RAINN</strong>
                <span>National Sexual Assault Hotline</span>
              </div>
            </a>
            <a href="https://www.thehotline.org/" target="_blank" rel="noopener noreferrer" className="resource-link glass">
              <div className="resource-content">
                <strong>The Hotline</strong>
                <span>National Domestic Violence Hotline</span>
              </div>
            </a>
            <a href="https://www.crisistextline.org/" target="_blank" rel="noopener noreferrer" className="resource-link glass">
              <div className="resource-content">
                <strong>Crisis Text Line</strong>
                <span>Text HOME to 741741</span>
              </div>
            </a>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showAddForm && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content glass"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <h3>Add Emergency Contact</h3>
              <form onSubmit={handleAddContact}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={newContact.name}
                    onChange={e => setNewContact({...newContact, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    required 
                    value={newContact.phone}
                    onChange={e => setNewContact({...newContact, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Relation (Optional)</label>
                  <input 
                    type="text" 
                    value={newContact.relation}
                    onChange={e => setNewContact({...newContact, relation: e.target.value})}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button type="submit" className="save-btn">Save Contact</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SafetyCenter;
