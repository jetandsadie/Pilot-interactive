import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const isSetupMode = params.get('mode') === 'setup'
  
  // State Management
  const [providerId, setProviderId] = useState(params.get('provider') || '')
  const [carId, setCarId] = useState(params.get('car') || '')
  const [screen, setScreen] = useState('tap')
  const [userName, setUserName] = useState('')
  const [tripCount, setTripCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Block 2: Load saved data and check for active session on startup
  useEffect(() => {
    const savedName = localStorage.getItem('tg_user_name')
    if (savedName) setUserName(savedName)

    const tripActive = localStorage.getItem('tg_trip_active')
    if (tripActive === 'true') {
      setScreen('trip')
    }

    fetchTripCount()
  }, [carId])

  // Block 1: Fetch total trips for this specific car
  async function fetchTripCount() {
    const currentParams = new URLSearchParams(window.location.search)
    const activeCar = currentParams.get('car') || carId
    
    if (!activeCar) return

    const { count, error } = await supabase
      .from('pilot_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('car_id', activeCar)
      .eq('action', 'trip_started')

    if (!error && count !== null) {
      setTripCount(count)
    }
  }

  // The main function to save data
  async function recordEvent(actionType: string) {
    setIsSubmitting(true)
    
    // CRITICAL: Re-read the URL params right now to prevent "unknown_car"
    const currentParams = new URLSearchParams(window.location.search)
    const finalProvider = currentParams.get('provider') || providerId || 'Independent'
    const finalCar = currentParams.get('car') || carId || 'Unknown_Car'

    const { error } = await supabase
      .from('pilot_submissions') 
      .insert([{ 
          user_name: userName || 'Anonymous', 
          car_id: finalCar, 
          provider_id: finalProvider,
          action: actionType
        }])

    if (error) {
      alert("Database Error: " + error.message)
    } else {
      // Memory: Save or Clear the active session
      if (actionType === 'trip_started') {
        localStorage.setItem('tg_trip_active', 'true')
      } else {
        localStorage.removeItem('tg_trip_active')
      }

      await fetchTripCount()
      setScreen(actionType === 'trip_started' ? 'trip' : 'ended')
    }
    setIsSubmitting(false)
  }

  // --- VIEW: PROVIDER SETUP TOOL ---
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
        <div style={{ background: '#e7f3ff', padding: '15px', wordBreak: 'break-all', borderRadius: '8px', border: '2px dashed #0070f3', fontSize: '15px', color: '#004aab', fontWeight: 'bold' }}>
          {generatedUrl}
        </div>
        <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>Copy this into your NFC writing app.</p>
      </div>
    )
  }

  // --- VIEW: DRIVER APP ---
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3', marginBottom: '5px' }}>{(params.get('provider') || providerId || 'Independent').replace(/_/g, ' ')}</h1>
      <p style={{ marginTop: '0', color: '#666' }}>Vehicle: <strong>{(params.get('car') || carId || 'V001').replace(/_/g, ' ')}</strong></p>
      
      <div style={{ margin: '20px 0', padding: '10px', background: '#f4f4f4', borderRadius: '8px' }}>
        <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>FLEET ACTIVITY</span>
        <strong>{tripCount} Trips Logged</strong>
      </div>

      {screen === 'tap' && (
        <div style={{ marginTop: '20px' }}>
          <input style={{ padding: '15px', width: '100%', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }}
            value={userName} onChange={(e) => { setUserName(e.target.value); localStorage.setItem('tg_user_name', e.target.value); }} placeholder="Your Name" />
          <button disabled={!userName || isSubmitting} onClick={() => recordEvent('trip_started')}
            style={{ width: '100%', padding: '18px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
            {isSubmitting ? 'Syncing...' : 'Start Trip'}
          </button>
        </div>
      )}

      {screen === 'trip' && (
        <div style={{ backgroundColor: '#f0f7ff', padding: '30px', borderRadius: '15px', border: '2px solid #0
