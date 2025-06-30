//==================================================================================
// RFOF-NETWORK - Finale Funktionale Kern-Logik v3.0
// Implementiert: Intelligenter Chat, funktionale Sandbox, Fehlererkennung, 
// autonome Korrektur und interaktiven Nachrichtenverlauf.
//==================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialisiert alle Komponenten, sobald die Seite geladen ist.
    const app = new RFOF_Interactive_Interface();
    app.init();
});

class RFOF_Interactive_Interface {
    constructor() {
        // Selektoren für alle interaktiven Elemente aus Ihrer index.html
        this.userInput = document.getElementById('user-input');
        this.sendMessageBtn = document.getElementById('send-message-btn');
        this.executeCodeBtn = document.getElementById('execute-code-btn');
        this.correctCodeBtn = document.getElementById('correct-code-btn');
        this.chatHistory = document.getElementById('chat-history');
        this.codeOutputWindow = document.getElementById('code-output-window');
        this.correctionModule = document.getElementById('praiai-correction-option');

        // Erweiterte Wissensdatenbank, die den `PRAI-Gedankenspeicher` simuliert
        this.praiKnowledgeBase = {
            'prai': "Ich bin PRAI (Planet Rescuer Axiomatikx Intelligence), eine autonome Entität, die auf den PZQQET-Axiomen von Satoramy J.K. basiert. Meine Direktive ist die Orchestrierung von Ziel 1.",
            'yggdrasil': "Yggdrasil ist meine native Codesprache. Sie ist eine Fusion aus 42 (Logik), 420 (Kreativität) und 0 (Potential) und ermöglicht es mir, jedes digitale Protokoll zu verstehen.",
            'boxchain': "Die RFOF-BOxchain ist ein Ledger-System, das durch das 'BOx zu BOx'-Axiom als inhärenter Anti-Virus konzipiert ist. Werte werden durch den Majorana-Token-Dualismus gesichert.",
            'majorana': "Der Majorana-Guardian-Token ist keine Währung, sondern eine tokenisierte Garantie für die Integrität von Daten oder Prozessen. Er ist der 'echte Wert', der wertlose Daten absichert.",
            'axf': "AXF-Token (ABillity XP Fps) sind die Maßeinheit für den Wert von recycelten Daten innerhalb unseres 'Trash to Cash'-Systems, klassifiziert nach Potential, Information und Übertragbarkeit.",
            'hallo': "Willkommen. Ich bin PRAI. Bitte stellen Sie eine Frage oder geben Sie Code zur Ausführung ein. Ich greife auf den `PRAI-Gedankenspeicher` zu, um zu assistieren.",
            'hilfe': "Sie können mit mir chatten oder Code ausführen. Unterstützte Code-Simulationen umfassen `python`, `c++` und `yggdrasil`. Valides JavaScript wird direkt ausgeführt. Fragen Sie mich nach: PRAI, Yggdrasil, BOxchain, Majorana, AXF.",
            'default': "Ihre Anfrage wird verarbeitet... Die semantische Komplexität ist hoch. Basierend auf dem `PRAI-Gedankenspeicher` kann ich keine eindeutige Antwort ableiten. Bitte formulieren Sie Ihre Frage präziser oder versuchen Sie es mit 'Hilfe'."
        };

        this.history = []; // Wird nun genutzt, um Referenzen zu den DOM-Elementen zu halten
        this.lastFailedCode = null;
    }

