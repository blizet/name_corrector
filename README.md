# Name Correction Voice Agent

An AI-powered voice intake system designed to reliably capture and recover user names in real-time phone conversations.

The system combines:

* Retell AI voice orchestration
* GPT-4.1 conversational control
* deterministic backend name correction
* phonetic recovery
* fuzzy matching
* retry-aware conversational routing

to handle one of the most failure-prone parts of voice AI systems:
accurate human name capture.

The platform is optimized for:

* medical intake flows
* customer onboarding
* voice authentication
* scheduling systems
* multilingual user bases
* noisy telephony environments

---

# Problem Statement

Speech-to-text systems frequently fail on:

* multicultural names
* accented pronunciations
* compound surnames
* hyphenated names
* low-quality phone audio
* noisy environments

Examples:

| Spoken Name   | Typical ASR Output |
| ------------- | ------------------ |
| Anjali        | anjeli             |
| Nguyen        | nwin               |
| Aoife         | eefa               |
| O'Brien       | obrien             |
| Krishnamurthy | krishna murti      |
| McCarthy      | mccarty            |

Incorrect name capture causes:

* broken CRM records
* failed patient lookup
* duplicate identities
* poor personalization
* degraded user trust
* downstream operational failures

This system addresses those issues through deterministic recovery and conversational escalation logic.

---

# High-Level Architecture

Caller
↓
Retell Voice Agent
↓
GPT-4.1 Conversation Controller
↓
ASR Transcript
↓
Name Correction Backend
↓
Phonetic + Fuzzy Recovery Engine
↓
Confidence Evaluation
↓
Deterministic Recovery Routing
↓
Retell Conversational Response
↓
Confirmed Structured Name Output

---

# System Components

# 1. Voice Agent Layer (Retell AI)

The conversational layer is powered by Retell AI.

Responsibilities:

* handling phone conversations
* streaming transcription
* conversational orchestration
* retry handling
* variable storage
* dynamic branching
* interruption handling

The voice layer intentionally remains:

* lightweight
* deterministic
* narrowly scoped
* confirmation-focused

The agent is specifically constrained to:

* capture first and last names
* confirm recovered names
* escalate intelligently on uncertainty
* avoid hallucination

---

# Voice Configuration

| Setting                   | Value                 |
| ------------------------- | --------------------- |
| Language                  | English (India)       |
| Voice                     | Analytical Tech Voice |
| Conversational Model      | GPT-4.1               |
| Denoising                 | Remove Noise          |
| Vocabulary Specialization | Medical               |
| Response Eagerness        | 1                     |
| Interruption Sensitivity  | 0.9                   |

These settings were tuned for:

* healthcare-style intake interactions
* reduced conversational interruption
* clearer spelling recovery
* difficult-name recognition

---

# 2. Conversational Intelligence Layer

The conversational orchestration is handled using:

| Component          | Technology |
| ------------------ | ---------- |
| Conversational LLM | GPT-4.1    |

GPT-4.1 is used for:

* conversational flow control
* retry orchestration
* adaptive confirmations
* recovery prompts
* maintaining concise professional interactions

The LLM is intentionally restricted through a strict system prompt to:

* avoid hallucinating names
* prevent scope expansion
* preserve deterministic routing
* keep the interaction focused solely on name capture

---

# 3. ASR / Transcription Layer

The system receives live ASR transcripts from the voice pipeline.

The backend assumes transcripts may contain:

* phonetic distortion
* spacing errors
* punctuation issues
* partial captures
* filler words
* transcription ambiguity

Example:

```txt
"uh my name is anjeli obrien"
```

Before recovery:

* filler words are removed
* normalization occurs
* phonetic reconstruction begins

---

# 4. Name Correction Backend

The backend is an HTTP-based recovery engine responsible for converting noisy ASR transcripts into corrected structured names.

Responsibilities:

* ASR artifact cleanup
* normalization
* phonetic correction
* fuzzy matching
* confidence scoring
* retry-aware escalation
* deterministic routing

The backend is intentionally separated from the conversational layer to:

* improve observability
* reduce hallucination risk
* support analytics
* preserve deterministic recovery
* simplify debugging
* enable reusable APIs

---

# Backend Recovery Pipeline

Input Name
↓
ASR Artifact Cleanup
↓
Normalization
↓
Direct Phonetic Map Matching
↓
NYSIIS Phonetic Matching
↓
Levenshtein Fuzzy Recovery
↓
Compound Name Reconstruction
↓
Confidence Aggregation
↓
Recovery Action Generation

