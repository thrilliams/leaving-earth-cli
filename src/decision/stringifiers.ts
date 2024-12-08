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
		if (definition.radiationShielding)
			addendum.push(definition.radiationShielding + "p");
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
		if (definition.radiationShielding)
			addendum.push(definition.radiationShielding + "p");
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
	maneuverID: ManeuverID,
	profileIndex: number
) {
	const maneuver = getManeuver(model, maneuverID);
	const profile = maneuver.profiles[profileIndex];
	const [origin, destination] = getManeuverOriginAndDestination(
		model,
		maneuverID
	);

	let string = `from ${origin} to ${destination}, D${
		profile.difficulty === null ? "!" : profile.difficulty
	}`;

	if (profile.slingshot)
		string += ` available on ${profile.slingshot} window`;

	for (const hazard of profile.hazards) {
		if (hazard.type === "duration")
			string += hazard.years === 0 ? " Y-" : ` Y${hazard.years}`;
		if (hazard.type === "re_entry") string += " N";
		if (hazard.type === "landing")
			string += hazard.optional ? " [L]" : " L";
		if (
			hazard.type === "location" &&
			hazard.locationID === "solar_radiation"
		)
			string += " R";
		if (
			hazard.type === "location" &&
			hazard.locationID !== "solar_radiation"
		)
			string += ` H(${hazard.locationID})`;
		if (hazard.type === "aerobraking") string += " A";
	}

	return string;
}
