/**
 * @file validationUtils.js
 * @description Provides a suite of utility functions for validating various data types,
 * formats, and constraints within the RFOF-NETWORK. This ensures data integrity,
 * security, and protocol compliance across all modules.
 */

import { ethers } from 'ethers';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';
import { hashData } from './dataUtils.js';

/**
 * @function isValidEthAddress
 * @description Checks if a given string is a valid Ethereum address.
 * @param {string} address - The string to validate as an Ethereum address.
 * @returns {boolean} True if the address is valid, false otherwise.
 */
export function isValidEthAddress(address) {
    try {
        ethers.getAddress(address); // This function will throw if the address is invalid
        return true;
    } catch (error) {
        // console.warn(`ValidationUtils: Invalid Ethereum address format: ${address}`);
        return false;
    }
}

/**
 * @function isNonEmptyString
 * @description Checks if a value is a non-empty string (after trimming whitespace).
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a non-empty string, false otherwise.
 */
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @function isPositiveNumber
 * @description Checks if a value is a number and is positive (greater than 0).
 * Can check for integers only if specified.
 * @param {*} value - The value to check.
 * @param {boolean} [allowZero=false] - If true, considers 0 as positive.
 * @param {boolean} [isInteger=false] - If true, checks if it's an integer.
 * @returns {boolean} True if the value is a positive number (and optionally integer), false otherwise.
 */
export function isPositiveNumber(value, allowZero = false, isInteger = false) {
    if (typeof value !== 'number' || isNaN(value)) {
        return false;
    }
    if (isInteger && !Number.isInteger(value)) {
        return false;
    }
    return allowZero ? value >= 0 : value > 0;
}

/**
 * @function isValidHash
 * @description Checks if a string is a valid Keccak-256 hash (66 characters, starts with '0x').
 * @param {string} hash - The string to validate as a hash.
 * @returns {boolean} True if the hash is valid, false otherwise.
 */
export function isValidHash(hash) {
    return typeof hash === 'string' && hash.startsWith('0x') && hash.length === 66 && /^[0-9a-fA-F]+$/.test(hash.substring(2));
}

/**
 * @function isValidIpfsCid
 * @description Basic check for a valid IPFS CID string (starts with 'Qm' or 'b', typically 46 chars for CIDv0).
 * This is a basic format check, not a cryptographic validation of the CID itself.
 * @param {string} cid - The string to validate as an IPFS CID.
 * @returns {boolean} True if it matches basic CID format, false otherwise.
 */
export function isValidIpfsCid(cid) {
    // CIDv0 typically starts with 'Qm' and is 46 characters long.
    // CIDv1 starts with 'b', 'z', 'F', etc., and can be longer.
    // This is a simplified check. A full validation would use a dedicated CID library.
    return typeof cid === 'string' && (
        (cid.startsWith('Qm') && cid.length === 46) || // CIDv0
        (cid.length > 2 && (cid.startsWith('b') || cid.startsWith('z') || cid.startsWith('F'))) // Simplified CIDv1 start
    );
}

/**
 * @function isBuffer
 * @description Checks if a value is a Node.js Buffer or Uint8Array.
 * @param {*} value - The value to check.
 * @returns {boolean} True if it's a Buffer or Uint8Array, false otherwise.
 */
export function isBuffer(value) {
    return value instanceof Buffer || value instanceof Uint8Array;
}

/**
 * @function validateDataStructure
 * @description Validates an object against a predefined schema.
 * This is a basic recursive validator, can be extended with more complex rules.
 * @param {object} data - The object to validate.
 * @param {object} schema - The schema defining expected types and optionality.
 * Example schema: { field1: 'string', field2: 'number', field3: { type: 'boolean', optional: true } }
 * Nested objects/arrays: { nestedObj: { type: 'object', schema: { propA: 'string' } }, arr: { type: 'array', itemType: 'string' } }
 * @returns {boolean} True if the data matches the schema, false otherwise.
 */
