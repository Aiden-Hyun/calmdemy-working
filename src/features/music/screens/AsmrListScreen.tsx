import React, { useState } from "react";
import { AudioListScreen } from "../../../shared/lists/AudioListScreen";
import { AccountPromptModal } from "../../auth";
import { useAsmr } from "../hooks/queries";

export function AsmrListScreen() {
  const { data: sounds = [], isLoading } = useAsmr();
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  return (
    <>
      <AudioListScreen
        items={sounds}
        loading={isLoading}
        title="ASMR"
        emptyIcon="ear-outline"
        emptyText="No ASMR available yet"
        onAccountLinkPrompt={() => setShowAccountPrompt(true)}
      />
      <AccountPromptModal
        visible={showAccountPrompt}
        onClose={() => setShowAccountPrompt(false)}
      />
    </>
  );
}
