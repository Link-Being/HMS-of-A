"""
Generator raportu tekstowego (lokalnie, szablony, po polsku) z migawki stanu Centrum.
Nie jest to diagnoza medyczna: raport opisuje odchylenia od norm i nietypowe połączenia sygnałów.
"""
from __future__ import annotations

import time

from . import normy as N

SLOWO = {"norma": "w normie", "uwaga": "wymaga uwagi", "alarm": "ALARM"}


def _p(m, k):
    """Parametr do reguł korelacji; niepewne (słaba jakość danych) są pomijane."""
    return next((p for p in m["parametry"] if p["klucz"] == k and not p.get("niepewny")), None)


def _v(m, k):
    p = _p(m, k)
    return p["wartosc"] if p else None


def _korelacje(m) -> list[str]:
    """Reguły łączące obszary (to, czego pojedyncza norma nie widzi)."""
    out = []
    co2, zm = _v(m, "co2_kabiny"), _v(m, "zmeczenie")
    pz = _p(m, "zmeczenie")
    if co2 is not None and co2 >= 3000 and zm is not None and (zm >= 40 or (pz and pz["trend"] == "rośnie")):
        out.append(f"Podwyższone CO₂ ({co2:.0f} ppm) przy {'rosnącym' if pz and pz['trend'] == 'rośnie' else 'podwyższonym'} "
                   f"zmęczeniu ({zm:.0f}/100): CO₂ może obniżać koncentrację; warto sprawdzić wentylację i zrobić przerwę.")
    perc, ziew = _v(m, "perclos"), _v(m, "ziewniecia_min")
    if perc is not None and perc >= 8 and ziew is not None and ziew >= 1:
        out.append(f"PERCLOS {perc:.1f}% razem z ziewaniem ({ziew:.1f}/min) to typowy obraz senności; "
                   "niewskazane zadania wymagające wysokiej koncentracji (np. dokowanie, EVA).")
    nap, neg_g, neg_t = _v(m, "napiecie_glos"), _v(m, "negatywne_glos"), _v(m, "negatywne_twarz")
    neg = max([x for x in (neg_g, neg_t) if x is not None], default=None)
    if nap is not None and nap >= 65 and neg is not None and neg >= 40:
        out.append(f"Napięty głos ({nap:.0f}/100) i negatywne emocje ({neg:.0f}%): możliwy stres; "
                   "warto porozmawiać z załogą lub zaplanować odpoczynek.")
    zg = _v(m, "zmeczenie_glos")
    if zm is not None and zm >= 40 and zg is not None and zg >= 65:
        out.append("Zmęczenie widać jednocześnie w twarzy i w głosie, więc sygnał jest spójny w dwóch niezależnych źródłach.")
    temp = _v(m, "temperatura_kabiny")
    if temp is not None and temp >= 25.5 and zm is not None and zm >= 40:
        out.append(f"Wysoka temperatura w kabinie ({temp:.1f} °C) może nasilać zmęczenie.")
    return out


