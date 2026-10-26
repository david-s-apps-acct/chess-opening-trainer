# Natural-language selection (archived)

"Describe what to practice" let the user type a request such as "all openings where I am white" on the Studies page; Claude (Haiku 4.5, via Anthropic's JavaScript SDK in browser mode) returned the matching chapters, which were then ticked. It was removed from `index.html` on 2026-09-29 at the user's request, to cut upkeep and stop storing an Anthropic API key. This file keeps everything needed to rebuild it; the app never loads it.

To rebuild: put the HTML back where noted, restore the state variables and the handlers below, and re-add the `useNL` setting to backups and the Help page. The chapter catalog (`describeChapters`) will need checking against the app's current data (e.g. per-position stats, hidden studies).

## Spec section (as it was)

### Describe what to practice (natural-language selection)

- It's optional and off by default: a "Use natural language to select practice lines" checkbox in the Anthropic API key section of the System page turns it on (remembered between visits and included in backups). Its description says this requires an Anthropic API key and that each request costs a small amount. If it's ticked but no key is stored, the section says "Add an Anthropic API key below to use this."
- When it's on, the Studies page shows a text box above the list with a Select button; when it's off, the box isn't shown at all. It stays off until ticked, even if an API key is already saved. The Help page explains turning it on on the System page. Its placeholder text is "Describe what to practice..." in italics, in the same soft grey as the "· 2 chapters" text in the study list; example requests appear as a tooltip when hovering over the box. The user types a request such as "all openings where I am white", "Italian and Ruy Lopez only", "lines longer than 10 moves", or a combination.
- The app sends the request, plus a compact catalog of all the user's chapters, to Claude, which returns the matching chapters as structured JSON (`output_config.format` with a JSON schema) along with a one-sentence explanation.
- The catalog has one line per chapter: a short id (c1, c2, …), study name, chapter name, side played, Lichess's `Opening` and `ECO` tags, the first 8 moves of the main line, the number of lines, the shortest and longest line in full moves, and the chapter's score (the average move score, as on the Studies page). The instructions tell Claude to recognize common alternative opening names (e.g. "Spanish" = Ruy Lopez) and to combine conditions the way the user means them.
- Requests about line length select whole chapters: every chapter containing at least one matching line.
- The result **replaces** the current selection, and studies containing selected chapters are expanded so the user can review the ticks before starting. The explanation is shown under the box, e.g. "Selected your White chapters: the Italian and the Ruy Lopez. (2 chapters selected.)". If nothing matches, the selection is left unchanged and Claude's explanation says why.
- Errors are shown under the box in plain words: no key stored, key rejected, rate limited, no connection, Claude declined, or an unreadable answer.
- Model: Claude Haiku 4.5 (`claude-haiku-4-5`), chosen as a small, cheap model for a simple task. Each request costs roughly a cent or less on the user's Anthropic account.
- The call goes directly from the page using Anthropic's official JavaScript SDK in browser mode, loaded from jsDelivr only the first time the feature is used.
- The model, the instructions to Claude and the catalog builder are kept together in one clearly marked block of the code, so they're easy to adjust later.

## HTML: Studies page (above the studies list, first thing in `#select-screen`)

```html
    <form id="ask-form" class="ask">
      <input id="ask-input" type="text" autocomplete="off" placeholder="Describe what to practice..." title='For example "all openings where I am white" or "Italian and Ruy Lopez only"' aria-label="Describe what to practice">
      <button id="ask-btn" class="primary" type="submit">Select</button>
    </form>
    <div id="ask-result" class="ask-result" aria-live="polite"></div>
```

CSS:

```css
  .ask { display: flex; gap: 8px; margin-bottom: 6px; }
  .ask input { flex: 1; min-width: 0; padding: 8px 10px; border: 1px solid var(--border); border-radius: 3px; }
  .ask input::placeholder { color: var(--muted); opacity: 1; font-style: italic; } /* same grey as "· 2 chapters" */
  .ask-result { font-size: 14px; min-height: 1.4em; margin: 0 2px 10px; color: var(--muted); }
  .ask-result.error { color: var(--bad); }
```

## HTML: System page card (after the Lichess token card)

```html
      <div class="card">
        <h2>Anthropic API key</h2>
        <label class="choice"><input type="checkbox" id="use-nl">
          <span><b>Use natural language to select practice lines</b><span class="muted">Shows a "Describe what to practice..." box on the Studies page, where you type a request and Claude (Haiku 4.5) ticks the matching chapters. This requires an Anthropic API key (below). Each request costs a small amount on your Anthropic account.</span></span></label>
        <p id="nl-needs-key" class="form-error hidden">Add an Anthropic API key below to use this.</p>
        <p id="opt-ai-state" class="muted"></p>
        <p><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Create an API key in the Claude Console</a></p>
        <form id="opt-ai-form" class="token-row">
          <input id="opt-ai-input" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false">
          <button class="primary" type="submit">Save key</button>
        </form>
        <div id="opt-ai-error" class="form-error"></div>
        <button id="ai-clear-btn">Clear stored key</button>
      </div>
```

## State (with the other settings)

```js
let anthropicKey = store.get('anthropicKey', null);       // never included in backups
let useNL = store.get('useNL', false);
```

In `showSelection()`:

```js
  $('ask-form').classList.toggle('hidden', !useNL);
  $('ask-result').classList.toggle('hidden', !useNL);
```

In `renderOptions()`:

```js
  $('use-nl').checked = useNL;
  $('nl-needs-key').classList.toggle('hidden', !useNL || !!anthropicKey);
  $('opt-ai-state').textContent = anthropicKey ? 'An API key is stored in this browser.' : 'No API key is stored.';
  $('opt-ai-error').textContent = '';
  $('ai-clear-btn').disabled = !anthropicKey;
```

Setting handler:

```js
$('use-nl').addEventListener('change', e => {
  useNL = e.target.checked;
  store.set('useNL', useNL);
  renderOptions();
});
```

## Code: model, instructions, catalog, request and key handling

```js
// ---------- Natural-language selection ----------
// The adjustable parts are kept together here: the model, the instructions to
// Claude, and describeChapters(), which builds the catalog Claude chooses from.

const NL_MODEL = 'claude-haiku-4-5';
const ANTHROPIC_SDK = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm';

const NL_INSTRUCTIONS = `You choose chapters for a chess player to practice from their Lichess opening studies.

You get a catalog with one chapter per line, then the player's request. Return the ids of every chapter that matches the request, and a one-sentence explanation for the player.

How to read the catalog:
- "side" is the color the player plays in that chapter.
- "opening" and "eco" come from Lichess's opening tags; "starts" is the start of the chapter's main line. Use these together with the study and chapter names to recognize openings, including common alternative names (for example "Spanish" means the Ruy Lopez, "Caro" means the Caro-Kann).
- "lines" is how many lines the chapter has; "length" is the shortest and longest line in full moves.
- "score" is the average share of the player's moves in that chapter they got right (each over its last 10 tries), or "not played".

How to match:
- Combine conditions the way the player means them ("and", "or", "only", "except", "not").
- Requests about line length or number of moves select every chapter that contains at least one matching line.
- Match generously on opening names, but do not include chapters that clearly don't fit.
- If nothing matches, return an empty list and say why in the explanation.`;

const NL_SCHEMA = {
  type: 'object',
  properties: {
    chapter_ids: { type: 'array', items: { type: 'string' }, description: 'Ids (like "c12") of the chapters to select.' },
    explanation: { type: 'string', description: 'One short sentence telling the player what was selected.' },
  },
  required: ['chapter_ids', 'explanation'],
  additionalProperties: false,
};

// One compact line per chapter, with short ids so answers stay small.
function describeChapters() {
  const ids = new Map();
  const lines = [];
  for (const study of data.studies.filter(s => !hiddenStudies.has(s.id))) for (const ch of study.chapters) { // hidden studies aren't offered
    const id = 'c' + (ids.size + 1);
    ids.set(id, ch.key);
    const p = parseChapter(ch);
    const parts = [id, `study: ${JSON.stringify(study.name)}`, `chapter: ${JSON.stringify(ch.name)}`];
    if (p.error) { lines.push([...parts, `(${p.error})`].join(' | ')); continue; }
    parts.push(`side: ${p.color}`);
    const opening = p.game.headers.get('Opening'), eco = p.game.headers.get('ECO');
    if (opening && opening !== '?') parts.push(`opening: ${JSON.stringify(opening)}`);
    if (eco && eco !== '?') parts.push(`eco: ${eco}`);
    const starts = [...p.game.moves.mainline()].slice(0, 8).map(d => d.san).join(' ');
    if (starts) parts.push(`starts: ${starts}`);
    const chLines = chapterLines(ch);
    if (chLines.length) {
      const lengths = chLines.map(l => l.moves[l.moves.length - 1].moveNo);
      parts.push(`lines: ${chLines.length}`, `length: ${Math.min(...lengths)}-${Math.max(...lengths)} moves`);
    } else parts.push('lines: 0');
    const { tried, score } = aggregate([ch]);
    parts.push(tried ? `score: ${pct(score)}% right over ${tried} moves tried` : 'score: not played');
    lines.push(parts.join(' | '));
  }
  return { catalog: lines.join('\n'), ids };
}

let sdk = null; // loaded the first time it's needed
async function anthropicClient(key) {
  sdk ||= await import(ANTHROPIC_SDK);
  return new sdk.default({ apiKey: key, dangerouslyAllowBrowser: true });
}

function anthropicErrorMessage(e) {
  if (!sdk) return "Couldn't load Anthropic's library. Check your internet connection.";
  if (e instanceof sdk.AuthenticationError) return 'Anthropic rejected the API key. Check it on the System page.';
  if (e instanceof sdk.PermissionDeniedError) return "That API key doesn't have permission to use Claude.";
  if (e instanceof sdk.RateLimitError) return 'Too many requests to Anthropic. Wait a moment and try again.';
  if (e instanceof sdk.APIConnectionError) return "Couldn't reach Anthropic. Check your internet connection.";
  if (e instanceof sdk.APIError) return `Anthropic returned an error (${e.status ?? 'unknown'}).`;
  return 'Something went wrong: ' + e.message;
}

function setAskResult(text, isError = false) {
  $('ask-result').textContent = text;
  $('ask-result').className = 'ask-result' + (isError ? ' error' : '');
}

async function askClaude(request) {
  if (!anthropicKey) {
    setAskResult('Add your Anthropic API key on the System page to use this.', true);
    return;
  }
  if (!data || !allChapters().length) return;
  const btn = $('ask-btn');
  btn.disabled = true;
  setAskResult('Asking Claude…');
  try {
    const { catalog, ids } = describeChapters();
    const client = await anthropicClient(anthropicKey);
    const response = await client.messages.create({
      model: NL_MODEL,
      max_tokens: 16000,
      system: NL_INSTRUCTIONS,
      messages: [{ role: 'user', content: `Catalog:\n${catalog}\n\nRequest: ${request}` }],
      output_config: { format: { type: 'json_schema', schema: NL_SCHEMA } },
    });
    const userError = msg => Object.assign(new Error(msg), { forUser: true });
    if (response.stop_reason === 'refusal') throw userError('Claude declined that request.');
    if (response.stop_reason === 'max_tokens') throw userError('The answer was cut off. Try a narrower request.');
    const text = response.content.find(b => b.type === 'text')?.text;
    const answer = JSON.parse(text);
    const keys = answer.chapter_ids.map(id => ids.get(id)).filter(Boolean);
    if (!keys.length) {
      setAskResult(`${answer.explanation} Your selection wasn't changed.`);
      return;
    }
    // Replace the selection so the result is exactly what was asked for.
    selection = new Set(keys);
    saveSelection();
    for (const study of data.studies) if (study.chapters.some(c => selection.has(c.key))) expanded.add(study.id);
    renderStudies();
    setAskResult(`${answer.explanation} (${keys.length} ${keys.length === 1 ? 'chapter' : 'chapters'} selected.)`);
  } catch (e) {
    const msg = e instanceof SyntaxError ? "Couldn't read Claude's answer. Try again."
      : e.forUser ? e.message
      : anthropicErrorMessage(e);
    setAskResult(msg, true);
  } finally {
    btn.disabled = false;
  }
}

$('ask-form').addEventListener('submit', e => {
  e.preventDefault();
  const request = $('ask-input').value.trim();
  if (request) askClaude(request);
});

$('opt-ai-form').addEventListener('submit', async e => {
  e.preventDefault();
  const key = $('opt-ai-input').value.trim();
  const errorEl = $('opt-ai-error');
  if (!key) { errorEl.textContent = 'Paste a key first.'; return; }
  errorEl.textContent = 'Checking key…';
  try {
    // A free call that confirms the key works and can use the model.
    await (await anthropicClient(key)).models.retrieve(NL_MODEL);
  } catch (err) {
    errorEl.textContent = anthropicErrorMessage(err);
    return;
  }
  anthropicKey = key;
  store.set('anthropicKey', key);
  $('opt-ai-input').value = '';
  renderOptions();
  showBanner('Anthropic API key saved.');
});

$('ai-clear-btn').addEventListener('click', () => {
  anthropicKey = null;
  store.remove('anthropicKey');
  renderOptions();
  showBanner('Stored Anthropic API key cleared.');
});
```
