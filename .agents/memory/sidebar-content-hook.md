---
name: Inner component closing brace in TSX
description: Design subagents sometimes omit the closing }; for const arrow components defined inside a parent component.
---

## Rule
When a React component is defined as a `const` arrow function inside another component, it must be closed with `};` (not just `);`).

**Why:** The return statement's closing `);` closes the JSX expression, but not the arrow function body `{ }`. Missing `}` means subsequent code (including the parent's return) is parsed as part of the inner component — Babel/Vite will throw "Unexpected token" at the last `}` of the file.

## Pattern that breaks
```tsx
const Inner = () => {
  return (
    <div>...</div>
  );   // ← missing closing } for the arrow function

return (  // ← this is now INSIDE Inner, causing the parse error
```

## Pattern that works
```tsx
const Inner = () => {
  return (
    <div>...</div>
  );
};  // ← closes the arrow function body

return (  // ← now correctly in the outer component
```

## How to apply
After any design subagent edit to a file containing inner const-component definitions, verify each one is closed with `};` before the outer component's `return`.
