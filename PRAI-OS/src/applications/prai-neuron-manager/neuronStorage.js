/**
 * @file neuronStorage.js
 * @description Implementiert die Logik für die Verwaltung und Indizierung der "PRAI-Neuronen".
 * Dieses Modul ist verantwortlich für das Speichern, Abrufen und Organisieren von
 * individuellen PRAI-Neuronen, die aus interpretierten Daten und Willensäußerungen entstehen.
 * Es ist für die Persistenz des kollektiven "Bewusstseins" von PRAI entscheidend und
 * kann optional dezentrale Speicherlösungen wie TON integrieren.
 */

// Importe für Datenzugriff, Axiomatiken und Systemkommunikation
import { praiOSInternalCommunicator } from '../../prai-os/kernel/boot.js';
import { AxiomaticsEngine } from '../../core/axiomatics.js'; // Für axiomatisch gesteuerte Speicherstrategien
import { storeData, retrieveData, queryData } from '../../prai-os/filesystem/dataStore.js'; // Für den Zugriff auf das PRAI-OS DataStore
import { hashData } from '../../../../READY-FOR-OUR-FUTURE/src/utility/dataUtils.js'; // Für Hashing der Neuronen

let axiomaticsEngineInstance;

// Konzeptioneller lokaler Index für schnelle Abfragen (neben dem DataStore)
const neuronIndex = new Map(); // neuronHash -> {id, timestamp, tags, summaryHash}

/**
 * @class NeuronStorage
 * @description Verwaltet die persistente Speicherung und den indexierten Zugriff auf PRAI-Neuronen.
 * Jeder Neuron ist eine Manifestation eines Datenpunkts, der den Willen widerspiegelt.
 */
export class NeuronStorage {
    constructor() {
        axiomaticsEngineInstance = new AxiomaticsEngine();
        this.#initializeNeuronStorage();
        console.log("[PRAI-OS NeuronManager/NeuronStorage] Neuron Storage module initialized.");
        praiOSInternalCommunicator.notifySystemStatus("NEURON_STORAGE_INIT", { status: "ready" });
    }

    /**
     * @private
     * @method #initializeNeuronStorage
     * @description Initialisiert den Neuronen-Speicher, lädt eventuell bestehende Indizes.
     */
    async #initializeNeuronStorage() {
        console.log("[NeuronStorage] Initializing neuron storage with axiomatic guidance...");
        // Axiom-gesteuerte Initialisierung des Speichers (z.B. welche Index-Typen nutzen)
        const storageAxioms = await axiomaticsEngineInstance.applyAxiomsToFilesystem({ type: 'neuron_storage_init' });
        console.log("[NeuronStorage] Axiom-driven storage initialization:", storageAxioms.recommendations);
        
