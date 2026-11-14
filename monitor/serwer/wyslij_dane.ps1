# Wysyla zbior danych (zip lub folder) na serwer do /root/monitor/dane/<Nazwa>/
# Przyklad: .\wyslij_dane.ps1 -Sciezka "D:\Pobrane\YawDD.zip" -Nazwa YawDD
# Nazwy oczekiwane przez trening.py: YawDD, UTA-RLDD, UBFC-rPPG
param(
    [Parameter(Mandatory)] [string] $Sciezka,
    [Parameter(Mandatory)] [ValidateSet("YawDD", "UTA-RLDD", "UBFC-rPPG")] [string] $Nazwa
)
ssh hackathon "mkdir -p /root/monitor/dane/$Nazwa"
scp -r $Sciezka "hackathon:/root/monitor/dane/$Nazwa/"
ssh hackathon "du -sh /root/monitor/dane/$Nazwa"
