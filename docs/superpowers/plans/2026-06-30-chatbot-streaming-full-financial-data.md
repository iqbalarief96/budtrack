# Plan: BudTrack chatbot streaming full financial data, no timeout

## Goal

Make `/api/ai/chatbot` handle full financial context without 500 timeout by streaming provider output to browser. Keep financial data payload intact. Avoid summarizing away token/input context.

## Current state

Relevant files:

- `app/api/ai/chatbot/route.ts`
  - Auth/session.
  - Loads user settings.
  - Builds `context` string from `getFinancialData()`.
  - Calls `generateChatbotResponse()`.
  - Returns JSON `{ response }` only after full provider response.
- `lib/ai.ts`
  - `postChatCompletion()` uses OpenAI-compatible `/chat/completions`.
  - Sends `stream: false`.
  - Aborts after `timeoutMs`.
  - `generateChatbotResponse()` now sets `timeoutMs: 60000`, `maxTokens: 900`.
- `app/components/FinanceChatbot.tsx`
  - Sends `stream: false` in request body.
  - Waits for `response.json()`.
  - Fake-streams final text with `animateAssistantMessage()`.

Root issue:

```text
full financial context + glm-5.2 + non-streaming server wait => server idle until full response => timeout/500
```

## Non-goals

- Do not reduce financial input context.
- Do not add new dependency.
- Do not rewrite chatbot UI layout.
- Do not add job queue yet.
- Do not migrate AI provider settings.

## Design

Use native Web Streams.

```text
Browser fetch POST /api/ai/chatbot { stream: true }
Next route validates + builds same full context
Next route calls provider with stream: true
Provider SSE chunks parsed server-side
Server returns text/plain streamed chunks to browser
Browser reads response.body.getReader()
Browser updates one assistant message live
```

Keep old JSON path for fallback/regression:

```text
stream: false or missing => existing JSON response
stream: true => streaming response
```

## Task 1 — Add streaming helper in `lib/ai.ts`

Edit: `lib/ai.ts`

Add stream-capable functions near existing `postChatCompletion()`.

Code sketch:

```ts
function extractSseDelta(line: string): string {
  if (!line.startsWith('data:')) return ''
  const data = line.slice(5).trim()
  if (!data || data === '[DONE]') return ''

  const payload = safeJson(data)
  const choice = payload?.choices?.[0]
  const content = choice?.delta?.content ?? choice?.message?.content ?? choice?.text ?? ''
  if (Array.isArray(content)) return content.map((part) => part?.text ?? '').join('')
  return typeof content === 'string' ? content : ''
}

async function* streamChatCompletion(params: AIRequestParams, messages: ChatMessage[]): AsyncGenerator<string> {
  const cfg = providerConfig(params)
  const urls = chatCompletionUrls(cfg.baseUrls)
  const failures: string[] = []

  for (const url of urls) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs ?? cfg.timeoutMs)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json',
          'Authorization': `Bearer ${params.apiKey}`,
          ...cfg.headers,
        },
        body: JSON.stringify({
          model: compactModel(params.provider.toLowerCase(), params.model),
          messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        failures.push(`${url} -> ${response.status}: ${errorMessageFromBody(text)}`)
        continue
      }

      if (!response.body) throw new Error('Provider returned empty stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const delta = stripReasoning(extractSseDelta(line))
          if (delta) yield delta
        }
      }

      const tail = decoder.decode()
      if (tail) {
        buffer += tail
        for (const line of buffer.split(/\r?\n/)) {
          const delta = stripReasoning(extractSseDelta(line))
          if (delta) yield delta
        }
      }

      return
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${cfg.name} stream timed out after ${Math.round((params.timeoutMs ?? cfg.timeoutMs) / 1000)}s`)
      }
      failures.push(`${url} -> ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new AIProviderError(`${cfg.name} stream failed: ${failures.join('; ')}`)
}
```

Then export chatbot wrapper:

```ts
function buildChatbotPrompt(params: ChatbotParams): string {
  const { prompt, context, history } = params
  let fullPrompt = "You are a helpful financial assistant for BudTrack, a personal finance app. "
  fullPrompt += "Provide friendly, informative and concise responses about financial topics. "
  fullPrompt += "Focus on practical advice related to budgeting, saving, investing, and general personal finance. "
  fullPrompt += "Don't recommend specific financial products or services by name unless explicitly asked. "
  fullPrompt += "Keep answers brief, friendly, and easy to understand.\n\n"
  fullPrompt += "Use Markdown formatting in your responses: **bold** for emphasis, *italics* for secondary emphasis, "
  fullPrompt += "bullet points for lists, `code` for numbers/percentages, and headings (## or ###) for sections.\n"
  fullPrompt += "Never expose reasoning, chain-of-thought, <thinking>, <think>, analysis, or meta commentary. Return final user-facing answer only.\n\n"

  if (context) fullPrompt += `User Context: ${context}\n\n`

  if (history && history.length > 0) {
    fullPrompt += "Conversation History:\n"
    history.forEach((msg) => {
      fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
    })
    fullPrompt += "\n"
  }

  fullPrompt += `User's Question: ${prompt}\n\nYour helpful response:`
  return fullPrompt
}

