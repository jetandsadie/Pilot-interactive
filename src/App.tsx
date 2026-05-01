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
  const [screen, setScreen] = useState('tap')
  const [userName, setUserName] = useState('')
  const [tripCount, setTripCount] = useState(0)
  const [history, setHistory] = useState<any[]>([]) 
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('tg_user_name')
    if (savedName) setUserName(savedName)
    if (localStorage.getItem('tg_trip_active') === 'true') setScreen('trip')
    
    if (mode === 'history') fetchHistory()
    else fetchTripCount()
  }, [carId, mode])

  async function fetchTripCount() {
    const activeCar = params.get('car') || carId
    if (!activeCar) return
    const { count, error } = await supabase.from('pilot_submissions').select('*', { count: 'exact', head: true }).eq('car_id', activeCar)
    if (!error && count !== null) setTripCount(count)
  }

  async function fetchHistory() {
    const activeProvider = params.get('provider')
    const activeUser = params.get('user')
    let query = supabase.from('pilot_submissions').select('*').order('created_at', { ascending: false }).limit(30)
    if (activeProvider) query = query.eq('provider_id', activeProvider)
    if (activeUser) query = query.eq('user_name', activeUser)
    const { data, error } = await query
    if (!error) setHistory(data || [])
  }

  async function recordEvent(actionType: string) {
    setIsSubmitting(true)
    const finalProvider = params.get('provider') || providerId || 'Independent'
    const finalCar = params.get('car') || carId || 'Unknown_Car'
    const { error } = await supabase.from('pilot_submissions').insert([{ 
      user_name: userName || 'Anonymous', 
      car_id: finalCar, 
      provider_id: finalProvider, 
      action: actionType 
    }])
    if (!error) {
      if (actionType === 'trip_started') localStorage.setItem('tg_trip_active', 'true')
      else localStorage.removeItem('tg_trip_active')
      setTimeout(() => fetchTripCount(), 500)
      setScreen(actionType === 'trip_started' ? 'trip' : 'ended')
    }
    setIsSubmitting(false)
  }

  // --- VIEW: HISTORY LEDGER ---
  if (mode === 'history') {
    const isDriverView = params.get('user')
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', color: '#333' }}>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>
          {isDriverView ? 'My Personal Log' : 'Fleet Management Ledger'}
        </h2>
        <p style={{ fontSize: '14px', color: '#666' }}>Showing activity for: <strong>{isDriverView || params.get('provider')}</strong></p>
        <div style={{ marginTop: '20px' }}>
          {history.length === 0 ? <p>No logs found.</p> : history.map((item) => (
            <div key={item.id} style={{ padding: '15px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: item.action === 'trip_started' ? '#28a745' : '#ff4d4f' }}>
                  {item.action === 'trip_started' ? '🟢 Started' : '🔴 Ended'}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>{item.car_id} • {item.user_name}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
                {new Date(item.created_at).toLocaleDateString()}<br/>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => window.history.back()} style={{ marginTop: '30px', width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Back</button>
      </div>
    )
  }

  // --- VIEW: SETUP TOOL ---
  if (mode === 'setup') {
    const cleanProvider = providerId.trim().replace(/\s+/g, '_') || 'Owner'
    const cleanCar = carId.trim().replace(/\s+/g, '_') || 'Reg'
    const generatedUrl = `${window.location.origin}/?provider=${cleanProvider}&car=${cleanCar}`
    
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto', color: '#333' }}>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>🛠 Provider Setup & Management</h2>
        
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginTop: '20px' }}>
          {/* Left Side: Inputs */}
          <div style={{ flex: '1', minWidth: '320px' }}>
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Provider's Name</label>
              <input style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="e.g. Jet Fleet" />
              
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Vehicle Registration</label>
              <input style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                value={carId} onChange={(e) => setCarId(e.target.value)} placeholder="e.g. AB12 CDE" />
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '10px' }}>🔗 Unique Tag URL:</h3>
            <div style={{ background: '#e7f3ff', padding: '15px', wordBreak: 'break-all', borderRadius: '8px', border: '2px dashed #0070f3', fontSize: '15px', color: '#004aab', fontWeight: 'bold' }}>
              {generatedUrl}
            </div>
            
            <div style={{ marginTop: '30px', padding: '20px', background: '#f0f7ff', borderRadius: '10px', border: '1px solid #0070f3' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>📊 Manager Access</h4>
              <p style={{ fontSize: '13px', margin: '0 0 15px 0' }}>Bookmark this link to see your full fleet history:</p>
              <a href={`${window.location.origin}/?mode=history&provider=${cleanProvider}`} style={{ color: '#0070f3', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #0070f3', padding: '8px 12px', borderRadius: '5px' }}>View My Fleet History →</a>
            </div>
          </div>

          {/* Right Side: Preview */}
          <div style={{ flex: '1', minWidth: '300px', textAlign: 'center' }}>
            <h3 style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', marginBottom: '15px' }}>Driver's Phone Preview</h3>
            <div style={{ border: '10px solid #222', borderRadius: '35px', padding: '15px', background: 'white', maxWidth: '280px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                 <div style={{ textAlign: 'center', padding: '10px' }}>
                    <h2 style={{ color: '#0070f3', margin: '0' }}>{providerId || "Provider's Name"}</h2>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>Vehicle: <strong>{carId || "Vehicle Reg"}</strong></p>
                    <div style={{ height: '40px', background: '#f4f4f4', borderRadius: '8px', margin: '15px 0 10px 0', border: '1px solid #eee' }}></div>
                    <div style={{ height: '45px', background: '#0070f3', borderRadius: '8px', color: 'white', lineHeight: '45px', fontWeight: 'bold', fontSize: '14px' }}>START TRIP</div>
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

      {screen === 'tap' && (
        <div style={{ marginTop: '30px' }}>
          <input style={{ padding: '15px', width: '100%', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px' }}
            value={userName} onChange={(e) => { setUserName(e.target.value); localStorage.setItem('tg_user_name', e.target.value); }} placeholder="Your Name" />
          <button disabled={!userName || isSubmitting} onClick={() => recordEvent('trip_started')}
            style={{ width: '100%', padding: '18px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
            {isSubmitting ? 'Syncing...' : 'Start Trip'}
          </button>
        </div>
      )}

      {screen === 'trip' && (
        <div style={{ backgroundColor: '#f0f7ff', padding: '30px', borderRadius: '20px', border: '2px solid #0070f3', marginTop: '20px' }}>
          <h2 style={{ color: '#0070f3', marginTop: '0' }}>Trip Active</h2>
          <p>Logged as: <strong>{userName}</strong></p>
          <button disabled={isSubmitting} onClick={() => recordEvent('trip_ended')} 
            style={{ width: '100%', padding: '18px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
            End Trip
          </button>
        </div>
      )}

      {screen === 'ended' && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ color: '#28a745' }}>✅ Success</h2>
          <p>Trip recorded to the ledger.</p>
          <button onClick={() => setScreen('tap')} style={{ width: '100%', padding: '15px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>New Trip</button>
          <button onClick={() => window.location.search = `?mode=history&user=${userName}`}
            style={{ width: '100%', padding: '12px', background: 'none', border: '1px solid #ddd', borderRadius: '10px', color: '#777', fontSize: '14px', cursor: 'pointer' }}>
            View My Past Trips
          </button>
        </div>
      )}
    </div>
  )
}
