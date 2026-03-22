# Changelog

## [1.0.0] - 2026-03-22

### Added
- **Voice-to-Text**: Press `Ctrl+Shift+V` to record, press again to transcribe and inject
- **Moonshine ONNX**: Local speech-to-text (Moonshine Tiny, ~190MB, lazy downloaded)
- **Pre-warmed recording**: PowerShell process starts on activation for instant mic capture
- **AI Enhancement**: Click Enhance to improve prompts with context-aware AI
- **Intent Classification**: 6 intents (debug, explore, refactor, generate, review, casual) with tailored system prompts
- **Rich Context**: Diagnostics, cursor context, git summary, project framework detection
- **Multi-Provider LLM**: Gemini 2.5 Flash (free), OpenAI GPT-4o Mini, Anthropic Claude Haiku, Groq Llama 3.1
- **Provider Selector**: Status bar item to switch LLM providers with one click
- **Target Selector**: Toggle between Claude Code and GitHub Copilot Chat
- **BYOK Onboarding**: Guided API key setup with validation for all 4 providers
- **Rate Limiting**: 4-second gap between LLM calls per provider
- **Usage Tracking**: Local stats in globalState (prompts spoken, enhanced, words)
- **Key Redaction Logger**: API keys automatically redacted from output logs
- **94 Unit Tests**: intent-classifier, prompt-templates, gemini-provider, rate-limiter, key-validator, errors, transcript-builder, extension-detector
- **Privacy-first**: Voice processing runs locally, keys in OS keychain, no backend
