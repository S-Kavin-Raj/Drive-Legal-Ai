const { admin, db } = require('../services/firebaseAdmin')
const { extractTextFromFile } = require('../services/ocrService')
const { evaluateConfidence } = require('../services/confidenceEngine')
const { matchTrafficRule } = require('../services/ruleMatchingEngine')
const { recalculateUserTrustScore } = require('../services/trustScoreEngine')

// Heuristic Challan Classification (Step 2)
function detectChallanClassification(text) {
  const clean = String(text || '').toLowerCase()
  
  const strongTokens = [
    'challan', 'fine', 'penalty', 'violation', 'section', 'police', 
    'e-court', 'notice', 'compounding fee', 'amount due', 'offence', 'citation'
  ]
  const weakTokens = [
    'vehicle', 'rto', 'driving license', 'registration no', 'dl', 'rc', 'speed limit'
  ]

  const strongMatches = strongTokens.filter(t => clean.includes(t))
  const weakMatches = weakTokens.filter(t => clean.includes(t))

  if (strongMatches.length >= 2 || (strongMatches.length >= 1 && weakMatches.length >= 1)) {
    return 'Valid Challan'
  } else if (strongMatches.length === 1 || weakMatches.length >= 1) {
    return 'Possible Challan'
  }
  return 'Not a Challan'
}

// Violation Category Classifier (Step 3)
function determineViolationCategory(violation, text) {
  const combined = `${String(violation || '')} ${String(text || '')}`.toLowerCase()
  if (combined.includes('parking') || combined.includes('obstruction') || combined.includes('sec 122') || combined.includes('tow')) {
    return 'Parking'
  }
  if (combined.includes('speed') || combined.includes('overspeed') || combined.includes('sec 112') || combined.includes('sec 183')) {
    return 'Speed'
  }
  if (combined.includes('license') || combined.includes('dl') || combined.includes('sec 3') || combined.includes('sec 181')) {
    return 'License'
  }
  if (
    combined.includes('helmet') || combined.includes('seatbelt') || combined.includes('drunk') || 
    combined.includes('alcohol') || combined.includes('safety') || combined.includes('sec 129') || 
    combined.includes('sec 194') || combined.includes('triple')
  ) {
    return 'Safety'
  }
  if (
    combined.includes('insurance') || combined.includes('registration') || combined.includes('rc') || 
    combined.includes('puc') || combined.includes('pollution') || combined.includes('emission') || 
    combined.includes('fitness') || combined.includes('fc') || combined.includes('sec 39') || 
    combined.includes('sec 146') || combined.includes('sec 190')
  ) {
    return 'Document'
  }
  return 'Traffic'
}

// Severity Engine (Step 4)
function calculateSeverity(fineAmount) {
  const fine = Number(fineAmount) || 0
  if (fine > 8000) return 'Critical'
  if (fine > 3000) return 'High'
  if (fine >= 1000) return 'Medium'
  return 'Low'
}

