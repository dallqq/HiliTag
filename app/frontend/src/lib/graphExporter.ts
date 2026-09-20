/**
 * Knowledge Graph Exporter
 * Provides utilities to export the constructed graph to Cytoscape/NetworkX JSON,
 * CSV Edge List, and image download formats.
 */

export interface ExportableNode {
  id: string;
  kind: "document" | "entity";
  label: string;
  entityType?: string;
  mentionCount: number;
  docCount: number;
}

export interface ExportableEdge {
  id: string;
  source: string;
  target: string;
  kind: "doc-entity" | "entity-entity";
  weight: number;
  relation?: string;
  docIds: string[];
}

export function exportGraphToJson(nodes: ExportableNode[], edges: ExportableEdge[]): string {
  const cytoscapeElements = {
    format: "cytoscape-elements",
    generator: "HiliTag Knowledge Graph",
    timestamp: new Date().toISOString(),
    elements: {
      nodes: nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          kind: n.kind,
          entity_type: n.entityType ?? null,
          mention_count: n.mentionCount,
          document_count: n.docCount,
        },
      })),
      edges: edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          kind: e.kind,
          weight: e.weight,
          relation: e.relation ?? "related",
          supporting_doc_count: e.docIds.length,
        },
      })),
    },
  };

  return JSON.stringify(cytoscapeElements, null, 2);
}

export function exportGraphToCsv(edges: ExportableEdge[], nodeLabels: Map<string, string>): string {
  const headers = ["Source_ID", "Source_Label", "Target_ID", "Target_Label", "Type", "Relation", "Weight", "Doc_Count"];
  const rows = edges.map((e) => {
    const sLabel = `"${(nodeLabels.get(e.source) || e.source).replace(/"/g, '""')}"`;
    const tLabel = `"${(nodeLabels.get(e.target) || e.target).replace(/"/g, '""')}"`;
    const rel = `"${(e.relation || "related").replace(/"/g, '""')}"`;
    return [e.source, sLabel, e.target, tLabel, e.kind, rel, e.weight, e.docIds.length].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
