import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  unregisterCustomTransition,
  registerCustomTransition,
} from "openvideo";

interface CustomTransition {
  name: string;
  label: string;
  fragment: string;
}

interface TransitionStore {
  customTransitions: Record<string, CustomTransition>;
  editingTransitionId: string | null;
  setEditingTransitionId: (id: string | null) => void;
  addCustomTransition: (name: string, shader: string) => void;
  updateCustomTransition: (id: string, name: string, shader: string) => void;
  removeCustomTransition: (id: string) => void;
  initialize: () => void;
}

export const useTransitionStore = create<TransitionStore>()(
  persist(
    (set, get) => ({
      customTransitions: {},
      editingTransitionId: null,
      setEditingTransitionId: (id) => set({ editingTransitionId: id }),
      addCustomTransition: (name, shader) => {
        const id = name.toLowerCase().replace(/\s+/g, "-");
        const transition: CustomTransition = {
          name,
          label: name,
          fragment: shader,
        };

        set((state) => ({
          customTransitions: {
            ...state.customTransitions,
            [id]: transition,
          },
        }));

        // Register with the engine
        registerCustomTransition(id, transition as any);
      },
      updateCustomTransition: (oldId, name, shader) => {
        const newId = name.toLowerCase().replace(/\s+/g, "-");
        const transition: CustomTransition = {
          name,
          label: name,
          fragment: shader,
        };

        set((state) => {
          const { [oldId]: _, ...rest } = state.customTransitions;
          return {
            customTransitions: {
              ...rest,
              [newId]: transition,
            },
            editingTransitionId: null,
          };
        });

        // Update engine
        if (oldId !== newId) {
          unregisterCustomTransition(oldId);
        }
        registerCustomTransition(newId, transition as any);
      },
      removeCustomTransition: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.customTransitions;
          return { customTransitions: rest };
        });
        // Unregister from the engine
        unregisterCustomTransition(id);
      },
      initialize: () => {
        const { customTransitions } = get();
        Object.entries(customTransitions).forEach(([id, transition]) => {
          registerCustomTransition(id, transition as any);
        });
      },
    }),
    {
      name: "openvideo-transition-storage",
      partialize: (state) => ({ customTransitions: state.customTransitions }),
    },
  ),
);
