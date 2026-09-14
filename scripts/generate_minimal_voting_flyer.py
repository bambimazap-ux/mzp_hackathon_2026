import os
import re
from PIL import Image, ImageDraw, ImageFont

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
    bg_path = os.path.join(workspace_dir, "assets", "clean_flyer_bg.png")
    font_bold_path = r"C:\Windows\Fonts\arialbd.ttf"

    img = Image.open(bg_path).convert("RGBA")
    W, H = img.size
    draw = ImageDraw.Draw(img)

    # Top Logos
    logo_h = 90
    mzp_path = os.path.join(workspace_dir, "assets", "לוגו מזפ.png")
    mop_path = os.path.join(workspace_dir, "assets", "לוגו מדור מופ.png")

    if os.path.exists(mzp_path):
        lmzp = Image.open(mzp_path).convert("RGBA")
        asp = lmzp.width / lmzp.height
        lmzp = lmzp.resize((int(logo_h * asp), logo_h), Image.Resampling.LANCZOS)
        img.paste(lmzp, (W - lmzp.width - 55, 45), lmzp)

    if os.path.exists(mop_path):
        lmop = Image.open(mop_path).convert("RGBA")
        asp = lmop.width / lmop.height
        lmop = lmop.resize((int(logo_h * asp), logo_h), Image.Resampling.LANCZOS)
        img.paste(lmop, (55, 45), lmop)

    # Fonts
    f_title = ImageFont.truetype(font_bold_path, 50)
    f_badge = ImageFont.truetype(font_bold_path, 28)
    f_action = ImageFont.truetype(font_bold_path, 34)
    f_date = ImageFont.truetype(font_bold_path, 36)

    # Colors
    c_white = (255, 255, 255, 255)
    c_cyan = (0, 245, 212, 255)
    c_navy_dark = (10, 19, 43, 255)

    # 1. Main Title
    draw_text_centered(draw, "האקתון AI במז\"פ", W, 145, f_title, c_white)

    # 2. Badge: הצבעת הקהל יצאה לדרך!
    draw.rounded_rectangle([W//2 - 220, 215, W//2 + 220, 270], radius=16, fill=(57, 255, 20, 230), outline=(255, 255, 255, 255), width=2)
    draw_text_centered(draw, "הצבעת הקהל יצאה לדרך!", W, 228, f_badge, c_navy_dark)

    # 3. QR Code inside the central hexagon
    qr_path = os.path.join(workspace_dir, "assets", "qr_code.png")
    if os.path.exists(qr_path):
        qr_img = Image.open(qr_path).convert("RGBA")
        qr_size = 290
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        
        qr_box_size = qr_size + 30
        qr_x = (W - qr_box_size) // 2
        qr_y = 350
        
        # White container with glowing cyan border
        draw.rounded_rectangle([qr_x, qr_y, qr_x + qr_box_size, qr_y + qr_box_size], radius=24, fill=(255, 255, 255, 255), outline=(0, 245, 212, 255), width=4)
        img.paste(qr_img, (qr_x + 15, qr_y + 15), qr_img)

    # 4. Short Action Text below QR
    draw_text_centered(draw, "סרקו והצביעו!", W, 715, f_action, c_cyan)

    # 5. Date Highlight Box
    box_w, box_h = 680, 85
    box_x = (W - box_w) // 2
    box_y = 780
    draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h], radius=20, fill=(255, 215, 0, 230), outline=(255, 255, 255, 255), width=2)
    draw_text_centered(draw, "ההצבעה פתוחה עד 20.9.2026", W, 805, f_date, c_navy_dark)

    # Save to assets
    out_png = os.path.join(workspace_dir, "assets", "voting_social_flyer.png")
    img.convert("RGB").save(out_png, "PNG")
    print("SUCCESS:", out_png)

    # Copy to artifact directory
    artifact_dir = r"C:\Users\nafei\.gemini\antigravity\brain\7b00b1e8-b437-4b5c-9d6c-11d7c306cd83"
    if os.path.exists(artifact_dir):
        art_out = os.path.join(artifact_dir, "voting_social_flyer.png")
        img.convert("RGB").save(art_out, "PNG")
        print("COPIED TO ARTIFACT:", art_out)

if __name__ == "__main__":
    main()
