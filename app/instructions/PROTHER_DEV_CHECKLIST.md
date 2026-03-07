# Prother Development Cycle Checklist

Run through this checklist after every development cycle / before every release.

---

## How to Use
- Go through each section after completing a phase or before merging a PR
- Mark items: `[x]` = pass, `[ ]` = needs work, `[N/A]` = not applicable this cycle
- If any 🔴 item fails, **do not release**
- Items marked `⚠️ RUNTIME` can only be verified by running actual code/tests — not by reading docs

---

## 🔴 BLOCKERS (Must pass before any release)

### Gemini Rate Limits
- [ ] Onboarding UI does NOT claim "unlimited" enhancements
- [ ] Rate limit messaging accurately states: 15 RPM, 1,500 RPD on free tier
- [ ] `⚠️ RUNTIME` Client-side request queuing is implemented (min 4s gap between Gemini calls)
- [ ] `⚠️ RUNTIME` Enhancement uses a single API call (system prompt + context + user prompt in one request)
- [ ] `⚠️ RUNTIME` 429 responses are caught and shown as friendly notifications, not raw errors

### Native Addon Compatibility (Wake Word only — Phase 4+)
- [ ] `⚠️ RUNTIME` Vosk loads successfully in a `worker_threads` Worker inside VS Code Extension Host
- [ ] `⚠️ RUNTIME` naudiodon loads successfully in the same worker thread
- [ ] `⚠️ RUNTIME` Tested on: Windows x64
- [ ] `⚠️ RUNTIME` Tested on: macOS ARM (M1/M2/M3)
- [ ] `⚠️ RUNTIME` Tested on: macOS x64
- [ ] `⚠️ RUNTIME` Tested on: Linux x64
- [ ] `⚠️ RUNTIME` Native addons compiled against correct Electron/Node ABI version (`@electron/rebuild` or `prebuild-install --runtime=electron`)
- [ ] `⚠️ RUNTIME` Extension still activates and works if native addons fail to load (graceful fallback to hotkey-only)

### Vosk Model Licensing
- [ ] Using `vosk-model-small-en-us-0.15` (confirmed Apache 2.0)
- [ ] NOT using any model with academic-use or research-only restrictions
- [ ] `LICENSE-MODELS` file exists in extension root with proper attribution
- [ ] Model download source documented (GitHub Releases: alphacephei/vosk-api)

### Native Runtime Dependencies
- [ ] `⚠️ RUNTIME` Windows: Extension works without manually installing Visual C++ Redistributable — OR — shows clear install instructions if vcredist is missing
- [ ] `⚠️ RUNTIME` Linux: Extension works without manually installing libatomic/libgomp — OR — shows clear install instructions
- [ ] `⚠️ RUNTIME` macOS: Extension works with standard Xcode CLI tools
- [ ] `⚠️ RUNTIME` All native module load failures are caught and produce user-friendly, platform-specific error messages (see `showPlatformSpecificError()` in architecture)

---

## 🟡 SIGNIFICANT (Must pass before public launch)

### Speech Extension Dependency
- [ ] `ms-vscode.vscode-speech` is listed as `extensionPack` (NOT `extensionDependencies`)
- [ ] `⚠️ RUNTIME` Runtime check exists: `vscode.extensions.getExtension('ms-vscode.vscode-speech')`
- [ ] `⚠️ RUNTIME` If Speech extension is missing, shows notification with "Install Now" button
- [ ] `⚠️ RUNTIME` Extension activates and shows onboarding even if Speech extension is not installed

### Offline & Network Failures
- [ ] `⚠️ RUNTIME` Voice-to-text works offline on Windows (verified)
- [ ] `⚠️ RUNTIME` Voice-to-text works offline on macOS (verified)
- [ ] `⚠️ RUNTIME` Voice-to-text offline on Linux (verified OR documented as platform-dependent)
- [ ] `⚠️ RUNTIME` Enhancement failure shows: "Network unavailable. Injecting raw prompt instead." with [Inject Raw] / [Retry] / [Cancel]
- [ ] `⚠️ RUNTIME` Provider errors (non-429) show friendly fallback notification
- [ ] `⚠️ RUNTIME` No raw error messages or stack traces shown to user