---

# 5. ASR Artifact Cleanup

The system first removes:

* filler words
* punctuation artifacts
* repeated tokens
* speech hesitations

Example:

```txt
"uh my name is suzan"
```

becomes:

```txt
"suzan"
```

This significantly improves downstream phonetic matching quality.

---

# 6. Phonetic Recovery System

The strongest recovery layer uses a curated phonetic correction map.

Examples:

| ASR Output    | Corrected Name |
| ------------- | -------------- |
| anjeli        | Anjali         |
| nwin          | Nguyen         |
| eefa          | Aoife          |
| krishna murti | Krishnamurthy  |
| mccarty       | McCarthy       |

This handles common ASR distortions observed in real-world voice systems.

---

# 7. Fuzzy Matching Engine

If no direct mapping exists, the system performs:

* NYSIIS phonetic encoding
* Levenshtein distance comparison
* corpus similarity ranking

This allows recovery of:

* misspellings
* approximate pronunciations
* partial phonetic matches

while preserving deterministic confidence scoring.

---

# 8. Compound Name Reconstruction

The backend also repairs:

* apostrophes
* prefixes
* hyphenated surnames
* compound surnames

Examples:

| Input    | Output   |
| -------- | -------- |
| obrien   | O'Brien  |
| o connor | O'Connor |
| mccarty  | McCarthy |
| jean luc | Jean-Luc |

---

# 9. Confidence Scoring

The system returns:

* high
* medium
* low

confidence classifications.

Confidence is conservatively aggregated:

* weakest side wins
* first-name and last-name confidence are combined

---

# 10. Deterministic Recovery Routing

The backend does not merely return corrected names.

It also returns the next conversational action.

Examples:

| next_action     | Purpose                          |
| --------------- | -------------------------------- |
| confirm         | High confidence confirmation     |
| repeat_slowly   | Ask caller to repeat slowly      |
| spell_last_name | Request surname spelling         |
| spell_full_name | Request full spelling            |
| sms_fallback    | Escalate after repeated failures |

This allows the voice agent to branch intelligently instead of relying entirely on freeform LLM reasoning.

---

# API Overview

# Endpoint

```http
POST /correct-name
```

---

# Example Request

```json
{
  "first_name": "suzan",
  "last_name": "obrien",
  "attempt_number": 2
}
```

---

# Example Response

```json
{
  "first_name": "Susan",
  "last_name": "O'Brien",
  "full_name": "Susan O'Brien",
  "confidence": "high",
  "low_confidence_flag": false,
  "next_action": "confirm",
  "recovery_strategy": "phonetic_map_hit"
}
```

---

# Recovery Escalation Strategy

| Attempt | Behavior              |
| ------- | --------------------- |
| 1       | Standard confirmation |
| 2–3     | Repeat slowly         |
| 4–5     | Ask for spelling      |
| 6+      | SMS/manual fallback   |

---

# Retell Variable Mapping

| Response Field      | Retell Variable   |
| ------------------- | ----------------- |
| first_name          | corrected_first   |
| last_name           | corrected_last    |
| full_name           | corrected_full    |
| confidence          | name_confidence   |
| low_confidence_flag | needs_spelling    |
| next_action         | next_action       |
| recovery_strategy   | recovery_strategy |

These variables allow dynamic branching inside the Retell workflow.

---

# Optional LLM Reranking

The backend optionally supports:

* OpenAI reranking
* time-bounded low-confidence recovery

Environment variable:

```bash
OPENAI_API_KEY=your_key
```

The LLM rerank layer is only invoked:

* when deterministic recovery confidence is low
* to preserve low latency on standard requests

---

# Security & Privacy

The service intentionally minimizes sensitive data handling.

Only:

* first name
* last name
* retry count

are processed.

The system does NOT require:

* DOB
* MRN
* addresses
* SSN
* PHI
* medical history

---

# Known Limitations

* Extremely rare names may still require spelling fallback
* Strong accents combined with poor phone audio can degrade upstream ASR quality
* Multi-language code-switching remains challenging
* Corpus coverage can always be expanded further

---

# Ongoing Improvements

Currently improving:

* multilingual phonetic recovery
* pronunciation-aware correction
* retry-aware confidence calibration
* adaptive reranking
* contextual surname reconstruction
* dynamic phonetic weighting

---

# Repository

GitHub:
https://github.com/blizet/name_corrector

---

# Demo

Loom Walkthrough:
https://www.loom.com/share/4a63859ba52b4978a2dcd226cc61c62f

---

# License

MIT
