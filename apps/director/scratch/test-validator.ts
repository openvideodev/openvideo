import { PlanValidatorService } from "../src/planner/plan-validator.service";

const validator = new PlanValidatorService();

const validPlanJson = JSON.stringify({
  goal: "Say hello",
  summary: "Greeting the user",
  requiresConfirmation: false,
  steps: [
    {
      id: "step_1",
      type: "chat",
      description: "Send greeting message",
    },
  ],
});

const planMissingFieldsJson = JSON.stringify({
  summary: "Greeting the user without requiresConfirmation or goal",
  steps: [
    {
      id: "step_1",
      type: "chat",
      description: "Send greeting message",
    },
  ],
});

console.log("--- Testing Valid Plan JSON ---");
try {
  const plan = validator.validate(validPlanJson, "session_123");
  console.log("SUCCESS!", plan);
} catch (err) {
  console.error("FAILED!", err);
}

console.log("\n--- Testing Plan with Missing Fields (requiresConfirmation & goal) ---");
try {
  const plan = validator.validate(planMissingFieldsJson, "session_123");
  console.log("SUCCESS!", plan);
} catch (err) {
  console.error("FAILED!", err);
}