### Clipboard Safety
- [ ] `⚠️ RUNTIME` Previous clipboard content is saved before injection
- [ ] `⚠️ RUNTIME` Previous clipboard content is restored after injection
- [ ] `⚠️ RUNTIME` Clipboard restore has a reasonable delay (not racing with user actions)
- [ ] `⚠️ RUNTIME` For webview targets where auto-paste fails, shows "Prompt copied — paste with Ctrl+V" notification
- [ ] `⚠️ RUNTIME` No clipboard manipulation happens if command strategy succeeds (clipboard is fallback only)

### Remote / Headless Environment Detection
- [ ] `⚠️ RUNTIME` `vscode.env.remoteName` is checked on activation
- [ ] `⚠️ RUNTIME` If remote (SSH, WSL, Container): audio features are disabled with clear message
- [ ] `⚠️ RUNTIME` Status bar shows REMOTE state in remote environments
- [ ] `⚠️ RUNTIME` Extension does not crash in headless environments

### VS Code Web Compatibility
- [ ] `⚠️ RUNTIME` Extension gracefully handles VS Code Web (vscode.dev / Codespaces)
- [ ] `⚠️ RUNTIME` Shows message: "Prother requires VS Code Desktop" if `vscode.speech` is unavailable
- [ ] `⚠️ RUNTIME` No crashes or unhandled errors in web environment

### Gemini Model Stability
- [ ] Gemini model name is configurable via settings (`prother.llm.geminiModel`, not hardcoded)
- [ ] `⚠️ RUNTIME` If model returns 404, extension suggests updating to latest available model
- [ ] `⚠️ RUNTIME` Extension does not crash on model deprecation — shows user-friendly error

### Copilot Injection Stability
- [ ] `⚠️ RUNTIME` `workbench.action.chat.open` with `{ query: text }` is tested against current VS Code stable
- [ ] `⚠️ RUNTIME` Clipboard fallback works if chat command fails
- [ ] `⚠️ RUNTIME` Extension detection correctly identifies installed AI extensions
- [ ] `⚠️ RUNTIME` Terminal injection via `sendText()` works for Claude Code

### Google Free Tier Dependency
- [ ] Multi-provider support is implemented (Gemini is default, not the only option)
- [ ] Onboarding "Advanced Options" offers at least one alternative free/cheap provider
- [ ] If Gemini free tier changes, the extension can be updated to point to a different default

