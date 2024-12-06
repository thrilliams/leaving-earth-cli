import type { Immutable } from "leaving-earth";
import { getLocation } from "leaving-earth/helpers";
import type {
	Model,
	RevealLocationChoice,
	RevealLocationDecision,
} from "leaving-earth/model";
import prompts from "prompts";

export async function revealLocation(
	model: Immutable<Model>,
	decision: Immutable<RevealLocationDecision>
): Promise<RevealLocationChoice> {
	const location = getLocation(model, decision.locationID);
	const isAstronautOnly = location.explorable && location.astronautOnly;

	let hazardString = decision.locationHazard.flavor + ".";
	for (const hazardEffect of decision.locationHazard.effects) {
		hazardString += "\n" + hazardEffect.type;
		if (hazardEffect.type === "valuable_sample")
			hazardString += ` ($${hazardEffect.value})`;
		if (
			hazardEffect.type === "sickness" ||
			hazardEffect.type === "radiation"
		)
			hazardString += ` (d8 <= ${hazardEffect.severity})`;
	}

	const { reveal } = await prompts(
		{
			type: "confirm",
			name: "reveal",
			message: `${hazardString}\nreveal ${decision.locationID}?${
				isAstronautOnly
					? " all astronauts on board will be killed."
					: ""
			}`,
			initial: true,
		},
		{
			onCancel: () => true,
		}
	);

	return {
		type: "reveal_location",
		reveal,
	};
}
