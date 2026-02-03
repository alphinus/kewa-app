/**
 * Ticket Status Changed Email Template
 *
 * Sent to tenants when their ticket status changes.
 * German content with inline styles for email client compatibility.
 *
 * Phase 29: Tenant Extras & UX
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components'
import type { TicketStatus } from '@/types/portal'

// =============================================
// TYPES
// =============================================

interface TicketStatusEmailProps {
  tenantName: string
  ticketNumber: string
  oldStatus: TicketStatus
  newStatus: TicketStatus
  ticketUrl: string
  messageContent?: string
}

// =============================================
// STATUS LABELS
// =============================================

const STATUS_LABELS: Record<TicketStatus, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  geschlossen: 'Geschlossen',
  storniert: 'Storniert',
}

// =============================================
// STYLES
// =============================================

const styles = {
  body: {
    backgroundColor: '#f8fafc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    margin: '40px auto',
    padding: '40px',
    maxWidth: '560px',
  },
  heading: {
    color: '#0f172a',
    fontSize: '24px',
    fontWeight: '600' as const,
    lineHeight: '32px',
    margin: '0 0 24px 0',
  },
  text: {
    color: '#334155',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px 0',
  },
  statusBadge: {
    display: 'inline-block',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500' as const,
    padding: '4px 12px',
    borderRadius: '4px',
    margin: '4px 0',
  },
  ticketNumber: {
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600' as const,
    padding: '12px 24px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    marginTop: '16px',
  },
  hr: {
    borderColor: '#e2e8f0',
    margin: '24px 0',
  },
  footer: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '20px',
    textAlign: 'center' as const,
  },
  messageBox: {
    backgroundColor: '#f1f5f9',
    borderLeft: '4px solid #3b82f6',
    padding: '16px',
    borderRadius: '0 4px 4px 0',
    margin: '16px 0',
  },
  messageText: {
    color: '#475569',
    fontSize: '14px',
    lineHeight: '22px',
    margin: 0,
    fontStyle: 'italic' as const,
  },
}

// =============================================
// COMPONENT
// =============================================

export default function TicketStatusEmail({
  tenantName,
  ticketNumber,
  oldStatus,
  newStatus,
  ticketUrl,
  messageContent,
}: TicketStatusEmailProps) {
  const previewText = `Ihr Ticket ${ticketNumber} hat einen neuen Status: ${STATUS_LABELS[newStatus]}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.heading}>Ticket-Status aktualisiert</Text>

          <Text style={styles.text}>
            Hallo {tenantName},
          </Text>

          <Text style={styles.text}>
            Ihr Ticket hat einen neuen Status:
          </Text>

          <Section>
            <Text style={styles.ticketNumber}>
              Ticket: {ticketNumber}
            </Text>
            <Text style={styles.text}>
              <span style={{ color: '#94a3b8' }}>
                {STATUS_LABELS[oldStatus]}
              </span>
              {' → '}
              <span style={styles.statusBadge}>
                {STATUS_LABELS[newStatus]}
              </span>
            </Text>
          </Section>

          {messageContent && (
            <Section style={styles.messageBox}>
              <Text style={styles.messageText}>
                {messageContent.length > 200
                  ? `${messageContent.substring(0, 200)}...`
                  : messageContent}
              </Text>
            </Section>
          )}

          <Button style={styles.button} href={ticketUrl}>
            Ticket anzeigen
          </Button>

          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            Diese E-Mail wurde automatisch von KEWA gesendet.
            <br />
            Bitte antworten Sie nicht direkt auf diese E-Mail.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
