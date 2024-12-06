import type { Immutable } from "leaving-earth";
import { getSampleEffectOfType } from "leaving-earth/helpers";
import type {
	Model,
	TurnInValuableSampleChoice,
	TurnInValuableSampleDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifyComponent } from "./stringifiers";

export async function turnInValuableSample(
	model: Immutable<Model>,
	decision: Immutable<TurnInValuableSampleDecision>
): Promise<TurnInValuableSampleChoice> {
	const valuableSampleEffect = getSampleEffectOfType(
		model,
		decision.sampleID,
		"valuable_sample"
	);

	const { turnIn } = await prompts({
		type: "confirm",
		name: "turnIn",
		message: `turn in ${stringifyComponent(model, decision.sampleID, {
			rocketInfo: true,
		})} for $${valuableSampleEffect?.value || 0}`,
		initial: true,
	});

	return {
		type: "turn_in_valuable_sample",
		turnIn,
	};
}
