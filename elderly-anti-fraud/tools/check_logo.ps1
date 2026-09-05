# 检查 logo 文件实际格式（API 实际返回 JPEG）
$file = 'd:\elderly-anti-fraud\assets\logo_generated.jpg'
if (Test-Path $file) {
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $size = $bytes.Length
  $magic = '{0:X2} {1:X2} {2:X2} {3:X2}' -f $bytes[0], $bytes[1], $bytes[2], $bytes[3]
  $head = [System.Text.Encoding]::UTF8.GetString($bytes[0..63])
  Write-Output ('size=' + $size)
  Write-Output ('magic=' + $magic)
  Write-Output ('head=' + $head)
  Write-Output ('is_png=' + ($magic -eq '89 50 4E 47'))
} else {
  Write-Output 'NOT FOUND'
}
