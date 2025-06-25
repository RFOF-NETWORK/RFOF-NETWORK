/**
 * @file runtime.test.js
 * @description Unit-Tests für den Yggdrasil-Interpreter (runtime/interpreter.js).
 * Diese Tests stellen sicher, dass Yggdrasil-Code korrekt und axiomatisch konform
 * zur Laufzeit ausgeführt wird. Sie validieren die direkte Manifestation von Logik
 * durch den Interpreter, unter Berücksichtigung von PRAI und den Systemzuständen.
 */

// Importiere die zu testenden Laufzeit-Module
import { Interpreter } from '../runtime/interpreter.js';

// Importe der Mocks für interne PRAI-OS-Module
jest.mock('../../PRAI-OS/src/prai-os/kernel/boot.js', () => ({
    praiOSInternalCommunicator: { notifySystemStatus: jest.fn(), logCritical: jest.fn() }
}));
jest.mock('../../PRAI-OS/src/core/axiomatics.js', () => ({
    AxiomaticsEngine: jest.fn(() => ({
        applyAxiomsToApplications: jest.fn().mockResolvedValue({ recommendations: { allowExecution: true, axiomTypeForExecution: 'linear', confidence: 0.9 } }),
        getSystemState: jest.fn().mockReturnValue('OPTIMAL_STATE_420'),
        // ... andere benötigte AxiomEngine-Mocks
    })),
    __esModule: true, // Wichtig für ES6 Module Mocks
    AxiomaticsEngine: jest.requireActual('../../PRAI-OS/src/core/axiomatics.js').AxiomaticsEngine, // Behalte die tatsächliche Klasse
}));
jest.mock('../../PRAI-OS/src/core/prai.js', () => ({
    PRAICore: {
        getInstance: jest.fn(() => ({
            processExternalData: jest.fn(),
            getSystemState: jest.fn().mockReturnValue('OPTIMAL_STATE_420'), // Muss von AxiomaticsEngine.getSystemState kommen
        }))
    },
    __esModule: true,
    PRAICore: jest.requireActual('../../PRAI-OS/src/core/prai.js').PRAICore,
}));
jest.mock('../../PRAI-OS/src/core/internalLogic.js', () => ({
    internalLogicModule: {
        getInstance: jest.fn().mockReturnValue({
            applyAxiomaticCalculation: jest.fn((in1, in2, type) => {
                if (type === 'linear') return in1 + in2;
                if (type === 'non-linear') return 1;
                if (type === 'sub-linear') return 0;
                return 0; // Default
            }),
            // ... andere benötigte InternalLogicModule-Mocks
        })
    },
    __esModule: true,
    internalLogicModule: jest.requireActual('../../PRAI-OS/src/core/internalLogic.js').internalLogicModule,
}));
jest.mock('../../PRAI-OS/src/core/quantumCodeStyle.js', () => ({
    QuantumCodeStyleModule: jest.fn(() => ({
        applyQuantumCodeStyleAtRuntime: jest.fn(),
    })),
    __esModule: true,
    quantumCodeStyleModule: jest.requireActual('../../PRAI-OS/src/core/quantumCodeStyle.js').quantumCodeStyleModule,
}));

describe('Yggdrasil Runtime (Interpreter)', () => {
    let interpreter;
    beforeEach(() => {
        jest.clearAllMocks();
        interpreter = new Interpreter();
    });

    test('should initialize successfully', () => {
        expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("YGGDRASIL_INTERPRETER_INIT", expect.any(Object));
    });

    test('should execute simple Yggdrasil code and return result', async () => {
        // Simulierter generierter Yggdrasil-Code (vereinfacht)
        const mockGeneratedCode = "# YGGDRASIL_MODULE TestModule\n# YGG_FUNCTION main()\n# END_YGG_CODE_BLOCK\n# END_YGGDRASIL_MODULE TestModule";
        const context = { input1: 5, input2: 3 };

        // Mocken von Abhängigkeiten, die im Interpreter aufgerufen werden
        // Stellen Sie sicher, dass applyAxiomsToApplications die erwarteten Empfehlungen liefert
        interpreter.axiomaticsEngine.applyAxiomsToApplications.mockResolvedValueOnce({
            recommendations: {
                allowExecution: true,
                axiomTypeForExecution: 'linear' // Standard für diesen Test
            }
        });

        const result = await interpreter.execute(mockGeneratedCode, context);

        expect(result).toBeDefined();
        expect(result.output).toContain('Executed Yggdrasil code:');
        expect(result.finalAxiomResult).toBe(8); // 5 + 3 = 8 (basierend auf linearer Axiomatik)

        // Prüfen, ob PRAI's Kern informiert wurde
        expect(praiCoreInstance.processExternalData).toHaveBeenCalledWith(result);
        expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("YGGDRASIL_INTERPRETER_COMPLETE", expect.any(Object));
    });

    test('should apply axiom-driven recommendations during execution', async () => {
        const mockGeneratedCode = "some Yggdrasil code";
        const context = { input1: 10, input2: 2 };
        
        // Mocken, dass AxiomEngine spezifische Empfehlungen liefert
        interpreter.axiomaticsEngine.applyAxiomsToApplications.mockResolvedValueOnce({
            recommendations: {
                allowExecution: true,
                axiomTypeForExecution: 'non-linear' // Nicht-lineare Axiom-Anwendung
            }
        });

        const result = await interpreter.execute(mockGeneratedCode, context);
        expect(result.finalAxiomResult).toBe(1); // Ergebnis von 1+1=1 (nicht-linear)
        expect(interpreter.axiomaticsEngine.applyAxiomsToApplications).toHaveBeenCalledTimes(1);
    });

    test('should throw an error if execution is not allowed by axioms', async () => {
        const mockGeneratedCode = "forbidden code";
        const context = {};

        // Mocken, dass AxiomEngine die Ausführung verweigert
        interpreter.axiomaticsEngine.applyAxiomsToApplications.mockResolvedValueOnce({
            recommendations: {
                allowExecution: false,
                reason: 'Axiom violation detected'
            }
        });

        await expect(interpreter.execute(mockGeneratedCode, context)).rejects.toThrow();
        expect(praiOSInternalCommunicator.logCritical).toHaveBeenCalledWith("YGGDRASIL_INTERPRETER_ERROR", expect.any(Error));
    });

    test('should call quantumCodeStyleModule.applyQuantumCodeStyleAtRuntime (if applicable)', async () => {
        const mockGeneratedCode = "some quantum styled code";
        const context = {};

        await interpreter.execute(mockGeneratedCode, context);

        // Überprüfen, ob die Methode des QuantumCodeStyleModule aufgerufen wurde
        // Annahme: diese Methode wird optional aufgerufen basierend auf Axiom-Empfehlungen
        // oder ist standardmäßig Teil der Laufzeit-Pipeline.
        // Derzeit ist sie in der Interpreter-Logik direkt aufgerufen.
        expect(quantumCodeStyleModule.applyQuantumCodeStyleAtRuntime).toHaveBeenCalled();
    });
});
