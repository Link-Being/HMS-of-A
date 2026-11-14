# HMS-of-A

System Telemetrii Medycznej i Monitorowania Zdrowia Astronautow

## Opis projektu

Aplikacja webowa sluzaca do prezentacji, analizy oraz zarzadzania danymi medycznymi czlonkow zalogi stacji kosmicznej. System umozliwia ciagly nadzor parametrow zyciowych, rejestracje objawow, wydawanie zalecen lekarskich oraz dostep do procedur profilaktycznych i wsparcia motywacyjnego.

## Uwierzytelnianie i przykladowe konta dostepowe

W aplikacji wdrozeno dedykowany panel logowania zabezpieczajacy dostep do danych medycznych. Szybkie przelaczanie kont zostalo zastapione autoryzacja za pomoca identyfikatora oraz hasla. Po zalogowaniu uzytkownik ma mozliwosc zakonczenia sesji przyciskiem Wyloguj.

Pod formularzem logowania znajduje sie czytelny wykaz wszystkich przykladowych kont dostepowych wraz z przyciskami umozliwiajacymi automatyczne uzupelnienie pol formularza jednym kliknieciem.

## Tryby dzialania i konta dostepowe

System umozliwia prace w dwoch srodowiskach:
1. Tryb rzeczywisty: domyslny stan operacyjny. Baza zalogi jest poczatkowo wyczyszczona z personelu testowego i zawiera jedynie konto Kierownika Misji Marka Marczaka. Uzytkownik ma pelna swobode dodawania wlasnych astronautow, tworzenia kont dostepowych oraz rejestrowania biezacych pomiarow telemetrycznych.
2. Tryb demonstracyjny: srodowisko prezentacyjne z gotowa zaloga pieciu astronautow oraz kierownikiem misji, ze zdefiniowanymi odchyleniami biometrycznymi, badaniami okresowymi oraz historia telemetrii do celow pokazowych.

Wykaz kont dostepnych w systemie:

1. Marek Marczak:
- Rola: Kierownik
- Identyfikator: marczak
- Haslo: marczak2026
- Uprawnienia: Pelny wglad w telemetrie zalogi oraz wydawanie zalecen dla astronautow

2. Adam Kolosa:
- Identyfikator: kolosa
- Haslo: kolosa1
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia procedur

3. Michał Pawlak:
- Identyfikator: pawlak
- Haslo: pawlak2
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia procedur

4. Krzysztof Mysior:
- Identyfikator: mysior
- Haslo: mysior3
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia procedur

5. Jan Hopperl:
- Identyfikator: hopperl
- Haslo: hopperl4
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia procedur

6. Wojciech Skrzypczak:
- Identyfikator: skrzypczak
- Haslo: skrzypczak5
- Uprawnienia: Osobisty pulpit zdrowia i zgloszenia procedur

## Podzial danych medycznych wedlug czestotliwosci

System scisle rozroznia dwa rodzaje danych zgodnie ze specyfikacja kosmiczna:

### 1. Pomiary w trybie ciaglym:
Wskazniki transmitowane na zywo i zmieniajace sie w czasie rzeczywistym:
- Tetno HR w jednostkach bpm
- Interwaly RR miedzy uderzeniami serca w milisekundach
- Zmiennosc rytmu zatokowego HRV Status RMSSD w milisekundach
- Saturacja krwi SpO2 w procentach
- Czestosc oddechowa w liczbie oddechow na minute
- Poziom obciazenia i stresu w punktach od 0 do 100
- Rezerwa metaboliczna Body Battery w punktach od 0 do 100
- Temperatura skory w stopniach Celsjusza
- Telemetria srodowiskowa modulu stacji ECLSS: temperatura w kabinie, cisnienie atmosferyczne, wilgotnosc wzgledna, stezenie tlenu O2, poziom dwutlenku wegla CO2 oraz stan zbiornikow wody

### 2. Pomiary i badania okresowe:
Badania wykonywane cyklicznie lub interwencyjnie. Kazde badanie posiada zarejestrowana dokladna date, godzine odczytu, sprzet pomiarowy, wynik oraz status kliniczny:
- Cisnienie tetnicze krwi i 3-kanalowe EKG: Kamizelka Astroskin Bio-Monitor
- Analiza czasu i faz snu oraz Sleep Score: Opaska biometryczna Actiwatch
- Wydolnosc tlenowa VO2 max oraz test sprawnosciowy: Pulsometr wydolnosciowy Garmin
- Sesja treningu oporowego i biegowego: Stanowisko treningowe ARED oraz bieznik T2
- Biochemia potu: Plaster biometryczny Bio-Patch sensor mierzy kortyzol, mleczany, Na, K, Ca oraz CRP
- Elektromiografia sEMG i dynamika ruchu: Paski sensorowe Fibre-WBAN klasyfikujace zmeczenie na 3 stany
- Uklad nerwowy CNS: Opaska EEG neuro-sensor mierzy indeks gotowosci poznawczej i fale mozgu
- Dozymetria radiacyjna: Dozymetr osobisty i skafandra RAD-ISS

