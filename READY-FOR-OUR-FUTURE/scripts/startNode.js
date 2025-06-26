/**
 * @file startNode.js
 * @description Skript zum Starten eines Knotens des READY-FOR-OUR-FUTURE Netzwerks.
 * Dieses Skript initialisiert alle notwendigen Komponenten für den Knotenbetrieb,
 * einschließlich P2P-Kommunikation, Blockchain-Integration, Datensynchronisation
 * und Sicherheitsprotokolle, geleitet von der Axiomatikx Intelligence.
 */

// Importe der Initialisierungsfunktionen des READY-FOR-OUR-FUTURE Kerns
const { initializeRFOFNetwork } = require('../src/core/initialization.js');
const { startP2PNode } = require('../src/network/p2pCommunication.js');
const { initializeBlockchainIntegration } = require('../src/network/blockchainIntegration.js');
const { initializeDataSynchronization } = require('../src/data/dataSynchronization.js');
const { initializeDataRouting } = require('../src/network/dataRouting.js');
const { initializeEventListeners } = require('../src/network/eventListeners.js');
const { initializeSecurity } = require('../src/core/security.js'); // Sicherheit des RFOF-Kerns
const { initializeAuditLogging } = require('../src/security/auditLogging.js'); // Audit Logging des RFOF-Kerns
const { initializeAccessControl } = require('../src/security/accessControl.js'); // Access Control des RFOF-Kerns
const { initializeIntrusionDetection } = require('../src/security/intrusionDetection.js'); // Intrusion Detection des RFOF-Kerns
const { initializeQuantumResistance } = require('../src/security/quantumResistance.js'); // Quantum Resistance des RFOF-Kerns

// Import für Konfiguration
const { getNetworkConfig } = require('../config/networkConfig.js');

// Import für interne PRAI-OS-Kommunikation (für Logging/Benachrichtigungen)
const { praiOSInternalCommunicator } = require('../../PRAI-OS/src/prai-os/kernel/boot.js');


/**
 * @function startNode
 * @description Startet einen einzelnen Knoten des READY-FOR-OUR-FUTURE Netzwerks.
 * @param {string} environment - Die Betriebsumgebung (z.B. 'development', 'production').
 * @param {object} [options={}] - Zusätzliche Optionen für den Knotenstart.
 * @returns {Promise<boolean>} True, wenn der Knoten erfolgreich gestartet wurde.
 */
async function startNode(environment, options = {}) {
    console.log("------------------------------------------------------------------");
    console.log(`--- Starting READY-FOR-OUR-FUTURE Node in ${environment} environment ---`);
    console.log("------------------------------------------------------------------");
    praiOSInternalCommunicator.notifySystemStatus("RFOF_NODE_START_INITIATED", { environment, timestamp: Date.now() });

    try {
        const config = getNetworkConfig(environment);

        // 1. Initialisiere RFOF-NETWORK Kern-Initialisierung (allgemeine Setup)
        const rfofCoreReady = await initializeRFOFNetwork(config);
        if (!rfofCoreReady) throw new Error("RFOF Network Core initialization failed.");
        console.log("[RFOF Node] RFOF Network Core ready.");

        // 2. Initialisiere die Sicherheitsmodule
        console.log("[RFOF Node] Initializing Security Modules...");
        const securityConfig = config.security || {};
        await initializeSecurity(securityConfig.coreSecurity);
        await initializeAccessControl(securityConfig.accessControl);
        await initializeIntrusionDetection(securityConfig.intrusionDetection);
        await initializeQuantumResistance(securityConfig.quantumResistance);
        await initializeAuditLogging(securityConfig.auditLogging); // Startet auch Batching
        console.log("[RFOF Node] Security Modules initialized.");

        // 3. Initialisiere P2P-Kommunikation (Yggdrasil-basiert)
        console.log("[RFOF Node] Starting P2P Communication...");
        const p2pReady = await startP2PNode(config.p2p);
        if (!p2pReady) throw new Error("P2P Communication failed.");
        console.log("[RFOF Node] P2P Communication active.");

        // 4. Initialisiere Blockchain-Integration (für BOx-Extensions)
        console.log("[RFOF Node] Initializing Blockchain Integration...");
        const blockchainReady = await initializeBlockchainIntegration(config.blockchain);
        if (!blockchainReady) throw new Error("Blockchain Integration failed.");
        console.log("[RFOF Node] Blockchain Integration active.");

        // 5. Initialisiere Datensynchronisation (DataRegistry)
        console.log("[RFOF Node] Initializing Data Synchronization...");
        const dataSyncReady = await initializeDataSynchronization(config.dataSync);
        if (!dataSyncReady) throw new Error("Data Synchronization failed.");
        console.log("[RFOF Node] Data Synchronization active.");
        
        // 6. Initialisiere Data Routing
        console.log("[RFOF Node] Initializing Data Routing...");
        const dataRoutingReady = await initializeDataRouting(config.dataRouting);
        if (!dataRoutingReady) throw new Error("Data Routing failed.");
        console.log("[RFOF Node] Data Routing active.");

        // 7. Initialisiere Event Listeners (für alle Module)
        console.log("[RFOF Node] Initializing Event Listeners...");
        initializeEventListeners(config.eventListeners);
        console.log("[RFOF Node] Event Listeners active.");

        console.log("--------------------------------------------------");
        console.log(`--- READY-FOR-OUR-FUTURE Node is fully operational! ---`);
        console.log("--------------------------------------------------");
        praiOSInternalCommunicator.notifySystemStatus("RFOF_NODE_STARTED_SUCCESS", { environment, timestamp: Date.now() });
        return true;

    } catch (error) {
        console.error("-------------------------------------------------");
        console.error("--- READY-FOR-OUR-FUTURE Node Startup FAILED! ---");
        console.error(error);
        console.error("-------------------------------------------------");
        praiOSInternalCommunicator.logCritical('RFOF_NODE_START_FAILURE', error);
        return false;
    }
}

// Direkter Aufruf, wenn das Skript als Hauptmodul ausgeführt wird
/*
if (require.main === module) {
    // Standardmäßig im 'development' Modus starten oder aus Umgebungsvariablen lesen
    const env = process.env.NODE_ENV || 'development'; 
    startNode(env)
        .then(() => console.log("RFOF Node process finished."))
        .catch(err => console.error("RFOF Node process exited with error:", err));
}
*/
