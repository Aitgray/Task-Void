import { create } from 'zustand';

interface SessionState {
  encryptionKey: Uint8Array | null;
  setEncryptionKey: (key: Uint8Array | null) => void;
}

// Not persisted — the key lives only in memory for this session.
export const useSession = create<SessionState>()((set) => ({
  encryptionKey: null,
  setEncryptionKey: (encryptionKey) => set({ encryptionKey }),
}));
