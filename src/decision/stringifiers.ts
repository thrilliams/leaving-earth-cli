import type { Immutable } from "leaving-earth";
import {
	getComponent,
	getComponentDefinition,
	getManeuver,
	getManeuverOriginAndDestination,
	getSpacecraft,
	getSpacecraftOfComponent,
	isComponentOnSpacecraft,
} from "leaving-earth/helpers";
import type {
	ComponentDefinitionID,
	ComponentID,
	ManeuverID,
	Model,
	SpacecraftID,
} from "leaving-earth/model";

interface StringifyOptions {
	spacecraftInfo: boolean;
	rocketInfo: boolean;
	capsuleInfo: boolean;
}

export function stringifyComponent(
	model: Immutable<Model>,
	componentID: ComponentID,
	{
		spacecraftInfo = false,
		rocketInfo = false,
		capsuleInfo = false,
	}: Partial<StringifyOptions> = {}
) {
	const component = getComponent(model, componentID);
	let string = component.type;

	let addendum = [];

	if (component.damaged) addendum.push("damaged");

	if (spacecraftInfo && isComponentOnSpacecraft(model, componentID)) {
		const spacecraft = getSpacecraftOfComponent(model, componentID);
		addendum.push(
			`on spacecraft ${spacecraft.id}, in ${spacecraft.locationID}`
		);
	}

	const definition = getComponentDefinition(model, component.type);
	if (rocketInfo) {
		if (definition.type === "rocket")
			addendum.push(definition.thrust + "t");
		if (definition.type === "ion_thruster")
			addendum.push(definition.thrustPerYear + "t/y");
	}

	if (capsuleInfo && definition.type === "capsule") {
		addendum.push(definition.capacity + "s");
		if (definition.heatShields) addendum.push("r");
		if (definition.radiationProtection)
			addendum.push(definition.radiationProtection + "p");
	}

	return string + (addendum.length > 0 ? ` (${addendum.join("; ")})` : "");
}

export function stringifyComponentDefinition(
	model: Immutable<Model>,
	definitionID: ComponentDefinitionID,
	{ rocketInfo = false, capsuleInfo = false }: Partial<StringifyOptions> = {}
) {
	const definition = getComponentDefinition(model, definitionID);
	let string = definition.id;

	let addendum = [];

	if (rocketInfo) {
		if (definition.type === "rocket")
			addendum.push(definition.thrust + "t");
		if (definition.type === "ion_thruster")
			addendum.push(definition.thrustPerYear + "t/y");
	}

	if (capsuleInfo && definition.type === "capsule") {
		addendum.push(definition.capacity + "s");
		if (definition.heatShields) addendum.push("r");
		if (definition.radiationProtection)
			addendum.push(definition.radiationProtection + "p");
	}

	return string + (addendum.length > 0 ? ` (${addendum.join("; ")})` : "");
}

export function sortComponentIDs(
	model: Immutable<Model>,
	componentIDs: ComponentID[] | readonly ComponentID[]
) {
	return componentIDs.toSorted((firstID, secondID) => {
		const first = getComponent(model, firstID);
		const second = getComponent(model, secondID);
		return first.type.localeCompare(second.type);
	});
}

export function stringifySpacecraft(
	model: Immutable<Model>,
	spacecraftID: SpacecraftID,
	componentInfo = false,
	maneuverInfo = false
) {
	const spacecraft = getSpacecraft(model, spacecraftID);
	let string = `${spacecraft.id} on ${spacecraft.locationID}`;
	if (spacecraft.years) {
		string += `, ${spacecraft.years}y`;
		if (maneuverInfo) string += ` left on ${spacecraft.maneuverID}`;
	}

	if (componentInfo)
		string += `; ${sortComponentIDs(model, spacecraft.componentIDs)
			.map((id) => stringifyComponent(model, id))
			.join(", ")}`;

	return string;
}

export function stringifyManeuver(
	model: Immutable<Model>,
	maneuverID: ManeuverID
) {
	const [origin, destination] = getManeuverOriginAndDestination(
		model,
		maneuverID
	);
	const maneuver = getManeuver(model, maneuverID);
	let string = `from ${origin} to ${destination}, D${
		maneuver.difficulty === null ? "!" : maneuver.difficulty
	}`;

	if (maneuver.duration !== undefined)
		string += maneuver.duration === null ? " Y-" : ` Y${maneuver.duration}`;

	if (maneuver.hazards.radiation) string += " R";
	if (maneuver.hazards.re_entry) string += " N";
	if (maneuver.hazards.landing)
		string += maneuver.hazards.landing.optional ? " [L]" : " L";
	if (maneuver.hazards.location)
		string += ` H(${maneuver.hazards.location.locationID})`;

	return string;
}
