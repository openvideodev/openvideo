import { ICaptionsControlProps } from "../interface/captions";

export const NONE_PRESET: ICaptionsControlProps = {
  appearedColor: "#ffffff",
  activeColor: "#ffffff",
  activeFillColor: "transparent",
  color: "#ffffff",
  backgroundColor: "transparent",
  borderColor: "transparent",
  borderWidth: 0,
  boxShadow: { color: "#ffffff", x: 15, y: 15, blur: 60 },
};

export const STYLE_CAPTION_PRESETS: ICaptionsControlProps[] = [
  {
    appearedColor: "#FFFFFF",
    activeColor: "#50FF12",
    activeFillColor: "#7E12FF",
    color: "#DADADA",
    backgroundColor: "transparent",
    borderColor: "#000000",
    borderWidth: 5,
    fontFamily: "Bangers-Regular",
    isKeywordColor: "#000000",
    fontUrl:
      "https://fonts.gstatic.com/s/bangers/v13/FeVQS0BTqb0h60ACL5la2bxii28.ttf",
    previewUrl:
      "https://cdn.designcombo.dev/caption_previews/dynamic-preset1.webm",
  },
  {
    appearedColor: "#000000",
    activeColor: "#000000",
    activeFillColor: "transparent",
    color: "#b5b5b8",
    backgroundColor: "#e6e6e5",
    borderColor: "transparent",
    borderWidth: 0,
    previewUrl:
      "https://cdn.designcombo.dev/caption_previews/dynamic-preset2.webm",
  },
  {
    appearedColor: "#ffffff",
    activeColor: "#ffffff",
    activeFillColor: "transparent",
    color: "#ffffff",
    backgroundColor: "transparent",
    borderColor: "#000000",
    borderWidth: 10,
    boxShadow: { color: "#ffffff", x: 15, y: 15, blur: 60 },
    previewUrl:
      "https://cdn.designcombo.dev/caption_previews/dynamic-preset3.webm",
  },
  {
    appearedColor: "#ffffff",
    activeColor: "#ffffff",
    activeFillColor: "transparent",
    color: "transparent",
    backgroundColor: "transparent",
    borderColor: "#ffffff",
    borderWidth: 5,
    boxShadow: { color: "#ffffff", x: 15, y: 15, blur: 60 },
    fontFamily: "ChelseaMarket-Regular",
    fontUrl:
      "https://fonts.gstatic.com/s/chelseamarket/v8/BCawqZsHqfr89WNP_IApC8tzKBhlLA4uKkWk.ttf",
    previewUrl:
      "https://cdn.designcombo.dev/caption_previews/dynamic-preset5.webm",
  },
  {
    appearedColor: "#ffffff",
    activeColor: "#ffffff",
    activeFillColor: "#fc5a05",
    color: "#ffffff",
    backgroundColor: "transparent",
    borderColor: "#000000",
    borderWidth: 5,
    previewUrl:
      "https://cdn.designcombo.dev/caption_previews/dynamic-preset6.webm",
  },
  {
    appearedColor: "#ffffff",
    activeColor: "#ffffff",
    activeFillColor: "transparent",
    color: "#ffffff",
    backgroundColor: "transparent",
    borderColor: "#000000",
    borderWidth: 10,
    textTransform: "uppercase",
    fontFamily: "Roboto-Black",
    type: "word",
    fontUrl:
      "https://fonts.gstatic.com/s/roboto/v29/KFOlCnqEu92Fr1MmYUtvAx05IsDqlA.ttf",
    previewUrl:
      "https://cdn.designcombo.dev/caption_previews/dynamic-preset18.webm",
  },
];
