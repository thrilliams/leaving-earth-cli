import type { Immutable } from "leaving-earth";
import {
	doesSpacecraftHaveAstronaut,
	doesSpacecraftHaveSupplies,
	getAgency,
	getComponent,
	isComponentOfType,
} from "leaving-earth/helpers";
import type {
	Model,
	RepairComponentsActionChoice,
	SpacecraftID,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifySpacecraft } from "../stringifiers";

function getSpacecraftIDsWhichCanRepairComponents(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): SpacecraftID[] {
	const spacecraftIDs = [];

	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		if (
			!doesSpacecraftHaveAstronaut(model, spacecraft.id, true, "mechanic")
		)
			continue;

		if (!doesSpacecraftHaveSupplies(model, spacecraft.id)) continue;

		const damagedComponent = spacecraft.componentIDs.find((id) => {
			const component = getComponent(model, id);
			if (isComponentOfType(model, component, "astronaut")) return false;
			return component.damaged;
		});

		if (damagedComponent !== undefined) spacecraftIDs.push(spacecraft.id);
	}

	return spacecraftIDs;
}

export function canRepairComponents(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const spacecraftIDs = getSpacecraftIDsWhichCanRepairComponents(
		model,
		decision
	);
	return spacecraftIDs.length > 0;
}

export async function repairComponents(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<RepairComponentsActionChoice | null> {
	const choices: prompts.Choice[] = [];
	const spacecraftIDs = getSpacecraftIDsWhichCanRepairComponents(
		model,
		decision
	);
	for (const spacecraftID of spacecraftIDs) {
		choices.push({
			title: stringifySpacecraft(model, spacecraftID, true, false),
			value: spacecraftID,
		});
	}

	const { spacecraftID } = await prompts({
		type: "select",
		name: "spacecraftID",
		message: "select spacecraft to repair components",
		choices,
	});

	if (spacecraftID === undefined) return null;

	return {
		type: "take_action",
		action: "repair_components",
		spacecraftID,
	};
}
