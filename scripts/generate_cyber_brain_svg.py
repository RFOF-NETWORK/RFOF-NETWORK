# scripts/generate_cyber_brain_svg.py
import svgwrite
import os
import math
import numpy as np

def generate_cyber_brain_svg(output_path, size=800):
    """
    Generiert eine statische SVG-Darstellung eines goldenen Cyber-Gehirns
    mit grünen Neuronen und deren Verbindungen.
    Versucht, 3D-Effekte durch Schattierungen und Überlagerungen anzudeuten.
    """
    dwg = svgwrite.Drawing(output_path, profile='full', size=(f"{size}px", f"{size}px"))

    center_x, center_y = size // 2, size // 2
    
    # Gold-Farbverlauf (für 3D-Effekt)
    gold_gradient_light = dwg.linearGradient((0, '0%'), (1, '100%'), id='goldGradientLight')
    gold_gradient_light.add_stop_color(0, 'rgb(255,240,100)', opacity=1)
    gold_gradient_light.add_stop_color(1, 'rgb(255,215,0)', opacity=1)
    dwg.defs.add(gold_gradient_light)

    gold_gradient_dark = dwg.linearGradient((0, '0%'), (1, '100%'), id='goldGradientDark')
    gold_gradient_dark.add_stop_color(0, 'rgb(150,110,0)', opacity=1)
    gold_gradient_dark.add_stop_color(1, 'rgb(255,215,0)', opacity=1)
    dwg.defs.add(gold_gradient_dark)

    neuron_color_base = 'rgb(0, 200, 50)'
    neuron_glow_color = 'rgb(50, 255, 100)'
    axon_color = 'rgb(0, 100, 20)'

    # --- Gehirn-Form (stilisierte Darstellung mit 3D-Andeutung) ---
    brain_radius_x = size * 0.35
    brain_radius_y = size * 0.30

    # Schattierung für 3D-Effekt (hinten/unten)
    dwg.add(dwg.ellipse(center=(center_x + size * 0.02, center_y + size * 0.02), r=(brain_radius_x, brain_radius_y), 
                        fill="rgba(0,0,0,0.3)"))
    
    # Hauptform des Gehirns
    dwg.add(dwg.ellipse(center=(center_x, center_y), r=(brain_radius_x, brain_radius_y), 
                        fill="url(#goldGradientLight)", stroke="rgb(255,240,100)", stroke_width=3))

    # Mittlere Furche (Andeutung für 3D-Wölbung)
    dwg.add(dwg.line(start=(center_x - brain_radius_x * 0.05, center_y - brain_radius_y * 0.8), 
                     end=(center_x + brain_radius_x * 0.05, center_y + brain_radius_y * 0.8), 
                     stroke="url(#goldGradientDark)", stroke_width=2, stroke_linecap="round"))

    # Kleinere Lappen/Falten (Andeutung von Gehirnstruktur)
    dwg.add(dwg.circle(center=(center_x - brain_radius_x * 0.2, center_y - brain_radius_y * 0.4), r=brain_radius_x * 0.1, fill="url(#goldGradientDark)", stroke="none", opacity=0.7))
    dwg.add(dwg.circle(center=(center_x + brain_radius_x * 0.25, center_y + brain_radius_y * 0.3), r=brain_radius_x * 0.08, fill="url(#goldGradientDark)", stroke="none", opacity=0.7))

    # --- Grüne Neuronen und Axon-Verbindungen (Algorithmisch platziert & statisch) ---
    num_neurons = 100 # Mehr Neuronen für Dichte
    np.random.seed(42) # Feste Seed für reproduzierbare Generierung (Satoramy = 42)
    
    neurons = []
    for _ in range(num_neurons):
        # Positionierung innerhalb des Gehirn-Ovals
        while True:
            nx = np.random.randint(center_x - brain_radius_x, center_x + brain_radius_x)
            ny = np.random.randint(center_y - brain_radius_y, center_y + brain_radius_y)
            # Prüfen, ob Punkt innerhalb der Ellipse liegt
            if ((nx - center_x)**2 / brain_radius_x**2) + ((ny - center_y)**2 / brain_radius_y**2) <= 1:
                neurons.append((nx, ny))
                break

        neuron_size = np.random.uniform(1, 4) # Kleinere Neuronen
        opacity = np.random.uniform(0.3, 0.9) 
        
        dwg.add(dwg.circle(center=(nx, ny), r=neuron_size, fill=neuron_color_base, opacity=opacity))
        dwg.add(dwg.circle(center=(nx, ny), r=neuron_size * 0.6, fill=neuron_glow_color, opacity=opacity * 0.6)) 

    # Axon-Verbindungen (Zufällige Verbindungen zwischen Neuronen, mehr Verbindungen)
    num_connections = 150 # Mehr Verbindungen für Dichte
    for _ in range(num_connections):
        n1_idx, n2_idx = np.random.choice(num_neurons, 2, replace=False)
        p1 = neurons[n1_idx]
        p2 = neurons[n2_idx]
        dwg.add(dwg.line(start=p1, end=p2, stroke=axon_color, stroke_width=0.3, opacity=0.5))
    
    dwg.save()
    print(f"Statische SVG des Cyber-Gehirns generiert: {output_path}")

if __name__ == "__main__":
    output_dir = "assets" 
    os.makedirs(output_dir, exist_ok=True)
    generate_cyber_brain_svg(os.path.join(output_dir, "rotating_cyber_brain.svg"))
