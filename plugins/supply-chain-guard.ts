// Auto-discovery shim for OpenCode.
//
// OpenCode's plugin loader scans top-level .ts files in plugins/ but does
// NOT recurse into subdirectories. The real implementation lives in
// plugins/supply-chain-guard/ (split into SRP modules); this file exists
// solely so the loader sees `SupplyChainGuard` and registers it.
//
// Do not delete unless OpenCode's plugin loader starts auto-discovering
// subdirectory index.ts files.
export { SupplyChainGuard } from "./supply-chain-guard/index.ts"
