"""
Generator raportu tekstowego po polsku na podstawie migawki stanu modelu.
Uwaga: brak emotek, brak nawiasow, brak dlugich myslnikow.
"""
from __future__ import annotations

import time

SLOWO = {"norma": "w normie", "uwaga": "wymaga uwagi", "alarm": "ALARM"}


def _p(m, k):
    return next((p for p in m["parametry"] if p["klucz"] == k and not p.get("niepewny")), None)


def _v(m, k):
    p = _p(m, k)
    return p["wartosc"] if p else None


def _korelacje(m) -> list[str]:
    """Reguly laczace obszary na poziomie wielosygnalowym."""
    out = []
    co2 = _v(m, "co2_kabiny")
    got = _v(m, "gotowosc_poznawcza")
    hr = _v(m, "tetno")
    hrv = _v(m, "hrv_rmssd")
    stres = _v(m, "stres_opaska")
    kort = _v(m, "kortyzol_pot")
    mlec = _v(m, "mleczany_pot")
    sen = _v(m, "sen_godziny")
    sscore = _v(m, "sleep_score")
    bb = _v(m, "body_battery")
    spo2 = _v(m, "spo2")
    oddech = _v(m, "oddech")
    bp_sys = _v(m, "cisnienie_skurczowe")
    t_kab = _v(m, "temperatura_kabiny")

    if co2 is not None and co2 >= 3000 and ((got is not None and got < 75) or (hr is not None and hr > 80)):
        out.append(
            f"Podwyzszone CO2 w kabinie {co2:.0f} ppm przy spadku gotowosci poznawczej lub wzroscie tetna: "
            "warto sprawdzic wentylacje modulu i uklad CDRA."
        )
    if stres is not None and stres >= 51 and hrv is not None and hrv < 45:
        kort_txt = f", kortyzol {kort:.1f} ng/ml" if kort is not None and kort >= 6.5 else ""
        out.append(
            f"Wysokie obciazenie stresowe {stres:.0f} pkt wspolistnieje z obnizonym HRV {hrv:.0f} ms{kort_txt}: "
            "sygnal wskazuje na zmeczenie autonomiczne i potrzebe odpoczynku."
        )
    if ((sen is not None and sen < 7.0) or (sscore is not None and sscore < 80)) and (
        (bb is not None and bb < 50) or (got is not None and got < 75)
    ):
        out.append(
            "Deficyt snu lub niska jakosc regeneracji przeklada sie bezposrednio na spadek rezerw Body Battery "
            "oraz obnizona gotowosc poznawcza: wskazana przerwa regeneracyjna przed zadaniami krytycznymi."
        )
    if (hr is not None and hr > 95) and ((spo2 is not None and spo2 < 96) or (oddech is not None and oddech > 18)):
        out.append(
            f"Tachykardia {hr:.0f} bpm w polaczeniu ze spadkiem saturacji lub przyspieszonym oddechem: "
            "wymagana natychmiastowa weryfikacja kardiologiczna."
        )
    elif bp_sys is not None and bp_sys > 130 and stres is not None and stres >= 51:
        out.append(
            f"Podwyzszone cisnienie skurczowe {bp_sys:.0f} mmHg przy podwyzszonym stresie {stres:.0f} pkt: "
            "zalecane powtorzenie pomiaru w warunkach pelnego spoczynku."
        )
    if kort is not None and kort >= 6.5 and mlec is not None and mlec >= 2.5:
        out.append(
            f"Podwyzszone biomarkery potu : kortyzol {kort:.1f} ng/ml oraz mleczany {mlec:.1f} mmol/l : "
            "potwierdzaja wzmozone obciazenie metaboliczne i stresowe."
        )
    if t_kab is not None and t_kab >= 25.5 and hr is not None and hr > 80:
        out.append(
            f"Podwyzszona temperatura kabiny {t_kab:.1f} st. C moze nasilac obciazenie ukladu krazenia."
        )
    return out


