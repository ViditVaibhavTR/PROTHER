# Prother Privacy Policy

## What Prother Does
Prother is a VS Code extension that converts voice to text and injects prompts into AI coding assistants. It uses a BYOK (Bring Your Own Key) model — you provide your own LLM API key.

## Data Collection
- **No backend server.** Prother has no backend, no database, no server infrastructure.
- **No prompt content is collected.** Your voice transcripts and enhanced prompts never leave your machine except when sent directly to the LLM provider you configured (using your own API key).
- **No API keys are collected.** Your keys are stored in VS Code's SecretStorage (your OS keychain) and are never transmitted to any Prother-owned service.

## Telemetry
Prother uses the VS Code Telemetry API for anonymous usage statistics:
- Number of prompts spoken (count only, no content)
- Number of prompts enhanced (count only)
- Injection method used (command/clipboard/terminal)
- Error types encountered

This telemetry respects your VS Code telemetry settings. If you disable telemetry in VS Code, Prother sends nothing.

## Third-Party Services
When you use prompt enhancement, Prother sends your prompt directly to the LLM provider you configured:
- Google Gemini (default)
- Anthropic Claude
- OpenAI
- Groq

These calls go directly from your VS Code to the provider API using your own key. Prother does not proxy, store, or inspect these calls.

## Contact
For privacy questions, open an issue: https://github.com/ViditVaibhavTR/PROTHER/issues
