"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { NERAnalyzer } from "@/components/NERAnalyzer";
import { SavedDocuments } from "@/components/SavedDocuments";
import { KnowledgeGraphView } from "@/components/KnowledgeGraphView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"analyze" | "saved" | "graph" | "model">("analyze");

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
      {activeTab === "model" && <ModelInfo />}
    </div>
  );
}

function ModelInfo() {
  return (
    <div className="flex flex-1 overflow-y-auto px-6 py-8 md:px-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="rounded-2xl border border-[rgba(139,69,19,0.15)] bg-white p-6 shadow-sm">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            Model Overview
          </p>
          <h1 className="font-lora text-3xl font-semibold text-ink">
            HiliTag NER Models
          </h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-7 text-ink-muted">
            HiliTag uses a fine-tuned XLM-RoBERTa model for the main inference
            pipeline and keeps a CRF baseline for comparison. Both are built for
            Hiligaynon named entity recognition using the BIOES tagging scheme
            mapped to OntoNotes-style entity classes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-[rgba(139,69,19,0.15)] bg-paper p-6">
            <h2 className="font-lora text-[20px] font-semibold text-ink">
              XLM-RoBERTa
            </h2>
            <p className="mt-3 text-[14px] leading-7 text-ink-muted">
              The main model is based on <span className="font-medium text-ink">xlm-roberta-base</span>, selected for its strong multilingual
              SentencePiece vocabulary and transfer ability on low-resource
              languages like Hiligaynon.
            </p>
            <ul className="mt-4 space-y-2 text-[13px] leading-6 text-ink">
              <li>Token classification setup with dynamic label mappings.</li>
              <li>Model and tokenizer are loaded at server startup for lower latency.</li>
              <li>Inference endpoint returns structured entity spans with confidence.</li>
              <li>Predictions are logged locally to JSONL for later review.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[rgba(139,69,19,0.15)] bg-paper p-6">
            <h2 className="font-lora text-[20px] font-semibold text-ink">
              CRF Baseline
            </h2>
            <p className="mt-3 text-[14px] leading-7 text-ink-muted">
              The baseline uses <span className="font-medium text-ink">sklearn-crfsuite</span> with handcrafted lexical and contextual
              features to benchmark the neural model against a classical
              sequence tagger.
            </p>
            <ul className="mt-4 space-y-2 text-[13px] leading-6 text-ink">
              <li>Uses word shape, suffix/prefix, casing, and neighboring token features.</li>
              <li>Trains with L-BFGS optimization and regularization.</li>
              <li>Evaluated on the gold standard test split with seqeval metrics.</li>
              <li>Useful for spotting where handcrafted features still help.</li>
            </ul>
          </section>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <InfoCard
            title="Tagging Scheme"
            body="BIOES is used to mark spans more precisely than BIO, helping the system capture begin, inside, end, and single-token entities.">
          </InfoCard>
          <InfoCard
            title="Entity Set"
            body="The project maps outputs to the 6 OntoNotes-style entity classes used in training and evaluation."
          />
          <InfoCard
            title="Evaluation"
            body="Precision, recall, and F1 are tracked with seqeval on the manual gold standard test set, with confusion analysis for common boundary and label mix-ups."
          />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(139,69,19,0.15)] bg-white p-5 shadow-sm">
      <h3 className="font-lora text-[18px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-7 text-ink-muted">{body}</p>
    </div>
  );
}
