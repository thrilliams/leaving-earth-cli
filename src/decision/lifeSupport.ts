import type { Immutable } from "leaving-earth";
import {
	getComponent,
	getSpacecraft,
	isComponentOfType,
} from "leaving-earth/helpers";
import type {
	LifeSupportChoice,
	LifeSupportDecision,
	Model,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifyComponent } from "./stringifiers";

export async function lifeSupport(
	model: Immutable<Model>,
	decision: Immutable<LifeSupportDecision>
): Promise<LifeSupportChoice> {
	const spacecraft = getSpacecraft(model, decision.spacecraftID);

	const choices: prompts.Choice[] = [];
	for (const componentID of spacecraft.componentIDs) {
		const component = getComponent(model, componentID);
		if (!isComponentOfType(model, component, "astronaut")) continue;
		choices.push({
			title: stringifyComponent(model, componentID),
			value: componentID,
		});
	}

	const { astronautIDs } = await prompts({
		type: "multiselect",
		name: "astronautIDs",
		message: "select astronauts to receive life support",
		choices,
		instructions: false,
		min: decision.capacity,
		max: decision.capacity,
	});

	return {
		type: "life_support",
		astronautIDs,
	};
}
