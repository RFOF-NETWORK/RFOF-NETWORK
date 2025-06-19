/**
 * @file accessControl.js
 * @description Implements robust, role-based and attribute-based access control (RBAC/ABAC)
 * mechanisms for the RFOF-NETWORK. This module ensures that network participants
 * (nodes, users, PRAI-OS instances) only have permissions strictly necessary for their roles,
 * enforcing the principle of least privilege, guided by PZQQET Axiomatikx.
 */

import { ethers } from 'ethers';
import { getAccessControlContract, getBlockchainProvider } from '../../config/networkConfig.js';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { AxiomEngine } from '../core/axiomEngine.js'; // For axiom-driven permission evaluation

let accessControlContract;
let axiomEngine;

// Define a set of standard roles
export const ROLES = {
    ADMIN: 'ADMIN_ROLE',
    VALIDATOR: 'VALIDATOR_ROLE',
    GOVERNOR: 'GOVERNOR_ROLE',
    DATA_PROVIDER: 'DATA_PROVIDER_ROLE',
    CLIENT_APP: 'CLIENT_APP_ROLE',
    PRAI_OS_CORE: 'PRAI_OS_CORE_ROLE' // For PRAI-OS internal operations
};

/**
 * @function initializeAccessControl
 * @description Initializes the access control module, connecting to the
 * AccessControl contract and setting up the AxiomEngine.
 */
export function initializeAccessControl() {
    try {
        const provider = getBlockchainProvider();
        if (!provider) {
            throw new Error('Blockchain provider not available for access control.');
        }
        accessControlContract = getAccessControlContract(provider);
        if (!accessControlContract) {
            throw new Error('AccessControl contract interface not initialized.');
        }
        axiomEngine = new AxiomEngine();
        console.log('Access Control: Initialized, connected to AccessControl contract and AxiomEngine.');
    } catch (error) {
        console.error('Access Control Initialization Error:', error);
        aiNetworkOrchestrator.notifyPRAIOS('ACCESS_CONTROL_INIT_FAILURE', { error: error.message });
    }
}

/**
 * @function hasRole
 * @description Checks if a given address possesses a specific role.
 * @param {string} address - The address to check.
 * @param {string} roleName - The name of the role (e.g., 'ADMIN_ROLE', 'VALIDATOR_ROLE').
 * @returns {Promise<boolean>} True if the address has the role, false otherwise.
 */
export async function hasRole(address, roleName) {
    if (!accessControlContract) {
        console.error('Access Control: Contract not initialized. Cannot check role.');
        return false;
    }
    try {
        // Roles on-chain are often represented by keccak256 hashes of their names
        const roleBytes32 = ethers.id(roleName); // ethers.utils.keccak256(ethers.utils.toUtf8Bytes(roleName));
        const has = await accessControlContract.hasRole(roleBytes32, address);
        console.log(`Access Control: Address ${address} ${has ? 'HAS' : 'DOES NOT HAVE'} role ${roleName}.`);
        return has;
    } catch (error) {
        console.error(`Access Control: Error checking role ${roleName} for ${address}:`, error);
        return false;
    }
}

/**
 * @function checkPermission
 * @description Checks if a given address has permission to perform a specific action,
 * considering both roles and dynamic attributes, and consulting AxiomEngine for
 * real-time, context-aware authorization.
 * @param {string} address - The address requesting the action.
 * @param {string} action - The action to be performed (e.g., 'submit_box', 'update_config', 'initiate_dispute').
 * @param {object} [attributes={}] - Dynamic attributes related to the request (e.g., { resourceId: '0x123', value: '100' }).
 * @returns {Promise<boolean>} True if the action is permitted, false otherwise.
 */
