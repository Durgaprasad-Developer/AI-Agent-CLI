# AI Agent CLI Tool

A conversational CLI agent that reasons through tasks using the THINK-TOOL-OBSERVE loop. Built for cloning websites and executing terminal commands.

## Features
- **Reasoning Loop**: Uses a structured system prompt to ensure the agent thinks before acting.
- **Terminal Integration**: Can execute shell commands and manage files.
- **Web Cloning**: Specifically optimized to clone the Scaler Academy website structure.

## Installation
1. Clone the repository.
2. Install dependencies (if npm is available):
   ```bash
   npm install
   ```
3. Create a `.env` file and add your `OPENAI_API_KEY`:
   ```bash
   OPENAI_API_KEY=sk-....
   ```

## Usage
Run the agent:
```bash
node index.js
```
Provide instructions like:
- "Create a folder named scaler_clone and clone the Scaler Academy website."
- "What files are in the current directory?"

## Assignment Details
- **Assignment**: 02 — AI Agent CLI Tool
- **Goal**: Build a CLI agent that can clone the Scaler Academy website.
- **Logic**: INPUT -> THINK -> TOOL -> OBSERVE -> OUTPUT.
