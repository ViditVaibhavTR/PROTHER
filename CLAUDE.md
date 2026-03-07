# Prother — Claude Code Instructions

## What Is Prother
VS Code extension: voice-to-text for AI coding. User speaks prompts, they get injected into Copilot/Cline/Claude Code. BYOK model — users provide their own Gemini API key (free tier: 1M tokens/day, 15 RPM, 1,500 RPD).

## Architecture
- **No backend. No database. No OAuth. Zero infrastructure cost.**
- All LLM calls go direct from extension → provider API using user's own key
- Keys stored in VS Code SecretStorage (OS keychain)
- Wake word ("Hey Prother") uses Vosk + naudiodon in worker thread (Phase 4 only)
- Speech-to-text uses VS Code Speech API (`ms-vscode.vscode-speech`, soft dependency)

## Key Files
| File | Purpose |
|---|---|
| `PROTHER_SYSTEM_ARCHITECTURE.md` | Source of truth — all design decisions |
| `PROTHER_DEV_TRACKER.md` | Build progress — every file, feature, test |
| `PROTHER_DEV_CHECKLIST.md` | Quality gates — run before every release |
| `PROTHER_BYOK_ONBOARDING.md` | UX wireframes for first-time setup |

## Critical Constraints (Do Not Violate)
1. **Single API call per enhancement** — never split system prompt + context + user prompt into multiple calls (Gemini 15 RPM limit)
2. **Request queuing** — min 4s gap between LLM calls to same provider
3. **Gemini model name must be configurable** — setting `prother.llm.geminiModel`, never hardcode `gemini-1.5-flash` in API calls
4. **No "unlimited" claims** — say "~1,500 enhancements/day", not "unlimited"
5. **Soft dependency on Speech extension** — use `extensionPack` not `extensionDependencies`; runtime check with "Install Now" notification
6. **Remote/Web detection** — check `vscode.env.remoteName` and `typeof vscode.speech` on activation; disable audio gracefully
7. **Global unhandledRejection handler** — in extension.ts; no raw stack traces to users ever
8. **Native addon graceful fallback** — if Vosk/naudiodon fail to load, show platform-specific error, continue with Alt+V only
9. **All keys in SecretStorage only** — never in settings.json, never logged, never telemetrized

## Tech Stack
| Component | Technology | License |
|---|---|---|
| Language | TypeScript (strict) | — |
| Bundler | esbuild | MIT |
| Speech-to-text | VS Code Speech API | Microsoft |
| Wake word | Vosk (`vosk-model-small-en-us-0.15`) | Apache 2.0 |
| Mic capture | naudiodon (PortAudio) | Apache 2.0 |
| LLM (default) | Gemini 1.5 Flash (user's key) | Google ToS |
| LLM (alt) | Anthropic, OpenAI, Groq (user's key) | Respective ToS |
| Key storage | VS Code SecretStorage | VS Code API |

## Build Phases
- **Phase 1** (Weeks 1-2): Walking skeleton — Alt+V → speak → text in Copilot
- **Phase 2** (Weeks 3-4): Onboarding + enhancement — BYOK setup, Gemini API, prompt enhancement
- **Phase 3** (Weeks 5-6): Multi-provider + multi-target — 4 LLM providers, 4 injection targets
- **Phase 4** (Weeks 7-8): Wake word + polish — Vosk, naudiodon, marketplace publish

## Folder Structure (src/)
```
src/
  extension.ts          # Entry point + global error handler + env checks
  core/                 # CommandRouter, types, constants, errors, events
  speech/               # SpeechModule, transcript builder, silence detector
  inject/               # InjectModule, strategies (command/clipboard/terminal), extension detector
  keys/                 # KeyManager (SecretStorage), key validator
  onboarding/           # OnboardingManager, welcome view, setup webview
  enhance/              # EnhanceModule, context collector, prompt templates
  llm/                  # LLMRouter, base provider, providers (gemini/anthropic/openai/groq), rate limiter
  ui/                   # Status bar, notifications, settings webview
  telemetry/            # Usage tracker (local), telemetry (VS Code API), logger
  wake-word/            # WakeWordManager, worker, keyword matcher (Phase 4)
  test/                 # Unit + integration tests, mocks, fixtures
```

## Default Hotkey
`Alt+V` (not Ctrl+Shift+V — that conflicts with Markdown Preview Toggle)

## Commands
`prother.activate`, `prother.enhance`, `prother.setup`, `prother.settings`, `prother.recentPrompts`, `prother.reportIssue`

## When Making Changes
1. Check `PROTHER_SYSTEM_ARCHITECTURE.md` for the design spec
2. Update `PROTHER_DEV_TRACKER.md` to mark completed items
3. Run through relevant `PROTHER_DEV_CHECKLIST.md` items after changes
4. Write tests in the same phase as the feature
5. Error handling goes in every phase, not deferred to Phase 4
