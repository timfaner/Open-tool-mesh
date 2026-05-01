# Manifest Contract Reference

This document explains the manifest contract used by the current MVP.

## Read This After

Read [System Overview](./system-overview.md) and [Module Interfaces](./module-interfaces.md) first.

## Source of Truth

Use these files as the implementation source:

- `packages/shared/src/manifest.ts`
- `services/tool-node/manifests/solidity-pattern-scanner.manifest.json`
- `packages/sdk/src/client/create-client.ts`

## What the Manifest Is For

The manifest is the published description of a tool. It lets an agent and SDK know:

- Which tool is being called.
- Who owns it.
- Which capabilities it supports.
- Which MCP-compatible input/output metadata it exposes.
- How to invoke it.
- Where its stored manifest lives.
- Which schema and SDK versions it is compatible with.
- Which integrity hash should be verified.

## Related Contracts

### `ToolManifest`

The full manifest document loaded by the SDK and used during verification and invocation.

### `ToolIdentity`

The resolved ENS-style identity record that points to the manifest URI and owner address.

### `CapabilityIndexEntry`

The index entry that maps a capability to one or more tool identities.

## Top-Level Shape

The current manifest shape contains:

```text
schemaVersion
toolId
owner
capabilities
mcp
invocation
storage
compatibility
integrity
```

## Key Fields

### `schemaVersion`

The manifest schema version supported by the current SDK.

### `toolId`

Stable identifier for the tool, such as `solidity-pattern-scanner.opentool.eth`.

### `owner`

Owner identity and address used for MVP owner-binding checks.

### `capabilities`

List of capabilities supported by the tool. The sample capability is `solidity-static-analysis`.

### `mcp`

MCP-compatible tool metadata, including name, description, input schema, and output schema.

### `invocation`

Invocation metadata, including the AXL peer ID and method used by the SDK to call the tool node.

For provider-backed Gensyn AXL integration, `axlPeerId` should map to the remote AXL peer ID. The current `axlMethod` field can carry the transitional call target, but a future schema revision should separate the AXL MCP service name from the tool method if the runtime uses `POST /mcp/{peer_id}/{service}`.

### `storage`

Manifest storage metadata, including the local 0G-style `manifestUri`.

For provider-backed 0G integration, `manifestUri` should resolve to a 0G root or equivalent provider URI, with transaction metadata recorded in trace or publish output rather than hard-coded into local paths.

### `compatibility`

Compatibility requirements for SDK and schema versions.

### `integrity`

Manifest integrity metadata, especially `manifestHash`.

## Publish and Generation Flow

Publishing writes the manifest to local storage and updates identity/index state:

1. Read manifest JSON.
2. Compute or validate integrity fields.
3. Persist the manifest under `.opentoolmesh/storage/manifests/`.
4. Write ENS-style identity records.
5. Update the capability index.
6. Ensure tool-node peer metadata exists.

## Consumption Flow

The SDK consumes the manifest after discovery and identity resolution:

1. Discover a tool by capability.
2. Resolve the tool identity.
3. Load the manifest from its storage URI.
4. Verify manifest fields against identity metadata.
5. Use invocation metadata to call the tool node.

## Verification Flow

The MVP verification checks:

- Manifest hash.
- Owner binding.
- Schema version.
- SDK compatibility.

These checks are local MVP checks, not production network verification.

## Minimal Example

```json
{
  "schemaVersion": "0.1.0",
  "toolId": "solidity-pattern-scanner.opentool.eth",
  "owner": {
    "address": "0x0000000000000000000000000000000000000001"
  },
  "capabilities": ["solidity-static-analysis"],
  "mcp": {
    "name": "solidity-pattern-scanner",
    "description": "Scans Solidity source for simple risk patterns",
    "inputSchema": {
      "type": "object"
    },
    "outputSchema": {
      "type": "object"
    }
  },
  "invocation": {
    "axlPeerId": "local-tool-node",
    "axlMethod": "invokeTool"
  },
  "storage": {
    "manifestUri": "opentool://manifests/solidity-pattern-scanner.json"
  },
  "compatibility": {
    "minSdkVersion": "0.1.0"
  },
  "integrity": {
    "manifestHash": "sha256:example"
  }
}
```

For exact current fields, use the sample manifest file in `services/tool-node/manifests/`.

## How Other Modules Consume It

### CLI

Reads the manifest for publishing and command output.

### SDK

Loads, verifies, and uses invocation metadata.

### Tool Node

Provides the callable endpoint described by the manifest.

### Audit Agent

Uses the SDK to discover, load, verify, invoke, and trace the manifest-backed tool.

### Dashboard

Displays manifest fields linked to the selected trace.

## Minimal Interaction Example

```ts
const identity = await client.resolveIdentity({ toolId });
const manifest = await client.loadManifest({ manifestUri: identity.manifestUri });
const verification = await client.verifyManifest({ manifest, identity });
```

## In Scope vs Out of Scope

In scope:

- Current MVP manifest shape.
- Local publish and verification semantics.
- SDK and dashboard consumption.

Out of scope:

- A stable public protocol specification.
- Real chain-based ownership verification.
- Marketplace metadata beyond the sample demo.

See [Real Provider Integration Notes](./real-provider-integration.md) for the current provider-backed design direction.

## Code Entry Points

- `packages/shared/src/manifest.ts`
- `packages/sdk/src/client/create-client.ts`
- `services/tool-node/manifests/solidity-pattern-scanner.manifest.json`
