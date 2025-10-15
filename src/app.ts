#!/usr/bin/env tsx

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import chalk from 'chalk';
import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Load environment variables
dotenv.config();


// --- Logger ---
class WheelLogger {
  private logFile: string;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Use tmp directory or fallback to user home directory
    const logDir = process.env.TMPDIR || process.env.TMP || os.tmpdir() || os.homedir();
    this.logFile = path.join(logDir, `wheel-${timestamp}.log`);
    this.log(`=== Cognition Wheel Session Started, logging to ${this.logFile} ===`);
  }

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] ${message}`;
    if (data) {
      logEntry += `\n${JSON.stringify(data, null, 2)}`;
    }
    logEntry += '\n';
    
    // Write to file
    fs.appendFileSync(this.logFile, logEntry);
    
    // Also log to console
    console.error(chalk.gray(`[LOG] ${message}`));
  }

  getLogPath(): string {
    return this.logFile;
  }

  getLogContent(): string {
    return fs.readFileSync(this.logFile, 'utf-8');
  }
}

const logger = new WheelLogger();

// --- Types ---
interface ModelConfig {
  name: string;
  codeName: string;  // Anonymous code name for bias reduction
  provider: any;
  model: string;
  config?: any;
}

// --- Helper Functions ---

/**
 * Makes actual API calls to the specified AI models
 * @param modelConfig The model configuration object
 * @param context The context for the query
 * @param question The specific question
 * @returns A promise that resolves with the model's answer
 */
async function callRealModel(
  modelConfig: ModelConfig, 
  context: string, 
  question: string,
  logger: WheelLogger,
): Promise<string> {
  try {
    const startTime = Date.now();
    logger.log(`Calling ${modelConfig.name}...`, { model: modelConfig.name });
    
    const prompt = `Context: ${context}

Question: ${question}`;

    const { text } = await generateText({
      model: modelConfig.provider(modelConfig.model),
      prompt,
      ...modelConfig.config,
    });

    const duration = Date.now() - startTime;
    logger.log(`Received response from ${modelConfig.name} in ${duration}ms`, { 
      model: modelConfig.name, 
      duration,
      responseLength: text.length,
      responsePreview: text.substring(0, 200) + '...'
    });
    return text;
  } catch (error) {
    logger.log(`Error calling ${modelConfig.name}`, { 
      model: modelConfig.name, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return `Error from ${modelConfig.name}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Constructs the detailed "rich prompt" for the final synthesis step.
 * Supports any number of models (2+).
 */
function createSynthesizerPrompt(context: string, question: string, responses: string[], models: ModelConfig[]): string {
  const numModels = models.length;
  const modelNames = models.map(m => m.name).join(', ');

  // Build the system responses section dynamically
  const systemResponsesSection = models.map((model, index) => {
    return `**${model.name}:**
${responses[index]}`;
  }).join('\n\n---\n\n');

  // This template is designed to guide the final model to perform a critical analysis.
  return `You are synthesizing responses from multiple AI models to provide a comprehensive answer.

**Original Context:**
${context}

**Original Question:**
${question}

**Task:**
Below are ${numModels} responses from different AI models (${modelNames}). Analyze these responses and create a single, comprehensive answer.

**Model Responses:**
---

${systemResponsesSection}

---

**Your Synthesis:**`;
}

// --- Main Tool Logic ---

class CognitionWheel {
  private models: ModelConfig[] = [];

  constructor() {
    // Check that at least one API key is provided
    const hasAtLeastOneKey =
      process.env.OPENAI_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.ZAI_API_KEY ||
      process.env.CUSTOM_OPENAI_API_KEY;

    if (!hasAtLeastOneKey) {
      console.error(chalk.red('ERROR: At least one API key is required (OPENAI_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, ZAI_API_KEY, or CUSTOM_OPENAI_API_KEY)'));
      process.exit(1);
    }

    // Log which providers are configured
    const configuredProviders = [];
    if (process.env.OPENAI_API_KEY) configuredProviders.push('OpenAI');
    if (process.env.DEEPSEEK_API_KEY) configuredProviders.push('DeepSeek');
    if (process.env.OPENROUTER_API_KEY) configuredProviders.push('OpenRouter');
    if (process.env.ZAI_API_KEY) configuredProviders.push('z.ai');
    if (process.env.CUSTOM_OPENAI_API_KEY) configuredProviders.push('Custom-OpenAI-Compatible');

    console.error(chalk.green(`Configured providers: ${configuredProviders.join(', ')}`));
  }

