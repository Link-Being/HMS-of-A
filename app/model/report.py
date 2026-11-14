"""
Plain-text English clinical summary report generator built from model snapshots.
Note: no emojis, no parentheses, and no long dashes.
"""
from __future__ import annotations

import time

SLOWO = {"norma": "within normal range", "uwaga": "requires attention", "alarm": "CRITICAL ALERT"}
TREND_LABEL = {"rosnie": "rising", "spada": "falling"}


def _p(m, k):
    return next((p for p in m["parametry"] if p["klucz"] == k and not p.get("niepewny")), None)


def _v(m, k):
    p = _p(m, k)
    return p["wartosc"] if p else None


def _korelacje(m) -> list[str]:
    """Cross-domain rules combining signals at the multi-metric level."""
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
            f"Elevated cabin CO2 {co2:.0f} ppm combined with reduced cognitive readiness or elevated heart rate: "
            "inspect module ventilation and the CDRA scrubber system."
        )
    if stres is not None and stres >= 51 and hrv is not None and hrv < 45:
        kort_txt = f", cortisol {kort:.1f} ng/ml" if kort is not None and kort >= 6.5 else ""
        out.append(
            f"High stress load {stres:.0f} pts co-occurs with suppressed HRV {hrv:.0f} ms{kort_txt}: "
            "indicates autonomic fatigue and need for recovery."
        )
    if ((sen is not None and sen < 7.0) or (sscore is not None and sscore < 80)) and (
        (bb is not None and bb < 50) or (got is not None and got < 75)
    ):
        out.append(
            "Sleep deficit or poor sleep quality directly reduces Body Battery reserves "
            "and EEG cognitive readiness: recovery rest is advised prior to critical tasks."
        )
    if (hr is not None and hr > 95) and ((spo2 is not None and spo2 < 96) or (oddech is not None and oddech > 18)):
        out.append(
            f"Tachycardia {hr:.0f} bpm paired with reduced SpO2 saturation or elevated respiratory rate: "
            "immediate cardiovascular verification required."
        )
    elif bp_sys is not None and bp_sys > 130 and stres is not None and stres >= 51:
        out.append(
            f"Elevated systolic blood pressure {bp_sys:.0f} mmHg alongside elevated stress {stres:.0f} pts: "
            "repeat measurement under full resting conditions."
        )
    if kort is not None and kort >= 6.5 and mlec is not None and mlec >= 2.5:
        out.append(
            f"Elevated sweat biomarkers : cortisol {kort:.1f} ng/ml and lactate {mlec:.1f} mmol/l : "
            "confirm heightened metabolic and physiological stress load."
        )
    if t_kab is not None and t_kab >= 25.5 and hr is not None and hr > 80:
        out.append(
            f"Elevated cabin temperature {t_kab:.1f} deg C may increase cardiovascular strain."
        )
    return out


