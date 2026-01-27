# Phase 20: Supplier Advanced - Research

**Researched:** 2026-01-27
**Domain:** Consumption tracking, Reorder alerts, Price analytics, Multi-property orders
**Confidence:** MEDIUM

## Summary

Phase 20 extends Phase 19's supplier foundation with advanced inventory analytics and multi-property capabilities. The research confirms this requires four distinct functional areas:

1. **Consumption Tracking**: New `inventory_movements` table to record tank levels and consumption events per property. Calculate usage rates from delivery-to-delivery intervals. Manual entry of tank readings (IoT sensors out of scope).

2. **Reorder Alerts**: Server-side calculation of projected stock-out dates using linear consumption rates. Alert thresholds per property (e.g., "Alert when <20% remaining"). Simple projection: `days_until_empty = current_level / daily_usage_rate`.

3. **Price Analytics**: Aggregate delivery prices over time from existing `deliveries` table. Price history chart showing CHF/tonne trends. Seasonal consumption patterns from grouping deliveries by month/quarter. No new tables needed - analytics layer over existing data.

4. **Multi-Property Orders**: Single purchase order with allocation breakdown. New `purchase_order_allocations` table linking PO to multiple properties with quantity splits. Each allocation creates separate delivery when fulfilled.

**Primary recommendation:** Add `inventory_movements` table for consumption tracking, create analytics queries over existing deliveries data, extend purchase orders with allocations table, use Recharts for visualization, implement alert calculation as computed view or scheduled function.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | existing | API routes + Server Components | Already in stack |
| Supabase | existing | Database + Storage + Functions | Already in stack |
| PostgreSQL | existing | Time-series queries, window functions | Already in stack |
| Recharts | ^2.x | React charting (LineChart, AreaChart) | Most popular React chart library, 1M+ weekly downloads |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | existing | Date calculations for usage rates | Already in stack |
| PostgreSQL Views | existing | Materialized views for analytics | Performance optimization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js (react-chartjs-2) | Chart.js more features but heavier; Recharts simpler for basic charts |
| Recharts | Victory | Victory more customizable but steeper learning curve |
| Manual consumption entry | IoT tank sensors | Out of scope per requirements |
| Real-time alerts | Scheduled batch checks | Batch sufficient for heating oil/pellets (slow consumption) |

**Installation:**
```bash
npm install recharts
# All other dependencies already in stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── inventory-movements/
│   │   │   ├── route.ts                      # GET (list), POST (record reading)
│   │   │   └── [id]/route.ts                 # GET, PATCH, DELETE
│   │   ├── reorder-alerts/
│   │   │   └── route.ts                      # GET (active alerts)
│   │   ├── suppliers/
│   │   │   └── analytics/
│   │   │       ├── price-history/route.ts    # GET (price trends)
│   │   │       └── consumption/route.ts      # GET (seasonal patterns)
│   │   └── purchase-orders/
│   │       └── [id]/
│   │           └── allocations/route.ts      # GET, POST (multi-property allocations)
│   └── dashboard/
│       └── lieferanten/
│           ├── bestand/                       # German: Inventory
│           │   ├── page.tsx                   # Inventory overview all properties
│           │   └── [propertyId]/page.tsx      # Property inventory detail
│           └── analytics/
│               ├── preise/page.tsx            # Price history charts
│               └── verbrauch/page.tsx         # Consumption patterns
├── components/
│   └── suppliers/
│       ├── InventoryMovementForm.tsx          # Record tank reading
│       ├── InventoryLevelCard.tsx             # Current level + alert status
│       ├── PriceHistoryChart.tsx              # Recharts LineChart for prices
│       ├── ConsumptionPatternChart.tsx        # Recharts AreaChart for seasonal
│       ├── ReorderAlertList.tsx               # Active alerts with urgency
│       └── MultiPropertyOrderForm.tsx         # PO with allocation breakdown
├── lib/
│   └── suppliers/
│       ├── inventory-queries.ts               # Inventory level calculations
│       ├── alert-calculations.ts              # Reorder alert logic
│       └── analytics-queries.ts               # Price and consumption analytics
└── types/
    └── suppliers.ts                           # Extend with inventory types
```

