# Cognition Wheel Extended - MCP Server

A Model Context Protocol (MCP) server that implements a "wisdom of crowds" approach to AI reasoning by consulting multiple state-of-the-art language models in parallel and synthesizing their responses.

**Extended fork with support for multiple providers: OpenAI GPT-5, DeepSeek, z.ai GLM-4.6, OpenRouter models, and custom OpenAI-compatible providers (novita.ai, together.ai, etc.)!**

**Original by Nikita Podelenko | Extended by Raul P.**

## Quick Start

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and add your API keys
4. Build the project: `pnpm run build`

## How It Works

The Cognition Wheel follows a three-phase process:

1. **Parallel Consultation**: Simultaneously queries configured AI models (all optional, at least one required):
   - **GPT-5** (OpenAI) with configurable reasoning effort - if OPENAI_API_KEY is provided
   - **DeepSeek** (deepseek-chat or deepseek-reasoner) - if DEEPSEEK_API_KEY is provided
   - **GLM-4.6** (z.ai) - if ZAI_API_KEY is provided
   - **Configurable OpenRouter models** (default: Qwen3-Coder, DeepSeek-v3.2, Kimi-K2) - if OPENROUTER_API_KEY is provided
   - **Custom OpenAI-compatible providers** (novita.ai, together.ai, etc.) - if CUSTOM_OPENAI_API_KEY is provided

2. **Smart Synthesis**: Uses the first configured model as the synthesizer (priority order: OpenAI > DeepSeek > z.ai > OpenRouter > Custom OpenAI-compatible), which analyzes all responses and produces a final, comprehensive answer

## Features

- **Parallel Processing**: All models are queried simultaneously for faster results
- **Multi-Model Synthesis**: One randomly selected model synthesizes all responses into a comprehensive answer
- **Internet Search**: Optional web search capabilities for OpenAI models
- **Detailed Logging**: Comprehensive debug logs for transparency and troubleshooting
- **Robust Error Handling**: Graceful degradation when individual models fail

## Installation

### Option 1: Build from source

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and add your API keys
4. Build the project: `pnpm run build`

### Option 2: Install from npm (when published)

```bash
# This will work once the package is published to npm
npm install -g mcp-cognition-wheel-extended
mcp-cognition-wheel-extended
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
  - Options: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`

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
  - Examples: `qwen/qwen3-coder`, `deepseek/deepseek-v3.2-exp`, `anthropic/claude-3.7-sonnet:thinking`, `meta-llama/llama-3.3-70b-instruct`

- `ZAI_MODEL`: z.ai model to use
  - Default: `glm-4.6`
  - Options: `glm-4.6`, `glm-4-plus`, `glm-4-air`, etc.

- `ZAI_BASE_URL`: z.ai API endpoint
  - Default: `https://api.z.ai/api/anthropic/v1` (⚡ fastest, ~40% faster)
  - Coding Plan: `https://api.z.ai/api/coding/paas/v4` (OpenAI format)
  - Common API: `https://api.z.ai/api/paas/v4` (OpenAI format)

- `CUSTOM_OPENAI_BASE_URL`: Base URL for custom OpenAI-compatible provider
  - Required when using `CUSTOM_OPENAI_API_KEY`
  - **IMPORTANT**: Do NOT include `/v1` in the URL (the SDK handles this automatically)
  - Example for novita.ai: `https://api.novita.ai/openai`
  - Example for together.ai: `https://api.together.xyz`

- `CUSTOM_OPENAI_MODEL`: Model name for custom OpenAI-compatible provider
  - Required when using `CUSTOM_OPENAI_API_KEY`
  - Example: `meta-llama/Llama-3.3-70B-Instruct-Turbo`

### Using with Claude Code

**Quick Setup (One Command)**

First, build the project:
```bash
cd /path/to/cognition-wheel-extended
pnpm install
pnpm run build
```

Then add the MCP server to Claude Code:

