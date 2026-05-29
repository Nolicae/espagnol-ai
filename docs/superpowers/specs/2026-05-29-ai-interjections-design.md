# AI Interjections Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the AI to interrupt the user mid-conversation with contextually relevant interjections, making the dialogue more realistic and natural.

**Architecture:** Hybrid approach combining real-time audio heuristics with LLM validation. Four parallel trigger mechanisms (pauses, hesitations, keywords, context cues) feed into a lightweight LLM decision call. When approved, interjections are generated, played, and tracked in conversation context for continuity.

**Tech Stack:** Vanilla JavaScript Web Audio API, Groq STT API for live keyword detection, OpenAI/Microsoft TTS for interject playback, existing LLM API for decision-making.

---

## Requirements

### Interject Triggers (4 mechanisms, all active in parallel)

1. **Pause Detection** — User silence of 1.5-2 seconds while still in conversation
   - Analyze audio energy from live stream
   - Only trigger if user hasn't finished their thought (heuristic: mid-sentence context)

2. **Hesitation Markers** — Voice patterns indicating uncertainty
   - Detect filled pauses: "um", "uh", "eh", "mmm", "bueno", similar Spanish hesitations
   - Detect voice quality changes: pitch drop, slower cadence, longer vowel sounds
   - Lightweight pattern recognition (no heavy ML needed)

3. **Keywords & Questions** — Real-time live transcription analysis
   - Detect direct questions: "¿Cuándo...?", "¿Por qué...?", "¿Cómo...?"
   - Detect conversational markers: "pero", "entonces", "por eso", "sin embargo"
   - Continuous chunked transcription via Groq STT (~2-3 second windows, fast/cheap)

4. **Context-based Rhythm** — Natural conversation flow signals
   - Sentence-ending intonation patterns (pitch drop at end)
   - Emotional markers (exclamation detected in transcription)
   - Logical pauses before complex topic continuation

When ANY trigger fires → Queue LLM validation call.

### Interject Generation & Playback

- **Frequency:** Moderate (3-5 interjections per 10-15 user turns)
- **Length:** Adequate (1-3 sentences, ~150 words max, ~15 seconds speech)
- **Types:** Mixed distribution of three kinds:
  - **Confirmatory:** Validate/show understanding ("Exactamente, porque..." / "Sí, y además...")
  - **New angle:** Introduce information or steer ("Pero hay algo interesante aquí...")
  - **Questions:** Ask follow-ups or seek clarification ("¿Pero cuándo exactamente?")

- **LLM Decision Call:**
  ```
  Prompt: "User is speaking. They just [TRIGGER_TYPE].
  Context: [last 2 exchanges].
  Current chunk: [2-3 sec transcript].
  
  Should I interject NOW? YES or NO.
  If YES, generate 1-3 sentence interject that [validates/adds info/asks clarification]."
  ```
  - Fast, lightweight call (not full reasoning)
  - Structured output: deterministic YES/NO + text
  - Fallback: if call fails, skip interject, continue listening

### Recording & Flow Management

- **During interject:**
  - Pause recording briefly while interject audio plays
  - Resume recording immediately after interject finishes
  - User's ongoing response continues being captured

- **User can interrupt interject:**
  - If user starts speaking during AI interject playback, stop audio immediately
  - Resume listening to user
  - Don't discard user's audio
  - Include "interrupted interject" context if relevant

### Context Tracking

- **Storage:** Each interject stored in conversation history as:
  ```
  { role: "assistant", type: "interject", content: "..." }
  ```

- **Full Response Integration:**
  - When user finishes speaking, full LLM call includes all prior interjections in context
  - LLM can see what it already said via interject, avoids repetition
  - Seamless conversation continuity

- **User Response:**
  - User can respond to interject directly or continue original thought
  - Full user response (after interject) treated as single exchange in history

### Dynamic Cooldown System

User can request cooldown via voice commands to prevent aggressive interjections:

**Trigger Phrases:** "Déjame hablar", "No me interrumpas", "Dame un momento", "Silencio", similar Spanish phrases

**Escalating Cooldown:**
- **First command:** 30 second cooldown (all interject triggers ignored)
- **If command repeated after first cooldown expires:** 2 minute cooldown
- **Further repeats:** Continue at 2 minute intervals

**Behavior:**
- During cooldown: all triggers (pause, hesitation, keywords, context) are suppressed
- When cooldown expires: normal interject pipeline resumes
- User can explicitly re-enable interjections: "Puedo hablar de nuevo" or via settings

**Optional UI signal:** Show subtle "Cooldown active" indicator in HUD during active cooldown

---

## Architecture

### New Component: InterjectManager

