---
title: "Code Mockup Test"
description: "Testing the macOS-style code block rendering with various languages and edge cases."
pubDate: 2026-02-04
tags: ["meta"]
draft: true
---

Testing the gvns-code-mockup component across different languages and scenarios.

## TypeScript

```typescript
interface Post {
  title: string;
  description: string;
  pubDate: Date;
  tags: string[];
  draft?: boolean;
}

function getReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.ceil(words / 200);
}
```

## Terminal Commands

```bash
npm run dev
npm run build
git commit -m "feat: add code mockup component"
```

## CSS

```css
.gvns-code-mockup {
  background: var(--colour-bg-secondary);
  border: 1px solid var(--colour-border);
  border-radius: var(--code-mockup-radius);
}
```

## Shell Session

```sh
cd ~/projects/gwilym.ca
ls -la src/components/
```

## JSON

```json
{
  "name": "gvns-ca",
  "type": "module",
  "version": "0.0.1"
}
```

## Plain Text (No Language)

```
Just some plain text in a fenced code block.
No syntax highlighting here.
```

## Single Line

```javascript
console.log("hello world");
```

## Long Lines

```typescript
const reallyLongVariableName = someFunction(argumentOne, argumentTwo, argumentThree, argumentFour, argumentFive, argumentSix);
```
