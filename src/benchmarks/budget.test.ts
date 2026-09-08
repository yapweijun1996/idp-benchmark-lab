import { expect, it } from "vitest";
import { AttemptBudget } from "./budget";
it("rejects unknown and zero-budget paid attempts before execution", () => {
  expect(() => new AttemptBudget(1).reserve()).toThrow(/safe bound/);
  expect(() => new AttemptBudget(0, 1).reserve()).toThrow(/insufficient/);
});
it("reserves concurrent costs and retains unknown failed-attempt liability", () => {
  const budget = new AttemptBudget(2, 1);
  const one = budget.reserve();
  const two = budget.reserve();
  expect(() => budget.reserve()).toThrow();
  one(0.5);
  two();
  expect(() => budget.reserve()).toThrow();
});
it("allows exact cap and fails closed after a provider violates its bound", () => {
  const budget = new AttemptBudget(1, 0.5);
  budget.reserve()(0.5);
  budget.reserve()(0.5);
  expect(() => budget.reserve()).toThrow();
  const violation = new AttemptBudget(10, 1);
  violation.reserve()(2);
  expect(() => violation.reserve()).toThrow(/exceeded/);
});
it.each([NaN, Infinity, -1])("rejects invalid cap %s", (cap) => {
  expect(() => new AttemptBudget(cap, 1)).toThrow();
});
