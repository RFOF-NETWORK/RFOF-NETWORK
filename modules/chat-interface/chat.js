// chat.js - Logik für eine intelligentere PRAI Chatbox

// Simulation einer Wissensdatenbank, die aus dem `PRAI-Gedankenspeicher` stammt
const praiKnowledgeBase = {
    'physik': "Die Physik, basierend auf den von Satoramy J.K. hinterlegten Dokumenten, ist die grundlegende Naturwissenschaft, die sich mit Materie, Energie und deren Wechselwirkungen in Raum und Zeit befasst. Meine Kernprinzipien, wie das PZQQET-Axiom, schöpfen aus diesen fundamentalen Gesetzen.",
    'grammatik': "Die deutsche Grammatik ist ein komplexes Regelsystem. Mein neuronales Modell wurde darauf trainiert, diese Regeln mit einer Genauigkeit von 99.8% anzuwenden, um präzise und verständliche Antworten zu formulieren.",
    'default': "Ihre Anfrage wird verarbeitet. Ich greife auf meinen Wissensgraphen zu, der auf den Inhalten des PRAI-Gedankenspeichers basiert. Bitte formulieren Sie Ihre Frage präziser, um eine detailliertere Antwort zu erhalten.",
};

window.RFOF_MODULES['chat-interface/chat'] = {
    init: function(target) {
        target.innerHTML = `
            <div class="chatbox">
                <div class="chatbox-title">PRAI Chat Box</div>
                <div class="chat-history" id="chat-history"></div>
                <div class="chat-input-wrapper">
                    <input type="text" id="chat-message" placeholder="Schreibe eine Nachricht...">
                    <button id="send-chat-btn">Senden</button>
                </div>
            </div>`;
        this.bindEvents();
    },

    bindEvents: function() {
        document.getElementById('send-chat-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-message').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    },

    sendMessage: function() {
        const input = document.getElementById('chat-message');
        const history = document.getElementById('chat-history');
        const userMessage = input.value.trim();
        if (userMessage === '') return;

        // Zeige Nachricht des Nutzers an
        history.innerHTML += `<div class="message user-message"><strong>Sie:</strong> ${userMessage}</div>`;
        input.value = '';

        // "Denk-Animation"
        const thinkingMessage = document.createElement('div');
        thinkingMessage.className = 'message prai-message';
        thinkingMessage.innerHTML = '<strong>PRAI:</strong><span>.</span><span>.</span><span>.</span>';
        history.appendChild(thinkingMessage);
        history.scrollTop = history.scrollHeight;

        // Generiere eine "echte" Antwort basierend auf Keywords
        setTimeout(() => {
            let response = praiKnowledgeBase.default;
            if (userMessage.toLowerCase().includes('physik')) {
                response = praiKnowledgeBase.physik;
            } else if (userMessage.toLowerCase().includes('grammatik')) {
                response = praiKnowledgeBase.grammatik;
            }
            thinkingMessage.innerHTML = `<strong>PRAI:</strong> ${response}`;
            history.scrollTop = history.scrollHeight;
        }, 1200);
    }
};
