# Prother: BYOK-Only with Frictionless Onboarding

## 🎯 Goal: Make Getting a Free Gemini Key Feel Easy

---

## 🎨 First-Time User Experience

### Step 1: Install Extension

```
User installs Prother from VS Code marketplace
        ↓
Extension activates
        ↓
Status bar shows: [🎤 Prother • Setup Required]
        ↓
Welcome notification appears:
```

```
┌────────────────────────────────────────────────────────┐
│ 🎤 Welcome to Prother!                                 │
│                                                        │
│ Speak your prompts instead of typing them.             │
│ Works with Copilot, Cline, Claude Code, and more!     │
│                                                        │
│ Quick Setup (2 minutes):                               │
│ Get a FREE API key from Google                         │
│ → 1 million tokens/day, no credit card needed         │
│                                                        │
│ [ 🚀 Start Setup ]  [ ⚙️ Advanced Options ]           │
└────────────────────────────────────────────────────────┘
```

---

### Step 2: Guided Setup (Main Flow)

**User clicks [ 🚀 Start Setup ]**

```
┌────────────────────────────────────────────────────────┐
│ 🆓 Get Your Free Gemini API Key (2 minutes)            │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Google Gemini 1.5 Flash is completely FREE:            │
│ ✅ 1,000,000 tokens per day                            │
│ ✅ ~30 million tokens per month                        │
│ ✅ No credit card required                             │
│ ✅ ~1,500 prompt enhancements per day                   │
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ Step 1: Get Your API Key                         ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ 1. Click the button below to open Google AI Studio    │
│ 2. Sign in with your Google account                   │
│ 3. Click "Get API Key"                                 │
│ 4. Copy your key                                       │
│ 5. Come back here and paste it                         │
│                                                        │
│ [ 🌐 Open Google AI Studio ]                           │
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ Step 2: Paste Your API Key                       ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ API Key: [________________________________] 📋 Paste  │
│                                                        │
│ [ ✅ Save & Test Connection ]                          │
│                                                        │
│ 🔒 Your key is stored securely in your OS keychain    │
│                                                        │
│ [ ❓ Need Help? ]  [ 🎥 Watch Video Tutorial ]        │
└────────────────────────────────────────────────────────┘
```

---

### Step 2a: Opening Google AI Studio

**User clicks [ 🌐 Open Google AI Studio ]**

```
Extension opens: https://aistudio.google.com/app/apikey

User sees Google AI Studio:
┌────────────────────────────────────────────────────────┐
│ Google AI Studio                                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Sign in with Google                                    │
│                                                        │
│ [Continue with Google]                                 │
│                                                        │
└────────────────────────────────────────────────────────┘
        ↓
User signs in
        ↓
┌────────────────────────────────────────────────────────┐
│ Google AI Studio - API Keys                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│ API keys                                               │
│                                                        │
│ No API keys created yet                                │
│                                                        │
│ [ Create API key ]                                     │
│                                                        │
└────────────────────────────────────────────────────────┘
        ↓
User clicks "Create API key"
        ↓
┌────────────────────────────────────────────────────────┐
│ Your API key                                           │
│                                                        │
│ AIzaSyDq1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6              │
│                                                        │
│ [ 📋 Copy ]                                            │
│                                                        │
│ ⚠️ Keep this key secret! Don't share it publicly.     │
└────────────────────────────────────────────────────────┘
        ↓
User clicks Copy
        ↓
Returns to VS Code
```

---

### Step 2b: Back in VS Code

```
User pastes key: AIzaSyDq1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6
        ↓
Clicks [ ✅ Save & Test Connection ]
        ↓
Extension tests the key:

┌────────────────────────────────────────────────────────┐
│ 🔄 Testing connection to Gemini...                     │
└────────────────────────────────────────────────────────┘

If successful:
┌────────────────────────────────────────────────────────┐
│ ✅ Success! Prother is ready to use                     │
│                                                        │
│ Try it now:                                            │
│ • Press Alt+V to start speaking                │
│ • Say "Hey Prother" for hands-free mode                │
│                                                        │
│ [ 🎤 Try It Now ]  [ 📚 View Tutorial ]                │
└────────────────────────────────────────────────────────┘

Status bar updates: [🎤 Prother • Ready]

If failed:
┌────────────────────────────────────────────────────────┐
│ ❌ Connection failed                                    │
│                                                        │
│ Please check:                                          │
│ • API key is copied correctly (no extra spaces)        │
│ • API key is enabled in Google AI Studio              │
│                                                        │
│ [ Try Again ]  [ Get Help ]                            │
└────────────────────────────────────────────────────────┘
```

