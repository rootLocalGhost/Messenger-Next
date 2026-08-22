import os
import math
from PIL import Image, ImageDraw

os.makedirs("src-tauri/icons", exist_ok=True)

def render_messenger_icon(size):
    # Create 4x supersampled image for ultra crisp anti-aliasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = canvas_size / 2.0
    cy = canvas_size / 2.0
    r = canvas_size * 0.46

    # Draw gradient circle
    # Gradient colors: top-left #00C6FF (0, 198, 255), center #0078FF (0, 120, 255), bottom-right #A800FF (168, 0, 255)
    # We can draw horizontal/diagonal gradient
    for y in range(canvas_size):
        for x in range(canvas_size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            if dist <= r:
                # Calculate diagonal progress
                t = (x + y) / (2.0 * canvas_size)
                if t < 0.5:
                    sub_t = t / 0.5
                    r_col = int(0 * (1 - sub_t) + 0 * sub_t)
                    g_col = int(198 * (1 - sub_t) + 120 * sub_t)
                    b_col = int(255 * (1 - sub_t) + 255 * sub_t)
                else:
                    sub_t = (t - 0.5) / 0.5
                    r_col = int(0 * (1 - sub_t) + 168 * sub_t)
                    g_col = int(120 * (1 - sub_t) + 0 * sub_t)
                    b_col = int(255 * (1 - sub_t) + 255 * sub_t)
                img.putpixel((x, y), (r_col, g_col, b_col, 255))

    # Draw speech bubble tail
    tail_poly = [
        (cx - r * 0.4, cy + r * 0.7),
        (cx - r * 0.7, cy + r * 1.05),
        (cx - r * 0.05, cy + r * 0.85)
    ]
    # Fill tail with bottom color #7a00ff
    draw.polygon(tail_poly, fill=(130, 20, 255, 255))

    # Redraw lightning bolt in white
    # Points normalized to canvas_size
    bolt = [
        (canvas_size * 0.27, canvas_size * 0.58),
        (canvas_size * 0.44, canvas_size * 0.38),
        (canvas_size * 0.51, canvas_size * 0.48),
        (canvas_size * 0.73, canvas_size * 0.42),
        (canvas_size * 0.56, canvas_size * 0.64),
        (canvas_size * 0.49, canvas_size * 0.54)
    ]
    draw.polygon(bolt, fill=(255, 255, 255, 255))

    return img.resize((size, size), Image.Resampling.LANCZOS)

# Generate multi-resolution icons
icon_512 = render_messenger_icon(512)
icon_512.save("src-tauri/icons/icon.png", "PNG")

icon_256 = render_messenger_icon(256)
icon_256.save("src-tauri/icons/128x128@2x.png", "PNG")

icon_128 = render_messenger_icon(128)
icon_128.save("src-tauri/icons/128x128.png", "PNG")

icon_32 = render_messenger_icon(32)
icon_32.save("src-tauri/icons/32x32.png", "PNG")

# Generate ICO
ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_imgs = [render_messenger_icon(s[0]) for s in ico_sizes]
ico_imgs[0].save(
    "src-tauri/icons/icon.ico",
    format="ICO",
    sizes=ico_sizes,
    append_images=ico_imgs[1:]
)

# For icns, save 512 png copy as fallback / placeholder
icon_512.save("src-tauri/icons/icon.icns", "PNG")

print("All icons successfully generated in src-tauri/icons/")
