import type { Immutable } from "leaving-earth";
import { doesAgencyHaveAdvancement } from "leaving-earth/helpers";
import type {
	EncounterLandingChoice,
	EncounterLandingDecision,
	Model,
} from "leaving-earth/model";
import prompts from "prompts";

export async function encounterLanding(
	model: Immutable<Model>,
	decision: Immutable<EncounterLandingDecision>
): Promise<EncounterLandingChoice> {
	const hasLanding = doesAgencyHaveAdvancement(
		model,
		decision.agencyID,
		"landing"
	);

	const { encounter } = await prompts(
		{
			type: "confirm",
			name: "encounter",
			message:
				"encounter landing hazard?" +
				(hasLanding
					? ""
					: " advancement not researched. spacecraft will be destroyed."),
			initial: hasLanding,
		},
		{
			onCancel: () => true,
		}
	);

	return {
		type: "encounter_landing",
		encounter,
	};
}
