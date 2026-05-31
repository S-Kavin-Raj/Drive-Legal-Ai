require('dotenv').config()

console.log(`Gemini API key detected: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '' ? 'YES' : 'NO'}`)

const { seedTrafficRules } = require('./services/seedService')
seedTrafficRules().catch(err => console.error('[Startup] Seeding failed:', err))

// Startup validation for OpenRouteService API Key
if (!process.env.ORS_API_KEY || process.env.ORS_API_KEY.trim() === '') {
  console.error('\x1b[31m[ERROR] Startup Validation Failed: ORS_API_KEY is missing in your backend environment variables (.env).\x1b[0m')
  process.exit(1)
}

const express = require('express')
const path = require('path')
const { validateRouteRequest, handleRouteAnalysis } = require('./controllers/routeController')
const complianceRoutes = require('./routes/complianceRoutes')
const routeIntelligenceRoutes = require('./routes/routeIntelligenceRoutes')
const challanRoutes = require('./routes/challanRoutes')
const awarenessRoutes = require('./routes/awarenessRoutes')
const authRoutes = require('./routes/authRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const trustScoreRoutes = require('./routes/trustScoreRoutes')
const { requireAuth } = require('./middleware/authMiddleware')

const app = express()
const PORT = process.env.PORT || 4000

// Basic CORS middleware for local dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  // Respond to preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})

app.use(express.json())

app.use('/api/compliance', complianceRoutes)
app.use('/api/route-intelligence', routeIntelligenceRoutes)
app.use('/api/challan-ocr', challanRoutes)
app.use('/api/awareness', awarenessRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/trust-score', trustScoreRoutes)

app.post('/api/recommendations', requireAuth, (req, res) => {
  const { riskScore, complianceScore, documentStatus, challansCount } = req.body

  const recommendations = []

  // 1. Risk Score Recommendations
  const score = Number(riskScore)
  if (!isNaN(score)) {
    if (score > 60) {
      recommendations.push({
        id: 'rec_risk_high',
        category: 'Safety',
        priority: 'high',
        title: 'Adopt Defensive Driving Mode',
        description: `Your route risk score is high (${score}/100). Restrict peak speed to 80 km/h, avoid night travel if possible, and double your safe following distance.`
      })
    } else if (score > 30) {
      recommendations.push({
        id: 'rec_risk_med',
        category: 'Safety',
        priority: 'medium',
        title: 'Route Risk Awareness',
        description: `Moderate risk factors (${score}/100) detected on recent journeys. Pre-plan stops and maintain stable acceleration patterns.`
      })
    } else {
      recommendations.push({
        id: 'rec_risk_low',
        category: 'Safety',
        priority: 'low',
        title: 'Maintain Safe Habits',
        description: 'Safe driving parameters logged. Keep up the consistent speed control and defensive lane management.'
      })
    }
  }

  // 2. Document Status Recommendations
  if (documentStatus && typeof documentStatus === 'object') {
    const expiredDocs = []
    const missingDocs = []

    for (const [docName, status] of Object.entries(documentStatus)) {
      if (status === 'Expired') {
        expiredDocs.push(docName.toUpperCase())
      } else if (status === 'Missing') {
        missingDocs.push(docName.toUpperCase())
      }
    }

    if (expiredDocs.length > 0) {
      recommendations.push({
        id: 'rec_docs_expired',
        category: 'Legal Compliance',
        priority: 'high',
        title: 'Urgent Document Renewal',
        description: `Your document(s) [${expiredDocs.join(', ')}] are EXPIRED. Renew immediately to prevent challans, vehicle impoundment, or insurance claim denial.`
      })
    }

    if (missingDocs.length > 0) {
      recommendations.push({
        id: 'rec_docs_missing',
        category: 'Legal Compliance',
        priority: 'medium',
        title: 'Upload Missing Documents',
        description: `We could not locate digital records for [${missingDocs.join(', ')}]. Upload them to your digital locker to avoid validation delays.`
      })
    }
  }

  // 3. Compliance and Challan Recommendations
  const cScore = Number(complianceScore)
  if (!isNaN(cScore) && cScore < 75) {
    recommendations.push({
      id: 'rec_comp_low',
      category: 'Legal Compliance',
      priority: 'high',
      title: 'Action Needed: Boost Compliance Index',
      description: `Your compliance score is below benchmark (${cScore}%). Rectify expired documents and resolve pending challans immediately.`
    })
  }

  const challans = Number(challansCount)
  if (!isNaN(challans) && challans > 0) {
    recommendations.push({
      id: 'rec_challan_active',
      category: 'Legal Compliance',
      priority: 'high',
      title: 'Resolve Unpaid Citations',
      description: `You have ${challans} active traffic challan(s). Access the online treasury to complete payments and avoid court summon escalations.`
    })
  }

  // Default recommendation if empty
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec_default',
      category: 'General',
      priority: 'low',
      title: 'Drive Safe & Stay Aware',
      description: 'No active safety risks or document issues flagged. Plan your next route and continue driving legally.'
    })
  }

  res.json({ recommendations })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'drivelegal-backend' })
})

app.get('/test-ors', async (req, res) => {
  try {
    const ORS_API_KEY = process.env.ORS_API_KEY;
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${encodeURIComponent(ORS_API_KEY)}&start=76.9558,11.0168&end=78.1198,9.9252`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return res.json({ success: false, error: `ORS API responded with status ${response.status}`, detail: data });
    }
    res.json({ success: true, distance: data.features[0].properties.summary.distance });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/sample', (req, res) => {
  res.json({ message: 'This is a sample backend endpoint for DriveLegal AI.' })
})

// Dynamic Driver Recommendation Engine API
// Dynamic Route Risk Analysis & Intelligence Engine API
app.post('/api/route-risk', requireAuth, validateRouteRequest, handleRouteAnalysis)

app.listen(PORT, () => {
  console.log(`DriveLegal backend listening on http://localhost:${PORT}`)
})
