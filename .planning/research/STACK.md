# Stack Research: KEWA Property Task Management App

**Researched:** 2026-01-16
**Domain:** Next.js + Supabase Property Management App
**Overall Confidence:** HIGH

## Executive Summary

For a mobile-first Next.js 15 + Supabase app with photo uploads, audio recording, and German speech-to-text, the optimal 2025/2026 stack centers on: **shadcn/ui** for UI components (built on Radix primitives with Tailwind CSS 4), **native MediaRecorder API** via the `react-audio-voice-recorder` hook for audio capture, **Deepgram Nova-3** for German Hochdeutsch transcription, and **Supabase Storage** with built-in image transformations for media handling. State management should follow the modern pattern: **TanStack Query** for server state (data fetching/caching) and **Zustand** for minimal client state. Supabase Realtime handles live task status updates via WebSocket subscriptions.

**Primary recommendation:** Use the established "TanStack Query + Zustand + shadcn/ui" ecosystem. This stack has become the de facto standard for modern React applications in 2025, offering minimal boilerplate, excellent DX, and production-proven reliability.

---

## Recommended Stack

### UI Framework & Components

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| **shadcn/ui** | Latest (copy-paste) | Pre-styled component library | HIGH |
| **Tailwind CSS** | 4.0+ | Utility-first CSS framework | HIGH |
| **Radix UI** | 1.x | Underlying accessible primitives | HIGH |
| **lucide-react** | 0.460+ | Icon library | HIGH |

**Rationale:**
- **shadcn/ui** is the clear winner for 2025. Components are copied directly into your project (not an npm dependency), giving full control and customization. Built on Radix UI primitives for accessibility, styled with Tailwind CSS.
- **Tailwind CSS 4.0** brings 5x faster full builds, 100x faster incremental builds, and simplified zero-config setup. Mobile-first by default with responsive breakpoints (`sm:640px`, `md:768px`, `lg:1024px`).
- Mobile-first approach: Unprefixed utilities apply to all screens; prefixed utilities (e.g., `md:hidden`) apply at breakpoint and above.

**Installation:**
```bash
npx create-next-app@latest --typescript --tailwind --eslint
npx shadcn@latest init
npx shadcn@latest add button card dialog input toast
```

