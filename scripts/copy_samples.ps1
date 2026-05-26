$dst = "C:\Users\ti\Documents\GitHub\CHAVEAMENTO-BJJ\import_samples"
if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }
$files = @("C:\Users\ti\Desktop\teste.xlsx","C:\Users\ti\Downloads\teste.pdf")
foreach ($f in $files) {
  if (Test-Path $f) {
    Copy-Item -Path $f -Destination $dst -Force
    Write-Output "$f -> COPIED"
  } else {
    Write-Output "$f -> NOT FOUND"
  }
}
Get-ChildItem -Path $dst | Select-Object Name,Length | Format-Table -AutoSize
