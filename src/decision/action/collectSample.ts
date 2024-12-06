import type { Immutable } from "leaving-earth";
import { doesLocationHaveSample, getAgency } from "leaving-earth/helpers";
import type {
	CollectSampleActionChoice,
	Model,
	SpacecraftID,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifySpacecraft } from "../stringifiers";

function getSpacecraftIDsWhichCanCollectSamples(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): SpacecraftID[] {
	const spacecraftIDs = [];

	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		if (doesLocationHaveSample(model, spacecraft.locationID))
			spacecraftIDs.push(spacecraft.id);
	}

	return spacecraftIDs;
}

export function canCollectSample(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const spacecraftIDs = getSpacecraftIDsWhichCanCollectSamples(
		model,
		decision
	);
	return spacecraftIDs.length > 0;
}

export async function collectSample(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<CollectSampleActionChoice | null> {
	const choices: prompts.Choice[] = [];
	const spacecraftIDs = getSpacecraftIDsWhichCanCollectSamples(
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
		message: "select spacecraft to collect sample",
		choices,
	});

	if (spacecraftID === undefined) return null;

	return {
		type: "take_action",
		action: "collect_sample",
		spacecraftID,
	};
}
