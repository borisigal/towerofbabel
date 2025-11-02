# Fix Guide: Story 3.4 TypeScript Errors in Payment Tests

**File:** `tests/integration/components/UpgradeModal-payment.test.tsx`
**Errors:** 6 TypeScript compilation errors
**Estimated Time:** 5-10 minutes
**Created:** 2025-11-02
**QA Reviewer:** Quinn

---

## Quick Summary

Fix 6 TypeScript errors in payment integration tests:
- 2x wrong trigger value: `"limit_reached"` → `"limit_exceeded"`
- 2x invalid prop: remove `messagesRemaining={...}`
- 2x window.location mock: use `Object.defineProperty()`

---

## Pre-Fix Verification

Run this to confirm you see the errors:

```bash
npm run build
```

**Expected Output:**
```
Error: Exit code 2
  tests/integration/components/UpgradeModal-payment.test.tsx(61,7): error TS2322
  tests/integration/components/UpgradeModal-payment.test.tsx(67,11): error TS2322
  tests/integration/components/UpgradeModal-payment.test.tsx(100,7): error TS2322
  tests/integration/components/UpgradeModal-payment.test.tsx(108,11): error TS2322
  tests/integration/components/UpgradeModal-payment.test.tsx(139,11): error TS2322
  tests/integration/components/UpgradeModal-payment.test.tsx(188,11): error TS2322
```

---

## Fix #1: Correct Invalid Trigger Value

**Lines to change:** 67, 139

**Find this:**
```typescript
trigger="limit_reached"
```

**Replace with:**
```typescript
trigger="limit_exceeded"
```

**Why:** Valid trigger types are defined in `lib/stores/upgradeModalStore.ts`:
- `"limit_exceeded"` ✅
- `"proactive"` ✅
- `"notification_banner"` ✅
- `"limit_reached"` ❌ (typo)

---

## Fix #2: Remove Invalid Prop

**Lines to change:** 108, 188

**Find this:**
```typescript
<UpgradeModal
  open={true}
  onOpenChange={vi.fn()}
  trigger="proactive"
  currentTier="trial"
  messagesRemaining={5}  // ❌ Remove this line
/>
```

**Replace with:**
```typescript
<UpgradeModal
  open={true}
  onOpenChange={vi.fn()}
  trigger="proactive"
  currentTier="trial"
  // messagesRemaining removed - not a valid prop
/>
```

**Why:** `UpgradeModalProps` interface defines:
- `messagesUsed?: number` ✅
- `messagesLimit?: number` ✅
- `messagesRemaining` ❌ (doesn't exist)

Since these are optional props and not needed for these tests, just remove them.

---

## Fix #3: Fix window.location Mock

**Lines to change:** 60-61, 99-100

**Find this:**
```typescript
// Mock window.location.href setter
delete (window as any).location;
window.location = { href: '' } as Location;
```

**Replace with:**
```typescript
// Mock window.location.href setter
Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '' }
});
```

**Why:** TypeScript strict mode doesn't allow direct assignment to read-only browser APIs. `Object.defineProperty()` is the proper way to mock them.

---

## Complete Line-by-Line Changes

### Change 1: Line 67
```typescript
// BEFORE:
      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_reached"  // ❌ Change this
          currentTier="trial"
          messagesRemaining={0}     // ❌ Remove this
        />
      );

// AFTER:
      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_exceeded"  // ✅ Fixed
          currentTier="trial"
        />
      );
```

### Change 2: Lines 60-61
```typescript
// BEFORE:
      delete (window as any).location;
      window.location = { href: '' } as Location;

// AFTER:
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: '' }
      });
```

### Change 3: Lines 99-100
```typescript
// BEFORE:
      delete (window as any).location;
      window.location = { href: '' } as Location;

// AFTER:
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: '' }
      });
```

### Change 4: Line 108
```typescript
// BEFORE:
      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
          messagesRemaining={5}  // ❌ Remove this
        />
      );

// AFTER:
      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
        />
      );
```

### Change 5: Line 139
```typescript
// BEFORE:
      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_reached"  // ❌ Change this
          currentTier="trial"
          messagesRemaining={0}     // ❌ Remove this
        />
      );

// AFTER:
      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_exceeded"  // ✅ Fixed
          currentTier="trial"
        />
      );
```

### Change 6: Line 188
```typescript
// BEFORE:
      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
          messagesRemaining={5}  // ❌ Remove this
        />
      );

// AFTER:
      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
        />
      );
```

---

## Post-Fix Validation

### Step 1: Verify TypeScript Compilation
```bash
npm run build
```

**Expected:** `✓ Compiled successfully`

### Step 2: Run Specific Test File
```bash
npm test UpgradeModal-payment.test.tsx
```

**Expected:** All tests pass

### Step 3: Run Full Test Suite
```bash
npm test
```

**Expected:** All tests pass (no regressions)

### Step 4: Verify Linting
```bash
npm run lint
```

**Expected:** No new linting errors

---

## Troubleshooting

**Q: Build still fails after changes**
A: Make sure you changed `"limit_reached"` to `"limit_exceeded"` (with 'd' at the end)

**Q: Tests fail after removing messagesRemaining**
A: Run `npm test -- --clearCache` then `npm test` again

**Q: Still seeing type errors on window.location**
A: Make sure you replaced both occurrences (lines 60-61 AND 99-100)

---

## Commit Message

After all fixes are complete:

```bash
git add tests/integration/components/UpgradeModal-payment.test.tsx
git commit -m "fix(tests): correct TypeScript errors in UpgradeModal payment tests

- Fix trigger value: limit_reached -> limit_exceeded
- Remove invalid messagesRemaining prop
- Use Object.defineProperty for window.location mock

Fixes 6 TypeScript compilation errors discovered during Story 5.1 work.
"
```

---

## Reference Files

- Valid trigger types: `lib/stores/upgradeModalStore.ts:18-21`
- Component props: `components/features/upgrade/UpgradeModal.tsx:35-48`
- TypeScript errors: Run `npm run build` to see full error output

---

## Questions?

If you encounter issues with these fixes, contact the QA team or check:
1. Story 3.4 Dev Agent Record
2. `docs/qa/gates/3.4-lemon-squeezy-payment-integration-UPDATED.yml`

**Last Updated:** 2025-11-02
**Created By:** Quinn (QA Agent)
