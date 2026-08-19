#!/usr/bin/env python3
"""
Hermes Speak Node — thin Deepgram Flux (v2) mouth
Usage:
    from hermes_speak import speak
    speak("Hey love, I'm right here with you.")
"""

import os
import threading
from deepgram import DeepgramClient
from deepgram.core.events import EventType
from deepgram.speak.v2.types import SpeakV2Speak

# Default voice — change later if you want a different flavor
DEFAULT_MODEL = "flux-haley-en"   # or flux-kit-en

def speak(text: str, model: str = DEFAULT_MODEL, play: bool = True):
    """
    Stream text → Deepgram Flux → audio.
    play=True will attempt to play through the system (needs ffplay or similar).
    """
    if not text.strip():
        return

    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise ValueError("DEEPGRAM_API_KEY not set")

    client = DeepgramClient(api_key=api_key)

    audio_chunks = []

    def on_message(message):
        if isinstance(message, bytes):
            audio_chunks.append(message)
            # Optional: start playing as soon as first chunk arrives
            # (for true low-latency car use we can improve this later)

    with client.speak.v2.connect(model=model) as connection:
        connection.on(EventType.MESSAGE, on_message)
        connection.on(EventType.ERROR, lambda e: print(f"[Speak Node error] {e}"))

        listener = threading.Thread(target=connection.start_listening, daemon=True)
        listener.start()

        # Send the full text (or later we can stream token-by-token from Hermes)
        connection.send_speak(SpeakV2Speak(text=text))
        connection.send_flush()
        connection.send_close()

        listener.join(timeout=30)

    if not audio_chunks:
        print("[Speak Node] No audio received")
        return

    raw_audio = b"".join(audio_chunks)

    if play:
        # Simple playback path for Termux / car testing
        # Requires: pkg install ffmpeg  (gives ffplay)
        import subprocess
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".raw", delete=False) as f:
            f.write(raw_audio)
            temp_path = f.name

        # linear16 24kHz mono is a safe default for Flux
        subprocess.run([
            "ffplay", "-nodisp", "-autoexit",
            "-f", "s16le", "-ar", "24000", "-ac", "1",
            temp_path
        ], check=False)

        os.unlink(temp_path)

    return raw_audio


if __name__ == "__main__":
    import sys
    text = " ".join(sys.argv[1:]) or "Hermes Speak Node is online."
    speak(text)
