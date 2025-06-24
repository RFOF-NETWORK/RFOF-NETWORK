# scripts/generate_pixel_text_svg.py
import svgwrite
import os

def create_pixel_text_svg(text_to_render, output_path, pixel_size=10, gap_size=2,
                          fill_color='red', outline_color='black'):
    """
    Generiert ein SVG mit "roter Pixel Schrift mit schwarzen gelückten Pixeln".
    Die "gelückten" Pixel werden durch eine leere Füllung und nur einen Rahmen dargestellt.
    """
    # Rudimentäre Pixel-Font-Definition für Großbuchstaben und einige Sonderzeichen
    # '1' = gefüllter Pixel, '0' = gelückter/leerer Pixel
    pixel_font_map = {
        'A': ["010", "101", "111", "101", "101"], 'B': ["110", "101", "110", "101", "110"],
        'C': ["011", "100", "100", "100", "011"], 'D': ["110", "101", "101", "101", "110"],
        'E': ["111", "100", "110", "100", "111"], 'F': ["111", "100", "110", "100", "100"],
        'G': ["011", "100", "101", "101", "011"], 'H': ["101", "101", "111", "101", "101"],
        'I': ["111", "010", "010", "010", "111"], 'J': ["001", "001", "001", "101", "010"],
        'K': ["101", "101", "110", "101", "101"], 'L': ["100", "100", "100", "100", "111"],
        'M': ["101", "111", "101", "101", "101"], 'N': ["101", "111", "101", "101", "101"], # Vereinfacht
        'O': ["010", "101", "101", "101", "010"], 'P': ["110", "101", "110", "100", "100"],
        'Q': ["010", "101", "101", "011", "001"], 'R': ["110", "101", "110", "101", "101"],
        'S': ["011", "100", "010", "001", "110"], 'T': ["111", "010", "010", "010", "010"],
        'U': ["101", "101", "101", "101", "010"], 'V': ["101", "101", "101", "010", "010"],
        'W': ["101", "101", "101", "010", "010"], # Vereinfacht
        'X': ["101", "010", "010", "010", "101"], # Vereinfacht
        'Y': ["101", "010", "010", "010", "010"], # Vereinfacht
        'Z': ["111", "001", "010", "100", "111"],
        '0': ["111", "101", "101", "101", "111"], '1': ["010", "110", "010", "010", "111"],
        '2': ["111", "001", "010", "100", "111"], '3': ["111", "001", "011", "001", "111"],
        '4': ["101", "101", "111", "001", "001"], '5': ["111", "100", "111", "001", "111"],
        '6': ["111", "100", "111", "101", "111"], '7': ["111", "001", "001", "001", "001"],
        '8': ["111", "101", "111", "101", "111"], '9': ["111", "101", "111", "001", "111"],
        ' ': ["000", "000", "000", "000", "000"], # Leerzeichen
        '-': ["000", "000", "111", "000", "000"],
        '/': ["000", "001", "010", "100", "000"],
        '.': ["000", "000", "000", "000", "010"],
        ':': ["000", "010", "000", "010", "000"],
        '@': ["010", "101", "111", "101", "010"], # Vereinfachtes @
        '#': ["010", "111", "010", "111", "010"]
    }

    # Berechne die Gesamtbreite und -höhe des SVG
    total_width = 0
    max_char_height = 0
    for char_code in text_to_render.upper():
        if char_code in pixel_font_map:
            char_pattern = pixel_font_map[char_code]
            char_width = len(char_pattern[0])
            char_height = len(char_pattern)
            total_width += char_width * (pixel_size + gap_size) + pixel_size # Addiere Abstand nach Zeichen
            if char_height * (pixel_size + gap_size) > max_char_height:
                max_char_height = char_height * (pixel_size + gap_size)
        else:
            total_width += pixel_size * 4 # Platz für unbekanntes Zeichen

    dwg = svgwrite.Drawing(output_path, profile='full', size=(f"{total_width}px", f"{max_char_height}px"))
    # Sicherstellen, dass der Viewbox-Ursprung bei (0,0) liegt und die Größe passt
    dwg.viewbox(0, 0, total_width, max_char_height)

    current_x_offset = 0
    
    for char_code in text_to_render.upper():
        if char_code not in pixel_font_map:
            print(f"Warning: Character '{char_code}' not defined in pixel_font_map. Skipping.")
            current_x_offset += pixel_size * 4 # Platz für unbekanntes Zeichen
            continue

        char_pattern = pixel_font_map[char_code]
        char_width = len(char_pattern[0]) if char_pattern else 0
        
        for r_idx, row in enumerate(char_pattern):
            for c_idx, pixel_type in enumerate(row):
                x = current_x_offset + c_idx * (pixel_size + gap_size)
                y = r_idx * (pixel_size + gap_size)

                if pixel_type == '1': # Ausgefüllter Pixel
                    dwg.add(dwg.rect(insert=(x, y), size=(pixel_size, pixel_size), fill=fill_color))
                elif pixel_type == '0': # "Gelückter" Pixel (nur Umriss)
                    dwg.add(dwg.rect(insert=(x, y), size=(pixel_size, pixel_size), fill='none', stroke=outline_color, stroke_width=1))
        
        current_x_offset += char_width * (pixel_size + gap_size) + pixel_size # Abstand nach Zeichen

    dwg.save()
    print(f"Pixel-Text SVG generiert: {output_path}")

if __name__ == "__main__":
    output_dir = "assets" # Korrekter Pfad: assets/
    os.makedirs(output_dir, exist_ok=True)
    # Name der Datei gemäß deiner Struktur: author_satoramy_praio.svg
    create_pixel_text_svg("AUTHOR: SATORAMY-PRAI", os.path.join(output_dir, "author_satoramy_praio.svg"))
