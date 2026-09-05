# 生成「银发守护宝」logo 并下载到 assets/
# 方案：盾牌 + 爱心，温暖橙金 + 安心蓝绿，粗实圆角扁平
$prompt = 'Rounded tactile icon style logo, main shape is a shield, inside the shield contains a heart symbol representing protection and care for elderly people, warm orange and gold combined with calming blue and green accent, thick bold lines, rounded corners, flat design, simple modern style, suitable for mobile app icon, clean white background, no extra details, vector illustration, high contrast, easy to recognize'
$encoded = [uri]::EscapeDataString($prompt)
$url = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=' + $encoded + '&image_size=square_hd'
$output = 'd:\elderly-anti-fraud\assets\logo_generated.jpg'

try {
  Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing -ErrorAction Stop
  $size = (Get-Item $output).Length
  Write-Output ('OK downloaded to ' + $output + ' (' + $size + ' bytes)')
} catch {
  Write-Output ('ERR ' + $_.Exception.Message)
}
