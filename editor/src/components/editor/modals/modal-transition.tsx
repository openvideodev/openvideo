import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useLayoutStore from "../store/use-layout-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTransitionStore } from "@/stores/transition-store";

const ModalTransition = () => {
  const { openTransitionDialog, setOpenTransitionDialog } = useLayoutStore();
  const {
    addCustomTransition,
    updateCustomTransition,
    editingTransitionId,
    setEditingTransitionId,
    customTransitions,
  } = useTransitionStore();

  const [name, setName] = React.useState("");
  const [shader, setShader] = React.useState("");

  React.useEffect(() => {
    if (
      openTransitionDialog &&
      editingTransitionId &&
      customTransitions[editingTransitionId]
    ) {
      const t = customTransitions[editingTransitionId];
      setName(t.name);
      setShader(t.fragment);
    } else if (openTransitionDialog) {
      setName("");
      setShader("");
    }
  }, [openTransitionDialog, editingTransitionId, customTransitions]);

  const handleSave = () => {
    if (!name || !shader) return;

    if (editingTransitionId) {
      updateCustomTransition(editingTransitionId, name, shader);
    } else {
      addCustomTransition(name, shader);
    }

    setOpenTransitionDialog(false);
    setEditingTransitionId(null);
    setName("");
    setShader("");
  };

  const onOpenChange = (open: boolean) => {
    setOpenTransitionDialog(open);
    if (!open) {
      setEditingTransitionId(null);
    }
  };

  return (
    <Dialog open={openTransitionDialog} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingTransitionId
              ? "Edit Custom Transition"
              : "Create Custom Transition"}
          </DialogTitle>
          <DialogDescription>
            {editingTransitionId
              ? "Update your custom transition here. Click save when you're done."
              : "Create a custom transition here. Click save when you're done."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name-1">Name</Label>
            <Input
              id="name-1"
              name="name"
              placeholder="Name transition..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shader-1">Shader</Label>
            <Textarea
              id="shader-1"
              name="shader"
              placeholder="Write your shader here..."
              className="resize-none h-60 font-mono text-xs"
              value={shader}
              onChange={(e) => setShader(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!name || !shader}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalTransition;
