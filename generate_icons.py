import os
import subprocess
import tempfile
from PIL import Image

os.makedirs("src-tauri/icons", exist_ok=True)
os.makedirs("public", exist_ok=True)

SVG_CONTENT = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="100%" height="100%">
  <defs>
    <linearGradient id="messengerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00C6FF"/>
      <stop offset="35%" stop-color="#0078FF"/>
      <stop offset="70%" stop-color="#A800FF"/>
      <stop offset="100%" stop-color="#FF4073"/>
    </linearGradient>
  </defs>
  <!-- Main Speech Bubble Shape with smooth curves -->
  <path fill="url(#messengerGradient)" d="M500,90 C268.04,90 80,256.72 80,462.36 C80,578.44 134.24,682.32 220.4,750.84 C227.84,756.68 232.4,765.64 231.36,775.08 L219.52,876.72 C217.12,896.68 238.28,911.96 255.64,900.08 L378.68,823.64 C385.8,819.16 394.44,817.88 402.6,820.28 C433.84,828.28 466.44,833.6 500,833.6 C731.96,833.6 920,666.88 920,462.24 C920,256.6 731.96,90 500,90 Z"/>
  <!-- Central Crisp White Lightning Bolt -->
  <path fill="#FFFFFF" d="M266,548 L440,362 C458,343 490,345 506,366 L578,458 C583,464 591,466 598,462 L730,397 C747,388 764,407 753,423 L580,608 C562,627 530,625 514,604 L442,512 C437,506 429,504 422,508 L289,573 C272,582 255,563 266,548 Z"/>
</svg>
'''

# Save clean SVG to public/
with open("public/messenger.svg", "w", encoding="utf-8") as f:
    f.write(SVG_CONTENT)

# Render ultra high resolution master PNG via headless Edge
HTML_WRAPPER = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: 1024px;
    height: 1024px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  svg {{
    width: 1024px;
    height: 1024px;
  }}
</style>
</head>
<body>
{SVG_CONTENT}
</body>
</html>
'''

with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp_html:
    tmp_html.write(HTML_WRAPPER)
    tmp_html_path = tmp_html.name

tmp_png_path = os.path.join(tempfile.gettempdir(), "messenger_master_1024.png")

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
html_url = "file:///" + tmp_html_path.replace("\\", "/")

subprocess.run([
    edge_path,
    "--headless",
    "--disable-gpu",
    "--window-size=1024,1024",
    "--default-background-color=00000000",
    "--hide-scrollbars",
    f"--screenshot={tmp_png_path}",
    html_url
], check=True)

# Clean up temp html
try:
    os.remove(tmp_html_path)
except Exception:
    pass

# Load master high-res image
master_img = Image.open(tmp_png_path).convert("RGBA")

# Generate standard PNG icons with high-quality LANCZOS downsampling
icon_512 = master_img.resize((512, 512), Image.Resampling.LANCZOS)
icon_512.save("src-tauri/icons/icon.png", "PNG", optimize=True)

icon_256 = master_img.resize((256, 256), Image.Resampling.LANCZOS)
icon_256.save("src-tauri/icons/128x128@2x.png", "PNG", optimize=True)

icon_128 = master_img.resize((128, 128), Image.Resampling.LANCZOS)
icon_128.save("src-tauri/icons/128x128.png", "PNG", optimize=True)

icon_32 = master_img.resize((32, 32), Image.Resampling.LANCZOS)
icon_32.save("src-tauri/icons/32x32.png", "PNG", optimize=True)

# Generate Windows multi-resolution ICO file (256, 128, 64, 48, 32, 24, 16)
ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_imgs = [master_img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
ico_imgs[0].save(
    "src-tauri/icons/icon.ico",
    format="ICO",
    sizes=ico_sizes,
    append_images=ico_imgs[1:]
)

# Also save icon.icns fallback
icon_512.save("src-tauri/icons/icon.icns", "PNG")

# Clean up master temp PNG
try:
    os.remove(tmp_png_path)
except Exception:
    pass

print("Successfully generated ultra high quality icons in src-tauri/icons/ and public/messenger.svg")
