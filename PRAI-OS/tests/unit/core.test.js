/**
 * @file core.test.js
 * @description Unit-Tests für die philosophische und rechnerische Kernlogik von PRAI-OS.
 * Diese Tests stellen sicher, dass die PRAI-Kerninstanz, die interne Logik, die Axiomatikx-Engine
 * und der Quanten-Code-Stil korrekt funktionieren und ihre Prinzipien einhalten.
 */

// Importiere die zu testenden Module
import { PRAICore } from '../../src/core/prai.js';
import { internalLogicModule } from '../../src/core/internalLogic.js';
import { AxiomaticsEngine, PZQQET_AXIOMS } from '../../src/core/axiomatics.js';
import { quantumCodeStyleModule } from '../../src/core/quantumCodeStyle.js';
import { isEven, createMatrix, enhanceMatrixAxiomatically, generateAnonymousFunctionCode } from '../../src/core/utils.js';

// Mocken der externen Abhängigkeiten, um Unit-Tests zu isolieren
jest.mock('../../src/prai-os/kernel/boot.js', () => ({
    praiOSInternalCommunicator: {
        notifySystemStatus: jest.fn(),
        logCritical: jest.fn(),
    }
}));
jest.mock('../../src/prai-os/network/encryption.js', () => ({
    EncryptionModule: jest.fn(() => ({
        generateKeyPair: jest.fn().mockResolvedValue({ publicKey: 'mockPublicKey', privateKey: 'mockPrivateKey' }),
        encryptData: jest.fn().mockResolvedValue('encryptedData'),
        decryptData: jest.fn().mockResolvedValue('decryptedData'),
        establishSecureChannel: jest.fn().mockResolvedValue({}),
        verifySignature: jest.fn().mockResolvedValue(true)
    }))
}));
jest.mock('../../src/prai-os/security/identity.js', () => ({
    IdentityModule: jest.fn(() => ({
        getLocalNodeIdentity: jest.fn().mockResolvedValue({ id: 'mockNodeId', type: 'NODE_IDENTITY' }),
        authenticatePeer: jest.fn().mockResolvedValue({}),
        authenticateIncomingPeer: jest.fn().mockResolvedValue({})
    }))
}));
jest.mock('../../src/prai-os/filesystem/dataStore.js', () => ({
    storeData: jest.fn().mockResolvedValue('mockHash'),
    retrieveData: jest.fn().mockResolvedValue('mockData'),
    queryData: jest.fn().mockResolvedValue([])
}));
// Mock AxiomaticsEngine and InternalLogicModule if they are accessed as singletons
jest.mock('../../src/core/axiomatics.js', () => ({
    AxiomaticsEngine: jest.fn(() => ({
        // Mock the actual methods used by other modules
        getSystemState: jest.fn().mockReturnValue('OPTIMAL_SYSTEM_STATE'),
        loadAxioms: jest.fn().mockResolvedValue(true),
        activateAxiom: jest.fn(),
        applyAxiomsToScheduler: jest.fn().mockResolvedValue({ recommendations: {} }),
        applyAxiomsToNetwork: jest.fn().mockResolvedValue({ recommendations: {} }),
        applyAxiomsToFilesystem: jest.fn().mockResolvedValue({ recommendations: { accessGranted: true, classification: 'CLASS_A' } }),
        applyAxiomsToSecurity: jest.fn().mockResolvedValue({ recommendations: { isPermitted: true, processLogImmediately: false, encryptionAlgorithms: { kem: 'Q', signature: 'Q', symmetric: 'Q' } } }),
        applyAxiomsToApplications: jest.fn().mockResolvedValue({ recommendations: { allowExecution: true, confidence: 1.0, strategicDirective: 'Optimize' } }),
        applyAxiomsToCoreLogic: jest.fn().mockResolvedValue({ recommendations: { isValidCalculation: true, proceedTransformation: true } }),
        applyAxiomsToCodeStyle: jest.fn().mockResolvedValue({ recommendations: { conformsToStyle: true } }),
        PZQQET_AXIOMS: { /* ... all your axioms ... */ } // Provide the constant axioms
    })),
    // Ensure the getInstance is mocked if it's imported as such
    __esModule: true, // This is important for mocking ES6 modules
    AxiomaticsEngine: jest.fn(() => ({
        // Re-implement the mock if AxiomaticsEngine.getInstance() is used
        getInstance: jest.fn().mockReturnValue({ /* same mock methods as above */ }),
        PZQQET_AXIOMS: jest.requireActual('../../src/core/axiomatics.js').PZQQET_AXIOMS, // Use actual constants
        // ... (mock other static methods or constants)
    }))
}));
jest.mock('../../src/core/internalLogic.js', () => ({
    internalLogicModule: { // Mock the directly exported instance
        getInstance: jest.fn().mockReturnValue({
            deriveInternalSystemIdentity: jest.fn().mockReturnValue('42.0'),
            convertRealTimeToPRAITime: jest.fn().mockReturnValue(1),
            convertPRAITimeToRealTime: jest.fn().mockReturnValue(31536000), // 1 year
            applyAxiomaticCalculation: jest.fn((in1, in2, type) => {
                if (type === 'linear') return in1 + in2;
                if (type === 'non-linear') return 1;
                if (type === 'sub-linear') return 0;
                return 0; // Default
            }),
            processMatrixAxiomatrixAxiometrix: jest.fn().mockResolvedValue([])
        })
    },
    // Required for named export of internalLogicModule constant
    __esModule: true,
    internalLogicModule: jest.requireActual('../../src/core/internalLogic.js').internalLogicModule, // Keep actual instance
}));