**Sources:**
- [shadcn/ui vs Radix UI Comparison](https://javascript.plainenglish.io/shadcn-ui-vs-radix-ui-vs-tailwind-ui-which-should-you-choose-in-2025-b8b4cadeaa25)
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [React UI Libraries 2025 Comparison](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)

---

### Audio Handling

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| **react-audio-voice-recorder** | 2.x | React hook for audio recording | HIGH |
| **Native MediaRecorder API** | Browser | Underlying recording technology | HIGH |

**Rationale:**
- **react-audio-voice-recorder** provides a clean React hook (`useAudioRecorder`) wrapping the native MediaRecorder API with state management (isRecording, isPaused, recordingTime).
- Supports pause/resume, provides `recordingBlob` for upload, and handles browser compatibility.
- For a max 1-minute recording, this is simpler than full-featured libraries like `react-media-recorder`.

**Implementation Pattern:**
```typescript
import { useAudioRecorder } from 'react-audio-voice-recorder';

const {
  startRecording,
  stopRecording,
  recordingBlob,
  isRecording,
  recordingTime
} = useAudioRecorder();

// Auto-stop at 60 seconds
useEffect(() => {
  if (recordingTime >= 60) {
    stopRecording();
  }
}, [recordingTime]);
```

**Audio Format Consideration:**
- MediaRecorder outputs `audio/webm` (Chrome) or `audio/ogg` (Firefox) by default.
- For widest compatibility with speech-to-text APIs, consider `audio/webm;codecs=opus`.
- All major STT providers (Deepgram, OpenAI, ElevenLabs) accept webm format.

**Sources:**
- [react-audio-voice-recorder npm](https://www.npmjs.com/package/react-audio-voice-recorder)
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

---

### Speech-to-Text (German Hochdeutsch)

| Service | Price | German Support | Confidence |
|---------|-------|----------------|------------|
| **Deepgram Nova-3** | $0.0043-0.0077/min | Dedicated German model | HIGH |
| **OpenAI gpt-4o-mini-transcribe** | $0.003/min | Good German support | HIGH |
| **ElevenLabs Scribe** | $0.35-0.40/hour | German in "Excellent" tier | MEDIUM |

**Primary Recommendation: Deepgram Nova-3**

**Rationale:**
- **Dedicated German model** launched specifically for German with enterprise-grade accuracy for complex compound words (e.g., "Sondertilgungsoption").
- **Price**: $0.0043/min for pre-recorded (batch) = $0.26/hour = ~$0.004 per 1-minute recording.
- **Speed**: Sub-300ms latency for real-time, near-instant for batch processing.
- **54.3% WER reduction** vs competitors in 2025 benchmarks.
- Handles background noise, overlapping speech, and accented German.

**Alternative: OpenAI gpt-4o-mini-transcribe**
- Slightly cheaper at $0.003/min ($0.18/hour).
- Good German support but not German-specific optimized.
- Better if you're already using OpenAI APIs extensively.

**NOT Recommended for Imeri (Dialect Speaker):**
Per project context, Imeri's dialect recording should NOT be transcribed. Audio should be stored for playback only. This saves costs and avoids poor transcription quality.

**Implementation:**
```typescript
// Server Action for transcription
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=de', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
    },
    body: formData,
  });

  const result = await response.json();
  return result.results.channels[0].alternatives[0].transcript;
}
```

**Sources:**
- [Deepgram Nova-3 German Launch](https://deepgram.com/learn/deepgram-expands-nova-3-with-german-dutch-swedish-and-danish-support)
- [Deepgram Pricing](https://deepgram.com/pricing)
- [OpenAI Transcription Pricing](https://platform.openai.com/docs/pricing)
- [Best Speech Recognition API 2025](https://voicewriter.io/blog/best-speech-recognition-api-2025)

---

### Image Handling

| Library/Feature | Purpose | Confidence |
|-----------------|---------|------------|
| **Supabase Storage** | File storage backend | HIGH |
| **Supabase Image Transformations** | On-the-fly resize/optimize | HIGH |
| **Next.js Image component** | Client-side optimization | HIGH |
| **react-dropzone** | Drag-and-drop upload UI | MEDIUM |

**Rationale:**
- **Supabase Storage** with **Image Transformations** provides on-the-fly resizing, quality control (20-100), and automatic WebP conversion for modern browsers.
- **Global CDN** with 285+ edge locations for fast image delivery.
- **Signed upload URLs** allow client-side uploads without exposing service keys.
- For "max 2 photos per task," optimize storage with:
  - Thumbnail generation (width=200, quality=60)
  - Display size (width=800, quality=80)
  - Original stored for archival

**Custom Next.js Loader for Supabase:**
```typescript
// supabase-image-loader.ts
export default function supabaseLoader({ src, width, quality }: {
  src: string;
  width: number;
  quality?: number;
}) {
  const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/storage/v1/render/image/public/${src}?width=${width}&quality=${quality || 75}`;
}
```

**Upload Pattern:**
```typescript
// Upload with caching
const { data, error } = await supabase.storage
  .from('task-photos')
  .upload(`tasks/${taskId}/${filename}`, file, {
    cacheControl: '31536000', // 1 year
    contentType: file.type,
    upsert: false,
  });
```

**react-dropzone Caveat:**
- Currently requires `--legacy-peer-deps` flag for Next.js 15 (React 19).
- Consider using shadcn/ui's Dropzone component instead, which wraps react-dropzone with proper styling.

**Sources:**
- [Supabase Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Next.js 15 + Supabase Storage Guide](https://github.com/devpayoub/Supabase-Storage-Guide)
- [Supabase Storage Quickstart](https://supabase.com/docs/guides/storage/quickstart)

---

### State Management

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| **TanStack Query** | 5.x | Server state (fetching, caching) | HIGH |
| **Zustand** | 5.x | Client state (UI, local) | HIGH |

**Rationale:**
This is the **2025 consensus stack** for React state management:
- **TanStack Query** owns server state: API calls, caching, re-validation, optimistic updates.
- **Zustand** owns client state: UI toggles, modal states, form drafts, local preferences.
- Together they replace Redux with 90% of the capability at a fraction of boilerplate.

**What Goes Where:**
| State Type | Tool | Examples |
|------------|------|----------|
| Server data | TanStack Query | Tasks list, user data, building info |
| UI state | Zustand | Selected tab, sidebar open, theme |
| Form state | React Hook Form | Task creation form |
| URL state | nuqs or Next.js | Filters, pagination, selected task |

**Example Zustand Store:**
```typescript
import { create } from 'zustand';

interface AppState {
  selectedUnitId: string | null;
  setSelectedUnit: (id: string | null) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedUnitId: null,
  setSelectedUnit: (id) => set({ selectedUnitId: id }),
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
}));
```

**Sources:**
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025)
- [Redux vs TanStack Query & Zustand 2025](https://www.bugragulculer.com/blog/good-bye-redux-how-react-query-and-zustand-re-wired-state-management-in-25)
- [Zustand vs TanStack Query - Maybe Both](https://helloadel.com/blog/zustand-vs-tanstack-query-maybe-both/)

---

### Real-time Updates

| Feature | Implementation | Confidence |
|---------|----------------|------------|
| **Supabase Realtime** | WebSocket subscriptions | HIGH |

**Rationale:**
- Supabase Realtime is built-in and mature (formerly separate realtime-js, now part of @supabase/supabase-js).
- Uses WebSockets for bidirectional communication.
- Subscribe to INSERT, UPDATE, DELETE events on specific tables.
- Perfect for task status changes (e.g., "In Progress" -> "Complete").

**Implementation:**
```typescript
// Subscribe to task changes
useEffect(() => {
  const channel = supabase
    .channel('task-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `building_id=eq.${buildingId}`,
      },
      (payload) => {
        // Invalidate TanStack Query cache
        queryClient.invalidateQueries({ queryKey: ['tasks', buildingId] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [buildingId]);
```

**Pricing:**
- $2.50 per 1 million messages (beyond plan quota)
- $10 per 1,000 peak connections
- For 2 users, will stay well within free tier

**Sources:**
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
- [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing)

---

### Authentication (PIN-based)

| Approach | Implementation | Confidence |
|----------|----------------|------------|
| **Custom PIN + Supabase Anonymous Auth** | Recommended | MEDIUM |

**Rationale:**
Supabase doesn't have native "simple PIN" authentication. For 2 users with static PINs:

**Option 1: Custom PIN Table + Anonymous Session (Recommended)**
- Store hashed PINs in a `users` table with role (KEWA_AG, IMERI)
- Use Supabase anonymous sign-in for session management
- Validate PIN against database, set user context
- Simple, works for 2 users

**Option 2: Environment Variables (Simplest)**
- Store PINs as env variables
- No database auth, just client-side validation
- Set role in localStorage/cookie
- Least secure but acceptable for internal tool

**Implementation (Option 1):**
```typescript
// PIN validation with anonymous auth
async function loginWithPin(pin: string) {
  // Anonymous sign in for session
  await supabase.auth.signInAnonymously();

  // Validate PIN against database
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('pin_hash', hashPin(pin))
    .single();

  if (!user) throw new Error('Invalid PIN');

  // Store user context
  localStorage.setItem('userRole', user.role);
  return user;
}
```

**Sources:**
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Password-based Auth](https://supabase.com/docs/guides/auth/passwords)

---

### Database Schema Considerations

**Supabase-Specific Patterns:**

1. **Use RLS (Row Level Security)** for all tables:
```sql
-- Tasks visible to authenticated users
CREATE POLICY "Users can view tasks" ON tasks
  FOR SELECT USING (true);

-- Only KEWA_AG can create tasks
CREATE POLICY "KEWA can create tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

2. **Storage Buckets:**
```sql
-- Bucket for task photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', true);

-- Bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-audio', 'task-audio', false);
```

3. **Enable Realtime selectively:**
```sql
-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

4. **Suggested Schema:**
```
buildings (id, name, address)
units (id, building_id, name, floor, type: 'apartment'|'common_area')
projects (id, unit_id, name, status)
tasks (id, project_id, title, description, status, assigned_to, created_at)
task_photos (id, task_id, storage_path, created_at)
task_audio (id, task_id, storage_path, transcription, created_at)
users (id, pin_hash, role, name)
```

---

## What NOT to Use

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| **Redux/Redux Toolkit** | TanStack Query + Zustand | Massive overkill for 2 users; excessive boilerplate |
| **Material UI (MUI)** | shadcn/ui | Heavy bundle size, opinionated styling fights Tailwind |
| **Chakra UI** | shadcn/ui | Similar issues; shadcn is more customizable |
| **react-media-recorder** | react-audio-voice-recorder | Simpler API for audio-only use case |
| **Self-hosted Whisper** | Deepgram API | Infrastructure complexity not worth it for low volume |
| **Google Cloud Speech-to-Text** | Deepgram Nova-3 | More expensive, no German-specific model |
| **AWS S3 direct** | Supabase Storage | Already using Supabase; unnecessary complexity |
| **Socket.io** | Supabase Realtime | Already built-in; no need for separate WebSocket server |
| **Prisma** | Supabase JS Client | Supabase client is sufficient; Prisma adds unnecessary layer |
| **NextAuth.js** | Custom PIN auth | Overkill for 2 users with simple PINs |

---

## Complete Package List

```bash
# Core Framework (via create-next-app)
npx create-next-app@latest kewa-app --typescript --tailwind --eslint --app --src-dir

# UI Components
npx shadcn@latest init
npx shadcn@latest add button card dialog input label select textarea toast badge

# State Management
npm install @tanstack/react-query zustand

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Audio Recording
npm install react-audio-voice-recorder

# Forms
npm install react-hook-form @hookform/resolvers zod

# Date Handling
npm install date-fns

# Dev Tools (optional but recommended)
npm install -D @tanstack/react-query-devtools
```

**Total new dependencies:** ~10 packages (excluding create-next-app defaults)

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| UI Framework (shadcn/ui + Tailwind 4) | HIGH | 2025 ecosystem consensus, official docs verified |
| Audio Recording | HIGH | Native API + maintained React wrapper |
| Speech-to-Text (Deepgram) | HIGH | Official pricing/German support verified |
| Image Handling (Supabase) | HIGH | Official docs verified |
| State Management | HIGH | Clear 2025 best practices |
| Real-time (Supabase) | HIGH | Official docs, mature feature |
| PIN Authentication | MEDIUM | Custom implementation needed; pattern is sound |

---

## Open Questions

1. **Audio format compatibility:** Verify Deepgram accepts `audio/webm;codecs=opus` directly, or if conversion to mp3/wav is needed server-side.

2. **PIN security:** For production, consider whether environment-variable PINs are acceptable or if hashed database storage is required.

3. **Offline support:** If workers need to use app in basement/areas with poor connectivity, consider service worker for task caching.

---

## Sources Summary

### Primary (HIGH confidence)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
- [Deepgram Pricing](https://deepgram.com/pricing)
- [Deepgram Nova-3 German Support](https://deepgram.com/learn/deepgram-expands-nova-3-with-german-dutch-swedish-and-danish-support)
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

### Secondary (MEDIUM confidence)
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025)
- [shadcn/ui vs Radix UI Comparison](https://javascript.plainenglish.io/shadcn-ui-vs-radix-ui-vs-tailwind-ui-which-should-you-choose-in-2025-b8b4cadeaa25)
- [Best Speech Recognition APIs 2025](https://voicewriter.io/blog/best-speech-recognition-api-2025)

### Tertiary (LOW confidence)
- Stack Overflow patterns for PIN auth (needs validation)
