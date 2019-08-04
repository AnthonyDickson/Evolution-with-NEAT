/** A basic genetic algorithm. */

import {World} from "matter-js";

import {Creature, CreatureGenome} from "./creature";
import {randomInt} from "./utils";

export class GeneticAlgorithm {
    /**
     * Create a new genetic algorithm instance.
     *
     * @param world The Matter.World that is being used.
     * @param options {{populationSize: number?, evaluationTime: number?, elitismRatio: number?,
     *     tournamentSize: number?, onGenerationStart: function?, startingPosition: {x: number?, y: number?}?,
     *     maxGenotypesPerCreature: number?, onGenerationEnd: function?}}
     *     A dictionary of options.
     */
    constructor(world, options) {
        const defaults = {
            populationSize: 100,
            evaluationTime: 60000, // in milliseconds
            elitismRatio: 10,
            tournamentSize: 10,
            startingPosition: {x: 0, y: 0},
            maxGenotypesPerCreature: 3,
            onGenerationStart: null,
            onGenerationEnd: null
        };

        options = Object.assign({}, defaults, options);

        /** The Matter.World instance to add the creatures to. */
        this.world = world;
        /**
         * A collection of the creature genomes for the current generation.
         * @type {[CreatureGenome]}
         */
        this.population = [];
        /** The number of genomes/creatures to generate each generation. */
        this.populationSize = options.populationSize;

        /**
         * How many of the top performing genomes to copy over to the next generation.
         * Cannot exceed the size of the population.
         * If this is passed in to the constructor as a real in the range [0, 1) then this is converted automatically
         * to an integer representing the exact number of genomes to copy over.
         *
         * @type {number}
         */
        this.elitismRatio = 0;

        if (0 <= options.elitismRatio < 1) {
            this.elitismRatio = Math.floor(this.populationSize * options.elitismRatio);
        } else {
            this.elitismRatio = Math.min(this.populationSize, options.elitismRatio);
        }

        /**
         * How many samples to take during tournament selection.
         * Cannot exceed the size of the population.
         * If this is passed in to the constructor as a real in the range [0, 1) then this is converted automatically
         * to an integer representing the exact number of creatures to perform each round of tournament selection with.
         * @type {number}
         */
        this.tournamentSize = 0;

        if (0 <= options.tournamentSize < 1) {
            this.tournamentSize = Math.floor(this.populationSize * options.tournamentSize);
        } else {
            this.tournamentSize = Math.min(this.populationSize, options.tournamentSize);
        }

        /** The physical creatures.
         * @type{[Creature]}
         */
        this.creatures = [];
        /**
         * The maximum number of genotypes of each type (nodes and muscles) per creature.
         * @type {number}
         */
        this.maxGenotypesPerCreature = options.maxGenotypesPerCreature;
        /** How long to evaluate each generation for in milliseconds.
         * @type{number}
         */
        this.evaluationTime = options.evaluationTime;
        /** How long the current generation has been evaluated for.
         * @type {number}
         */
        this.currEvaluationStartTime = 0;
        /** A non-negative integer indicating how many generations have been completed.
         * @type {number}
         */
        this.generation = 0;
        /**
         * A non-negative integer indicating how many physics updates (i.e. steps) have been performed.
         * @type {number}
         */
        this.timeStep = 0;
        /**
         * A dictionary of data from the previously completed generation.
         * @type {{minFitness: number, meanFitness: number, maxFitness: number, sumFitness: number, argmin: number,
            argmax: number, fitness: [number], topN: [number]}}
         */
        this.generationResults = {
            minFitness: 0,
            meanFitness: 0,
            maxFitness: 0,
            sumFitness: 0,
            argmin: -1,
            argmax: -1,
            fitness: [],
            topN: []
        };

        /**
         * The coordinates for where creatures should be spawned in.
         *
         * If this is too far away from the ground surface the
         * creatures will bounce around and fall over when they hit the ground; if this too close to the ground surface
         * then parts of the creature will spawn in the ground and get stuck.
         * @type {{x?: number, y?: number}}
         */
        this.startingPosition = options.startingPosition;

        /**
         * A callback to be called when a new generation is started.
         * @type {Function}
         */
        this.onGenerationStart = options.onGenerationStart;

        /**
         * A callback to be called when a generation has ended.
         * @type {Function}
         */
        this.onGenerationEnd = options.onGenerationEnd;
    }

    /**
     * Get the string prefix for log messages.
     * @returns {string}
     */
    static get logPrefix() {
        return `[${new Date().toLocaleString()}][GeneticAlgorithm]`
    }

    /**
     * Reset the genetic algorithm.
     */
    reset() {
        this.generation = 0;
        this.timeStep = 0;

        this.population = [];

        for (let i = 0; i < this.populationSize; i++) {
            this.population.push(CreatureGenome.createRandom(this.maxGenotypesPerCreature));
        }

        // TODO: Make sure this doesn't cause any strange behaviour with `this.currEvaluationStartTime` and the engine timestamp.
        this.nextGeneration(this.currEvaluationStartTime);
    }

