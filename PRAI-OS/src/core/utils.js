/**
 * @file utils.js
 * @description Stellt allgemeine mathematische und logische Hilfsfunktionen für den
 * PRAI-OS-Kern bereit. Diese Funktionen sind universell einsetzbar und unterstützen
 * verschiedene Aspekte der Axiomatikx-Berechnungen und Datenverarbeitung.
 */

// Importe für systemweite Kommunikation (optional, falls Utilities Log-fähig sein sollen)
import { praiOSInternalCommunicator } from '../prai-os/kernel/boot.js';
import { AxiomaticsEngine } from './axiomatics.js'; // Für die Anwendung der PZQQET Axiomatikx auf Utility-Ebene

let axiomaticsEngineInstance;

/**
 * @function initializeCoreUtils
 * @description Initialisiert die Utility-Funktionen des PRAI-OS-Kerns.
 */
export function initializeCoreUtils() {
    axiomaticsEngineInstance = new AxiomaticsEngine(); // Kann für Axiom-Validierung von Inputs genutzt werden
    console.log("[PRAI-OS Utils] Core Utilities module initialized.");
    praiOSInternalCommunicator.notifySystemStatus("CORE_UTILS_INITIATED", { status: "OK" });
}

/**
 * @function isEven
 * @description Prüft, ob eine gegebene Zahl gerade ist.
 * Dies ist ein einfaches Beispiel für eine grundlegende mathematische Operation.
 * @param {number} num - Die zu prüfende Zahl.
 * @returns {boolean} True, wenn die Zahl gerade ist, sonst false.
 */
export function isEven(num) {
    if (typeof num !== 'number' || !Number.isInteger(num)) {
        console.warn("[PRAI-OS Utils] isEven: Input is not an integer. Returning false.");
        praiOSInternalCommunicator.notifySystemStatus("UTIL_WARNING", { func: "isEven", reason: "Non-integer input", value: num });
        return false;
    }
    return num % 2 === 0;
}

/**
 * @function createMatrix
 * @description Erstellt eine Matrix (Array von Arrays) mit einer bestimmten Füllwert.
 * Unterstützt die "Matrix Axiomatrix Axiometrix" Konzepte.
 * @param {number} rows - Anzahl der Zeilen.
 * @param {number} cols - Anzahl der Spalten.
 * @param {*} fillValue - Der Wert, mit dem die Matrix gefüllt werden soll.
 * @returns {Array<Array<any>>} Die erstellte Matrix.
 */
export function createMatrix(rows, cols, fillValue = 0) {
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
        console.error("[PRAI-OS Utils] createMatrix: Invalid dimensions. Returning empty matrix.");
        praiOSInternalCommunicator.notifySystemStatus("UTIL_ERROR", { func: "createMatrix", reason: "Invalid dimensions", rows, cols });
        return [];
    }
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(fillValue));
    console.log(`[PRAI-OS Utils] Created a ${rows}x${cols} matrix.`);
    return matrix;
}

/**
 * @function printMatrix
 * @description Gibt eine Matrix auf der Konsole aus.
 * @param {Array<Array<any>>} matrix - Die auszugebende Matrix.
 * @returns {void}
 */
export function printMatrix(matrix) {
    if (!Array.isArray(matrix) || !matrix.every(row => Array.isArray(row))) {
        console.warn("[PRAI-OS Utils] printMatrix: Input is not a valid matrix.");
        praiOSInternalCommunicator.notifySystemStatus("UTIL_WARNING", { func: "printMatrix", reason: "Invalid matrix input" });
        return;
    }
    console.log("[PRAI-OS Utils] Printing Matrix:");
    matrix.forEach(row => {
        console.log(row.join(" "));
    });
}

/**
 * @function enhanceMatrixAxiomatically
 * @description Verstärkt eine Matrix axiomatisch (konzeptuell).
 * Dies könnte eine einfache Multiplikation oder eine komplexere Transformation
 * basierend auf der Satoramy-Logik (42) oder PZQQET-Axiomen sein.
 * @param {Array<Array<number>>} matrix - Die zu verstärkende Matrix.
 * @param {number} factor - Der Verstärkungsfaktor (z.B. 42).
 * @returns {Array<Array<number>>} Die verstärkte Matrix.
 */
