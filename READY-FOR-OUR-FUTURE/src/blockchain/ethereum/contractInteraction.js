/**
 * @file contractInteraction.js
 * @description Provides core functionalities for interacting with Ethereum smart contracts
 * deployed by the RFOF-NETWORK, including reading data, sending transactions,
 * and event listening. This module abstracts away much of the ethers.js complexity.
 */

import { ethers } from 'ethers';
import { getBlockchainProvider, getSigner, getNetworkConfig } from '../../../config/networkConfig.js';
import { aiNetworkOrchestrator } from '../../core/aiIntegration.js';
import { AxiomEngine } from '../../core/axiomEngine.js'; // For axiom-driven transaction analysis/gas estimation

let provider;
let currentSigner;
let networkConfig;
let axiomEngine;

/**
 * @function initializeContractInteraction
 * @description Initializes the contract interaction module, connecting to the Ethereum provider
 * and setting up the local signer.
 */
export function initializeContractInteraction() {
    try {
        provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for contract interaction.');
        }
        currentSigner = getSigner(); // Local node's wallet signer
        networkConfig = getNetworkConfig(); // Get network-specific contract addresses and ABIs
        axiomEngine = new AxiomEngine();

        console.log('Contract Interaction: Initialized. Connected to Ethereum network.');
        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_INTERACTION_INIT_SUCCESS', {
            network: networkConfig.chainName,
            signerAddress: currentSigner ? currentSigner.address : 'N/A (read-only)',
        });
    } catch (error) {
        console.error('Contract Interaction Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_INTERACTION_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @function getContractInstance
 * @description Retrieves an Ethers.js Contract instance for a given RFOF network contract.
 * @param {string} contractName - The name of the contract (e.g., 'NetworkGovernance', 'TokenDistribution').
 * @param {boolean} [withSigner=false] - If true, connects the contract to the local signer for writing transactions.
 * @returns {ethers.Contract|null} An Ethers.js Contract instance, or null if not found/initialized.
 */
export function getContractInstance(contractName, withSigner = false) {
    if (!provider || (!currentSigner && withSigner)) {
        console.error(`Contract Interaction: Provider not initialized or no signer available for '${contractName}' (withSigner: ${withSigner}).`);
        return null;
    }

    const contractInfo = networkConfig.contracts[contractName];
    if (!contractInfo || !contractInfo.address || !contractInfo.abi) {
        console.error(`Contract Interaction: Contract information for '${contractName}' not found in networkConfig.`);
        return null;
    }

    try {
        const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, withSigner ? currentSigner : provider);
        // console.log(`Contract Interaction: Retrieved instance for '${contractName}' (connected with signer: ${withSigner}).`);
        return contract;
    } catch (error) {
        console.error(`Contract Interaction: Error creating contract instance for '${contractName}':`, error);
        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_INSTANCE_CREATION_ERROR', {
            contractName,
            error: error.message,
            withSigner
        });
        return null;
    }
}

/**
 * @function readContractData
 * @description Calls a read-only (view/pure) function on a smart contract.
 * @param {string} contractName - The name of the contract.
 * @param {string} functionName - The name of the function to call.
 * @param {Array<any>} [args=[]] - Arguments for the function call.
 * @returns {Promise<any>} The result of the contract call.
 */
export async function readContractData(contractName, functionName, args = []) {
    const contract = getContractInstance(contractName, false); // Read-only
    if (!contract) {
        console.error(`Contract Interaction: Cannot read from '${contractName}'. Contract instance not available.`);
        return null;
    }

    console.log(`Contract Interaction: Reading '${functionName}' from '${contractName}' with args:`, args);
    try {
        const result = await contract[functionName](...args);
        // console.log(`Contract Interaction: Read successful for '${functionName}'. Result:`, result);
        return result;
    } catch (error) {
        console.error(`Contract Interaction: Error reading '${functionName}' from '${contractName}':`, error);
        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_READ_ERROR', {
            contractName,
            functionName,
            args,
            error: error.message
        });
        throw error;
    }
}