def generuj(m: dict) -> dict:
    og = m["ogolny"]
    linie = []
    if og["indeks"] is None:
        linie.append("Brak biezacych danych telemetrycznych do oceny modelu.")
        return {
            "tytul": "Raport podsumowujacy modelu HMS-of-A",
            "czas": time.strftime("%Y-%m-%d %H:%M:%S"),
            "akapity": linie,
            "odchylone": [],
            "zalecenia": [],
            "brak_danych": [],
            "uwaga": "Raport automatyczny modelu pomocniczego, nie zastepuje diagnozy lekarskiej.",
        }

    pw = og.get("pewnosc", 1.0)
    opis_pw = "wysoka" if pw >= 0.75 else "srednia" if pw >= 0.5 else "niska"
    chw = og.get("chwilowy")
    chw_txt = f", chwilowo {chw:.0f}/100" if chw is not None and abs(chw - og["indeks"]) >= 8 else ""
    status_slowo = SLOWO.get(og["status"], "nieokreslony")
    linie.append(
        f"Stan ogolny: {og['indeks']:.0f}/100 : {status_slowo}, indeks wygladzony czasowo{chw_txt}. "
        f"Pewnosc oceny: {opis_pw}, {100.0 * pw:.0f}%."
    )

    odch = [o for o in m.get("odchylenia", []) if o["odchylony"]]
    trendy = {p["klucz"]: p["trend"] for p in m["parametry"]}
    lista = []
    if odch:
        linie.append(f"Obszary odchylone od normy : {len(odch)}, od najsilniejszego odchylenia:")
        for i, o in enumerate(odch, 1):
            opisy = []
            for p in o["parametry"]:
                tr = f", trend {trendy[p['klucz']]}" if trendy.get(p["klucz"]) in ("rosnie", "spada") else ""
                pow_ = "; ".join(pw_item["opis"] for pw_item in p["powody"])
                opisy.append(f"{p['nazwa'].lower()} {p['wartosc']} {p['jednostka']}{tr}: {pow_}")
            tekst = f"{i}. {o['nazwa']} : odchylenie {o['wynik']:.0f}/100 : " + " | ".join(opisy) + "."
            linie.append(tekst)
            lista.append(tekst)
    else:
        linie.append("Zaden monitorowany obszar nie odbiega od normy referencyjnej ani osobistej.")

    w_normie = [o["nazwa"] for o in m.get("odchylenia", []) if not o["odchylony"]]
    if w_normie:
        linie.append("W normie: " + ", ".join(w_normie) + ".")

    if m.get("baza_postep") is not None and m["baza_postep"] < 1.0:
        linie.append(
            f"Norma osobista: kalibracja bazy indywidualnej na poziomie {100.0 * m['baza_postep']:.0f}%, "
            "do pelnej kalibracji glowny ciezar oceny niosa normy referencyjne i siec anomalii."
        )

    kor = _korelacje(m)
    linie.extend(kor)

    an = m["anomalia"]
    if an.get("wynik") is not None:
        top = ", ".join(t["nazwa"].lower() for t in an.get("top", [])[:3])
        metoda = "siec anomalii autoenkoder 11-16-4-16-11" if an.get("metoda") == "siec" else "porownanie z biezaca sesja"
        if an["wynik"] >= 90:
            linie.append(f"Nietypowy wzorzec wielosygnalowy : {metoda} : {an['wynik']:.0f}/100. Najwiekszy wklad: {top}.")
        elif an["wynik"] >= 70:
            linie.append(f"Podwyzszona niespojnosc sygnalow : {metoda} : {an['wynik']:.0f}/100, glowne sygnaly: {top}.")
        else:
            linie.append(f"Ocena anomalii : {metoda} : {an['wynik']:.0f}/100, profil sygnalowy typowy.")
    elif an.get("metoda") == "kalibracja":
        linie.append(f"Siec anomalii: zbieranie danych bazowych {100.0 * an.get('postep', 0.0):.0f}%.")

    zal = []
    st = {p["klucz"]: p["status"] for p in m["parametry"] if not p.get("niepewny")}
    if st.get("co2_kabiny") in ("uwaga", "alarm"):
        zal.append("Sprawdzic prace usuwania CO2 CDRA i przeplyw powietrza w module.")
    if st.get("tetno") in ("uwaga", "alarm") or st.get("cisnienie_skurczowe") in ("uwaga", "alarm") or st.get("spo2") in ("uwaga", "alarm"):
        zal.append("Wykonac badanie kontrolne EKG oraz spoczynkowy pomiar cisnienia i SpO2.")
    if st.get("stres_opaska") in ("uwaga", "alarm") or st.get("kortyzol_pot") in ("uwaga", "alarm"):
        zal.append("Zaplanowac odpoczynek regeneracyjny i cwiczenia oddechowe obnizajace napiecie.")
    if st.get("sen_godziny") in ("uwaga", "alarm") or st.get("sleep_score") in ("uwaga", "alarm"):
        zal.append("Wydluzyc okno snu oraz ograniczyc obciazenie przed zadaniami krytycznymi.")
    if st.get("gotowosc_poznawcza") in ("uwaga", "alarm"):
        zal.append("Unikac operacji wymagajacych maksymalnej koncentracji do czasu poprawy gotowosci EEG.")
    if st.get("promieniowanie_dobowe") in ("uwaga", "alarm"):
        zal.append("Sprawdzic prognoze pogody kosmicznej i rozwazyc osloniete sektory stacji.")
    if any(s == "alarm" for s in st.values()):
        zal.insert(0, "Co najmniej jeden parametr w stanie ALARM: wymagana weryfikacja przez kierownika i personel.")

    brak = [o["nazwa"] for o in m["obszary"].values() if o["indeks"] is None]
    return {
        "tytul": "Raport podsumowujacy modelu HMS-of-A",
        "czas": time.strftime("%Y-%m-%d %H:%M:%S"),
        "akapity": linie,
        "odchylone": lista,
        "korelacje": kor,
        "zalecenia": zal,
        "brak_danych": brak,
        "uwaga": "Raport automatyczny modelu uczenia maszynowego, nie zastepuje diagnozy lekarskiej.",
    }


def jako_tekst(r: dict) -> str:
    out = [f"{r['tytul']} : {r['czas']}", ""] + r["akapity"]
    if r.get("zalecenia"):
        out += ["", "Zalecenia:"] + [f"- {z}" for z in r["zalecenia"]]
    if r.get("brak_danych"):
        out += ["", "Brak zrodel danych: " + ", ".join(r["brak_danych"])]
    if r.get("uwaga"):
        out += ["", r["uwaga"]]
    return "\n".join(out)
