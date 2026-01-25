import Link from 'next/link'
import { Building2, Users, FolderPlus, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface QuickAction {
  label: string
  href: string
  icon: React.ReactNode
}

const actions: QuickAction[] = [
  {
    label: 'Neue Liegenschaft',
    href: '/dashboard/admin/properties',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    label: 'Neuer Partner',
    href: '/dashboard/partner',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Neues Projekt',
    href: '/renovation-projects/new',
    icon: <FolderPlus className="h-5 w-5" />,
  },
  {
    label: 'Neues Template',
    href: '/templates/new',
    icon: <FileText className="h-5 w-5" />,
  },
]

/**
 * Quick action buttons for common admin tasks
 */
export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Schnellaktionen
        </h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              {action.icon}
              <span className="text-sm font-medium text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
