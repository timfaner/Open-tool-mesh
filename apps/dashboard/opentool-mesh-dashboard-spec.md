# OpenTool Mesh Dashboard Mockup Spec

## Overview

- Artifact: `opentool-mesh-dashboard-mockup.png`
- Format: desktop dashboard mockup for judge demo
- Resolution: `1536x1024`
- Design goal: explain one complete `publish -> discover -> verify -> call -> trace -> report` lifecycle through a single Solidity audit run
- Audience: hackathon judges, AI infra builders, agent framework developers
- Narrative priority: make the tool flow legible before it feels like a product dashboard

## Visual Direction

- Positioning: protocol observability surface, not a generic SaaS analytics app
- Mood: high-signal, verifiable, technical, slightly cinematic
- Style: dark blueprint background, rigid card grid, bright route lines, monospaced evidence pills
- Design language: English UI copy for judge readability
- Anti-patterns to avoid: charts without meaning, KPI tiles, CRM tables, purple gradient startup wallpaper

## Color System

- Page background: `#07111F`
- Background glow: `#0C1830`
- Primary card: `#0F1B2D`
- Secondary inset: `#13233A`
- Border: `#22324D`
- Primary text: `#E6EEF8`
- Secondary text: `#8AA0B8`
- ENS accent: `#4CC9F0`
- 0G accent: `#2DD4BF`
- AXL accent: `#38BDF8`
- MCP accent: `#A78BFA`
- Success: `#22C55E`
- Warning: `#F59E0B`
- Severity orange: `#F97316`
- Severity red: `#EF4444`

## Typography

- Product / section headline font: `Space Grotesk`
- UI / metadata font: `IBM Plex Sans`
- Hashes / URIs / IDs: `IBM Plex Mono`
- Product title: `30-34px`, semibold
- Run title: `18-20px`, medium
- Card title: `20px`, semibold
- Info row label: `12px`, uppercase, medium, increased tracking
- Info row value: `13-14px`, regular or medium

## Frame Structure

- Top header across full width
- Left lifecycle rail
- Main `2 x 2` card matrix in exact order:
- `Discovery`
- `Manifest`
- `Invocation`
- `Memory`
- Bottom full-width `Final Audit Report` strip

## Header

- Left cluster:
- `OpenTool Mesh`
- subtitle: `Decentralized tool discovery, invocation, and execution memory`
- Middle cluster:
- `Solidity Audit Run #2048`
- compact contract reference such as `Vault.sol`
- Right cluster:
- status chips `Verified`, `AXL Live`, `Trace Stored`
- small environment badge such as `Hackathon MVP`

## Left Lifecycle Rail

- Six fixed nodes:
- `Publish`
- `Discover`
- `Verify`
- `Call`
- `Trace`
- `Report`
- Use a bright route line to show the run has advanced through all six stages
- `Discover`, `Verify`, `Call`, `Trace` should visually align with the four main cards
- Add a small legend near the bottom:
- `ENS = identity`
- `0G = storage + memory`
- `AXL = transport`
- `MCP = interface semantics`

## Main Card Rules

- All four cards use equal visual weight
- Rounded corners: `22-24px`
- Padding: `24px`
- Border: `1px solid #22324D`
- Each card has:
- section title
- one protocol tag row
- one compact visual diagram or route line
- 4 to 6 evidence rows matching architecture field names
- one short explanatory footer sentence for judges

## Card 1: Discovery

- Purpose: prove the agent resolves tools by capability instead of local hardcoded endpoint
- Protocol emphasis: `ENS` primary, `0G KV` secondary
- Required field labels:
- `requested capability`
- `candidate count`
- `resolved identity`
- `ens name`
- `selected reason`
- `not hardcoded`
- Required values:
- `solidity-static-analysis`
- `1 candidate`
- `otm:ens:solidity-scanner.auditagent.eth`
- `solidity-scanner.auditagent.eth`
- `best capability match`
- Visual:
- start node labeled `capability query`
- path arrow into an `ENS` badge
- resolve line into identity pill
- small side note that candidate list came from capability index
- Judge takeaway sentence:
- `Discovery starts from capability, not a baked-in endpoint.`

## Card 2: Manifest

- Purpose: show that the selected tool is verified before execution
- Protocol emphasis: `MCP-compatible manifest` plus `0G Storage`
- Required field labels:
- `manifest URI`
- `manifest hash`
- `owner`
- `version`
- `schema status`
- `sdk version range`
- `owner valid`
- `version compatible`
- Required values:
- `0g://manifests/otm_ens_solidity-scanner.auditagent.eth-0.1.0.json`
- `sha256:ddd20540138a8fb9711cb3d751f940964390d3a9fb54e147c0284e6205f64524`
- `0x1234...5678`
- `0.1.0`
- `verified`
- `^0.1.0`
- `true`
- `true`
- Visual:
- manifest document block with `MCP` tag
- verification checklist with green checks
- 0G URI and hash displayed as mono pills
- Judge takeaway sentence:
- `OpenTool Mesh verifies schema, owner, hash, and version before call.`

