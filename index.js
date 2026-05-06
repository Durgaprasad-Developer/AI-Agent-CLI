import readline from "readline";
import { exec } from "child_process";
import fs from "fs/promises";

/**
 * AI Agent CLI Tool
 * Implements a reasoning loop (THINK -> TOOL -> OBSERVE) using Gemini API.
 */

// Load environment variables from .env file manually to keep it dependency-free
async function loadEnv() {
    try {
        const env = await fs.readFile(".env", "utf-8");
        env.split("\n").forEach(line => {
            const [key, value] = line.split("=");
            if (key && value) process.env[key.trim()] = value.trim();
        });
    } catch (e) {
        // .env not found, will fallback to provided API key or environment
    }
}

await loadEnv();

// Gemini API Key Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCj8TmhKz-2uV6rKWhwj0QxRDE46w7KmsI";

/**
 * Calls the Gemini API to get a reasoned response in JSON format.
 */
async function queryGemini(messages) {
    if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const contents = messages.filter(m => m.role !== "system").map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
    }));

    const systemInstruction = messages.find(m => m.role === "system")?.content;

    const payload = {
        contents: contents,
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.error) throw new Error(`${data.error.code}: ${data.error.message}`);
    
    if (!data.candidates || !data.candidates[0].content) {
        throw new Error("No content returned from Gemini. Data: " + JSON.stringify(data));
    }

    return data.candidates[0].content.parts[0].text;
}

// --- TOOL DEFINITIONS ---

async function executeCommand(cmd = "") {
    return new Promise((res) => {
        exec(cmd, (error, stdout, stderr) => {
            res(error ? `Error: ${error.message}` : (stdout || stderr || "Success"));
        });
    });
}

async function writeFile(path, content) {
    try {
        await fs.writeFile(path, content, "utf-8");
        return `File written to ${path}`;
    } catch (error) {
        return `Error writing file: ${error.message}`;
    }
}

async function readFile(path) {
    try {
        return await fs.readFile(path, "utf-8");
    } catch (error) {
        return `Error reading file: ${error.message}`;
    }
}

async function getTheWeatherOfCity(cityname = "") {
    const url = `https://wttr.in/${cityname.toLowerCase()}?format=%C+%t`;
    try {
        const response = await fetch(url);
        const data = await response.text();
        return `The Weather of ${cityname} is ${data}`;
    } catch (e) { return `Error: ${e.message}`; }
}

async function getGithubDetailsAboutUser(username = "") {
    const url = `https://api.github.com/users/${username}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return JSON.stringify({ login: data.login, name: data.name, public_repos: data.public_repos });
    } catch (e) { return `Error: ${e.message}`; }
}

// Tool Registry
const tool_map = {
    executeCommand,
    writeFile,
    readFile,
    getTheWeatherOfCity,
    getGithubDetailsAboutUser
};

const system_prompt = `
You are an AI Assistant who works on INPUT, THINK, TOOL, OBSERVE and OUTPUT format.
You will always follow the JSON format for every step.

Tools available:
1. executeCommand(cmd : string) - Runs shell commands.
2. writeFile(path: string, content: string) - Saves code/text to files.
3. readFile(path: string) - Reads file content.
4. getTheWeatherOfCity(cityname : string) - Fetches real-time weather.
5. getGithubDetailsAboutUser(username : string) - Fetches user profile data.

Execution Logic:
- THINK: Reason about the user instruction.
- TOOL: If you need to act, call a tool with specific arguments.
- OBSERVE: Receive the tool's result.
- OUTPUT: Provide the final answer once the task is complete.

For cloning Scaler Academy:
Create a 'scaler_clone' folder. Include index.html, style.css, and script.js. 
Ensure the design is professional with a Header, Hero Section, and Footer.

Output format :
{ "step" : "START | THINK | TOOL | OBSERVE | OUTPUT" , "content" : "string" , "tool_name" : "string" , "tool_args" : { "arg1": "val1" } }
`;

/**
 * Main Agent Loop
 */
async function agent(userInput) {
    const messages = [{ role: "system", content: system_prompt }, { role: "user", content: userInput }];
    
    while (true) {
        let content;
        try {
            content = await queryGemini(messages);
        } catch (err) {
            console.error("\x1b[31m%s\x1b[0m", `[ERROR] ${err.message}`);
            break;
        }
        
        let parsedContent;
        try {
            // Robust JSON parsing (handles potential markdown wrapping)
            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            parsedContent = JSON.parse(jsonStr);
        } catch (e) {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) parsedContent = JSON.parse(match[0]);
            else throw new Error("Could not parse JSON. Raw: " + content);
        }

        messages.push({ role: "assistant", content: JSON.stringify(parsedContent) });
        
        // Log the current step to the terminal
        console.log(`\x1b[36m[${parsedContent.step}]\x1b[0m ${parsedContent.content || ""}`);
        
        if (parsedContent.step === "OUTPUT") {
            console.log("\n\x1b[32mFinal Result:\x1b[0m", parsedContent.content);
            break;
        }
        
        if (parsedContent.step === "TOOL") {
            const tool = tool_map[parsedContent.tool_name];
            let result;
            if (tool) {
                const args = parsedContent.tool_args || {};
                result = await tool(...Object.values(args));
            } else {
                result = "Tool not available";
            }
            
            // Add observation back to memory
            messages.push({ role: "developer", content: JSON.stringify({ step: "OBSERVE", content: result }) });
            console.log(`\x1b[33m[OBSERVE]\x1b[0m Tool executed: ${parsedContent.tool_name}`);
        }
    }
}

// CLI Interface setup
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askQuestion() {
    rl.question("\x1b[35mUser:\x1b[0m ", async (input) => {
        if (input.toLowerCase() === "exit") {
            rl.close();
            process.exit(0);
        }
        await agent(input);
        askQuestion();
    });
}

console.log("\x1b[1mAI Agent CLI Tool Started (Gemini Core).\x1b[0m Type 'exit' to quit.");
askQuestion();