def generuj(m: dict) -> dict:
    og = m["ogolny"]
    linie = []
    if og["indeks"] is None:
        linie.append("Brak bieżących danych: uruchom monitor (kamera, głos) lub odtwarzacz ECLSS.")
        return {"tytul": "Raport stanu załogi", "czas": time.strftime("%Y-%m-%d %H:%M:%S"), "akapity": linie,
                "zalecenia": [], "brak_danych": []}

    pw = og.get("pewnosc", 1.0)
    opis_pw = "wysoka" if pw >= 0.75 else "średnia" if pw >= 0.5 else "niska"
    chw = og.get("chwilowy")
    chw_txt = f", chwilowo {chw:.0f}/100" if chw is not None and abs(chw - og["indeks"]) >= 10 else ""
    linie.append(f"Stan ogólny: {og['indeks']:.0f}/100 ({SLOWO.get(og['status'], '—')}; "
                 f"uśredniony z ostatnich minut{chw_txt}). Pewność oceny: {opis_pw} ({100 * pw:.0f}%).")
    jq = m.get("jakosc", {}) or {}
    niep = [p["nazwa"].lower() for p in m["parametry"] if p.get("niepewny")]
    if niep:
        powod = "słaba jakość obrazu"
        if jq.get("obecnosc_twarzy") is not None and jq["obecnosc_twarzy"] < 50:
            powod = "twarz poza kadrem przez większość czasu"
        elif jq.get("jasnosc_twarzy") is not None and jq["jasnosc_twarzy"] < 60:
            powod = "za ciemno"
        elif jq.get("jasnosc_twarzy") is not None and jq["jasnosc_twarzy"] > 200:
            powod = "prześwietlony obraz"
        linie.append(f"Pominięto w ocenie ({powod}): {', '.join(niep)}.")
    elif pw < 0.5:
        linie.append("Ocena opiera się na niewielu źródłach danych; traktuj ją orientacyjnie.")

    # --- model odchyleń: obszary od najbardziej odchylonego
    odch = [o for o in m.get("odchylenia", []) if o["odchylony"]]
    trendy = {p["klucz"]: p["trend"] for p in m["parametry"]}
    lista = []
    if odch:
        linie.append(f"Obszary odchylone od normy ({len(odch)}), od najsilniejszego odchylenia:")
        for i, o in enumerate(odch, 1):
            opisy = []
            for p in o["parametry"]:
                tr = f", {trendy[p['klucz']]}" if trendy.get(p["klucz"]) in ("rośnie", "spada") else ""
                pow_ = "; ".join(pw["opis"] for pw in p["powody"])
                opisy.append(f"{p['nazwa'].lower()} {p['wartosc']} {p['jednostka']}{tr}: {pow_}")
            tekst = f"{i}. {o['nazwa']} (odchylenie {o['wynik']:.0f}/100): " + " | ".join(opisy) + "."
            linie.append(tekst)
            lista.append(tekst)
    else:
        linie.append("Żaden obszar nie odbiega od normy (referencyjnej ani osobistej).")
    w_normie = [o["nazwa"] for o in m.get("odchylenia", []) if not o["odchylony"]]
    if w_normie:
        linie.append("W normie: " + ", ".join(w_normie) + ".")
    if m.get("baza_postep") is not None and m["baza_postep"] < 1:
        linie.append(f"Norma osobista: uczenie się typowych wartości ({100 * m['baza_postep']:.0f}%); "
                     "do tego czasu odchylenia ocenia głównie norma referencyjna.")

    kor = _korelacje(m)
    linie += kor

    an = m["anomalia"]
    if an.get("wynik") is not None:
        top = ", ".join(t["nazwa"].lower() for t in an.get("top", [])[:3])
        metoda = "sieć anomalii" if an.get("metoda") == "siec" else "porównanie z bieżącą sesją"
        if an["wynik"] >= 90:
            linie.append(f"Nietypowy stan ({metoda}): {an['wynik']:.0f}/100. Najbardziej odbiegają: {top}.")
        else:
            linie.append(f"Ocena anomalii ({metoda}): {an['wynik']:.0f}/100, stan typowy dla tej osoby.")
    elif an.get("metoda") == "kalibracja":
        linie.append(f"Sieć anomalii: zbieranie danych bazowych ({100 * an.get('postep', 0):.0f}%).")

    zal = []
    st = {p["klucz"]: p["status"] for p in m["parametry"] if not p.get("niepewny")}
    if st.get("co2_kabiny") in ("uwaga", "alarm"):
        zal.append("Sprawdzić pracę usuwania CO₂ (CDRA) i przepływ powietrza w module.")
    if st.get("zmeczenie") in ("uwaga", "alarm") or st.get("perclos") in ("uwaga", "alarm"):
        zal.append("Przerwa lub krótka drzemka przed zadaniami krytycznymi; ponowna ocena za 30 min.")
    if st.get("napiecie_glos") in ("uwaga", "alarm") or st.get("negatywne_twarz") in ("uwaga", "alarm"):
        zal.append("Kontakt ze wsparciem psychologicznym / rozmowa z załogą.")
    if st.get("promieniowanie_dobowe") in ("uwaga", "alarm"):
        zal.append("Sprawdzić prognozę pogody kosmicznej; rozważyć schronienie w module osłoniętym.")
    if any(s == "alarm" for s in st.values()):
        zal.insert(0, "Co najmniej jeden parametr w stanie ALARM: wymagana weryfikacja przez operatora.")

    brak = [o["nazwa"] for o in m["obszary"].values() if o["indeks"] is None]
    return {"tytul": "Raport stanu załogi", "czas": time.strftime("%Y-%m-%d %H:%M:%S"), "akapity": linie,
            "odchylone": lista,
            "zalecenia": zal, "brak_danych": brak,
            "uwaga": "Raport automatyczny, nie jest diagnozą medyczną. Progi części parametrów są heurystyczne."}


def jako_tekst(r: dict) -> str:
    out = [f"{r['tytul']}  ({r['czas']})", ""] + r["akapity"]
    if r.get("zalecenia"):
        out += ["", "Zalecenia:"] + [f"- {z}" for z in r["zalecenia"]]
    if r.get("brak_danych"):
        out += ["", "Brak źródeł danych: " + ", ".join(r["brak_danych"])]
    if r.get("uwaga"):
        out += ["", r["uwaga"]]
    return "\n".join(out)