---

### Step 3: First Use Tutorial

**User clicks [ 🎤 Try It Now ]**

```
Interactive tutorial starts:

┌────────────────────────────────────────────────────────┐
│ 🎤 Quick Tutorial (30 seconds)                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Let's try speaking your first prompt!                  │
│                                                        │
│ 1. Press Alt+V (or say "Hey Prother")          │
│ 2. Speak: "Create a hello world function"             │
│ 3. Your prompt appears in the AI chat!                 │
│                                                        │
│ [ Start Tutorial ]  [ Skip ]                           │
└────────────────────────────────────────────────────────┘

If user starts tutorial:
- Highlights Alt+V
- Waits for user to press it
- Shows live transcript as they speak
- Celebrates when it works!

┌────────────────────────────────────────────────────────┐
│ 🎉 Perfect! You're a Prother pro now!                  │
│                                                        │
│ Pro tips:                                              │
│ • Say "enhance" to make prompts better with AI        │
│ • Works with Copilot, Cline, Claude Code              │
│ • Settings: Right-click Prother in status bar         │
│                                                        │
│ [ Got It! ]                                            │
└────────────────────────────────────────────────────────┘
```

---

## 🆘 Help & Documentation

### Built-in Help Dialog

**User clicks [ ❓ Need Help? ]**

```
┌────────────────────────────────────────────────────────┐
│ 🆘 Getting Your Gemini API Key - Step by Step          │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 📍 Step 1: Open Google AI Studio                       │
│    Link: https://aistudio.google.com/app/apikey       │
│                                                        │
│    [ 🌐 Open Link ]                                     │
│                                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                        │
│ 📍 Step 2: Sign In                                     │
│    • Click "Sign in with Google"                       │
│    • Use any Google account (Gmail, Workspace, etc.)   │
│    • No credit card required ✅                        │
│                                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                        │
│ 📍 Step 3: Create API Key                              │
│    • Click "Create API key" button                     │
│    • Your key appears (starts with "AIza...")          │
│    • Click the copy button 📋                          │
│                                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                        │
│ 📍 Step 4: Paste in Prother                            │
│    • Return to VS Code                                 │
│    • Paste your key in the API Key field              │
│    • Click "Save & Test Connection"                    │
│                                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                        │
│ ❓ Common Issues:                                      │
│                                                        │
│ Q: "I don't see a Create button"                       │
│ A: Make sure you're signed in to Google AI Studio     │
│                                                        │
│ Q: "Connection test failed"                            │
│ A: Check for extra spaces when pasting. Try copying   │
│    the key again.                                      │
│                                                        │
│ Q: "Is this really free?"                              │
│ A: Yes! Google provides 1M tokens/day for free.       │
│    No credit card needed.                              │
│                                                        │
│ [ 🎥 Watch Video Tutorial ]  [ 💬 Get Support ]        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Advanced Options (Other Providers)

**User clicks [ ⚙️ Advanced Options ] in welcome screen**

```
┌────────────────────────────────────────────────────────┐
│ ⚙️ Choose Your LLM Provider                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Select a provider for prompt enhancement:              │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ ● Google Gemini 1.5 Flash (Recommended)        │   │
│ │   🆓 FREE - 1M tokens/day                       │   │
│ │   [ Select ]                                    │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ ○ Anthropic Claude (Haiku)                     │   │
│ │   💵 ~$0.001 per enhancement                    │   │
│ │   [ Select ]                                    │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ ○ OpenAI GPT-4o Mini                           │   │
│ │   💵 ~$0.001 per enhancement                    │   │
│ │   [ Select ]                                    │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ ○ Groq (Llama 3.1)                             │   │
│ │   💵 ~$0.0001 per enhancement (cheapest!)      │   │
│ │   [ Select ]                                    │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ [ Continue ]                                           │
└────────────────────────────────────────────────────────┘
```

---

## 📝 Settings Panel (After Setup)

**User right-clicks status bar → Settings**

```
┌────────────────────────────────────────────────────────┐
│ ⚙️ Prother Settings                                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ API Configuration                                 ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ Provider: [Google Gemini 1.5 Flash ▼]                 │
│                                                        │
│ API Key: ••••••••••••••••••••n5o6                      │
│ Status: ✅ Connected                                   │
│                                                        │
│ [ Change Key ]  [ Test Connection ]  [ Remove Key ]   │
│                                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ Voice Settings                                    ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ Activation:                                            │
│ ☑️ Hotkey (Alt+V)                               │
│ ☑️ Wake word ("Hey Prother")                           │
│                                                        │
│ Pause detection: [1.5 seconds ▼]                      │
│ Language: [English (US) ▼]                            │
│                                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ Enhancement Settings                              ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ ☑️ Show preview before injecting                       │
│ ☑️ Include current file context                        │
│ ☑️ Include selected code                               │
│                                                        │
│ Model: [gemini-1.5-flash ▼]                           │
│                                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ Injection                                         ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ Target AI extension:                                   │
│ ● Auto-detect (recommended)                            │
│ ○ Always use GitHub Copilot                            │
│ ○ Always use Cline                                     │
│ ○ Always use Claude Code                               │
│                                                        │
│ [ Save Settings ]                                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🎥 Video Tutorial Script

