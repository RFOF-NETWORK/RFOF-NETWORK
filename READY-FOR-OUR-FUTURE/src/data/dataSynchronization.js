/**
 * @file dataSynchronization.js
 * @description Manages the synchronization of data within the RFOF-NETWORK,
 * ensuring consistency between local caches, the on-chain DataRegistry, and
 * potentially other data sources (e.g., PRAI-Neurons from PRAI-OS).
 * It enforces data integrity based on PZQQET Axiomatikx.
 */

import { ethers } from 'ethers';
import { getDataRegistryContract, getBlockchainProvider } from '../../config/networkConfig.js';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { hashData } from '../../utils/dataUtils.js';

let dataRegistryContract;
const localDataCache = new Map(); // A simple in-memory cache for frequently accessed data

/**
 * @function initializeDataSynchronization
 * @description Initializes the data synchronization module by connecting to the DataRegistry contract.
 */
export function initializeDataSynchronization() {
    try {
        const provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for data synchronization.');
        }
        dataRegistryContract = getDataRegistryContract(provider);
        if (!dataRegistryContract) {
            throw new Error('DataRegistry contract interface not initialized.');
        }
        console.log('Data Synchronization: Initialized, connected to DataRegistry.');
    } catch (error) {
        console.error('Data Synchronization Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('DATA_SYNC_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @function loadInitialData
 * @description Loads initial data into the local cache, potentially from a persistent store
 * or by fetching recent entries from the DataRegistry.
 * @returns {Promise<boolean>} True if initial data loading was successful.
 */
export async function loadInitialData() {
    console.log('Data Synchronization: Loading initial data...');
    try {
        // In a real application, this would involve fetching from a local database
        // or a snapshot, then validating/syncing with the blockchain.
        const dataCount = await dataRegistryContract.getDataCount();
        console.log(`Data Synchronization: DataRegistry contains ${dataCount.toString()} entries.`);

        // For demonstration, we'll just log and assume some data is "loaded"
        if (dataCount > 0) {
            // Fetching a very large number of entries could be slow/expensive.
            // In practice, a range or subscription for new data would be used.
            // For now, only fetching the latest few or nothing.
            // Example: const latestDataHash = await dataRegistryContract.idToDataHash(dataCount);
            // const latestData = await dataRegistryContract.getDataByHash(latestDataHash);
            // localDataCache.set(latestDataHash, latestData);
            // console.log(`Data Synchronization: Loaded latest data entry (ID: ${dataCount.toString()}).`);
        }
        console.log('Data Synchronization: Initial data load complete.');
        await aiNetworkOrchestrator.notifyPRAIOS('DATA_INITIAL_LOAD_SUCCESS', { count: dataCount.toString() });
        return true;
    } catch (error) {
        console.error('Data Synchronization: Error loading initial data:', error);
        await aiNetworkOrchestrator.notifyPRAIOS('DATA_INITIAL_LOAD_FAILURE', { error: error.message });
        return false;
    }
}

/**
 * @function syncDataRegistry
 * @description Periodically synchronizes the local data cache with the on-chain DataRegistry.
 * It listens for new `DataRegistered` events and fetches missing data.
 * @param {object} contractInstance - The Ethers.js instance of the DataRegistry contract.
 */
export async function syncDataRegistry(contractInstance) {
    if (!contractInstance) {
        console.error('Data Synchronization: DataRegistry contract instance not provided for syncing.');
        return;
    }
    dataRegistryContract = contractInstance; // Ensure we use the passed instance

    console.log('Data Synchronization: Starting periodic DataRegistry sync...');

    // Listen for new DataRegistered events
    dataRegistryContract.on('DataRegistered', async (dataHash, dataId, timestamp, event) => {
        console.log(`Data Sync: New DataRegistered event detected (ID: ${dataId.toString()}, Hash: ${dataHash}).`);
        if (!localDataCache.has(dataHash)) {
            try {
                // Fetch the actual data from the contract
                const data = await dataRegistryContract.getDataByHash(dataHash);
                localDataCache.set(dataHash, data);
                console.log(`Data Sync: Fetched and cached new data entry ${dataHash}.`);
                await aiNetworkOrchestrator.notifyPRAIOS('DATA_SYNCHRONIZED_NEW_ENTRY', {
                    dataHash: dataHash,
                    dataId: dataId.toString(),
                    source: 'blockchain'
                });
            } catch (error) {
                console.error(`Data Sync: Failed to fetch data for hash ${dataHash}:`, error);
                await aiNetworkOrchestrator.notifyPRAIOS('DATA_SYNC_FETCH_FAILED', {
                    dataHash: dataHash,
                    error: error.message
                });
            }
        } else {
            console.log(`Data Sync: Data entry ${dataHash} already in cache.`);
        }
    });

    // Also, perform an initial sync check for any data missed while offline or during startup
    await performFullSyncCheck();

    console.log('Data Synchronization: DataRegistry sync listener active.');
}

/**
 * @private
 * @function performFullSyncCheck
 * @description Performs a full check to ensure local cache is up-to-date with the DataRegistry.
 * This can be resource-intensive for large registries.
 */
async function performFullSyncCheck() {
    if (!dataRegistryContract) {
        console.error('Data Synchronization: DataRegistry contract not available for full sync check.');
        return;
    }

    console.log('Data Synchronization: Performing full sync check...');
    try {
        const onChainCount = await dataRegistryContract.getDataCount();
        const localCount = localDataCache.size;

        if (onChainCount.gt(localCount)) { // If on-chain has more entries than local cache
            console.log(`Data Sync: On-chain has ${onChainCount.toString()} entries, local has ${localCount}. Fetching missing data.`);
            for (let i = localCount.add(1); i <= onChainCount; i = i.add(1)) {
                try {
                    const dataHash = await dataRegistryContract.idToDataHash(i);
                    if (!localDataCache.has(dataHash)) {
                        const data = await dataRegistryContract.getDataByHash(dataHash);
                        localDataCache.set(dataHash, data);
                        console.log(`Data Sync: Fetched missing data entry ID ${i.toString()} (Hash: ${dataHash}).`);
                        await aiNetworkOrchestrator.notifyPRAIOS('DATA_SYNCHRONIZED_MISSING_ENTRY', {
                            dataId: i.toString(),
                            dataHash: dataHash,
                            source: 'blockchain-catchup'
                        });
                    }
                } catch (error) {
                    console.error(`Data Sync: Error fetching missing data entry ID ${i.toString()}:`, error);
                    await aiNetworkOrchestrator.notifyPRAIOS('DATA_SYNC_MISSING_FETCH_FAILED', {
                        dataId: i.toString(),
                        error: error.message
                    });
                }
            }
            console.log('Data Synchronization: Full sync check complete. Local cache updated.');
        } else {
            console.log('Data Synchronization: Local cache is up-to-date with DataRegistry.');
        }
    } catch (error) {
        console.error('Data Synchronization: Error during full sync check:', error);
        await aiNetworkOrchestrator.notifyPRAIOS('DATA_SYNC_FULL_CHECK_FAILED', { error: error.message });
    }
}

/**
 * @function getDataFromCacheOrRegistry
 * @description Attempts to retrieve data from the local cache, falling back to the on-chain DataRegistry.
 * @param {string | bytes32} identifier - The data hash or ID.
 * @returns {Promise<Buffer|null>} The data as a Buffer, or null if not found.
 */
export async function getDataFromCacheOrRegistry(identifier) {
    if (typeof identifier === 'string' && identifier.startsWith('0x') && identifier.length === 66) { // Looks like a hash
        const dataHash = identifier;
        if (localDataCache.has(dataHash)) {
            console.log(`Data Sync: Retrieved data ${dataHash} from local cache.`);
            return localDataCache.get(dataHash);
        }
        if (dataRegistryContract) {
            try {
                const data = await dataRegistryContract.getDataByHash(dataHash);
                if (data && data.length > 0) {
                    localDataCache.set(dataHash, data); // Cache it for future access
                    console.log(`Data Sync: Retrieved data ${dataHash} from DataRegistry and cached.`);
                    return data;
                }
            } catch (error) {
                console.warn(`Data Sync: Data ${dataHash} not found on-chain via hash or error occurred:`, error.message);
            }
        }
    } else if (typeof identifier === 'number' || (typeof identifier === 'string' && !isNaN(parseInt(identifier)))) { // Looks like an ID
        const dataId = ethers.BigNumber.from(identifier); // Use BigNumber for IDs
        if (dataRegistryContract) {
            try {
                const data = await dataRegistryContract.getDataById(dataId);
                const dataHash = hashData(data); // Re-calculate hash to store in map
                if (data && data.length > 0) {
                    localDataCache.set(dataHash, data); // Cache it by hash
                    console.log(`Data Sync: Retrieved data ID ${dataId.toString()} from DataRegistry and cached.`);
                    return data;
                }
            } catch (error) {
                console.warn(`Data Sync: Data ID ${dataId.toString()} not found on-chain via ID or error occurred:`, error.message);
            }
        }
    } else {
        console.warn('Data Sync: Invalid identifier type for data retrieval.');
    }

    return null;
}

/**
 * @function storeDataLocally
 * @description Stores data in the local cache, useful for new incoming data before it's registered on-chain.
 * @param {Buffer} data - The data to store.
 * @param {string} dataHash - The pre-calculated hash of the data.
 */
export function storeDataLocally(data, dataHash) {
    localDataCache.set(dataHash, data);
    console.log(`Data Sync: Stored data locally with hash: ${dataHash}`);
    aiNetworkOrchestrator.notifyPRAIOS('DATA_STORED_LOCALLY', { dataHash: dataHash, size: data.length });
}
