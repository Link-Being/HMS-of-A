# Monitor dobrostanu: zmęczenie i emocje z kamery i głosu

Trening odbywa się w Google Colab, a gotowe modele działają lokalnie na laptopie.

```
trening_colab.ipynb     notebook do Colaba (trenuje i zapisuje modele .onnx na Dysku Google)
modele_ai/              samodzielna kopia modeli AI: wizyjne/, glosowe/, glowny/ (+ README z opisem i przyklad.py)
serwer/                 trening na serwerze hackathon + pobieranie zbiorów
laptop/
  monitor.py            program na żywo: kamera + mikrofon (wysyła wskaźniki do panelu)
  panel.py              panel na żywo w przeglądarce: normy, sieć anomalii, alerty, raport
  odtwarzacz_eclss.py   prawdziwa telemetria kabiny ISS z NASA OSDR jako źródło ECLSS
  ucz_anomalie.py       trening sieci anomalii na zebranej historii
  centrum/              normy z arkusza specyfikacji, sieć anomalii, raport, strona panelu
  cechy.py, glos_biomarkery.py
  modele/               wytrenowane modele (opis: modele/MODELE.md)
```

## Panel na żywo (raport ogólny)

Uruchom w trzech terminalach (w folderze `laptop`):

```
.venv\Scripts\python panel.py                         # panel: http://127.0.0.1:8765
.venv\Scripts\python odtwarzacz_eclss.py --misja RR-1  # dane kabiny ISS (NASA OSDR), tempo --tempo 60
.venv\Scripts\python monitor.py                       # kamera + głos
```

- **Normy**: każdy parametr oceniany według zakresów z arkusza `Monitorowanie_Zdrowia_Astronautow_Specyfikacja-v2.xlsx`
  (`centrum/normy.py`); progi heurystyczne są oznaczone i mają w ocenie wagę 0,5.
- **Obszary** (środowisko, zmęczenie, stres, krążenie, sen…) dostają indeks 0–100; obszary bez źródła danych
  są wypisane w raporcie jako „brak źródeł danych”. Nowe źródło (np. opaska) wysyła pomiary metodą POST na `/api/pomiary`:
  `[{"parametr": "tetno", "wartosc": 62, "zrodlo": "opaska"}]`, a klucze parametrów są w `centrum/normy.py`.
- **Sieć anomalii** (autoenkoder, numpy, bez etykiet) uczy się normalnego stanu osoby i stacji. Do czasu treningu
  panel porównuje bieżący stan z bieżącą sesją. Po zebraniu ≥ 2 h historii: `.venv\Scripts\python ucz_anomalie.py`,
  potem restart panelu.
- **Alerty** pojawiają się dopiero, gdy nowy status utrzyma się 20 s (powrót do normy: 40 s), więc nie migają.
- **Raport** po polsku z szablonów, z regułami łączącymi obszary (np. CO₂ + zmęczenie, PERCLOS + ziewanie);
  przycisk „Pobierz raport (.txt)”. Na dysk trafiają tylko liczby: `laptop/dane_centrum/historia_pomiarow.csv`.
- **Dane NASA**: API `https://visualization.osdr.nasa.gov/eda/api/` (temperatura, wilgotność i CO₂ co 5 min,
  dobowa dawka promieniowania; misje RR-1…RR-23, APEX, VEG). Publicznych ciągłych danych biometrycznych
  astronautów (HR, HRV, sen) w OSDR nie ma.

## Krok 1 (zalecany): trening na serwerze `hackathon` (RTX 5080)

Kod jest w `/root/monitor` na serwerze (kopia w `serwer/`). Środowisko `.venv` z PyTorch CUDA 12.8 jest już gotowe.

```
ssh hackathon
cd /root/monitor
tmux new -s trening          # trening przetrwa rozłączenie (powrót: tmux attach -t trening)
.venv/bin/python trening.py                       # wszystkie sekcje
.venv/bin/python trening.py --sekcje 4,5,6        # tylko wybrane
```

Wysyłanie ręcznie pobranych zbiorów z PC (PowerShell, w folderze `serwer`):
`.\wyslij_dane.ps1 -Sciezka "D:\Pobrane\YawDD.zip" -Nazwa YawDD` (także `UTA-RLDD`, `UBFC-rPPG`).
Modele kopiujesz na laptopa poleceniem `.\pobierz_modele.ps1`.

Po zmianie `laptop/cechy.py` uruchom `python zbuduj_notebook.py` (przebuduje notebook i `serwer/`) i wyślij
`serwer/trening.py` oraz `serwer/cechy.py` na serwer.