### Pattern 1: Consumption Tracking with Inventory Movements
**What:** Track tank levels over time to calculate usage rates
**When to use:** Recording tank readings, calculating consumption between deliveries
**Example:**
```sql
-- Inventory movements table
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location
  property_id UUID NOT NULL REFERENCES properties(id),
  building_id UUID REFERENCES buildings(id),

  -- Movement details
  movement_type TEXT NOT NULL, -- 'delivery', 'reading', 'adjustment'
  movement_date DATE NOT NULL,

  -- Tank levels
  tank_level DECIMAL(12,2) NOT NULL, -- Current level in tonnes
  tank_capacity DECIMAL(12,2), -- Total tank capacity
  level_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN tank_capacity > 0 THEN (tank_level / tank_capacity) * 100
    ELSE NULL END
  ) STORED,

  -- Usage calculation (from previous reading)
  days_since_last DECIMAL(8,2),
  consumption_amount DECIMAL(12,2), -- Amount consumed since last reading
  daily_usage_rate DECIMAL(8,4), -- consumption_amount / days_since_last

  -- Linked records
  delivery_id UUID REFERENCES deliveries(id), -- If movement_type = 'delivery'

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_inventory_movements_property ON inventory_movements(property_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(movement_date DESC);

-- View: Latest inventory levels per property
CREATE VIEW current_inventory_levels AS
SELECT DISTINCT ON (property_id)
  property_id,
  movement_date,
  tank_level,
  tank_capacity,
  level_percentage,
  daily_usage_rate,
  movement_date + (tank_level / NULLIF(daily_usage_rate, 0))::INTEGER AS projected_empty_date
FROM inventory_movements
ORDER BY property_id, movement_date DESC, created_at DESC;
```

### Pattern 2: Reorder Alert Calculation
**What:** Calculate projected stock-out dates and alert thresholds
**When to use:** Determining when to reorder based on current consumption
**Example:**
```typescript
// Source: Standard reorder point formula adapted for consumption tracking
interface ReorderAlert {
  property_id: string
  property_name: string
  current_level: number
  level_percentage: number
  daily_usage_rate: number
  projected_empty_date: string
  days_until_empty: number
  alert_threshold: number // Percentage threshold (e.g., 20%)
  urgency: 'critical' | 'warning' | 'normal'
}

// Calculate reorder alerts
async function calculateReorderAlerts(
  supabase: SupabaseClient,
  thresholdPercentage: number = 20
): Promise<ReorderAlert[]> {
  // Get current inventory levels with usage rates
  const { data: levels, error } = await supabase
    .from('current_inventory_levels')
    .select(`
      property_id,
      tank_level,
      level_percentage,
      daily_usage_rate,
      projected_empty_date
    `)
    .not('daily_usage_rate', 'is', null)

  if (error || !levels) return []

  const alerts: ReorderAlert[] = []

  for (const level of levels) {
    // Skip if above threshold
    if (level.level_percentage > thresholdPercentage) continue

    const daysUntilEmpty = level.projected_empty_date
      ? Math.ceil(
          (new Date(level.projected_empty_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
        )
      : null

    // Determine urgency
    let urgency: 'critical' | 'warning' | 'normal' = 'normal'
    if (daysUntilEmpty !== null) {
      if (daysUntilEmpty <= 7) urgency = 'critical'
      else if (daysUntilEmpty <= 14) urgency = 'warning'
    }

    alerts.push({
      ...level,
      days_until_empty: daysUntilEmpty,
      alert_threshold: thresholdPercentage,
      urgency
    })
  }

  return alerts.sort((a, b) => a.days_until_empty - b.days_until_empty)
}
```

