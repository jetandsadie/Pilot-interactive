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
  const [tripCount, setTripCount] = useState(0) // New: State to store total trips
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('tg_user_name')
    if (savedName) setUserName(savedName)
    fetchTripCount() // Load count on first open
  }, [carId])

  // New: Function to count rows for this car
  async function fetchTripCount() {
    if (!carId) return
    const { count, error } = await supabase
      .from('pilot_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('car_id', carId)
      .eq('action', 'trip_started') // We count "Starts" to represent total trips

    if (!error && count !== null) {
      setTripCount(count)
    }
  }

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
      await fetchTripCount() // Update the counter immediately after a new trip
      setScreen(actionType === 'trip_started' ? 'trip' : 'ended')
    }
    setIsSubmitting(false)
  }

  if (isSetupMode) {
    const cleanProvider = providerId.trim().replace(/\s+/g, '_') || 'Owner'
    const cleanCar = carId.trim().replace(/\s+/g, '_') || 'Registration'
    const generatedUrl = `${window.location.origin}/?provider=${cleanProvider}&car=${cleanCar}`
    
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', color: '#333' }}>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>🛠 Tag Setup Tool</h2>
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Name of Owner</label>
          <input style={{ width: '100%', padding: '12px', marginBottom: '20px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }}
            value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="e.g. Southside Co-op" />
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Car Registration</label>
          <input style={{ width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }}
            value={carId} onChange={(e) => setCarId(e.target.value)} placeholder="e.g. AB12 CDE" />
        </div>
        <h3>🔗 Your Unique Tag URL:</h3>
        <div style={{ background: '#e7f3ff', padding: '15px', wordBreak: 'break-all', borderRadius: '8px', border: '2px dashed #0070f3', fontSize: '15px', color: '#004aab', fontWeight: '500' }}>
          {generatedUrl}
        </div>
      </div>
    )
  }

  // --- DRIVER LOGGING VIEW ---
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3', marginBottom: '5px' }}>{providerId.replace(/_/g, ' ') || 'Independent'}</h1>
      <p style={{ marginTop: '0', color: '#666' }}>Vehicle: <strong>{carId.replace(/_/g, ' ') || 'V001'}</strong></p>
      
      {/* NEW: Trip Counter UI */}
      <div style={{ margin: '20px 0', fontSize: '14px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>
        Total Fleet Trips: <span style={{ color: '#0070f3', fontSize: '18px' }}>{tripCount}</span>
      </div>

      {screen === 'tap' && (
        <div style={{ marginTop: '10px' }}>
          <input style={{ padding: '15px', width: '100%', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }}
            value={userName} onChange={(e) => { setUserName(e.target.value); localStorage.setItem('tg_user_name', e.target.value); }} placeholder="Your Name" />
          <button disabled={!userName || isSubmitting} onClick={() => recordEvent('trip_started')}
            style={{ width: '100%', padding: '18px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px' }}>
            {isSubmitting ? 'Recording...' : 'Start Trip'}
          </button>
        </div>
      )}

      {screen === 'trip' && (
        <div style={{ backgroundColor: '#f0f7ff', padding: '30px', borderRadius: '15px', border: '2px solid #0070f3', marginTop: '20px' }}>
          <h2 style={{ color: '#0070f3', marginTop: '0' }}>Trip Active</h2>
          <button disabled={isSubmitting} onClick={() => recordEvent('trip_ended')} 
            style={{ width: '100%', padding: '18px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px' }}>
            End Trip
          </button>
        </div>
      )}

      {screen === 'ended' && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ color: '#28a745' }}>✅ Trip Recorded</h2>
          <button onClick={() => setScreen('tap')} style={{ marginTop: '20px', padding: '12px 24px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}>
            New Trip
          </button>
        </div>
      )}
    </div>
  )
}
