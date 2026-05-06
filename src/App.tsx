import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode') 
  
  const [providerId, setProviderId] = useState(params.get('provider') || '')
  const [carId, setCarId] = useState(params.get('car') || '')
  const [userName, setUserName] = useState(localStorage.getItem('tg_user_name') || '')
  const [screen, setScreen] = useState('tap')
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [history, setHistory] = useState<any[]>([]) 
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Meter states
  const [secondsActive, setSecondsActive] = useState(0)
  const PPU_RATE = 0.45 // £0.45 per minute for testing

  const cleanText = (txt: string) => txt ? decodeURIComponent(txt).replace(/_/g, ' ') : ''

  // Run the live meter timer
  useEffect(() => {
    let interval: any
    if (screen === 'trip') {
      interval = setInterval(() => {
        setSecondsActive((s) => s + 1)
      }, 1000)
    } else {
      setSecondsActive(0)
    }
    return () => clearInterval(interval)
  }, [screen])

  useEffect(() => {
    // --- DYNAMIC TITLES ---
    if (mode === 'setup') {
      document.title = "Fleet Setup"
    } else if (mode === 'history') {
      document.title = `${cleanText(params.get('provider') || 'Fleet')} Ledger`
    } else {
      document.title = `${cleanText(params.get('car') || 'Car')} Log`
    }

    if (localStorage.getItem('tg_trip_active') === 'true') setScreen('trip')
    
    if (mode === 'history') {
      fetchHistory()
    } else if (userName && carId) {
      checkAgreementStatus()
    } else {
      setIsLoading(false)
    }
  }, [userName, carId, mode])

  async function checkAgreementStatus() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('pilot_agreements')
      .select('*')
      .eq('user_name', userName)
      .eq('car_id', carId)
    
    if (!error && data && data.length > 0) {
      setHasAcceptedAgreement(true)
    }
    setIsLoading(false)
  }

  async function recordAgreement() {
    setIsSubmitting(true)
    const { error } = await supabase.from('pilot_agreements').insert([{ 
      user_name: userName, 
      car_id: carId, 
      provider_id: providerId || 'Independent'
    }])
    
    if (!error) {
      setHasAcceptedAgreement(true)
    }
    setIsSubmitting(false)
  }

  async function fetchHistory() {
    setIsLoading(true)
    const activeProvider = params.get('provider')
    
    let query = supabase.from('pilot_submissions').select('*').order('created_at', { ascending: false }).limit(30)
    
    // Use ilike for case-insensitive matching
    if (activeProvider) {
      query = query.ilike('provider_id', decodeURIComponent(activeProvider))
    }
    
    const { data, error } = await query
    if (error) {
      console.error("Error fetching history:", error)
    } else {
      setHistory(data || [])
    }
    setIsLoading(false)
  }

