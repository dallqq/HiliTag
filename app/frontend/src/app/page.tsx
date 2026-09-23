"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { NERAnalyzer } from "@/components/NERAnalyzer";
import { SavedDocuments } from "@/components/SavedDocuments";
import { KnowledgeGraphView } from "@/components/KnowledgeGraphView";
import { MobileNav } from "@/components/MobileNav";
import { MobileInfoDrawer } from "@/components/MobileInfoDrawer";
import type { NEREntity, SessionStats } from "@/types/ner";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"analyze" | "saved" | "graph">("analyze");
  const [editorText, setEditorText] = useState<string>("");
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [analyzerData, setAnalyzerData] = useState<{
    entities: NEREntity[];
    stats: SessionStats;
  }>({
    entities: [],
    stats: { sentences: 0, totalEntities: 0 },
  });

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] flex-col overflow-hidden bg-paper text-ink">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "analyze" && (
          <NERAnalyzer
            initialText={editorText}
            onStateChange={setAnalyzerData}
          />
        )}
        {activeTab === "saved" && (
          <SavedDocuments
            onEditAnalyze={(text) => {
              setEditorText(text);
              setActiveTab("analyze");
            }}
          />
        )}
        {activeTab === "graph" && <KnowledgeGraphView />}
      </div>

      {/* Mobile Bottom Navigation Bar (hidden on desktop) */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      {/* Mobile System Info & Entity Legend Sheet */}
      <MobileInfoDrawer
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        entities={analyzerData.entities}
        sessionStats={analyzerData.stats}
      />
    </div>
  );
}

