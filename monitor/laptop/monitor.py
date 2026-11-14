"""
Monitor dobrostanu na zywo: kamera + mikrofon laptopa.

Uruchomienie:
    python monitor.py                 (kamera 0, modele z folderu ./modele)
    python monitor.py --bez-glosu     (bez mikrofonu)
    python monitor.py --kamera 1

Prywatnosc: obraz i dzwiek sa przetwarzane tylko w pamieci RAM. Na dysk trafia wylacznie
plik CSV z liczbami (zmeczenie, emocje). Zadne klatki ani nagrania nie sa zapisywane.

To NIE jest wyrob medyczny. Wyniki sa szacunkowe.
"""
from __future__ import annotations

import argparse
import collections
import csv
import json
import pathlib
import threading
import time
import urllib.request

import cv2
import numpy as np

import cechy as C
import glos_biomarkery as GB

TU = pathlib.Path(__file__).resolve().parent

# --------------------------------------------------------------------------- glos
class WatekGlosu(threading.Thread):
    """Nagrywa mikrofon do bufora w RAM i co ~1.5 s analizuje ostatnie 4 s mowy:
    emocje (wav2vec2, jesli jest model) oraz biomarkery akustyczne (Praat)."""

    def __init__(self, model: C.OnnxModel | None, baza: GB.BazaGlosu):
        super().__init__(daemon=True)
        import sounddevice as sd

        self.model = model
        self.baza = baza
        self.t_bio = 0.0
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.prawd: np.ndarray | None = None
        self.t_ostatni = 0.0
        self.mowa = False
        self._rms_hist: collections.deque = collections.deque(maxlen=40)
        try:
            sd.check_input_settings(samplerate=C.AUDIO_SR, channels=1)
            self.sr = C.AUDIO_SR
        except Exception:
            self.sr = int(sd.query_devices(kind="input")["default_samplerate"])
        self.buf = np.zeros(self.sr * 4, np.float32)
        self.strumien = sd.InputStream(samplerate=self.sr, channels=1, dtype="float32", callback=self._cb)

    def _cb(self, indata, frames, t, status):
        x = indata[:, 0]
        with self.lock:
            n = min(len(x), len(self.buf))
            self.buf = np.roll(self.buf, -n)
            self.buf[-n:] = x[-n:]

    def run(self):
        self.strumien.start()
        while not self.stop.wait(1.5):
            with self.lock:
                w = self.buf.copy()
            if self.sr != C.AUDIO_SR:
                from scipy.signal import resample_poly

                w = resample_poly(w, C.AUDIO_SR, self.sr).astype(np.float32)
            w = C.dopasuj_dlugosc(w)
            # prosta detekcja mowy: glosnosc ostatnich 1.5 s wzgledem tla
            rms = float(np.sqrt(np.mean(w[-int(1.5 * C.AUDIO_SR):] ** 2)))
            self._rms_hist.append(rms)
            tlo = float(np.percentile(self._rms_hist, 20))
            self.mowa = rms > max(0.008, 2.5 * tlo)
            if not self.mowa:
                continue
            try:
                b = GB.analizuj(w, C.AUDIO_SR)
            except Exception as e:
                print("Blad analizy glosu:", e)
                b = None
            if b is not None:
                self.baza.dodaj(b)
                self.t_bio = time.perf_counter()
            if self.model is not None:
                p = C.softmax(self.model(C.normalizuj_audio(w)[None]))[0]
                self.prawd = p if self.prawd is None else 0.5 * self.prawd + 0.5 * p
                self.t_ostatni = time.perf_counter()
        self.strumien.stop()
        self.strumien.close()

# --------------------------------------------------------------------------- panel na zywo
class NadajnikPanelu(threading.Thread):
    """Co 2 s wysyla najnowsze wskazniki (same liczby) do lokalnego panelu (panel.py). Nie blokuje kamery."""

    def __init__(self, url: str):
        super().__init__(daemon=True)
        self.url = url.rstrip("/") + "/api/pomiary"
        self.lock = threading.Lock()
        self.dane: dict = {}
        self.stop = threading.Event()
        self._blad = False

    def ustaw(self, dane: dict):
        with self.lock:
            self.dane = {k: float(v) for k, v in dane.items() if v is not None and np.isfinite(v)}

    def run(self):
        while not self.stop.wait(2.0):
            with self.lock:
                d = dict(self.dane)
            if not d:
                continue
            pom = [{"parametr": k, "wartosc": v, "zrodlo": "laptop: kamera/glos"} for k, v in d.items()]
            req = urllib.request.Request(self.url, data=json.dumps(pom).encode(),
                                         headers={"Content-Type": "application/json"}, method="POST")
            try:
                urllib.request.urlopen(req, timeout=2).close()
                if self._blad:
                    print("Panel znow odpowiada.")
                self._blad = False
            except OSError:
                if not self._blad:
                    print("Panel nie odpowiada (uruchom: python panel.py); dzialam dalej bez niego.")
                self._blad = True

