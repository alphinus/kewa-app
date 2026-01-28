/**
 * Inspection PDF Template
 *
 * A4 format PDF document for inspections (Abnahmeprotokoll).
 * Uses @react-pdf/renderer for server-side PDF generation.
 *
 * German text throughout matching KEWA AG branding.
 * Phase: 22-inspection-core Plan 03
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Inspection, InspectionDefect, ChecklistSectionResult } from '@/types/inspections'

// =============================================
// TYPES
// =============================================

export interface InspectionPDFData {
  inspection: Inspection
  defects: InspectionDefect[]
  signatureUrl?: string
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

  // Checklist results
  checklistSection: {
    marginBottom: 12,
  },
  checklistSectionName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 6,
  },
  checklistItem: {
    flexDirection: 'row',
    paddingVertical: 4,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  checklistItemIcon: {
    width: '8%',
    color: '#2d3748',
  },
  checklistItemTitle: {
    width: '52%',
    color: '#2d3748',
  },
  checklistItemNotes: {
    width: '40%',
    color: '#718096',
    fontSize: 8,
  },

  // Defect table
  defectRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  defectSeverity: {
    width: '15%',
    fontSize: 8,
  },
  defectTitle: {
    width: '35%',
    color: '#2d3748',
  },
  defectDescription: {
    width: '35%',
    color: '#718096',
    fontSize: 8,
  },
  defectAction: {
    width: '15%',
    fontSize: 8,
    color: '#718096',
  },

  // Signature section
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
  },
  signatureTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 10,
  },
  signatureImage: {
    width: 200,
    height: 80,
    marginBottom: 10,
    border: '1px solid #cbd5e0',
  },
  signatureInfo: {
    fontSize: 9,
    color: '#2d3748',
    marginBottom: 4,
  },
  signatureRefused: {
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    fontSize: 10,
    color: '#92400e',
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

interface InspectionPDFProps {
  data: InspectionPDFData
}

/**
 * Inspection PDF Document
 *
 * Renders a professional A4 document with:
 * - KEWA AG header and branding
 * - Inspection metadata
 * - Checklist results by section
 * - Defect table
 * - Signature block
 */
export function InspectionPDFDocument({ data }: InspectionPDFProps) {
  const { inspection, defects, signatureUrl } = data

  // Helper to format Swiss date
  const formatSwissDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'dd.MM.yyyy', { locale: de })
    } catch {
      return 'N/A'
    }
  }

  // Helper to format Swiss datetime
  const formatSwissDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'dd.MM.yyyy HH:mm', { locale: de })
    } catch {
      return 'N/A'
    }
  }

  // Get result icon
  const getResultIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return '✓'
      case 'fail':
        return '✗'
      case 'na':
        return '—'
      default:
        return '○'
    }
  }

  // Get severity label
  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'schwer':
        return 'Schwer'
      case 'mittel':
        return 'Mittel'
      case 'gering':
        return 'Gering'
      default:
        return severity
    }
  }

  // Get action label
  const getActionLabel = (action: string | null) => {
    if (!action) return 'Offen'
    switch (action) {
      case 'task_created':
        return 'Aufgabe erstellt'
      case 'deferred':
        return 'Verschoben'
      case 'dismissed':
        return 'Verworfen'
      default:
        return action
    }
  }

  // Get overall result label
  const getOverallResultLabel = (result: string | null) => {
    if (!result) return 'N/A'
    switch (result) {
      case 'passed':
        return 'Bestanden'
      case 'passed_with_conditions':
        return 'Bestanden mit Auflagen'
      case 'failed':
        return 'Nicht bestanden'
      default:
        return result
    }
  }

  const documentTitle =
    inspection.formality_level === 'formal_abnahme'
      ? 'Abnahmeprotokoll'
      : 'Inspektionsbericht'

  const checklistSections = (inspection.checklist_items as ChecklistSectionResult[]) || []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>KEWA AG</Text>
            <Text style={styles.documentType}>{documentTitle}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaItem}>{inspection.title}</Text>
            <Text style={styles.headerMetaItem}>
              Erstellt: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}
            </Text>
          </View>
        </View>

        {/* Metadata section */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Abnahmedatum</Text>
            <Text style={styles.metaValue}>{formatSwissDate(inspection.inspection_date)}</Text>
          </View>
          {inspection.work_order && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Arbeitsauftrag</Text>
              <Text style={styles.metaValue}>
                {inspection.work_order.wo_number} - {inspection.work_order.title}
              </Text>
            </View>
          )}
          {inspection.project && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Projekt</Text>
              <Text style={styles.metaValue}>{inspection.project.name}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>
              {inspection.status === 'signed'
                ? 'Unterschrieben'
                : inspection.status === 'completed'
                ? 'Abgeschlossen'
                : 'In Bearbeitung'}
            </Text>
          </View>
          {inspection.overall_result && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ergebnis</Text>
              <Text style={styles.metaValue}>{getOverallResultLabel(inspection.overall_result)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {inspection.description && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Beschreibung</Text>
            <Text style={{ fontSize: 10, color: '#2d3748' }}>{inspection.description}</Text>
          </View>
        )}

        {/* Checklist Results */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Prüfergebnisse</Text>
          {checklistSections.map((section, idx) => (
            <View key={idx} style={styles.checklistSection}>
              <Text style={styles.checklistSectionName}>{section.name}</Text>
              {section.items.map((item, itemIdx) => (
                <View key={itemIdx} style={styles.checklistItem}>
                  <Text style={styles.checklistItemIcon}>{getResultIcon(item.status)}</Text>
                  <Text style={styles.checklistItemTitle}>Punkt {itemIdx + 1}</Text>
                  <Text style={styles.checklistItemNotes}>{item.notes || '—'}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Defects */}
        {defects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Mängel ({defects.length})</Text>
            {defects.map((defect, idx) => (
              <View key={idx} style={styles.defectRow}>
                <Text style={styles.defectSeverity}>{getSeverityLabel(defect.severity)}</Text>
                <Text style={styles.defectTitle}>{defect.title}</Text>
                <Text style={styles.defectDescription}>{defect.description || '—'}</Text>
                <Text style={styles.defectAction}>{getActionLabel(defect.action)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Signature Block */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureTitle}>Unterschrift</Text>

          {inspection.signature_refused ? (
            <View style={styles.signatureRefused}>
              <Text>Unterschrift verweigert</Text>
              {inspection.signature_refused_reason && (
                <Text style={{ marginTop: 5 }}>Grund: {inspection.signature_refused_reason}</Text>
              )}
            </View>
          ) : inspection.status === 'signed' && signatureUrl ? (
            <View>
              <Image src={signatureUrl} style={styles.signatureImage} />
              <Text style={styles.signatureInfo}>Name: {inspection.signer_name}</Text>
              {inspection.signer_role && (
                <Text style={styles.signatureInfo}>Rolle: {inspection.signer_role}</Text>
              )}
              {inspection.signed_at && (
                <Text style={styles.signatureInfo}>
                  Unterschrieben am: {formatSwissDateTime(inspection.signed_at)}
                </Text>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: 9, color: '#718096' }}>Noch nicht unterschrieben</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>KEWA AG - Liegenschaftsverwaltung</Text>
        </View>
      </Page>
    </Document>
  )
}
