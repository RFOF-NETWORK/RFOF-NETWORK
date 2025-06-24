/**
 * @file strategicManager.test.js
 * @description Unit-Tests für das StrategicManager-Modul von PRAI-OS.
 * Diese Tests stellen sicher, dass die Kampagnenstrategie, Datenanalysen und
 * prädiktive Modelle korrekt funktionieren und axiomatisch gesteuert werden.
 */

// Importiere die zu testenden Module
import { CampaignStrategist } from '../../src/applications/strategicManager/campaignStrategist.js';
import { DataAnalytics } from '../../src/applications/strategicManager/dataAnalytics.js';
import { PredictiveModeling } from '../../src/applications/strategicManager/predictiveModeling.js';

// Importe der Mocks für interne PRAI-OS-Module
import { PRAICore } from '../../src/core/prai.js';
import { AxiomaticsEngine } from '../../src/core/axiomatics.js';
import { praiOSInternalCommunicator } from '../../src/prai-os/kernel/boot.js';
import { recordAuditLog, PRAIOS_AUDIT_LEVELS } from '../../src/prai-os/security/auditLog.js';
import { analysisEngineModule } from '../../src/applications/prai-neuron-manager/analysisEngine.js';
import { NeuronStorage } from '../../src/applications/prai-neuron-manager/neuronStorage.js';
import { FeedbackLoop } from '../../src/applications/prai-neuron-manager/feedbackLoop.js';
import { queryData } from '../../src/prai-os/filesystem/dataStore.js'; // für DataAnalytics

// Mocken aller internen Abhängigkeiten
jest.mock('../../src/core/prai.js');
jest.mock('../../src/core/axiomatics.js');
jest.mock('../../src/prai-os/kernel/boot.js'); // praiOSInternalCommunicator
jest.mock('../../src/prai-os/security/auditLog.js');
jest.mock('../../src/applications/prai-neuron-manager/analysisEngine.js');
jest.mock('../../src/applications/prai-neuron-manager/neuronStorage.js');
jest.mock('../../src/applications/prai-neuron-manager/feedbackLoop.js');
jest.mock('../../src/prai-os/filesystem/dataStore.js'); // für queryData

