# Download all available piano notes from FluidR3 GM
$baseUrl = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3"
$outputDir = "piano-samples-new"

# All 88 piano keys (A0 to C8)
$allNotes = @(
    'A0', 'As0', 'B0',
    'C1', 'Cs1', 'D1', 'Ds1', 'E1', 'F1', 'Fs1', 'G1', 'Gs1', 'A1', 'As1', 'B1',
    'C2', 'Cs2', 'D2', 'Ds2', 'E2', 'F2', 'Fs2', 'G2', 'Gs2', 'A2', 'As2', 'B2',
    'C3', 'Cs3', 'D3', 'Ds3', 'E3', 'F3', 'Fs3', 'G3', 'Gs3', 'A3', 'As3', 'B3',
    'C4', 'Cs4', 'D4', 'Ds4', 'E4', 'F4', 'Fs4', 'G4', 'Gs4', 'A4', 'As4', 'B4',
    'C5', 'Cs5', 'D5', 'Ds5', 'E5', 'F5', 'Fs5', 'G5', 'Gs5', 'A5', 'As5', 'B5',
    'C6', 'Cs6', 'D6', 'Ds6', 'E6', 'F6', 'Fs6', 'G6', 'Gs6', 'A6', 'As6', 'B6',
    'C7', 'Cs7', 'D7', 'Ds7', 'E7', 'F7', 'Fs7', 'G7', 'Gs7', 'A7', 'As7', 'B7',
    'C8'
)

$total = $allNotes.Count
$current = 0
$success = 0
$failed = 0

Write-Host "Downloading all FluidR3 GM piano notes..."
Write-Host "Total: $total notes"
Write-Host ""

foreach ($note in $allNotes) {
    $current++
    $url = "$baseUrl/$note.mp3"
    $output = "$outputDir\$note.mp3"
    
    try {
        Write-Host "[$current/$total] $note ..." -NoNewline
        Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop -TimeoutSec 10
        Write-Host " OK" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host " SKIP" -ForegroundColor Yellow
        $failed++
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "Download complete!" -ForegroundColor Green
Write-Host "Success: $success files" -ForegroundColor Green
Write-Host "Skipped: $failed files" -ForegroundColor Yellow
Write-Host "Saved in: $outputDir" -ForegroundColor Cyan
