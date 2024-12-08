import type { Immutable } from "leaving-earth";
import type {
	Model,
	TakeActionChoice,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import {
	assembleSpacecraft,
	canAssembleSpacecraft,
} from "./action/assembleSpacecraft";
import { buyComponent, canBuyComponent } from "./action/buyComponent";
import { canCollectSample, collectSample } from "./action/collectSample";
import {
	canDisassembleSpacecraft,
	disassembleSpacecraft,
} from "./action/disassembleSpacecraft";
import { canDockSpacecraft, dockSpacecraft } from "./action/dockSpacecraft";
import { canPerformManeuver, performManeuver } from "./action/performManeuver";
import {
	canResearchAdvancement,
	researchAdvancement,
} from "./action/researchAdvancement";
import {
	canSeparateSpacecraft,
	separateSpacecraft,
} from "./action/separateSpacecraft";
import { canSurveyLocation, surveyLocation } from "./action/surveyLocation";
import { canCollectSupplies, collectSupplies } from "./action/collectSupplies";
import {
	canRepairComponents,
	repairComponents,
} from "./action/repairComponents";
import { canHealAstronauts, healAstronauts } from "./action/healAstronauts";
import { canDiscardExplorer, discardExplorer } from "./action/discardExplorer";

async function chooseAndAttemptAction(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<TakeActionChoice | null | false> {
	const { action } = await prompts({
		type: "select",
		name: "action",
		message: `take an action`,
		choices: [
			{
				title: "end turn",
			},
			{
				title: "research advancement",
				disabled: !canResearchAdvancement(model, decision),
			},
			{
				title: "buy component",
				disabled: !canBuyComponent(model, decision),
			},
			{
				title: "assemble spacecraft",
				disabled: !canAssembleSpacecraft(model, decision),
			},
			{
				title: "disassemble spacecraft",
				disabled: !canDisassembleSpacecraft(model, decision),
			},
			{
				title: "perform maneuver",
				disabled: !canPerformManeuver(model, decision),
			},
			{
				title: "dock spacecraft",
				disabled: !canDockSpacecraft(model, decision),
			},
			{
				title: "separate spacecraft",
				disabled: !canSeparateSpacecraft(model, decision),
			},
			{
				title: "survey location",
				disabled: !canSurveyLocation(model, decision),
			},
			{
				title: "collect sample",
				disabled: !canCollectSample(model, decision),
			},
			{
				title: "collect supplies",
				disabled: !canCollectSupplies(model, decision),
			},
			{
				title: "repair components",
				disabled: !canRepairComponents(model, decision),
			},
			{
				title: "heal astronauts",
				disabled: !canHealAstronauts(model, decision),
			},
			// cooperate
			// outer planets
			{
				title: "discard explorer to complete mission",
				disabled: !canDiscardExplorer(model, decision),
			},
		],
		initial: 0,
	});

	if (action === 0)
		return {
			type: "take_action",
			action: "end_turn",
			pass: decision.firstOfTurn || false,
		};
	if (action === 1) return researchAdvancement(model, decision);
	if (action === 2) return buyComponent(model, decision);
	if (action === 3) return assembleSpacecraft(model, decision);
	if (action === 4) return disassembleSpacecraft(model, decision);
	if (action === 5) return performManeuver(model, decision);
	if (action === 6) return dockSpacecraft(model, decision);
	if (action === 7) return separateSpacecraft(model, decision);
	if (action === 8) return surveyLocation(model, decision);
	if (action === 9) return collectSample(model, decision);
	if (action === 10) return collectSupplies(model, decision);
	if (action === 11) return repairComponents(model, decision);
	if (action === 12) return healAstronauts(model, decision);
	if (action === 13) return discardExplorer(model, decision);

	if (action === undefined) {
		const { exit } = await prompts({
			type: "confirm",
			name: "exit",
			message: "really exit? your progress will be lost",
			initial: false,
		});

		if (exit) return false;

		return chooseAndAttemptAction(model, decision);
	}

	return null;
}

export async function takeAction(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<TakeActionChoice | null> {
	let choiceOrNull: TakeActionChoice | null | false;
	do {
		choiceOrNull = await chooseAndAttemptAction(model, decision);
	} while (choiceOrNull === null);
	return choiceOrNull || null;
}