export async function* streamChatbotResponse(params: ChatbotParams): AsyncGenerator<string> {
  const fullPrompt = buildChatbotPrompt(params)
  yield* streamChatCompletion(
    {
      ...params,
      prompt: fullPrompt,
      timeoutMs: 120000,
      maxTokens: params.maxTokens ?? 2000,
    },
    [{ role: 'user', content: fullPrompt }]
  )
}
```

Refactor `generateChatbotResponse()` to reuse `buildChatbotPrompt()` instead of duplicating prompt code.

Expected checks:

```bash
npm run build
```

Expected output:

```text
✓ Compiled successfully
```

Existing unrelated warnings may still appear.

## Task 2 — Add streaming branch in route

Edit: `app/api/ai/chatbot/route.ts`

Import:

```ts
import { generateChatbotResponse, streamChatbotResponse } from '@/lib/ai';
```

After `context` is built, branch on request body:

```ts
const shouldStream = body?.stream === true;

if (shouldStream) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChatbotResponse({
          prompt: trimmedPrompt,
          provider,
          apiKey: providerApiKey,
          model: user.settings.selectedModel,
          customEndpoint: provider === 'custom' ? user.settings.customEndpoint : null,
          context,
          history: safeHistory,
          timeoutMs: 120000,
          maxTokens: 2000,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown chatbot stream error';
        controller.error(new Error(message));
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

Keep existing JSON response after branch:

```ts
const aiResponse = await generateChatbotResponse(...)
return NextResponse.json({ response: aiResponse })
```

Expected checks:

```bash
npm run build
```

## Task 3 — Update frontend reader

Edit: `app/components/FinanceChatbot.tsx`

Do not use `animateAssistantMessage()` for streaming path. Create one assistant placeholder, then append chunks as they arrive.

Replace fetch body:

```ts
body: JSON.stringify({ prompt: text, walletId: selectedWallet.id, history: nextHistory, stream: true }),
```

After `response.ok`, read stream:

```ts
const assistantId = crypto.randomUUID();
const placeholder: ChatMessage = {
  id: assistantId,
  role: 'assistant',
  content: '',
  timestamp: new Date(),
  status: 'streaming',
};

setMessages([...baseMessages, placeholder]);

const reader = response.body?.getReader();
if (!reader) throw new Error('Chatbot stream unavailable');

const decoder = new TextDecoder();
let reply = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  reply += decoder.decode(value, { stream: true });
  const cleanReply = cleanAssistantText(reply);

  setMessages([
    ...baseMessages,
    { ...placeholder, content: cleanReply },
  ]);
}

reply += decoder.decode();
const finalReply = cleanAssistantText(reply);
if (!finalReply) throw new Error('Chatbot returned an empty response');

const finalMessage: ChatMessage = {
  ...placeholder,
  content: finalReply,
  status: 'done',
};
const finalMessages = [...baseMessages, finalMessage];
setMessages(finalMessages);
saveMessages(finalMessages);

const finalHistory = [...nextHistory, { role: 'assistant' as const, content: finalMessage.content }].slice(-10);
setChatHistory(finalHistory);
summary.refresh();
```

Remove old JSON parse path for stream mode:

```ts
const data = await response.json();
const reply = typeof data?.response === 'string' ? cleanAssistantText(data.response) : '';
...
await animateAssistantMessage(baseMessages, reply);
```

Optional keep `animateAssistantMessage()` for future non-stream fallback, or delete it if unused. Prefer deletion if TypeScript says unused.

Expected checks:

```bash
npm run build
```

## Task 4 — Fix proxy buffering if needed

Check nginx site config for BudTrack:

```bash
sudo nginx -T | grep -n "budtrack.iqbalarif.me" -A80
```

If proxy buffering is enabled/default and stream chunks do not reach browser until finish, add under BudTrack `location /` or specific `/api/ai/chatbot`:

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 180s;
```

Reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Expected output:

```text
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Task 5 — Add one no-framework stream parser check

Create: `scripts/check-ai-stream-parser.mjs`

Use stdlib assert. Test only parser-ish helpers if exported via `__aiTest`, or test `extractSseMessage()` current behavior.

Minimal check if adding `extractSseDelta` to `__aiTest`:

```js
import assert from 'node:assert/strict'
import { __aiTest } from '../lib/ai'

assert.equal(
  __aiTest.extractSseDelta('data: {"choices":[{"delta":{"content":"Halo"}}]}'),
  'Halo'
)
assert.equal(__aiTest.extractSseDelta('data: [DONE]'), '')
console.log('stream parser ok')
```

If project cannot import TS directly from Node without transpile, skip file and use `npm run build` plus live route smoke test. Do not add test framework.

## Task 6 — Live verification

Build:

```bash
cd /home/iqbalarief96/projects/budtrack
npm run build
```

Deploy:

```bash
sudo systemctl restart budtrack.service
curl -sI https://budtrack.iqbalarif.me/chatbot | head -1
```

Expected:

```text
HTTP/2 200
```

Live stream smoke using authenticated browser session:

1. Open `https://budtrack.iqbalarif.me/chatbot`.
2. Ask long prompt:

```text
Analisa semua data finansial gw lengkap: cashflow, budget, wallet, kategori, pola bulanan, red flag, dan action plan.
```

3. Confirm UI starts rendering before full answer complete.
4. Confirm no toast error.
5. Confirm browser Network `/api/ai/chatbot` status `200`.
6. Confirm answer saved in local chat history.

Server log check:

```bash
sudo journalctl -u budtrack.service -n 100 --no-pager | grep -i "chatbot\|timed out\|error" | tail -30
```

Expected:

```text
No new Z.ai request timed out after 30s
No Error in chatbot API for latest request
```

## Commit plan

Commit 1:

```bash
git add lib/ai.ts app/api/ai/chatbot/route.ts app/components/FinanceChatbot.tsx
git commit -m "fix: stream chatbot responses"
```

Commit 2 only if nginx changed:

```bash
git status --short
```

Nginx config not in repo, so report exact file changed and command output instead of committing.

## Rollback

Code rollback:

```bash
git revert <streaming_commit_sha>
sudo systemctl restart budtrack.service
```

Nginx rollback if changed:

```bash
sudo cp <backup-file> <nginx-site-file>
sudo nginx -t && sudo systemctl reload nginx
```

## Risks

- Some OpenAI-compatible providers stream reasoning-only chunks first. Current UI may show blank until content appears. Acceptable.
- If provider sends non-SSE JSON despite `stream: true`, route should error clearly; fallback still available with `stream: false`.
- If nginx buffers, app code works but browser sees delayed chunks. Fix with `proxy_buffering off`.
- Browser abort handling not explicit. If user navigates away, server/provider request may continue until upstream notices. Add AbortSignal bridge later only if needed.

## Done criteria

- `npm run build` passes.
- Live `/chatbot` page returns `HTTP/2 200`.
- Chatbot sends `stream: true`.
- Assistant message appears progressively.
- Full financial context still built by `getFinancialData()` and passed into prompt.
- No new `Z.ai request timed out after 30s` log for verified request.
