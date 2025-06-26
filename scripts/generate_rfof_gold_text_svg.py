# scripts/generate_rfof_gold_text_svg.py
import svgwrite
import os

def generate_gold_text_svg(text, output_path, font_size=60, font_family="Arial Black, sans-serif"):
    """
    Generiert ein SVG mit dem Text in Goldfarbe und einem Glanz-Effekt.
    """
    dwg = svgwrite.Drawing(output_path, profile='full')

    # Gold-Farbverlauf
    gold_gradient = dwg.linearGradient((0, '0%'), (1, '100%'), id='goldGradient')
    gold_gradient.add_stop_color(0, 'rgb(255,215,0)', opacity=1)    # Dunkles Gold
    gold_gradient.add_stop_color(0.5, 'rgb(255,240,100)', opacity=1) # Helles Gold
    gold_gradient.add_stop_color(1, 'rgb(150,110,0)', opacity=1)    # Tieferes Gold
    dwg.defs.add(gold_gradient)

    # Optional: Filter für Schatten und Glanz
    filter_glow = dwg.filter(id='glow')
    filter_glow.feGaussianBlur(in_='SourceGraphic', stdDeviation='3', result='blur')
    filter_glow.feOffset(in_='blur', dx='2', dy='2', result='offsetBlur')
    filter_glow.feMerge().append(filter_glow.feMergeNode(in_='offsetBlur'))
    filter_glow.feMerge().append(filter_glow.feMergeNode(in_='SourceGraphic'))
    dwg.defs.add(filter_glow)

    # Text-Element mit Gold-Farbverlauf und optionalem Filter
    text_element = dwg.text(text, insert=(0, font_size * 0.9), font_size=f"{font_size}px",
                            font_family=font_family, fill="url(#goldGradient)",
                            font_weight="bold", filter="url(#glow)") # Hier wird der Filter angewendet
    dwg.add(text_element)
    
    # Schätze die Größe basierend auf dem Text, um das Viewbox anzupassen
    # Dies ist eine Heuristik, für präzise Messungen bräuchte man eine spezialisiertere Bibliothek
    estimated_width = len(text) * (font_size * 0.6) # Faktor für Zeichenbreite
    estimated_height = font_size * 1.2
    dwg.viewbox(0, 0, estimated_width, estimated_height)

    dwg.save()
    print(f"Gold-Text SVG generiert: {output_path}")

if __name__ == "__main__":
    output_dir = "assets" # Korrekter Pfad: assets/
    os.makedirs(output_dir, exist_ok=True)
    generate_gold_text_svg("@RFOF-NETWORK", os.path.join(output_dir, "rfof_network_gold.svg"))
