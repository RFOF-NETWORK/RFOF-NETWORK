/**
 * @file prai-os.test.js
 * @description Unit-Tests für den PRAI-OS-Kern und seine grundlegenden Boot- und Steuerungsprozesse.
 * Diese Tests stellen sicher, dass das Betriebssystem korrekt initialisiert wird,
 * seine Kernkomponenten funktionsfähig sind und die axiomatischen Prinzipien
 * während des Startvorgangs eingehalten werden.
 */

// Importiere die zu testenden Module
import { bootPRAIOS } from '../../src/prai-os/kernel/boot.js';
import { PRAICore } from '../../src/core/prai.js';
import { AxiomaticsEngine } from '../../src/core/axiomatics.js';
import { InternalLogicModule } from '../../src/core/internalLogic.js';
import { QuantumCodeStyleModule } from '../../src/core/quantumCodeStyle.js';
import { initializeNetwork } from '../../src/prai-os/network/p2p.js';
import { initializeFilesystem } from '../../src/prai-os/filesystem/dataStore.js';
import { initializeSecurity } from '../../src/prai-os/security/identity.js';
import { initializeComponents } from '../../src/prai-os/components/eventBus.js';

// Mocken der externen Abhängigkeiten, um Unit-Tests zu isolieren
jest.mock('../../src/prai-os/network/p2p.js');
jest.mock('../../src/prai-os/filesystem/dataStore.js');
jest.mock('../../src/prai-os/security/identity.js');
jest.mock('../../src/prai-os/components/eventBus.js');
jest.mock('../../src/core/prai.js');
jest.mock('../../src/core/axiomatics.js');
jest.mock('../../src/core/internalLogic.js');
jest.mock('../../src/core/quantumCodeStyle.js');
jest.mock('../../src/main.js', () => ({ // Mock main.js to prevent it from auto-initializing everything
    initializePRAIOS: jest.fn(),
}));

// Mocken des internen Kommunikators, um Konsolenausgaben zu kontrollieren
jest.mock('../../src/prai-os/kernel/boot.js', () => ({
    praiOSInternalCommunicator: {
        notifySystemStatus: jest.fn(),
        logCritical: jest.fn(),
    },
    bootPRAIOS: jest.fn(() => Promise.resolve(true)) // Mock bootPRAIOS itself
}));

