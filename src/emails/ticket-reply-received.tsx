/**
 * Ticket Reply Received Email Template
 *
 * Sent to tenants when an operator replies to their ticket.
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

// =============================================
// TYPES
// =============================================

interface TicketReplyEmailProps {
  tenantName: string
  ticketNumber: string
  ticketUrl: string
  replyContent: string
  operatorName: string
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
  ticketNumber: {
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500' as const,
    marginBottom: '8px',
  },
  operatorName: {
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: '600' as const,
    marginBottom: '8px',
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
    whiteSpace: 'pre-wrap' as const,
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
  highlight: {
    backgroundColor: '#dbeafe',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  highlightText: {
    color: '#1e40af',
    fontSize: '14px',
    fontWeight: '500' as const,
    margin: 0,
  },
}

// =============================================
// COMPONENT
// =============================================

export default function TicketReplyEmail({
  tenantName,
  ticketNumber,
  ticketUrl,
  replyContent,
  operatorName,
}: TicketReplyEmailProps) {
  const previewText = `Neue Nachricht zu Ticket ${ticketNumber} von ${operatorName}`

  // Truncate reply content for email preview
  const truncatedContent =
    replyContent.length > 200
      ? `${replyContent.substring(0, 200)}...`
      : replyContent

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.heading}>Neue Nachricht zu Ihrem Ticket</Text>

          <Text style={styles.text}>
            Hallo {tenantName},
          </Text>

          <Text style={styles.text}>
            Sie haben eine neue Nachricht zu Ihrem Ticket erhalten:
          </Text>

          <Section style={styles.highlight}>
            <Text style={styles.highlightText}>
              Ticket: {ticketNumber}
            </Text>
          </Section>

          <Section>
            <Text style={styles.operatorName}>
              Von: {operatorName}
            </Text>
          </Section>

          <Section style={styles.messageBox}>
            <Text style={styles.messageText}>
              {truncatedContent}
            </Text>
          </Section>

          <Button style={styles.button} href={ticketUrl}>
            Nachricht ansehen
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
