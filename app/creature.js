import {Bodies, Constraint} from "matter-js";
import {MuscleConstraint} from "./muscle";
import {clippedRandomGaussian, randomInt} from "./utils";

/** A genotype for a 'node' in a creature'. These sort of act like a mixture between joints and limbs. */
export class NodeGenotype {
    /**
     * Configuration for used for generating random NodeGenotypes.
     * @type {{size: {sigma: number, min: number, max: *, mu: number},
     *     friction: {sigma: number, min: number, max: number, mu: number},
     *     frictionStatic: {sigma: number, min: number, max: number, mu: number}}}
     */
    static randomConfig = {
        size: {
            mu: 20,
            sigma: 3,
            min: 10,
            max: Infinity
        },
        friction: {
            mu: 0.7,
            sigma: 0.1,
            min: 0,
            max: 1
        },
        frictionStatic: {
            mu: 0.5,
            sigma: 0.1,
            min: 0,
            max: 1
        },
    };

    /**
     * The probability that a gene is mutated during mutation.
     * @type {number}
     */
    static pMutate = 0.05;

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
     * @param options {{size: number?, friction: number?, staticFriction: number?}}
     */
    constructor(options = {}) {
        const defaults = {
            size: 20,
            friction: 0.9,
            frictionStatic: 0.5
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

        /**
         * The static friction of the node (Coulomb friction).
         */
        this.frictionStatic = options.frictionStatic;

        /**
         * Whether or not the node genotype is enabled.
         * A node genotype should only enabled if it is connected to the body of the creature.
         * Enabled genotypes should not manifest physically (i.e. they should not have phenotypes).
         *
         * @type {boolean}
         * @private
         */
        this.isEnabled = true;
    }

    /**
     * Generate a random node genotype.
     * @returns {NodeGenotype} The generated node genotype.
     */
    static createRandom() {
        return new NodeGenotype({
            size: clippedRandomGaussian(NodeGenotype.randomConfig.size),
            friction: clippedRandomGaussian(NodeGenotype.randomConfig.friction),
            frictionStatic: clippedRandomGaussian(NodeGenotype.randomConfig.frictionStatic)
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
            switch (randomInt(0, 3)) {
                case 0:
                    this.size = clippedRandomGaussian(Object.assign({}, NodeGenotype.randomConfig.size,
                        {mu: this.size, sigma: 1}));
                    break;
                case 1:
                    this.friction = clippedRandomGaussian(Object.assign({}, NodeGenotype.randomConfig.friction,
                        {mu: this.friction}));
                    break;
                case 2:
                    this.frictionStatic = clippedRandomGaussian(Object.assign({}, NodeGenotype.randomConfig.frictionStatic,
                        {mu: this.frictionStatic}));
                    break;
            }
        }
    }
}

/** A genotype for a 'muscle' in a creature. These push and pull nodes. */
export class MuscleGenotype {
    /**
     * Configuration for used for generating random MuscleGenotypes.
     * @type {{contractDelay: {sigma: number, min: number, max: *, mu: number},
     *     extendedLength: {sigma: number, min: number, max: *, mu: number},
     *     extendDelay: {sigma: number, min: number, max: *, mu: number},
     *     contractedLength: {sigma: number, min: number, max: *, mu: number},
     *     stiffness: {sigma: number, min: number, max: number, mu: number}}}
     */
    static randomConfig = {
        contractedLength: {
            mu: 60,
            sigma: 5,
            min: 1,
            max: Infinity
        },
        extendedLength: {
            mu: 80,
            sigma: 5,
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
        }
    };

    /**
     * The probability that a gene is mutated during mutation.
     * @type {number}
     */
    static pMutate = 0.05;

    /**
     * Create a new muscle genotype.
     *
     * @param options {{bodyA: number?, bodyB: number?, stiffness: number?, contractedLength: number?,
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
            contractedLength: 60,
            extendedLength: 80,
            contractDelay: 1000,
            extendDelay: 1000
        };

        options = Object.assign({}, defaults, options);

        /**
         * The ID (index) of the first body (node) connected to by the muscle.
         * In the constructor this is set to be the lowest of `bodyA` and `bodyB` so that these values are sorted.
         * @type {number}
         */
        this.bodyA = Math.min(options.bodyA, options.bodyB);
        /**
         * The ID (index) of the second body (node) connected to by the muscle.
         * In the constructor this is set to be the highest of `bodyA` and `bodyB` so that these values are sorted.
         * @type {number}
         */
        this.bodyB = Math.max(options.bodyB, options.bodyA);
        /**
         * How fast the muscle moves between its contracted and extended states.
         */
        this.stiffness = options.stiffness;
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
        /**
         * Whether or not the muscle genotype is enabled.
         * A muscle genotype should be enabled as long as it connects two distinct nodes.
         * Enabled genotypes should not manifest physically (i.e. they should not have phenotypes).
         *
         * @returns {boolean} True if the muscle genotype is enabled, false otherwise.
         */
        this.isEnabled = this.bodyA !== this.bodyB;
    }

    /**
     * Create a random genotype.
     *
     * @param nNodes How many nodes that are in the creature that this muscle genotype will be added to.
     *               This allows the generation of indices that reference the nodes.
     * @returns {MuscleGenotype} The generated genotype.
     */
    static createRandom(nNodes) {
        let bodyA = randomInt(0, nNodes);
        let bodyB = randomInt(0, nNodes);

        return new MuscleGenotype({
            bodyA: bodyA,
            bodyB: bodyB,
            stiffness: clippedRandomGaussian(MuscleGenotype.randomConfig.stiffness),
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
            stiffness: muscleGenotype.stiffness
        });

        constraint.contractDelay = muscleGenotype.contractDelay;
        constraint.extendDelay = muscleGenotype.extendDelay;

        return constraint;
    }

    /**
     * Mutate the genotype randomly.
     * @param nNodes How many nodes that are in the creature that this muscle genotype will be added to.
     *               This allows the generation of indices that reference the nodes.
     */
    mutate(nNodes) {
        const p = Math.random();

        if (p < MuscleGenotype.pMutate) {
            switch (randomInt(0, 7)) {
                case 0:
                    this.bodyA = randomInt(0, nNodes);
                    break;
                case 1:
                    this.bodyB = randomInt(0, nNodes);
                    break;
                case 2:
                    this.contractedLength = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.contractedLength,
                        {mu: this.contractedLength, sigma: 1}));
                    break;
                case 3:
                    this.extendedLength = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.extendedLength,
                        {mu: this.extendedLength, sigma: 1}));
                    break;
                case 4:
                    this.stiffness = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.stiffness,
                        {mu: this.stiffness, sigma: 1}));
                    break;
                case 5:
                    this.contractDelay = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.contractDelay,
                        {mu: this.contractDelay, sigma: 1}));
                    break;
                case 6:
                    this.extendDelay = clippedRandomGaussian(Object.assign({},
                        MuscleGenotype.randomConfig.extendDelay,
                        {mu: this.extendDelay, sigma: 1}));
                    break;
            }


            // Enforce the sorted property of the body IDs.
            if (this.bodyA > this.bodyB) {
                [this.bodyA, this.bodyB] = [this.bodyB, this.bodyA]
            }

            // Update the `isEnabled` property.
            this.isEnabled = this.bodyA !== this.bodyB;
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
        this._checkActive();
    }

    /**
     * Recursive depth-first search helper.
     * @param current The current node.
     * @param nodeIndex The adjacency list of the nodes/muscles.
     * @param visitedNodes The nodes that have been visited already.
     * @param group The nodes in the current group (this is a spanning tree).
     * @private
     */
    static _dfs(current, nodeIndex, visitedNodes, group) {
        if (!visitedNodes.has(current)) {
            visitedNodes.add(current);
            group.add(current);

            for (const adjacent of nodeIndex[current]) {
                CreatureGenome._dfs(adjacent, nodeIndex, visitedNodes, group);
            }
        }
    }

    /**
     * Check for active and inactive node genes and set their state accordingly.
     * @private
     */
    _checkActive() {
        // TODO: Optimise this?
        let nodeIndex = {};

        for (let i = 0; i < this.nodeGenotypes.length; i++) {
            nodeIndex[i] = [];
        }

        // Create a two-way adjacency list.
        for (const muscleGenotype of this.muscleGenotypes) {
            if (muscleGenotype.isEnabled) {
                nodeIndex[muscleGenotype.bodyA].push(muscleGenotype.bodyB);
                nodeIndex[muscleGenotype.bodyB].push(muscleGenotype.bodyA);
            }
        }

        // Perform depth-first search to find which nodes are connected to each other.
        let visitedNodes = new Set();
        let groups = [];

        for (let i = 0; i < this.nodeGenotypes.length; i++) {
            if (!visitedNodes.has(i)) {
                // A group is set of connected nodes.
                let group = new Set();
                CreatureGenome._dfs(i, nodeIndex, visitedNodes, group);
                groups.push(group);
            }
        }

        // Identify the `primary group` of nodes and muscles, i.e. the largest group.
        groups.sort((a, b) => b.length - a.length); // sort groups by descending order of size/length
        const [primaryGroup, ...secondaryGroups] = groups;

        // Set active states appropriately for primary and secondary groups.

        for (const i of primaryGroup) {
            this.nodeGenotypes[i].isEnabled = true;
        }

        for (const group of secondaryGroups) {
            for (const i of group) {
                this.nodeGenotypes[i].isEnabled = false;
            }
        }

        // Disable muscle genotypes that do not connect nodes in the main body.
        for (let muscleGenotype of this.muscleGenotypes) {
            if (!primaryGroup.has(muscleGenotype.bodyA) || !primaryGroup.has(muscleGenotype.bodyB)) {
                muscleGenotype.isEnabled = false;
            }
        }
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
        for (const nodeGenotype of this.nodeGenotypes) {
            nodeGenotype.mutate();
        }

        for (const muscleGenotype of this.muscleGenotypes) {
            muscleGenotype.mutate(this.nodeGenotypes.length);
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
        this.nodes = [];
        this.muscles = [];
        this.muscleLastUpdates = [];

        let i = 0;
        for (const nodeGenotype of genome.nodeGenotypes.filter(genotype => genotype.isEnabled)) {
            // Place nodes in a circle
            const angle = i * Math.PI / genome.nodeGenotypes.length;
            const pos = {x: Math.cos(angle) * 40, y: Math.sin(angle) * 40};
            i++;

            this.nodes.push(NodeGenotype.getPhenotype(nodeGenotype, pos.x + x, pos.y + y));
        }

        for (const muscleGenotype of genome.muscleGenotypes.filter(genotype => genotype.isEnabled)) {
            if (muscleGenotype.bodyA >= this.nodes.length || muscleGenotype.bodyB >= this.nodes.length) {
                console.error(`Muscle references nodes ${muscleGenotype.bodyA} and ${muscleGenotype.bodyB}`,
                    `but there are only ${this.nodes.length} nodes in the creature (that are enabled).`,
                    'The muscle and nodes in questions: ', muscleGenotype, this.nodes);
            }

            this.muscles.push(MuscleGenotype.getPhenotype(muscleGenotype,
                this.nodes[muscleGenotype.bodyA], this.nodes[muscleGenotype.bodyB]));
            this.muscleLastUpdates.push(0);
        }
        // TODO: Add names for creatures.
    }

    /**
     * Get the phenome of the creature, i.e. the physical manifestations of the creature's genotypes (nodes and muscles).
     * @returns {*[]} The phenome of the creature.
     */
    get phenome() {
        return this.nodes.concat(this.muscles);
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

        for (const body of this.nodes) {
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