// Driver-Friendly Explanation Generator (Step 5)
function generateDriverExplanation(category, fineAmount) {
  const fine = Number(fineAmount) || 0
  
  if (category === 'Safety') {
    return {
      summary: 'Driving without safety protective gear (Helmet, Seat Belt, or Triple Riding).',
      fine: `₹${fine}`,
      rule: 'Motor Vehicles Act Section 129/194B/194D mandates certified safety restraints.',
      action: 'Always secure your helmet chin-strap or fasten your seatbelt before starting.'
    }
  }
  if (category === 'Speed') {
    return {
      summary: 'Exceeding permissible road sector speed limits (Overspeeding).',
      fine: `₹${fine}`,
      rule: 'Motor Vehicles Act Section 112/183 penalizes speeds exceeding posted signs.',
      action: 'Observe local speed traps and slow down in municipality/school sectors.'
    }
  }
  if (category === 'License') {
    return {
      summary: 'Driving without an authorised or active Driving License.',
      fine: `₹${fine}`,
      rule: 'Motor Vehicles Act Section 3/181 mandates carrying active authorised credentials.',
      action: 'Keep your digital driving license updated inside your document vault.'
    }
  }
  if (category === 'Document') {
    return {
      summary: 'Driving without valid statutory Insurance, RC registration, or PUC clearance.',
      fine: `₹${fine}`,
      rule: 'Motor Vehicles Act Section 146/190/192 requires active third-party papers.',
      action: 'Renew your expired PUC/Insurance certificates in the vault to clear index warning bands.'
    }
  }
  if (category === 'Parking') {
    return {
      summary: 'Obstructive parking or resting in a designated Tow Zone.',
      fine: `₹${fine}`,
      rule: 'Motor Vehicles Act Section 122/177 prohibits causing public traffic obstructions.',
      action: 'Only park within designated parking lots and stay clear of narrow crossings.'
    }
  }

  // Default Traffic Category
  return {
    summary: 'Standard road rule or traffic signal compliance infraction.',
    fine: `₹${fine}`,
    rule: 'Motor Vehicles Act general compliance sections.',
    action: 'Observe all road lane indicators, avoid red light jumping, and drive defensively.'
  }
}

// Heuristic OCR text parser (Step 1 support: WhatsApp, SMS, Email, etc.)
function parseOcrText(text, matchedRule) {
  const cleanText = String(text || '')

  // 1. Vehicle Number: Standard Indian License Plates
  let vehicleNumber = 'Unknown'
  const plateRegex = /\b([A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b/i
  const plateMatch = cleanText.match(plateRegex)
  if (plateMatch) {
    vehicleNumber = plateMatch[1].toUpperCase().replace(/\s+/g, ' ').trim()
  }

  // 2. Fine Amount
  let fineAmount = null
  const fineRegexes = [
    /(?:fine|penalty|amount|due|amount\s*due)\s*(?:amount)?\s*(?:of|is)?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*)/i,
    /(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*)/i,
    /fine\s*:\s*(\d+(?:,\d+)*)/i
  ]
  for (const r of fineRegexes) {
    const m = cleanText.match(r)
    if (m) {
      const val = parseInt(m[1].replace(/,/g, ''), 10)
      if (!isNaN(val)) {
        fineAmount = val
        break
      }
    }
  }
  if (fineAmount === null && matchedRule && matchedRule.fine) {
    fineAmount = matchedRule.fine
  }

  // 3. Challan Date
  let challanDate = new Date()
  const dateMatch1 = cleanText.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/)
  const dateMatch2 = cleanText.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
  if (dateMatch1) {
    const day = parseInt(dateMatch1[1], 10)
    const month = parseInt(dateMatch1[2], 10) - 1
    const year = parseInt(dateMatch1[3], 10)
    const d = new Date(year, month, day)
    if (!isNaN(d.getTime())) challanDate = d
  } else if (dateMatch2) {
    const year = parseInt(dateMatch2[1], 10)
    const month = parseInt(dateMatch2[2], 10) - 1
    const day = parseInt(dateMatch2[3], 10)
    const d = new Date(year, month, day)
    if (!isNaN(d.getTime())) challanDate = d
  }

  // 4. Location
  let location = 'Unknown Location'
  const locMatch = cleanText.match(/(?:location|place|at|near)\s*:\s*([^\n,]{3,50})/i) || cleanText.match(/(?:near|at)\s+([A-Za-z0-9\s]{4,30})/i)
  if (locMatch) {
    location = locMatch[1].trim()
  }

  // 5. Section Reference
  let sectionReference = matchedRule && matchedRule.section ? matchedRule.section : 'Sec 177'
  const secMatch = cleanText.match(/sec(?:tion)?\.?\s*(\d+[A-Za-z0-9()]*)/i)
  if (secMatch) {
    sectionReference = `Sec ${secMatch[1]}`
  }

  // 6. Violation
  let violation = matchedRule && matchedRule.violation ? matchedRule.violation : 'Traffic Violation'
  if (!matchedRule) {
    const violationKeywords = [
      { kw: 'helmet', name: 'Driving without protective headgear (No Helmet)' },
      { kw: 'speeding', name: 'Exceeding permissible speed limits (Over-speeding)' },
      { kw: 'red light', name: 'Disobeying traffic control signals (Red Light Violation)' },
      { kw: 'jumping signal', name: 'Disobeying traffic control signals (Red Light Violation)' },
      { kw: 'seatbelt', name: 'Driving without seatbelt (Seatbelt Violation)' },
      { kw: 'drunk', name: 'Driving under the influence of alcohol (Drunk Driving)' },
      { kw: 'triple', name: 'Carrying more than one passenger on a two-wheeler (Triple Riding)' }
    ]
    for (const vk of violationKeywords) {
      if (cleanText.toLowerCase().includes(vk.kw)) {
        violation = vk.name
        break
      }
    }
  }

  return {
    vehicleNumber,
    violation,
    fineAmount,
    challanDate,
    location,
    sectionReference
  }
}

