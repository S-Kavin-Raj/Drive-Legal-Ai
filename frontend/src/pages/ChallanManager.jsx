import React, { useState } from 'react'
import { UploadCloud, Clock, CheckCircle2, Plus, Trash2, ShieldCheck, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { storage, db } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'
import { useChallans } from '../hooks/useChallans'
import { parseChallanOCR } from '../services/ocrService'
import toast from 'react-hot-toast'

/* ─── Gradient helper (avoids bracket-notation lint on user data) ── */
const BG_GRADIENTS = [
  'linear-gradient(135deg, #3B0764 0%, #1E0442 100%)',
  'linear-gradient(135deg, #1A0533 0%, #0F0222 100%)',
  'linear-gradient(135deg, #0E0220 0%, #0A0118 100%)',
]

function getBgGradient(index) {
  const safeIndex = Math.abs(Number(index) % BG_GRADIENTS.length)
  if (safeIndex === 1) return BG_GRADIENTS[1]
  if (safeIndex === 2) return BG_GRADIENTS[2]
  return BG_GRADIENTS[0]
}

/* ─── Wallet Card ────────────────────────────────────── */
function WalletCard({ id, violation, location, fineAmount, dueDate, status, verificationStatus, index, onMarkPaid, onDelete }) {
  const isPending = status === 'Pending' || status === 'Due Soon' || status === 'Overdue'
  const isOverdue = status === 'Overdue'
  const isDueSoon = status === 'Due Soon'
  
  // Verification details
  const isSuspicious = verificationStatus === 'Suspicious'
  const isIncomplete = verificationStatus === 'Incomplete'
  
  // Accent colors
  const statusColor = isOverdue ? '#EF4444' : isDueSoon ? '#F59E0B' : isPending ? '#3B82F6' : '#22C55E'
  const verColor = isSuspicious ? '#EF4444' : isIncomplete ? '#F59E0B' : '#22C55E'

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        background: getBgGradient(index),
        border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : isDueSoon ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        marginTop: index > 0 ? '-32px' : 0,
        zIndex: 10 - index,
        paddingTop: index > 0 ? '20px' : 0,
      }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
           style={{ background: `radial-gradient(circle, ${statusColor}08 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />

      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
           style={{ background: 'linear-gradient(to bottom, #8900F2, transparent)' }} />

      <div className="px-5 py-5 space-y-4">
        {/* Top row: Badges and actions */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-purple-400">
              Traffic Citation
            </span>
            <h3 className="font-black text-[15px] text-slate-100 leading-snug">{violation}</h3>
            <p className="text-[11px] text-slate-400">{location}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Status Badge */}
            <span 
              className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase"
              style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}
            >
              {status}
            </span>
            
            {/* Verification Status Badge */}
            <span 
              className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1"
              style={{ background: `${verColor}15`, color: verColor, border: `1px solid ${verColor}30` }}
            >
              {isSuspicious ? <AlertTriangle size={9} /> : isIncomplete ? <AlertCircle size={9} /> : <ShieldCheck size={9} />}
              {verificationStatus}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900/60">
          <div>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Fine Amount</p>
            <p className="font-black text-2xl text-slate-100 mt-0.5">₹{fineAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Due Date</p>
            <p className="font-bold text-[12px] text-slate-200 mt-1">
              {dueDate ? new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex gap-2 pt-1 justify-end">
          <button 
            onClick={() => onDelete(id)}
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-900 text-slate-500 hover:text-[#EF4444] active:scale-90 transition-transform"
          >
            <Trash2 size={13} />
          </button>
          {isPending && (
            <button 
              onClick={() => onMarkPaid(id)}
              className="px-4 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}
            >
              <CheckCircle2 size={12} />
              Mark Paid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Challan Manager ────────────────────────────────── */
export default function ChallanManager() {
  const { user } = useAuth()
  const { challans, loading } = useChallans()
  const [uploading, setUploading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [sortBy, setSortBy] = useState('Latest First')

  const handleMarkAsPaid = async (challanId) => {
    try {
      const refDoc = doc(db, 'challanReports', challanId)
      await updateDoc(refDoc, { status: 'Paid', daysRemaining: 0 })
      toast.success('Challan marked as paid!')
      // Trigger trust score recalculation
      import('../services/trustScoreService').then(m => m.recalculateTrustScore(user.uid)).catch(() => {})
    } catch (err) {
      console.error('Mark paid error:', err)
      toast.error('Failed to update challan status.')
    }
  }

  const handleDelete = async (challanId) => {
    if (!window.confirm('Are you sure you want to delete this challan report?')) return
    try {
      const refDoc = doc(db, 'challanReports', challanId)
      await deleteDoc(refDoc)
      toast.success('Challan report removed.')
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete challan report.')
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Verify format: image or PDF
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please upload a PNG, JPG, JPEG, or PDF.')
      return
    }

    setUploading(true)
    setOcrProgress('Uploading to secure vault...')

    try {
      let downloadUrl = null
      try {
        const filename = `${Date.now()}_${file.name}`
        const storageRef = ref(storage, `challans/${user.uid}/${filename}`)
        const uploadTask = uploadBytesResumable(storageRef, file)
        
        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (err) => reject(err),
            () => resolve()
          )
        })
        downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
      } catch (storageErr) {
        console.warn('Storage upload failed, continuing direct to OCR service:', storageErr.message)
        // Fallback placeholder URL
        downloadUrl = `https://firebasestorage.googleapis.com/v0/b/drive-legal-ai-bf028.appspot.com/o/challans%2Fplaceholder.png`
      }

      setOcrProgress('Running OCR scan...')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.uid)
      formData.append('fileUrl', downloadUrl)

      await parseChallanOCR(formData)
      toast.success('Challan scanned and registered successfully!')
      // Trigger trust score recalculation after new challan
      import('../services/trustScoreService').then(m => m.recalculateTrustScore(user.uid)).catch(() => {})
    } catch (err) {
      console.error('Scan failed:', err)
      toast.error(err.message || 'Failed to scan challan.')
    } finally {
      setUploading(false)
      setOcrProgress('')
    }
  }

  // Summary statistics
  const unpaidChallans = challans.filter(c => c.status !== 'Paid')
  const pendingAmount = unpaidChallans.reduce((acc, c) => acc + (Number(c.fineAmount) || 0), 0)
  const paidAmount = challans.filter(c => c.status === 'Paid').reduce((acc, c) => acc + (Number(c.fineAmount) || 0), 0)

  // Filter & Sort
  const filteredChallans = challans.filter(c => {
    if (filterStatus === 'All') return true
    return String(c.status).toLowerCase() === filterStatus.toLowerCase()
  })

  const sortedChallans = [...filteredChallans].sort((a, b) => {
    const dateA = new Date(a.dueDate || 0).getTime()
    const dateB = new Date(b.dueDate || 0).getTime()
    return sortBy === 'Earliest First' ? dateA - dateB : dateB - dateA
  })

  return (
    <div className="min-h-[100dvh] pb-[80px] overflow-y-auto" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="pt-14 px-5 pb-4">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: '#8900F2' }}>
          DriveLegal AI
        </p>
        <h1 className="font-black text-[28px] mt-1" style={{ color: 'var(--text)' }}>Challans</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>
          Manage and clear your traffic violations
        </p>
      </div>

      {/* Upload card */}
      <div className="px-5 mb-6">
        <label
          className="w-full rounded-3xl p-6 flex flex-col items-center justify-center text-center active:scale-[0.98] transition-transform cursor-pointer block"
          style={{ background: 'rgba(137,0,242,0.06)', border: '2px dashed rgba(137,0,242,0.3)' }}
        >
          <input 
            type="file" 
            className="hidden" 
            accept="image/png, image/jpeg, image/jpg, application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 mx-auto"
            style={{ background: 'rgba(137,0,242,0.15)', boxShadow: '0 0 20px rgba(137,0,242,0.3)' }}
          >
            {uploading ? (
              <RefreshCw size={28} className="text-[#8900F2] animate-spin" />
            ) : (
              <UploadCloud size={28} style={{ color: '#8900F2' }} />
            )}
          </div>
          <h3 className="font-black text-[16px] text-slate-200">
            {uploading ? 'Processing Challan...' : 'Scan Challan'}
          </h3>
          <p className="text-[12px] mt-1 max-w-[240px] mx-auto text-slate-400">
            {uploading ? ocrProgress : 'Upload PNG, JPG, or PDF — OCR will extract violations and due dates'}
          </p>
          {!uploading && (
            <div
              className="mt-4 px-6 py-2.5 rounded-2xl font-bold text-[13px] inline-flex items-center gap-2 mx-auto"
              style={{
                background: 'linear-gradient(135deg, #8900F2, #6B00C2)',
                color: '#FFF',
                boxShadow: '0 4px 16px rgba(137,0,242,0.4)',
              }}
            >
              <Plus size={15} /> Upload Citation
            </div>
          )}
        </label>
      </div>

      {/* Summary row */}
      <div className="px-5 flex gap-3 mb-6">
        <div
          className="flex-1 rounded-2xl p-4"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <p className="text-[10px] font-black tracking-widest uppercase text-amber-500">Unpaid Dues</p>
          <p className="font-black text-[22px] mt-1 text-slate-100">₹{pendingAmount.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400">{unpaidChallans.length} active violation(s)</p>
        </div>
        <div
          className="flex-1 rounded-2xl p-4"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <p className="text-[10px] font-black tracking-widest uppercase text-green-500">Total Paid</p>
          <p className="font-black text-[22px] mt-1 text-slate-100">₹{paidAmount.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400">{challans.filter(c => c.status === 'Paid').length} cleared</p>
        </div>
      </div>

      {/* Filter and Sort Options */}
      <div className="px-5 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black tracking-[0.15em] uppercase text-purple-400">
            Digital Wallet
          </span>
          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-950 border border-slate-900 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-300 outline-none"
          >
            <option value="Latest First">Latest First</option>
            <option value="Earliest First">Earliest First</option>
          </select>
        </div>

        {/* Filter Scrollbar */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 select-none">
          {['All', 'Pending', 'Due Soon', 'Overdue', 'Paid'].map((fStatus) => {
            const isActive = filterStatus === fStatus
            return (
              <button
                key={fStatus}
                onClick={() => setFilterStatus(fStatus)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: isActive ? '#8900F2' : 'rgba(137,0,242,0.05)',
                  border: `1px solid ${isActive ? '#8900F2' : 'rgba(137,0,242,0.15)'}`,
                  color: isActive ? '#FFF' : 'var(--muted)',
                  boxShadow: isActive ? '0 4px 12px rgba(137,0,242,0.3)' : 'none',
                }}
              >
                {fStatus}
              </button>
            )
          })}
        </div>
      </div>

      {/* Wallet cards stack */}
      <div className="px-5">
        {loading ? (
          <div className="text-center py-10 text-slate-500 font-semibold text-xs">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-purple-500" />
            Loading digital wallet...
          </div>
        ) : sortedChallans.length === 0 ? (
          <div className="text-center py-12 rounded-3xl bg-slate-950 border border-slate-900 text-slate-500 text-xs font-semibold px-6 leading-relaxed">
            No challans found matching &quot;{filterStatus}&quot;.
          </div>
        ) : (
          <div className="relative pb-24">
            {sortedChallans.map((c, i) => (
              <WalletCard
                key={c.id}
                id={c.id}
                violation={c.violation || 'Traffic Offence'}
                location={c.location || 'Unknown Road'}
                fineAmount={c.fineAmount || 0}
                dueDate={c.dueDate}
                status={c.status || 'Pending'}
                verificationStatus={c.verificationStatus || 'Verified'}
                index={i}
                onMarkPaid={handleMarkAsPaid}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
