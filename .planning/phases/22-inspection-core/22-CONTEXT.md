# Phase 22: Inspection Core — Context

## Phase Goal
Users can conduct inspections with checklists, capture defects, and collect signatures.

## Decisions

### 1. Checklist Templates

- **Template scope**: Per project + trade. Projects can customize templates per trade (Gewerk), inherited from global defaults but editable per project.
- **Editability**: Fully editable after creation. Template is a starting point — user can add, remove, and reorder items.
- **Item structure**: Items organized in sections/groups (e.g., "Oberflächen", "Anschlüsse"). Each item has title + description + result (pass/fail/na). Grouping provides structure, fields stay simple.
- **Population**: Auto-suggested from work order context (trade/type), but user can override or pick a different template. Both automatic and manual selection supported.

### 2. Defect Severity & Flow

- **Classification**: Three severity levels — Gering (cosmetic), Mittel (functional but usable), Schwer (must fix before acceptance).
- **Logging action**: Defects are flagged during inspection. After inspection completion, user reviews all flagged defects and decides action.
- **Post-review actions**: Three options per defect — Create task (generate work order subtask), Defer (postpone to next inspection), Dismiss (mark as not actionable).
- **Completion with defects**: Warn but allow. System warns about open defects but does not block completion. User acknowledges the warning.
- **Defect scope**: Both item-linked and independent. Defects can originate from failed checklist items (auto-linked) or be added independently for issues outside the formal checklist.
- **Defect lifecycle**: Own status lifecycle (open → in-progress → resolved). Independent of linked tasks. Shows resolution progress on the inspection.
- **Photos**: Optional with nudge. System prompts "Möchten Sie ein Foto hinzufügen?" when no photo attached, but doesn't require it.
- **Storage**: Dedicated inspections bucket (separate from media bucket). Path pattern: inspections/{id}/defects/ for defect photos.

### 3. Signature Capture UX

- **Signatories**: Contractor only. The Handwerker signs to acknowledge inspection results.
- **Signing point**: At completion after reviewing summary. Signatory sees the full picture (all results, defects highlighted) before signing.
- **Review screen**: Full summary with defect highlights. Shows all checklist results with failed items and defects prominently highlighted. Contractor sees exactly what's flagged.
- **Capture method**: Canvas drawing + typed name. Person draws signature on canvas AND types their name for identification.
- **Signature output**: PNG stored in inspections bucket + embedded in generated PDF protocol. Metadata recorded: signer name, role, timestamp. Creates audit trail.
- **Signing device**: Both options. In-person signing on inspector's device is primary. Portal link (like change order magic link) as fallback for remote sign-off.
- **Formality level**: Configurable per template type. Some inspections are informal checks, others are formal Abnahmeprotokoll with legal weight. Template defines the formality level.
- **Refusal handling**: Inspector marks "Unterschrift verweigert" with mandatory reason field. Inspection can be completed without signature. Documents why contractor didn't sign.

### 4. Follow-up Task Rules

- **Task sources**: Both failed checklist items and logged defects can generate follow-up tasks. Two entry points into task creation.
- **Task type**: Work order subtask. Created as a subtask on the existing work order that was inspected. Keeps everything in one place.
- **Assignment**: Inspector manually selects assignee during task creation. Could be the same contractor or a different one.
- **Re-inspection**: Phase 23 scope. Phase 22 creates the tasks only. Re-inspection scheduling and parent-child tracking is handled in Phase 23 (Inspection Advanced).

## Deferred Ideas

None captured.

## Constraints

- Must integrate with existing work order system (subtasks on existing work orders)
- Signature portal reuses magic link pattern from Phase 21
- Photo storage uses new dedicated inspections bucket (not the existing media bucket)
- Defect lifecycle is independent — not derived from task status
- Re-inspection logic is explicitly out of scope (Phase 23)

---
*Created: 2026-01-28*
*Source: discuss-phase session*
