/**
 * @file auditLogging.js
 * @description Implements comprehensive, tamper-proof audit logging for all critical
 * operations and security-related events within the RFOF-NETWORK. This module ensures
 * accountability, traceability, and facilitates forensic analysis, with logs
 * potentially being hashed and anchored on the blockchain or stored in decentralized storage (IPFS).
 */

import { ethers } from 'ethers'; // For potential blockchain anchoring
import { storeData } from '../data/dataStorage.js'; // To store logs on IPFS
import { hashData } from '../../utils/dataUtils.js'; // For hashing log entries
import { getBlockchainProvider, getAuditLogContract } from '../../config/networkConfig.js'; // For on-chain log anchoring
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { AxiomEngine } from '../core/axiomEngine.js'; // For axiom-driven log filtering/priority

let auditLogContract;
let axiomEngine;
const LOG_BATCH_INTERVAL_MS = 5 * 60 * 1000; // Batch logs every 5 minutes
const logBuffer = [];
let batchingIntervalId;

// Define critical log levels
export const AUDIT_LOG_LEVELS = {
    CRITICAL: 'CRITICAL', // Immediate attention required (e.g., security breach attempt)
    SECURITY: 'SECURITY', // Important security event (e.g., access denied, key rotation)
    GOVERNANCE: 'GOVERNANCE', // Governance action (e.g., proposal created, vote cast, proposal executed)
    CONSENSUS: 'CONSENSUS', // Consensus-related event (e.g., block proposed, validation failure)
    DATA_INTEGRITY: 'DATA_INTEGRITY', // Data validation/storage issues
    SYSTEM: 'SYSTEM', // Core system operations (e.g., module initialization, shutdown)
    INFO: 'INFO' // General informational events
};

/**
 * @function initializeAuditLogging
 * @description Initializes the audit logging module, setting up blockchain interaction
 * and AxiomEngine for intelligent log handling.
 */
export function initializeAuditLogging() {
    try {
        const provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for audit logging anchoring.');
        }
        auditLogContract = getAuditLogContract(provider); // Assuming a simple contract for anchoring hashes
        if (!auditLogContract) {
            console.warn('AuditLog contract not found. On-chain log anchoring will be unavailable.');
        }

        axiomEngine = new AxiomEngine();
        console.log('Audit Logging: Initialized. Starting batching interval...');

        // Start batching and anchoring logs periodically
        batchingIntervalId = setInterval(processLogBuffer, LOG_BATCH_INTERVAL_MS);

        aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOGGING_INIT_SUCCESS', {
            batchInterval: `${LOG_BATCH_INTERVAL_MS / 1000}s`,
            onChainAnchoring: !!auditLogContract
        });
    } catch (error) {
        console.error('Audit Logging Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOGGING_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @function shutdownAuditLogging
 * @description Stops the audit logging batching process.
 */
export function shutdownAuditLogging() {
    if (batchingIntervalId) {
        clearInterval(batchingIntervalId);
        console.log('Audit Logging: Batching interval stopped. Processing remaining logs...');
        processLogBuffer(true); // Process remaining logs immediately
        aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOGGING_SHUTDOWN', {});
    }
}

/**
 * @function recordAuditLog
 * @description Records a new audit log entry. Logs are timestamped and include
 * source information. High-priority logs might be processed immediately.
 * @param {string} level - The log level (e.g., AUDIT_LOG_LEVELS.CRITICAL).
 * @param {string} eventType - A specific type for the event (e.g., 'NODE_CRASH', 'BALANCE_UPDATE').
 * @param {string} source - The module or component emitting the log (e.g., 'ConsensusModule', 'AccessControl').
 * @param {object} details - A JSON-serializable object containing relevant event details.
 */
export async function recordAuditLog(level, eventType, source, details) {
    if (!Object.values(AUDIT_LOG_LEVELS).includes(level)) {
        console.warn(`Audit Logging: Invalid log level '${level}' for event '${eventType}'. Defaulting to INFO.`);
        level = AUDIT_LOG_LEVELS.INFO;
    }

    const logEntry = {
        timestamp: Date.now(),
        level: level,
        eventType: eventType,
        source: source,
        details: details,
        nodeId: aiNetworkOrchestrator.getLocalNodeId() // Include the ID of the node generating the log
    };

    console.log(`Audit Log (${level}): [${source}] ${eventType} - ${JSON.stringify(details).substring(0, 100)}...`);

    // AxiomEngine can filter or prioritize logs for immediate processing/notification
    const axiomContext = { logEntry };
    const axiomDecision = await axiomEngine.applyAxiomsToSecurity(axiomContext);
    const shouldProcessImmediately = axiomDecision.recommendations.processLogImmediately || false;

    if (shouldProcessImmediately || level === AUDIT_LOG_LEVELS.CRITICAL) {
        console.warn(`Audit Logging: Immediate processing for critical/high-priority log: ${eventType}`);
        await processLogEntry(logEntry, true); // Process immediately, force-anchor if critical
    } else {
        logBuffer.push(logEntry);
    }
}

/**
 * @private
 * @function processLogBuffer
 * @description Processes all accumulated log entries in the buffer, stores them
 * on IPFS, and optionally anchors their hash on the blockchain.
 * @param {boolean} [forceImmediate=false] - If true, processes even if not at interval.
 */
async function processLogBuffer(forceImmediate = false) {
    if (logBuffer.length === 0 && !forceImmediate) {
        return;
    }

    const logsToProcess = [...logBuffer];
    logBuffer.length = 0; // Clear the buffer

    if (logsToProcess.length === 0 && forceImmediate) {
        console.log('Audit Logging: No pending logs to process.');
        return;
    }

    console.log(`Audit Logging: Processing ${logsToProcess.length} log entries...`);

    try {
        const logsJson = JSON.stringify(logsToProcess, null, 2);
        const logsBuffer = Buffer.from(logsJson, 'utf8');
        const logsHash = hashData(logsBuffer);

        // 1. Store logs on decentralized storage (IPFS)
        const ipfsCid = await storeData(logsBuffer, { type: 'audit-logs', count: logsToProcess.length, hash: logsHash });

        if (ipfsCid) {
            console.log(`Audit Logging: ${logsToProcess.length} logs stored on IPFS. CID: ${ipfsCid}`);
            aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOGS_STORED_IPFS', {
                count: logsToProcess.length,
                cid: ipfsCid,
                logsHash
            });

            // 2. Anchor the hash/CID on the blockchain for tamper-proofing
            if (auditLogContract) {
                try {
                    const signer = aiNetworkOrchestrator.getNetworkSigner();
                    if (!signer) {
                        console.warn('Audit Logging: No signer available for on-chain anchoring. Logs are on IPFS, but not anchored.');
                        aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOG_ANCHOR_FAILURE', { reason: 'No signer', cid: ipfsCid });
                        return;
                    }
                    const tx = await auditLogContract.connect(signer).recordLogHash(logsHash, ipfsCid);
                    const receipt = await tx.wait();
                    if (receipt.status === 1) {
                        console.log(`Audit Logging: Log batch hash anchored on-chain. Tx Hash: ${receipt.transactionHash}`);
                        aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOG_ANCHORED_ON_CHAIN', {
                            logsHash,
                            cid: ipfsCid,
                            transactionHash: receipt.transactionHash
                        });
                    } else {
                        console.error(`Audit Logging: Failed to anchor log hash on-chain. Tx Hash: ${receipt.transactionHash}`);
                        aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOG_ANCHOR_TX_FAILURE', {
                            logsHash,
                            cid: ipfsCid,
                            transactionHash: receipt.transactionHash,
                            reason: 'Transaction status failed'
                        });
                    }
                } catch (anchorError) {
                    console.error('Audit Logging: Error anchoring log hash on-chain:', anchorError);
                    aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOG_ANCHOR_EXCEPTION', {
                        logsHash,
                        cid: ipfsCid,
                        error: anchorError.message
                    });
                }
            } else {
                console.warn('Audit Logging: AuditLog contract not initialized. Logs are not being anchored on-chain.');
            }
        } else {
            console.error('Audit Logging: Failed to store log batch on IPFS.');
            aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOG_BATCH_STORE_FAILURE', { reason: 'IPFS storage failed', logsHash });
        }
    } catch (error) {
        console.error('Audit Logging: Error processing log buffer:', error);
        aiNetworkOrchestrator.notifyPRAIOS('AUDIT_LOG_BUFFER_PROCESS_EXCEPTION', { error: error.message });
    }
}