// Authenticity Verification Engine
function verifyChallan({ vehicleNumber, violation, fineAmount, challanDate }) {
  if (!vehicleNumber || vehicleNumber === 'Unknown' || !violation || fineAmount === null || fineAmount === undefined || !challanDate) {
    return 'Incomplete'
  }

  const plateRegex = /^[A-Z]{2}[-]?\d{2}[-]?[A-Z]{1,3}[-]?\d{4}$/i
  const cleanPlate = vehicleNumber.replace(/[\s-]/g, '')
  const isPlateValid = plateRegex.test(cleanPlate)

  const parsedFine = Number(fineAmount)
  const isFineValid = !isNaN(parsedFine) && parsedFine > 0 && parsedFine <= 100000

  const parsedDate = new Date(challanDate)
  const now = new Date()
  const isDateValid = !isNaN(parsedDate.getTime()) && parsedDate.getTime() <= now.getTime() + 24 * 60 * 60 * 1000

  if (!isPlateValid || !isFineValid || !isDateValid) {
    return 'Suspicious'
  }

  return 'Verified'
}

// Due Date Engine & status banding
function calculateDueDates(challanDate) {
  const baseDate = new Date(challanDate)
  const dueDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  const daysRemaining = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  let status = 'Pending'
  if (daysRemaining < 0) {
    status = 'Overdue'
  } else if (daysRemaining <= 7) {
    status = 'Due Soon'
  }

  const nextReminderDate = new Date(Math.min(dueDate.getTime(), Date.now() + 3 * 24 * 60 * 60 * 1000))

  return {
    dueDate,
    daysRemaining,
    status,
    nextReminderDate
  }
}

