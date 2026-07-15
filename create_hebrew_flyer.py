import os
import re
import urllib.request
from PIL import Image, ImageDraw, ImageFont

def reverse_hebrew_line(line):
    # Split text into tokens (words, spaces, punctuation)
    tokens = re.split(r'(\s+|[.,!?:;()\-]+)', line)
    processed_tokens = []
    
    for token in tokens:
        # If token contains Hebrew characters, reverse it
        if re.search(r'[\u0590-\u05ff]', token):
            # Reverse Hebrew word
            reversed_word = token[::-1]
            # Handle brackets/parentheses inside Hebrew
            reversed_word = reversed_word.replace('(', 'TEMP_L').replace(')', 'TEMP_R')
            reversed_word = reversed_word.replace('TEMP_L', ')').replace('TEMP_R', '(')
            processed_tokens.append(reversed_word)
        else:
            processed_tokens.append(token)
            
    # Reverse the order of tokens for RTL layout
    processed_tokens.reverse()
    return "".join(processed_tokens)

def main():
    workspace_dir = r"c:\Users\nafei\Documents\מופ\אפליקציות\האקתון"
    bg_path = os.path.join(workspace_dir, "clean_flyer_bg.png")
    logo_mzp_path = os.path.join(workspace_dir, "לוגו מזפ.png")
    logo_mop_path = os.path.join(workspace_dir, "לוגו מדור מופ.png")
    output_path = os.path.join(workspace_dir, "hackathon_flyer.png")

    if not os.path.exists(bg_path):
        print(f"Error: Background image not found at {bg_path}")
        return

    # Load background image
    img = Image.open(bg_path).convert("RGBA")
    draw = ImageDraw.Draw(img)
    width, height = img.size
    print(f"Background image loaded: {width}x{height}")

    # Download Rubik-Bold and Rubik-Regular fonts for high-quality Hebrew typography
    font_bold_path = os.path.join(workspace_dir, "Rubik-Bold.ttf")
    font_reg_path = os.path.join(workspace_dir, "Rubik-Regular.ttf")
    
    if not os.path.exists(font_bold_path):
        print("Downloading Rubik-Bold font...")
        try:
            urllib.request.urlretrieve("https://github.com/google/fonts/raw/main/ofl/rubik/static/Rubik-Bold.ttf", font_bold_path)
        except Exception as e:
            print("Failed to download Rubik-Bold, trying Assistant:", e)
            try:
                urllib.request.urlretrieve("https://github.com/google/fonts/raw/main/ofl/assistant/static/Assistant-Bold.ttf", font_bold_path)
            except Exception as e2:
                print("Failed to download Assistant font, falling back to Arial:", e2)
                font_bold_path = "C:\\Windows\\Fonts\\arial.ttf"

    if not os.path.exists(font_reg_path):
        print("Downloading Rubik-Regular font...")
        try:
            urllib.request.urlretrieve("https://github.com/google/fonts/raw/main/ofl/rubik/static/Rubik-Regular.ttf", font_reg_path)
        except Exception as e:
            print("Failed to download Rubik-Regular, trying Assistant:", e)
            try:
                urllib.request.urlretrieve("https://github.com/google/fonts/raw/main/ofl/assistant/static/Assistant-Regular.ttf", font_reg_path)
            except Exception as e2:
                font_reg_path = font_bold_path


    # Define font sizes based on image height (assuming around 1000px)
    title_size = int(height * 0.055)
    subtitle_size = int(height * 0.038)
    body_size = int(height * 0.026)
    footer_size = int(height * 0.022)

    font_title = ImageFont.truetype(font_bold_path, title_size)
    font_subtitle = ImageFont.truetype(font_bold_path, subtitle_size)
    font_body = ImageFont.truetype(font_reg_path, body_size)
    font_body_bold = ImageFont.truetype(font_bold_path, body_size)
    font_footer = ImageFont.truetype(font_bold_path, footer_size)

    # 1. Overlay Logos at the top
    # We want them side-by-side or on opposite corners
    logo_y = int(height * 0.04)
    logo_h = int(height * 0.10) # 10% of height

    if os.path.exists(logo_mzp_path):
        logo_mzp = Image.open(logo_mzp_path).convert("RGBA")
        # Resize keeping aspect ratio
        aspect = logo_mzp.width / logo_mzp.height
        logo_mzp = logo_mzp.resize((int(logo_h * aspect), logo_h), Image.Resampling.LANCZOS)
        # Position at top right
        mzp_x = width - logo_mzp.width - int(width * 0.08)
        img.paste(logo_mzp, (mzp_x, logo_y), logo_mzp)

    if os.path.exists(logo_mop_path):
        logo_mop = Image.open(logo_mop_path).convert("RGBA")
        aspect = logo_mop.width / logo_mop.height
        logo_mop = logo_mop.resize((int(logo_h * aspect), logo_h), Image.Resampling.LANCZOS)
        # Position at top left
        mop_x = int(width * 0.08)
        img.paste(logo_mop, (mop_x, logo_y), logo_mop)

    # 2. Draw Text (all centered horizontally)
    # Colors: White (#FFFFFF), Neon Green (#39FF14), Cyan (#00F5D4)
    color_white = (255, 255, 255, 255)
    color_cyan = (0, 245, 212, 255)
    color_green = (57, 255, 20, 255)
    color_gray = (148, 163, 184, 255)

    # Title lines
    draw_text_centered(draw, "האקתון AI הראשון במז\"פ", width, int(height * 0.18), font_title, color_white)
    draw_text_centered(draw, "Vibe Coding 2026", width, int(height * 0.25), font_subtitle, color_cyan)

    # Badge/Hook
    draw_text_centered(draw, "מפתחים אפליקציות באמצעות מילים בלבד!", width, int(height * 0.35), font_body_bold, color_green)
    draw_text_centered(draw, "ללא צורך בידע מוקדם בתכנות", width, int(height * 0.40), font_body, color_white)

    # Details card background (draw a dark semi-transparent panel in the center)
    panel_w = int(width * 0.84)
    panel_h = int(height * 0.34)
    panel_x1 = (width - panel_w) // 2
    panel_y1 = int(height * 0.47)
    panel_x2 = panel_x1 + panel_w
    panel_y2 = panel_y1 + panel_h
    
    # Draw panel background
    draw.rounded_rectangle([panel_x1, panel_y1, panel_x2, panel_y2], radius=15, fill=(10, 19, 43, 160), outline=(255, 255, 255, 25))

    # Details text inside panel
    dy = panel_y1 + int(panel_h * 0.08)
    line_spacing = int(panel_h * 0.18)

    details = [
      ("🔬 האתגר: ייעול תהליכי עבודה ופתרון בעיות אמיתיות", color_white, font_body_bold),
      ("👥 הרשמה: בצוותים של עד 3 משתתפים (מכלל החטיבה)", color_white, font_body),
      ("🏆 הפרס הראשון: פגרת מפקד ותעודת הוקרה רשמית", color_green, font_body_bold),
      ("🔒 אבטחה: סביבה בלמ\"סית לחלוטין | נתוני דמה בלבד", color_gray, font_body)
    ]

    for text, color, font in details:
        draw_text_centered(draw, text, width, dy, font, color)
        dy += line_spacing

    # Call to action footer
    draw_text_centered(draw, "היכנסו לפורטל הציבורי לפרטים והרשמה:", width, int(height * 0.85), font_body, color_white)
    draw_text_centered(draw, "🔗 קישור לפורטל ההאקתון זמין במייל היחידתי", width, int(height * 0.90), font_footer, color_cyan)

    # Save final image
    final_img = img.convert("RGB")
    final_img.save(output_path, "PNG")
    print(f"Success: Hebrew flyer saved to {output_path}")

def draw_text_centered(draw, text, img_width, y, font, color):
    # Reverse text for RTL rendering in PIL
    rev_text = reverse_hebrew_line(text)
    
    # Get text width
    bbox = draw.textbbox((0, 0), rev_text, font=font)
    text_width = bbox[2] - bbox[0]
    
    # Center position
    x = (img_width - text_width) // 2
    draw.text((x, y), rev_text, fill=color, font=font)

if __name__ == "__main__":
    main()
