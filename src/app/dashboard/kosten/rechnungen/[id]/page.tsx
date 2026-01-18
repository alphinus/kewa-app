import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getInvoiceWithRelations } from '@/lib/costs/invoice-queries'
import { InvoiceDetail } from '@/components/costs/InvoiceDetail'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Breadcrumb navigation
 */
function Breadcrumb({ invoiceNumber }: { invoiceNumber: string }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
      <Link
        href="/dashboard/kosten/rechnungen"
        className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        Rechnungen
      </Link>
      <span>/</span>
      <span className="text-gray-900 dark:text-gray-100">{invoiceNumber}</span>
    </nav>
  )
}

/**
 * Invoice detail page
 *
 * Server component that fetches a single invoice and renders InvoiceDetail.
 * Breadcrumb navigation back to list.
 */
export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    notFound()
  }

  // Fetch invoice with relations
  const invoice = await getInvoiceWithRelations(id)

  if (!invoice) {
    notFound()
  }

  return (
    <div className="pb-20">
      <Breadcrumb invoiceNumber={invoice.invoice_number} />
      <InvoiceDetail invoice={invoice} />
    </div>
  )
}
