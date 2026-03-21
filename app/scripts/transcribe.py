"""
Prother local transcription via faster-whisper.
Usage: python transcribe.py <wav_file_path>
Prints the transcribed text to stdout.
"""
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("ERROR:Usage: python transcribe.py <wav_file>", file=sys.stderr)
        sys.exit(1)

    wav_path = sys.argv[1]
    if not os.path.exists(wav_path):
        print(f"ERROR:File not found: {wav_path}", file=sys.stderr)
        sys.exit(1)

    model_size = os.environ.get("PROTHER_WHISPER_MODEL", "tiny")

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("ERROR:faster-whisper not installed. Run: pip install faster-whisper", file=sys.stderr)
        sys.exit(1)

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(wav_path, beam_size=5)
    text = " ".join(segment.text for segment in segments).strip()

    # Print just the text to stdout (extension reads this)
    print(text)

if __name__ == "__main__":
    main()