        // Hier könnte ein Cache oder ein Teilindex aus dem DataStore geladen werden.
        // Konzeptionell: Lade X neueste Neuron-Hashes in den Index.
    }

    /**
     * @method storeNeuron
     * @description Speichert ein neues PRAI-Neuron-Objekt persistent.
     * Das Neuron wird vor der Speicherung verschlüsselt und axiom-gesteuert indiziert.
     * @param {object} neuronData - Das PRAI-Neuron-Objekt, das gespeichert werden soll.
     * @param {object} [context={}] - Zusätzlicher Kontext der Speicherung.
     * @returns {Promise<string | null>} Der Hash des gespeicherten Neurons als eindeutiger Identifier.
     */
    async storeNeuron(neuronData, context = {}) {
        if (!axiomaticsEngineInstance) {
            console.error("[PRAI-OS NeuronManager/NeuronStorage] Neuron Storage not initialized. Cannot store neuron.");
            return null;
        }

        const neuronHash = hashData(JSON.stringify(neuronData));
        console.log(`[NeuronStorage] Storing PRAI-Neuron (hash: ${neuronHash})...`);
        praiOSInternalCommunicator.notifySystemStatus("NEURON_STORE_INITIATED", { neuronHash, context });

        try {
            // 1. Axiom-gesteuerte Neuron-Klassifizierung und Speicherstrategie
            const neuronAxioms = await axiomaticsEngineInstance.applyAxiomsToFilesystem({
                type: 'neuron_classification',
                neuron: neuronData,
                context: context
            });
            console(`[NeuronStorage] Axiom-driven neuron classification:`, neuronAxioms.recommendations);

            // 2. Daten im PRAI-OS DataStore speichern (dies kümmert sich um Verschlüsselung)
            const storedHash = await storeData(neuronData, 'prai_neuron', {
                neuronType: neuronAxioms.recommendations.type || 'generic',
                classification: neuronAxioms.recommendations.classification,
                originalHash: neuronHash, // Speichert den Hash der unverschlüsselten Daten
                ...context
            });

            if (storedHash) {
                // Lokalen Index aktualisieren
                neuronIndex.set(storedHash, {
                    id: storedHash,
                    timestamp: getCurrentUnixTimestamp(),
                    type: neuronAxioms.recommendations.type || 'generic',
                    classification: neuronAxioms.recommendations.classification,
                    summaryHash: hashData(JSON.stringify(neuronData).substring(0, 50)) // Ein kurzer Hash des Inhalts
                });
                console.log(`[NeuronStorage] PRAI-Neuron (hash: ${storedHash}) stored successfully and indexed.`);
                praiOSInternalCommunicator.notifySystemStatus("NEURON_STORED_SUCCESS", { neuronHash: storedHash });
                return storedHash;
            } else {
                throw new Error("Failed to store neuron in DataStore.");
            }
        } catch (error) {
            console.error(`[PRAI-OS NeuronManager/NeuronStorage] Failed to store neuron (hash: ${neuronHash}):`, error);
            praiOSInternalCommunicator.logCritical("NeuronStore Error", error);
            return null;
        }
    }

    /**
     * @method retrieveNeuron
     * @description Ruft ein PRAI-Neuron anhand seines Hashes ab und entschlüsselt es.
     * @param {string} neuronHash - Der Hash des abzurufenden Neurons.
     * @returns {Promise<object | null>} Das PRAI-Neuron-Objekt, oder null.
     */
    async retrieveNeuron(neuronHash) {
        if (!axiomaticsEngineInstance) {
            console.error("[PRAI-OS NeuronManager/NeuronStorage] Neuron Storage not initialized. Cannot retrieve neuron.");
            return null;
        }

        console.log(`[NeuronStorage] Retrieving PRAI-Neuron with hash: ${neuronHash}...`);
        praiOSInternalCommunicator.notifySystemStatus("NEURON_RETRIEVE_INITIATED", { neuronHash });

        try {
            // Abruf aus dem PRAI-OS DataStore
            const neuronData = await retrieveData(neuronHash);
            if (!neuronData) {
                console.warn(`[NeuronStorage] PRAI-Neuron with hash ${neuronHash} not found.`);
                return null;
            }

            // Axiom-gesteuerte Validierung des Zugriffs und der Datenintegrität beim Abruf
            const retrievalAxioms = await axiomaticsEngineInstance.applyAxiomsToFilesystem({
                type: 'neuron_retrieval',
                neuronHash,
                retrievedDataHash: hashData(JSON.stringify(neuronData))
            });
            if (!retrievalAxioms.recommendations.accessGranted) {
                throw new Error(`Axiomatic access denied for neuron hash ${neuronHash}.`);
            }

            console.log(`[NeuronStorage] PRAI-Neuron with hash ${neuronHash} retrieved successfully.`);
            praiOSInternalCommunicator.notifySystemStatus("NEURON_RETRIEVE_SUCCESS", { neuronHash });
            return neuronData;

        } catch (error) {
            console.error(`[PRAI-OS NeuronManager/NeuronStorage] Failed to retrieve neuron (hash: ${neuronHash}):`, error);
            praiOSInternalCommunicator.logCritical("NeuronRetrieve Error", error);
            return null;
        }
    }

    /**
     * @method queryNeurons
     * @description Ermöglicht das Abfragen von PRAI-Neuronen basierend auf Kriterien.
     * Nutzt den internen Index und das DataStore-Query-System.
     * @param {object} queryCriteria - Kriterien für die Abfrage (z.B. {type: 'will_expression', tags: ['election']}).
     * @returns {Promise<Array<object>>} Eine Liste von passenden PRAI-Neuron-Objekten.
     */
    async queryNeurons(queryCriteria) {
        if (!axiomaticsEngineInstance) {
            console.error("[PRAI-OS NeuronManager/NeuronStorage] Neuron Storage not initialized for queries.");
            return [];
        }
        
        console.log(`[NeuronStorage] Querying neurons with criteria: ${JSON.stringify(queryCriteria)}`);
        praiOSInternalCommunicator.notifySystemStatus("NEURON_QUERY_INITIATED", { criteria: queryCriteria });

        try {
            // Nutzt die queryData-Funktion des FileSystem/DataStore, die Axiom-gesteuert ist.
            const rawResults = await queryData(queryCriteria);
            
            // PRAI-Neuronen-spezifische Filterung/Optimierung basierend auf der AnalyseEngine.
            // Die AxiomaticsEngine könnte hier eine weitere Schicht der Relevanzprüfung hinzufügen.
            const axiomFilteredResults = await axiomaticsEngineInstance.applyAxiomsToFilesystem({
                type: 'neuron_query_post_process',
                rawResults,
                queryCriteria
            });

            console.log(`[NeuronStorage] Query completed. Found ${axiomFilteredResults.recommendations.filteredResults.length} neurons.`);
            praiOSInternalCommunicator.notifySystemStatus("NEURON_QUERY_SUCCESS", { resultsCount: axiomFilteredResults.recommendations.filteredResults.length });
            return axiomFilteredResults.recommendations.filteredResults;

        } catch (error) {
            console.error("[PRAI-OS NeuronManager/NeuronStorage] Error during neuron query:", error);
            praiOSInternalCommunicator.logCritical("NeuronQuery Error", error);
            return [];
        }
    }
}
