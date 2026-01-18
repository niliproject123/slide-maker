# Development Plan - Simple

## The Approach

```
Phase 1: UI + Mocks     →     Phase 2: API + Real Services
         ↓                              ↓
    mockApi.ts                   2.0  All mocked
    No HTTP calls                2.1  OpenAI REAL
    Deploy & validate            2.2  Cloudinary REAL
                                 2.3  PostgreSQL REAL
```

---

## Phase 1: UI with Mock Data

**What:** Complete Next.js frontend with `mockApi.ts` (no HTTP calls)

**Result:** Working app in browser with fake data

| Page | Features |
|------|----------|
| `/projects` | List, create, delete projects |
| `/projects/[id]` | Videos list, create video |
| `/videos/[id]` | Frames list, context panel, chat/generate |
| `/projects/[id]/gallery` | Gallery images |

**Exit:** User says "UX is good"

---

## Phase 2: API with Gradual Integration

### 2.0 - All Mocked
- Build Fastify API
- UI switches to HTTP calls
- Everything still mocked (no costs)

### 2.1 - OpenAI REAL
| OpenAI | Cloudinary | PostgreSQL |
|--------|------------|------------|
| **REAL** | mock | mock |

### 2.2 - Cloudinary REAL
| OpenAI | Cloudinary | PostgreSQL |
|--------|------------|------------|
| real | **REAL** | mock |

### 2.3 - PostgreSQL REAL
| OpenAI | Cloudinary | PostgreSQL |
|--------|------------|------------|
| real | real | **REAL** |

**Exit:** Full production system

---

## Summary Table

| Phase | What's Real | UI Data Source |
|-------|-------------|----------------|
| 1 | Nothing | `mockApi.ts` |
| 2.0 | Nothing | HTTP → API (mocked) |
| 2.1 | OpenAI | HTTP → API |
| 2.2 | OpenAI + Cloudinary | HTTP → API |
| 2.3 | Everything | HTTP → API |

---

## Current Status

- [x] Documentation complete
- [ ] **Phase 1** - UI with mocks
- [ ] Phase 2.0 - API with mocks
- [ ] Phase 2.1 - Real OpenAI
- [ ] Phase 2.2 - Real Cloudinary
- [ ] Phase 2.3 - Real PostgreSQL
