// #kisiere: Dieses Skript steuert die gesamte PRAI Chatbox- und Sandbox-Logik.
// Es simuliert mehrsprachige Code-Ausführung, Fehlererkennung, Nachrichtenverlauf-Interaktion und autonome Korrektur.
document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const executeCodeBtn = document.getElementById('execute-code-btn');
    const correctCodeBtn = document.getElementById('correct-code-btn');
    const chatHistory = document.getElementById('chat-history');
    const codeOutputWindow = document.getElementById('code-output-window');
    const correctionOptionDiv = document.getElementById('praiai-correction-option');

    let history = [];
    let lastCodeWithError = null;

    // Event Listeners
    sendMessageBtn.addEventListener('click', handleSendMessage);
    executeCodeBtn.addEventListener('click', handleExecuteCode);
    correctCodeBtn.addEventListener('click', handleCorrectCode);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    function handleSendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;
        addMessage(message, 'user');
        userInput.value = '';
        correctionOptionDiv.classList.add('is-hidden');
        
        // Simulate PRAI text response
        let praiResponse = "I have received your message. How can I assist you further?";
        if (message.toLowerCase().includes("42")) {
            praiResponse = "Ah, the Answer to the Ultimate Question of Life, the Universe, and Everything. It signifies the core of our network.";
        }
        setTimeout(() => addMessage(praiResponse, 'praiai'), 500);
    }

    function handleExecuteCode() {
        const code = userInput.value.trim();
        if (code === '') return;
        addMessage(code, 'user', true);
        userInput.value = '';

        // Simulate code analysis
        const { errors, correctedCode } = simulateCodeAnalysis(code);
        lastCodeWithError = { code, correctedCode, errors };

        if (errors.length > 0) {
            correctionOptionDiv.classList.remove('is-hidden');
            setTimeout(() => addMessage("I found potential errors in your code. Would you like me to correct it?", 'praiai'), 500);
        } else {
            correctionOptionDiv.classList.add('is-hidden');
            const output = `Simulated execution successful.\nOutput: Code logic processed.`;
            updateOutputWindow(output);
            setTimeout(() => addMessage("Your code was processed successfully.", 'praiai'), 500);
        }
    }

    function handleCorrectCode() {
        if (!lastCodeWithError) return;
        addMessage(lastCodeWithError.correctedCode, 'praiai', true);
        const output = `Simulated execution of corrected code successful.`;
        updateOutputWindow(output);
        correctionOptionDiv.classList.add('is-hidden');
        lastCodeWithError = null;
    }

    function addMessage(text, sender, isCode = false) {
        const messageEl = document.createElement('div');
        messageEl.classList.add('message-item', `${sender}-message`);
        
        const content = document.createElement(isCode ? 'pre' : 'p');
        content.innerHTML = isCode ? `<code class="language-auto">${text}</code>` : text;
        messageEl.appendChild(content);

        const messageData = { text, sender, isCode, element: messageEl };
        history.push(messageData);

        messageEl.addEventListener('click', () => selectMessage(messageData));
        
        chatHistory.appendChild(messageEl);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        if (isCode) {
            hljs.highlightElement(content.querySelector('code'));
        }
        selectMessage(messageData); // Auto-select the new message
    }

    function selectMessage(selectedData) {
        history.forEach(msg => msg.element.classList.remove('selected'));
        selectedData.element.classList.add('selected');
        
        let outputContent = selectedData.text;
        if (selectedData.isCode && lastCodeWithError && lastCodeWithError.code === selectedData.text) {
             lastCodeWithError.errors.forEach(err => {
                outputContent = outputContent.replace(err.text, `<span class="error-underline">${err.text}</span>`);
            });
        }
        updateOutputWindow(outputContent, selectedData.isCode);
    }
    
    function updateOutputWindow(content, isCode = false) {
        if (isCode) {
            codeOutputWindow.innerHTML = `<pre><code class="language-auto">${content}</code></pre>`;
            hljs.highlightElement(codeOutputWindow.querySelector('code'));
        } else {
            codeOutputWindow.innerHTML = `<p>${content}</p>`;
        }
    }

    function simulateCodeAnalysis(code) {
        let errors = [];
        // Simplified error detection logic
        if (code.includes('function') && !code.includes('{')) {
            errors.push({ text: 'function', message: 'Missing opening brace.' });
        }
        if (code.includes('print(') && !code.includes(')')) {
            errors.push({ text: 'print(', message: 'Missing closing parenthesis.'});
        }
        return { errors, correctedCode: code + (errors.length > 0 ? ' // Corrected by PRAI' : '') };
    }
});
