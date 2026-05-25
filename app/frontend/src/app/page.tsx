"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { NERAnalyzer } from "@/components/NERAnalyzer";
import { SavedDocuments } from "@/components/SavedDocuments";
import { KnowledgeGraphView } from "@/components/KnowledgeGraphView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"analyze" | "saved" | "graph">("analyze");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "analyze" && <NERAnalyzer />}
      {activeTab === "saved" && <SavedDocuments onEditAnalyze={(text) => {
         setActiveTab("analyze");
         // NOTE: Ideally we'd pass this text to NERAnalyzer, but for simplicity, the NERAnalyzer can be extended to observe a context or localstorage, 
         // OR we just lift the analyzer input text up here. For now we will create a dedicated behavior.
      }} />}
      {activeTab === "graph" && <KnowledgeGraphView />}
      
    </div>
  );
}

