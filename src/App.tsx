import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode') // 'setup', 'history', or null (driver)
  
  const [providerId, setProviderId] = useState(params.get('provider') || '')
  const [carId, setCarId] = useState(params.get('car') || '')
  const [screen, setScreen] = useState('tap')
  const [userName, setUserName] = useState('')
  const [tripCount, setTripCount] = useState(0)
  const [history, setHistory] = useState<any[]>([]) // For the History Ledger
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('tg_user_name')
    if (savedName) setUserName(savedName)

    if (localStorage.getItem('tg_trip_active') === 'true') {
      setScreen('trip')
    }
    
    if (mode === 'history') {
      fetchHistory()
    } else {
      fetchTripCount()
    }
  }, [carId, mode])

  async function fetchTripCount() {
    const activeCar = params.get('car') || carId
    if (!activeCar) return
    const { count, error } = await supabase.from('pilot_submissions').select('*', { count: 'exact', head: true }).eq('car_id', activeCar)
    if (!error && count !== null) setTripCount(count)
  }

  // New: Fetch the last 20 events for this provider
  async function fetchHistory() {
    const activeProvider = params.get('provider') || providerId
    if (!activeProvider) return
    const { data, error } = await supabase
      .from('pilot_submissions')
      .select('*')
      .eq('provider_id', activeProvider)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (!error) setHistory(data || [])
  }

  async function recordEvent(actionType: string) {
    setIsSubmitting(true)
    const finalProvider = params.get('provider') || providerId || 'Independent'
    const finalCar = params.get('car') || carId || 'Unknown_Car'

    const { error } = await supabase
      .from('pilot_submissions') 
      .insert([{ user_name: userName || 'Anonymous', car_id: finalCar, provider_id: finalProvider, action: actionType }])

    if (!error) {
      if (actionType === 'trip_started') localStorage.setItem('tg_trip_active', 'true')
      else localStorage.removeItem('tg_trip_active')
      setTimeout(() => fetchTripCount(), 500)
      setScreen(actionType === 'trip_started' ? 'trip' : 'ended')
    }
    setIsSubmitting(false)
  }

  // --- VIEW: PROVIDER HISTORY LEDGER ---
  if (mode === 'history') {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => window.location.search = `?mode=setup`} style={{ marginBottom: '20px', cursor: 'pointer' }}>← Back to Setup</button>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>📊 Fleet History</h2>
        <p>Showing activity for: <strong>{providerId || params.get('provider')}</strong></p>
        
        <div style={{ marginTop: '20px' }}>
          {history.length === 0 ? <p>No data found yet.</p> : history.map((item) => (
            <div key={item.id} style={{ padding: '12px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <div>
                <strong>{item.user_name}</strong> {item.action === 'trip_started' ? '🟢 Started' : '🔴 Ended'}
                <div style={{ color: '#888', fontSize: '11px' }}>Car: {item.car_id}</div>
              </div>
              <div style={{ textAlign: 'right', color: '#666' }}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- VIEW: PROVIDER SETUP TOOL ---
  if (mode === 'setup') {
    const cleanProvider = providerId.trim().replace(/\s+/g, '_') || 'Owner'
    const cleanCar = carId.trim().replace(/\s+/g, '_') || 'Registration'
    const generatedUrl = `${window.location.origin}/?provider=${cleanProvider}&car=${cleanCar}`
    
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>🛠 Tag Setup Tool</h2>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginTop: '20px' }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Name of Owner</label>
              <input style={{ width: '100%', padding: '12px', marginBottom: '20px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }}
                value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="e.g. Southside Co-op" />
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Car Registration</label>
              <input style={{ width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }}
                value={carId} onChange={(e) => setCarId(e.target.value)} placeholder="e.g. AB12 CDE" />
            </div>
            <h3 style={{ marginTop: '20px' }}>🔗 Your Tag URL:</h3>
            <div style={{ background: '#e7f3ff', padding: '15px', wordBreak: 'break-all', borderRadius: '8px', border: '2px dashed #0070f3', fontSize: '14px', color: '#004aab', fontWeight: 'bold' }}>{generatedUrl}</div>
            <a href={`${window.location.origin}/?mode=history&provider=${cleanProvider}`} style={{ display: 'inline-block', marginTop: '20px', color: '#0070f3', fontWeight: 'bold' }}>View My Fleet History →</a>
          </div>
          <div style={{ flex: '1', minWidth: '300px', textAlign: 'center' }}>
            <h3 style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Phone Preview</h3>
            <div style={{ border: '8px solid #222', borderRadius: '30px', padding: '10px', background: 'white', maxWidth: '240px', margin: '0 auto' }}>
                 <div style={{ textAlign: 'center', padding: '15px' }}>
                    <h3 style={{ color: '#0070f3', margin: '0' }}>{providerId || 'Owner'}</h3>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>Vehicle: <strong>{carId || 'Registration'}</strong></p>
                    <div style={{ height: '35px', background: '#0070f3', borderRadius: '5px', color: 'white', lineHeight: '35px', fontWeight: 'bold', marginTop: '10px' }}>START TRIP</div>
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
      
      <div style={{ margin: '20px 0', padding: '15px', background: '#f4f4f4', borderRadius: '12px' }}>
        <strong style={{ fontSize: '18px', color: '#333' }}>{tripCount}</strong> <span style={{ fontSize: '14px', color: '#666' }}>Total Events</span>
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
          <button disabled={isSubmitting} onClick={() => recordEvent('trip_ended')} 
            style={{ width: '100%', padding: '18px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px' }}>
            End Trip
          </button>
        </div>
      )}

      {screen === 'ended' && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ color: '#28a745' }}>✅ Recorded</h2>
          <button onClick={() => setScreen('tap')} style={{ marginTop: '20px', padding: '12px 24px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}>New Trip</button>
        </div>
      )}
    </div>
  )
}
