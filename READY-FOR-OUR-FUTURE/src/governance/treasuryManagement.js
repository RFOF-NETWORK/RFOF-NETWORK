/**
 * @file treasuryManagement.js
 * @description Manages the RFOF-NETWORK's decentralized treasury, including
 * funding allocations, budget proposals, and expenditure approvals. This module
 * ensures transparent and axiom-compliant financial operations, directly tied
 * to the network's governance.
 */

import { ethers } from 'ethers';
import { getNetworkGovernanceContract, getTokenDistributionContract, getBlockchainProvider, getSigner } from '../../config/networkConfig.js';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { AxiomEngine } from '../core/axiomEngine.js'; // For axiom-driven financial guidance

let networkGovernanceContract;
let tokenDistributionContract; // Represents the ABILITY token and potentially the treasury wallet
let axiomEngine;
let currentSigner; // The wallet signer for this node

/**
 * @function initializeTreasuryManagement
 * @description Initializes the treasury management module, connecting to relevant
 * contracts and the AxiomEngine.
 */
export function initializeTreasuryManagement() {
    try {
        const provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for treasury management.');
        }
        currentSigner = getSigner(); // Get the local node's signer
        if (!currentSigner) {
            console.warn('No signer configured for this node. Treasury actions might be limited.');
        }

        // Connect contracts. Treasury actions are often via governance, so connect governance with signer if available.
        networkGovernanceContract = getNetworkGovernanceContract(currentSigner || provider);
        tokenDistributionContract = getTokenDistributionContract(currentSigner || provider); // Assuming this contract also represents/interacts with the treasury wallet

        if (!networkGovernanceContract || !tokenDistributionContract) {
            throw new Error('One or more required contracts for treasury management could not be initialized.');
        }

        axiomEngine = new AxiomEngine();
        console.log('Treasury Management: Initialized, connected to contracts and AxiomEngine.');
    } catch (error) {
        console.error('Treasury Management Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('TREASURY_MGMT_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @function getTreasuryBalance
 * @description Retrieves the current balance of the RFOF Network Treasury.
 * This is typically the balance of the `tokenDistributionContract` if it also acts as the treasury.
 * @returns {Promise<ethers.BigNumber>} The treasury balance in ABILITY tokens (as BigNumber).
 */
export async function getTreasuryBalance() {
    if (!tokenDistributionContract) {
        console.error('Treasury Management: TokenDistribution contract not ready. Cannot get balance.');
        return ethers.BigNumber.from(0);
    }
    try {
        // Assuming `tokenDistributionContract` has a method to get the treasury address
        const treasuryAddress = await tokenDistributionContract.ecosystemFundAddress(); // Assuming this function exists
        const balance = await tokenDistributionContract.balanceOf(treasuryAddress);
        console.log(`Treasury Management: Current treasury balance at ${treasuryAddress}: ${ethers.formatEther(balance)} ABILITY`);
        return balance;
    } catch (error) {
        console.error('Treasury Management: Error fetching treasury balance:', error);
        return ethers.BigNumber.from(0);
    }
}

/**
 * @function submitFundingProposal
 * @description Creates and submits a governance proposal to allocate funds from the treasury.
 * This function utilizes `proposalManagement.createProposal`.
 * @param {string} proposalTitle - Title for the funding proposal.
 * @param {string} proposalDescription - Description of the funding request, its purpose, and impact.
 * @param {string} recipientAddress - The address to receive the funds.
 * @param {ethers.BigNumber} amount - The amount of ABILITY tokens to be allocated.
 * @param {string} [ipfsDetailsCid] - Optional IPFS CID for detailed budget plan.
 * @returns {Promise<object|null>} The result from `proposalManagement.createProposal`.
 */
export async function submitFundingProposal(proposalTitle, proposalDescription, recipientAddress, amount, ipfsDetailsCid = '') {
    if (!networkGovernanceContract || !currentSigner || !tokenDistributionContract) {
        console.error('Treasury Management: Module not fully initialized or no signer for funding proposal.');
        return null;
    }

    const treasuryAddress = await tokenDistributionContract.ecosystemFundAddress();
    console.log(`Treasury Management: Submitting funding proposal for ${ethers.formatEther(amount)} ABILITY to ${recipientAddress} from treasury ${treasuryAddress}.`);

    try {
        // 1. AxiomEngine analysis for funding proposal viability and alignment
        const proposalContext = {
            type: 'TreasuryFunding',
            recipient: recipientAddress,
            amount,
            currentTreasuryBalance: await getTreasuryBalance(),
            currentNetworkState: aiNetworkOrchestrator.networkStateInstance.getCurrentState(),
            proposalDescription,
            ipfsDetailsCid
        };
        const axiomAnalysis = await axiomEngine.applyAxiomsToGovernance(proposalContext);
        console.log('Treasury Management: AxiomEngine analysis for funding proposal:', axiomAnalysis.recommendations);

        // Construct the on-chain action for the governance proposal
        const encodedCallData = tokenDistributionContract.interface.encodeFunctionData('transfer', [recipientAddress, amount]);

        const actions = [{
            target: treasuryAddress, // The treasury contract's address
            value: ethers.BigNumber.from(0), // No ETH/native token transfer, only token transfer
            callData: encodedCallData
        }];

        // Import and use proposalManagement.js's createProposal
        const { createProposal } = await import('./proposalManagement.js');
        const proposalResult = await createProposal(
            proposalTitle,
            proposalDescription + `\n\nRecipient: ${recipientAddress}\nAmount: ${ethers.formatEther(amount)} ABILITY.\nDetails: ipfs://${ipfsDetailsCid}`,
            ipfsDetailsCid,
            actions
        );

        if (proposalResult) {
            console.log(`Treasury Management: Funding proposal submitted successfully. Proposal ID: ${proposalResult.proposalId}`);
            await aiNetworkOrchestrator.notifyPRAIOS('TREASURY_FUNDING_PROPOSAL_SUBMITTED', {
                proposalId: proposalResult.proposalId,
                recipient: recipientAddress,
                amount: amount.toString(),
                axiomAnalysis: axiomAnalysis.recommendations
            });
            return proposalResult;
        } else {
            console.error('Treasury Management: Failed to submit funding proposal via governance.');
            await aiNetworkOrchestrator.notifyPRAIOS('TREASURY_FUNDING_PROPOSAL_FAILURE', {
                recipient: recipientAddress,
                amount: amount.toString(),
                reason: 'Proposal creation failed'
            });
            return null;
        }
    } catch (error) {
        console.error('Treasury Management: Error submitting funding proposal:', error);
        await aiNetworkOrchestrator.notifyPRAIOS('TREASURY_FUNDING_PROPOSAL_EXCEPTION', {
            recipient: recipientAddress,
            amount: amount.toString(),
            error: error.message
        });
        return null;
    }
}

/**
 * @function getSpendingProposals
 * @description Retrieves a list of active or past spending-related governance proposals.
 * This would involve querying the governance contract's events or proposal states.
 * @param {number} [limit=10] - Maximum number of proposals to retrieve.
 * @param {string} [statusFilter='active'] - 'active', 'pending', 'succeeded', 'executed', 'canceled', 'all'.
 * @returns {Promise<Array<object>>} An array of simplified proposal objects.
 */
export async function getSpendingProposals(limit = 10, statusFilter = 'active') {
    if (!networkGovernanceContract) {
        console.error('Treasury Management: NetworkGovernance contract not ready.');
        return [];
    }
    console.log(`Treasury Management: Fetching ${statusFilter} spending proposals (limit: ${limit})...`);
    const proposals = [];
    try {
        // This is a simplified approach. A real system would filter events or query a more advanced subgraph/API.
        const proposalCount = await networkGovernanceContract.proposalCount();
        for (let i = proposalCount.toNumber() - 1; i >= 0 && proposals.length < limit; i--) {
            const proposal = await networkGovernanceContract.proposals(i);
            // Heuristic to identify spending proposals: Check description or target/calldata patterns
            const descriptionString = await getProposalDescriptionFromHash(proposal.descriptionHash); // Helper function to get description
            if (descriptionString.includes('Recipient:') && descriptionString.includes('Amount:') && descriptionString.includes('ABILITY')) { // Simple text check
                let currentStatus;
                if (proposal.executed) currentStatus = 'executed';
                else if (proposal.canceled) currentStatus = 'canceled';
                else {
                    // Requires more complex logic to determine pending/active/succeeded based on current block and votes
                    const state = await networkGovernanceContract.state(i); // OpenZeppelin Governor state enum
                    // 0: Pending, 1: Active, 2: Canceled, 3: Defeated, 4: Succeeded, 5: Queued, 6: Expired, 7: Executed
                    switch (state) {
                        case 0: currentStatus = 'pending'; break;
                        case 1: currentStatus = 'active'; break;
                        case 2: currentStatus = 'canceled'; break;
                        case 3: currentStatus = 'defeated'; break;
                        case 4: currentStatus = 'succeeded'; break;
                        case 5: currentStatus = 'queued'; break;
                        case 6: currentStatus = 'expired'; break;
                        case 7: currentStatus = 'executed'; break;
                        default: currentStatus = 'unknown';
                    }
                }

                if (statusFilter === 'all' || currentStatus === statusFilter) {
                    proposals.push({
                        id: i.toString(),
                        proposer: proposal.proposer,
                        description: descriptionString.split('\n\n')[0], // Extract just the main description
                        status: currentStatus,
                        forVotes: ethers.formatEther(proposal.forVotes),
                        againstVotes: ethers.formatEther(proposal.againstVotes),
                        executed: proposal.executed,
                        canceled: proposal.canceled
                    });
                }
            }
        }
        console.log(`Treasury Management: Found ${proposals.length} spending proposals.`);
        return proposals;
    } catch (error) {
        console.error('Treasury Management: Error fetching spending proposals:', error);
        return [];
    }
}

/**
 * @private
 * @function getProposalDescriptionFromHash
 * @description (Placeholder) Retrieves the full description string from its hash.
 * In a real system, the description might be stored on IPFS/Filecoin with a known CID
 * that's part of the proposal's metadata, or a specific event would log the full string.
 * This function assumes the description hash is derived from `description + ipfsContentId`.
 * @param {string} descriptionHash - The keccak256 hash of the proposal's full description.
 * @returns {Promise<string>} The reconstructed description string.
 */
async function getProposalDescriptionFromHash(descriptionHash) {
    // This is a simplification. A real implementation would involve:
    // 1. Retrieving the actual description via IPFS/Filecoin if an IPFS CID was part of the original proposal.
    // 2. Or, if the full description was emitted in a `ProposalCreated` event, fetching it from logs.
    console.warn(`(NOTE: getProposalDescriptionFromHash is a placeholder. Cannot fully reconstruct original string from hash ${descriptionHash} without context.)`);
    // For now, we return a generic string that might match our simple text search
    return `Generic proposal description for hash ${descriptionHash}.\n\nRecipient: 0x... (example)\nAmount: 100 ABILITY (example).`;
}
