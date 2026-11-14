import json, pathlib, sys

PROJ = pathlib.Path(__file__).resolve().parent
cechy_src = (PROJ / "laptop" / "cechy.py").read_text(encoding="utf-8")

cells = []
def md(s): cells.append(("markdown", s.strip("\n")))
def code(s): cells.append(("code", s.strip("\n")))

md(r"""
# Monitor załogi: trening modeli (Google Colab)

**Środowisko wykonawcze → Zmień typ → Python 3 + GPU L4** (High-RAM, jeśli dostępne).

Notebook tylko **trenuje** modele i zapisuje je jako pliki `.onnx` na Twoim Dysku Google
(`MyDrive/MonitorZalogi/modele`). Potem kopiujesz ten folder do `laptop/modele` i uruchamiasz `monitor.py`.

| # | Model | Zbiór danych | Wynik |
|---|-------|--------------|-------|
| 1 | Stan oczu (otwarte/zamknięte) → PERCLOS, mrugnięcia | MRL Eye | `oczy.onnx` |
| 2 | Emocje z twarzy (7 klas) | FER-2013 | `emocje_twarz.onnx` |
| 3 | Emocje z głosu (8 klas) | RAVDESS (audio) | `emocje_glos.onnx` |
| 4 | Próg ziewania (kalibracja) | YawDD | `konfig.json` |
| 5 | Poziom zmęczenia (czujny / obniżona czujność / senny) | UTA-RLDD | `zmeczenie.onnx` |
| 6 | Tętno z kamery (POS, bez treningu): walidacja | UBFC-rPPG | `rppg_wyniki.json` |

Sekcje 1–3 pobierają dane automatycznie. Dla 4–6 trzeba samemu pobrać dane (rejestracja / formularz)
i wrzucić je na Dysk do `MyDrive/MonitorZalogi/dane/<NAZWA>/` (zip albo rozpakowane).
Sekcja bez danych zostanie pominięta. Po przerwaniu sesji uruchom od góry: gotowe kroki są pomijane.

*PURE, COHFACE i UBFC-Phys (z PDF-a) można dodać później do walidacji rPPG i modelu stresu.*
""")

code(r"""
!pip -q install mediapipe onnx onnxruntime onnxscript kagglehub soundfile
import mediapipe, onnxruntime, torch
print('mediapipe', mediapipe.__version__, '| onnxruntime', onnxruntime.__version__, '| torch', torch.__version__)
# Jeśli pojawi się błąd importu (np. numpy), użyj: Środowisko wykonawcze -> Uruchom ponownie sesję, i odpal od tej komórki.
""")

code(r"""
from google.colab import drive
drive.mount('/content/drive')

import os, sys, json, math, glob, re, time, zipfile, shutil, pathlib, urllib.request
import numpy as np, cv2, torch, torch.nn as nn, torch.nn.functional as F

BAZA = pathlib.Path('/content/drive/MyDrive/MonitorZalogi')
DANE = BAZA / 'dane'      # tu wrzucasz zbiory pobierane ręcznie
MODELE = BAZA / 'modele'  # tu lądują wytrenowane modele (to kopiujesz na laptopa)
LOKALNE = pathlib.Path('/content/dane')  # szybki dysk lokalny Colaba
for p in (DANE, MODELE, LOKALNE):
    p.mkdir(parents=True, exist_ok=True)

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
print('GPU:', torch.cuda.get_device_name(0) if DEVICE == 'cuda' else 'BRAK, zmień środowisko na GPU L4!')
print('CPU:', os.cpu_count())

KONFIG_PATH = MODELE / 'konfig.json'
KONFIG = json.loads(KONFIG_PATH.read_text()) if KONFIG_PATH.exists() else {}
def zapisz_konfig():
    KONFIG_PATH.write_text(json.dumps(KONFIG, indent=2, ensure_ascii=False))
""")

md("Wspólny moduł cech: **ten sam plik** jest w `laptop/cechy.py`, więc cechy z treningu i z laptopa są identyczne.")
code("%%writefile /content/cechy.py\n" + cechy_src)

code(r"""
sys.path.insert(0, '/content')
import importlib, cechy as C
importlib.reload(C)

LANDMARKER = MODELE / 'face_landmarker.task'
if not LANDMARKER.exists():
    urllib.request.urlretrieve(C.FACE_LANDMARKER_URL, LANDMARKER)
print('FaceLandmarker:', LANDMARKER, LANDMARKER.stat().st_size // 1024, 'KB')

def rozpakuj(zip_path, cel):
    # Rozpakowuje zip raz (znacznik .ok).
    cel = pathlib.Path(cel); znacznik = cel / f'.ok_{pathlib.Path(zip_path).stem}'
    if not znacznik.exists():
        print('Rozpakowuję', zip_path)
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(cel)
        znacznik.touch()
    return cel

def pobierz(url, cel):
    cel = pathlib.Path(cel)
    if not cel.exists():
        print('Pobieram', url)
        tmp = cel.with_suffix('.part')
        urllib.request.urlretrieve(url, tmp)
        tmp.rename(cel)
    return cel
""")