Wyniki pierwszego treningu (2026-11-14, walidacja):
oczy 96,3% | emocje twarzy 69,7% (macro-F1 0,69) | emocje głosu 77,9% (macro-F1 0,77).

## Krok 1 (alternatywa): trening w Colabie

1. Wejdź na colab.research.google.com → Prześlij → `trening_colab.ipynb`.
2. Środowisko wykonawcze → Zmień typ → **Python 3, GPU L4**.
3. Uruchom wszystkie komórki. Modele trafią do `MyDrive/MonitorZalogi/modele`.

| Sekcja | Zbiór | Dane | Czas na L4 (szacunek) |
|---|---|---|---|
| 1. Stan oczu | MRL Eye | pobiera się sam | ok. 5 min |
| 2. Emocje z twarzy | FER-2013 | sam (może poprosić o token Kaggle) | ok. 10 min |
| 3. Emocje z głosu | RAVDESS | sam | ok. 10 min |
| 4. Próg ziewania | YawDD | ręcznie do `dane/YawDD/` | kilka min |
| 5. Poziom zmęczenia | UTA-RLDD | ręcznie do `dane/UTA-RLDD/` | 0,5–2 h (zależnie od liczby filmów) |
| 6. Walidacja tętna | UBFC-rPPG | ręcznie do `dane/UBFC-rPPG/` | ok. 15 min |

Sekcje 4–6 są opcjonalne: bez danych zostaną pominięte, a laptop użyje prostszych reguł.
Zbiory do pobrania ręcznie wrzucasz na Dysk Google do `MyDrive/MonitorZalogi/dane/`.

## Krok 2: uruchomienie na laptopie

Skopiuj pliki z `MyDrive/MonitorZalogi/modele` do `laptop/modele`, a potem:

```
cd laptop
.venv\Scripts\python monitor.py
```

Środowisko `.venv` z bibliotekami jest już utworzone. Na innym komputerze:
`python -m venv .venv` i `.venv\Scripts\python -m pip install -r requirements.txt`.

Opcje: `--bez-glosu`, `--kamera 1`, `--log plik.csv`, `--nowa-baza-glosu`. Klawisz `q` zamyka okno.

Program działa też bez części modeli: brakujące funkcje są wyłączane albo zastępowane regułami
(np. zmęczenie liczone z PERCLOS i ziewnięć zamiast sieci z UTA-RLDD).

## Co jest liczone

- **Zmęczenie (0–100)**: z okna 60 s: PERCLOS, częstość i długość mrugnięć, mikrosen, ziewnięcia, ruchy głowy.
- **Emocje z twarzy**: 7 klas FER-2013. **Emocje z głosu**: 8 klas RAVDESS, tylko gdy mówisz.
- **Biomarkery głosu** (`laptop/glos_biomarkery.py`, Praat przez Parselmouth), liczone z każdego 4-sekundowego okna mowy:
  F0, zmienność i zakres intonacji, jitter, shimmer, HNR, CPPS, głośność i jej zmienność, tempo mowy, udział pauz, nachylenie widma.
  Przy pierwszej mowie program zbiera **osobistą bazę** (ok. 30 s normalnego mówienia, zapis do `laptop/baza_glosu.json`);
  potem pokazuje odchylenie każdego markera od bazy (kreska: zielona < 1 SD, żółta < 2 SD, czerwona ≥ 2 SD).
  Z tych odchyleń liczone są dwa heurystyczne indeksy (50 = jak w bazie):
  **napięcie w głosie** (wyższe F0, głośniej, szybciej, większy jitter) i **zmęczenie w głosie**
  (monotonia, wolniej, więcej pauz, ciszej, niższe CPPS/HNR). Bazę nagrywaj wypoczęty i spokojny; `--nowa-baza-glosu` ją kasuje.
- **Dobrostan (0–100)**: średnia ważona: zmęczenie 45%, negatywne emocje 35%, napięcie w głosie 10%, zmęczenie w głosie 10%. (Tętno usunięte z aplikacji; sekcja 6 notebooka i funkcje rPPG w `cechy.py` zostały, gdyby wróciło.)

## Ograniczenia

- To nie jest wyrób medyczny. Wskaźnik dobrostanu to heurystyka, a nie diagnoza.
- FER-2013 i RAVDESS to emocje pozowane lub aktorskie (RAVDESS po angielsku); na naturalnym zachowaniu wyniki są słabsze.
- MRL Eye to głównie zdjęcia w podczerwieni, a kamera laptopa jest zwykła, stąd silna augmentacja w treningu.
- Obraz i dźwięk nie są zapisywane. Na dysk trafia tylko `wyniki.csv` z liczbami.
