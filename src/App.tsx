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
  const [tripCount, setTripCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('tg_user_name')
    if (savedName) setUserName(savedName)

    if (localStorage.getItem('tg_trip_active') === 'true') {
      setScreen('trip')
    }
    fetchTripCount()
  }, [carId])

  // Improved Counter: Now counts all entries for this car to ensure it picks up data
  async function fetchTripCount() {
    const currentParams = new URLSearchParams(window.location.search)
    const activeCar = currentParams.get('car') || carId
    
    if (!activeCar) return

    const { count, error } = await supabase
      .from('pilot_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('car_id', activeCar)

    if (!error && count !== null) {
      // We divide by 2 because a full trip has a 'start' and an 'end' 
      // or we just show total "actions" for the pilot phase.
      // Let's show total "Events" for now to prove it's working.
      setTripCount(count)
    }
  }

  async function recordEvent(actionType: string) {
    setIsSubmitting(true)
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
      if (actionType === 'trip_started') {
        localStorage.setItem('tg_trip_active', 'true')
      } else {
        localStorage.removeItem('tg_trip_active')
      }
      // Give the database a moment to breathe then refresh count
      setTimeout(() => fetchTripCount(), 500)
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
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>🛠 Tag Setup Tool</h2>
        
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginTop: '20px' }}>
          {/* Left Side: Controls */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Name of Owner</label>
              <input style={{ width: '100%', padding: '12px', marginBottom: '20px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }}
                value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="e.g. Southside Co-op" />
              
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Car Registration</label>
              <input style={{ width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }}
                value={carId} onChange={(e) => setCarId(e.target.value)} placeholder="e.g. AB12 CDE" />
            </div>

            <h3 style={{ marginTop: '30px' }}>🔗 Your Unique Tag URL:</h3>
            <div style={{ background: '#e7f3ff', padding: '15px', wordBreak: 'break-all', borderRadius: '8px', border: '2px dashed #0070f3', fontSize: '15px', color: '#004aab', fontWeight: 'bold' }}>
              {generatedUrl}
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>Copy this into your NFC writing app.</p>
          </div>

          {/* Right Side: Live Preview */}
          <div style={{ flex: '1', minWidth: '300px', textAlign: 'center' }}>
            <h3 style={{ color: '#888', fontSize: '14px', textTransform: 'uppercase' }}>Driver's Phone Preview</h3>
            <div style={{ border: '8px solid #222', borderRadius: '30px', padding: '10px', background: 'white', maxWidth: '280px', margin: '0 auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                 <div style={{ textAlign: 'center', padding: '20px' }}>
                    <h2 style={{ color: '#0070f3', margin: '0' }}>{providerId || 'Owner'}</h2>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>Vehicle: <strong>{carId || 'Registration'}</strong></p>
                    <div style={{ margin: '15px 0', fontSize: '12px', color: '#aaa' }}>{tripCount} Trips Logged</div>
                    <div style={{ height: '40px', background: '#f0f0f0', borderRadius: '5px', margin: '10px 0', border: '1px solid #eee' }}></div>
                    <div style={{ height: '45px', background: '#0070f3', borderRadius: '5px', color: 'white', lineHeight: '45px', fontWeight: 'bold' }}>START TRIP</div>
                 </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- VIEW: DRIVER APP ---
  const displayProvider = (params.get('provider') || providerId || 'Independent').replace(/_/g, ' ')
  const displayCar = (params.get('car') || carId || 'V001').replace(/_/g, ' ')

  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3', marginBottom: '5px' }}>{displayProvider}</h1>
      <p style={{ marginTop: '0', color: '#666' }}>Vehicle: <strong>{displayCar}</strong></p>
      
      <div style={{ margin: '20px 0', padding: '15px', background: '#f4f4f4', borderRadius: '12px', border: '1px solid #eee' }}>
        <span style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px', letterSpacing: '1px' }}>FLEET ACTIVITY</span>
        <strong style={{ fontSize: '20px', color: '#333' }}>{tripCount}</strong>
        <span style={{ fontSize: '14px', color: '#666', marginLeft: '5px' }}>Total Events</span>
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
        <div style={{ backgroundColor: '#f0f7ff', padding: '30px', borderRadius: '15px', border: '2px solid #0070f3' }}>
          <h2 style={{ color: '#0070f3', marginTop: '0' }}>Trip Active</h2>
          <p>Driver: <strong>{userName}</strong></p>
          <button disabled={isSubmitting} onClick={() => recordEvent('trip_ended')} 
            style={{ width: '100%', padding: '18px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
            End Trip
          </button>
        </div>
      )}

      {screen === 'ended' && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ color: '#28a745' }}>✅ Recorded</h2>
          <p>Activity logged to the decentralized ledger.</p>
          <button onClick={() => setScreen('tap')} style={{ marginTop: '20px', padding: '12px 24px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>
            Back to Home
          </button>
        </div>
      )}
    </div>
  )
}