md("### Narzędzia treningowe (augmentacja na GPU, sieć ResNet18 dla obrazów w skali szarości, eksport ONNX)")
code(r"""
import torchvision
from sklearn.metrics import f1_score, confusion_matrix, classification_report

class GrayNet(nn.Module):
    # Wejście: (B,1,H,W) w zakresie 0..1. Normalizacja i skalowanie są wewnątrz, więc w ONNX też.
    def __init__(self, n_klas, rozmiar_wew=None):
        super().__init__()
        m = torchvision.models.resnet18(weights='IMAGENET1K_V1')
        m.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(512, n_klas))
        self.m, self.rozmiar_wew = m, rozmiar_wew
        self.register_buffer('mean', torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1))
        self.register_buffer('std', torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1))
    def forward(self, x):
        if self.rozmiar_wew:
            x = F.interpolate(x, size=(self.rozmiar_wew, self.rozmiar_wew), mode='bilinear', align_corners=False)
        x = x.repeat(1, 3, 1, 1)
        return self.m((x - self.mean) / self.std)

def augmentuj(x, rot=15, skala=(0.9, 1.1), przes=0.08, flip=True):
    B, dev = x.shape[0], x.device
    u = lambda a, b, *s: torch.empty(B, *s, device=dev).uniform_(a, b)
    ang = u(-1, 1) * math.radians(rot); sc = u(*skala)
    cos, sin = torch.cos(ang) / sc, torch.sin(ang) / sc
    tx, ty = u(-przes, przes), u(-przes, przes)
    theta = torch.stack([torch.stack([cos, -sin, tx], 1), torch.stack([sin, cos, ty], 1)], 1)
    if flip:
        theta[:, :, 0] *= torch.where(torch.rand(B, device=dev) < 0.5, -1.0, 1.0).unsqueeze(1)
    x = F.grid_sample(x, F.affine_grid(theta, x.shape, align_corners=False), padding_mode='border', align_corners=False)
    m = x.mean((2, 3), keepdim=True)
    x = (x - m) * u(0.6, 1.4, 1, 1, 1) + m + u(-0.15, 0.15, 1, 1, 1)
    x = x.clamp(1e-4, 1) ** torch.exp(u(-0.4, 0.4, 1, 1, 1))
    x = x + torch.randn_like(x) * u(0, 0.04, 1, 1, 1)
    return x.clamp(0, 1)

def trenuj_obrazy(model, Xtr, ytr, Xva, yva, epoki, lr, bs, wagi=None, nazwa='model'):
    # X*: uint8 tensory (N,1,H,W) na GPU, y*: long tensory na GPU.
    model = model.to(DEVICE)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    kroki = epoki * math.ceil(len(Xtr) / bs)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=lr, total_steps=kroki, pct_start=0.15)
    crit = nn.CrossEntropyLoss(weight=wagi, label_smoothing=0.1)
    najlepszy, stan = -1, None
    for ep in range(epoki):
        model.train(); t0 = time.time(); suma = 0
        perm = torch.randperm(len(Xtr), device=DEVICE)
        for i in range(0, len(Xtr), bs):
            idx = perm[i:i + bs]
            x = augmentuj(Xtr[idx].float() / 255)
            with torch.autocast('cuda', dtype=torch.bfloat16):
                loss = crit(model(x), ytr[idx])
            opt.zero_grad(set_to_none=True); loss.backward(); opt.step(); sched.step()
            suma += loss.item() * len(idx)
        pred = przewiduj(model, Xva, bs * 2)
        f1 = f1_score(yva.cpu(), pred, average='macro'); acc = (pred == yva.cpu().numpy()).mean()
        print(f'[{nazwa}] epoka {ep+1}/{epoki} loss={suma/len(Xtr):.4f} val_acc={acc:.4f} val_F1={f1:.4f} ({time.time()-t0:.0f}s)')
        if f1 > najlepszy:
            najlepszy, stan = f1, {k: v.detach().clone() for k, v in model.state_dict().items()}
    model.load_state_dict(stan)
    print(f'[{nazwa}] najlepsze macro-F1 = {najlepszy:.4f}')
    return model

@torch.no_grad()
def przewiduj(model, X, bs=1024):
    model.eval(); out = []
    for i in range(0, len(X), bs):
        with torch.autocast('cuda', dtype=torch.bfloat16):
            out.append(model(X[i:i + bs].float() / 255).argmax(1).cpu())
    return torch.cat(out).numpy()

def eksport_onnx(model, dummy, sciezka):
    import onnxruntime as ort
    model = model.eval().float().cpu(); dummy = dummy.cpu()
    kw = dict(input_names=['input'], output_names=['logits'], opset_version=17)
    try:
        torch.onnx.export(model, (dummy,), str(sciezka), dynamo=False, **kw)
    except Exception as e:
        print('Eksporter klasyczny niedostępny, używam dynamo:', type(e).__name__)
        torch.onnx.export(model, (dummy,), str(sciezka), dynamo=True, external_data=False, **kw)
    so = ort.SessionOptions(); so.intra_op_num_threads = 4
    s = ort.InferenceSession(str(sciezka), so, providers=['CPUExecutionProvider'])
    out = s.run(None, {s.get_inputs()[0].name: dummy.numpy()})[0]
    with torch.no_grad():
        ref = model(dummy); ref = getattr(ref, 'logits', ref).numpy()
    print(f'Zapisano {sciezka} ({pathlib.Path(sciezka).stat().st_size/1e6:.1f} MB), max różnica ONNX vs PyTorch: {np.abs(out-ref).max():.2e}')
""")

