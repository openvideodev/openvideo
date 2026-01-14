import { create } from "zustand";

interface LayoutStore {
  floatingControl: string;
  setFloatingControl: (control: string) => void;
}

const useLayoutStore = create<LayoutStore>((set) => ({
  floatingControl: "",
  setFloatingControl: (control: string) => set({ floatingControl: control }),
}));

export default useLayoutStore;
