"use client";

import { core } from "@/lib/project";
import { fontManager, Log } from "@openvideo/engine-pixi";
import Draggable from "@/components/shared/draggable";
import { DEFAULT_FONT } from "../../constants/font";

const TEXT_PRESETS = [
  {
    name: "Heading",
    description: "Heading",
    style: {
      fontSize: 80,
      fontFamily: "Inter",
      fontWeight: "bold",
      color: "#ffffff",
    },
  },
  {
    name: "Body text",
    description: "Body text",
    style: {
      fontSize: 40,
      fontFamily: "Inter",
      fontWeight: "normal",
      color: "#ffffff",
    },
  },
  {
    name: "Modern Bold",
    description: "MODERN",
    style: {
      fontSize: 60,
      fontFamily: "Montserrat",
      fontWeight: "900",
      color: "#ffffff",
      stroke: { color: "#000000", width: 2, join: "round" },
    },
  },
  {
    name: "Elegant Serif",
    description: "Serif Style",
    style: {
      fontSize: 60,
      fontFamily: "Playfair Display",
      fontWeight: "normal",
      fontStyle: "italic",
      color: "#ffffff",
    },
  },
  {
    name: "Neon Glow",
    description: "NEON",
    style: {
      fontSize: 60,
      fontFamily: "Inter",
      fontWeight: "bold",
      color: "#00ffff",
      shadow: {
        color: "#00ffff",
        alpha: 0.8,
        blur: 10,
        offsetX: 0,
        offsetY: 0,
      },
    },
  },
  {
    name: "Handwritten",
    description: "Script",
    style: {
      fontSize: 70,
      fontFamily: "Dancing Script",
      fontWeight: "normal",
      color: "#ffffff",
    },
  },
];

// const textClip = new TextClip('This is a text clip', {
//       fontSize: 124,
//       fontFamily: 'Arial',
//       align: 'left',
//       fontWeight: 'bold',
//       fontStyle: 'italic',
//       fill: '#ffffff',
//       stroke: {
//         color: '#ffffff',
//         width: 5,
//         join: 'round',
//       },
//       dropShadow: {
//         color: '#ffffff',
//         alpha: 0.5,
//         blur: 4,
//         angle: Math.PI / 6,
//         distance: 6,
//       },

export default function PanelText() {
  const handleAddText = async () => {
    // await fontManager.addFont({
    //   name: DEFAULT_FONT.postScriptName,
    //   url: DEFAULT_FONT.url,
    // })
    try {
      // Use the new Core API to add a text clip
      core.clip.add({
        type: "Text",
        name: "Text",
        text: "Add Text",
        style: {
          fontSize: 120,
          fontFamily: DEFAULT_FONT.postScriptName,
          align: "center",
          wordWrap: true,
          wordWrapWidth: 600,
          fontUrl: DEFAULT_FONT.url,
        },
        // style: {
        //   fontSize: 80,
        //   fontFamily: DEFAULT_FONT.postScriptName,
        //   align: 'center',
        //   fontWeight: 'regular',
        //   fontStyle: 'normal',
        //   // fontWeight: preset?.style.fontWeight || 'bold',
        //   // fontStyle: (preset?.style as any)?.fontStyle || 'normal',
        //   // fill: preset?.style.fill || '#ffffff',
        //   // stroke: (preset?.style as any)?.stroke || undefined,
        //   // dropShadow: (preset?.style as any)?.dropShadow || undefined,
        //   wordWrap: true,
        //   wordWrapWidth: 600,
        //   fontUrl: DEFAULT_FONT.url,
        // },
        timing: {
          display: { from: 0, to: 5_000_000 },
          trim: { from: 0, to: 5_000_000 },
        },
        left: 240,
        top: 898.0000000000003,
        width: 600,
        // height: 124,
      });
    } catch (error) {
      Log.error("Failed to add text:", error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4">
        <Draggable
          data={{
            type: "Text",
            name: "Text",
            text: "Add Text",
            style: {
              fontSize: 124,
              fontFamily: "Arial",
              align: "center",
              fontWeight: "bold",
              color: "#ffffff",
            },
            timing: { duration: 5_000_000 },
          }}
          renderCustomPreview={
            <div className="px-4 py-2 bg-black rounded border-2 border-primary shadow-xl">
              <span className="text-white font-bold">Add Text</span>
            </div>
          }
        >
          <div
            className="w-full h-9 bg-secondary hover:bg-secondary/80 text-secondary-foreground flex items-center justify-center rounded-md text-sm font-medium cursor-pointer transition-colors"
            onClick={() => handleAddText()}
          >
            Add Text
          </div>
        </Draggable>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        {/* <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3 pb-4">
          {TEXT_PRESETS.map((preset, index) => (
            <Draggable
              key={index}
              data={{
                type: 'Text',
                name: preset.name,
                text: preset.description,
                style: preset.style,
                duration: 5_000_000,
              }}
              renderCustomPreview={
                <div className="px-4 py-2 bg-black rounded border-2 border-primary shadow-xl flex items-center justify-center">
                  <span
                    style={{
                      fontFamily: preset.style.fontFamily,
                      fontSize: '14px',
                      fontWeight: preset.style.fontWeight,
                      color: preset.style.color,
                    }}
                  >
                    {preset.description}
                  </span>
                </div>
              }
            >
              <button
                onClick={() => handleAddText(preset)}
                className="aspect-square bg-secondary/50 rounded-lg flex items-center justify-center p-4 hover:bg-secondary transition-colors group relative overflow-hidden border border-border"
              >
                <span
                  style={{
                    fontFamily: preset.style.fontFamily,
                    fontSize: '12px',
                    fontWeight: preset.style.fontWeight,
                    color: preset.style.color,
                    textAlign: 'center',
                  }}
                  className="line-clamp-2"
                >
                  {preset.description}
                </span>
              </button>
            </Draggable>
          ))} */}
        {/* </div> */}
      </div>
    </div>
  );
}
