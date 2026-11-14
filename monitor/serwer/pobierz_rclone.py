#!/usr/bin/env python3
"""
Pobiera brakujące archiwa UTA-RLDD przez Twoje konto Google (rclone, remote "gdrive"
z własnym client_id). Pliki są czytane prosto z folderu autorów zbioru
(--drive-root-folder-id), bez kopiowania na Twój Dysk. Każde archiwum jest
pobierane, rozpakowywane do rozpakowane/rldd i usuwane, żeby oszczędzać miejsce.

    python pobierz_rclone.py            # foldy 2-5
    python pobierz_rclone.py --foldy 2,3
Można przerwać i uruchomić ponownie: gotowe archiwa są pomijane, a przerwane pobieranie wznawia się.
"""
import argparse
import pathlib
import shutil
import subprocess
import zipfile

BAZA = pathlib.Path(__file__).resolve().parent
RLDD_ID = "1d_QwgpMXnLY_FmLYXDn7TLcw0D-svXEl"   # https://sites.google.com/view/utarldd/home
ZRODLO = ["gdrive:", "--drive-root-folder-id", RLDD_ID]
ZIPY = BAZA / "dane" / "UTA-RLDD"
CEL = BAZA / "rozpakowane" / "rldd"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--foldy", default="2,3,4,5")
    args = ap.parse_args()
    foldy = {f"Fold{n.strip()}" for n in args.foldy.split(",")}

    nazwy = subprocess.run(["rclone", "lsf", *ZRODLO, "--files-only"], check=True,
                           capture_output=True, text=True).stdout.split()
    nazwy = sorted(n for n in nazwy if n.endswith(".zip") and n.split("_")[0] in foldy)
    print(f"Do pobrania: {len(nazwy)} archiwów: {', '.join(nazwy)}", flush=True)
    ZIPY.mkdir(parents=True, exist_ok=True)
    CEL.mkdir(parents=True, exist_ok=True)

    for nazwa in nazwy:
        stem = pathlib.Path(nazwa).stem
        znacznik = CEL / f".ok_{stem}"
        if znacznik.exists() or (CEL / stem).is_dir() and not (ZIPY / nazwa).exists():
            print(f"[{nazwa}] już rozpakowany, pomijam", flush=True)
            continue
        zip_lok = ZIPY / nazwa
        print(f"[{nazwa}] pobieram (wolne na serwerze: {shutil.disk_usage(BAZA).free / 1e9:.0f} GB)", flush=True)
        subprocess.run(["rclone", "copy", *ZRODLO, str(ZIPY), "--include", nazwa,
                        "--stats", "60s", "--stats-one-line", "-v",
                        "--multi-thread-streams", "8", "--retries", "10"], check=True)
        print(f"[{nazwa}] rozpakowuję", flush=True)
        with zipfile.ZipFile(zip_lok) as z:
            z.extractall(CEL)
        znacznik.touch()
        zip_lok.unlink()
        print(f"[{nazwa}] gotowe", flush=True)
    print("WSZYSTKO POBRANE", flush=True)


if __name__ == "__main__":
    main()