# ---------------------------------------------------------------- 1. MRL
md(r"""
## 1. Stan oczu: MRL Eye Dataset
~84 tys. zdjęć oczu (IR i światło widzialne). Etykieta jest w nazwie pliku (5. pole: 0 = zamknięte, 1 = otwarte).
Podział na trening/walidację **po osobach**, żeby model nie „zapamiętał” konkretnych ludzi.
Jeśli serwer uczelni nie działa, pobierz `mrlEyes_2018_01.zip` (np. mirror z Kaggle) i wrzuć do `dane/`.
""")
code(r"""
SCIEZKA_OCZY = MODELE / 'oczy.onnx'
if SCIEZKA_OCZY.exists():
    print('oczy.onnx już istnieje, pomijam (usuń plik, aby trenować ponownie).')
else:
    mrl_zip = DANE / 'mrlEyes_2018_01.zip'
    if not mrl_zip.exists() and not list(DANE.glob('*mrl*')):
        try:
            pobierz('http://mrl.cs.vsb.cz/data/eyedataset/mrlEyes_2018_01.zip', mrl_zip)
        except Exception as e:
            print('Nie udało się pobrać automatycznie:', e)
    for z in DANE.glob('*.zip'):
        if 'mrl' in z.name.lower():
            rozpakuj(z, LOKALNE / 'mrl')
    pliki = [p for p in (LOKALNE / 'mrl').rglob('*') if p.suffix.lower() in ('.png', '.jpg', '.jpeg')]
    print('Obrazów:', len(pliki))
    wzor = re.compile(r's(\d{4})_\d+_\d_\d_(\d)_\d_\d_\d+$')
    X, y, osoba = [], [], []
    for p in pliki:
        m = wzor.match(p.stem)
        if m:
            zamk, os_ = int(m.group(2) == '0'), int(m.group(1))
        else:  # mirror z folderami Open/Closed
            nazwa = p.parent.name.lower()
            if 'clos' in nazwa: zamk = 1
            elif 'open' in nazwa: zamk = 0
            else: continue
            os_ = hash(p.stem[:5]) % 1000
        img = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
        if img is None: continue
        X.append(cv2.resize(img, (C.ROZMIAR_OKA, C.ROZMIAR_OKA), interpolation=cv2.INTER_AREA)); y.append(zamk); osoba.append(os_)
    X, y, osoba = np.stack(X), np.array(y), np.array(osoba)
    osoby = np.unique(osoba); val_os = osoby[::5]
    va = np.isin(osoba, val_os)
    print(f'Trening {(~va).sum()}, walidacja {va.sum()} ({len(val_os)} osób); zamknięte: {y.mean():.2%}')
    T = lambda a: torch.from_numpy(a).to(DEVICE)
    Xtr, Xva = T(X[~va][:, None]), T(X[va][:, None]); ytr, yva = T(y[~va]).long(), T(y[va]).long()
    model_oczu = trenuj_obrazy(GrayNet(2), Xtr, ytr, Xva, yva, epoki=6, lr=1e-3, bs=512, nazwa='oczy')
    print(classification_report(yva.cpu(), przewiduj(model_oczu, Xva), target_names=['otwarte', 'zamknięte'], digits=3))
    eksport_onnx(model_oczu, torch.zeros(1, 1, C.ROZMIAR_OKA, C.ROZMIAR_OKA), SCIEZKA_OCZY)
    del X, Xtr, Xva; torch.cuda.empty_cache()
""")

