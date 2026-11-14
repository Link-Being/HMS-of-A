# -*- coding: utf-8 -*-
# Skrypt aktualizujacy baze danych instrukcji, harmonogramu FIFO, profilaktyki i scenariuszy krytycznych wedlug specyfikacji PDF

import re

step_procedures_js = """  stepProcedures: [
    {
      id: 'proc-cisnienie',
      code: 'HMS-PR-BP-01',
      name: 'Pomiar cisnienia tetniczego i saturacji SpO2',
      category: 'Uklad krazenia i regeneracja',
      description: 'Procedura standaryzowanego pomiaru cisnienia krwi oraz wysycenia tlenem w mikrograwitacji',
      steps: [
        'Krok 1 z 5: Stabilizacja ciala. Usiadz stabilnie w fotelu diagnostycznym, zapnij pasy biodrowe i odpocznij bez ruchu przez piec minut.',
        'Krok 2 z 5: Zalozenie mankietu. Umiesc mankiet tensjometru na lewym ramieniu, dokladnie dwa centymetry powyzej zgiecia lokciowego na poziomie serca.',
        'Krok 3 z 5: Podlaczenie pulsoksymetru. Zaloz czujnik optyczny SpO2 na palec wskazujacy prawej dloni i odczekaj na ustabilizowanie pulsu.',
        'Krok 4 z 5: Potrojna rejestracja cisnienia. Uruchom automatyczny cykl trzech pomiarow z odstepem dziewiecdziesieciu sekund pomiedzy inflacjami.',
        'Krok 5 z 5: Weryfikacja i synchronizacja. Sprawdz czy saturacja SpO2 przekracza 96 procent oraz czy cisnienie miesci sie w normie, nastepnie zatwierdz przeslanie do bazy telemetrii.'
      ]
    },
    {
      id: 'proc-ekg',
      code: 'HMS-PR-EKG-02',
      name: 'Rejestracja elektrokardiograficzna EKG oraz zmiennosci HRV',
      category: 'Uklad krazenia i regeneracja',
      description: 'Zapis holterowski 12-odprowadzeniowy oraz wyznaczenie wskaznikow rezerwy autonomicznej organizmu',
      steps: [
        'Krok 1 z 5: Odtluszczenie powierzchni skory. Przetrzyj gazikiem alkoholowym wyznaczone punkty na klatce piersiowej i poczekaj do pelnego wyschniecia.',
        'Krok 2 z 5: Aplikacja czujnikow. Zaloz kamizelke biometryczna lub naklej wielopunktowy plaster naskorny z elektrodami EKG.',
        'Krok 3 z 5: Test jakosci styku. Sprawdz w konsoli medycznej poziom impedancji naskorkowej i upewnij sie, ze poziom szumu jest ponizej progu bledu.',
        'Krok 4 z 5: Spoczynek rejestracyjny. Przyjmij pozycje lezaca na piec minut, oddychajac miarowo w celu wyznaczenia zmiennosci rytmu serca HRV.',
        'Krok 5 z 5: Zapis i weryfikacja arytmii. Zakoncz sesje zapisu, sprawdz automatyczny raport braku ekstrasystolii i przeslij protokol do centrum.'
      ]
    },
    {
      id: 'proc-pot',
      code: 'HMS-PR-SWEAT-03',
      name: 'Analiza biochemiczna potu z plastra mikroprzeplywowego',
      category: 'Biochemia i stres: analiza potu',
      description: 'Oznaczenie stezen jonow sodu, potasu, mleczanow, wapnia oraz bialka CRP',
      steps: [
        'Krok 1 z 5: Przygotowanie sensoryczne. Oczysc wewnetrzna czesc przedramienia i wyjmij hermetycznie zamkniety mikroprzeplywowy biosensor kapilarny.',
        'Krok 2 z 5: Aplikacja plastra. Umiesc elastyczny plaster na skorze, dociskajac rownomiernie brzegi przez dwadziescia sekund w celu uzyskania szczelnosci.',
        'Krok 3 z 5: Mikrojontoforeza stymulujaca. Aktywuj 3-minutowa jontoforeze pilokarpinowa o niskim natezeniu pradu w celu pobudzenia ekrynowych gruczolow potowych.',
        'Krok 4 z 5: Rejestracja biomarkerow. Poczekaj na napelnienie mikroukladu enzymatycznego i odczyt elektrolitow sodu, potasu, mleczanow, wapnia oraz cytokin CRP.',
        'Krok 5 z 5: Transfer telemetrii. Wykonaj bezprzewodowa synchronizacje NFC z terminalem pokladowym i zdeponuj zuzyty wklad w zasobniku medycznym.'
      ]
    },
    {
      id: 'proc-semg',
      code: 'HMS-PR-SEMG-04',
      name: 'Ocena zmeczenia neuromiesniowego SEMG i dynamometria',
      category: 'Miesnie i uklad ruchu',
      description: 'Pomiar mediany czestotliwosci MDF oraz wspolczynnika przejsc przez zero ZCR na urzadzeniu ARED',
      steps: [
        'Krok 1 z 5: Pozycjonowanie elektrod. Naklej elektrody powierzchniowe SEMG wzdluz brzuscca miesnia czworoglowego uda oraz miesnia brzuchatego lydki.',
        'Krok 2 z 5: Kalibracja zerowa. Przeprowadz 10-sekundowy odczyt spoczynkowy w celu wyznaczenia szumu bazowego i napiecia spoczynkowego.',
        'Krok 3 z 5: Maksymalny skurcz izometryczny. Wykonaj 5-sekundowe napiecie probne na maszynie ARED do wyznaczenia maksymalnej sily odniesienia.',
        'Krok 4 z 5: Seria treningowa z monitoringiem. Przeprowadz serie przysiadow z biezacym sledzeniem mediany czestotliwosci sygnalu MDF.',
        'Krok 5 z 5: Analiza mikrodrzen ZCR. Sprawdz czy wskaznik przejsc przez zero ZCR nie wykazuje skoku swiadczacego o klastrze skrajnego przeciazenia i zapisz wynik.'
      ]
    },
    {
      id: 'proc-cns',
      code: 'HMS-PR-CNS-05',
      name: 'Badanie fal mozgowych EEG i skupienia wzroku Eye-tracking',
      category: 'Sen i uklad nerwowy CNS',
      description: 'Ocena zmeczenia poznawczego, czasu reakcji psychomotorycznej oraz wskaznika Cognitive Readiness',
      steps: [
        'Krok 1 z 5: Zalozenie opaski EEG. Umiesc opaske z suchymi elektrodami na czole i potylicy, regulujac docisk do uzyskania zielonego wskaznika sygnalu.',
        'Krok 2 z 5: Kalibracja eyetrackera. Spojrz kolejno na 5 podswietlonych punktow referencyjnych na glownym monitorze konsoli roboczej.',
        'Krok 3 z 5: Test psychomotoryczny PVT. Wykonaj 3-minutowy standaryzowany test czasu reakcji na losowe bodzce wizualne pojawiajace sie na ekranie.',
        'Krok 4 z 5: Analiza widma fal theta i beta. System dokona automatycznej kalkulacji indeksu narastajacego zmeczenia poznawczego oraz czasu fiksacji wzroku.',
        'Krok 5 z 5: Zatwierdzenie indeksu gotowosci. Zweryfikuj koncowy wskaznik Gotowosci Poznawczej Cognitive Readiness i dolacz raport do harmonogramu misji.'
      ]
    }
  ],
  scheduleData: {
    nextTestCountdownSeconds: 2720,
    upcomingTests: [
      {
        id: 'up-1',
        title: 'Pomiar cisnienia tetniczego i saturacji SpO2',
        astronaut: 'Adam Kolosa',
        timeUtc: 'Dzisiaj 17:15 UTC',
        procId: 'proc-cisnienie'
      },
      {
        id: 'up-2',
        title: 'Zapis EKG i zmiennosci rytmu serca HRV',
        astronaut: 'Jan Hopperl',
        timeUtc: 'Dzisiaj 19:30 UTC',
        procId: 'proc-ekg'
      },
      {
        id: 'up-3',
        title: 'Badanie fal mozgowych EEG i skupienia Eye-tracking',
        astronaut: 'Wojciech Skrzypczak',
        timeUtc: 'Jutro 07:00 UTC',
        procId: 'proc-cns'
      },
      {
        id: 'up-4',
        title: 'Biochemiczna analiza potu: wapn i bialko CRP',
        astronaut: 'Krzysztof Mysior',
        timeUtc: 'Jutro 11:00 UTC',
        procId: 'proc-pot'
      }
    ],
    overdueFifoQueue: [
      {
        id: 'fifo-1',
        title: 'Biochemiczna analiza potu: elektrolity i kortyzol',
        astronaut: 'Krzysztof Mysior',
        dueTime: 'Wczoraj 20:30 UTC',
        delay: '20 godz. temu',
        orderIndex: 1,
        procId: 'proc-pot'
      },
      {
        id: 'fifo-2',
        title: 'Ocena neuromiesniowa SEMG na maszynie ARED',
        astronaut: 'Michał Pawlak',
        dueTime: 'Dzisiaj 08:00 UTC',
        delay: '8 godz. temu',
        orderIndex: 2,
        procId: 'proc-semg'
      }
    ]
  },
  prophylaxisGuidelines: [
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Za wysokie tetno HR w spoczynku lub nagly wzrost w ciagu dnia',
      guideline: 'Odpoczynek, przerwanie aktualnego wysilku, nawodnienie organizmu, sesja oddechowa redukujaca stres.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Poranny wzrost tetna spoczynkowego polaczony ze spadkiem zmiennosci rytmu serca HRV',
      guideline: 'Oznaka niepelnej regeneracji nocnej. Automatyczne obnizenie trudnosci zaplanowanych zadan w harmonogramie i zamiana ciezkich aktywnosci na lzejsze.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Dlugotrwaly trend spadkowy HRV w ujeciu wielodniowym',
      guideline: 'Sygnal kumulujacego sie przemeczenia lub przetrenowania. Wprowadzenie dnia regeneracyjnego, wydluzenie czasu snu i ograniczenie intensywnych treningow.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Nagly spadek cisnienia krwi BP w trakcie aktywnosci lub spaceru kosmicznego EVA',
      guideline: 'Natychmiastowe wstrzymanie pracy fizycznej, uzupelnienie plynow i elektrolitow, kontrola objawow ortostatycznych oraz powiadomienie lekarza misji.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Stopniowy wzrost cisnienia krwi BP w czasie',
      guideline: 'Redukcja obciazenia psychofizycznego, techniki relaksacyjne, kontrola bilansu wodno-elektrolitowego, szczegolnie sodu.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Wykryte zaburzenia rytmu serca arytmia podczas wysilku lub spoczynku',
      guideline: 'Natychmiastowe przerwanie zadania, odpoczynek, odczyt pelnego zapisu EKG z kamizelki biometrycznej lub plastra naskornego i pilna konsultacja medyczna.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Spadek saturacji krwi SpO2 ponizej normy lub trend spadkowy w trakcie wysilku',
      guideline: 'Przerwanie aktywnosci, kontrola wentylacji i stezenia tlenu O2 w skafandrze lub kabinie, spokojne glebokie oddychanie.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Stopniowy lub nagly wzrost temperatury ciala',
      guideline: 'Wczesny sygnal przegrzania lub rozwijajacej sie infekcji. Schlodzenie organizmu, korekta temperatury kabiny lub skafandra, nawodnienie, odpoczynek i krzyzowa weryfikacja poziomu bialka CRP w pocie.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Niedobor snu glebokiego lub fazy REM w ujeciu nocnym',
      guideline: 'Przelozenie zadan wymagajacych wysokiej precyzji, na przyklad napraw lub eksperymentow, na inny termin oraz zaplanowanie w ciagu dnia krotkiej drzemki regeneracyjnej power nap.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Wielodniowy deficyt calkowitego czasu i jakosci snu: aktygrafia i EEG',
      guideline: 'Obnizenie wskaznika Gotowosci Poznawczej Cognitive Readiness, delegowanie wylacznie zadan rutynowych, korekta warunkow srodowiskowych kabiny przed kolejnym snem: obnizenie temperatury i poziomu CO2.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Zmiana wzorca fal mozgowych EEG wskazujaca na narastajace zmeczenie poznawcze w trakcie pracy',
      guideline: 'Wprowadzenie krotkiej, 10-minutowej przerwy regeneracyjnej, zmiana rodzaju aktywnosci na mniej obciazajaca umyslowo.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Spadek poziomu skupienia rejestrowany przez ruch galek ocznych: eye-tracking, wydluzony czas fiksacji, wolniejsze reakcje',
      guideline: 'Alert haptyczny przypominajacy o przerwie, odsuniecie od procedur krytycznych, na przyklad sterowania lub obslugi skomplikowanej aparatury, do czasu powrotu pelnej uwagi.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Jednoczesny spadek koncentracji EEG i eye-tracking oraz wzrost stezenia CO2 w otoczeniu',
      guideline: 'Natychmiastowa wentylacja pomieszczenia lub modulu, opuszczenie strefy o slabej cyrkulacji powietrza i chwila odpoczynku.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Spadek mediany czestotliwosci sygnalu miesniowego MDF w SEMG w trakcie serii cwiczen lub pracy fizycznej',
      guideline: 'Wczesny sygnal zmeczenia miesni, stan przejsciowy. Dynamiczne zmniejszenie obciazenia treningowego, na przyklad na maszynach ARED lub T2, lub skrocenie podzadania.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Wzrost wspolczynnika przejsc przez zero ZCR w SEMG oznaczajacy mikrodrzenia miesni',
      guideline: 'Oznaka krytycznego wyczerpania i ryzyka kontuzji: Klaster 3 Zmeczenie i Przeciazenie. Natychmiastowe przerwanie wysilku, rozciaganie i wydluzony odpoczynek.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Spadek mocy i momentu sily w stawach: IMU, goniometr, odziez Fibre-WBAN w porownaniu do wartosci bazowych z poprzednich dni',
      guideline: 'Modyfikacja planu treningowego, wlaczenie elektrostymulacji miesniowej EMS w celu wsparcia regeneracji i zapobiegania atrofii.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Dlugotrwale ograniczenie zakresu ruchu i aktywnosci okolic talii oraz bioder: czujniki IMU i dotykowe',
      guideline: 'Wprowadzenie dedykowanych cwiczen rozciagajacych i mobilizujacych odcinek ledzwiowo-biodrowy w celu przeciwdzialania sztywnosci i zanikom miesniowym w mikrograwitacji.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Asymetria pracy miesni lub nieprawidlowe katy zgiecia stawow podczas podnoszenia ciezarow lub pracy w skafandrze',
      guideline: 'Korekta techniki ruchu w czasie rzeczywistym, zmniejszenie obciazenia w celu unikniecia przeciazenia stawow.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Wysoki poziom kortyzolu rano: zaburzenie rytmu dobowego',
      guideline: 'Redukcja obciazenia zadaniami na dany dzien, wlaczenie sesji oddechowej lub treningu relaksacyjnego.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Nagly skok kortyzolu w ciagu dnia: ostra reakcja stresowa',
      guideline: 'Krotka przerwa od biezacych obowiazkow, techniki wyciszajace, weryfikacja tetna i cisnienia krwi.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Szybki wzrost stezenia mleczanow w pocie podczas wysilku',
      guideline: 'Sygnal przekroczenia progu beztlenowego i narastajacego zakwaszenia miesni. Zmniejszenie tempa pracy lub treningu, 10-minutowa przerwa na odpoczynek i nawodnienie.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Wzrost stezenia jonow sodu Na plus i potasu K plus w pocie',
      guideline: 'Oznaka postepujacego odwodnienia organizmu. Natychmiastowy alert o koniecznosci uzupelnienia plynow oraz elektrolitow.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Dlugotrwaly wzrost wydalania jonow wapnia Ca 2 plus w pocie w ujeciu tygodniowym lub miesiecznym',
      guideline: 'Sygnal przyspieszonej utraty masy kostnej: osteopenii kosmicznej. Weryfikacja suplementacji: witamina D, wapn, oraz korekta obciazen oporowych podczas treningow silowych.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Wzrost poziomu bialka CRP oraz cytokin prozapalnych w pocie',
      guideline: 'Wczesne wykrycie stanu zapalnego, mikrourazow miesniowych lub rozwijajacej sie infekcji, czesto jeszcze przed wystapieniem goraczki. Bezwzgledny odpoczynek, odwolanie wysilku fizycznego i wdrozenie procedur medycznych.'
    },
    {
      category: 'Srodowisko kabiny i skafandra',
      symptom: 'Narastajace stezenie dwutlenku wegla CO2 w module lub skafandrze',
      guideline: 'Zapobieganie bolom glowy, sennosci i spadkowi koncentracji poprzez automatyczne zwiekszenie wydajnosci systemow podtrzymywania zycia ECLSS lub wymiane pochlaniaczy.'
    },
    {
      category: 'Srodowisko kabiny i skafandra',
      symptom: 'Wzrost temperatury i wilgotnosci otoczenia podczas pracy fizycznej lub snu',
      guideline: 'Automatyczne schlodzenie kabiny przed snem, dla poprawy jakosci faz NREM i REM, oraz regulacja chlodzenia cieczowego w skafandrze EVA w celu unikniecia odwodnienia i przegrzania.'
    },
    {
      category: 'Srodowisko kabiny i skafandra',
      symptom: 'Podwyzszony poziom tlenku azotu NO wykryty przez czujniki w odziezy',
      guideline: 'Sygnal podraznienia lub stanu zapalnego drog oddechowych. Kontrola czystosci powietrza pod katem pylow i aerozoli, nawilzenie sluzowek i odpoczynek.'
    },
    {
      category: 'Srodowisko kabiny i skafandra',
      symptom: 'Wzrost skumulowanej dawki promieniowania jonizujacego w czasie: dozymetry',
      guideline: 'Skrocenie czasu przebywania w slabiej oslonietych modulach lub przerwanie spaceru kosmicznego EVA, przejscie do strefy o zwiekszonej oslonie radiacyjnej oraz monitorowanie markerow stresu oksydacyjnego i stanu zapalnego CRP.'
    }
  ],
  criticalScenarios: [
    {
      category: 'Uklad krazenia i zagrozenie zycia',
      title: 'Powazna lub utrzymujaca sie arytmia wykryta w zapisie EKG lub PPG podczas EVA lub spoczynku',
      action: 'Natychmiastowe przerwanie spaceru kosmicznego EVA przez drugiego czlonka zalogi i odprowadzenie astronauty do sluzy. Konieczna pilna telekonsultacja z lekarzem misji oraz rozwazenie powrotu na Ziemie przy braku stabilizacji rytmu serca.'
    },
    {
      category: 'Uklad krazenia i zagrozenie zycia',
      title: 'Gwaltowny, gleboki spadek cisnienia krwi BP polaczony z przyspieszeniem tetna HR i zawrotami glowy',
      action: 'Ryzyko omdlenia, szczegolnie przez przesuniecie plynow ku glowie i spadek masy miesnia sercowego w mikrograwitacji. Wymagana bezposrednia asekuracja przez innego czlonka zalogi, podanie plynow i lekow pod nadzorem lekarza misji.'
    },
    {
      category: 'Uklad krazenia i zagrozenie zycia',
      title: 'Krytyczny spadek saturacji krwi SpO2 niereagujacy na korekte tlenu w skafandrze lub kabinie',
      action: 'Podejrzenie obrzeku pluc, zatorowosci lub awarii ukladu oddechowego. Natychmiastowa pomoc zalogi: podanie czystego tlenu, resuscytacja w razie utraty przytomnosci, alarm dla lekarza misji i przygotowanie do ewakuacji na Ziemie.'
    },
    {
      category: 'Uklad krazenia i zagrozenie zycia',
      title: 'Wysoka goraczka, gwaltowny wzrost temperatury ciala, polaczona z zaburzeniami pracy serca',
      action: 'Sygnal ciezkiej infekcji ogolnoustrojowej lub sepsy. Konieczna izolacja w module medycznym pod opieka zalogi, wdrozenie farmakoterapii zleconej przez lekarza misji oraz ocena zasadnosci ewakuacji.'
    },
    {
      category: 'Uklad nerwowy CNS i funkcje poznawcze',
      title: 'Gwaltowna utrata uwagi: eye-tracking, i patologiczny zapis fal mozgowych EEG w trakcie zadan krytycznych',
      action: 'Ryzyko utraty swiadomosci lub popelnienia katastrofalnego bledu podczas dokowania, napraw czy EVA. Natychmiastowe przejecie obowiazkow i zabezpieczenie astronauty przez innego czlonka zalogi.'
    },
    {
      category: 'Uklad nerwowy CNS i funkcje poznawcze',
      title: 'Skrajne, wielodniowe zaburzenia snu i rytmu dobowego prowadzace do halucynacji lub glebokiej dezorientacji',
      action: 'Zalamanie Gotowosci Poznawczej Cognitive Readiness na skutek stresu, izolacji i przeciazenia. Wymagana interwencja psychologa lub lekarza misji, staly nadzor zalogi i ewentualne skrocenie misji: powrot na Ziemie.'
    },
    {
      category: 'Uklad nerwowy CNS i funkcje poznawcze',
      title: 'Nagle zaburzenia koordynacji ruchowej: dane z IMU lub goniometru, polaczone z zaburzeniami pracy mozgu EEG',
      action: 'Podejrzenie udaru lub ostrego uszkodzenia neurologicznego, na przyklad w wyniku promieniowania kosmicznego. Natychmiastowa opieka zalogi, alarm dla lekarza misji i pilna ewakuacja na Ziemie.'
    },
    {
      category: 'Miesnie, uklad ruchu i urazy mechaniczne',
      title: 'Gwaltowne, niekontrolowane mikrodrzenia miesni: skok ZCR w SEMG, i nagly zanik sily lub momentu obrotowego IMU podczas EVA',
      action: 'Calkowite wyczerpanie miesniowe grozace utrata chwytu i dryfowaniem w przestrzeni lub kontuzja. Konieczna natychmiastowa pomoc partnera EVA w powrocie do stacji i zabezpieczeniu sprzetu.'
    },
    {
      category: 'Miesnie, uklad ruchu i urazy mechaniczne',
      title: 'Ostra asymetria katow zgiecia stawow i gwaltowny spadek mocy miesniowej polaczony z bolem',
      action: 'Podejrzenie zerwania miesnia, wiezadla lub zlamania: wysokie ryzyko ze wzgledu na utrate 1 do 2 procent masy kostnej miesiecznie. Pomoc zalogi w unieruchomieniu, konsultacja z chirurgiem lub ortopeda na Ziemi i powrot na Ziemie w przypadku zlaman wymagajacych operacji.'
    },
    {
      category: 'Miesnie, uklad ruchu i urazy mechaniczne',
      title: 'Utrata stabilnosci i mobilnosci odcinka ledzwiowo-biodrowego: czujniki IMU i dotykowe na biodrach',
      action: 'Ostre wypadniecie dysku lub silny zespol bolowy kregoslupa wywolany brakiem rozciagania w mikrograwitacji. Wymagana pomoc zalogi w transporcie i opiece oraz konsultacja ze specjalista.'
    },
    {
      category: 'Biochemia, metabolizm i ostre stany zapalne: analiza potu',
      title: 'Gwaltowny, skokowy wzrost bialka CRP i cytokin prozapalnych w pocie: plaster mikroprzeplywowy',
      action: 'Ostry stan zapalny, ciezka infekcja, na przyklad zapalenie pluc, wyrostka robaczkowego, lub masywny rozpad miesni: rabdomioliza. Wymaga natychmiastowej interwencji lekarza misji, diagnostyki pokladowej prowadzonej przez zaloge i potencjalnej ewakuacji na Ziemie.'
    },
    {
      category: 'Biochemia, metabolizm i ostre stany zapalne: analiza potu',
      title: 'Krytyczne zaburzenia elektrolitowe: skrajne wahania Na plus i K plus w pocie, polaczone z arytmia HR i HRV',
      action: 'Ciezkie odwodnienie lub zaburzenia gospodarki potasowej grozace zatrzymaniem krazenia. Konieczne podanie kroplowki: nawodnienie dozylne, przez przeszkolonego czlonka zalogi pod nadzorem lekarza misji.'
    },
    {
      category: 'Biochemia, metabolizm i ostre stany zapalne: analiza potu',
      title: 'Ekstremalnie wysokie stezenie mleczanow utrzymujace sie mimo zaprzestania wysilku',
      action: 'Sygnal kwasicy mleczanowej lub niedotlenienia tkanek. Wymaga pilnej oceny medycznej przez specjaliste z Ziemi i tlenoterapii pod nadzorem zalogi.'
    },
    {
      category: 'Biochemia, metabolizm i ostre stany zapalne: analiza potu',
      title: 'Krytycznie wysoki poziom jonow wapnia Ca 2 plus w pocie w ujeciu ciaglym',
      action: 'Sygnal gwaltownej demineralizacji kosci niosacej bezposrednie ryzyko kamicy nerkowej i zlaman patologicznych. Wymaga interwencji specjalisty endokrynologa lub lekarza misji, modyfikacji leczenia oraz rozwazenia wczesniejszego powrotu na Ziemie.'
    },
    {
      category: 'Zagrozenia srodowiskowe kabiny i skafandra',
      title: 'Gwaltowny wzrost stezenia CO2 lub spadek O2 w skafandrze EVA lub odizolowanym module z jednoczesnym spadkiem SpO2 i zaburzeniami EEG',
      action: 'Ostra hiperkapnia lub hipoksja: zatrucie dwutlenkiem wegla lub niedotlenienie. Natychmiastowa akcja ratunkowa drugiego astronauty: podlaczenie zapasowego zrodla tlenu, ewakuacja ze strefy zagrozenia, i interwencja medyczna.'
    },
    {
      category: 'Zagrozenia srodowiskowe kabiny i skafandra',
      title: 'Skokowy wzrost tlenku azotu NO wykryty przez czujniki w odziezy podczas awarii lub pozaru',
      action: 'Ostre chemiczne podraznienie lub obrzek drog oddechowych. Konieczne zalozenie masek tlenowych przez zaloge, ewakuacja poszkodowanego, konsultacja z pulmonologiem lub toksykologiem oraz powrot na Ziemie w razie niewydolnosci oddechowej.'
    },
    {
      category: 'Zagrozenia srodowiskowe kabiny i skafandra',
      title: 'Przekroczenie krytycznej dawki promieniowania jonizujacego: dozymetry, na przyklad podczas burzy slonecznej na EVA',
      action: 'Ryzyko ostrej choroby popromiennej ARS. Natychmiastowe schronienie w oslonietym module z pomoca zalogi, wdrozenie protokolu medycznego przez specjalistow z Ziemi oraz pilny powrot na Ziemie na leczenie hematologiczne lub onkologiczne.'
    },
    {
      category: 'Zagrozenia srodowiskowe kabiny i skafandra',
      title: 'Awaria chlodzenia w skafandrze EVA prowadzaca do skrajnego wzrostu temperatury ciala i tetna',
      action: 'Udar cieplny. Natychmiastowe przerwanie misji na zewnatrz stacji przez partnera, szybkie schlodzenie organizmu w sluzie przez zaloge i nadzor lekarza misji.'
    }
  ],"""

print("Data definition ready!")

with open('js/data.js', 'r', encoding='utf-8') as f:
    data_content = f.read()

target = "  instructions: ["
replacement = step_procedures_js + "\n" + target

if target in data_content:
    new_data = data_content.replace(target, replacement, 1)
    with open('js/data.js', 'w', encoding='utf-8') as f:
        f.write(new_data)
    print("Successfully updated js/data.js!")
else:
    print("Target not found in js/data.js")
