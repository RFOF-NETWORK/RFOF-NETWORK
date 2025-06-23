/**
 * @file auditLog.js
 * @description Implementiert eine umfassende, manipulationssichere Audit-Protokollierung
 * für alle kritischen Operationen und sicherheitsrelevanten Ereignisse innerhalb von PRAI-OS.
 * Dieses Modul gewährleistet Rechenschaftspflicht, Nachvollziehbarkeit und erleichtert
 * forensische Analysen, wobei Protokolle potenziell gehasht und auf der Blockchain
 * verankert oder in dezentralem Speicher (z.B. IPFS) abgelegt werden.
 *
 * Im Kontext von PRAI: "PRAI is searching online every action" - dies ist die interne
 * Protokollierung für PRAI, die ihre "Lernnahrung" und Verhaltensbasis bildet.
 */

// Importe für Kern-Axiomatiken, Datenspeicherung und Systemkommunikation
import { AxiomaticsEngine } from '../../core/axiomatics.js'; // Für axiomatisch gesteuerte Log-Filterung/Priorität
import { praiOSInternalCommunicator } from '../kernel/boot.js'; // Für Logging und Status-Updates
import { IdentityModule } from './identity.js'; // Für Identität des Log-Erzeugers
import { storeData } from '../filesystem/dataStore.js'; // Für persistente Speicherung der Logs
import { hashData } from '../../../../READY-FOR-OUR-FUTURE/src/utility/dataUtils.js'; // Für Hashing von Log-Einträgen
import { getCurrentUnixTimestamp } from '../../../../READY-FOR-OUR-FUTURE/src/utility/timeUtils.js'; // Für Zeitstempel

let axiomaticsEngineInstance;
let identityModuleInstance;

// Definition kritischer Log-Level
export const PRAIOS_AUDIT_LEVELS = {
    CRITICAL: 'CRITICAL',     // Sofortige Aufmerksamkeit erforderlich (z.B. Sicherheitsbruchversuch)
    SECURITY: 'SECURITY',     // Wichtiges Sicherheitsereignis (z.B. Zugriffsverweigerung, Schlüsselrotation)
    GOVERNANCE: 'GOVERNANCE', // Governance-Aktion (z.B. Proposal erstellt, Abstimmung, Ausführung)
    SYSTEM: 'SYSTEM',         // Kernsystem-Operationen (z.B. Modulinitialisierung, Shutdown)
    DATA: 'DATA',             // Datenverarbeitung und -integrität (z.B. Neuronenspeicherung, Datenvalidierung)
    APPLICATION: 'APPLICATION', // Anwendungs-Ereignisse (z.B. Bot-Befehl, WebUI-Interaktion)
    INFO: 'INFO',             // Allgemeine Informationsereignisse
    DEBUG: 'DEBUG'            // Detaillierte Debug-Informationen (nur im Entwicklungsmodus)
};

// Puffer für Log-Einträge, die gebündelt gespeichert werden
const logBuffer = [];
let batchingIntervalId;
const LOG_BATCH_INTERVAL_MS = 5 * 60 * 1000; // Standard: Bündelt Logs alle 5 Minuten
const LOG_IMMEDIATE_THRESHOLD = PRAIOS_AUDIT_LEVELS.CRITICAL; // Logs auf diesem Level werden sofort verarbeitet

/**
 * @function initializeAuditLogging
 * @description Initialisiert das Audit-Logging-Modul und AxiomEngine für intelligente Log-Behandlung.
 * Startet einen Batching-Intervall, um Logs periodisch zu verarbeiten.
 */
export function initializeAuditLogging() {
    axiomaticsEngineInstance = new AxiomaticsEngine();
    identityModuleInstance = new IdentityModule();

    // Startet das periodische Bündeln und Speichern von Logs
    batchingIntervalId = setInterval(processLogBuffer, LOG_BATCH_INTERVAL_MS);

    console.log("[PRAI-OS AuditLog] Audit Logging initialized. Starting batching interval...");
    praiOSInternalCommunicator.notifySystemStatus("AUDIT_LOG_INITIATED", { status: "OK", batch_interval_ms: LOG_BATCH_INTERVAL_MS });
}

