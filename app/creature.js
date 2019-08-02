import {Bodies, Constraint} from "matter-js";
import {MuscleConstraint} from "./muscle";
import {clippedRandGauss, randInt} from "./utils";

/** A genotype for a 'node' in a creature'. These sort of act like a mixture between joints and limbs. */
export class NodeGenotype {
    /**
     * Configuration for used for generating random NodeGenotypes.
     * @type {{size: {sigma: number, min: number, max: *, mu: number}, friction: {sigma: number, min: number, max: number, mu: number}}}
     */
    static randomConfig = {
        size: {
            mu: 20,
            sigma: 5,
            min: 1,
            max: Infinity
        },
        friction: {
            mu: 0.7,
            sigma: 0.1,
            min: 0,
            max: 1
        }
    };

    /**
     * The default collision filter for nodes.
     * @type {{category: number, mask: number}}
     */
    static collisionFilter = {
        category: 0x0002,
        mask: 0x0001
    };

    /**
     * Create a node gene.
     * @param size The radius of the node.
     * @param friction The friction of the node.
     */
    constructor(size = 20, friction = 0.9) {
        this.size = size;
        this.friction = friction;
    }

    /**
     * Generate a random node genotype.
     * @returns {NodeGenotype} The generated node genotype.
     */
    static createRandom() {
        // Size must be a positive integer
        const size = clippedRandGauss(NodeGenotype.randomConfig.size);
        // Friction must be a non-negative real
        const friction = clippedRandGauss(NodeGenotype.randomConfig.friction);

        return new NodeGenotype(size, friction);
    }

    /**
     * Get the physical manifestation of the genotype.
     *
     * @param x Where to initially place the node along the x-axis.
     * @param y Where to initially place the node along the y-axis.
     * @returns {body} A Matter.Body with the properties of this genotype.
     */
    getPhenotype(x = 0, y = 0) {
        return Bodies.circle(x, y, this.size, {
            friction: this.friction,
            inertia: Infinity, // This stops the body from rotating like a wheel.
            collisionFilter: NodeGenotype.collisionFilter
        });
    }
}

/** A genotype for a 'muscle' in a creature. These push and pull nodes. */
export class MuscleGenotype {
    /**
     * Configuration for used for generating random MuscleGenotypes.
     * @type {{contractDelay: {sigma: number, min: number, max: *, mu: number}, extendedLength: {sigma: number, min: number, max: *, mu: number}, extendDelay: {sigma: number, min: number, max: *, mu: number}, contractedLength: {sigma: number, min: number, max: *, mu: number}, damping: {sigma: number, min: number, max: number, mu: number}, stiffness: {sigma: number, min: number, max: number, mu: number}}}
     */
    static randomConfig = {
        contractedLength: {
            mu: 60,
            sigma: 10,
            min: 1,
            max: Infinity
        },
        extendedLength: {
            mu: 80,
            sigma: 10,
            min: 1,
            max: Infinity
        },
        contractDelay: {
            mu: 1000,
            sigma: 100,
            min: 100,
            max: Infinity
        },
        extendDelay: {
            mu: 1000,
            sigma: 100,
            min: 100,
            max: Infinity
        },
        stiffness: {
            mu: 0.1,
            sigma: 0.01,
            min: 0,
            max: 1
        },
        damping: {
            mu: 0.1,
            sigma: 0.01,
            min: 0,
            max: 1
        },
    };

    /**
     * Create a new muscle genotype.
     *
     * @param bodyA The ID (index) of the first body (node) connected to by the muscle.
     * @param bodyB The ID (index) of the second body (node) connected to by the muscle.
     * @param stiffness How fast the muscle moves between its contracted and extended states.
     * @param damping How much the effect of stiffness should be dampened.
     * @param contractedLength How long the muscle is in its contracted state.
     * @param extendedLength How long the muscle is in its extended state.
     * @param contractDelay How long the muscle waits after extending to contract again.
     * @param extendDelay How long the muscle waits after contracting to extend again.
     *
     * @see Constraint.create
     * @see MuscleConstraint.create
     */
    constructor(bodyA = 0, bodyB = 1, stiffness = 0.1, damping = 0.1, contractedLength = 60, extendedLength = 80,
                contractDelay = 1000, extendDelay = 1000) {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.contractedLength = contractedLength;
        this.extendedLength = extendedLength;
        this.contractDelay = contractDelay;
        this.extendDelay = extendDelay;
        this.stiffness = stiffness;
        this.damping = damping;
    }

