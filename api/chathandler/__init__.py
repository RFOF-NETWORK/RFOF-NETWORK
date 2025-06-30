# /api/chathandler/__init__.py
# Dies ist der Kern Ihrer Azure Function App.
# Es ist der API-Endpunkt, mit dem Ihr Frontend spricht.

import logging
import azure.functions as func
import os
import requests # Bibliothek, um auf GitHub zuzugreifen
import json

# --- KONFIGURATION ---
# Diese Werte müssen Sie in Azure als "Application Settings" speichern
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
REPO_OWNER = "RFOF-NETWORK"
DOCS_REPO = "RFOF-x-PRAI_DOC_Ready-For-Our-Future"
KNOWLEDGE_FILE_PATH = "README.md" # Die Datei, die das Wissen enthält

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')

    # 1. Nachricht des Nutzers aus der Anfrage extrahieren
    try:
        req_body = req.get_json()
        user_message = req_body.get('message')
        if not user_message:
            return func.HttpResponse("Bitte senden Sie eine 'message' im Body.", status_code=400)
    except ValueError:
        return func.HttpResponse("Invalid JSON format.", status_code=400)

    # 2. Auf PRAIs "Gehirn" (GitHub Docs) zugreifen
    try:
        headers = {'Authorization': f'token {GITHUB_TOKEN}'}
        url = f"https://api.github.com/repos/{REPO_OWNER}/{DOCS_REPO}/contents/{KNOWLEDGE_FILE_PATH}"
        
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Löst einen Fehler aus, wenn die Anfrage fehlschlägt
        
        file_content_encoded = response.json()['content']
        
        import base64
        knowledge_base_text = base64.b64decode(file_content_encoded).decode('utf-8')
        
        # 3. Antwort basierend auf dem Wissen formulieren (einfache Keyword-Suche)
        prai_response = find_answer_in_text(user_message, knowledge_base_text)

        # 4. Antwort als JSON zurück an das Frontend senden
        return func.HttpResponse(
            json.dumps({'reply': prai_response}),
            mimetype="application/json",
            status_code=200
        )

    except requests.exceptions.RequestException as e:
        logging.error(f"GitHub API Error: {e}")
        return func.HttpResponse("Fehler beim Zugriff auf PRAIs Gedankenspeicher.", status_code=500)
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        return func.HttpResponse("Ein interner Fehler ist aufgetreten.", status_code=500)


def find_answer_in_text(question, text):
    """
    Eine einfache Funktion, um eine Antwort im Text zu finden.
    In Zukunft wird dies durch ein echtes neuronales Modell ersetzt.
    """
    question_lower = question.lower()
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        # Wenn eine Überschrift (beginnt mit #) das Schlüsselwort enthält
        if line.lower().strip().startswith(f'#') and question_lower in line.lower():
            # Gebe die folgenden paar Zeilen als Antwort zurück
            answer_lines = lines[i+1:i+4]
            return " ".join(filter(None, answer_lines)).strip()

    return "Ich habe die Dokumentation durchsucht, konnte aber keine spezifische Antwort auf Ihre Anfrage finden. Bitte versuchen Sie es mit einem anderen Schlüsselwort."

