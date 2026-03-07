# Prother Development Tracker

Master build progress file. Check off items as you complete them.

**Docs:**
- Architecture: `PROTHER_SYSTEM_ARCHITECTURE.md`
- Quality gates: `PROTHER_DEV_CHECKLIST.md`
- Onboarding UX: `PROTHER_BYOK_ONBOARDING.md`

---

## Phase 0: Project Setup

### Scaffolding
- [ ] `yo code` generator run (TypeScript extension)
- [ ] esbuild configured
- [ ] TypeScript strict mode (`tsconfig.json`)
- [ ] ESLint + Prettier
- [ ] `.vscodeignore`

### package.json Core
- [ ] `name`: prother
- [ ] `engines.vscode`: ^1.93.0
- [ ] `privacy` field → PRIVACY.md
- [ ] `extensionPack`: [ms-vscode.vscode-speech]
- [ ] `activationEvents`: onCommand + onStartupFinished

### Root Files
- [ ] LICENSE
- [ ] LICENSE-MODELS (Vosk attribution)
- [ ] PRIVACY.md
- [ ] CHANGELOG.md
- [ ] README.md

### npm Dependencies
| Package | Purpose | Install Phase |
|---|---|---|
| typescript | Build | 0 |
| esbuild | Bundler | 0 |
| @types/vscode | Types | 0 |
| eslint + prettier | Lint | 0 |
| vosk | Wake word | 4 |
| naudiodon | Mic capture | 4 |
| @electron/rebuild | Native ABI | 4 |

---

## Phase 1: Walking Skeleton (Weeks 1-2)

**Milestone:** Alt+V → speak → text in Copilot Chat

### Source Files

| File | Status | Notes |
|---|---|---|
| `src/extension.ts` | [ ] | activate/deactivate, unhandledRejection handler, remote/Web check |
| `src/core/command-router.ts` | [ ] | State machine: IDLE→LISTENING→PROCESSING→INJECTING |
| `src/core/types.ts` | [ ] | Shared interfaces, enums |
| `src/core/constants.ts` | [ ] | Defaults, magic strings |
| `src/core/errors.ts` | [ ] | Custom error classes |
| `src/core/events.ts` | [ ] | Typed event helpers |
| `src/speech/speech-module.ts` | [ ] | Speech API wrapper, runtime check for ms-vscode.vscode-speech |
| `src/speech/transcript-builder.ts` | [ ] | Accumulates partial results |
| `src/speech/silence-detector.ts` | [ ] | 1.5s silence threshold |
| `src/inject/inject-module.ts` | [ ] | Strategy cascade orchestrator |
| `src/inject/strategies/command-strategy.ts` | [ ] | workbench.action.chat.open with query |
| `src/inject/strategies/clipboard-strategy.ts` | [ ] | Save→write→paste→restore clipboard |
| `src/inject/strategies/terminal-strategy.ts` | [ ] | terminal.sendText() for CLI tools |
| `src/inject/extension-detector.ts` | [ ] | Detect Copilot/Cline/Continue/Claude Code |
| `src/ui/status-bar.ts` | [ ] | States: SETUP, IDLE, LISTENING, PROCESSING, ERROR, DISABLED, REMOTE |
| `src/ui/notifications.ts` | [ ] | Notification helpers |

### Commands Registered
- [ ] `prother.activate` → "Start Listening"
- [ ] Keybinding: `alt+v`

### Features Working
- [ ] Alt+V starts listening
- [ ] Speech transcript assembled
- [ ] Text injected into Copilot Chat
- [ ] Clipboard fallback if command fails
- [ ] Status bar updates through states
- [ ] Remote environment → REMOTE state + message
- [ ] VS Code Web → "Requires Desktop" message
- [ ] Speech extension missing → "Install Now" notification
- [ ] Errors show friendly messages (no stack traces)

### Tests
- [ ] `test/suite/command-router.test.ts`
- [ ] `test/suite/speech-module.test.ts`
- [ ] `test/suite/inject-module.test.ts`
- [ ] `test/mocks/vscode-speech.mock.ts`
- [ ] `test/mocks/vscode-api.mock.ts`
- [ ] All passing

---

