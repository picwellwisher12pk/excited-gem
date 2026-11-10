# Jev Integration Plan for Excited Gem

## Executive Overview
**Excited Gem** is a high-performance productivity workspace managing hundreds of tabs across spatial multi-window layouts, autonomous routines, and multi-provider AI assistants.

Integrating **Jev (TypeSafe AI System 1 decision engine)** introduces a sub-100ms structured decision layer that runs directly in the extension service worker or background script. This decouples fast binary filtering and classification from expensive, slow generative LLMs (Gemini Cloud / Claude / Ollama).

---

## 1. Targeted Use Cases & Jev Primitives

### Use Case A: Zero-Token Natural Language Tab Filtering
* **Current Limitation:** To process commands like *"close all shopping tabs"* or *"group tabs related to Docker"*, the extension must serialize dozens of tab objects (`id`, `title`, `url`), calculate token budgets, send them to Gemini/Claude, and parse a JSON response.
* **Jev Pattern:** Parallel `Boolean` evaluation directly against the active tab list.
* **Jev Primitive:** `Boolean`
* **Query Signature:**
  ```typescript
  interface TabFilterQuery {
    input: { title: string; url: string };
    type: "boolean";
    question: string; // e.g., "Is this tab an e-commerce, shopping cart, or checkout page?"
  }
  ```
* **Latency:** ~70–120ms evaluated in `Promise.all` batches of 20 tabs.

### Use Case B: Autonomous Routine Destructive Action Guardrail
* **Problem:** Automated macros (e.g., "Close all inactive tabs from the last 48 hours") can inadvertently kill form entries, uncommitted web editors, or critical dashboards.
* **Jev Pattern:** Safety gatekeeper before executing `chrome.tabs.remove()`.
* **Jev Primitive:** `Boolean` (Safety Probability)
* **Rule:** If safety score is `< 0.90`, halt execution and trigger Excited Gem's custom confirmation modal (never native browser alerts).

### Use Case C: Semantic Tab & Window Categorization
* **Use Case:** Automatically organizing loose tabs into window groups or curated lists.
* **Jev Primitive:** `Choice`
* **Options:** `[Software Development, Documentation & APIs, E-Commerce & Shopping, Social & Media, Communication, Research & Reading, Banking & Finance]`
* **Action:** Groups matching tabs into colored Chrome tab groups using `chrome.tabGroups.update`.

### Use Case D: Multi-Provider AI Fast Router
* **Architecture:** Before sending prompts to Gemini Cloud or Claude:
* **Jev Primitive:** `Choice`
* **Options:** `[Instant_Local_Action, Quick_Filter, Heavy_Generative_Reasoning, Creative_Drafting]`
  * If `Instant_Local_Action`: Route to Jev or local Chrome Tabs API directly (0s LLM wait).
  * If `Heavy_Generative_Reasoning`: Route to Gemini 3.5 Pro or Claude.

---

## 2. Implementation Architecture

### Step 1: Jev Client Service Worker Utility
Create `src/services/jev.ts`:
```typescript
export interface JevResponse<T> {
  value: T;
  confidence: number;
}

export class JevClient {
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint = "https://api.typesafe.ai/v1/jev") {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async evaluateBoolean(input: Record<string, unknown>, question: string): Promise<JevResponse<boolean>> {
    const res = await fetch(`${this.endpoint}/evaluate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input, type: "boolean", question })
    });
    return res.json();
  }

  async evaluateChoice<T extends string>(
    input: Record<string, unknown>,
    question: string,
    choices: T[]
  ): Promise<JevResponse<T>> {
    const res = await fetch(`${this.endpoint}/evaluate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input, type: "choice", question, choices })
    });
    return res.json();
  }
}
```

### Step 2: Natural Language Tab Command Handler
In `src/background/routines/tabFilter.ts`:
```typescript
import { JevClient } from "../services/jev";

export async function filterTabsByIntent(
  tabs: chrome.tabs.Tab[],
  intentQuestion: string,
  jev: JevClient
): Promise<chrome.tabs.Tab[]> {
  const BATCH_SIZE = 25;
  const matchedTabs: chrome.tabs.Tab[] = [];

  for (let i = 0; i < tabs.length; i += BATCH_SIZE) {
    const chunk = tabs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map(async (tab) => {
        if (!tab.url || tab.url.startsWith("chrome://")) return null;
        const res = await jev.evaluateBoolean(
          { title: tab.title, url: tab.url },
          intentQuestion
        );
        return res.value && res.confidence >= 0.85 ? tab : null;
      })
    );
    matchedTabs.push(...results.filter((t): t is chrome.tabs.Tab => Boolean(t)));
  }

  return matchedTabs;
}
```

### Step 3: Destructive Action Modal Integration
When a routine attempts to close or discard tabs:
```typescript
// Always use app-based modals instead of native confirm()
if (lowConfidenceTabs.length > 0) {
  openAppModal({
    title: "Confirm Tab Closure",
    description: `Jev identified ${lowConfidenceTabs.length} tabs that may contain unsaved work.`,
    confirmText: "Close Anyway",
    cancelText: "Keep Tabs",
    onConfirm: () => executeClosure(lowConfidenceTabs)
  });
}
```

---

## 3. Phased Rollout Roadmap

1. **Phase 1: Environment & Settings Integration**
   * Add Jev API key input inside Excited Gem's AI Settings Tab alongside Gemini and Claude keys.
   * Add connectivity test action with badge confirmation.
2. **Phase 2: Intent-Based Tab Grouping & Filtering**
   * Implement `filterTabsByIntent` for quick search in the multi-window spatial grid view.
   * Add "Auto-Categorize Windows" button powered by `Choice` primitive.
3. **Phase 3: Routine & Macro Guardrails**
   * Attach Jev safety check before any destructive macro execution (`close_window`, `discard_all`).
4. **Phase 4: Shadow Mode Verification**
   * Log Jev confidence ratings in the analytics dashboard to calibrate accuracy against user habits.
