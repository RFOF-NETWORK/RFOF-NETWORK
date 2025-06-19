/**
 * @file eventListeners.js
 * @description Centralized management for listening to and reacting to key events
 * across the RFOF-NETWORK, including blockchain events, P2P network events,
 * and internal system events. This module acts as the "ears" of the network,
 * ensuring timely responses and feeding data to the AxiomEngine and PRAI-OS.
 */

import { ethers } from 'ethers';
import { getBlockchainProvider, getRFOFNetworkCoreContract, getDataRegistryContract, getConsensusModuleContract, getTokenDistributionContract, getNetworkGovernanceContract } from '../../config/networkConfig.js';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { processIncomingRoutedData } from './dataRouting.js'; // To handle incoming data from P2P
import { handleIncomingData } from './p2pCommunication.js'; // To register P2P handlers
import { networkStateInstance } from '../core/networkState.js'; // To update network state

let rfofCoreContract;
let dataRegistryContract;
let consensusModuleContract;
let tokenDistributionContract;
let networkGovernanceContract;

const RFOF_DATA_EXCHANGE_PROTOCOL = '/rfof/data-exchange/1.0.0';

/**
 * @function initializeEventListeners
 * @description Sets up all necessary event listeners for the RFOF network.
 */
export function initializeEventListeners() {
    console.log('Event Listeners: Initializing all network event listeners...');

    try {
        const provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for event listeners.');
        }

        // Initialize contract instances
        rfofCoreContract = getRFOFNetworkCoreContract(provider);
        dataRegistryContract = getDataRegistryContract(provider);
        consensusModuleContract = getConsensusModuleContract(provider);
        tokenDistributionContract = getTokenDistributionContract(provider);
        networkGovernanceContract = getNetworkGovernanceContract(provider);

        if (!rfofCoreContract || !dataRegistryContract || !consensusModuleContract || !tokenDistributionContract || !networkGovernanceContract) {
            throw new Error('One or more RFOF core contracts could not be initialized for event listening.');
        }

        // Register Blockchain Event Listeners
        registerRFOFCoreListeners();
        registerDataRegistryListeners();
        registerConsensusModuleListeners();
        registerTokenDistributionListeners();
        registerNetworkGovernanceListeners();

        // Register P2P Event Listeners
        registerP2PMessageListener();

        // Register Internal System Event Listeners (e.g., node health, resource alerts)
        registerInternalSystemListeners();

        console.log('Event Listeners: All listeners successfully registered.');
    } catch (error) {
        console.error('Event Listeners Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('EVENT_LISTENER_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @private
 * @function registerRFOFCoreListeners
 * @description Registers listeners for events emitted by the RFOFNetworkCore contract.
 */
function registerRFOFCoreListeners() {
    // Event: BOxProcessed(bytes32 indexed boxHash, uint256 timestamp, address indexed processor)
    rfofCoreContract.on('BOxProcessed', async (boxHash, timestamp, processor, event) => {
        console.log(`[Event] RFOFNetworkCore - BOxProcessed: Hash=${boxHash}, Processor=${processor}, TxHash=${event.log.transactionHash}`);
        // Notify PRAI-OS about the processed BOx
        await aiNetworkOrchestrator.notifyPRAIOS('RFOF_BOX_PROCESSED', {
            boxHash: boxHash,
            processor: processor,
            timestamp: timestamp.toString(),
            transactionHash: event.log.transactionHash
        });
        // Update network state
        networkStateInstance.fetchAndApplyLatestMetrics(); // Trigger state update
    });

    // Event: NetworkStateUpdated(bytes32 indexed newStateHash, uint256 timestamp)
    rfofCoreContract.on('NetworkStateUpdated', async (newStateHash, timestamp, event) => {
        console.log(`[Event] RFOFNetworkCore - NetworkStateUpdated: NewStateHash=${newStateHash}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('RFOF_NETWORK_STATE_UPDATED', {
            newStateHash: newStateHash,
            timestamp: timestamp.toString(),
            transactionHash: event.log.transactionHash
        });
        networkStateInstance.fetchAndApplyLatestMetrics();
    });

    console.log('Event Listeners: RFOFNetworkCore listeners registered.');
}

/**
 * @private
 * @function registerDataRegistryListeners
 * @description Registers listeners for events emitted by the DataRegistry contract.
 */
function registerDataRegistryListeners() {
    // Event: DataRegistered(bytes32 indexed dataHash, uint256 indexed dataId, uint256 timestamp)
    dataRegistryContract.on('DataRegistered', async (dataHash, dataId, timestamp, event) => {
        console.log(`[Event] DataRegistry - DataRegistered: Hash=${dataHash}, ID=${dataId}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('DATA_REGISTERED', {
            dataHash: dataHash,
            dataId: dataId.toString(),
            timestamp: timestamp.toString(),
            transactionHash: event.log.transactionHash
        });
        networkStateInstance.fetchAndApplyLatestMetrics();
    });

    console.log('Event Listeners: DataRegistry listeners registered.');
}

/**
 * @private
 * @function registerConsensusModuleListeners
 * @description Registers listeners for events emitted by the ConsensusModule contract.
 */
function registerConsensusModuleListeners() {
    // Event: ValidatorStaked(address indexed validator, uint256 amount)
    consensusModuleContract.on('ValidatorStaked', async (validator, amount, event) => {
        console.log(`[Event] ConsensusModule - ValidatorStaked: Validator=${validator}, Amount=${amount.toString()}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('VALIDATOR_STAKED', {
            validator: validator,
            amount: amount.toString(),
            transactionHash: event.log.transactionHash
        });
        networkStateInstance.fetchAndApplyLatestMetrics();
    });

    // Event: ValidatorUnstaked(address indexed validator, uint256 amount)
    consensusModuleContract.on('ValidatorUnstaked', async (validator, amount, event) => {
        console.log(`[Event] ConsensusModule - ValidatorUnstaked: Validator=${validator}, Amount=${amount.toString()}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('VALIDATOR_UNSTAKED', {
            validator: validator,
            amount: amount.toString(),
            transactionHash: event.log.transactionHash
        });
        networkStateInstance.fetchAndApplyLatestMetrics();
    });

    // Event: VoteCast(bytes32 indexed dataHash, address indexed voter, bool decision, uint256 voteWeight)
    consensusModuleContract.on('VoteCast', async (dataHash, voter, decision, voteWeight, event) => {
        console.log(`[Event] ConsensusModule - VoteCast: DataHash=${dataHash}, Voter=${voter}, Decision=${decision}, Weight=${voteWeight.toString()}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('CONSENSUS_VOTE_CAST', {
            dataHash: dataHash,
            voter: voter,
            decision: decision,
            voteWeight: voteWeight.toString(),
            transactionHash: event.log.transactionHash
        });
    });

    // Event: ConsensusReached(bytes32 indexed dataHash)
    consensusModuleContract.on('ConsensusReached', async (dataHash, event) => {
        console.log(`[Event] ConsensusModule - ConsensusReached: DataHash=${dataHash}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('CONSENSUS_REACHED', {
            dataHash: dataHash,
            transactionHash: event.log.transactionHash
        });
        networkStateInstance.fetchAndApplyLatestMetrics();
    });

    console.log('Event Listeners: ConsensusModule listeners registered.');
}

/**
 * @private
 * @function registerTokenDistributionListeners
 * @description Registers listeners for events emitted by the TokenDistribution contract.
 */
function registerTokenDistributionListeners() {
    // Event: TokensDistributed(address indexed recipient, uint256 abilityAmount, uint256 nanoAmount, string rewardType)
    tokenDistributionContract.on('TokensDistributed', async (recipient, abilityAmount, nanoAmount, rewardType, event) => {
        console.log(`[Event] TokenDistribution - TokensDistributed: Recipient=${recipient}, ABILITY=${abilityAmount.toString()}, NANO=${nanoAmount.toString()}, Type=${rewardType}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('TOKENS_DISTRIBUTED', {
            recipient: recipient,
            abilityAmount: abilityAmount.toString(),
            nanoAmount: nanoAmount.toString(),
            rewardType: rewardType,
            transactionHash: event.log.transactionHash
        });
    });

    // Event: EcosystemFundAddressUpdated(address indexed newAddress)
    tokenDistributionContract.on('EcosystemFundAddressUpdated', async (newAddress, event) => {
        console.log(`[Event] TokenDistribution - EcosystemFundAddressUpdated: NewAddress=${newAddress}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('ECOSYSTEM_FUND_UPDATED', {
            newAddress: newAddress,
            transactionHash: event.log.transactionHash
        });
    });

    console.log('Event Listeners: TokenDistribution listeners registered.');
}

/**
 * @private
 * @function registerNetworkGovernanceListeners
 * @description Registers listeners for events emitted by the NetworkGovernance contract.
 */
function registerNetworkGovernanceListeners() {
    // Event: ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)
    networkGovernanceContract.on('ProposalCreated', async (proposalId, proposer, description, event) => {
        console.log(`[Event] NetworkGovernance - ProposalCreated: ID=${proposalId.toString()}, Proposer=${proposer}, Desc="${description}", TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_CREATED', {
            proposalId: proposalId.toString(),
            proposer: proposer,
            description: description,
            transactionHash: event.log.transactionHash
        });
    });

    // Event: VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes)
    networkGovernanceContract.on('VoteCast', async (proposalId, voter, support, votes, event) => {
        console.log(`[Event] NetworkGovernance - VoteCast: ProposalID=${proposalId.toString()}, Voter=${voter}, Support=${support}, Votes=${votes.toString()}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_VOTE_CAST', {
            proposalId: proposalId.toString(),
            voter: voter,
            support: support,
            votes: votes.toString(),
            transactionHash: event.log.transactionHash
        });
    });

    // Event: ProposalExecuted(uint256 indexed proposalId, bytes32 indexed proposalHash)
    networkGovernanceContract.on('ProposalExecuted', async (proposalId, proposalHash, event) => {
        console.log(`[Event] NetworkGovernance - ProposalExecuted: ID=${proposalId.toString()}, Hash=${proposalHash}, TxHash=${event.log.transactionHash}`);
        await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_EXECUTED', {
            proposalId: proposalId.toString(),
            proposalHash: proposalHash,
            transactionHash: event.log.transactionHash
        });
        // A governance execution might change core contract addresses or parameters,
        // so a full re-initialization of contracts or specific updates might be needed here.
    });

    console.log('Event Listeners: NetworkGovernance listeners registered.');
}

/**
 * @private
 * @function registerP2PMessageListener
 * @description Registers the handler for incoming P2P data messages.
 */
function registerP2PMessageListener() {
    handleIncomingData(RFOF_DATA_EXCHANGE_PROTOCOL, processIncomingRoutedData);
    console.log(`Event Listeners: P2P incoming message handler for protocol '${RFOF_DATA_EXCHANGE_PROTOCOL}' registered.`);
}

/**
 * @private
 * @function registerInternalSystemListeners
 * @description Registers listeners for internal system events (e.g., from networkStateInstance).
 */
function registerInternalSystemListeners() {
    // The NetworkState instance already periodically updates itself and can be queried.
    // If there were explicit 'healthChange' or 'alert' events emitted by networkStateInstance,
    // they would be listened to here. For now, PRAI-OS can poll `networkStateInstance.getCurrentState()`.
    console.log('Event Listeners: Internal system listeners configured (primarily via networkStateInstance polling).');
          }
