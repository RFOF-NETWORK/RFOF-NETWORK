/**
 * @file compiler.test.js
 * @description Unit-Tests für den Yggdrasil-Compiler (Lexer, Parser, Generator).
 * Diese Tests stellen sicher, dass Yggdrasil-Quellcode korrekt lexikalisch analysiert,
 * syntaktisch geparst und in gültigen Zielcode umgewandelt wird.
 * Sie validieren die Einhaltung der axiomatischen Regeln in allen Kompilierungsphasen.
 */

// Importiere die zu testenden Compiler-Module
import { Lexer, TOKEN_TYPES } from '../compiler/lexer.js';
import { Parser } from '../compiler/parser.js';
import { CodeGenerator } from '../compiler/generator.js';

// Importe der Mocks für interne PRAI-OS-Module
// Compiler-Tests sollten so isoliert wie möglich sein,
// daher werden hier die PRAI-OS-Abhängigkeiten gemockt.
jest.mock('../../PRAI-OS/src/prai-os/kernel/boot.js', () => ({
    praiOSInternalCommunicator: { notifySystemStatus: jest.fn(), logCritical: jest.fn() }
}));
jest.mock('../../PRAI-OS/src/core/axiomatics.js', () => ({
    AxiomaticsEngine: jest.fn(() => ({
        applyAxiomsToCodeStyle: jest.fn().mockResolvedValue({ recommendations: { conformsToStyle: true, styleRules: {}, proceed: true } }),
        getSystemState: jest.fn().mockReturnValue('OPTIMAL'),
    })),
    // Exportiere die Axiom-Konstanten, falls sie im Compiler verwendet werden
    PZQQET_AXIOMS: jest.requireActual('../../PRAI-OS/src/core/axiomatics.js').PZQQET_AXIOMS,
}));
jest.mock('../../PRAI-OS/src/core/quantumCodeStyle.js', () => ({
    QuantumCodeStyleModule: jest.fn(() => ({
        applyQuantumCodeStyle: jest.fn((code) => ({ transformedCode: code, conforms: true })),
        applyQuantumCodeStyleAtRuntime: jest.fn(), // falls vom Interpreter genutzt
    })),
}));

// Mock für ASTNode (wichtig, da Parser es nutzt)
// Annahme: astNode.js befindet sich im selben Ordner wie parser.js
jest.mock('../compiler/astNode.js', () => ({
    YggdrasilASTNode: jest.fn(function(type, value = null) {
        this.type = type;
        this.value = value;
        this.children = [];
        this.addChild = jest.fn((node) => this.children.push(node));
    }),
}));


