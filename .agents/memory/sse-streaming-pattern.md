---
name: SSE streaming pattern
description: How to consume SSE endpoints in the React frontend (Orval can't generate these hooks).
---

## Pattern
Orval generates React Query hooks from OpenAPI specs, but cannot handle SSE (text/event-stream) responses. For SSE endpoints, use raw fetch with a ReadableStream reader:

```typescript
const res = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
  signal: abortController.signal,
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  for (const line of chunk.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = JSON.parse(line.slice(6));
    if (payload.done) break;
    if (payload.content) accumulated += payload.content;
  }
}
```

**Why:** SSE responses are streaming; Orval/React Query expect a single response Promise.

**How to apply:** Any endpoint that sets `Content-Type: text/event-stream` must use this pattern in the client. Never add it to the generated hooks — add the raw fetch directly to the component.