async function handleChallanOcr(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required (image or PDF).' })
    }

    const userId = req.user?.userId || req.body?.userId
    const fileUrl = req.body?.fileUrl || null

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const { text, confidence } = await extractTextFromFile({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      filename: req.file.originalname,
    })

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'extractedText is required.' })
    }

    const confidenceResult = evaluateConfidence({ text, confidence })
    const matchedRule = await matchTrafficRule(text)
    
    // Parse OCR details
    const parsed = parseOcrText(text, matchedRule)
    
    // Run Authenticity Verification
    const verificationStatus = verifyChallan({
      vehicleNumber: parsed.vehicleNumber,
      violation: parsed.violation,
      fineAmount: parsed.fineAmount,
      challanDate: parsed.challanDate
    })
    
    // Calculate Due Dates and Status
    const dates = calculateDueDates(parsed.challanDate)

    // Enhancements Part A (Step 2, 3, 4, 5, 6)
    const challanClassification = detectChallanClassification(text)
    const violationCategory = determineViolationCategory(parsed.violation, text)
    const severity = calculateSeverity(parsed.fineAmount)
    const driverExplanation = generateDriverExplanation(violationCategory, parsed.fineAmount)

    // Repeat Offender Heuristic Query (Step 6)
    let repeatOffender = false
    try {
      const activeSameSnap = await db.collection('challanReports')
        .where('userId', '==', userId)
        .where('violation', '==', parsed.violation)
        .where('status', '!=', 'Paid')
        .get()
      
      // If there's already at least 1 unpaid same violation in DB, this new one makes it a repeat offense
      if (activeSameSnap.size >= 1) {
        repeatOffender = true
      }
    } catch (e) {
      console.warn('Failed to verify repeat offender status:', e.message)
    }

    const payload = {
      userId,
      vehicleNumber: parsed.vehicleNumber,
      violation: parsed.violation,
      fineAmount: parsed.fineAmount || 0,
      challanDate: parsed.challanDate.toISOString(),
      dueDate: dates.dueDate.toISOString(),
      daysRemaining: dates.daysRemaining,
      status: dates.status,
      verificationStatus,
      location: parsed.location,
      sectionReference: parsed.sectionReference,
      fileUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      nextReminderDate: dates.nextReminderDate.toISOString(),
      
      // Part A Enhancements parameters
      challanClassification,
      violationCategory,
      severity,
      driverExplanation,
      repeatOffender,

      // Keep legacy properties in case other engines check them
      extractedText: text,
      confidence: confidenceResult.confidence,
      confidenceLevel: confidenceResult.confidenceLevel,
      requiresVerification: confidenceResult.requiresVerification,
      matchedRule,
    }

    const docRef = await db.collection('challanReports').add(payload)

    // PART B: Notification Triggers (Step 9)
    // 1. New Challan Alert
    await db.collection('notifications').add({
      userId,
      title: 'New Challan Logged',
      message: `A new challan of ₹${payload.fineAmount} has been registered for ${payload.vehicleNumber}.`,
      type: 'CHALLAN_NEW',
      isRead: false,
      createdAt: new Date().toISOString()
    })

    // 2. High Severity Alert
    if (severity === 'High' || severity === 'Critical') {
      await db.collection('notifications').add({
        userId,
        title: 'High Severity Citation',
        message: `An urgent ${severity.toUpperCase()} severity violation (${payload.violationCategory}) has been scanned.`,
        type: 'SEVERITY_HIGH',
        isRead: false,
        createdAt: new Date().toISOString()
      })
    }

    // 3. Repeat Offender Alert
    if (repeatOffender) {
      await db.collection('notifications').add({
        userId,
        title: 'Repeat Offender Flagged',
        message: `Multiple unpaid infractions detected for: "${payload.violation}". Rectify immediately.`,
        type: 'REPEAT_OFFENDER',
        isRead: false,
        createdAt: new Date().toISOString()
      })
    }

    // 4. Due soon checks (Step 9)
    if (dates.status === 'Due Soon') {
      await db.collection('notifications').add({
        userId,
        title: 'Challan Due Soon',
        message: `Infraction payment is due inside 7 days. Pay immediately to prevent court escalations.`,
        type: 'CHALLAN_DUE',
        isRead: false,
        createdAt: new Date().toISOString()
      })
    } else if (dates.status === 'Overdue') {
      await db.collection('notifications').add({
        userId,
        title: 'Challan Overdue',
        message: `Citations payment is OVERDUE. Settle immediately to avoid vehicle suspension.`,
        type: 'CHALLAN_OVERDUE',
        isRead: false,
        createdAt: new Date().toISOString()
      })
    }

    // Recalculate Trust Score (Step 12)
    try {
      await recalculateUserTrustScore(userId)
    } catch (trustErr) {
      console.warn('Failed to recalculate trust score after challan OCR:', trustErr.message)
    }

    return res.json({
      id: docRef.id,
      ...payload,
    })
  } catch (error) {
    console.error('Challan OCR error:', error)
    return res.status(500).json({ error: error.message || 'Failed to process challan OCR.' })
  }
}

module.exports = {
  handleChallanOcr,
}