def ocen_jakosc(buf) -> dict:
    """Jakosc obrazu 0-100 z ostatnich 10 s: obecnosc twarzy x jasnosc x ostrosc."""
    if not buf:
        return {"jakosc": float("nan"), "obecnosc": float("nan"), "jasnosc": float("nan")}
    a = np.array(buf, float)
    obecnosc = float(a[:, 1].mean())
    tw = a[a[:, 1] > 0]
    if len(tw) == 0:
        return {"jakosc": 0.0, "obecnosc": 0.0, "jasnosc": float("nan")}
    jas, ostr = float(np.median(tw[:, 2])), float(np.median(tw[:, 3]))
    f_jas = float(np.clip(1 - abs(jas - 125) / 90, 0, 1))      # idealnie ~125, zle ponizej 35 i powyzej 215
    f_ostr = float(np.clip((ostr - 10) / 60, 0, 1))             # wariancja laplasjanu twarzy 64x64
    return {"jakosc": 100 * obecnosc * float(np.sqrt(f_jas * f_ostr)), "obecnosc": 100 * obecnosc, "jasnosc": jas}

# --------------------------------------------------------------------------- rysowanie
def pasek(img, x, y, w, wart, kolor):
    cv2.rectangle(img, (x, y), (x + w, y + 10), (60, 60, 60), -1)
    if np.isfinite(wart):
        cv2.rectangle(img, (x, y), (x + int(w * np.clip(wart, 0, 100) / 100), y + 10), kolor, -1)

def kolor_skali(v, odwroc=False):
    """Zielony -> czerwony dla 0..100 (odwroc=True: 100 = dobrze)."""
    if not np.isfinite(v):
        return (160, 160, 160)
    v = 100 - v if odwroc else v
    return (0, int(255 * (1 - v / 100)), int(255 * v / 100))

def tekst(img, s, x, y, skala=0.5, kolor=(255, 255, 255)):
    cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX, skala, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX, skala, kolor, 1, cv2.LINE_AA)

def fmt(v, wzor="{:.0f}"):
    return wzor.format(v) if v is not None and np.isfinite(v) else "--"

SZER_PANELU = 300

def panel_glosu(h, glos, bio, z, napiecie, zm_glos, swiezy):
    """Boczny panel z biomarkerami glosu (rysowany obok obrazu z kamery)."""
    p = np.full((h, SZER_PANELU, 3), 25, np.uint8)
    y = 22
    tekst(p, "BIOMARKERY GLOSU", 10, y, 0.5, (0, 220, 255)); y += 22
    if glos is None:
        tekst(p, "mikrofon wylaczony", 10, y, 0.45, (160, 160, 160))
        return p
    b = glos.baza
    if not b.gotowa:
        tekst(p, f"Kalibracja bazy: {b.postep():.0%}", 10, y, 0.45, (0, 200, 255)); y += 16
        tekst(p, "mow normalnie przez ~30 s", 10, y, 0.38, (160, 160, 160)); y += 20
    else:
        tekst(p, "kreska = odchylenie od Twojej bazy", 10, y, 0.36, (160, 160, 160)); y += 20
    if bio is None:
        tekst(p, "czekam na mowe...", 10, y, 0.45, (160, 160, 160))
        return p
    kol = (255, 255, 255) if swiezy else (150, 150, 150)
    for k, etyk, wz, _ in GB.BIOMARKERY:
        tekst(p, etyk, 10, y, 0.4, kol)
        tekst(p, fmt(bio[k], wz), 175, y, 0.4, kol)
        if k in z:
            zz = float(np.clip(z[k], -3, 3))
            kz = (0, 200, 0) if abs(zz) < 1 else (0, 200, 255) if abs(zz) < 2 else (0, 0, 255)
            cx = 265
            cv2.line(p, (cx, y - 4), (cx + int(zz * 10), y - 4), kz, 4)
            cv2.line(p, (cx, y - 9), (cx, y + 1), (120, 120, 120), 1)
        y += 19
    y += 8
    tekst(p, f"Napiecie w glosie: {fmt(napiecie)}/100", 10, y, 0.45, kolor_skali(napiecie)); pasek(p, 10, y + 5, 270, napiecie, kolor_skali(napiecie)); y += 34
    tekst(p, f"Zmeczenie w glosie: {fmt(zm_glos)}/100", 10, y, 0.45, kolor_skali(zm_glos)); pasek(p, 10, y + 5, 270, zm_glos, kolor_skali(zm_glos)); y += 30
    tekst(p, "50 = jak w bazie (heurystyka)", 10, y, 0.35, (140, 140, 140))
    return p

