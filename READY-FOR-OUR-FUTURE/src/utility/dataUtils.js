/**
 * @file dataUtils.js
 * @description Provides a collection of utility functions for data manipulation,
 * hashing, encoding, and other common data operations across the RFOF-NETWORK.
 * This ensures consistency and reusability for core data processing tasks.
 */

import { ethers } from 'ethers';
import { aiNetworkOrchestrator } from '../core/aiIntegration.js';

/**
 * @function hashData
 * @description Computes the cryptographic hash (Keccak-256) of input data.
 * This is crucial for data integrity checks, unique identifiers, and blockchain interactions.
 * @param {string|Buffer|Uint8Array} data - The data to be hashed. Can be a string, Buffer, or Uint8Array.
 * @returns {string} The Keccak-256 hash as a hex string (e.g., '0x...').
 */
export function hashData(data) {
    try {
        let dataBuffer;
        if (typeof data === 'string') {
            dataBuffer = ethers.toUtf8Bytes(data);
        } else if (data instanceof Buffer) {
            dataBuffer = data;
        } else if (data instanceof Uint8Array) {
            dataBuffer = Buffer.from(data);
        } else {
            // Attempt to stringify objects for consistent hashing
            dataBuffer = ethers.toUtf8Bytes(JSON.stringify(data));
        }
        const hash = ethers.keccak256(dataBuffer);
        // console.log(`DataUtils: Hashed data (preview: ${dataBuffer.slice(0, 10).toString('hex')}...) to: ${hash.substring(0, 10)}...`);
        return hash;
    } catch (error) {
        console.error('DataUtils: Error hashing data:', error);
        aiNetworkOrchestrator.notifyPRAIOS('DATA_UTILS_HASH_ERROR', { error: error.message });
        throw new Error(`Failed to hash data: ${error.message}`);
    }
}

/**
 * @function toBuffer
 * @description Converts various data types (string, hex string, Uint8Array) into a Node.js Buffer.
 * @param {string|Uint8Array|Buffer} data - The input data. If it's a hex string (e.g., '0xabcd'), it's decoded.
 * @returns {Buffer} The converted Buffer.
 */
export function toBuffer(data) {
    if (data instanceof Buffer) {
        return data;
    }
    if (data instanceof Uint8Array) {
        return Buffer.from(data);
    }
    if (typeof data === 'string') {
        if (data.startsWith('0x')) { // Assume hex string
            return Buffer.from(data.substring(2), 'hex');
        } else { // Assume UTF-8 string
            return Buffer.from(data, 'utf8');
        }
    }
    // Attempt to JSON.stringify non-Buffer/Uint8Array objects
    if (typeof data === 'object' && data !== null) {
        return Buffer.from(JSON.stringify(data), 'utf8');
    }
    throw new Error('Unsupported data type for conversion to Buffer');
}

/**
 * @function toHex
 * @description Converts a Buffer or Uint8Array to a hexadecimal string, optionally with '0x' prefix.
 * @param {Buffer|Uint8Array} buffer - The input buffer.
 * @param {boolean} [addPrefix=true] - Whether to add the '0x' prefix.
 * @returns {string} The hexadecimal string representation.
 */
export function toHex(buffer, addPrefix = true) {
    if (!(buffer instanceof Buffer) && !(buffer instanceof Uint8Array)) {
        throw new Error('Input must be a Buffer or Uint8Array for hex conversion.');
    }
    const hex = Buffer.from(buffer).toString('hex');
    return addPrefix ? '0x' + hex : hex;
}

/**
 * @function encodeJSON
 * @description Safely converts a JavaScript object into a JSON string.
 * @param {object} obj - The object to encode.
 * @returns {string} The JSON string.
 */
export function encodeJSON(obj) {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.error('DataUtils: Error encoding JSON:', error);
        aiNetworkOrchestrator.notifyPRAIOS('DATA_UTILS_JSON_ENCODE_ERROR', { error: error.message });
        throw new Error(`Failed to encode JSON: ${error.message}`);
    }
}

/**
 * @function decodeJSON
 * @description Safely parses a JSON string into a JavaScript object.
 * @param {string} jsonString - The JSON string to decode.
 * @returns {object} The parsed JavaScript object.
 */
export function decodeJSON(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('DataUtils: Error decoding JSON:', error);
        aiNetworkOrchestrator.notifyPRAIOS('DATA_UTILS_JSON_DECODE_ERROR', { error: error.message, dataPreview: jsonString.substring(0, 50) });
        throw new Error(`Failed to decode JSON: ${error.message}`);
    }
}

/**
 * @function isValidEthAddress
 * @description Checks if a given string is a valid Ethereum address.
 * @param {string} address - The address string to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function isValidEthAddress(address) {
    try {
        ethers.getAddress(address); // This function will throw if the address is invalid
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * @function getTimestamp
 * @description Returns the current Unix timestamp in seconds.
 * @returns {number} Current Unix timestamp.
 */
export function getTimestamp() {
    return Math.floor(Date.now() / 1000);
}

/**
 * @function calculateEntropy
 * @description Calculates a basic measure of entropy for a given buffer,
 * indicating randomness or data complexity. (Simplified for example purposes).
 * @param {Buffer|Uint8Array} dataBuffer - The data buffer.
 * @returns {number} The calculated entropy score (higher is more random).
 */
export function calculateEntropy(dataBuffer) {
    if (!(dataBuffer instanceof Buffer) && !(dataBuffer instanceof Uint8Array)) {
        console.warn('DataUtils: calculateEntropy expects Buffer or Uint8Array input.');
        return 0;
    }

    const frequencies = {};
    for (let i = 0; i < dataBuffer.length; i++) {
        const byte = dataBuffer[i];
        frequencies[byte] = (frequencies[byte] || 0) + 1;
    }

    let entropy = 0;
    const totalBytes = dataBuffer.length;

    for (const byte in frequencies) {
        const probability = frequencies[byte] / totalBytes;
        entropy -= probability * Math.log2(probability);
    }

    return entropy;
}

/**
 * @function compactObject
 * @description Removes undefined, null, and empty string properties from an object recursively.
 * Useful for preparing data before hashing or serialization to ensure consistency.
 * @param {object} obj - The object to compact.
 * @returns {object} A new object with compact properties.
 */
export function compactObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => compactObject(item)).filter(item => item !== undefined);
    }

    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                continue;
            }
            if (typeof value === 'object') {
                const compactedValue = compactObject(value);
                if (Object.keys(compactedValue).length > 0 || !Array.isArray(value)) { // Keep empty arrays but not empty objects
                    newObj[key] = compactedValue;
                }
            } else {
                newObj[key] = value;
            }
        }
    }
    return newObj;
  }
