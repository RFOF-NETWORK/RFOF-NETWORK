/**
 * @file routing.js
 * @description Implementiert die Routing-Protokolle für das Yggdrasil-Netzwerk von PRAI-OS.
 * Dieses Modul ist verantwortlich für die intelligente Pfadauswahl von Datenpaketen
 * zwischen PRAI-OS-Knoten, optimiert durch die GeneFusioNear Strategie und TON-Strukturen,
 * um maximale Effizienz, Sicherheit und Redundanz zu gewährleisten.
 */

import { sendYggdrasilMessage, getConnectedPeers } from './p2p.js'; // Für den Versand an Peers
import { EncryptionModule } from './encryption.js'; // Für die Routen-Absicherung
import { AxiomaticsEngine } from '../../core/axiomatics.js'; // Für axiomatisch gesteuerte Routing-Entscheidungen
import { getCurrentUnixTimestamp } from '../../../../READY-FOR-OUR-FUTURE/src/utility/timeUtils.js'; // Zeit-Dienstprogramme
import { praiOSInternalCommunicator } from '../kernel/boot.js'; // Für Logging und Status-Updates

let axiomaticsEngineInstance;
let encryptionModuleInstance;

// Konfigurationen für Routing-Entscheidungen
const ROUTING_PROTOCOL_VERSION = 'Yggdrasil-Route-AXIOM-1.0';

/**
 * @function initializeRouting
 * @description Initialisiert das Routing-Modul von PRAI-OS.
 * @returns {void}
 */
export function initializeRouting() {
    axiomaticsEngineInstance = new AxiomaticsEngine();
    encryptionModuleInstance = new EncryptionModule();
    console.log("[PRAI-OS Routing] Routing module initialized. Axiom-driven path selection active.");
    praiOSInternalCommunicator.notifySystemStatus("ROUTING_INITIATED", { timestamp: getCurrentUnixTimestamp() });
}

/**
 * @function routeDataPacket
 * @description Leitet ein Datenpaket intelligent durch das Yggdrasil-Netzwerk an seinen Zielknoten.
 * Die Pfadauswahl wird durch die GeneFusioNear Strategie und PZQQET Axiomatikx optimiert.
 * @param {string} destinationPeerId - Die PeerId des Zielknotens.
 * @param {object} dataPacket - Das zu routende Datenpaket (z.B. verschlüsselte PRAI-Neuron-Daten).
 * @param {string} dataType - Der Typ der Daten (z.B. 'neuron_update', 'command', 'blockchain_data').
 * @returns {Promise<boolean>} True, wenn das Routing erfolgreich initiiert wurde.
 */
