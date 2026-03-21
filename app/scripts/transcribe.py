"""
Prother local transcription via faster-whisper.

Usage:
  python transcribe.py <wav_file_path>     — transcribe audio
  python transcribe.py --preload           — download model only (lazy init)

Model size controlled by PROTHER_WHISPER_MODEL env var (default: base).
"""
import sys
import os

def get_model_size():
    return os.environ.get("PROTHER_WHISPER_MODEL", "base")

def load_model():
    from faster_whisper import WhisperModel
    return WhisperModel(get_model_size(), device="cpu", compute_type="int8")

def main():
    if len(sys.argv) < 2:
        print("ERROR:Usage: python transcribe.py <wav_file|--preload>", file=sys.stderr)
        sys.exit(1)

    try:
        from faster_whisper import WhisperModel  # noqa: F401
    except ImportError:
        print("ERROR:faster-whisper not installed. Run: pip install faster-whisper", file=sys.stderr)
        sys.exit(1)

    # --preload: just download the model and exit
    if sys.argv[1] == "--preload":
        load_model()
        print("MODEL_READY")
        return

    wav_path = sys.argv[1]
    if not os.path.exists(wav_path):
        print(f"ERROR:File not found: {wav_path}", file=sys.stderr)
        sys.exit(1)

    model = load_model()
    segments, info = model.transcribe(wav_path, beam_size=5, language="en")
    text = " ".join(segment.text for segment in segments).strip()

    print(text)

if __name__ == "__main__":
    main()
