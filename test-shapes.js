// Simple test script to verify shape functionality
// This can be run in the browser console or as a Node script

// Test shape creation utility
import { createShapeClip } from "./apps/app/src/lib/shape-utils.js";

// Test basic shape creation
console.log("Testing shape creation...");

const rectangleShape = createShapeClip({
  id: "rectangle",
  name: "Rectangle",
  shapeType: "rectangle",
  icon: "□",
});

console.log("Rectangle shape created:", rectangleShape);

const circleShape = createShapeClip({
  id: "circle",
  name: "Circle",
  shapeType: "circle",
  icon: "○",
});

console.log("Circle shape created:", circleShape);

const starShape = createShapeClip({
  id: "star",
  name: "Star",
  shapeType: "star",
  icon: "★",
  sides: 5,
});

console.log("Star shape created:", starShape);

// Verify shape properties
console.log("Shape type verification:");
console.log("Rectangle type:", rectangleShape.type); // Should be "Shape"
console.log("Rectangle shapeType:", rectangleShape.shapeType); // Should be "rectangle"
console.log("Circle shapeType:", circleShape.shapeType); // Should be "circle"
console.log("Star shapeType:", starShape.shapeType); // Should be "star"

// Verify style properties
console.log("Style verification:");
console.log("Rectangle fill color:", rectangleShape.style.fill); // Should be "#3b82f6"
console.log("Rectangle stroke:", rectangleShape.style.stroke); // Should have stroke properties

console.log("Shape creation test completed!");
