# OpenTool Mesh Dashboard Mockup Spec

## Overview

- Artifact: `opentool-mesh-dashboard-mockup.png`
- Format: desktop dashboard mockup
- Resolution: `1536x1024`
- Design goal: explain one complete `publish -> discover -> verify -> call -> trace -> report` run for a Solidity audit agent
- Audience: hackathon judges, AI infra builders, MCP / agent developers

## Visual Direction

- Positioning: infra-first product UI, not a consumer analytics dashboard
- Tone: verifiable, technical, calm, high-signal
- Style: dark graphite base with restrained glass panels, thin data lines, bright status accents
- Text language: English UI copy for demo clarity

## Color System

- Page background: `#0B1020`
- Primary card background: `#121A2B`
- Secondary surface / inset: `#0F172A`
- Border / divider: `#1E2A44`
- Primary text: `#E2E8F0`
- Muted text: `#94A3B8`
- Cyan accent: `#60A5FA`
- Teal accent: `#2DD4BF`
- Success: `#22C55E`
- Warning: `#F59E0B`
- Error / high risk accent if needed in implementation: `#F97316`

## Typography

- Recommended headline font: `Space Grotesk`
- Recommended UI font: `Inter`
- H1 / product title: 30-34px, semibold
- Section title: 18-20px, semibold
- Metric / badge text: 12-14px, medium
- Body / metadata rows: 13-14px, regular
- Use tabular numerals for hashes, versions, and counts

## Page Structure

- Header bar across top
- Left-side vertical run timeline / navigation rail
- Main content area as a `2 x 2` grid of four large cards
- Bottom full-width report strip anchored below the grid

## Header

- Left: `OpenTool Mesh` product title
- Center-left: run title `Solidity Audit Run`
- Right: compact status chips such as `Verified`, `AXL Live`, `Trace Stored`
- Optional run selector / environment pill near top-right

## Left Rail

- Purpose: reinforce lifecycle order at a glance
- Show six compact steps:
- `Publish`
- `Discover`
- `Verify`
- `Call`
- `Trace`
- `Report`
- Current run highlight should sit around `Call` or `Trace`
- Use subtle connector line between steps

## Main Grid

- Four equally weighted cards with prominent titles:
- `Discovery`
- `Manifest`
- `Invocation`
- `Memory`
- Card treatment: 20-24px radius, thin border, mild glow on active data, generous padding

## Card 1: Discovery

- Goal: show capability-based resolution rather than hardcoded endpoint usage
- Required fields:
- `Requested capability: solidity-static-analysis`
- `Resolved identity: scanner.audittool.eth`
- `Tool: solidity-pattern-scanner`
- `Optional node: test-case-suggester`
- Visual support:
- small path line from capability query to ENS identity
- candidate tool list or capability match badge
- one emphasis chip that reads like `Not hardcoded`

## Card 2: Manifest

- Goal: show trust and compatibility checks before invocation
- Required fields:
- `Manifest URI: 0g://manifests/scanner/v1.2.0`
- `Schema: verified`
- `Owner signature: valid`
- version row
- owner row
- manifest hash row
- compatibility or schema status row
- Visual support:
- verification checklist
- hash pill
- trust badge in success green

## Card 3: Invocation

- Goal: show remote execution over AXL between agent and tool node
- Required fields:
- `AXL peer: axl://scanner-node-01`
- `Tool call: success`
- request payload summary
- response findings summary
- Visual support:
- directional request / response line between `Audit Agent` and `Remote Tool Node`
- structured response badge with findings count
- highlight that tool node is external, not local function call

## Card 4: Memory

- Goal: show trace persistence and provenance on 0G
- Required fields:
- `Input hash`
- `Output hash`
- `Trace URI: 0g://traces/run-2048`
- artifact or report reference row
- status row for trace persistence
- Visual support:
- storage block labeled `0G`
- linked artifacts / trace chips
- provenance-friendly rows with monospaced hashes

## Bottom Report Strip

- Title: `Final audit report`
- Summary rows:
- `Findings: 3`
- `Severity: High 1  Medium 1  Low 1`
- trace reference
- short bullet summary area for the top issues
- Make this strip feel like the user-facing outcome of the four cards above

## Content Hierarchy

- The four cards are the primary teaching device
- The bottom report is the synthesized outcome
- The left rail and top chips provide narrative scaffolding
- Avoid generic analytics widgets that do not serve discovery / manifest / invocation / memory

## Implementation Notes For `/apps/dashboard`

- Build as a single responsive desktop-first page
- Recommended max content width: `1440px`
- Grid:
- left rail `220px`
- main area `1fr`
- card grid gap `20-24px`
- Use CSS variables for all core colors
- Prefer reusable primitives:
- `StatusChip`
- `InfoRow`
- `HashPill`
- `SectionCard`
- `TraceLine`
- `SeverityBadge`
- Keep text editable in code so product copy can be iterated quickly

## Responsive Guidance

- Primary target is desktop demo on a large screen
- On narrower widths, collapse left rail above the grid
- Stack the four cards into one column below `1024px`
- Keep section order: `Discovery -> Manifest -> Invocation -> Memory`

## Asset Metadata

- Source: `designer`
- Confidence: `1.0`
- Artifact kind: `design_mockup`
- Artifact path base: `designs/opentool-mesh-dashboard`
- Prompt size intent: `ui mockup / desktop widescreen feel`
