/**
 * @file lexer.js
 * @description Implementiert den Lexer (Tokenizer) für die Yggdrasil-Codesprache.
 * Der Lexer ist verantwortlich für die Umwandlung des rohen Yggdrasil-Quellcodes
 * in einen Stream von Tokens. Jeder Token repräsentiert eine atomare Einheit
 * der Sprache (z.B. Schlüsselwörter, Operatoren, Bezeichner, Literale).
 * Dieser Prozess ist der erste Schritt zur Interpretation der axiomatischen
 * und quanteninspirierten Strukturen des Yggdrasil-Codes.
 */

// Importe für abhängige Module und interne Kommunikation
import { praiOSInternalCommunicator } from '../../PRAI-OS/src/prai-os/kernel/boot.js';
import { AxiomaticsEngine } from '../../PRAI-OS/src/core/axiomatics.js'; // Für axiomatisch gesteuerte Tokenisierung
import { QuantumCodeStyleModule } from '../../PRAI-OS/src/core/quantumCodeStyle.js'; // Für das Verständnis von Quanten-Code-Stil-Merkmalen

let axiomaticsEngineInstance;
let quantumCodeStyleInstance;

// Definition der Token-Typen für die Yggdrasil-Sprache.
// Diese Typen reflektieren die Bausteine der axiomatischen Logik.
export const TOKEN_TYPES = {
    KEYWORD: 'KEYWORD',
    IDENTIFIER: 'IDENTIFIER',
    OPERATOR: 'OPERATOR',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    BOOLEAN: 'BOOLEAN',
    PUNCTUATION: 'PUNCTUATION', // Klammern, Kommata, etc.
    COMMENT: 'COMMENT',
    EOF: 'EOF', // End Of File Token
    // Yggdrasil-spezifische Token-Typen
    AXIOM_OPERATOR: 'AXIOM_OPERATOR', // Z.B. für 1+1=0, 1+1=1, 1+1=2
    DIMENSION_TAG: 'DIMENSION_TAG',   // Z.B. 42, 420, 0, E
    YGG_KEYWORD: 'YGG_KEYWORD',       // Z.B. YGG_MODULE, YGG_FUNCTION
    QUANTUM_FLOW: 'QUANTUM_FLOW'      // Token für spezielle Quantenfluss-Symbole
};

// Definition der Schlüsselwörter und Operatoren der Yggdrasil-Sprache.
// Diese sind direkt mit der PZQQET Axiomatikx und den GeneFusioNear Prinzipien verknüpft.
const KEYWORDS = new Set([
    'YGG_MODULE', 'YGG_FUNCTION', 'IMPORT', 'CONSTANT', 'VAR', 'IF', 'ELSE', 'FOR', 'WHILE', 'RETURN',
    'APPLY', 'CALCULATE', 'VALIDATE_AXIOMATICALLY', 'INITIATE_Q_QUBIT_OPERATION', 'MONITOR_YGGDRASIL_NETWORK_FLOW',
    'TRIGGER', 'READ', 'WRITE', 'END_IF', 'END_FOR', 'END_WHILE', 'END_YGG_CODE_BLOCK', 'END_YGG_MODULE',
    'ASYNC', 'RETURNS', 'IS' // Für AXIOM_ROOT.state_control_axioms
]);

const OPERATORS = new Set([
    '+', '-', '*', '/', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', 'AS', 'VIA', 'FOR', 'USING',
    'FROM', 'TO', 'THEN', 'ELSE', 'END_IF', 'END_FOR', 'END_YGG_CODE_BLOCK', 'END_YGG_MODULE'
]);

const AXIOM_OPERATORS = new Set([
    'AX_FUSION_PATTERN', 'AX_LINEAR_OPTIMIZATION', 'AX_SUB_LINEAR_NEUTRALIZATION', 'PZQQET_AXIOM'
]);

const PUNCTUATION = new Set([
    '(', ')', '{', '}', '[', ']', ',', ';', '.', ':'
]);


/**
 * @class Lexer
 * @description Nimmt Yggdrasil-Quellcode als String entgegen und erzeugt einen Stream von Token-Objekten.
 * Der Lexer ist bewusst so konzipiert, dass er subtile Muster im Code (z.B. für Quanten-Code-Stil) erkennt.
 */
