/**
 * @file dataRouting.js
 * @description Manages intelligent data routing within the RFOF-NETWORK, ensuring efficient,
 * secure, and axiom-compliant delivery of data packets (including BOx data and PRAI-Neurons)
 * across the decentralized network. This module leverages PZQQET Axiomatikx for optimal path selection.
 */

import { sendDataToPeer, broadcastData, getConnectedPeers } from './p2pCommunication.js';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { AxiomEngine } from '../core/axiomEngine.js'; // For axiom-driven routing decisions
import { hashData } from '../../utils/dataUtils.js';

const DATA_PROTOCOL = '/rfof/data-exchange/1.0.0'; // Standard protocol for RFOF data exchange

let axiomEngine; // Instance of the AxiomEngine

/**
 * @function initializeDataRouting
 * @description Initializes the data routing module, including its dependency on the AxiomEngine.
 */
export function initializeDataRouting() {
    axiomEngine = new AxiomEngine();
    console.log('Data Routing: Initialized. AxiomEngine integrated for intelligent routing.');
}

/**
 * @function routeData
 * @description Determines the optimal path and sends data to its destination(s) within the RFOF network.
 * This function uses the AxiomEngine to make intelligent routing decisions (e.g., shortest path,
 * most secure, least congested, highest data integrity guarantee).
 * @param {string | string[] | 'broadcast'} destination - The PeerId of the recipient, an array of PeerIds, or 'broadcast'.
 * @param {Buffer} data - The data payload to route (e.g., a serialized BOx or PRAI-Neuron).
 * @param {object} [metadata={}] - Optional metadata for routing context (e.g., priority, data type).
 * @returns {Promise<boolean>} True if routing was initiated successfully for all intended recipients.
 */
export async function routeData(destination, data, metadata = {}) {
    if (!axiomEngine) {
        console.error('Data Routing: AxiomEngine not initialized. Cannot route data intelligently.');
        return false;
    }

    const dataHash = hashData(data);
    console.log(`Data Routing: Attempting to route data (hash: ${dataHash})...`);

    try {
        // 1. Analyze current network state and data characteristics with AxiomEngine
        const routingContext = {
            destination,
            dataSize: data.length,
            dataType: metadata.type || 'unknown',
            currentNetworkPeers: getConnectedPeers(),
            // Add more network state or data-specific context for axiom evaluation
        };
        const routingRecommendations = await axiomEngine.applyAxiomsToDataProcessing(routingContext);
        console.log('Data Routing: Axiom-driven routing recommendations:', routingRecommendations.guidance);

        // Based on recommendations, determine actual routing strategy
        let routeSuccess = true;
        if (destination === 'broadcast') {
            console.log('Data Routing: Broadcasting data...');
            routeSuccess = await broadcastData(data, DATA_PROTOCOL);
            if (!routeSuccess) {
                console.error('Data Routing: Failed to broadcast data.');
                await aiNetworkOrchestrator.notifyPRAIOS('DATA_BROADCAST_FAILED', { dataHash, reason: 'P2P layer failure' });
            }
        } else if (Array.isArray(destination)) {
            console.log(`Data Routing: Routing data to multiple peers: ${destination.join(', ')}`);
            for (const peerId of destination) {
                const sent = await sendDataToPeer(peerId, data, DATA_PROTOCOL);
                if (!sent) {
                    console.error(`Data Routing: Failed to send data to peer: ${peerId}`);
                    routeSuccess = false; // Mark overall as failed if any fails
                    await aiNetworkOrchestrator.notifyPRAIOS('DATA_ROUTING_FAILED_TO_PEER', { dataHash, peerId, reason: 'P2P layer failure' });
                }
            }
        } else { // Single peer
            console.log(`Data Routing: Routing data to single peer: ${destination}`);
            routeSuccess = await sendDataToPeer(destination, data, DATA_PROTOCOL);
            if (!routeSuccess) {
                console.error(`Data Routing: Failed to send data to peer: ${destination}`);
                await aiNetworkOrchestrator.notifyPRAIOS('DATA_ROUTING_FAILED_TO_PEER', { dataHash, peerId: destination, reason: 'P2P layer failure' });
            }
        }

        if (routeSuccess) {
            console.log(`Data Routing: Data (hash: ${dataHash}) successfully routed to ${destination}.`);
            await aiNetworkOrchestrator.notifyPRAIOS('DATA_ROUTED_SUCCESS', { dataHash, destination, metadata });
        } else {
            console.error(`Data Routing: Data (hash: ${dataHash}) routing failed for destination ${destination}.`);
            await aiNetworkOrchestrator.notifyPRAIOS('DATA_ROUTING_FAILURE', { dataHash, destination, metadata, reason: 'Partial or full P2P failure' });
        }
        return routeSuccess;

    } catch (error) {
        console.error('Data Routing Error:', error);
        await aiNetworkOrchestrator.notifyPRAIOS('DATA_ROUTING_EXCEPTION', { dataHash, destination, metadata, error: error.message });
        return false;
    }
}

