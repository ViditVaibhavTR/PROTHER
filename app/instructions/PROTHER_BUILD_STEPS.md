# Prother Build Steps — Engineering Guide

44 steps. Each step is 1-3 hours. Total: ~76 hours across 4 phases.

**How to use:** Work through steps in order. Each has: what to build, what to test, what to commit, and dependencies. Mark `[x]` as you complete.

---

## Final File Structure (when fully built)

```
prother/
├── .vscode/
│   ├── launch.json
│   └── tasks.json
├── src/
│   ├── extension.ts
│   ├── core/
│   │   ├── command-router.ts
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   └── events.ts
│   ├── speech/
│   │   ├── speech-module.ts
│   │   ├── transcript-builder.ts
│   │   └── silence-detector.ts
│   ├── inject/
│   │   ├── inject-module.ts
│   │   ├── strategies/
│   │   │   ├── command-strategy.ts
│   │   │   ├── clipboard-strategy.ts
│   │   │   └── terminal-strategy.ts
│   │   └── extension-detector.ts
│   ├── keys/
│   │   ├── key-manager.ts
│   │   └── key-validator.ts
│   ├── onboarding/
│   │   ├── onboarding-manager.ts
│   │   ├── welcome-view.ts
│   │   └── setup-webview.ts
│   ├── enhance/
│   │   ├── enhance-module.ts
│   │   ├── context-collector.ts
│   │   └── prompt-templates.ts
│   ├── llm/
│   │   ├── llm-router.ts
│   │   ├── base-provider.ts
│   │   ├── providers/
│   │   │   ├── gemini.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   └── groq.ts
│   │   └── rate-limiter.ts
│   ├── ui/
│   │   ├── status-bar.ts
│   │   ├── notifications.ts
│   │   └── webview/
│   │       └── settings-panel.ts
│   ├── telemetry/
│   │   ├── usage-tracker.ts
│   │   ├── telemetry.ts
│   │   └── logger.ts
│   ├── wake-word/
│   │   ├── wake-word-manager.ts
│   │   ├── wake-word-worker.ts
│   │   └── keyword-matcher.ts
│   └── test/
│       ├── suite/
│       │   ├── command-router.test.ts
│       │   ├── speech-module.test.ts
│       │   ├── inject-module.test.ts
│       │   ├── key-manager.test.ts
│       │   ├── onboarding-manager.test.ts
│       │   ├── enhance-module.test.ts
│       │   ├── llm-router.test.ts
│       │   ├── wake-word-manager.test.ts
│       │   └── keyword-matcher.test.ts
│       ├── mocks/
│       │   ├── vscode-speech.mock.ts
│       │   └── vscode-api.mock.ts
│       └── fixtures/
│           ├── transcripts.json
│           └── enhanced-prompts.json
├── models/                          (gitignored, lazy-downloaded)
│   └── vosk-model-small-en-us-0.15/
├── package.json
├── tsconfig.json
├── esbuild.mjs
├── .eslintrc.json
├── .prettierrc
├── .vscodeignore
├── .gitignore
├── CHANGELOG.md
├── LICENSE
├── LICENSE-MODELS
├── PRIVACY.md
└── README.md
```

---

## Phase 0: Project Scaffolding (~4 hours)

### S01 — Initialize Extension Project (~1.5h)
- [ ] **Deps:** None
- **Build:**
  - Run `yo code` → TypeScript extension, name `prother`
  - Set `engines.vscode` to `^1.93.0`
  - Delete webpack config, create `esbuild.mjs` (entrypoint: `src/extension.ts`, output: `dist/`, external: `['vscode']`, format: `cjs`, platform: `node`)
  - Set `"main": "./dist/extension.js"` in package.json
  - Scripts: `build`, `watch`, `lint`, `test`
- **Test:** `npm run build` → `dist/extension.js` exists. F5 → Extension Dev Host launches.
- **Commit:** `chore: scaffold VS Code extension with esbuild`