## Phase 2: Onboarding & Enhancement (Weeks 3-4)

**Milestone:** New user → Gemini key → "enhance: make this faster" → enhanced prompt

### Source Files

| File | Status | Notes |
|---|---|---|
| `src/keys/key-manager.ts` | [ ] | SecretStorage wrapper, getApiKey/setApiKey/testApiKey |
| `src/keys/key-validator.ts` | [ ] | Per-provider validation (Gemini/Anthropic/OpenAI/Groq) |
| `src/onboarding/onboarding-manager.ts` | [ ] | First-time detection, welcome notification |
| `src/onboarding/welcome-view.ts` | [ ] | Notification logic |
| `src/onboarding/setup-webview.ts` | [ ] | Guided setup: Google AI Studio link, key input, test |
| `src/enhance/enhance-module.ts` | [ ] | Single API call, offline fallback |
| `src/enhance/context-collector.ts` | [ ] | Active file, selected code, language |
| `src/enhance/prompt-templates.ts` | [ ] | System prompts |
| `src/llm/llm-router.ts` | [ ] | Provider dispatch, 4s request queue, 404 handling |
| `src/llm/base-provider.ts` | [ ] | Abstract provider |
| `src/llm/providers/gemini.ts` | [ ] | Uses configurable model name (NOT hardcoded) |
| `src/llm/rate-limiter.ts` | [ ] | 429 handler, per-provider messages |
| `src/telemetry/usage-tracker.ts` | [ ] | Local stats in globalState |
| `src/telemetry/telemetry.ts` | [ ] | VS Code Telemetry API |
| `src/telemetry/logger.ts` | [ ] | Structured logging |

### Commands Registered
- [ ] `prother.enhance` → "Speak & Enhance Prompt"
- [ ] `prother.setup` → "Set Up API Key"
- [ ] `prother.recentPrompts` → "Show Recent Prompts"
- [ ] `prother.reportIssue` → "Report Issue"

### Settings Registered
- [ ] `prother.enhancement.enabled` (boolean, default: true)
- [ ] `prother.llm.defaultProvider` (enum, default: gemini)
- [ ] `prother.llm.geminiModel` (string, default: gemini-1.5-flash)
- [ ] `prother.speech.silenceTimeout` (number, default: 1500)

### Features Working
- [ ] First-time user sees welcome notification
- [ ] "Start Setup" opens guided webview
- [ ] Google AI Studio link opens in browser
- [ ] Key pasted → validated → stored in SecretStorage
- [ ] "enhance:" directive → Gemini API called → enhanced prompt shown
- [ ] Preview notification: [Inject] [Edit] [Cancel]
- [ ] Request queuing: min 4s gap between Gemini calls
- [ ] 429 → friendly rate limit message (voice-to-text still works)
- [ ] Network down → "Injecting raw prompt" [Inject Raw] [Retry] [Cancel]
- [ ] Model 404 → "Model may be deprecated, check settings"
- [ ] Invalid key → friendly error with retry
- [ ] Prompt cache: last 10 in globalState

### Tests
- [ ] `test/suite/key-manager.test.ts`
- [ ] `test/suite/onboarding-manager.test.ts`
- [ ] `test/suite/enhance-module.test.ts`
- [ ] `test/suite/llm-router.test.ts`
- [ ] All passing

---

## Phase 3: Multi-Provider & Multi-Target (Weeks 5-6)

**Milestone:** Any provider, any AI extension

### Source Files

| File | Status | Notes |
|---|---|---|
| `src/llm/providers/anthropic.ts` | [ ] | Claude Haiku |
| `src/llm/providers/openai.ts` | [ ] | GPT-4o Mini |
| `src/llm/providers/groq.ts` | [ ] | Llama 3.1 |
| `src/ui/webview/settings-panel.ts` | [ ] | Full settings webview |

### Commands Registered
- [ ] `prother.settings` → "Open Settings"

### Settings Registered
- [ ] `prother.inject.defaultTarget` (enum, default: auto)
- [ ] `prother.wakeWord.enabled` (boolean, default: false)

