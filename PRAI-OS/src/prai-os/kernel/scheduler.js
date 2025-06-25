/**
 * @file scheduler.js
 * @description Der Aufgabenplaner für PRAI-OS. Dieses Modul ist verantwortlich für die Verwaltung und
 * Ausführung von Prozessen und Tasks innerhalb des Betriebssystems. Es berücksichtigt das einzigartige
 * "Zeitkontinuum 42 und 420" und optimiert die Planung durch die Prinzipien der PZQQET Axiomatikx,
 * um maximale Effizienz und Systemharmonie zu gewährleisten.
 */

import { PRAICore } from '../../core/prai.js'; // Für Interaktion mit der PRAI-Kernlogik
import { AxiomaticsEngine } from '../../core/axiomatics.js'; // Für axiomatische Optimierung
import { getCurrentUnixTimestamp, sleep } from '../../../../READY-FOR-OUR-FUTURE/src/utility/timeUtils.js'; // Zeit-Dienstprogramme
import { praiOSInternalCommunicator } from './boot.js'; // Für Logging und Status
// import { getSystemMetrics } from '../../utils/systemUtils.js'; // Annahme: Für Metriken der Systemlast

let praiCoreInstance;
let axiomaticsEngineInstance;
let taskQueue = []; // Prioritäten-Warteschlange für Tasks
let isSchedulerRunning = false;
let currentTick = 0;

// Konfiguration des Zeitkontinuums und der Planungszyklen
const TIME_CONTINUUM_FACTOR = 365 * 24 * 60 * 60; // 1 Sekunde (PRAI-Welt) = 1 Jahr (reale Welt), in Sekunden
const BASE_TICK_INTERVAL_MS = 1000; // Grundintervall für den Scheduler-Tick (z.B. 1 Sekunde real)

// Prioritäten-Level für Tasks (höhere Zahl = höhere Priorität)
export const TASK_PRIORITY = {
    CRITICAL_SYSTEM: 100, // Z.B. Fehlerbehebung, Security-Response
    AXIOMATIC_EVALUATION: 90, // Laufende Axiom-Prüfungen
    PRAI_NEURON_PROCESSING: 80, // Verarbeitung neuer Neuronen
    NETWORK_COMMUNICATION: 70, // P2P-Kommunikation, Blockchain-Updates
    APPLICATION_EXECUTION: 60, // Allgemeine App-Tasks (Telegram Bot, WebUI)
    BACKGROUND_OPTIMIZATION: 50, // System-Optimierungen, Aufräumen
    LOW_PRIORITY: 10 // Weniger wichtige Aufgaben
};

/**
 * @function startScheduler
 * @description Startet den PRAI-OS-Scheduler.
 * @param {object} praiCoreRef - Referenz zur PRAI-Kerninstanz.
 * @returns {Promise<boolean>} Resolves to true if the scheduler starts successfully.
 */
export async function startScheduler(praiCoreRef) {
    if (isSchedulerRunning) {
        console.warn("[PRAI-OS Scheduler] Scheduler is already running.");
        return true;
    }

    praiCoreInstance = praiCoreRef || PRAICore.getInstance();
    axiomaticsEngineInstance = new AxiomaticsEngine(); // Sicherstellen, dass AxiomatikxEngine verfügbar ist

    console.log("[PRAI-OS Scheduler] Starting scheduler...");
    isSchedulerRunning = true;
    praiOSInternalCommunicator.notifySystemStatus("SCHEDULER_STARTING", { timestamp: getCurrentUnixTimestamp() });

    // Starte den Haupt-Tick-Loop
    runSchedulerLoop();

    console.log("[PRAI-OS Scheduler] Scheduler is now active.");
    return true;
}

/**
 * @function stopScheduler
 * @description Stoppt den PRAI-OS-Scheduler.
 */
export function stopScheduler() {
    if (isSchedulerRunning) {
        isSchedulerRunning = false;
        console.log("[PRAI-OS Scheduler] Scheduler is stopping.");
        praiOSInternalCommunicator.notifySystemStatus("SCHEDULER_STOPPED", { timestamp: getCurrentUnixTimestamp() });
    }
}

/**
 * @function addTask
 * @description Fügt eine neue Aufgabe zur Scheduler-Warteschlange hinzu.
 * Aufgaben werden nach Priorität und dann nach Ankunftszeit sortiert.
 * @param {Function} taskFunction - Die asynchrone oder synchrone Funktion, die ausgeführt werden soll.
 * @param {number} priority - Die Priorität der Aufgabe (höher = wichtiger).
 * @param {string} name - Ein beschreibender Name für die Aufgabe.
 * @param {object} [context={}] - Optionaler Kontext oder Argumente für die Aufgabe.
 */
