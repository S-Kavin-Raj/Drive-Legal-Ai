const express = require('express')
const multer = require('multer')
const { handleChallanOcr } = require('../controllers/challanController')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.CHALLAN_OCR_MAX_FILE_MB || 8) * 1024 * 1024,
  },
})

router.post('/', requireAuth, upload.single('file'), handleChallanOcr)

module.exports = router