**Full configuration:**
```bash
claude mcp add cognition-wheel-extended -s user \
  -e OPENAI_API_KEY="sk-your-openai-key" \
  -e DEEPSEEK_API_KEY="sk-your-deepseek-key" \
  -e OPENROUTER_API_KEY="sk-your-openrouter-key" \
  -e ZAI_API_KEY="your-zai-key" \
  -e OPENAI_MODEL="gpt-5" \
  -e OPENAI_REASONING_EFFORT="high" \
  -e DEEPSEEK_MODEL="deepseek-chat" \
  -e OPENROUTER_MODELS="qwen/qwen3-coder,deepseek/deepseek-v3.2-exp,moonshotai/kimi-k2-0905" \
  -- node /absolute/path/to/cognition-wheel-extended/dist/app.js
```

**Minimal setup (DeepSeek only):**
```bash
claude mcp add cognition-wheel-extended -s user \
  -e DEEPSEEK_API_KEY="sk-your-deepseek-key" \
  -- node /absolute/path/to/cognition-wheel-extended/dist/app.js
```

**OpenAI only:**
```bash
claude mcp add cognition-wheel-extended -s user \
  -e OPENAI_API_KEY="sk-your-openai-key" \
  -e OPENAI_MODEL="gpt-5" \
  -e OPENAI_REASONING_EFFORT="high" \
  -- node /absolute/path/to/cognition-wheel-extended/dist/app.js
```

**Custom OpenAI-compatible provider (e.g., novita.ai):**
```bash
claude mcp add cognition-wheel-extended -s user \
  -e CUSTOM_OPENAI_API_KEY="your-novita-key" \
  -e CUSTOM_OPENAI_BASE_URL="https://api.novita.ai/openai" \
  -e CUSTOM_OPENAI_MODEL="deepseek/deepseek-v3.2-exp" \
  -- node /absolute/path/to/cognition-wheel-extended/dist/app.js
```

**Verify installation:**
```bash
# List all MCP servers
claude mcp list

# Restart the server
claude mcp restart cognition-wheel-extended
```

**Using the tool:**

Once connected, Claude Code will automatically use the `cognition_wheel` tool for complex reasoning tasks, or you can explicitly request it:

```
Use the cognition_wheel tool to analyze the trade-offs between
microservices and monolithic architectures.
```

### Using with Cursor

Based on the guide from [this dev.to article](https://dev.to/andyrewlee/use-your-own-mcp-on-cursor-in-5-minutes-1ag4), here's how to integrate with Cursor:

1. **Build the project** (if not already done):
   ```bash
   pnpm run build
   ```

2. **Configure the server**:
   - **Name**: `cognition-wheel-extended`
   - **Command**: `node`
   - **Args**: `["/absolute/path/to/your/cognition-wheel-extended/dist/app.js"]`

   Example configuration:
   ```json
   {
     "cognition-wheel-extended": {
       "command": "node",
       "args": [
         "/Users/yourname/path/to/cognition-wheel-extended/dist/app.js"
       ],
       "env": {
         "OPENAI_API_KEY": "your_openai_key",
         "OPENROUTER_API_KEY": "your_openrouter_key",
         "ZAI_API_KEY": "your_zai_key",
         "OPENROUTER_MODELS": "qwen/qwen3-coder,deepseek/deepseek-v3.2-exp,moonshotai/kimi-k2-0905",
         "ZAI_BASE_URL": "https://api.z.ai/api/coding/paas/v4"
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
docker build -t cognition-wheel-extended .

# Run with environment variables
docker run --rm \
  -e OPENAI_API_KEY=your_openai_key \
  -e DEEPSEEK_API_KEY=your_deepseek_key \
  -e OPENROUTER_API_KEY=your_openrouter_key \
  -e ZAI_API_KEY=your_zai_key \
  -e CUSTOM_OPENAI_API_KEY=your_custom_key \
  -e CUSTOM_OPENAI_BASE_URL="https://api.novita.ai/openai" \
  -e CUSTOM_OPENAI_MODEL="deepseek/deepseek-v3.2-exp" \
  -e OPENROUTER_MODELS="qwen/qwen3-coder,deepseek/deepseek-v3.2-exp,moonshotai/kimi-k2-0905" \
  -e ZAI_BASE_URL="https://api.z.ai/api/coding/paas/v4" \
  cognition-wheel-extended
```

## License

MIT 