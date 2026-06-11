# Build-Spec: Talking Avatar (sprechender Kopf, kostenlose Stimme)

_Für den Lovable-Agenten. App: `fayamonkey/private-content-hub` (Lovable Cloud aktiv)._
_Referenz: ClaudeOS v0.14.1 (`public/talkinghead.html`) — dort bewährt umgesetzt._
_**Wichtig: nur kostenlose Stimme (edge-tts), KEIN ElevenLabs / kein bezahlter Dienst.**_

---

## Ziel
Ein **sprechender 3D-Avatar-Kopf** im Hub: bekommt Text, spricht ihn mit **kostenloser
Stimme**, und die Lippen bewegen sich synchron (Lip-Sync). Reine Web-Technik, privat.

---

## Architektur (zwei Teile)

```
[ Avatar-Komponente im Browser ]  ──ruft──►  [ Lovable Cloud Edge-Funktion "tts" ]
  TalkingHead.js + three.js                    edge-tts (Microsoft, GRATIS, kein Key)
  + HeadAudio (Lip-Sync)                        gibt MP3 zurück
        ▲                                              │
        └────────── spielt MP3 ab, HeadAudio ◄─────────┘
                    analysiert Amplitude → Visemes → Mundbewegung
```

- **Avatar + Lip-Sync = Client-Side** (CDN-Libraries). Kein Backend nötig.
- **Stimme = Lovable Cloud Edge-Funktion** (analog zu `get-cards`). edge-tts ist **gratis
  und ohne API-Key** — perfekt für die Vorgabe „keine Kosten".

---

## Teil 1 — Avatar-Komponente (Client)

Bibliotheken per CDN (exakt die in ClaudeOS bewährten Versionen):
- **three.js** `0.180.0` · **TalkingHead** `1.7` (met4citizen) · **HeadAudio** (met4citizen).
- Default-Avatar (GLB, gratis, gebündelt): `brunette.glb` von TalkingHead, oder eine eigene
  **Ready-Player-Me**-`.glb`-URL (kostenlos erstellbar auf readyplayer.me).

Referenz-URLs (aus ClaudeOS, funktionieren):
```
three:        https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js/+esm
three/addons: https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/
talkinghead:  https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/modules/talkinghead.mjs
HeadAudio:    https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@main  (dist/headaudio.min.mjs + headworklet.min.mjs)
Avatar:       https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/avatars/brunette.glb
```

Verhalten:
- TalkingHead mit `ttsEndpoint: null` initialisieren (wir nutzen NICHT die eingebaute TTS).
- HeadAudio an `head.audioSpeechGainNode` hängen (Amplitude → Visemes → Mund), wie in
  `talkinghead.html`.
- Eine Funktion `speak(text)`:
  1. holt die MP3 von der `tts`-Edge-Funktion (Teil 2),
  2. dekodiert sie (`audioCtx.decodeAudioData`),
  3. spielt sie über `head.audioSpeechGainNode` ab → HeadAudio macht den Lip-Sync.

**Vite/React-Hinweis (wichtig):** TalkingHead ist für eine HTML-`importmap` gebaut. In der
Vite/React-App stattdessen die ESM-URLs **dynamisch importieren** (`await import("https://…")`)
bzw. three als externes ESM behandeln. Bitte so integrieren, dass three NICHT doppelt
gebündelt wird. Die `headworklet`-AudioWorklet wird per `audioWorklet.addModule(<CDN-URL>)`
geladen.

---

## Teil 2 — TTS-Edge-Funktion (kostenlos)

Eine Lovable-Cloud-/Edge-Funktion **`tts`**:
- Input: `text`, optional `voice` (Default eine freie Microsoft-Neural-Stimme, z.B.
  `en-US-AvaNeural` oder eine deutsche wie `de-DE-KatjaNeural`), optional `rate`/`pitch`.
- Nutzt **edge-tts** (Microsoft Edge „Read Aloud"-TTS) — **kostenlos, KEIN API-Key**.
  In Deno via einer edge-tts-kompatiblen Library oder direktem Aufruf des MS-Endpoints.
  (Genau dieser Dienst wird in ClaudeOS verwendet — dort über ein Python-`speak.py`.)
- Output: **MP3-Audio** (Content-Type `audio/mpeg`).
- **Kein Key, kein Secret nötig** (edge-tts ist anonym/gratis).

**Fallback, falls edge-tts in Deno zu aufwändig ist:** Browser-eigenes
`window.speechSynthesis` direkt im Client (gratis, kein Backend) — aber der Lip-Sync ist
dann nur angenähert (kein Audio-Buffer für die Amplituden-Analyse). edge-tts ist die
bevorzugte Lösung wegen des sauberen Lip-Syncs.

---

## Darstellung im Hub
- Neuer Space/Widget **„🗣️ Avatar"** (eigener Raum oder Ecke auf dem Home/OS-Desktop).
- Eingabefeld + „Sprechen"-Button (Text → `speak(text)`).
- Optional Stimmen-Auswahl (mehrere freie Microsoft-Stimmen, DE + EN).
- **Phase 2 (später, nicht jetzt):** Antworten von Lovable Cloud AI generieren lassen,
  sodass der Avatar „chattet". Für jetzt reicht: gegebenen Text sprechen.

---

## Akzeptanzkriterien
- [ ] 3D-Avatar-Kopf lädt im Hub (Default-GLB), dreht/rendert sauber.
- [ ] „Sprechen" → Avatar spricht den Text mit **kostenloser** Stimme.
- [ ] **Lippen bewegen sich synchron** zur Audio (HeadAudio-Amplitude).
- [ ] TTS läuft über die `tts`-Edge-Funktion, **kein Key, keine Kosten**.
- [ ] Funktioniert auf Desktop. (Mobile optional — 3D ist dort schwerer.)
- [ ] Bestehende Spaces (Karten, Ideas, Wins, Transcripts) bleiben unverändert.

---

## Hinweise / Stolpersteine
- **Kosten:** edge-tts gratis. Falls eine Library doch einen Key will → NICHT verwenden,
  dann lieber der SpeechSynthesis-Fallback.
- **Performance:** three.js-3D ist auf Desktop locker, auf Mobile RAM-/Akku-intensiv.
- **CORS/AudioWorklet:** HeadAudio lädt eine Worklet von jsdelivr — Cross-Origin sollte gehen.
- **Privacy:** Alles clientseitig + gratis-TTS; kein Token/Key im Browser. Passt zur Architektur.
