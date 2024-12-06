import type { Immutable } from "leaving-earth";
import {
	getAgency,
	getComponent,
	getComponentDefinition,
	isComponentOnSpacecraft,
} from "leaving-earth/helpers";
import type {
	AssembleSpacecraftActionChoice,
	Model,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { sortComponentIDs, stringifyComponent } from "../stringifiers";

export function canAssembleSpacecraft(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const agency = getAgency(model, decision.agencyID);
	for (const component of agency.components) {
		if (!isComponentOnSpacecraft(model, component.id)) return true;
	}
	return false;
}

export async function assembleSpacecraft(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<AssembleSpacecraftActionChoice | null> {
	const choices: prompts.Choice[] = [];
	const agency = getAgency(model, decision.agencyID);
	const agencyComponentIDs = agency.components.map(({ id }) => id);

	for (const componentID of sortComponentIDs(model, agencyComponentIDs)) {
		if (isComponentOnSpacecraft(model, componentID)) continue;
		choices.push({
			title: stringifyComponent(model, componentID),
			value: componentID,
		});
	}

	const { componentIDs } = await prompts({
		type: "autocompleteMultiselect",
		name: "componentIDs",
		message: "select components",
		choices,
		instructions: false,
		min: 1,
		onRender(this: any) {
			const selectedComponentIDs = this.value
				.filter((e: prompts.Choice) => e.selected)
				.map((e: prompts.Choice) => e.value);

			let selectedAstronauts = 0;
			let selectedCapsuleCapacity = 0;
			for (const componentID of selectedComponentIDs) {
				const component = getComponent(model, componentID);
				const definition = getComponentDefinition(
					model,
					component.type
				);

				if (definition.type === "astronaut") selectedAstronauts++;
				if (definition.type === "capsule")
					selectedCapsuleCapacity += definition.capacity;
			}

			this.msg =
				"select components" +
				(selectedAstronauts > 0 || selectedCapsuleCapacity > 0
					? `; selected ${selectedAstronauts} astronauts and capsules with ${selectedCapsuleCapacity} total capacity`
					: "");
		},
	});

	if (componentIDs === undefined) return null;

	let runningAstronautCapacity = 0;
	for (const componentID of componentIDs) {
		const component = getComponent(model, componentID);
		const definition = getComponentDefinition(model, component.type);
		if (definition.type === "astronaut") runningAstronautCapacity--;
		if (definition.type === "capsule")
			runningAstronautCapacity += definition.capacity;
	}

	if (runningAstronautCapacity < 0) {
		console.log("capsule capacity exceeded by astronauts");
		return assembleSpacecraft(model, decision);
	}

	return {
		type: "take_action",
		action: "assemble_spacecraft",
		componentIDs,
	};
}
