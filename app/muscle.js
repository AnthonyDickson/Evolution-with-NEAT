import {Constraint} from "matter-js";

/**
 * A muscle constraint that contracts and extends (returns to its maximum length).
 *
 * @class MuscleConstraint
 */
let MuscleConstraint = {};

/**
 * Create a new muscle constraint.
 * @param options
 * @returns {options}
 */
MuscleConstraint.create = function (options) {
    let muscle = Constraint.create(options);

    muscle.contractedLength = options.contractedLength || 1;
    muscle.extendedLength = options.extendedLength || 2;
    muscle.length = muscle.contractedLength;
    muscle.isExtended = false;

    return muscle;
};

/**
 * Contracts or extends a muscle.
 * @param muscle The muscle to contract or extend.
 */
MuscleConstraint.contract = function (muscle) {
    if (muscle.isExtended) {
        muscle.length = muscle.contractedLength;
    } else {
        muscle.length = muscle.extendedLength;
    }

    muscle.isExtended = !muscle.isExtended;
};

/**
 * A `Number` that specifies the length of the muscle constraint when it is contracted.
 *
 * @property contractedLength
 * @type number
 * @default 1
 */

/**
 * A `Number` that specifies the length of the muscle constraint when it is extended.
 *
 * @property extendedLength
 * @type number
 * @default 2
 */

/**
 * A Boolean flag that indicates if the muscle constraint is currently extended (true) or contracted (false).
 *
 * @property isExtended
 * @type boolean
 * @default false
 */


export {MuscleConstraint};