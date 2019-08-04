import {Bodies, Constraint} from "matter-js";
import {MuscleConstraint} from "./muscle";
import {clippedRandomGaussian, randomInt} from "./utils";

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
     * The probability that a gene is mutated during mutation.
     * @type {number}
     */
    static pMutate = 0.03;

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
     * @param options {{size: number?, friction: number?}}
     */
    constructor(options = {}) {
        const defaults = {
            size: 20,
            friction: 0.9
        };

        options = Object.assign({}, defaults, options);

        /**
         * The radius of the node.
         */
        this.size = options.size;

        /**
         * The friction of the node.
         */
        this.friction = options.friction;
    }

    /**
     * Generate a random node genotype.
     * @returns {NodeGenotype} The generated node genotype.
     */
    static createRandom() {
        return new NodeGenotype({
            size: clippedRandomGaussian(NodeGenotype.randomConfig.size),
            friction: clippedRandomGaussian(NodeGenotype.randomConfig.friction)
        });
    }

    /**
     * Create a shallow copy of the genotype.
     * @returns {{} & NodeGenotype} A copy of the genotype.
     */
    copy() {
        return new NodeGenotype(this);
    }

    /**
     * Get the physical manifestation of a genotype.
     *
     * @param nodeGenotype The genotype from which to create the phenotype.
     * @param x Where to initially place the node along the x-axis.
     * @param y Where to initially place the node along the y-axis.
     * @returns {body} A Matter.Body with the properties of the genotype.
     */
    static getPhenotype(nodeGenotype, x = 0, y = 0) {
        return Bodies.circle(x, y, nodeGenotype.size, {
            friction: nodeGenotype.friction,
            inertia: Infinity, // This stops the body from rotating like a wheel.
            collisionFilter: NodeGenotype.collisionFilter
        });
    }

    /**
     * Mutate the genotype randomly.
     */
    mutate() {
        const p = Math.random();

        if (p < NodeGenotype.pMutate) {
            switch (randomInt(0, 2)) {
                case 0:
                    this.size = clippedRandomGaussian(Object.assign({}, NodeGenotype.randomConfig.size,
                        {mu: this.size}));
                    break;
                case 1:
                    this.friction = clippedRandomGaussian(Object.assign({}, NodeGenotype.randomConfig.friction,
                        {mu: this.friction}));
            }
        }
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
     * The probability that a gene is mutated during mutation.
     * @type {number}
     */
    static pMutate = 0.03;

    /**
     * Create a new muscle genotype.
     *
     * @param options {{bodyA: number?, bodyB: number?, stiffness: number?, damping: number?, contractedLength: number?,
     *     extendedLength: number?, contractDelay: number?, extendDelay: number?}}
     *
     * @see Constraint.create
     * @see MuscleConstraint.create
     */
    constructor(options = {}) {
        const defaults = {
            bodyA: 0,
            bodyB: 1,
            stiffness: 0.1,
            damping: 0.1,
            contractedLength: 60,
            extendedLength: 80,
            contractDelay: 1000,
            extendDelay: 1000
        };

        options = Object.assign({}, defaults, options);
        /**
         * The ID (index) of the first body (node) connected to by the muscle.
         */
        this.bodyA = options.bodyA;
        /**
         * The ID (index) of the second body (node) connected to by the muscle.
         */
        this.bodyB = options.bodyB;
        /**
         * How fast the muscle moves between its contracted and extended states.
         */
        this.stiffness = options.stiffness;
        /**
         * How much the effect of stiffness should be dampened.
         */
        this.damping = options.damping;
        /**
         * How long the muscle is in its contracted state.
         */
        this.contractedLength = options.contractedLength;
        /**
         * How long the muscle is in its extended state.
         */
        this.extendedLength = options.extendedLength;
        /**
         * How long the muscle waits after extending to contract again.
         */
        this.contractDelay = options.contractDelay;

        /**
         * How long the muscle waits after contracting to extend again.
         */
        this.extendDelay = options.extendDelay;
    }

    /**
     * Create a random genotype.
     *
     * @param nNodes How many nodes that are in the creature that this muscle genotype will be added to.
     *               This allows the generation of indices that reference the nodes.
     * @returns {MuscleGenotype} The generated genotype.
     */
    static createRandom(nNodes = 2) {
        let n1 = randomInt(0, nNodes);
        let n2 = randomInt(0, nNodes);

        while (n1 === n2) {
            n2 = randomInt(0, nNodes);
        }

        return new MuscleGenotype({
            bodyA: n1,
            bodyB: n2,
            stiffness: clippedRandomGaussian(MuscleGenotype.randomConfig.stiffness),
            damping: clippedRandomGaussian(MuscleGenotype.randomConfig.damping),
            contractedLength: clippedRandomGaussian(MuscleGenotype.randomConfig.contractedLength),
            extendedLength: clippedRandomGaussian(MuscleGenotype.randomConfig.extendedLength),
            contractDelay: clippedRandomGaussian(MuscleGenotype.randomConfig.contractDelay),
            extendDelay: clippedRandomGaussian(MuscleGenotype.randomConfig.extendDelay),
        });
    }

    /**
     * Create a shallow copy of the genotype.
     * @returns {{} & MuscleGenotype}
     */
    copy() {
        return new MuscleGenotype(this);
    }

    /**
     * Get the physical manifestation of the genotype.
     *
     * @param muscleGenotype The genotype from which to generate the phenotype.
     * @param bodyA The Matter.Body that is mapped to by the genotype's `bodyA` property.
     * @param bodyB The Matter.Body that is mapped to by the genotype's `bodyB` property.
     * @returns {MuscleConstraint} A MuscleConstraint with the properties of this genotype.
     */
    static getPhenotype(muscleGenotype, bodyA, bodyB) {
        let constraint = MuscleConstraint.create({
            bodyA: bodyA,
            bodyB: bodyB,
            contractedLength: muscleGenotype.contractedLength,
            extendedLength: muscleGenotype.extendedLength,
            stiffness: muscleGenotype.stiffness,
            damping: muscleGenotype.damping
        });

        constraint.contractDelay = muscleGenotype.contractDelay;
        constraint.extendDelay = muscleGenotype.extendDelay;

        return constraint;
    }

    /**
     * Mutate the genotype randomly.
     */
    mutate() {
        const p = Math.random();

        if (p < MuscleGenotype.pMutate) {
            switch (randomInt(0, 6)) {
                case 0:
                    this.contractedLength = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.contractedLength,
                        {mu: this.contractedLength}));
                    break;
                case 1:
                    this.extendedLength = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.extendedLength,
                        {mu: this.extendedLength}));
                    break;
                case 2:
                    this.stiffness = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.stiffness,
                        {mu: this.stiffness}));
                    break;
                case 3:
                    this.damping = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.damping,
                        {mu: this.damping}));
                    break;
                case 4:
                    this.contractDelay = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.contractDelay,
                        {mu: this.contractDelay}));
                    break;
                case 5:
                    this.extendDelay = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.extendDelay,
                        {mu: this.extendDelay}));
                    break;
            }
        }
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
     * Perform crossover between two genomes, mutate the resulting genome and return it.
     * @param creatureGenome1 The first genome to breed.
     * @param creatureGenome2 The second genome to breed.
     * @returns {CreatureGenome} The genome resulting from 'breeding' the two given genomes.
     */
    static breed(creatureGenome1, creatureGenome2) {
        let childCreatureGenome = creatureGenome1.crossover(creatureGenome2);
        childCreatureGenome.mutate();

        return childCreatureGenome;
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

    /**
     * Create a copy of the genome.
     * @returns {CreatureGenome} A copy of the genome
     */
    copy() {
        let nodeGenotypes = [];
        let muscleGenotypes = [];

        for (let i = 0; i < this.nodeGenotypes.length; i++) {
            nodeGenotypes.push(this.nodeGenotypes[i].copy());
            muscleGenotypes.push(this.muscleGenotypes[i].copy());
        }

        return new CreatureGenome(nodeGenotypes, muscleGenotypes);
    }

    /**
     * A list of all of the genotypes in the genome (both nodes and muscles).
     * @returns {Buffer | * | any[] | string}
     */
    get genotypes() {
        return this.nodeGenotypes.concat(this.muscleGenotypes);
    }

    /**
     * Perform crossover between two creature genomes.
     * @param otherCreatureGenome The other genome to crossover with.
     * @returns {CreatureGenome} The new creature genome that results from the crossover operation.
     */
    crossover(otherCreatureGenome) {
        // Single-point crossover
        const crossoverPoint = randomInt(0, this.nodeGenotypes.length);
        let nodeGenotypes = [];
        let muscleGenotypes = [];

        for (let i = 0; i < this.nodeGenotypes.length; i++) {
            if (i < crossoverPoint) {
                nodeGenotypes.push(this.nodeGenotypes[i].copy());
                muscleGenotypes.push(this.muscleGenotypes[i].copy());
            } else {
                nodeGenotypes.push(otherCreatureGenome.nodeGenotypes[i].copy());
                muscleGenotypes.push(otherCreatureGenome.muscleGenotypes[i].copy());
            }
        }

        // TODO: Inherit name from first parent and add number. E.g. Jarvan IV would be the child of Jarvan III.
        return new CreatureGenome(nodeGenotypes, muscleGenotypes);
    }

    /**
     * Mutate the genome randomly.
     *
     * Note: This is done in place.
     */
    mutate() {
        for (const genotype of this.genotypes) {
            genotype.mutate();
        }
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
        for (const nodeGenotype of genome.nodeGenotypes) {
            // Place nodes in a circle
            const angle = i * Math.PI / genome.nodeGenotypes.length;
            const pos = {x: Math.cos(angle) * 40, y: Math.sin(angle) * 40};
            i++;

            this.bodies.push(NodeGenotype.getPhenotype(nodeGenotype, pos.x + x, pos.y + y));
        }

        for (const muscleGenotype of genome.muscleGenotypes) {
            this.muscles.push(MuscleGenotype.getPhenotype(muscleGenotype,
                this.bodies[muscleGenotype.bodyA], this.bodies[muscleGenotype.bodyB]));
            this.muscleLastUpdates.push(0);
        }
        // TODO: Add names for creatures.
    }

    /**
     * Get the phenome of the creature, i.e. the physical manifestations of the creature's genotypes (nodes and muscles).
     * @returns {*[]} The phenome of the creature.
     */
    get phenome() {
        return this.bodies.concat(this.muscles);
    }

    /**
     * Create a random creature.
     * @param nNodes How many nodes the creature should have.
     * @param x Where to initially place the creature along the x-axis.
     * @param y Where to initially place the creature along the y-axis.
     * @returns {Creature} The created creature.
     */
    static createRandom(nNodes = 3, x = 0, y = 0) {
        return new Creature(CreatureGenome.createRandom(nNodes), x, y);
    }

    /**
     * Get the displacement of the creature.
     *
     * This is the position of the body (node) that is furthest away from negative infinity (this may be negative).
     *
     * @returns {number} The displacement of the body along the x-axis.
     */
    getDisplacement() {
        let x = -Infinity;

        for (const body of this.bodies) {
            if (body.position.x > x) {
                x = body.position.x;
            }
        }

        return x;
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