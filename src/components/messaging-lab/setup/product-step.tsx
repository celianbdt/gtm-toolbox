"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ProductInfo } from "@/lib/messaging-lab/types";

type Props = {
  product: ProductInfo;
  onChange: (product: ProductInfo) => void;
};

export function ProductStep({ product, onChange }: Props) {
  const [featureInput, setFeatureInput] = useState("");

  function addFeature() {
    if (!featureInput.trim()) return;
    onChange({ ...product, key_features: [...product.key_features, featureInput.trim()] });
    setFeatureInput("");
  }

  function removeFeature(index: number) {
    onChange({ ...product, key_features: product.key_features.filter((_, i) => i !== index) });
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Product / Service
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Describe the product or service you want to build messaging for.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Product name *</label>
          <input
            type="text"
            placeholder="e.g. Acme Analytics"
            value={product.name}
            onChange={(e) => onChange({ ...product, name: e.target.value })}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Description *</label>
          <textarea
            placeholder="What does your product do? What problem does it solve?"
            value={product.description}
            onChange={(e) => onChange({ ...product, description: e.target.value })}
            rows={3}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30 resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Category *</label>
          <input
            type="text"
            placeholder="e.g. Product Analytics, CRM, DevOps Platform"
            value={product.category}
            onChange={(e) => onChange({ ...product, category: e.target.value })}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
          />
        </div>

        {/* Key Features */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Key features</label>
          {product.key_features.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {product.key_features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-secondary/50 rounded px-2.5 py-1.5"
                >
                  <span className="flex-1 text-foreground">{feature}</span>
                  <button
                    onClick={() => removeFeature(i)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a key feature..."
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFeature()}
              className="flex-1 text-sm bg-secondary/30 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
            />
            <button
              onClick={addFeature}
              disabled={!featureInput.trim()}
              className="px-3 py-2 text-sm bg-secondary hover:bg-accent text-foreground rounded-lg disabled:opacity-40 transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Pricing model (optional)</label>
          <input
            type="text"
            placeholder="e.g. Freemium, Usage-based, Per-seat"
            value={product.pricing_model ?? ""}
            onChange={(e) => onChange({ ...product, pricing_model: e.target.value || undefined })}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
          />
        </div>
      </div>
    </div>
  );
}