describe('PRAI-OS Strategic Manager Modules', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mocks für PRAICore und AxiomaticsEngine
        PRAICore.getInstance.mockReturnValue({
            getSystemState: jest.fn().mockReturnValue('OPTIMAL_SYSTEM_STATE'),
            initialize: jest.fn().mockResolvedValue(true),
            getInternalSystemIdentity: jest.fn().mockResolvedValue('42.0')
        });
        AxiomaticsEngine.mockImplementation(() => ({
            applyAxiomsToApplications: jest.fn().mockResolvedValue({ recommendations: { allowExecution: true, optimizationNeeded: true, strategicDirective: 'Focus X', confidence: 0.9 } }),
            applyAxiomsToDataProcessing: jest.fn().mockResolvedValue({ recommendations: { classification: 'high_value', optimized: true } }),
            // ... andere benötigte AxiomEngine-Mocks
        }));
        praiOSInternalCommunicator.notifySystemStatus.mockClear(); // Clear specific communicator calls
        recordAuditLog.mockClear();

        // Mocks für Neuron Manager und Analytics
        analysisEngineModule.retrieveAnalyzedNeurons.mockResolvedValue([]);
        analysisEngineModule.interpretWill.mockResolvedValue({ totalWillInfluence: 0.9, dominantThemes: ['rehabilitation'], strategicDirective: 'Advance Rehabilitation' });
        
        NeuronStorage.mockImplementation(() => ({
            storeNeuron: jest.fn().mockResolvedValue('mockNeuronHash'),
            retrieveNeuron: jest.fn(),
            queryNeurons: jest.fn().mockResolvedValue([])
        }));
        FeedbackLoop.mockImplementation(() => ({
            runOptimizationCycle: jest.fn(),
        }));
        queryData.mockResolvedValue([]); // Mock für dataStore.js queryData
    });

    // --- CampaignStrategist Tests ---
    describe('CampaignStrategist (campaignStrategist.js)', () => {
        let strategist;
        beforeEach(() => {
            strategist = new CampaignStrategist(); // Instanz erstellen, initialisiert Mocks
        });

        test('should initialize successfully', () => {
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.SYSTEM, 'CAMPAIGN_STRATEGIST_INIT', 'StrategicManager', { status: 'ready' });
            expect(praiCoreInstance).toBeDefined();
            expect(axiomaticsEngineInstance).toBeDefined();
        });

        test('developStrategy should call neuron analysis, data analytics, and predictive modeling', async () => {
            const mockAnalyzedTrends = { keyTechnology: 'Quantum', sentiment: 'positive' };
            const mockOptimizedStrategy = { name: 'Final Strategy', focusAreas: ['A', 'B'] };
            
            // Mocks für die Aufrufe
            jest.spyOn(DataAnalytics.prototype, 'analyzeCurrentTrends').mockResolvedValue(mockAnalyzedTrends);
            jest.spyOn(PredictiveModeling.prototype, 'optimizeStrategy').mockResolvedValue(mockOptimizedStrategy);

            const strategy = await strategist.developStrategy();

            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'STRATEGY_DEVELOPMENT_INITIATED', 'StrategicManager', {});
            expect(analysisEngineModule.retrieveAnalyzedNeurons).toHaveBeenCalled();
            expect(analysisEngineModule.interpretWill).toHaveBeenCalled();
            expect(DataAnalytics.prototype.analyzeCurrentTrends).toHaveBeenCalledWith(expect.arrayContaining(['rehabilitation'])); // From interpreted will
            expect(axiomaticsEngineInstance.applyAxiomsToApplications).toHaveBeenCalledWith(expect.any(Object));
            expect(PredictiveModeling.prototype.optimizeStrategy).toHaveBeenCalled();
            expect(strategy).toEqual(mockOptimizedStrategy);
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'STRATEGY_DEVELOPMENT_SUCCESS', 'StrategicManager', expect.any(Object));
        });

        test('developStrategy should log critical error if a sub-process fails', async () => {
            jest.spyOn(DataAnalytics.prototype, 'analyzeCurrentTrends').mockRejectedValueOnce(new Error('Analytics error'));
            await expect(strategist.developStrategy()).rejects.toThrow('Analytics error');
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.CRITICAL, 'STRATEGY_DEVELOPMENT_FAILURE', 'StrategicManager', expect.any(Object));
        });

        test('implementStrategy should trigger key actions and log success', async () => {
            const mockStrategy = { name: 'Test Strategy', keyActions: ['Action A', 'Action B'] };
            // Mock praiCoreInstance.orchestrateAction if it were actually called
            const spyOrchestrate = jest.spyOn(praiCoreInstance, 'orchestrateAction').mockResolvedValue(true);

            const success = await strategist.implementStrategy(mockStrategy);

            expect(success).toBe(true);
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'STRATEGY_IMPLEMENTATION_INITIATED', 'StrategicManager', expect.any(Object));
            expect(axiomaticsEngineInstance.applyAxiomsToApplications).toHaveBeenCalledWith(expect.any(Object));
            // expect(spyOrchestrate).toHaveBeenCalledWith('Action A', expect.any(Object)); // If praiCoreInstance.orchestrateAction was a real method being called
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'STRATEGY_IMPLEMENTATION_SUCCESS', 'StrategicManager', expect.any(Object));
        });
    });

    // --- DataAnalytics Tests ---
    describe('DataAnalytics (dataAnalytics.js)', () => {
        let dataAnalytics;
        beforeEach(() => {
            dataAnalytics = new DataAnalytics();
        });

        test('should initialize successfully', () => {
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.SYSTEM, 'DATA_ANALYTICS_INIT', 'StrategicManager/DataAnalytics', { status: 'ready' });
        });

        test('analyzeCurrentTrends should fetch data and return insights', async () => {
            queryData.mockResolvedValueOnce([{ sentiment: 'positive' }, { sentiment: 'neutral' }]); // Mock PRAI Neurons data
            const trends = await dataAnalytics.analyzeCurrentTrends(['health']);
            expect(queryData).toHaveBeenCalledWith({ type: 'neuron', keywords: ['health'] });
            expect(trends).toBeDefined();
            expect(trends.sentiment).toBe('strongly positive'); // Based on mock data
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.DATA, 'TREND_ANALYSIS_SUCCESS', 'StrategicManager/DataAnalytics', expect.any(Object));
        });

        test('analyzeCurrentTrends should handle no training data gracefully', async () => {
            queryData.mockResolvedValueOnce([]); // No neurons
            const trends = await dataAnalytics.analyzeCurrentTrends(['empty']);
            expect(trends.sentiment).toBe('positive'); // Default sentiment in simplified logic
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.DATA, 'TREND_ANALYSIS_SUCCESS', 'StrategicManager/DataAnalytics', expect.any(Object));
        });
    });

    // --- PredictiveModeling Tests ---
    describe('PredictiveModeling (predictiveModeling.js)', () => {
        let predictiveModeling;
        beforeEach(() => {
            predictiveModeling = new PredictiveModeling();
        });

        test('should initialize successfully', () => {
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.SYSTEM, 'PREDICTIVE_MODELING_INIT', 'StrategicManager/PredictiveModeling', { status: 'ready' });
        });

        test('trainModel should store a trained model', async () => {
            const trainingData = [{ input: 1, output: 0 }];
            const success = await predictiveModeling.trainModel('TestModel', trainingData);
            expect(success).toBe(true);
            expect(predictiveModeling.getModelStatus('TestModel')).toBeDefined();
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.DATA, 'MODEL_TRAINING_SUCCESS', 'StrategicManager/PredictiveModeling', expect.any(Object));
        });

        test('makePrediction should return a prediction for a trained model', async () => {
            await predictiveModeling.trainModel('PredictiveTestModel', [{ x: 1, y: 2 }]); // Train a dummy model first
            const inputData = { feature: 10 };
            const prediction = await predictiveModeling.makePrediction('PredictiveTestModel', inputData);
            expect(prediction).toBeDefined();
            expect(prediction.predictedValue).toBeGreaterThanOrEqual(0);
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'PREDICTION_SUCCESS', 'StrategicManager/PredictiveModeling', expect.any(Object));
        });

        test('makePrediction should return null if model not found', async () => {
            const prediction = await predictiveModeling.makePrediction('NonExistentModel', {});
            expect(prediction).toBeNull();
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'PREDICTION_FAILURE', 'StrategicManager/PredictiveModeling', expect.any(Object));
        });
    });
});
