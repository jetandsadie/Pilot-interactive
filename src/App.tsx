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

  async function fetchHistory() {
    const activeProvider = params.get('provider')
    const activeUser = params.get('user') // New: filter by driver name
    
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

  // --- VIEW: HISTORY LEDGER (For Owners OR Drivers) ---
  if (mode === 'history') {
    const isDriverView = params.get('user')
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '10px' }}>
          {isDriverView ? 'My Trip History' : 'Fleet Ledger'}
        </h2>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Showing activity for: <strong>{isDriverView || params.get('provider')}</strong>
        </p>
        
        <div style={{ marginTop: '20px' }}>
          {history.length === 0 ? <p>No logs found.</p> : history.map((item) => (
            <div key={item.id} style={{ padding: '15px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{item.action === 'trip_started' ? '🟢 Start' : '🔴 End'}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>{item.car_id} • {item.user_name}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '13px' }}>
                {new Date(item.created_at).toLocaleDateString()} <br/>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => window.history.back()} 
          style={{ marginTop: '30px', width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ccc', background: 'none' }}
        >
          Return
        </button>
      </div>
    )
  }

  // --- VIEW: SETUP TOOL ---
  if (mode === 'setup') {
    const cleanProvider = providerId.trim().replace(/\s+/g, '_') || 'Owner'
    const generatedUrl = `${window.location.origin}/?provider=${cleanProvider}&car=${carId.trim().replace(/\s+/g, '_') || 'Reg'}`
    
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        <h2>🛠 Setup & Management</h2>
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold' }}>Owner Name</label>
          <input style={{ width: '100%', padding: '12px', margin: '10px 0 20px 0' }} value={providerId} onChange={(e) => setProviderId(e.target.value)} />
          <label style={{ fontWeight: 'bold' }}>Car Registration</label>
          <input style={{ width: '100%', padding: '12px', margin: '10px 0' }} value={carId} onChange={(e) => setCarId(e.target.value)} />
        </div>
        
        <div style={{ background: '#e7f3ff', padding: '20px', borderRadius: '10px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Step 1: Save your Manager Link</h4>
          <p style={{ fontSize: '13px' }}>Bookmark this to view your fleet data anytime:</p>
          <a href={`${window.location.origin}/?mode=history&provider=${cleanProvider}`} style={{ color: '#0070f3', fontWeight: 'bold' }}>View My Fleet History →</a>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Step 2: Write your Tag</h4>
          <div style={{ padding: '10px', background: '#eee', wordBreak: 'break-all', fontSize: '12px' }}>{generatedUrl}</div>
        </div>
      </div>
    )
  }

  // --- VIEW: DRIVER APP ---
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3' }}>{(params.get('provider') || providerId || 'Independent').replace(/_/g, ' ')}</h1>
      <p>Vehicle: <strong>{(params.get('car') || carId || 'V001').replace(/_/g, ' ')}</strong></p>

      {screen === 'tap' && (
        <div style={{ marginTop: '20px' }}>
          <input style={{ padding: '15px', width: '100%', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ccc' }}
            value={userName} onChange={(e) => { setUserName(e.target.value); localStorage.setItem('tg_user_name', e.target.value); }} placeholder="Your Name" />
          <button disabled={!userName || isSubmitting} onClick={() => recordEvent('trip_started')}
            style={{ width: '100%', padding: '18px', backgroundColor: '#0070f3', color: 'white', borderRadius: '10px', fontWeight: 'bold' }}>
            Start Trip
          </button>
        </div>
      )}

      {screen === 'trip' && (
        <div style={{ background: '#f0f7ff', padding: '30px', borderRadius: '15px', border: '2px solid #0070f3' }}>
          <h2>Trip Active</h2>
          <button onClick={() => recordEvent('trip_ended')} style={{ width: '100%', padding: '18px', backgroundColor: '#ff4d4f', color: 'white', borderRadius: '10px' }}>End Trip</button>
        </div>
      )}

      {screen === 'ended' && (
        <div>
          <h2 style={{ color: '#28a745' }}>✅ Recorded</h2>
          <button onClick={() => setScreen('tap')} style={{ width: '100%', padding: '15px', marginBottom: '10px' }}>New Trip</button>
          
          {/* New Driver History Button */}
          <button 
            onClick={() => window.location.search = `?mode=history&user=${userName}`}
            style={{ width: '100%', padding: '12px', background: 'none', border: '1px solid #ccc', borderRadius: '10px', color: '#666' }}
          >
            View My Past Trips
          </button>
        </div>
      )}
    </div>
  )
}
