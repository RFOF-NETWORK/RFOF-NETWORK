/**
 * @file votingMechanism.js
 * @description Implements the voting mechanism for the RFOF-NETWORK's decentralized consensus,
 * allowing validators to cast votes on various proposals, BOx integrity, and network state changes.
 * This module ensures secure, verifiable, and axiom-compliant voting processes.
 */

import { ethers } from 'ethers';
import { getConsensusModuleContract, getBlockchainProvider, getSigner } from '../../config/networkConfig.js';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { AxiomEngine } from '../core/axiomEngine.js'; // For axiom-driven voting optimization
import { hashData } from '../../utils/dataUtils.js';

let consensusModuleContract;
let axiomEngine;
let currentSigner; // The wallet signer for this node

/**
 * @function initializeVotingMechanism
 * @description Initializes the voting mechanism module, connecting to the ConsensusModule contract
 * and setting up the AxiomEngine.
 */
export function initializeVotingMechanism() {
    try {
        const provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for voting mechanism.');
        }
        currentSigner = getSigner(); // Get the local node's signer
        if (!currentSigner) {
            throw new Error('No signer configured for this node. Cannot cast votes.');
        }

        // Connect the contract with the signer to enable state-changing transactions
        consensusModuleContract = getConsensusModuleContract(currentSigner);
        if (!consensusModuleContract) {
            throw new Error('ConsensusModule contract interface not initialized.');
        }

        axiomEngine = new AxiomEngine(); // Initialize AxiomEngine
        console.log('Voting Mechanism: Initialized, connected to ConsensusModule, Signer, and AxiomEngine.');
    } catch (error) {
        console.error('Voting Mechanism Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('VOTING_MECH_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @function castVote
 * @description Allows a validator to cast a vote on a specific data hash, proposal, or network state.
 * The vote's weight is determined by the validator's stake and potentially reputation,
 * and the decision might be guided by AxiomEngine insights.
 * @param {string} dataHash - The hash of the data/proposal being voted on (bytes32).
 * @param {boolean} decision - The vote (true for approval, false for rejection).
 * @param {string} [voteContext='general'] - A string indicating the context of the vote (e.g., 'BOxValidation', 'GovernanceProposal').
 * @returns {Promise<object|null>} The transaction receipt if successful, null otherwise.
 */
export async function castVote(dataHash, decision, voteContext = 'general') {
    if (!consensusModuleContract || !currentSigner) {
        console.error('Voting Mechanism: Not initialized or no signer available.');
        await aiNetworkOrchestrator.notifyPRAIOS('VOTE_CAST_PRE_CHECK_FAILURE', { dataHash, decision, reason: 'Module not ready' });
        return null;
    }

    const voterAddress = await currentSigner.getAddress();
    console.log(`Voting Mechanism: Validator ${voterAddress} casting vote for ${dataHash} with decision ${decision}...`);

    try {
        // 1. Get current vote weight (from contract or calculated locally)
        const voteWeight = await consensusModuleContract.getStake(voterAddress); // Use stake as base weight
        if (voteWeight.isZero()) {
            console.warn(`Validator ${voterAddress} has no stake and thus no vote weight.`);
            await aiNetworkOrchestrator.notifyPRAIOS('VOTE_CAST_NO_STAKE', { dataHash, voter: voterAddress });
            return null;
        }

        // 2. Consult AxiomEngine for optimal voting strategy/decision enhancement
        const voteGuidance = await axiomEngine.applyAxiomsToConsensus({
            dataHash,
            currentDecision: decision,
            voterAddress,
            voterStake: voteWeight,
            voteContext,
            currentNetworkState: aiNetworkOrchestrator.networkStateInstance.getCurrentState() // Access directly
        });

        // AxiomEngine might suggest modifying the decision or adding rationale
        // For simplicity, we assume AxiomEngine's `recommendations` might contain a refinedDecision
        const finalDecision = voteGuidance.recommendations.refinedDecision !== undefined ? voteGuidance.recommendations.refinedDecision : decision;
        console.log(`Voting Mechanism: AxiomEngine guidance for vote: ${JSON.stringify(voteGuidance.recommendations)}`);

        // 3. Cast the vote on-chain
        const tx = await consensusModuleContract.vote(dataHash, finalDecision);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`Voting Mechanism: Vote cast successfully for ${dataHash}. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('VOTE_CAST_SUCCESS', {
                dataHash: dataHash,
                voter: voterAddress,
                decision: finalDecision,
                voteWeight: voteWeight.toString(),
                context: voteContext,
                transactionHash: receipt.transactionHash,
                axiomGuidance: voteGuidance.recommendations
            });
            return receipt;
        } else {
            console.error(`Voting Mechanism: Transaction for vote casting failed. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('VOTE_CAST_TX_FAILURE', {
                dataHash: dataHash,
                voter: voterAddress,
                decision: finalDecision,
                transactionHash: receipt.transactionHash,
                reason: 'Transaction status failed'
            });
            return null;
        }
    } catch (error) {
        console.error(`Voting Mechanism: Error casting vote for ${dataHash}:`, error);
        await aiNetworkOrchestrator.notifyPRAIOS('VOTE_CAST_EXCEPTION', {
            dataHash: dataHash,
            voter: voterAddress,
            error: error.message,
            context: voteContext
        });
        return null;
    }
}

/**
 * @function getVoteCount
 * @description Retrieves the current vote count for a given data hash.
 * @param {string} dataHash - The hash of the data/proposal.
 * @returns {Promise<object>} An object containing 'for' and 'against' vote weights.
 */
export async function getVoteCount(dataHash) {
    if (!consensusModuleContract) {
        console.error('Voting Mechanism: ConsensusModule contract not ready.');
        return { for: ethers.BigNumber.from(0), against: ethers.BigNumber.from(0) };
    }
    try {
        const [forVotes, againstVotes] = await consensusModuleContract.getVoteCounts(dataHash);
        console.log(`Voting Mechanism: Vote counts for ${dataHash} - For: ${forVotes.toString()}, Against: ${againstVotes.toString()}`);
        return { for: forVotes, against: againstVotes };
    } catch (error) {
        console.error(`Voting Mechanism: Error getting vote count for ${dataHash}:`, error);
        return { for: ethers.BigNumber.from(0), against: ethers.BigNumber.from(0) };
    }
}

/**
 * @function hasReachedConsensus
 * @description Checks if a specific data hash has reached consensus based on predefined thresholds.
 * This function typically queries the ConsensusModule contract for the result.
 * @param {string} dataHash - The hash of the data/proposal.
 * @returns {Promise<boolean>} True if consensus has been reached, false otherwise.
 */
export async function hasReachedConsensus(dataHash) {
    if (!consensusModuleContract) {
        console.error('Voting Mechanism: ConsensusModule contract not ready.');
        return false;
    }
    try {
        const consensusReached = await consensusModuleContract.hasReachedConsensus(dataHash);
        if (consensusReached) {
            console.log(`Voting Mechanism: Consensus has been reached for ${dataHash}.`);
        } else {
            console.log(`Voting Mechanism: Consensus not yet reached for ${dataHash}.`);
        }
        return consensusReached;
    } catch (error) {
        console.error(`Voting Mechanism: Error checking consensus for ${dataHash}:`, error);
        return false;
    }
}
