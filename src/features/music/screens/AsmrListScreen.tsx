import React from "react";
import { AudioListScreen } from "../../../shared/lists/AudioListScreen";
import { useAsmr } from "../hooks/queries";

export function AsmrListScreen() {
  const { data: sounds = [], isLoading } = useAsmr();
  return (
    <AudioListScreen
      items={sounds}
      loading={isLoading}
      title="ASMR"
      emptyIcon="ear-outline"
      emptyText="No ASMR available yet"
    />
  );
}

