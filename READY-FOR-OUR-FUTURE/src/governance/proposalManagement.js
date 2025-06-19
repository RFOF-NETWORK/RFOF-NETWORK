/**
 * @file proposalManagement.js
 * @description Manages the lifecycle of governance proposals within the RFOF-NETWORK.
 * This includes creation, submission, tracking, and execution of proposals,
 * ensuring decentralized decision-making guided by PZQQET Axiomatikx.
 */

import { ethers } from 'ethers';
import { getNetworkGovernanceContract, getBlockchainProvider, getSigner } from '../../config/networkConfig.js';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { AxiomEngine } from '../core/axiomEngine.js'; // For axiom-driven proposal evaluation
import { networkStateInstance } from '../core/networkState.js'; // For network context

let networkGovernanceContract;
let axiomEngine;
let currentSigner; // The wallet signer for this node

/**
 * @function initializeProposalManagement
 * @description Initializes the proposal management module, connecting to the
 * NetworkGovernance contract and setting up the AxiomEngine.
 */
export function initializeProposalManagement() {
    try {
        const provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for proposal management.');
        }
        currentSigner = getSigner(); // Get the local node's signer
        if (!currentSigner) {
            throw new Error('No signer configured for this node. Cannot submit proposals.');
        }

        // Connect the contract with the signer to enable state-changing transactions
        networkGovernanceContract = getNetworkGovernanceContract(currentSigner);
        if (!networkGovernanceContract) {
            throw new Error('NetworkGovernance contract interface not initialized.');
        }

        axiomEngine = new AxiomEngine();
        console.log('Proposal Management: Initialized, connected to NetworkGovernance and AxiomEngine.');
    } catch (error) {
        console.error('Proposal Management Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('PROPOSAL_MGMT_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @function createProposal
 * @description Creates and submits a new governance proposal to the RFOF network.
 * The proposal will then enter a voting phase.
 * @param {string} title - A concise title for the proposal.
 * @param {string} description - A detailed description of the proposal.
 * @param {string} [ipfsContentId] - Optional IPFS CID for detailed proposal document/data.
 * @param {Array<object>} [actions=[]] - An array of on-chain actions to be executed if the proposal passes.
 * Each action: { target: address, value: BigNumber, callData: bytes }.
 * @returns {Promise<object|null>} The transaction receipt if successful, null otherwise.
 */
export async function createProposal(title, description, ipfsContentId = '', actions = []) {
    if (!networkGovernanceContract || !currentSigner) {
        console.error('Proposal Management: Not initialized or no signer available to create proposal.');
        await aiNetworkOrchestrator.notifyPRAIOS('PROPOSAL_CREATE_PRE_CHECK_FAILURE', { title, reason: 'Module not ready or no signer' });
        return null;
    }

    const proposerAddress = await currentSigner.getAddress();
    console.log(`Proposal Management: Proposer ${proposerAddress} creating new proposal: "${title}"`);

    try {
        // 1. Evaluate proposal with AxiomEngine for initial risk/benefit assessment
        const proposalContext = {
            title,
            description,
            ipfsContentId,
            actions,
            proposer: proposerAddress,
            currentNetworkState: networkStateInstance.getCurrentState()
        };
        const axiomEvaluation = await axiomEngine.applyAxiomsToGovernance(proposalContext);
        console.log('Proposal Management: AxiomEngine evaluation for proposal:', axiomEvaluation.recommendations);

        // AxiomEngine might provide a 'confidenceScore', 'riskAssessment', 'suggestedImprovements'.
        // For now, we proceed regardless, but in a real system, low confidence might require re-submission.

        // Format actions for contract call: targets, values, calldatas, description
        const targets = actions.map(a => a.target);
        const values = actions.map(a => a.value || ethers.BigNumber.from(0));
        const callDatas = actions.map(a => a.callData || '0x');

        const tx = await networkGovernanceContract.propose(
            targets,
            values,
            callDatas,
            ethers.keccak256(ethers.toUtf8Bytes(description + ipfsContentId)), // Description hash
            description
        );
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            const proposalId = (await networkGovernanceContract.proposalCount()).sub(1); // Assuming ID is `count - 1`
            console.log(`Proposal Management: Proposal "${title}" created successfully. ID: ${proposalId.toString()}, Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_CREATED_SUCCESS', {
                proposalId: proposalId.toString(),
                title,
                proposer: proposerAddress,
                transactionHash: receipt.transactionHash,
                axiomEvaluation: axiomEvaluation.recommendations
            });
            return { receipt, proposalId: proposalId.toString() };
        } else {
            console.error(`Proposal Management: Transaction for proposal creation failed. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('PROPOSAL_CREATE_TX_FAILURE', {
                title,
                proposer: proposerAddress,
                transactionHash: receipt.transactionHash,
                reason: 'Transaction status failed'
            });
            return null;
        }
    } catch (error) {
        console.error(`Proposal Management: Error creating proposal "${title}":`, error);
        await aiNetworkOrchestrator.notifyPRAIOS('PROPOSAL_CREATE_EXCEPTION', {
            title,
            proposer: proposerAddress,
            error: error.message
        });
        return null;
    }
}

/**
 * @function getProposalDetails
 * @description Retrieves the current details of a specific governance proposal.
 * @param {ethers.BigNumberish} proposalId - The ID of the proposal.
 * @returns {Promise<object|null>} An object containing proposal details, or null if not found/error.
 */
export async function getProposalDetails(proposalId) {
    if (!networkGovernanceContract) {
        console.error('Proposal Management: NetworkGovernance contract not ready.');
        return null;
    }
    try {
        const proposal = await networkGovernanceContract.proposals(proposalId);
        // Map raw tuple to a more readable object
        const details = {
            id: proposalId.toString(),
            proposer: proposal.proposer,
            eta: proposal.eta.toString(), // Time to execute
            startBlock: proposal.startBlock.toString(),
            endBlock: proposal.endBlock.toString(),
            forVotes: proposal.forVotes.toString(),
            againstVotes: proposal.againstVotes.toString(),
            abstainVotes: proposal.abstainVotes.toString(),
            canceled: proposal.canceled,
            executed: proposal.executed,
            // description: proposal.description // Note: Most governance contracts store description hash, not raw string
            descriptionHash: proposal.descriptionHash
        };

        console.log(`Proposal Management: Details for Proposal ID ${proposalId.toString()}:`, details);
        return details;
    } catch (error) {
        console.error(`Proposal Management: Error fetching details for proposal ID ${proposalId.toString()}:`, error);
        return null;
    }
}

/**
 * @function castGovernanceVote
 * @description Casts a vote on an active governance proposal.
 * @param {ethers.BigNumberish} proposalId - The ID of the proposal.
 * @param {boolean} support - True for 'for', false for 'against'.
 * @returns {Promise<object|null>} The transaction receipt if successful, null otherwise.
 */
export async function castGovernanceVote(proposalId, support) {
    if (!networkGovernanceContract || !currentSigner) {
        console.error('Proposal Management: Not initialized or no signer available to cast governance vote.');
        return null;
    }

    const voterAddress = await currentSigner.getAddress();
    console.log(`Proposal Management: Voter ${voterAddress} casting vote for Proposal ID ${proposalId.toString()}. Support: ${support}`);

    try {
        // Consult AxiomEngine for guidance on optimal voting strategy/decision enhancement for governance
        const voteGuidance = await axiomEngine.applyAxiomsToGovernance({
            proposalId: proposalId.toString(),
            voterAddress,
            currentDecision: support,
            currentNetworkState: networkStateInstance.getCurrentState()
        });
        console.log(`Proposal Management: AxiomEngine guidance for governance vote: ${JSON.stringify(voteGuidance.recommendations)}`);

        // The governance contract typically uses `castVote(proposalId, support)` or similar
        const tx = await networkGovernanceContract.castVote(proposalId, support); // Assuming a simple boolean support
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`Proposal Management: Vote cast successfully for Proposal ID ${proposalId.toString()}. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_VOTE_CAST_SUCCESS', {
                proposalId: proposalId.toString(),
                voter: voterAddress,
                support: support,
                transactionHash: receipt.transactionHash,
                axiomGuidance: voteGuidance.recommendations
            });
            return receipt;
        } else {
            console.error(`Proposal Management: Transaction for governance vote failed. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_VOTE_CAST_TX_FAILURE', {
                proposalId: proposalId.toString(),
                voter: voterAddress,
                support: support,
                transactionHash: receipt.transactionHash,
                reason: 'Transaction status failed'
            });
            return null;
        }
    } catch (error) {
        console.error(`Proposal Management: Error casting governance vote for Proposal ID ${proposalId.toString()}:`, error);
        await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_VOTE_CAST_EXCEPTION', {
            proposalId: proposalId.toString(),
            voter: voterAddress,
            error: error.message
        });
        return null;
    }
}

