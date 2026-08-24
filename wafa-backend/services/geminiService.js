import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// Import CommonJS PDF helper
const require = createRequire(import.meta.url);
const { extractPdfText } = require('./pdfHelper.cjs');

// Resolve the backend environment file from this module instead of relying on
// the shell's working directory (the app can be started from the repository root).
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini AI client
let genAI = null;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Generate explanation for a question using Google Gemini AI
 * @param {Object} questionData - Question data including text and options
 * @param {string} language - Language for explanation (default: 'fr')
 * @param {string} customPrompt - Optional custom prompt to override default
 * @param {string} contextData - Optional additional context (e.g., from PDF)
 * @returns {Promise<string>} - Generated explanation text
 */
export const generateExplanation = async (questionData, language = 'fr', customPrompt = null, contextData = null) => {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    const { text, options, correctAnswers } = questionData;

    // Build the prompt - use custom if provided, otherwise use default
    let prompt;
    if (customPrompt) {
        // Use custom prompt with question data injected
        const optionsText = options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isCorrect = correctAnswers.includes(idx) ? ' ✓' : '';
            return `${letter}. ${opt.text}${isCorrect}`;
        }).join('\n');
        
        prompt = customPrompt
            .replace('{questionText}', text)
            .replace('{options}', optionsText)
            .replace('{correctAnswers}', correctAnswers.map(i => String.fromCharCode(65 + i)).join(', '));
        
        // Add context data if provided
        if (contextData) {
            prompt = `Context from uploaded documents:\n${contextData}\n\n${prompt}`;
        }
    } else {
        prompt = language === 'fr' 
            ? buildFrenchPrompt(text, options, correctAnswers, contextData)
            : buildEnglishPrompt(text, options, correctAnswers, contextData);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const response = await result.response;

        // Extract generated text from Gemini response
        const generatedText = response.text();
        
        if (!generatedText) {
            throw new Error('No explanation generated from Gemini API');
        }

        return generatedText.trim();
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(`Failed to generate explanation: ${error.message}`);
    }
};

/**
 * Build French prompt for Gemini
 */
function buildFrenchPrompt(questionText, options, correctAnswers, contextData = null) {
    const optionsText = options.map((opt, idx) => {
        const letter = String.fromCharCode(65 + idx); // A, B, C, D...
        const isCorrect = correctAnswers.includes(idx) ? ' ✓' : '';
        return `${letter}. ${opt.text}${isCorrect}`;
    }).join('\n');

    let basePrompt = `Tu es un assistant médical expert qui aide les étudiants en médecine à comprendre les questions d'examen.`;
    
    if (contextData) {
        basePrompt += `\n\nContexte additionnel fourni:\n${contextData}\n`;
    }
    
    return `${basePrompt}

Question:
${questionText}

Options:
${optionsText}

Instructions:
1. Donne directement l'explication SANS introduction ni présentation
2. Explique pourquoi la/les réponse(s) correcte(s) est/sont juste(s)
3. Explique pourquoi les autres options sont incorrectes
4. Fournis un contexte médical pertinent
5. Utilise un langage clair et pédagogique
6. Structure ta réponse avec des paragraphes et des points clés
${contextData ? '7. Utilise le contexte fourni ci-dessus pour enrichir ton explication' : ''}

Explication directe:`;
}

/**
 * Build English prompt for Gemini
 */
function buildEnglishPrompt(questionText, options, correctAnswers, contextData = null) {
    const optionsText = options.map((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const isCorrect = correctAnswers.includes(idx) ? ' ✓' : '';
        return `${letter}. ${opt.text}${isCorrect}`;
    }).join('\n');

    let basePrompt = `You are an expert medical assistant helping medical students understand exam questions.`;
    
    if (contextData) {
        basePrompt += `\n\nAdditional context provided:\n${contextData}\n`;
    }
    
    return `${basePrompt}

Question:
${questionText}

Options:
${optionsText}

Instructions:
1. Provide explanation directly WITHOUT introduction or preamble
2. Explain why the correct answer(s) is/are right
3. Explain why the other options are incorrect
4. Provide relevant medical context
5. Use clear and pedagogical language
6. Structure your response with paragraphs and key points
${contextData ? '7. Use the provided context above to enrich your explanation' : ''}

Direct explanation:`;
}

/**
 * Generate multiple explanations in batch
 * @param {Array} questions - Array of question objects
 * @param {string} language - Language for explanations
 * @param {string} customPrompt - Optional custom prompt
 * @param {string} contextData - Optional context data
 * @returns {Promise<Array>} - Array of generated explanations
 */
export const generateBatchExplanations = async (questions, language = 'fr', customPrompt = null, contextData = null) => {
    const results = [];
    
    for (const question of questions) {
        try {
            const explanation = await generateExplanation(question, language, customPrompt, contextData);
            results.push({
                questionId: question._id,
                success: true,
                explanation
            });
            
            // Add delay to respect API rate limits (if any)
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            results.push({
                questionId: question._id,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
};

/**
 * Check if Gemini API is configured and accessible
 * @returns {Promise<boolean>}
 */
export const testGeminiConnection = async () => {
    if (!GEMINI_API_KEY) {
        console.error('Gemini connection test failed: API key not configured');
        return false;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent("Hello, this is a test.");
        const response = await result.response;
        const text = response.text();
        
        console.log('Gemini connection test response:', text ? 'Success' : 'No text');
        return text && text.length > 0;
    } catch (error) {
        console.error('Gemini connection test failed:', error);
        return false;
    }
};

/**
 * Extract text content from PDF file
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<string>} - Extracted text content
 */
export const extractTextFromPDF = async (pdfPath) => {
    try {
        const text = await extractPdfText(pdfPath);
        return text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
};

export default {
    generateExplanation,
    generateBatchExplanations,
    testGeminiConnection,
    extractTextFromPDF
};
