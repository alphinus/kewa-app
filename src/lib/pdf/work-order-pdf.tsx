/**
 * Work Order PDF Template
 *
 * A4 format PDF document for work orders sent to contractors.
 * Uses @react-pdf/renderer for server-side PDF generation.
 *
 * German text throughout matching KEWA AG branding.
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { WorkOrderPDFData } from '@/types/work-order'

// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.4
  },

  // Header
  header: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1a365d',
    borderBottomStyle: 'solid'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a365d'
  },
  documentType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  headerMetaItem: {
    fontSize: 9,
    color: '#666'
  },

  // Title section
  titleSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 4
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 4
  },
  description: {
    fontSize: 10,
    color: '#4a5568'
  },

  // Grid layout
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  gridHalf: {
    width: '48%'
  },

  // Section
  section: {
    marginBottom: 18
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  // Field
  field: {
    marginBottom: 6
  },
  label: {
    fontSize: 9,
    color: '#718096',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  value: {
    fontSize: 11,
    color: '#2d3748'
  },
  valueStrong: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a365d'
  },

  // Scope box
  scopeBox: {
    padding: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 4,
    marginTop: 4
  },
  scopeText: {
    fontSize: 10,
    color: '#2d3748',
    lineHeight: 1.6
  },

  // Deadline highlight
  deadlineBox: {
    padding: 10,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fc8181',
    borderStyle: 'solid',
    borderRadius: 4,
    marginTop: 4
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#c53030'
  },

  // Cost highlight
  costBox: {
    padding: 10,
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#68d391',
    borderStyle: 'solid',
    borderRadius: 4,
    marginTop: 4
  },
  costLabel: {
    fontSize: 9,
    color: '#276749',
    marginBottom: 2
  },
  costValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22543d'
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid'
  },
  footerText: {
    fontSize: 9,
    color: '#a0aec0',
    textAlign: 'center',
    marginBottom: 4
  },
  footerInstruction: {
    fontSize: 10,
    color: '#4a5568',
    textAlign: 'center',
    fontStyle: 'italic'
  }
})

// =============================================
// PDF DOCUMENT COMPONENT
// =============================================

interface WorkOrderPDFProps {
  data: WorkOrderPDFData
}

/**
 * Work Order PDF Document
 *
 * Renders a professional A4 document with:
 * - KEWA AG header and branding
 * - Location details (building, unit, room)
 * - Work scope description
 * - Schedule and deadline
 * - Cost estimate
 * - Footer with instructions
 */