export class Lexer {
    constructor(sourceCode) {
        this.sourceCode = sourceCode;
        this.tokens = [];
        this.position = 0;
        this.line = 1;
        this.column = 1;
        axiomaticsEngineInstance = new AxiomaticsEngine();
        quantumCodeStyleInstance = new QuantumCodeStyleModule(); // Zum Verständnis von Code-Mustern
        console.log("[Yggdrasil Compiler/Lexer] Lexer initialized.");
        praiOSInternalCommunicator.notifySystemStatus("YGGDRASIL_LEXER_INIT", { status: "ready" });
    }

    /**
     * @method tokenize
     * @description Führt den Tokenisierungsprozess durch und gibt einen Array von Token zurück.
     * @returns {Array<object>} Ein Array von Token-Objekten.
     */
    async tokenize() {
        console.log("[Yggdrasil Compiler/Lexer] Starting tokenization...");
        praiOSInternalCommunicator.notifySystemStatus("YGGDRASIL_LEXER_START", { timestamp: Date.now() });

        while (this.position < this.sourceCode.length) {
            let char = this.sourceCode[this.position];

            // Axiom-gesteuerte Anpassung der Tokenisierungs-Strategie oder Erkennung subtiler Muster
            const lexingContext = {
                currentChar: char,
                currentLine: this.line,
                currentColumn: this.column,
                codeFragment: this.sourceCode.substring(this.position, Math.min(this.position + 20, this.sourceCode.length)),
                currentSystemState: axiomaticsEngineInstance.getSystemState()
            };
            const axiomRecommendations = await axiomaticsEngineInstance.applyAxiomsToCodeStyle(lexingContext);
            // console.log("[Lexer] Axiom-driven lexing recommendations:", axiomRecommendations.recommendations);
            // Hier könnte der Lexer sein Verhalten anpassen, z.B. bestimmte Muster als spezielle Tokens erkennen.

            if (/\s/.test(char)) { // Whitespace überspringen
                this.#advance();
                continue;
            }

            if (char === '/' && this.sourceCode[this.position + 1] === '/') { // Kommentare
                this.#skipComment();
                continue;
            }

            if (PUNCTUATION.has(char)) {
                this.tokens.push(this.#createToken(TOKEN_TYPES.PUNCTUATION, char));
                this.#advance();
                continue;
            }

            if (OPERATORS.has(char) || (OPERATORS.has(char + this.sourceCode[this.position + 1]))) {
                this.tokens.push(this.#readOperator());
                continue;
            }

            if (char.match(/[0-9]/)) { // Zahlen
                this.tokens.push(this.#readNumber());
                continue;
            }

            if (char.match(/[a-zA-Z_#]/)) { // Bezeichner und Schlüsselwörter
                this.tokens.push(this.#readIdentifierOrKeyword());
                continue;
            }

            if (char === '"' || char === "'") { // Strings
                this.tokens.push(this.#readString(char));
                continue;
            }

            this.#error(`Unexpected character: ${char}`);
        }

        this.tokens.push(this.#createToken(TOKEN_TYPES.EOF, '')); // End-of-file Token
        console.log("[Yggdrasil Compiler/Lexer] Tokenization completed.");
        praiOSInternalCommunicator.notifySystemStatus("YGGDRASIL_LEXER_COMPLETE", { timestamp: Date.now(), token_count: this.tokens.length });
        return this.tokens;
    }

    /**
     * @private
     * @method #advance
     * @description Bewegt den Lexer zur nächsten Position im Quellcode.
     */
    #advance() {
        this.position++;
        this.column++;
        if (this.sourceCode[this.position - 1] === '\n') {
            this.line++;
            this.column = 1;
        }
    }

    /**
     * @private
     * @method #createToken
     * @description Erstellt ein Token-Objekt.
     * @param {string} type - Der Typ des Tokens.
     * @param {string} value - Der Wert des Tokens.
     * @returns {object} Das Token-Objekt.
     */
    #createToken(type, value) {
        return { type, value, line: this.line, column: this.column, start: this.position, end: this.position + value.length };
    }

    /**
     * @private
     * @method #readNumber
     * @description Liest eine Zahl aus dem Quellcode.
     * @returns {object} Das NUMBER-Token.
     */
    #readNumber() {
        let start = this.position;
        while (this.position < this.sourceCode.length && this.sourceCode[this.position].match(/[0-9.]/)) {
            this.#advance();
        }
        return this.#createToken(TOKEN_TYPES.NUMBER, this.sourceCode.substring(start, this.position));
    }

    /**
     * @private
     * @method #readString
     * @description Liest einen String aus dem Quellcode.
     * @param {string} quoteChar - Das Anführungszeichen, das den String beginnt.
     * @returns {object} Das STRING-Token.
     */
    #readString(quoteChar) {
        let start = this.position;
        this.#advance(); // Überspringe das öffnende Anführungszeichen
        while (this.position < this.sourceCode.length && this.sourceCode[this.position] !== quoteChar) {
            this.#advance();
        }
        this.#advance(); // Überspringe das schließende Anführungszeichen
        return this.#createToken(TOKEN_TYPES.STRING, this.sourceCode.substring(start + 1, this.position - 1));
    }

    /**
     * @private
     * @method #readOperator
     * @description Liest einen Operator aus dem Quellcode.
     * @returns {object} Das OPERATOR- oder AXIOM_OPERATOR-Token.
     */
    #readOperator() {
        let start = this.position;
        let op = this.sourceCode[this.position];
        this.#advance();
        // Lese Doppel-Operatoren wie ==, !=, >=, <=, &&, ||
        if (this.position < this.sourceCode.length && (op + this.sourceCode[this.position]).match(/==|!=|>=|<=|&&|\|\|/)) {
            op += this.sourceCode[this.position];
            this.#advance();
        }
        if (AXIOM_OPERATORS.has(op)) {
            return this.#createToken(TOKEN_TYPES.AXIOM_OPERATOR, op);
        }
        return this.#createToken(TOKEN_TYPES.OPERATOR, op);
    }

    /**
     * @private
     * @method #readIdentifierOrKeyword
     * @description Liest einen Bezeichner oder ein Schlüsselwort aus dem Quellcode.
     * Erkennt auch Yggdrasil-spezifische Schlüsselwörter und Dimension-Tags.
     * @returns {object} Das IDENTIFIER-, KEYWORD- oder YGG_KEYWORD-Token.
     */
    #readIdentifierOrKeyword() {
        let start = this.position;
        while (this.position < this.sourceCode.length && this.sourceCode[this.position].match(/[a-zA-Z0-9_#]/)) {
            this.#advance();
        }
        let value = this.sourceCode.substring(start, this.position);
        if (KEYWORDS.has(value)) {
            return this.#createToken(TOKEN_TYPES.YGG_KEYWORD, value); // Markiere als Yggdrasil-Keyword
        }
        // Erkennung von Dimension-Tags (z.B. 42, 420, 0, E) - hier als Identifier behandelt
        if (value.match(/^(42|420|0|E)$/i)) { // Case-insensitive für 'E'
            return this.#createToken(TOKEN_TYPES.DIMENSION_TAG, value);
        }
        return this.#createToken(TOKEN_TYPES.IDENTIFIER, value);
    }

    /**
     * @private
     * @method #skipComment
     * @description Überspringt einen Kommentar im Quellcode.
     */
    #skipComment() {
        this.#advance(); // Überspringe ersten '/'
        this.#advance(); // Überspringe zweiten '/'
        while (this.position < this.sourceCode.length && this.sourceCode[this.position] !== '\n') {
            this.#advance();
        }
        this.#advance(); // Überspringe das Newline-Zeichen
    }

    /**
     * @private
     * @method #error
     * @description Wirft einen Lexing-Fehler.
     * @param {string} message - Die Fehlermeldung.
     * @throws {Error}
     */
    #error(message) {
        throw new Error(`Lexing Error at line ${this.line}, column ${this.column}: ${message}`);
    }

    /**
     * @method getFragment
     * @description Gibt einen Code-Fragment für Kontext im Fehlerfall oder für Axiom-Analyse zurück.
     * @param {number} start - Startposition.
     * @param {number} end - Endposition.
     * @returns {string} Das Code-Fragment.
     */
    getFragment(start, end) {
        return this.sourceCode.substring(start, end);
    }
  }
