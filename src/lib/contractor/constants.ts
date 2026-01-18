/**
 * Contractor Portal Constants
 *
 * Shared constants for contractor portal components and API routes.
 * Includes rejection reasons as defined in EXT-07.
 */

// ============================================
// REJECTION REASONS (EXT-07)
// ============================================

export interface RejectionReason {
  id: string
  label: string
  description: string
}

/**
 * Predefined rejection reasons for contractors.
 * "other" option allows custom reason input.
 */
export const REJECTION_REASONS: readonly RejectionReason[] = [
  {
    id: 'capacity',
    label: 'Kapazitaet',
    description: 'Keine freie Kapazitaet im Zeitraum',
  },
  {
    id: 'location',
    label: 'Standort',
    description: 'Standort zu weit entfernt',
  },
  {
    id: 'scope',
    label: 'Arbeitsumfang',
    description: 'Arbeitsumfang nicht passend',
  },
  {
    id: 'timeline',
    label: 'Zeitrahmen',
    description: 'Zeitrahmen nicht realisierbar',
  },
  {
    id: 'price',
    label: 'Budget',
    description: 'Budget nicht ausreichend',
  },
  {
    id: 'other',
    label: 'Sonstiges',
    description: 'Sonstiges (bitte angeben)',
  },
] as const

export type RejectionReasonId = (typeof REJECTION_REASONS)[number]['id']

/**
 * Get rejection reason by ID
 */
export function getRejectionReasonById(id: string): RejectionReason | undefined {
  return REJECTION_REASONS.find((r) => r.id === id)
}

// ============================================
// COUNTER-OFFER STATUS
// ============================================

export type CounterOfferStatus = 'pending' | 'approved' | 'rejected'

export const COUNTER_OFFER_STATUS_LABELS: Record<CounterOfferStatus, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
}

// ============================================
// RESPONSE ACTIONS
// ============================================

export type ResponseAction = 'accept' | 'reject' | 'counter_offer'

export const RESPONSE_ACTION_LABELS: Record<ResponseAction, string> = {
  accept: 'Annehmen',
  reject: 'Ablehnen',
  counter_offer: 'Gegenangebot',
}