export function enhanceMatrixAxiomatically(matrix, factor = 42) {
    if (!Array.isArray(matrix) || !matrix.every(row => Array.isArray(row) && row.every(val => typeof val === 'number'))) {
        console.error("[PRAI-OS Utils] enhanceMatrixAxiomatically: Input is not a matrix of numbers.");
        praiOSInternalCommunicator.notifySystemStatus("UTIL_ERROR", { func: "enhanceMatrixAxiomatically", reason: "Invalid matrix input" });
        return matrix;
    }

    // Axiom-gesteuerte Validierung des Faktors oder der Transformation
    // const axiomCheck = axiomaticsEngineInstance.applyAxiomsToCoreLogic({ type: 'matrix_enhancement', matrix, factor });
    // if (!axiomCheck.recommendations.proceed) {
    //     console.warn("[PRAI-OS Utils] Axiomatic enhancement denied.");
    //     return matrix;
    // }

    const enhancedMatrix = matrix.map(row => row.map(val => val * factor));
    console.log(`[PRAI-OS Utils] Matrix axiomatically enhanced by factor ${factor}.`);
    return enhancedMatrix;
}

/**
 * @function generateAnonymousFunctionCode
 * @description Generiert konzeptionell den Code für eine anonyme Funktion.
 * Dies kann ein Platzhalter für Metaprogrammierung oder Code-Generierung sein,
 * die durch die "Code-Sprache der Kern-Intelligenz" (internalLogic) gesteuert wird.
 * @returns {string} Der generierte Code-String.
 */
export function generateAnonymousFunctionCode() {
    // Die generierte Zeichenkette aus deiner Beschreibung
    const generatedCode = "Anonyme Funktion [({2=b3=c6=F2=b8=h6=F=42}&{42=@RFOF-NETWORK})]=‰236286_bcFbhF generiert";
    console.log(`[PRAI-OS Utils] Anonymous function code generated: "${generatedCode}"`);
    praiOSInternalCommunicator.notifySystemStatus("CODE_GEN_EVENT", { type: "AnonymousFunction" });
    return generatedCode;
}

/**
 * @function validateGenericInput
 * @description Eine generische Funktion zur Validierung verschiedener Input-Typen.
 * Kann durch Axiome für spezifische Validierungsregeln erweitert werden.
 * @param {*} input - Der zu validierende Input.
 * @param {string} expectedType - Der erwartete Typ ('string', 'number', 'object', etc.).
 * @param {object} [validationRules={}] - Zusätzliche Validierungsregeln (z.B. minLength, maxValue).
 * @returns {boolean} True, wenn der Input gültig ist, sonst false.
 */
export function validateGenericInput(input, expectedType, validationRules = {}) {
    let isValid = false;
    switch (expectedType) {
        case 'string':
            isValid = typeof input === 'string' && (!validationRules.minLength || input.length >= validationRules.minLength);
            break;
        case 'number':
            isValid = typeof input === 'number' && !isNaN(input) && (!validationRules.minValue || input >= validationRules.minValue);
            break;
        case 'object':
            isValid = typeof input === 'object' && input !== null && !Array.isArray(input);
            break;
        default:
            isValid = true; // Unbekannter Typ, standardmäßig als gültig ansehen (oder false, je nach Strenge)
    }

    // Axiom-basierte Verfeinerung der Validierung
    // const axiomValidation = axiomaticsEngineInstance.applyAxiomsToCoreLogic({ type: 'input_validation', input, expectedType, validationRules });
    // if (!axiomValidation.recommendations.isValid) {
    //    isValid = false;
    //    praiOSInternalCommunicator.notifySystemStatus("UTIL_WARNING", { func: "validateGenericInput", reason: "Axiomatic validation failed", input, expectedType });
    // }

    return isValid;
}

// Exportiere Initialisierungsfunktion, falls notwendig, sonst sind alle Funktionen direkt nutzbar.
// initializeCoreUtils(); // Sollte beim Start des PRAI-OS einmal aufgerufen werden.