### Pattern 3: Price History Analytics
**What:** Aggregate delivery prices over time to show pricing trends
**When to use:** Price history charts, cost analysis
**Example:**
```sql
-- View: Price history from deliveries
CREATE VIEW delivery_price_history AS
SELECT
  d.delivery_date,
  d.property_id,
  p.name AS property_name,
  po.supplier_id,
  s.company_name AS supplier_name,
  d.quantity_received,
  d.quantity_unit,
  po.total_amount,
  -- Calculate price per unit (e.g., CHF per tonne)
  CASE WHEN d.quantity_received > 0
    THEN po.total_amount / d.quantity_received
    ELSE NULL
  END AS unit_price,
  -- Date components for grouping
  EXTRACT(YEAR FROM d.delivery_date) AS year,
  EXTRACT(MONTH FROM d.delivery_date) AS month,
  EXTRACT(QUARTER FROM d.delivery_date) AS quarter
FROM deliveries d
JOIN purchase_orders po ON d.purchase_order_id = po.id
JOIN partners s ON po.supplier_id = s.id
LEFT JOIN properties p ON d.property_id = p.id
ORDER BY d.delivery_date DESC;

-- View: Seasonal consumption patterns
CREATE VIEW seasonal_consumption AS
SELECT
  property_id,
  EXTRACT(MONTH FROM delivery_date) AS month,
  EXTRACT(QUARTER FROM delivery_date) AS quarter,
  COUNT(*) AS delivery_count,
  SUM(quantity_received) AS total_quantity,
  AVG(quantity_received) AS avg_quantity_per_delivery,
  AVG(unit_price) AS avg_unit_price
FROM delivery_price_history
GROUP BY property_id, month, quarter
ORDER BY property_id, month;
```

### Pattern 4: Multi-Property Order Allocations
**What:** Single purchase order split across multiple properties
**When to use:** Bulk ordering with delivery to multiple locations
**Example:**
```sql
-- Purchase order allocations table
CREATE TABLE purchase_order_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id),
  building_id UUID REFERENCES buildings(id),

  -- Allocation details
  allocated_quantity DECIMAL(12,2) NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL, -- Proportional cost

  -- Delivery tracking
  delivered BOOLEAN DEFAULT FALSE,
  delivery_id UUID REFERENCES deliveries(id),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT building_requires_property CHECK (building_id IS NULL OR property_id IS NOT NULL),
  CONSTRAINT positive_quantity CHECK (allocated_quantity > 0),
  CONSTRAINT positive_amount CHECK (allocated_amount >= 0)
);

-- Indexes
CREATE INDEX idx_po_allocations_purchase_order ON purchase_order_allocations(purchase_order_id);
CREATE INDEX idx_po_allocations_property ON purchase_order_allocations(property_id);

-- Trigger: Validate total allocations don't exceed PO total
CREATE OR REPLACE FUNCTION validate_allocation_totals()
RETURNS TRIGGER AS $$
DECLARE
  po_total DECIMAL(12,2);
  allocation_total DECIMAL(12,2);
BEGIN
  -- Get PO total
  SELECT total_amount INTO po_total
  FROM purchase_orders
  WHERE id = NEW.purchase_order_id;

  -- Get sum of allocations
  SELECT COALESCE(SUM(allocated_amount), 0) INTO allocation_total
  FROM purchase_order_allocations
  WHERE purchase_order_id = NEW.purchase_order_id;

  -- Check if over-allocated
  IF allocation_total > po_total THEN
    RAISE EXCEPTION 'Total allocations (%) exceed purchase order total (%)',
      allocation_total, po_total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_allocation_totals
  AFTER INSERT OR UPDATE ON purchase_order_allocations
  FOR EACH ROW EXECUTE FUNCTION validate_allocation_totals();
```