/**
 * @function queueProposal
 * @description Queues a successful proposal for execution after its voting period ends and it passes.
 * This is typically a separate call after a proposal is 'succeeded'.
 * @param {ethers.BigNumberish} proposalId - The ID of the proposal to queue.
 * @returns {Promise<object|null>} The transaction receipt if successful, null otherwise.
 */
export async function queueProposal(proposalId) {
    if (!networkGovernanceContract || !currentSigner) {
        console.error('Proposal Management: Not initialized or no signer available to queue proposal.');
        return null;
    }

    console.log(`Proposal Management: Queuing Proposal ID ${proposalId.toString()} for execution...`);

    try {
        // Governance contracts typically have a `queue` function that requires proposal details
        const proposal = await networkGovernanceContract.proposals(proposalId);
        const descriptionHash = proposal.descriptionHash; // The hash of description and IPFS CID

        // You might need to reconstruct the original `targets`, `values`, `calldatas` arrays if they are not stored.
        // For a Governor Bravo type contract, you need these to queue.
        // Assuming a helper function `getProposalActionsFromId` or similar:
        const originalActions = await getProposalActionsFromId(proposalId); // This would need to be implemented
        const targets = originalActions.map(a => a.target);
        const values = originalActions.map(a => a.value || ethers.BigNumber.from(0));
        const callDatas = originalActions.map(a => a.callData || '0x');


        const tx = await networkGovernanceContract.queue(
            targets,
            values,
            callDatas,
            descriptionHash
        );
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`Proposal Management: Proposal ID ${proposalId.toString()} successfully queued. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_QUEUED', {
                proposalId: proposalId.toString(),
                transactionHash: receipt.transactionHash
            });
            return receipt;
        } else {
            console.error(`Proposal Management: Transaction for queuing proposal failed. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_QUEUE_TX_FAILURE', {
                proposalId: proposalId.toString(),
                transactionHash: receipt.transactionHash,
                reason: 'Transaction status failed'
            });
            return null;
        }
    } catch (error) {
        console.error(`Proposal Management: Error queuing proposal ID ${proposalId.toString()}:`, error);
        await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_QUEUE_EXCEPTION', {
            proposalId: proposalId.toString(),
            error: error.message
        });
        return null;
    }
}