  getModels(useSearch: boolean) {
    const codeNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
    this.models = [];

    // IMPORTANT: Models are only added if their corresponding API key environment variable exists.
    // This ensures no API calls are made to providers without valid credentials.
    // Priority order for synthesizer selection: OpenAI > DeepSeek > z.ai > OpenRouter > Custom

    // Add OpenAI model if API key is provided
    if (process.env.OPENAI_API_KEY) {
      const openaiModel = process.env.OPENAI_MODEL || 'gpt-5';
      const openaiReasoningEffort = (process.env.OPENAI_REASONING_EFFORT || 'high') as 'minimal' | 'low' | 'medium' | 'high';

      this.models.push({
        name: openaiModel.toUpperCase(),
        codeName: codeNames[this.models.length],
        provider: openai,
        model: openaiModel,
        config: {
          providerOptions: {
            openai: {
              reasoningEffort: openaiReasoningEffort,
            },
          },
          ...(useSearch ? {
            tools: {
              web_search_preview: openai.tools.webSearchPreview({
                searchContextSize: 'high',
              }),
            },
          } : {})
        },
      });
    }

    // Add DeepSeek model if API key is provided
    if (process.env.DEEPSEEK_API_KEY) {
      const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

      this.models.push({
        name: deepseekModel.toUpperCase(),
        codeName: codeNames[this.models.length],
        provider: deepseek,
        model: deepseekModel,
        config: {}
      });
    }

    // Add z.ai model if API key is provided
    if (process.env.ZAI_API_KEY) {
      // Use configurable base URL - defaults to faster Anthropic-compatible endpoint
      // Options: https://api.z.ai/api/anthropic/v1 (fastest, default)
      //          https://api.z.ai/api/coding/paas/v4 (for coding plan)
      //          https://api.z.ai/api/paas/v4 (common API)
      const zaiBaseUrl = process.env.ZAI_BASE_URL || 'https://api.z.ai/api/anthropic/v1';
      const zaiModel = process.env.ZAI_MODEL || 'glm-4.6';

      // Use Anthropic SDK for anthropic endpoint, OpenRouter SDK for OpenAI-compatible endpoints
      const isAnthropicEndpoint = zaiBaseUrl.includes('/anthropic');
      const zaiProvider = isAnthropicEndpoint
        ? createAnthropic({
            apiKey: process.env.ZAI_API_KEY,
            baseURL: zaiBaseUrl
          })
        : createOpenRouter({
            apiKey: process.env.ZAI_API_KEY,
            baseURL: zaiBaseUrl
          });

      this.models.push({
        name: zaiModel.toUpperCase(),
        codeName: codeNames[this.models.length],
        provider: zaiProvider,
        model: zaiModel,
        config: {}
      });
    }

    // Add OpenRouter models if API key is provided
    if (process.env.OPENROUTER_API_KEY) {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      // Get configurable OpenRouter models from environment variable
      const openrouterModelsEnv = process.env.OPENROUTER_MODELS || 'qwen/qwen3-coder,deepseek/deepseek-v3.2-exp,moonshotai/kimi-k2-0905';
      const openrouterModelSpecs = openrouterModelsEnv.split(',').map(spec => spec.trim());

      openrouterModelSpecs.forEach((spec) => {
        const modelId = spec;
        const displayName = modelId.split('/')[1] || modelId;
        this.models.push({
          name: `OpenRouter-${displayName}`,
          codeName: codeNames[this.models.length],
          provider: openrouter,
          model: modelId,
          config: {}
        });
      });
    }

    // Add custom OpenAI-compatible provider if API key is provided
    if (process.env.CUSTOM_OPENAI_API_KEY) {
      const customBaseUrl = process.env.CUSTOM_OPENAI_BASE_URL;
      const customModel = process.env.CUSTOM_OPENAI_MODEL;

      if (!customBaseUrl || !customModel) {
        console.error(chalk.yellow('Warning: CUSTOM_OPENAI_API_KEY provided but missing CUSTOM_OPENAI_BASE_URL or CUSTOM_OPENAI_MODEL'));
      } else {
        // Use OpenRouter SDK with custom base URL for better compatibility
        const customProvider = createOpenRouter({
          apiKey: process.env.CUSTOM_OPENAI_API_KEY,
          baseURL: customBaseUrl
        });

        this.models.push({
          name: `Custom-${customModel}`,
          codeName: codeNames[this.models.length],
          provider: customProvider,
          model: customModel,
          config: {}
        });
      }
    }

    return this.models;
  }

