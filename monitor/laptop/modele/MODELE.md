# Wytrenowane modele (stan: 2026-11-14)

Trenowane na serwerze `hackathon` (RTX 5080) skryptem `serwer/trening.py`. Format ONNX, uruchamiane na CPU laptopa.

| Plik | Co robi | Dane | Wynik walidacji | Używany przez monitor |
|---|---|---|---|---|
| `oczy.onnx` | oko otwarte / zamknięte (ResNet18, 64×64) | MRL Eye | 96,3% | tak |
| `emocje_twarz.onnx` | 7 emocji z twarzy (ResNet18, 48×48) | FER-2013 | 69,7% (macro-F1 0,69) | tak |
| `emocje_glos.onnx` | 8 emocji z głosu (wav2vec2-base, 4 s, 16 kHz) | RAVDESS | 77,9% (macro-F1 0,77) | tak |
| `face_landmarker.task` | 478 punktów twarzy + blendshapes (gotowy model Google MediaPipe) | – | – | tak |
| `konfig.json` | próg ziewania `MAR_YAWN` = 0,432 (YawDD), kalibracja zmęczenia `ZMECZENIE_PLATT` (UTA-RLDD) | YawDD, UTA-RLDD | ziewnięcie w 91% filmów; zmęczenie 71,8% czujny vs senny | tak |
| `zmeczenie_v1_eksperyment.onnx` | czujny / obniżona czujność / senny (MLP na 15 cechach z 60 s) | UTA-RLDD, fold 1 (12 osób) | ok. 43% przy 3 klasach; czujny vs senny 37% | **nie** |

## Zmęczenie: wyniki na pełnym UTA-RLDD (60 osób, 10 182 okna po 60 s), walidacja po osobach

| Wariant | 3 klasy | Czujny vs senny | Na nagranie | Uwagi |
|---|---|---|---|---|
| reguły (PERCLOS, mikrosny, ziewanie), próg 40 | 41,7% | 64,6% (AUC 0,81) | – | dobre układanie, zły próg |
| sieć MLP v2, 3 klasy (`zmeczenie_v2_3klasy_43proc.onnx` na serwerze) | 42,9% | – | – | odrzucona |
| regresja logistyczna, cechy surowe | 48,6% | 70,0% | 75,4% | |
| **reguły + kalibracja Platta (wdrożone)** | – | **71,8%** | **78,0%** | `ZMECZENIE_PLATT` w `konfig.json` |
| gradient boosting + kalibracja na tym samym nagraniu | 57,5% | 82,7% (AUC 0,91) | 91,5% | **złudzenie**: patrz niżej |

Kontrola: przy kalibracji na innym nagraniu tej osoby wynik czujny vs senny spada do 70,6% (AUC 0,79), a
„obniżona czujność vs senny” nie poprawia się wcale (56% → 57%). Zysk z kalibracji na tym samym nagraniu wynikał
więc z rozpoznawania sesji (światło, miejsce), nie senności. Realny poziom na UTA-RLDD to ok. 70–72%.
Pełne liczby: `zmeczenie_eksperymenty.json`, skrypty: `serwer/eksperyment_zmeczenie.py`, `serwer/kalibruj_zmeczenie.py`.

Wdrożone: zmęczenie = 100 × P(senny) = 100 / (1 + e^-(0,0587 × wynik_reguł − 0,896)).
Osoba bez objawów dostaje ok. 29, wyraźne objawy (wynik reguł 50) to 88. Normy panelu (< 40 norma, ≥ 70 alarm)
odpowiadają więc P(senny) 40% i 70%.

`zmeczenie_v1_eksperyment.onnx` jest zachowany tylko jako punkt odniesienia. Na nowych osobach wypada gorzej niż losowe
zgadywanie (12 osób to za mało), więc monitor go nie ładuje, bo szuka pliku `zmeczenie.onnx`. Zmęczenie liczą
na razie reguły (PERCLOS, mikrosny, ziewnięcia). Żeby włączyć ten model mimo to, zmień jego nazwę na `zmeczenie.onnx`.