# ---------------------------------------------------------------- 2. FER
md(r"""
## 2. Emocje z twarzy: FER-2013
Pobieranie przez `kagglehub`. Jeśli poprosi o logowanie: na kaggle.com → Settings → *Create New Token*,
a potem w Colabie (ikona klucza, **Secrets**) dodaj `KAGGLE_USERNAME` i `KAGGLE_KEY`.
Spodziewana dokładność to ok. 68–72% (tyle osiągają dobre modele na tym zbiorze; ludzie mają ok. 65%).
""")
code(r"""
SCIEZKA_TWARZ = MODELE / 'emocje_twarz.onnx'
if SCIEZKA_TWARZ.exists():
    print('emocje_twarz.onnx już istnieje, pomijam.')
else:
    try:
        from google.colab import userdata
        for k in ('KAGGLE_USERNAME', 'KAGGLE_KEY'):
            try: os.environ[k] = userdata.get(k)
            except Exception: pass
    except Exception: pass
    import kagglehub
    fer = pathlib.Path(kagglehub.dataset_download('msambare/fer2013'))
    def wczytaj(folder):
        X, y = [], []
        for k, nazwa in enumerate(C.EMOCJE_TWARZ):
            for p in sorted((folder / nazwa).glob('*')):
                img = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
                if img is not None:
                    X.append(cv2.resize(img, (C.ROZMIAR_TWARZY, C.ROZMIAR_TWARZY))); y.append(k)
        return np.stack(X)[:, None], np.array(y)
    Xtr, ytr = wczytaj(fer / 'train'); Xva, yva = wczytaj(fer / 'test')
    print('Trening', Xtr.shape, 'test', Xva.shape, 'liczność klas:', np.bincount(ytr))
    wagi = torch.tensor((len(ytr) / np.bincount(ytr)) ** 0.5, dtype=torch.float32, device=DEVICE); wagi /= wagi.mean()
    T = lambda a: torch.from_numpy(a).to(DEVICE)
    Xtr_t, Xva_t, ytr_t, yva_t = T(Xtr), T(Xva), T(ytr).long(), T(yva).long()
    model_tw = trenuj_obrazy(GrayNet(len(C.EMOCJE_TWARZ), rozmiar_wew=112), Xtr_t, ytr_t, Xva_t, yva_t,
                             epoki=30, lr=1e-3, bs=256, wagi=wagi, nazwa='twarz')
    p = przewiduj(model_tw, Xva_t)
    print(classification_report(yva, p, target_names=C.EMOCJE_TWARZ, digits=3))
    print(confusion_matrix(yva, p))
    eksport_onnx(model_tw, torch.zeros(1, 1, C.ROZMIAR_TWARZY, C.ROZMIAR_TWARZY), SCIEZKA_TWARZ)
    del Xtr_t, Xva_t; torch.cuda.empty_cache()
""")

# ---------------------------------------------------------------- 3. RAVDESS
md(r"""
## 3. Emocje z głosu: RAVDESS (wav2vec2)
Pobiera `Audio_Speech_Actors_01-24.zip` (~200 MB) z Zenodo. Dotrenowujemy `facebook/wav2vec2-base`
na 4-sekundowych fragmentach 16 kHz. Podział **po aktorach**: 1–20 trening, 21–24 walidacja.
Uwaga: RAVDESS to mowa *aktorska* po angielsku, więc na naturalnej polskiej mowie wyniki będą słabsze.
""")
code(r"""
SCIEZKA_GLOS = MODELE / 'emocje_glos.onnx'
if SCIEZKA_GLOS.exists():
    print('emocje_glos.onnx już istnieje, pomijam.')
else:
    import librosa
    from transformers import AutoModelForAudioClassification, get_cosine_schedule_with_warmup
    zip_r = pobierz('https://zenodo.org/records/1188976/files/Audio_Speech_Actors_01-24.zip?download=1',
                    DANE / 'Audio_Speech_Actors_01-24.zip')
    rozpakuj(zip_r, LOKALNE / 'ravdess')
    fale, ety, aktor = [], [], []
    for p in sorted((LOKALNE / 'ravdess').rglob('*.wav')):
        cz = p.stem.split('-')
        if len(cz) != 7: continue
        w, _ = librosa.load(p, sr=C.AUDIO_SR, mono=True)
        w, _ = librosa.effects.trim(w, top_db=30)
        fale.append(w.astype(np.float32)); ety.append(int(cz[2]) - 1); aktor.append(int(cz[6]))
    ety, aktor = np.array(ety), np.array(aktor)
    tr_idx, va_idx = np.flatnonzero(aktor <= 20), np.flatnonzero(aktor > 20)
    print('Nagrań:', len(fale), '| trening', len(tr_idx), '| walidacja', len(va_idx))

    class GlosDS(torch.utils.data.Dataset):
        def __init__(self, idx, trening): self.idx, self.tr = idx, trening
        def __len__(self): return len(self.idx)
        def __getitem__(self, i):
            j = self.idx[i]; w = fale[j]; n = C.AUDIO_SEG
            if self.tr:
                start = np.random.randint(0, abs(len(w) - n) + 1)
                w = C.dopasuj_dlugosc(w, n, start) * np.random.uniform(0.3, 1.5)
                w = w + np.random.randn(n).astype(np.float32) * np.random.uniform(0.0005, 0.01)
            else:
                w = C.dopasuj_dlugosc(w, n) + np.random.RandomState(j).randn(n).astype(np.float32) * 0.002
            return torch.from_numpy(C.normalizuj_audio(w)), int(ety[j])

    dl_tr = torch.utils.data.DataLoader(GlosDS(tr_idx, True), batch_size=16, shuffle=True, num_workers=2, drop_last=True)
    dl_va = torch.utils.data.DataLoader(GlosDS(va_idx, False), batch_size=32, num_workers=2)
    model_g = AutoModelForAudioClassification.from_pretrained(
        'facebook/wav2vec2-base', num_labels=len(C.EMOCJE_GLOS), attn_implementation='eager',
        id2label=dict(enumerate(C.EMOCJE_GLOS)), label2id={n: i for i, n in enumerate(C.EMOCJE_GLOS)}).to(DEVICE)
    model_g.freeze_feature_encoder()
    EPOKI = 25
    opt = torch.optim.AdamW([p for p in model_g.parameters() if p.requires_grad], lr=5e-5, weight_decay=1e-2)
    sched = get_cosine_schedule_with_warmup(opt, len(dl_tr) * 2, len(dl_tr) * EPOKI)
    najlepszy, stan = -1, None
    for ep in range(EPOKI):
        model_g.train(); t0 = time.time()
        for x, yb in dl_tr:
            x, yb = x.to(DEVICE), yb.to(DEVICE)
            with torch.autocast('cuda', dtype=torch.bfloat16):
                loss = F.cross_entropy(model_g(input_values=x).logits, yb, label_smoothing=0.1)
            opt.zero_grad(set_to_none=True); loss.backward()
            torch.nn.utils.clip_grad_norm_(model_g.parameters(), 1.0); opt.step(); sched.step()
        model_g.eval(); pr, gt = [], []
        with torch.no_grad(), torch.autocast('cuda', dtype=torch.bfloat16):
            for x, yb in dl_va:
                pr.append(model_g(input_values=x.to(DEVICE)).logits.argmax(1).cpu()); gt.append(yb)
        pr, gt = torch.cat(pr).numpy(), torch.cat(gt).numpy()
        f1 = f1_score(gt, pr, average='macro')
        print(f'[głos] epoka {ep+1}/{EPOKI} loss={loss.item():.3f} val_acc={(pr==gt).mean():.3f} val_F1={f1:.3f} ({time.time()-t0:.0f}s)')
        if f1 > najlepszy:
            najlepszy, stan = f1, {k: v.detach().cpu().clone() for k, v in model_g.state_dict().items()}
            pr_best = pr
    model_g.load_state_dict(stan)
    print('Najlepsze macro-F1:', round(najlepszy, 4))
    print(classification_report(gt, pr_best, target_names=C.EMOCJE_GLOS, digits=3))

    class GlosONNX(nn.Module):
        def __init__(self, m): super().__init__(); self.m = m
        def forward(self, x): return self.m(input_values=x).logits
    eksport_onnx(GlosONNX(model_g), torch.randn(1, C.AUDIO_SEG), SCIEZKA_GLOS)
    del model_g; torch.cuda.empty_cache()
""")

