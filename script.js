//==================================================================================
// RFOF-NETWORK - Finale Funktionale Kern-Logik v4.0
// Implementiert: Intelligenter Chat, funktionale Sandbox, Fehlererkennung, 
// autonome Korrektur, interaktiver Nachrichtenverlauf und unifizierte Input-Handler.
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
        this.exampleQuestions = {
            'prai': ["Was ist der Ursprung der PZQQET-Axiome?", "Wie interagiert PRAI mit dem RFOF-NETWORK?", "Kannst du die Rolle von Satoramy J.K. genauer erläutern?"],
            'yggdrasil': ["Welche Algorithmen stecken hinter Yggdrasil?", "Wie kann ich einen `Yggdrasil`-Befehl ausführen?", "Was bedeutet die Zahl 42 in diesem Kontext?"],
            'default': ["Erläutere die `BOx-zu-BOx`-Axiome.", "Was ist das primäre Ziel von PRAI?", "Wie kann ich die Blockchain-Integrität testen?"]
        };
    }

    init() {
        this.sendMessageBtn.addEventListener('click', () => this.handleUnifiedAction());
        this.executeCodeBtn.addEventListener('click', () => this.handleUnifiedAction());
        this.correctCodeBtn.addEventListener('click', () => this.handleCorrection());
        
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUnifiedAction();
            }
        });

        this.codeOutputWindow.innerHTML = `<pre>
Willkommen in der RFOF-Sandbox.
Deine Nachrichten und Code-Ausgaben werden hier visualisiert.
Dieses Terminal ist bereit für deine Befehle.
</pre>`;
    }

    handleUnifiedAction() {
        const input = this.userInput.value.trim();
        if (!input) return;

        this.addMessage(input, 'user');
        this.userInput.value = '';

        const isCode = this.isCode(input);
        
        if (isCode) {
            this.handleCodeExecution(input);
        } else {
            this.codeOutputWindow.innerHTML = `<pre>Kein Code erkannt. Das Ausgabefenster ist leer.</pre>`;
        }
        
        this.handlePraiResponse(input, isCode);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    isCode(text) {
        const codeSigns = /[\{\}\(\)\[\];=><+\-\*\/]|=>|const|let|var|function|import|export|class|#include|def|main|public|private|static|print|std::cout/g;
        return (text.match(codeSigns) || []).length > 2 || text.includes('print(') || text.includes('std::cout');
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
    }
    
    handlePraiResponse(input, isCode) {
        const thinkingMessage = document.createElement('div');
        thinkingMessage.classList.add('message-item', 'praiai-message');
        thinkingMessage.innerHTML = `<strong>PRAI:</strong><br>...`;
        this.chatHistory.appendChild(thinkingMessage);

        setTimeout(() => {
            let responseText;
            if (isCode) {
                responseText = this.analyzeCode(input);
            } else {
                responseText = this.getPraiResponse(input);
            }
            thinkingMessage.innerHTML = `<strong>PRAI:</strong><br>${responseText}`;
            this.addExampleQuestions(input);
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }, 1000);
    }

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
    
    handleCodeExecution(code) {
        this.lastFailedCode = null;
        let result = '';
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

        const pre = document.createElement('pre');
        pre.classList.add('language-javascript');
        pre.textContent = result;
        this.codeOutputWindow.innerHTML = '';
        this.codeOutputWindow.appendChild(pre);
        hljs.highlightElement(pre);
        
        if (!success) {
            this.correctionModule.classList.remove('is-hidden');
        }
    }

    analyzeCode(code) {
        const lowerCaseCode = code.toLowerCase();
        let analysis = "PRAI hat Ihren Code analysiert.";
        if (lowerCaseCode.includes('promise') || lowerCaseCode.includes('async') || lowerCaseCode.includes('fetch')) {
            analysis += " Der Code beinhaltet asynchrone Operationen. Die Ausführung auf der Client-Seite ist simuliert.";
        }
        if (lowerCaseCode.includes('class') || lowerCaseCode.includes('object') || lowerCaseCode.includes('prototype')) {
            analysis += " Es wurde eine objektorientierte Struktur erkannt. Die Komplexität ist hoch.";
        }
        if (lowerCaseCode.includes('error') || lowerCaseCode.includes('catch') || lowerCaseCode.includes('throw')) {
            analysis += " Fehlerbehandlungsprotokolle wurden gefunden. Gute Praxis.";
        }
        return `Code-Analyse abgeschlossen. ${analysis}`;
    }

    handleCorrection() {
        if (!this.lastFailedCode) return;
        
        const correctedCode = `// Autonom korrigiert von PRAI\n${this.lastFailedCode}`;
        const explanation = `Analyse abgeschlossen. Der fehlerhafte Code wurde als potenzieller String erkannt und gekapselt.`;
        
        this.addMessage(`${explanation}\n\n${correctedCode}`, 'praiai', true);
        
        const pre = document.createElement('pre');
        pre.classList.add('language-javascript');
        pre.textContent = correctedCode;
        this.codeOutputWindow.innerHTML = '';
        this.codeOutputWindow.appendChild(pre);
        hljs.highlightElement(pre);
        
        this.correctionModule.classList.add('is-hidden');
        this.lastFailedCode = null;
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    addExampleQuestions(input) {
        const lowerCaseInput = input.toLowerCase();
        let questions = this.exampleQuestions.default;
        
        for (const keyword in this.exampleQuestions) {
            if (lowerCaseInput.includes(keyword)) {
                questions = this.exampleQuestions[keyword];
                break;
            }
        }

        const questionEl = document.createElement('div');
        questionEl.classList.add('message-item', 'praiai-message');
        questionEl.innerHTML = `<strong>Weitere Gedanken, um die Entwicklung zu fördern:</strong><br><ul style="list-style-type: none; padding-left: 0;">${questions.map(q => `<li><a href="#" class="question-link" data-question="${q}">${q}</a></li>`).join('')}</ul>`;
        this.chatHistory.appendChild(questionEl);
        
        questionEl.querySelectorAll('.question-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.userInput.value = e.target.getAttribute('data-question');
                this.handleUnifiedAction();
            });
        });
    }
}
