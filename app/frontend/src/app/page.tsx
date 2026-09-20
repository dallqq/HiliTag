"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { NERAnalyzer } from "@/components/NERAnalyzer";
import { SavedDocuments } from "@/components/SavedDocuments";
import { KnowledgeGraphView } from "@/components/KnowledgeGraphView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"analyze" | "saved" | "graph">("analyze");
  const [editorText, setEditorText] = useState<string>("");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "analyze" && <NERAnalyzer initialText={editorText} />}
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
  );
}

