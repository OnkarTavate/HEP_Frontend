---
target: Cargo Analytics dashboard (components/cargo-analytics)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/home/boss/Desktop/Chennai port/HEP_Frontend/src/components/cargo-analytics/CargoAnalyticsDashboard.jsx"
target_fingerprint: "sha256:3e27253437f940c253fe83e5da0c74f165d069750b5f18a480bc34e3c195ceb0"
target_path: /home/boss/Desktop/Chennai port/HEP_Frontend/src/components/cargo-analytics/CargoAnalyticsDashboard.jsx
timestamp: 2026-10-09T05-59-27Z
slug: rgo-analytics-cargoanalyticsdashboard-jsx-15b3c0f9
---
Method: dual-agent (A: design review · B: detector)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Stale data shown with only an 8px pulsing dot while refetching; "Updated" stamp is render time, not data time |
| 2 | Match System / Real World | 4 | Officers' vocabulary throughout (EIR, Form 13, OOC, Rapiscan, dwell, shifts) |
| 3 | User Control and Freedom | 3 | router.replace erases filter history from Back; "Custom" chip is dead; column choices lost on tab switch |
| 4 | Consistency and Standards | 3 | Consistent with portal; delta semantics only in a title tooltip |
| 5 | Error Prevention | 2 | min/max net not validated; shift 3 midnight wrap unexplained; export of up to 50k rows with no warning |
| 6 | Recognition Rather Than Recall | 3 | Active-filter chips good; deep-linked exception views have no "why am I here" banner |
| 7 | Flexibility and Efficiency | 3 | Deep links, presets, exports; no keyboard sort, no copy-link, no saved views |
| 8 | Aesthetic and Minimalist Design | 2 | 8 gradient tiles + 8 chart cards + 6 exception cards; hover shadows on non-clickable cards; DB table names in footer |
| 9 | Error Recovery | 3 | Specific error messages; no retry CTA inside the error box |
| 10 | Help and Documentation | 1 | No in-context definitions for dwell, p90, variance, Σ; encodings explained only in subtitles |
| **Total** | | **26/40** | Solid, needs accessibility and load-state work |

## Deterministic scan
1 finding: ai-color-palette on KpiTile.jsx:11 (violet→purple gradient, live via the Customs OOC tile). No other rules fired across 17 files.

## Priority issues
- P0 Sortable headers and clickable rows are mouse-only (DataTableTab.jsx)
- P0 White text on orange/teal/sky/emerald KPI tiles and the active orange filter chip fail WCAG AA (KpiTile.jsx TONES, GlobalFilterBar chipOn)
- P1 No honest refreshing state after first load (useTrafficData.js, ChartCard, DataTableTab); "Updated" stamp lies
- P1 Deep-linked exception states lack a context banner
- P2 Filter bar overload: dead Custom chip, no copy-link, shift-3 wrap unexplained; mobile filter bar ~6 rows tall
- P2 Mobile KPI grid at 400px clips long values
- P3 Developer residue footer (source table names)

## Persona red flags
- Alex: column visibility resets per tab/refresh; hidden columns still exported; no saved view; no Enter-to-apply.
- Jordan: 24 numbers before any chart, undefined jargon, invisible row-click affordance, dead Custom chip.
- Sam: 10–11.5px uppercase bold labels, slate-400 text at 2.56:1, warning yellow at 1.83:1 in gate bar, tabs overflow at 125% zoom.

## Minor
Hover shadow on non-interactive ChartCard; pointer-only chart tooltips; RankedBars opacity double-encoding; "Inside" rendered like a placeholder; 3-decimal weights; dark-mode chart inks hardcoded light; sticky tabs without sticky filter summary.
