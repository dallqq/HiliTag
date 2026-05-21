"use client";

import { useEffect, useMemo, useState } from "react";
import { ENTITY_CONFIG } from "@/lib/entityConfig";
import {
  SAVED_DOCS_UPDATED_EVENT,
  getSavedDocuments,
  type SavedDoc,
} from "@/lib/storage";
import type { EntityType } from "@/types/ner";

type GraphNodeKind = "document" | "entity";
type GraphEdgeKind = "doc-entity" | "entity-entity";

interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  entityType?: EntityType;
  mentionCount: number;
  docCount: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  weight: number;
  docIds: string[];
}

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  radius: number;
}

interface GraphBuildResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const ENTITY_TYPES = Object.keys(ENTITY_CONFIG) as EntityType[];

function normalizeEntityText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildKnowledgeGraph(docs: SavedDoc[]): GraphBuildResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const entityMap = new Map<
    string,
    {
      label: string;
      entityType: EntityType;
      mentionCount: number;
      docIds: Set<string>;
      variants: Map<string, number>;
    }
  >();
  const docEntityEdgeMap = new Map<string, { source: string; target: string; weight: number; docIds: Set<string> }>();
  const entityEntityEdgeMap = new Map<string, { source: string; target: string; weight: number; docIds: Set<string> }>();

  for (const doc of docs) {
    nodes.push({
      id: `doc:${doc.id}`,
      kind: "document",
      label: doc.title,
      mentionCount: doc.entities.length,
      docCount: 1,
    });

    const perDocEntityCounts = new Map<string, number>();

    for (const entity of doc.entities) {
      const normalized = normalizeEntityText(entity.text);
      if (!normalized) continue;

      const key = `ent:${entity.entity_type}:${normalized}`;
      const existing = entityMap.get(key);

      if (!existing) {
        entityMap.set(key, {
          label: entity.text.trim(),
          entityType: entity.entity_type,
          mentionCount: 1,
          docIds: new Set([doc.id]),
          variants: new Map([[entity.text.trim(), 1]]),
        });
      } else {
        existing.mentionCount += 1;
        existing.docIds.add(doc.id);
        const oldCount = existing.variants.get(entity.text.trim()) ?? 0;
        existing.variants.set(entity.text.trim(), oldCount + 1);
      }

      perDocEntityCounts.set(key, (perDocEntityCounts.get(key) ?? 0) + 1);

      const edgeKey = `doc-edge:${doc.id}:${key}`;
      const edge = docEntityEdgeMap.get(edgeKey);
      if (!edge) {
        docEntityEdgeMap.set(edgeKey, {
          source: `doc:${doc.id}`,
          target: key,
          weight: 1,
          docIds: new Set([doc.id]),
        });
      } else {
        edge.weight += 1;
        edge.docIds.add(doc.id);
      }
    }

    const entityKeys = Array.from(perDocEntityCounts.keys()).sort();
    for (let i = 0; i < entityKeys.length; i += 1) {
      for (let j = i + 1; j < entityKeys.length; j += 1) {
        const a = entityKeys[i];
        const b = entityKeys[j];
        const pairKey = `ent-edge:${a}:${b}`;
        const boost = Math.min(perDocEntityCounts.get(a) ?? 1, perDocEntityCounts.get(b) ?? 1);
        const edge = entityEntityEdgeMap.get(pairKey);
        if (!edge) {
          entityEntityEdgeMap.set(pairKey, {
            source: a,
            target: b,
            weight: boost,
            docIds: new Set([doc.id]),
          });
        } else {
          edge.weight += boost;
          edge.docIds.add(doc.id);
        }
      }
    }
  }

  for (const [key, value] of entityMap.entries()) {
    let preferredLabel = value.label;
    let preferredCount = 0;
    for (const [variant, count] of value.variants.entries()) {
      if (count > preferredCount) {
        preferredLabel = variant;
        preferredCount = count;
      }
    }

    nodes.push({
      id: key,
      kind: "entity",
      label: preferredLabel,
      entityType: value.entityType,
      mentionCount: value.mentionCount,
      docCount: value.docIds.size,
    });
  }

  for (const [id, edge] of docEntityEdgeMap.entries()) {
    edges.push({
      id,
      source: edge.source,
      target: edge.target,
      kind: "doc-entity",
      weight: edge.weight,
      docIds: Array.from(edge.docIds),
    });
  }

  for (const [id, edge] of entityEntityEdgeMap.entries()) {
    edges.push({
      id,
      source: edge.source,
      target: edge.target,
      kind: "entity-entity",
      weight: edge.weight,
      docIds: Array.from(edge.docIds),
    });
  }

  return { nodes, edges };
}

