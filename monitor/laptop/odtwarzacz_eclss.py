"""
Odtwarzacz prawdziwej telemetrii kabiny ISS z NASA OSDR (Environmental Data App API)
jako źródło "1. Czujniki stacji (ECLSS)" dla panelu.

Dane: temperatura, wilgotność, CO2 (co 5 min) i dobowa dawka promieniowania z wybranej misji.
Pobierane raz i zapisywane w dane_osdr/, potem odtwarzane w przyspieszonym tempie.

    python odtwarzacz_eclss.py                     # misja RR-1, tempo x60 (5 min danych co 5 s)
    python odtwarzacz_eclss.py --misja RR-9 --tempo 300
    python odtwarzacz_eclss.py --lista             # dostępne misje

API: https://visualization.osdr.nasa.gov/eda/api/
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import time
import urllib.request

TU = pathlib.Path(__file__).resolve().parent
API = "https://visualization.osdr.nasa.gov/eda/api/missions/"
CACHE = TU / "dane_osdr"


def pobierz(sciezka: str):
    with urllib.request.urlopen(API + sciezka, timeout=120) as r:
        return json.load(r)


def dane_misji(misja: str):
    CACHE.mkdir(exist_ok=True)
    plik = CACHE / f"{misja}.json"
    if not plik.exists():
        print(f"Pobieram telemetrię misji {misja} z NASA OSDR…")
        d = {"telemetria": pobierz(f"{misja}/telemetry_data/"), "promieniowanie": pobierz(f"{misja}/radiation_data/")}
        plik.write_text(json.dumps(d), encoding="utf-8")
    return json.loads(plik.read_text(encoding="utf-8"))


def wyslij(panel: str, pomiary: list[dict]) -> bool:
    req = urllib.request.Request(panel.rstrip("/") + "/api/pomiary", data=json.dumps(pomiary).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5):
            return True
    except OSError:
        return False


def main():
    ap = argparse.ArgumentParser(description="Odtwarzacz telemetrii ISS (NASA OSDR) dla panelu")
    ap.add_argument("--misja", default="RR-1")
    ap.add_argument("--tempo", type=float, default=60.0, help="ile sekund danych na 1 s rzeczywisty")
    ap.add_argument("--panel", default="http://127.0.0.1:8765")
    ap.add_argument("--lista", action="store_true")
    args = ap.parse_args()

    if args.lista:
        for m in pobierz(""):
            print(m if isinstance(m, str) else f"{m.get('name', m)}: {m.get('title', '')}")
        return

    d = dane_misji(args.misja)
    tel = [r for r in d["telemetria"] if r.get("time")]
    rad = {r["time"][:10]: r.get("total") for r in d["promieniowanie"] if r.get("time")}
    zrodlo = f"ISS / OSDR {args.misja}"
    print(f"{len(tel)} pomiarów kabiny ({tel[0]['time']} – {tel[-1]['time']}), {len(rad)} dni promieniowania; "
          f"tempo x{args.tempo:g}. Ctrl+C kończy.")
    t_pocz = lambda r: dt.datetime.fromisoformat(r["time"].replace("Z", "+00:00"))
    while True:
        poprz = None
        for r in tel:
            if poprz is not None:
                time.sleep(max(0.2, (t_pocz(r) - t_pocz(poprz)).total_seconds() / args.tempo))
            poprz = r
            pom = []
            for pole, klucz in (("temperature_iss", "temperatura_kabiny"), ("humidity_iss", "wilgotnosc_kabiny"),
                                ("co2_iss", "co2_kabiny")):
                if r.get(pole) is not None:
                    pom.append({"parametr": klucz, "wartosc": r[pole], "zrodlo": zrodlo, "czas_danych": r["time"]})
            dawka = rad.get(r["time"][:10])
            if dawka is not None:
                pom.append({"parametr": "promieniowanie_dobowe", "wartosc": dawka, "zrodlo": zrodlo, "czas_danych": r["time"]})
            if pom and not wyslij(args.panel, pom):
                print("Panel nie odpowiada (uruchom: python panel.py); ponawiam…")
                time.sleep(3)
        print("Koniec danych misji, odtwarzam od początku.")


if __name__ == "__main__":
    main()
