import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// --- Chart.js Imports ---
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import './App.css';

// --- Register Chart.js components ---
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Backend API URL ---
const API_URL = 'https://dash-q-backend.onrender.com/api';
// const API_URL = 'http://localhost:3001/api'; // For local testing

// --- Supabase Client Setup ---
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.error("Supabase URL or Anon Key is missing!");
  // Provide a dummy client for graceful failure
  supabase = {
    auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), signInWithPassword: () => {}, signUp: () => {}, signOut: () => {} },
    channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
    removeChannel: () => Promise.resolve(),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
    storage: { from: () => ({ upload: () => {}, getPublicUrl: () => ({ data: { publicUrl: null } }) }) }
  };
}

// ##############################################
// ##          LOGIN/SIGNUP COMPONENTS         ##
// ##############################################

function AuthForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!supabase?.auth) {
            setMessage("Auth service is unavailable.");
            return;
        }
        setLoading(true);
        setMessage('');

        try {
            let error;
            if (isLogin) {
                ({ error } = await supabase.auth.signInWithPassword({ email, password }));
            } else {
                ({ error } = await supabase.auth.signUp({ email, password }));
                 if (!error) setMessage('Signup successful! Check your email for verification if enabled.');
            }
            if (error) throw error;
            // Auth listener in App component will handle session update and role check
        } catch (error) {
            console.error('Auth error:', error.message);
            setMessage(`Authentication failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card auth-card">
            <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
            <form onSubmit={handleAuth}>
                <div className="form-group">
                    <label>Email:</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Password:</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                </button>
            </form>
            {message && <p className={message.startsWith('Signup successful') ? 'message success' : 'message error'}>{message}</p>}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="toggle-auth-button">
                {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
            </button>
        </div>
    );
}

// ##############################################
// ##      BARBER-SPECIFIC COMPONENTS          ##
// ##############################################

function AvailabilityToggle({ barberProfile, session }) {
    // Uses the is_available directly from the barberProfile prop
    const isAvailable = barberProfile?.is_available || false;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleToggle = async () => {
        if (!barberProfile || !session?.user) return;
        setLoading(true);
        setError('');
        const newAvailability = !isAvailable;

        try {
            // Call backend to update status
            const response = await axios.put(`${API_URL}/barber/availability`, {
                barberId: barberProfile.id,
                isAvailable: newAvailability,
                userId: session.user.id // Send user ID for verification
            });
            // NOTE: We don't manually set state here. The BarberAppLayout's
            // checkUserRole function (or a Realtime listener if added) should update the profile prop.
            // This avoids potential state inconsistencies.
             console.log("Availability updated:", response.data);
             // Optionally trigger a profile refresh if not using Realtime for this
        } catch (err) {
            console.error("Failed to toggle availability:", err);
            setError(err.response?.data?.error || "Could not update status.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="availability-toggle">
            <p>Status: <strong>{isAvailable ? 'Available' : 'Offline'}</strong></p>
            <button onClick={handleToggle} disabled={loading} className={isAvailable ? 'go-offline-button' : 'go-online-button'}>
                {loading ? '...' : (isAvailable ? 'Go Offline' : 'Go Online')}
            </button>
             {error && <p className="error-message small">{error}</p>}
        </div>
    );
}

// Main Layout for Logged-In Barbers
function BarberAppLayout({ session, barberProfile, setBarberProfile }) {
    const [refreshSignal, setRefreshSignal] = useState(0);

    const handleLogout = async () => {
        if (!barberProfile || !session?.user || !supabase?.auth) return;
        try {
            // Attempt to set offline status first
            await axios.put(`${API_URL}/barber/availability`, {
                 barberId: barberProfile.id,
                 isAvailable: false,
                 userId: session.user.id
            });
        } catch (error) {
             console.error("Error setting offline on logout:", error);
             // Proceed with logout even if this fails
        } finally {
             // Sign out from Supabase
             await supabase.auth.signOut();
             setBarberProfile(null); // Clear profile in parent state
        }
    };

    const handleCutComplete = () => {
        setRefreshSignal(prev => prev + 1); // Trigger analytics refresh
    };

    const currentBarberId = barberProfile?.id;
    const currentBarberName = barberProfile?.full_name;

    return (
        <div className="app-layout barber-layout">
            <header className="app-header">
                <h1>Barber Dashboard</h1>
                 <div className='header-controls'>
                     {barberProfile && <AvailabilityToggle barberProfile={barberProfile} session={session} />}
                     <button onClick={handleLogout} className='logout-button'>Logout</button>
                 </div>
            </header>
            <div className="container">
                {currentBarberId ? (
                   <>
                     <BarberDashboard
                        barberId={currentBarberId}
                        barberName={currentBarberName}
                        onCutComplete={handleCutComplete}
                     />
                     <AnalyticsDashboard
                        barberId={currentBarberId}
                        refreshSignal={refreshSignal}
                      />
                   </>
                ) : (
                    // Display loading or error if profile hasn't loaded
                    <div className="card"><p>Loading barber details...</p></div>
                )}
            </div>
        </div>
    );
}


// ##############################################
// ##       CUSTOMER-SPECIFIC COMPONENTS        ##
// ##############################################

// Main Layout for Logged-In Customers
function CustomerAppLayout({ session }) {
    const handleLogout = async () => {
         if (!supabase?.auth) return;
        await supabase.auth.signOut();
    };

    return (
         <div className="app-layout customer-layout">
            <header className="app-header">
                <h1>Dash-Q Customer</h1>
                 <button onClick={handleLogout} className='logout-button'>Logout</button>
            </header>
            <div className="container">
                {/* CustomerView component handles joining and viewing the queue */}
                <CustomerView session={session} />
            </div>
        </div>
    );
}


// ##############################################
// ##      MODIFIED CHILD COMPONENTS           ##
// ##############################################

// --- CustomerView (Handles Joining Queue & Live View for Customers) ---
function CustomerView({ session }) {
   const [barbers, setBarbers] = useState([]);
   const [selectedBarber, setSelectedBarber] = useState('');
   const [customerName, setCustomerName] = useState('');
   const [customerPhone, setCustomerPhone] = useState('');
   const [customerEmail, setCustomerEmail] = useState('');
   const [message, setMessage] = useState('');

   const [myQueueEntryId, setMyQueueEntryId] = useState(null);
   const [joinedBarberId, setJoinedBarberId] = useState(null);
   const [liveQueue, setLiveQueue] = useState([]);
   const [queueMessage, setQueueMessage] = useState('');

   const [file, setFile] = useState(null);
   const [prompt, setPrompt] = useState('');
   const [generatedImage, setGeneratedImage] = useState(null);
   const [isGenerating, setIsGenerating] = useState(false);
   const [isLoading, setIsLoading] = useState(false);

   // Fetch Available Barbers
   useEffect(() => {
        const loadAvailableBarbers = async () => {
          setMessage('Loading available barbers...');
          try {
            const response = await axios.get(`${API_URL}/barbers`);
            setBarbers(response.data || []); // Ensure array
             setMessage('');
          } catch (error) { console.error('Failed to fetch available barbers:', error); setMessage('Could not load barbers.'); }
        };
        loadAvailableBarbers();
    }, []);

   // Fetch Public Queue Data
   const fetchPublicQueue = async (barberId) => {
      if (!barberId) return;
      setQueueMessage('Loading queue...');
      try {
        const response = await axios.get(`${API_URL}/queue/public/${barberId}`);
        setLiveQueue(response.data || []);
        setQueueMessage('');
      } catch (error) { console.error("Failed to fetch public queue:", error); setQueueMessage('Could not load queue.'); setLiveQueue([]); }
    };

    // Realtime and Notification Effect
   useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission(); // Ask permission
        }

        let queueChannel = null;
        if (joinedBarberId && supabase?.channel) {
            console.log(`Subscribing to queue changes for barber ID: ${joinedBarberId}`);
            queueChannel = supabase.channel(`public_queue_${joinedBarberId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `barber_id=eq.${joinedBarberId}` }, (payload) => {
                    console.log('Queue change detected!', payload);
                    fetchPublicQueue(joinedBarberId); // Refresh queue list

                    // Check for notification trigger
                    if (payload.eventType === 'UPDATE' && payload.new.id === myQueueEntryId && payload.new.status === 'Up Next') {
                        console.log('My status is Up Next! Sending notification.');
                        if (Notification.permission === "granted") {
                            new Notification("You're next at Dash-Q!", { body: "Please head over to the barbershop now." });
                        } else { alert("You're next at Dash-Q! Please head over now."); }
                    }
                })
                .subscribe((status, err) => {
                     if (status === 'SUBSCRIBED') { console.log('Subscribed to Realtime queue!'); fetchPublicQueue(joinedBarberId); } // Fetch on subscribe
                     else { console.error('Supabase Realtime subscription error:', status, err); setQueueMessage('Live updates unavailable.'); }
                });
        }
        return () => { // Cleanup
            if (queueChannel && supabase?.removeChannel) { supabase.removeChannel(queueChannel); }
        };
    }, [joinedBarberId, myQueueEntryId]); // Rerun if joinedBarberId or myQueueEntryId changes

   // AI Preview Handler
   const handleGeneratePreview = async () => {
        if (!file || !prompt) { setMessage('Please upload a photo and enter a prompt.'); return; }
        setIsGenerating(true); setIsLoading(true); setGeneratedImage(null); setMessage('Step 1/3: Uploading...');
        const filePath = `${Date.now()}.${file.name.split('.').pop()}`;

        try {
            if (!supabase?.storage) throw new Error("Supabase storage not available.");
            const { error: uploadError } = await supabase.storage.from('haircut_references').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('haircut_references').getPublicUrl(filePath);
            const imageUrl = urlData.publicUrl;

            setMessage('Step 2/3: Generating AI haircut... (takes ~15-30s)');
            const response = await axios.post(`${API_URL}/generate-haircut`, { imageUrl, prompt });
            setGeneratedImage(response.data.generatedImageUrl);
            setMessage('Step 3/3: Success! Check preview.');
        } catch (error) { console.error('AI generation pipeline error:', error); setMessage(`AI failed: ${error.response?.data?.error || error.message}`);
        } finally { setIsGenerating(false); setIsLoading(false); }
    };

    // Join Queue Handler
   const handleJoinQueue = async (e) => {
        e.preventDefault();
        if (!customerName || !selectedBarber) { setMessage('Name and Barber required.'); return; }
        setIsLoading(true); setMessage('Joining queue...');
        try {
            const response = await axios.post(`${API_URL}/queue`, {
                customer_name: customerName, customer_phone: customerPhone, customer_email: customerEmail,
                barber_id: selectedBarber, reference_image_url: generatedImage
            });
            const newEntry = response.data;
            setMyQueueEntryId(newEntry.id); setJoinedBarberId(parseInt(selectedBarber));
            const barberName = barbers.find(b => b.id === parseInt(selectedBarber))?.full_name || `Barber #${selectedBarber}`;
            setMessage(`Success! You joined for ${barberName}. See queue below.`);
            // Clear form fields
            setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setFile(null); setPrompt(''); // Keep selectedBarber for title
        } catch (error) { console.error('Failed to join queue:', error); setMessage(error.response?.data?.error || 'Failed to join.'); setMyQueueEntryId(null); setJoinedBarberId(null);
        } finally { setIsLoading(false); }
    };

    // Leave Queue Handler
   const handleLeaveQueue = () => {
       handleLeaveQueue(); // Call the correctly defined leave function
   };
   // Correctly defined leave function
   const handleLeaveQueueAction = () => {
        if (joinedBarberId && supabase?.removeChannel) { supabase.removeChannel(supabase.channel(`public_queue_${joinedBarberId}`)); }
        setMyQueueEntryId(null); setJoinedBarberId(null); setLiveQueue([]); setMessage(''); setQueueMessage(''); setSelectedBarber(''); setGeneratedImage(null); setFile(null); setPrompt('');
    };

   // Render Customer View (Form or Live Queue)
   return (
      <div className="card">
        {!myQueueEntryId ? (
           <> {/* --- JOIN FORM JSX --- */}
               <h2>Join the Queue</h2>
                <form onSubmit={handleJoinQueue}>
                  <div className="form-group"><label>Your Name:</label><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /></div>
                  <div className="form-group"><label>Your Phone (Optional):</label><input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
                  <div className="form-group"><label>Your Email (Optional, for notifications):</label><input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div>
                  <div className="form-group"><label>Select an Available Barber:</label><select value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)} required><option value="">-- Choose a barber --</option>{barbers.map((b) => (<option key={b.id} value={b.id}>{b.full_name}</option>))}</select></div>
                  <div className="ai-generator"><p className="ai-title">AI Haircut Preview (Optional)</p><div className="form-group"><label>1. Upload photo:</label><input type="file" accept="image/*" onChange={(e) => { setFile(e.target.files[0]); setGeneratedImage(null); }} /></div><div className="form-group"><label>2. Describe haircut:</label><input type="text" value={prompt} placeholder="e.g., 'buzz cut'" onChange={(e) => setPrompt(e.target.value)} /></div><button type="button" onClick={handleGeneratePreview} className="generate-button" disabled={!file || !prompt || isLoading || isGenerating}>{isGenerating ? 'Generating...' : 'Generate AI Preview'}</button>{isLoading && isGenerating && <p className='loading-text'>Generating...</p>}{generatedImage && (<div className="image-preview"><p>AI Preview:</p><img src={generatedImage} alt="AI Generated"/><p className="success-text">Like it? Join Queue!</p></div>)}</div>
                  <button type="submit" disabled={isLoading || isGenerating} className="join-queue-button">{isLoading ? 'Joining...' : 'Join Queue'}</button>
                </form>
                {message && <p className="message">{message}</p>}
           </>
        ) : (
           <div className="live-queue-view"> {/* --- LIVE QUEUE VIEW JSX --- */}
               <h2>Live Queue for {barbers.find(b => b.id === joinedBarberId)?.full_name || `Barber #${joinedBarberId}`}</h2>
               {queueMessage && <p className="message">{queueMessage}</p>}
               <ul className="queue-list live">{liveQueue.length === 0 && !queueMessage ? (<li className="empty-text">Queue is empty.</li>) : (liveQueue.map((entry, index) => (<li key={entry.id} className={`${entry.id === myQueueEntryId ? 'my-position' : ''} ${entry.status === 'Up Next' ? 'up-next-public' : ''}`}><span>{index + 1}. {entry.id === myQueueEntryId ? `You (${entry.customer_name})` : `Customer #${entry.id}`}</span><span className="queue-status">{entry.status}</span></li>)))}</ul>
               <button onClick={handleLeaveQueueAction} className='leave-queue-button'>Leave Queue / Join Another</button>
           </div>
        )}
      </div>
    );
}