### Pattern 5: Recharts Price History Visualization
**What:** LineChart showing price trends over time
**When to use:** Price history dashboard
**Example:**
```typescript
// Source: Recharts documentation patterns
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCHF } from '@/lib/utils'

interface PriceDataPoint {
  date: string
  price: number
  supplier: string
}

interface PriceHistoryChartProps {
  data: PriceDataPoint[]
  title?: string
}

export function PriceHistoryChart({ data, title }: PriceHistoryChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => new Date(value).toLocaleDateString('de-CH')}
          />
          <YAxis
            tickFormatter={(value) => formatCHF(value)}
            label={{ value: 'CHF / Tonne', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => formatCHF(value)}
            labelFormatter={(label) => new Date(label).toLocaleDateString('de-CH', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Preis"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Complex forecasting algorithms**: Linear projection sufficient for heating oil/pellets; avoid ML/AI overkill
- **Real-time IoT integration**: Out of scope; manual readings adequate
- **Per-line-item allocations**: Allocate at PO level, not individual line items (complexity vs value)
- **Separate inventory table**: Use movements ledger, calculate current levels via view
- **Client-side alert calculation**: Server-side or DB view prevents inconsistency
- **Custom charting**: Recharts handles 95% of use cases; don't reinvent

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Consumption rate calculation | Custom averaging logic | PostgreSQL window functions | `LAG()` function for previous reading, built-in date math |
| Price trend charts | Canvas drawing | Recharts LineChart | Responsive, interactive, accessible |
| Seasonal patterns | Manual grouping | PostgreSQL `EXTRACT()` + `GROUP BY` | Native date part extraction |
| Alert urgency logic | Multiple if/else | Computed column or CASE statement | Declarative, testable |
| Multi-property validation | Client-side checks | Database trigger + constraint | Enforced at data layer |
| Date range queries | String manipulation | date-fns or PostgreSQL date functions | Timezone-safe, locale-aware |

**Key insight:** This phase is primarily analytics and visualization. Leverage PostgreSQL's time-series capabilities (window functions, date extraction, aggregation) and React's declarative UI (Recharts). Don't build custom calculation engines or chart renderers.

## Common Pitfalls

### Pitfall 1: Over-Engineering Consumption Forecasting
**What goes wrong:** Attempting ML models, exponential smoothing, or advanced forecasting for pellet consumption
**Why it happens:** Thinking analytics requires sophisticated algorithms
**How to avoid:** Simple linear projection is sufficient. Heating oil/pellets consumption is predictable (weather-dependent but linear within season). Formula: `days_until_empty = current_level / avg_daily_usage`
**Warning signs:** Dependencies on data science libraries, complex training models, historical weather data

### Pitfall 2: Missing Initial Baseline
**What goes wrong:** Cannot calculate usage rate without at least two readings
**Why it happens:** User creates property inventory but no prior history
**How to avoid:** First reading establishes baseline (no usage rate). Second reading enables calculation. UI should show "Insufficient data" until 2+ readings exist.
**Warning signs:** Division by zero errors, null daily_usage_rate in production

### Pitfall 3: Delivery Not Updating Inventory Level
**What goes wrong:** Delivery recorded but inventory level stays old
**Why it happens:** No automatic inventory movement on delivery
**How to avoid:** Trigger on deliveries table to auto-create inventory_movement with `movement_type='delivery'` and `tank_level = previous_level + quantity_received`
**Warning signs:** Reorder alerts firing right after delivery, inventory level diverging from deliveries

### Pitfall 4: Price History Without Unit Normalization
**What goes wrong:** Comparing deliveries of different quantities shows meaningless totals
**Why it happens:** Charting `total_amount` instead of `unit_price`
**How to avoid:** Always calculate price per unit (CHF/tonne). Formula: `unit_price = total_amount / quantity_received`. Chart unit price, not total cost.
**Warning signs:** Price chart showing huge spikes that are just larger orders

### Pitfall 5: Allocation Without Validation
**What goes wrong:** Allocations sum to more than PO total, or property allocated 0 quantity
**Why it happens:** UI allows arbitrary allocation without checking constraints
**How to avoid:** Database trigger validating `SUM(allocated_amount) <= po.total_amount` and `allocated_quantity > 0`. API validates before insert.
**Warning signs:** Negative remaining allocation, allocation percentages > 100%

### Pitfall 6: Seasonal Patterns Without Year Context
**What goes wrong:** Grouping by month without year shows Jan 2024 + Jan 2025 as one data point
**Why it happens:** Grouping only by `EXTRACT(MONTH)` instead of date range
**How to avoid:** Group by year-month combo: `to_char(delivery_date, 'YYYY-MM')` or separate year and month dimensions
**Warning signs:** Seasonal chart showing impossibly high volumes, multi-year data collapsed

### Pitfall 7: Alert Fatigue from Static Thresholds
**What goes wrong:** Properties with high consumption get alerts constantly
**Why it happens:** Fixed threshold (e.g., 20%) doesn't account for different usage patterns
**How to avoid:** Threshold should be configurable per property. Store in property metadata or settings table. Default 20% but allow override.
**Warning signs:** Users ignoring alerts, complaints about noise

## Code Examples

Verified patterns from existing codebase and official sources:

### Inventory Movement API Route
```typescript
// Source: Pattern from src/app/api/deliveries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.property_id || !body.tank_level || !body.movement_date) {
      return NextResponse.json(
        { error: 'property_id, tank_level, and movement_date are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get previous reading for this property
    const { data: previousReading } = await supabase
      .from('inventory_movements')
      .select('movement_date, tank_level')
      .eq('property_id', body.property_id)
      .order('movement_date', { ascending: false })
      .limit(1)
      .single()

    // Calculate consumption if previous reading exists
    let consumption = null
    let daysSinceLast = null
    let dailyUsageRate = null

    if (previousReading) {
      const prevDate = new Date(previousReading.movement_date)
      const currentDate = new Date(body.movement_date)
      daysSinceLast = Math.max(1, (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

      // Consumption = previous level - current level (assuming no delivery between)
      consumption = previousReading.tank_level - body.tank_level

      if (consumption > 0 && daysSinceLast > 0) {
        dailyUsageRate = consumption / daysSinceLast
      }
    }

    const { data: movement, error } = await supabase
      .from('inventory_movements')
      .insert({
        property_id: body.property_id,
        building_id: body.building_id || null,
        movement_type: body.movement_type || 'reading',
        movement_date: body.movement_date,
        tank_level: body.tank_level,
        tank_capacity: body.tank_capacity,
        delivery_id: body.delivery_id || null,
        days_since_last: daysSinceLast,
        consumption_amount: consumption,
        daily_usage_rate: dailyUsageRate,
        notes: body.notes,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating inventory movement:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ movement }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Reorder Alerts Query
```typescript
// Source: Reorder point calculation best practices
async function getReorderAlerts(
  supabase: SupabaseClient,
  thresholdPercentage: number = 20
) {
  const { data, error } = await supabase.rpc('get_reorder_alerts', {
    threshold_pct: thresholdPercentage
  })

  return { data, error }
}

// Database function for reorder alerts
/*
CREATE OR REPLACE FUNCTION get_reorder_alerts(threshold_pct DECIMAL DEFAULT 20)
RETURNS TABLE (
  property_id UUID,
  property_name TEXT,
  current_level DECIMAL,
  level_percentage DECIMAL,
  daily_usage_rate DECIMAL,
  days_until_empty INTEGER,
  urgency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS property_id,
    p.name AS property_name,
    cil.tank_level AS current_level,
    cil.level_percentage,
    cil.daily_usage_rate,
    CASE
      WHEN cil.daily_usage_rate > 0 THEN
        (cil.tank_level / cil.daily_usage_rate)::INTEGER
      ELSE NULL
    END AS days_until_empty,
    CASE
      WHEN cil.daily_usage_rate > 0 AND (cil.tank_level / cil.daily_usage_rate) <= 7 THEN 'critical'
      WHEN cil.daily_usage_rate > 0 AND (cil.tank_level / cil.daily_usage_rate) <= 14 THEN 'warning'
      ELSE 'normal'
    END AS urgency
  FROM current_inventory_levels cil
  JOIN properties p ON p.id = cil.property_id
  WHERE cil.level_percentage <= threshold_pct
    AND cil.daily_usage_rate IS NOT NULL
  ORDER BY days_until_empty ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;
*/
```

### Seasonal Consumption Chart
```typescript
// Source: Recharts documentation + date-fns
'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MonthlyConsumption {
  month: number
  monthName: string
  avgQuantity: number
  deliveryCount: number
}

export function SeasonalConsumptionChart({ data }: { data: MonthlyConsumption[] }) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">Saisonaler Verbrauch</h3>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthName" />
          <YAxis
            label={{ value: 'Durchschn. Menge (Tonnen)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)} Tonnen`}
            labelFormatter={(label) => `Monat: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="avgQuantity"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorConsumption)"
            name="Durchschnittsmenge"
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-sm text-gray-600 mt-2">
        Durchschnittlicher Verbrauch pro Monat basierend auf historischen Lieferungen
      </p>
    </div>
  )
}
```

### Multi-Property Order Form
```typescript
// Source: Pattern from existing PurchaseOrderForm
'use client'

import { useState } from 'react'
import type { Property } from '@/types/database'

interface Allocation {
  property_id: string
  property_name: string
  quantity: number
  amount: number
}

interface MultiPropertyOrderFormProps {
  properties: Property[]
  totalQuantity: number
  totalAmount: number
  onAllocationsChange: (allocations: Allocation[]) => void
}

export function MultiPropertyOrderForm({
  properties,
  totalQuantity,
  totalAmount,
  onAllocationsChange
}: MultiPropertyOrderFormProps) {
  const [allocations, setAllocations] = useState<Allocation[]>([])

  const addAllocation = () => {
    setAllocations([
      ...allocations,
      { property_id: '', property_name: '', quantity: 0, amount: 0 }
    ])
  }

  const updateAllocation = (index: number, field: keyof Allocation, value: any) => {
    const updated = [...allocations]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-calculate amount based on quantity
    if (field === 'quantity') {
      const unitPrice = totalAmount / totalQuantity
      updated[index].amount = value * unitPrice
    }

    setAllocations(updated)
    onAllocationsChange(updated)
  }

  const removeAllocation = (index: number) => {
    const updated = allocations.filter((_, i) => i !== index)
    setAllocations(updated)
    onAllocationsChange(updated)
  }

  const allocatedQuantity = allocations.reduce((sum, a) => sum + a.quantity, 0)
  const allocatedAmount = allocations.reduce((sum, a) => sum + a.amount, 0)
  const remainingQuantity = totalQuantity - allocatedQuantity
  const remainingAmount = totalAmount - allocatedAmount

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Verteilung auf Liegenschaften</h3>
        <button
          type="button"
          onClick={addAllocation}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + Liegenschaft hinzufügen
        </button>
      </div>

      {allocations.map((allocation, index) => (
        <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
          <select
            value={allocation.property_id}
            onChange={(e) => {
              const property = properties.find(p => p.id === e.target.value)
              updateAllocation(index, 'property_id', e.target.value)
              if (property) {
                updateAllocation(index, 'property_name', property.name)
              }
            }}
            className="flex-1"
          >
            <option value="">Liegenschaft wählen...</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            min="0"
            value={allocation.quantity}
            onChange={(e) => updateAllocation(index, 'quantity', parseFloat(e.target.value))}
            placeholder="Menge"
            className="w-32"
          />

          <input
            type="number"
            step="0.01"
            min="0"
            value={allocation.amount}
            readOnly
            className="w-32 bg-gray-100"
          />

          <button
            type="button"
            onClick={() => removeAllocation(index)}
            className="text-red-600 hover:text-red-700"
          >
            Entfernen
          </button>
        </div>
      ))}

      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Verteilt:</span>
            <span className="font-medium">{allocatedQuantity.toFixed(2)} Tonnen</span>
          </div>
          <div className="flex justify-between">
            <span>Verbleibend:</span>
            <span className={remainingQuantity < 0 ? 'text-red-600 font-medium' : ''}>
              {remainingQuantity.toFixed(2)} Tonnen
            </span>
          </div>
        </div>
      </div>

      {remainingQuantity < 0 && (
        <p className="text-sm text-red-600">
          Fehler: Verteilte Menge überschreitet Bestellmenge
        </p>
      )}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spreadsheet tracking | Database inventory movements | 2020s | Automated calculations, audit trail |
| Manual reorder decisions | Projected stock-out alerts | 2020s | Proactive ordering, prevent stockouts |
| Static price lists | Time-series price analytics | 2020s | Identify trends, negotiate better |
| Single-location orders | Multi-property allocation | 2020s | Bulk ordering discounts, efficiency |
| Custom chart rendering | React declarative libraries (Recharts) | 2018+ | Responsive, accessible, maintainable |

**Deprecated/outdated:**
- **Manual consumption logs**: Database ledger with automatic rate calculation is standard
- **Fixed reorder points**: Dynamic calculation based on actual usage patterns
- **Canvas-based charting**: SVG-based React charting (Recharts, Victory) is modern standard
- **Client-side analytics**: Server-side or DB views prevent data inconsistency

## Open Questions

Things that couldn't be fully resolved:

1. **Tank Capacity Per Property**
   - What we know: Different properties have different tank sizes
   - What's unclear: Should tank capacity be stored in properties table or inventory_movements?
   - Recommendation: Add `tank_capacity` column to properties table as reference value. Inventory movements can override if tank upgraded.

2. **Multiple Tanks Per Property**
   - What we know: Some properties might have multiple heating oil tanks
   - What's unclear: Track as separate inventory items or aggregate?
   - Recommendation: Start with single tank per property (simple). If multi-tank needed, add `tank_identifier` field to inventory_movements (e.g., "Tank A", "Tank B").

3. **Consumption During Delivery**
   - What we know: Delivery adds to tank, but consumption continues between readings
   - What's unclear: Should delivery movement include consumption adjustment?
   - Recommendation: Delivery sets new baseline. Next reading will show consumption from that baseline. Don't try to model intra-delivery consumption.

4. **Alert Notification Method**
   - What we know: System should alert when stock low
   - What's unclear: Email? Dashboard badge? Push notification? (PUSH-01 is separate phase)
   - Recommendation: Phase 20 shows alerts in dashboard only. Phase 22 (Push Notifications) adds proactive alerts.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/types/suppliers.ts` - Purchase order and delivery types
- Existing codebase: `supabase/migrations/051_purchase_orders.sql` - PO schema pattern
- Existing codebase: `supabase/migrations/052_deliveries.sql` - Deliveries schema pattern
- Existing codebase: `src/app/api/deliveries/route.ts` - API route patterns
- Existing codebase: `.planning/phases/19-supplier-core/19-RESEARCH.md` - Phase 19 foundation

### Secondary (MEDIUM confidence)
- [Inventory Management in 2026](https://www.getmaintainx.com/blog/inventory-management) - Inventory control best practices
- [Reorder Point Formula Guide](https://www.inflowinventory.com/blog/reorder-point-formula-safety-stock/) - Reorder calculation methods
- [8 Best React Chart Libraries 2025](https://embeddable.com/blog/react-chart-libraries) - React charting comparison
- [Recharts Documentation](https://recharts.github.io/en-US/guide/getting-started/) - Official Recharts guide
- [Multi-Location Inventory Allocation](https://retalon.com/blog/inventory-allocation) - Allocation logic best practices
- [Seasonal Heating Oil Demand](https://www.dwenergygroup.com/understanding-seasonal-demand-and-oil-prices/) - Seasonal consumption patterns

### Tertiary (LOW confidence)
- [Heating Oil Price Trends 2025](https://www.accio.com/business/heating-oil-trends) - Price forecasting context
- [Wood Pellets Market Trends](https://www.accio.com/business/pellets-trends) - Pellets consumption patterns
- WebSearch results on commodity pricing analytics - General analytics patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts is established React library, PostgreSQL time-series proven
- Architecture: MEDIUM - Inventory movements pattern is standard but not in existing codebase
- Pitfalls: MEDIUM - Based on inventory management best practices and reorder point literature
- Code examples: HIGH - Adapted from existing Phase 19 patterns and Recharts docs

**Research date:** 2026-01-27
**Valid until:** 2026-03-27 (60 days - patterns stable, Recharts API stable, no fast-moving dependencies)
