import { describe, expect, it } from "vitest";

describe("Simple Context Test", () => {
	it("should verify object reference behavior", () => {
		// Create a context object
		const context = {
			value: 0,
		};

		// Create a function that captures the context in closure
		const createUpdater = (ctx: typeof context) => {
			return {
				update: () => {
					ctx.value = 100;
					console.log("Inside update, ctx:", ctx);
				},
				getContext: () => ctx,
			};
		};

		// Create an updater with the context
		const updater = createUpdater(context);

		// Create an object that holds the context
		const holder = {
			context,
			updater,
		};

		console.log("Before update, holder.context:", holder.context);
		console.log("Before update, updater.getContext():", updater.getContext());
		console.log("Are they the same?", holder.context === updater.getContext());

		// Update the context through the updater
		updater.update();

		console.log("After update, holder.context:", holder.context);
		console.log("After update, updater.getContext():", updater.getContext());

		// Both should show the updated value
		expect(holder.context.value).toBe(100);
		expect(updater.getContext().value).toBe(100);
	});
});
