/**
 * Change Order PDF Template
 *
 * A4 format PDF document for change orders.
 * Uses @react-pdf/renderer for server-side PDF generation.
 *
 * German text throughout matching KEWA AG branding.
 * Phase 21-03: Photo Evidence and PDF Generation
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { ChangeOrderLineItem } from '@/types/change-orders'

// =============================================
// TYPES
// =============================================

export interface ChangeOrderPDFData {
  co_number: string
  description: string
  reason_category: string // German label
  work_order_reference: string
  schedule_impact_days: number
  status: string // German label
  line_items: ChangeOrderLineItem[]
  total_amount: number
  created_at: string
  generated_at: string
}

// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.4,
  },

  // Header
  header: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1a365d',
    borderBottomStyle: 'solid',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  documentType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerMetaItem: {
    fontSize: 9,
    color: '#666',
  },

  // Metadata section
  metaSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 9,
    color: '#718096',
    width: '40%',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 11,
    color: '#2d3748',
    width: '60%',
  },

  // Section
  section: {
    marginBottom: 18,
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
    letterSpacing: 0.5,
  },

  // Description box
  descriptionBox: {
    padding: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 4,
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 10,
    color: '#2d3748',
    lineHeight: 1.6,
  },

  // Line items table
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#1a365d',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a365d',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableCellText: {
    fontSize: 10,
    color: '#2d3748',
  },
  tableCellNegative: {
    fontSize: 10,
    color: '#c53030', // Red for negative amounts
  },
  col1: { width: '40%', paddingRight: 5 }, // Description
  col2: { width: '15%', textAlign: 'right' }, // Menge
  col3: { width: '20%', textAlign: 'right' }, // Einzelpreis
  col4: { width: '25%', textAlign: 'right' }, // Total

  // Summary section
  summarySection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#1a365d',
    borderTopStyle: 'solid',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2d3748',
    marginRight: 20,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a365d',
    width: '25%',
    textAlign: 'right',
  },
  summaryValueNegative: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#c53030',
    width: '25%',
    textAlign: 'right',
  },

  // Signature area
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#718096',
    marginBottom: 20,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e0',
    borderBottomStyle: 'solid',
    marginBottom: 4,
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
    borderTopStyle: 'solid',
  },
  footerText: {
    fontSize: 9,
    color: '#a0aec0',
    textAlign: 'center',
  },
})

// =============================================
// PDF DOCUMENT COMPONENT
// =============================================

interface ChangeOrderPDFProps {
  data: ChangeOrderPDFData
}

/**
 * Change Order PDF Document
 *
 * Renders a professional A4 document with:
 * - KEWA AG header and branding
 * - Change order metadata (number, reason, work order reference)
 * - Description
 * - Line items table with negative amounts in red
 * - Total summary
 * - Signature area
 */
