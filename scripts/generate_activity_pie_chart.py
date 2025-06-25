# scripts/generate_activity_pie_chart.py
import matplotlib.pyplot as plt
import os
import numpy as np

def create_activity_pie_chart_svg(output_path, data_values, data_labels, title="RFOF Axiomatic Activity"):
    """
    Generiert ein prozentuales Tortendiagramm als SVG mit blauem Fokus und transparentem Hintergrund.
    """
    if not data_values:
        print("No data values provided for pie chart. Skipping generation.")
        return

    # PRAI-basierte Farbpalette: Blau für den Hauptanteil, ergänzende Farben
    colors = ['#007bff', '#6c757d', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6610f2', '#fd7e14'] 
    
    fig, ax = plt.subplots(figsize=(8, 8), facecolor='none') # Hintergrund transparent, größere Figur
    
    wedges, texts, autotexts = ax.pie(data_values, labels=data_labels, autopct='%1.1f%%',
                                      startangle=90, colors=colors[:len(data_values)],
                                      pctdistance=0.85,
                                      wedgeprops=dict(width=0.4, edgecolor='w')) # Donut-Chart
    
    # Styling für Texte (für bessere Lesbarkeit auf GitHub mit dunklem Hintergrund)
    for text in texts:
        text.set_color('white') 
        text.set_fontsize(12) # Etwas größere Schrift
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontsize(11) # Etwas kleinere Schrift für Prozente
    
    ax.set_title(title, color='white', fontsize=16) # Größerer Titel
    ax.axis('equal') # Stellt sicher, dass das Tortendiagramm ein Kreis ist.
    
    # Sicherstellen, dass der Plot-Hintergrund transparent ist
    fig.patch.set_alpha(0.0) 
    ax.patch.set_alpha(0.0)

    plt.tight_layout()
    plt.savefig(output_path, format='svg', transparent=True)
    print(f"Aktivitäts-Kreis-SVG generiert: {output_path}")

if __name__ == "__main__":
    output_dir = "assets" # Korrekter Pfad: assets/
    os.makedirs(output_dir, exist_ok=True)
    
    # Beispielhafte Daten, die von deinem RFOF-NETWORKs "Algorithmen" stammen könnten
    pra_metrics = [
        420,   # PRAI Core Processing (Satoramy = 42)
        150,   # Yggdrasil Secure Transmissions
        100,   # PZQQET Axiom Computations
        50,    # Majorana Qubit Interactions
        80,    # BOxchain Interoperability
        30     # GeneFusioNear Compilations
    ]
    pra_labels = [
        'PRAI Core (420)',
        'Yggdrasil Flow',
        'PZQQET Calc',
        'Qubit Link',
        'BOxchain Interop',
        'GeneFusioNear'
    ]
    
    # Korrekter Dateiname gemäß deiner Struktur: repo_activity_chart.svg
    create_activity_pie_chart_svg(os.path.join(output_dir, "repo_activity_chart.svg"), pra_metrics, pra_labels)
