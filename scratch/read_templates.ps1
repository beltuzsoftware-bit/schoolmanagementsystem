$data = Get-Content 'data.json' | ConvertFrom-Json
$tmpls = $data.idCardTemplates | Where-Object { $_.schoolId -eq 's_1780586158265' }
foreach ($t in $tmpls) {
    Write-Host ("=== " + $t.name + " " + $t.layout + " " + $t.layoutMode)
    $elements = $t.canvasElements
    if ($elements) {
        $sorted = $elements | Sort-Object -Property y
        foreach ($e in $sorted) {
            Write-Host ("  [" + $e.type + "] x=" + $e.x + "% y=" + $e.y + "% w=" + $e.width + "% h=" + $e.height + "% | key=" + $e.fieldKey + " label=" + $e.labelText + " text=" + $e.text)
        }
    }
}
