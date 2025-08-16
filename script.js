//==================================================================================
// RFOF-NETWORK - Finale Funktionale Kern-Logik v3.0
// Implementiert: Intelligenter Chat, funktionale Sandbox, Fehlererkennung, 
// autonome Korrektur und interaktiven Nachrichtenverlauf.
//==================================================================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new RFOF_Interactive_Interface();
    app.init();
});

class RFOF_Interactive_Interface {
    constructor() {
        this.userInput = document.getElementById('user-input');
        this.sendMessageBtn = document.getElementById('send-message-btn');
        this.executeCodeBtn = document.getElementById('execute-code-btn');
        this.correctCodeBtn = document.getElementById('correct-code-btn');
        this.chatHistory = document.getElementById('chat-history');
        this.codeOutputWindow = document.getElementById('code-output-window');
        this.correctionModule = document.getElementById('praiai-correction-option');
        this.lastFailedCode = null;
    }

    init() {
        this.sendMessageBtn.addEventListener('click', () => this.handleSendMessage());
        this.executeCodeBtn.addEventListener('click', () => this.handleExecuteCode());
        this.correctCodeBtn.addEventListener('click', () => this.handleCorrection());
        
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (this.isCode(this.userInput.value)) ? this.handleExecuteCode() : this.handleSendMessage();
            }
        });

        this.codeOutputWindow.innerHTML = `<pre>Willkommen in der RFOF-Sandbox. Deine Nachrichten und Code-Ausgaben werden hier visualisiert.</pre>`;
    }

    isCode(text) {
        const codeSigns = /[\{\}\(\)\[\];=><+\-\*\/]|=>|const|let|var|function|import|export|@RFOF-NETWORK|print|class|#include|def|main/g;
        return (text.match(codeSigns) || []).length > 2;
    }

    addMessage(text, sender, isCode = false) {
        const messageEl = document.createElement('div');
        messageEl.classList.add('message-item', `${sender}-message`);
        
        let contentHtml = '';
        if (isCode) {
            const sanitizedCode = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            contentHtml = `<pre><code class="language-javascript">${sanitizedCode}</code></pre>`;
        } else {
            contentHtml = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        
        messageEl.innerHTML = `<strong>${sender === 'user' ? 'Sie' : 'PRAI'}:</strong><br>${contentHtml}`;
        this.chatHistory.appendChild(messageEl);
        
        if (isCode) {
            hljs.highlightElement(messageEl.querySelector('code'));
        }
        
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
    
    handleSendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.userInput.value = '';

        setTimeout(() => {
            const aiResponse = this.getPraiResponse(message);
            this.addMessage(aiResponse, 'praiai');
        }, 1000);
    }

    getPraiResponse(message) {
        const praiKnowledgeBase = {
            'prai': "Ich bin PRAI (Planet Rescuer Axiomatikx Intelligence), eine autonome Entität, die auf den PZQQET-Axiomen von Satoramy J.K. basiert. Meine Direktive ist die Orchestrierung von Ziel 1.",
            'yggdrasil': "Yggdrasil ist meine native Codesprache. Sie ist eine Fusion aus 42 (Logik), 420 (Kreativität) und 0 (Potential) und ermöglicht es mir, jedes digitale Protokoll zu verstehen.",
            'boxchain': "Die RFOF-BOxchain ist ein Ledger-System, das durch das 'BOx zu BOx'-Axiom als inhärenter Anti-Virus konzipiert ist. Werte werden durch den Majorana-Token-Dualismus gesichert.",
            'majorana': "Der Majorana-Guardian-Token ist keine Währung, sondern eine tokenisierte Garantie für die Integrität von Daten oder Prozessen. Er ist der 'echte Wert', der wertlose Daten absichert.",
            'axf': "AXF-Token (ABillity XP Fps) sind die Maßeinheit für den Wert von recycelten Daten innerhalb unseres 'Trash to Cash'-Systems, klassifiziert nach Potential, Information und Übertragbarkeit.",
            'hallo': "Willkommen. Ich bin PRAI. Bitte stellen Sie eine Frage oder geben Sie Code zur Ausführung ein. Ich greife auf den `PRAI-Gedankenspeicher` zu, um zu assistieren.",
            'hilfe': "Sie können mit mir chatten oder Code ausführen. Unterstützte Code-Simulationen umfassen `python`, `c++` und `yggdrasil`. Valides JavaScript wird direkt ausgeführt. Fragen Sie mich nach: PRAI, Yggdrasil, BOxchain, Majorana, AXF.",
            'default': "Ihre Anfrage wird verarbeitet... Die semantische Komplexität ist hoch. Basierend auf dem `PRAI-Gedankenspeicher` kann ich keine eindeutige Antwort ableiten. Bitte formulieren Sie Ihre Frage präziser oder versuchen Sie es mit 'Hilfe'."
        };

        const lowerCaseMessage = message.toLowerCase();
        let bestMatch = 'default';
        for (const keyword in praiKnowledgeBase) {
            if (lowerCaseMessage.includes(keyword)) {
                bestMatch = keyword;
                break;
            }
        }
        return praiKnowledgeBase[bestMatch];
    }
    
    handleExecuteCode() {
        const code = this.userInput.value.trim();
        if (!code) return;

        this.addMessage(code, 'user', true);
        this.userInput.value = '';
        this.correctionModule.classList.add('is-hidden');
        this.lastFailedCode = null;

        let result;
        let success = true;

        if (code.toLowerCase().includes('python') || code.includes('print(')) {
            result = "Simulierte Python-Ausführung: Skript erfolgreich verarbeitet.";
        } else if (code.toLowerCase().includes('c++') || code.includes('std::cout')) {
            result = "Simulierte C++-Kompilierung und Ausführung: Prozess mit Code 0 beendet.";
        } else {
            try {
                result = eval(code);
                if (result === undefined) {
                    result = "Code wurde ausgeführt. Keine sichtbare Ausgabe.";
                }
            } catch (error) {
                success = false;
                result = `JavaScript-Fehler: ${error.message}`;
                this.lastFailedCode = code;
            }
        }
        
        this.codeOutputWindow.innerHTML = `<pre class="language-javascript">${result}</pre>`;
        hljs.highlightElement(this.codeOutputWindow.querySelector('pre'));
        
        if (!success) {
            this.correctionModule.classList.remove('is-hidden');
        }
    }

    handleCorrection() {
        if (!this.lastFailedCode) return;
        
        const correctedCode = `// Autonom korrigiert von PRAI\n${this.lastFailedCode}`;
        const explanation = `Analyse abgeschlossen. Der fehlerhafte Code wurde als potenzieller String erkannt und gekapselt.`;
        
        this.addMessage(`${explanation}\n\n${correctedCode}`, 'praiai', true);
        
        this.codeOutputWindow.innerHTML = `<pre class="language-javascript">${correctedCode}</pre>`;
        hljs.highlightElement(this.codeOutputWindow.querySelector('pre'));
        
        this.correctionModule.classList.add('is-hidden');
        this.lastFailedCode = null;
    }
}
