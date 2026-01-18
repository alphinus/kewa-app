import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { InvoiceList } from '@/components/costs/InvoiceList'
import { ExportButton } from '@/components/costs/ExportButton'
import { getInvoiceStatusCounts } from '@/lib/costs/invoice-queries'

/**
 * Stats card component
 */
function StatCard({
  label,
  value,
  color = 'gray'
}: {
  label: string
  value: number
  color?: 'gray' | 'blue' | 'yellow' | 'green' | 'red'
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  )
}

/**
 * Invoices list page
 *
 * Shows all invoices with filters and stats.
 * Status cards: Offen, In Pruefung, Freigegeben, Beanstandet
 */
export default async function RechnungenPage() {
  // Fetch status counts for stats cards
  const counts = await getInvoiceStatusCounts()

  // Fetch projects for filter dropdown
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('renovation_projects')
    .select('id, name')
    .order('name')

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Rechnungen
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Rechnungspruefung und Freigabe
          </p>
        </div>
        <ExportButton projects={projects ?? []} />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Offen"
          value={counts.received}
          color="blue"
        />
        <StatCard
          label="In Pruefung"
          value={counts.under_review}
          color="yellow"
        />
        <StatCard
          label="Freigegeben"
          value={counts.approved}
          color="green"
        />
        <StatCard
          label="Beanstandet"
          value={counts.disputed}
          color="red"
        />
      </div>

      {/* Invoice list with filters */}
      <Card>
        <CardContent className="p-0">
          <InvoiceList
            projects={projects ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
