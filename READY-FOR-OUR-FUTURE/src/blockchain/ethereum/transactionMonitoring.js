/**
 * @file transactionMonitoring.js
 * @description Provides advanced capabilities for monitoring Ethereum transactions,
 * including tracking pending transactions, confirming their inclusion in blocks,
 * and handling confirmations. This module is essential for reliable blockchain
 * interactions and ensures that all on-chain operations are observed and processed,
 * integrating with PRAI-OS for enhanced visibility and alerts.
 */

import { ethers } from 'ethers';
import { getBlockchainProvider, getSigner } from '../../../config/networkConfig.js';
import { aiNetworkOrchestrator } from '../../core/aiIntegration.js';
import { AxiomEngine } from '../../core/axiomEngine.js'; // For axiom-driven anomaly detection in tx
import { getTimestamp } from '../../utility/timeUtils.js';

let provider;
let currentSigner;
let axiomEngine;

// Map to store pending transactions being monitored: { txHash: { resolve, reject, timeoutId, submittedAt, description } }
const pendingTransactions = new Map();
const TRANSACTION_CONFIRMATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout for confirmation
const TRANSACTION_MONITOR_INTERVAL_MS = 10 * 1000; // Check pending transactions every 10 seconds

let monitorIntervalId;

/**
 * @function initializeTransactionMonitoring
 * @description Initializes the transaction monitoring module, connecting to the
 * Ethereum provider and setting up periodic checks for pending transactions.
 */
