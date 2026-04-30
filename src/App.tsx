import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const params = new URLSearchParams(window.location.search)
  // New: Capture the Provider ID from the URL, default to 'unknown'
  const providerId = params.get('provider') || 'unknown'
  const carId = params.get('car') || 'V001'

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
          provider_id: providerId, // New: Stamp the data with the provider
          action: actionType
        }])

    if (error) {
      alert("Database Error: " + error.message)
    } else {
      setScreen(actionType === 'trip_started' ? 'trip' : 'ended')
    }
    setIsSubmitting(false)
  }

  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3' }}>{providerId.replace('_', ' ')}</h1>
      <p>Vehicle: <strong>{carId}</strong></p>

      {screen === 'tap' && (
        <div>
          <input 
            style={{ padding: '12px', width: '100%', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
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
          <p>Thank you for using {providerId}.</p>
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
