# Prother: Complete System Architecture (BYOK-Only)

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [Component Design](#3-component-design)
4. [Folder Structure](#4-folder-structure)
5. [API Key Setup & Onboarding](#5-api-key-setup--onboarding)
6. [Client-Side Usage Tracking](#6-client-side-usage-tracking)
7. [Input Injection Strategy](#7-input-injection-strategy)
8. [Wake Word Architecture](#8-wake-word-architecture)
9. [Critical Decisions & Implementation Order](#9-critical-decisions--implementation-order)

---

## 1. System Architecture Overview

```
+------------------------------------------------------------------+
|                        VS CODE HOST PROCESS                       |
|                                                                   |
|  +--------------------+    +----------------------------------+   |
|  |   STATUS BAR UI    |    |     EXTENSION HOST (Node.js)     |   |
|  | [Mic] Prother Ready|    |                                  |   |
|  +--------+-----------+    |  +----------------------------+  |   |
|           |                |  |    CommandRouter            |  |   |
|           v                |  |  (activation dispatcher)    |  |   |
|  +--------+-----------+    |  +---+----------+----------+--+  |   |
|  | NOTIFICATION PANEL |    |      |          |          |     |   |
|  | "Enhancement ready"|    |      v          v          v     |   |
|  +--------------------+    |  +------+  +--------+  +------+  |   |
|                            |  |Speech|  |Enhance |  |Inject|  |   |
|  +--------------------+    |  |Module|  |Module  |  |Module|  |   |
|  | ONBOARDING WEBVIEW |    |  +--+---+  +---+----+  +--+---+  |   |
|  | "Get free Gemini   |    |     |          |           |      |   |
|  |  API key" setup    |    |     |    +-----+-----+     |      |   |
|  +--------------------+    |     |    |LLM Router |     |      |   |
|                            |     |    +-----------+     |      |   |
|                            |     |    |GeminiProv |     |      |   |
|                            |     |    |AnthropProv|     |      |   |
|                            |     |    |OpenAIProv |     |      |   |
|                            |     |    |GroqProv   |     |      |   |
|                            |     |    +-----------+     |      |   |
|                            |     |          |           |      |   |
|                            |  +--+----------+-----------+--+   |   |
|                            |  |       KeyManager              |   |
|                            |  |    (VS Code SecretStorage)    |   |
|                            |  +-------------------------------+   |
|                            |                                      |
|                            |  +-------------------------------+   |
|                            |  |    OnboardingManager          |   |
|                            |  |  (first-time setup flow)      |   |
|                            |  +-------------------------------+   |
|                            |                                      |
|                            +--------------------------------------+
|                                           |
+-------------------------------------------|--+
                                            |
                           HTTPS/TLS        |  (all calls direct from extension)
                                            v
                              +-----------------------------+
                              | LLM Provider APIs           |
                              | - Google Gemini (default)    |
                              | - Anthropic Claude           |
                              | - OpenAI                     |
                              | - Groq                       |
                              +-----------------------------+

  +----------------------------------------------------------+
  |  WORKER THREAD (separate from Extension Host)            |
  |  +----------------------------------------------------+  |
  |  |  WakeWordEngine (Vosk lightweight model)            |  |
  |  |  - Listens to mic stream via naudiodon              |  |
  |  |  - Matches "Hey Prother" from transcript stream     |  |
  |  |  - Posts message on detection                      |  |
  |  |  - Runs at ~2-5% CPU via 16kHz mono audio          |  |
  |  +----------------------------------------------------+  |
  +----------------------------------------------------------+
```

**Key architectural insight**: The extension runs entirely in VS Code's Extension Host (a Node.js process). There is **no backend server**. All LLM API calls go directly from the extension to the provider using the user's own API key (BYOK). The default recommended provider is Google Gemini 1.5 Flash, which offers a generous free tier (1M tokens/day, no credit card required). API keys are stored securely in VS Code's SecretStorage (OS keychain). The wake word engine uses Vosk (open-source, Apache 2.0) and runs in a Worker Thread to avoid blocking the extension host event loop.

---

## 2. Data Flow Diagrams

### 2a. Speech to Transcription to Injection Flow

```
User speaks "create a React component for user login"
  |
  v
[1] VS Code Speech API .listen()
  |  (uses built-in speech recognition)
  |  (returns stream of SpeechRecognitionResult)
  |
  v
[2] SpeechModule accumulates partial results
  |  (onDidRecognize event fires per phrase)
  |  (status bar shows: "Listening... create a React...")
  |
  v
[3] User pauses (silence detection, ~1.5s threshold)
  |  OR user says "Hey Prother stop"
  |  OR user presses hotkey again
  |
  v
[4] Final transcript assembled
  |  transcript = "create a React component for user login"
  |
  v
[5] CommandRouter inspects transcript for directives
  |  - Contains "enhance"? --> route to EnhanceModule first
  |  - Contains "inject into copilot"? --> set target
  |  - Plain prompt? --> route directly to InjectModule
  |
  v
[6] InjectModule.inject(transcript, target?)
  |  (see Section 7 for injection strategy details)
  |
  v
[7] Text appears in target AI extension's input
```

### 2b. Prompt Enhancement Flow

```
User speaks "Hey Prother enhance: make this function faster"
  |
  v
[1] SpeechModule --> transcript: "enhance: make this function faster"
  |
  v
[2] CommandRouter detects "enhance" directive
  |  rawPrompt = "make this function faster"
  |
  v
[3] EnhanceModule.enhance(rawPrompt, context)
  |  context = {
  |    activeFile: "src/utils/sort.ts",
  |    selectedCode: "function bubbleSort(...) { ... }",
  |    language: "typescript",
  |    cursor: { line: 42, col: 0 }
  |  }
  |
  v
[4] LLMRouter selects configured provider (default: Gemini 1.5 Flash)
  |
  v
[5] Direct API call from extension to provider
  |  API key retrieved from VS Code SecretStorage
  |  (system prompt: "You are a coding prompt enhancer...")
  |
  +-- SUCCESS:
  |     |
  |     v
  |   [6] Returns enhanced prompt
  |     |
  |     v
  |   [7] EnhanceModule shows preview notification:
  |       "Enhanced: Optimize the bubbleSort function in sort.ts
  |        for performance. Consider using a more efficient
  |        algorithm like quicksort or mergesort."
  |       [Inject] [Edit] [Cancel]
  |     |
  |     v
  |   [8] User clicks [Inject] --> InjectModule
  |
  +-- NETWORK FAILURE / ERROR:
        |
        v
      [6] Shows notification:
          "Network unavailable. Injecting raw prompt instead."
          [Inject Raw] [Retry] [Cancel]
```

### 2c. API Key Setup Flow (First-Time User)

```
[1] Extension activates for the first time
  |
  v
[2] KeyManager checks SecretStorage for any API key
  |  No key found
  |
  v
[3] OnboardingManager triggers welcome notification:
  |  "Welcome to Prother! Quick Setup (2 min):
  |   Get a FREE API key from Google"
  |  [Start Setup] [Advanced Options]
  |
  v
[4] User clicks [Start Setup]
  |
  v
[5] OnboardingManager opens guided setup webview:
  |  - Shows Gemini free tier benefits (1M tokens/day, no credit card)
  |  - Step 1: "Open Google AI Studio" button
  |    --> opens https://aistudio.google.com/app/apikey in browser
  |  - Step 2: "Paste Your API Key" input field
  |
  v
[6] User gets key from Google AI Studio, pastes it
  |
  v
[7] KeyManager.testApiKey('gemini', key)
  |  Makes a minimal Gemini API call to validate
  |
  v
[8] If valid:
  |  - Store in SecretStorage: "prother.apikey.gemini"
  |  - Set as default provider in settings
  |  - Show success + first-use tutorial
  |  - Status bar updates: [Mic] Prother Ready
  |
  v
[9] If invalid:
     - Show error with troubleshooting tips
     - "Check for extra spaces", "Key may be disabled"
     - [Try Again] [Get Help]
```

### 2d. Rate Limit Handling (Provider-Side)

```
User triggers prompt enhancement
  |
  v
[1] Extension sends request to LLM provider API
  |
  v
[2] Provider returns 429 (rate limit exceeded)?
  |
  +-- YES:
  |     |
  |     v
  |   [3] Extension shows friendly notification:
  |       "Daily Gemini limit reached (1M tokens/day)."
  |       "Resets at midnight Pacific Time."
  |       "You can still use voice-to-text without enhancement."
  |       [OK] [Learn More]
  |
  +-- NO (success):
        |
        v
      [3] Process response normally
        |
        v
      [4] Optionally update local usage stats
          (stored in ExtensionContext.globalState)
```

---

## 3. Component Design

### 3.1 CommandRouter

```
Responsibility:
  - Central dispatcher for all user interactions
  - Parses voice transcript for directives (enhance, inject, stop, etc.)
  - Routes to appropriate module
  - Manages activation state machine

Interface:
  activate(trigger: 'wakeword' | 'hotkey' | 'command'): void
  deactivate(): void
  handleTranscript(text: string): Promise<void>

State Machine:
  IDLE --> LISTENING --> PROCESSING --> INJECTING --> IDLE
       \                     |
        \                    v
         \            ENHANCING --> PREVIEW --> INJECTING --> IDLE
          \                              |
           \                             v
            <------------- CANCELLED <---+

Does NOT: handle UI, make API calls, manage keys
```

### 3.2 SpeechModule

```
Responsibility:
  - Wraps VS Code Speech API
  - Manages microphone session lifecycle
  - Accumulates partial transcription results
  - Detects end-of-utterance (silence timeout)
  - Reports status to StatusBarUI

Interface:
  startListening(): Promise<void>
  stopListening(): void
  onTranscript: Event<{ text: string, isFinal: boolean }>
  onError: Event<SpeechError>
  onStatusChange: Event<'listening' | 'processing' | 'idle'>

Environment Checks (run before any speech operation):
  1. Remote detection: if vscode.env.remoteName is set (SSH, WSL, Container),
     audio features are unavailable. Show: "Prother audio features are not
     available in remote environments. Use VS Code Desktop locally."
  2. VS Code Web detection: if typeof vscode.speech === 'undefined',
     the Speech API does not exist. Show: "Prother requires VS Code Desktop.
     It does not work in VS Code for Web (vscode.dev) or GitHub Codespaces."
  3. Both checks run on activation and disable audio gracefully (no crash).

Dependency (soft -- runtime check):
  Requires ms-vscode.vscode-speech extension.
  Checked at runtime via:
    vscode.extensions.getExtension('ms-vscode.vscode-speech')
  If not installed: shows notification with install button:
    "Prother requires the VS Code Speech extension. [Install Now]"
  The [Install Now] button runs:
    vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      'ms-vscode.vscode-speech'
    )
  This is a soft dependency (extensionPack, not extensionDependencies)
  so Prother still activates and can show the notification.

Key Implementation Detail:
  Uses vscode.speech.createSpeechToTextSession()
  This API was stabilized in VS Code 1.90+
  It piggybacks on VS Code's built-in speech infra
  Zero bundle size -- the Speech extension handles everything

Does NOT: process commands, enhance prompts, inject text
```

### 3.3 WakeWordEngine

```
Responsibility:
  - Always-on wake word detection ("Hey Prother")
  - Runs in Worker Thread to avoid blocking Extension Host
  - Uses Vosk (open-source, Apache 2.0) with a small speech model: `vosk-model-small-en-us-0.15` (~50MB, Apache 2.0)
  - Captures audio via naudiodon (native PortAudio binding, no SoX needed)
  - Matches "Hey Prother" from continuous transcription stream
  - Posts messages to main thread on detection

Interface (Worker Thread comms via MessagePort):
  Main --> Worker: { type: 'start', config: { modelPath } }
                 | { type: 'stop' }
  Worker --> Main: { type: 'detected', keyword: string, timestamp: number }
  Worker --> Main: { type: 'error', message: string }

Threading Model:
  Extension Host (main thread)
    |
    +-- worker_threads.Worker('./wake-word-worker.js')
          |
          +-- Vosk recognizer instance (vosk-model-small-en-us-0.15, ~50MB)
          +-- naudiodon AudioIO capture (native PortAudio)
          +-- 16kHz mono audio stream
          +-- Keyword matching on partial transcription results
          +-- CPU: ~2-5% of single core

Does NOT: transcribe speech for prompts, route commands, manage UI
```

### 3.4 EnhanceModule

```
Responsibility:
  - Takes raw voice transcript + editor context
  - Constructs enhancement prompt
  - Routes to LLM provider via LLMRouter
  - Returns enhanced prompt for preview
  - Handles network failures gracefully -- falls back to raw prompt
    injection with user confirmation

Interface:
  enhance(raw: string, context: EditorContext): Promise<EnhancedPrompt>
  getSystemPrompt(): string

EditorContext:
  {
    activeFile: string,           // path relative to workspace
    selectedCode: string | null,  // highlighted code if any
    language: string,             // languageId
    cursorPosition: Position,
    workspaceLanguages: string[], // detected project languages
    recentFiles: string[]         // last 5 opened files
  }

Enhancement System Prompt (stored in extension, not hardcoded):
  "You are a coding prompt optimizer. Given a developer's voice-
   dictated prompt and their current code context, rewrite the
   prompt to be clear, specific, and actionable for an AI coding
   assistant. Preserve the developer's intent. Add relevant
   technical details from the context. Output ONLY the enhanced
   prompt, no explanation."

Critical constraint:
  Enhancement MUST use a single API call (system prompt + context + user
  prompt combined in one request). Never split into multiple calls, as
  Gemini free tier is limited to 15 requests per minute.

Does NOT: make auth decisions, track usage, inject text
```

### 3.5 LLMRouter

```
Responsibility:
  - Abstracts all LLM provider differences
  - Selects provider based on user configuration
  - Handles API key retrieval from SecretStorage via KeyManager
  - Normalizes request/response formats
  - Implements retry with exponential backoff

Interface:
  complete(request: LLMRequest): Promise<LLMResponse>
  getAvailableProviders(): Provider[]
  testConnection(provider: string): Promise<boolean>

LLMRequest:
  {
    systemPrompt: string,
    userMessage: string,
    maxTokens: number,        // default: 500 for enhancement
    temperature: number,      // default: 0.3 for enhancement
    provider?: string         // override; else use default
  }

Provider Implementations:
  - GeminiProvider    (gemini-1.5-flash -- recommended default, FREE tier)
  - AnthropicProvider (claude-3-haiku for speed + cost)
  - OpenAIProvider    (gpt-4o-mini)
  - GroqProvider      (llama-3.1-70b for speed)

All calls go directly from the extension to the provider API.
API keys are retrieved from KeyManager (VS Code SecretStorage).

Client-Side Request Queuing:
  LLMRouter enforces a minimum 4-second gap between requests to the
  same provider. This prevents hitting Gemini's 15 RPM (requests per
  minute) limit when users speak prompts in quick succession.
  Queued requests are processed FIFO. If the queue exceeds 5 items,
  oldest requests are dropped with a "Rate limited" notification.

Model Deprecation Handling:
  If a provider returns HTTP 404 (model not found), LLMRouter shows:
  "Model may be deprecated. Update in Settings > Prother > Gemini Model."
  The extension does NOT crash -- it shows the error and continues.

Does NOT: manage keys (delegates to KeyManager), track usage
```

### 3.6 InjectModule

```
Responsibility:
  - Injects text into AI extension input boxes
  - Detects which AI extensions are installed
  - Uses best available injection method per extension
  - Implements fallback cascade

Interface:
  inject(text: string, target?: AIExtension): Promise<InjectResult>
  detectExtensions(): AIExtension[]
  getPreferredTarget(): AIExtension | null

InjectResult:
  {
    success: boolean,
    method: 'command' | 'clipboard' | 'terminal',
    target: string,
    fallbackUsed: boolean
  }

Injection Strategy (detailed in Section 7):
  Priority 1: VS Code commands exposed by target extension
  Priority 2: Clipboard + paste simulation
  Priority 3: Terminal write (for CLI tools like Claude Code)

Does NOT: transcribe speech, enhance prompts, manage keys
```

### 3.7 KeyManager

```
Responsibility:
  - Wraps VS Code SecretStorage for API key management
  - Stores, retrieves, and deletes API keys per provider
  - Validates API keys by making test calls
  - Notifies other components when key state changes

Interface:
  getApiKey(provider: string): Promise<string | null>
  setApiKey(provider: string, key: string): Promise<void>
  removeApiKey(provider: string): Promise<void>
  testApiKey(provider: string, key: string): Promise<TestResult>
  hasAnyKey(): Promise<boolean>
  onKeyChange: Event<{ provider: string, hasKey: boolean }>

TestResult:
  {
    valid: boolean,
    error?: string,    // "invalid_key" | "rate_limited" | "network_error"
    provider: string
  }

Key Storage (all in VS Code SecretStorage -- OS keychain):
  "prother.apikey.gemini"         --> Gemini API key
  "prother.apikey.anthropic"      --> Anthropic API key
  "prother.apikey.openai"         --> OpenAI API key
  "prother.apikey.groq"           --> Groq API key

Security:
  - Keys are stored in the OS keychain via VS Code SecretStorage
    (Keychain on macOS, Credential Manager on Windows, libsecret on Linux)
  - Keys never leave the user's machine
  - Keys are never logged or sent to any Prother server
  - No backend, no telemetry on key usage

Does NOT: make LLM calls, inject text, manage UI
```

### 3.8 OnboardingManager

```
Responsibility:
  - Detects first-time users (no API key in SecretStorage)
  - Shows welcome notification with setup CTA
  - Opens guided setup webview with step-by-step instructions
  - Links to Google AI Studio for free Gemini key creation
  - Orchestrates key validation and storage
  - Shows first-use interactive tutorial
  - Handles "Advanced Options" for other providers

Interface:
  checkAndStartOnboarding(): Promise<void>
  showSetupWebview(): Promise<void>
  showAdvancedOptions(): Promise<void>
  showTutorial(): Promise<void>
  isOnboardingComplete(): boolean

Webview Content:
  - Step 1: "Open Google AI Studio" button
    --> opens https://aistudio.google.com/app/apikey
  - Step 2: API key input field + "Save & Test" button
  - Success/failure feedback
  - Help section with FAQ and troubleshooting
  - Link to video tutorial

See PROTHER_BYOK_ONBOARDING.md for full UX specifications.

Does NOT: make LLM calls, inject text, manage speech
```

### 3.9 StatusBarUI

```
Responsibility:
  - Manages status bar item display
  - Shows current state (idle, listening, processing, error, setup required)
  - Provides click-to-activate functionality
  - Shows quick actions dropdown

States:
  SETUP:      "$(gear) Prother Setup"       (setup required)
  IDLE:       "$(mic) Prother"              (mic icon)
  LISTENING:  "$(pulse) Listening..."       (animated pulse)
  PROCESSING: "$(loading~spin) Prother"     (spinner)
  ERROR:      "$(warning) Prother"          (warning icon)
  DISABLED:   "$(mic-off) Prother"          (muted icon)
  REMOTE:     "$(remote) Prother (Remote)"  (remote -- audio unavailable)

Does NOT: process commands, make API calls
```

---

## 4. Folder Structure

```
prother/
|
+-- .vscode/
|   +-- launch.json                 # Extension debug configs
|   +-- tasks.json                  # Build tasks
|
+-- src/
|   +-- extension.ts                # activate() / deactivate() entry point
|   |                                # Includes: global unhandledRejection handler
|   |                                # process.on('unhandledRejection', ...) logs + shows
|   |                                # generic error notification. No raw stack traces to user.
|   |                                # Also: remote/Web environment check on activation.
|   |
|   +-- core/
|   |   +-- command-router.ts       # Central dispatcher + state machine
|   |   +-- types.ts                # Shared types, interfaces, enums
|   |   +-- constants.ts            # Magic strings, defaults, limits
|   |   +-- errors.ts               # Custom error classes
|   |   +-- events.ts               # Typed event emitter helpers
|   |
|   +-- speech/
|   |   +-- speech-module.ts        # VS Code Speech API wrapper
|   |   +-- transcript-builder.ts   # Accumulates partial results
|   |   +-- silence-detector.ts     # End-of-utterance detection
|   |
|   +-- wake-word/
|   |   +-- wake-word-manager.ts    # Main thread coordinator
|   |   +-- wake-word-worker.ts     # Worker thread entry point (Vosk + naudiodon)
|   |   +-- keyword-matcher.ts      # Fuzzy matching for "Hey Prother"
|   |
|   +-- enhance/
|   |   +-- enhance-module.ts       # Enhancement orchestrator
|   |   +-- context-collector.ts    # Gathers editor context
|   |   +-- prompt-templates.ts     # System prompts for enhancement
|   |
|   +-- llm/
|   |   +-- llm-router.ts          # Provider selection + dispatch
|   |   +-- base-provider.ts       # Abstract provider class
|   |   +-- providers/
|   |   |   +-- gemini.ts          # Default -- free tier recommended
|   |   |   +-- anthropic.ts
|   |   |   +-- openai.ts
|   |   |   +-- groq.ts
|   |   +-- rate-limiter.ts        # Client-side rate limiting / 429 handling
|   |
|   +-- inject/
|   |   +-- inject-module.ts       # Injection orchestrator
|   |   +-- strategies/
|   |   |   +-- command-strategy.ts    # VS Code command injection
|   |   |   +-- clipboard-strategy.ts  # Clipboard + paste fallback
|   |   |   +-- terminal-strategy.ts   # Terminal write for CLI tools
|   |   +-- extension-detector.ts  # Detect installed AI extensions
|   |
|   +-- keys/
|   |   +-- key-manager.ts         # VS Code SecretStorage wrapper
|   |   +-- key-validator.ts       # Test API key against provider
|   |
|   +-- onboarding/
|   |   +-- onboarding-manager.ts  # First-time setup orchestrator
|   |   +-- welcome-view.ts        # Welcome notification logic
|   |   +-- setup-webview.ts       # Guided setup webview (HTML/CSS/JS)
|   |
|   +-- ui/
|   |   +-- status-bar.ts          # Status bar management
|   |   +-- notifications.ts       # Notification helpers
|   |   +-- webview/               # Settings page
|   |       +-- settings-panel.ts
|   |
|   +-- telemetry/
|   |   +-- telemetry.ts           # Anonymous usage analytics (VS Code Telemetry API)
|   |   +-- usage-tracker.ts       # Local usage stats (globalState)
|   |   +-- logger.ts              # Structured logging
|   |
|   +-- test/
|       +-- suite/
|       |   +-- command-router.test.ts
|       |   +-- speech-module.test.ts
|       |   +-- enhance-module.test.ts
|       |   +-- inject-module.test.ts
|       |   +-- llm-router.test.ts
|       |   +-- key-manager.test.ts
|       |   +-- onboarding-manager.test.ts
|       +-- mocks/
|       |   +-- vscode-speech.mock.ts
|       |   +-- vscode-api.mock.ts
|       +-- fixtures/
|           +-- transcripts.json
|           +-- enhanced-prompts.json
|
+-- models/
|   +-- vosk-model-small-en-us-0.15/ # Vosk small English model (~50MB, Apache 2.0)
|                                    # Downloaded from GitHub Releases (alphacephei/vosk-api)
|                                    # Lazy-downloaded on first wake word enable
|
+-- package.json                    # Extension manifest
+-- tsconfig.json
+-- esbuild.mjs                     # Bundle for production
+-- .vscodeignore
+-- CHANGELOG.md
+-- LICENSE
+-- LICENSE-MODELS                  # Vosk model attribution (Apache 2.0)
+-- PRIVACY.md                     # Privacy policy for Marketplace listing
```

**Rationale for this structure**:
- Each module maps 1:1 to a component in the architecture diagram
- **No backend directory** -- the extension is fully self-contained
- `src/keys/` handles SecretStorage key management (no OAuth)
- `src/onboarding/` handles the guided BYOK setup flow
- `src/wake-word/` uses Vosk + naudiodon (no SoX dependency, no Picovoice licensing)
- `models/` contains the Vosk small model (lazy-downloaded, not shipped in initial install)
- The `strategies/` pattern in `inject/` makes it trivial to add new injection targets
- The `providers/` pattern in `llm/` makes adding new LLM providers a single-file change
- Tests mirror the source structure for easy navigation

---

## 5. API Key Setup & Onboarding

This section describes how users set up their API key. The full UX specification (wireframes, notifications, error states) is in `PROTHER_BYOK_ONBOARDING.md`.

### 5.1 First-Time Detection

```typescript
// src/onboarding/onboarding-manager.ts

export class OnboardingManager {
  constructor(
    private keyManager: KeyManager,
    private context: vscode.ExtensionContext
  ) {}

  async checkAndStartOnboarding(): Promise<void> {
    // Check if user has any API key configured
    const hasKey = await this.keyManager.hasAnyKey();

    if (!hasKey) {
      // Check if user previously dismissed onboarding
      const dismissed = this.context.globalState.get('prother.onboarding.dismissed');

      if (!dismissed) {
        this.showWelcomeNotification();
      } else {
        // Still show status bar hint
        // Status bar: [Gear] Prother Setup Required
      }
    }
  }

  private showWelcomeNotification(): void {
    vscode.window.showInformationMessage(
      'Welcome to Prother! Speak your coding prompts. ' +
      'Quick setup: Get a FREE Gemini API key (2 min, no credit card).',
      'Start Setup',
      'Advanced Options'
    ).then(choice => {
      if (choice === 'Start Setup') {
        this.showSetupWebview();
      } else if (choice === 'Advanced Options') {
        this.showAdvancedOptions();
      }
    });
  }

  async showSetupWebview(): Promise<void> {
    // Opens a webview panel with guided setup
    // Content matches PROTHER_BYOK_ONBOARDING.md Step 2
    // Includes:
    //   - "Open Google AI Studio" button
    //   - API key input field
    //   - "Save & Test Connection" button
    //   - Help / FAQ section
  }

  async showAdvancedOptions(): Promise<void> {
    // Quick pick for choosing provider
    const provider = await vscode.window.showQuickPick([
      { label: 'Google Gemini 1.5 Flash (Recommended)', description: 'FREE - 1M tokens/day', id: 'gemini' },
      { label: 'Anthropic Claude (Haiku)', description: '~$0.001 per enhancement', id: 'anthropic' },
      { label: 'OpenAI GPT-4o Mini', description: '~$0.001 per enhancement', id: 'openai' },
      { label: 'Groq (Llama 3.1)', description: '~$0.0001 per enhancement', id: 'groq' },
    ], { placeHolder: 'Choose your LLM provider for prompt enhancement' });

    if (provider) {
      // Prompt for API key for the selected provider
      const key = await vscode.window.showInputBox({
        prompt: `Enter your ${provider.label} API key`,
        password: true,
        placeHolder: 'Paste your API key here'
      });

      if (key) {
        const result = await this.keyManager.testApiKey(provider.id, key);
        if (result.valid) {
          await this.keyManager.setApiKey(provider.id, key);
          vscode.window.showInformationMessage('Prother is ready! Press Alt+V to start speaking.');
        } else {
          vscode.window.showErrorMessage(`Invalid API key: ${result.error}. Please try again.`);
        }
      }
    }
  }
}
```

### 5.2 Key Validation

```typescript
// src/keys/key-validator.ts

export class KeyValidator {

  async testGeminiKey(key: string): Promise<TestResult> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "ok"' }] }],
            generationConfig: { maxOutputTokens: 5 }
          })
        }
      );

      if (response.ok) return { valid: true, provider: 'gemini' };
      if (response.status === 400) return { valid: false, error: 'invalid_key', provider: 'gemini' };
      if (response.status === 429) return { valid: true, provider: 'gemini' }; // Key is valid, just rate limited
      return { valid: false, error: 'network_error', provider: 'gemini' };
    } catch {
      return { valid: false, error: 'network_error', provider: 'gemini' };
    }
  }

  // Similar methods for testAnthropicKey, testOpenAIKey, testGroqKey
}
```

### 5.3 Security Considerations

| Concern | Mitigation |
|---------|-----------|
| API key storage | VS Code SecretStorage uses OS keychain (Keychain on macOS, Credential Manager on Windows, libsecret on Linux) |
| Key never leaves machine | All LLM calls go direct from extension to provider. No Prother backend. |
| Key in transit | Always over HTTPS/TLS to provider APIs |
| Key in memory | Only loaded when making API calls, not held in global state |
| Accidental exposure | Keys stored via SecretStorage, not in settings.json or any file |

---

## 6. Client-Side Usage Tracking

### 6.1 Philosophy

With the BYOK-only model, rate limiting is handled entirely by the LLM provider. Google Gemini's free tier enforces 1M tokens/day automatically. There is no Prother backend or database.

Optional local usage tracking is provided purely for the user's benefit (e.g., "you've spoken 247 prompts this month").

### 6.2 Local Usage Stats (ExtensionContext.globalState)

```typescript
// src/telemetry/usage-tracker.ts

interface MonthlyUsage {
  promptsSpoken: number;
  promptsEnhanced: number;
  wordsSpoken: number;
  lastUsed: string;     // ISO date
}

export class UsageTracker {
  constructor(private globalState: vscode.Memento) {}

  async recordPrompt(wordCount: number, enhanced: boolean): Promise<void> {
    const monthKey = `prother.usage.${this.getMonthKey()}`;
    const current: MonthlyUsage = this.globalState.get(monthKey, {
      promptsSpoken: 0,
      promptsEnhanced: 0,
      wordsSpoken: 0,
      lastUsed: ''
    });

    current.promptsSpoken++;
    if (enhanced) current.promptsEnhanced++;
    current.wordsSpoken += wordCount;
    current.lastUsed = new Date().toISOString();

    await this.globalState.update(monthKey, current);
  }

  getMonthlyStats(): MonthlyUsage | null {
    return this.globalState.get(`prother.usage.${this.getMonthKey()}`) ?? null;
  }

  private getMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

### 6.3 Handling Provider Rate Limits

#### 6.3.1 Gemini Free Tier Actual Limits

Google Gemini's free tier has multiple rate limit layers (not just the daily token cap):

| Limit | Value | Impact |
|---|---|---|
| Requests per minute (RPM) | 15 | Max ~1 enhancement every 4 seconds |
| Requests per day (RPD) | 1,500 | Max ~1,500 enhancements/day |
| Tokens per minute (TPM) | 1,000,000 | Rarely hit for prompt enhancement |
| Tokens per day (TPD) | 1,000,000 | Rarely hit for prompt enhancement |

**The RPM limit (15/min) is the most likely to be hit in normal use.** A developer who speaks 3 prompts in quick succession with "enhance" will hit this. The LLMRouter's client-side request queuing (min 4s gap) prevents this proactively.

**All onboarding messaging must reflect these limits accurately:**
- DO say: "~1,500 enhancements per day, no credit card needed"
- DO NOT say: "Unlimited prompt enhancements"

When a provider returns HTTP 429 (rate limit exceeded), the extension:

1. Parses the `Retry-After` header if present
2. Shows a user-friendly notification explaining the limit
3. Allows voice-to-text to continue working (without enhancement)
4. For Gemini free tier: "Daily limit reached (1M tokens). Resets at midnight Pacific Time."

```typescript
// src/llm/rate-limiter.ts

export class ProviderRateLimitHandler {

  handleRateLimit(provider: string, response: Response): void {
    const retryAfter = response.headers.get('Retry-After');

    const messages: Record<string, string> = {
      gemini: 'Daily Gemini limit reached (1M tokens/day). Resets at midnight Pacific Time.',
      anthropic: 'Anthropic rate limit reached. Try again in a moment.',
      openai: 'OpenAI rate limit reached. Try again in a moment.',
      groq: 'Groq rate limit reached. Try again in a moment.',
    };

    vscode.window.showWarningMessage(
      messages[provider] || 'Rate limit reached. Try again later.',
      'OK',
      'Learn More'
    ).then(choice => {
      if (choice === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://aistudio.google.com/app/apikey'));
      }
    });
  }
}
```

### 6.4 Offline & Network Failure Strategy

Voice-to-text (VS Code Speech API) works offline on most platforms. Enhancement requires network access to the LLM provider.

**Platform-specific offline speech-to-text status:**

| Platform | Offline STT | Notes |
|---|---|---|
| **Windows** | Yes | Uses Windows Speech Recognition (built-in) |
| **macOS** | Yes | Uses Apple Speech (built-in for English) |
| **Linux** | Verify | Depends on `ms-vscode.vscode-speech` bundled model. Test per distro. |

Enhancement requires network access to the LLM provider.

**Behavior when network is unavailable:**

1. EnhanceModule detects network failure (fetch throws or times out)
2. Shows notification: "Network unavailable. Injecting raw prompt instead."
   `[Inject Raw]` `[Retry]` `[Cancel]`
3. If user chooses `[Inject Raw]`: InjectModule receives the un-enhanced transcript
4. If user chooses `[Retry]`: attempts enhancement again

**Behavior when provider returns error (non-429):**

1. Shows notification: "Enhancement failed. Injecting raw prompt instead."
   `[Inject Raw]` `[Retry]` `[Cancel]`

**Prompt cache (optional):**

- Store the last 10 enhanced prompts in `ExtensionContext.globalState`
- User can access via command: "Prother: Show Recent Prompts"
- Useful for re-injecting a previous prompt without speaking again

---

## 7. Input Injection Strategy

This is the hardest technical problem in the entire project. Let me be direct about the challenges and realistic about what works.

### 7.1 The Core Problem

AI coding extensions (Copilot Chat, Cline, Continue, etc.) use VS Code's Webview API for their chat UIs. Webviews are **sandboxed iframes** -- you cannot access their DOM, inject keystrokes, or programmatically set input values from another extension.

### 7.2 Injection Strategy Matrix

```
+------------------+--------------------+------------------+------------------+
| AI Extension     | Strategy 1         | Strategy 2       | Strategy 3       |
|                  | (VS Code Commands) | (Clipboard)      | (Terminal)       |
+------------------+--------------------+------------------+------------------+
| GitHub Copilot   | workbench.action.  | Clipboard +      | N/A              |
| Chat             | chat.open +        | Ctrl+V into      |                  |
|                  | type into chat     | focused chat     |                  |
|                  | input area         | panel             |                  |
+------------------+--------------------+------------------+------------------+
| Cline            | cline.sendMessage  | Clipboard +      | N/A              |
|                  | (if exposed)       | paste             |                  |
+------------------+--------------------+------------------+------------------+
| Continue         | continue.sendInput | Clipboard +      | N/A              |
|                  | (if exposed)       | paste             |                  |
+------------------+--------------------+------------------+------------------+
| Claude Code      | N/A (CLI tool)     | N/A              | Terminal write   |
| (terminal)       |                    |                  | via sendText()   |
+------------------+--------------------+------------------+------------------+
| Cursor AI        | Cursor-specific    | Clipboard +      | N/A              |
|                  | commands           | paste             |                  |
+------------------+--------------------+------------------+------------------+
| Inline Chat      | vscode.editorChat  | N/A              | N/A              |
| (any provider)   | .start + type      |                  |                  |
+------------------+--------------------+------------------+------------------+
```

### 7.3 Strategy 1: VS Code Commands (Best When Available)

```typescript
// src/inject/strategies/command-strategy.ts

export class CommandStrategy implements InjectionStrategy {

  private readonly EXTENSION_COMMANDS: Record<string, CommandConfig> = {
    'github.copilot-chat': {
      openCommand: 'workbench.action.chat.open',
      useBuiltInChat: true,
    },
    'saoudrizwan.claude-dev': {
      openCommand: 'cline.plusButtonClicked',
      useBuiltInChat: false,
    },
    'continue.continue': {
      openCommand: 'continue.focusContinueInput',
      useBuiltInChat: false,
    }
  };

  async inject(text: string, target: string): Promise<boolean> {
    const config = this.EXTENSION_COMMANDS[target];
    if (!config) return false;

    if (config.useBuiltInChat) {
      try {
        await vscode.commands.executeCommand(
          'workbench.action.chat.open',
          { query: text }
        );
        return true;
      } catch {
        return false;
      }
    }

    try {
      await vscode.commands.executeCommand(config.openCommand);
      await delay(300);
      return false; // Fall through to clipboard strategy
    } catch {
      return false;
    }
  }
}
```

**Critical discovery**: VS Code's built-in Chat API (used by Copilot Chat since VS Code 1.93) supports `workbench.action.chat.open` with a `query` parameter. This is the cleanest injection path for Copilot.

### 7.4 Strategy 2: Clipboard Injection (Universal Fallback)

```typescript
// src/inject/strategies/clipboard-strategy.ts

export class ClipboardStrategy implements InjectionStrategy {

  async inject(text: string, target: string): Promise<boolean> {
    const previousClipboard = await vscode.env.clipboard.readText();

    try {
      await vscode.env.clipboard.writeText(text);
      await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
      return true;
    } finally {
      setTimeout(async () => {
        await vscode.env.clipboard.writeText(previousClipboard);
      }, 1000);
    }
  }
}
```

**Honest assessment**: For webview-based extensions (Cline, Continue), a fully automatic clipboard injection is unreliable. The recommended approach is:

1. Set clipboard with the text
2. Focus the extension's panel
3. Show a brief auto-dismissing notification: "Prompt ready -- paste with Ctrl+V"
4. The notification auto-dismisses after the user pastes

This is a slightly degraded UX but it is **reliable**.

### 7.5 Strategy 3: Terminal Injection (For CLI Tools)

```typescript
// src/inject/strategies/terminal-strategy.ts

export class TerminalStrategy implements InjectionStrategy {

  async inject(text: string, target: string): Promise<boolean> {
    const terminal = this.findAITerminal(target);
    if (!terminal) return false;

    terminal.sendText(text, false);
    terminal.show();
    return true;
  }

  private findAITerminal(target: string): vscode.Terminal | undefined {
    const CLI_PATTERNS: Record<string, RegExp> = {
      'claude-code': /claude/i,
      'aider': /aider/i,
      'gpt-engineer': /gpt-engineer/i,
    };

    const pattern = CLI_PATTERNS[target];
    if (!pattern) return undefined;

    return vscode.window.terminals.find(t => pattern.test(t.name));
  }
}
```

**Terminal injection is the most reliable strategy.** `terminal.sendText()` is a first-class VS Code API that works perfectly.

### 7.6 Injection Orchestrator

```typescript
// src/inject/inject-module.ts

export class InjectModule {
  private strategies: InjectionStrategy[];
  private detector: ExtensionDetector;

  constructor() {
    this.strategies = [
      new CommandStrategy(),
      new TerminalStrategy(),
      new ClipboardStrategy(),
    ];
    this.detector = new ExtensionDetector();
  }

  async inject(text: string, preferredTarget?: string): Promise<InjectResult> {
    const installed = this.detector.detectExtensions();

    if (installed.length === 0) {
      return {
        success: false,
        error: 'No AI coding extensions detected'
      };
    }

    const target = preferredTarget || await this.selectTarget(installed);

    for (const strategy of this.strategies) {
      if (await strategy.canHandle(target)) {
        const success = await strategy.inject(text, target);
        if (success) {
          return {
            success: true,
            method: strategy.name,
            target
          };
        }
      }
    }

    // Ultimate fallback
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage(
      'Prompt copied to clipboard. Paste into your AI assistant.',
      'OK'
    );
    return { success: true, method: 'clipboard-manual', target };
  }

  private async selectTarget(installed: AIExtension[]): Promise<string> {
    if (installed.length === 1) return installed[0].id;

    const visible = installed.find(ext => ext.isVisible);
    if (visible) return visible.id;

    const configured = vscode.workspace
      .getConfiguration('prother')
      .get<string>('defaultAIExtension');
    if (configured && installed.some(e => e.id === configured)) {
      return configured;
    }

    const choice = await vscode.window.showQuickPick(
      installed.map(e => ({ label: e.displayName, id: e.id })),
      { placeHolder: 'Which AI assistant should receive the prompt?' }
    );
    return choice?.id || installed[0].id;
  }
}
```

### 7.7 Extension Detection

```typescript
// src/inject/extension-detector.ts

export class ExtensionDetector {

  private readonly AI_EXTENSIONS: AIExtensionDef[] = [
    {
      id: 'github.copilot-chat',
      displayName: 'GitHub Copilot Chat',
      type: 'webview',
      detectionMethod: 'extension-api'
    },
    {
      id: 'saoudrizwan.claude-dev',
      displayName: 'Cline',
      type: 'webview',
      detectionMethod: 'extension-api'
    },
    {
      id: 'continue.continue',
      displayName: 'Continue',
      type: 'webview',
      detectionMethod: 'extension-api'
    },
    {
      id: 'claude-code-terminal',
      displayName: 'Claude Code (Terminal)',
      type: 'terminal',
      detectionMethod: 'terminal-scan'
    }
  ];

  detectExtensions(): AIExtension[] {
    const results: AIExtension[] = [];

    for (const def of this.AI_EXTENSIONS) {
      if (def.detectionMethod === 'extension-api') {
        const ext = vscode.extensions.getExtension(def.id);
        if (ext) {
          results.push({
            ...def,
            installed: true,
            active: ext.isActive,
            isVisible: this.isPanelVisible(def.id)
          });
        }
      } else if (def.detectionMethod === 'terminal-scan') {
        const terminal = vscode.window.terminals.find(
          t => /claude/i.test(t.name)
        );
        if (terminal) {
          results.push({
            ...def,
            installed: true,
            active: true,
            isVisible: terminal === vscode.window.activeTerminal
          });
        }
      }
    }

    return results;
  }
}
```

---

## 8. Wake Word Architecture

### 8.1 Why This Is Hard

Running always-on wake word detection in a VS Code extension has specific challenges:

1. **VS Code Extension Host is single-threaded Node.js** -- speech processing would block the UI
2. **Continuous microphone access** -- needs to run alongside (not conflict with) VS Code Speech API
3. **CPU/battery drain** -- developers run VS Code for hours; wake word must be ultra-efficient
4. **Custom wake word** -- Vosk does continuous speech recognition; we match "Hey Prother" from the transcript stream. No special model training needed.

### 8.2 Architecture

```
Extension Host (Main Thread)                Worker Thread
+----------------------------+             +----------------------------+
|                            |  MessagePort |                            |
| WakeWordManager            |<----------->| WakeWordWorker             |
|  - start() / stop()       |             |  - Vosk recognizer         |
|  - onDetected event       |  'detected' |    (vosk-model-small-en-us-0.15, ~50MB)    |
|  - manages worker lifecycle|<-----------+|  - naudiodon audio capture |
|  - handles errors/restarts |             |  - 16kHz mono stream       |
|                            |  'start'    |  - Keyword matching        |
|                            |+----------->|                            |
|                            |  'stop'     |                            |
|                            |+----------->|                            |
+----------------------------+             +----------------------------+
                                                      |
                                                      v
                                           +----------------------------+
                                           | OS Microphone              |
                                           | (via naudiodon native      |
                                           |  PortAudio addon)          |
                                           +----------------------------+
```

### 8.3 Worker Thread Implementation

**Electron ABI Compatibility (Critical)**:
VS Code runs on Electron, which bundles its own Node.js with a specific ABI version.
Native addons (Vosk, naudiodon) MUST be compiled against this exact Electron Node ABI,
not the system Node.js. Use `@electron/rebuild` or `prebuild-install` with
`--runtime=electron --target=<version>` in the build pipeline. Every VS Code update
may change the Electron version — native addons must be rebuilt accordingly.
This is verified in CI across all 6 platform targets.

```typescript
// src/wake-word/wake-word-worker.ts

import { parentPort } from 'worker_threads';
import vosk from 'vosk';
import * as portAudio from 'naudiodon';

let recognizer: any = null;
let audioInput: any = null;
let model: any = null;
const SAMPLE_RATE = 16000;

parentPort?.on('message', async (msg) => {
  switch (msg.type) {
    case 'start':
      await startListening(msg.config);
      break;
    case 'stop':
      stopListening();
      break;
  }
});

async function startListening(config: WakeWordConfig) {
  try {
    vosk.setLogLevel(-1); // Suppress logs

    model = new vosk.Model(config.modelPath); // ~50MB small English model
    recognizer = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE });

    audioInput = new portAudio.AudioIO({
      inOptions: {
        channelCount: 1,
        sampleFormat: portAudio.SampleFormat16Bit,
        sampleRate: SAMPLE_RATE,
        deviceId: -1,  // default input device
        closeOnError: false
      }
    });

    audioInput.on('data', (data: Buffer) => {
      if (recognizer.acceptWaveform(data)) {
        const result = recognizer.result();
        checkForWakeWord(result.text);
      } else {
        const partial = recognizer.partialResult();
        checkForWakeWord(partial.partial);
      }
    });

    audioInput.start();
    parentPort?.postMessage({ type: 'started' });

  } catch (err: any) {
    parentPort?.postMessage({ type: 'error', message: err.message });
  }
}

function checkForWakeWord(text: string) {
  if (!text) return;
  const normalized = text.toLowerCase().trim();
  // Match "hey prother" with fuzzy tolerance for common misrecognitions
  if (normalized.includes('hey prother') || normalized.includes('hey brother')) {
    parentPort?.postMessage({
      type: 'detected',
      keyword: 'hey-prother',
      timestamp: Date.now()
    });
    // Reset recognizer to avoid re-triggering on same utterance
    recognizer.reset();
  }
}

function stopListening() {
  if (audioInput) {
    audioInput.quit();
    audioInput = null;
  }
  if (recognizer) {
    recognizer.free();
    recognizer = null;
  }
  if (model) {
    model.free();
    model = null;
  }
  parentPort?.postMessage({ type: 'stopped' });
}
```

### 8.4 Main Thread Manager

```typescript
// src/wake-word/wake-word-manager.ts

import { Worker } from 'worker_threads';
import * as vscode from 'vscode';
import * as path from 'path';

export class WakeWordManager {
  private worker: Worker | null = null;
  private _onDetected = new vscode.EventEmitter<void>();
  readonly onDetected = this._onDetected.event;
  private restartCount = 0;
  private maxRestarts = 3;

  constructor(
    private extensionPath: string,
    private modelPath: string   // path to Vosk model directory
  ) {}

  async start(): Promise<void> {
    if (this.worker) return;

    const workerPath = path.join(
      this.extensionPath, 'dist', 'wake-word-worker.js'
    );

    // Graceful fallback: if native modules fail to load, disable wake word
    try {
      this.worker = new Worker(workerPath);
    } catch (err: any) {
      // Native module load failure (wrong ABI, missing vcredist, etc.)
      this.showPlatformSpecificError(err.message);
      return; // Wake word disabled, hotkey-only mode continues working
    }

    this.worker.on('message', (msg) => {
      switch (msg.type) {
        case 'detected':
          this._onDetected.fire();
          this.debounceDetection();
          break;
        case 'error':
          console.error('[Prother WakeWord]', msg.message);
          this.handleWorkerError(msg.message);
          break;
        case 'started':
          this.restartCount = 0;
          break;
      }
    });

    this.worker.on('error', (err) => {
      console.error('[Prother WakeWord] Worker error:', err);
      this.handleWorkerError(err.message);
    });

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        this.handleWorkerError(`Worker exited with code ${code}`);
      }
      this.worker = null;
    });

    this.worker.postMessage({
      type: 'start',
      config: { modelPath: this.modelPath }
    });
  }

  async stop(): Promise<void> {
    if (!this.worker) return;
    this.worker.postMessage({ type: 'stop' });
    await this.worker.terminate();
    this.worker = null;
  }

  private handleWorkerError(message: string) {
    if (this.restartCount < this.maxRestarts) {
      this.restartCount++;
      setTimeout(() => this.start(), 1000 * this.restartCount);
    } else {
      vscode.window.showWarningMessage(
        'Prother wake word detection stopped due to errors. ' +
        'Use Alt+V to activate manually.'
      );
    }
  }

  private showPlatformSpecificError(errorMessage: string) {
    const platform = process.platform;
    let fix = 'Check the Prother troubleshooting guide.';
    if (platform === 'win32') {
      fix = 'Install Visual C++ Redistributable 2019+: https://aka.ms/vs/17/release/vc_redist.x64.exe';
    } else if (platform === 'linux') {
      fix = 'Run: sudo apt install libatomic1 libgomp1';
    } else if (platform === 'darwin') {
      fix = 'Run: xcode-select --install';
    }
    vscode.window.showErrorMessage(
      `Prother wake word failed to start: ${fix}. ` +
      'Voice input via Alt+V still works.',
      'Get Help'
    );
  }

  private debounceDetection() {
    this.worker?.postMessage({ type: 'stop' });
    setTimeout(() => {
      this.worker?.postMessage({
        type: 'start',
        config: { modelPath: this.modelPath }
      });
    }, 2000);
  }
}
```

### 8.5 CPU/Battery Optimization

| Optimization | Impact | Implementation |
|---|---|---|
| Worker thread | Prevents UI jank | Already in architecture |
| 16kHz mono audio | 16x less data than 48kHz stereo | Vosk's recommended format |
| Vosk native bindings | Near-native performance | `vosk-node` uses compiled native bindings |
| naudiodon native capture | No SoX dependency, direct PortAudio | Ships bundled with extension (prebuilt per platform) |
| Auto-suspend | Stops when VS Code not focused | `vscode.window.onDidChangeWindowState` |
| User toggle | Disable wake word entirely | Setting: `prother.wakeWord.enabled` |

```typescript
// Auto-suspend when VS Code loses focus
vscode.window.onDidChangeWindowState((state) => {
  if (!state.focused && wakeWordEnabled) {
    wakeWordManager.stop();
  } else if (state.focused && wakeWordEnabled) {
    wakeWordManager.start();
  }
});
```

**Measured CPU impact**: Vosk with a small model (~50MB) in a worker thread typically uses 2-5% of a single CPU core. This is acceptable for a development machine. The auto-suspend optimization (stopping when VS Code is not focused) reduces effective usage further.

### 8.6 Microphone Conflict: Wake Word vs Speech API

**The problem**: Both the wake word engine and VS Code Speech API need microphone access. They cannot both record simultaneously (on most OS configurations, only one app/process can hold the mic).

**Solution**: Exclusive access with handoff.

```
State: WAKE_WORD_ACTIVE
  Wake word engine has mic access (Vosk + naudiodon)
  |
  v
"Hey Prother" detected
  |
  v
State: TRANSITIONING
  Wake word engine releases mic (stop naudiodon capture)
  ~100ms pause for OS to release device
  |
  v
State: SPEECH_ACTIVE
  VS Code Speech API acquires mic
  SpeechModule.startListening()
  |
  v
User finishes speaking (silence detected / hotkey / "stop")
  |
  v
State: TRANSITIONING
  Speech API session ends (mic released)
  ~100ms pause
  |
  v
State: WAKE_WORD_ACTIVE
  Wake word engine reacquires mic (restart naudiodon + Vosk)
```

This handoff adds ~200ms latency between saying "Hey Prother" and the system being ready to listen. This is imperceptible to users and is a necessary trade-off.

### 8.7 Native Runtime Dependencies

Vosk and naudiodon native addons require platform-specific runtime libraries:

| Platform | Requirement | Typically Installed? | If Missing |
|---|---|---|---|
| **Windows x64** | Visual C++ Redistributable 2019+ | Yes on most dev machines | Show: "Install Visual C++ Redistributable" + download link |
| **Windows ARM** | Visual C++ Redistributable 2019+ (ARM) | Less common | Same + ARM-specific link |
| **macOS x64** | Xcode Command Line Tools | Yes if Homebrew/dev tools used | Show: "Run `xcode-select --install`" |
| **macOS ARM** | Xcode Command Line Tools | Yes on M1/M2/M3 | Same |
| **Linux x64** | `libatomic1`, `libgomp1`, `libstdc++6` | Usually yes | Show: "Run `sudo apt install libatomic1 libgomp1`" |
| **Linux ARM** | Same as Linux x64 | Less common | Same |

On first wake word enable, the WakeWordManager attempts to load native modules. If loading fails, it catches the error and shows a **platform-specific** message with exact install instructions. The extension continues to work with hotkey-only activation.

### 8.8 Platform Test Matrix

Wake word (Vosk + naudiodon) must be tested on each target before release:

| Platform | Vosk loads | naudiodon loads | Mic capture | Keyword detection | Status |
|---|---|---|---|---|---|
| Windows x64 | | | | | Not yet tested |
| macOS ARM (M1/M2/M3) | | | | | Not yet tested |
| macOS x64 | | | | | Not yet tested |
| Linux x64 (Ubuntu) | | | | | Not yet tested |
| Linux ARM (RPi) | | | | | Not yet tested |
| Remote (SSH/WSL) | N/A — disabled | N/A — disabled | N/A | N/A | By design |

---

## 9. Critical Decisions & Implementation Order

### 9.1 Decisions That Must Be Made Before Writing Code

| # | Decision | Options | Recommendation | Reasoning |
|---|---|---|---|---|
| 1 | **Wake word engine** | Vosk (open-source) vs browser Web Speech API | **Vosk (open-source)** | Apache 2.0 license. No API key. No licensing concerns for Marketplace distribution. Ship a small (~50MB) English model. Keyword matching via transcript string matching. |
| 2 | **Microphone access in worker** | naudiodon vs node-record-lpcm16 vs Web Audio | **naudiodon** | Native Node.js addon via PortAudio. Ships bundled with extension (prebuilt for win/mac/linux x64+arm64). No SoX dependency. Zero user-side install. |
| 3 | **Build tooling** | Webpack vs esbuild | **esbuild** | 10-50x faster builds, simpler config, VS Code extension team recommends it |
| 4 | **Minimum VS Code version** | 1.90+ (Speech API) vs 1.93+ (Chat input API) | **1.93+** | The `workbench.action.chat.open` with query parameter is critical for Copilot injection |
| 5 | **Telemetry** | VS Code Telemetry API vs none | **VS Code Telemetry API** for anonymous usage stats | Respects user telemetry settings automatically |
| 6 | **Default LLM provider** | Gemini vs others | **Gemini 1.5 Flash** | Free tier (1M tokens/day), no credit card, frictionless onboarding |
| 7 | **Default hotkey** | Alt+V vs Ctrl+Shift+V vs Ctrl+Shift+Space | **Alt+V** | Avoids conflict with VS Code's Markdown Preview Toggle (Ctrl+Shift+V) and Paste without Formatting. "V" for voice mnemonic. Configurable via keybindings. |

### 9.2 Architectural Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **VS Code Speech API changes** | Medium | Stabilized in 1.90, small API surface. Pin to known-good version. Write an abstraction layer. |
| **AI extension input injection breaks** | High | Extensions update constantly. Clipboard fallback is always available. Build compatibility test suite that runs weekly. |
| **Vosk model size** | Low | Small English model is ~50MB. Increases extension size. Can lazy-download on first wake word enable to keep initial install small. |
| **Vosk wake word accuracy** | Medium | Vosk does continuous speech recognition, not dedicated keyword spotting. "Hey Prother" matching relies on transcript accuracy. Mitigated by fuzzy matching ("hey brother", "hey prother") and sensitivity tuning. |
| **Electron ABI compatibility** | High | Native addons must be compiled against VS Code's Electron Node ABI. Every VS Code update may change the Electron version. Use `@electron/rebuild` or `prebuild-install --runtime=electron`. Test after every VS Code stable release. |
| **naudiodon native addon cross-platform builds** | Medium | Requires prebuilt binaries for 6 platform targets (win/mac/linux x64+arm64). Use `prebuild-install` in CI. Extension size increases ~5-10MB. Well-established pattern used by many VS Code extensions. |
| **Microphone permission issues** | Medium | Different OS handle mic permissions differently. Windows 11 may block mic access for VS Code. Need clear setup guide and error messages. |
| **User API key management friction** | Medium | Mitigated by guided onboarding flow (see PROTHER_BYOK_ONBOARDING.md). 2-minute setup, direct link to Google AI Studio, key validation with instant feedback. |
| **Provider rate limits** | Low | Gemini free tier is generous (1M tokens/day). Show clear messages when limits hit. Allow switching providers. |
| **Network unavailability** | Low | Voice-to-text works offline. Enhancement gracefully degrades: injects raw prompt with user confirmation. See Section 6.4. |

### 9.3 Recommended Implementation Order

```
PHASE 1: Walking Skeleton (Weeks 1-2)
=========================================
Goal: End-to-end voice-to-text-to-injection working for ONE target

  [1] Project scaffolding
      - VS Code extension boilerplate (yo code generator)
      - esbuild config
      - TypeScript strict mode
      - ESLint + Prettier

  [2] SpeechModule
      - VS Code Speech API integration
      - Runtime check for ms-vscode.vscode-speech (soft dependency)
      - Hotkey activation (Alt+V)
      - Status bar showing listening state
      - Basic silence detection

  [3] InjectModule (Copilot Chat only)
      - workbench.action.chat.open with query parameter
      - Clipboard fallback

  [4] CommandRouter (basic)
      - Hotkey --> listen --> inject (no enhancement, no wake word)
      - Basic try/catch error handling, user-facing error notifications

  [5] Unit tests
      - SpeechModule, CommandRouter, InjectModule

  Milestone: Speak a prompt, see it appear in Copilot Chat


PHASE 2: Onboarding & Enhancement (Weeks 3-4)
=========================================
Goal: BYOK setup + prompt enhancement working

  [6] KeyManager
      - VS Code SecretStorage wrapper
      - Key validation (test API call)
      - Key storage/retrieval per provider

  [7] OnboardingManager
      - First-time detection (no key in SecretStorage)
      - Welcome notification
      - Guided setup webview (link to Google AI Studio)
      - Key input + validation + storage
      - First-use tutorial

  [8] EnhanceModule + LLMRouter
      - Gemini provider (default)
      - Context collector (active file, selected code)
      - Enhancement system prompt
      - Preview notification UI
      - Error handling for API call failures (invalid key, network error, rate limit)
      - Offline graceful degradation (inject raw prompt on failure)

  [9] Unit tests
      - KeyManager, OnboardingManager, EnhanceModule

  Milestone: New user installs, gets guided to free Gemini key,
             speaks "enhance: make this faster", sees enhanced prompt


PHASE 3: Multi-Provider & Multi-Target (Weeks 5-6)
=========================================
Goal: Support multiple LLM providers and AI extensions

  [10] Additional LLM providers
       - Anthropic, OpenAI, Groq implementations
       - Provider selection in settings
       - Advanced Options in onboarding

  [11] Multi-target injection
       - Cline support
       - Continue support
       - Claude Code terminal support
       - Extension auto-detection
       - Target selection UI
       - Error handling for injection failures per target extension

  [12] Settings UI
       - WebView settings panel
       - Default provider selection
       - Default target selection
       - Wake word toggle
       - Key management (add/remove/change)

  [13] Integration tests
       - Multi-provider routing
       - Multi-target injection

  Milestone: Full BYOK flow working with any provider,
             inject into any AI extension


PHASE 4: Wake Word & Polish (Weeks 7-8)
=========================================
Goal: Always-on wake word, production-ready

  [14] Wake word engine
       - Bundle Vosk small model (~50MB, lazy-downloaded on first enable)
       - naudiodon audio capture in worker thread
       - Transcript-based keyword matching for "Hey Prother"
       - Microphone handoff (wake word <--> speech)
       - Auto-suspend when VS Code unfocused

  [15] Advanced resilience
       - Retry with exponential backoff
       - Circuit breaker pattern for provider failures
       - Advanced graceful degradation strategies
       (Basic error handling already done in Phases 1-3)

  [16] Compatibility test suite
       - Weekly CI for AI extension injection compatibility
       - Cross-platform naudiodon/Vosk tests

  [17] Marketplace prep
       - Extension icon and branding
       - README with GIFs
       - CHANGELOG
       - Marketplace listing

  Milestone: Extension published to VS Code Marketplace
```

### 9.4 Extension Manifest (package.json highlights)

```jsonc
{
  "name": "prother",
  "displayName": "Prother - Voice Prompts for AI Coding",
  "version": "0.1.0",
  "engines": { "vscode": "^1.93.0" },
  "privacy": "https://github.com/user/prother/blob/main/PRIVACY.md",
  "categories": ["AI", "Other"],
  "activationEvents": [
    "onCommand:prother.activate",
    "onCommand:prother.enhance",
    "onCommand:prother.setup",
    "onCommand:prother.settings",
    "onStartupFinished"   // Lightweight: onboarding check (~1ms) + wake word start if enabled
  ],
  "extensionPack": [
    "ms-vscode.vscode-speech"  // Auto-installs as recommendation, does NOT hard-block activation
  ],
  "contributes": {
    "commands": [
      {
        "command": "prother.activate",
        "title": "Prother: Start Listening"
      },
      {
        "command": "prother.enhance",
        "title": "Prother: Speak & Enhance Prompt"
      },
      {
        "command": "prother.settings",
        "title": "Prother: Open Settings"
      },
      {
        "command": "prother.setup",
        "title": "Prother: Set Up API Key"
      },
      {
        "command": "prother.recentPrompts",
        "title": "Prother: Show Recent Prompts"
      },
      {
        "command": "prother.reportIssue",
        "title": "Prother: Report Issue"
      }
    ],
    "keybindings": [
      {
        "command": "prother.activate",
        "key": "alt+v",
        "mac": "alt+v"
      }
    ],
    "configuration": {
      "title": "Prother",
      "properties": {
        "prother.wakeWord.enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable 'Hey Prother' wake word detection (downloads ~50MB Vosk model on first enable)"
        },
        "prother.enhancement.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable AI prompt enhancement"
        },
        "prother.llm.defaultProvider": {
          "type": "string",
          "enum": ["gemini", "anthropic", "openai", "groq"],
          "default": "gemini",
          "description": "Default LLM provider for enhancement"
        },
        "prother.llm.geminiModel": {
          "type": "string",
          "default": "gemini-1.5-flash",
          "description": "Gemini model to use for enhancement. Change this if the default model is deprecated."
        },
        "prother.inject.defaultTarget": {
          "type": "string",
          "enum": ["auto", "copilot", "cline", "continue", "claude-code"],
          "default": "auto",
          "description": "Default AI extension target for injection"
        },
        "prother.speech.silenceTimeout": {
          "type": "number",
          "default": 1500,
          "description": "Silence duration (ms) before ending speech capture"
        }
      }
    }
  }
}
```

**Activation strategy**: The extension activates on-command for most interactions (`Alt+V`, enhance, setup, settings). `onStartupFinished` runs a lightweight check (~1ms) to see if onboarding is needed (no API key in SecretStorage) and if wake word is enabled. The Vosk wake word worker thread is **only started** if `prother.wakeWord.enabled` is `true`.

### 9.5 Cost Analysis

| Component | Cost | Notes |
|---|---|---|
| **Backend** | $0 | No backend needed |
| **Database** | $0 | No database needed |
| **LLM API (Gemini)** | $0 for users | Google provides 1M tokens/day free. Users use their own key. |
| **LLM API (other)** | User pays | Anthropic, OpenAI, Groq -- user's own key, user's own cost |
| **Vosk** | $0 | Open-source (Apache 2.0). No API key, no licensing fees. Model bundled with extension. |
| **naudiodon** | $0 | Open-source. Native PortAudio bindings. Prebuilt binaries for 6 platforms. |
| **Domain + SSL** | ~$12/year | For documentation site only (optional) |
| **VS Code Marketplace** | $0 | Free to publish |
| **Your total** | **~$0/mo** | Zero infrastructure cost. Users bring their own keys. |

This is the key advantage of the BYOK-only model: **zero ongoing infrastructure cost**. No backend to maintain, no database to manage, no API costs to subsidize, no wake word licensing fees. The extension is fully self-contained.

### 9.6 Keybinding Note

The default hotkey is `Alt+V` ("V" for voice). This was chosen to avoid conflicts:
- `Ctrl+Shift+V` is bound to "Toggle Markdown Preview" in VS Code
- `Ctrl+Shift+V` is "Paste without Formatting" in many apps
- `Alt+V` is rarely bound and easy to press

Users can rebind via VS Code's keybinding system (free with the `keybindings` contribution point). Document in README.

---

This BYOK-only architecture gives you a clean, zero-infrastructure path from walking skeleton to production. The most important thing is to get Phase 1 working end-to-end in the first two weeks. Everything else layers on top of that foundation.

The two highest-risk technical items are **input injection reliability** (fundamentally limited by VS Code's sandboxing model -- the clipboard fallback is your safety net) and **microphone management for wake word** (cross-platform native audio bindings and OS-level mic permissions are the main friction points). Start Phase 4 early in parallel if possible to identify platform-specific issues.
