# Phase 37 Context: RLS Enablement & Context Wiring

## Phase Goal
Every database query is automatically scoped to the current organization via RLS, enforced at the database level with no application-layer bypass possible.

## Decisions

### 1. Existing RLS Teardown

**Decision**: Komplett ersetzen -- alle 7 bestehenden Policies aus 029_rls_policies.sql droppen und durch org-basierte Policies ersetzen.

- DROP POLICY auf allen 7 Tabellen, dann neue org-basierte Policies erstellen
- `is_internal_user()` Funktion: vor dem Droppen prüfen ob sie noch anderswo referenziert wird (Grep über codebase + DB-Funktionen). Wenn unreferenziert → mitdroppen
- Kein Fallback, kein Legacy-Support -- sauberer Schnitt

### 2. Policy-Standard

**Decision**: Standardisierter 4er-Policy-Satz für alle Tenant-Tabellen.

- Jede Tenant-Tabelle erhält identische Policies: SELECT, INSERT, UPDATE, DELETE
- Policy-Typ: **RESTRICTIVE** (alle Policies müssen matchen, nicht nur eine)
- RESTRICTIVE ermöglicht späteres Layering (Mandate-Ebene, Rollen-Ebene) ohne bestehende Policies zu ändern
- USING clause: `organization_id = current_organization_id()`
- WITH CHECK clause (INSERT/UPDATE): `organization_id = current_organization_id()`

### 3. Organization Context Flow

**Decision**: Middleware setzt Header, createOrgClient liest Header + ruft RPC.

- **Login**: Bleibt unverändert. Middleware löst Org-Kontext beim Dashboard-Eintritt auf
- **Middleware**: Liest Cookie `organization_id`, falls leer → Default-Org aus `organization_members` (is_default=true). Setzt `x-organization-id` Response-Header
- **createOrgClient(request)**: Liest `x-organization-id` Header, erstellt Supabase-Client, ruft `set_org_context()` RPC auf
- **PgBouncer**: RPC-Ansatz (set_org_context als expliziter RPC-Call pro Request). Sicher mit Connection Pooling, kein SET LOCAL nötig
- **Edge Case "kein User-Org"**: Kann nach Phase 36 nicht passieren, kein Handling

### 4. API Route Migration

**Decision**: Alle ~119 Routen auf einmal umstellen, kein Mischzustand.

- **Mechanischer Change**: createClient → createOrgClient für alle Tenant-Routen
- **Drei Client-Typen**:
  - `createOrgClient(request)` -- Tenant-scoped Queries (Standardfall, ~95% der Routen)
  - `createPublicClient()` -- Globale Lookup-Tabellen ohne org_id (ticket_categories etc.)
  - `createServiceClient()` -- Admin-Operationen (explizite Liste, z.B. User-Management)
- **Explizite Service-Role-Liste**: Nur definierte Routen dürfen Service-Role nutzen, alles andere muss createOrgClient verwenden
- **Fail-fast**: createOrgClient wirft 401 wenn kein x-organization-id Header vorhanden. Fehler wird im System unmöglich gemacht, nicht versteckt

### 5. Isolation Verification

**Decision**: Permanente Test-Org + SQL-Level CRUD-Test + Migration bricht bei Fehler ab.

- **Test-Org**: "Imeri Immobilien AG" als permanente zweite Organisation in Migration seeden (nützlich für zukünftige Tests, Phase 38+ Entwicklung)
- **Test-Tiefe**: SQL-Level DO-Block in Migration. API-Level-Tests kommen mit Phase 38
- **CRUD-Scope**: Voller CRUD-Test (SELECT, INSERT, UPDATE, DELETE cross-tenant)
- **Fehlerverhalten**: RAISE EXCEPTION -- Migration bricht ab wenn ein Cross-Tenant-Zugriff möglich ist. Keine unsichere DB in Produktion

## Deferred Ideas (Out of Scope)

- **Auth-Hardening / Onboarding**: PIN-Login erst nach Verifizierung (Passwort/PIN-Setup, 2FA). Intelligentes Onboarding für Erst-Installation auf mehreren Rechnern in einer Firma → eigener Phase-Kandidat
- **DB-Abstraktion**: Zukünftiger Wechsel zu Convex oder Clerk-Auth → createOrgClient als sauber austauschbare Abstraktionsschicht vorbereitet, konkreter Wechsel ist eigene Phase

## Constraints

- PIN-basierte Auth bleibt; RLS-Kontext via set_config()/current_setting(), nicht auth.jwt()
- PgBouncer-kompatibel (RPC statt SET LOCAL)
- Alle Entscheidungen aus Phase 35/36 gelten (siehe STATE.md Decisions)
- quality_gates Tabelle fehlt in Produktion (Migration 072 übersprungen) -- bei RLS-Enablement beachten

---
*Created: 2026-02-18 -- Phase 37 discuss-phase complete*
