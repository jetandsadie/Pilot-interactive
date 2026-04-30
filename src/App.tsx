import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const params = new URLSearchParams(window.location.search)
  
  const isSetupMode = params.get('mode') === 'setup'
  
  const [providerId, setProviderId] = useState(params.get('provider') || '')
  const [carId, setCarId] = useState(params.get('car') || '')
  const [screen, setScreen] = useState('tap')
  const [userName, setUserName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('tg_user_name')
    if (savedName) setUserName(savedName)
  }, [])

  async function recordEvent(actionType: string) {
    setIsSubmitting(true)
    const { error } = await supabase
      .from('pilot_submissions') 
      .insert([{ 
          user_name: userName, 
          car_id: carId || 'Unknown_Car', 
          provider_id: providerId || 'Independent',
          action: actionType
        }])

    if (error) {
      alert("Error: " + error.message)
    } else {
      setScreen(actionType === 'trip_started' ? 'trip' : 'ended')
    }
    setIsSubmitting(false)
  }

  if (isSetupMode) {
    // We clean the URL to replace spaces with underscores for better stability
    const cleanProvider = providerId.trim().replace(/\s+/g, '_') || 'Owner'
    const cleanCar = carId.trim().replace(/\s+/g, '_') || 'Registration'
    const generatedUrl = `${window.location.origin}/?provider=${cleanProvider}&car=${cleanCar}`
    
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', color: '#333' }}>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>🛠 Tag Setup Tool</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>Enter your details to generate the link for your NFC tag or QR code.</p>
        
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Name of Owner</label>
          <input 
            style={{ width: '100%', padding: '12px', marginBottom: '20px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }}
            value={providerId} 
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="e.g. Southside Co-op"
          />

          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Car Registration</label>
          <input 
            style={{ width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }}
            value={carId} 
            onChange={(e) => setCarId(e.target.value)}
            placeholder="e.g. AB12 CDE"
          />
        </div>

        <h3 style={{ marginBottom: '10px' }}>🔗 Your Unique Tag URL:</h3>
        <div style={{ 
          background: '#e7f3ff', 
          padding: '15px', 
          wordBreak: 'break-all', 
          borderRadius: '8px', 
          border: '2px dashed #0070f3', 
          fontSize: '15px',
          color: '#004aab', // Dark blue text for readability
          fontWeight: '500'
        }}>
          {generatedUrl}
        </div>

        <p style={{ fontSize: '13px', color: '#555', marginTop: '15px', fontStyle: 'italic' }}>
          Copy the link above. Use a mobile app like <strong>NFC Tools</strong> to "Write" this URL to your vehicle's tag.
        </p>

        <hr style={{ margin: '40px 0', opacity: 0.3 }} />
        <h3 style={{ color: '#888', textAlign: 'center', fontSize: '14px', textTransform: 'uppercase' }}>Preview of Driver's Phone</h3>
        <div style={{ border: '8px solid #222', borderRadius: '30px', padding: '10px', background: 'white', maxWidth: '300px', margin: '0 auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
             <div style={{ textAlign: 'center', padding: '20px' }}>
                <h2 style={{ color: '#0070f3', margin: '0 0 5px 0' }}>{providerId || 'Owner Name'}</h2>
                <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Vehicle: <strong>{carId || 'Registration'}</strong></p>
                <div style={{ height: '40px', background: '#f0f0f0', borderRadius: '5px', margin: '20px 0 10px 0', border: '1px solid #eee' }}></div>
                <div style={{ height: '45px', background: '#0070f3', borderRadius: '5px', color: 'white', lineHeight: '45px', fontWeight: 'bold', fontSize: '14px' }}>START TRIP</div>
             </div>
        </div>
      </div>
    )
  }

  // --- DRIVER LOGGING VIEW ---
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3', marginBottom: '5px' }}>{providerId.replace(/_/g, ' ') || 'Independent'}</h1>
      <p style={{ marginTop: '0', color: '#666' }}>Vehicle: <strong>{carId.replace(/_/g, ' ') || 'V001'}</strong></p>

      {screen === 'tap' && (
        <div style={{ marginTop: '30px' }}>
          <input 
            style={{ padding: '15px', width: '100%', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }}
            value={userName} 
            onChange={(e) => {
              setUserName(e.target.value)
              localStorage.setItem('tg_user_name', e.target.value)
            }} 
            placeholder="Your Name"
          />
          <button 
            disabled={!userName || isSubmitting}
            onClick={() => recordEvent('trip_started')}
            style={{ width: '100%', padding: '18px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', transition: '0.2s' }}
          >
            {isSubmitting ? 'Recording...' : 'Start Trip'}
          </button>
        </div>
      )}

      {screen === 'trip' && (
        <div style={{ backgroundColor: '#f0f7ff', padding: '30px', borderRadius: '15px', border: '2px solid #0070f3', marginTop: '20px' }}>
          <h2 style={{ color: '#0070f3', marginTop: '0' }}>Trip Active</h2>
          <p>Drive safely, {userName}!</p>
          <button 
            disabled={isSubmitting}
            onClick={() => recordEvent('trip_ended')} 
            style={{ width: '100%', padding: '18px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
          >
            End Trip
          </button>
        </div>
      )}

      {screen === 'ended' && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ color: '#28a745' }}>✅ Trip Recorded</h2>
          <p>The ledger has been updated for {providerId.replace(/_/g, ' ')}.</p>
          <button 
            onClick={() => setScreen('tap')} 
            style={{ marginTop: '20px', padding: '12px 24px', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer', background: 'white' }}
          >
            New Trip
          </button>
        </div>
      )}
    </div>
  )
}