# ---------------------------------------------------------------- 4. YawDD
md(r"""
## 4. Próg ziewania: YawDD (kalibracja)
Pobierz YawDD z IEEE DataPort (darmowe konto) i wrzuć do `dane/YawDD/` (zip lub rozpakowane).
Używamy nagrań z folderu *Mirror*, gdzie nazwy plików kończą się na `-Normal`, `-Talking` lub `-Yawning`.
Próg MAR (otwarcie ust) ustawiamy tak, żeby normalna mowa prawie nigdy go nie przekraczała.
""")
code(r"""
YAW = DANE / 'YawDD'
if 'MAR_YAWN' in KONFIG:
    print('Próg już skalibrowany:', KONFIG['MAR_YAWN'])
elif not YAW.exists():
    KONFIG.setdefault('MAR_YAWN', 0.5); zapisz_konfig()
    print('Brak dane/YawDD: używam domyślnego progu MAR = 0.5')
else:
    for z in YAW.rglob('*.zip'): rozpakuj(z, LOKALNE / 'yawdd')
    filmy = [p for r in (YAW, LOKALNE / 'yawdd') if r.exists() for p in r.rglob('*')
             if p.suffix.lower() in ('.avi', '.mp4') and re.search(r'(normal|talking|yawning)', p.stem, re.I)]
    print('Filmów z etykietą:', len(filmy))
    from concurrent.futures import ProcessPoolExecutor
    import multiprocessing as mproc
    with ProcessPoolExecutor(max_workers=os.cpu_count(), mp_context=mproc.get_context('spawn')) as ex:
        mary = list(ex.map(C.mar_z_filmu, map(str, filmy), [str(LANDMARKER)] * len(filmy)))
    ziew = [m for p, m in zip(filmy, mary) if 'yawn' in p.stem.lower() and len(m)]
    norm = np.concatenate([m for p, m in zip(filmy, mary) if 'yawn' not in p.stem.lower() and len(m)])
    prog = float(np.clip(np.percentile(norm, 99.5), 0.3, 0.9))
    wykryte = np.mean([(m > prog).sum() >= C.TRACKER_FPS for m in ziew])  # >=1 s powyżej progu
    print(f'Próg MAR_YAWN = {prog:.3f} | ziewnięcie wykryte w {wykryte:.0%} filmów "Yawning"')
    KONFIG['MAR_YAWN'] = prog; zapisz_konfig()
""")

