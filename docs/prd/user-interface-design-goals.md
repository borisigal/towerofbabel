# User Interface Design Goals

## Overall UX Vision

TowerOfBabel delivers a **cross-cultural communication interpretation tool** that reveals what people are **actually saying** beneath confusing or ambiguous language. The interface makes users feel like they have a culturally-aware expert who can decode any message and explain it simply—in direct, polite language (like explaining to a 14-year-old).

**Design Philosophy:**
- **Clarity-first:** Strip away confusion, reveal the bottom line in plain language
- **Culturally intelligent:** Culture selection adds critical context for interpretation nuance
- **Empowering:** Users gain confidence understanding complex communication across cultures
- **Speed-first:** Minimize clicks and cognitive load; paste → select cultures → interpret in 3 steps
- **Transparency:** Privacy badge and usage counters always visible to build trust
- **Learning-oriented:** Over time, users internalize patterns and become better cross-cultural communicators

## Key Interaction Paradigms

**Primary Workflow (Inbound Interpretation - "What are they REALLY saying?"):**
1. User pastes confusing/ambiguous message into large, welcoming text area
2. Real-time character counter provides immediate feedback (327 / 2,000 characters)
3. Culture dropdowns provide context:
   - **Same culture → same culture:** Shows single emotion scores (no cultural delta needed)
   - **Different cultures:** Shows dual emotion scores with cultural calibration
4. Single "Interpret" button triggers analysis
5. **Results display:**
   - **"The Bottom Line" section:** Direct, polite explanation (14-year-old friendly language)
   - **Top 3 emotions detected** with intensity scores:
     - Same culture: Single score format "Enthusiasm: 7/10"
     - Different cultures: Dual score format "Enthusiasm: In their culture 3/10 → In yours 7/10"
   - **"Cultural Context" insights:** Explain communication style differences, subtext, implications
   - Thumbs up/down feedback buttons

**Example Output Format (Different Cultures - German → American):**

```
🎯 The Bottom Line:
They're saying no to your proposal, but trying to be polite about it.
They don't think it will work and want you to come back with something different.

🔍 Cultural Context:
In German business culture, this message is actually quite soft and indirect.
A direct German "no" would be much blunter. They're being diplomatic here.

What they might really mean:
- "Let's revisit this" = "Not happening right now, bring me something better"
- "Interesting approach" = "I see what you're trying but I'm not convinced"
- "We'll keep it in mind" = "Probably not, but I don't want to close the door completely"

😊 Top 3 Emotions Detected:
1. Politeness: In their culture 7/10 → In yours 4/10 (They're being extra polite for German standards, but may feel blunt to you)
2. Skepticism: In their culture 6/10 → In yours 6/10 (Same level of doubt in both cultures)
3. Professionalism: In their culture 8/10 → In yours 8/10 (Highly professional tone in both contexts)
```

**Example Output Format (Same Culture - American → American):**

```
🎯 The Bottom Line:
They're saying no to your proposal, but trying to be polite about it.
They don't think it will work and want you to come back with something different.

🔍 What They Might Really Mean:
American workplace communication often uses soft language to deliver hard messages.
This is a polite rejection disguised as "keeping options open."

- "Let's circle back" = "Not happening right now, maybe never"
- "Interesting idea" = "I'm not convinced"
- "We'll keep it in mind" = "Probably not, but I don't want to hurt your feelings"

😊 Top 3 Emotions Detected:
1. Politeness: 7/10
2. Hesitation: 6/10
3. Diplomacy: 8/10
```

**Secondary Workflow (Outbound Optimization):**
1. Toggle to "Outbound" mode (or tab switch)
2. Paste draft message they plan to send
3. Select sender culture (yours) and receiver's culture
4. Side-by-side comparison: Original (left) | Optimized (right) with highlighted differences
5. **Optimized version goals:**
   - Clearer, more direct language
   - Culturally appropriate for receiver
   - Less likely to be misunderstood
6. Copy-paste optimized version or manually incorporate suggestions

**Supporting Interactions:**
- Usage indicator always visible in header/nav ("7/10 messages used")
- One-click access to upgrade modal when approaching limits
- Thumbs up/down appears immediately after interpretation (non-intrusive, easy to ignore)
- Privacy badge in footer (desktop) or settings link (mobile)
- **Culture selector allows same-culture selections** (no validation errors, system adapts display format)

## Core Screens and Views

1. **Landing Page** - Cross-cultural communication value prop, emotion gauge preview, privacy badge, sign-up CTA
2. **Authentication Screen** - Magic link email input or Google OAuth button
3. **Interpretation Dashboard (Main App)** - Text input, culture selectors, interpret button, results display
4. **Results View** - "The Bottom Line" section, "Cultural Context" insights, top 3 emotion gauges (single or dual scores based on culture selection), feedback buttons
5. **Outbound Comparison View** - Side-by-side original vs. optimized message display
6. **Account Settings** - Saved culture preferences, billing portal link, data deletion request
7. **Upgrade/Paywall Modal** - Triggered when limits hit, shows pricing tiers with clear CTAs
8. **Privacy & Terms Pages** - Provider disclosure, data policy, terms of service

## Accessibility

**WCAG 2.1 Level AA** compliance for core workflows

**Key Requirements:**
- Emotion gauge intensity indicators use multiple modalities: numerical labels (7/10), text labels (emotion name), and visual patterns (not color alone)
- Keyboard navigation for all interactive elements (text area, dropdowns, buttons)
- Screen reader compatibility with semantic HTML and ARIA labels
- Sufficient color contrast ratios (4.5:1 for text, 3:1 for UI components)
- Focus indicators for keyboard users
- Resizable text without breaking layout (up to 200% zoom)

## Branding

**Visual Style:**
- Clean, approachable, trustworthy (professional SaaS with warmth)
- Color palette TBD but should avoid heavy reliance on color for meaning (accessibility)
- Typography: Sans-serif, highly legible (e.g., Inter, system fonts)
- Emotion gauges: Modern, data-viz inspired but friendly (not intimidating charts)
- Iconography: Universal symbols (🎯 for "bottom line", 🔍 for "cultural context", 😊 for emotions)

**Tone:**
- Supportive and empowering ("Here's what they really mean" not "You misunderstood")
- Clear and direct (like explaining to a 14-year-old—no jargon, no condescension)
- Warm and patient (like a wise friend, not a critical teacher)
- Culturally aware and inclusive

**Voice Examples:**
- ✅ "They're saying no, but trying to be nice about it"
- ❌ "The sender's communication exhibits indirect rejection patterns"
- ✅ "This means they're excited but not 100% sure yet"
- ❌ "Ambivalent positive sentiment detected"

## Target Device and Platforms

**Web Responsive** (desktop, tablet, mobile)

**Primary Devices:**
- Desktop/laptop (primary for work emails, longer messages)
- Mobile phone (quick checks, text interpretation on-the-go)
- Tablet (occasional use)

**Platform Distribution Assumption:**
- 60% desktop (work context)
- 35% mobile (on-the-go, instant checks)
- 5% tablet

**Technical Implementation:**
- Responsive breakpoints: Mobile (<640px), Tablet (640-1024px), Desktop (>1024px)
- Touch-friendly targets on mobile (44x44px minimum)
- Progressive Web App (PWA) for app-like mobile experience without native build

---
