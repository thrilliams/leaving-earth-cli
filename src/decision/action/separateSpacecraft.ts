import type { Immutable } from "leaving-earth";
import {
	doesAgencyHaveAdvancement,
	getAgency,
	getSpacecraft,
} from "leaving-earth/helpers";
import type {
	Model,
	SeparateSpacecraftActionChoice,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import {
	sortComponentIDs,
	stringifyComponent,
	stringifySpacecraft,
} from "../stringifiers";

export function canSeparateSpacecraft(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	if (!doesAgencyHaveAdvancement(model, decision.agencyID, "rendezvous"))
		return false;

	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		if (spacecraft.years > 0) continue;
		if (spacecraft.componentIDs.length < 2) continue;
		return true;
	}

	return false;
}

export async function separateSpacecraft(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<SeparateSpacecraftActionChoice | null> {
	const agency = getAgency(model, decision.agencyID);
	const spacecraftChoices: prompts.Choice[] = [];
	for (const spacecraft of agency.spacecraft) {
		spacecraftChoices.push({
			title: stringifySpacecraft(model, spacecraft.id, true, true),
			value: spacecraft.id,
			disabled:
				spacecraft.years > 0 || spacecraft.componentIDs.length < 2,
		});
	}

	const { spacecraftID } = await prompts({
		type: "select",
		name: "spacecraftID",
		message: "select spacecraft",
		choices: spacecraftChoices,
	});

	if (spacecraftID === undefined) return null;

	const spacecraft = getSpacecraft(model, spacecraftID);
	const componentChoices: prompts.Choice[] = [];
	for (const componentID of sortComponentIDs(
		model,
		spacecraft.componentIDs
	)) {
		componentChoices.push({
			title: stringifyComponent(model, componentID),
			value: componentID,
		});
	}

	const { selectedComponentIDs } = await prompts({
		type: "multiselect",
		name: "selectedComponentIDs",
		message: "select components to separate",
		instructions: false,
		choices: componentChoices,
		min: 1,
		max: spacecraft.componentIDs.length - 1,
	});

	if (selectedComponentIDs === undefined)
		return separateSpacecraft(model, decision);

	return {
		type: "take_action",
		action: "separate_spacecraft",
		spacecraftID,
		firstComponentIDs: spacecraft.componentIDs.filter(
			(id) => !selectedComponentIDs.includes(id)
		),
		secondComponentIDs: selectedComponentIDs,
	};
}
