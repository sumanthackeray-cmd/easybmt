$newFile = Get-Content 'd:\BILLPRO-main\src\lib\pdf-share-utils-new.js' -Raw
$oldFile = Get-Content 'd:\BILLPRO-main\src\lib\pdf-share-utils.js'
# Lines 714 to end (0-indexed: 713 to end) contain the helpers
$helpers = ($oldFile[713..($oldFile.Length - 1)]) -join "`r`n"
$combined = $newFile + "`r`n" + $helpers
$combined | Set-Content 'd:\BILLPRO-main\src\lib\pdf-share-utils.js' -Encoding UTF8 -NoNewline
Write-Host "Done. Combined file written."
