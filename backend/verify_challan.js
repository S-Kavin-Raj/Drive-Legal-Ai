const path = require('path')
require('dotenv').config()

// Mock ocrService before requiring the controller so that it resolves to the mock
const ocrService = require('./services/ocrService')
ocrService.extractTextFromFile = async function({ buffer, mimetype, filename }) {
  console.log(`- Simulated OCR process on file "${filename}" (${mimetype})`)
  return {
    text: buffer.toString(),
    confidence: 92
  }
}

const { handleChallanOcr } = require('./controllers/challanController')
const { db } = require('./services/firebaseAdmin')

async function runTest() {
  console.log('=== STARTING AUTOMATED CHALLAN INTELLIGENCE ENGINE TESTS ===\n')

  const mockTextSample = `
    TRAFFIC POLICE NOTICE
    CHALLAN NO: CHE-8871629
    VEHICLE NO: TN-39-AB-1234
    DATE: 2026-05-25
    PLACE: Coimbatore Town Hall
    OFFENCE: Exceeding permissible speed limits (overspeeding)
    ACT SECTION: Sec 183
    FINE AMOUNT: Rs. 2,000
    Please pay within 30 days.
  `

  console.log('--- TEST CASE 1: Valid Citation OCR Parse & Save ---')
  
  const mockReq = {
    file: {
      buffer: Buffer.from(mockTextSample),
      mimetype: 'text/plain',
      originalname: 'challan_speeding.txt'
    },
    body: {
      userId: 'test-user-123',
      fileUrl: 'https://firebasestorage.googleapis.com/v0/b/drive-legal-ai-bf028/o/challans%2Ftest.png'
    }
  }

  let jsonResult = null
  const mockRes = {
    status: function(code) {
      console.log(`- Response Status Called: ${code}`)
      return this
    },
    json: function(data) {
      jsonResult = data
      return this
    }
  }

  await handleChallanOcr(mockReq, mockRes)

  if (jsonResult && jsonResult.id) {
    console.log('SUCCESS: Challan parsed and saved successfully.')
    console.log(`- Saved Document ID: ${jsonResult.id}`)
    console.log(`- Vehicle Number: ${jsonResult.vehicleNumber} (Expected: TN-39-AB-1234)`)
    console.log(`- Violation: ${jsonResult.violation} (Expected: Exceeding permissible speed limits (Over-speeding))`)
    console.log(`- Fine Amount: ₹${jsonResult.fineAmount} (Expected: 2000)`)
    console.log(`- Verification Status: ${jsonResult.verificationStatus} (Expected: Verified)`)
    console.log(`- Status: ${jsonResult.status} (Expected: Pending / Due Soon / Overdue)`)
    console.log(`- Location: ${jsonResult.location} (Expected: Coimbatore Town Hall)`)
    console.log(`- Section: ${jsonResult.sectionReference} (Expected: Sec 183)`)
    console.log(`- Days Remaining: ${jsonResult.daysRemaining} days`)
    console.log(`- Next Reminder Date: ${jsonResult.nextReminderDate}`)
  } else {
    console.error('FAIL: Challan processing failed.')
    if (jsonResult) console.error(jsonResult)
    process.exit(1)
  }

  console.log('\n--- TEST CASE 2: Suspicious Plate Verification ---')
  const suspiciousText = `
    TRAFFIC POLICE NOTICE
    VEHICLE NO: TN-39-DUMMYPLATE-1234
    FINE AMOUNT: Rs. 1,000
    DATE: 2026-05-25
  `
  mockReq.file.buffer = Buffer.from(suspiciousText)
  jsonResult = null

  await handleChallanOcr(mockReq, mockRes)

  if (jsonResult && jsonResult.id) {
    console.log(`- Saved Document ID: ${jsonResult.id}`)
    console.log(`- Vehicle Number: ${jsonResult.vehicleNumber}`)
    console.log(`- Verification Status: ${jsonResult.verificationStatus} (Expected: Suspicious)`)
  } else {
    console.error('FAIL: Suspicious case processing failed.')
    if (jsonResult) console.error(jsonResult)
    process.exit(1)
  }

  console.log('\n=== ALL CHALLAN INTELLIGENCE TESTS COMPLETED SUCCESSFULLY ===')
}

runTest().catch(err => {
  console.error('Unhandled test error:', err)
  process.exit(1)
})
