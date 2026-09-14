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
    font_bold_path = r"C:\Windows\Fonts\arialbd.ttf"
    font_reg_path = r"C:\Windows\Fonts\arial.ttf"

    W, H = 1080, 1080
    img = Image.new("RGBA", (W, H), (10, 19, 43, 255))
    draw = ImageDraw.Draw(img)

    # Background gradient
    for i in range(H):
        r = int(10 + (22 - 10) * (i / H))
        g = int(19 + (38 - 19) * (i / H))
        b = int(43 + (75 - 43) * (i / H))
        draw.line([(0, i), (W, i)], fill=(r, g, b, 255))

    # Glowing radial background circle in center
    center_glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(center_glow)
    glow_draw.ellipse([W//2 - 380, H//2 - 380, W//2 + 380, H//2 + 380], fill=(0, 245, 212, 25))
    img = Image.alpha_composite(img, center_glow)
    draw = ImageDraw.Draw(img)

    # Decorative Border
    draw.rounded_rectangle([35, 35, W-35, H-35], radius=32, outline=(0, 245, 212, 120), width=3)

    # Logos
    logo_h = 100
    mzp_path = os.path.join(workspace_dir, "assets", "לוגו מזפ.png")
    mop_path = os.path.join(workspace_dir, "assets", "לוגו מדור מופ.png")

    if os.path.exists(mzp_path):
        lmzp = Image.open(mzp_path).convert("RGBA")
        asp = lmzp.width / lmzp.height
        lmzp = lmzp.resize((int(logo_h * asp), logo_h), Image.Resampling.LANCZOS)
        img.paste(lmzp, (W - lmzp.width - 65, 65), lmzp)

    if os.path.exists(mop_path):
        lmop = Image.open(mop_path).convert("RGBA")
        asp = lmop.width / lmop.height
        lmop = lmop.resize((int(logo_h * asp), logo_h), Image.Resampling.LANCZOS)
        img.paste(lmop, (65, 65), lmop)

    # Fonts
    f_badge = ImageFont.truetype(font_bold_path, 28)
    f_title = ImageFont.truetype(font_bold_path, 48)
    f_subtitle = ImageFont.truetype(font_bold_path, 34)
    f_body_bold = ImageFont.truetype(font_bold_path, 30)
    f_date = ImageFont.truetype(font_bold_path, 36)
    f_footer = ImageFont.truetype(font_bold_path, 24)

    # Colors
    c_white = (255, 255, 255, 255)
    c_cyan = (0, 245, 212, 255)
    c_navy_dark = (10, 19, 43, 255)

    # 1. Badge Top
    draw.rounded_rectangle([W//2 - 250, 175, W//2 + 250, 235], radius=16, fill=(57, 255, 20, 230), outline=(255, 255, 255, 255), width=2)
    draw_text_centered(draw, "הצבעת הקהל יצאה לדרך!", W, 190, f_badge, c_navy_dark)

    # 2. Main Title
    draw_text_centered(draw, "האקתון AI בחטיבה לזיהוי פלילי", W, 260, f_title, c_white)
    draw_text_centered(draw, "משפיעים על הפתרונות שייבנו בשטח!", W, 328, f_subtitle, c_cyan)

    # 3. QR Code Panel
    qr_path = os.path.join(workspace_dir, "assets", "qr_code.png")
    if os.path.exists(qr_path):
        qr_img = Image.open(qr_path).convert("RGBA")
        qr_size = 280
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        
        # White background container for QR code
        qr_box_size = qr_size + 30
        qr_x = (W - qr_box_size) // 2
        qr_y = 398
        
        draw.rounded_rectangle([qr_x, qr_y, qr_x + qr_box_size, qr_y + qr_box_size], radius=22, fill=(255, 255, 255, 255), outline=(0, 245, 212, 255), width=4)
        img.paste(qr_img, (qr_x + 15, qr_y + 15), qr_img)

    # 4. Text below QR code
    draw_text_centered(draw, "סרקו את הברקוד והצביעו לרעיונות המובילים!", W, 735, f_body_bold, c_white)

    # 5. Date Highlight Box
    box_w, box_h = 780, 85
    box_x = (W - box_w) // 2
    box_y = 795
    draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h], radius=20, fill=(255, 215, 0, 230), outline=(255, 255, 255, 255), width=2)
    draw_text_centered(draw, "ההצבעה פתוחה עד יום ראשון | 20.9.2026", W, 820, f_date, c_navy_dark)

    # 6. Bottom Footer
    draw_text_centered(draw, "מדור מחקר ופיתוח | החטיבה לזיהוי פלילי (מז\"פ)", W, 940, f_footer, (180, 205, 235, 255))

    # Save to assets
    out_png = os.path.join(workspace_dir, "assets", "voting_social_flyer.png")
    img.convert("RGB").save(out_png, "PNG")
    print("SUCCESS:", out_png)

    # Also copy to artifact directory for embedding!
    artifact_dir = r"C:\Users\nafei\.gemini\antigravity\brain\7b00b1e8-b437-4b5c-9d6c-11d7c306cd83"
    if os.path.exists(artifact_dir):
        art_out = os.path.join(artifact_dir, "voting_social_flyer.png")
        img.convert("RGB").save(art_out, "PNG")
        print("COPIED TO ARTIFACT:", art_out)

if __name__ == "__main__":
    main()
