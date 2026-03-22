"""
Prother local transcription via Moonshine ONNX.

Usage:
  python transcribe.py <wav_file_path>     — transcribe audio
  python transcribe.py --preload           — download model only (lazy init)

Model controlled by PROTHER_MOONSHINE_MODEL env var (default: moonshine/base).
"""
import sys
import os

def get_model():
    return os.environ.get("PROTHER_MOONSHINE_MODEL", "moonshine/base")

def main():
    if len(sys.argv) < 2:
        print("ERROR:Usage: python transcribe.py <wav_file|--preload>", file=sys.stderr)
        sys.exit(1)

    try:
        import moonshine_onnx
    except ImportError:
        print("ERROR:moonshine not installed. Run: pip install useful-moonshine-onnx", file=sys.stderr)
        sys.exit(1)

    model = get_model()

    # --preload: download model and exit
    if sys.argv[1] == "--preload":
        # Generate a tiny silent WAV to trigger model download
        import numpy as np
        import tempfile, wave
        silence = np.zeros(16000, dtype=np.int16)  # 1s silence at 16kHz
        tmp = os.path.join(tempfile.gettempdir(), "prother_preload.wav")
        with wave.open(tmp, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(silence.tobytes())
        moonshine_onnx.transcribe(tmp, model)
        os.remove(tmp)
        print("MODEL_READY")
        return

    wav_path = sys.argv[1]
    if not os.path.exists(wav_path):
        print(f"ERROR:File not found: {wav_path}", file=sys.stderr)
        sys.exit(1)

    result = moonshine_onnx.transcribe(wav_path, model)
    text = " ".join(result).strip() if isinstance(result, list) else str(result).strip()
    print(text)

if __name__ == "__main__":
    main()
