# Download best open-source piano samples - FluidR3 GM
$baseUrl = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3"
$outputDir = "piano-samples-new"

$notes = @(
    'A0', 'C1', 'Ds1', 'Fs1', 'A1', 'C2', 'Ds2', 'Fs2',
    'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4',
    'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6',
    'A6', 'C7', 'Ds7', 'Fs7', 'A7', 'C8'
)

$total = $notes.Count
$current = 0

Write-Host "Downloading FluidR3 GM piano samples..."
Write-Host "Total: $total files"

foreach ($note in $notes) {
    $current++
    $url = "$baseUrl/$note.mp3"
    $output = "$outputDir\$note.mp3"
    
    try {
        Write-Host "[$current/$total] Downloading $note.mp3 ..." -NoNewline
        Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop
        Write-Host " OK"
    }
    catch {
        Write-Host " FAILED"
        Write-Host "  Error: $($_.Exception.Message)"
    }
    
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "Download complete!"
Write-Host "Files saved in: $outputDir"