### Injection Targets
| Target | Method | Status |
|---|---|---|
| GitHub Copilot Chat | `workbench.action.chat.open` + query | [ ] |
| Cline | `cline.plusButtonClicked` + clipboard | [ ] |
| Continue | `continue.focusContinueInput` + clipboard | [ ] |
| Claude Code (terminal) | `terminal.sendText()` | [ ] |
| Auto-detect | Pick visible/installed | [ ] |

### Features Working
- [ ] Switch between 4 LLM providers
- [ ] Inject into all 4 targets
- [ ] Auto-detect installed AI extensions
- [ ] Settings webview: provider, target, keys, wake word toggle
- [ ] Advanced Options shows all providers in onboarding
- [ ] Injection failure → clipboard fallback + notification

### Tests
- [ ] Integration: multi-provider routing
- [ ] Integration: multi-target injection
- [ ] All passing

---

## Phase 4: Wake Word & Polish (Weeks 7-8)

**Milestone:** "Hey Prother" hands-free, marketplace published

### Source Files

| File | Status | Notes |
|---|---|---|
| `src/wake-word/wake-word-manager.ts` | [ ] | Worker lifecycle, graceful fallback, auto-suspend |
| `src/wake-word/wake-word-worker.ts` | [ ] | Vosk + naudiodon, keyword matching |
| `src/wake-word/keyword-matcher.ts` | [ ] | Fuzzy match "hey prother" / "hey brother" |

### Native Build
- [ ] `@electron/rebuild` configured for VS Code Electron ABI
- [ ] Prebuilt: Windows x64
- [ ] Prebuilt: macOS ARM
- [ ] Prebuilt: macOS x64
- [ ] Prebuilt: Linux x64

### Vosk Model
- [ ] Model: `vosk-model-small-en-us-0.15` (Apache 2.0)
- [ ] Download from: GitHub Releases (alphacephei/vosk-api)
- [ ] Lazy-download on first wake word enable
- [ ] Download progress notification
- [ ] Checksum verification

### Platform Tests
| Platform | Vosk | naudiodon | Mic | Keyword | Pass? |
|---|---|---|---|---|---|
| Windows x64 | [ ] | [ ] | [ ] | [ ] | [ ] |
| macOS ARM | [ ] | [ ] | [ ] | [ ] | [ ] |
| macOS x64 | [ ] | [ ] | [ ] | [ ] | [ ] |
| Linux x64 | [ ] | [ ] | [ ] | [ ] | [ ] |
| Remote/WSL | N/A | N/A | N/A | N/A | Disabled |

### Features Working
- [ ] "Hey Prother" triggers listening
- [ ] Mic handoff: wake word → speech API → wake word
- [ ] Auto-suspend when VS Code unfocused
- [ ] Native addon fail → Alt+V only (no crash)
- [ ] Platform-specific error: vcredist / libatomic / xcode-select
- [ ] Retry with exponential backoff (all API calls)
- [ ] Circuit breaker for repeated failures

### Benchmarks
- [ ] Vosk CPU: ____% (target <5%)
- [ ] Activation time: ____ms (target <100ms)
- [ ] Wake word latency: ____ms (target <300ms)
- [ ] .vsix size: ____MB (target <12MB without model)

### Marketplace
- [ ] Extension icon
- [ ] README with GIFs
- [ ] CHANGELOG
- [ ] Marketplace listing text
- [ ] Screenshots (5+)
- [ ] `vsce package` succeeds
- [ ] Published

### Tests
- [ ] Compatibility suite: AI extension injection
- [ ] Cross-platform Vosk/naudiodon
- [ ] Weekly CI configured
- [ ] All passing

---

## Master File Tracker

Every file in the project, which phase it belongs to, and whether it exists.

