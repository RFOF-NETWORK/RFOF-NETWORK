// Profil-App Orchestrator v2.0

// Globaler Namespace für Module, um Konflikte zu vermeiden
window.RFOF_MODULES = {};

document.addEventListener('DOMContentLoaded', () => {
    // Lade die Module parallel in ihre Ziel-Container
    loadModule('chat-interface/chat', 'chat-container-target');
    loadModule('sandbox-environment/sandbox', 'sandbox-container-target');
});

function loadModule(moduleName, targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    // Lade das spezifische CSS des Moduls
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `modules/${moduleName}.css`;
    document.head.appendChild(link);

    // Lade das spezifische JS des Moduls
    const script = document.createElement('script');
    script.src = `modules/${moduleName}.js`;
    script.onload = () => {
        // Jedes Modul registriert sich im globalen Namespace und hat eine 'init' Methode
        if (window.RFOF_MODULES[moduleName]) {
            window.RFOF_MODULES[moduleName].init(target);
        }
    };
    document.body.appendChild(script);
}