    /**
     * Create a random genotype.
     *
     * @param nNodes How many nodes that are in the creature that this muscle genotype will be added to.
     *               This allows the generation of indices that reference the nodes.
     * @returns {MuscleGenotype} The generated genotype.
     */
    static createRandom(nNodes = 2) {
        let n1 = randInt(0, nNodes);
        let n2 = randInt(0, nNodes);

        while (n1 === n2) {
            n2 = randInt(0, nNodes);
        }

        return new MuscleGenotype(n1, n2,
            clippedRandGauss(MuscleGenotype.randomConfig.stiffness), clippedRandGauss(MuscleGenotype.randomConfig.damping),
            clippedRandGauss(MuscleGenotype.randomConfig.contractedLength), clippedRandGauss(MuscleGenotype.randomConfig.extendedLength),
            clippedRandGauss(MuscleGenotype.randomConfig.contractDelay), clippedRandGauss(MuscleGenotype.randomConfig.extendDelay));
    }

    /**
     * Get the physical manifestation of the genotype.
     *
     * @param bodyA The Matter.Body that is mapped to by the genotype's `bodyA` property.
     * @param bodyB The Matter.Body that is mapped to by the genotype's `bodyB` property.
     * @returns {MuscleConstraint} A MuscleConstraint with the properties of this genotype.
     */
    getPhenotype(bodyA, bodyB) {
        let constraint = MuscleConstraint.create({
            bodyA: bodyA,
            bodyB: bodyB,
            contractedLength: this.contractedLength,
            extendedLength: this.extendedLength,
            stiffness: this.stiffness,
            damping: this.damping
        });

        constraint.contractDelay = this.contractDelay;
        constraint.extendDelay = this.extendDelay;

        return constraint;
    }
}

/** A collection of genotypes that make up a creature. */
export class CreatureGenome {
    /**
     * Create a creature genome.
     *
     * @param nodeGenotypes The list of node genotypes for this creature.
     * @param muscleGenotypes The list of node genotypes for this creature.
     */
    constructor(nodeGenotypes, muscleGenotypes) {
        this.nodeGenotypes = nodeGenotypes;
        this.muscleGenotypes = muscleGenotypes;
    }

    /**
     * Create a random creature genome.
     * @param nNodes How many node genotypes the creature genome should have.
     * @returns {CreatureGenome} The created creature genome.
     */
    static createRandom(nNodes = 3) {
        let nodeGenotypes = [];
        let muscleGenotypes = [];

        for (let i = 0; i < nNodes; i++) {
            nodeGenotypes.push(NodeGenotype.createRandom());

            let muscleAllele = MuscleGenotype.createRandom(nNodes);
            muscleAllele.bodyA = i;
            muscleAllele.bodyB = (i + 1) % nNodes;

            muscleGenotypes.push(muscleAllele);
        }

        return new CreatureGenome(nodeGenotypes, muscleGenotypes)
    }
}

/** The physical representation of a creature with nodes and muscles.
 * Can be thought of as the physical manifestation of a CreatureGenome.
 */
export class Creature {
    /**
     * Create a new creature.
     *
     * @param genome The genome to base the creature off.
     * @param x Where to initially place the creature along the x-axis.
     * @param y Where to initially place the creature along the y-axis.
     */
    constructor(genome, x = 0, y = 0) {
        this.bodies = [];
        this.muscles = [];
        this.muscleLastUpdates = [];

        let i = 0;
        for (const nodeAllele of genome.nodeGenotypes) {
            // Place nodes in a circle
            const angle = i * Math.PI / genome.nodeGenotypes.length;
            const pos = {x: Math.cos(angle) * 40, y: Math.sin(angle) * 40};
            i++;

            this.bodies.push(nodeAllele.getPhenotype(pos.x + x, pos.y + y));
        }

        for (const muscleAllele of genome.muscleGenotypes) {
            this.muscles.push(muscleAllele.getPhenotype(this.bodies[muscleAllele.bodyA], this.bodies[muscleAllele.bodyB]));
            this.muscleLastUpdates.push(0);
        }
    }

    /**
     * Get the phenome of the creature, i.e. the physical manifestations of the creature's genotypes (nodes and muscles).
     * @returns {*[]} The phenome of the creature.
     */
    getPhenome() {
        return this.bodies.concat(this.muscles);
    }

    /**
     * Perform the update step for the creature.
     * @param timestamp The time in milliseconds since the physics engine was started.
     */
    update(timestamp) {
        for (let i = 0; i < this.muscles.length; i++) {
            const shouldContract = (this.muscles[i].isExtended && this.muscles[i].contractDelay >= 0.0) &&
                timestamp - this.muscleLastUpdates[i] >= this.muscles[i].contractDelay;

            const shouldExtend = (!this.muscles[i].isExtended && this.muscles[i].extendDelay >= 0.0) &&
                timestamp - this.muscleLastUpdates[i] >= this.muscles[i].extendDelay;

            if (shouldContract || shouldExtend) {
                MuscleConstraint.contract(this.muscles[i]);

                this.muscleLastUpdates[i] = timestamp;
            }
        }
    }
}