function clampText(value: string, max = 36) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

export function KnowledgeGraphView() {
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [search, setSearch] = useState("");
  const [minMentions, setMinMentions] = useState(1);
  const [showEntityLinks, setShowEntityLinks] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<EntityType>>(new Set(ENTITY_TYPES));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setDocs(getSavedDocuments());
    };

    sync();
    window.addEventListener(SAVED_DOCS_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener(SAVED_DOCS_UPDATED_EVENT, sync);
    };
  }, []);

  const fullGraph = useMemo(() => buildKnowledgeGraph(docs), [docs]);

  const filteredGraph = useMemo(() => {
    const q = search.trim().toLowerCase();

    const entities = fullGraph.nodes.filter((node) => {
      if (node.kind !== "entity") return false;
      if (!node.entityType || !selectedTypes.has(node.entityType)) return false;
      if (node.mentionCount < minMentions) return false;
      if (!q) return true;
      return node.label.toLowerCase().includes(q);
    });
    const entityIdSet = new Set(entities.map((node) => node.id));

    const connectedDocIds = new Set<string>();
    for (const edge of fullGraph.edges) {
      if (edge.kind !== "doc-entity") continue;
      if (!entityIdSet.has(edge.target)) continue;
      connectedDocIds.add(edge.source);
    }

    const documents = fullGraph.nodes.filter((node) => {
      if (node.kind !== "document") return false;
      if (q && node.label.toLowerCase().includes(q)) return true;
      return connectedDocIds.has(node.id);
    });
    const docIdSet = new Set(documents.map((node) => node.id));

    const nodes = [...documents, ...entities];
    const nodeIdSet = new Set(nodes.map((node) => node.id));

    const edges = fullGraph.edges.filter((edge) => {
      if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) return false;
      if (edge.kind === "entity-entity" && !showEntityLinks) return false;
      return true;
    });

    const edgeDocSupport = new Set<string>();
    for (const edge of edges) {
      for (const docId of edge.docIds) {
        edgeDocSupport.add(`doc:${docId}`);
      }
    }

    const prunedNodes = nodes.filter((node) => {
      if (node.kind === "entity") return true;
      return edgeDocSupport.has(node.id) || q.length > 0;
    });

    const prunedNodeIds = new Set(prunedNodes.map((node) => node.id));
    const prunedEdges = edges.filter(
      (edge) => prunedNodeIds.has(edge.source) && prunedNodeIds.has(edge.target)
    );

    return {
      nodes: prunedNodes,
      edges: prunedEdges,
    };
  }, [fullGraph, minMentions, search, selectedTypes, showEntityLinks]);

  const graphStats = useMemo(() => {
    const docNodes = filteredGraph.nodes.filter((n) => n.kind === "document").length;
    const entityNodes = filteredGraph.nodes.filter((n) => n.kind === "entity").length;
    const docEntityEdges = filteredGraph.edges.filter((e) => e.kind === "doc-entity").length;
    const entityEdges = filteredGraph.edges.filter((e) => e.kind === "entity-entity").length;
    const possibleEdges = (filteredGraph.nodes.length * (filteredGraph.nodes.length - 1)) / 2;
    const density = possibleEdges > 0 ? filteredGraph.edges.length / possibleEdges : 0;

    const entityHubScores = filteredGraph.nodes
      .filter((node) => node.kind === "entity")
      .map((entity) => {
        const score = filteredGraph.edges
          .filter((edge) => edge.source === entity.id || edge.target === entity.id)
          .reduce((sum, edge) => sum + edge.weight, 0);
        return { id: entity.id, label: entity.label, score, entityType: entity.entityType };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return {
      docNodes,
      entityNodes,
      docEntityEdges,
      entityEdges,
      density,
      entityHubScores,
    };
  }, [filteredGraph]);

  const positioned = useMemo(() => {
    const width = 1200;
    const height = 730;
    const centerX = width / 2;
    const centerY = height / 2;

    const docsOnly = filteredGraph.nodes.filter((n) => n.kind === "document");
    const entitiesOnly = filteredGraph.nodes.filter((n) => n.kind === "entity");

    const positionedNodes: PositionedNode[] = [];

    docsOnly.forEach((node, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.max(docsOnly.length, 1);
      const radius = 165;
      positionedNodes.push({
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        radius: 11,
      });
    });

    entitiesOnly
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .forEach((node, idx) => {
        const ring = Math.floor(idx / 24);
        const indexInRing = idx % 24;
        const ringSize = Math.min(24, entitiesOnly.length - ring * 24);
        const angle = (Math.PI * 2 * indexInRing) / Math.max(ringSize, 1);
        const radius = 260 + ring * 95;
        const size = 8 + Math.min(10, Math.log2(node.mentionCount + 1) * 2.1);

        positionedNodes.push({
          ...node,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          radius: size,
        });
      });

    const map = new Map(positionedNodes.map((node) => [node.id, node]));
    const weightedEdges = [...filteredGraph.edges]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 320);

    return {
      width,
      height,
      nodes: positionedNodes,
      nodesById: map,
      edges: weightedEdges,
    };
  }, [filteredGraph]);

  const selectedNode = selectedNodeId ? positioned.nodesById.get(selectedNodeId) : null;

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return filteredGraph.edges
      .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 24);
  }, [filteredGraph.edges, selectedNode]);

  const topWeightedEdges = useMemo(() => {
    return [...filteredGraph.edges]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 12);
  }, [filteredGraph.edges]);

  const toggleType = (type: EntityType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return next;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const getNodeLabel = (id: string) => {
    return positioned.nodesById.get(id)?.label ?? id;
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(184,111,47,0.12),transparent_40%),radial-gradient(circle_at_88%_80%,rgba(88,115,84,0.12),transparent_35%)]">
      <div className="flex w-full flex-1 flex-col overflow-y-auto px-6 py-6 md:px-8">
        <section className="rounded-2xl border border-[rgba(139,69,19,0.18)] bg-white/90 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
            Knowledge Graph Workspace
          </p>
          <h1 className="mt-2 font-lora text-3xl font-semibold text-ink">
            Saved Documents and Entity Relationship Map
          </h1>
          <p className="mt-3 max-w-5xl text-[13.5px] leading-7 text-ink-muted">
            This tab builds a live graph from local saved documents, linking each document node to extracted entities and
            adding co-occurrence links between entities that appear in the same text. Use filters to isolate patterns,
            identify high-connectivity hubs, and inspect weighted relationships as your annotation set grows.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)_minmax(340px,2fr)]">
            <div className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-paper p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">Entity Type Filters</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ENTITY_TYPES.map((type) => {
                  const cfg = ENTITY_CONFIG[type];
                  const active = selectedTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className="rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors"
                      style={{
                        borderColor: active ? cfg.border : "rgba(139,69,19,0.22)",
                        backgroundColor: active ? cfg.bg : "rgba(255,255,255,0.7)",
                        color: active ? cfg.text : "#6c4f3d",
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-paper p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">Mention Threshold</p>
                <span className="rounded bg-paper-mid px-2 py-0.5 text-[11px] text-ink">{minMentions}+</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={minMentions}
                onChange={(e) => setMinMentions(Number(e.target.value))}
                className="mt-3 w-full accent-[rgb(184,111,47)]"
              />
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-ink-muted">
                <input
                  type="checkbox"
                  checked={showEntityLinks}
                  onChange={(e) => setShowEntityLinks(e.target.checked)}
                  className="h-4 w-4 rounded border-[rgba(139,69,19,0.35)] text-accent focus:ring-accent/40"
                />
                Show entity-to-entity co-occurrence links
              </label>
            </div>

            <div className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-paper p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">Search and Focus</p>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find entities or documents"
                className="mt-3 w-full rounded-md border border-[rgba(139,69,19,0.14)] bg-white px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <p className="mt-3 text-[12px] leading-6 text-ink-muted">
                Click nodes in the graph to inspect neighbors and supporting documents. Edge thickness reflects relationship strength.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Documents" value={String(graphStats.docNodes)} hint="Visible document nodes" />
          <StatCard title="Entities" value={String(graphStats.entityNodes)} hint="Visible unique entities" />
          <StatCard title="Doc-Entity Links" value={String(graphStats.docEntityEdges)} hint="Document mentions" />
          <StatCard title="Entity Co-Links" value={String(graphStats.entityEdges)} hint="Same-document co-occurrence" />
          <StatCard
            title="Graph Density"
            value={`${(graphStats.density * 100).toFixed(2)}%`}
            hint="Ratio of actual to possible links"
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)]">
          <div className="rounded-2xl border border-[rgba(139,69,19,0.16)] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-lora text-[22px] font-semibold text-ink">Graph Canvas</h2>
              <p className="text-[12px] text-ink-muted">Showing top {positioned.edges.length} strongest links</p>
            </div>

            {positioned.nodes.length === 0 ? (
              <div className="flex h-[620px] items-center justify-center rounded-xl border border-dashed border-[rgba(139,69,19,0.2)] bg-paper text-[13px] text-ink-muted">
                No nodes match the current filters. Try lowering the mention threshold or clearing search.
              </div>
            ) : (
              <div className="overflow-auto rounded-xl border border-[rgba(139,69,19,0.15)] bg-[#fbf7f1] p-2">
                <svg
                  viewBox={`0 0 ${positioned.width} ${positioned.height}`}
                  className="h-[620px] min-w-[860px] w-full"
                  role="img"
                  aria-label="Knowledge graph of saved documents and entities"
                >
                  <defs>
                    <radialGradient id="graphGlow" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="rgba(184,111,47,0.16)" />
                      <stop offset="100%" stopColor="rgba(184,111,47,0.01)" />
                    </radialGradient>
                  </defs>

                  <rect x={0} y={0} width={positioned.width} height={positioned.height} fill="url(#graphGlow)" />

                  {positioned.edges.map((edge) => {
                    const source = positioned.nodesById.get(edge.source);
                    const target = positioned.nodesById.get(edge.target);
                    if (!source || !target) return null;

                    const isSelected =
                      selectedNodeId != null && (edge.source === selectedNodeId || edge.target === selectedNodeId);

                    return (
                      <line
                        key={edge.id}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={edge.kind === "doc-entity" ? "rgba(139,69,19,0.32)" : "rgba(40,89,103,0.38)"}
                        strokeWidth={Math.max(0.8, Math.log2(edge.weight + 1) * (isSelected ? 1.6 : 1.1))}
                        opacity={isSelected ? 0.95 : 0.35}
                      >
                        <title>
                          {`${getNodeLabel(edge.source)} -> ${getNodeLabel(edge.target)} | weight ${edge.weight}`}
                        </title>
                      </line>
                    );
                  })}

                  {positioned.nodes.map((node) => {
                    const cfg = node.entityType ? ENTITY_CONFIG[node.entityType] : null;
                    const selected = selectedNodeId === node.id;
                    const fill = node.kind === "document" ? "#60452f" : cfg?.bg ?? "#efe6d8";
                    const stroke = node.kind === "document" ? "#3c2c1d" : cfg?.border ?? "#8b4513";
                    const textFill = node.kind === "document" ? "#fff8ef" : cfg?.text ?? "#5f4636";

                    return (
                      <g
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className="cursor-pointer"
                        aria-label={node.label}
                      >
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={selected ? node.radius + 4 : node.radius}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={selected ? 3 : 1.5}
                          opacity={selected ? 1 : 0.94}
                        >
                          <title>{`${node.label} | mentions ${node.mentionCount} | docs ${node.docCount}`}</title>
                        </circle>
                        <text
                          x={node.x}
                          y={node.y + node.radius + 14}
                          textAnchor="middle"
                          className="select-none text-[10px] font-medium"
                          fill={textFill}
                        >
                          {clampText(node.label, 18)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-[rgba(139,69,19,0.16)] bg-white p-4 shadow-sm">
              <h3 className="font-lora text-[20px] font-semibold text-ink">Node Inspector</h3>
              {!selectedNode ? (
                <p className="mt-3 text-[13px] leading-7 text-ink-muted">
                  Select a node from the canvas to inspect its strongest relationships.
                </p>
              ) : (
                <div className="mt-3 space-y-3 text-[13px]">
                  <div className="rounded-lg border border-[rgba(139,69,19,0.14)] bg-paper p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">Selected Node</p>
                    <p className="mt-1 font-medium text-ink">{selectedNode.label}</p>
                    <p className="mt-1 text-ink-muted">
                      {selectedNode.kind === "document" ? "Document" : selectedNode.entityType} • {selectedNode.mentionCount} mentions •
                      {` ${selectedNode.docCount} documents`}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-ink-faint">Top Connections</p>
                    {connectedEdges.length === 0 ? (
                      <p className="text-ink-muted">No edges under current filters.</p>
                    ) : (
                      <ul className="space-y-2">
                        {connectedEdges.map((edge) => {
                          const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                          const otherLabel = getNodeLabel(otherId);
                          return (
                            <li
                              key={edge.id}
                              className="rounded-md border border-[rgba(139,69,19,0.12)] bg-paper px-3 py-2"
                            >
                              <p className="font-medium text-ink">{otherLabel}</p>
                              <p className="mt-1 text-[12px] text-ink-muted">
                                {edge.kind === "doc-entity" ? "Doc to Entity" : "Entity Co-Link"} • Weight {edge.weight} •
                                {` ${edge.docIds.length} supporting docs`}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[rgba(139,69,19,0.16)] bg-white p-4 shadow-sm">
              <h3 className="font-lora text-[20px] font-semibold text-ink">Entity Hubs</h3>
              <p className="mt-2 text-[12px] leading-6 text-ink-muted">
                Highest-weight entities by aggregate connected edge strength.
              </p>
              <ul className="mt-3 space-y-2">
                {graphStats.entityHubScores.length === 0 ? (
                  <li className="text-[13px] text-ink-muted">No entity hubs under current filters.</li>
                ) : (
                  graphStats.entityHubScores.map((hub, idx) => (
                    <li
                      key={hub.id}
                      className="flex items-center justify-between rounded-md border border-[rgba(139,69,19,0.12)] bg-paper px-3 py-2"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-ink">{idx + 1}. {hub.label}</p>
                        <p className="text-[11px] text-ink-muted">{hub.entityType}</p>
                      </div>
                      <span className="rounded bg-paper-mid px-2 py-1 text-[11px] font-medium text-ink">
                        score {hub.score}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[rgba(139,69,19,0.16)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-lora text-[21px] font-semibold text-ink">Top Relationship Edges</h2>
            <p className="text-[12px] text-ink-muted">Sorted by weight</p>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.06em] text-ink-faint">
                  <th className="px-3 py-1">Type</th>
                  <th className="px-3 py-1">Source</th>
                  <th className="px-3 py-1">Target</th>
                  <th className="px-3 py-1">Weight</th>
                  <th className="px-3 py-1">Supporting Docs</th>
                </tr>
              </thead>
              <tbody>
                {topWeightedEdges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-ink-muted">
                      No edges to display under current filters.
                    </td>
                  </tr>
                ) : (
                  topWeightedEdges.map((edge) => (
                    <tr key={edge.id} className="rounded-lg bg-paper">
                      <td className="rounded-l-md px-3 py-2 text-ink">
                        {edge.kind === "doc-entity" ? "Doc-Entity" : "Entity-Entity"}
                      </td>
                      <td className="px-3 py-2 text-ink">{getNodeLabel(edge.source)}</td>
                      <td className="px-3 py-2 text-ink">{getNodeLabel(edge.target)}</td>
                      <td className="px-3 py-2 text-ink">{edge.weight}</td>
                      <td className="rounded-r-md px-3 py-2 text-ink-muted">{edge.docIds.length}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">{title}</p>
      <p className="mt-2 font-lora text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-[12px] text-ink-muted">{hint}</p>
    </div>
  );
}
