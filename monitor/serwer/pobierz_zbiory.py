#!/usr/bin/env python3
"""
Pobiera publiczne zbiory z PDF-a prosto na serwer (z Dysku Google autorów).

    python pobierz_zbiory.py                 # UBFC-rPPG (DATASET_2) + cały UTA-RLDD
    python pobierz_zbiory.py --rldd-foldy 1  # tylko fold 1 UTA-RLDD (~22 GB)

Można przerwać i uruchomić ponownie: gotowe pliki są pomijane.
UTA-RLDD: każde archiwum jest rozpakowywane do rozpakowane/rldd i od razu usuwane (oszczędza ~111 GB).
"""
import argparse
import pathlib
import shutil
import time
import zipfile

import gdown
import requests

BAZA = pathlib.Path(__file__).resolve().parent
UBFC_ID = "1o0XU4gTIo46YfwaWjIgbtCncc-oF44Xk"   # https://sites.google.com/view/ybenezeth/ubfcrppg
RLDD_ID = "1d_QwgpMXnLY_FmLYXDn7TLcw0D-svXEl"   # https://sites.google.com/view/utarldd/home


def pobierz_plik(fid: str, cel: pathlib.Path, proby: int = 32):
    """Pobieranie z Dysku Google z wznawianiem (nagłówek Range)."""
    cel.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
    for k in range(proby):
        mam = cel.stat().st_size if cel.exists() else 0
        try:
            with requests.get(url, headers={"Range": f"bytes={mam}-"} if mam else {}, stream=True, timeout=60) as r:
                if r.status_code == 416:
                    return
                if "text/html" in r.headers.get("content-type", ""):
                    raise RuntimeError("Google zwrócił stronę HTML zamiast pliku (limit pobrań, spróbuj później)")
                r.raise_for_status()
                if r.status_code != 206:
                    mam = 0
                calosc = mam + int(r.headers.get("content-length", 0))
                t0, t_druk, n = time.time(), 0.0, 0
                with open(cel, "ab" if mam else "wb") as f:
                    for blok in r.iter_content(8 << 20):
                        f.write(blok)
                        n += len(blok)
                        if time.time() - t_druk > 30:
                            t_druk = time.time()
                            print(f"  {cel.name}: {(mam + n) / 1e9:.2f}/{calosc / 1e9:.2f} GB "
                                  f"({n / 1e6 / max(time.time() - t0, 1e-3):.1f} MB/s)", flush=True)
            if cel.stat().st_size >= calosc:
                return
        except Exception as e:
            limit = "limit pobrań" in str(e)
            print(f"  błąd ({k + 1}/{proby}): {type(e).__name__}: {str(e)[:120]}"
                  + (" -> czekam 15 min" if limit else ""), flush=True)
            time.sleep(900 if limit else 60 * (k + 1))
    raise RuntimeError(f"Nie udało się pobrać {cel.name}")


def lista(fid: str):
    return gdown.download_folder(id=fid, skip_download=True, quiet=True)


def ubfc():
    cel = BAZA / "dane" / "UBFC-rPPG"
    pliki = [f for f in lista(UBFC_ID) if f.path.startswith("DATASET_2/")]
    print(f"UBFC-rPPG DATASET_2: {len(pliki)} plików", flush=True)
    for i, f in enumerate(pliki, 1):
        out = cel / f.path
        if out.exists() and (BAZA / "dane" / "UBFC-rPPG" / ".ok" / f.path.replace("/", "_")).exists():
            continue
        print(f"[UBFC {i}/{len(pliki)}] {f.path}", flush=True)
        pobierz_plik(f.id, out)
        znak = cel / ".ok" / f.path.replace("/", "_")
        znak.parent.mkdir(parents=True, exist_ok=True)
        znak.touch()


def rldd(foldy: set[int]):
    zipy_dir = BAZA / "dane" / "UTA-RLDD"
    rozp = BAZA / "rozpakowane" / "rldd"
    zipy_dir.mkdir(parents=True, exist_ok=True)
    rozp.mkdir(parents=True, exist_ok=True)
    for f in lista(RLDD_ID):
        fold = int(f.path.split("_")[0].replace("Fold", ""))
        if fold not in foldy:
            continue
        znak = rozp / f".ok_{pathlib.Path(f.path).stem}"
        if znak.exists():
            print(f"[RLDD] {f.path}: już rozpakowany", flush=True)
            continue
        z = zipy_dir / f.path
        print(f"[RLDD] pobieram {f.path} (wolne miejsce: {shutil.disk_usage(BAZA).free / 1e9:.0f} GB)", flush=True)
        pobierz_plik(f.id, z)
        print(f"[RLDD] rozpakowuję {f.path}", flush=True)
        with zipfile.ZipFile(z) as zz:
            zz.extractall(rozp)
        znak.touch()
        z.unlink()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rldd-foldy", default="1,2,3,4,5")
    ap.add_argument("--bez-ubfc", action="store_true")
    ap.add_argument("--bez-rldd", action="store_true")
    a = ap.parse_args()
    bledy = []
    zadania = []
    if not a.bez_rldd:
        zadania.append(("UTA-RLDD", lambda: rldd({int(x) for x in a.rldd_foldy.split(",")})))
    if not a.bez_ubfc:
        zadania.append(("UBFC-rPPG", ubfc))
    for nazwa, fn in zadania + zadania:  # druga runda ponawia to, co trafiło na limit
        try:
            fn()
        except Exception as e:
            print(f"!!! {nazwa}: {e}", flush=True)
            bledy.append(nazwa)
    print("POBIERANIE_ZAKONCZONE", flush=True)


if __name__ == "__main__":
    main()
