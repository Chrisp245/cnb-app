# ============================================================
# Deploiement automatique du site CNB : GitHub -> Cloudflare Pages
# Remplace deploy-auto.ps1 (Netlify). Meme principe :
# si un .html du dossier "CNB APP" a change, il est copie dans le depot
# Git, commit et pousse. Cloudflare Pages redeploie ensuite tout seul.
# Aucune limite de 12 h (pas de credits a economiser).
# ============================================================
$ErrorActionPreference = "Stop"

$SiteFolder = "C:\Users\pgcsa\OneDrive\Desktop\CNB APP"
$RepoFolder = "C:\dev\cnb-app"
$LogFile    = Join-Path $SiteFolder "deploy-auto.log"
$Pages      = @("index.html","cnbb_home.html","cnbb_accueil.html","cnbb_benjamins.html","cnbb_mpp.html","cnbb_presence.html")

function Write-Log($m) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

try {
    $changed = $false
    foreach ($p in $Pages) {
        $src = Join-Path $SiteFolder $p
        $dst = Join-Path $RepoFolder ("public\" + $p)
        if (-not (Test-Path $src)) { continue }
        if (-not (Test-Path $dst) -or (Get-FileHash $src).Hash -ne (Get-FileHash $dst).Hash) {
            Copy-Item $src $dst -Force
            $changed = $true
        }
    }
    if (-not $changed) { exit 0 }

    Push-Location $RepoFolder
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    git add -A 2>&1 | Out-Null
    $status = git status --porcelain
    if ($status) {
        git commit -m "Mise a jour auto $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
        $out = git push 2>&1 | Out-String
        $code = $LASTEXITCODE
        $out | Out-File -FilePath $LogFile -Append -Encoding utf8
        if ($code -eq 0) { Write-Log "Push reussi, Cloudflare Pages redeploie." }
        else { Write-Log "ECHEC du push (code $code). Voir le detail ci-dessus." }
    }
    $ErrorActionPreference = $prev
    Pop-Location
}
catch {
    Write-Log "ERREUR : $($_.Exception.Message)"
}
