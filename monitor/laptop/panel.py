"""
Panel na żywo: lokalny serwer (tylko 127.0.0.1), który przyjmuje pomiary ze źródeł
(monitor.py, odtwarzacz ECLSS, w przyszłości opaska itd.) i pokazuje stan w przeglądarce.

    python panel.py                 -> http://127.0.0.1:8765
    python panel.py --port 9000

Endpointy:
    GET  /                   strona panelu
    GET  /api/stan           migawka stanu (JSON)
    GET  /api/strumien       strumień zdarzeń (SSE) co 2 s
    GET  /api/raport.txt     raport tekstowy do pobrania
    POST /api/pomiary        lista pomiarów [{"parametr","wartosc","zrodlo",...}]
"""
from __future__ import annotations

import argparse
import json
import pathlib
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from centrum import raport as R
from centrum.stan import Centrum

TU = pathlib.Path(__file__).resolve().parent
HTML = (TU / "centrum" / "panel.html").read_bytes


def zrob_handler(c: Centrum):
    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def _wyslij(self, kod, typ, tresc: bytes):
            self.send_response(kod)
            self.send_header("Content-Type", typ)
            self.send_header("Content-Length", str(len(tresc)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(tresc)

        def do_GET(self):
            if self.path in ("/", "/index.html"):
                return self._wyslij(200, "text/html; charset=utf-8", HTML())
            if self.path == "/api/stan":
                return self._wyslij(200, "application/json", json.dumps(c.migawka(), ensure_ascii=False).encode())
            if self.path == "/api/raport.txt":
                txt = R.jako_tekst(c.migawka()["raport"]).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="raport_{time.strftime("%Y%m%d_%H%M")}.txt"')
                self.send_header("Content-Length", str(len(txt)))
                self.end_headers()
                return self.wfile.write(txt)
            if self.path == "/api/strumien":
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Connection", "keep-alive")
                self.end_headers()
                try:
                    while True:
                        d = json.dumps(c.migawka(), ensure_ascii=False)
                        self.wfile.write(f"data: {d}\n\n".encode("utf-8"))
                        self.wfile.flush()
                        time.sleep(2)
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                    return
            self._wyslij(404, "text/plain", b"nie ma")

        def do_POST(self):
            if self.path != "/api/pomiary":
                return self._wyslij(404, "text/plain", b"nie ma")
            try:
                n = int(self.headers.get("Content-Length", 0))
                dane = json.loads(self.rfile.read(n) or b"[]")
                if isinstance(dane, dict):
                    dane = [dane]
                ok = c.dodaj(dane)
                self._wyslij(200, "application/json", json.dumps({"przyjeto": ok}).encode())
            except (ValueError, json.JSONDecodeError) as e:
                self._wyslij(400, "application/json", json.dumps({"blad": str(e)}).encode())

    return H


def main():
    ap = argparse.ArgumentParser(description="Panel na żywo monitora załogi")
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()

    c = Centrum(TU / "dane_centrum", TU / "modele" / "anomalie.npz")
    print("Sieć anomalii:", "wytrenowana (modele/anomalie.npz)" if c.plik_sieci.exists()
          else "jeszcze nie wytrenowana, używam porównania z bieżącą sesją")

    def petla():
        while True:
            c.krok()
            time.sleep(2)

    threading.Thread(target=petla, daemon=True).start()
    class Serwer(ThreadingHTTPServer):
        def handle_error(self, request, client_address):
            import sys
            if isinstance(sys.exc_info()[1], (ConnectionError, TimeoutError)):
                return   # przeglądarka zamknęła połączenie: nic złego
            super().handle_error(request, client_address)

    srv = Serwer(("127.0.0.1", args.port), zrob_handler(c))
    srv.daemon_threads = True
    print(f"Panel: http://127.0.0.1:{args.port}   (Ctrl+C kończy)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        c.zamknij()


if __name__ == "__main__":
    main()
