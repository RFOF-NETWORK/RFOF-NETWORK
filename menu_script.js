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
    const sendMessageBtn = document.getElementById('send-message-btn'); // Get the Senden button by ID
    const executeCodeBtn = document.getElementById('execute-code-btn'); // Get the Code Ausführen button by ID
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

        if (isCode) {
            // Highlight code in chat history after it's added to DOM
            setTimeout(() => {
                const codeElement = messageItem.querySelector('code');
                if (codeElement) {
                    hljs.highlightElement(codeElement);
                }
            }, 0); // Use setTimeout to ensure element is in DOM
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
        hljs.highlightAll(); // Re-highlight all code blocks in chat and output
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
        // It provides simulated feedback based on common patterns.
        if (code.includes('function') && (!code.includes('{') || !code.includes(')'))) {
            errors.push({ text: 'function', message: 'Missing parts of function definition (curly braces or parentheses).' });
            correctedCode = code.replace(/function\s*([a-zA-Z0-9_]*)\s*\(.*\)/, 'function $1() {\n    // code here\n}');
        } else if (code.includes('console.log') && !code.includes('(')) {
            errors.push({ text: 'console.log', message: 'Missing parentheses for console.log.' });
            correctedCode = code.replace('console.log', 'console.log()');
        } else if (code.includes('import') && !code.includes('from')) {
            errors.push({ text: 'import', message: 'Missing "from" clause in import statement.' });
            correctedCode = code + ' from "module"';
        } else if (code.includes('<div') && !code.includes('</div>')) {
            errors.push({ text: '<div', message: 'Missing closing </div> tag.' });
            correctedCode = code + '</div>';
        } else if (code.includes('body {') && !code.includes('}')) {
            errors.push({ text: 'body {', message: 'Missing closing curly brace for CSS rule.' });
            correctedCode = code + '}';
        } else if (code.includes('print(') && !code.includes(')')) { // Python example
            errors.push({ text: 'print(', message: 'Missing closing parenthesis for print function.' });
            correctedCode = code + ')';
        } else if (code.toLowerCase().includes('error') || code.toLowerCase().includes('fehler')) { // Generic error simulation
            errors.push({ text: 'error', message: 'Simulated error detected in logic.' });
            correctedCode = "// PRAI: Detected a potential logical error. Review the following code:\n" + code; // Example correction
        }

        lastCodeWithError = { code: code, corrected: correctedCode, errors: errors };

        if (errors.length > 0) {
            praiaiCorrectionOption.style.display = 'block';
            praiaiQuestion.style.display = 'block';
            
            let errorHighlightedCode = code;
            errors.forEach(error => {
                const regex = new RegExp(error.text, 'g');
                errorHighlightedCode = errorHighlightedCode.replace(regex, `<span class="error-underline">${error.text}</span>`);
            });
            codeOutputWindow.innerHTML = `<pre><code class="language-auto">${errorHighlightedCode}</code></pre>`;
            addMessageToChat("Ich habe Fehler in deinem Code gefunden. Möchtest du, dass ich ihn korrigiere?", 'praiai', false, '', errors);

        } else {
            // Simulate successful execution output for various languages
            let simulatedRawOutput = simulateCodeExecutionOutput(code); // Get the raw simulated output
            codeOutputWindow.innerHTML = `<pre><code class="language-auto">${simulatedRawOutput}</code></pre>`; // Raw output
            addMessageToChat(`Dein Code wurde verarbeitet. Output: ${simulatedRawOutput.split('\n')[0]}`, 'praiai'); // Add summary to chat
            praiaiCorrectionOption.style.display = 'none';
            praiaiQuestion.style.display = 'none';
        }
        userInput.value = '';
        hljs.highlightAll(); // Re-highlight all code blocks in chat and output
    }

    function correctAndSendCode() {
        if (!lastCodeWithError) return;

        const correctedCode = lastCodeWithError.corrected;
        addMessageToChat("Hier ist die von PRAI autonom korrigierte Version deines Codes:", 'praiai', true, correctedCode);
        
        // Simulate execution of the corrected code
        const simulatedOutput = simulateCodeExecutionOutput(correctedCode);
        codeOutputWindow.innerHTML = `<pre><code class="language-auto">${simulatedOutput}</code></pre>`;
        
        addMessageToChat(`Ausführung des korrigierten Codes: Output: ${simulatedOutput.split('\n')[0]}`, 'praiai');
        praiaiCorrectionOption.style.display = 'none';
        praiaiQuestion.style.display = 'none';
        lastCodeWithError = null; // Reset after correction
        hljs.highlightAll();
    }

    // Helper function to simulate output for various languages
    function simulateCodeExecutionOutput(code) {
        let output = "Simulierte Ausführung:\n";
        const lowerCode = code.toLowerCase();

        if (lowerCode.includes('html') || lowerCode.includes('div') || lowerCode.includes('body')) {
            output += "HTML/CSS Code erfolgreich verarbeitet. Visuelle Interpretation im Ausgabefenster (nicht gerendert).\n";
        } else if (lowerCode.includes('javascript') || lowerCode.includes('console.log') || lowerCode.includes('function')) {
            try {
                // VERY BASIC & UNSAFE EVAL - ONLY FOR DEMONSTRATION OF CONCEPT
                let result = eval(code);
                output += `JavaScript Code erfolgreich ausgeführt.\nOutput: ${result !== undefined ? result : 'No explicit return'}`;
            } catch (e) {
                output += `JavaScript Ausführungsfehler: ${e.message}\n`;
            }
        } else if (lowerCode.includes('python') || lowerCode.includes('print') || lowerCode.includes('def')) {
            output += "Python Code simuliert ausgeführt. (Echte Ausführung erfordert Server-Backend)\n";
            if (code.includes('print("Hello")')) output += "Simulierter Output: Hello\n";
            else output += "Simulierter Output: Code-Logik erfolgreich verarbeitet.\n";
        } else if (lowerCode.includes('solidity') || lowerCode.includes('contract')) {
            output += "Solidity Smart Contract Code simuliert. (Echte Ausführung erfordert EVM)\n";
            output += "Simulierter Output: Smart Contract Logik analysiert und verifiziert.\n";
        } else if (lowerCode.includes('c++') || lowerCode.includes('int main') || lowerCode.includes('cout')) {
            output += "C++ Code simuliert ausgeführt. (Echte Ausführung erfordert Compiler)\n";
            output += "Simulierter Output: Kompilierung und Ausführung erfolgreich simuliert.\n";
        } else if (lowerCode.includes('rust') || lowerCode.includes('fn main') || lowerCode.includes('println!')) {
            output += "Rust Code simuliert ausgeführt. (Echte Ausführung erfordert Compiler)\n";
            output += "Simulierter Output: Rust-Programm erfolgreich simuliert.\n";
        } else if (lowerCode.includes('go ') || lowerCode.includes('package main') || lowerCode.includes('func main')) {
            output += "Go Code simuliert ausgeführt. (Echte Ausführung erfordert Compiler)\n";
            output += "Simulierter Output: Go-Routine erfolgreich simuliert.\n";
        } else if (lowerCode.includes('bash') || lowerCode.includes('sh ') || lowerCode.includes('chmod')) {
            output += "Bash Skript simuliert ausgeführt. (Echte Ausführung erfordert Shell)\n";
            output += "Simulierter Output: Befehle erfolgreich simuliert abgearbeitet.\n";
        } else if (lowerCode.includes('apache')) {
            output += "Apache Konfiguration simuliert. (Echte Ausführung erfordert Webserver)\n";
            output += "Simulierter Output: Konfiguration erfolgreich geprüft.\n";
        } else if (lowerCode.includes('elixir') || lowerCode.includes('defmodule')) {
            output += "Elixir Code simuliert ausgeführt. (Echte Ausführung erfordert VM)\n";
            output += "Simulierter Output: Elixir-Prozess erfolgreich simuliert.\n";
        } else if (lowerCode.includes('func') && !lowerCode.includes('function')) { // For FunC
             output += "FunC Code simuliert ausgeführt. (Echte Ausführung erfordert TON VM)\n";
             output += "Simulierter Output: FunC Contract Logik analysiert.\n";
        } else if (lowerCode.includes('yggdrasil') || lowerCode.includes('roff')) {
             output += "Yggdrasil/Roff Code simuliert ausgeführt. (Spezifische Ausführungsumgebung erforderlich)\n";
             output += "Simulierter Output: Syntax erfolgreich interpretiert.\n";
        }
        else {
            output += "Code-Sprache nicht erkannt oder komplexer Code. Simulation der Ausführung.\nFür eine echte Ausführung ist ein Server-Backend erforderlich.";
        }
        return code; // Return the code itself to be highlighted
    }

    // Attach event listeners to buttons
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    if (executeCodeBtn) {
        executeCodeBtn.addEventListener('click', executeCode);
    }
    // Enter key handling for user input is in index.html (onkeydown)
});