## Glowne moduly aplikacji

### 1. Panel Glowny Kierownika Misji
Marek Marczak posiada panel zarzadzania misja:
- Zbiorcze podsumowanie zdrowotne zalogi
- Monitorowanie parametrow stacji kabiny ECLSS w czasie rzeczywistym
- Karty biometryczne czlonkow zalogi z pulsujacymi pomiarami ciaglymi oraz podgladem ostatniego badania okresowego
- Srednie wskazniki zespolowe oraz interaktywne wykresy porownawcze
- Szybkie przejscie do pelnej telemetrii lub wydania zalecenia lekarskiego

### 2. Osobiste Pulpity Astronautow
Kazdy z pieciu astronautow ma dostep do wlasnego profilu:
- Szczegolowy zestaw wskaznikow ciaglych
- Tabela wynikow badan okresowych z dokladna data i godzina
- Wykres osobisty trendu telemetrycznego z 6 dni
- Zalecenia medyczne przekazane przez kierownika misji Marka Marczaka
- Codzienny raport wykonania treningow i samopoczucia

### 3. Baza Instrukcji i Profilaktyki Kosmicznej
Zestaw procedur przeciwdzialajacych negatywnym skutkom mikrograwitacji oraz promieniowania kosmicznego:
- Protokol codziennego treningu oporowego ARED
- Procedura alarmu podwyzszonej aktywnosci slonecznej
- Profilaktyka zespolu przemieszczenia plynow ustrojowych
- Synchronizacja faz snu i cyklu oswietlenia
- Postepowanie w chorobie adaptacji kosmicznej SAS

### 4. Modul Motywacji i Dobrostanu Psychicznego
Wsparcie psychologiczne oraz monitorowanie morale:
- Postep misji Horyzont Jeden i licznik dni bez incydentu
- Kamienie milowe misji
- Oficjalne slowa wsparcia z Ziemi
- Cwiczenie relaksacyjne regulacji oddechu
- Praktyczne wskazowki antystresowe

### 5. Dziennik Zdarzen Medycznych
Chronologiczny wykaz decyzji medycznych, wprowadzonych odczytow i zgloszen zalogi.

### 6. Ustawienia i Zarzadzanie Zaloga
Centrum administracyjne:
- Przelaczanie miedzy trybem rzeczywistym a trybem demonstracyjnym
- Dodawanie nowych astronautow z wlasnymi parametrami
- Import telemetrii biometrycznej Garmin

## Uruchomienie aplikacji w srodowisku Python

Aplikacja dziala jako serwer webowy na srodowisku lokalnym:

Sposob 1:
Kliknij dwukrotnie plik start-server.bat lub run-app.bat. Uruchomi to serwer Python i automatycznie otworzy przegladarke pod adresem http://localhost:5000/

Sposob 2:
Wpisz w terminalu:
python app.py
i przejdz w przegladarce pod adres http://localhost:5000/

Sposob 3:
Mozesz takze otworzyc bezposrednio plik index.html w dowolnej przegladarce.

## Struktura plikow

- app.py: Glowny serwer webowy Flask z watkiem symulacji telemetrii w tle oraz REST API
- start-server.bat: Skrypt uruchamiajacy serwer Python i otwierajacy adres localhost
- run-app.bat: Skrypt szybkiego uruchamiania w systemie Windows
- assets/logo.png: Oficjalna ikona i logo systemu telemetrycznego
- assets/favicon.png: Favicon wyswietlany na karcie przegladarki
- index.html: Glowny szkielet aplikacji webowej
- css/style.css: Style wizualne interfejsu inspirowane konsolami kontroli misji
- js/data.js: Baza danych poczatkowych zalogi, telemetrii ciaglej, badan okresowych, zalecen i procedur
- js/stream.js: Silnik transmisji i generowania telemetrii medycznej w czasie rzeczywistym
- js/charts.js: Generator wektorowych wykresow SVG
- js/app.js: Glowna logika aplikacji, obsluga kont, formularzy, tabel badan okresowych i filtrowania
- test-compliance.ps1: Skrypt weryfikujacy brak emotek, dlugich myslnikow oraz nawiasow