describe('Yggdrasil Compiler (Lexer, Parser, Generator)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Lexer Tests ---
    describe('Lexer (lexer.js)', () => {
        test('should tokenize a simple Yggdrasil module declaration', async () => {
            const code = "YGG_MODULE MyModule";
            const lexer = new Lexer(code);
            const tokens = await lexer.tokenize();
            expect(tokens.length).toBe(3); // YGG_MODULE, MyModule, EOF
            expect(tokens[0]).toEqual(expect.objectContaining({ type: TOKEN_TYPES.YGG_KEYWORD, value: 'YGG_MODULE' }));
            expect(tokens[1]).toEqual(expect.objectContaining({ type: TOKEN_TYPES.IDENTIFIER, value: 'MyModule' }));
            expect(tokens[2]).toEqual(expect.objectContaining({ type: TOKEN_TYPES.EOF }));
        });

        test('should tokenize keywords, identifiers, numbers, and operators', async () => {
            const code = "CONSTANT test_val = 42; YGG_FUNCTION calc(input) RETURNS result";
            const lexer = new Lexer(code);
            const tokens = await lexer.tokenize();

            expect(tokens).toEqual(expect.arrayContaining([
                expect.objectContaining({ type: TOKEN_TYPES.YGG_KEYWORD, value: 'CONSTANT' }),
                expect.objectContaining({ type: TOKEN_TYPES.IDENTIFIER, value: 'test_val' }),
                expect.objectContaining({ type: TOKEN_TYPES.OPERATOR, value: '=' }),
                expect.objectContaining({ type: TOKEN_TYPES.NUMBER, value: '42' }),
                expect.objectContaining({ type: TOKEN_TYPES.PUNCTUATION, value: ';' }),
                expect.objectContaining({ type: TOKEN_TYPES.YGG_KEYWORD, value: 'YGG_FUNCTION' }),
                expect.objectContaining({ type: TOKEN_TYPES.IDENTIFIER, value: 'calc' }),
                expect.objectContaining({ type: TOKEN_TYPES.PUNCTUATION, value: '(' }),
                expect.objectContaining({ type: TOKEN_TYPES.IDENTIFIER, value: 'input' }),
                expect.objectContaining({ type: TOKEN_TYPES.PUNCTUATION, value: ')' }),
                expect.objectContaining({ type: TOKEN_TYPES.YGG_KEYWORD, value: 'RETURNS' }),
                expect.objectContaining({ type: TOKEN_TYPES.IDENTIFIER, value: 'result' }),
            ]));
        });

        test('should handle Yggdrasil-specific dimension tags (42, 420, 0, E)', async () => {
            const code = "DIMENSION 42, 420, 0, E";
            const lexer = new Lexer(code);
            const tokens = await lexer.tokenize();
            expect(tokens).toEqual(expect.arrayContaining([
                expect.objectContaining({ type: TOKEN_TYPES.DIMENSION_TAG, value: '42' }),
                expect.objectContaining({ type: TOKEN_TYPES.DIMENSION_TAG, value: '420' }),
                expect.objectContaining({ type: TOKEN_TYPES.DIMENSION_TAG, value: '0' }),
                expect.objectContaining({ type: TOKEN_TYPES.DIMENSION_TAG, value: 'E' }),
            ]));
        });

        test('should skip single-line comments', async () => {
            const code = "// This is a comment\nYGG_MODULE Test";
            const lexer = new Lexer(code);
            const tokens = await lexer.tokenize();
            expect(tokens.length).toBe(3); // YGG_MODULE, Test, EOF
            expect(tokens[0]).toEqual(expect.objectContaining({ type: TOKEN_TYPES.YGG_KEYWORD, value: 'YGG_MODULE' }));
        });
    });

    // --- Parser Tests ---
    describe('Parser (parser.js)', () => {
        let mockLexer;
        let mockAxiomaticsEngine;
        beforeEach(() => {
            mockLexer = {
                tokenize: jest.fn().mockResolvedValue([
                    { type: TOKEN_TYPES.YGG_KEYWORD, value: 'YGG_MODULE', line: 1, column: 1, start: 0, end: 10 },
                    { type: TOKEN_TYPES.IDENTIFIER, value: 'TestModule', line: 1, column: 11, start: 11, end: 21 },
                    { type: TOKEN_TYPES.EOF, value: '', line: 1, column: 22, start: 22, end: 22 }
                ]),
                getFragment: jest.fn(() => 'fragment'),
            };
            mockAxiomaticsEngine = new AxiomaticsEngine(); // Get mocked instance
        });

        test('should parse a simple Yggdrasil module declaration into an AST', async () => {
            const parser = new Parser(mockLexer);
            const ast = await parser.parse();

            expect(ast.type).toBe('Program');
            expect(ast.children.length).toBe(1);
            expect(ast.children[0].type).toBe('Module');
            expect(ast.children[0].value).toBe('TestModule');
        });

        test('should throw error on unexpected token', async () => {
            mockLexer.tokenize.mockResolvedValue([
                { type: TOKEN_TYPES.NUMBER, value: '123', line: 1, column: 1, start: 0, end: 3 }, // Unexpected token
                { type: TOKEN_TYPES.EOF, value: '', line: 1, column: 4, start: 4, end: 4 }
            ]);
            const parser = new Parser(mockLexer);
            await expect(parser.parse()).rejects.toThrow(/Unexpected token: 123/);
        });

        test('should call applyAxiomsToCodeStyle during parsing', async () => {
            const parser = new Parser(mockLexer);
            await parser.parse();
            expect(mockAxiomaticsEngine.applyAxiomsToCodeStyle).toHaveBeenCalled();
        });
    });

    // --- CodeGenerator Tests ---
    describe('CodeGenerator (generator.js)', () => {
        let mockAST;
        let generator;
        beforeEach(() => {
            // Minimal AST for testing
            mockAST = {
                type: 'Program',
                children: [
                    { type: 'Module', value: 'HelloWorld', children: [
                        { type: 'YGG_KEYWORD', value: 'CONSTANT', children: [] },
                        { type: TOKEN_TYPES.IDENTIFIER, value: 'GREETING', children: [] },
                        { type: TOKEN_TYPES.OPERATOR, value: '=', children: [] },
                        { type: TOKEN_TYPES.STRING, value: 'Hello World!', children: [] },
                    ]}
                ]
            };
            generator = new CodeGenerator();
        });

        test('should generate code for a simple Yggdrasil module', async () => {
            const generatedCode = await generator.generate(mockAST, 'yggdrasil_runtime_bytecode');
            expect(generatedCode).toContain('# YGGDRASIL_MODULE HelloWorld');
            expect(generatedCode).toContain('CONSTANT GREETING = Hello World!');
            expect(generatedCode).toContain('# END_YGGDRASIL_MODULE HelloWorld');
            // Expect it to have passed through QuantumCodeStyle
            expect(QuantumCodeStyleModule.getInstance().applyQuantumCodeStyle).toHaveBeenCalled();
        });

        test('should call applyAxiomsToCodeStyle during code generation', async () => {
            await generator.generate(mockAST, 'yggdrasil_runtime_bytecode');
            expect(generator.axiomaticsEngine.applyAxiomsToCodeStyle).toHaveBeenCalled();
        });

        test('should apply QuantumCodeStyle to the generated code', async () => {
            // Ensure the mock of applyQuantumCodeStyle returns a distinct transformedCode
            QuantumCodeStyleModule.getInstance().applyQuantumCodeStyle.mockResolvedValueOnce({ transformedCode: 'STYLED_CODE_OUTPUT', conforms: true });
            
            const generatedCode = await generator.generate(mockAST, 'yggdrasil_runtime_bytecode');
            expect(generatedCode).toBe('STYLED_CODE_OUTPUT'); // Expect the styled code
        });
    });
});examples/hello_world.yggdrasil