export async function checkPermission(address, action, attributes = {}) {
    if (!accessControlContract) {
        console.error('Access Control: Contract not initialized. Cannot check permission.');
        return false;
    }
    console.log(`Access Control: Checking permission for ${address} to perform action '${action}' with attributes:`, attributes);

    try {
        let isPermitted = false;
        let reason = 'Default denied';

        // 1. Basic Role-Based Check (on-chain check)
        // This is a simplified mapping. In a real system, the contract itself might handle more granular permissions.
        switch (action) {
            case 'submit_box':
            case 'register_neuron':
                isPermitted = await hasRole(address, ROLES.VALIDATOR) || await hasRole(address, ROLES.DATA_PROVIDER);
                reason = isPermitted ? 'Role: VALIDATOR or DATA_PROVIDER' : 'Insufficient role for data submission';
                break;
            case 'update_network_config':
            case 'manage_roles':
                isPermitted = await hasRole(address, ROLES.ADMIN) || await hasRole(address, ROLES.GOVERNOR);
                reason = isPermitted ? 'Role: ADMIN or GOVERNOR' : 'Insufficient role for config management';
                break;
            case 'initiate_dispute':
                isPermitted = await hasRole(address, ROLES.VALIDATOR) || await hasRole(address, ROLES.ADMIN);
                reason = isPermitted ? 'Role: VALIDATOR or ADMIN' : 'Insufficient role for dispute initiation';
                break;
            case 'access_sensitive_data':
                isPermitted = await hasRole(address, ROLES.PRAI_OS_CORE) || await hasRole(address, ROLES.ADMIN);
                reason = isPermitted ? 'Role: PRAI_OS_CORE or ADMIN' : 'Insufficient role for sensitive data access';
                break;
            default:
                // For unknown actions, assume deny by default or check against a general permission set
                isPermitted = false;
                reason = `Unknown action: ${action}`;
        }

        if (!isPermitted) {
            console.warn(`Access Control: Permission denied for ${address} for action '${action}'. Reason: ${reason}`);
            aiNetworkOrchestrator.notifyPRAIOS('PERMISSION_DENIED', {
                address,
                action,
                attributes,
                reason,
                stage: 'Role-Based'
            });
            return false;
        }

        // 2. Axiom-driven Contextual and Attribute-Based Check
        // Even if role-based access is granted, AxiomEngine can override or refine based on context
        const axiomContext = {
            address,
            action,
            attributes,
            currentRoles: (await getRoles(address)).map(r => r.name), // Pass current roles for context
            currentNetworkState: aiNetworkOrchestrator.networkStateInstance.getCurrentState()
        };
        const axiomEvaluation = await axiomEngine.applyAxiomsToSecurity(axiomContext);

        const finalPermitted = axiomEvaluation.recommendations.isPermitted || false;
        const axiomReason = axiomEvaluation.recommendations.reason || 'Axiom-based decision';

        if (!finalPermitted) {
            console.warn(`Access Control: AxiomEngine denied permission for ${address} for action '${action}'. Reason: ${axiomReason}`);
            aiNetworkOrchestrator.notifyPRAIOS('PERMISSION_DENIED', {
                address,
                action,
                attributes,
                reason: axiomReason,
                stage: 'Axiom-Based'
            });
        } else {
            console.log(`Access Control: Permission granted for ${address} for action '${action}'. Axiom Reason: ${axiomReason}`);
            aiNetworkOrchestrator.notifyPRAIOS('PERMISSION_GRANTED', {
                address,
                action,
                attributes,
                reason: axiomReason
            });
        }
        return finalPermitted;

    } catch (error) {
        console.error(`Access Control: Error during permission check for ${address} on action '${action}':`, error);
        aiNetworkOrchestrator.notifyPRAIOS('PERMISSION_CHECK_EXCEPTION', {
            address,
            action,
            attributes,
            error: error.message
        });
        return false;
    }
}

/**
 * @function assignRole
 * @description Assigns a specific role to an address. This function should typically
 * only be callable by addresses with ADMIN or GOVERNOR roles via governance proposals.
 * @param {string} recipientAddress - The address to assign the role to.
 * @param {string} roleName - The name of the role to assign.
 * @returns {Promise<object|null>} The transaction receipt if successful, null otherwise.
 */