### Privacy & Compliance
- [ ] Privacy policy exists (`PRIVACY.md`) and is linked in `package.json` (`"privacy"` field)
- [ ] Privacy policy documents what telemetry data is collected
- [ ] `⚠️ RUNTIME` VS Code Telemetry API is used (respects user's telemetry settings)
- [ ] No prompt content is ever sent to any Prother-owned server
- [ ] API keys are stored only in VS Code SecretStorage (OS keychain)
- [ ] `⚠️ RUNTIME` API keys are never logged, telemetrized, or transmitted to Prother

### Error Handling (Per Phase)
- [ ] `⚠️ RUNTIME` Phase 1 components have try/catch with user-facing notifications
- [ ] `⚠️ RUNTIME` Phase 2 components handle API failures (invalid key, network error, rate limit)
- [ ] `⚠️ RUNTIME` Phase 3 components handle injection failures per target extension
- [ ] `⚠️ RUNTIME` No unhandled promise rejections in any module (global handler in extension.ts)

### Support Readiness
- [ ] `⚠️ RUNTIME` Error messages include diagnostic info or link to troubleshooting
- [ ] `⚠️ RUNTIME` "Report Issue" command (`prother.reportIssue`) exists and pre-fills GitHub issue template
- [ ] FAQ / troubleshooting section in README covers top 5 expected issues

---

## 🟢 MINOR (Should pass, not blocking)

### Build & CI
- [ ] `⚠️ RUNTIME` naudiodon prebuilt binaries exist for all 6 platforms (win/mac/linux x64+arm64)
- [ ] `⚠️ RUNTIME` CI builds on all target platforms (GitHub Actions matrix)
- [ ] `⚠️ RUNTIME` `prebuild-install` configured for native addon distribution
- [ ] `⚠️ RUNTIME` Extension .vsix size is within expected range (see size estimate below)

### License Attribution
- [ ] `LICENSE` file in extension root
- [ ] `LICENSE-MODELS` file for Vosk model attribution
- [ ] naudiodon / PortAudio license documented in NOTICE or LICENSE file
- [ ] All third-party dependencies have compatible licenses (Apache 2.0 / MIT)

### Performance
- [ ] `⚠️ RUNTIME` Vosk CPU usage measured on real hardware: ____% of single core
- [ ] `⚠️ RUNTIME` Wake word enable dialog warns about battery/CPU impact on laptops
- [ ] `⚠️ RUNTIME` Auto-suspend works (wake word stops when VS Code loses focus)
- [ ] `⚠️ RUNTIME` Extension activation time measured: ____ms (aim for < 100ms)

### Tests
- [ ] `⚠️ RUNTIME` Phase 1 unit tests pass: SpeechModule, CommandRouter, InjectModule
- [ ] `⚠️ RUNTIME` Phase 2 unit tests pass: KeyManager, OnboardingManager, EnhanceModule
- [ ] `⚠️ RUNTIME` Phase 3 integration tests pass: multi-provider, multi-target
- [ ] `⚠️ RUNTIME` Phase 4 compatibility tests pass: AI extension injection
- [ ] `⚠️ RUNTIME` All tests run in CI on every PR

---

## Extension Size Estimate

| Component | Size | When Shipped | Notes |
|---|---|---|---|
| Extension JS bundle (esbuild) | ~200-500 KB | Always in .vsix | TypeScript compiled + tree-shaken |
| Vosk native bindings (`vosk-node`) | ~5-8 MB | Always (1 platform per .vsix) | Prebuilt `.node` file for user's platform |
| naudiodon native bindings | ~1-2 MB | Always (1 platform per .vsix) | PortAudio `.node` file |
| Vosk model (`vosk-model-small-en-us-0.15`) | **~50 MB** | **Lazy-downloaded** | Only when user enables wake word |
| Webview assets (HTML/CSS/JS) | ~50-100 KB | Always | Onboarding + settings panels |
| Other (package.json, README, icons, etc.) | ~20-50 KB | Always | Metadata + branding |

### Size Scenarios

```
Scenario A: Model lazy-downloaded (RECOMMENDED)
================================================
Initial .vsix download:  ~8-12 MB
  (JS bundle + native bindings for 1 platform + assets)

After wake word first enable: +50 MB downloaded to extension storage
  (from GitHub Releases: alphacephei/vosk-api)

Total on disk:  ~60-62 MB

Scenario B: Model bundled in .vsix (NOT recommended)
=====================================================
.vsix download:  ~58-62 MB
  (Everything including model)

VS Code Marketplace limit: ~200 MB (technically OK)
But: Users download 60MB even if they never use wake word.
Marketplace reviewers may push back.
```

**Decision: Scenario A**. Initial install stays fast (~10 MB). Wake word model downloads only when user explicitly enables the feature. Download includes checksum verification + resume support.

### Comparison with Similar Extensions

| Extension | Size | Native Addons? |
|---|---|---|
| GitHub Copilot | ~15 MB | No |
| Cline | ~5 MB | No |
| Python (ms-python) | ~75 MB | Yes (Pylance) |
| C/C++ (ms-vscode.cpptools) | ~100+ MB | Yes (heavy) |
| **Prother (initial)** | **~8-12 MB** | Yes (Vosk + naudiodon) |
| **Prother (with model)** | **~60 MB** | Yes |

Prother's initial install size is comparable to Copilot. With the wake word model, it's comparable to ms-python — well within normal range.

---

## Per-Release Sign-Off

| Release | Date | Reviewed By | 🔴 Blockers Clear | 🟡 Significant Clear | Notes |
|---------|------|-------------|--------------------|-----------------------|-------|
| v0.1.0 (Phase 1) |  |  | [ ] | [ ] | Walking skeleton — no wake word, no enhancement |
| v0.2.0 (Phase 2) |  |  | [ ] | [ ] | Onboarding + enhancement working |
| v0.3.0 (Phase 3) |  |  | [ ] | [ ] | Multi-provider + multi-target |
| v0.4.0 (Phase 4) |  |  | [ ] | [ ] | Wake word + polish |
| v1.0.0 (Launch)  |  |  | [ ] | [ ] | Marketplace publish |
