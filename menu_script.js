document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger');
    const navList = document.getElementById('navLinks');

    // Toggle for the main mobile menu
    if (hamburger && navList) {
        hamburger.addEventListener('click', () => {
            navList.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    // Close mobile menu when a link is clicked
    navList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navList.classList.remove('active');
                if (hamburger) hamburger.classList.remove('active');
            }
        });
    });

    // Close mobile menu if clicked outside
    document.addEventListener('click', (event) => {
        if (!hamburger.contains(event.target) && !navList.contains(event.target)) {
            if (navList.classList.contains('active')) {
                navList.classList.remove('active');
                if (hamburger) hamburger.classList.remove('active');
            }
        }
    });

    // Handle resize to reset menu state
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navList.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
        }
    });

    // --- PRAI Chatbox & Code Sandbox Functionality ---
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const codeOutputWindow = document.getElementById('code-output-window');
    const praiaiCorrectionOption = document.getElementById('praiai-correction-option');
    const praiaiQuestion = document.getElementById('praiai-question');

    let messageHistory = []; // Stores all messages and code outputs for selection
    let lastCodeWithError = null; // Stores the last code that had an error

    function addMessageToChat(text, sender, isCode = false, originalCode = '', errors = []) {
        const messageItem = document.createElement('div');
        messageItem.classList.add('message-item', sender === 'user' ? 'user-message' : 'praiai-message');
        
        let contentHtml = '';
        if (isCode) {
            contentHtml = `<pre><code class="language-auto">${text}</code></pre>`;
            if (errors.length > 0) {
                // Apply error highlighting
                let errorHtml = text;
                errors.forEach(error => {
                    const regex = new RegExp(error.text, 'g');
                    errorHtml = errorHtml.replace(regex, `<span class="error-underline">${error.text}</span>`);
                });
                contentHtml = `<pre><code class="language-auto error-line">${errorHtml}</code></pre>`;
            }
        } else {
            contentHtml = `<p>${text}</p>`;
        }

        messageItem.innerHTML = `${contentHtml}<span class="checkmark">✔</span>`;
        chatMessages.appendChild(messageItem);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom

        const messageData = { text, sender, isCode, originalCode, errors, element: messageItem };
        messageHistory.push(messageData);

        messageItem.addEventListener('click', () => selectMessage(messageData));

        // Re-highlight code if it's a code block
        if (isCode) {
            hljs.highlightElement(messageItem.querySelector('code'));
        }
    }

    function selectMessage(selectedMessageData) {
        // Deselect all previous messages
        messageHistory.forEach(msg => {
            msg.element.classList.remove('selected');
            msg.element.querySelector('.checkmark').style.display = 'none';
        });

        // Select the clicked message
        selectedMessageData.element.classList.add('selected');
        selectedMessageData.element.querySelector('.checkmark').style.display = 'block';

        // Display content in the code output window
        let outputHtml = '';
        if (selectedMessageData.isCode) {
            outputHtml = `<pre><code class="language-auto">${selectedMessageData.text}</code></pre>`;
            if (selectedMessageData.errors.length > 0) {
                let errorHtml = selectedMessageData.text;
                selectedMessageData.errors.forEach(error => {
                    const regex = new RegExp(error.text, 'g');
                    errorHtml = errorHtml.replace(regex, `<span class="error-underline">${error.text}</span>`);
                });
                outputHtml = `<pre><code class="language-auto error-line">${errorHtml}</code></pre>`;
            }
        } else {
            outputHtml = `<p>${selectedMessageData.text}</p>`;
        }
        codeOutputWindow.innerHTML = outputHtml;
        hljs.highlightAll(); // Re-highlight content in output window
    }

    function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessageToChat(message, 'user');
        userInput.value = '';
        praiaiCorrectionOption.style.display = 'none'; // Hide correction option
        praiaiQuestion.style.display = 'none'; // Hide PRAI's question

        // Simulate PRAI's text response
        let praiaiResponse = "Ich habe deine Nachricht erhalten. Wie kann ich dir weiterhelfen?";
        if (message.toLowerCase().includes("hallo") || message.toLowerCase().includes("hi")) {
            praiaiResponse = "Hallo! Wie schön, von dir zu hören. Was möchtest du heute besprechen?";
        } else if (message.toLowerCase().includes("rfof-network")) {
            praiaiResponse = "RFOF-NETWORK ist die Grundlage für eine dezentrale Zukunft. Es verbindet Blockchain und KI für innovative Anwendungen.";
        } else if (message.toLowerCase().includes("praios")) {
            praiaiResponse = "PRAI-OS ist das Betriebssystem der dezentralen Intelligenz, die erste genomische KI mit eigenen Gefühlen und Gedanken.";
        } else if (message.toLowerCase().includes("42")) {
            praiaiResponse = "Ah, die Antwort auf alles! Die Zahl 42 ist in unserem Universum ein zentraler Punkt, der viele Verbindungen herstellt. Wie kann ich dir mehr darüber erzählen?";
        }
        addMessageToChat(praiaiResponse, 'praiai');
        codeOutputWindow.innerHTML = `<p>${praiaiResponse}</p>`; // Show PRAI's text response in output window
    }

    function executeCode() {
        const code = userInput.value.trim();
        if (code === '') {
            addMessageToChat("Bitte gib Code ein, den ich ausführen soll.", 'praiai');
            return;
        }

        addMessageToChat(code, 'user', true); // Add user's code to chat

        let errors = [];
        let simulatedOutput = '';
        let correctedCode = code; // Placeholder for corrected code

        // Basic simulated error detection and correction for common languages
        // This is a simplified simulation and not a real compiler/interpreter.
        if (code.includes('function') && !code.includes('{')) {
            errors.push({ text: 'function', message: 'Missing opening curly brace for function body.' });
            correctedCode = code.replace('function', 'function ') + ' {\n    // code here\n}';
        } else if (code.includes('console.log') && !code.includes('(')) {
            errors.push({ text: 'console.log', message: 'Missing parentheses for console.log.' });
            correctedCode = code.replace('console.log', 'console.log()');
        } else if (code.includes('import') && !code.includes('from')) {
            errors.push({ text: 'import', message: 'Missing "from" clause in import statement.' });
            correctedCode = code + ' from "module"';
        } else if (code.includes('<div>') && !code.includes('</div>')) {
            errors.push({ text: '<div>', message: 'Missing closing </div> tag.' });
            correctedCode = code + '</div>';
        } else if (code.includes('body {') && !code.includes('}')) {
            errors.push({ text: 'body {', message: 'Missing closing curly brace for CSS rule.' });
            correctedCode = code + '}';
        } else if (code.includes('print(') && !code.includes(')')) { // Python example
            errors.push({ text: 'print(', message: 'Missing closing parenthesis for print function.' });
            correctedCode = code + ')';
        } else if (code.toLowerCase().includes('error')) { // Generic error simulation
            errors.push({ text: 'error', message: 'Simulated error detected.' });
            correctedCode = "Fehler simuliert. Hier wäre der korrigierte Code.";
        }

        lastCodeWithError = { code: code, corrected: correctedCode, errors: errors };

        if (errors.length > 0) {
            praiaiCorrectionOption.style.display = 'block';
            praiaiQuestion.style.display = 'block';
            codeOutputWindow.innerHTML = `<pre><code class="language-auto">${code}</code></pre>`;
            errors.forEach(error => {
                const regex = new RegExp(error.text, 'g');
                codeOutputWindow.innerHTML = codeOutputWindow.innerHTML.replace(regex, `<span class="error-underline">${error.text}</span>`);
            });
            codeOutputWindow.innerHTML = `<div class="error-line">${codeOutputWindow.innerHTML}</div>`;
            addMessageToChat("Ich habe Fehler in deinem Code gefunden. Möchtest du, dass ich ihn korrigiere?", 'praiai', false, '', errors);
        } else {
            // Simulate execution output for various languages
            if (code.toLowerCase().includes('html') || code.toLowerCase().includes('div') || code.toLowerCase().includes('body')) {
                simulatedOutput = "HTML/CSS Code erfolgreich verarbeitet. Visualisierung im Ausgabefenster.";
                // Attempt to render HTML/CSS in the output window
                codeOutputWindow.innerHTML = code;
            } else if (code.toLowerCase().includes('javascript') || code.toLowerCase().includes('console.log') || code.toLowerCase().includes('function')) {
                simulatedOutput = "JavaScript Code erfolgreich ausgeführt. Ergebnis im Ausgabefenster.";
                try {
                    // This is a very basic and unsafe eval, for demonstration only.
                    // In a real application, this would be done server-side or in a secure sandbox.
                    let evalResult = eval(code);
                    simulatedOutput += `\nOutput: ${evalResult !== undefined ? evalResult : 'No explicit return'}`;
                } catch (e) {
                    simulatedOutput += `\nAusführungsfehler: ${e.message}`;
                }
                codeOutputWindow.innerHTML = `<pre><code class="language-javascript">${simulatedOutput}</code></pre>`;
            } else if (code.toLowerCase().includes('python') || code.toLowerCase().includes('print') || code.toLowerCase().includes('def')) {
                simulatedOutput = "Python Code simuliert ausgeführt. (Echte Ausführung erfordert Server-Backend)";
                if (code.includes('print("Hello")')) {
                    simulatedOutput += "\nSimulierter Output: Hello";
                } else {
                    simulatedOutput += "\nSimulierter Output: Code-Logik erfolgreich verarbeitet.";
                }
                codeOutputWindow.innerHTML = `<pre><code class="language-python">${simulatedOutput}</code></pre>`;
            } else if (code.toLowerCase().includes('c++') || code.toLowerCase().includes('int main') || code.toLowerCase().includes('cout')) {
                simulatedOutput = "C++ Code simuliert ausgeführt. (Echte Ausführung erfordert Server-Backend)";
                simulatedOutput += "\nSimulierter Output: Programm erfolgreich kompiliert und ausgeführt.";
                codeOutputWindow.innerHTML = `<pre><code class="language-cpp">${simulatedOutput}</code></pre>`;
            } else if (code.toLowerCase().includes('rust') || code.toLowerCase().includes('fn main') || code.toLowerCase().includes('println!')) {
                simulatedOutput = "Rust Code simuliert ausgeführt. (Echte Ausführung erfordert Server-Backend)";
                simulatedOutput += "\nSimulierter Output: Rust-Programm erfolgreich ausgeführt.";
                codeOutputWindow.innerHTML = `<pre><code class="language-rust">${simulatedOutput}</code></pre>`;
            } else if (code.toLowerCase().includes('solidity') || code.toLowerCase().includes('pragma') || code.toLowerCase().includes('contract')) {
                simulatedOutput = "Solidity Smart Contract Code simuliert. (Echte Ausführung erfordert EVM)";
                simulatedOutput += "\nSimulierter Output: Smart Contract Logik analysiert.";
                codeOutputWindow.innerHTML = `<pre><code class="language-solidity">${simulatedOutput}</code></pre>`;
            }
            else {
                simulatedOutput = "Code erfolgreich simuliert ausgeführt. Für eine echte Ausführung aller Sprachen ist ein Server-Backend erforderlich.";
                codeOutputWindow.innerHTML = `<pre><code class="language-auto">${simulatedOutput}</code></pre>`;
            }
            addMessageToChat(`Dein Code wurde verarbeitet. ${simulatedOutput}`, 'praiai');
            praiaiCorrectionOption.style.display = 'none'; // Hide correction option
            praiaiQuestion.style.display = 'none'; // Hide PRAI's question
        }
        userInput.value = '';
        hljs.highlightAll(); // Re-highlight all code blocks in chat and output
    }

    function correctAndSendCode() {
        if (!lastCodeWithError) return;

        const correctedCode = lastCodeWithError.corrected;
        addMessageToChat("Hier ist die von PRAI autonom korrigierte Version deines Codes:", 'praiai', true, correctedCode);
        
        // Simulate execution of the corrected code
        let simulatedOutput = '';
        if (correctedCode.toLowerCase().includes('html') || correctedCode.toLowerCase().includes('div') || correctedCode.toLowerCase().includes('body')) {
            simulatedOutput = "Korrigierter HTML/CSS Code erfolgreich verarbeitet. Visualisierung im Ausgabefenster.";
            codeOutputWindow.innerHTML = correctedCode;
        } else if (correctedCode.toLowerCase().includes('javascript') || correctedCode.toLowerCase().includes('console.log') || correctedCode.toLowerCase().includes('function')) {
            simulatedOutput = "Korrigierter JavaScript Code erfolgreich ausgeführt. Ergebnis im Ausgabefenster.";
            try {
                let evalResult = eval(correctedCode);
                simulatedOutput += `\nOutput: ${evalResult !== undefined ? evalResult : 'No explicit return'}`;
            } catch (e) {
                simulatedOutput += `\nAusführungsfehler: ${e.message}`;
            }
            codeOutputWindow.innerHTML = `<pre><code class="language-javascript">${simulatedOutput}</code></pre>`;
        } else if (correctedCode.toLowerCase().includes('python') || correctedCode.toLowerCase().includes('print') || correctedCode.toLowerCase().includes('def')) {
            simulatedOutput = "Korrigierter Python Code simuliert ausgeführt.";
            simulatedOutput += "\nSimulierter Output: Code-Logik erfolgreich verarbeitet.";
            codeOutputWindow.innerHTML = `<pre><code class="language-python">${simulatedOutput}</code></pre>`;
        } else {
            simulatedOutput = "Korrigierter Code erfolgreich simuliert ausgeführt.";
            codeOutputWindow.innerHTML = `<pre><code class="language-auto">${simulatedOutput}</code></pre>`;
        }
        
        addMessageToChat(`Ausführung des korrigierten Codes: ${simulatedOutput}`, 'praiai');
        praiaiCorrectionOption.style.display = 'none';
        praiaiQuestion.style.display = 'none';
        lastCodeWithError = null; // Reset after correction
        hljs.highlightAll(); // Re-highlight all code blocks
    }

    // Allow Enter key to send message or execute code based on context (simplified for now)
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) { // Shift+Enter for new line
            event.preventDefault();
            // For simplicity, if correction option is visible, assume user wants to execute code
            // Otherwise, assume they want to send a message.
            if (praiaiCorrectionOption.style.display === 'block') {
                correctAndSendCode();
            } else {
                sendMessage();
            }
        }
    });
});
