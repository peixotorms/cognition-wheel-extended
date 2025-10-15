# Cognition Wheel Extended - MCP Server

[![npm version](https://badge.fury.io/js/mcp-cognition-wheel-extended.svg)](https://www.npmjs.com/package/mcp-cognition-wheel-extended)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that implements a "wisdom of crowds" approach to AI reasoning by consulting multiple state-of-the-art language models in parallel and synthesizing their responses.

**Extended fork with support for multiple providers: OpenAI GPT-5, DeepSeek, z.ai GLM-4.6, OpenRouter models, and custom OpenAI-compatible providers (novita.ai, together.ai, etc.)!**

**Original by Nikita Podelenko | Extended by Raul P.**

## Quick Start

```bash
# Install globally via npm
npm install -g mcp-cognition-wheel-extended

# Run the server (requires at least one API key as environment variable)
DEEPSEEK_API_KEY=your_key mcp-cognition-wheel-extended
```

## How It Works

The Cognition Wheel follows a three-phase process:

1. **Parallel Consultation**: Simultaneously queries all configured AI models (at least one required):
   - **OpenAI** (e.g., GPT-5) with configurable reasoning effort
   - **DeepSeek** (e.g., deepseek-chat or deepseek-reasoner)
   - **z.ai GLM** (e.g., GLM-4.6)
   - **OpenRouter models** (300+ models available - configure any combination you want)
   - **Custom OpenAI-compatible providers** (e.g., novita.ai, together.ai, or any OpenAI-compatible API)

2. **Smart Synthesis**: Uses the first configured model as the synthesizer (priority order: OpenAI > DeepSeek > z.ai > OpenRouter > Custom), which analyzes all responses and produces a final, comprehensive answer

The tool queries only the providers you configure - use as many or as few as you like!

## Features

- **Flexible Provider Support**: Use any combination of OpenAI, DeepSeek, z.ai, OpenRouter, or custom OpenAI-compatible providers
- **Parallel Processing**: All configured models are queried simultaneously for faster results
- **Multi-Model Synthesis**: One model synthesizes all responses into a comprehensive answer
- **Internet Search**: Optional web search capabilities (OpenAI models)
- **Detailed Logging**: Comprehensive debug logs saved to `/tmp/wheel-*.log` for transparency and troubleshooting
- **Robust Error Handling**: Graceful degradation when individual models fail
- **Easy Integration**: Works with Claude Code, Cursor, and any MCP-compatible client

## Installation

### Recommended: Install from npm

```bash
# Install globally
npm install -g mcp-cognition-wheel-extended

# Or install locally in your project
npm install mcp-cognition-wheel-extended
```

### Alternative: Build from source

```bash
# Clone the repository
git clone https://github.com/peixotorms/mcp-cognition-wheel-extended.git
cd mcp-cognition-wheel-extended

# Install dependencies
pnpm install

# Build the project
pnpm run build
```

## Usage

This is an MCP server designed to be used with MCP-compatible clients like Claude Desktop or other MCP tools.

### Required Environment Variables

**At least ONE of the following API keys is required:**

- `OPENAI_API_KEY`: Your OpenAI API key for GPT-5 (get it from [OpenAI Platform](https://platform.openai.com/api-keys))
- `DEEPSEEK_API_KEY`: Your DeepSeek API key (get it from [DeepSeek Platform](https://platform.deepseek.com))
- `OPENROUTER_API_KEY`: Your OpenRouter API key (get it from [OpenRouter Dashboard](https://openrouter.ai/keys))
- `ZAI_API_KEY`: Your z.ai API key for GLM-4.6 (get it from [z.ai](https://z.ai))
- `CUSTOM_OPENAI_API_KEY`: API key for any OpenAI-compatible provider (e.g., [novita.ai](https://novita.ai), [together.ai](https://together.ai))

### Optional Configuration

- `OPENAI_MODEL`: OpenAI model to use
  - Default: `gpt-5`
  - Options: `gpt-5-codex`, `gpt-5`, `gpt-5-mini`, `gpt-5-nano`

- `OPENAI_REASONING_EFFORT`: Reasoning effort level for OpenAI models
  - Default: `high`
  - Options: `minimal`, `low`, `medium`, `high`
  - Note: Higher effort uses more tokens but provides better reasoning

- `DEEPSEEK_MODEL`: DeepSeek model to use
  - Default: `deepseek-chat`
  - Options: `deepseek-chat`, `deepseek-reasoner`

- `OPENROUTER_MODELS`: Comma-separated list of OpenRouter models to use
  - Default: `qwen/qwen3-coder,deepseek/deepseek-v3.2-exp,moonshotai/kimi-k2-0905`
  - You can choose from [300+ models available on OpenRouter](https://openrouter.ai/models)
  - Examples: `qwen/qwen3-coder`, `deepseek/deepseek-v3.2-exp`, etc

- `ZAI_MODEL`: z.ai model to use
  - Default: `glm-4.6`
  - Options: `glm-4.6`, `glm-4.5`, `glm-4.5-air`, etc.

- `CUSTOM_OPENAI_BASE_URL`: Base URL for custom OpenAI-compatible provider
  - Required when using `CUSTOM_OPENAI_API_KEY`
  - **IMPORTANT**: Do NOT include `/v1` in the URL (the SDK handles this automatically)
  - Example for novita.ai: `https://api.novita.ai/openai`
  - Example for together.ai: `https://api.together.xyz`

- `CUSTOM_OPENAI_MODEL`: Model name for custom OpenAI-compatible provider
  - Required when using `CUSTOM_OPENAI_API_KEY`
  - Example: `deepseek/deepseek-v3.2-exp`

### Using with Claude Code

#### Option 1: Install from npm (recommended)

First, install the package globally:
```bash
npm install -g mcp-cognition-wheel-extended
```

Then add the MCP server to Claude Code with your API keys:

**Example with all providers:**
```bash
claude mcp add mcp-cognition-wheel-extended -s user \
  -e OPENAI_API_KEY="your-openai-key-here" \
  -e OPENAI_MODEL="gpt-5" \
  -e OPENAI_REASONING_EFFORT="high" \
  -e DEEPSEEK_API_KEY="your-deepseek-key-here" \
  -e DEEPSEEK_MODEL="deepseek-chat" \
  -e OPENROUTER_API_KEY="your-openrouter-key-here" \
  -e OPENROUTER_MODELS="qwen/qwen3-coder,deepseek/deepseek-v3.2-exp,moonshotai/kimi-k2-0905" \
  -e ZAI_API_KEY="your-zai-key-here" \
  -e ZAI_MODEL="glm-4.6" \
  -- mcp-cognition-wheel-extended
```

**Minimal setup (use only the providers you have keys for):**
```bash
# Example with just DeepSeek
claude mcp add mcp-cognition-wheel-extended -s user \
  -e DEEPSEEK_API_KEY="your-deepseek-key-here" \
  -- mcp-cognition-wheel-extended
```

#### Option 2: Install from source

If you built from source:
```bash
# Build the project first
cd /path/to/mcp-cognition-wheel-extended
pnpm install
pnpm run build

# Add to Claude Code with absolute path to dist/app.js
claude mcp add mcp-cognition-wheel-extended -s user \
  -e OPENAI_API_KEY="your-openai-key-here" \
  -e OPENAI_MODEL="gpt-5" \
  -e OPENAI_REASONING_EFFORT="high" \
  -e DEEPSEEK_API_KEY="your-deepseek-key-here" \
  -e DEEPSEEK_MODEL="deepseek-chat" \
  -e OPENROUTER_API_KEY="your-openrouter-key-here" \
  -e OPENROUTER_MODELS="qwen/qwen3-coder,deepseek/deepseek-v3.2-exp,moonshotai/kimi-k2-0905" \
  -e ZAI_API_KEY="your-zai-key-here" \
  -e ZAI_MODEL="glm-4.6" \
  -- node /absolute/path/to/mcp-cognition-wheel-extended/dist/app.js
```

**Verify installation:**
```bash
# List all MCP servers
claude mcp list

# Restart the server
claude mcp restart mcp-cognition-wheel-extended
```

**Using the tool:**

Once connected, Claude Code can use the `cognition_wheel` tool for complex reasoning tasks. You can explicitly request it:

```
Use the cognition_wheel tool to analyze the trade-offs between
microservices and monolithic architectures.
```

### Using with Cursor

Based on the guide from [this dev.to article](https://dev.to/andyrewlee/use-your-own-mcp-on-cursor-in-5-minutes-1ag4), here's how to integrate with Cursor:

#### Option 1: Install from npm (recommended)

1. **Install the package globally**:
   ```bash
   npm install -g mcp-cognition-wheel-extended
   ```

2. **Configure the server** in Cursor's MCP settings:

   Example configuration (add only the API keys you have):
   ```json
   {
     "mcp-cognition-wheel-extended": {
       "command": "mcp-cognition-wheel-extended",
       "env": {
         "OPENAI_API_KEY": "your-openai-key-here",
         "DEEPSEEK_API_KEY": "your-deepseek-key-here",
         "OPENROUTER_API_KEY": "your-openrouter-key-here",
         "ZAI_API_KEY": "your-zai-key-here",
         "OPENROUTER_MODELS": "qwen/qwen3-coder,deepseek/deepseek-v3.2-exp,moonshotai/kimi-k2-0905"
       }
     }
   }
   ```

   **Alternative: Using npx (no global install needed)**:
   ```json
   {
     "mcp-cognition-wheel-extended": {
       "command": "npx",
       "args": ["mcp-cognition-wheel-extended"],
       "env": {
         "DEEPSEEK_API_KEY": "your-deepseek-key-here"
       }
     }
   }
   ```

#### Option 2: Install from source

1. **Build the project**:
   ```bash
   git clone https://github.com/peixotorms/mcp-cognition-wheel-extended.git
   cd mcp-cognition-wheel-extended
   pnpm install
   pnpm run build
   ```

2. **Configure in Cursor** with absolute path:
   ```json
   {
     "mcp-cognition-wheel-extended": {
       "command": "node",
       "args": ["/absolute/path/to/mcp-cognition-wheel-extended/dist/app.js"],
       "env": {
         "DEEPSEEK_API_KEY": "your-deepseek-key-here",
         "OPENROUTER_API_KEY": "your-openrouter-key-here"
       }
     }
   }
   ```

3. **Test the integration**:
   - Enter Agent mode in Cursor
   - Ask a complex question that would benefit from multiple AI perspectives
   - The `cognition_wheel` tool should be automatically triggered

### Tool Usage

The server provides a single tool called `cognition_wheel` with the following parameters:

- `context`: Background information and context for the problem
- `question`: The specific question you want answered
- `enable_internet_search`: Boolean flag to enable web search capabilities

## Development

- `pnpm run dev`: Watch mode for development
- `pnpm run build`: Build the TypeScript code
- `pnpm run start`: Run the server directly with tsx

## Docker

Build and run with Docker:

```bash
# Build the image
docker build -t mcp-cognition-wheel-extended .

# Run with environment variables
docker run --rm \
  -e OPENAI_API_KEY=your_openai_key \
  -e DEEPSEEK_API_KEY=your_deepseek_key \
  -e OPENROUTER_API_KEY=your_openrouter_key \
  -e ZAI_API_KEY=your_zai_key \
  -e CUSTOM_OPENAI_API_KEY=your_custom_key \
  -e CUSTOM_OPENAI_BASE_URL="https://api.novita.ai/openai" \
  -e CUSTOM_OPENAI_MODEL="deepseek/deepseek-v3.2-exp" \
  -e OPENROUTER_MODELS="qwen/qwen3-coder,moonshotai/kimi-k2-0905" \
  mcp-cognition-wheel-extended
```

## License

MIT 