function WorkOrderPDFDocument({ data }: WorkOrderPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>KEWA AG</Text>
            <Text style={styles.documentType}>Arbeitsauftrag</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaItem}>
              Auftrag-Nr: {data.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.headerMetaItem}>
              Erstellt: {data.generated_at}
            </Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{data.title}</Text>
          {data.description && (
            <Text style={styles.description}>{data.description}</Text>
          )}
        </View>

        {/* Two-column layout: Location & Contractor */}
        <View style={styles.grid}>
          {/* Location */}
          <View style={styles.gridHalf}>
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Standort</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Liegenschaft</Text>
                <Text style={styles.valueStrong}>{data.building_name}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Adresse</Text>
                <Text style={styles.value}>{data.building_address}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Wohnung / Raum</Text>
                <Text style={styles.value}>
                  {data.unit_name} - {data.room_name}
                </Text>
              </View>
            </View>
          </View>

          {/* Contractor */}
          <View style={styles.gridHalf}>
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Auftragnehmer</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Firma</Text>
                <Text style={styles.valueStrong}>{data.company_name}</Text>
              </View>
              {data.contact_name && (
                <View style={styles.field}>
                  <Text style={styles.label}>Ansprechpartner</Text>
                  <Text style={styles.value}>{data.contact_name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Scope of Work */}
        {data.scope_of_work && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Arbeitsumfang</Text>
            <View style={styles.scopeBox}>
              <Text style={styles.scopeText}>{data.scope_of_work}</Text>
            </View>
          </View>
        )}

        {/* Schedule & Cost */}
        <View style={styles.grid}>
          {/* Schedule */}
          <View style={styles.gridHalf}>
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Zeitplan</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Gewuenschter Beginn</Text>
                <Text style={styles.value}>
                  {data.requested_start || 'Nach Vereinbarung'}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Gewuenschtes Ende</Text>
                <Text style={styles.value}>
                  {data.requested_end || 'Nach Vereinbarung'}
                </Text>
              </View>
            </View>
          </View>

          {/* Cost */}
          <View style={styles.gridHalf}>
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Kosten</Text>
              {data.estimated_cost !== null ? (
                <View style={styles.costBox}>
                  <Text style={styles.costLabel}>Geschaetzte Kosten</Text>
                  <Text style={styles.costValue}>
                    CHF {data.estimated_cost.toLocaleString('de-CH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Text>
                </View>
              ) : (
                <View style={styles.field}>
                  <Text style={styles.value}>Auf Anfrage</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Deadline */}
        {data.acceptance_deadline && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Antwortfrist</Text>
            <View style={styles.deadlineBox}>
              <Text style={styles.deadlineText}>
                Bitte antworten Sie bis: {data.acceptance_deadline}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerInstruction}>
            Bitte antworten Sie auf diese Anfrage über den Link in der Email.
          </Text>
          <Text style={styles.footerText}>
            KEWA AG - Liegenschaftsverwaltung
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// =============================================
// PDF GENERATION FUNCTIONS
// =============================================

/**
 * Format a date string in Swiss German format (dd.MM.yyyy)
 */
function formatSwissDate(dateString: string | null): string | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    return format(date, 'dd.MM.yyyy', { locale: de })
  } catch {
    return null
  }
}

/**
 * Format a datetime string in Swiss German format (dd.MM.yyyy HH:mm)
 */
function formatSwissDateTime(dateString: string | null): string | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    return format(date, 'dd.MM.yyyy HH:mm', { locale: de })
  } catch {
    return null
  }
}

/**
 * Transform WorkOrderWithRelations to WorkOrderPDFData
 */
export function transformToPDFData(workOrder: {
  id: string
  title: string
  description: string | null
  scope_of_work: string | null
  requested_start_date: string | null
  requested_end_date: string | null
  acceptance_deadline: string | null
  estimated_cost: number | null
  room?: {
    id: string
    name: string
    room_type: string
    unit?: {
      id: string
      name: string
      building?: {
        id: string
        name: string
        address: string
      }
    } | null
  } | null
  partner?: {
    id: string
    company_name: string
    contact_name: string | null
    email: string
  } | null
}): WorkOrderPDFData {
  return {
    id: workOrder.id,
    title: workOrder.title,
    description: workOrder.description,

    // Location
    building_name: workOrder.room?.unit?.building?.name || 'Nicht angegeben',
    building_address: workOrder.room?.unit?.building?.address || 'Nicht angegeben',
    unit_name: workOrder.room?.unit?.name || 'Nicht angegeben',
    room_name: workOrder.room?.name || 'Nicht angegeben',

    // Contractor
    company_name: workOrder.partner?.company_name || 'Nicht angegeben',
    contact_name: workOrder.partner?.contact_name || null,

    // Content
    scope_of_work: workOrder.scope_of_work,

    // Dates
    requested_start: formatSwissDate(workOrder.requested_start_date),
    requested_end: formatSwissDate(workOrder.requested_end_date),
    acceptance_deadline: formatSwissDateTime(workOrder.acceptance_deadline),

    // Cost
    estimated_cost: workOrder.estimated_cost,

    // Generated timestamp
    generated_at: format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })
  }
}

/**
 * Generate work order PDF as Buffer
 *
 * @param workOrder - Work order with relations from database
 * @returns PDF as Buffer for HTTP response
 */
export async function generateWorkOrderPDF(workOrder: Parameters<typeof transformToPDFData>[0]): Promise<Buffer> {
  const pdfData = transformToPDFData(workOrder)
  const buffer = await renderToBuffer(<WorkOrderPDFDocument data={pdfData} />)
  return Buffer.from(buffer)
}

// Export component for testing
export { WorkOrderPDFDocument }