export function initializeTransactionMonitoring() {
    try {
        provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for transaction monitoring.');
        }
        currentSigner = getSigner();
        axiomEngine = new AxiomEngine();

        // Start periodic monitoring for transactions
        monitorIntervalId = setInterval(checkPendingTransactions, TRANSACTION_MONITOR_INTERVAL_MS);

        console.log('Transaction Monitoring: Initialized. Starting periodic check for pending transactions.');
        aiNetworkOrchestrator.notifyPRAIOS('TX_MONITORING_INIT_SUCCESS', {
            checkInterval: `${TRANSACTION_MONITOR_INTERVAL_MS / 1000}s`,
        });
    } catch (error) {
        console.error('Transaction Monitoring Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('TX_MONITORING_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @function shutdownTransactionMonitoring
 * @description Stops the periodic transaction monitoring.
 */
export function shutdownTransactionMonitoring() {
    if (monitorIntervalId) {
        clearInterval(monitorIntervalId);
        console.log('Transaction Monitoring: Periodic monitoring stopped.');
        // Clean up any pending timeouts
        pendingTransactions.forEach(txInfo => {
            if (txInfo.timeoutId) {
                clearTimeout(txInfo.timeoutId);
            }
        });
        pendingTransactions.clear();
        aiNetworkOrchestrator.notifyPRAIOS('TX_MONITORING_SHUTDOWN', {});
    }
}

/**
 * @function monitorTransaction
 * @description Adds a transaction to the monitoring queue and returns a Promise
 * that resolves when the transaction is confirmed or rejects on failure/timeout.
 * @param {ethers.providers.TransactionResponse} txResponse - The transaction response object.
 * @param {string} description - A human-readable description of the transaction's purpose.
 * @returns {Promise<ethers.providers.TransactionReceipt>} A Promise that resolves with the transaction receipt.
 */
export function monitorTransaction(txResponse, description = 'Blockchain transaction') {
    if (!provider) {
        console.error('Transaction Monitoring: Provider not initialized. Cannot monitor transaction.');
        aiNetworkOrchestrator.notifyPRAIOS('TX_MONITOR_ERROR', { txHash: txResponse?.hash, reason: 'Provider not ready' });
        return Promise.reject(new Error('Provider not initialized.'));
    }

    const txHash = txResponse.hash;
    if (!txHash) {
        console.error('Transaction Monitoring: Transaction response missing hash. Cannot monitor.');
        aiNetworkOrchestrator.notifyPRAIOS('TX_MONITOR_ERROR', { reason: 'No hash in txResponse' });
        return Promise.reject(new Error('Transaction response missing hash.'));
    }

    console.log(`Transaction Monitoring: Monitoring new transaction: ${txHash} - ${description}`);
    aiNetworkOrchestrator.notifyPRAIOS('TX_MONITORING_STARTED', {
        txHash,
        description,
        from: txResponse.from,
        to: txResponse.to,
        value: txResponse.value?.toString() || '0'
    });

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            console.warn(`Transaction Monitoring: Transaction ${txHash} timed out after ${TRANSACTION_CONFIRMATION_TIMEOUT_MS / 1000} seconds.`);
            pendingTransactions.delete(txHash);
            aiNetworkOrchestrator.notifyPRAIOS('TX_CONFIRMATION_TIMEOUT', { txHash, description });
            reject(new Error(`Transaction ${txHash} timed out.`));
        }, TRANSACTION_CONFIRMATION_TIMEOUT_MS);

        pendingTransactions.set(txHash, {
            resolve,
            reject,
            timeoutId,
            submittedAt: getTimestamp(),
            txResponse,
            description
        });

        // Use Ethers.js built-in `wait` for initial confirmation, but keep custom timeout for robustness
        txResponse.wait()
            .then(receipt => {
                if (pendingTransactions.has(txHash)) {
                    clearTimeout(pendingTransactions.get(txHash).timeoutId);
                    pendingTransactions.delete(txHash);
                    console.log(`Transaction Monitoring: Transaction ${txHash} confirmed in block ${receipt.blockNumber}. Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
                    aiNetworkOrchestrator.notifyPRAIOS('TX_CONFIRMED', {
                        txHash,
                        description,
                        blockNumber: receipt.blockNumber,
                        status: receipt.status === 1 ? 'SUCCESS' : 'FAILED',
                        gasUsed: receipt.gasUsed.toString(),
                        effectiveGasPrice: receipt.effectiveGasPrice?.toString() || 'N/A'
                    });

                    // AxiomEngine check for suspicious transactions (e.g., high gas usage for simple tx)
                    performAxiomCheckOnConfirmedTx(receipt, description);

                    if (receipt.status === 1) {
                        resolve(receipt);
                    } else {
                        reject(new Error(`Transaction ${txHash} failed on-chain.`));
                    }
                }
            })
            .catch(error => {
                if (pendingTransactions.has(txHash)) {
                    clearTimeout(pendingTransactions.get(txHash).timeoutId);
                    pendingTransactions.delete(txHash);
                    console.error(`Transaction Monitoring: Error waiting for transaction ${txHash}:`, error);
                    aiNetworkOrchestrator.notifyPRAIOS('TX_CONFIRMATION_ERROR', { txHash, description, error: error.message });
                    reject(error);
                }
            });
    });
}

/**
 * @private
 * @function checkPendingTransactions
 * @description Periodically checks the status of all currently monitored pending transactions.
 * This acts as a fallback/secondary mechanism to `tx.wait()`.
 */
async function checkPendingTransactions() {
    if (pendingTransactions.size === 0) {
        return;
    }
    // console.log(`Transaction Monitoring: Checking ${pendingTransactions.size} pending transactions...`);

    for (const [txHash, txInfo] of pendingTransactions.entries()) {
        try {
            const receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) {
                // Transaction has been mined, process it
                clearTimeout(txInfo.timeoutId);
                pendingTransactions.delete(txHash);
                console.log(`Transaction Monitoring: Found confirmed transaction ${txHash} in periodic check (block ${receipt.blockNumber}).`);
                aiNetworkOrchestrator.notifyPRAIOS('TX_CONFIRMED_VIA_POLL', { txHash, description: txInfo.description, blockNumber: receipt.blockNumber });

                // AxiomEngine check
                performAxiomCheckOnConfirmedTx(receipt, txInfo.description);

                if (receipt.status === 1) {
                    txInfo.resolve(receipt);
                } else {
                    txInfo.reject(new Error(`Transaction ${txHash} failed on-chain (polled).`));
                }
            } else {
                // Still pending, check for staleness/stuck status
                const ageSeconds = getTimestamp() - txInfo.submittedAt;
                if (ageSeconds > (TRANSACTION_CONFIRMATION_TIMEOUT_MS / 1000)) {
                    console.warn(`Transaction Monitoring: Transaction ${txHash} is still pending after ${ageSeconds}s (likely stuck/timed out).`);
                    clearTimeout(txInfo.timeoutId); // Ensure timeout is cleared even if poll finds it
                    pendingTransactions.delete(txHash);
                    aiNetworkOrchestrator.notifyPRAIOS('TX_STUCK_OR_TIMEOUT', { txHash, description: txInfo.description, ageSeconds });
                    txInfo.reject(new Error(`Transaction ${txHash} is stuck or timed out.`));
                }
            }
        } catch (error) {
            console.error(`Transaction Monitoring: Error checking status of ${txHash}:`, error);
            // Don't remove from pendingTransactions immediately on network error, retry on next interval
            // unless it's a specific "not found" error which implies it never reached mempool or was dropped
            if (error.code === 'CALL_EXCEPTION' || error.message.includes('not found')) { // Example error codes/messages for "tx not found"
                console.warn(`Transaction Monitoring: Transaction ${txHash} not found on network, likely dropped.`);
                clearTimeout(txInfo.timeoutId);
                pendingTransactions.delete(txHash);
                aiNetworkOrchestrator.notifyPRAIOS('TX_DROPPED', { txHash, description: txInfo.description, error: error.message });
                txInfo.reject(new Error(`Transaction ${txHash} dropped from mempool.`));
            }
        }
    }
}

/**
 * @private
 * @function performAxiomCheckOnConfirmedTx
 * @description Conducts an AxiomEngine analysis on a confirmed transaction receipt
 * to identify any anomalies or suspicious behavior.
 * @param {ethers.providers.TransactionReceipt} receipt - The confirmed transaction receipt.
 * @param {string} description - The description of the transaction.
 */
async function performAxiomCheckOnConfirmedTx(receipt, description) {
    if (!receipt) return;

    const txDetails = {
        txHash: receipt.transactionHash,
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString() || '0',
        value: receipt.events ? receipt.events.find(e => e.event === 'Transfer')?.args?.value?.toString() || '0' : '0', // Basic value extraction
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
        description,
        logsCount: receipt.logs?.length || 0,
        // Potentially fetch input data if needed for deeper analysis
    };

    const axiomContext = {
        type: 'ConfirmedTransaction',
        txDetails,
        networkState: aiNetworkOrchestrator.networkStateInstance.getCurrentState()
    };

    try {
        const axiomAnalysis = await axiomEngine.applyAxiomsToBlockchain(axiomContext);
        const anomalyScore = axiomAnalysis.recommendations.anomalyScore || 0;
        const detectedThreats = axiomAnalysis.recommendations.detectedThreats || [];
        const recommendedActions = axiomAnalysis.recommendations.recommendedActions || [];

        if (anomalyScore > 0.5) { // Threshold for reporting anomalies
            console.warn(`!!! Transaction Monitoring: ANOMALY DETECTED for transaction ${receipt.transactionHash}. Score: ${anomalyScore.toFixed(2)}`);
            aiNetworkOrchestrator.notifyPRAIOS('TX_ANOMALY_DETECTED', {
                txHash: receipt.transactionHash,
                anomalyScore,
                threats: detectedThreats,
                recommendedActions,
                txDetails
            });
        }
    } catch (error) {
        console.error(`Transaction Monitoring: Error during Axiom check for transaction ${receipt.transactionHash}:`, error);
        aiNetworkOrchestrator.notifyPRAIOS('TX_AXIOM_CHECK_EXCEPTION', { txHash: receipt.transactionHash, error: error.message });
    }
    }
