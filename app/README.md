# Prother - Voice Prompts for AI Coding

**Speak your coding prompts instead of typing them.** Press `Ctrl+Shift+V`, say what you want, press again — your prompt lands in Claude Code, Copilot, or any AI assistant. Optionally enhance it with AI before sending.

## Features

- **Voice-to-Text** — Press `Ctrl+Shift+V` to start, speak, press again to stop. Text appears in your AI assistant's input box.
- **AI Enhancement** — Click the Enhance button to improve your prompt with context-aware AI (knows your file, errors, git state, framework).
- **Multi-Provider** — Use Gemini (free), OpenAI, Anthropic, or Groq for enhancement. Switch providers with one click in the status bar.
- **Multi-Target** — Toggle between Claude Code and Copilot Chat right from the status bar.
- **Zero UI** — No panels, no browser windows. Everything happens via the status bar.
- **Private** — All voice processing runs locally (Moonshine ONNX). API keys stored in OS keychain. No backend, no tracking.

## Quick Start

1. **Install** this extension from the Marketplace
2. **Install Python dependency** (one-time):
   ```
   pip install useful-moonshine-onnx
   ```
   The speech model (~400MB) downloads automatically on first use — no manual setup needed.
3. **Set up enhancement** (optional): Click the provider name in the status bar (e.g. `Gemini`) → pick a provider → paste your API key
4. **Use it**:
   - `Ctrl+Shift+V` → speak your prompt → `Ctrl+Shift+V` → text injected
   - Click `Enhance` in the status bar to improve it with AI

## Status Bar

After installation, you'll see these items in the bottom-right status bar:

| Item | What it does |
|------|-------------|
| `Enhance` | Click to enhance the last spoken prompt with AI |
| `Gemini` | Shows current LLM provider — click to switch |
| `→ Claude Code` | Shows injection target — click to toggle |
| `Prother` | Shows state (Idle/Listening/Processing) — click to start recording |

## Enhancement Providers

| Provider | Model | Cost | Setup |
|----------|-------|------|-------|
| **Gemini** (default) | Gemini 2.5 Flash | Free (~250 req/day) | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **Groq** | Llama 3.1 70B | Free tier available | [Groq Console](https://console.groq.com/keys) |
| **OpenAI** | GPT-4o Mini | Paid | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude Haiku | Paid | [Anthropic Console](https://console.anthropic.com/settings/keys) |

Click the provider name in the status bar to switch. If you don't have a key for the selected provider, it guides you through setup.

## Injection Targets

| Target | How it injects |
|--------|---------------|
| **Claude Code** | Focuses input, pastes via clipboard |
| **GitHub Copilot Chat** | Opens chat with prompt in input box (doesn't submit) |

Click `→ Claude Code` / `→ Copilot` in the status bar to toggle.

## Requirements

- **VS Code** 1.93 or newer
- **Python 3.10+** with `useful-moonshine-onnx` installed
- **Microphone** connected (Windows only for now — macOS/Linux coming soon)
- **Internet** only needed for enhancement (voice-to-text is fully offline)

## Privacy

- Voice transcription runs **100% locally** using Moonshine ONNX (no audio leaves your machine)
- API keys stored in **OS keychain** via VS Code SecretStorage
- Enhancement prompts are sent to your chosen LLM provider (Gemini/OpenAI/etc.) — no other data is collected
- No backend, no analytics, no tracking

See [PRIVACY.md](PRIVACY.md) for full details.

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Prother: Start Listening | `Ctrl+Shift+V` | Toggle voice recording |
| Prother: Enhance | — | Enhance last prompt with AI |
| Prother: Set Up API Key | — | Configure LLM provider key |
| Prother: Switch LLM Provider | — | Change enhancement provider |
| Prother: Switch Target | — | Toggle Claude Code / Copilot |

## Development

```bash
cd app
npm install
npm run build
npm test        # 94 unit tests
# Press F5 to launch Extension Development Host
```

## License

MIT
