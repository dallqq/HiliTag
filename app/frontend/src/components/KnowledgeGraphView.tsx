"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ENTITY_CONFIG } from "@/lib/entityConfig";
import {
  SAVED_DOCS_UPDATED_EVENT,
  getSavedDocuments,
  type SavedDoc,
} from "@/lib/storage";
import type { EntityType } from "@/types/ner";
import { cleanEntityText, normalizeCanonicalEntity } from "@/lib/entityUtils";
import {
  extractRelationBetweenMentions,
  resolveConsensusRelation,
  type ExtractedRelation,
} from "@/lib/graphRelations";
import {
  exportGraphToJson,
  exportGraphToCsv,
  triggerDownload,
} from "@/lib/graphExporter";

export type GraphViewMode = "all" | "entities" | "focus";
type GraphNodeKind = "document" | "entity";
type GraphEdgeKind = "doc-entity" | "entity-entity";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  entityType?: EntityType;
  mentionCount: number;
  docCount: number;
  aliases?: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  weight: number;
  docIds: string[];
  relation?: string;
  snippets?: string[];
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphBuildResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const PRODUCTION_ENTITY_TYPES: EntityType[] = [
  "PERSON",
  "ORG",
  "LOCATION",
  "EVENT",
  "DATETIME",
  "MONEY",
];

function buildKnowledgeGraph(docs: SavedDoc[]): GraphBuildResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const entityMap = new Map<
    string,
    {
      canonicalKey: string;
      preferredLabel: string;
      entityType: EntityType;
      mentionCount: number;
      docIds: Set<string>;
      variants: Map<string, number>;
    }
  >();

  const docEntityEdgeMap = new Map<
    string,
    { source: string; target: string; weight: number; docIds: Set<string> }
  >();

  const entityEntityEdgeMap = new Map<
    string,
    {
      source: string;
      target: string;
      weight: number;
      docIds: Set<string>;
      extractedRelations: ExtractedRelation[];
    }
  >();

  for (const doc of docs) {
    nodes.push({
      id: `doc:${doc.id}`,
      kind: "document",
      label: doc.title || "Untitled Document",
      mentionCount: doc.entities.length,
      docCount: 1,
    });

    const perDocEntityCounts = new Map<string, number>();
    const perDocEntityInstances = new Map<
      string,
      Array<{ text: string; start: number; end: number }>
    >();

    for (const entity of doc.entities) {
      const cleaned = cleanEntityText(entity.text);
      if (!cleaned) continue;

      const canonical = normalizeCanonicalEntity(cleaned, entity.entity_type);
      if (!canonical) continue;

      const key = `ent:${entity.entity_type}:${canonical}`;
      const existing = entityMap.get(key);

      if (!existing) {
        entityMap.set(key, {
          canonicalKey: canonical,
          preferredLabel: cleaned,
          entityType: entity.entity_type,
          mentionCount: 1,
          docIds: new Set([doc.id]),
          variants: new Map([[cleaned, 1]]),
        });
      } else {
        existing.mentionCount += 1;
        existing.docIds.add(doc.id);
        const count = existing.variants.get(cleaned) ?? 0;
        existing.variants.set(cleaned, count + 1);
        if (count + 1 > (existing.variants.get(existing.preferredLabel) ?? 0)) {
          existing.preferredLabel = cleaned;
        }
      }

      perDocEntityCounts.set(key, (perDocEntityCounts.get(key) ?? 0) + 1);

      const instList = perDocEntityInstances.get(key) ?? [];
      instList.push({
        text: cleaned,
        start: entity.start ?? 0,
        end: entity.end ?? 0,
      });
      perDocEntityInstances.set(key, instList);

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

    // Pairwise entity co-occurrence in document
    const entityKeys = Array.from(perDocEntityCounts.keys()).sort();
    for (let i = 0; i < entityKeys.length; i += 1) {
      for (let j = i + 1; j < entityKeys.length; j += 1) {
        const a = entityKeys[i];
        const b = entityKeys[j];
        const pairKey = `ent-edge:${a}:${b}`;
        const boost = Math.min(
          perDocEntityCounts.get(a) ?? 1,
          perDocEntityCounts.get(b) ?? 1
        );

        const instA = perDocEntityInstances.get(a) ?? [];
        const instB = perDocEntityInstances.get(b) ?? [];
        const pairRelations: ExtractedRelation[] = [];

        for (const ia of instA) {
          for (const ib of instB) {
            const rel = extractRelationBetweenMentions(doc.text, ia, ib);
            pairRelations.push(rel);
          }
        }

        const existingEdge = entityEntityEdgeMap.get(pairKey);
        if (!existingEdge) {
          entityEntityEdgeMap.set(pairKey, {
            source: a,
            target: b,
            weight: boost,
            docIds: new Set([doc.id]),
            extractedRelations: pairRelations,
          });
        } else {
          existingEdge.weight += boost;
          existingEdge.docIds.add(doc.id);
          existingEdge.extractedRelations.push(...pairRelations);
        }
      }
    }
  }

  // Populate entity nodes with resolved aliases
  for (const [key, value] of entityMap.entries()) {
    const aliases = Array.from(value.variants.keys()).filter(
      (v) => v !== value.preferredLabel
    );

    nodes.push({
      id: key,
      kind: "entity",
      label: value.preferredLabel,
      entityType: value.entityType,
      mentionCount: value.mentionCount,
      docCount: value.docIds.size,
      aliases,
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
      relation: "contains entity",
    });
  }

  for (const [id, edge] of entityEntityEdgeMap.entries()) {
    const consensus = resolveConsensusRelation(edge.extractedRelations);
    edges.push({
      id,
      source: edge.source,
      target: edge.target,
      kind: "entity-entity",
      weight: edge.weight,
      docIds: Array.from(edge.docIds),
      relation: consensus.relation,
      snippets: consensus.snippets,
    });
  }

  return { nodes, edges };
}