/**
 * @private
 * @function processLogEntry
 * @description Processes a single log entry, primarily for critical logs that need immediate attention.
 * @param {object} logEntry - The single log entry to process.
 * @param {boolean} [forceAnchor=false] - Whether to try and anchor this single log's hash immediately.
 */
async function processLogEntry(logEntry, forceAnchor = false) {
    try {
        const logJson = JSON.stringify(logEntry, null, 2);
        const logBufferSingle = Buffer.from(logJson, 'utf8');
        const logHash = hashData(logBufferSingle);

        const ipfsCid = await storeData(logBufferSingle, { type: 'audit-log-single', eventType: logEntry.eventType, level: logEntry.level, hash: logHash });

        if (ipfsCid) {
            console.log(`Audit Logging: Single critical log (${logEntry.eventType}) stored on IPFS. CID: ${ipfsCid}`);
            aiNetworkOrchestrator.notifyPRAIOS('CRITICAL_AUDIT_LOG_STORED', {
                logHash,
                cid: ipfsCid,
                eventType: logEntry.eventType,
                level: logEntry.level
            });

            if (forceAnchor && auditLogContract) {
                try {
                    const signer = aiNetworkOrchestrator.getNetworkSigner();
                    if (!signer) {
                        console.warn('Audit Logging: No signer for immediate single log anchoring.');
                        return;
                    }
                    const tx = await auditLogContract.connect(signer).recordLogHash(logHash, ipfsCid);
                    const receipt = await tx.wait();
                    if (receipt.status === 1) {
                        console.log(`Audit Logging: Critical log hash anchored on-chain. Tx Hash: ${receipt.transactionHash}`);
                        aiNetworkOrchestrator.notifyPRAIOS('CRITICAL_AUDIT_LOG_ANCHORED', {
                            logHash,
                            cid: ipfsCid,
                            transactionHash: receipt.transactionHash,
                            eventType: logEntry.eventType
                        });
                    }
                } catch (anchorError) {
                    console.error('Audit Logging: Error anchoring critical log hash on-chain:', anchorError);
                    aiNetworkOrchestrator.notifyPRAIOS('CRITICAL_AUDIT_LOG_ANCHOR_EXCEPTION', {
                        logHash,
                        cid: ipfsCid,
                        error: anchorError.message
                    });
                }
            }
        } else {
            console.error(`Audit Logging: Failed to store single critical log (${logEntry.eventType}) on IPFS.`);
            aiNetworkOrchestrator.notifyPRAIOS('CRITICAL_AUDIT_LOG_STORE_FAILURE', { reason: 'IPFS storage failed', eventType: logEntry.eventType });
        }
    } catch (error) {
        console.error(`Audit Logging: Error processing single log entry (${logEntry.eventType}):`, error);
        aiNetworkOrchestrator.notifyPRAIOS('SINGLE_AUDIT_LOG_PROCESS_EXCEPTION', {
            eventType: logEntry.eventType,
            error: error.message
        });
    }
}
