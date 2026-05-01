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

  // Helper to make text look pretty (removes %27, underscores, etc)
  const cleanText = (txt: string) => txt ? decodeURIComponent(txt).replace(/_/g, ' ') : ''

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
    if (activeProvider) query = query.eq('provider_id', decodeURIComponent(activeProvider))
    if (activeUser) query = query.eq('user_name', decodeURIComponent(activeUser))
    const { data, error } = await query
    if (!error) setHistory(data || [])
  }

  async function recordEvent(actionType: string) {
    setIsSubmitting(true)
    const finalProvider = cleanText(params.get('provider') || providerId || 'Independent')
    const finalCar = cleanText(params.get('car') || carId || 'Unknown_Car')
    
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
        <p style={{ fontSize: '14px', color: '#666' }}>Active View: <strong>{cleanText(isDriverView || params.get('provider') || '')}</strong></p>
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
        <button onClick={() => window.history.back()} style={{ marginTop: '30px', width: '100%', padding: '20px', borderRadius: '12px', border: '1px solid #ccc', background: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Back</button>
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
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>🛠 Provider Setup</h2>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginTop: '20px' }}>
          <div style={{ flex: '1', minWidth: '320px' }}>
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Provider's Name</label>
              <input style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px' }} 
                value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="e.g. Sarah's Car" />
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Vehicle Registration</label>
              <input style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px' }} 
                value={carId} onChange={(e) => setCarId(e.target.value)} placeholder="e.g. AB12 CDE" />
            </div>
            <h3 style={{ marginTop: '30px' }}>🔗 Unique Tag URL:</h3>
            <div style={{ background: '#e7f3ff', padding: '15px', wordBreak: 'break-all', borderRadius: '8px', border: '2px dashed #0070f3', fontSize: '15px', color: '#004aab', fontWeight: 'bold' }}>{generatedUrl}</div>
            <div style={{ marginTop: '30px' }}>
              <a href={`${window.location.origin}/?mode=history&provider=${cleanProvider}`} style={{ display: 'inline-block', background: '#0070f3', color: 'white', padding: '15px 25px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,112,243,0.3)' }}>View Fleet History →</a>
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '300px', textAlign: 'center' }}>
            <h3 style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>Phone Preview</h3>
            <div style={{ border: '10px solid #222', borderRadius: '40px', padding: '20px', background: 'white', maxWidth: '280px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                <h2 style={{ color: '#0070f3', margin: '0' }}>{providerId || "Sarah's Car"}</h2>
                <p style={{ margin: '5px 0', color: '#666' }}>{carId || "Reg"}</p>
                <div style={{ height: '50px', background: '#0070f3', borderRadius: '10px', color: 'white', lineHeight: '50px', fontWeight: 'bold', marginTop: '20px' }}>START TRIP</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- VIEW: DRIVER APP ---
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3', marginBottom: '5px' }}>{cleanText(params.get('provider') || providerId)}</h1>
      <p style={{ marginTop: '0', color: '#666', fontSize: '18px' }}>Vehicle: <strong>{cleanText(params.get('car') || carId)}</strong></p>

      {screen === 'tap' && (
        <div style={{ marginTop: '30px' }}>
          <input style={{ padding: '20px', width: '100%', marginBottom: '20px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '18px' }}
            value={userName} onChange={(e) => { setUserName(e.target.value); localStorage.setItem('tg_user_name', e.target.value); }} placeholder="Enter Your Name" />
          <button disabled={!userName || isSubmitting} onClick={() => recordEvent('trip_started')}
            style={{ width: '100%', padding: '25px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,112,243,0.3)' }}>
            {isSubmitting ? 'Syncing...' : 'START TRIP'}
          </button>
        </div>
      )}

      {screen === 'trip' && (
        <div style={{ backgroundColor: '#f0f7ff', padding: '40px 20px', borderRadius: '25px', border: '3px solid #0070f3', marginTop: '20px' }}>
          <h2 style={{ color: '#0070f3', marginTop: '0', fontSize: '28px' }}>Trip Active</h2>
          <p style={{ marginBottom: '30px' }}>Driver: <strong>{userName}</strong></p>
          <button disabled={isSubmitting} onClick={() => recordEvent('trip_ended')} 
            style={{ width: '100%', padding: '25px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255,77,79,0.3)' }}>
            END TRIP
          </button>
        </div>
      )}

      {screen === 'ended' && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ color: '#28a745', fontSize: '32px' }}>✅ Done!</h2>
          <p style={{ fontSize: '18px', color: '#666' }}>Your trip is logged.</p>
          <button onClick={() => setScreen('tap')} style={{ width: '100%', padding: '20px', marginTop: '20px', borderRadius: '12px', border: '2px solid #0070f3', background: '#fff', color: '#0070f3', fontWeight: 'bold', fontSize: '16px' }}>New Trip</button>
          <button onClick={() => window.location.search = `?mode=history&user=${userName}`}
            style={{ width: '100%', padding: '15px', marginTop: '15px', background: 'none', border: 'none', color: '#777', textDecoration: 'underline', cursor: 'pointer' }}>
            View My Past Trips
          </button>
        </div>
      )}
    </div>
  )
}
