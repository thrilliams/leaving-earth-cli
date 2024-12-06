import type { Immutable } from "leaving-earth";
import {
	getAgency,
	doesSpacecraftHaveAstronaut,
	getComponent,
	isComponentOfType,
} from "leaving-earth/helpers";
import type {
	Model,
	TakeActionDecision,
	SpacecraftID,
	HealAstronautsActionChoice,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifySpacecraft } from "../stringifiers";

function getSpacecraftIDsWhichCanHealAstronauts(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): SpacecraftID[] {
	const spacecraftIDs = [];

	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		if (!doesSpacecraftHaveAstronaut(model, spacecraft.id, true, "doctor"))
			continue;

		const incapacitatedAstronaut = spacecraft.componentIDs.find((id) => {
			const component = getComponent(model, id);
			if (!isComponentOfType(model, component, "astronaut")) return false;
			return component.damaged;
		});

		if (incapacitatedAstronaut !== undefined)
			spacecraftIDs.push(spacecraft.id);
	}

	return spacecraftIDs;
}

export function canHealAstronauts(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const spacecraftIDs = getSpacecraftIDsWhichCanHealAstronauts(
		model,
		decision
	);
	return spacecraftIDs.length > 0;
}

export async function healAstronauts(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<HealAstronautsActionChoice | null> {
	const choices: prompts.Choice[] = [];
	const spacecraftIDs = getSpacecraftIDsWhichCanHealAstronauts(
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
		message: "select spacecraft to heal astronauts",
		choices,
	});

	if (spacecraftID === undefined) return null;

	return {
		type: "take_action",
		action: "heal_astronauts",
		spacecraftID,
	};
}
