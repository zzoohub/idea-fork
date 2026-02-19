"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

interface AddKeywordInputProps {
  onAdd: (keyword: string) => void;
  existingKeywords: string[];
}

export function AddKeywordInput({
  onAdd,
  existingKeywords,
}: AddKeywordInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    if (existingKeywords.includes(trimmed)) return;
    onAdd(trimmed);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <label htmlFor="keyword-input" className="sr-only">
        Add keyword
      </label>
      <Input
        id="keyword-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Add a keyword…"
        className="min-h-11"
      />
      <Button
        type="button"
        onClick={handleSubmit}
        size="icon"
        className="min-h-11 min-w-11 shrink-0"
        aria-label="Add keyword"
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}
