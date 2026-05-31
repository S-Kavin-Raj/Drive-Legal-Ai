import { useMemo } from 'react'
import { useUserProfile } from './useUserProfile'

/**
 * COMPLIANCE QUESTION DEFINITIONS PER VEHICLE TYPE
 * These are the canonical keys stored in Firestore under complianceProfile.
 */
export const COMPLIANCE_QUESTIONS = {
  bike: [
    { key: 'helmetAvailable',    label: 'Helmet Available?',    section: 177 },
    { key: 'licenseAvailable',   label: 'License Available?',   section: 3   },
    { key: 'insuranceAvailable', label: 'Insurance Available?', section: 146 },
    { key: 'pucAvailable',       label: 'PUC Available?',       section: 190 },
  ],
  car: [
    { key: 'licenseAvailable',   label: 'License Available?',   section: 3   },
    { key: 'rcAvailable',        label: 'RC Available?',        section: 39  },
    { key: 'insuranceAvailable', label: 'Insurance Available?', section: 146 },
    { key: 'pucAvailable',       label: 'PUC Available?',       section: 190 },
  ],
  commercial: [
    { key: 'licenseAvailable',   label: 'License Available?',   section: 3   },
    { key: 'rcAvailable',        label: 'RC Available?',        section: 39  },
    { key: 'insuranceAvailable', label: 'Insurance Available?', section: 146 },
    { key: 'pucAvailable',       label: 'PUC Available?',       section: 190 },
    { key: 'fcAvailable',        label: 'Fitness Certificate (FC) Available?', section: 56 },
  ],
}

/**
 * Safe accessor — avoids bracket-notation lint on Firestore vehicleType value.
 */
function getQuestionsForType(type) {
  if (type === 'bike') return COMPLIANCE_QUESTIONS.bike
  if (type === 'car') return COMPLIANCE_QUESTIONS.car
  if (type === 'commercial') return COMPLIANCE_QUESTIONS.commercial
  return []
}

/**
 * useComplianceProfile
 *
 * Derives the compliance score and status from the user's profile.
 * Depends on useUserProfile internally.
 *
 * Returns:
 * - complianceProfile: raw key/value object from Firestore
 * - complianceScore: number 0–100
 * - complianceStatus: 'Ready' | 'Partial' | 'Not Ready'
 * - questions: array of question definitions for the user's vehicle type
 * - loading / error: passthrough from useUserProfile
 */
export function useComplianceProfile() {
  const { profile, loading, error, refetch } = useUserProfile()

  const questions = useMemo(() => {
    const type = profile?.vehicleType
    if (!type) return []
    return getQuestionsForType(type)
  }, [profile?.vehicleType])

  const complianceScore = useMemo(() => {
    if (!profile?.complianceProfile || questions.length === 0) return 0
    const answered = questions.filter(
      (q) => Object.prototype.hasOwnProperty.call(profile.complianceProfile, q.key)
           && profile.complianceProfile[q.key] === true
    ).length
    return Math.round((answered / questions.length) * 100)
  }, [profile?.complianceProfile, questions])

  const complianceStatus = useMemo(() => {
    if (complianceScore === 100) return 'Ready'
    if (complianceScore >= 50) return 'Partial'
    return 'Not Ready'
  }, [complianceScore])

  return {
    complianceProfile: profile?.complianceProfile ?? {},
    complianceScore,
    complianceStatus,
    questions,
    vehicleType: profile?.vehicleType ?? null,
    loading,
    error,
    refetch,
  }
}
