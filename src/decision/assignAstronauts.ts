import type { Immutable } from "leaving-earth";
import {
	getComponent,
	getComponentDefinition,
	getSpacecraft,
	isComponentOfType,
} from "leaving-earth/helpers";
import type {
	AssignAstronautsChoice,
	AssignAstronautsDecision,
	ComponentID,
	Model,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifyComponent } from "./stringifiers";

type AstronautAssignments = [ComponentID, ComponentID][];

export async function assignAstronauts(
	model: Immutable<Model>,
	decision: Immutable<AssignAstronautsDecision>
): Promise<AssignAstronautsChoice> {
	const astronautIDs: ComponentID[] = [];

	const spacecraft = getSpacecraft(model, decision.spacecraftID);
	for (const componentID of spacecraft.componentIDs) {
		const component = getComponent(model, componentID);
		if (isComponentOfType(model, component, "astronaut"))
			astronautIDs.push(componentID);
	}

	let astronautAssignments: AstronautAssignments | null;
	do {
		astronautAssignments = await assignAstronautsRecursive(
			model,
			decision,
			[],
			astronautIDs
		);
	} while (astronautAssignments === null);

	const capsuleAssignments: AssignAstronautsChoice["capsuleAssignments"] = [];
	for (const [capsuleID, astronautID] of astronautAssignments) {
		const extantAssignment = capsuleAssignments.find(
			(assignment) => assignment.capsuleID === capsuleID
		);

		if (extantAssignment === undefined) {
			capsuleAssignments.push({
				capsuleID,
				atronautIDs: [astronautID],
			});
		} else {
			extantAssignment.atronautIDs.push(astronautID);
		}
	}

	return {
		type: "assign_astronauts",
		capsuleAssignments,
	};
}

async function assignAstronautsRecursive(
	model: Immutable<Model>,
	decision: Immutable<AssignAstronautsDecision>,
	assignments: AstronautAssignments,
	remainingAstronauts: ComponentID[]
): Promise<AstronautAssignments | null> {
	const spacecraft = getSpacecraft(model, decision.spacecraftID);

	const choices: prompts.Choice[] = [];
	for (const componentID of spacecraft.componentIDs) {
		const component = getComponent(model, componentID);
		const definition = getComponentDefinition(model, component.type);
		if (definition.type !== "capsule") continue;

		const priorAssignments = assignments.filter(
			([capsuleID]) => capsuleID === componentID
		);

		choices.push({
			title: stringifyComponent(model, componentID, {
				capsuleInfo: true,
			}),
			value: componentID,
			disabled:
				component.damaged ||
				priorAssignments.length >= definition.capacity,
		});
	}

	const { capsuleID } = await prompts({
		type: "select",
		name: "capsuleID",
		message:
			"choose a capsule for " +
			stringifyComponent(model, remainingAstronauts[0]),
		choices,
	});

	if (capsuleID === undefined) return null;

	const newAssignments: AstronautAssignments = [
		...assignments,
		[capsuleID, remainingAstronauts[0]],
	];
	if (remainingAstronauts.length <= 1) return newAssignments;

	const nextAssignments = await assignAstronautsRecursive(
		model,
		decision,
		newAssignments,
		remainingAstronauts.slice(1)
	);
	if (nextAssignments === null)
		return assignAstronautsRecursive(
			model,
			decision,
			assignments,
			remainingAstronauts
		);
	return nextAssignments;
}