describe('PRAI-OS Kernel Boot Sequence', () => {
    // Vor jedem Test die Mocks zurücksetzen
    beforeEach(() => {
        jest.clearAllMocks();
        // Stellen Sie sicher, dass Mocks für Sub-Module auch richtig reagieren
        initializeNetwork.mockResolvedValue(true);
        initializeFilesystem.mockResolvedValue(true);
        initializeSecurity.mockResolvedValue(true);
        initializeComponents.mockResolvedValue(true);

        // Mock PRAICore and AxiomaticsEngine instances
        PRAICore.getInstance.mockReturnValue({
            initialize: jest.fn().mockResolvedValue(true),
            getSystemState: jest.fn().mockReturnValue('OPTIMAL'),
            // Mock getInternalSystemIdentity if called during PRAI.initialize()
            getInternalSystemIdentity: jest.fn().mockResolvedValue('42.0') 
        });
        AxiomaticsEngine.mockImplementation(() => ({
            loadAxioms: jest.fn().mockResolvedValue(true),
            getCurrentAxiomSet: jest.fn().mockReturnValue({}),
            getSystemState: jest.fn().mockReturnValue('OPTIMAL'),
            applyAxiomsToScheduler: jest.fn().mockResolvedValue({ recommendations: {} }),
            applyAxiomsToNetwork: jest.fn().mockResolvedValue({ recommendations: {} }),
            applyAxiomsToFilesystem: jest.fn().mockResolvedValue({ recommendations: {} }),
            applyAxiomsToSecurity: jest.fn().mockResolvedValue({ recommendations: {} }),
            applyAxiomsToApplications: jest.fn().mockResolvedValue({ recommendations: { allowExecution: true } }),
            applyAxiomsToCoreLogic: jest.fn().mockResolvedValue({ recommendations: {} }),
        }));
        InternalLogicModule.getInstance.mockReturnValue({
            deriveInternalSystemIdentity: jest.fn().mockReturnValue('42.0'),
            applyAxiomaticCalculation: jest.fn(),
            processMatrixAxiomatrixAxiometrix: jest.fn(),
        });
        QuantumCodeStyleModule.getInstance.mockReturnValue({
            initializeQuantumCodeStyle: jest.fn(),
            applyQuantumCodeStyle: jest.fn(),
        });

        // WICHTIG: Mocks für den Scheduler.js import
        jest.mock('../../src/prai-os/kernel/scheduler.js', () => ({
            startScheduler: jest.fn().mockResolvedValue(true),
            TASK_PRIORITY: {
                CRITICAL_SYSTEM: 100, PRAI_NEURON_PROCESSING: 80,
                NETWORK_COMMUNICATION: 70, APPLICATION_EXECUTION: 60,
                BACKGROUND_OPTIMIZATION: 50, LOW_PRIORITY: 10
            },
            addTask: jest.fn()
        }));
    });

    test('should initialize PRAI-OS successfully and call all core initializers', async () => {
        // Die bootPRAIOS Funktion selbst wird gemockt, um den Bootvorgang zu simulieren.
        // Wir müssen hier die echte bootPRAIOS importieren, um sie zu testen.
        // Da es in main.js importiert wird, ist der direkte Test hier etwas komplexer.
        // Normalerweise würde man den Inhalt von boot.js direkt testen, nicht den importierten.
        
        // Um bootPRAIOS aus boot.js zu testen, müssen wir es tatsächlich importieren
        // und die dortigen internen Importe mocken.
        // Das erfordert einen speziellen Jest-Setup oder Mocking des Moduls selbst.
        
        // Hier simulieren wir den Aufruf und prüfen, ob die Mocks korrekt interagieren.
        const { bootPRAIOS: actualBootPRAIOS } = jest.requireActual('../../src/prai-os/kernel/boot.js');
        const { getPRAIOSConfig } = jest.requireActual('../../../config/praiOSConfig.js'); // Actual config for testing

        // Mock getPRAIOSConfig
        jest.mock('../../../config/praiOSConfig.js', () => ({
            getPRAIOSConfig: jest.fn(() => ({
                network: { bootstrapNodes: ['test-node'], port: 4242 },
                filesystem: {}, security: {}, components: {}, praiCore: {}
            }))
        }));

        const success = await actualBootPRAIOS();
        
        expect(success).toBe(true);
        expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("BOOT_INITIATED", expect.any(Object));
        expect(initializeNetwork).toHaveBeenCalledTimes(1);
        expect(initializeFilesystem).toHaveBeenCalledTimes(1);
        expect(initializeSecurity).toHaveBeenCalledTimes(1);
        expect(initializeComponents).toHaveBeenCalledTimes(1);
        expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("AXIOMATIKX_ACTIVE", expect.any(Object));
        expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("PRAI_OPERATIONAL", expect.any(Object));
        expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("SCHEDULER_ACTIVE", expect.any(Object));
        expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("BOOT_COMPLETE", expect.any(Object));
    });

    test('should log a critical error if a core initialization fails', async () => {
        initializeNetwork.mockResolvedValueOnce(false); // Simulate network initialization failure
        
        const { bootPRAIOS: actualBootPRAIOS } = jest.requireActual('../../src/prai-os/kernel/boot.js');
        jest.mock('../../../config/praiOSConfig.js', () => ({
            getPRAIOSConfig: jest.fn(() => ({
                network: { bootstrapNodes: ['test-node'], port: 4242 },
                filesystem: {}, security: {}, components: {}, praiCore: {}
            }))
        }));

        const success = await actualBootPRAIOS();
        
        expect(success).toBe(false);
        expect(praiOSInternalCommunicator.logCritical).toHaveBeenCalledWith("Yggdrasil Network Init Failure", expect.any(Error));
        expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("BOOT_FAILED", expect.any(Object));
    });

    // Weitere Tests für spezifische Kernel-Module und deren Start
    // Beispiel: Test für die Funktionalität des schedulers (startScheduler, addTask)
    describe('Scheduler Module', () => {
        // Da startScheduler gemockt wird, testen wir hier die Interaktion
        // mit dem Scheduler-Modul, wenn es von boot.js aufgerufen wird.
        
        test('scheduler should be called with PRAICore instance', async () => {
            const { bootPRAIOS: actualBootPRAIOS } = jest.requireActual('../../src/prai-os/kernel/boot.js');
            const { startScheduler } = jest.requireActual('../../src/prai-os/kernel/scheduler.js'); // Echten Scheduler importieren
            jest.mock('../../src/prai-os/kernel/scheduler.js', () => ({
                 startScheduler: jest.fn().mockResolvedValue(true), // Mocken für den Import in boot.js
                 TASK_PRIORITY: jest.requireActual('../../src/prai-os/kernel/scheduler.js').TASK_PRIORITY,
                 addTask: jest.fn(), // Auch addTask mocken
            }));

            // Re-mock getPRAIOSConfig to ensure consistency
            jest.mock('../../../config/praiOSConfig.js', () => ({
                getPRAIOSConfig: jest.fn(() => ({
                    network: { bootstrapNodes: ['test-node'], port: 4242 },
                    filesystem: {}, security: {}, components: {}, praiCore: {}
                }))
            }));
            
            await actualBootPRAIOS();
            expect(startScheduler).toHaveBeenCalledTimes(1);
            expect(startScheduler).toHaveBeenCalledWith(PRAICore.getInstance());
        });
    });
});
