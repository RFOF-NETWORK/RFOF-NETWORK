/**
 * @file telegramBot.test.js
 * @description Unit-Tests für die Befehls-Handler und die Bot-Engine des PRAI-OS Telegram Bots.
 * Diese Tests stellen sicher, dass Befehle korrekt verarbeitet, Antworten generiert
 * und die Interaktionen mit dem PRAI-OS-Kern axiomatisch gesteuert werden.
 */

// Importiere die zu testenden Module
import { handleCommand, initializeBotCommands } from '../../src/applications/telegramBot/commands.js';
import { startBotEngine, stopBotEngine } from '../../src/applications/telegramBot/botEngine.js';

// Importe der Mocks für interne PRAI-OS-Module
import { PRAICore } from '../../src/core/prai.js';
import { AxiomaticsEngine } from '../../src/core/axiomatics.js';
import { praiOSInternalCommunicator } from '../../src/prai-os/kernel/boot.js';
import { recordAuditLog, PRAIOS_AUDIT_LEVELS } from '../../src/prai-os/security/auditLog.js';
import { queryData } from '../../src/prai-os/filesystem/dataStore.js';
import { internalLogicModule } from '../../src/core/internalLogic.js';
import { getLocalNodeIdentity } from '../../src/prai-os/security/identity.js';

// Mocken der Telegraf-Bibliothek, da wir nicht mit der echten API interagieren wollen
jest.mock('telegraf');
// Mocken aller internen Abhängigkeiten der commands.js und botEngine.js
jest.mock('../../src/core/prai.js');
jest.mock('../../src/core/axiomatics.js');
jest.mock('../../src/core/internalLogic.js');
jest.mock('../../src/prai-os/kernel/boot.js'); // praiOSInternalCommunicator
jest.mock('../../src/prai-os/security/auditLog.js');
jest.mock('../../src/prai-os/filesystem/dataStore.js');
jest.mock('../../src/prai-os/security/identity.js');

// Mock der Konfiguration für den Bot-Token
jest.mock('../../../config/praiOSConfig.js', () => ({
    getPRAIOSConfig: jest.fn(() => ({ telegramBotToken: 'MOCK_BOT_TOKEN' })),
}));