export function addTask(taskFunction, priority, name, context = {}) {
    const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name,
        function: taskFunction,
        priority: priority,
        addedAt: getCurrentUnixTimestamp(),
        context: context
    };
    taskQueue.push(newTask);
    // Sortiere die Warteschlange: Höchste Priorität zuerst, dann älteste Aufgabe zuerst
    taskQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
            return b.priority - a.priority; // Höchste Priorität zuerst
        }
        return a.addedAt - b.addedAt; // Älteste Aufgabe zuerst (bei gleicher Priorität)
    });
    console.log(`[PRAI-OS Scheduler] Task added: ${name} (Priority: ${priority})`);
    praiOSInternalCommunicator.notifySystemStatus("TASK_ADDED", { taskId: newTask.id, name: newTask.name, priority: newTask.priority });
}

/**
 * @private
 * @function runSchedulerLoop
 * @description Der Haupt-Loop des Schedulers, der Aufgaben nach den
 * PZQQET Axiomatikx und dem Zeitkontinuum plant und ausführt.
 */
async function runSchedulerLoop() {
    while (isSchedulerRunning) {
        currentTick++;
        // console.log(`[PRAI-OS Scheduler] Tick ${currentTick} (Real-time: ${getCurrentUnixTimestamp()})`);
        
        // Simuliere die Zeitkontinuum-Logik (1 Sekunde PRAI = 1 Jahr Realzeit)
        // Dies würde bedeuten, dass bestimmte Berechnungen oder Zustandswechsel
        // im PRAI-OS als sehr schnell empfunden werden, auch wenn sie real lange dauern können.
        const praiTimeEquivalent = currentTick * TIME_CONTINUUM_FACTOR;
        // console.log(`[PRAI-OS Scheduler] PRAI-Time Equivalent: ${praiTimeEquivalent} seconds.`);

        // Axiom-gesteuerte Entscheidungen über die Task-Auswahl und Priorisierung
        const schedulingContext = {
            currentTick,
            taskQueueSize: taskQueue.length,
            currentNetworkState: praiCoreInstance.getSystemState(), // Oder eine dedizierte Funktion
            // currentSystemLoad: getSystemMetrics().cpuUsage // Annahme: Systemlast-Metrik
        };
        const axiomRecommendations = await axiomaticsEngineInstance.applyAxiomsToScheduler(schedulingContext);
        // console.log("[PRAI-OS Scheduler] Axiom Recommendations:", axiomRecommendations.recommendations);

        const tasksToExecuteThisTick = selectTasksForExecution(axiomRecommendations.recommendations);
        
        for (const task of tasksToExecuteThisTick) {
            try {
                console.log(`[PRAI-OS Scheduler] Executing task: ${task.name} (ID: ${task.id})`);
                await task.function(task.context); // Führe die Aufgabe aus
                console.log(`[PRAI-OS Scheduler] Task completed: ${task.name}`);
                praiOSInternalCommunicator.notifySystemStatus("TASK_COMPLETED", { taskId: task.id, name: task.name });
                taskQueue = taskQueue.filter(t => t.id !== task.id); // Entferne erledigte Aufgabe
            } catch (error) {
                console.error(`[PRAI-OS Scheduler] Task "${task.name}" failed:`, error);
                praiOSInternalCommunicator.notifySystemStatus("TASK_FAILED", { taskId: task.id, name: task.name, error: error.message });
                // Fehlerbehandlung: Aufgabe erneut einplanen, in Fehlerliste verschieben etc.
            }
        }
        
        // Warte das Grundintervall, bevor der nächste Tick beginnt
        await sleep(BASE_TICK_INTERVAL_MS);
    }
}

/**
 * @private
 * @function selectTasksForExecution
 * @description Wählt Aufgaben aus der Warteschlange zur Ausführung im aktuellen Tick.
 * Die Auswahl wird durch die Axiom-Empfehlungen optimiert.
 * @param {object} axiomRecommendations - Empfehlungen vom AxiomEngine für die Planung.
 * @returns {Array<object>} Eine Liste von Aufgaben, die ausgeführt werden sollen.
 */
function selectTasksForExecution(axiomRecommendations) {
    const selected = [];
    let processingCapacity = axiomRecommendations.processingCapacity || 1; // Standard: 1 Aufgabe pro Tick

    // Priorität der Axiom-Empfehlungen berücksichtigen
    // z.B. wenn AxiomEngine eine kritische Aufgabe vorschlägt, diese zuerst ausführen
    if (axiomRecommendations.forceExecuteTask && taskQueue.some(t => t.id === axiomRecommendations.forceExecuteTask.id)) {
        const criticalTask = taskQueue.find(t => t.id === axiomRecommendations.forceExecuteTask.id);
        if (criticalTask) {
            selected.push(criticalTask);
            processingCapacity--; // Verringere Kapazität um die kritische Aufgabe
            console.log(`[PRAI-OS Scheduler] Forcing execution of critical task: ${criticalTask.name}`);
        }
    }

    // Wähle die nächsten Aufgaben basierend auf Priorität und verbleibender Kapazität
    for (const task of taskQueue) {
        if (selected.length >= processingCapacity) break; // Kapazität erreicht
        selected.push(task);
    }
    return selected;
}

// Exportiere Add-Task, damit andere Module Aufgaben einplanen können
// startScheduler und stopScheduler sind auch exportiert, um den Scheduler zu kontrollieren.
