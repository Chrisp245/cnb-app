# Exporte les presences actuelles depuis Netlify vers import-presence.sql
# (a lancer AVANT de couper Netlify). Resultat : import-presence.sql dans ce dossier.
$Base = "https://club-natation-bourg.netlify.app/api/presence"
$Out  = Join-Path $PSScriptRoot "import-presence.sql"
$sql  = New-Object System.Collections.Generic.List[string]
$count = 0
foreach ($g in @("avenirs", "benjamins")) {
    $raw = (Invoke-WebRequest -UseBasicParsing -Uri "${Base}?group=$g").Content
    $d = $raw | ConvertFrom-Json
    $rows = @($d.presence)
    for ($i = 0; $i -lt $rows.Count; $i++) {
        $row = @($rows[$i])
        for ($j = 0; $j -lt $row.Count; $j++) {
            if ($null -ne $row[$j]) {
                $v = if ($row[$j] -eq $true) { 1 } else { 0 }
                $sql.Add("INSERT OR REPLACE INTO presence (grp,i,j,value) VALUES ('$g',$i,$j,$v);")
                $count++
            }
        }
    }
    Write-Host "$g : $($rows.Count) lignes lues"
}
Set-Content -Path $Out -Value $sql -Encoding ascii
Write-Host "OK : $count presences ecrites dans $Out"
