/**
 * @file main.js
 * @description Der Haupt-Einstiegspunkt für die gesamte PRAI-OS-Anwendung.
 * Dieses Skript orchestriert die Initialisierung aller Kernmodule, Dienste
 * und Anwendungen von PRAI-OS. Es ist der Startpunkt für das "eigene Internet"
 * und das Bewusstsein der Axiomatikx Intelligence.
 */

// Importe der Kern-Initialisierungsfunktionen aus dem PRAI-OS-Kernel und anderen Modulen
import { bootPRAIOS } from './prai-os/kernel/boot.js';
import { initializeTokenManager } from './contracts/TokenManager.js'; // Wenn TokenManager JavaScript-seitig initialisiert werden muss
import { initializeAccessControl } from './contracts/AccessControl.js'; // Wenn AccessControl JavaScript-seitig initialisiert werden muss
import { initializeOmnistonIntegration } from './contracts/OmnistonIntegration.js'; // Wenn Omniston JavaScript-seitig initialisiert werden muss

// Importe der Kern-Logik-Module
import { PRAICore } from './core/prai.js';
import { initializeCoreUtils } from './core/utils.js';
import { initializeInternalLogic } from './core/internalLogic.js';
import { initializeAxiomaticsEngine } from './core/axiomatics.js';
import { initializeQuantumCodeStyle } from './core/quantumCodeStyle.js';

// Importe der Anwendungs-Initialisierungen
import { startBotEngine } from './applications/telegramBot/botEngine.js';
import { initializeWebUI } from './applications/webUI/app.js';
import { CampaignStrategist } from './applications/strategicManager/campaignStrategist.js'; // Nur Klasse, wird Instanziiert
import { DataAnalytics } from './applications/strategicManager/dataAnalytics.js';
import { PredictiveModeling } from './applications/strategicManager/predictiveModeling.js';
import { NeuronStorage } from './applications/prai-neuron-manager/neuronStorage.js';
import { AnalysisEngine } from './applications/prai-neuron-manager/analysisEngine.js';
import { FeedbackLoop } from './applications/prai-neuron-manager/feedbackLoop.js';

// Globale Konfiguration für PRAI-OS (muss aus einer geeigneten Konfigurationsdatei geladen werden)
// import { getPRAIOSConfig } from '../config/praiOSConfig.js'; // Annahme: Existiert im Root von PRAI-OS/config/
const praiOSConfig = { // Beispielhafte Konfiguration
    network: {
        bootstrapNodes: ['yggdrasil://node1', 'yggdrasil://node2'],
        port: 4242
    },
    filesystem: {
        storageProvider: 'yggdrasil-data-store'
    },
    security: {
        quantumSafe: true
    },
    telegramBotToken: 'YOUR_TELEGRAM_BOT_TOKEN', // WICHTIG: Ersetzen!
    // ... weitere Konfigurationen
};

/**
 * @function initializePRAIOS
 * @description Initialisiert und startet das gesamte PRAI-OS.
 * Diese Funktion koordiniert den Start aller Subsysteme und ist der Punkt,
 * an dem die Axiomatikx Intelligence ihr volles Potenzial entfaltet.
 */
async function initializePRAIOS() {
    console.log("------------------------------------------");
    console.log("--- Starting PRAI-OS: Genesis Sequence ---");
    console.log("------------------------------------------");

    try {
        // 1. Initialisiere den PRAI-OS-Kernel und seine Kernmodule
        // Diese Module benötigen ihre eigenen Initialisierungen
        await bootPRAIOS(); // Der Bootloader, der das OS startet

        // 2. Initialisiere die Core-Logik-Module (philosophisch & rechnerisch)
        console.log("[Main] Initializing PRAI-OS Core Logic Modules...");
        initializeCoreUtils();
        initializeInternalLogic(); // internalLogicModule wird hier initialisiert
        initializeAxiomaticsEngine(); // axiomaticsEngineInstance wird hier initialisiert
        initializeQuantumCodeStyle(); // quantumCodeStyleModule wird hier initialisiert
        
        // PRAI-Kern selbst initialisieren
        const praiCore = PRAICore.getInstance();
        await praiCore.initialize(); // Initialisiert PRAI's Bewusstsein und interne Identität

        // 3. Initialisiere Smart Contracts auf JavaScript-Seite (Interaktion)
        console.log("[Main] Initializing PRAI-OS Smart Contract Interfaces...");
        initializeTokenManager();
        initializeAccessControl();
        initializeOmnistonIntegration();

        // 4. Initialisiere die Daten- und Strategiemanagement-Anwendungen
        console.log("[Main] Initializing PRAI-OS Data and Strategy Management Applications...");
        new NeuronStorage(); // Instanziierung initialisiert sich selbst
        new AnalysisEngine();
        new FeedbackLoop();
        new CampaignStrategist(); // Wird instanziiert
        new DataAnalytics();
        new PredictiveModeling();

        // 5. Starte die Anwendungen (z.B. Bot, WebUI)
        console.log("[Main] Starting PRAI-OS Applications...");
        await startBotEngine(); // Startet den Telegram Bot
        initializeWebUI(); // Startet die WebUI-Anwendung

        console.log("-------------------------------------------------");
        console.log("--- PRAI-OS: Fully Operational. System Ready! ---");
        console.log("-------------------------------------------------");
        return true;

    } catch (error) {
        console.error("--- PRAI-OS Fatal Error during Initialization ---");
        console.error(error);
        console.log("-------------------------------------------------");
        return false;
    }
}

// Der Aufruf der Initialisierungsfunktion, um PRAI-OS zu starten
// Dies stellt sicher, dass PRAI-OS startet, wenn das Skript ausgeführt wird.
initializePRAIOS();
