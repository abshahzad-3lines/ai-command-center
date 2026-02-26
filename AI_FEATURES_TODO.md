# AI Features - Implementation Status

This file tracks AI features that need to be connected/implemented. Use this to quickly find placeholders without searching the codebase.

---

## 🔴 Not Implemented (Placeholders)

### 1. Email AI Priority Ranking
- **Location**: `lib/services/email.service.ts:30-32`
- **Current State**: Random priority assignment
- **To Implement**:
  - Connect to OpenAI/Claude API for email analysis
  - Analyze email content, sender, subject for priority scoring
  - Consider: urgency keywords, sender importance, deadlines mentioned
- **Code Marker**:
  ```typescript
  // Random priorities for now (will be AI-powered later)
  const priorities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
  const getRandomPriority = () => priorities[Math.floor(Math.random() * priorities.length)];
  ```

### 2. Email AI Summaries
- **Location**: `lib/services/email.service.ts:34-47`
- **Current State**: Shows raw email preview text (first 150 chars)
- **To Implement**:
  - Connect to AI for intelligent summarization
  - Generate concise 1-2 sentence summaries
  - Extract key action items
- **Related Adapter**: `lib/adapters/ai/openai.adapter.ts` (exists but disabled due to quota)

### 3. Email Suggested Actions
- **Location**: `lib/services/email.service.ts:41-45`
- **Current State**: Always returns "Review" action
- **To Implement**:
  - AI analyzes email to suggest: reply, archive, forward, schedule, flag
  - Generate draft reply content
  - Detect if action is needed

### 4. Chat AI Responses
- **Location**: `components/modules/chat/ChatWidget.tsx:46-56`
- **Location**: `app/chat/page.tsx:43-53`
- **Current State**: Returns static "Hello! I'm your AI assistant..." message
- **To Implement**:
  - Connect to OpenAI/Claude API
  - Maintain conversation context
  - Access email data for email-related queries
  - Access tasks/calendar for productivity queries
- **Code Marker**:
  ```typescript
  // Mock AI response with delay
  setTimeout(() => {
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: "Hello! I'm your AI assistant...",
  ```

### 5. AI Email Reply Generation
- **Location**: `lib/adapters/ai/openai.adapter.ts:84-107`
- **Current State**: Method exists but not called (AI disabled)
- **To Implement**:
  - Enable when AI quota available
  - Generate contextual replies based on email content
  - Support custom instructions

---

## 🟡 Partially Implemented

### 1. Email Analysis Adapter
- **Location**: `lib/adapters/ai/openai.adapter.ts`
- **Current State**: Full implementation exists but disabled
- **Issue**: OpenAI API quota exceeded
- **To Enable**:
  1. Add credits to OpenAI account OR
  2. Replace API key in `.env.local`
  3. Re-enable in `lib/services/email.service.ts` (remove comment and call `aiAdapter.analyzeEmails`)

### 2. Theme Persistence
- **Location**: `app/settings/page.tsx`
- **Current State**: Theme switching works via next-themes
- **Enhancement**: Consider persisting to user profile/database

---

## 🟢 Implemented (Working)

- ✅ Microsoft OAuth (MSAL) authentication
- ✅ Email fetching from Outlook via Microsoft Graph
- ✅ Email deletion
- ✅ Dark/Light/System theme toggle
- ✅ Chat UI with message history (shared state via Zustand)
- ✅ Email sorting (Time/Priority)
- ✅ Tasks management (local state)
- ✅ Settings pages (Profile, Security, Notifications)

---

## Environment Variables Needed for AI

```env
# OpenAI (current - needs quota)
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini

# Alternative: Local AI (future)
AI_PROVIDER=local
LOCAL_AI_URL=http://localhost:11434/v1
LOCAL_AI_MODEL=llama2

# Alternative: Claude (future)
ANTHROPIC_API_KEY=sk-ant-xxx
```

---

## Quick Search Patterns

To find AI placeholders in the codebase:
```bash
# Find mock/placeholder comments
grep -r "Mock AI" --include="*.tsx" --include="*.ts"
grep -r "placeholder" --include="*.tsx" --include="*.ts"
grep -r "coming soon" --include="*.tsx" --include="*.ts" -i
grep -r "Random priorities" --include="*.ts"

# Find disabled AI code
grep -r "aiAdapter" --include="*.ts"
grep -r "analyzeEmail" --include="*.ts"
```

---

## Implementation Priority

1. **High**: Chat AI responses (most user-facing)
2. **High**: Email AI summaries (core value prop)
3. **Medium**: Email priority ranking
4. **Medium**: Email suggested actions
5. **Low**: AI email reply generation

---

*Last Updated: February 2026*
