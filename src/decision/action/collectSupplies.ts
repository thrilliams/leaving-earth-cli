import type { Immutable } from "leaving-earth";
import { getAgency, getLocation } from "leaving-earth/helpers";
import type {
	CollectSuppliesActionChoice,
	Model,
	SpacecraftID,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifySpacecraft } from "../stringifiers";

function getSpacecraftIDsWhichCanCollectSupplies(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): SpacecraftID[] {
	const spacecraftIDs = [];

	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		const location = getLocation(model, spacecraft.locationID);

		if (!location.explorable) continue;

		const suppliesEffect = location.hazard.effects.find(
			({ type }) => type === "supplies"
		);

		if (suppliesEffect !== undefined) spacecraftIDs.push(spacecraft.id);
	}

	return spacecraftIDs;
}

export function canCollectSupplies(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const spacecraftIDs = getSpacecraftIDsWhichCanCollectSupplies(
		model,
		decision
	);
	return spacecraftIDs.length > 0;
}

export async function collectSupplies(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<CollectSuppliesActionChoice | null> {
	const choices: prompts.Choice[] = [];
	const spacecraftIDs = getSpacecraftIDsWhichCanCollectSupplies(
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
		message: "select spacecraft to collect supplies",
		choices,
	});

	if (spacecraftID === undefined) return null;

	return {
		type: "take_action",
		action: "collect_supplies",
		spacecraftID,
	};
}