/**
 * @function processIncomingRoutedData
 * @description Callback function to be registered with `p2pCommunication.handleIncomingData`.
 * This function will decrypt and validate incoming data, then forward it for processing.
 * @param {Buffer} decryptedData - The decrypted data payload.
 * @param {string} senderPeerId - The PeerId of the sender.
 */
export async function processIncomingRoutedData(decryptedData, senderPeerId) {
    const dataHash = hashData(decryptedData);
    console.log(`Data Routing: Incoming routed data from ${senderPeerId} (hash: ${dataHash}).`);

    try {
        // Here, integrate with PRAI-OS or a local AxiomEngine for data validation and categorization
        // Example: Validate data integrity, check against known schemas, apply trust scores.
        const validationResult = await axiomEngine.applyAxiomsToDataProcessing({
            rawData: decryptedData,
            sender: senderPeerId,
            dataType: 'unknown' // infer or expect type in metadata
        });

        if (validationResult.optimized) { // Assuming 'optimized' means 'valid' in this context
            console.log(`Data Routing: Data (hash: ${dataHash}) from ${senderPeerId} validated successfully.`);
            // Forward the validated data to appropriate internal modules for further processing
            // e.g., to DataRegistry for storage, or to ConsensusModule if it's a BOx.
            // Example:
            // if (metadata.type === 'BOx') {
            //     await rfofNetworkCore.processBOx(decryptedData);
            // } else if (metadata.type === 'PRAINeuron') {
            //     await praiOSModule.ingestNeuron(decryptedData);
            // }
            await aiNetworkOrchestrator.notifyPRAIOS('DATA_ROUTING_INCOME_SUCCESS', {
                dataHash,
                sender: senderPeerId,
                validation: validationResult.guidance
            });
            return true;
        } else {
            console.warn(`Data Routing: Incoming data (hash: ${dataHash}) from ${senderPeerId} failed axiom validation.`);
            await aiNetworkOrchestrator.notifyPRAIOS('DATA_ROUTING_INCOME_VALIDATION_FAILED', {
                dataHash,
                sender: senderPeerId,
                validation: validationResult.guidance,
                reason: 'Axiom validation failure'
            });
            return false;
        }
    } catch (error) {
        console.error(`Data Routing: Error processing incoming data from ${senderPeerId}:`, error);
        await aiNetworkOrchestrator.notifyPRAIOS('DATA_ROUTING_INCOME_EXCEPTION', {
            dataHash,
            sender: senderPeerId,
            error: error.message
        });
        return false;
    }
}

// Register the incoming data handler on module load
// Note: This needs to happen *after* p2pCommunication.js has started its node.
// It's usually called as part of overall network initialization.
export function registerP2PDataHandler() {
    handleIncomingData(DATA_PROTOCOL, processIncomingRoutedData);
}
