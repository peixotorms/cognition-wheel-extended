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
import { anthropic, AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { google, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
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
    logger.log(`Calling ${modelConfig.name}...`, { model: modelConfig.name, codeName: modelConfig.codeName });
    
    const prompt = `Context: ${context}

Question: ${question}

Please provide a detailed, well-reasoned answer.`;

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
 * Replaces anonymous code names with real model names in the final synthesis
 */
function replaceCodeNamesWithRealNames(text: string, models: ModelConfig[]): string {
  let result = text;
  models.forEach(model => {
    const codeNameRegex = new RegExp(model.codeName, 'g');
    result = result.replace(codeNameRegex, model.name);
  });
  return result;
}

/**
 * Constructs the detailed "rich prompt" for the final synthesis step using anonymous code names.
 */
function createSynthesizerPrompt(context: string, question: string, responses: string[], models: ModelConfig[]): string {
  const [response1, response2, response3] = responses;

  // This template is designed to guide the final model to perform a critical analysis.
  return `This is a high-level reasoning task. Your goal is to act as a critical and objective evaluator of the provided model outputs. Do not simply repeat the information; your value is in the synthesis and analysis.

**Original Context:**
> ${context}

**Original Question:**
> ${question}

**Analysis Task:**
You have been provided with three distinct responses to the above question from three different AI systems (${models[0].codeName}, ${models[1].codeName}, and ${models[2].codeName}). Your task is to critically evaluate these responses and generate a single, comprehensive, and well-reasoned final answer.

IMPORTANT: Use only the provided system code names (${models[0].codeName}, ${models[1].codeName}, ${models[2].codeName}) when referring to the systems. Do not speculate about their actual identities.

Please structure your response by following these steps:

1.  **Identify Areas of Agreement:**
    * Begin by summarizing the key points, conclusions, or facts where all three systems are in agreement. This will form the foundation of the final answer.

2.  **Identify Areas of Disagreement and Nuance:**
    * Carefully compare the responses and highlight any contradictions, discrepancies, or subtle differences in their conclusions or the data they provided.
    * For each point of disagreement, briefly analyze why the systems might have differed.
    * Evaluate all inputs with equal weight, without bias toward any particular system.

3.  **Synthesize a Final, Verified Answer:**
    * Based on your analysis of the agreements and disagreements, construct what you believe to be the most accurate and complete answer.
    * If one system's answer seems more plausible or well-supported, explain why using only the code names.
    * If the systems missed something important from the original context, please add it.
    * Present this final answer clearly and concisely.

**System Responses for Analysis:**
---
**${models[0].codeName} Response:**
> ${response1}
---
**${models[1].codeName} Response:**
> ${response2}
---
**${models[2].codeName} Response:**
> ${response3}
---

**Final Synthesized Answer:**
(Begin your final answer here, following the three steps outlined in the Analysis Task.)
  `.trim();
}

// --- Main Tool Logic ---

class CognitionWheel {
  private models: ModelConfig[] = [];

  constructor() {
    // Check for required API keys
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(chalk.red('Missing ANTHROPIC_API_KEY environment variable'));
    }
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error(chalk.red('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable'));
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error(chalk.red('Missing OPENAI_API_KEY environment variable'));
    }


  }

  getModels(useSearch: boolean) {
    this.models = [
      {
        name: 'Claude-4-Opus',
        codeName: 'Alpha',
        provider: anthropic,
        model: 'claude-4-opus-20250514',
        config: {
          providerOptions: {
            anthropic: {
              thinking: { type: 'enabled', budgetTokens: 12000 },
              ...(useSearch ? {
                webSearch: {
                  maxUses: 3,
                }
              } : {})
            } satisfies AnthropicProviderOptions,
          },
        }
      },
      {
        name: 'Gemini-2.5-Pro',
        codeName: 'Beta',
        provider: google,
        model: 'gemini-2.5-pro-preview-06-05',
        config: {
          ...(useSearch ? {
            providerOptions: {
              google: {
                useSearchGrounding: true,
              } satisfies GoogleGenerativeAIProviderOptions,
            }
          } : {})
        }
      },
      {
        name: 'O3',
        codeName: 'Gamma',
        provider: openai,
        model: 'o3',
        config: {
          providerOptions: {
            openai: {
              reasoningEffort: 'medium', // low, medium, high
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
      }
    ];
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
        models: this.models.map(m => ({ name: m.name, codeName: m.codeName }))
      });

      // 2. Make three parallel API calls to real models
      logger.log('Dispatching calls to all three models in parallel.');

      const promises = this.models.map(model =>
        callRealModel(model, context, question, logger)
      );

      const responses = await Promise.all(promises);
      const parallelDuration = Date.now() - startTime;
      logger.log(`All model responses received in ${parallelDuration}ms.`, { 
        parallelDuration,
        responseLengths: responses.map(r => r.length)
      });

      // 3. Randomly select one model to be the synthesizer
      const synthesizerModel = this.models[Math.floor(Math.random() * this.models.length)];
      logger.log(`Randomly selected ${synthesizerModel.name} as the synthesizer.`, { 
        synthesizer: synthesizerModel.name,
        synthesizerCodeName: synthesizerModel.codeName
      });

      // 4. Construct the rich prompt for the synthesizer using code names
      const finalPrompt = createSynthesizerPrompt(context, question, responses, this.models);
      logger.log('Generating final synthesis...', { 
        promptLength: finalPrompt.length,
        synthesizerModel: synthesizerModel.name
      });

      // 5. Make the final synthesis call
      const synthStartTime = Date.now();
      const { text: rawFinalAnswer } = await generateText({
        model: synthesizerModel.provider(synthesizerModel.model),
        prompt: finalPrompt,
      });

      // 6. Replace code names with real model names in the final synthesis
      const finalAnswer = replaceCodeNamesWithRealNames(rawFinalAnswer, this.models);
      const synthDuration = Date.now() - synthStartTime;
      logger.log('Final synthesis completed and de-anonymized.', { 
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
  description: "A tool that consults three AI models (Claude Opus, Gemini 2.0, GPT-4) in parallel, then uses one of them to synthesize the results into a single, high-quality answer. Use this for complex questions requiring deep analysis and verification.",
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
        description: "Set to true to allow the three models to search the internet for information."
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