**What the tutorial should show (we can create this later):**

```
0:00 - "Get Prother running in 2 minutes"
0:10 - Show VS Code with Prother installed
0:15 - Click "Start Setup"
0:20 - Open Google AI Studio link
0:30 - Sign in with Google
0:45 - Click "Create API key"
0:55 - Copy the key
1:00 - Paste into Prother
1:10 - Click "Save & Test"
1:15 - Success! ✅
1:20 - Demo: Press Alt+V
1:25 - Speak: "Create a React component"
1:30 - Prompt appears in Copilot
1:35 - Say "enhance" to improve it
1:40 - Enhanced prompt appears
1:45 - "That's it! Start speaking your code!"
2:00 - End

Thumbnail: "FREE Voice Coding - 2 Min Setup"
```

---

## 💬 In-App Messaging

### Status Bar Click → Quick Actions

```
User clicks [🎤 Prother • Ready]
        ↓
Dropdown menu:
┌─────────────────────────────────┐
│ 🎤 Start Listening (Alt+V)│
│ ✨ Enhance Last Prompt          │
│ ⚙️ Settings                      │
│ ❓ Help & Tutorials              │
│ 📊 Usage Stats (optional)        │
│ 🐛 Report Issue                 │
└─────────────────────────────────┘
```

### Usage Stats (Optional, Shows API Usage)

```
┌────────────────────────────────────────────────────────┐
│ 📊 Your Prother Usage                                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│ This Month:                                            │
│ • Prompts spoken: 247                                  │
│ • Prompts enhanced: 89                                 │
│ • Time saved: ~2.1 hours 🚀                            │
│                                                        │
│ Gemini API Usage:                                      │
│ • Tokens used today: 45,230 / 1,000,000               │
│ • Estimated cost: $0.00 (FREE) ✅                      │
│                                                        │
│ Fun fact: You've spoken 3,847 words to Prother!        │
│ That's like writing 2 blog posts! 📝                   │
│                                                        │
│ [ OK ]                                                 │
└────────────────────────────────────────────────────────┘
```

---

## 🚨 Error Handling & Helpful Messages

### No API Key Set

```
User presses Alt+V without setting up
        ↓
┌────────────────────────────────────────────────────────┐
│ ⚠️ API Key Required                                     │
│                                                        │
│ Prother needs an API key to enhance prompts.           │
│                                                        │
│ Set up in 2 minutes with a FREE Gemini key!           │
│                                                        │
│ [ 🚀 Start Setup ]  [ Skip Setup ]                     │
└────────────────────────────────────────────────────────┘
```

