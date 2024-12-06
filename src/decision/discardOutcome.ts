import type { Immutable } from "leaving-earth";
import { getAgency } from "leaving-earth/helpers";
import type {
	DiscardOutcomeChoice,
	DiscardOutcomeDecision,
	Model,
} from "leaving-earth/model";
import prompts from "prompts";

export async function discardOutcome(
	model: Immutable<Model>,
	decision: Immutable<DiscardOutcomeDecision>
): Promise<DiscardOutcomeChoice> {
	const agency = getAgency(model, decision.agencyID);
	const requiredFunds = decision.outcome === "success" ? 10 : 5;

	const { discard } = await prompts(
		{
			type: "select",
			name: "discard",
			message: `decide what to do with ${decision.outcome} from ${decision.advancementID}`,
			choices: [
				{
					title: "discard",
					value: true,
					disabled: agency.funds < requiredFunds,
				},
				{ title: "return to advancement", value: false },
			],
			initial: 0,
		},
		{
			onCancel: () => true,
		}
	);

	if (discard === undefined) return discardOutcome(model, decision);

	return {
		type: "discard_outcome",
		discard,
	};
}