def generuj(m: dict) -> dict:
    og = m["ogolny"]
    linie = []
    if og["indeks"] is None:
        linie.append("No live telemetry data available for model scoring.")
        return {
            "tytul": "HMS-of-A Model Summary Report",
            "czas": time.strftime("%Y-%m-%d %H:%M:%S"),
            "akapity": linie,
            "odchylone": [],
            "zalecenia": [],
            "brak_danych": [],
            "uwaga": "Automated auxiliary model report; does not replace clinical diagnosis by a flight surgeon.",
        }

    pw = og.get("pewnosc", 1.0)
    opis_pw = "high" if pw >= 0.75 else "medium" if pw >= 0.5 else "low"
    chw = og.get("chwilowy")
    chw_txt = f", instantaneous {chw:.0f}/100" if chw is not None and abs(chw - og["indeks"]) >= 8 else ""
    status_slowo = SLOWO.get(og["status"], "undetermined")
    linie.append(
        f"Overall readiness: {og['indeks']:.0f}/100 : {status_slowo}, temporally smoothed index{chw_txt}. "
        f"Assessment confidence: {opis_pw}, {100.0 * pw:.0f}%."
    )

    odch = [o for o in m.get("odchylenia", []) if o["odchylony"]]
    trendy = {p["klucz"]: p["trend"] for p in m["parametry"]}
    lista = []
    if odch:
        linie.append(f"Out-of-norm domains : {len(odch)}, ordered by highest deviation:")
        for i, o in enumerate(odch, 1):
            opisy = []
            for p in o["parametry"]:
                tr_raw = trendy.get(p["klucz"])
                tr = f", trend {TREND_LABEL[tr_raw]}" if tr_raw in TREND_LABEL else ""
                pow_ = "; ".join(pw_item["opis"] for pw_item in p["powody"])
                opisy.append(f"{p['nazwa'].lower()} {p['wartosc']} {p['jednostka']}{tr}: {pow_}")
            tekst = f"{i}. {o['nazwa']} : deviation {o['wynik']:.0f}/100 : " + " | ".join(opisy) + "."
            linie.append(tekst)
            lista.append(tekst)
    else:
        linie.append("No monitored domain deviates from reference thresholds or personal baselines.")

    w_normie = [o["nazwa"] for o in m.get("odchylenia", []) if not o["odchylony"]]
    if w_normie:
        linie.append("Within normal range: " + ", ".join(w_normie) + ".")

    if m.get("baza_postep") is not None and m["baza_postep"] < 1.0:
        linie.append(
            f"Personal baseline: individual calibration progress at {100.0 * m['baza_postep']:.0f}%, "
            "reference norms and the anomaly network carry primary weight until calibration completes."
        )

    kor = _korelacje(m)
    linie.extend(kor)

    an = m["anomalia"]
    if an.get("wynik") is not None:
        top = ", ".join(t["nazwa"].lower() for t in an.get("top", [])[:3])
        metoda = "autoencoder anomaly network 11-16-4-16-11" if an.get("metoda") == "siec" else "session distribution comparison"
        if an["wynik"] >= 90:
            linie.append(f"Atypical multi-signal pattern : {metoda} : {an['wynik']:.0f}/100. Top contributors: {top}.")
        elif an["wynik"] >= 70:
            linie.append(f"Elevated cross-signal inconsistency : {metoda} : {an['wynik']:.0f}/100, main signals: {top}.")
        else:
            linie.append(f"Anomaly assessment : {metoda} : {an['wynik']:.0f}/100, signal profile nominal.")
    elif an.get("metoda") == "kalibracja":
        linie.append(f"Anomaly network: collecting baseline data {100.0 * an.get('postep', 0.0):.0f}%.")

    zal = []
    st = {p["klucz"]: p["status"] for p in m["parametry"] if not p.get("niepewny")}
    if st.get("co2_kabiny") in ("uwaga", "alarm"):
        zal.append("Verify CDRA CO2 scrubber operation and module airflow.")
    if st.get("tetno") in ("uwaga", "alarm") or st.get("cisnienie_skurczowe") in ("uwaga", "alarm") or st.get("spo2") in ("uwaga", "alarm"):
        zal.append("Perform control ECG scan along with resting blood pressure and SpO2 readings.")
    if st.get("stres_opaska") in ("uwaga", "alarm") or st.get("kortyzol_pot") in ("uwaga", "alarm"):
        zal.append("Schedule a recovery break and guided breathing exercises to reduce stress load.")
    if st.get("sen_godziny") in ("uwaga", "alarm") or st.get("sleep_score") in ("uwaga", "alarm"):
        zal.append("Extend the sleep window and reduce workload before critical mission operations.")
    if st.get("gotowosc_poznawcza") in ("uwaga", "alarm"):
        zal.append("Defer high-concentration tasks until EEG cognitive readiness improves.")
    if st.get("promieniowanie_dobowe") in ("uwaga", "alarm"):
        zal.append("Review space weather forecast and consider shielded station sectors.")
    if any(s == "alarm" for s in st.values()):
        zal.insert(0, "At least one parameter is in CRITICAL ALERT status: commander and medical review required.")

    brak = [o["nazwa"] for o in m["obszary"].values() if o["indeks"] is None]
    return {
        "tytul": "HMS-of-A Model Summary Report",
        "czas": time.strftime("%Y-%m-%d %H:%M:%S"),
        "akapity": linie,
        "odchylone": lista,
        "korelacje": kor,
        "zalecenia": zal,
        "brak_danych": brak,
        "uwaga": "Automated machine learning summary report; does not replace clinical diagnosis by a flight surgeon.",
    }


def jako_tekst(r: dict) -> str:
    out = [f"{r['tytul']} : {r['czas']}", ""] + r["akapity"]
    if r.get("zalecenia"):
        out += ["", "Recommendations:"] + [f"- {z}" for z in r["zalecenia"]]
    if r.get("brak_danych"):
        out += ["", "Missing data sources: " + ", ".join(r["brak_danych"])]
    if r.get("uwaga"):
        out += ["", r["uwaga"]]
    return "\n".join(out)