async function recordEvent(actionType: string) {
    setIsSubmitting(true);
    const finalProvider = cleanText(params.get('provider') || providerId || 'Independent');
    const finalCar = cleanText(params.get('car') || carId || 'Unknown_Car');
    
    const { error } = await supabase.from('pilot_submissions').insert([{ 
      user_name: userName || 'Anonymous', 
      car_id: finalCar, 
      provider_id: finalProvider, 
      action: actionType 
      // Notice: public_id is completely gone from here now
    }]);

    if (error) {
      console.error("Submission Error Details:", error);
      alert("Error saving data: " + JSON.stringify(error));
    } else {
      if (actionType === 'trip_started') {
        localStorage.setItem('tg_trip_active', 'true');
      } else {
        localStorage.removeItem('tg_trip_active');
        await simulateSandboxPayment();
      }
      setScreen(actionType === 'trip_started' ? 'trip' : 'ended');
    }
    setIsSubmitting(false);
  }

  if (isLoading) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading Fleet Data...</div>
  }

  // --- VIEW: HISTORY ---
  if (mode === 'history') {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Fleet Ledger</h2>
        {history.map((item) => (
          <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <strong>{item.user_name}</strong> {item.action === 'trip_started' ? '🟢 Started' : '🔴 Ended'} trip on {item.car_id}
            <div style={{ fontSize: '12px', color: '#888' }}>{new Date(item.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    )
  }

  // --- VIEW: SETUP TOOL ---
  if (mode === 'setup') {
    const generatedUrl = `${window.location.origin}/?provider=${providerId.replace(/\s+/g, '_')}&car=${carId.replace(/\s+/g, '_')}`
    return (
      <div style={{ padding: '40px 20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
        <h1>🛠 Transport Group Setup</h1>
        <label>Provider Name</label>
        <input style={{ width: '100%', padding: '15px', marginBottom: '20px' }} value={providerId} onChange={(e) => setProviderId(e.target.value)} />
        <label>Vehicle Registration</label>
        <input style={{ width: '100%', padding: '15px', marginBottom: '20px' }} value={carId} onChange={(e) => setCarId(e.target.value)} />
        <h3>Your Unique Tag URL:</h3>
        <div style={{ background: '#eee', padding: '15px', wordBreak: 'break-all', borderRadius: '8px' }}>{generatedUrl}</div>
      </div>
    )
  }

  // --- VIEW: DRIVER MODE ---
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3' }}>{cleanText(params.get('provider') || providerId)}</h1>
      <p>Vehicle: <strong>{cleanText(params.get('car') || carId)}</strong></p>

      {/* 1. NAME ENTRY */}
      {!userName && (
        <div style={{ marginTop: '20px' }}>
          <input 
            style={{ padding: '20px', width: '100%', borderRadius: '12px', border: '1px solid #ccc', fontSize: '18px' }}
            placeholder="Enter Your Name"
            onBlur={(e) => {
              setUserName(e.target.value)
              localStorage.setItem('tg_user_name', e.target.value)
            }} 
          />
          <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>Enter your name to join this Transport Group.</p>
        </div>
      )}

      {/* 2. AGREEMENT SCREEN */}
      {userName && !hasAcceptedAgreement && (
        <div style={{ textAlign: 'left', background: '#f9f9f9', padding: '20px', borderRadius: '15px', border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0 }}>Core Driver Agreement</h3>
          <p style={{ fontSize: '14px' }}>Welcome <strong>{userName}</strong>. Before driving, please agree to the following:</p>
          <ul style={{ fontSize: '13px', paddingLeft: '20px' }}>
            <li><strong>PPU & Pot:</strong> I agree that part of my fee goes to the repair pot.</li>
            <li><strong>£4k Cap:</strong> Shared costs are capped at £4,000 per year.</li>
            <li><strong>Shortfall:</strong> I agree to share the cost of emergency repairs if the pot is empty.</li>
          </ul>
          <button 
            disabled={isSubmitting}
            onClick={recordAgreement}
            style={{ width: '100%', padding: '15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>
            {isSubmitting ? 'Joining...' : 'I AGREE & JOIN'}
          </button>
        </div>
      )}

      {/* 3. TRIP LOGGING */}
      {userName && hasAcceptedAgreement && (
        <div style={{ marginTop: '30px' }}>
          {screen === 'tap' && (
            <button disabled={isSubmitting} onClick={() => recordEvent('trip_started')}
              style={{ width: '100%', padding: '30px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '24px' }}>
              START TRIP
            </button>
          )}

          {screen === 'trip' && (
            <div style={{ padding: '30px', borderRadius: '20px', border: '3px solid #0070f3', backgroundColor: '#f0f7ff' }}>
              <h2 style={{ color: '#0070f3', margin: '0' }}>Trip Active</h2>
              <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '20px 0' }}>
                £{((secondsActive / 60) * PPU_RATE).toFixed(2)}
              </div>
              <p style={{ color: '#666' }}>Time: {Math.floor(secondsActive / 60)}m {secondsActive % 60}s</p>
              
              <button disabled={isSubmitting} onClick={() => recordEvent('trip_ended')} 
                style={{ width: '100%', padding: '30px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '20px', boxShadow: '0 4px 14px 0 rgba(255,77,79,0.39)' }}>
                END TRIP
              </button>
            </div>
          )}

          {screen === 'ended' && (
            <div>
              <h2 style={{ color: '#28a745' }}>Trip Saved! ✅</h2>
              <button onClick={() => setScreen('tap')} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #0070f3', background: '#fff', color: '#0070f3' }}>New Trip</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
