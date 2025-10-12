# Requirements

## Functional Requirements

1. **FR1:** The system shall provide a text input area for pasting communication messages with a real-time character counter displaying "X / 2,000 characters"
2. **FR2:** The system shall allow users to type/paste beyond 2,000 characters but display warning message and disable submit button when limit exceeded, requiring user to shorten message before submission
3. **FR3:** The system shall support exactly 15 cultures for MVP: American, British, German, French, Japanese, Chinese (Mandarin), Indian, Spanish, Italian, Dutch, Korean, Brazilian Portuguese, Mexican, Australian, Canadian
4. **FR4:** The system shall provide inbound interpretation functionality that explains what the message is actually saying—the bottom line, the real meaning beneath the words—in direct yet polite language (as if explaining to a 14-year-old), using sender/receiver cultures to add contextual nuance
5. **FR5:** The system shall provide outbound optimization functionality that analyzes draft messages and shows how they will be perceived in the receiver's culture with suggested edits
6. **FR6:** The system shall detect and display the top 3 emotions from the analyzed text with dual cultural intensity scores ("In sender's culture: X/10 → In your culture: Y/10") using WCAG 2.1 Level AA compliant visual indicators (combining text labels, numerical values, and visual patterns—not color alone)
7. **FR7:** The system shall provide thumbs up/down feedback buttons for both inbound and outbound interpretations to track interpretation quality
8. **FR8:** The system shall support magic link email authentication and Google OAuth for user sign-in
9. **FR9:** The system shall track usage with a message counter showing "X/Y messages used" for trial and Pro tier users
10. **FR10:** The system shall display approaching-limit notifications when users are near their usage limit
11. **FR11:** The system shall block further interpretations when usage limits are reached and present upgrade options including specific Pro tier benefits: "Subscribe to Pro ($10/month for [X] messages)" and "Pay $0.50 for single interpretation"
12. **FR12:** The system shall support three pricing tiers: Free Trial (14 days, 10 messages), Pay-As-You-Go ($0.50/message), Pro ($10/month with TBD message limit)
13. **FR13:** The system shall integrate with Stripe for subscription billing and metered pay-per-use billing
14. **FR14:** The system shall provide a responsive web interface that works on mobile, tablet, and desktop devices
15. **FR15:** The system shall provide Progressive Web App (PWA) installation capabilities (add to home screen, app-like experience) but requires internet connectivity for all interpretation functionality
16. **FR16:** The system shall display a privacy badge showing "Processed by [Provider] • No message storage by TowerOfBabel" and link to provider privacy policy
17. **FR17:** The system shall store only interpretation metadata (user_id, timestamp, culture_pair, character_count, feedback, interpretation_type, tier) and never store message content
18. **FR19:** The system shall display graceful error messages when LLM interpretation fails and offer retry option without consuming user's message quota
19. **FR20:** The system shall provide a user account settings page where users can request full data deletion (GDPR compliance)
20. **FR21:** The system shall display side-by-side comparison view for outbound optimization showing original message and AI-suggested optimized version
21. **FR22:** The system shall handle trial expiration by both time (14 days) AND message limit (10 messages)—whichever comes first blocks further use
22. **FR23:** The system shall allow users to cancel subscriptions and view billing history through Stripe Customer Portal integration
23. **FR24:** The system shall display the privacy badge "Processed by [Provider] • No message storage" prominently on both the landing page and in-app interpretation interface

## Non-Functional Requirements

1. **NFR1:** Interpretation response time shall be less than 10 seconds (target: 3-5 seconds)
2. **NFR2:** Page load time (First Contentful Paint) shall be less than 2 seconds
3. **NFR3:** The system shall maintain 99.5%+ uptime (accounting for LLM provider outages)
4. **NFR4:** The system shall pass Google Mobile-Friendly Test for mobile responsiveness
5. **NFR5:** The system shall support modern browsers (Chrome, Firefox, Safari, Edge) last 2 versions
6. **NFR6:** LLM costs per user shall not exceed $2/month average to maintain 80%+ gross margin at $10/month pricing
7. **NFR7:** The system shall enforce rate limiting to prevent abuse (specific limits TBD based on security analysis)
8. **NFR8:** The system shall enforce HTTPS for all communications
9. **NFR9:** The system shall comply with GDPR requirements including cookie consent, privacy policy, and data deletion on request
10. **NFR10:** The system shall maintain PCI compliance through Stripe (no direct handling of payment card data)
11. **NFR11:** The system shall meet WCAG 2.1 Level AA accessibility standards for core interpretation workflow (text input, culture selection, interpretation display, emotion gauges)
12. **NFR12:** The system shall gracefully degrade when LLM provider experiences outages by displaying status message and queuing requests for retry (max 5-minute queue)

---
