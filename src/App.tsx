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
  const [userName, setUserName] = useState(localStorage.getItem('tg_user_name') || '')
  const [screen, setScreen] = useState('tap')
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [history, setHistory] = useState<any[]>([]) 
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // --- ACCOUNTANT STATES ---
  const [milesInput, setMilesInput] = useState<string>('')
  const PPU_RATE = 0.50 // £0.50 per mile
  const MONTHLY_TARGET = 333 // £333 owner floor
  const [monthlyTotal, setMonthlyTotal] = useState(0) // Cumulative £ this month

  const cleanText = (txt: string) => txt ? decodeURIComponent(txt).replace(/_/g, ' ') : ''

  useEffect(() => {
    // Set Page Title
    document.title = mode === 'history' ? "Fleet Ledger" : "Transport Group";

    if (mode === 'history') {
      fetchHistory()
    } else if (userName && carId) {
      checkAgreementStatus()
      fetchMonthlyProgress()
    } else {
      setIsLoading(false)
    }
  }, [userName, carId, mode])

  // Fetch how much this car has earned this month
  async function fetchMonthlyProgress() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const { data } = await supabase
      .from('pilot_submissions')
      .select('miles_driven')
      .eq('car_id', cleanText(carId))
      .gte('created_at', startOfMonth.toISOString());

    if (data) {
      const totalMiles = data.reduce((sum, row) => sum + (Number(row.miles_driven) || 0), 0);
      setMonthlyTotal(totalMiles * PPU_RATE);
    }
  }

  async function checkAgreementStatus() {
    setIsLoading(true)
    const { data } = await supabase
      .from('pilot_agreements')
      .select('*')
      .eq('user_name', userName)
      .eq('car_id', carId)
    
    if (data && data.length > 0) setHasAcceptedAgreement(true)
    setIsLoading(false)
  }

  async function recordAgreement() {
    setIsSubmitting(true)
    await supabase.from('pilot_agreements').insert([{ 
      user_name: userName, 
      car_id: carId, 
      provider_id: providerId || 'Independent'
    }])
    setHasAcceptedAgreement(true)
    setIsSubmitting(false)
  }

  async function fetchHistory() {
    setIsLoading(true)
    const { data } = await supabase
      .from('pilot_submissions')
      .select('*')
      .ilike('provider_id', cleanText(params.get('provider') || ''))
      .order('created_at', { ascending: false })
      .limit(30)
    
    setHistory(data || [])
    setIsLoading(false)
  }

  async function submitTrip() {
    if (!milesInput || isNaN(Number(milesInput))) return alert("Please enter valid miles");
    
    setIsSubmitting(true);
    const miles = Number(milesInput);
    const totalCost = miles * PPU_RATE;

    const { error } = await supabase.from('pilot_submissions').insert([{ 
      user_name: userName || 'Anonymous', 
      car_id: cleanText(carId), 
      provider_id: cleanText(providerId), 
      action: 'trip_completed',
      miles_driven: miles,
      cost_total: totalCost
    }]);

    if (!error) {
      // Send to Stripe (Using your £5 link for now as a "Deposit/Fixed Fee")
      window.location.href = "https://buy.stripe.com/test_8x2bJ285mczG9gU6wM3cc01";
    }
    setIsSubmitting(false);
  }

  if (isLoading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>

  // --- VIEW: HISTORY ---
  if (mode === 'history') {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
        <h2>{cleanText(params.get('provider') || 'Fleet')} Ledger</h2>
        {history.map((item) => (
          <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <strong>{item.user_name}</strong>: {item.miles_driven} miles (£{(item.miles_driven * PPU_RATE).toFixed(2)})
            <div style={{ fontSize: '12px', color: '#888' }}>{new Date(item.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '5px' }}>{cleanText(providerId)}</h1>
      <p style={{ marginTop: 0, color: '#666' }}>Vehicle: {cleanText(carId)}</p>

      {/* GAMIFICATION: MONTHLY PROGRESS BAR */}
      <div style={{ background: '#f0f0f0', borderRadius: '10px', padding: '15px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
          <span>Monthly Target: £{MONTHLY_TARGET}</span>
          <span>{Math.round((monthlyTotal / MONTHLY_TARGET) * 100)}%</span>
        </div>
        <div style={{ background: '#ddd', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ background: '#0070f3', width: `${Math.min((monthlyTotal / MONTHLY_TARGET) * 100, 100)}%`, height: '100%' }}></div>
        </div>
        <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
          {monthlyTotal >= MONTHLY_TARGET 
            ? "✨ Target met! Extra fees now funding the maintenance Pot." 
            : `£${(MONTHLY_TARGET - monthlyTotal).toFixed(2)} remaining to cover owner floor.`}
        </p>
      </div>

      {!userName ? (
         <input 
         style={{ padding: '15px', width: '100%', borderRadius: '10px', border: '1px solid #ccc' }}
         placeholder="Enter Your Name"
         onBlur={(e) => { setUserName(e.target.value); localStorage.setItem('tg_user_name', e.target.value); }} 
       />
      ) : !hasAcceptedAgreement ? (
        <div style={{ textAlign: 'left', background: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
          <h3>Driver Agreement</h3>
          <p style={{ fontSize: '14px' }}>I agree to the PPU rate and shortfall liability for {cleanText(carId)}.</p>
          <button onClick={recordAgreement} style={{ width: '100%', padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px' }}>I AGREE</button>
        </div>
      ) : (
        <div style={{ background: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Miles Driven</label>
          <input 
            type="number"
            value={milesInput}
            onChange={(e) => setMilesInput(e.target.value)}
            style={{ width: '100%', padding: '20px', fontSize: '24px', textAlign: 'center', borderRadius: '10px', border: '2px solid #0070f3', marginBottom: '20px' }}
            placeholder="0"
          />
          
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
            Fee: £{(Number(milesInput) * PPU_RATE).toFixed(2)}
          </div>

          <button 
            disabled={isSubmitting || !milesInput}
            onClick={submitTrip}
            style={{ width: '100%', padding: '20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold' }}>
            {isSubmitting ? 'Processing...' : 'CONFIRM & PAY'}
          </button>
        </div>
      )}
    </div>
  )
}
