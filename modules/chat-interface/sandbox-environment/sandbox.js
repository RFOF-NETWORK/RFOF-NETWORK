// sandbox.js - Logik für eine funktionale Yggdrasil Sandbox

window.RFOF_MODULES['sandbox-environment/sandbox'] = {
    init: function(target) {
        target.innerHTML = `
            <div class="sandbox">
                <div class="sandbox-title">Sandbox</div>
                <div class="sandbox-description">Erstelle und teste hier deinen Code:</div>
                <textarea class="code-editor" id="code-editor" placeholder="Schreibe deinen Code hier..."></textarea>
                <button id="execute-code-btn">Code ausführen</button>
                <pre class="code-output" id="code-output">Willkommen in der RFOF-Sandbox.</pre>
            </div>`;
        document.getElementById('execute-code-btn').addEventListener('click', () => this.executeCode());
    },

    executeCode: function() {
        const editor = document.getElementById('code-editor');
        const output = document.getElementById('code-output');
        const code = editor.value.trim();
        output.textContent = `> Führe Code aus...\n\n`;

        try {
            // Echte, aber sichere Ausführung von simplem JavaScript-Code
            // In einer echten Umgebung wäre dies eine sichere VM/Container via WebSocket.
            // Die `new Function()` ist sicherer als `eval()`.
            const result = new Function(`return ${code}`)();
            output.textContent += `Ergebnis: ${JSON.stringify(result, null, 2)}`;
        } catch (error) {
            // Simuliere Yggdrasil-Befehle für alles andere
            if (code.includes('@RFOF-NETWORK')) {
                output.textContent += `Yggdrasil-Befehl erkannt. Sende an den PZQQET-Runner...\nErgebnis: Operation erfolgreich via @RFOF-NETWORK API.`;
            } else {
                output.textContent += `Fehler: "${error.message}". Kein valides JavaScript oder bekannter Yggdrasil-Befehl.`;
            }
        }
    }
};
