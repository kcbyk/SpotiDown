import argparse
import json
import sys
from pathlib import Path

import soundfile as sf
import torch
from demucs.apply import apply_model
from demucs.pretrained import get_model


def write_event(state, message):
    print(json.dumps({"state": state, "message": message}, ensure_ascii=False), flush=True)


def fail(message, code=1):
    print(json.dumps({"state": "error", "message": message}, ensure_ascii=False), file=sys.stderr, flush=True)
    raise SystemExit(code)


def read_wav(path, channels, samplerate):
    data, sr = sf.read(str(path), dtype="float32", always_2d=True)
    if sr != samplerate:
        fail(f"Beklenen örnekleme hızı {samplerate} Hz, dosya {sr} Hz.")

    wav = torch.from_numpy(data.T).float()
    if wav.shape[0] == channels:
        return wav

    if wav.shape[0] == 1 and channels == 2:
        return wav.repeat(2, 1)

    if wav.shape[0] > channels:
        return wav[:channels]

    padding = torch.zeros(channels - wav.shape[0], wav.shape[1])
    return torch.cat([wav, padding], dim=0)


def save_wav(path, wav, samplerate):
    path.parent.mkdir(parents=True, exist_ok=True)
    clipped = wav.detach().cpu().clamp(-1, 1)
    sf.write(str(path), clipped.numpy().T, samplerate, subtype="PCM_16")


def main():
    parser = argparse.ArgumentParser(description="Separate vocals and instrumental stems with Demucs.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--model", default="htdemucs")
    parser.add_argument("--segment", type=float, default=7.0)
    args = parser.parse_args()

    if not args.input.exists():
        fail("Girdi WAV dosyası bulunamadı.")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    write_event("loading_model", f"AI model yükleniyor ({device}).")

    model = get_model(args.model)
    model.to(device)
    model.eval()

    if "vocals" not in model.sources:
        fail("Seçilen model vokal kanalı üretmiyor.")

    write_event("loading_audio", "Ses dosyası AI için hazırlanıyor.")
    wav = read_wav(args.input, model.audio_channels, model.samplerate)

    ref = wav.mean(0)
    ref_mean = ref.mean()
    ref_std = ref.std()
    if float(ref_std) < 1e-8:
        ref_std = torch.tensor(1.0)

    wav = (wav - ref_mean) / ref_std

    write_event("separating", "Vokal ve beat AI ile ayrılıyor.")
    with torch.no_grad():
        sources = apply_model(
            model,
            wav[None],
            device=device,
            shifts=1,
            split=True,
            overlap=0.25,
            progress=False,
            num_workers=0,
            segment=args.segment,
        )[0]

    sources = sources * ref_std + ref_mean
    sources = sources.detach().cpu()

    vocals_index = model.sources.index("vocals")
    vocals = sources[vocals_index]
    instrumental = torch.zeros_like(vocals)
    for index, source in enumerate(sources):
        if index != vocals_index:
            instrumental += source

    vocals_path = args.output / "vocals.wav"
    instrumental_path = args.output / "instrumental.wav"

    write_event("saving", "Temiz stem dosyaları kaydediliyor.")
    save_wav(vocals_path, vocals, model.samplerate)
    save_wav(instrumental_path, instrumental, model.samplerate)

    manifest = {
        "model": args.model,
        "samplerate": model.samplerate,
        "sources": list(model.sources),
        "vocals": str(vocals_path),
        "instrumental": str(instrumental_path),
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    write_event("ready", "AI ayırma tamamlandı.")


if __name__ == "__main__":
    main()
