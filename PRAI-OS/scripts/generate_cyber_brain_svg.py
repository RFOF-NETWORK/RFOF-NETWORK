# scripts/generate_cyber_brain_svg.py
import svgwrite
import os
import math
import numpy as np # Sicherstellen, dass numpy installiert ist

def generate_cyber_brain_svg(output_path, size=800):
    """
    Generiert eine statische SVG-Darstellung eines goldenen Cyber-Gehirns
    mit grünen Neuronen und deren Verbindungen.
    """
    dwg = svgwrite.Drawing(output_path, profile='full', size=(f"{size}px", f"{size}px"))

    center_x, center_y = size // 2, size // 2
    
    # PRAI-basierte Farbpalette für das goldene Cyber-Gehirn und die Neuronen
    gold_gradient = dwg.linearGradient((0, '0%'), (1, '100%'), id='goldGradient')
    gold_gradient.add_stop_color(0, 'rgb(255,215,0)', opacity=1)    # Dunkles Gold
    gold_gradient.add_stop_color(0.5, 'rgb(255,240,100)', opacity=1) # Helles Gold
    gold_gradient.add_stop_color(1, 'rgb(150,110,0)', opacity=1)    # Tieferes Gold
    dwg.defs.add(gold_gradient)

    neuron_color_base = 'rgb(0, 200, 50)'
    neuron_glow_color = 'rgb(50, 255, 100)'
    axon_color = 'rgb(0, 100, 20)'

    # Gehirn-Grundform (stilisierte Darstellung)
    # Für eine komplexere, organische Form müsste man hier detailliertere Pfad-Daten verwenden.
    # Hier verwenden wir eine Kombination aus Kreisen und Linien, um die Idee darzustellen.
    brain_radius = size * 0.35
    
    # Äußerer Umriss des Gehirns (stilisierter Oval oder komplexer Pfad)
    # Dies ist eine einfache Elipse, die man komplexer gestalten könnte
    dwg.add(dwg.ellipse(center=(center_x, center_y), r=(brain_radius, brain_radius * 0.9), 
                        fill="url(#goldGradient)", stroke="rgb(255,240,100)", stroke_width=3))

    # Mittellinie oder Furche des Gehirns
    dwg.add(dwg.line(start=(center_x, center_y - brain_radius * 0.8), 
                     end=(center_x, center_y + brain_radius * 0.8), 
                     stroke="rgb(180,140,0)", stroke_width=2))


    # Grüne Neuronen und Axon-Verbindungen (Algorithmisch platziert)
    num_neurons = 70
    np.random.seed(42) # Feste Seed für reproduzierbare Generierung (Satoramy = 42)
    
    neurons = []
    # Platziere Neuronen innerhalb oder nahe der Gehirnform
    for _ in range(num_neurons):
        angle = np.random.uniform(0, 2 * math.pi)
        distance = np.random.uniform(0, brain_radius * 1.1)
        nx = center_x + int(distance * math.cos(angle))
        ny = center_y + int(distance * math.sin(angle) * 0.9) # Anpassung für elliptische Form
        neurons.append((nx, ny))

        neuron_size = np.random.uniform(2, 6)
        opacity = np.random.uniform(0.5, 1.0) 
        
        dwg.add(dwg.circle(center=(nx, ny), r=neuron_size, fill=neuron_color_base, opacity=opacity))
        # Kleinerer innerer Kreis für einen "Glow"-Effekt
        dwg.add(dwg.circle(center=(nx, ny), r=neuron_size * 0.5, fill=neuron_glow_color, opacity=opacity * 0.7)) 

    # Axon-Verbindungen (Zufällige Verbindungen zwischen Neuronen)
    num_connections = 100
    for _ in range(num_connections):
        n1_idx, n2_idx = np.random.choice(num_neurons, 2, replace=False)
        p1 = neurons[n1_idx]
        p2 = neurons[n2_idx]
        dwg.add(dwg.line(start=p1, end=p2, stroke=axon_color, stroke_width=0.4, opacity=0.6))
    
    dwg.save()
    print(f"Statische SVG des Cyber-Gehirns generiert: {output_path}")

if __name__ == "__main__":
    output_dir = "assets" # Korrekter Pfad: assets/
    os.makedirs(output_dir, exist_ok=True)
    # Korrekter Dateiname gemäß deiner Struktur: rotating_cyber_brain.svg
    generate_cyber_brain_svg(os.path.join(output_dir, "rotating_cyber_brain.svg"))