# ---------------------------------------------------------------- 5. UTA-RLDD
md(r"""
## 5. Poziom zmęczenia: UTA-RLDD
Pobierz UTA-RLDD (strona projektu, linki do części `Fold*_part*.zip`) i wrzuć zipy (albo rozpakowane foldery)
do `dane/UTA-RLDD/`. Struktura: `<osoba>/0.mov` (czujny), `5.mov` (obniżona czujność), `10.mov` (senny).
Całość to ok. 30 h wideo i **dużo** GB, więc na początek wystarczy 1–2 foldy.

Każdy film przechodzi przez **ten sam** pipeline co na laptopie (MediaPipe + sieć oczu → okna 60 s co 10 s
→ 15 cech: PERCLOS, mrugnięcia, mikrosen, ziewanie, ruchy głowy). Na tych cechach uczymy małą sieć MLP.
Cechy każdego filmu są zapisywane na Dysku, więc po przerwaniu sesji obliczenia wznawiają się.
Ocena: walidacja krzyżowa **po osobach** (GroupKFold). Uczciwie: rozróżnianie 3 poziomów u nowych osób jest trudne
(w literaturze ok. 60–65%), a „czujny vs senny” wychodzi wyraźnie lepiej.
""")
code(r"""
RLDD = DANE / 'UTA-RLDD'
CECHY_DIR = DANE / 'cechy_rldd'; CECHY_DIR.mkdir(exist_ok=True)
SCIEZKA_ZM = MODELE / 'zmeczenie.onnx'
MAKS_OSOB = None   # np. 20, żeby szybciej przetestować
ETYK = {'0': 0, '5': 1, '10': 2}

filmy = []
if RLDD.exists():
    for z in sorted(RLDD.rglob('*.zip')): rozpakuj(z, LOKALNE / 'rldd')
    for r in (RLDD, LOKALNE / 'rldd'):
        if r.exists():
            filmy += [p for p in r.rglob('*') if p.suffix.lower() in ('.mov', '.mp4', '.avi', '.m4v') and p.stem in ETYK]
osoby = sorted({p.parent.name for p in filmy})[:MAKS_OSOB]
filmy = [p for p in filmy if p.parent.name in osoby]
print(f'Filmów: {len(filmy)}, osób: {len(osoby)}' if filmy else 'Brak danych UTA-RLDD w dane/UTA-RLDD: sekcja pominięta.')

if filmy:
    from concurrent.futures import ProcessPoolExecutor, as_completed
    import multiprocessing as mproc
    prog_mar = KONFIG.get('MAR_YAWN', 0.5)
    oczy = str(SCIEZKA_OCZY) if SCIEZKA_OCZY.exists() else None
    if oczy is None: print('UWAGA: brak oczy.onnx, uruchom najpierw sekcję 1 (inaczej cechy będą z blendshape).')
    zadania = [(p, CECHY_DIR / f'{p.parent.name}_{p.stem}.npy') for p in filmy]
    zadania = [(p, o) for p, o in zadania if not o.exists()]
    print('Do przetworzenia:', len(zadania), 'filmów (pozostałe w cache)')
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=os.cpu_count(), mp_context=mproc.get_context('spawn')) as ex:
        fut = {ex.submit(C.cechy_z_filmu, str(p), str(LANDMARKER), oczy, prog_mar): (p, o) for p, o in zadania}
        for k, f in enumerate(as_completed(fut), 1):
            p, o = fut[f]
            try:
                np.save(o, f.result())
            except Exception as e:
                print('Błąd', p, e)
            print(f'\r{k}/{len(zadania)} ({(time.time()-t0)/60:.1f} min)', end='')
    print()
""")
code(r"""
if filmy and not SCIEZKA_ZM.exists():
    from sklearn.model_selection import GroupKFold
    X, y, g = [], [], []
    for p in filmy:
        o = CECHY_DIR / f'{p.parent.name}_{p.stem}.npy'
        if o.exists():
            a = np.load(o); X.append(a); y += [ETYK[p.stem]] * len(a); g += [p.parent.name] * len(a)
    X, y, g = np.concatenate(X), np.array(y), np.array(g)
    print('Okien:', X.shape, 'klasy:', np.bincount(y))

    class ZmeczenieMLP(nn.Module):
        def __init__(self, mu, sd, n_we, n_kl=3):
            super().__init__()
            self.register_buffer('mu', torch.tensor(mu, dtype=torch.float32))
            self.register_buffer('sd', torch.tensor(sd, dtype=torch.float32))
            self.net = nn.Sequential(nn.Linear(n_we, 64), nn.GELU(), nn.Dropout(0.3),
                                     nn.Linear(64, 64), nn.GELU(), nn.Dropout(0.3), nn.Linear(64, n_kl))
        def forward(self, x):
            x = (x - self.mu) / self.sd
            x = torch.where(torch.isnan(x), torch.zeros_like(x), x).clamp(-6, 6)
            return self.net(x)

    def ucz_mlp(Xa, ya, epoki=150):
        mu, sd = np.nanmean(Xa, 0), np.nanstd(Xa, 0) + 1e-6
        m = ZmeczenieMLP(mu, sd, Xa.shape[1]).to(DEVICE)
        opt = torch.optim.AdamW(m.parameters(), lr=3e-3, weight_decay=1e-3)
        Xt, yt = torch.tensor(Xa, device=DEVICE), torch.tensor(ya, device=DEVICE)
        w = torch.tensor(len(ya) / np.bincount(ya, minlength=3).clip(1), dtype=torch.float32, device=DEVICE)
        for _ in range(epoki):
            m.train()
            for idx in torch.randperm(len(Xt), device=DEVICE).split(256):
                loss = F.cross_entropy(m(Xt[idx]), yt[idx], weight=w / w.mean(), label_smoothing=0.05)
                opt.zero_grad(); loss.backward(); opt.step()
        return m.eval()

    pr = np.zeros_like(y)
    for k, (tr, te) in enumerate(GroupKFold(n_splits=max(2, min(5, len(set(g))))).split(X, y, g)):
        m = ucz_mlp(X[tr], y[tr])
        with torch.no_grad(): pr[te] = m(torch.tensor(X[te], device=DEVICE)).argmax(1).cpu().numpy()
        print(f'fold {k+1}: acc={(pr[te]==y[te]).mean():.3f}')
    print(classification_report(y, pr, target_names=C.ZMECZENIE_KLASY, digits=3))
    print(confusion_matrix(y, pr))
    bin_ = y != 1
    print(f'Czujny vs senny (bez klasy środkowej): acc={(pr[bin_]==y[bin_]).mean():.3f}')

    m = ucz_mlp(X, y)
    eksport_onnx(m, torch.zeros(1, X.shape[1]), SCIEZKA_ZM)
    KONFIG['FEATURE_NAMES'] = C.FEATURE_NAMES; zapisz_konfig()
elif SCIEZKA_ZM.exists():
    print('zmeczenie.onnx już istnieje, pomijam.')
""")

