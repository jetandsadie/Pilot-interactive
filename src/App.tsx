import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Connect to Supabase using the variables you set in Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const params = new URLSearchParams(window.location.search)
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
    
    // This pushes the data to your "Pilot Submissions" table
    const { error } = await supabase
      .from('Pilot Submissions')
      .insert([{ 
          user_name: userName, 
          car_id: carId, 
          action: actionType,
          timestamp: new Date().toISOString()
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
      <h1 style={{ color: '#333' }}>Transport Group</h1>
      <p style={{ color: '#666' }}>Vehicle: <strong>{carId}</strong></p>
      <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />

      {screen === 'tap' && (
        <div>
          <p>Please enter your name to begin:</p>
          <input 
            style={{ padding: '12px', width: '100%', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
            value={userName} 
            onChange={(e) => {
              setUserName(e.target.value)
              localStorage.setItem('tg_user_name', e.target.value)
            }} 
            placeholder="e.g. John Smith"
          />
          <button 
            disabled={!userName || isSubmitting}
            onClick={() => recordEvent('trip_started')}
            style={{ width: '100%', padding: '15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isSubmitting ? 'Communicating with Ledger...' : 'Start Trip'}
          </button>
        </div>
      )}

      {screen === 'trip' && (
        <div style={{ backgroundColor: '#f0f7ff', padding: '30px', borderRadius: '12px' }}>
          <h2 style={{ color: '#0070f3' }}>Trip Active</h2>
          <p>The shared cost is being calculated based on your usage.</p>
          <button 
            disabled={isSubmitting}
            onClick={() => recordEvent('trip_ended')} 
            style={{ width: '100%', padding: '15px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' }}
          >
            {isSubmitting ? 'Ending...' : 'End Trip (Tap-Out)'}
          </button>
        </div>
      )}

      {screen === 'ended' && (
        <div>
          <div style={{ fontSize: '50px' }}>✅</div>
          <h2>Trip Recorded</h2>
          <p>Thank you, {userName}. Your share has been recorded in the group ledger.</p>
          <button 
            onClick={() => setScreen('tap')} 
            style={{ marginTop: '20px', background: 'none', border: '1px solid #ccc', padding: '10px 20px', borderRadius: '5px' }}
          >
            New Trip
          </button>
        </div>
      )}
    </div>
  )
}
