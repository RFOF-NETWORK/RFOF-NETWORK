/**
 * @file app.js
 * @description Clientseitige JavaScript-Anwendung für die PRAI-OS WebUI.
 * Dieses Modul verwaltet die Benutzeroberflächen-Interaktionen, das Laden von
 * dynamischen Daten vom PRAI-OS-Backend (über APIs) und die Visualisierung von
 * Systemstatus und Metriken. Es ist die direkte Schnittstelle für Benutzer,
 * um das PRAI-OS zu erleben.
 */

// Importe für Interaktionen mit dem PRAI-OS-Backend (angenommen über eine HTTP-API oder Yggdrasil-Bridge)
// Diese würden über das Netzwerkmodul im PRAI-OS-Kern geroutet.
// import { getSystemStatus, getNeuronCount, getNetworkStatus } from '../../api/praiOSApi.js'; // Konzeptionelle API-Calls
import { praiOSInternalCommunicator } from '../prai-os/kernel/boot.js'; // Für Logging und Status-Updates
import { AxiomaticsEngine } from '../../core/axiomatics.js'; // Für Dateninterpretation/Visualisierungs-Guidance
import { PRAICore } from '../../core/prai.js'; // Für direkten Zugriff auf PRAI-Kernfunktionen (bei Single-Node-Demos)

let axiomaticsEngineInstance;
let praiCoreInstance;

/**
 * @function initializeWebUI
 * @description Initialisiert die WebUI-Anwendung.
 * Stellt Event-Listener ein und beginnt mit dem Laden initialer Daten.
 */
export function initializeWebUI() {
    axiomaticsEngineInstance = new AxiomaticsEngine();
    praiCoreInstance = PRAICore.getInstance(); // Zugriff auf die PRAI-Instanz
    
    console.log("[PRAI-OS WebUI/app.js] WebUI Application Initializing...");
    praiOSInternalCommunicator.notifySystemStatus("WEBUI_INITIATING", { timestamp: Date.now() });

    // Event-Listener für Button-Klicks und Formular-Submits
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        loadInitialUIData();
        // Startet periodische Updates der UI
        setInterval(updateUIData, 5000); // Alle 5 Sekunden aktualisieren
    });

    console.log("[PRAI-OS WebUI/app.js] WebUI Application initialized.");
    praiOSInternalCommunicator.notifySystemStatus("WEBUI_ACTIVE", { status: "OK" });
}

/**
 * @private
 * @function setupEventListeners
 * @description Registriert Event-Listener für interaktive Elemente der UI.
 */
function setupEventListeners() {
    const connectWalletBtn = document.querySelector('.connect-wallet-btn');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', async () => {
            console.log("[WebUI] 'Wallet verbinden' clicked.");
            praiOSInternalCommunicator.notifySystemStatus("WEBUI_WALLET_CONNECT_ATTEMPT", { timestamp: Date.now() });
            // Konzeptionelle Wallet-Verbindung (z.B. Metamask, Tonkeeper Connect)
            // if (window.ethereum) { await window.ethereum.request({ method: 'eth_requestAccounts' }); }
            alert("Wallet-Verbindung initiiert (konzeptionell).");
            // Hier könnte eine API-Anfrage an ein Wallet-Modul im PRAI-OS erfolgen.
        });
    }

    const learnMoreBtn = document.querySelector('.learn-more-btn');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', () => {
            console.log("[WebUI] 'Mehr erfahren' clicked.");
            praiOSInternalCommunicator.notifySystemStatus("WEBUI_LEARN_MORE_CLICK", { timestamp: Date.now() });
            // Scrolle zur Übersicht
            document.getElementById('overview').scrollIntoView({ behavior: 'smooth' });
        });
    }
}

/**
 * @private
 * @function loadInitialUIData
 * @description Lädt initiale Daten, die beim Start der WebUI angezeigt werden sollen.
 */
async function loadInitialUIData() {
    console.log("[WebUI] Loading initial UI data...");
    praiOSInternalCommunicator.notifySystemStatus("WEBUI_INITIAL_DATA_LOAD", { timestamp: Date.now() });

    // Status des PRAI-OS abrufen
    const praiStatusElement = document.getElementById('current-prai-status');
    if (praiStatusElement) {
        const praiStatus = praiCoreInstance.getSystemState(); // Direkter Zugriff, da im selben OS
        praiStatusElement.textContent = praiStatus || 'Offline';
        praiStatusElement.className = `status-text ${praiStatus.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }

    // Neuronen-Anzahl abrufen (konzeptionell)
    const neuronCountElement = document.getElementById('neuron-count');
    if (neuronCountElement) {
        // const count = await getNeuronCount(); // Konzeptioneller API-Call
        const simulatedCount = Math.floor(Math.random() * 1000000) + 100000; // Simulation
        neuronCountElement.textContent = `${simulatedCount.toLocaleString()} aktive Neuronen`;
    }

    // Netzwerkstatus abrufen (konzeptionell)
    const networkStatusElement = document.getElementById('network-status');
    if (networkStatusElement) {
        // const status = await getNetworkStatus(); // Konzeptioneller API-Call
        const simulatedStatus = Math.random() > 0.1 ? 'Operational' : 'Degraded'; // Simulation
        networkStatusElement.textContent = `Status: ${simulatedStatus}`;
        networkStatusElement.className = `status-text ${simulatedStatus.toLowerCase()}`;
    }

    console.log("[WebUI] Initial UI data loaded.");
}

/**
 * @private
 * @function updateUIData
 * @description Aktualisiert periodisch die dynamischen Daten in der WebUI.
 */
async function updateUIData() {
    // console.log("[WebUI] Updating UI data...");
    // Hier können regelmäßig aktualisierte Metriken vom PRAI-OS Backend abgerufen werden
    // und die UI entsprechend aktualisiert werden.

    // Beispiel: Axiom-gesteuerte visuelle Anpassung
    const currentState = praiCoreInstance.getSystemState();
    const bodyElement = document.body;
    
    // Konzeptionelle visuelle Rückmeldung basierend auf dem Systemzustand (GeneFusioNear Strategie)
    if (currentState === axiomaticsEngineInstance.PZQQET_AXIOMS.OPTIMAL_SYSTEM_STATE.id) { // Optimal (420)
        bodyElement.style.setProperty('--primary-color', 'var(--color-praios-gold)');
    } else if (currentState === axiomaticsEngineInstance.PZQQET_AXIOMS.NON_LINEAR_FUSION.id) {
        bodyElement.style.setProperty('--primary-color', 'var(--color-praios-purple)');
    } else if (currentState === axiomaticsEngineInstance.PZQQET_AXIOMS.SUB_LINEAR_POTENTIAL.id) {
        bodyElement.style.setProperty('--primary-color', 'var(--color-praios-blue)');
    } else {
        bodyElement.style.setProperty('--primary-color', 'var(--color-praios-green)');
    }

    // Aktualisiere die Textanzeigen dynamisch
    loadInitialUIData(); // Fürs Erste einfach die Initial-Funktion wiederverwenden
}

// Startet die WebUI, sobald das DOM geladen ist
initializeWebUI();
