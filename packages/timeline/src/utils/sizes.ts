export const getHelperHeight = (type: string) => {
  switch (type) {
    case "top":
      return 1000;
    case "bottom":
      return 1000;
    case "center":
      return 8;
    default:
      return 1000;
  }
};
