import os
import re
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def fix_hebrew_bidi(text):
    words = text.split(' ')
    processed_words = []
    for word in words:
        if re.search(r'[\u0590-\u05ff]', word):
            rev = word[::-1]
            rev = rev.replace('(', 'TEMP_L').replace(')', 'TEMP_R')
            rev = rev.replace('TEMP_L', ')').replace('TEMP_R', '(')
            processed_words.append(rev)
        else:
            processed_words.append(word)
    processed_words.reverse()
    return ' '.join(processed_words)

def draw_text_centered(draw, text, img_width, y, font, color):
    rev_text = fix_hebrew_bidi(text)
    bbox = draw.textbbox((0, 0), rev_text, font=font)
    tw = bbox[2] - bbox[0]
    x = (img_width - tw) // 2
    draw.text((x, y), rev_text, fill=color, font=font)
    return y + (bbox[3] - bbox[1])

def main():
    workspace_dir = r"c:\Users\nafei\Documents\מופ\אפליקציות\האקתון"
    font_bold_path = r"C:\Windows\Fonts\arialbd.ttf"
    font_reg_path = r"C:\Windows\Fonts\arial.ttf"

    W, H = 1080, 1080
    
    # 1. Base dark navy canvas
    img = Image.new("RGBA", (W, H), (6, 12, 30, 255))
    
    # Background gradient
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)
    for y in range(H):
        r = int(6 + (14 - 6) * (y / H))
        g = int(12 + (26 - 12) * (y / H))
        b = int(30 + (55 - 30) * (y / H))
        gdraw.line([(0, y), (W, y)], fill=(r, g, b, 255))
    img = Image.alpha_composite(img, grad)

    # 2. Draw smooth flowing cyan/teal glowing waves (Graphic Designer style like the reference image)
    wave_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wdraw = ImageDraw.Draw(wave_layer)

    # Top flowing waves
    for wave_i in range(5):
        pts = []
        amp = 40 + wave_i * 15
        freq = 0.004 + wave_i * 0.0005
        phase = wave_i * 1.2
        y_offset = 120 + wave_i * 35
        for x in range(0, W + 10, 5):
            y_val = y_offset + math.sin(x * freq + phase) * amp + math.cos(x * 0.002) * 20
            pts.append((x, y_val))
        
        # Color gradient for waves
        c_alpha = int(140 - wave_i * 20)
        c_rgb = (0, 245, 212) if wave_i % 2 == 0 else (0, 180, 216)
        wdraw.line(pts, fill=(c_rgb[0], c_rgb[1], c_rgb[2], c_alpha), width=3)

    # Bottom flowing waves
    for wave_i in range(6):
        pts = []
        amp = 50 + wave_i * 18
        freq = 0.0035 + wave_i * 0.0006
        phase = 2.5 + wave_i * 0.8
        y_offset = 880 + wave_i * 25
        for x in range(0, W + 10, 5):
            y_val = y_offset + math.sin(x * freq + phase) * amp + math.sin(x * 0.003) * 30
            pts.append((x, y_val))
        
        c_alpha = int(150 - wave_i * 20)
        c_rgb = (0, 245, 212) if wave_i % 2 == 0 else (0, 119, 182)
        wdraw.line(pts, fill=(c_rgb[0], c_rgb[1], c_rgb[2], c_alpha), width=3 if wave_i < 3 else 2)

    # Add glow to waves
    glow_wave = wave_layer.filter(ImageFilter.GaussianBlur(radius=8))
    img = Image.alpha_composite(img, glow_wave)
    img = Image.alpha_composite(img, wave_layer)

    draw = ImageDraw.Draw(img)

    # 3. Logos Top Corners (Clean, spacious layout)
    logo_h = 95
    mzp_path = os.path.join(workspace_dir, "assets", "לוגו מזפ.png")
    mop_path = os.path.join(workspace_dir, "assets", "לוגו מדור מופ.png")

    if os.path.exists(mzp_path):
        lmzp = Image.open(mzp_path).convert("RGBA")
        asp = lmzp.width / lmzp.height
        lmzp = lmzp.resize((int(logo_h * asp), logo_h), Image.Resampling.LANCZOS)
        img.paste(lmzp, (W - lmzp.width - 65, 60), lmzp)

    if os.path.exists(mop_path):
        lmop = Image.open(mop_path).convert("RGBA")
        asp = lmop.width / lmop.height
        lmop = lmop.resize((int(logo_h * asp), logo_h), Image.Resampling.LANCZOS)
        img.paste(lmop, (65, 60), lmop)

    # 4. Typography (Clean, high contrast, elegant hierarchy)
    f_cyan_head = ImageFont.truetype(font_bold_path, 44)
    f_main_title = ImageFont.truetype(font_bold_path, 66)
    f_subtext = ImageFont.truetype(font_reg_path, 32)
    f_date = ImageFont.truetype(font_bold_path, 30)

    # Colors
    c_cyan = (0, 245, 212, 255)
    c_white = (255, 255, 255, 255)
    c_light_blue = (197, 216, 241, 255)
    c_slate = (148, 163, 184, 255)

    # Line 1: האקתון AI מז"פ 2026 (Cyan highlight)
    draw_text_centered(draw, "האקתון AI מז\"פ 2026", W, 195, f_cyan_head, c_cyan)

    # Line 2: הצבעת הקהל נפתחה! (Large Bold White Impact)
    draw_text_centered(draw, "הצבעת הקהל נפתחה!", W, 260, f_main_title, c_white)

    # Line 3: סרקו את הברקוד להצבעה (Light Blue Subtitle)
    draw_text_centered(draw, "סרקו את הברקוד להצבעה", W, 345, f_subtext, c_light_blue)

    # 5. Clean Modern QR Card
    qr_path = os.path.join(workspace_dir, "assets", "qr_code.png")
    if os.path.exists(qr_path):
        qr_img = Image.open(qr_path).convert("RGBA")
        qr_size = 360
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        
        qr_box_size = qr_size + 36
        qr_x = (W - qr_box_size) // 2
        qr_y = 430
        
        # Soft Outer Glow for QR Card
        qr_glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        g_draw = ImageDraw.Draw(qr_glow)
        g_draw.rounded_rectangle([qr_x - 10, qr_y - 10, qr_x + qr_box_size + 10, qr_y + qr_box_size + 10], radius=28, fill=(0, 245, 212, 45))
        qr_glow = qr_glow.filter(ImageFilter.GaussianBlur(radius=15))
        img = Image.alpha_composite(img, qr_glow)
        draw = ImageDraw.Draw(img)

        # Pure white card container
        draw.rounded_rectangle([qr_x, qr_y, qr_x + qr_box_size, qr_y + qr_box_size], radius=24, fill=(255, 255, 255, 255), outline=(0, 245, 212, 200), width=3)
        img.paste(qr_img, (qr_x + 18, qr_y + 18), qr_img)

    # 6. Date Callout Footer (Clean, elegant, no bulky boxes)
    draw_text_centered(draw, "ההצבעה פתוחה עד יום ראשון | 20.9.2026", W, 895, f_date, c_cyan)
    draw_text_centered(draw, "מדור מחקר ופיתוח | החטיבה לזיהוי פלילי", W, 955, ImageFont.truetype(font_reg_path, 22), c_slate)

    # Save final image
    out_png = os.path.join(workspace_dir, "assets", "voting_social_flyer.png")
    img.convert("RGB").save(out_png, "PNG")
    print("SUCCESS:", out_png)

    # Copy to artifact directory for embedding!
    artifact_dir = r"C:\Users\nafei\.gemini\antigravity\brain\7b00b1e8-b437-4b5c-9d6c-11d7c306cd83"
    if os.path.exists(artifact_dir):
        art_out = os.path.join(artifact_dir, "voting_social_flyer.png")
        img.convert("RGB").save(art_out, "PNG")
        print("COPIED TO ARTIFACT:", art_out)

if __name__ == "__main__":
    main()