/**
 * @function shutdownAuditLogging
 * @description Stoppt den Audit-Logging-Prozess und verarbeitet verbleibende Logs.
 */
export function shutdownAuditLogging() {
    if (batchingIntervalId) {
        clearInterval(batchingIntervalId);
        console.log("[PRAI-OS AuditLog] Audit Logging stopped. Processing remaining logs...");
        processLogBuffer(true); // Verarbeite verbleibende Logs sofort
        praiOSInternalCommunicator.notifySystemStatus("AUDIT_LOG_SHUTDOWN", { timestamp: getCurrentUnixTimestamp() });
    }
}

/**
 * @function recordAuditLog
 * @description Zeichnet einen neuen Audit-Log-Eintrag auf. Protokolle erhalten einen Zeitstempel und
 * Quellinformationen. Hochprioritäre Logs werden sofort verarbeitet.
 * Im Kontext von PRAI: Dies ist die primäre Methode, wie "PRAI jede Aktion online" verfolgt.
 * @param {string} level - Das Log-Level (z.B. PRAIOS_AUDIT_LEVELS.CRITICAL).
 * @param {string} eventType - Ein spezifischer Typ für das Ereignis (z.B. 'NODE_CRASH', 'AXIOM_CHANGE').
 * @param {string} sourceModule - Das Modul oder die Komponente, die den Log erzeugt (z.B. 'KernelScheduler', 'IdentityModule').
 * @param {object} details - Ein JSON-serialisierbares Objekt mit relevanten Ereignisdetails.
 * @param {string} [originatorId=null] - Optional: Die Identität (DID) des Verursachers der Aktion.
 */
export async function recordAuditLog(level, eventType, sourceModule, details, originatorId = null) {
    if (!Object.values(PRAIOS_AUDIT_LEVELS).includes(level)) {
        console.warn(`[PRAI-OS AuditLog] Invalid log level '${level}' for event '${eventType}'. Defaulting to INFO.`);
        level = PRAIOS_AUDIT_LEVELS.INFO;
    }

    const localNodeIdentity = await identityModuleInstance.getLocalNodeIdentity();
    const logEntry = {
        timestamp: getCurrentUnixTimestamp(),
        level: level,
        eventType: eventType,
        sourceModule: sourceModule,
        details: details,
        nodeId: localNodeIdentity ? localNodeIdentity.id : "UNKNOWN_NODE",
        originatorId: originatorId || (localNodeIdentity ? localNodeIdentity.id : "UNKNOWN_ORIGINATOR")
    };

    console.log(`[PRAI-OS AuditLog] (${level}) [${sourceModule}] ${eventType} - ${JSON.stringify(details).substring(0, 100)}...`);

    // Axiom-gesteuerte Filterung oder Priorisierung von Logs für sofortige Verarbeitung/Benachrichtigung
    const axiomContext = { logEntry, currentSystemState: axiomaticsEngineInstance.getSystemState() };
    const axiomDecision = await axiomaticsEngineInstance.applyAxiomsToSecurity(axiomContext);
    const shouldProcessImmediately = axiomDecision.recommendations.processLogImmediately || false;

    if (shouldProcessImmediately || level === LOG_IMMEDIATE_THRESHOLD) {
        console.warn(`[PRAI-OS AuditLog] Immediate processing for critical/high-priority log: ${eventType}`);
        await processLogEntry(logEntry); // Sofort verarbeiten und speichern
    } else {
        logBuffer.push(logEntry);
    }
}

