#!/usr/bin/env python3
"""Batch pitch-shift piano samples up and down by one octave.

This utility reads the twelve base-note files in the Piano/ directory
and writes 24 additional files (one octave down / up for each note).

Requirements:
    pip install librosa soundfile

Usage:
    python scripts/pitch_shift_samples.py \
        --input-dir Piano \
        --output-dir Piano \
    --down-up-steps -12 12

The script preserves the original sample rate (or resamples if requested)
and writes output files as WAV to avoid lossy re-encoding artifacts. Each
output file is named <original>_m1.wav or <original>_p1.wav.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

import librosa
import soundfile as sf


def iter_audio_files(root: Path) -> Iterable[Path]:
    """Yield audio files in *root* matching standard extensions."""
    for pattern in ("*.wav", "*.mp3", "*.ogg", "*.flac", "*.m4a", "*.aiff", "*.aif", "*.aifc"):
        for path in sorted(root.glob(pattern)):
            # Skip files we already generated (they include underscores in the stem)
            if "_" in path.stem:
                continue
            yield path


def pitch_shift_file(
    src_path: Path,
    dst_dir: Path,
    semitone_shift: float,
    target_sample_rate: int | None,
) -> Path:
    """Pitch-shift *src_path* and write result into *dst_dir*.

    Returns the output path for logging.
    """
    y, sr = librosa.load(src_path, sr=target_sample_rate)
    shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=semitone_shift)

    suffix = "p" if semitone_shift >= 0 else "m"
    step = int(abs(semitone_shift)) if semitone_shift.is_integer() else semitone_shift
    out_name = f"{src_path.stem}_{suffix}{step}.mp3"
    out_path = dst_dir / out_name
    sf.write(out_path, shifted, sr)
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path("Piano"),
        help="Directory containing the original 12 piano samples.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("Piano"),
        help="Directory where the shifted samples will be written.",
    )
    parser.add_argument(
        "--down-up-steps",
        type=float,
        nargs="+",
        default=(-12.0, 12.0),
        help="Semitone offsets to generate (default: -12 and +12 for octaves).",
    )
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=None,
        help="Optional resample rate. Keep original rate if omitted.",
    )
    args = parser.parse_args()

    input_dir = args.input_dir.resolve()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    base_files = list(iter_audio_files(input_dir))
    if not base_files:
        raise SystemExit(f"No audio files found in {input_dir}")

    steps = list(dict.fromkeys(args.down_up_steps))  # drop duplicates while preserving order
    generated = []
    for src_path in base_files:
        for step in steps:
            out_path = pitch_shift_file(src_path, output_dir, step, args.sample_rate)
            generated.append(out_path)
            print(f"Wrote {out_path.relative_to(output_dir.parent)}")

    expected = len(base_files) * len(steps)
    print(f"Created {len(generated)} files (expected {expected}).")


if __name__ == "__main__":
    main()