# --------------------------------------------------------------------------- glowna petla
def main():
    ap = argparse.ArgumentParser(description="Monitor zmeczenia, emocji i biomarkerow glosu (kamera + mikrofon)")
    ap.add_argument("--kamera", type=int, default=0)
    ap.add_argument("--modele", default=str(TU / "modele"))
    ap.add_argument("--bez-glosu", action="store_true")
    ap.add_argument("--log", default=str(TU / "wyniki.csv"))
    ap.add_argument("--nowa-baza-glosu", action="store_true", help="skasuj zapisana baze glosu i skalibruj od nowa")
    ap.add_argument("--panel", default="http://127.0.0.1:8765", help="adres panelu na zywo ('' = wylacz)")
    args = ap.parse_args()

    md = pathlib.Path(args.modele)
    md.mkdir(parents=True, exist_ok=True)
    landmarker = md / "face_landmarker.task"
    if not landmarker.exists():
        print("Pobieram model MediaPipe FaceLandmarker (jednorazowo, ~4 MB)...")
        urllib.request.urlretrieve(C.FACE_LANDMARKER_URL, landmarker)

    def wczytaj(nazwa, opis):
        p = md / nazwa
        if p.exists():
            print(f"[OK]   {opis}: {nazwa}")
            return C.OnnxModel(p)
        print(f"[BRAK] {opis}: {nazwa} (ta funkcja bedzie wylaczona lub uproszczona)")
        return None

    m_oczy = wczytaj("oczy.onnx", "stan oczu")
    m_twarz = wczytaj("emocje_twarz.onnx", "emocje z twarzy")
    m_zm = wczytaj("zmeczenie.onnx", "poziom zmeczenia")
    m_glos = None if args.bez_glosu else wczytaj("emocje_glos.onnx", "emocje z glosu")
    konfig = json.loads((md / "konfig.json").read_text()) if (md / "konfig.json").exists() else {}

    sciezka_bazy = TU / "baza_glosu.json"
    if args.nowa_baza_glosu and sciezka_bazy.exists():
        sciezka_bazy.unlink()
    glos = None
    if not args.bez_glosu:
        try:
            baza = GB.BazaGlosu(sciezka_bazy)
            print("[OK]   baza glosu:", "wczytana z pliku" if baza.gotowa else "brak, kalibracja przy pierwszej mowie")
            glos = WatekGlosu(m_glos, baza)
            glos.start()
        except Exception as e:
            print("Mikrofon niedostepny:", e)

    fa = C.FaceAnalyzer(str(landmarker))
    tracker = C.FatigueTracker(prog_mar=float(konfig.get("MAR_YAWN", 0.5)))
    cap = cv2.VideoCapture(args.kamera, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(args.kamera)
    if not cap.isOpened():
        raise SystemExit(f"Nie moge otworzyc kamery {args.kamera}")
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    emo = None                                              # wygladzone prawdopodobienstwa emocji z twarzy
    zm, cechy_okna = float("nan"), None
    t0 = time.perf_counter()
    t_track = t_zm = t_log = -1e9
    i = 0

    naglowek = ["czas", "dobrostan", "zmeczenie", "perclos", "mrugniecia_min", "ziewniecia_min",
                "emocja_twarz", "negatywne_twarz", "emocja_glos", "negatywne_glos",
                "napiecie_glos", "zmeczenie_glos"] + [f"glos_{k}" for k in GB.KLUCZE]
    plog = pathlib.Path(args.log)
    if plog.exists():
        with open(plog, encoding="utf-8") as fh:
            stary = fh.readline().strip().split(",")
        if stary != naglowek:  # inny uklad kolumn -> odloz stary plik
            plog.rename(plog.with_name(plog.stem + time.strftime("_%Y%m%d_%H%M%S") + plog.suffix))
    nowy_log = not plog.exists()
    flog = open(plog, "a", newline="", encoding="utf-8")
    log = csv.writer(flog)
    if nowy_log:
        log.writerow(naglowek)

    jakosc_buf: collections.deque = collections.deque()   # (t, twarz 0/1, jasnosc, ostrosc) z ostatnich 10 s
    nadajnik = None
    if args.panel:
        nadajnik = NadajnikPanelu(args.panel)
        nadajnik.start()

    print("Dziala. Klawisz q zamyka okno. Pierwszy wynik zmeczenia pojawi sie po ok. 50 s.")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            t = time.perf_counter() - t0
            frame = C.resize_max(frame)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            obs = fa.przetworz(frame, t, z_rgb=False)
            i += 1

            # --- jakosc obrazu (co 3. klatka): obecnosc twarzy, jasnosc i ostrosc twarzy
            if i % 3 == 0:
                if obs is not None:
                    tw = C.wytnij_kwadrat(gray, *obs.pts.mean(axis=0), float(np.ptp(obs.pts, axis=0).max()), 64)
                    jakosc_buf.append((t, 1.0, float(tw.mean()), float(cv2.Laplacian(tw, cv2.CV_64F).var())))
                else:
                    jakosc_buf.append((t, 0.0, np.nan, np.nan))
                while jakosc_buf and jakosc_buf[0][0] < t - 10:
                    jakosc_buf.popleft()

            # --- zmeczenie: tracker karmiony z ta sama czestotliwoscia co w treningu
            if t - t_track >= 1.0 / C.TRACKER_FPS:
                zamk = C.prawd_zamkniecia(obs, gray, m_oczy) if obs is not None else None
                tracker.dodaj(t, obs, zamk)
                t_track = t

            # --- emocje z twarzy (co 3. klatka, wygladzanie)
            if obs is not None and m_twarz is not None and i % 3 == 0:
                p = C.softmax(m_twarz(C.wejscie_twarzy(gray, obs.pts)))[0]
                emo = p if emo is None else 0.8 * emo + 0.2 * p

            # --- poziom zmeczenia co 10 s
            if t - t_zm >= 10.0 and tracker.zakres() >= 50:
                cechy_okna = tracker.cechy()
                if m_zm is not None:
                    pz = C.softmax(m_zm(cechy_okna[None]))[0]
                    zm = float(50 * pz[1] + 100 * pz[2])
                else:
                    zm = C.zmeczenie_heurystyka(cechy_okna)
                    platt = konfig.get("ZMECZENIE_PLATT")
                    if platt and np.isfinite(zm):
                        # reguly skalibrowane na UTA-RLDD (60 osob): zmeczenie = szacowane P(senny) w %
                        zm = float(100.0 / (1.0 + np.exp(-(platt[0] * zm + platt[1]))))
                t_zm = t

            # --- emocje: udzial negatywnych
            neg_t = float(sum(emo[k] for k, n in enumerate(C.EMOCJE_TWARZ) if n in C.NEGATYWNE)) if emo is not None else float("nan")
            glos_swiezy = glos is not None and glos.prawd is not None and time.perf_counter() - glos.t_ostatni < 30
            neg_g = float(sum(glos.prawd[k] for k, n in enumerate(C.EMOCJE_GLOS) if n in C.NEGATYWNE)) if glos_swiezy else float("nan")
            neg = np.nanmean([neg_t, neg_g]) if np.isfinite([neg_t, neg_g]).any() else float("nan")

            # --- biomarkery glosu: mediana ostatnich okien + odchylenie od bazy
            bio = glos.baza.biezace() if glos is not None else None
            bio_swiezy = glos is not None and time.perf_counter() - glos.t_bio < 30
            z = glos.baza.z(bio) if bio is not None else {}
            napiecie = GB.indeks(z, GB.NAPIECIE) if bio_swiezy else float("nan")
            zm_glos = GB.indeks(z, GB.ZMECZENIE) if bio_swiezy else float("nan")

            # --- wskaznik dobrostanu 0..100 (heurystyka laczaca sygnaly)
            skl = [(0.45, zm), (0.35, neg * 100), (0.10, napiecie), (0.10, zm_glos)]
            skl = [(w, v) for w, v in skl if np.isfinite(v)]
            dobrostan = 100 - sum(w * v for w, v in skl) / sum(w for w, _ in skl) if skl else float("nan")

            # --- obraz
            if obs is not None:
                for idx in (C.OKO_L, C.OKO_P):
                    cv2.polylines(frame, [obs.pts[list(idx)].astype(np.int32)], True, (0, 255, 255), 1)
            cv2.rectangle(frame, (0, 0), (250, 170), (0, 0, 0), -1)
            y = 20
            tekst(frame, f"Dobrostan: {fmt(dobrostan)}/100", 8, y, 0.55, kolor_skali(dobrostan, True)); pasek(frame, 8, y + 5, 230, dobrostan, kolor_skali(dobrostan, True)); y += 38
            tekst(frame, f"Zmeczenie: {fmt(zm)}/100" if np.isfinite(zm) else f"Zmeczenie: zbieram dane ({min(tracker.zakres(), 50):.0f}/50 s)", 8, y, 0.45, kolor_skali(zm)); pasek(frame, 8, y + 5, 230, zm, kolor_skali(zm)); y += 34
            if cechy_okna is not None:
                f = dict(zip(C.FEATURE_NAMES, cechy_okna))
                tekst(frame, f"PERCLOS {fmt(f['perclos'] * 100)}%  mrug. {fmt(f['blinks_per_min'])}/min  ziew. {fmt(f['yawns_per_min'], '{:.1f}')}", 8, y, 0.38); y += 20
            if emo is not None:
                k = int(np.argmax(emo))
                tekst(frame, f"Twarz: {C.PL[C.EMOCJE_TWARZ[k]]} ({emo[k]:.0%})", 8, y, 0.45); y += 20
            if glos is not None:
                if glos_swiezy:
                    k = int(np.argmax(glos.prawd))
                    tekst(frame, f"Glos: {C.PL[C.EMOCJE_GLOS[k]]} ({glos.prawd[k]:.0%})" + (" *" if glos.mowa else ""), 8, y, 0.45)
                else:
                    tekst(frame, "Glos: (cisza)", 8, y, 0.45, (160, 160, 160))
                y += 20
            if obs is None:
                tekst(frame, "Nie widze twarzy", 270, 30, 0.7, (0, 0, 255))
            widok = np.hstack([frame, panel_glosu(frame.shape[0], glos, bio, z, napiecie, zm_glos, bio_swiezy)])
            cv2.imshow("Monitor dobrostanu (q = wyjscie)", widok)

            # --- panel na zywo (same liczby)
            if nadajnik is not None:
                fp = dict(zip(C.FEATURE_NAMES, cechy_okna)) if cechy_okna is not None else {}
                jq = ocen_jakosc(jakosc_buf)
                nadajnik.ustaw({
                    "jakosc_kamery": jq["jakosc"],
                    "obecnosc_twarzy": jq["obecnosc"],
                    "jasnosc_twarzy": jq["jasnosc"],
                    "zmeczenie": zm,
                    "perclos": fp.get("perclos", float("nan")) * 100,
                    "mrugniecia_min": fp.get("blinks_per_min"),
                    "ziewniecia_min": fp.get("yawns_per_min"),
                    "negatywne_twarz": neg_t * 100,
                    "negatywne_glos": neg_g * 100,
                    "napiecie_glos": napiecie,
                    "zmeczenie_glos": zm_glos,
                })

            # --- log liczbowy co 5 s (bez obrazu i dzwieku)
            if t - t_log >= 5.0:
                f = dict(zip(C.FEATURE_NAMES, cechy_okna)) if cechy_okna is not None else {}
                log.writerow([
                    time.strftime("%Y-%m-%d %H:%M:%S"), fmt(dobrostan, "{:.1f}"), fmt(zm, "{:.1f}"),
                    fmt(f.get("perclos"), "{:.3f}"), fmt(f.get("blinks_per_min"), "{:.1f}"), fmt(f.get("yawns_per_min"), "{:.2f}"),
                    C.EMOCJE_TWARZ[int(np.argmax(emo))] if emo is not None else "--", fmt(neg_t, "{:.3f}"),
                    C.EMOCJE_GLOS[int(np.argmax(glos.prawd))] if glos_swiezy else "--", fmt(neg_g, "{:.3f}"),
                    fmt(napiecie, "{:.1f}"), fmt(zm_glos, "{:.1f}"),
                ] + [fmt(bio[k], "{:.3f}") if (bio is not None and bio_swiezy) else "--" for k in GB.KLUCZE])
                flog.flush()
                t_log = t

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        if glos is not None:
            glos.stop.set()
        if nadajnik is not None:
            nadajnik.stop.set()
        cap.release()
        cv2.destroyAllWindows()
        fa.close()
        flog.close()
        print("Zapisano wyniki liczbowe:", args.log)

if __name__ == "__main__":
    main()