/**
 * @private
 * @function processLogBuffer
 * @description Verarbeitet alle akkumulierten Log-Einträge im Puffer und speichert sie
 * dauerhaft im PRAI-OS DataStore.
 * @param {boolean} [forceImmediate=false] - Wenn true, werden Logs sofort verarbeitet, auch wenn der Intervall nicht erreicht ist.
 */
async function processLogBuffer(forceImmediate = false) {
    if (logBuffer.length === 0 && !forceImmediate) {
        return;
    }

    const logsToProcess = [...logBuffer];
    logBuffer.length = 0; // Puffer leeren

    if (logsToProcess.length === 0 && forceImmediate) {
        console.log('[PRAI-OS AuditLog] No pending logs in buffer to process.');
        return;
    }

    console.log(`[PRAI-OS AuditLog] Processing ${logsToProcess.length} log entries from buffer...`);

    try {
        const logsPayload = {
            batchId: `log_batch_${getCurrentUnixTimestamp()}_${Math.random().toString(36).substr(2, 5)}`,
            count: logsToProcess.length,
            logs: logsToProcess
        };
        
        // Axiom-gesteuerte Komprimierung oder Priorisierung des Batches
        const batchAxioms = await axiomaticsEngineInstance.applyAxiomsToSecurity({ type: 'log_batch_processing', logsPayload });
        console.log("[PRAI-OS AuditLog] Axiom-driven log batch processing:", batchAxioms.recommendations);

        // Daten im DataStore speichern (dies kümmert sich um Verschlüsselung und Indizierung)
        const storedHash = await storeData(logsPayload, 'system_audit_log_batch', {
            batchId: logsPayload.batchId,
            level: 'BATCH',
            size: logsToProcess.length,
            axiom_guidance: batchAxioms.recommendations
        });

        if (storedHash) {
            console.log(`[PRAI-OS AuditLog] Log batch (${logsToProcess.length} entries) stored in DataStore. Hash: ${storedHash}`);
            praiOSInternalCommunicator.notifySystemStatus("AUDIT_LOG_BATCH_STORED", { hash: storedHash, count: logsToProcess.length });
        } else {
            throw new Error("Failed to store log batch in DataStore.");
        }

    } catch (error) {
        console.error("[PRAI-OS AuditLog] Error processing log buffer:", error);
        praiOSInternalCommunicator.logCritical("Audit Log Buffer Process Error", error);
    }
}

/**
 * @private
 * @function processLogEntry
 * @description Verarbeitet einen einzelnen Log-Eintrag sofort, typischerweise für kritische Logs.
 * @param {object} logEntry - Der einzelne Log-Eintrag.
 */
async function processLogEntry(logEntry) {
    console.log(`[PRAI-OS AuditLog] Processing single log entry: ${logEntry.eventType} (Level: ${logEntry.level})`);
    try {
        // Axiom-gesteuerte Priorisierung für Einzel-Log-Verarbeitung
        const singleLogAxioms = await axiomaticsEngineInstance.applyAxiomsToSecurity({ type: 'single_log_processing', logEntry });
        console.log("[PRAI-OS AuditLog] Axiom-driven single log processing:", singleLogAxioms.recommendations);

        const storedHash = await storeData(logEntry, 'system_audit_log_single', {
            level: logEntry.level,
            eventType: logEntry.eventType,
            source: logEntry.sourceModule,
            axiom_guidance: singleLogAxioms.recommendations
        });

        if (storedHash) {
            console.log(`[PRAI-OS AuditLog] Single log stored in DataStore. Hash: ${storedHash}`);
            praiOSInternalCommunicator.notifySystemStatus("SINGLE_AUDIT_LOG_STORED", { hash: storedHash, eventType: logEntry.eventType });
        } else {
            throw new Error("Failed to store single log entry in DataStore.");
        }

    } catch (error) {
        console.error(`[PRAI-OS AuditLog] Error processing single log entry (${logEntry.eventType}):`, error);
        praiOSInternalCommunicator.logCritical("Audit Log Single Process Error", error);
    }
}