| # | File | Phase | Created? |
|---|---|---|---|
| 1 | `src/extension.ts` | 1 | [ ] |
| 2 | `src/core/command-router.ts` | 1 | [ ] |
| 3 | `src/core/types.ts` | 1 | [ ] |
| 4 | `src/core/constants.ts` | 1 | [ ] |
| 5 | `src/core/errors.ts` | 1 | [ ] |
| 6 | `src/core/events.ts` | 1 | [ ] |
| 7 | `src/speech/speech-module.ts` | 1 | [ ] |
| 8 | `src/speech/transcript-builder.ts` | 1 | [ ] |
| 9 | `src/speech/silence-detector.ts` | 1 | [ ] |
| 10 | `src/inject/inject-module.ts` | 1 | [ ] |
| 11 | `src/inject/strategies/command-strategy.ts` | 1 | [ ] |
| 12 | `src/inject/strategies/clipboard-strategy.ts` | 1 | [ ] |
| 13 | `src/inject/strategies/terminal-strategy.ts` | 1 | [ ] |
| 14 | `src/inject/extension-detector.ts` | 1 | [ ] |
| 15 | `src/ui/status-bar.ts` | 1 | [ ] |
| 16 | `src/ui/notifications.ts` | 1 | [ ] |
| 17 | `src/keys/key-manager.ts` | 2 | [ ] |
| 18 | `src/keys/key-validator.ts` | 2 | [ ] |
| 19 | `src/onboarding/onboarding-manager.ts` | 2 | [ ] |
| 20 | `src/onboarding/welcome-view.ts` | 2 | [ ] |
| 21 | `src/onboarding/setup-webview.ts` | 2 | [ ] |
| 22 | `src/enhance/enhance-module.ts` | 2 | [ ] |
| 23 | `src/enhance/context-collector.ts` | 2 | [ ] |
| 24 | `src/enhance/prompt-templates.ts` | 2 | [ ] |
| 25 | `src/llm/llm-router.ts` | 2 | [ ] |
| 26 | `src/llm/base-provider.ts` | 2 | [ ] |
| 27 | `src/llm/providers/gemini.ts` | 2 | [ ] |
| 28 | `src/llm/rate-limiter.ts` | 2 | [ ] |
| 29 | `src/telemetry/usage-tracker.ts` | 2 | [ ] |
| 30 | `src/telemetry/telemetry.ts` | 2 | [ ] |
| 31 | `src/telemetry/logger.ts` | 2 | [ ] |
| 32 | `src/llm/providers/anthropic.ts` | 3 | [ ] |
| 33 | `src/llm/providers/openai.ts` | 3 | [ ] |
| 34 | `src/llm/providers/groq.ts` | 3 | [ ] |
| 35 | `src/ui/webview/settings-panel.ts` | 3 | [ ] |
| 36 | `src/wake-word/wake-word-manager.ts` | 4 | [ ] |
| 37 | `src/wake-word/wake-word-worker.ts` | 4 | [ ] |
| 38 | `src/wake-word/keyword-matcher.ts` | 4 | [ ] |

**Total: 0 / 38 files created**

---

## All Commands

| Command | Title | Phase | Done? |
|---|---|---|---|
| `prother.activate` | Start Listening | 1 | [ ] |
| `prother.enhance` | Speak & Enhance Prompt | 2 | [ ] |
| `prother.setup` | Set Up API Key | 2 | [ ] |
| `prother.recentPrompts` | Show Recent Prompts | 2 | [ ] |
| `prother.reportIssue` | Report Issue | 2 | [ ] |
| `prother.settings` | Open Settings | 3 | [ ] |

## All Settings

| Setting | Type | Default | Phase | Done? |
|---|---|---|---|---|
| `prother.speech.silenceTimeout` | number | 1500 | 1 | [ ] |
| `prother.enhancement.enabled` | boolean | true | 2 | [ ] |
| `prother.llm.defaultProvider` | enum | gemini | 2 | [ ] |
| `prother.llm.geminiModel` | string | gemini-1.5-flash | 2 | [ ] |
| `prother.inject.defaultTarget` | enum | auto | 3 | [ ] |
| `prother.wakeWord.enabled` | boolean | false | 3 | [ ] |

---

## Overall Progress

| Phase | Status | Files | Features | Tests |
|---|---|---|---|---|
| 0: Setup | NOT STARTED | /5 root | /5 scaffold | N/A |
| 1: Skeleton | NOT STARTED | /16 | /9 | /5 |
| 2: Onboarding | NOT STARTED | /15 | /12 | /4 |
| 3: Multi | NOT STARTED | /4 | /6 | /2 |
| 4: Wake Word | NOT STARTED | /3 | /7 | /3 |
| **TOTAL** | | **0/38 src** | **0/39** | **0/14** |
