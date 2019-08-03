/** A basic genetic algorithm. */

import {World} from "matter-js";

import {Creature, CreatureGenome} from "./creature";
import {randomInt} from "./utils";

export class GeneticAlgorithm {
    /**
     * Create a new genetic algorithm instance.
     *
     * @param world The Matter.World that is being used.
     * @param options {{populationSize: number?, evaluationTime: number?, elitismRatio: number?, tournamentSize: number?}}
     * A dictionary of options.
     */
    constructor(world, options) {
        const defaults = {
            populationSize: 100,
            evaluationTime: 60000, // in milliseconds
            elitismRatio: 10,
            tournamentSize: 10
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

        for (let i = 0; i < this.populationSize; i++) {
            this.population.push(CreatureGenome.createRandom());
        }

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
        /** How long to evaluate each generation for in milliseconds.
         * @type{number}
         */
        this.evaluationTime = options.evaluationTime;
        /** How long the current generation has been evaluated for.
         * @type {number}
         */
        this.currEvaluationStartTime = -options.evaluationTime;
        /** An integer indicating how many generations have been completed.
         * @type {number}
         */
        this.generation = 0;
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

        this.nextGeneration(0);
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

        let meanScore = sum / this.creatures.length;

        let generationResults = {
            minFitness: minFitness,
            meanFitness: meanScore,
            maxFitness: maxFitness,
            sumFitness: sum,
            argmin: argmin,
            argmax: argmax,
            fitness: fitnessScores,
            topN: topN
        };

        console.log(`[${new Date()}] Generation ${this.generation} Summary:`);
        console.log(`Min. Fitness: ${generationResults.fitness[argmin]} -  Mean Fitness: ${meanScore} - Max. Fitness ${generationResults.fitness[argmax]}`);
        console.log('Blame: ', this.population[argmin], ' - Praise: ', this.population[argmax]);
        console.log(generationResults);

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
            World.remove(this.world, this.creatures.pop().getPhenome());
        }

        // Populate world with new generation
        for (const genome of this.population) {
            const creature = new Creature(genome);
            this.creatures.push(creature);
            World.add(this.world, creature.getPhenome());
        }

        console.log(`[${new Date()}] End of generation ${this.generation}`);

        this.generation++;
        this.currEvaluationStartTime = timestamp;
        console.log(`[${new Date()}] Starting generation ${this.generation}`);
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

            this.nextGeneration(timestamp);
        }

        for (const creature of this.creatures) {
            creature.update(timestamp);
        }
    }
}