export function validateDataStructure(data, schema) {
    if (typeof data !== 'object' || data === null) {
        console.warn('ValidationUtils: Data for structure validation must be an object.');
        return false;
    }
    if (typeof schema !== 'object' || schema === null) {
        console.error('ValidationUtils: Schema for structure validation must be an object.');
        return false;
    }

    for (const key in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, key)) {
            const rule = schema[key];
            const isOptional = rule.optional === true;
            const expectedType = rule.type || rule; // 'string' or { type: 'string' }

            if (!(key in data) || data[key] === undefined || data[key] === null) {
                if (!isOptional) {
                    console.warn(`ValidationUtils: Missing non-optional field: ${key}`);
                    aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'MISSING_FIELD', field: key });
                    return false;
                }
                continue; // If optional and missing, it's fine
            }

            const value = data[key];

            switch (expectedType) {
                case 'string':
                    if (!isNonEmptyString(value)) {
                        console.warn(`ValidationUtils: Invalid string for field ${key}: ${value}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_STRING', field: key, value });
                        return false;
                    }
                    break;
                case 'number':
                    if (typeof value !== 'number' || isNaN(value)) {
                        console.warn(`ValidationUtils: Invalid number for field ${key}: ${value}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_NUMBER', field: key, value });
                        return false;
                    }
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') {
                        console.warn(`ValidationUtils: Invalid boolean for field ${key}: ${value}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_BOOLEAN', field: key, value });
                        return false;
                    }
                    break;
                case 'object':
                    if (rule.schema) { // Nested object with its own schema
                        if (!validateDataStructure(value, rule.schema)) {
                            console.warn(`ValidationUtils: Invalid nested object for field ${key}`);
                            aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_NESTED_OBJECT', field: key });
                            return false;
                        }
                    } else if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                        console.warn(`ValidationUtils: Invalid object for field ${key}: ${value}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_OBJECT', field: key, value });
                        return false;
                    }
                    break;
                case 'array':
                    if (!Array.isArray(value)) {
                        console.warn(`ValidationUtils: Invalid array for field ${key}: ${value}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_ARRAY', field: key, value });
                        return false;
                    }
                    if (rule.itemType) { // Validate array elements
                        for (const item of value) {
                            if (rule.itemType === 'object' && rule.itemSchema) {
                                if (!validateDataStructure(item, rule.itemSchema)) {
                                    console.warn(`ValidationUtils: Invalid item in array ${key}`);
                                    aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_ARRAY_ITEM_OBJECT', field: key, item });
                                    return false;
                                }
                            } else if (typeof item !== rule.itemType) {
                                console.warn(`ValidationUtils: Invalid type for array item in ${key}. Expected ${rule.itemType}, got ${typeof item}`);
                                aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_ARRAY_ITEM_TYPE', field: key, itemType: rule.itemType, actualType: typeof item });
                                return false;
                            }
                        }
                    }
                    break;
                case 'address':
                    if (!isValidEthAddress(value)) {
                        console.warn(`ValidationUtils: Invalid Ethereum address for field ${key}: ${value}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_ETH_ADDRESS_FIELD', field: key, value });
                        return false;
                    }
                    break;
                case 'hash':
                    if (!isValidHash(value)) {
                        console.warn(`ValidationUtils: Invalid hash for field ${key}: ${value}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_HASH_FIELD', field: key, value });
                        return false;
                    }
                    break;
                case 'ipfs_cid':
                    if (!isValidIpfsCid(value)) {
                        console.warn(`ValidationUtils: Invalid IPFS CID for field ${key}: ${value}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_IPFS_CID_FIELD', field: key, value });
                        return false;
                    }
                    break;
                case 'buffer':
                    if (!isBuffer(value)) {
                        console.warn(`ValidationUtils: Invalid Buffer/Uint8Array for field ${key}`);
                        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_BUFFER_FIELD', field: key });
                        return false;
                    }
                    break;
                default:
                    console.warn(`ValidationUtils: Unknown validation type for field ${key}: ${expectedType}`);
                    aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_WARN', { type: 'UNKNOWN_VALIDATION_TYPE', field: key, expectedType });
                    break;
            }
        }
    }

    return true;
}

/**
 * @function validateSignature
 * @description Validates an Ethereum signature against a message and expected signer address.
 * Uses ethers.js utility for cryptographic verification.
 * @param {string} message - The original message that was signed.
 * @param {string} signature - The signature to verify.
 * @param {string} signerAddress - The expected address of the signer.
 * @returns {Promise<boolean>} True if the signature is valid for the message and signer, false otherwise.
 */
export async function validateSignature(message, signature, signerAddress) {
    if (!isNonEmptyString(message) || !isNonEmptyString(signature) || !isValidEthAddress(signerAddress)) {
        console.warn('ValidationUtils: Invalid inputs for signature validation.');
        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_SIG_INPUTS', message: message.substring(0, 50), signature: signature.substring(0, 50), signerAddress });
        return false;
    }

    try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        const isValid = (recoveredAddress.toLowerCase() === signerAddress.toLowerCase());
        if (!isValid) {
            console.warn(`ValidationUtils: Signature mismatch. Expected ${signerAddress}, recovered ${recoveredAddress}.`);
            aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'SIG_MISMATCH', expected: signerAddress, recovered: recoveredAddress });
        }
        return isValid;
    } catch (error) {
        console.error('ValidationUtils: Error during signature validation:', error);
        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'SIG_VALIDATION_EXCEPTION', error: error.message });
        return false;
    }
}

/**
 * @function validateMerkleProof
 * @description Validates a Merkle proof for a given leaf and root.
 * (This is a simplified conceptual implementation; a full one needs a Merkle tree library).
 * @param {string} leafHash - The hash of the leaf data.
 * @param {Array<string>} proof - The Merkle proof array of hashes.
 * @param {string} rootHash - The expected Merkle root hash.
 * @returns {boolean} True if the proof is valid, false otherwise.
 */
export function validateMerkleProof(leafHash, proof, rootHash) {
    if (!isValidHash(leafHash) || !Array.isArray(proof) || !isValidHash(rootHash)) {
        console.warn('ValidationUtils: Invalid inputs for Merkle proof validation.');
        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_MERKLE_PROOF_INPUTS' });
        return false;
    }

    let computedHash = leafHash;
    for (let i = 0; i < proof.length; i++) {
        const proofNode = proof[i];
        if (!isValidHash(proofNode)) {
            console.warn(`ValidationUtils: Invalid hash in Merkle proof at index ${i}: ${proofNode}`);
            aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'INVALID_MERKLE_PROOF_NODE', index: i });
            return false;
        }

        // Determine concatenation order based on node value (simple heuristic for example)
        // In a real Merkle tree, the order depends on the tree construction (e.g., lexical sort of leaves).
        if (computedHash < proofNode) {
            computedHash = hashData(computedHash + proofNode);
        } else {
            computedHash = hashData(proofNode + computedHash);
        }
    }

    const isValid = (computedHash.toLowerCase() === rootHash.toLowerCase());
    if (!isValid) {
        console.warn(`ValidationUtils: Merkle proof failed. Computed root: ${computedHash}, Expected root: ${rootHash}`);
        aiNetworkOrchestrator.notifyPRAIOS('VALIDATION_ERROR', { type: 'MERKLE_PROOF_FAIL', computed: computedHash, expected: rootHash });
    }
    return isValid;
                        }