Encapsulates all interject logic. Responsibilities:

1. **Trigger Detection:**
   - Continuous monitoring of live audio stream for pause/hesitation/keywords
   - Maintain small rolling buffer of recent audio for analysis
   - Detect trigger events and emit signals

2. **LLM Validation:**
   - Queue LLM decision calls when triggers fire
   - Handle responses (yes/no + generated text)
   - Manage fallback to heuristics on failure

3. **Interject Playback:**
   - Generate TTS audio for approved interjections
   - Play while maintaining recording state
   - Handle user interruption mid-playback

4. **Context Tracking:**
   - Store interjections in conversation history
   - Provide context to full LLM responses
   - Track interject timestamps and types

5. **Cooldown Management:**
   - Detect cooldown trigger phrases in transcription
   - Maintain cooldown state machine (off → 30s → 2min → 2min...)
   - Suppress triggers during active cooldown

### Data Flow

```
User speaks (recording) 
  ↓
[Parallel Analysis Pipeline]
  ├→ Pause detector (audio energy)
  ├→ Hesitation detector (pattern matching)
  ├→ Keyword detector (live transcription chunks)
  └→ Context analyzer (intonation/rhythm)
  ↓
[Trigger Fire?]
  ├→ If YES: Queue LLM validation call
  │   ├→ LLM says YES: Generate interject → Play → Store in history
  │   └→ LLM says NO: Continue listening
  └→ If NO: Continue listening
  ↓
[Check Cooldown State]
  ├→ If cooldown active: suppress all triggers
  └→ If cooldown expired: resume normal triggers
```

### Integration with Existing Code

**Minimal changes to existing conversation flow:**

Current flow:
```
startRec() → recordAudio() → stt() → llm() → speak(reply)
```

New flow:
```
startRec() → recordAudio() [+ InterjectManager analyzing in parallel]
  ↓
[Interjections may occur during recording]
  ↓
stt() → [include interject context] → llm() → speak(reply)
```

The `InterjectManager` operates in the background without disrupting the main flow.

---

## Error Handling

**LLM Decision Call Failure:**
- Fall back to lightweight heuristics (pause detection only, no LLM validation)
- Continue recording, don't generate interject
- Log error silently

**Interject Generation Timeout:**
- If TTS generation takes too long, cancel and resume listening
- Don't interrupt user unnecessarily

**Rapid Trigger Firing:**
- Debounce: if multiple triggers fire within 500ms, process highest priority only
- Priority: Question > Hesitation > Pause > Context

**Two Triggers Simultaneously:**
- Process highest-priority trigger, suppress others

**Interject Text Too Long:**
- If LLM returns >150 words, truncate at natural break point
- Limit speech output to ~15 seconds

**User Interrupts Interject:**
- Stop TTS immediately
- Resume listening to user
- Treat as "user took over" context signal

---

## Testing Strategy

### Unit Tests

- **Pause detection:** Test silence duration detection (1.5-2s windows)
- **Hesitation patterns:** Test "um", "uh", filled pause detection
- **Keyword detection:** Test question/marker phrase detection in transcripts
- **LLM validation:** Mock LLM responses (yes/no), verify interject generation
- **Cooldown state machine:** Test 30s → 2min escalation, trigger phrase detection
- **Context tracking:** Verify interjections stored and retrieved correctly

### Integration Tests

- **Full interject flow:** Record → trigger → validate → play → context tracking
- **User interruption:** User speaks during interject, verify audio stops and listening resumes
- **Conversation continuity:** Verify full response includes interject context
- **Cooldown during interject:** Trigger cooldown, verify subsequent interjections suppressed
- **Fallback behavior:** Disable LLM, verify lightweight triggers still work

### Manual Testing

- Record 10-15 turn conversation
- Verify 3-5 interjections occur (not too aggressive, not too rare)
- Verify mixed types (confirmatory, new angle, questions)
- Manually trigger cooldown, verify interjections stop for 30s
- Trigger cooldown again, verify 2-minute extension
- Interrupt interjection mid-play, verify user can respond

---

## Success Criteria

- [x] All 4 trigger mechanisms active and detecting correctly
- [x] LLM validation calls made appropriately (3-5 per session)
- [x] Interjections generate and play smoothly without disrupting recording
- [x] Context tracking preserves interject history in conversation
- [x] User can respond naturally to interjections
- [x] Cooldown system responds to voice commands with correct timing (30s → 2min)
- [x] App gracefully handles LLM failures (falls back to heuristics)
- [x] User can interrupt interjection mid-play
- [x] No audio glitches or overlapping playback issues
- [x] Conversation feels more natural and realistic with interjections active
