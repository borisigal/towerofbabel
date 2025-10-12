# 10. Frontend Architecture

## Component Organization (Feature-Based)

```
/components/
  ├── ui/                      # shadcn/ui primitives
  ├── features/
  │   ├── interpretation/
  │   ├── dashboard/
  │   ├── settings/
  │   └── upgrade/
  └── layout/
```

## Routing Architecture (Next.js App Router)

```
/app/
  ├── (marketing)/             # Unauthenticated
  │   ├── page.tsx             # Landing
  │   ├── privacy/page.tsx
  │   └── terms/page.tsx
  ├── (auth)/
  │   ├── signin/page.tsx
  │   └── callback/route.ts
  ├── (dashboard)/             # Protected
  │   ├── layout.tsx
  │   ├── page.tsx
  │   └── settings/page.tsx
  └── api/                     # Backend
```

## State Management

**Zustand Store (Global):**
```typescript
// /lib/stores/usageStore.ts
export const useUsageStore = create<UsageState>((set) => ({
  messagesUsed: 0,
  messagesLimit: null,
  tier: 'trial',
  setUsage: (used, limit, tier) => set({ messagesUsed: used, messagesLimit: limit, tier }),
  decrementUsage: () => set((state) => ({ messagesUsed: state.messagesUsed + 1 })),
  incrementUsage: () => set((state) => ({ messagesUsed: Math.max(0, state.messagesUsed - 1) })),
}));
```

---
