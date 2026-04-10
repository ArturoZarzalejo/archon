'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentNode } from '@/components/pipeline/AgentNode';

interface PipelineGraphProps {
  agents: Record<string, unknown>[];
  pipeline: {
    id: string;
    name: string;
    description?: string;
    stages: string[];
  };
}

const nodeTypes = { agent: AgentNode };

function buildGraph(
  agents: Record<string, unknown>[],
  pipeline: PipelineGraphProps['pipeline'],
) {
  const agentMap = new Map<string, Record<string, unknown>>();
  for (const a of agents) {
    agentMap.set(a.id as string, a);
  }

  const stageSet = new Set(pipeline.stages);

  // -----------------------------------------------------------------------
  // Compute vertical position per node based on dependency grouping.
  // Stages that share the same set of dependsOn predecessors within the
  // pipeline share the same column. Otherwise fall back to stage order.
  // -----------------------------------------------------------------------

  // Build adjacency: for each stage, find which other stages it depends on
  // (only those that are also in this pipeline).
  const depsInPipeline = new Map<string, string[]>();
  for (const stageId of pipeline.stages) {
    const agent = agentMap.get(stageId);
    const rawDeps = (agent?.dependsOn as string[] | undefined) ?? [];
    depsInPipeline.set(
      stageId,
      rawDeps.filter((d) => stageSet.has(d)),
    );
  }

  // Topological layering: each node's layer = max(layer of deps) + 1.
  const layerOf = new Map<string, number>();

  function getLayer(id: string): number {
    if (layerOf.has(id)) return layerOf.get(id)!;
    const deps = depsInPipeline.get(id) ?? [];
    const layer = deps.length === 0 ? 0 : Math.max(...deps.map(getLayer)) + 1;
    layerOf.set(id, layer);
    return layer;
  }

  for (const stageId of pipeline.stages) {
    getLayer(stageId);
  }

  // Group stages by layer for vertical centering.
  const layers = new Map<number, string[]>();
  for (const stageId of pipeline.stages) {
    const l = layerOf.get(stageId)!;
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(stageId);
  }

  const X_GAP = 300;
  const Y_GAP = 140;

  // Create nodes
  const nodes = pipeline.stages.map((stageId) => {
    const layer = layerOf.get(stageId)!;
    const siblings = layers.get(layer)!;
    const indexInLayer = siblings.indexOf(stageId);
    const totalInLayer = siblings.length;

    // Center siblings vertically
    const yOffset = (indexInLayer - (totalInLayer - 1) / 2) * Y_GAP;

    return {
      id: stageId,
      type: 'agent' as const,
      position: { x: layer * X_GAP, y: 300 + yOffset },
      data: {
        agent: agentMap.get(stageId),
        stageId,
      },
    };
  });

  // Create edges
  const edges: {
    id: string;
    source: string;
    target: string;
    animated: boolean;
    type: string;
    markerEnd: { type: MarkerType; color: string };
    style: { stroke: string; strokeWidth: number };
  }[] = [];

  const edgeSet = new Set<string>(); // prevent duplicates

  for (const stageId of pipeline.stages) {
    const deps = depsInPipeline.get(stageId) ?? [];

    if (deps.length > 0) {
      // Use explicit dependency edges
      for (const dep of deps) {
        const key = `${dep}->${stageId}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({
            id: key,
            source: dep,
            target: stageId,
            animated: true,
            type: 'smoothstep',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'rgba(255,255,255,0.3)',
            },
            style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 2 },
          });
        }
      }
    } else {
      // No deps within pipeline: connect from the previous stage in order
      const idx = pipeline.stages.indexOf(stageId);
      if (idx > 0) {
        const prev = pipeline.stages[idx - 1];
        const key = `${prev}->${stageId}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({
            id: key,
            source: prev,
            target: stageId,
            animated: true,
            type: 'smoothstep',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'rgba(255,255,255,0.3)',
            },
            style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 2 },
          });
        }
      }
    }
  }

  return { nodes, edges };
}

export function PipelineGraph({ agents, pipeline }: PipelineGraphProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraph(agents, pipeline);
    return { initialNodes: nodes, initialEdges: edges };
  }, [agents, pipeline]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="relative h-[600px] w-full rounded-2xl overflow-hidden border border-border-subtle">
      {/* Override ReactFlow light theme */}
      <style>{`
        .react-flow { background: transparent !important; }
        .react-flow__attribution { display: none; }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        className="bg-transparent"
      >
        <Background gap={20} color="rgba(255,255,255,0.05)" />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
