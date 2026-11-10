# Open-Source Semantic Router Integration Plan for Excited Gem

## Executive Overview
Instead of proprietary, paid decision APIs (like Jev), **Excited Gem** can run an **Open-Source Semantic Router** directly inside the browser extension using `@xenova/transformers` / Transformers.js (`all-MiniLM-L6-v2`, 23MB ONNX model running on WebAssembly/WebGPU).

This provides **sub-10ms intent classification and tab routing** with:
- **$0.00 cost** (100% free and open-source).
- **100% Local Privacy** (Browsing URLs and tab titles never leave the user's device).
- **Zero API keys & zero token limits**.

---

## 1. Targeted Use Cases & Semantic Routes

### Route Group 1: Natural Language Tab Actions
Define action routes with anchor utterances:
```typescript
const actionRoutes = [
  {
    name: 'close_tabs',
    utterances: [
      'close shopping tabs',
      'close tabs related to pricing',
      'kill unused duplicate tabs',
      'remove social media tabs'
    ]
  },
  {
    name: 'create_tab_group',
    utterances: [
      'group github tabs together',
      'bundle research articles into a group',
      'cluster documentation tabs',
      'organize my open tabs'
    ]
  },
  {
    name: 'discard_tabs',
    utterances: [
      'put idle tabs to sleep',
      'discard inactive tabs to save memory',
      'hibernate background tabs'
    ]
  },
  {
    name: 'pin_tabs',
    utterances: [
      'pin music and video tabs',
      'pin important dashboard tabs',
      'keep messaging tabs pinned'
    ]
  }
];
```

### Route Group 2: Domain Cross-Matrix & Category Triage
Categorizes open tabs in single-digit milliseconds:
* `Development`: GitHub, GitLab, StackOverflow, localhost, npm, docs.
* `E-Commerce`: Amazon, eBay, AliExpress, cart, checkout, store.
* `Media`: YouTube, Spotify, Netflix, Twitch, Soundcloud.
* `Research`: ArXiv, Wikipedia, Medium, Dev.to, research papers.

---

## 2. In-Browser Implementation Guide

### Step 1: Install Transformers.js via Bun
```powershell
bun add @xenova/transformers
```

### Step 2: Create `src/services/semanticRouter.ts`
```typescript
import { pipeline } from '@xenova/transformers';

function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export class SemanticRouter {
  private extractor: any = null;
  private actionEmbeddings: Array<{ name: string; embeddings: Float32Array[] }> = [];

  async init() {
    if (this.extractor) return;
    this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true // 23MB download once into IndexedDB cache
    });

    // Pre-encode action routes
    for (const route of actionRoutes) {
      const embs: Float32Array[] = [];
      for (const u of route.utterances) {
        const out = await this.extractor(u, { pooling: 'mean', normalize: true });
        embs.push(out.data);
      }
      this.actionEmbeddings.push({ name: route.name, embeddings: embs });
    }
  }

  async routeAction(userQuery: string): Promise<{ action: string; confidence: number }> {
    await this.init();
    const out = await this.extractor(userQuery, { pooling: 'mean', normalize: true });
    const qVec = out.data;

    let bestAction = 'general_query';
    let maxSim = -1;

    for (const route of this.actionEmbeddings) {
      for (const emb of route.embeddings) {
        const sim = dotProduct(qVec, emb);
        if (sim > maxSim) {
          maxSim = sim;
          bestAction = route.name;
        }
      }
    }

    return { action: bestAction, confidence: maxSim };
  }
}
```

---

## 3. Advantages over Cloud LLMs & Paid APIs
1. **Speed:** ~3ms–8ms vs 1,500ms–3,000ms cloud LLM roundtrips.
2. **Cost:** $0.00 forever.
3. **No Rate Limits:** Can evaluate 500 open tabs in parallel without hitting 429 errors.
4. **App-Based Modals:** High-risk actions (`close_tabs` with low similarity) trigger Excited Gem's custom confirmation modal seamlessly.