### API Rate Limit Hit (Gemini Free Tier)

```
┌────────────────────────────────────────────────────────┐
│ ⚠️ Daily Limit Reached                                  │
│                                                        │
│ You've used your daily Gemini quota (1M tokens).       │
│ This resets at midnight Pacific Time.                  │
│                                                        │
│ You can still:                                         │
│ ✅ Use voice-to-text (without enhancement)             │
│ ✅ Try again tomorrow                                  │
│ ✅ Upgrade to paid Gemini tier ($7/mo for 4M/day)     │
│                                                        │
│ [ OK ]  [ Learn More ]                                 │
└────────────────────────────────────────────────────────┘
```

### Invalid API Key

```
┌────────────────────────────────────────────────────────┐
│ ❌ Invalid API Key                                      │
│                                                        │
│ The API key you entered doesn't work.                  │
│                                                        │
│ Common issues:                                         │
│ • Extra spaces when pasting                            │
│ • Key was deleted in Google AI Studio                 │
│ • Wrong provider selected                              │
│                                                        │
│ [ Try Again ]  [ Get New Key ]  [ Get Help ]          │
└────────────────────────────────────────────────────────┘
```

---

## 📄 README.md for Extension

```markdown
# 🎤 Prother - Voice-to-Text for AI Coding

Speak your coding prompts instead of typing them. Works with GitHub Copilot, Cline, Claude Code, and more!

## ✨ Features

- **Voice Input**: Press Alt+V or say "Hey Prother" to start speaking
- **AI Enhancement**: Make your prompts better with AI
- **Universal**: Works with any AI coding assistant
- **Free Forever**: Use free Gemini API (1M tokens/day)
- **Privacy-First**: No tracking, no backend, keys stored securely

## 🚀 Quick Start (2 minutes)

1. **Get a free Gemini API key**:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with Google (no credit card needed)
   - Click "Create API key"
   - Copy your key

2. **Set up Prother**:
   - Install this extension
   - Click "Start Setup" in the welcome message
   - Paste your API key
   - Done! ✅

3. **Start using**:
   - Press `Alt+V`
   - Speak your prompt
   - It appears in your AI chat!

## 🎥 Video Tutorial

[Watch the 2-minute setup guide →](LINK_TO_VIDEO)

## ❓ FAQ

**Q: Is this really free?**
A: Yes! Google provides 1M tokens/day free (no credit card). That's ~30M tokens per month.

**Q: What's my API key used for?**
A: Only for enhancing your prompts with AI. Nothing else.

**Q: Where is my key stored?**
A: Securely in your OS keychain (same place VS Code stores git credentials).

**Q: Can I use other AI providers?**
A: Yes! Also supports Anthropic Claude, OpenAI, and Groq.

**Q: Do you collect my data?**
A: No. Prother has no backend. Everything runs locally in VS Code.

## 🐛 Issues & Support

- [Report a bug](https://github.com/yourname/prother/issues)
- [Request a feature](https://github.com/yourname/prother/issues)
- [View documentation](https://github.com/yourname/prother/wiki)

## 📝 License

MIT © [Your Name]
```

---

## 🎯 Key Takeaways

### What Makes This Onboarding Smooth:

1. **Clear value prop up front**: "FREE - 1M tokens/day"
2. **2-minute promise**: Sets expectations
3. **Direct links**: One-click to Google AI Studio
4. **Visual progress**: Step 1 → Step 2 → Success!
5. **Test connection**: Immediate feedback
6. **Interactive tutorial**: Learn by doing
7. **Helpful errors**: Never leaves users stuck
8. **Quick reference**: Help always accessible

### Conversion Funnel:

```
100 installs
        ↓
90 click "Start Setup" (90% - clear CTA)
        ↓
80 open Google AI Studio (89% - easy link)
        ↓
70 create API key (88% - simple process)
        ↓
65 paste and test (93% - final step)
        ↓
60 complete tutorial (92% - hooked!)

Target: 60% setup completion rate
(vs typical 20-30% for BYOK extensions)
```

---

**This onboarding flow makes BYOK feel as easy as "Sign in with Google"!** 🚀

Ready to start building this?