    /**
     * Score the population and print a summary.
     * @returns {*} A dictionary of the results for the generation.
     */
    evaluate() {
        let fitnessScores = [];
        let sum = 0;
        let minFitness = Infinity;
        let argmin = -1;
        let maxFitness = -Infinity;
        let argmax = -1;
        let topN = [];

        for (let i = 0; i < this.creatures.length; i++) {
            const fitness = this.creatures[i].getDisplacement();

            fitnessScores.push(fitness);
            sum += fitness;

            if (fitness < minFitness) {
                minFitness = fitness;
                argmin = i;
            }

            if (fitness > maxFitness) {
                maxFitness = fitness;
                argmax = i;
            }

            this.updateTopN(topN, i, fitnessScores);
        }

        let meanFitness = sum / this.creatures.length;

        const sorted = [...fitnessScores].sort();
        let medianFitness;

        if (sorted.length % 2 === 0) {
            const i = Math.floor(sorted.length / 2);
            medianFitness = 0.5 * (sorted[i - 1] + sorted[i]);
        } else {
            medianFitness = sorted[Math.floor(sorted.length / 2)];
        }

        let generationResults = {
            minFitness: minFitness,
            meanFitness: meanFitness,
            medianFitness: medianFitness,
            maxFitness: maxFitness,
            sumFitness: sum,
            argmin: argmin,
            argmax: argmax,
            fitness: fitnessScores,
            topN: topN
        };

        console.log(`${GeneticAlgorithm.logPrefix} Generation ${this.generation} Summary:`);
        console.log(`${GeneticAlgorithm.logPrefix} Min. Fitness: ${generationResults.fitness[argmin].toFixed(1)} -`,
            `Median Fitness: ${medianFitness.toFixed(1)} -`,
            `Max. Fitness ${generationResults.fitness[argmax].toFixed(1)}`);
        // TODO: Replace the below with names.
        console.log(`${GeneticAlgorithm.logPrefix} Blame: `, this.population[argmin],
            ' - Praise: ', this.population[argmax]);

        return generationResults;
    }

    /**
     * Update the top n genomes for the generation just gone.
     * @param topN The list containing the indices pointing to the top n scores in the fitness scores.
     * @param i The current index being considered.
     * @param fitnessScores The list of fitnessScores.
     */
    updateTopN(topN, i, fitnessScores) {
        if (topN.length === 0) {
            topN.push(i);
        } else {
            if (fitnessScores[i] < fitnessScores[topN[topN.length - 1]]) {
                if (topN.length < this.elitismRatio) {
                    // If the current fitness score is the lowest just append to the end.
                    topN.push(i)
                }
            } else {
                // Otherwise search for the first spot in `topN` where `fitness` is larger than the fitness
                // referenced by the index in that spot.
                let j = 0;
                while (fitnessScores[i] <= fitnessScores[topN[j]] && j < topN.length) {
                    j++;
                }
                // Insert at index if there fitness scores less than the current score in the top n.
                topN.splice(j, 0, i);

                if (topN.length > this.elitismRatio) {
                    topN.pop();
                }
            }
        }
    }

    /**
     * Clean up the current generation and create the next generation.
     * @param timestamp The time in milliseconds since the physics engine was started.
     */
    nextGeneration(timestamp) {
        // Elitism: copy over the top n.
        let newPopulation = [];

        for (const i of this.generationResults.topN) {
            newPopulation.push(this.population[i].copy());
        }

        while (newPopulation.length < this.populationSize) {
            // Selection
            // The first individual.
            let i1 = this.select();

            // The second individual.
            let i2 = this.select();

            // Crossover
            newPopulation.push(CreatureGenome.breed(this.population[i1], this.population[i2]));
        }

        this.population = newPopulation;

        // Remove previous generation.
        while (this.creatures.length > 0) {
            World.remove(this.world, this.creatures.pop().phenome);
        }

        const {x, y} = this.startingPosition;

        // Populate world with new generation
        for (const genome of this.population) {
            const creature = new Creature(genome, x, y);
            this.creatures.push(creature);
            World.add(this.world, creature.phenome);
        }

        this.generation++;
        this.currEvaluationStartTime = timestamp;
        console.info(`${GeneticAlgorithm.logPrefix} Starting generation ${this.generation}`);

        // This ugly line of code counts how many genotypes are disabled per genome in the population.
        const numDisabledPerGenome = this.population.map(genome => genome.genotypes.filter(genotype => !genotype.isEnabled).length);
        const numDisabled = numDisabledPerGenome.reduce((sum, x) => sum + x);
        const numGenotypes = this.population.map(genome => genome.genotypes.length).reduce((sum, x) => sum + x);
        const proportionDisabled = 100 * numDisabled / numGenotypes;

        console.log(`${GeneticAlgorithm.logPrefix} Number of disabled genotypes: ${numDisabled}`,
            `(${proportionDisabled.toFixed(2)}% of ${numGenotypes})`);
    }

    /**
     * Select a genome for breeding.
     * @returns {number} The index of the selected genome.
     */
    select() {
        // Tournament selection
        let i = randomInt(0, this.populationSize);

        // Let the games begin!
        for (let j = 0; j < this.tournamentSize; j++) {
            const rand_i = randomInt(0, this.populationSize);
            // Winner takes all
            if (this.generationResults.fitness[rand_i] > this.generationResults.fitness[i]) {
                i = rand_i;
            }
        }

        return i;
    }

    /**
     * Perform the update step for the algorithm.
     * @param timestamp The time in milliseconds since the physics engine was started.
     */
    update(timestamp) {
        if (timestamp - this.currEvaluationStartTime >= this.evaluationTime) {
            this.generationResults = this.evaluate();
            console.info(`${GeneticAlgorithm.logPrefix} End of generation ${this.generation}`);

            if (this.onGenerationEnd !== null) {
                this.onGenerationEnd();
            }

            this.nextGeneration(timestamp);

            if (this.onGenerationStart !== null) {
                this.onGenerationStart();
            }
        }

        for (const creature of this.creatures) {
            creature.update(timestamp);
        }

        this.timeStep++;
    }
}