/**
 * @function executeProposal
 * @description Executes a queued governance proposal.
 * This can only be called after the `eta` (execution time) has passed.
 * @param {ethers.BigNumberish} proposalId - The ID of the proposal to execute.
 * @returns {Promise<object|null>} The transaction receipt if successful, null otherwise.
 */
export async function executeProposal(proposalId) {
    if (!networkGovernanceContract || !currentSigner) {
        console.error('Proposal Management: Not initialized or no signer available to execute proposal.');
        return null;
    }

    console.log(`Proposal Management: Executing Proposal ID ${proposalId.toString()}...`);

    try {
        const proposal = await networkGovernanceContract.proposals(proposalId);
        const descriptionHash = proposal.descriptionHash;

        // Reconstruct original actions to call execute
        const originalActions = await getProposalActionsFromId(proposalId);
        const targets = originalActions.map(a => a.target);
        const values = originalActions.map(a => a.value || ethers.BigNumber.from(0));
        const callDatas = originalActions.map(a => a.callData || '0x');

        const tx = await networkGovernanceContract.execute(
            targets,
            values,
            callDatas,
            descriptionHash
        );
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`Proposal Management: Proposal ID ${proposalId.toString()} successfully executed. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_EXECUTED_SUCCESS', {
                proposalId: proposalId.toString(),
                transactionHash: receipt.transactionHash
            });
            return receipt;
        } else {
            console.error(`Proposal Management: Transaction for executing proposal failed. Tx Hash: ${receipt.transactionHash}`);
            await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_EXECUTE_TX_FAILURE', {
                proposalId: proposalId.toString(),
                transactionHash: receipt.transactionHash,
                reason: 'Transaction status failed'
            });
            return null;
        }
    } catch (error) {
        console.error(`Proposal Management: Error executing proposal ID ${proposalId.toString()}:`, error);
        await aiNetworkOrchestrator.notifyPRAIOS('GOVERNANCE_PROPOSAL_EXECUTE_EXCEPTION', {
            proposalId: proposalId.toString(),
            error: error.message
        });
        return null;
    }
}

/**
 * @private
 * @function getProposalActionsFromId
 * @description (Placeholder) Retrieves the original actions associated with a proposal ID.
 * This information is often available via events (like ProposalCreated) or dedicated storage
 * in more complex governance contracts.
 * @param {ethers.BigNumberish} proposalId - The ID of the proposal.
 * @returns {Promise<Array<object>>} An array of action objects.
 */
async function getProposalActionsFromId(proposalId) {
    // In a real Governor contract setup (like OpenZeppelin's Governor), the actions (targets, values, calldatas)
    // are typically derived from the proposal's events or internal mappings.
    // For this example, we'll return dummy actions. In a full implementation, you'd
    // fetch the `ProposalCreated` event's logs for this `proposalId` and extract the action details.
    console.warn(`(NOTE: getProposalActionsFromId is a placeholder. In a real system, you'd fetch these from events or storage for proposal ID ${proposalId.toString()}.)`);
    return [
        // Example dummy action:
        // {
        //     target: '0x...', // Example target address
        //     value: ethers.parseEther('0'), // Example value
        //     callData: '0x...' // Example encoded function call
        // }
    ];
}
