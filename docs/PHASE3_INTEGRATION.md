# Phase 3 Integration Guide — Academics Module

> Status: Completed
> Date: April 9, 2026

## Overview

Phase 3 (Academics) is implemented end-to-end and includes:

- Subjects management
- Timetable scheduling (manual builder)
- Assessments and score entry
- Report card generation and export
- Academic calendar management (years and terms)

## Completion Matrix

| Component | Status | Implemented Features | Future TODO Features |
| --- | --- | --- | --- |
| Subjects | Done | CRUD, level/category filters, class-subject assignments, teacher binding | Bulk CSV import, curriculum template presets, subject dependency maps |
| Timetable | Done | Class timetable slots, assignment linking, conflict warnings, slot CRUD | Drag-and-drop grid editor, real-time conflict heatmap, auto-slot suggestion engine |
| Assessments | Done | Assessment types, assessment CRUD, score entry, weighted computation support | Spreadsheet keyboard mode, moderation workflow, analytics by competency |
| Report Cards | Done | Generate by class+term, list/filter/search, PDF export, delete/update | Branded template builder, guardian e-sign flow, publish/lock cycle controls |
| Academic Calendar | Done | Academic year CRUD, term CRUD, set current year/term, protected deletes | Holiday overlays, ICS sync, automated rollover with approval gates |

## Key Files

- src/pages/admin/academics/SubjectsPage.jsx
- src/pages/admin/academics/TimetablePage.jsx
- src/pages/admin/academics/AssessmentsPage.jsx
- src/pages/admin/academics/ReportCardsPage.jsx
- src/pages/admin/academics/CalendarPage.jsx
- src/services/api/subjects.js
- src/services/api/timetable.js
- src/services/api/assessments.js
- src/services/api/reportCards.js
- src/services/api/academicYears.js
- src/hooks/useSubjects.js
- src/hooks/useTimetable.js
- src/hooks/useAssessments.js
- src/hooks/useReportCards.js
- src/hooks/useSchool.js

## Completion Decision

Phase 3 is confirmed complete based on implemented scope and removal of the Academic Calendar placeholder.

## Next Phase

Proceed with Phase 4 (Attendance hardening and analytics backlog), then Phase 5 (Finance).

Recommended next implementation priority:

1. Attendance heatmap and trend analytics
2. Attendance parent notification automation
3. Attendance anomaly detection (chronic absence and lateness)