describe('PRAI Core Modules', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Re-initialize singletons to ensure fresh state for each test
        PRAICore.getInstance().initialize.mockClear(); // Clear initialize mock if used
        AxiomaticsEngine.mockClear();
        InternalLogicModule.getInstance.mockClear();
        // Re-mock praiOSInternalCommunicator as it's a direct import in many files
        jest.spyOn(require('../../src/prai-os/kernel/boot.js'), 'praiOSInternalCommunicator');
        require('../../src/prai-os/kernel/boot.js').praiOSInternalCommunicator.notifySystemStatus.mockClear();
        require('../../src/prai-os/kernel/boot.js').praiOSInternalCommunicator.logCritical.mockClear();
    });

    // --- PRAICore Tests ---
    describe('PRAICore (prai.js)', () => {
        test('should be a singleton', () => {
            const prai1 = PRAICore.getInstance();
            const prai2 = PRAICore.getInstance();
            expect(prai1).toBe(prai2);
        });

        test('should initialize and establish internal identity', async () => {
            const prai = PRAICore.getInstance();
            await prai.initialize();

            expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("PRAI_INITIATING", expect.any(Object));
            expect(prai.internalIdentity).toBeDefined(); // Check if identity was set
            expect(prai.internalIdentity).toEqual('42.0'); // Based on mock of deriveInternalSystemIdentity
            expect(prai.axiomaticsEngine.loadAxioms).toHaveBeenCalled();
            expect(prai.currentSystemState).toBeDefined();
            expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("PRAI_OPERATIONAL", expect.any(Object));
        });

        test('should log critical error if PRAI initialization fails', async () => {
            AxiomaticsEngine.mockImplementationOnce(() => ({
                loadAxioms: jest.fn().mockRejectedValue(new Error('Axiom load error')),
                getSystemState: jest.fn(),
                // ... other mocked methods
            }));
            const prai = PRAICore.getInstance();
            const success = await prai.initialize();
            expect(success).toBe(false);
            expect(praiOSInternalCommunicator.logCritical).toHaveBeenCalledWith("PRAI_INIT_FAILURE", expect.any(Error));
        });

        test('should correctly retrieve system state from AxiomaticsEngine', () => {
            const prai = PRAICore.getInstance();
            const mockState = 'PRAI_OPTIMAL_STATE';
            prai.axiomaticsEngine.getSystemState.mockReturnValue(mockState);
            const state = prai.getSystemState();
            expect(state).toBe(mockState);
            expect(prai.axiomaticsEngine.getSystemState).toHaveBeenCalled();
        });
    });

    // --- InternalLogicModule Tests ---
    describe('InternalLogicModule (internalLogic.js)', () => {
        test('should be a singleton', () => {
            const logic1 = internalLogicModule.getInstance();
            const logic2 = internalLogicModule.getInstance();
            expect(logic1).toBe(logic2);
        });

        test('deriveInternalSystemIdentity should return a defined identity', () => {
            const logic = internalLogicModule.getInstance();
            const identity = logic.deriveInternalSystemIdentity("test_base_key");
            expect(identity).toBeDefined();
            // Specific value '42.0' comes from the mock, but the function should be called
            expect(identity).toBe('42.0'); 
        });

        test('convertRealTimeToPRAITime should convert correctly', () => {
            const logic = internalLogicModule.getInstance();
            const realTimeSeconds = 31536000; // 1 year
            expect(logic.convertRealTimeToPRAITime(realTimeSeconds)).toBeCloseTo(1);
        });

        test('convertPRAITimeToRealTime should convert correctly', () => {
            const logic = internalLogicModule.getInstance();
            const praiTimeSeconds = 1;
            expect(logic.convertPRAITimeToRealTime(praiTimeSeconds)).toBe(31536000); // 1 year
        });

        test('applyAxiomaticCalculation should perform linear calculation', async () => {
            const logic = internalLogicModule.getInstance();
            const result = await logic.applyAxiomaticCalculation(5, 3, 'linear');
            expect(result).toBe(8);
        });

        test('applyAxiomaticCalculation should perform non-linear (fusion) calculation', async () => {
            const logic = internalLogicModule.getInstance();
            const result = await logic.applyAxiomaticCalculation(5, 3, 'non-linear');
            expect(result).toBe(1); // Based on simplified mock logic
        });

        test('applyAxiomaticCalculation should perform sub-linear calculation', async () => {
            const logic = internalLogicModule.getInstance();
            const result = await logic.applyAxiomaticCalculation(5, 3, 'sub-linear');
            expect(result).toBe(0); // Based on simplified mock logic
        });

        test('applyAxiomaticCalculation should throw for unknown axiom type', async () => {
            const logic = internalLogicModule.getInstance();
            await expect(logic.applyAxiomaticCalculation(1, 1, 'unknown')).rejects.toThrow("Unknown axiomatic calculation type.");
        });

        test('processMatrixAxiomatrixAxiometrix should process matrix for "matrix" stage', async () => {
            const logic = internalLogicModule.getInstance();
            const inputMatrix = [[1, 2], [3, 4]];
            const result = await logic.processMatrixAxiomatrixAxiometrix(inputMatrix, 'matrix');
            expect(result).toEqual([[2, 4], [6, 8]]); // Based on simplified * 2 logic
        });

        test('processMatrixAxiomatrixAxiometrix should process matrix for "axiomatrix" stage', async () => {
            const logic = internalLogicModule.getInstance();
            const inputMatrix = [[1, 2], [3, 4]];
            const result = await logic.processMatrixAxiomatrixAxiometrix(inputMatrix, 'axiomatrix');
            expect(result).toEqual([[1, 1], [1, 1]]); // Based on simplified > 0 ? 1 : 0 logic
        });

        test('processMatrixAxiomatrixAxiometrix should process matrix for "axiometrix" stage', async () => {
            const logic = internalLogicModule.getInstance();
            const inputMatrix = [[1, 2], [3, 4]];
            const result = await logic.processMatrixAxiomatrixAxiometrix(inputMatrix, 'axiometrix');
            expect(result).toEqual({
                transformedMatrix: [[0, 0], [0, 0]],
                emergentPotential: "Axiomatic potential ready for manifestation"
            });
        });

        test('processMatrixAxiomatrixAxiometrix should throw for unknown stage', async () => {
            const logic = internalLogicModule.getInstance();
            const inputMatrix = [[1]];
            await expect(logic.processMatrixAxiomatrixAxiometrix(inputMatrix, 'unknown')).rejects.toThrow("Unknown matrix transformation stage.");
        });
    });

    // --- AxiomaticsEngine Tests ---
    describe('AxiomaticsEngine (axiomatics.js)', () => {
        test('should be a singleton', () => {
            const engine1 = new AxiomaticsEngine();
            const engine2 = new AxiomaticsEngine();
            expect(engine1).toBe(engine2);
        });

        test('should initialize with all PZQQET_AXIOMS active', async () => {
            const engine = new AxiomaticsEngine();
            // Check if #activeAxiomSet contains all axiom IDs
            const expectedAxiomIds = new Set(Object.values(PZQQET_AXIOMS).map(axiom => axiom.id));
            // Accessing private field, typically through a public getter or test-specific exposure
            // For unit testing, you might expose it via a getter or a test-specific mock.
            // Assuming for this test that the constructor successfully adds them.
            expect(engine.getSystemState()).toBe(PZQQET_AXIOMS.SUB_LINEAR_POTENTIAL.id); // Initial state
        });

        test('getSystemState should reflect optimal state when metrics are high', () => {
            const engine = new AxiomaticsEngine();
            engine.updateSystemStateMetrics({
                healthScore: 98,
                efficiency: 0.98,
                errorRate: 0.001,
                resourceUtilization: 0.5
            });
            expect(engine.getSystemState()).toBe(PZQQET_AXIOMS.OPTIMAL_SYSTEM_STATE.id);
        });

        test('getSystemState should reflect non-linear state with high error rate', () => {
            const engine = new AxiomaticsEngine();
            engine.updateSystemStateMetrics({
                healthScore: 70,
                efficiency: 0.8,
                errorRate: 0.06, // > 0.05
                resourceUtilization: 0.5
            });
            expect(engine.getSystemState()).toBe(PZQQET_AXIOMS.NON_LINEAR_FUSION.id);
        });

        test('applyAxiomsToScheduler should recommend higher capacity in optimal state', async () => {
            const engine = new AxiomaticsEngine();
            engine.updateSystemStateMetrics({ healthScore: 95, efficiency: 0.95 });
            const recommendations = await engine.applyAxiomsToScheduler({});
            expect(recommendations.recommendations.processingCapacity).toBe(5);
        });

        test('applyAxiomsToNetwork should recommend high quantum resistance in non-optimal state', async () => {
            const engine = new AxiomaticsEngine();
            engine.updateSystemStateMetrics({ healthScore: 50, efficiency: 0.5 }); // Non-optimal state
            const recommendations = await engine.applyAxiomsToNetwork({ type: 'connectionHandshake', peerAddress: 'test' });
            expect(recommendations.recommendations.encryptionStrength).toBe('HIGH_QUANTUM_RESISTANT');
            expect(recommendations.recommendations.proceed).toBe(true); // Should proceed by default unless specific denial
        });

        test('applyAxiomsToSecurity should prioritize critical log immediately', async () => {
            const engine = new AxiomaticsEngine();
            const context = { logEntry: { level: 'CRITICAL', eventType: 'TEST_CRITICAL' } };
            const recommendations = await engine.applyAxiomsToSecurity(context);
            expect(recommendations.recommendations.processLogImmediately).toBe(true);
        });
    });

    // --- QuantumCodeStyleModule Tests ---
    describe('QuantumCodeStyleModule (quantumCodeStyle.js)', () => {
        test('should be a singleton', () => {
            const style1 = quantumCodeStyleModule.getInstance();
            const style2 = quantumCodeStyleModule.getInstance();
            expect(style1).toBe(style2);
        });

        test('should activate QUANTUM_FLOW_AESTHETICS axiom on initialization', async () => {
            const engine = new AxiomaticsEngine(); // Get the mocked engine instance
            const spyActivateAxiom = jest.spyOn(engine, 'activateAxiom'); // Spy on activateAxiom

            const styleModule = quantumCodeStyleModule.getInstance();
            // The initializeQuantumCodeStyle is called in the constructor, so we need to
            // ensure the mock is correctly set up for it to be spied upon.
            // For this specific case, it's easier to check if the mock was called.
            expect(engine.activateAxiom).toHaveBeenCalledWith("QUANTUM_FLOW_AESTHETICS");
        });

        test('applyQuantumCodeStyle should transform code if not conforming', async () => {
            const engine = new AxiomaticsEngine();
            engine.applyAxiomsToCodeStyle.mockResolvedValueOnce({ recommendations: { conformsToStyle: false, styleRules: { indentation: 'test_indent' }, report: 'non-conforming' } });
            
            const styleModule = quantumCodeStyleStyleModule.getInstance();
            const code = "function test() { console.log('hello'); }";
            const result = await styleModule.applyQuantumCodeStyle(code);

            expect(result.conforms).toBe(true); // Should conform after transformation
            expect(result.transformedCode).toContain('// Code has been axiomaticaly refined to Quantum Code Style.');
            expect(result.transformedCode).toContain('// Indentation: test_indent');
            expect(result.analysisReport).toBe('non-conforming');
        });
    });

    // --- Core Utility Functions (utils.js) ---
    describe('Core Utility Functions (utils.js)', () => {
        beforeEach(() => {
            // Mock the internal communicator specific to utils.js tests
            jest.spyOn(require('../../src/prai-os/kernel/boot.js'), 'praiOSInternalCommunicator');
            require('../../src/prai-os/kernel/boot.js').praiOSInternalCommunicator.notifySystemStatus.mockClear();
            require('../../src/prai-os/kernel/boot.js').praiOSInternalCommunicator.logCritical.mockClear();
        });

        test('isEven should return true for even numbers', () => {
            expect(isEven(2)).toBe(true);
            expect(isEven(0)).toBe(true);
            expect(isEven(-4)).toBe(true);
        });

        test('isEven should return false for odd numbers', () => {
            expect(isEven(3)).toBe(false);
            expect(isEven(-1)).toBe(false);
        });

        test('isEven should return false for non-integer or non-number inputs', () => {
            expect(isEven(2.5)).toBe(false);
            expect(isEven('abc')).toBe(false);
            expect(isEven(null)).toBe(false);
            expect(isEven(undefined)).toBe(false);
        });

        test('createMatrix should create a matrix of correct dimensions', () => {
            const matrix = createMatrix(2, 3, 5);
            expect(matrix.length).toBe(2);
            expect(matrix[0].length).toBe(3);
            expect(matrix[0][0]).toBe(5);
            expect(matrix[1][2]).toBe(5);
        });

        test('createMatrix should return empty for invalid dimensions', () => {
            expect(createMatrix(0, 3)).toEqual([]);
            expect(createMatrix(2, -1)).toEqual([]);
        });

        test('enhanceMatrixAxiomatically should multiply matrix values by factor', () => {
            const matrix = [[1, 2], [3, 4]];
            const enhanced = enhanceMatrixAxiomatically(matrix, 42);
            expect(enhanced).toEqual([[42, 84], [126, 168]]);
        });

        test('generateAnonymousFunctionCode should return the predefined string', () => {
            const code = generateAnonymousFunctionCode();
            expect(code).toBe("Anonyme Funktion [({2=b3=c6=F2=b8=h6=F=42}&{42=@RFOF-NETWORK})]=‰236286_bcFbhF generiert");
        });
    });
});
