import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db, storage } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'
import { useComplianceProfile } from '../hooks/useComplianceProfile'
import { useCompliance } from '../hooks/useCompliance'
import { uploadDocument, evaluateCompliance as triggerBackendEvaluate } from '../services/complianceService'
import { Shield, FileText, ArrowLeft, Upload, Calendar, Clock, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const DOCUMENT_LABELS = {
  license: 'Driving License',
  rc: 'Registration Certificate (RC)',
  insurance: 'Insurance Certificate',
  puc: 'PUC Certificate',
  fc: 'Fitness Certificate (FC)'
}

const VEHICLE_DOCS = {
  bike: ['license', 'insurance', 'puc'],
  car: ['license', 'rc', 'insurance', 'puc'],
  commercial: ['license', 'rc', 'insurance', 'puc', 'fc']
}

export default function DocumentVault() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { vehicleType } = useComplianceProfile()
  const { refresh: refreshCompliance } = useCompliance()

  const [dbDocs, setDbDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploadingType, setUploadingType] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [expiryDate, setExpiryDate] = useState('')
  const fileInputRef = useRef(null)

  // Fetch documents for the authenticated user from Firestore
  useEffect(() => {
    if (!user?.uid) return

    setLoadingDocs(true)
    const q = query(
      collection(db, 'documents'),
      where('userId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Deduplicate by type, keeping the latest uploaded document
      const latestByType = {}
      all.forEach(doc => {
        const type = doc.type
        const existing = latestByType[type]
        if (!existing) {
          latestByType[type] = doc
        } else {
          const existingTime = existing.uploadedAt?.seconds || 0
          const incomingTime = doc.uploadedAt?.seconds || 0
          if (incomingTime >= existingTime) {
            latestByType[type] = doc
          }
        }
      })
      setDbDocs(Object.values(latestByType))
      setLoadingDocs(false)
    }, (err) => {
      console.error('[DocumentVault] Snapshot error:', err)
      setLoadingDocs(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  const requiredTypes = VEHICLE_DOCS[vehicleType] || VEHICLE_DOCS.car

  function getDocRecord(type) {
    return dbDocs.find(d => d.type === type)
  }

  function getStatusLabel(record) {
    if (!record) return 'Missing'
    const status = record.status || 'Valid'
    
    // Check local expiry check
    if (record.expiryDate) {
      const daysLeft = Math.ceil((new Date(record.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) return 'Expired'
      if (daysLeft <= 30) return 'Expiring Soon'
    }
    return status
  }

  function getStatusColor(status) {
    if (status === 'Valid') return '#22C55E'
    if (status === 'Expiring Soon') return '#F59E0B'
    if (status === 'Expired') return '#EF4444'
    return '#667085'
  }

  function handleTriggerUpload(type) {
    setUploadingType(type)
    setExpiryDate('')
    setUploadProgress(0)
    // Wait for the modal or input selection to trigger
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    }, 50)
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!expiryDate) {
      toast.error('Please specify the document expiry date first.')
      // Reset input
      e.target.value = ''
      return
    }

    const type = uploadingType
    setUploadProgress(1)

    try {
      // 1. Upload to Firebase Storage
      const storagePath = `vault/${user.uid}/${type}_${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          setUploadProgress(progress)
        }, 
        (err) => {
          console.error('[DocumentVault] Storage upload failed:', err)
          toast.error('Upload failed. Please try again.')
          setUploadingType(null)
        }, 
        async () => {
          const fileUrl = await getDownloadURL(uploadTask.snapshot.ref)

          // 2. Save metadata in Firestore
          // Calculate if already expired or expiring soon
          const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          const docStatus = daysLeft < 0 ? 'Expired' : 'Valid'

          await uploadDocument({
            userId: user.uid,
            type,
            expiryDate,
            fileUrl,
            status: docStatus
          })

          // 3. Trigger backend compliance evaluation
          try {
            await triggerBackendEvaluate(user.uid)
          } catch (evalErr) {
            console.warn('[DocumentVault] Evaluation trigger failed, will re-eval on dashboard load:', evalErr)
          }

          toast.success(`${DOCUMENT_LABELS[type]} uploaded successfully!`)
          setUploadingType(null)
          setUploadProgress(0)
          // Refresh the local compliance hook state
          refreshCompliance()
          // Recalculate trust score after document change
          import('../services/trustScoreService').then(m => m.recalculateTrustScore(user.uid)).catch(() => {})
        }
      )
    } catch (err) {
      console.error('[DocumentVault] Upload handler failed:', err)
      toast.error('Failed to initialize document upload.')
      setUploadingType(null)
    }
  }

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Background neon ambient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Header ─────────────────────────────────── */}
      <header className="pt-12 px-5 pb-4 flex items-center justify-between z-10 glass border-b border-slate-900/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(137,0,242,0.12)', border: '1px solid rgba(137,0,242,0.22)' }}
          >
            <ArrowLeft size={16} style={{ color: '#8900F2' }} />
          </button>
          <div>
            <h1 className="font-black text-[18px] leading-tight" style={{ color: 'var(--text)' }}>Document Vault</h1>
            <p className="text-[10px] font-semibold text-slate-450 uppercase tracking-[0.1em] mt-0.5">Secure Legal Credentials</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
          <Shield size={16} className="fill-purple-500/10" />
        </div>
      </header>

      {/* ── Scrollable Document List ────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-28 space-y-4 z-10">
        {loadingDocs ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-[#8900F2]" />
            <p className="text-[11px] font-bold uppercase tracking-wider">Syncing Document Status...</p>
          </div>
        ) : (
          requiredTypes.map((type) => {
            const record = getDocRecord(type)
            const status = getStatusLabel(record)
            const color = getStatusColor(status)

            return (
              <div
                key={type}
                className="glass-strong rounded-3xl p-5 relative overflow-hidden flex flex-col gap-4"
                style={{
                  border: `1px solid ${status === 'Missing' ? 'rgba(255,255,255,0.06)' : 'rgba(137,0,242,0.18)'}`,
                  boxShadow: status === 'Missing' ? 'none' : '0 4px 20px rgba(137,0,242,0.05)',
                }}
              >
                {/* Document Type Label + Status Pill */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                         style={{ background: status === 'Missing' ? 'rgba(255,255,255,0.04)' : 'rgba(137,0,242,0.12)' }}>
                      <FileText size={18} style={{ color: status === 'Missing' ? '#667085' : '#8900F2' }} />
                    </div>
                    <div>
                      <p className="font-bold text-[14px] text-slate-200">{DOCUMENT_LABELS[type]}</p>
                      <p className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold mt-0.5">Required</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
                    style={{
                      background: `${color}12`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ 
                        background: color,
                        boxShadow: status !== 'Missing' ? `0 0 6px ${color}` : 'none' 
                      }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                      {status}
                    </span>
                  </div>
                </div>

                {/* Document Stats / Expiry if exists */}
                {record && (
                  <div className="grid grid-cols-2 gap-3 py-1 text-left">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={13} style={{ color: '#8900F2' }} />
                      <div>
                        <span className="text-[9px] block text-slate-500 uppercase font-bold tracking-wider">Expiry Date</span>
                        <span className="text-xs font-semibold text-slate-350">{record.expiryDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock size={13} style={{ color: '#8900F2' }} />
                      <div>
                        <span className="text-[9px] block text-slate-500 uppercase font-bold tracking-wider">Uploaded At</span>
                        <span className="text-xs font-semibold text-slate-350">
                          {record.uploadedAt ? new Date(record.uploadedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Form Input / Actions */}
                <div className="flex flex-col gap-3 mt-1 pt-3 border-t border-slate-900/60">
                  {uploadingType === type ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          Specify Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-900 bg-black/40 text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#8900F2]/40 text-xs font-semibold"
                        />
                      </div>

                      {uploadProgress > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Uploading {uploadProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-[#8900F2]" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setUploadingType(null)}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-900 text-slate-400 font-semibold text-xs active:scale-95 transition-transform"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (!expiryDate) {
                                toast.error('Please enter the document expiry date first.')
                                return
                              }
                              if (fileInputRef.current) fileInputRef.current.click()
                            }}
                            className="flex-1 py-2.5 bg-[#8900F2] text-white rounded-xl text-xs font-bold uppercase tracking-wider active:scale-97 transition-transform"
                          >
                            Select Document File
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTriggerUpload(type)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#8900F2]/20 hover:border-[#8900F2]/40 bg-[#8900F2]/5 text-[#8900F2] font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all"
                    >
                      <Upload size={13} />
                      <span>{record ? 'Upload Update' : 'Upload Document'}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>

      {/* Hidden File Input Selector */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,image/*"
        className="hidden"
      />

    </div>
  )
}
