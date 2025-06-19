/**
 * @file timeUtils.js
 * @description Provides a set of utility functions for time-related operations,
 * including conversions, formatting, and timestamp management, crucial for
 * network synchronization, event scheduling, and data validation.
 */

import { aiNetworkOrchestrator } from '../core/aiIntegration.js';

/**
 * @function getCurrentUnixTimestamp
 * @description Returns the current Unix timestamp in seconds.
 * This is the standard time format used across the RFOF-NETWORK for blockchain interactions.
 * @returns {number} The current Unix timestamp in seconds.
 */
export function getCurrentUnixTimestamp() {
    const timestamp = Math.floor(Date.now() / 1000);
    // console.log(`TimeUtils: Current Unix Timestamp: ${timestamp}`);
    return timestamp;
}

/**
 * @function unixTimestampToDate
 * @description Converts a Unix timestamp (in seconds) to a JavaScript Date object.
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @returns {Date} A Date object representing the timestamp.
 */
export function unixTimestampToDate(unixTimestamp) {
    if (typeof unixTimestamp !== 'number' || isNaN(unixTimestamp)) {
        console.error('TimeUtils: Invalid Unix timestamp provided for conversion to Date.');
        aiNetworkOrchestrator.notifyPRAIOS('TIME_UTILS_ERROR', { type: 'INVALID_TIMESTAMP_TO_DATE', timestamp: unixTimestamp });
        return new Date(0); // Return epoch start or throw error based on strictness
    }
    return new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
}

/**
 * @function dateToUnixTimestamp
 * @description Converts a JavaScript Date object to a Unix timestamp (in seconds).
 * @param {Date} date - The Date object to convert.
 * @returns {number} The Unix timestamp in seconds.
 */
export function dateToUnixTimestamp(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error('TimeUtils: Invalid Date object provided for conversion to Unix timestamp.');
        aiNetworkOrchestrator.notifyPRAIOS('TIME_UTILS_ERROR', { type: 'INVALID_DATE_TO_TIMESTAMP', date: date });
        return 0; // Return 0 or throw error
    }
    return Math.floor(date.getTime() / 1000);
}

/**
 * @function formatTimestamp
 * @description Formats a Unix timestamp into a human-readable string.
 * Uses `toLocaleDateString` and `toLocaleTimeString` for localization.
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @param {string} [locale='en-US'] - The locale string (e.g., 'en-US', 'de-DE').
 * @param {object} [options={}] - Options for Date.toLocaleString (e.g., { year: 'numeric', month: 'long' }).
 * @returns {string} The formatted date and time string.
 */
export function formatTimestamp(unixTimestamp, locale = 'en-US', options = {}) {
    const date = unixTimestampToDate(unixTimestamp);
    try {
        return date.toLocaleString(locale, options);
    } catch (error) {
        console.error(`TimeUtils: Error formatting timestamp ${unixTimestamp} for locale ${locale}:`, error);
        aiNetworkOrchestrator.notifyPRAIOS('TIME_UTILS_ERROR', { type: 'FORMATTING_ERROR', timestamp: unixTimestamp, locale, error: error.message });
        return date.toISOString(); // Fallback to ISO string
    }
}

/**
 * @function sleep
 * @description Pauses execution for a specified number of milliseconds.
 * Useful for introducing delays in asynchronous operations.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
export async function sleep(ms) {
    if (typeof ms !== 'number' || ms < 0 || isNaN(ms)) {
        console.warn('TimeUtils: Invalid sleep duration provided. Skipping sleep.');
        return;
    }
    // console.log(`TimeUtils: Sleeping for ${ms}ms...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @function calculateTimeDifference
 * @description Calculates the difference between two Unix timestamps in various units.
 * @param {number} timestamp1 - The first Unix timestamp (in seconds).
 * @param {number} timestamp2 - The second Unix timestamp (in seconds).
 * @param {'seconds'|'minutes'|'hours'|'days'} [unit='seconds'] - The unit for the difference.
 * @returns {number} The time difference in the specified unit.
 */
export function calculateTimeDifference(timestamp1, timestamp2, unit = 'seconds') {
    if (typeof timestamp1 !== 'number' || typeof timestamp2 !== 'number' || isNaN(timestamp1) || isNaN(timestamp2)) {
        console.error('TimeUtils: Invalid timestamps provided for difference calculation.');
        aiNetworkOrchestrator.notifyPRAIOS('TIME_UTILS_ERROR', { type: 'INVALID_TIMESTAMPS_FOR_DIFF', t1: timestamp1, t2: timestamp2 });
        return 0;
    }

    const diffSeconds = Math.abs(timestamp1 - timestamp2);

    switch (unit) {
        case 'seconds':
            return diffSeconds;
        case 'minutes':
            return diffSeconds / 60;
        case 'hours':
            return diffSeconds / 3600;
        case 'days':
            return diffSeconds / (3600 * 24);
        default:
            console.warn(`TimeUtils: Unknown unit '${unit}' for time difference. Falling back to 'seconds'.`);
            aiNetworkOrchestrator.notifyPRAIOS('TIME_UTILS_WARN', { type: 'UNKNOWN_TIME_UNIT', unit });
            return diffSeconds;
    }
}

/**
 * @function addTime
 * @description Adds a specified duration to a given Unix timestamp.
 * @param {number} unixTimestamp - The starting Unix timestamp in seconds.
 * @param {number} amount - The amount of time to add.
 * @param {'seconds'|'minutes'|'hours'|'days'} unit - The unit of the amount.
 * @returns {number} The new Unix timestamp in seconds.
 */
export function addTime(unixTimestamp, amount, unit) {
    if (typeof unixTimestamp !== 'number' || isNaN(unixTimestamp) || typeof amount !== 'number' || isNaN(amount) || amount < 0) {
        console.error('TimeUtils: Invalid input for addTime.');
        aiNetworkOrchestrator.notifyPRAIOS('TIME_UTILS_ERROR', { type: 'INVALID_INPUT_ADD_TIME', timestamp: unixTimestamp, amount, unit });
        return unixTimestamp;
    }

    let secondsToAdd;
    switch (unit) {
        case 'seconds':
            secondsToAdd = amount;
            break;
        case 'minutes':
            secondsToAdd = amount * 60;
            break;
        case 'hours':
            secondsToAdd = amount * 3600;
            break;
        case 'days':
            secondsToAdd = amount * 3600 * 24;
            break;
        default:
            console.warn(`TimeUtils: Unknown unit '${unit}' for addTime. Returning original timestamp.`);
            aiNetworkOrchestrator.notifyPRAIOS('TIME_UTILS_WARN', { type: 'UNKNOWN_TIME_UNIT_ADD', unit });
            return unixTimestamp;
    }
    return unixTimestamp + secondsToAdd;
}
