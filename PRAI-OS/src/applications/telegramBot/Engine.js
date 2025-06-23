/**
 * @file botEngine.js
 * @description Kernlogik des PRAI-OS Telegram Bots. Dieses Modul ist verantwortlich für die
 * Initialisierung des Bots, das Registrieren von Befehlen und das Verwalten der Interaktionen
 * mit der Telegram API. Es fungiert als Hauptschnittstelle zwischen dem Telegram-Netzwerk
 * und dem PRAI-OS-Kern, um Befehle zu empfangen und Antworten zu senden.
 */

// Importe für Telegram Bot API, Befehls-Handler und PRAI-OS interne Kommunikation
import { Telegraf } from 'telegraf'; // Beispiel: Eine beliebte Telegram Bot Bibliothek (muss in package.json sein)
import { initializeBotCommands, handleCommand } from './commands.js'; // Befehls-Handler
import { praiOSInternalCommunicator } from '../../prai-os/kernel/boot.js'; // Für Logging und Status-Updates
import { getPRAIOSConfig } from '../../../config/praiOSConfig.js'; // Für Bot-Token und Konfiguration
import { recordAuditLog, PRAIOS_AUDIT_LEVELS } from '../../prai-os/security/auditLog.js'; // Für Audit-Logging

let bot; // Telegraf Bot Instanz
let botToken;

/**
 * @function startBotEngine
 * @description Initialisiert den Telegram Bot und startet das Abhören von Nachrichten.
 * @returns {Promise<boolean>} Resolves to true if the bot starts successfully.
 */
export async function startBotEngine() {
    console.log("[PRAI-OS TelegramBot/BotEngine] Starting Telegram Bot Engine...");
    recordAuditLog(PRAIOS_AUDIT_LEVELS.SYSTEM, 'BOT_ENGINE_START_INIT', 'TelegramBot/BotEngine', { status: 'pending' });

    try {
        const config = getPRAIOSConfig();
        botToken = config.telegramBotToken; // Erwarte Bot-Token aus Konfiguration

        if (!botToken) {
            throw new Error("Telegram Bot Token is not configured in praiOSConfig.js.");
        }

        bot = new Telegraf(botToken);

        // Initialisiere die Bot-Befehle
        initializeBotCommands();

        // Registriere Befehls-Handler
        registerBotCommands(bot);

        // Starte das Polling für Nachrichten-Updates
        await bot.launch();
        console.log("[PRAI-OS TelegramBot/BotEngine] Telegram Bot Engine is now running and listening for messages.");
        praiOSInternalCommunicator.notifySystemStatus("TELEGRAM_BOT_ACTIVE", { timestamp: Date.now(), bot_username: bot.botInfo.username });
        recordAuditLog(PRAIOS_AUDIT_LEVELS.SYSTEM, 'BOT_ENGINE_START_SUCCESS', 'TelegramBot/BotEngine', { username: bot.botInfo.username });

        return true;

    } catch (error) {
        console.error("[PRAI-OS TelegramBot/BotEngine] Failed to start Telegram Bot Engine:", error);
        praiOSInternalCommunicator.logCritical("TELEGRAM_BOT_START_FAILURE", error);
        recordAuditLog(PRAIOS_AUDIT_LEVELS.CRITICAL, 'BOT_ENGINE_START_FAILURE', 'TelegramBot/BotEngine', { error: error.message });
        return false;
    }
}

/**
 * @function stopBotEngine
 * @description Stoppt den Telegram Bot.
 */
export async function stopBotEngine() {
    if (bot) {
        console.log("[PRAI-OS TelegramBot/BotEngine] Stopping Telegram Bot Engine...");
        bot.stop('SIGINT'); // Stoppt das Polling
        console.log("[PRAI-OS TelegramBot/BotEngine] Telegram Bot Engine stopped.");
        praiOSInternalCommunicator.notifySystemStatus("TELEGRAM_BOT_STOPPED", { timestamp: Date.now() });
        recordAuditLog(PRAIOS_AUDIT_LEVELS.SYSTEM, 'BOT_ENGINE_STOPPED', 'TelegramBot/BotEngine', {});
    }
}

/**
 * @private
 * @function registerBotCommands
 * @description Registriert alle Befehle des Bots mit Telegraf.
 * @param {object} botInstance - Die Telegraf Bot Instanz.
 */
function registerBotCommands(botInstance) {
    // Registriere die /start Befehle
    botInstance.start(async (ctx) => {
        const response = await handleCommand('/start', { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
        ctx.reply(response);
    });

    // Registriere die /info Befehle
    botInstance.command('info', async (ctx) => {
        const response = await handleCommand('/info', { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
        ctx.reply(response);
    });

    // Registriere den /status Befehl
    botInstance.command('status', async (ctx) => {
        const response = await handleCommand('/status', { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
        ctx.reply(response);
    });

    // Registriere den /get_neuron_data Befehl
    botInstance.command('get_neuron_data', async (ctx) => {
        const response = await handleCommand('/get_neuron_data', { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
        ctx.reply(response);
    });

    // Registriere den /run_axiom_calc Befehl
    botInstance.command('run_axiom_calc', async (ctx) => {
        const response = await handleCommand('/run_axiom_calc', { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
        ctx.reply(response);
    });
    
    // Registriere den /get_system_state Befehl
    botInstance.command('get_system_state', async (ctx) => {
        const response = await handleCommand('/get_system_state', { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
        ctx.reply(response);
    });

    // Registriere den /balance Befehl
    botInstance.command('balance', async (ctx) => {
        const response = await handleCommand('/balance', { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
        ctx.reply(response);
    });

    // Registriere den /transfer Befehl
    botInstance.command('transfer', async (ctx) => {
        const response = await handleCommand('/transfer', { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
        ctx.reply(response);
    });

    // --- Weitere Befehle (wie in commands.js definiert) ---
    const customCommands = [
        'abillityprice', 'nanoprice', 'abillitybalance', 'abillitytransactions', 
        'nanotransactions', 'security', 'support', 'news', 'community', 
        'viptelegram', 'cooperation', 'empty'
    ];
    for (const cmd of customCommands) {
        botInstance.command(cmd, async (ctx) => {
            const response = await handleCommand(`/${cmd}`, { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
            ctx.reply(response);
        });
    }

    // Registriere einen Catch-all-Handler für unbekannte Befehle
    botInstance.on('text', async (ctx) => {
        if (ctx.message.text.startsWith('/')) { // Nur Slash-Befehle behandeln
            const unknownCommand = ctx.message.text.split(' ')[0];
            const response = await handleCommand(unknownCommand, { userId: ctx.from.id, args: ctx.message.text.split(' ').slice(1) });
            ctx.reply(response);
        }
    });

    console.log("[PRAI-OS TelegramBot/BotEngine] All bot commands registered.");
}

// Füge Telegraf zur package.json in PRAI-OS/ hinzu
/*
{
  "name": "prai-os",
  // ...
  "dependencies": {
    "telegraf": "^4.x.x", // Füge dies hinzu
    // ...
  }
}
*/