/**
 * @function sendContractTransaction
 * @description Sends a transaction (state-changing call) to a smart contract.
 * Automatically estimates gas and consults AxiomEngine for optimal transaction parameters.
 * @param {string} contractName - The name of the contract.
 * @param {string} functionName - The name of the function to call.
 * @param {Array<any>} [args=[]] - Arguments for the function call.
 * @param {ethers.Overrides} [overrides={}] - Ethers.js transaction overrides (e.g., gasLimit, value).
 * @returns {Promise<ethers.providers.TransactionReceipt|null>} The transaction receipt if successful, null otherwise.
 */
export async function sendContractTransaction(contractName, functionName, args = [], overrides = {}) {
    const contract = getContractInstance(contractName, true); // Needs signer for transactions
    if (!contract || !currentSigner) {
        console.error(`Contract Interaction: Cannot send transaction to '${contractName}'. Contract instance or signer not available.`);
        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_SEND_PRE_CHECK_FAILURE', { contractName, functionName, reason: 'Contract/Signer not ready' });
        return null;
    }

    const signerAddress = await currentSigner.getAddress();
    console.log(`Contract Interaction: Sending transaction from ${signerAddress} to '${contractName}' function '${functionName}' with args:`, args);

    try {
        // 1. Axiom-driven gas estimation and transaction parameters optimization
        // Simulate a call to estimate gas, then let AxiomEngine refine it
        let estimatedGas;
        try {
            estimatedGas = await contract.estimateGas[functionName](...args, overrides);
            console.log(`Contract Interaction: Estimated gas: ${estimatedGas.toString()}`);
        } catch (gasEstimateError) {
            console.warn(`Contract Interaction: Failed to estimate gas for ${functionName}. Proceeding without estimate, may fail. Error: ${gasEstimateError.message}`);
            estimatedGas = ethers.BigNumber.from(0); // Set to 0 to indicate no estimate
        }

        const txContext = {
            contractName,
            functionName,
            args,
            sender: signerAddress,
            estimatedGas: estimatedGas.toString(),
            currentGasPrice: (await provider.getFeeData()).gasPrice?.toString(), // Current network gas price
            networkState: aiNetworkOrchestrator.networkStateInstance.getCurrentState()
        };

        const axiomTxRecommendations = await axiomEngine.applyAxiomsToBlockchain(txContext);
        console.log('Contract Interaction: AxiomEngine transaction recommendations:', axiomTxRecommendations.recommendations);

        const finalOverrides = { ...overrides };
        if (axiomTxRecommendations.recommendations.gasLimitMultiplier) {
            if (estimatedGas.gt(0)) { // Only apply if we have a valid estimate
                const multipliedGas = estimatedGas.mul(Math.round(axiomTxRecommendations.recommendations.gasLimitMultiplier * 100)).div(100);
                finalOverrides.gasLimit = multipliedGas.gt(estimatedGas) ? multipliedGas : estimatedGas.mul(105).div(100); // Ensure at least 5% buffer
                console.log(`Contract Interaction: Axiom-adjusted gas limit: ${finalOverrides.gasLimit.toString()}`);
            } else if (axiomTxRecommendations.recommendations.fallbackGasLimit) {
                 finalOverrides.gasLimit = ethers.BigNumber.from(axiomTxRecommendations.recommendations.fallbackGasLimit);
                 console.log(`Contract Interaction: Axiom-fallback gas limit: ${finalOverrides.gasLimit.toString()}`);
            }
        }
        if (axiomTxRecommendations.recommendations.maxFeePerGas) {
            finalOverrides.maxFeePerGas = ethers.parseUnits(axiomTxRecommendations.recommendations.maxFeePerGas.toString(), 'gwei');
        }
        if (axiomTxRecommendations.recommendations.maxPriorityFeePerGas) {
            finalOverrides.maxPriorityFeePerGas = ethers.parseUnits(axiomTxRecommendations.recommendations.maxPriorityFeePerGas.toString(), 'gwei');
        }


        // 2. Send the transaction
        const tx = await contract[functionName](...args, finalOverrides);
        console.log(`Contract Interaction: Transaction sent. Tx Hash: ${tx.hash}`);

        // 3. Wait for the transaction to be mined
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`Contract Interaction: Transaction successful. Tx Hash: ${receipt.transactionHash}`);
            aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_TRANSACTION_SUCCESS', {
                contractName,
                functionName,
                transactionHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed.toString(),
                axiomRecommendations: axiomTxRecommendations.recommendations
            });
            return receipt;
        } else {
            console.error(`Contract Interaction: Transaction failed (status 0). Tx Hash: ${receipt.transactionHash}`);
            aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_TRANSACTION_FAILURE', {
                contractName,
                functionName,
                transactionHash: receipt.transactionHash,
                reason: 'Transaction reverted on-chain',
                axiomRecommendations: axiomTxRecommendations.recommendations
            });
            return null;
        }
    } catch (error) {
        console.error(`Contract Interaction: Error sending transaction to '${contractName}' function '${functionName}':`, error);
        // Distinguish between user-rejected, gas too low, etc.
        let reason = error.message;
        if (error.code === 'ACTION_REJECTED') {
            reason = 'Transaction rejected by user or wallet.';
        } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
            reason = 'Gas limit could not be estimated or was too low.';
        } else if (error.code === 'UNSUPPORTED_OPERATION') {
            reason = 'Unsupported operation (e.g., trying to send a transaction with a read-only provider).';
        }

        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_TRANSACTION_EXCEPTION', {
            contractName,
            functionName,
            args,
            error: reason,
            fullError: error.toString() // Include full error for debugging
        });
        throw error; // Re-throw so calling module can handle
    }
}

