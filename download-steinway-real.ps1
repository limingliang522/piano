# Download real Steinway piano samples
# Try multiple sources

Write-Host "Searching for Steinway piano samples..." -ForegroundColor Green
Write-Host ""

# Source 1: Try MuseScore Steinway SoundFont
Write-Host "Attempting Source 1: MuseScore Steinway..." -ForegroundColor Cyan
$sf2Url = "https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3"
$sf2File = "steinway.sf3"

try {
    Write-Host "Downloading SoundFont file (this may take a while)..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $sf2Url -OutFile $sf2File -TimeoutSec 300
    Write-Host "SoundFont downloaded!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: You need to extract samples from .sf3 file" -ForegroundColor Yellow
    Write-Host "Use Polyphone or similar tool to extract" -ForegroundColor White
}
catch {
    Write-Host "Failed to download SoundFont" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Alternative: Try these Steinway sources:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Pianobook (Free, requires registration):" -ForegroundColor White
Write-Host "   https://www.pianobook.co.uk/" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Versilian Studios VSCO 2 CE:" -ForegroundColor White
Write-Host "   https://vis.versilstudios.com/vsco-community.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Spitfire LABS (Free):" -ForegroundColor White
Write-Host "   https://labs.spitfireaudio.com/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Recommendation: Download from Pianobook or Spitfire LABS" -ForegroundColor Green
Write-Host "They have the best quality Steinway samples" -ForegroundColor Green
