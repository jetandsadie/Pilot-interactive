import React, { useEffect, useMemo, useRef, useState } from 'react'

type Screen = 'home' | 'onboarding' | 'owner' | 'tap' | 'trip' | 'ended'

type SavedEvent = {
  id: string
  type: string
  user: string
  carId: string
  time: string
}

type ActiveTrip = {
  user: string
  carId: string
  carName: string
  ppuRate: string
  startTime: string
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  )
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const carFromUrl = params.get('car')
    const isBook = carId === 'BOOK1' || carFromUrl === 'BOOK1'
  const itemTitle = isBook ? 'Guidebook' : 'Share trip cost'

  const [screen, setScreen] = useState<Screen>(carFromUrl ? 'tap' : 'home')

  const [ownerName, setOwnerName] = useState('Alex')
  const [ownerEmail, setOwnerEmail] = useState('alex@example.com')
  const [groupName, setGroupName] = useState('Blue Yaris Group')

  const [carName, setCarName] = useState('Blue Yaris')
  const [carId, setCarId] = useState(carFromUrl || 'V001')
  const [ppuRate, setPpuRate] = useState('0.42')

  const [userName, setUserName] = useState('')
  const [ownerRegistered, setOwnerRegistered] = useState(false)
  const [tagReady, setTagReady] = useState(false)

  const [tripStarted, setTripStarted] = useState(false)
  const [tripStartTime, setTripStartTime] = useState<string | null>(null)
  const [tripMinutes, setTripMinutes] = useState(35)
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([])

  const autoHandledRef = useRef(false)

  const tripCost = useMemo(() => {
    const rate = Number(ppuRate || 0)
    return (tripMinutes * rate).toFixed(2)
  }, [tripMinutes, ppuRate])

  useEffect(() => {
    const savedName = localStorage.getItem('tg_user_name')
    if (savedName) {
      setUserName(savedName)
    }

    const savedTrip = localStorage.getItem('tg_active_trip')
    if (savedTrip) {
      try {
        const trip: ActiveTrip = JSON.parse(savedTrip)
        setTripStarted(true)
        setTripStartTime(trip.startTime)
        setCarId(trip.carId)
        setCarName(trip.carName)
        setPpuRate(trip.ppuRate)
      } catch {
        localStorage.removeItem('tg_active_trip')
      }
    }
  }, [])

  useEffect(() => {
    if (!carFromUrl) return
    if (!userName.trim()) return
    if (autoHandledRef.current) return

    autoHandledRef.current = true

    const savedTrip = localStorage.getItem('tg_active_trip')

    if (savedTrip) {
      try {
        const trip: ActiveTrip = JSON.parse(savedTrip)

        if (trip.carId === carFromUrl && trip.user === userName) {
          const time = nowTime()
          setTripStarted(false)
          setTripStartTime(trip.startTime)
          setCarId(trip.carId)
          setCarName(trip.carName)
          setPpuRate(trip.ppuRate)
          setSavedEvents((current) => [
            { id: crypto.randomUUID(), type: 'trip_ended', user: userName, carId: trip.carId, time },
            ...current,
          ])
          localStorage.removeItem('tg_active_trip')
          setScreen('ended')
          return
        }
      } catch {
        localStorage.removeItem('tg_active_trip')
      }
    }

    const time = nowTime()
    const newTrip: ActiveTrip = {
      user: userName,
      carId: carFromUrl,
      carName,
      ppuRate,
      startTime: time,
    }

    setTripStarted(true)
    setTripStartTime(time)
    setCarId(carFromUrl)
    setSavedEvents((current) => [
      { id: crypto.randomUUID(), type: 'trip_started', user: userName, carId: carFromUrl, time },
      ...current,
    ])
    localStorage.setItem('tg_active_trip', JSON.stringify(newTrip))
    setScreen('trip')
  }, [carFromUrl, userName, carName, ppuRate])

  function startTrip() {
    const time = nowTime()
    const newTrip: ActiveTrip = {
      user: userName,
      carId,
      carName,
      ppuRate,
      startTime: time,
    }

    setTripStarted(true)
    setTripStartTime(time)
    setSavedEvents((current) => [
      { id: crypto.randomUUID(), type: 'trip_started', user: userName, carId, time },
      ...current,
    ])
    localStorage.setItem('tg_user_name', userName)
    localStorage.setItem('tg_active_trip', JSON.stringify(newTrip))
    setScreen('trip')
  }

  function endTrip() {
    const time = nowTime()
    setTripStarted(false)
    setSavedEvents((current) => [
      { id: crypto.randomUUID(), type: 'trip_ended', user: userName, carId, time },
      ...current,
    ])
    localStorage.removeItem('tg_active_trip')
    setScreen('ended')
  }

  return (
    <div className="app-shell">
      <div className="container">
        <header className="hero">
          <h1>{itemTitle}</h1>
        </header>

        {screen === 'home' && (
          <div className="grid grid--main">
            <Card>
              <h2>Owner onboarding</h2>
              <p className="muted">Set up a car and tag for trip sharing.</p>

              <div className="button-row">
                <button className="button" onClick={() => setScreen('onboarding')}>
                  Start
                </button>
              </div>
            </Card>
          </div>
        )}

        {screen === 'onboarding' && (
          <div className="grid grid--main">
            <Card>
              <h2>Owner onboarding</h2>

              <label className="field">
                <span>Owner name</span>
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </label>

              <label className="field">
                <span>Email</span>
                <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
              </label>

              <label className="field">
                <span>Group name</span>
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </label>

              <div className="button-row">
                <button
                  className="button"
                  onClick={() => {
                    setOwnerRegistered(true)
                    setScreen('owner')
                  }}
                >
                  Continue
                </button>
                <button className="button button--secondary" onClick={() => setScreen('home')}>
                  Back
                </button>
              </div>
            </Card>
          </div>
        )}

        {screen === 'owner' && (
          <div className="grid grid--main">
            <Card>
              <h2>Car and tag setup</h2>

              <label className="field">
                <span>Car name</span>
                <input value={carName} onChange={(e) => setCarName(e.target.value)} />
              </label>

              <div className="grid grid--two">
                <label className="field">
                  <span>Car ID</span>
                  <input value={carId} onChange={(e) => setCarId(e.target.value)} />
                </label>
                <label className="field">
                  <span>PPU rate (£/minute)</span>
                  <input value={ppuRate} onChange={(e) => setPpuRate(e.target.value)} />
                </label>
              </div>

              <div className="tag-box">
                <h3>NFC tag</h3>
                <div className="button-row">
                  <button className="button" onClick={() => setTagReady(true)}>
                    {tagReady ? 'Tag activated' : 'Activate tag'}
                  </button>
                </div>
              </div>

              <div className="button-row">
                <button
                  className="button"
                  disabled={!ownerRegistered || !tagReady}
                  onClick={() => setScreen('tap')}
                >
                  Open tap flow
                </button>
                <button className="button button--secondary" onClick={() => setScreen('onboarding')}>
                  Back
                </button>
              </div>
            </Card>
          </div>
        )}

        {screen === 'tap' && (
          <div className="grid grid--main">
            <Card>
              <h2>{carName}</h2>
              <p>£{ppuRate} per minute</p>

              <label className="field">
                <span>{isBook ? 'Who wants to read this book?' : 'Who’s sharing the trip?'}</span>
                <input value={userName} onChange={(e) => setUserName(e.target.value)} />
              </label>

              <div className="button-row button-row--center">
                <button className="button" onClick={startTrip} disabled={!userName.trim()}>
  {isBook ? 'Record use' : 'Start trip'}
</button>
              </div>

              <div className="button-row">
                <button className="button button--secondary" onClick={() => setScreen('owner')}>
                  Back
                </button>
              </div>
            </Card>
          </div>
        )}

        {screen === 'trip' && (
          <div className="grid grid--main">
            <Card>
              <h2>{carName}</h2>
              <p>{isBook ? 'Use recorded' : 'Trip in progress'}</p>

              <div className="success-box">
                <h3>Trip started</h3>
                <p>{isBook ? `${userName} used this book.` : `${userName} is sharing this trip.`}</p>
                <p>Started at {tripStartTime}</p>
              </div>

              <div className="grid grid--three">
  <Stat label="User" value={userName} />
</div>

              <div className="button-row">
                <button className="button" onClick={endTrip}>
  Tap again to end trip
</button>
              </div>
            </Card>
          </div>
        )}

        {screen === 'ended' && (
          <div className="grid grid--main">
            <Card>
              <h2>{carName}</h2>
              <p>Trip ended</p>

              <div className="success-box">
                <h3>{isBook ? 'Use recorded' : 'Trip ended'}</h3>
                <p>Thanks, {userName}.</p>
                <p>Estimated trip cost: £{tripCost}</p>
              </div>

              <div className="grid grid--three">
  <Stat label="User" value={userName} />
</div>
 <h3>Who has used this</h3>

<div className="event-list">
  {savedEvents.map((event) => (
    <div className="event-item" key={event.id}>
      {event.user}
    </div>
  ))}
</div>
              <div className="button-row">
                <button className="button" onClick={() => setScreen('tap')}>
                  Start another trip
                </button>
                <button className="button button--secondary" onClick={() => setScreen('home')}>
                  Return home
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