function clampText(value: string, max = 24) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function KnowledgeGraphView() {
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [search, setSearch] = useState("");
  const [minMentions, setMinMentions] = useState(1);
  const [showEntityLinks, setShowEntityLinks] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<EntityType>>(
    new Set(PRODUCTION_ENTITY_TYPES)
  );
  const [viewMode, setViewMode] = useState<GraphViewMode>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Viewport transform (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  // Node Dragging & Simulation State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const prevPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // Filtered graph based on UI controls
  const filteredGraph = useMemo(() => {
    const q = search.trim().toLowerCase();

    const entities = fullGraph.nodes.filter((node) => {
      if (node.kind !== "entity") return false;
      if (!node.entityType || !selectedTypes.has(node.entityType)) return false;
      if (node.mentionCount < minMentions) return false;
      if (!q) return true;
      const matchLabel = node.label.toLowerCase().includes(q);
      const matchAlias = node.aliases?.some((a) => a.toLowerCase().includes(q));
      return matchLabel || matchAlias;
    });

    const entityIdSet = new Set(entities.map((node) => node.id));

    const connectedDocIds = new Set<string>();
    for (const edge of fullGraph.edges) {
      if (edge.kind !== "doc-entity") continue;
      if (!entityIdSet.has(edge.target)) continue;
      connectedDocIds.add(edge.source);
    }

    const documents =
      viewMode === "entities"
        ? []
        : fullGraph.nodes.filter((node) => {
            if (node.kind !== "document") return false;
            if (q && node.label.toLowerCase().includes(q)) return true;
            return connectedDocIds.has(node.id);
          });

    const nodes = [...documents, ...entities];
    const nodeIdSet = new Set(nodes.map((node) => node.id));

    const edges = fullGraph.edges.filter((edge) => {
      if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) return false;
      if (edge.kind === "entity-entity" && !showEntityLinks) return false;
      if (viewMode === "entities" && edge.kind === "doc-entity") return false;
      return true;
    });

    return { nodes, edges };
  }, [fullGraph, minMentions, search, selectedTypes, showEntityLinks, viewMode]);

  // Graph statistics
  const graphStats = useMemo(() => {
    const docNodes = filteredGraph.nodes.filter((n) => n.kind === "document").length;
    const entityNodes = filteredGraph.nodes.filter((n) => n.kind === "entity").length;
    const docEntityEdges = filteredGraph.edges.filter((e) => e.kind === "doc-entity").length;
    const entityEdges = filteredGraph.edges.filter((e) => e.kind === "entity-entity").length;
    const possibleEdges =
      (filteredGraph.nodes.length * (filteredGraph.nodes.length - 1)) / 2;
    const density = possibleEdges > 0 ? filteredGraph.edges.length / possibleEdges : 0;

    const entityHubScores = filteredGraph.nodes
      .filter((node) => node.kind === "entity")
      .map((entity) => {
        const score = filteredGraph.edges
          .filter((edge) => edge.source === entity.id || edge.target === entity.id)
          .reduce((sum, edge) => sum + edge.weight, 0);
        return {
          id: entity.id,
          label: entity.label,
          score,
          entityType: entity.entityType,
          mentionCount: entity.mentionCount,
        };
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

  // Force simulation initializer
  useEffect(() => {
    const width = 1100;
    const height = 660;
    const centerX = width / 2;
    const centerY = height / 2;

    const existingMap = prevPositionsRef.current;

    const docsOnly = filteredGraph.nodes.filter((n) => n.kind === "document");
    const entitiesOnly = filteredGraph.nodes.filter((n) => n.kind === "entity");

    const newSimNodes: SimNode[] = [];

    // Initialize document nodes
    docsOnly.forEach((node, idx) => {
      const prev = existingMap.get(node.id);
      const angle = (Math.PI * 2 * idx) / Math.max(docsOnly.length, 1);
      const initR = 170;
      newSimNodes.push({
        ...node,
        x: prev ? prev.x : centerX + Math.cos(angle) * initR,
        y: prev ? prev.y : centerY + Math.sin(angle) * initR,
        vx: 0,
        vy: 0,
        radius: 13,
      });
    });

    // Initialize entity nodes with organic clusters
    entitiesOnly.forEach((node, idx) => {
      const prev = existingMap.get(node.id);
      const angle = (Math.PI * 2 * idx) / Math.max(entitiesOnly.length, 1);
      const initR = 250 + (idx % 3) * 60;
      const size = 9 + Math.min(12, Math.log2(node.mentionCount + 1) * 2.8);

      newSimNodes.push({
        ...node,
        x: prev ? prev.x : centerX + Math.cos(angle) * initR,
        y: prev ? prev.y : centerY + Math.sin(angle) * initR,
        vx: 0,
        vy: 0,
        radius: size,
      });
    });

    // Run iterative force relaxation steps
    const iterations = 60;
    const nodeMap = new Map<string, SimNode>(newSimNodes.map((n) => [n.id, n]));

    for (let iter = 0; iter < iterations; iter++) {
      const alpha = Math.max(0.02, (1 - iter / iterations) * 0.35);

      // Repulsion between nodes
      for (let i = 0; i < newSimNodes.length; i++) {
        for (let j = i + 1; j < newSimNodes.length; j++) {
          const a = newSimNodes[i];
          const b = newSimNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const minDist = a.radius + b.radius + 35;
          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.5 * alpha;
            const nx = dx / dist;
            const ny = dy / dist;
            if (!a.fx) {
              a.x -= nx * overlap;
              a.y -= ny * overlap;
            }
            if (!b.fx) {
              b.x += nx * overlap;
              b.y += ny * overlap;
            }
          } else {
            const force = (800 / (dist * dist)) * alpha;
            const nx = dx / dist;
            const ny = dy / dist;
            if (!a.fx) {
              a.x -= nx * force;
              a.y -= ny * force;
            }
            if (!b.fx) {
              b.x += nx * force;
              b.y += ny * force;
            }
          }
        }
      }

      // Spring attraction along edges
      for (const edge of filteredGraph.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        let dx = target.x - source.x;
        let dy = target.y - source.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const desiredDist = edge.kind === "doc-entity" ? 140 : 180;
        const diff = (dist - desiredDist) * 0.08 * alpha;
        const nx = dx / dist;
        const ny = dy / dist;

        if (!source.fx) {
          source.x += nx * diff;
          source.y += ny * diff;
        }
        if (!target.fx) {
          target.x -= nx * diff;
          target.y -= ny * diff;
        }
      }

      // Center gravity
      for (const node of newSimNodes) {
        if (node.fx) continue;
        node.x += (centerX - node.x) * 0.015 * alpha;
        node.y += (centerY - node.y) * 0.015 * alpha;
      }
    }

    const nextPosMap = new Map<string, { x: number; y: number }>();
    newSimNodes.forEach((n) => nextPosMap.set(n.id, { x: n.x, y: n.y }));
    prevPositionsRef.current = nextPosMap;

    setSimNodes(newSimNodes);
  }, [filteredGraph]);

  const nodesById = useMemo(() => {
    return new Map<string, SimNode>(simNodes.map((n) => [n.id, n]));
  }, [simNodes]);

  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) : null;

  // Neighbor nodes and edges for Focus Mode / Selection
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const neighbors = new Set<string>([selectedNodeId]);
    for (const edge of filteredGraph.edges) {
      if (edge.source === selectedNodeId) neighbors.add(edge.target);
      if (edge.target === selectedNodeId) neighbors.add(edge.source);
    }
    return neighbors;
  }, [filteredGraph.edges, selectedNodeId]);

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return filteredGraph.edges
      .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 30);
  }, [filteredGraph.edges, selectedNode]);

  const topWeightedEdges = useMemo(() => {
    return [...filteredGraph.edges].sort((a, b) => b.weight - a.weight).slice(0, 16);
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

  const getNodeLabel = useCallback(
    (id: string) => {
      return nodesById.get(id)?.label ?? id;
    },
    [nodesById]
  );

  // Center on a specific node
  const handleCenterNode = useCallback(
    (id: string) => {
      setSelectedNodeId(id);
      const target = nodesById.get(id);
      if (!target) return;
      const width = 1100;
      const height = 660;
      setPan({
        x: width / 2 - target.x * zoom,
        y: height / 2 - target.y * zoom,
      });
    },
    [nodesById, zoom]
  );

  const pinchDistRef = useRef<number | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Mouse Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggedNodeId) return;
    isPanningRef.current = true;
    startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseSvgX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseSvgY = (e.clientY - rect.top - pan.y) / zoom;
        setSimNodes((prev) =>
          prev.map((n) =>
            n.id === draggedNodeId
              ? { ...n, x: mouseSvgX, y: mouseSvgY, fx: mouseSvgX, fy: mouseSvgY }
              : n
          )
        );
      }
      return;
    }

    if (!isPanningRef.current) return;
    setPan({
      x: e.clientX - startPanRef.current.x,
      y: e.clientY - startPanRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    if (draggedNodeId) {
      setSimNodes((prev) =>
        prev.map((n) => (n.id === draggedNodeId ? { ...n, fx: null, fy: null } : n))
      );
      setDraggedNodeId(null);
    }
  };

  // Touch Pan and Pinch-Zoom handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (draggedNodeId) return;
      isPanningRef.current = true;
      startPanRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
      pinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      isPanningRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (draggedNodeId) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const touchSvgX = (e.touches[0].clientX - rect.left - pan.x) / zoom;
          const touchSvgY = (e.touches[0].clientY - rect.top - pan.y) / zoom;
          setSimNodes((prev) =>
            prev.map((n) =>
              n.id === draggedNodeId
                ? { ...n, x: touchSvgX, y: touchSvgY, fx: touchSvgX, fy: touchSvgY }
                : n
            )
          );
        }
        return;
      }
      if (!isPanningRef.current) return;
      setPan({
        x: e.touches[0].clientX - startPanRef.current.x,
        y: e.touches[0].clientY - startPanRef.current.y,
      });
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (pinchDistRef.current > 0) {
        const factor = dist / pinchDistRef.current;
        setZoom((prev) => Math.min(2.8, Math.max(0.4, prev * factor)));
      }
      pinchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
    pinchDistRef.current = null;
    if (draggedNodeId) {
      setSimNodes((prev) =>
        prev.map((n) => (n.id === draggedNodeId ? { ...n, fx: null, fy: null } : n))
      );
      setDraggedNodeId(null);
    }
  };

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(2.8, Math.max(0.4, prev * zoomFactor)));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  // Export actions
  const handleExportJson = () => {
    const jsonStr = exportGraphToJson(filteredGraph.nodes, filteredGraph.edges);
    triggerDownload(jsonStr, "hilitag_knowledge_graph.json", "application/json");
  };

  const handleExportCsv = () => {
    const labelsMap = new Map<string, string>();
    filteredGraph.nodes.forEach((n) => labelsMap.set(n.id, n.label));
    const csvStr = exportGraphToCsv(filteredGraph.edges, labelsMap);
    triggerDownload(csvStr, "hilitag_graph_edges.csv", "text/csv");
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(184,111,47,0.12),transparent_40%),radial-gradient(circle_at_85%_85%,rgba(88,115,84,0.12),transparent_35%)]">
      <div className="flex w-full flex-1 flex-col overflow-y-auto px-4 py-4 md:px-8 md:py-6 pb-24 md:pb-8">
        {/* Top Header Card */}
        <section className="rounded-2xl border border-[rgba(139,69,19,0.18)] bg-white/95 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-[10.5px] md:text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                Interactive Knowledge Graph Workspace
              </p>
              <h1 className="mt-1 font-lora text-2xl md:text-3xl font-semibold text-ink">
                Hiligaynon Corpus & Entity Relationship Map
              </h1>
              <p className="mt-2 max-w-4xl text-[12.5px] md:text-[13.5px] leading-relaxed text-ink-muted">
                Extracts and links named entities across verified Hiligaynon documents. Discovers
                semantic predicates (<span className="italic text-accent">nagbisita, nakigkita, ginhiwat, ginpahayag</span>),
                co-occurrence patterns, and community hubs with organic force-directed physics.
              </p>
            </div>

            {/* Export Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(139,69,19,0.2)] bg-paper px-3 py-1.5 text-[11.5px] md:text-[12px] font-medium text-ink transition-colors hover:bg-paper-mid shadow-xs active:scale-95"
                title="Download Cytoscape/NetworkX JSON"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>JSON Export</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(139,69,19,0.2)] bg-paper px-3 py-1.5 text-[11.5px] md:text-[12px] font-medium text-ink transition-colors hover:bg-paper-mid shadow-xs active:scale-95"
                title="Download CSV Edge List"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                <span>CSV Edges</span>
              </button>
            </div>
          </div>

          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className="mt-3.5 flex w-full items-center justify-between rounded-xl border border-[rgba(139,69,19,0.18)] bg-paper-warm px-3.5 py-2.5 text-[12.5px] font-semibold text-ink lg:hidden active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Graph Filters & Settings</span>
            </span>
            <span className="text-[11.5px] font-semibold text-accent">
              {showMobileFilters ? "▲ Hide Filters" : `▼ Filters (${selectedTypes.size} types active)`}
            </span>
          </button>

          {/* Filtering and Controls Toolbar */}
          <div className={`mt-4 lg:mt-5 grid gap-3.5 lg:grid-cols-[minmax(280px,1.2fr)_minmax(240px,0.9fr)_minmax(300px,1.2fr)] ${showMobileFilters ? "grid" : "hidden lg:grid"}`}>
            {/* Entity Type Filters */}
            <div className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-paper p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  Entity Types
                </p>
                <span className="text-[11px] text-ink-muted">
                  {selectedTypes.size} of {PRODUCTION_ENTITY_TYPES.length} active
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PRODUCTION_ENTITY_TYPES.map((type) => {
                  const cfg = ENTITY_CONFIG[type];
                  const active = selectedTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all shadow-2xs"
                      style={{
                        borderColor: active ? cfg.border : "rgba(139,69,19,0.22)",
                        backgroundColor: active ? cfg.bg : "rgba(255,255,255,0.7)",
                        color: active ? cfg.text : "#6c4f3d",
                        opacity: active ? 1 : 0.6,
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Threshold & Mode Controls */}
            <div className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-paper p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  Min Mentions
                </p>
                <span className="rounded bg-paper-mid px-2 py-0.5 text-[11px] font-semibold text-ink">
                  {minMentions}+
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={minMentions}
                onChange={(e) => setMinMentions(Number(e.target.value))}
                className="mt-2.5 w-full accent-[rgb(184,111,47)]"
              />
              <div className="mt-2.5 flex items-center justify-between text-[11.5px]">
                <label className="flex cursor-pointer items-center gap-1.5 text-ink-muted hover:text-ink">
                  <input
                    type="checkbox"
                    checked={showEntityLinks}
                    onChange={(e) => setShowEntityLinks(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[rgba(139,69,19,0.35)] text-accent focus:ring-accent/40"
                  />
                  Entity-to-Entity Links
                </label>
              </div>
            </div>

            {/* Search & View Mode Switcher */}
            <div className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-paper p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  Search & View Mode
                </p>
                <div className="inline-flex rounded-lg border border-[rgba(139,69,19,0.18)] bg-white p-0.5 text-[11px]">
                  <button
                    onClick={() => setViewMode("all")}
                    className={`rounded-md px-2 py-0.5 transition-colors ${
                      viewMode === "all" ? "bg-accent text-white font-medium" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Bipartite
                  </button>
                  <button
                    onClick={() => setViewMode("entities")}
                    className={`rounded-md px-2 py-0.5 transition-colors ${
                      viewMode === "entities" ? "bg-accent text-white font-medium" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Entities
                  </button>
                  <button
                    onClick={() => setViewMode("focus")}
                    className={`rounded-md px-2 py-0.5 transition-colors ${
                      viewMode === "focus" ? "bg-accent text-white font-medium" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Focus
                  </button>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find entity or document..."
                  className="w-full rounded-md border border-[rgba(139,69,19,0.14)] bg-white px-3 py-1.5 text-[12.5px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-[12px] text-ink-muted hover:text-ink"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Statistical Summary Strip */}
        <section className="mt-5 grid gap-3.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <StatCard title="Documents" value={String(graphStats.docNodes)} hint="Active corpus texts" />
          <StatCard title="Entities" value={String(graphStats.entityNodes)} hint="Unique resolved nodes" />
          <StatCard title="Doc-Entity Links" value={String(graphStats.docEntityEdges)} hint="Text mentions" />
          <StatCard title="Semantic Co-Links" value={String(graphStats.entityEdges)} hint="Same-sentence / context" />
          <StatCard
            title="Graph Density"
            value={`${(graphStats.density * 100).toFixed(1)}%`}
            hint="Connectedness ratio"
          />
        </section>

        {/* Graph Canvas and Detail Inspector */}
        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
          {/* Visual Canvas */}
          <div className="relative rounded-2xl border border-[rgba(139,69,19,0.16)] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-lora text-[21px] font-semibold text-ink">
                  Relationship Canvas
                </h2>
                <p className="text-[11.5px] text-ink-muted">
                  Drag nodes to organize • Drag canvas to pan • Scroll to zoom • Click node to focus
                </p>
              </div>

              {/* Viewport Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoom((z) => Math.min(2.8, z * 1.2))}
                  className="rounded border border-[rgba(139,69,19,0.2)] bg-paper p-1.5 text-ink hover:bg-paper-mid transition-colors"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))}
                  className="rounded border border-[rgba(139,69,19,0.2)] bg-paper p-1.5 text-ink hover:bg-paper-mid transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <button
                  onClick={handleResetView}
                  className="rounded border border-[rgba(139,69,19,0.2)] bg-paper px-2 py-1 text-[11.5px] font-medium text-ink hover:bg-paper-mid transition-colors"
                  title="Reset View and Selection"
                >
                  Reset
                </button>
              </div>
            </div>

            {simNodes.length === 0 ? (
              <div className="flex h-[380px] sm:h-[480px] md:h-[620px] items-center justify-center rounded-xl border border-dashed border-[rgba(139,69,19,0.2)] bg-paper p-6 text-center text-[13px] text-ink-muted">
                No nodes match the active filters. Try lowering the mention threshold or clearing search.
              </div>
            ) : (
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onWheel={handleWheel}
                className="relative h-[380px] sm:h-[480px] md:h-[620px] w-full overflow-hidden rounded-xl border border-[rgba(139,69,19,0.15)] bg-[#fbf7f1] cursor-grab active:cursor-grabbing select-none touch-none"
              >
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 1100 660"
                  className="h-full w-full"
                  role="img"
                  aria-label="Interactive Hiligaynon Knowledge Graph"
                >
                  <defs>
                    <radialGradient id="graphGlow" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="rgba(184,111,47,0.18)" />
                      <stop offset="100%" stopColor="rgba(184,111,47,0.01)" />
                    </radialGradient>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="18"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(139,69,19,0.6)" />
                    </marker>
                  </defs>

                  <rect width="1100" height="660" fill="url(#graphGlow)" />

                  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* Graph Edges */}
                    {filteredGraph.edges.map((edge) => {
                      const source = nodesById.get(edge.source);
                      const target = nodesById.get(edge.target);
                      if (!source || !target) return null;

                      const isSelected =
                        selectedNodeId != null &&
                        (edge.source === selectedNodeId || edge.target === selectedNodeId);

                      const isDimmed =
                        viewMode === "focus" &&
                        selectedNodeId != null &&
                        !isSelected &&
                        (!connectedNodeIds.has(edge.source) || !connectedNodeIds.has(edge.target));

                      const strokeColor =
                        edge.kind === "doc-entity"
                          ? isSelected
                            ? "rgba(184,111,47,0.95)"
                            : "rgba(139,69,19,0.35)"
                          : isSelected
                          ? "rgba(40,89,103,0.95)"
                          : "rgba(40,89,103,0.4)";

                      const strokeWidth = Math.max(
                        1,
                        Math.log2(edge.weight + 1) * (isSelected ? 2.4 : 1.3)
                      );

                      const midX = (source.x + target.x) / 2;
                      const midY = (source.y + target.y) / 2;

                      return (
                        <g key={edge.id} opacity={isDimmed ? 0.12 : isSelected ? 1 : 0.7}>
                          <line
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            markerEnd={edge.kind === "doc-entity" ? "url(#arrow)" : undefined}
                          >
                            <title>{`${getNodeLabel(edge.source)} ➔ ${getNodeLabel(edge.target)} | ${edge.relation || "related"} | weight: ${edge.weight}`}</title>
                          </line>

                          {/* Edge label badge (shown when selected or in focus mode) */}
                          {(isSelected || (viewMode === "focus" && edge.relation)) && (
                            <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                              <rect
                                x={-clampText(edge.relation || "related", 20).length * 3.3 - 4}
                                y={-8}
                                width={clampText(edge.relation || "related", 20).length * 6.6 + 8}
                                height={16}
                                rx={4}
                                fill="#ffffff"
                                stroke="rgba(139,69,19,0.25)"
                                strokeWidth={1}
                              />
                              <text
                                textAnchor="middle"
                                y={3.5}
                                className="select-none text-[9.5px] font-semibold"
                                fill="#5f4636"
                              >
                                {clampText(edge.relation || "related", 20)}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Graph Nodes */}
                    {simNodes.map((node) => {
                      const cfg = node.entityType ? ENTITY_CONFIG[node.entityType] : null;
                      const selected = selectedNodeId === node.id;
                      const isNeighbor = connectedNodeIds.has(node.id);

                      const isDimmed =
                        viewMode === "focus" &&
                        selectedNodeId != null &&
                        !selected &&
                        !isNeighbor;

                      const fill = node.kind === "document" ? "#60452f" : cfg?.bg ?? "#efe6d8";
                      const stroke = node.kind === "document" ? "#3c2c1d" : cfg?.border ?? "#8b4513";
                      const textFill = node.kind === "document" ? "#4a3525" : cfg?.text ?? "#5f4636";

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(node.id);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggedNodeId(node.id);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(node.id);
                            setDraggedNodeId(node.id);
                          }}
                          className="cursor-pointer"
                          opacity={isDimmed ? 0.2 : 1}
                        >
                          {/* Selection aura */}
                          {selected && (
                            <circle
                              r={node.radius + 7}
                              fill="none"
                              stroke="rgb(184,111,47)"
                              strokeWidth={2}
                              strokeDasharray="3 3"
                              className="animate-pulse"
                            />
                          )}

                          <circle
                            r={selected ? node.radius + 3 : node.radius}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={selected ? 2.8 : 1.6}
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))"
                          >
                            <title>{`${node.label} (${node.kind === "document" ? "Document" : node.entityType}) | Mentions: ${node.mentionCount} | Docs: ${node.docCount}`}</title>
                          </circle>

                          <text
                            y={node.radius + 13}
                            textAnchor="middle"
                            className="select-none text-[10px] font-medium"
                            fill={textFill}
                          >
                            {clampText(node.label, 20)}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {/* Floating Canvas Badges */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/85 px-2.5 py-1 text-[11px] font-medium text-ink-muted shadow-2xs backdrop-blur-xs border border-[rgba(139,69,19,0.12)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Force Simulation</span>
                  <span className="text-ink-faint">|</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
              </div>
            )}

            {/* Docked Mobile Node Inspector (rendered below canvas on < xl screens) */}
            {selectedNode && (
              <div className="mt-3 block xl:hidden rounded-2xl border border-[rgba(139,69,19,0.18)] bg-white p-4 shadow-sm animate-sheet-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent">
                      {selectedNode.kind === "document" ? "Document" : selectedNode.entityType}
                    </span>
                    <span className="text-[11.5px] text-ink-muted">
                      {selectedNode.mentionCount} mentions • {selectedNode.docCount} docs
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCenterNode(selectedNode.id)}
                      className="rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/20"
                    >
                      Center ⌖
                    </button>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-warm text-ink-muted hover:text-ink text-[12px]"
                      aria-label="Deselect"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <h3 className="mt-1.5 font-lora text-[16px] font-semibold text-ink">
                  {selectedNode.label}
                </h3>
                {connectedEdges.length > 0 && (
                  <div className="mt-2.5 max-h-[140px] overflow-y-auto space-y-1.5 border-t border-[rgba(139,69,19,0.1)] pt-2 text-[12px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      Strongest Relationships ({connectedEdges.length})
                    </p>
                    {connectedEdges.slice(0, 5).map((edge) => {
                      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                      return (
                        <div
                          key={edge.id}
                          onClick={() => setSelectedNodeId(otherId)}
                          className="flex items-center justify-between rounded-lg bg-paper-warm/70 px-2.5 py-1.5 cursor-pointer active:bg-paper-mid"
                        >
                          <span className="font-medium text-ink truncate mr-2">{getNodeLabel(otherId)}</span>
                          <span className="text-[11px] font-medium text-accent flex-shrink-0">
                            {edge.relation || "related"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Node Inspector & Entity Hubs */}
          <div className="space-y-5">
            {/* Node Inspector (Desktop only, mobile uses docked inspector) */}
            <div className="hidden xl:block rounded-2xl border border-[rgba(139,69,19,0.16)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-lora text-[19px] font-semibold text-ink">Node Inspector</h3>
                {selectedNode && (
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="text-[11.5px] text-ink-muted hover:text-ink"
                  >
                    Deselect
                  </button>
                )}
              </div>

              {!selectedNode ? (
                <div className="mt-3 rounded-xl border border-dashed border-[rgba(139,69,19,0.2)] bg-paper/60 p-4 text-center text-[12.5px] leading-relaxed text-ink-muted">
                  Click any node on the relationship canvas to inspect its semantic connections,
                  extracted Hiligaynon predicates, and supporting documents.
                </div>
              ) : (
                <div className="mt-3 space-y-3.5 text-[13px]">
                  <div className="rounded-xl border border-[rgba(139,69,19,0.16)] bg-paper p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                        {selectedNode.kind === "document" ? "Document Node" : selectedNode.entityType}
                      </span>
                      <button
                        onClick={() => handleCenterNode(selectedNode.id)}
                        className="text-[11px] font-medium text-accent hover:underline"
                      >
                        Center in View ⌖
                      </button>
                    </div>
                    <p className="mt-1 font-lora text-[16px] font-semibold text-ink">
                      {selectedNode.label}
                    </p>
                    {selectedNode.aliases && selectedNode.aliases.length > 0 && (
                      <p className="mt-1 text-[11px] text-ink-muted">
                        <span className="font-medium text-ink-faint">Aliases: </span>
                        {selectedNode.aliases.join(", ")}
                      </p>
                    )}
                    <div className="mt-2.5 flex items-center gap-3 text-[11.5px] text-ink-muted">
                      <span>{selectedNode.mentionCount} total mentions</span>
                      <span>•</span>
                      <span>{selectedNode.docCount} documents</span>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                      Strongest Relationships ({connectedEdges.length})
                    </p>

                    {connectedEdges.length === 0 ? (
                      <p className="text-[12.5px] text-ink-muted">No links under current filters.</p>
                    ) : (
                      <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                        {connectedEdges.map((edge) => {
                          const otherId =
                            edge.source === selectedNode.id ? edge.target : edge.source;
                          const otherLabel = getNodeLabel(otherId);

                          return (
                            <li
                              key={edge.id}
                              onClick={() => setSelectedNodeId(otherId)}
                              className="group cursor-pointer rounded-lg border border-[rgba(139,69,19,0.14)] bg-paper px-3 py-2 transition-colors hover:border-accent/50 hover:bg-paper-mid"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-ink group-hover:text-accent">
                                  {otherLabel}
                                </p>
                                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                                  w: {edge.weight}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                                <span className="font-medium text-accent">
                                  {edge.relation || (edge.kind === "doc-entity" ? "contained in" : "co-occurs with")}
                                </span>
                                {` • ${edge.docIds.length} doc${edge.docIds.length === 1 ? "" : "s"}`}
                              </p>
                              {edge.snippets && edge.snippets.length > 0 && (
                                <p className="mt-1 line-clamp-1 italic text-[11px] text-ink-faint">
                                  &ldquo;{edge.snippets[0]}&rdquo;
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Entity Centrality Hubs */}
            <div className="rounded-2xl border border-[rgba(139,69,19,0.16)] bg-white p-4 shadow-sm">
              <h3 className="font-lora text-[19px] font-semibold text-ink">Entity Centrality Hubs</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                Key entities ranked by weighted relationship density across the corpus.
              </p>

              <ul className="mt-3 space-y-2">
                {graphStats.entityHubScores.length === 0 ? (
                  <li className="text-[12.5px] text-ink-muted">No hubs under current filters.</li>
                ) : (
                  graphStats.entityHubScores.map((hub, idx) => (
                    <li
                      key={hub.id}
                      onClick={() => handleCenterNode(hub.id)}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-[rgba(139,69,19,0.12)] bg-paper px-3 py-2 transition-colors hover:border-accent/50 hover:bg-paper-mid"
                    >
                      <div>
                        <p className="text-[12.5px] font-semibold text-ink">
                          {idx + 1}. {hub.label}
                        </p>
                        <p className="text-[10.5px] text-ink-muted">
                          {hub.entityType} • {hub.mentionCount} mentions
                        </p>
                      </div>
                      <span className="rounded bg-paper-mid px-2 py-0.5 text-[11px] font-semibold text-accent">
                        {hub.score}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* Top Relationships Data Table */}
        <section className="mt-5 rounded-2xl border border-[rgba(139,69,19,0.16)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-lora text-[20px] font-semibold text-ink">Top Semantic Edges</h2>
              <p className="text-[11.5px] text-ink-muted">
                Sorted by aggregate co-occurrence strength and predicate frequency
              </p>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-1.5 text-left text-[12px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-[0.06em] text-ink-faint">
                  <th className="px-3 py-1">Type</th>
                  <th className="px-3 py-1">Source Entity</th>
                  <th className="px-3 py-1">Target Entity</th>
                  <th className="px-3 py-1">Hiligaynon Predicate / Relation</th>
                  <th className="px-3 py-1">Weight</th>
                  <th className="px-3 py-1">Docs</th>
                </tr>
              </thead>
              <tbody>
                {topWeightedEdges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-ink-muted">
                      No relationship edges to display under current filter settings.
                    </td>
                  </tr>
                ) : (
                  topWeightedEdges.map((edge) => (
                    <tr
                      key={edge.id}
                      onClick={() => {
                        setSelectedNodeId(edge.source);
                      }}
                      className="cursor-pointer rounded-lg bg-paper transition-colors hover:bg-paper-mid"
                    >
                      <td className="rounded-l-md px-3 py-2 font-medium text-ink">
                        {edge.kind === "doc-entity" ? "Doc-Entity" : "Entity-Entity"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink">{getNodeLabel(edge.source)}</td>
                      <td className="px-3 py-2 font-semibold text-ink">{getNodeLabel(edge.target)}</td>
                      <td className="px-3 py-2 font-medium text-accent">
                        {edge.relation || "related"}
                      </td>
                      <td className="px-3 py-2 text-ink font-semibold">{edge.weight}</td>
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
    <div className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-white p-3.5 shadow-2xs">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{title}</p>
      <p className="mt-1 font-lora text-2xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>
    </div>
  );
}