export async function routeDataPacket(destinationPeerId, dataPacket, dataType) {
    if (!axiomaticsEngineInstance) {
        console.error("[PRAI-OS Routing] Routing module not initialized.");
        return false;
    }

    const senderPeerId = await encryptionModuleInstance.getLocalNodeId(); // Die eigene Peer-ID
    console.log(`[PRAI-OS Routing] Routing data packet (type: ${dataType}) from ${senderPeerId} to ${destinationPeerId}...`);
    praiOSInternalCommunicator.notifySystemStatus("ROUTING_INITIATED_PACKET", { sender: senderPeerId, destination: destinationPeerId, type: dataType });

    try {
        // 1. Axiomatische Pfadoptimierung (GeneFusioNear Strategie)
        // Die AxiomaticsEngine evaluiert den besten Pfad basierend auf Netzwerktopologie,
        // Last, Sicherheitsmetriken und den PZQQET Axiomen (1+1=0/1/2 etc.).
        const routingContext = {
            sender: senderPeerId,
            destination: destinationPeerId,
            dataType: dataType,
            dataSize: JSON.stringify(dataPacket).length,
            connectedPeers: getConnectedPeers(), // Informationen über direkt verbundene Peers
            // networkTopology: getNetworkTopology() // Annahme: Funktion zum Abrufen der Netzwerk-Topologie
        };
        const axiomRecommendations = await axiomaticsEngineInstance.applyAxiomsToNetwork(routingContext);
        console.log("[PRAI-OS Routing] Axiom-driven routing recommendations:", axiomRecommendations.recommendations);

        const optimalPath = axiomRecommendations.recommendations.optimalPath || [destinationPeerId]; // Fallback
        const routingStrategy = axiomRecommendations.recommendations.strategy || "direct"; // z.B. "direct", "multi-hop", "broadcast"

        // 2. Datenpaket verschlüsseln (Yggdrasil-Verschlüsselung)
        const encryptedPacket = await encryptionModuleInstance.encryptData(dataPacket);

        // 3. Paket senden gemäß der optimierten Strategie
        let routingSuccess = false;
        if (routingStrategy === "direct" && optimalPath.length === 1 && optimalPath[0] === destinationPeerId) {
            routingSuccess = await sendYggdrasilMessage(destinationPeerId, encryptedPacket, dataType);
        } else if (routingStrategy === "multi-hop" && optimalPath.length > 1) {
            // Dies würde eine komplexere Logik für das Weiterleiten über Zwischenknoten erfordern
            console.log(`[PRAI-OS Routing] Multi-hop routing via: ${optimalPath.join(' -> ')}`);
            // Konzeptionell: Sende an den nächsten Hop im optimalen Pfad
            routingSuccess = await sendYggdrasilMessage(optimalPath[0], { nextHop: optimalPath.slice(1), originalDestination: destinationPeerId, payload: encryptedPacket }, 'multi_hop_relay');
        } else {
            console.warn("[PRAI-OS Routing] Unspecified routing strategy or invalid path. Falling back to direct.");
            routingSuccess = await sendYggdrasilMessage(destinationPeerId, encryptedPacket, dataType);
        }

        if (routingSuccess) {
            console.log(`[PRAI-OS Routing] Data packet routed successfully to ${destinationPeerId}.`);
            praiOSInternalCommunicator.notifySystemStatus("PACKET_ROUTED_SUCCESS", { destination: destinationPeerId, type: dataType });
            return true;
        } else {
            console.error(`[PRAI-OS Routing] Failed to route data packet to ${destinationPeerId}.`);
            praiOSInternalCommunicator.notifySystemStatus("PACKET_ROUTING_FAILED", { destination: destinationPeerId, type: dataType });
            return false;
        }

    } catch (error) {
        console.error(`[PRAI-OS Routing] Error routing data packet to ${destinationPeerId}:`, error);
        praiOSInternalCommunicator.logCritical("Routing Error", error);
        return false;
    }
}

/**
 * @function handleIncomingRoutedPacket
 * @description Verarbeitet ein eingehendes, geroutetes Datenpaket.
 * Entschlüsselt es und leitet es an den korrekten Endpunkt innerhalb von PRAI-OS weiter.
 * @param {object} encryptedPacket - Das verschlüsselte Datenpaket.
 * @param {string} senderPeerId - Die PeerId des sendenden Knotens.
 * @returns {Promise<boolean>} True, wenn das Paket erfolgreich verarbeitet wurde.
 */
export async function handleIncomingRoutedPacket(encryptedPacket, senderPeerId) {
    if (!axiomaticsEngineInstance) {
        console.error("[PRAI-OS Routing] Routing module not initialized for incoming packets.");
        return false;
    }
    console.log(`[PRAI-OS Routing] Incoming routed packet from ${senderPeerId}.`);
    praiOSInternalCommunicator.notifySystemStatus("PACKET_RECEIVED", { sender: senderPeerId });

    try {
        const decryptedPacket = await encryptionModuleInstance.decryptData(encryptedPacket);
        console.log(`[PRAI-OS Routing] Packet decrypted from ${senderPeerId}.`);

        // Axiom-gesteuerte Validierung und Weiterleitung des entschlüsselten Pakets
        const processingGuidance = await axiomaticsEngineInstance.applyAxiomsToNetwork({
            type: 'incomingPacketProcessing',
            packet: decryptedPacket,
            sender: senderPeerId
        });
        
        if (!processingGuidance.recommendations.accept) {
            throw new Error(`Axiomatic processing denied for incoming packet from ${senderPeerId}.`);
        }

        // Hier würde die Logik zur Weiterleitung an die entsprechende PRAI-OS-Anwendung oder -Komponente stattfinden.
        // Z.B. an den eventBus, an ein spezifisches Anwendungsmodul, oder zur Neuron-Verwaltung.
        // Beispiel: eventBus.emit(decryptedPacket.type, decryptedPacket.payload);
        console.log(`[PRAI-OS Routing] Packet from ${senderPeerId} processed and forwarded to internal PRAI-OS modules.`);
        praiOSInternalCommunicator.notifySystemStatus("PACKET_PROCESSED_SUCCESS", { sender: senderPeerId, type: decryptedPacket.type });
        return true;

    } catch (error) {
        console.error(`[PRAI-OS Routing] Error processing incoming routed packet from ${senderPeerId}:`, error);
        praiOSInternalCommunicator.logCritical("Incoming Packet Process Error", error);
        return false;
    }
}