function ChangeOrderPDFDocument({ data }: ChangeOrderPDFProps) {
  // Helper to format CHF
  const formatCHF = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>KEWA AG</Text>
            <Text style={styles.documentType}>Änderungsauftrag</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaItem}>Nr: {data.co_number}</Text>
            <Text style={styles.headerMetaItem}>Erstellt: {data.generated_at}</Text>
          </View>
        </View>

        {/* Metadata section */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Arbeitsauftrag</Text>
            <Text style={styles.metaValue}>{data.work_order_reference}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Grund</Text>
            <Text style={styles.metaValue}>{data.reason_category}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Terminauswirkung</Text>
            <Text style={styles.metaValue}>
              {data.schedule_impact_days > 0
                ? `+${data.schedule_impact_days} Tage`
                : data.schedule_impact_days < 0
                ? `${data.schedule_impact_days} Tage`
                : 'Keine'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{data.status}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Beschreibung</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{data.description}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Positionen</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Beschreibung</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Menge</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Einzelpreis</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Total</Text>
          </View>

          {/* Table Rows */}
          {data.line_items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCellText, styles.col1]}>{item.description}</Text>
              <Text style={[styles.tableCellText, styles.col2]}>
                {item.quantity} {item.unit}
              </Text>
              <Text
                style={[
                  item.unit_price < 0 ? styles.tableCellNegative : styles.tableCellText,
                  styles.col3,
                ]}
              >
                {formatCHF(item.unit_price)}
              </Text>
              <Text
                style={[
                  item.total < 0 ? styles.tableCellNegative : styles.tableCellText,
                  styles.col4,
                ]}
              >
                {formatCHF(item.total)}
              </Text>
            </View>
          ))}

          {/* Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gesamtbetrag:</Text>
              <Text
                style={
                  data.total_amount < 0 ? styles.summaryValueNegative : styles.summaryValue
                }
              >
                {formatCHF(data.total_amount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Terminauswirkung:</Text>
              <Text style={styles.summaryValue}>
                {data.schedule_impact_days > 0
                  ? `+${data.schedule_impact_days} Tage`
                  : data.schedule_impact_days < 0
                  ? `${data.schedule_impact_days} Tage`
                  : 'Keine'}
              </Text>
            </View>
          </View>
        </View>

        {/* Signature Area */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Genehmigt durch</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Unterschrift</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Datum</Text>
              <View style={styles.signatureLine} />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>KEWA AG - Liegenschaftsverwaltung</Text>
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
function formatSwissDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return format(date, 'dd.MM.yyyy', { locale: de })
  } catch {
    return 'N/A'
  }
}

/**
 * Format a datetime string in Swiss German format (dd.MM.yyyy HH:mm)
 */
function formatSwissDateTime(dateString: string | null): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return format(date, 'dd.MM.yyyy HH:mm', { locale: de })
  } catch {
    return 'N/A'
  }
}

/**
 * Get German label for reason category
 */
function getReasonLabel(category: string): string {
  const labels: Record<string, string> = {
    owner_request: 'Wunsch des Eigentümers',
    unforeseen_conditions: 'Unvorhergesehene Bedingungen',
    design_error: 'Planungsfehler',
    site_conditions: 'Standortbedingungen',
    regulatory_requirement: 'Behördliche Anforderung',
    other: 'Andere',
  }
  return labels[category] || category
}

/**
 * Get German label for status
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    submitted: 'Eingereicht',
    under_review: 'In Prüfung',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    cancelled: 'Storniert',
  }
  return labels[status] || status
}

/**
 * Transform change order from database to PDF data
 */
export function transformToPDFData(changeOrder: {
  co_number: string
  description: string
  reason_category: string
  schedule_impact_days: number
  status: string
  line_items: ChangeOrderLineItem[]
  total_amount: number
  created_at: string
  work_order?: {
    wo_number: string
    title: string
  }
}): ChangeOrderPDFData {
  return {
    co_number: changeOrder.co_number,
    description: changeOrder.description,
    reason_category: getReasonLabel(changeOrder.reason_category),
    work_order_reference: changeOrder.work_order
      ? `${changeOrder.work_order.wo_number} - ${changeOrder.work_order.title}`
      : 'N/A',
    schedule_impact_days: changeOrder.schedule_impact_days,
    status: getStatusLabel(changeOrder.status),
    line_items: changeOrder.line_items,
    total_amount: changeOrder.total_amount,
    created_at: formatSwissDate(changeOrder.created_at),
    generated_at: format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de }),
  }
}

/**
 * Generate change order PDF as Buffer
 *
 * @param changeOrder - Change order with relations from database
 * @returns PDF as Buffer for HTTP response
 */
export async function generateChangeOrderPDF(
  changeOrder: Parameters<typeof transformToPDFData>[0]
): Promise<Buffer> {
  const pdfData = transformToPDFData(changeOrder)
  const buffer = await renderToBuffer(<ChangeOrderPDFDocument data={pdfData} />)
  return Buffer.from(buffer)
}

// Export component for testing
export { ChangeOrderPDFDocument }
