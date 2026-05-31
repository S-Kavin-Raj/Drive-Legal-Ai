const path = require('path')
const pdfParse = require('pdf-parse')
const { createWorker } = require('tesseract.js')

const OCR_LANGUAGE = process.env.OCR_LANGUAGE || 'eng'

async function ocrImage(buffer) {
  const worker = await createWorker()
  try {
    await worker.loadLanguage(OCR_LANGUAGE)
    await worker.initialize(OCR_LANGUAGE)
    const { data } = await worker.recognize(buffer)
    return {
      text: data.text || '',
      confidence: data.confidence,
    }
  } finally {
    await worker.terminate()
  }
}

function estimateConfidenceFromText(text) {
  const safeText = String(text || '')
  if (!safeText.trim()) return 0

  const length = safeText.length
  const alphaCount = safeText.replace(/[^a-zA-Z]/g, '').length
  const alphaRatio = alphaCount / Math.max(1, length)
  const lengthFactor = Math.log10(length + 1) * 12
  const ratioFactor = alphaRatio * 60

  const score = Math.round(20 + ratioFactor + lengthFactor)
  return Math.max(10, Math.min(95, score))
}

async function extractTextFromPdf(buffer) {
  const parsed = await pdfParse(buffer)
  const text = parsed.text || ''
  const confidence = estimateConfidenceFromText(text)
  return { text, confidence }
}

async function extractTextFromFile({ buffer, mimetype, filename }) {
  if (!buffer) {
    throw new Error('File buffer is required for OCR extraction.')
  }

  const safeMime = String(mimetype || '').toLowerCase()
  const extension = path.extname(filename || '').toLowerCase()

  const isPdf = safeMime.includes('pdf') || extension === '.pdf'
  const isImage = safeMime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'].includes(extension)

  if (isPdf) {
    return extractTextFromPdf(buffer)
  }

  if (isImage) {
    return ocrImage(buffer)
  }

  throw new Error('Unsupported file type. Upload a PDF or image for OCR processing.')
}

module.exports = {
  extractTextFromFile,
}