/**
 * @function listenToContractEvent
 * @description Sets up a listener for a specific event on a smart contract.
 * @param {string} contractName - The name of the contract.
 * @param {string} eventName - The name of the event to listen for.
 * @param {Function} callback - The callback function to execute when the event is emitted.
 * The callback will receive the event arguments.
 * @returns {ethers.Contract|null} The contract instance (useful for removing listener later), or null on error.
 */
export function listenToContractEvent(contractName, eventName, callback) {
    const contract = getContractInstance(contractName, false); // Event listening is read-only
    if (!contract) {
        console.error(`Contract Interaction: Cannot listen to event on '${contractName}'. Contract instance not available.`);
        return null;
    }

    console.log(`Contract Interaction: Listening for event '${eventName}' on '${contractName}'...`);
    try {
        contract.on(eventName, (...args) => {
            console.log(`Contract Interaction: Event '${eventName}' received on '${contractName}'.`);
            // The last argument is typically the event object itself
            const event = args[args.length - 1];
            // Extract relevant args from the event, excluding the ethers-specific event object
            const eventArgs = args.slice(0, args.length - 1);
            callback(eventArgs, event);
            aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_EVENT_RECEIVED', {
                contractName,
                eventName,
                eventArgs: JSON.stringify(eventArgs) // Stringify for logging
            });
        });
        return contract;
    } catch (error) {
        console.error(`Contract Interaction: Error setting up listener for event '${eventName}' on '${contractName}':`, error);
        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_EVENT_LISTENER_ERROR', {
            contractName,
            eventName,
            error: error.message
        });
        return null;
    }
}

/**
 * @function removeContractEventListener
 * @description Removes a previously set up event listener.
 * @param {ethers.Contract} contractInstance - The contract instance returned by `listenToContractEvent`.
 * @param {string} eventName - The name of the event.
 * @param {Function} callback - The original callback function used to set up the listener.
 */
export function removeContractEventListener(contractInstance, eventName, callback) {
    if (!contractInstance) {
        console.warn('Contract Interaction: No contract instance provided to remove event listener.');
        return;
    }
    try {
        contractInstance.off(eventName, callback);
        console.log(`Contract Interaction: Removed listener for event '${eventName}'.`);
        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_EVENT_LISTENER_REMOVED', { eventName });
    } catch (error) {
        console.error(`Contract Interaction: Error removing listener for event '${eventName}':`, error);
        aiNetworkOrchestrator.notifyPRAIOS('CONTRACT_EVENT_LISTENER_REMOVE_ERROR', {
            eventName,
            error: error.message
        });
    }
          }