// --- BarberDashboard (Handles Barber's Queue Management) ---
function BarberDashboard({ barberId, barberName, onCutComplete }) {
    const [queueDetails, setQueueDetails] = useState({ waiting: [], inProgress: null, upNext: null });
    const [error, setError] = useState('');

    const fetchQueueDetails = async () => {
        if (!barberId) return; setError('');
        try { const response = await axios.get(`${API_URL}/queue/details/${barberId}`); setQueueDetails(response.data); }
        catch (err) { console.error('Failed fetch queue details:', err); setError('Could not load queue.'); setQueueDetails({ waiting: [], inProgress: null, upNext: null }); }
    };

    useEffect(() => {
        if (!barberId || !supabase?.channel) return;
        fetchQueueDetails(); // Initial fetch
        const channel = supabase.channel(`barber_queue_${barberId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `barber_id=eq.${barberId}` }, (payload) => { fetchQueueDetails(); })
            .subscribe((status, err) => { if (status !== 'SUBSCRIBED') console.error(`Barber subscription error: ${status}`, err); });
        return () => { if (channel && supabase?.removeChannel) supabase.removeChannel(channel); };
    }, [barberId]);

    const handleNextCustomer = async () => {
        const next = queueDetails.upNext || (queueDetails.waiting.length > 0 ? queueDetails.waiting[0] : null);
        if (!next) { alert('Queue empty!'); return; }
        if (queueDetails.inProgress) { alert(`Complete ${queueDetails.inProgress.customer_name} first.`); return; }
        setError('');
        try { await axios.put(`${API_URL}/queue/next`, { queue_id: next.id, barber_id: barberId }); }
        catch (err) { console.error('Failed next customer:', err); setError(err.response?.data?.error || 'Failed call next.'); }
    };

    const handleCompleteCut = async () => {
        if (!queueDetails.inProgress) return;
        const price = prompt(`Enter price for ${queueDetails.inProgress.customer_name}:`);
        if (price === null) return; const p = parseInt(price);
        if (isNaN(p) || p < 0) { alert('Invalid price.'); return; }
        setError('');
        try { await axios.post(`${API_URL}/queue/complete`, { queue_id: queueDetails.inProgress.id, barber_id: barberId, price: p }); onCutComplete(); }
        catch (err) { console.error('Failed complete cut:', err); setError(err.response?.data?.error || 'Failed complete cut.'); }
    };

    const getActionButton = () => {
        if (queueDetails.inProgress) return <button onClick={handleCompleteCut} className="complete-button">Complete: {queueDetails.inProgress.customer_name}</button>;
        const nextPerson = queueDetails.upNext || (queueDetails.waiting.length > 0 ? queueDetails.waiting[0] : null);
        if (nextPerson) return <button onClick={handleNextCustomer} className="next-button">Call: {nextPerson.customer_name}</button>;
        return <button className="next-button disabled" disabled>Queue Empty</button>;
    };

    return ( <div className="card"><h2>My Queue ({barberName || '...'})</h2>{error && <p className="error-message">{error}</p>}{getActionButton()}<h3 className="queue-subtitle">In Chair</h3>{queueDetails.inProgress ? (<ul className="queue-list"><li className="in-progress"><strong>{queueDetails.inProgress.customer_name}</strong>{queueDetails.inProgress.reference_image_url && (<a href={queueDetails.inProgress.reference_image_url} target="_blank" rel="noopener noreferrer" className="photo-link">Ref Photo</a>)}</li></ul>) : (<p className="empty-text">Chair empty</p>)}<h3 className="queue-subtitle">Up Next</h3>{queueDetails.upNext ? (<ul className="queue-list"><li className="up-next"><strong>{queueDetails.upNext.customer_name}</strong>{queueDetails.upNext.reference_image_url && (<a href={queueDetails.upNext.reference_image_url} target="_blank" rel="noopener noreferrer" className="photo-link">Ref Photo</a>)}</li></ul>) : (<p className="empty-text">Nobody Up Next</p>)}<h3 className="queue-subtitle">Waiting</h3><ul className="queue-list">{queueDetails.waiting.length === 0 ? (<li className="empty-text">Waiting queue empty.</li>) : (queueDetails.waiting.map(c => (<li key={c.id}>{c.customer_name}{c.reference_image_url && (<a href={c.reference_image_url} target="_blank" rel="noopener noreferrer" className="photo-link">Ref Photo</a>)}</li>)))}</ul><button onClick={fetchQueueDetails} className="refresh-button small">Refresh Queue</button></div> );
}

// --- AnalyticsDashboard (Displays Barber Stats) ---
function AnalyticsDashboard({ barberId, refreshSignal }) {
   const [analytics, setAnalytics] = useState({ totalEarningsToday: 0, totalCutsToday: 0, totalEarningsWeek: 0, totalCutsWeek: 0, dailyData: [], busiestDay: { name: 'N/A', earnings: 0 }, currentQueueSize: 0 });
   const [error, setError] = useState('');

   const fetchAnalytics = async () => {
      if (!barberId) return; setError('');
      try { const response = await axios.get(`${API_URL}/analytics/${barberId}`); setAnalytics({ dailyData: [], busiestDay: { name: 'N/A', earnings: 0 }, ...response.data }); }
      catch (err) { console.error('Failed fetch analytics:', err); setError('Could not load analytics.'); setAnalytics({ totalEarningsToday: 0, totalCutsToday: 0, totalEarningsWeek: 0, totalCutsWeek: 0, dailyData: [], busiestDay: { name: 'N/A', earnings: 0 }, currentQueueSize: 0 }); }
    };

    useEffect(() => { fetchAnalytics(); }, [refreshSignal, barberId]);

    const avgPriceToday = (analytics.totalCutsToday ?? 0) > 0 ? ((analytics.totalEarningsToday ?? 0) / analytics.totalCutsToday).toFixed(2) : '0.00';
    const avgPriceWeek = (analytics.totalCutsWeek ?? 0) > 0 ? ((analytics.totalEarningsWeek ?? 0) / analytics.totalCutsWeek).toFixed(2) : '0.00';

    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Earnings per Day (Last 7 Days)' } }, scales: { y: { beginAtZero: true } } };
    const dailyDataSafe = Array.isArray(analytics.dailyData) ? analytics.dailyData : [];
    const chartData = { labels: dailyDataSafe.map(d => { try { return new Date(d.day + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }); } catch (e) { return '?'; } }), datasets: [{ label: 'Daily Earnings ($)', data: dailyDataSafe.map(d => d.daily_earnings ?? 0), backgroundColor: 'rgba(52, 199, 89, 0.6)', borderColor: 'rgba(52, 199, 89, 1)', borderWidth: 1 }] };

    return ( <div className="card analytics-card"><h2>Dashboard</h2>{error && <p className="error-message">{error}</p>}<h3 className="analytics-subtitle">Today</h3><div className="analytics-grid"><div className="analytics-item"><span className="analytics-label">Earnings</span><span className="analytics-value">${analytics.totalEarningsToday ?? 0}</span></div><div className="analytics-item"><span className="analytics-label">Cuts</span><span className="analytics-value">{analytics.totalCutsToday ?? 0}</span></div><div className="analytics-item"><span className="analytics-label">Avg Price</span><span className="analytics-value small">${avgPriceToday}</span></div><div className="analytics-item"><span className="analytics-label">Queue Size</span><span className="analytics-value small">{analytics.currentQueueSize ?? 0}</span></div></div><h3 className="analytics-subtitle">Last 7 Days</h3><div className="analytics-grid"><div className="analytics-item"><span className="analytics-label">Total Earnings</span><span className="analytics-value">${analytics.totalEarningsWeek ?? 0}</span></div><div className="analytics-item"><span className="analytics-label">Total Cuts</span><span className="analytics-value">{analytics.totalCutsWeek ?? 0}</span></div><div className="analytics-item"><span className="analytics-label">Avg Price</span><span className="analytics-value small">${avgPriceWeek}</span></div><div className="analytics-item"><span className="analytics-label">Busiest Day</span><span className="analytics-value small">{analytics.busiestDay?.name ?? 'N/A'} (${analytics.busiestDay?.earnings ?? 0})</span></div></div><div className="chart-container">{dailyDataSafe.length > 0 ? (<div style={{ height: '250px' }}><Bar options={chartOptions} data={chartData} /></div>) : (<p className='empty-text'>No chart data yet.</p>)}</div><button onClick={fetchAnalytics} className="refresh-button">Refresh Stats</button></div> );
}


// ##############################################
// ##           MAIN APP COMPONENT             ##
// ##############################################
function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null); // null = loading, 'customer', 'barber'
  const [barberProfile, setBarberProfile] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // --- Check Session and Role ---
  useEffect(() => {
    if (!supabase?.auth) { setLoadingRole(false); return; } // Handle missing Supabase

    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      checkUserRole(currentSession?.user);
    }).catch(err => { console.error("Error getting session:", err); setLoadingRole(false); });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      // Reset state before re-checking role on auth change
      setUserRole(null); setBarberProfile(null); setLoadingRole(true);
      checkUserRole(currentSession?.user);
    });

    // 3. Cleanup
    return () => subscription?.unsubscribe();
  }, []); // Run only once

  // --- Helper to Check Role ---
  const checkUserRole = async (user) => {
     if (!user || !supabase?.from) { setUserRole('customer'); setBarberProfile(null); setLoadingRole(false); return; }
     setLoadingRole(true); // Start loading indicator
     try {
         // Use backend endpoint to get profile based on user_id
         const response = await axios.get(`${API_URL}/barber/profile/${user.id}`);
         // If successful (status 200 and data exists), user is a barber
         setUserRole('barber');
         setBarberProfile(response.data);
         console.log("User is a barber:", response.data);
         // Ensure barber is marked available on login/refresh if they have a profile
         if (!response.data.is_available) {
              updateAvailability(response.data.id, user.id, true); // Mark available
         }
     } catch(error) {
         if (error.response && error.response.status === 404) {
             // Backend confirmed: No barber profile found for this user
             setUserRole('customer');
             setBarberProfile(null);
             console.log("User is a customer (profile not found)");
         } else {
             // Other error (network, server error fetching profile)
             console.error("Error checking/fetching barber profile via backend:", error);
             setUserRole('customer'); // Default to customer on error
             setBarberProfile(null);
         }
     } finally {
         setLoadingRole(false); // Finished check
     }
  };

   // Helper to update availability (e.g., on login)
   const updateAvailability = async (barberId, userId, isAvailable) => {
       if (!barberId || !userId) return;
       try { await axios.put(`${API_URL}/barber/availability`, { barberId, userId, isAvailable }); }
       catch (error) { console.error("Failed to auto-update availability:", error); }
   };


  // --- Render based on state ---
  if (loadingRole) {
      return <div className="loading-fullscreen">Checking Session...</div>;
  }

  if (!session) {
    return <AuthForm />; // Show login/signup if no session
  } else if (userRole === 'barber') {
    // Pass setBarberProfile down to allow logout to clear it
    return <BarberAppLayout session={session} barberProfile={barberProfile} setBarberProfile={setBarberProfile} />;
  } else { // userRole is 'customer' or null (treat null as customer after loading)
    return <CustomerAppLayout session={session} />;
  }
}

export default App;