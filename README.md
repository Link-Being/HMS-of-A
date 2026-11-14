# HMS-of-A

System Telemetrii Medycznej i Monitorowania Zdrowia Astronautow

## Opis projektu

Aplikacja webowa sluzaca do prezentacji, analizy oraz zarzadzania danymi medycznymi czlonkow zalogi stacji kosmicznej. System umozliwia ciagly nadzor parametrow zyciowych, rejestracje objawow, wydawanie zalecen lekarskich oraz dostep do procedur profilaktycznych i wsparcia motywacyjnego.

## Uwierzytelnianie i przykladowe konta dostepowe

W aplikacji wdrozeno dedykowany panel logowania zabezpieczajacy dostep do danych medycznych. Szybkie przelaczanie kont zostalo zastapione autoryzacja za pomoca identyfikatora oraz hasla. Po zalogowaniu uzytkownik ma mozliwosc zakonczenia sesji przyciskiem Wyloguj.

Wykaz dostepnych kont testowych:

1. Kierownik medyczny misji:
- Nazwisko: dr Helena Wejman
- Rola: Naczelny Lekarz Orbitalny
- Identyfikator: kierownik
- Haslo: med2026
- Uprawnienia: Pelny wglad w telemetrie calej zalogi oraz wydawanie zalecen

2. Dowodca zalogi:
- Nazwisko: Jan Twardowski
- Rola: Dowodca statku
- Identyfikator: twardowski
- Haslo: kosmos1
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia treningowe

3. Inzynier pokladowy:
- Nazwisko: Elena Rostowa
- Rola: Specjalista systemow podtrzymywania zycia
- Identyfikator: rostowa
- Haslo: kosmos2
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia treningowe

4. Astrofizyk misji:
- Nazwisko: Marek Vance
- Rola: Operator ladunku naukowego
- Identyfikator: vance
- Haslo: kosmos3
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia treningowe

5. Pilot modulu ladownika:
- Nazwisko: Sara Lindqvist
- Rola: Nawigator manewrowy
- Identyfikator: lindqvist
- Haslo: kosmos4
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia treningowe

## Glowne moduly systemu

### 1. Panel Kierownika Medycznego
Kierownik misji posiada dedykowany profil z pelnym dostepem do telemetrii kazdego astronauty:
- Zespolowy przeglad gotowosci i stanu zdrowia zalogi
- Podglad wartosci krytycznych, ostrzezen oraz stanow stabilnych
- Srednie wskazniki zespolowe: tetno, saturacja, ekspozycja na promieniowanie
- Wykresy porownawcze parametrow calej zalogi
- Mozliwosc wydawania oficjalnych zalecen medycznych z okresleniem priorytetu

### 2. Osobiste Konta Astronautow
Kazdy czlonek zalogi posiada indywidualne konto:
- Szczegolowy pulpit biotelemetrii osobistej
- Monitorowane parametry: tetno, cisnienie krwi, saturacja SpO2, temperatura powloki, czestosc oddechowa, skumulowana dawka radiacji, gestosc mineralna kosci, masa miesniowa, nawodnienie, jakosc snu oraz poziom stresu
- Interaktywne wykresy trendow telemetrycznych z szesciu ostatnich dni
- Odczyt zalecen wydanych przez naczelnego lekarza misji
- Formularz porannego zgloszenia samopoczucia i wykonania obowiazkowych treningow

### 3. Baza Instrukcji i Profilaktyki Kosmicznej
Zestaw procedur przeciwdzialajacych negatywnym skutkom mikrograwitacji oraz promieniowania kosmicznego:
- Protokol codziennego treningu oporowego ARED
- Procedura alarmu podwyzszonej aktywnosci slonecznej
- Profilaktyka zespolu przemieszczenia plynow ustrojowych
- Synchronizacja faz snu i cyklu oswietlenia
- Postepowanie w chorobie adaptacji kosmicznej SAS
- Wyszukiwarka procedur oraz filtry kategorii medycznych
- Mozliwosc potwierdzenia zaznajomienia sie z protokolem

### 4. Modul Motywacji i Dobrostanu Psychicznego
Modul wspierajacy morale oraz rownowage psychiczna zalogi:
- Postep realizacji misji orbitalnej oraz licznik dni bezpiecznych
- Rejestr osiagniec i kamieni milowych zespolu
- Oficjalne komunikaty wsparcia z Ziemi
- Interaktywne cwiczenie relaksacji oddechowej z animowanym cyklem wdechu, zatrzymania i wydechu
- Generator codziennych porad psychologicznych

### 5. Dziennik Zdarzen Medycznych
Chronologiczny wykaz zrealizowanych dyspozycji lekarskich oraz zgloszen stanu zdrowia.

## Uruchomienie aplikacji

Aplikacja jest w pelni autonomiczna i dziala w kazdej nowoczesnej przegladarce internetowej bez koniecznosci instalowania dodatkowych srodowisk uruchomieniowych:

Sposob 1:
Kliknij dwukrotnie plik run-app.bat aby otworzyc aplikacje w domyslnej przegladarce.

Sposob 2:
Otworz bezposrednio plik index.html w przegladarce Google Chrome, Microsoft Edge, Mozilla Firefox lub Safari.

## Struktura plikow

- assets/logo.png: Oficjalna ikona i logo systemu telemetrycznego
- assets/favicon.png: Favicon wyswietlany na karcie przegladarki
- index.html: Glowny szkielet aplikacji webowej
- css/style.css: Style wizualne interfejsu inspirowane konsolami kontroli misji
- js/data.js: Baza danych poczatkowych zalogi, telemetrii, zalecen i procedur
- js/charts.js: Generator wektorowych wykresow SVG
- js/app.js: Glowna logika aplikacji, obsluga kont, formularzy i filtrowania
- run-app.bat: Skrypt szybkiego uruchamiania w systemie Windows
- test-compliance.ps1: Skrypt weryfikujacy brak emotek, dlugich myslnikow oraz nawiasow
