import { useEffect, useMemo, useState } from 'react'

type Screen = 'home' | 'onboarding' | 'owner' | 'tap' | 'trip' | 'ended'

type SavedEvent = {
  id: string
  type: string
  user: string
  carId: string
  time: string
}

function Step({ label, active }: { label: string; active: boolean }) {
  return <div className={active ? 'step step--active' : 'step'}>{label}</div>
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
    // Read car from URL (e.g. ?car=V001)
  const params = new URLSearchParams(window.location.search)
  const carFromUrl = params.get('car')
  const [screen, setScreen] = useState<Screen>('home')
  const [ownerName, setOwnerName] = useState('Alex')
  const [ownerEmail, setOwnerEmail] = useState('alex@example.com')
  const [groupName, setGroupName] = useState('Blue Yaris Group')
  const [carName, setCarName] = useState('Blue Yaris')
  const [carId, setCarId] = useState(carFromUrl || 'V001')
    // If arriving via NFC, go straight to tap screen
  if (carFromUrl && screen === 'home') {
    setScreen('tap')
  }
  const [ppuRate, setPpuRate] = useState('0.42')
 const [userName, setUserName] = useState('')
  const [ownerRegistered, setOwnerRegistered] = useState(false)
  const [tagReady, setTagReady] = useState(false)
  const [tripStarted, setTripStarted] = useState(false)
  const [tripStartTime, setTripStartTime] = useState<string | null>(null)
  const [tripMinutes, setTripMinutes] = useState(35)
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([])

useEffect(() => {
  const savedName = localStorage.getItem('tg_user_name')
  if (savedName) {
    setUserName(savedName)
  }
}, [])

  const tripCost = useMemo(() => {
    const rate = Number(ppuRate || 0)
    return (tripMinutes * rate).toFixed(2)
  }, [tripMinutes, ppuRate])

  function startTrip() {
    const time = nowTime()
    setTripStarted(true)
    setTripStartTime(time)
    setSavedEvents((current) => [
      { id: crypto.randomUUID(), type: 'trip_started', user: userName, carId, time },
      ...current,
    ])
        localStorage.setItem('tg_user_name', userName)
          setScreen('trip')
  }

  function endTrip() {
  const time = nowTime()
  setTripStarted(false)
  setSavedEvents((current) => [
    { id: crypto.randomUUID(), type: 'trip_ended', user: userName, carId, time },
    ...current,
  ])
  setScreen('ended')
}

  return (
    <div className="app-shell">
      <div className="container">
        <header className="hero">
          <div className="badge-row">
            <span className="badge">Pilot prototype</span>
            <span className="badge badge--muted">Owner + passengers first</span>
          </div>
          <h1>Transport Groups — first version</h1>
          <p>
            A small mobile web prototype for the early pilot: owner onboarding, NFC tag setup, and
            passenger tap in / tap out.
          </p>
        </header>

        <div className="steps">
  <Step label="1. Intro" active={screen === 'home'} />
  <Step label="2. Owner onboarding" active={screen === 'onboarding'} />
  <Step label="3. Car & tag setup" active={screen === 'owner'} />
  <Step label="4. Tap flow" active={screen === 'tap'} />
  <Step label="5. Trip in progress" active={screen === 'trip'} />
  <Step label="6. Trip ended" active={screen === 'ended'} />
</div>

        {screen === 'home' && (
          <div className="grid grid--main">
            <Card>
              <h2>What this first version does</h2>
              <p className="muted">
                It gives a car owner something concrete to try with friends, family, or regular
                passengers.
              </p>
              <div className="feature-list">
                <div className="feature-box">
                  <h3>Owner receives NFC tag</h3>
                  <p>The tag is linked to a car page and can be tested straight away.</p>
                </div>
                <div className="feature-box">
                  <h3>Tap in / tap out</h3>
                  <p>Passengers or the owner tap with a phone to start and end a trip.</p>
                </div>
                <div className="feature-box">
                  <h3>Cost tracking</h3>
                  <p>The prototype calculates a simple usage cost from the agreed PPU rate.</p>
                </div>
              </div>
              <button className="button" onClick={() => setScreen('onboarding')}>
                Start building the first owner journey
              </button>
            </Card>

            <Card>
              <h2>Why this version is useful</h2>
              <div className="stats">
                <Stat label="Pilot focus" value="Try the system safely" />
                <Stat label="Social risk" value="Low" />
                <Stat label="Core test" value="Does tap flow feel natural?" />
              </div>
            </Card>
          </div>
        )}

        {screen === 'onboarding' && (
          <div className="grid grid--main">
            <Card>
              <h2>Owner onboarding</h2>
              <p className="muted">A simple form for the owner joining the pilot.</p>

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

              <div className="note">
                The owner can first use the system with passengers, partners, or friends before
                inviting other drivers.
              </div>

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

            <Card>
              <h2>Prototype notes</h2>
              <ul className="bullets">
                <li>This version focuses on owner confidence first.</li>
                <li>Later versions can extend from passengers to other drivers.</li>
                <li>This can later connect to WordPress and Supabase.</li>
              </ul>
            </Card>
          </div>
        )}

        {screen === 'owner' && (
          <div className="grid grid--main">
            <Card>
              <h2>Car and tag setup</h2>
              <p className="muted">Simulate the setup after the owner receives the NFC tag in the post.</p>

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
                <h3>NFC tag pack</h3>
                <p>
                  Owner receives a tag labelled for {carName}. They place it in the car and test the
                  flow.
                </p>
                <div className="button-row">
                  <button className="button" onClick={() => setTagReady(true)}>
                    {tagReady ? 'Tag activated' : 'Activate tag'}
                  </button>
                  {tagReady && <span className="badge">Ready to test</span>}
                </div>
              </div>

              <div className="button-row">
                <button className="button" disabled={!ownerRegistered || !tagReady} onClick={() => setScreen('tap')}>
                  Open tap flow
                </button>
                <button className="button button--secondary" onClick={() => setScreen('onboarding')}>
                  Back
                </button>
              </div>
            </Card>

            <Card>
              <h2>What the owner experiences</h2>
              <ul className="bullets">
                <li>Receives something physical in the post.</li>
                <li>Can test it with a familiar passenger before changing anything bigger.</li>
                <li>Starts to see how shared use and charging could work in practice.</li>
              </ul>
            </Card>
          </div>
        )}

        {screen === 'tap' && (
          <div className="grid grid--main">
            <Card>
              <h2>Tap in / tap out</h2>

              <label className="field">
                <span>Who's using the car?</span>
                <input value={userName} onChange={(e) => setUserName(e.target.value)} />
              </label>

              <div className="tap-box">
                <h3>{carName}</h3>
                <p>Car ID: {carId}</p>
                <p>Agreed PPU rate: £{ppuRate} per minute</p>
                <div className="button-row button-row--center">
                  {!tripStarted ? (
                    <button className="button" onClick={startTrip} disabled={!userName.trim()}>
  Start trip
</button>
                  ) : (
                    <button className="button" onClick={endTrip}>Tap out and end trip</button>
                  )}
                </div>
              </div>

              <div className="note">
                In the live build, the NFC tag would open a unique URL for this car. The user would
                already be signed in.
              </div>

              <div className="button-row">
                <button className="button button--secondary" onClick={() => setScreen('owner')}>
                  Back
                </button>
              </div>
            </Card>

            <Card>
              <h2>Simple pilot logic</h2>
              <ul className="bullets">
                <li>Tap identifies car.</li>
                <li>Start / stop event is recorded.</li>
                <li>Usage can later feed billing.</li>
              </ul>
            </Card>
          </div>
        )}

        {screen === 'trip' && (
          <div className="grid grid--main">
            <Card>
              <h2>Trip in progress</h2>
              <p className="muted">A simple success state showing that the tap flow has worked.</p>

              <div className="success-box">
                <h3>Trip started successfully</h3>
                <p>Welcome, {userName}. Your trip in {carName} has started.</p>
                <p>Started at {tripStartTime}</p>
              </div>

              <div className="grid grid--three">
                <div className="stat">
                  <div className="stat__label">User</div>
                  <div className="stat__value">{userName}</div>
                </div>
                <label className="field stat">
                  <span className="stat__label">Demo duration</span>
                  <input
                    type="number"
                    value={tripMinutes}
                    onChange={(e) => setTripMinutes(Number(e.target.value) || 0)}
                  />
                </label>
                <div className="stat">
                  <div className="stat__label">Estimated cost</div>
                  <div className="stat__value">£{tripCost}</div>
                </div>
              </div>

              <div className="button-row">
                <button className="button" onClick={endTrip}>Tap out to end trip</button>
                <button className="button button--secondary" onClick={() => setScreen('tap')}>
                  Back
                </button>
              </div>
            </Card>

            <Card>
              <h2>Saved events</h2>
              {savedEvents.length === 0 ? (
                <p className="muted">No events saved yet.</p>
              ) : (
                <div className="event-list">
                  {savedEvents.map((event) => (
                    <div className="event-item" key={event.id}>
                      <strong>{event.type}</strong>
                      <div>{event.user}</div>
                      <div>{event.carId}</div>
                      <div>{event.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
      
                )}

        {screen === 'ended' && (
          <div className="grid grid--main">
            <Card>
              <h2>Trip ended</h2>
              <p className="muted">A clear end state for the completed trip.</p>

              <div className="success-box">
                <h3>Trip ended successfully</h3>
                <p>Thanks, {userName}. Your trip in {carName} has been recorded.</p>
                <p>Estimated trip cost: £{tripCost}</p>
              </div>

              <div className="grid grid--three">
                <div className="stat">
                  <div className="stat__label">User</div>
                  <div className="stat__value">{userName}</div>
                </div>
                <div className="stat">
                  <div className="stat__label">Duration</div>
                  <div className="stat__value">{tripMinutes} mins</div>
                </div>
                <div className="stat">
                  <div className="stat__label">Estimated cost</div>
                  <div className="stat__value">£{tripCost}</div>
                </div>
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

            <Card>
              <h2>Saved events</h2>
              {savedEvents.length === 0 ? (
                <p className="muted">No events saved yet.</p>
              ) : (
                <div className="event-list">
                  {savedEvents.map((event) => (
                    <div className="event-item" key={event.id}>
                      <strong>{event.type}</strong>
                      <div>{event.user}</div>
                      <div>{event.carId}</div>
                      <div>{event.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