  /**
   * Orchestrates the entire process: parallel calls, result aggregation, and final synthesis.
   */
  async process(input: { context: string, question: string, enable_internet_search: boolean }): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    
    
    try {
      const args = input as { context: string, question: string, enable_internet_search: boolean };
      const startTime = Date.now();

      // 1. Validate inputs
      if (typeof args.context !== 'string' || typeof args.question !== 'string') {
        throw new Error('Invalid arguments. "context" and "question" must be strings, and "enable_internet_search" must be a boolean.');
      }
      const { context, question, enable_internet_search } = args;
      this.models = this.getModels(enable_internet_search);
      logger.log('Starting Cognition Wheel process...', {
        enable_internet_search,
        models: this.models.map(m => m.name)
      });

      // 2. Make parallel API calls to all configured models
      logger.log(`Dispatching calls to ${this.models.length} models in parallel.`);

      const promises = this.models.map(model =>
        callRealModel(model, context, question, logger)
      );

      const responses = await Promise.all(promises);
      const parallelDuration = Date.now() - startTime;
      logger.log(`All model responses received in ${parallelDuration}ms.`, { 
        parallelDuration,
        responseLengths: responses.map(r => r.length)
      });

      // 3. Use the first configured model as the synthesizer
      const synthesizerModel = this.models[0];
      logger.log(`Using ${synthesizerModel.name} as the synthesizer.`, {
        synthesizer: synthesizerModel.name
      });

      // 4. Construct the synthesis prompt
      const finalPrompt = createSynthesizerPrompt(context, question, responses, this.models);
      logger.log('Generating final synthesis...', { 
        promptLength: finalPrompt.length,
        synthesizerModel: synthesizerModel.name
      });

      // 5. Make the final synthesis call
      const synthStartTime = Date.now();
      const { text: finalAnswer } = await generateText({
        model: synthesizerModel.provider(synthesizerModel.model),
        prompt: finalPrompt,
      });

      // 6. Synthesis complete
      const synthDuration = Date.now() - synthStartTime;
      logger.log('Final synthesis completed.', { 
        synthDuration,
        finalAnswerLength: finalAnswer.length,
        logPath: logger.getLogPath()
      });

      // 7. Return the complete result
      const totalDuration = Date.now() - startTime;
      const result = {
        models_used: this.models.map(m => m.model),
        synthesizer_model: synthesizerModel.name,
        //individual_responses: responses.map((response, i) => ({
        //  model: this.models[i].model,
        //  response
        //})),
        final_synthesis: finalAnswer,
        timing: {
          total_duration_ms: totalDuration,
          parallel_duration_ms: parallelDuration,
          synthesis_duration_ms: synthDuration
        },
        debugLogFile: logger.getLogPath(),
        status: 'success'
      };

      logger.log('Process completed successfully', { totalDuration, logPath: logger.getLogPath() });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      logger.log('An error occurred in the Cognition Wheel', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            debug: {
              log_file: logger.getLogPath()
            },
            status: 'failed'
          }, null, 2)
        }],
        isError: true
      };
    }
  }
}

// --- MCP Server Setup ---

const COGNITION_WHEEL_TOOL = {
  name: "cognition_wheel",
  description: "A tool that consults multiple AI models (OpenAI GPT-5, DeepSeek, z.ai GLM-4.6, configurable OpenRouter models, and custom OpenAI-compatible providers) in parallel, then uses one of them to synthesize all responses into a single, high-quality answer. Supports 2+ models. Use this for complex questions requiring deep analysis and verification from multiple AI perspectives.",
  inputSchema: {
    type: "object",
    properties: {
      context: {
        type: "string",
        description: "Important background information and context for the problem to be solved."
      },
      question: {
        type: "string",
        description: "The specific, detailed question you want to be answered."
      },
      enable_internet_search: {
        type: "boolean",
        description: "Set to true to allow the models to search the internet for information (OpenAI only)."
      }
    },
    required: ["context", "question", "enable_internet_search"]
  }
};

const server = new Server({
  name: "cognition-wheel-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

const cognitionWheel = new CognitionWheel();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [COGNITION_WHEEL_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  if (request.params.name === "cognition_wheel") {
    return cognitionWheel.process(request.params.arguments);
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(chalk.inverse(" Cognition Wheel MCP Server running on stdio, logging to " + logger.getLogPath()));
}

runServer().catch((error) => {
  console.error(chalk.red.bold("Fatal error running server:"), error);
  process.exit(1);
});