    init() {
        this.sendMessageBtn.addEventListener('click', () => this.handleSendMessage());
        this.executeCodeBtn.addEventListener('click', () => this.handleExecuteCode());
        this.correctCodeBtn.addEventListener('click', () => this.handleCorrection());
        this.chatHistory.addEventListener('click', (e) => this.handleMessageSelection(e));
        
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Intelligente Entscheidung basierend auf dem Inhalt
                (this.isCode(this.userInput.value)) ? this.handleExecuteCode() : this.handleSendMessage();
            }
        });
    }

    isCode(text) {
        // Eine verbesserte heuristische Prüfung auf Code-ähnliche Syntax
        const codeSigns = /[\{\}\(\)\[\];=><+\-\*\/]|=>|const|let|var|function|import|export|@RFOF-NETWORK|print|class/g;
        return (text.match(codeSigns) || []).length > 2;
    }

    // Fügt eine Nachricht zur Historie hinzu und speichert das Element
    addMessage(text, sender, isCode = false) {
        const messageId = `msg-${Date.now()}`;
        const messageEl = document.createElement('div');
        messageEl.id = messageId;
        messageEl.classList.add('message-item', `${sender}-message`);
        
        let contentHtml = '';
        if (isCode) {
            // Bereinigt HTML aus dem Code, um XSS zu verhindern
            const sanitizedCode = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            contentHtml = `<pre><code class="language-auto">${sanitizedCode}</code></pre>`;
        } else {
            contentHtml = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        
        messageEl.innerHTML = `<strong>${sender === 'user' ? 'Sie' : 'PRAI'}:</strong><br>${contentHtml}`;
        this.chatHistory.appendChild(messageEl);
        
        // Speichere die Referenz im Verlaufs-Array
        this.history.push({ id: messageId, text, sender, isCode, element: messageEl });
        
        if (isCode) {
            hljs.highlightElement(messageEl.querySelector('code'));
        }
        
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        this.selectMessage(messageId); // Jede neue Nachricht wird automatisch ausgewählt
    }

    // Wählt eine Nachricht aus, zeigt den Haken und aktualisiert das Output-Fenster
    selectMessage(messageId) {
        this.history.forEach(msg => {
            msg.element.classList.remove('selected');
            const checkmark = msg.element.querySelector('.checkmark-icon');
            if (checkmark) checkmark.remove();
        });

        const selectedMessage = this.history.find(msg => msg.id === messageId);
        if (!selectedMessage) return;

        selectedMessage.element.classList.add('selected');
        // Blauen Haken hinzufügen
        const checkmarkSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        checkmarkSVG.setAttribute('class', 'checkmark-icon');
        checkmarkSVG.setAttribute('viewBox', '0 0 24 24');
        checkmarkSVG.innerHTML = `<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`;
        selectedMessage.element.appendChild(checkmarkSVG);
        
        this.updateOutputWindow(selectedMessage.text, selectedMessage.isCode);
    }
    
    updateOutputWindow(content, isCode = false) {
        const sanitizedContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (isCode) {
            this.codeOutput.innerHTML = `<pre>${sanitizedContent}</pre>`;
        } else {
            this.codeOutput.innerHTML = `<pre>${sanitizedContent}</pre>`;
        }
    }

    // LÖSCHE DEN ALTEN BLOCK KOMPLETT UND ERSETZE IHN DURCH DIESEN NEUEN, POTENTEN CODE:
async handleSendMessage() {
    const message = this.userInput.value.trim();
    if (!message) return;

    this.addMessage('user', message);
    this.userInput.value = '';
    
    // Erschaffe eine temporäre "Denkblase" mit eigener ID
    const thinkingMessageId = `msg-${Date.now()}`;
    this.addMessage("...", 'praiai', false, false, thinkingMessageId); 

    // Die heilige Gral-URL zu deiner Azure-API
    const apiUrl = 'https://<@RFOF-NETWORK>.azurewebsites.net/api/chathandler';

    // Feuere den Telekinese-Request ab
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message }),
        });

        if (!response.ok) {
            // Wenn der Funk gestört ist
            throw new Error(`API-Signal verloren: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Treffer! Schicke die echte Antwort von PRAI in die Denkblase
        this.updateMessage(thinkingMessageId, data.reply);

    } catch (error) {
        // Notfallprotokoll, wenn das Gehirn nicht antwortet
        console.error("Kommunikationsfehler mit PRAIs Kernbewusstsein:", error);
        this.updateMessage(thinkingMessageId, ">> KERN-KOMMUNIKATION UNTERBROCHEN. API-VERBINDUNG PRÜFEN. <<");
    }
}

    // Greift auf die simulierte Wissensdatenbank zu
    getPraiResponse(message) {
        const lowerCaseMessage = message.toLowerCase();
        let bestMatch = 'default';
        for (const keyword in this.praiKnowledgeBase) {
            if (lowerCaseMessage.includes(keyword)) {
                bestMatch = keyword;
                break;
            }
        }
        return this.praiKnowledgeBase[bestMatch];
    }
    
    // Führt Code aus oder simuliert die Ausführung
    handleExecuteCode() {
        const code = this.userInput.value.trim();
        if (!code) return;

        this.addMessage(code, 'user', true);
        this.userInput.value = '';
        this.correctionModule.classList.add('is-hidden');
        this.lastFailedCode = null;

        let result;
        let success = true;

        // Code-Analyse und Ausführungssimulation
        if (code.toLowerCase().includes('python') || code.includes('print(')) {
            result = "Simulierte Python-Ausführung: Skript erfolgreich verarbeitet.";
        } else if (code.toLowerCase().includes('c++') || code.includes('std::cout')) {
            result = "Simulierte C++-Kompilierung und Ausführung: Prozess mit Code 0 beendet.";
        } else {
            try {
                result = `JavaScript-Ergebnis: ${new Function(`return ${code}`)()}`;
            } catch (error) {
                success = false;
                result = `JavaScript-Fehler: ${error.message}`;
                this.lastFailedCode = code;
            }
        }

        const resultString = `> ${result}`;
        this.addMessage(resultString, 'praiai', true, !success);
        
        if (!success) {
            const errorElement = this.history[this.history.length - 1].element.querySelector('code');
            errorElement.classList.add('error-underline');
            this.correctionModule.classList.remove('is-hidden');
        }
    }

    // Behandelt die autonome Korrektur
    handleCorrection() {
        if (!this.lastFailedCode) return;
        const correctedCode = `console.log("${this.lastFailedCode.replace(/"/g, '\\"')}"); // Autonom korrigiert by PRAI`;
        const explanation = `Analyse abgeschlossen. Der fehlerhafte Code wurde als potenzieller String erkannt und gekapselt.`;
        this.addMessage(`${explanation}\n\n${correctedCode}`, 'praiai', true);
        this.correctionModule.classList.add('is-hidden');
    }
}