# ---------------------------------------------------------------- 6. UBFC
md(r"""
## 6. Tętno z kamery (rPPG): walidacja na UBFC-rPPG
Metoda POS nie wymaga treningu, a tu sprawdzamy, jak dokładnie działa z naszym pipeline'em.
Pobierz UBFC-rPPG **DATASET_2** (link do Google Drive na stronie zbioru) i wrzuć foldery `subject*`
(z plikami `vid.avi` i `ground_truth.txt`) do `dane/UBFC-rPPG/`.
Wynik: średni błąd bezwzględny (MAE) w uderzeniach na minutę dla okien 10 s.
""")
code(r"""
UBFC = DANE / 'UBFC-rPPG'
if not UBFC.exists() or not (any(UBFC.rglob('ground_truth.txt')) or any(UBFC.rglob('*.zip'))):
    print('Brak nagrań w dane/UBFC-rPPG: sekcja pominięta.')
else:
    for z in UBFC.rglob('*.zip'): rozpakuj(z, LOKALNE / 'ubfc')
    gts = [p for r in (UBFC, LOKALNE / 'ubfc') if r.exists() for p in r.rglob('ground_truth.txt')
           if (p.parent / 'vid.avi').exists()]
    print('Nagrań:', len(gts))
    from concurrent.futures import ProcessPoolExecutor
    import multiprocessing as mproc
    with ProcessPoolExecutor(max_workers=os.cpu_count(), mp_context=mproc.get_context('spawn')) as ex:
        wyniki = list(ex.map(C.rgb_z_filmu, [str(p.parent / 'vid.avi') for p in gts], [str(LANDMARKER)] * len(gts)))
    bledy, pary = [], []
    for gtp, (t, rgb, fps) in zip(gts, wyniki):
        ppg = np.loadtxt(gtp)
        ppg = ppg[0] if ppg.ndim == 2 else ppg
        ppg = np.interp(np.linspace(0, 1, len(t)), np.linspace(0, 1, len(ppg)), ppg)
        for s in np.arange(0, t[-1] - 10, 2.0):
            w = (t >= s) & (t < s + 10)
            hr_pos, snr = C.tetno_rppg(t[w], rgb[w], 30.0)
            hr_gt, _ = C.tetno_z_sygnalu(C.pasmowy(ppg[w], fps), fps)
            if np.isfinite(hr_pos):
                pary.append((hr_gt, hr_pos, snr))
    pary = np.array(pary); e = np.abs(pary[:, 0] - pary[:, 1])
    dobre = pary[:, 2] > 0
    wynik = {'MAE_bpm': float(e.mean()), 'RMSE_bpm': float(np.sqrt((e**2).mean())),
             'Pearson_r': float(np.corrcoef(pary[:, 0], pary[:, 1])[0, 1]),
             'MAE_bpm_SNR>0dB': float(e[dobre].mean()) if dobre.any() else None,
             'odsetek_okien_SNR>0dB': float(dobre.mean()), 'okien': int(len(pary))}
    print(json.dumps(wynik, indent=2))
    (MODELE / 'rppg_wyniki.json').write_text(json.dumps(wynik, indent=2))
""")

# ---------------------------------------------------------------- 7. podsumowanie
md(r"""
## 7. Gotowe: pobierz modele na laptopa
Skopiuj zawartość `MyDrive/MonitorZalogi/modele/` do folderu `laptop/modele/` (przez Dysk Google
albo pobierz zip z komórki poniżej).
""")
code(r"""
for p in sorted(MODELE.iterdir()):
    print(f'{p.name:28s} {p.stat().st_size/1e6:8.1f} MB')
shutil.make_archive('/content/modele', 'zip', MODELE)
from google.colab import files
files.download('/content/modele.zip')
""")