export async function assignRole(recipientAddress, roleName) {
    if (!accessControlContract) {
        console.error('Access Control: Contract not initialized. Cannot assign role.');
        return null;
    }
    const currentSigner = aiNetworkOrchestrator.getNetworkSigner(); // Get the signer for local node
    if (!currentSigner) {
        console.error('Access Control: No signer available to assign role. Must be called by a privileged account.');
        aiNetworkOrchestrator.notifyPRAIOS('ROLE_ASSIGN_FAILURE', {
            recipient: recipientAddress,
            role: roleName,
            reason: 'No signer'
        });
        return null;
    }

    const roleBytes32 = ethers.id(roleName);
    console.log(`Access Control: Assigning role '${roleName}' to ${recipientAddress}...`);

    try {
        // This transaction must be sent by an account that has the ADMIN_ROLE or a minter/governance role
        const tx = await accessControlContract.connect(currentSigner).grantRole(roleBytes32, recipientAddress);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`Access Control: Role '${roleName}' successfully assigned to ${recipientAddress}. Tx Hash: ${receipt.transactionHash}`);
            aiNetworkOrchestrator.notifyPRAIOS('ROLE_ASSIGNED_SUCCESS', {
                recipient: recipientAddress,
                role: roleName,
                assignedBy: await currentSigner.getAddress(),
                transactionHash: receipt.transactionHash
            });
            return receipt;
        } else {
            console.error(`Access Control: Transaction for assigning role failed. Tx Hash: ${receipt.transactionHash}`);
            aiNetworkOrchestrator.notifyPRAIOS('ROLE_ASSIGN_TX_FAILURE', {
                recipient: recipientAddress,
                role: roleName,
                transactionHash: receipt.transactionHash,
                reason: 'Transaction status failed'
            });
            return null;
        }
    } catch (error) {
        console.error(`Access Control: Error assigning role '${roleName}' to ${recipientAddress}:`, error);
        aiNetworkOrchestrator.notifyPRAIOS('ROLE_ASSIGN_EXCEPTION', {
            recipient: recipientAddress,
            role: roleName,
            error: error.message
        });
        return null;
    }
}

/**
 * @function revokeRole
 * @description Revokes a specific role from an address. Similar to assignRole, this
 * usually requires privileged access or governance approval.
 * @param {string} address - The address to revoke the role from.
 * @param {string} roleName - The name of the role to revoke.
 * @returns {Promise<object|null>} The transaction receipt if successful, null otherwise.
 */
export async function revokeRole(address, roleName) {
    if (!accessControlContract) {
        console.error('Access Control: Contract not initialized. Cannot revoke role.');
        return null;
    }
    const currentSigner = aiNetworkOrchestrator.getNetworkSigner();
    if (!currentSigner) {
        console.error('Access Control: No signer available to revoke role. Must be called by a privileged account.');
        aiNetworkOrchestrator.notifyPRAIOS('ROLE_REVOKE_FAILURE', {
            target: address,
            role: roleName,
            reason: 'No signer'
        });
        return null;
    }

    const roleBytes32 = ethers.id(roleName);
    console.log(`Access Control: Revoking role '${roleName}' from ${address}...`);

    try {
        const tx = await accessControlContract.connect(currentSigner).revokeRole(roleBytes32, address);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log(`Access Control: Role '${roleName}' successfully revoked from ${address}. Tx Hash: ${receipt.transactionHash}`);
            aiNetworkOrchestrator.notifyPRAIOS('ROLE_REVOKED_SUCCESS', {
                target: address,
                role: roleName,
                revokedBy: await currentSigner.getAddress(),
                transactionHash: receipt.transactionHash
            });
            return receipt;
        } else {
            console.error(`Access Control: Transaction for revoking role failed. Tx Hash: ${receipt.transactionHash}`);
            aiNetworkOrchestrator.notifyPRAIOS('ROLE_REVOKE_TX_FAILURE', {
                target: address,
                role: roleName,
                transactionHash: receipt.transactionHash,
                reason: 'Transaction status failed'
            });
            return null;
        }
    } catch (error) {
        console.error(`Access Control: Error revoking role '${roleName}' from ${address}:`, error);
        aiNetworkOrchestrator.notifyPRAIOS('ROLE_REVOKE_EXCEPTION', {
            target: address,
            role: roleName,
            error: error.message
        });
        return null;
    }
}


/**
 * @function getRoles
 * @description Retrieves all roles currently assigned to an address.
 * This might be expensive if iterating through all possible roles on-chain.
 * @param {string} address - The address to query roles for.
 * @returns {Promise<Array<object>>} An array of role objects ({ name: string, has: boolean }).
 */
export async function getRoles(address) {
    if (!accessControlContract) {
        console.error('Access Control: Contract not initialized. Cannot get roles.');
        return [];
    }
    console.log(`Access Control: Getting all roles for ${address}...`);
    const roles = [];
    for (const roleName of Object.values(ROLES)) {
        try {
            const has = await hasRole(address, roleName);
            roles.push({ name: roleName, has: has });
        } catch (error) {
            console.warn(`Access Control: Could not check role ${roleName} for ${address}:`, error.message);
        }
    }
    return roles;
          }
