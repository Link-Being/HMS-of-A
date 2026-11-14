# Kopiuje wytrenowane modele z serwera do laptop\modele
$cel = Join-Path $PSScriptRoot "..\laptop\modele"
New-Item -ItemType Directory -Force $cel | Out-Null
scp "hackathon:/root/monitor/modele/*" $cel
Get-ChildItem $cel | Select-Object Name, @{n = "MB"; e = { [math]::Round($_.Length / 1MB, 1) } }
