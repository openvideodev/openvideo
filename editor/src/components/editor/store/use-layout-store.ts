import { create } from "zustand";

interface LayoutStore {
  floatingControl: string;
  floatingControlData: any;
  setFloatingControl: (control: string, data?: any) => void;
}

const useLayoutStore = create<LayoutStore>((set) => ({
  floatingControl: "",
  floatingControlData: null,
  setFloatingControl: (control: string, data: any = null) =>
    set({ floatingControl: control, floatingControlData: data }),
}));

export default useLayoutStore;