### S02 — TypeScript Strict + Linting (~1h)
- [ ] **Deps:** S01
- **Build:**
  - `tsconfig.json`: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, target `ES2022`, module `Node16`
  - Install ESLint + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`
  - Install Prettier. `.prettierrc`: singleQuote, trailingComma all, printWidth 100
- **Test:** `npm run lint` → 0 errors. `npx tsc --noEmit` → passes.
- **Commit:** `chore: TypeScript strict mode, ESLint, Prettier`

### S03 — package.json Manifest + Root Files (~1h)
- [ ] **Deps:** S01, S02
- **Build:**
  - `package.json`: `privacy` field, `extensionPack: [ms-vscode.vscode-speech]`, all 6 commands (stub handlers), `alt+v` keybinding, all 6 settings, `activationEvents`
  - Create: `LICENSE` (MIT), `LICENSE-MODELS` (placeholder), `PRIVACY.md`, `CHANGELOG.md`, `README.md`
  - Create: `.vscodeignore`, `.vscode/launch.json`, `.vscode/tasks.json`
- **Test:** F5 → all 6 commands in palette. Alt+V triggers activate. `vsce package` produces .vsix.
- **Commit:** `chore: package.json manifest, root docs, launch configs`

### S04 — Source Directory Structure (~0.5h)
- [ ] **Deps:** S01
- **Build:** Create all `src/` subdirectories with `.gitkeep` files
- **Test:** `ls -R src/` shows full tree
- **Commit:** `chore: create source directory structure`

---

## Phase 1: Walking Skeleton (~18 hours)

**Milestone:** Alt+V → speak → text in Copilot Chat

### S05 — Core Types, Constants, Errors, Events (~2h)
- [ ] **Deps:** S04
- **Build:**
  - `src/core/types.ts` — ProthState enum, AIExtension, InjectResult, InjectionStrategy, Trigger types
  - `src/core/constants.ts` — DEFAULT_SILENCE_TIMEOUT (1500), MIN_REQUEST_GAP_MS (4000), MAX_QUEUE_SIZE (5), SPEECH_EXTENSION_ID, API base URLs, AI_EXTENSION_DEFS array, SECRET_KEY_PREFIX
  - `src/core/errors.ts` — ProthError base class (userMessage + code), subclasses: SpeechError, InjectionError, EnhancementError, ApiKeyError, RateLimitError, NetworkError
  - `src/core/events.ts` — Typed EventEmitter helper
- **Test:** `npx tsc --noEmit` passes
- **Commit:** `feat: core types, constants, errors, event helpers`

### S06 — Status Bar + Notifications (~1.5h)
- [ ] **Deps:** S05
- **Build:**
  - `src/ui/status-bar.ts` — setState() for: SETUP, IDLE, LISTENING, PROCESSING, ERROR, DISABLED, REMOTE
  - `src/ui/notifications.ts` — showError, showWarning, showInfo, showSpeechExtensionMissing (Install Now button), showRemoteWarning, showWebWarning
- **Test:** F5 → status bar visible with "Prother Setup" text
- **Commit:** `feat: status bar and notification helpers`

### S07 — extension.ts Entry Point (~2h)
- [ ] **Deps:** S05, S06
- **Build:**
  - `src/extension.ts` — activate/deactivate
  - Global `process.on('unhandledRejection', ...)` → log + generic error notification
  - Remote check: `vscode.env.remoteName` → REMOTE state + disable audio
  - Web check: `typeof vscode.speech === 'undefined'` → DISABLED + "Requires Desktop"
  - Speech extension check → "Install Now" if missing
  - Create StatusBar, register all 6 commands (stubs for Phase 2+)
  - Create "Prother" OutputChannel
- **Test:** F5 local → IDLE state. Uninstall speech extension → "Install Now" notification.
- **Commit:** `feat: extension entry point with error handler, env detection`

### S08 — Speech Module + Transcript Builder + Silence Detector (~3h)
- [ ] **Deps:** S05, S07
- **Build:**
  - `src/speech/speech-module.ts` — startListening/stopListening, wraps vscode.speech.createSpeechToTextSession(), fires onTranscript/onError/onStatusChange events
  - `src/speech/transcript-builder.ts` — addPartial(), getFullTranscript(), reset()
  - `src/speech/silence-detector.ts` — configurable timeout, onSilenceDetected event
- **Test:** F5 → Alt+V → speak → transcript in Output channel
- **Commit:** `feat: speech module with transcript builder and silence detection`

### S09 — Extension Detector (~1h)
- [ ] **Deps:** S05
- **Build:**
  - `src/inject/extension-detector.ts` — detectExtensions() scans for Copilot/Cline/Continue/Claude Code
- **Test:** F5 with Copilot → detected in array
- **Commit:** `feat: AI extension detector`

### S10 — Injection Strategies (~2.5h)
- [ ] **Deps:** S05
- **Build:**
  - `src/inject/strategies/command-strategy.ts` — Copilot: `workbench.action.chat.open` with `{ query }`. Cline/Continue: open panel, fall through.
  - `src/inject/strategies/clipboard-strategy.ts` — save clipboard → write → paste → restore after 1s
  - `src/inject/strategies/terminal-strategy.ts` — `terminal.sendText(text, false)` for Claude Code
- **Test:** Unit tests with mocked vscode.commands
- **Commit:** `feat: injection strategies (command, clipboard, terminal)`

### S11 — Inject Module Orchestrator (~1.5h)
- [ ] **Deps:** S09, S10
- **Build:**
  - `src/inject/inject-module.ts` — strategy cascade [Command → Terminal → Clipboard], target selection logic, ultimate clipboard fallback
- **Test:** Mock Copilot installed → command strategy tried first. No extensions → error.
- **Commit:** `feat: inject module with strategy cascade`

### S12 — Command Router (~2h)
- [ ] **Deps:** S08, S11, S06
- **Build:**
  - `src/core/command-router.ts` — state machine IDLE→LISTENING→PROCESSING→INJECTING→IDLE. Toggle: Alt+V while listening stops + injects. All transitions try/catch → ERROR state → friendly notification → IDLE after 3s.
- **Test:** Mock speech + inject. activate('hotkey') → fire transcript → inject called.
- **Commit:** `feat: command router with state machine`

### S13 — Wire Everything in extension.ts (~1h)
- [ ] **Deps:** S07, S08, S09, S10, S11, S12
- **Build:**
  - Instantiate StatusBar, SpeechModule, ExtensionDetector, InjectModule, CommandRouter
  - Wire `prother.activate` → commandRouter.activate('hotkey')
  - Push all disposables to context.subscriptions
- **Test:** **END-TO-END: F5 → Alt+V → speak "hello world" → text appears in Copilot Chat**
- **Commit:** `feat: wire walking skeleton end-to-end`

### S14 — Test Infrastructure + Phase 1 Tests (~2h)
- [ ] **Deps:** S08, S11, S12
- **Build:**
  - `test/mocks/vscode-api.mock.ts` — mock window, commands, clipboard, extensions, terminals
  - `test/mocks/vscode-speech.mock.ts` — mock speech session with controlled events
  - `test/fixtures/transcripts.json` — sample transcripts
  - `test/suite/command-router.test.ts`
  - `test/suite/speech-module.test.ts`
  - `test/suite/inject-module.test.ts`
- **Test:** `npm test` → all green
- **Commit:** `test: Phase 1 unit tests`

### S15 — Phase 1 Edge Cases + Polish (~1.5h)
- [ ] **Deps:** S13, S14
- **Build:**
  - No speech extension → install notification, no crash
  - Empty transcript → "No speech detected" info
  - Copilot not open → command tries to open, else clipboard
  - Clipboard permission error → catch + friendly message
  - Verify unhandledRejection handler catches async errors
- **Test:** Manually test each edge case. Full test suite passes.
- **Commit:** `fix: Phase 1 edge cases and error handling`

---

## Phase 2: Onboarding & Enhancement (~20 hours)

**Milestone:** New user → Gemini key → "enhance: make this faster" → enhanced prompt

### S16 — Logger (~1h)
- [ ] **Deps:** S07
- **Build:**
  - `src/telemetry/logger.ts` — wraps OutputChannel. info/warn/error/debug. Timestamps. sanitize() redacts key patterns (AIza*, sk-*, key-*)
- **Test:** Log "key: AIzaSy123" → redacted in output
- **Commit:** `feat: structured logger with key sanitization`

### S17 — Key Manager + Key Validator (~2.5h)
- [ ] **Deps:** S05, S16
- **Build:**
  - `src/keys/key-manager.ts` — SecretStorage wrapper. getApiKey/setApiKey/removeApiKey/hasAnyKey/testApiKey. onKeyChange event.
  - `src/keys/key-validator.ts` — testGeminiKey() via fetch to Gemini API (maxOutputTokens:5). Handle 200/400/429/network. Stubs for other providers.
- **Test:** Mock SecretStorage. get/set/remove/hasAnyKey. Mock fetch for validation responses.
- **Commit:** `feat: key manager with Gemini key validation`

### S18 — Onboarding: Welcome + Manager (~2h)
- [ ] **Deps:** S06, S17
- **Build:**
  - `src/onboarding/welcome-view.ts` — welcome notification with "Start Setup" / "Advanced Options"
  - `src/onboarding/onboarding-manager.ts` — checkAndStartOnboarding(), showAdvancedOptions() quick pick, tracks dismissed state in globalState
- **Test:** No key → welcome shown. Key exists → nothing. Dismissed → status bar SETUP only.
- **Commit:** `feat: onboarding manager with welcome notification`

### S19 — Onboarding: Setup Webview (~3h)
- [ ] **Deps:** S17, S18
- **Build:**
  - `src/onboarding/setup-webview.ts` — WebviewPanel with: Gemini benefits, "Open Google AI Studio" button, key input, "Save & Test", success/failure, help/FAQ. CSP with nonce. Webview↔extension messaging.
- **Test:** F5 → "Set Up API Key" command → webview. Paste valid key → success. Invalid → error.
- **Commit:** `feat: guided setup webview for BYOK onboarding`

### S20 — LLM Base Provider + Rate Limiter (~2h)
- [ ] **Deps:** S05
- **Build:**
  - `src/llm/base-provider.ts` — abstract complete()/testConnection(). LLMRequest/LLMResponse types.
  - `src/llm/rate-limiter.ts` — canMakeRequest(), enqueue() with 4s gap, FIFO queue, drop at MAX_QUEUE_SIZE(5), handleRateLimit() per-provider messages.
- **Test:** Two requests <4s to same provider → second queued. Queue overflow → oldest dropped.
- **Commit:** `feat: LLM base provider and rate limiter`

### S21 — Gemini Provider (~2h)
- [ ] **Deps:** S17, S20
- **Build:**
  - `src/llm/providers/gemini.ts` — extends BaseLLMProvider. Uses configurable model from `prother.llm.geminiModel` setting (NEVER hardcoded). Single API call: system + user combined in contents. Handle 400/404/429/5xx/network.
  - **404 → "Model may be deprecated. Update in Settings."**
- **Test:** Mock fetch. Valid response parses. 404 → deprecation error. 429 → rate limiter.
- **Commit:** `feat: Gemini provider with configurable model name`

### S22 — LLM Router (~1.5h)
- [ ] **Deps:** S20, S21, S17
- **Build:**
  - `src/llm/llm-router.ts` — selects provider from config, gets key from KeyManager, routes through rate limiter, handles 404 model deprecation.
- **Test:** Route to Gemini when default. No key → ApiKeyError. Concurrent → queued.
- **Commit:** `feat: LLM router with provider dispatch`

### S23 — Context Collector + Prompt Templates (~1.5h)
- [ ] **Deps:** S05
- **Build:**
  - `src/enhance/context-collector.ts` — collect(): activeFile, selectedCode, language, cursor, workspaceLanguages, recentFiles
  - `src/enhance/prompt-templates.ts` — getEnhancementSystemPrompt(), buildEnhancementUserMessage() combining raw prompt + context into single message
- **Test:** Mock active editor → all fields populated. Verify format.
- **Commit:** `feat: context collector and prompt templates`

### S24 — Enhance Module (~2h)
- [ ] **Deps:** S22, S23
- **Build:**
  - `src/enhance/enhance-module.ts` — enhance(rawPrompt, context): builds single LLM request, calls router, returns enhanced text. Network failure → NetworkError. Preview notification: [Inject]/[Edit]/[Cancel]. Edit → input box pre-filled.
- **Test:** Mock router. Verify single call. Network error → correct error type.
- **Commit:** `feat: enhance module with LLM integration and preview`

### S25 — Wire Enhancement into Command Router (~1.5h)
- [ ] **Deps:** S12, S24
- **Build:**
  - Add ENHANCING + PREVIEW states to CommandRouter
  - "enhance:" prefix in transcript → strip, collect context, call enhanceModule, show preview, inject on confirm
  - No key or enhancement disabled → inject raw
  - Enhancement failure → [Inject Raw]/[Retry]/[Cancel]
  - Wire `prother.enhance` command
- **Test:** E2E: set Gemini key → Alt+V → "enhance: make this faster" → preview → inject.
- **Commit:** `feat: wire enhancement flow into command router`

### S26 — Usage Tracker + Telemetry (~1.5h)
- [ ] **Deps:** S05, S07
- **Build:**
  - `src/telemetry/usage-tracker.ts` — recordPrompt(wordCount, enhanced), getMonthlyStats(), stores in globalState
  - `src/telemetry/telemetry.ts` — VS Code Telemetry API. Events: prompt_spoken, prompt_enhanced, enhancement_failed. NEVER sends prompt content or keys.
- **Test:** Record 3 prompts → counts correct. Telemetry events have no content.
- **Commit:** `feat: local usage tracking and telemetry`

### S27 — Wire Onboarding + Remaining Commands (~1.5h)
- [ ] **Deps:** S18, S19, S26
- **Build:**
  - extension.ts: instantiate OnboardingManager, call checkAndStartOnboarding()
  - Wire prother.setup → showSetupWebview()
  - Wire prother.recentPrompts → read last 10 from globalState, quick pick, inject selected
  - Wire prother.reportIssue → open GitHub issues URL with pre-filled template
  - No key → status bar SETUP
- **Test:** Fresh install → welcome. Set key → IDLE. Recent prompts shows history.
- **Commit:** `feat: wire onboarding, setup, recent prompts, report issue`

### S28 — Phase 2 Tests (~1.5h)
- [ ] **Deps:** S17, S18, S24, S22
- **Build:**
  - `test/suite/key-manager.test.ts`
  - `test/suite/onboarding-manager.test.ts`
  - `test/suite/enhance-module.test.ts`
  - `test/suite/llm-router.test.ts`
  - `test/fixtures/enhanced-prompts.json`
- **Test:** `npm test` → all Phase 1+2 green
- **Commit:** `test: Phase 2 unit tests`

---

## Phase 3: Multi-Provider & Multi-Target (~13 hours)

**Milestone:** Any LLM provider, any AI extension

### S29 — Anthropic Provider (~1.5h)
- [ ] **Deps:** S20
- **Build:**
  - `src/llm/providers/anthropic.ts` — POST to `/v1/messages`, x-api-key header, model `claude-3-haiku-20240307`
  - Update key-validator.ts: testAnthropicKey()
- **Test:** Mock fetch. Valid/invalid/429.
- **Commit:** `feat: Anthropic Claude provider`

### S30 — OpenAI Provider (~1.5h)
- [ ] **Deps:** S20
- **Build:**
  - `src/llm/providers/openai.ts` — POST to `/v1/chat/completions`, Bearer auth, model `gpt-4o-mini`
  - Update key-validator.ts: testOpenAIKey()
- **Test:** Mock fetch.
- **Commit:** `feat: OpenAI provider`

### S31 — Groq Provider (~1.5h)
- [ ] **Deps:** S20
- **Build:**
  - `src/llm/providers/groq.ts` — OpenAI-compatible API at groq.com, model `llama-3.1-70b-versatile`
  - Update key-validator.ts: testGroqKey()
- **Test:** Mock fetch.
- **Commit:** `feat: Groq Llama provider`

### S32 — Register All Providers (~1h)
- [ ] **Deps:** S22, S29, S30, S31
- **Build:**
  - Update LLMRouter: accept all 4 providers
  - Update extension.ts: instantiate all 4, pass to router
  - Verify onboarding Advanced Options works for all
- **Test:** Set default to anthropic → routes correctly.
- **Commit:** `feat: register all 4 LLM providers`

### S33 — Multi-Target Injection Refinement (~2h)
- [ ] **Deps:** S11
- **Build:**
  - Refine Cline injection (open panel + clipboard)
  - Refine Continue injection (focus input + clipboard)
  - Verify Claude Code terminal injection
  - `prother.inject.defaultTarget` setting integration
  - Per-target notification text: "Prompt ready in Copilot" vs "Prompt copied — paste into Cline"
- **Test:** Manual with each available AI extension.
- **Commit:** `feat: multi-target injection for all 4 AI extensions`

### S34 — Settings Webview (~3h)
- [ ] **Deps:** S17, S06
- **Build:**
  - `src/ui/webview/settings-panel.ts` — provider dropdown, masked key, change/test/remove key buttons, silence timeout, enhancement toggle, model input, injection target radio, save button
  - Wire prother.settings command
- **Test:** Open settings, change provider, save, verify persisted. Change key, test connection.
- **Commit:** `feat: settings webview panel`

### S35 — Phase 3 Integration Tests (~2h)
- [ ] **Deps:** S32, S33, S34
- **Build:**
  - Integration: Anthropic as default → correct provider called
  - Integration: Cline target → clipboard strategy used
  - Integration: Claude Code → terminal strategy used
  - Integration: switch provider mid-session
- **Test:** `npm test` → all Phase 1+2+3 green
- **Commit:** `test: Phase 3 integration tests`

---

## Phase 4: Wake Word & Polish (~17 hours)

**Milestone:** "Hey Prother" hands-free, marketplace published

### S36 — Native Dependencies Setup (~2h)
- [ ] **Deps:** S01
- **Build:**
  - `npm install vosk naudiodon`
  - `npm install -D @electron/rebuild` (build-time only, not shipped in extension)
  - Script: `"rebuild": "electron-rebuild -f -w vosk,naudiodon"`
  - esbuild: mark vosk + naudiodon as external
  - .vscodeignore: include native binaries, exclude source
  - models/ in .gitignore
- **Test:** `npm run rebuild` succeeds. `require('vosk')` loads in Extension Dev Host.
- **Commit:** `chore: native dependencies for wake word`

### S37 — Keyword Matcher (~1h)
- [ ] **Deps:** S05
- **Build:**
  - `src/wake-word/keyword-matcher.ts` — match(text): check for "hey prother", "hey brother", optional Levenshtein fuzzy (threshold 2)
- **Test:** "hey prother" ✓, "hey brother" ✓, "hello world" ✗
- **Commit:** `feat: wake word keyword matcher`

### S38 — Wake Word Worker (~2.5h)
- [ ] **Deps:** S36, S37
- **Build:**
  - `src/wake-word/wake-word-worker.ts` — worker thread. Init Vosk model (`vosk-model-small-en-us-0.15`), naudiodon AudioIO (16kHz mono), pipe audio → recognizer, check partial/final results with KeywordMatcher, post 'detected' on match, reset recognizer. vosk.setLogLevel(-1).
  - Add second esbuild entrypoint for worker
- **Test:** Manual: run worker, speak "Hey Prother", verify detection message. CPU <5%.
- **Commit:** `feat: wake word worker with Vosk and naudiodon`

### S39 — Wake Word Manager (~2h)
- [ ] **Deps:** S38, S06
- **Build:**
  - `src/wake-word/wake-word-manager.ts` — start() with try/catch (graceful fallback if native fails), stop(), onDetected event, showPlatformSpecificError() per OS, restart with backoff (max 3), debounce (2s after detection), model download (from GitHub Releases, progress notification, checksum), auto-suspend on window unfocus
- **Test:** Mock Worker. Native fail → platform error + no crash. 4th error → disabled.
- **Commit:** `feat: wake word manager with graceful fallback`

### S40 — Wire Wake Word + Mic Handoff (~2h)
- [ ] **Deps:** S39, S08, S12
- **Build:**
  - extension.ts: if wakeWord.enabled → instantiate WakeWordManager
  - wakeWordManager.onDetected → commandRouter.activate('wakeword')
  - Mic handoff: detected → stop naudiodon → 100ms → start Speech API. Speech done → 100ms → restart naudiodon.
  - Setting change listener: toggle wake word on/off
  - Native load failure flag: skip all future attempts, notify once
- **Test:** E2E: enable wake word → "Hey Prother" → speak prompt → injects → wake word resumes.
- **Commit:** `feat: wire wake word with mic handoff`

### S41 — Retry + Circuit Breaker (~1.5h)
- [ ] **Deps:** S22
- **Build:**
  - LLMRouter/BaseLLMProvider: retry with exponential backoff for 5xx/network (1s, 2s, 4s, max 3). NO retry on 4xx.
  - Circuit breaker: 5 consecutive failures → tripped 60s → one trial after cooldown
- **Test:** 3x 500 → 3 retries. 5 failures → tripped. After 60s → trial request.
- **Commit:** `feat: retry with exponential backoff and circuit breaker`

### S42 — Phase 4 Tests (~2h)
- [ ] **Deps:** S37, S39, S41
- **Build:**
  - KeywordMatcher edge cases
  - WakeWordManager mock Worker tests
  - Mic handoff sequence tests
  - Circuit breaker integration
  - Compatibility stubs: verify injection commands exist per AI extension
- **Test:** `npm test` → all phases green
- **Commit:** `test: Phase 4 tests`

### S43 — Marketplace Prep (~3h)
- [ ] **Deps:** All previous
- **Build:**
  - Extension icon (128x128 PNG)
  - README.md: GIFs, setup steps, FAQ, provider comparison
  - CHANGELOG.md: v1.0.0 features
  - LICENSE-MODELS: final Vosk attribution
  - PRIVACY.md: final policy
  - Screenshots (5+)
  - `vsce package` → .vsix <12MB (without model)
  - Run every 🔴 and 🟡 item in PROTHER_DEV_CHECKLIST.md
- **Test:** Clean VS Code install → install .vsix → full flow works.
- **Commit:** `chore: marketplace prep — icon, README, screenshots`

### S44 — Publish (~1h)
- [ ] **Deps:** S43
- **Build:**
  - Azure DevOps publisher account
  - `vsce publish`
  - Verify in Marketplace search
  - `git tag v1.0.0`
- **Test:** Install from Marketplace on clean machine → works.
- **Commit:** `release: v1.0.0`

---

## Summary

| Phase | Steps | Hours | Key Deliverable |
|---|---|---|---|
| 0: Setup | S01-S04 | ~4h | Scaffolded extension with esbuild |
| 1: Skeleton | S05-S15 | ~18h | Alt+V → speak → text in Copilot |
| 2: Onboarding | S16-S28 | ~20h | BYOK setup + Gemini enhancement |
| 3: Multi | S29-S35 | ~13h | 4 providers + 4 targets |
| 4: Wake Word | S36-S44 | ~17h | "Hey Prother" + marketplace |
| **Total** | **44 steps** | **~76h** | **Published extension** |

## Critical Path

```
S01 → S05 → S07 → S08 → S12 → S13 (Phase 1 done)
  → S17 → S22 → S24 → S25 (Phase 2 done)
    → S32 → S35 (Phase 3 done)
      → S40 → S43 → S44 (Phase 4 done)
```

## Parallel Work Opportunities

These steps have no dependencies on each other and can be done simultaneously:

- **S09 + S10** (extension detector + injection strategies)
- **S29 + S30 + S31** (all 3 alt LLM providers)
- **S33 + S34** (multi-target + settings webview)
- **S37 + S36** (keyword matcher + native deps setup)
