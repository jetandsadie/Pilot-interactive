import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const params = new URLSearchParams(window.location.search)
  
  // Logic to determine if we are in "Setup Mode" or "Driver Mode"
  const isSetupMode = params.get('mode') === 'setup'
  
  const [providerId, setProviderId] = useState(params.get('provider') || 'unknown')
  const [carId, setCarId] = useState(params.get('car') || 'V001')
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
          car_id: carId, 
          provider_id: providerId,
          action: actionType
        }])

    if (error) {
      alert("Error: " + error.message)
    } else {
      setScreen(actionType === 'trip_started' ? 'trip' : 'ended')
    }
    setIsSubmitting(false)
  }

  // --- VIEW 1: THE SETUP/PROVISIONING TOOL ---
  if (isSetupMode) {
    const generatedUrl = `${window.location.origin}/?provider=${providerId.replace(/\s+/g, '_')}&car=${carId.replace(/\s+/g, '_')}`
    
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
        <h2>🛠 Provider Setup Tool</h2>
        <p style={{ color: '#666' }}>Configure your vehicle's NFC tag or QR code here.</p>
        
        <div style={{ background: '#f4f4f4', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Provider Name</label>
          <input 
            style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }}
            value={providerId} 
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="e.g. London_Car_Club"
          />

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Vehicle ID</label>
          <input 
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
            value={carId} 
            onChange={(e) => setCarId(e.target.value)}
            placeholder="e.g. V001"
          />
        </div>

        <h3>🔗 Your Tag URL:</h3>
        <div style={{ background: '#eef', padding: '15px', wordBreak: 'break-all', borderRadius: '5px', border: '1px dashed #0070f3', fontSize: '14px' }}>
          {generatedUrl}
        </div>

        <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          Copy this URL and write it to your NFC tag using an app like "NFC Tools".
        </p>

        <hr style={{ margin: '30px 0' }} />
        <h3>📱 Driver Preview:</h3>
        <div style={{ border: '4px solid #333', borderRadius: '20px', padding: '10px' }}>
             {/* Simple visual preview of the driver's screen */}
             <div style={{ textAlign: 'center', padding: '20px' }}>
                <h2 style={{ color: '#0070f3' }}>{providerId}</h2>
                <p>Vehicle: {carId}</p>
                <div style={{ height: '40px', background: '#eee', borderRadius: '5px', margin: '10px 0' }}></div>
                <div style={{ height: '45px', background: '#0070f3', borderRadius: '5px' }}></div>
             </div>
        </div>
      </div>
    )
  }

  // --- VIEW 2: THE DRIVER LOGGING APP (Standard View) ---
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3' }}>{providerId.replace(/_/g, ' ')}</h1>
      <p>Vehicle: <strong>{carId}</strong></p>

      {screen === 'tap' && (
        <div>
          <input 
            style={{ padding: '12px', width: '100%', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }}
            value={userName} 
            onChange={(e) => {
              setUserName(e.target.value)
              localStorage.setItem('tg_user_name', e.target.value)
            }} 
            placeholder="Driver Name"
          />
          <button 
            disabled={!userName || isSubmitting}
            onClick={() => recordEvent('trip_started')}
            style={{ width: '100%', padding: '15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px' }}
          >
            {isSubmitting ? 'Syncing...' : 'Start Trip'}
          </button>
        </div>
      )}

      {screen === 'trip' && (
        <div style={{ backgroundColor: '#f0f7ff', padding: '30px', borderRadius: '12px', border: '2px solid #0070f3' }}>
          <h2 style={{ color: '#0070f3' }}>Trip Active</h2>
          <p>Drive safely, {userName}!</p>
          <button 
            disabled={isSubmitting}
            onClick={() => recordEvent('trip_ended')} 
            style={{ width: '100%', padding: '15px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px' }}
          >
            End Trip
          </button>
        </div>
      )}

      {screen === 'ended' && (
        <div>
          <h2 style={{ color: '#28a745' }}>✅ Trip Recorded</h2>
          <p>Thank you for using {providerId.replace(/_/g, ' ')}.</p>
          <button 
            onClick={() => setScreen('tap')} 
            style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer' }}
          >
            New Trip
          </button>
        </div>
      )}
    </div>
  )
}
