import type { Immutable } from "leaving-earth";
import {
	getComponent,
	getSpacecraft,
	isComponentOfDamageableType,
} from "leaving-earth/helpers";
import type {
	DamageComponentChoice,
	DamageComponentDecision,
	Model,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifyComponent } from "./stringifiers";

export async function damageComponent(
	model: Immutable<Model>,
	decision: Immutable<DamageComponentDecision>
): Promise<DamageComponentChoice> {
	const componentIDs = [];
	const firstSpacecraft = getSpacecraft(model, decision.spacecraftID);
	componentIDs.push(...firstSpacecraft.componentIDs);
	if (decision.secondSpacecraftID !== undefined) {
		const secondSpacecraft = getSpacecraft(
			model,
			decision.secondSpacecraftID
		);
		componentIDs.push(...secondSpacecraft.componentIDs);
	}

	const choices: prompts.Choice[] = [];
	for (const componentID of componentIDs) {
		if (isComponentOfDamageableType(model, componentID)) continue;

		const component = getComponent(model, componentID);
		choices.push({
			title: stringifyComponent(model, componentID),
			value: componentID,
			disabled: component.damaged,
		});
	}

	// if no components can be damaged, do that
	if (choices.every((choice) => choice.disabled))
		return {
			type: "damage_component",
			componentID: undefined,
		};

	const { componentID } = await prompts(
		{
			type: "select",
			name: "componentID",
			choices,
		},
		{
			onCancel: () => true,
		}
	);

	return {
		type: "damage_component",
		componentID,
	};
}
