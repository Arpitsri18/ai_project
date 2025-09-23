import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

// Configure dotenv
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3002;

// Middleware to parse incoming JSON data
app.use(express.json());

// Lightweight request logger for /api routes
app.use('/api', (req, _res, next) => {
  try {
    console.log(`[API] ${req.method} ${req.originalUrl}`, {
      headers: req.headers,
      body: req.body,
    })
  } catch (e) {
    console.log('[API] logger error:', e)
  }
  next()
});

// Main route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from the backend!');
});


// Prediction route: fetch external data and combine
app.post('/api/predict-crop', async (req: Request, res: Response) => {
  try {
    console.log('Received request body:', req.body)
    
    const { latitude, longitude, startDate, endDate } = req.body as {
      latitude?: number
      longitude?: number
      startDate?: string
      endDate?: string
    }

    console.log('Parsed data:', { latitude, longitude, startDate, endDate })

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !startDate ||
      !endDate
    ) {
      console.log('Validation failed - missing required fields')
      return res.status(400).json({ error: 'latitude, longitude, startDate, endDate are required' })
    }

    // Load API key for OpenWeather
    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'your_api_key_here'
    console.log('OpenWeather API key available:', OPENWEATHER_API_KEY !== 'your_api_key_here')

    // Helper to fetch OpenWeather One Call (prefers 3.0, falls back to 2.5)
    const oneCallUrlV3 = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,alerts&units=metric&appid=${OPENWEATHER_API_KEY}`
    const oneCallUrlV25 = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,alerts&units=metric&appid=${OPENWEATHER_API_KEY}`
    
    console.log('Attempting to fetch weather data...')
    let weatherResp
    try {
      console.log('Trying OpenWeather API v3.0...')
      weatherResp = await axios.get(oneCallUrlV3)
      console.log('OpenWeather API v3.0 success')
    } catch (err) {
      console.log('OpenWeather API v3.0 failed, trying v2.5...', err)
      weatherResp = await axios.get(oneCallUrlV25)
      console.log('OpenWeather API v2.5 success')
    }

    const weatherDataRaw = weatherResp.data as {
      daily?: Array<{
        dt: number
        temp?: { min?: number; max?: number }
        rain?: number
        pop?: number
      }>
      timezone?: string
      lat?: number
      lon?: number
    }

    // Filter daily data by the provided date range (UTC days)
    const startUtc = new Date(startDate + 'T00:00:00Z').getTime() / 1000
    const endUtc = new Date(endDate + 'T23:59:59Z').getTime() / 1000
    const filteredDaily = (weatherDataRaw.daily ?? []).filter((d) => d.dt >= startUtc && d.dt <= endUtc)

    const daily = filteredDaily.map((d) => ({
      date_utc: new Date(d.dt * 1000).toISOString().slice(0, 10),
      temperature_min_c: d.temp?.min ?? null,
      temperature_max_c: d.temp?.max ?? null,
      precipitation_mm: typeof d.rain === 'number' ? d.rain : null,
      precipitation_probability: typeof d.pop === 'number' ? d.pop : null,
    }))

    // Placeholder soil data
    const soilData = {
      source: 'placeholder',
      coordinates: { latitude, longitude },
      ph: 6.8,
      nitrogen: 'medium',
      phosphorus: 'adequate',
      potassium: 'low',
      organic_matter: 'moderate',
    }

    const combined = {
      meta: {
        received: { latitude, longitude, startDate, endDate },
        provider: 'openweather',
        weather_api_key_used: OPENWEATHER_API_KEY !== 'your_api_key_here',
      },
      weather: {
        source: 'openweather onecall',
        location: { lat: weatherDataRaw.lat, lon: weatherDataRaw.lon, timezone: weatherDataRaw.timezone },
        daily,
      },
      soil: soilData,
    }

    console.log('Sending response:', JSON.stringify(combined, null, 2))
    return res.json(combined)
  } catch (err) {
    console.error('Prediction route error:', err)
    return res.status(500).json({ error: 'Failed to fetch data' })
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});