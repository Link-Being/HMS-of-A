# Modele AI: monitor dobrostanu załogi

Samodzielna kopia wszystkich modeli (stan z 2026-11-14), oddzielona od reszty projektu (monitora, panelu,
skryptów treningowych). Działa lokalnie na CPU i offline. **Kopia robocza, z której korzysta monitor, jest
w `laptop/`**; po zmianach tam ten folder trzeba skopiować ponownie.

```
modele_ai/
  wizyjne/    modele z kamery: punkty twarzy, oczy, emocje z twarzy, cechy i kalibracja zmęczenia
  glosowe/    emocje z głosu (wav2vec2) i biomarkery akustyczne (Praat)
  glowny/     model główny: normy, norma osobista, sieć anomalii, model odchyleń, raport
  przyklad.py      użycie wszystkich modeli bez monitora
  ucz_anomalie.py  trening sieci anomalii na zebranej historii
```

Szybki test (środowisko `..\laptop\.venv` ma wszystkie biblioteki):

```
..\laptop\.venv\Scripts\python przyklad.py --zdjecie twarz.jpg --nagranie glos.wav --co2 4200
```

---

## 1. Modele wizyjne (`wizyjne/`)

| Plik | Model | Wejście → wyjście | Dane treningowe | Wynik (walidacja) |
|---|---|---|---|---|
| `face_landmarker.task` | MediaPipe Face Landmarker (Google, TFLite), gotowy | klatka RGB → 478 punktów twarzy, 52 blendshapes, macierz pozy głowy | – | – |
| `oczy.onnx` | ResNet18 (ImageNet), dotrenowany | wycinek oka 64×64, skala szarości 0–1 → [otwarte, zamknięte] | MRL Eye, 84 tys. zdjęć, podział po osobach | 96,3% |
| `emocje_twarz.onnx` | ResNet18 (ImageNet), dotrenowany | twarz 48×48, skala szarości 0–1 → 7 emocji (FER) | FER-2013, 35 tys. zdjęć | 69,7% (macro-F1 0,69) |
| `cechy.py` | cechy klasyczne + reguły zmęczenia | punkty twarzy, okno 60 s → 15 cech (PERCLOS, mrugnięcia, mikrosny, ziewnięcia, ruchy głowy) | – | – |
| `konfig.json` | próg ziewania + kalibracja Platta zmęczenia | wynik reguł → P(senny) | YawDD (319 nagrań), UTA-RLDD (60 osób) | ziewnięcie w 91% filmów; czujny vs senny 71,8% (78% na nagranie) |

Kolejność klas `emocje_twarz.onnx`: angry, disgust, fear, happy, neutral, sad, surprise (`cechy.EMOCJE_TWARZ`).
Zmęczenie = 100 / (1 + e^-(a·wynik_reguł + b)), gdzie a, b = `ZMECZENIE_PLATT` w `konfig.json`.
Szczegóły eksperymentów (także odrzucone warianty i wykryte złudzenie 91%): `wizyjne/zmeczenie_eksperymenty.json`.

## 2. Modele głosowe (`glosowe/`)

| Plik | Model | Wejście → wyjście | Dane | Wynik |
|---|---|---|---|---|
| `emocje_glos.onnx` | wav2vec2-base (Meta, transformer 95 mln parametrów), dotrenowany | 4 s mowy, 16 kHz, znormalizowane (`cechy.normalizuj_audio`) → 8 emocji | RAVDESS, podział po aktorach | 77,9% (macro-F1 0,77) |
| `glos_biomarkery.py` | Praat (Parselmouth), przetwarzanie sygnału | 4 s mowy → 12 biomarkerów (F0, intonacja, jitter, shimmer, HNR, CPPS, głośność, tempo, pauzy, nachylenie widma) + indeksy napięcia i zmęczenia względem osobistej bazy | – | heurystyka z literatury |

Kolejność klas: neutral, calm, happy, sad, angry, fearful, disgust, surprised (`cechy.EMOCJE_GLOS`).
RAVDESS to angielska mowa aktorska, więc na naturalnej polskiej mowie wynik jest słabszy.

## 3. Model główny (`glowny/`): szacowanie stanu ogólnego i obszarów odchylonych od normy

| Moduł | Technologia | Rola |
|---|---|---|
| `normy.py` | system ekspercki (reguły) | zakresy norma / uwaga / alarm z arkusza „Monitorowanie_Zdrowia_Astronautow_Specyfikacja-v2” dla wszystkich parametrów |
| `baza_osobista.py` | statystyka adaptacyjna (wykładniczo ważona średnia i wariancja) | norma osobista osoby i kabiny; uczy się tylko ze stanów w normie |
| `anomalie.py` | **autoenkoder odszumiający** (numpy, 11→16→4→16→11, tanh), bez etykiet | wykrywa nietypowe połączenia sygnałów; reszty ze znakiem dla każdego parametru |
| `odchylenia.py` | model łączący trzy kryteria | ranking obszarów: norma referencyjna + norma osobista + spójność sygnałów, z kierunkiem i uzasadnieniem |
| `stan.py` | integracja | pewność danych (jakość obrazu), wygładzanie wykładnicze (2 min), histereza statusów, alerty bez migania |
| `raport.py` | generowanie tekstu z szablonów (bez LLM) | raport po polsku z regułami łączącymi obszary i zaleceniami |

Wejście: pomiary `{"parametr": ..., "wartosc": ...}`; klucze parametrów w `normy.PARAMETRY`.
Sieć anomalii nie jest jeszcze wytrenowana: po zebraniu co najmniej 2 h historii uruchom `ucz_anomalie.py`
(zapisze `glowny/anomalie.npz`); do tego czasu model porównuje stan z bieżącą sesją.

---

**Ograniczenia:** to nie jest wyrób medyczny. Sieci neuronowe są trzy (oczy, emocje z twarzy, emocje z głosu)
plus autoenkoder anomalii; zmęczenie, biomarkery głosu i ocena według norm to metody klasyczne i heurystyki,
bo nie istnieją dane z etykietami „ogólnego stanu zdrowia” astronautów.
