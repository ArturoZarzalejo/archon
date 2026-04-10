import type { AgentDefinition } from '@/schema/agent';
import type { PipelineDefinition } from '@/schema/pipeline';
import type { ArchonConfig } from '@/schema/config';
import { scanAgentFiles } from '@/scanner/fileScanner';
import { scanMarkdownFiles } from '@/scanner/markdownScanner';
import { detectFrameworkAgents } from '@/scanner/frameworkDetector';

export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();
  private pipelines: Map<string, PipelineDefinition> = new Map();
  private config: ArchonConfig | null;
  private rootDir: string;

  constructor(config: ArchonConfig, rootDir: string) {
    this.config = config;
    this.rootDir = rootDir;

    if (config.pipelines) {
      for (const p of config.pipelines) {
        this.pipelines.set(p.id, p);
      }
    }
  }

  /** Create a registry from static/baked data (no scanning needed) */
  static fromMocks(
    agents: Record<string, unknown>[],
    pipelines: Record<string, unknown>[],
  ): AgentRegistry {
    const emptyConfig: ArchonConfig = { include: [] } as ArchonConfig;
    const registry = new AgentRegistry(emptyConfig, '');
    for (const a of agents) {
      // Agents from mocks/baked JSON are already serialized — store directly
      registry.agents.set(String(a.id), a as AgentDefinition);
    }
    for (const p of pipelines) {
      registry.pipelines.set(String(p.id), p as PipelineDefinition);
    }
    console.log(`[archon] Loaded ${registry.agents.size} agents, ${registry.pipelines.size} pipelines`);
    return registry;
  }

  async scan(): Promise<void> {
    this.agents.clear();

    // Scan *.agent.ts files (highest priority)
    const fileAgents = await scanAgentFiles(this.rootDir, this.config?.include ?? []);
    for (const agent of fileAgents) {
      this.agents.set(agent.id, agent);
    }

    // Scan markdown documentation files (lower priority — won't overwrite TS agents)
    if (this.config?.markdown?.enabled) {
      const mdPatterns = this.config.markdown.paths ?? ['.agents/**/*.md'];
      const mdAgents = await scanMarkdownFiles(this.rootDir, mdPatterns);
      for (const agent of mdAgents) {
        if (!this.agents.has(agent.id)) {
          this.agents.set(String(agent.id), agent as AgentDefinition);
        }
      }
      console.log(`[archon] Discovered ${fileAgents.length} agents + ${mdAgents.length} legacy (markdown)`);
    } else {
      console.log(`[archon] Discovered ${this.agents.size} agents`);
    }

    // Auto-detect agents from popular frameworks (lowest priority — won't overwrite)
    const detected = await detectFrameworkAgents(this.rootDir);
    for (const agent of detected) {
      if (!this.agents.has(agent.id)) {
        this.agents.set(agent.id, agent as unknown as AgentDefinition);
      }
    }
    if (detected.length > 0) {
      console.log(`[archon] Auto-detected ${detected.length} agents from frameworks`);
    }
  }

  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  getPipelines(): PipelineDefinition[] {
    return Array.from(this.pipelines.values());
  }

  getPipeline(id: string): PipelineDefinition | undefined {
    return this.pipelines.get(id);
  }

  /** Serializable version for the API (strips Zod schemas, converts to JSON-safe) */
  getAllSerializable(): Record<string, unknown>[] {
    return this.getAll().map((agent) => serializeAgent(agent));
  }

  getSerializable(id: string): Record<string, unknown> | undefined {
    const agent = this.get(id);
    return agent ? serializeAgent(agent) : undefined;
  }
}

function serializeAgent(agent: AgentDefinition): Record<string, unknown> {
  return {
    ...agent,
    input: agent.input ? {
      description: agent.input.description,
      example: agent.input.example,
      schema: agent.input.schema ? String(agent.input.schema.description ?? 'Zod Schema') : undefined,
    } : undefined,
    output: agent.output ? {
      description: agent.output.description,
      example: agent.output.example,
      schema: agent.output.schema ? String(agent.output.schema.description ?? 'Zod Schema') : undefined,
    } : undefined,
  };
}
