import React from "react";
import { ProtectedRoute } from "../../src/core/auth/ProtectedRoute";
import { AudioListScreen } from "../../src/shared/lists/AudioListScreen";
import { useAsmr } from "../../src/hooks/queries/useMusicQueries";

function ASMRScreen() {
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

export default function ASMR() {
  return (
    <ProtectedRoute>
      <ASMRScreen />
    </ProtectedRoute>
  );
}
