import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from '@geoapify/react-geocoder-autocomplete'
import '@geoapify/geocoder-autocomplete/styles/minimal.css'

type CombinedResponse = Record<string, unknown>

export default function PredictionPage() {
  useEffect(() => {
    console.log('PredictionPage mounted')
  }, [])
  
  const [selectedLatLng, setSelectedLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CombinedResponse | null>(null)

  const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY

  // Handle place selection from Geoapify
  const onPlaceSelect = (value: any) => {
    console.log('Place selected:', value)
    
    if (!value || !value.properties) {
      setError('Invalid location data received')
      return
    }

    const lat = value.properties.lat
    const lon = value.properties.lon
    const address = value.properties.formatted

    console.log('Latitude:', lat, 'Longitude:', lon, 'Address:', address)

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      setError('Invalid coordinates received')
      return
    }

    setSelectedLatLng({ lat, lng: lon })
    setSelectedAddress(address)
    setError(null)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('Submit clicked')
    void requestPrediction()
  }

  const requestPrediction = async () => {
    if (!selectedLatLng) {
      setError('Please select a location from suggestions')
      return
    }
    if (!startDate || !endDate) {
      setError('Please choose a start and end date')
      return
    }
    setIsLoading(true)
    setError(null)
    setResult(null)
    
    console.log('Making API request with data:', {
      latitude: selectedLatLng.lat,
      longitude: selectedLatLng.lng,
      startDate,
      endDate,
    })
    
    try {
      const res = await fetch('/api/predict-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: selectedLatLng.lat,
          longitude: selectedLatLng.lng,
          startDate,
          endDate,
        }),
      })
      
      console.log('Response status:', res.status)
      console.log('Response headers:', res.headers)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Error response:', errorText)
        throw new Error(`Request failed: ${res.status} - ${errorText}`)
      }
      
      const data: CombinedResponse = await res.json()
      console.log('Received data:', data)
      setResult(data)
    } catch (err) {
      console.error('Fetch error:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`We couldn't get data. ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!geoapifyApiKey) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#0b1220', color: '#e6e9ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Configuration Error</h1>
          <p>Please set VITE_GEOAPIFY_API_KEY in your .env file</p>
        </div>
      </div>
    )
  }

  return (
    <GeoapifyContext apiKey={geoapifyApiKey}>
      <div style={{ minHeight: '100dvh', backgroundColor: '#0b1220', color: '#e6e9ef' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 16px' }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 28 }}>Crop Predictor</h1>
            <p style={{ marginTop: 8, opacity: 0.8 }}>
              Select a location and date range to fetch data for prediction.
            </p>
          </header>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <label htmlFor="location" style={{ fontWeight: 600 }}>Location</label>
            <GeoapifyGeocoderAutocomplete
              placeholder="Search location (e.g., New Delhi)"
              placeSelect={onPlaceSelect}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #24324a',
                background: '#0f172a',
                color: '#e6e9ef',
                outline: 'none',
              }}
            />
            
            {selectedLatLng && (
              <div style={{ padding: '8px 12px', background: '#0f172a', borderRadius: 8, border: '1px solid #24324a', fontSize: 14 }}>
                <div><strong>Selected:</strong> {selectedAddress}</div>
                <div><strong>Coordinates:</strong> {selectedLatLng.lat.toFixed(4)}, {selectedLatLng.lng.toFixed(4)}</div>
              </div>
            )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="startDate" style={{ fontWeight: 600 }}>Start date</label>
              <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #24324a', background: '#0f172a', color: '#e6e9ef'
              }} />
            </div>
            <div>
              <label htmlFor="endDate" style={{ fontWeight: 600 }}>End date</label>
              <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #24324a', background: '#0f172a', color: '#e6e9ef'
              }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid #2a415b',
              background: isLoading ? '#1e293b' : '#0ea5e9',
              color: '#0b1220',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'filter 120ms ease',
            }}
          >
            {isLoading ? 'Fetching…' : 'Get Crop Prediction'}
          </button>
        </form>

        {error && (
          <div role="alert" style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, border: '1px solid #4b1a1a', background: '#220c0c', color: '#ffd1d1' }}>
            {error}
          </div>
        )}

          {result && (
            <section style={{ marginTop: 20, padding: '16px 18px', borderRadius: 12, border: '1px solid #24324a', background: '#0f172a' }}>
              <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Raw response</h2>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(result, null, 2)}</pre>
            </section>
          )}
        </div>
      </div>
    </GeoapifyContext>
  )
}