## Card 3: Invocation

- Purpose: make remote execution over AXL obvious
- Protocol emphasis: `AXL`
- Required field labels:
- `transport`
- `AXL peer`
- `method`
- `tool call status`
- `request uri`
- `response summary`
- Required values:
- `axl`
- `axl-peer-solidity-01`
- `invokeTool`
- `ok`
- optional example `0g://requests/trace_01.json`
- response summary like `3 findings returned`
- Visual:
- left node `Audit Agent`
- right node `Remote Tool Node`
- bright bi-directional AXL line with request and response arrows
- badge stating `external node`
- short payload chip `source -> findings`
- Judge takeaway sentence:
- `Invocation crosses node boundaries; the tool is not an internal function.`

## Card 4: Memory

- Purpose: prove execution evidence is persisted and reviewable
- Protocol emphasis: `0G Storage`
- Required field labels:
- `trace id`
- `input hash`
- `output hash`
- `trace URI`
- `artifact`
- `persisted at`
- `backend`
- Required values:
- `trace_01`
- `sha256:input123`
- `sha256:output123`
- `0g://traces/trace_01.json`
- `0g://artifacts/trace_01/findings.json`
- `2026-04-28T00:00:19.000Z`
- `0g-storage`
- Visual:
- stacked storage blocks labeled `trace`, `artifact`, `report`
- connecting lines from invocation result into `0G Storage`
- provenance-oriented mono pills for hashes and URIs
- Judge takeaway sentence:
- `Every call leaves verifiable memory: which tool, which manifest, which input, which output.`

## Bottom Strip: Final Audit Report

- Title: `Final Audit Report`
- Must visually feel like the synthesis of the four cards above
- Required content:
- report summary sentence
- severity counters: `High 1`, `Medium 1`, `Low 1`
- top finding: `Reentrancy risk in withdraw()`
- trace reference: `trace_01`
- tool reference: `solidity-pattern-scanner`
- final report pointer: `0g://reports/audit_run_01.md`
- Layout:
- left: verdict and finding summary
- center: top 2 issue bullets
- right: report URI and trace reference chips

## Field Alignment With Architecture Doc

- Discovery card maps to `ExecutionTrace.discovery`
- Manifest card maps to `ToolManifest` and `ExecutionTrace.verification`
- Invocation card maps to `ToolInvocationRequest`, `ToolInvocationResponse`, and `ExecutionTrace.invocation`
- Memory card maps to `ExecutionTrace.io`, `ExecutionTrace.artifacts`, and `ExecutionTrace.storage`
- Bottom report strip maps to `AuditReport`

## Protocol Mapping Rules

- `ENS` appears in Discovery as the identity resolution step
- `0G KV` may appear subtly in Discovery as the capability index source
- `MCP-compatible manifest` appears in Manifest as the interface/schema contract
- `0G Storage` appears in Manifest and Memory for manifest persistence, trace persistence, artifacts, and final report
- `AXL` appears only in Invocation as the remote transport line
- Do not blur these responsibilities across cards

## Components For Frontend Developer

- `HeaderRunBar`
- `LifecycleRail`
- `SectionCard`
- `ProtocolTag`
- `InfoRow`
- `MonoPill`
- `RouteLine`
- `NodeBadge`
- `StatusChip`
- `VerificationChecklist`
- `SeverityChip`
- `ReportStrip`

## Layout And Spacing

- Max content width: `1440px`
- Left rail width: `220px`
- Main panel gap: `24px`
- Card grid columns: `minmax(0, 1fr) minmax(0, 1fr)`
- Bottom strip height target: `180-220px`
- Use CSS variables for the full color system

## Responsive Guidance

- Primary target remains desktop judge demo
- Below `1180px`, move left rail above cards as a horizontal lifecycle strip
- Below `1024px`, stack cards in exact narrative order:
- `Discovery`
- `Manifest`
- `Invocation`
- `Memory`
- Keep bottom report strip last

## Source Prompt Metadata

- Source: `designer`
- Confidence: `1.0`
- Artifact kind: `design_mockup`
- Artifact path base: `designs/opentool-mesh-dashboard`
- Prompt mode: built-in `image_gen`
- Original generated file: `/home/wanman/.codex/generated_images/019dd48a-1c34-7d82-8c5c-3afeac56a1ad/ig_00d01d24367b93700169f0c7985b8c8191a849165512cbbd7b.png`