nb = {
    "nbformat": 4, "nbformat_minor": 5,
    "metadata": {
        "accelerator": "GPU",
        "colab": {"gpuType": "L4", "provenance": [], "machine_shape": "hm"},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "cells": [],
}
for i, (typ, src) in enumerate(cells):
    lines = src.splitlines(keepends=True)
    c = {"cell_type": typ, "metadata": {}, "source": lines, "id": f"c{i:02d}"}
    if typ == "code":
        c.update(execution_count=None, outputs=[])
    nb["cells"].append(c)

out = PROJ / "trening_colab.ipynb"
out.write_text(json.dumps(nb, indent=1, ensure_ascii=False), encoding="utf-8")
print("zapisano", out, len(cells), "komorek")

# =============================================================================
# Wersja na serwer: serwer/trening.py (te same sekcje co w notebooku, bez Colaba)
# =============================================================================
import textwrap

kod = [src for typ, src in cells if typ == "code"]
# kod: 0 pip | 1 drive | 2 writefile | 3 cechy+landmarker | 4 narzedzia | 5 s1 | 6 s2 | 7 s3 | 8 s4 | 9 s5a | 10 s5b | 11 s6 | 12 s7
assert len(kod) == 13, len(kod)
wspolne = kod[3].replace("sys.path.insert(0, '/content')\nimport importlib, cechy as C\nimportlib.reload(C)\n", "")
sekcje = {1: [kod[5]], 2: [kod[6]], 3: [kod[7]], 4: [kod[8]], 5: [kod[9], kod[10]], 6: [kod[11]]}
sekcje[5] = [s.replace("MAKS_OSOB = None   # np. 20, żeby szybciej przetestować", "MAKS_OSOB = args.maks_osob") for s in sekcje[5]]
ind = lambda s, n=1: textwrap.indent(s, "    " * n)

skrypt = '''#!/usr/bin/env python3
# WYGENEROWANE przez zbuduj_notebook.py: nie edytuj ręcznie, zmieniaj generator.
"""
Trening modeli monitora dobrostanu na serwerze (te same kroki co trening_colab.ipynb).

    python trening.py                  # wszystkie sekcje 1-6
    python trening.py --sekcje 1,2,3   # wybrane
    python trening.py --sekcje 5 --maks-osob 10

Sekcje: 1 oczy (MRL Eye) | 2 emocje twarzy (FER-2013) | 3 emocje głosu (RAVDESS)
        4 próg ziewania (YawDD) | 5 zmęczenie (UTA-RLDD) | 6 walidacja tętna (UBFC-rPPG)
Dane pobierane ręcznie kładź do dane/<NAZWA>/, a modele lądują w modele/.
Gotowe modele są pomijane (usuń plik .onnx, aby trenować ponownie).
"""
import argparse, os, sys, json, math, glob, re, time, zipfile, shutil, pathlib, urllib.request
import numpy as np, cv2, torch, torch.nn as nn, torch.nn.functional as F

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import cechy as C


def main():
    ap = argparse.ArgumentParser(description="Trening modeli monitora dobrostanu")
    ap.add_argument("--sekcje", default="1,2,3,4,5,6")
    ap.add_argument("--maks-osob", type=int, default=None, help="limit osób z UTA-RLDD (sekcja 5)")
    args = ap.parse_args()
    SEKCJE = {int(s) for s in args.sekcje.split(",") if s.strip()}

    BAZA = pathlib.Path(__file__).resolve().parent
    DANE = BAZA / "dane"            # zbiory danych (zipy lub rozpakowane)
    MODELE = BAZA / "modele"        # wytrenowane modele -> kopiujesz na laptopa
    LOKALNE = BAZA / "rozpakowane"  # rozpakowane archiwa
    for p in (DANE, MODELE, LOKALNE):
        p.mkdir(parents=True, exist_ok=True)

    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    print("GPU:", torch.cuda.get_device_name(0) if DEVICE == "cuda" else "BRAK GPU!", "| CPU:", os.cpu_count())
    torch.backends.cudnn.benchmark = True

    KONFIG_PATH = MODELE / "konfig.json"
    KONFIG = json.loads(KONFIG_PATH.read_text()) if KONFIG_PATH.exists() else {}
    def zapisz_konfig():
        KONFIG_PATH.write_text(json.dumps(KONFIG, indent=2, ensure_ascii=False))

    SCIEZKA_OCZY = MODELE / "oczy.onnx"

''' + ind(wspolne) + "\n\n" + ind(kod[4]) + "\n"

for n, czesci in sekcje.items():
    skrypt += f"\n    # {'=' * 70} sekcja {n}\n    if {n} in SEKCJE:\n        print(); print('===== SEKCJA {n} =====', flush=True)\n"
    for s in czesci:
        skrypt += ind(s, 2) + "\n"

skrypt += '''
    print(); print("Modele:")
    for p in sorted(MODELE.iterdir()):
        print(f"  {p.name:28s} {p.stat().st_size/1e6:8.1f} MB")


if __name__ == "__main__":
    main()
'''
(PROJ / "serwer").mkdir(exist_ok=True)
(PROJ / "serwer" / "trening.py").write_text(skrypt, encoding="utf-8")
(PROJ / "serwer" / "cechy.py").write_text(cechy_src, encoding="utf-8")
print("zapisano serwer/trening.py i serwer/cechy.py")