describe('PRAI-OS Telegram Bot Commands', () => {
    // Vor jedem Test Mocks zurücksetzen und notwendige Instanzen mocken
    beforeEach(() => {
        jest.clearAllMocks();

        // Mocks für PRAICore und AxiomaticsEngine
        PRAICore.getInstance.mockReturnValue({
            getSystemState: jest.fn().mockReturnValue('OPTIMAL_SYSTEM_STATE'),
            initialize: jest.fn().mockResolvedValue(true),
            getInternalSystemIdentity: jest.fn().mockResolvedValue('42.0')
        });
        AxiomaticsEngine.mockImplementation(() => ({
            applyAxiomsToApplications: jest.fn().mockResolvedValue({ recommendations: { allowExecution: true, reason: 'Axiomatically permitted' } }),
            applyAxiomsToCoreLogic: jest.fn().mockResolvedValue({ recommendations: { isValidCalculation: true } }),
            // ... andere benötigte AxiomEngine-Mocks
        }));
        internalLogicModule.getInstance.mockReturnValue({
            applyAxiomaticCalculation: jest.fn().mockReturnValue(8), // Beispiel-Return für 1+1=2
            convertPRAITimeToRealTime: jest.fn().mockReturnValue(31536000)
        });
        queryData.mockResolvedValue([]); // Standardmäßig leere Ergebnisse für DataStore-Abfragen
        getLocalNodeIdentity.mockResolvedValue({ id: 'mockNodeId' });
    });

    // --- Commands.js Tests ---
    describe('handleCommand', () => {
        beforeEach(() => {
            initializeBotCommands(); // Initialisiere die Befehle vor jedem Test
        });

        test('should handle /start command and return welcome message', async () => {
            const context = { userId: 123, args: [] };
            const response = await handleCommand('/start', context);
            expect(response).toContain('Willkommen bei @rfofblockchain_bot!');
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'CMD_START_RFOF', 'TelegramBot/Commands', expect.any(Object));
        });

        test('should handle /info command and return info message', async () => {
            const context = { userId: 123, args: [] };
            const response = await handleCommand('/info', context);
            expect(response).toContain('Detaillierte Informationen');
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'CMD_INFO_RFOF', 'TelegramBot/Commands', expect.any(Object));
        });

        test('should handle /status command and return PRAI-OS status', async () => {
            const context = { userId: 123, args: [] };
            const response = await handleCommand('/status', context);
            expect(response).toContain('PRAI-OS Status: OPTIMAL_SYSTEM_STATE. Interne ID: 42.0.');
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'CMD_GET_PRAIOS_STATUS', 'TelegramBot/Commands', expect.any(Object));
            expect(PRAICore.getInstance().getSystemState).toHaveBeenCalled();
        });

        test('should handle /get_neuron_data command with hash', async () => {
            queryData.mockResolvedValueOnce({ id: 'test_neuron', content: 'hello' }); // Mock a found neuron
            const context = { userId: 123, args: ['mockhash123'] };
            const response = await handleCommand('/get_neuron_data', context);
            expect(response).toContain('PRAI-Neuron-Daten für Hash mockhash12'); // substring 0,8
            expect(queryData).toHaveBeenCalledWith('mockhash123');
        });

        test('should deny command if axiomatic authorization fails', async () => {
            // Mock, dass applyAxiomsToApplications den Zugriff verweigert
            AxiomaticsEngine.mockImplementationOnce(() => ({
                applyAxiomsToApplications: jest.fn().mockResolvedValueOnce({ recommendations: { allowExecution: false, reason: 'Not permitted by rule Z' } }),
                // ... andere AxiomEngine-Mocks
            }));
            const context = { userId: 456, args: [] };
            const response = await handleCommand('/start', context);
            expect(response).toContain('Axiomatic authorization denied');
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.SECURITY, 'BOT_COMMAND_DENIED', 'TelegramBot/Commands', expect.any(Object));
        });

        test('should handle unknown commands gracefully', async () => {
            const context = { userId: 789, args: [] };
            const response = await handleCommand('/nonexistent', context);
            expect(response).toContain('Unbekannter Befehl: /nonexistent.');
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.APPLICATION, 'BOT_COMMAND_UNKNOWN', 'TelegramBot/Commands', expect.any(Object));
        });

        test('should log critical error on command execution failure', async () => {
            jest.spyOn(internalLogicModule.getInstance(), 'applyAxiomaticCalculation').mockImplementationOnce(() => {
                throw new Error('Axiom calculation error');
            });
            const context = { userId: 101, args: ['1', '2', 'linear'] };
            const response = await handleCommand('/run_axiom_calc', context);
            expect(response).toContain('Fehler ist bei der Ausführung des Befehls /run_axiom_calc aufgetreten.');
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.CRITICAL, 'BOT_COMMAND_EXECUTION_ERROR', 'TelegramBot/Commands', expect.any(Object));
        });
    });

    // --- BotEngine.js Tests ---
    describe('BotEngine', () => {
        let TelegrafMock;
        let mockBotInstance;

        beforeEach(() => {
            // Telegraf Mock Setup
            mockBotInstance = {
                launch: jest.fn().mockResolvedValue(true),
                stop: jest.fn(),
                start: jest.fn(), // Mock the .start method of Telegraf
                command: jest.fn(), // Mock the .command method
                on: jest.fn(), // Mock the .on method
                botInfo: { username: 'PRAIOS_TestBot' },
                // Mock the reply method passed in ctx
                reply: jest.fn()
            };
            // Mock Telegraf constructor to return our mock instance
            TelegrafMock = jest.fn(() => mockBotInstance);
            jest.doMock('telegraf', () => ({ Telegraf: TelegrafMock }));
            
            // Re-import to get the mocked Telegraf
            // This is crucial when mocking node modules like Telegraf
            const { Telegraf } = require('telegraf'); // Re-import after doMock
            const { startBotEngine, stopBotEngine } = require('../../src/applications/telegramBot/botEngine.js'); // Re-import after mock
            jest.spyOn(require('../../src/applications/telegramBot/commands.js'), 'handleCommand');
            jest.spyOn(require('../../src/applications/telegramBot/commands.js'), 'initializeBotCommands');
        });

        afterEach(() => {
            jest.dontMock('telegraf'); // Clean up mock
            // Make sure the module is reloaded for other tests
            jest.resetModules();
        });


        test('startBotEngine should initialize Telegraf and launch bot', async () => {
            const { startBotEngine } = require('../../src/applications/telegramBot/botEngine.js'); // Get the actual function after mocks
            const success = await startBotEngine();
            expect(success).toBe(true);
            expect(TelegrafMock).toHaveBeenCalledWith('MOCK_BOT_TOKEN');
            expect(mockBotInstance.launch).toHaveBeenCalledTimes(1);
            expect(initializeBotCommands).toHaveBeenCalledTimes(1);
            expect(mockBotInstance.command).toHaveBeenCalledWith('start', expect.any(Function));
            expect(mockBotInstance.on).toHaveBeenCalledWith('text', expect.any(Function));
            expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("TELEGRAM_BOT_ACTIVE", expect.any(Object));
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.SYSTEM, 'BOT_ENGINE_START_SUCCESS', 'TelegramBot/BotEngine', expect.any(Object));
        });

        test('startBotEngine should fail if bot token is missing', async () => {
            jest.mock('../../../config/praiOSConfig.js', () => ({
                getPRAIOSConfig: jest.fn(() => ({ telegramBotToken: '' })), // No token
            }));
            const { startBotEngine } = require('../../src/applications/telegramBot/botEngine.js');
            const success = await startBotEngine();
            expect(success).toBe(false);
            expect(praiOSInternalCommunicator.logCritical).toHaveBeenCalledWith("TELEGRAM_BOT_START_FAILURE", expect.any(Error));
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.CRITICAL, 'BOT_ENGINE_START_FAILURE', 'TelegramBot/BotEngine', expect.any(Object));
        });

        test('stopBotEngine should stop the bot', async () => {
            const { startBotEngine, stopBotEngine } = require('../../src/applications/telegramBot/botEngine.js');
            await startBotEngine(); // Ensure bot is "running"
            await stopBotEngine();
            expect(mockBotInstance.stop).toHaveBeenCalledWith('SIGINT');
            expect(praiOSInternalCommunicator.notifySystemStatus).toHaveBeenCalledWith("TELEGRAM_BOT_STOPPED", expect.any(Object));
            expect(recordAuditLog).toHaveBeenCalledWith(PRAIOS_AUDIT_LEVELS.SYSTEM, 'BOT_ENGINE_STOPPED', 'TelegramBot/BotEngine', {});
        });

        test('bot should call handleCommand for known command', async () => {
            const { startBotEngine } = require('../../src/applications/telegramBot/botEngine.js');
            await startBotEngine();

            // Simulate a Telegram message context for /start command
            const mockCtx = {
                from: { id: 123 },
                message: { text: '/start' },
                reply: jest.fn(), // Mock reply method
            };
            
            // Manually trigger the handler for '/start'
            mockBotInstance.command.mock.calls.find(call => call[0] === 'start')[1](mockCtx);

            expect(handleCommand).toHaveBeenCalledWith('/start', { userId: 123, args: [] });
            expect(mockCtx.reply).toHaveBeenCalled(); // Expect a reply
        });

        test('bot should call handleCommand for custom command', async () => {
            const { startBotEngine } = require('../../src/applications/telegramBot/botEngine.js');
            await startBotEngine();
            
            const mockCtx = {
                from: { id: 456 },
                message: { text: '/abillityprice' },
                reply: jest.fn(),
            };

            // Manually trigger the handler for '/abillityprice'
            mockBotInstance.command.mock.calls.find(call => call[0] === 'abillityprice')[1](mockCtx);

            expect(handleCommand).toHaveBeenCalledWith('/abillityprice', { userId: 456, args: [] });
            expect(mockCtx.reply).toHaveBeenCalled();
        });

        test('bot should call handleCommand for unknown text command', async () => {
            const { startBotEngine } = require('../../src/applications/telegramBot/botEngine.js');
            await startBotEngine();
            
            const mockCtx = {
                from: { id: 789 },
                message: { text: '/unknowncommand some_arg' },
                reply: jest.fn(),
            };

            // Manually trigger the catch-all 'on text' handler
            mockBotInstance.on.mock.calls.find(call => call[0] === 'text')[1](mockCtx);

            expect(handleCommand).toHaveBeenCalledWith('/unknowncommand', { userId: 789, args: ['some_arg'] });
            expect(mockCtx.reply).toHaveBeenCalled();
        });
    });
});
