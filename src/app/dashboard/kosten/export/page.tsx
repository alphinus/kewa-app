/**
 * Cost Export Page
 *
 * Full-page export configuration for accounting CSV exports.
 * Provides a standalone interface for configuring and downloading exports.
 *
 * Path: /dashboard/kosten/export
 * Phase 10-05: CSV Export for Accounting (COST-06)
 */

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { ExportForm } from './ExportForm'

/**
 * Export page - standalone export configuration
 */
export default async function KostenExportPage() {
  const supabase = await createClient()

  // Fetch projects for filter dropdown
  const { data: projects } = await supabase
    .from('renovation_projects')
    .select('id, name')
    .order('name')

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Export
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Exportieren Sie Kostendaten als CSV für Excel und Buchhaltung
        </p>
      </div>

      {/* Export Form */}
      <Card>
        <CardContent className="p-6">
          <ExportForm projects={projects ?? []} />
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Exportformat
          </h2>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                CSV-Dateiformat
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Semikolon (;) als Trennzeichen</li>
                <li>UTF-8 Kodierung mit BOM für Excel</li>
                <li>Anpassungsfähig für Schweizer/Deutsche Buchhaltung</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Datumsformat
              </h3>
              <p>TT.MM.JJJJ (z.B. 18.01.2026)</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Zahlenformat
              </h3>
              <p>Komma als Dezimaltrennzeichen (z.B. 1234,50)</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Spalten
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs mt-2">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-4">Spalte</th>
                      <th className="text-left py-2">Beschreibung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Datum</td>
                      <td>Rechnungs- oder Zahlungsdatum</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Typ</td>
                      <td>Rechnung oder Ausgabe</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Belegnummer</td>
                      <td>Rechnungs- oder Belegnummer</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Partner</td>
                      <td>Lieferant/Handwerker</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Projekt</td>
                      <td>Renovationsprojekt</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Netto</td>
                      <td>Nettobetrag ohne MwSt</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">MwSt</td>
                      <td>Mehrwertsteuer (nur Rechnungen)</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Brutto</td>
                      <td>Gesamtbetrag inkl. MwSt</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Status</td>
                      <td>Rechnungsstatus oder Kategorie</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">Bezahlt</td>
                      <td>Zahlungsdatum</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                Tipp: Import in Excel
              </h3>
              <p className="text-blue-700 dark:text-blue-400 text-xs">
                Die Datei kann direkt in Microsoft Excel geoeffnet werden.
                Das Format ist für Schweizer/Deutsche Regionaleinstellungen optimiert.
                Falls Umlaute nicht korrekt angezeigt werden, wählen Sie beim Import
                UTF-8 als Zeichenkodierung.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
